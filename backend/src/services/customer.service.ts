import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** GET /api/customers — 왼쪽 고객목록 */
export async function listCustomers(q?: string) {
  const rows = await prisma.customers.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { phone_number: { contains: q } },
          ],
        }
      : undefined,
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
      phone: c.phone_number,
      consultationCount: c._count.consultations,
      lastConsultedAt: last?.consulted_at?.toISOString() ?? null,
      lastStatus: last?.status ?? null,
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
export async function listCustomerConsultations(customerId: string) {
  const id = BigInt(customerId);

  const customer = await prisma.customers.findUnique({
    where: { customer_id: id },
    select: {
      customer_id: true,
      name: true,
      phone_number: true,
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
      phone: customer.phone_number,
    },
    consultations: consultations.map((row) => {
      const profile = row.customer_risk_profiles;

      return {
        consultationId: row.consultation_id.toString(),
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