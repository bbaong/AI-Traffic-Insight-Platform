// 상담 대시보드 저장 (유일한 DB 쓰기)

import { prisma } from '../lib/prisma';
import type { PrismaClient } from '../generated/prisma/client';
import { predictRisk } from './aiPredict.service';
import { evaluateDiscountRiders } from './discountRider.service';
import { preparePhoneForStorage } from '../utils/phoneCrypto';
import { HttpError } from '../lib/http';
import type { RiderBadge } from '../discountRider';

const BADGE_MAP: Record<
  RiderBadge,
  | 'REVIEW_RECOMMENDED'
  | 'FURTHER_CHECK_REQUIRED'
  | 'CURRENTLY_EXCLUDED'
  | 'EXISTING_MEMBER_VERIFIED'
> = {
  검토권장: 'REVIEW_RECOMMENDED',
  추가확인필요: 'FURTHER_CHECK_REQUIRED',
  현재제외: 'CURRENTLY_EXCLUDED',
  기존가입확인: 'EXISTING_MEMBER_VERIFIED',
};

const CHECKLIST_KEYS = [
  'mileage', 'blackbox', 'safedrive',
  'safedriveService', 'safedriveScore', 'fcw', 'ldw',
] as const;

/** FE camelCase → DB item_key 후보 (시드가 snake_case여도 저장되도록) */
const CHECKLIST_KEY_CANDIDATES: Record<(typeof CHECKLIST_KEYS)[number], string[]> = {
  mileage: ['mileage', 'annual_mileage'],
  blackbox: ['blackbox'],
  safedrive: ['safedrive'],
  safedriveService: ['safedriveService', 'safedrive_service'],
  safedriveScore: ['safedriveScore', 'safedrive_score'],
  fcw: ['fcw'],
  ldw: ['ldw', 'ldws'],
};

const CHECKLIST_ITEM_DEFS: Record<
  (typeof CHECKLIST_KEYS)[number],
  {
    item_label: string;
    input_type: 'SINGLE_CHOICE' | 'NUMBER';
    options: string | null;
    parent_item_key: string | null;
    trigger_value: string | null;
    display_order: number;
  }
> = {
  mileage: {
    item_label: '연간 예상 주행거리',
    input_type: 'SINGLE_CHOICE',
    options:
      '["5,000km 이하","5,000 ~ 10,000km","10,000 ~ 15,000km","15,000km 이상"]',
    parent_item_key: null,
    trigger_value: null,
    display_order: 1,
  },
  blackbox: {
    item_label: '블랙박스 장착',
    input_type: 'SINGLE_CHOICE',
    options: '["미장착","일반형 고정 장착","상시녹화형 장착"]',
    parent_item_key: null,
    trigger_value: null,
    display_order: 2,
  },
  safedrive: {
    item_label: '안전운전점수 서비스',
    input_type: 'SINGLE_CHOICE',
    options: '["이용 중","미이용"]',
    parent_item_key: null,
    trigger_value: null,
    display_order: 3,
  },
  safedriveService: {
    item_label: '안전운전점수 서비스명',
    input_type: 'SINGLE_CHOICE',
    options: null,
    parent_item_key: 'safedrive',
    trigger_value: '이용 중',
    display_order: 4,
  },
  safedriveScore: {
    item_label: '안전운전점수',
    input_type: 'NUMBER',
    options: null,
    parent_item_key: 'safedrive',
    trigger_value: '이용 중',
    display_order: 5,
  },
  fcw: {
    item_label: '전방충돌방지장치',
    input_type: 'SINGLE_CHOICE',
    options: '["출고 시 장착","미장착","확인 필요"]',
    parent_item_key: null,
    trigger_value: null,
    display_order: 6,
  },
  ldw: {
    item_label: '차선이탈경고장치',
    input_type: 'SINGLE_CHOICE',
    options: '["출고 시 장착","미장착","확인 필요"]',
    parent_item_key: null,
    trigger_value: null,
    display_order: 7,
  },
};

async function ensureChecklistItems(
  tx: Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'
  >,
) {
  for (const key of CHECKLIST_KEYS) {
    const def = CHECKLIST_ITEM_DEFS[key];
    await tx.checklist_items.upsert({
      where: { item_key: key },
      create: {
        item_key: key,
        item_label: def.item_label,
        input_type: def.input_type,
        options: def.options,
        allow_unknown: true,
        parent_item_key: def.parent_item_key,
        trigger_value: def.trigger_value,
        is_rider_judgment: true,
        display_order: def.display_order,
        is_active: true,
      },
      update: {
        is_active: true,
        item_label: def.item_label,
      },
    });
  }
}

function mapGender(g: string): 'FEMALE' | 'MALE' {
  return g === '여' || g === 'FEMALE' ? 'FEMALE' : 'MALE';
}

function mapRiskGrade(
  grade: string,
): 'Low' | 'Moderate' | 'High' | 'Critical' {
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

export type SaveConsultationInput = {
  customer: { name: string; phone: string };
  profile: {
    region: string;
    age: string;
    gender: string;
    vehicle: string;
  };
  checklist?: Record<string, unknown>;
  memo?: string | null;
  consultationType: ConsultationType;
};

function isConsultationType(v: unknown): v is ConsultationType {
  return (
    typeof v === 'string' &&
    (CONSULTATION_TYPES as readonly string[]).includes(v)
  );
}

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function parseSaveConsultationInput(raw: unknown): SaveConsultationInput {
  if (raw == null || typeof raw !== 'object') {
    throw new HttpError('요청 본문이 올바르지 않습니다.', 400);
  }
  const body = raw as Record<string, unknown>;

  const customerRaw =
    body.customer != null && typeof body.customer === 'object'
      ? (body.customer as Record<string, unknown>)
      : null;
  const profileRaw =
    body.profile != null && typeof body.profile === 'object'
      ? (body.profile as Record<string, unknown>)
      : null;

  const name = asNonEmptyString(customerRaw?.name);
  const phone = asNonEmptyString(customerRaw?.phone);
  if (!name || !phone) {
    throw new HttpError('고객명·전화번호는 필수입니다.', 400);
  }

  const region = asNonEmptyString(profileRaw?.region);
  const age = asNonEmptyString(profileRaw?.age);
  const gender = asNonEmptyString(profileRaw?.gender);
  const vehicle = asNonEmptyString(profileRaw?.vehicle);
  if (!region || !age || !gender || !vehicle) {
    throw new HttpError('프로필(지역·연령·성별·차종)은 필수입니다.', 400);
  }

  if (!isConsultationType(body.consultationType)) {
    throw new HttpError(
      '상담 유형은 NEW|RENEWAL|CLAIM|COVERAGE_ANALYSIS|OTHER 중 하나여야 합니다.',
      400,
    );
  }

  const checklist =
    body.checklist != null && typeof body.checklist === 'object'
      ? (body.checklist as Record<string, unknown>)
      : undefined;

  const memo =
    typeof body.memo === 'string'
      ? body.memo
      : body.memo == null
        ? null
        : String(body.memo);

  return {
    customer: { name, phone },
    profile: { region, age, gender, vehicle },
    checklist,
    memo,
    consultationType: body.consultationType,
  };
}

export async function saveConsultation(raw: unknown, userId: bigint) {
  const { customer, profile, checklist, memo, consultationType } =
    parseSaveConsultationInput(raw);

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
        gender: mapGender(profile.gender),
        vehicle_type: profile.vehicle,
        district_id: district.district_id,
        driving_time_slot: 'DAY',
        weather_condition: '맑음',
        road_condition: '건조',
        risk_score: Number(ai.위험도 ?? 0),
        risk_grade: mapRiskGrade(String(ai.예측등급 ?? 'LOW')),
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
        checklist_snapshot: JSON.stringify(checklist ?? {}),
        status: 'COMPLETED',
      },
    });

    // 6) checklist items 보장 후 답변 저장
    await ensureChecklistItems(tx);
    const items = await tx.checklist_items.findMany({
      where: { is_active: true },
    });
    const itemByKey = new Map(items.map((i) => [i.item_key, i.item_id]));

    for (const key of CHECKLIST_KEYS) {
      const value = checklist?.[key];
      if (value == null || value === '') continue;
      let itemId: number | undefined;
      for (const candidate of CHECKLIST_KEY_CANDIDATES[key]) {
        const found = itemByKey.get(candidate);
        if (found != null) {
          itemId = found;
          break;
        }
      }
      if (itemId == null) {
        // ensureChecklistItems 후에도 없으면 camelCase 키로 재조회
        itemId = itemByKey.get(key);
      }
      if (itemId == null) continue;
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
          badge:
            r.badge in BADGE_MAP
              ? BADGE_MAP[r.badge as RiderBadge]
              : 'FURTHER_CHECK_REQUIRED',
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