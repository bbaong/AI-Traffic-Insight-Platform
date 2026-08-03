import { useEffect, useState } from 'react';
import {
  AiSummaryCard,
  DashboardCard,
  DashboardShell,
  MapCard,
} from '../../../shared/components/dashboard';
import { govDashboardMock } from '../../../mocks/data/govDashboard.mock';
import { getRiskMeta } from '../../../shared/utils/riskMeta';
import { useDistrictStore } from '../../../shared/stores/districtStore';
import { DAEGU_DISTRICTS } from '../../../shared/constants/daeguBoundaries';
import type {
  AiSummaryData,
  PriorityRegionRow,
  RiskLevel,
} from '../../../shared/types/dashboard';
import { predictGov, type GovPredictResult } from '../api/prediction';
import styles from '../../../shared/components/dashboard/GovDashboardPage.module.css';

function toRiskLevel(v: string): RiskLevel {
  return v === 'CRITICAL' || v === 'HIGH' || v === 'MODERATE' || v === 'LOW'
    ? v
    : 'MODERATE';
}

function toAiSummary(row: GovPredictResult): AiSummaryData {
  const total = row.추정_다음분기사고건수 ?? 0;
  const severity = row.예측사고경중_퍼센트 ?? {};

  const factors = Object.entries(severity).map(([name, pct]) => ({
    name,
    contribution: Math.round((pct / 100) * total), // 건수
  }));
  
  return {
    riskLevel: toRiskLevel(row.중대사고등급),
    title: `대구광역시 ${row.지역}`,
    scoreLabel: '예측 중대사고율(%)',
    score: row.예측중대사고율_퍼센트.toFixed(1),
    factors,
    recommendation: `예측분기 ${row.예측분기 ?? '-'} · 점유율 ${row.예측사고율_퍼센트 ?? '-'}%`,
    profileSummary: [row.기준분기, row.예측분기].filter(Boolean).join(' → '),
    factorUnit: '건',
  };
}

export function GovDashboardPage() {
  const d = govDashboardMock;
  const selectedCode = useDistrictStore((s) => s.selectedCode);

  const [priorityRegions, setPriorityRegions] = useState<PriorityRegionRow[]>(
    d.priorityRegions,
  );
  const [riskByCode, setRiskByCode] = useState<Record<string, RiskLevel>>({});
  const [aiSummary, setAiSummary] = useState<AiSummaryData | null>(null);
  const [severityBars, setSeverityBars] = useState<
    { label: string; value: number }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxSeverity = Math.max(...severityBars.map((b) => b.value), 1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const regionName =
          DAEGU_DISTRICTS.find((x) => x.code === selectedCode)?.name ?? undefined;

        const [all, one] = await Promise.all([
          predictGov({ freq: 'Q' }), // 전 지역 순위
          regionName
            ? predictGov({ 지역: regionName, freq: 'Q' })
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        const list = (Array.isArray(all) ? all : [all]).slice(0, 3);
        setPriorityRegions(
          list.map((row, i) => ({
            rank: i + 1,
            regionName: `대구광역시 ${row.지역}`,
            score: Number(row.예측중대사고율_퍼센트.toFixed(1)),
            riskLevel: toRiskLevel(row.중대사고등급),
          })),
        );
        const nextRisk: Record<string, RiskLevel> = {};
        for (const row of Array.isArray(all) ? all : [all]) {
          const code = DAEGU_DISTRICTS.find((d) => d.name === row.지역)?.code;
          if (code) nextRisk[code] = toRiskLevel(row.중대사고등급);
        }
        setRiskByCode(nextRisk);

        if (one && !Array.isArray(one)) {
          setAiSummary(toAiSummary(one));
          const sev = one.예측사고경중_퍼센트 ?? {};
          setSeverityBars(
            Object.entries(sev).map(([label, value]) => ({ label, value })),
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '예측 실패');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedCode]);

  return (
    <DashboardShell
      topSlot={
        <DashboardCard title="우선점검 시군구 순위">
          {error ? <p>{error}</p> : null}
          {loading ? <p>분석 중…</p> : null}
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
              {priorityRegions.map((row) => {
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
      mapSlot={
        <MapCard
          title="시군구 위험도 지도 · Choropleth"
          riskByCode={riskByCode}
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
        <DashboardCard title="사고경중 비율(%)">
          <div
            className={styles.chart}
            role="img"
            aria-label="사고경중 비율"
          >
            {severityBars.map((item) => (
              <div key={item.label} className={styles.barCol}>
                <span className={styles.barValue}>{item.value.toFixed(1)}%</span>
                <div
                  className={styles.bar}
                  style={{ height: `${(item.value / maxSeverity) * 100}%` }}
                  title={`${item.label}: ${item.value.toFixed(1)}%`}
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