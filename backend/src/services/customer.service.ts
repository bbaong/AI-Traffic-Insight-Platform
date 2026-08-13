import { prisma } from '../lib/prisma';
import {
  assertValidMobile,
  digitsOnly,
  hashPhone,
  safeDecryptPhone,
} from '../utils/phoneCrypto';

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** GET /api/customers — 왼쪽 고객목록 */
export async function listCustomers(q?: string, userId?: number | string) {
  const term = q?.trim() ?? '';
  const digits = term ? digitsOnly(term) : '';
  if (userId == null || userId === '') {
    throw new Error('userId(상담원)가 필요합니다.');
  }
  const registeredBy = BigInt(userId);

  let phoneHash: string | undefined;
  if (digits.length >= 10 && digits.length <= 11) {
    try {
      assertValidMobile(digits);
      phoneHash = hashPhone(digits);
    } catch {
      phoneHash = undefined;
    }
  }

  const rows = await prisma.customers.findMany({
    where: {
      is_hidden: false,
      registered_by: registeredBy,
      ...(term
        ? {
            OR: [
              { name: { contains: term } },
              ...(phoneHash ? [{ phone_hash: phoneHash }] : []),
            ],
          }
        : {}),
    },
    orderBy: { updated_at: 'desc' },
    include: {
      consultations: {
        orderBy: { consulted_at: 'desc' },
        take: 1,
        include: {
          customer_risk_profiles: {
            include: { districts: true },
          },
        },
      },
      _count: { select: { consultations: true } },
    },
  });

  return rows.map((c) => {
    const last = c.consultations[0] ?? null;
    const profile = last?.customer_risk_profiles ?? null;

    return {
      customerId: c.customer_id.toString(),
      name: c.name,
      phone: safeDecryptPhone(c.phone_number),
      consultationCount: c._count.consultations,
      lastConsultedAt: last?.consulted_at?.toISOString() ?? null,
      lastStatus: last?.status ?? null,
      lastConsultationType: last?.consultation_type ?? null,
      lastRiskScore: toNum(profile?.risk_score),
      lastRiskGrade: profile?.risk_grade ?? null,
      lastRegion: profile?.districts?.district_name ?? null,
      lastAgeGroup: profile?.age_group ?? null,
      lastGender: profile?.gender ?? null,
      lastVehicleType: profile?.vehicle_type ?? null,
      createdAt: c.created_at.toISOString(),
      updatedAt: c.updated_at.toISOString(),
    };
  });
}

/** GET /api/customers/:id/consultations — 오른쪽 이력 */
export async function listCustomerConsultations(
  customerId: string,
  userId?: number | string,
) {
  if (userId == null || userId === '') {
    throw new Error('userId(상담원)가 필요합니다.');
  }
  const id = BigInt(customerId);
  const registeredBy = BigInt(userId);

  const customer = await prisma.customers.findFirst({
    where: {
      customer_id: id,
      registered_by: registeredBy,
      is_hidden: false,
    },
    select: {
      customer_id: true,
      name: true,
      phone_number: true,
      is_hidden: true,
    },
  });

  if (!customer) return null;

  const consultations = await prisma.consultations.findMany({
    where: { customer_id: id },
    orderBy: { consulted_at: 'desc' },
    include: {
      customer_risk_profiles: {
        include: { districts: true },
      },
      consultation_discount_riders: true,
      consultation_checklist_answers: {
        include: { checklist_items: true },
      },
      users: {
        select: { user_id: true, name: true },
      },
    },
  });

  return {
    customer: {
      customerId: customer.customer_id.toString(),
      name: customer.name,
      phone: safeDecryptPhone(customer.phone_number),
    },
    consultations: consultations.map((row) => {
      const profile = row.customer_risk_profiles;

      return {
        consultationId: row.consultation_id.toString(),
        consultationType: row.consultation_type,
        status: row.status,
        consultedAt: row.consulted_at.toISOString(),
        memo: row.memo,
        counselorName: row.users?.name ?? null,
        riskScore: toNum(profile?.risk_score),
        riskGrade: profile?.risk_grade ?? null,
        profile: profile
          ? {
              ageGroup: profile.age_group,
              gender: profile.gender,
              vehicleType: profile.vehicle_type,
              region: profile.districts?.district_name ?? null,
            }
          : null,
        riders: row.consultation_discount_riders.map((r) => ({
          riderKey: r.rider_key,
          badge: r.badge,
          reasonText: r.reason_text,
          additionalCheckText: r.additional_check_text,
        })),
        checklist: row.consultation_checklist_answers.map((a) => ({
          itemKey: a.checklist_items.item_key,
          itemLabel: a.checklist_items.item_label,
          answerValue: a.answer_value,
        })),
      };
    }),
  };
}

/** PATCH /api/customers/:id/hide — Soft Delete */
export async function hideCustomer(
  customerId: string,
  userId?: number | string,
) {
  if (userId == null || userId === '') {
    throw new Error('userId(상담원)가 필요합니다.');
  }
  const id = BigInt(customerId);
  const registeredBy = BigInt(userId);

  const existing = await prisma.customers.findFirst({
    where: {
      customer_id: id,
      registered_by: registeredBy,
    },
    select: { customer_id: true, is_hidden: true },
  });

  if (!existing) return null;

  const updated = await prisma.customers.update({
    where: { customer_id: id },
    data: {
      is_hidden: true,
      hidden_at: new Date(),
      updated_at: new Date(),
    },
    select: {
      customer_id: true,
      is_hidden: true,
      hidden_at: true,
    },
  });

  return {
    customerId: updated.customer_id.toString(),
    isHidden: updated.is_hidden,
    hiddenAt: updated.hidden_at?.toISOString() ?? null,
  };
}