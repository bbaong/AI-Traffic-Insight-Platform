import {
  AiSummaryCard,
  DashboardCard,
  DashboardShell,
  MapCard,
} from '../../../shared/components/dashboard';
import { govDashboardMock } from '../../../mocks/data/govDashboard.mock';
import { getGovAiSummary } from '../../../mocks/data/districtAiSummary.mock';
import { getRiskMeta } from '../../../shared/utils/riskMeta';
import { useDistrictStore } from '../../../shared/stores/districtStore';
import styles from '../../../shared/components/dashboard/GovDashboardPage.module.css';

export function GovDashboardPage() {
  const d = govDashboardMock;
  const selectedCode = useDistrictStore((s) => s.selectedCode);
  const aiSummary = getGovAiSummary(selectedCode);
  const maxHour = Math.max(...d.accidentByHour.map((b) => b.value), 1);

  return (
    <DashboardShell
      topSlot={
        <DashboardCard title="우선점검 시군구 순위">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>순위</th>
                <th>시군구</th>
                <th>점수</th>
                <th>등급</th>
              </tr>
            </thead>
            <tbody>
              {d.priorityRegions.map((row) => {
                const risk = getRiskMeta(row.riskLevel);
                return (
                  <tr key={row.regionName}>
                    <td>{row.rank}</td>
                    <td>{row.regionName}</td>
                    <td>{row.score}</td>
                    <td>
                      <span
                        className={styles.risk}
                        style={{ color: risk.colorVar }}
                        aria-label={`${risk.label} 위험도`}
                      >
                        <span aria-hidden="true">{risk.icon}</span>
                        {risk.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DashboardCard>
      }
      mapSlot={<MapCard title="시군구 위험도 지도 · Choropleth" />}
      aiSummarySlot={
        <AiSummaryCard
          key={selectedCode ?? 'none'}
          data={aiSummary}
          accent="teal"
        />
      }
      sideBottomSlot={
        <DashboardCard title="사고 통계 · 시간대별">
          <div
            className={styles.chart}
            role="img"
            aria-label="시간대별 사고 건수"
          >
            {d.accidentByHour.map((item) => (
              <div key={item.label} className={styles.barCol}>
                <div
                  className={styles.bar}
                  style={{ height: `${(item.value / maxHour) * 100}%` }}
                  title={`${item.label}: ${item.value}`}
                />
                <span className={styles.barLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </DashboardCard>
      }
      kpis={d.kpis}
    />
  );
}

export default GovDashboardPage;