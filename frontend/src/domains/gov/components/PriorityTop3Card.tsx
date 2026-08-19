import { Link } from 'react-router-dom';
import { DashboardCard } from '../../../shared/components/dashboard';
import { DAEGU_DISTRICTS } from '../../../shared/constants/daeguBoundaries';
import { ROUTES } from '../../../shared/constants/routes';
import type { PriorityRegionRow } from '../../../shared/types/dashboard';
import { getRiskMeta } from '../../../shared/utils/riskMeta';
import { GovHint } from './GovHint';
import { GovMaterialIcon } from './GovMaterialIcon';
import styles from './PriorityTop3Card.module.css';

export interface PriorityTop3CardProps {
  rows: PriorityRegionRow[];
  selectedCode: string | null;
  loading?: boolean;
  error?: string | null;
  onSelectCode: (code: string) => void;
}

function CriticalRateHint() {
  return (
    <GovHint text="전체 사고 중 사망자+중상자 비율입니다." align="end">
      <span className={styles.hintTrigger}>
        <span>중대사고율이란?</span>
        <span className={styles.hintIcon} aria-hidden="true">
          <GovMaterialIcon name="info" size={14} />
        </span>
      </span>
    </GovHint>
  );
}

export function PriorityTop3Card({
  rows,
  selectedCode,
  loading,
  error,
  onSelectCode,
}: PriorityTop3CardProps) {
  return (
    <DashboardCard
      title="구별 우선점검 TOP3"
      action={<CriticalRateHint />}
    >
      <div className={styles.panel}>
        {loading ? (
          <p className={styles.hint} aria-busy="true">
            분석 중…
          </p>
        ) : error ? (
          <p className={styles.hint} role="alert">
            {error}
          </p>
        ) : rows.length === 0 ? (
          <p className={styles.hint}>순위 데이터가 없습니다.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">순위</th>
                <th scope="col">구·군</th>
                <th scope="col">중대율</th>
                <th scope="col">위험</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const risk = getRiskMeta(row.riskLevel);
                const code = DAEGU_DISTRICTS.find(
                  (d) => d.name === row.regionName,
                )?.code;
                const selected = code === selectedCode;

                return (
                  <tr
                    key={row.rank}
                    role={code ? 'button' : undefined}
                    tabIndex={code ? 0 : undefined}
                    onClick={() => {
                      if (code) onSelectCode(code);
                    }}
                    onKeyDown={(e) => {
                      if (!code) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectCode(code);
                      }
                    }}
                    className={selected ? styles.rowSelected : undefined}
                  >
                    <td>{row.rank}</td>
                    <td>{row.regionName}</td>
                    <td>{row.score.toFixed(1)}%</td>
                    <td>
                      <span className={styles.risk} style={{ color: risk.colorVar }}>
                        {risk.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Link className={styles.reportBtn} to={ROUTES.REPORTS}>
          상세 리포트 만들기 →
        </Link>
      </div>
    </DashboardCard>
  );
}
