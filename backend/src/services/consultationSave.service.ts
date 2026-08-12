// 상담 대시보드 저장 (유일한 DB 쓰기)

// export async function saveConsultation(_input: unknown) {
//   // TODO: AI 재추론 → 담보 재계산 → 고객 upsert → profile/consultation/answers/riders 트랜잭션 저장
//   return null;
// }

import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { predictRisk } from './aiPredict.service';
import { evaluateDiscountRiders } from './discountRider.service';
import { preparePhoneForStorage } from '../utils/phoneCrypto';

const prisma = new PrismaClient();

const BADGE_MAP = {
  검토권장: 'REVIEW_RECOMMENDED',
  추가확인필요: 'FURTHER_CHECK_REQUIRED',
  현재제외: 'CURRENTLY_EXCLUDED',
  기존가입확인: 'EXISTING_MEMBER_VERIFIED',
} as const;

const CHECKLIST_KEYS = [
  'mileage', 'blackbox', 'safedrive',
  'safedriveService', 'safedriveScore', 'fcw', 'ldw',
] as const;

function mapGender(g: string) {
  return g === '여' || g === 'FEMALE' ? 'FEMALE' : 'MALE';
}

function mapRiskGrade(grade: string) {
  const g = String(grade).toUpperCase();
  if (g.includes('CRITICAL')) return 'Critical';
  if (g.includes('HIGH')) return 'High';
  if (g.includes('MODERATE') || g.includes('MEDIUM')) return 'Moderate';
  return 'Low';
}

const CONSULTATION_TYPES = [
  'NEW',
  'RENEWAL',
  'CLAIM',
  'COVERAGE_ANALYSIS',
  'OTHER',
] as const;

type ConsultationType = (typeof CONSULTATION_TYPES)[number];

function isConsultationType(v: unknown): v is ConsultationType {
  return (
    typeof v === 'string' &&
    (CONSULTATION_TYPES as readonly string[]).includes(v)
  );
}

export async function saveConsultation(input: any) {
  const { customer, profile, checklist, memo, userId, consultationType } = input;

  if (!customer?.name || !customer?.phone) {
    throw new Error('고객명·전화번호는 필수입니다.');
  }
  if (!profile?.region || !profile?.age || !profile?.gender || !profile?.vehicle) {
    throw new Error('프로필(지역·연령·성별·차종)은 필수입니다.');
  }
  if (!userId) {
    throw new Error('userId(상담원)가 필요합니다.');
  }
  if (!isConsultationType(consultationType)) {
    throw new Error(
      '상담 유형은 NEW|RENEWAL|CLAIM|COVERAGE_ANALYSIS|OTHER 중 하나여야 합니다.',
    );
  }

  // 1) AI 재추론 — 프론트 prediction 무시
  const ai = await predictRisk({
    구군: profile.region,
    연령대: profile.age,
    성별: profile.gender,
    차종: profile.vehicle,
  });

  // 7용) 특약도 서버에서 다시 계산
  const riders = evaluateDiscountRiders(checklist ?? {});

  return prisma.$transaction(async (tx) => {
    let district = await tx.districts.findFirst({
      where: { district_name: profile.region },
    });
    // districts 시드가 비어 있어도 상담 저장이 되도록 upsert
    if (!district) {
      district = await tx.districts.create({
        data: { district_name: profile.region },
      });
    }

    // 3) 고객 upsert (phone_hash unique / 암호문 저장)
    const { phoneHash, phoneEnc } = preparePhoneForStorage(customer.phone);

    const existing = await tx.customers.findFirst({
      where: {
        phone_hash: phoneHash,
        registered_by: BigInt(userId),
      },
    });
    const savedCustomer = existing
      ? await tx.customers.update({
          where: { customer_id: existing.customer_id },
          data: {
            name: customer.name !== existing.name ? customer.name : existing.name,
            // 숨김 고객 재방문 시 복구가 필요하면 is_hidden: false 정책 검토
            updated_at: new Date(),
          },
        })
      : await tx.customers.create({
          data: {
            name: customer.name,
            phone_number: phoneEnc,
            phone_hash: phoneHash,
            registered_by: BigInt(userId),
          },
        });

    // 4) risk profile
    const profileCode = `P${Date.now()}`;
    const riskProfile = await tx.customer_risk_profiles.create({
      data: {
        profile_code: profileCode,
        user_id: BigInt(userId),
        customer_memo: customer.name,
        age_group: profile.age,
        gender: mapGender(profile.gender) as any,
        vehicle_type: profile.vehicle,
        district_id: district.district_id,
        driving_time_slot: 'DAY',
        weather_condition: '맑음',
        road_condition: '건조',
        risk_score: Number(ai.위험도 ?? 0),
        risk_grade: mapRiskGrade(String(ai.예측등급 ?? 'LOW')) as any,
        severe_injury_probability: 0,
        model_version: String(ai.버전 ?? 'ins_v1'),
      },
    });

    // 5) consultation
    const consultation = await tx.consultations.create({
      data: {
        customer_id: savedCustomer.customer_id,
        user_id: BigInt(userId),
        profile_id: riskProfile.profile_id,
        consultation_type: consultationType,
        memo: memo ?? null,
        status: 'COMPLETED',
      },
    });

    // 6) checklist answers (item_key로 item_id 조회)
    const items = await tx.checklist_items.findMany({
      where: { item_key: { in: [...CHECKLIST_KEYS] }, is_active: true },
    });
    const itemByKey = new Map(items.map((i) => [i.item_key, i.item_id]));

    for (const key of CHECKLIST_KEYS) {
      const value = checklist?.[key];
      if (value == null || value === '') continue;
      const itemId = itemByKey.get(key);
      if (!itemId) continue; // 시드에 item_key 없으면 skip
      await tx.consultation_checklist_answers.create({
        data: {
          consultation_id: consultation.consultation_id,
          item_id: itemId,
          answer_value: String(value).slice(0, 100),
        },
      });
    }

    // 7) discount riders
    for (const r of riders) {
      await tx.consultation_discount_riders.create({
        data: {
          consultation_id: consultation.consultation_id,
          rider_key: r.riderKey,
          badge: (BADGE_MAP as any)[r.badge] ?? 'FURTHER_CHECK_REQUIRED',
          reason_text: r.reasonText.slice(0, 255),
          additional_check_text: r.additionalCheckText,
        },
      });
    }

    return {
      consultationId: consultation.consultation_id.toString(),
      customerId: savedCustomer.customer_id.toString(),
      profileId: riskProfile.profile_id.toString(),
    };
  });
}