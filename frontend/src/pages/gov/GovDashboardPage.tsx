import {
  AiSummaryCard,
  DashboardCard,
  DashboardShell,
  MapCard,
} from '../../components/dashboard';
import { govDashboardMock } from '../../mocks/data/govDashboard.mock';
import { getRiskMeta } from '../../utils/riskMeta';
import styles from './GovDashboardPage.module.css';

export function GovDashboardPage() {
  const d = govDashboardMock;
  const maxHour = Math.max(...d.accidentByHour.map((b) => b.value), 1);

  return (
    <DashboardShell
      kpis={d.kpis}
      mapSlot={<MapCard title="시군구 위험도 지도 · Choropleth" />}
      aiSummarySlot={<AiSummaryCard data={d.aiSummary} accent="teal" />}
      bottomLeftSlot={
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
      bottomRightSlot={
        <DashboardCard title="사고 통계 · 시간대별">
          <div className={styles.chart} role="img" aria-label="시간대별 사고 건수">
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
    />
  );
}

export default GovDashboardPage;
