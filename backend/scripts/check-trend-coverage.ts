import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { listTrend } from '../src/services/govForecast.service';

/** 지역비교 trend.history 공백 원인 점검용 */
async function main() {
  const total = await prisma.district_monthly_trend.count();
  console.log('district_monthly_trend COUNT =', total);

  const coverage = await prisma.$queryRaw<
    { district_id: number; months: bigint; min_m: string; max_m: string }[]
  >`
    SELECT district_id, COUNT(*) AS months,
           MIN(trend_month) AS min_m, MAX(trend_month) AS max_m
    FROM district_monthly_trend
    GROUP BY district_id
    ORDER BY district_id
  `;
  console.log(
    'coverage =',
    coverage.map((r) => ({
      district_id: r.district_id,
      months: Number(r.months),
      min_m: r.min_m,
      max_m: r.max_m,
    })),
  );

  for (const name of ['수성구', '군위군'] as const) {
    const d = await prisma.districts.findFirst({
      where: { district_name: name },
    });
    if (!d) continue;
    const history = await listTrend(d.district_id);
    console.log(`listTrend(${name} id=${d.district_id}) length=`, history.length);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
