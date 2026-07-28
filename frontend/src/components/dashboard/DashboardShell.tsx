import type { ReactNode } from 'react';
import type { KpiData } from '../../types/dashboard';
import { KpiCard } from './KpiCard';
import styles from './DashboardShell.module.css';

export interface DashboardShellProps {
  kpis: KpiData[];
  mapSlot: ReactNode;
  aiSummarySlot: ReactNode;
  bottomLeftSlot: ReactNode;
  bottomRightSlot: ReactNode;
}

/**
 * GOV·INS 공용 4층 그리드. 내용은 slot으로만 주입한다.
 * 이 컴포넌트 안에 role 분기를 두지 않는다.
 */
export function DashboardShell({
  kpis,
  mapSlot,
  aiSummarySlot,
  bottomLeftSlot,
  bottomRightSlot,
}: DashboardShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.kpiRow}>
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} data={kpi} />
        ))}
      </div>

      <div className={styles.row}>
        <div className={styles.slot}>{mapSlot}</div>
        <div className={styles.slot}>{aiSummarySlot}</div>
      </div>

      <div className={styles.row}>
        <div className={styles.slot}>{bottomLeftSlot}</div>
        <div className={styles.slot}>{bottomRightSlot}</div>
      </div>
    </div>
  );
}
