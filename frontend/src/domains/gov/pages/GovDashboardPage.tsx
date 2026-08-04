import { useEffect, useState } from 'react';
import {
  AiSummaryCard,
  DashboardCard,
  DashboardShell,
  MapCard,
} from '../../../shared/components/dashboard';
import { getRiskMeta } from '../../../shared/utils/riskMeta';
import { useDistrictStore } from '../../../shared/stores/districtStore';
import { DAEGU_DISTRICTS } from '../../../shared/constants/daeguBoundaries';
import type {
  AiSummaryData,
  PriorityRegionRow,
  RiskLevel,
} from '../../../shared/types/dashboard';
import {
  getPredictedCount,
  predictGov,
  severeRateToMapLevel,
  type GovPredictResult,
} from '../api/prediction';
import { RISK_COLORS } from '../../../shared/components/dashboard/MapCard';
import { govDashboardMock } from '../../../mocks/data/govDashboard.mock';
import styles from '../../../shared/components/dashboard/GovDashboardPage.module.css';

function getAccidentCount(row: GovPredictResult): number {
  return getPredictedCount(row);
}

/** 우선점검 점수(0~100) = 예측 중대사고율(%) */
function priorityScore(row: GovPredictResult): number {
  return Number(row.예측중대사고율_퍼센트.toFixed(1));
}

function toRiskLevel(v: string): RiskLevel {
  return v === 'CRITICAL' || v === 'HIGH' || v === 'MODERATE' || v === 'LOW'
    ? v
    : 'MODERATE';
}

/** 2025Q4 → 2025년 4분기, 2025H2 → 2025년 하반기 */
function formatPeriodLabel(raw?: string | null): string {
  if (!raw) return '-';
  const q = /^(\d{4})Q([1-4])$/i.exec(raw);
  if (q) return `${q[1]}년 ${q[2]}분기`;
  const h = /^(\d{4})H([12])$/i.exec(raw);
  if (h) return `${h[1]}년 ${h[2] === '1' ? '상반기' : '하반기'}`;
  return raw;
}

function toAiSummary(row: GovPredictResult): AiSummaryData {
  const total = getAccidentCount(row);
  const severity = row.예측사고경중_퍼센트 ?? {};
  const factors = Object.entries(severity).map(([name, pct]) => ({
    name,
    contribution: Math.round((pct / 100) * total), // % → 건
  }));
  return {
    riskLevel: toRiskLevel(row.중대사고등급),
    title: `대구광역시 ${row.지역}`,
    scoreLabel: '우선점검 점수(중대율 %)',
    score: priorityScore(row),
    factors,
    recommendation: `예측기간 ${formatPeriodLabel(row.예측분기)} · 참고 예상사고 ${total}건`,
    profileSummary: [
      formatPeriodLabel(row.기준분기),
      formatPeriodLabel(row.예측분기),
    ]
      .filter((s) => s !== '-')
      .join(' → '),
    factorUnit: '건',
  };
}

export function GovDashboardPage() {
  const selectedCode = useDistrictStore((s) => s.selectedCode);
  const setSelectedCode = useDistrictStore((s) => s.setSelectedCode);
  const selectedName =
    DAEGU_DISTRICTS.find((d) => d.code === selectedCode)?.name ?? null;

  const [riskByCode, setRiskByCode] = useState<Record<string, RiskLevel>>({});
  const [aiSummary, setAiSummary] = useState<AiSummaryData | null>(null);
  const [districtSevereBars, setDistrictSevereBars] = useState<
    { label: string; value: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allRows, setAllRows] = useState<GovPredictResult[]>([]);
  const [priorityRegions, setPriorityRegions] = useState<PriorityRegionRow[]>(
    [],
  );
  
  const severeValues = districtSevereBars.map((b) => b.value);
  const dataMin = severeValues.length ? Math.min(...severeValues) : 0;
  const dataMax = severeValues.length ? Math.max(...severeValues) : 1;
  const pad = Math.max(0.5, (dataMax - dataMin) * 0.15);
  const yMin = Math.max(0, dataMin - pad);
  const yMax = dataMax + pad;

  // 전체 시군구 — 페이지 진입 시 1회
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        setLoading(true);
        setError(null);

        const all = await predictGov({ freq: 'Q' });
        if (cancelled) return;

        const rows = [...(Array.isArray(all) ? all : [all])];
        const bySevere = [...rows].sort(
          (a, b) => priorityScore(b) - priorityScore(a),
        );

        setAllRows(rows);

        setPriorityRegions(
          bySevere.slice(0, 3).map((row, i) => ({
            rank: i + 1,
            regionName: `대구광역시 ${row.지역}`,
            score: priorityScore(row),
            accidentCount: getAccidentCount(row),
            riskLevel: toRiskLevel(row.중대사고등급),
          })),
        );

        const rates = rows.map((r) => r.예측중대사고율_퍼센트);
        const nextRisk: Record<string, RiskLevel> = {};
        for (const row of rows) {
          const code = DAEGU_DISTRICTS.find((d) => d.name === row.지역)?.code;
          if (code) {
            nextRisk[code] = severeRateToMapLevel(
              row.예측중대사고율_퍼센트,
              rates,
            );
          }
        }
        setRiskByCode(nextRisk);

        setDistrictSevereBars(
          bySevere.map((row) => ({
            label: row.지역,
            value: row.예측중대사고율_퍼센트,
          })),
        );
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '예측 실패');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, []); // ← selectedCode 제거

  useEffect(() => {
    if (!allRows.length || !selectedName) {
      setAiSummary(null);
      return;
    }
    const row = allRows.find((r) => r.지역 === selectedName);
    setAiSummary(row ? toAiSummary(row) : null);
  }, [selectedCode, selectedName, allRows]);

  return (
    <DashboardShell
      topSlot={
        <DashboardCard title="안전대책 우선점검 시군구">
          <div className={styles.priorityPanel}>
            {error ? <p className={styles.loadingHint}>{error}</p> : null}
            {priorityRegions.length === 0 ? (
              <p className={styles.loadingHint} aria-busy={loading}>
                {loading ? '분석 중…' : '데이터가 없습니다.'}
              </p>
            ) : (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>순위</th>
                      <th>시군구</th>
                      <th>중대율(%)</th>
                      <th>예상 사고 건수</th>
                      <th>등급</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priorityRegions.map((row) => {
                      const risk = getRiskMeta(row.riskLevel);
                      return (
                        <tr key={row.regionName}>
                          <td>{row.rank}</td>
                          <td>{row.regionName}</td>
                          <td>{row.score.toFixed(1)}</td>
                          <td>{row.accidentCount}</td>
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
                <p className={styles.priorityHint}>
                  중대율(%)은 예측 사고 중 중상·사망으로 이어질 비율입니다.
                  시설 개선·예산 배분의 우선 기준으로 사용합니다.
                </p>
              </>
            )}
          </div>
        </DashboardCard>
      }
      mapSlot={
        <MapCard
          title="시군구 중대사고 위험 · 우선점검"
          riskByCode={riskByCode}
          legend={[
            { label: '중대율 상위 25%', color: RISK_COLORS.CRITICAL },
            { label: '상위 25–50%', color: RISK_COLORS.HIGH },
            { label: '하위 25–50%', color: RISK_COLORS.MODERATE },
            { label: '중대율 하위 25%', color: RISK_COLORS.LOW },
          ]}
        />
      }
      aiSummarySlot={
        aiSummary ? (
          <AiSummaryCard
            key={selectedCode ?? 'none'}
            data={aiSummary}
            accent="teal"
          />
        ) : (
          <DashboardCard title="AI 분석 요약">
            <p>{loading ? '분석 중…' : '지도에서 구·군을 선택하세요.'}</p>
          </DashboardCard>
        )
      }
      sideBottomSlot={
        <DashboardCard title="시군구별 중대율(%) · 투자 우선 비교">
          <p className={styles.chartHint}>
            중대율은 예측 사고 중 중상·사망 비율(%)입니다. 시설 개선·예산
            배분의 우선 기준으로 쓰며, 사고 건수는 참고 지표입니다.
          </p>
          <div className={styles.chart} role="group" aria-label="시군구별 중대율">
            {districtSevereBars.map((item) => {
              const selected = selectedName === item.label;
              return (
                <button
                  type="button"
                  key={item.label}
                  className={`${styles.barCol} ${selected ? styles.barColSelected : ''}`}
                  onClick={() => {
                    const code =
                      DAEGU_DISTRICTS.find((d) => d.name === item.label)?.code ?? null;
                    setSelectedCode(code);
                  }}
                  aria-pressed={selected}
                  aria-label={`${item.label} 선택, 중대율 ${item.value.toFixed(1)}%`}
                >
                  <span className={styles.barValue}>{item.value.toFixed(1)}%</span>
                  <div
                    className={`${styles.bar} ${selected ? styles.barSelected : ''}`}
                    style={{
                      height: `${((item.value - yMin) / (yMax - yMin || 1)) * 100}%`,
                    }}
                  />
                  <span className={styles.barLabel}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </DashboardCard>
      }
      kpis={govDashboardMock.kpis}
    />
  );
}

export default GovDashboardPage;
