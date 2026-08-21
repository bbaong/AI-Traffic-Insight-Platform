import { prisma } from '../lib/prisma';
import { recommendCoverages } from './coverageRule.service';

export async function getConsultationReport(
  consultationId: bigint,
  userId: bigint,
) {
  const row = await prisma.consultations.findFirst({
    where: {
      consultation_id: consultationId,
      user_id: userId,
    },
    include: { customer_risk_profiles: true },
  });

  if (!row) return null;

  return recommendCoverages({
    riskGrade: row.customer_risk_profiles?.risk_grade ?? null,
  });
}