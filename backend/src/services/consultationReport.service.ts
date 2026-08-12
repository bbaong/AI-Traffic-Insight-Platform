import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { recommendCoverages } from './coverageRule.service';

const prisma = new PrismaClient();

export async function getConsultationReport(consultationId: bigint) {
  const row = await prisma.consultations.findUnique({
    where: { consultation_id: consultationId },
    include: { customer_risk_profiles: true },
  });

  if (!row) return null;

  return recommendCoverages({
    riskGrade: row.customer_risk_profiles?.risk_grade ?? null,
  });
}