import type { ReactNode } from 'react';
import type { KpiData } from '../../types/dashboard';
import { KpiCard } from './KpiCard';
import styles from './DashboardShell.module.css';

export interface DashboardShellProps {
  /** 맨 위 전체 폭 (GOV: 우선점검 / INS: 고객 프로필) */
  topSlot: ReactNode;
  mapSlot: ReactNode;
  aiSummarySlot: ReactNode;
  /** 지도 오른쪽 아래 (GOV: 시간대별 / INS: 연령대별) */
  sideBottomSlot: ReactNode;
  /** 맨 아래 KPI */
  kpis: KpiData[];
}

/**
 * GOV·INS 공용 그리드.
 * top → map|(AI+sideBottom) → KPI
 */
export function DashboardShell({
  topSlot,
  mapSlot,
  aiSummarySlot,
  sideBottomSlot,
  kpis,
}: DashboardShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.topSlot}>{topSlot}</div>

      <div className={styles.mainRow}>
        <div className={styles.mapSlot}>{mapSlot}</div>
        <div className={styles.sideStack}>
          <div className={styles.slot}>{aiSummarySlot}</div>
          <div className={styles.slot}>{sideBottomSlot}</div>
        </div>
      </div>

      <div className={styles.kpiRow}>
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} data={kpi} />
        ))}
      </div>
    </div>
  );
}