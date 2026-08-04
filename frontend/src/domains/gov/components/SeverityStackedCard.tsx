import { DashboardCard } from '../../../shared/components/dashboard';
import {
  GOV_SEVERITY_KEYS,
  toSeveritySeries,
  type GovHistoryResponse,
} from '../api/prediction';
import styles from './SeverityStackedCard.module.css';

const SEVERITY_COLORS: Record<string, string> = {
    사망사고: '#E53935',       // CRITICAL #C62828 → 더 밝고 선명
    중상사고: '#FF8A4C',       // HIGH #F77C34 → 채도↑
    경상사고: '#F0B429',       // MODERATE #D89B00 → 명도↑
    부상신고사고: '#43A047',   // LOW #2E7D32 → 밝고 선명
  };
  
  const SEVERITY_LABEL_COLOR: Record<string, string> = {
    사망사고: '#fff',
    중상사고: '#fff',
    경상사고: '#0f1b2d',       // 밝은 노랑 위는 어두운 글자
    부상신고사고: '#fff',
  };

  function formatPeriod(raw: string): string {
    const q = /^(\d{4})Q([1-4])$/i.exec(raw);
    if (q) return `${q[1].slice(2)}년도 ${q[2]}분기`;
    return raw;
  }

export interface SeverityStackedCardProps {
  regionName: string | null;
  data: GovHistoryResponse | null;
  loading?: boolean;
  error?: string | null;
}

export function SeverityStackedCard({
  regionName,
  data,
  loading,
  error,
}: SeverityStackedCardProps) {
  if (!regionName) {
    return (
      <DashboardCard title="사고경중">
        <p className={styles.hint}>지도에서 구·군을 선택하세요.</p>
      </DashboardCard>
    );
  }
  // API 응답 지역과 선택 구가 같을 때만 사용 (이전 구 stale 방지)
    const matched =
    data && regionName && data.지역 === regionName ? data : null;

    if (loading && !matched) {
    return (
    <DashboardCard title={`사고경중${regionName ? ` · ${regionName}` : ''}`}>
        <p className={styles.hint} aria-busy="true">
        분석 중…
        </p>
    </DashboardCard>
    );
    }

    if (error && !matched) {
    return (
    <DashboardCard title={`사고경중 · ${regionName}`}>
        <p className={styles.hint}>{error}</p>
    </DashboardCard>
    );
    }

    if (!matched) {
    return (
    <DashboardCard title={`사고경중 · ${regionName}`}>
        <p className={styles.hint} aria-busy={loading}>
        {loading ? '분석 중…' : '데이터가 없습니다.'}
        </p>
    </DashboardCard>
    );
    }

    const series = toSeveritySeries(matched);
    // 아래는 data → matched 로 통일, title은 regionName 유지
  const maxTotal = Math.max(...series.map((p) => p.사고건수), 1);

  return (
    <DashboardCard title={`사고경중 · ${regionName}`}>
      <p className={styles.sub}>
        직전 4분기 실적 + 다음 분기 예측 (상해정도별 건수)
      </p>
      <div className={styles.chart} role="img" aria-label="상해정도별 누적막대">
        {series.map((point) => (
          <div
            key={`${point.kind}-${point.분기}`}
            className={`${styles.col} ${point.kind === 'forecast' ? styles.colForecast : ''}`}
          >
            <span className={styles.total}>{point.사고건수}</span>
            <div
                className={styles.stack}
                style={{ height: `${(point.사고건수 / maxTotal) * 100}%` }}
            >
                {[...GOV_SEVERITY_KEYS].reverse().map((key) => {
                    const count = point.경중_건수[key] ?? 0;
                    const pct =
                    point.사고건수 > 0 ? (count / point.사고건수) * 100 : 0;
                    if (pct <= 0) return null;
                    const showInBar = count > 0;
                    return (
                      <div
                        key={key}
                        className={styles.seg}
                        style={{
                          flexGrow: pct,
                          background: SEVERITY_COLORS[key] ?? '#94a3b8',
                          color: SEVERITY_LABEL_COLOR[key] ?? '#fff',
                        }}
                        title={`${key}: ${count}건`}
                      >
                        {showInBar ? (
                          <span className={styles.segValue}>{count}</span>
                        ) : null}
                      </div>
                    );
                })}
            </div>
            <span className={styles.label}>
              {formatPeriod(point.분기)}
              {point.kind === 'forecast' ? (
                <span className={styles.forecastBadge}>예측</span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
      <ul className={styles.legend}>
        {GOV_SEVERITY_KEYS.map((key) => (
          <li key={key}>
            <span
              className={styles.swatch}
              style={{ background: SEVERITY_COLORS[key] }}
            />
            {key.replace('사고', '')}
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}