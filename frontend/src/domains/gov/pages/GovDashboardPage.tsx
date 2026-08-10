import {
  AiSummaryCard,
  DashboardCard,
  MapCard,
} from '../../../shared/components/dashboard';
import { useDistrictStore } from '../../../shared/stores/districtStore';
import { DAEGU_DISTRICTS } from '../../../shared/constants/daeguBoundaries';
import type { AiSummaryData, PriorityRegionRow, RiskLevel } from '../../../shared/types/dashboard';
import { getRiskMeta } from '../../../shared/utils/riskMeta';
import {
  getPredictedCount,
  predictGov,
  predictGovHistory,
  predictGovHotspots,
  severeRateToMapLevel,
  type GovHistoryResponse,
  type GovHotspotPoint,
  type GovPredictResult,
} from '../api/prediction';
import { RISK_COLORS, type MapHotspot } from '../../../shared/components/dashboard/MapCard';
import { SeverityStackedCard } from '../components/SeverityStackedCard';
import styles from '../../../shared/components/dashboard/GovDashboardPage.module.css';
import { useState, useEffect, useRef } from 'react';

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
  const types = row.예측사고유형_퍼센트 ?? {};
  const factors = Object.entries(types)
    .sort((a, b) => b[1] - a[1])
    .map(([name, pct]) => ({
      name,
      contribution: Math.round((pct / 100) * total), // % → 건
    }));
  return {
    riskLevel: toRiskLevel(row.중대사고등급),
    title: `대구광역시 ${row.지역}`,
    scoreLabel: '우선점검 점수(중대율 %)',
    score: priorityScore(row),
    factors,
    recommendation: `예측기간 ${formatPeriodLabel(row.예측분기)} · 참고 예상사고 ${total}건 · 사고유형은 기준분기 실적 비율`,
    profileSummary: [
      formatPeriodLabel(row.기준분기),
      formatPeriodLabel(row.예측분기),
    ]
      .filter((s) => s !== '-')
      .join(' → '),
    factorUnit: '건',
  };
}
const GOV_PRED_CACHE_KEY = 'gov:predictGov:Q';
const GOV_HOTSPOT_CACHE_KEY = 'gov:hotspots';
/** 프론트: 이 시간 안이면 Backend/AI 다발 API를 다시 치지 않음 */
const GOV_HOTSPOT_CLIENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const historySessionKey = (region: string) => `gov:history:${region}:4`;

type HotspotSessionCache = {
  year: number;
  points: GovHotspotPoint[];
  fetched_at: number;
};

function toMapHotspots(points: GovHotspotPoint[]): MapHotspot[] {
  return points
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .map((p) => ({
      lat: p.lat,
      lon: p.lon,
      count: p.count ?? 0,
      name: p.name,
      region: p.지역,
    }));
}

function isHotspotCacheFresh(cache: HotspotSessionCache | null): boolean {
  if (!cache?.points?.length || !cache.fetched_at) return false;
  return Date.now() - cache.fetched_at < GOV_HOTSPOT_CLIENT_TTL_MS;
}

function readSessionJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeSessionJson(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota 등은 무시 */
  }
}

export function GovDashboardPage() {
  const selectedCode = useDistrictStore((s) => s.selectedCode);
  const setSelectedCode = useDistrictStore((s) => s.setSelectedCode);
  const selectedName =
    DAEGU_DISTRICTS.find((d) => d.code === selectedCode)?.name ?? null;

  const [riskByCode, setRiskByCode] = useState<Record<string, RiskLevel>>({});
  const [aiSummary, setAiSummary] = useState<AiSummaryData | null>(null);
  const [allRows, setAllRows] = useState<GovPredictResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priorityRegions, setPriorityRegions] = useState<PriorityRegionRow[]>([]);
  const [mapExpanded, setMapExpanded] = useState(false);

  const [historyData, setHistoryData] = useState<GovHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const historyCacheRef = useRef<Record<string, GovHistoryResponse>>({});

  const [hotspots, setHotspots] = useState<MapHotspot[]>([]);
  const [hotspotYear, setHotspotYear] = useState<number | null>(null);

  function applyPredictRows(rows: GovPredictResult[]) {
    const bySevere = [...rows].sort(
      (a, b) => priorityScore(b) - priorityScore(a),
    );

    setAllRows(rows);

    setPriorityRegions(
      bySevere.slice(0, 3).map((row, i) => ({
        rank: i + 1,
        regionName: row.지역,
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
  }

  // 전체 시군구 — 페이지 진입 시 1회
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      const cached = readSessionJson<GovPredictResult[]>(GOV_PRED_CACHE_KEY);
      if (cached?.length) {
        applyPredictRows(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const all = await predictGov({ freq: 'Q' });
        if (cancelled) return;
        const rows = [...(Array.isArray(all) ? all : [all])];
        writeSessionJson(GOV_PRED_CACHE_KEY, rows);
        applyPredictRows(rows);
      } catch (e) {
        if (!cancelled && !cached?.length) {
          setError(e instanceof Error ? e.message : '예측 실패');
          setPriorityRegions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  // 공식 사고다발 TOP3 — 지도 원 (세션 TTL 안이면 API 스킵)
  useEffect(() => {
    let cancelled = false;

    async function loadHotspots() {
      const cached = readSessionJson<HotspotSessionCache>(GOV_HOTSPOT_CACHE_KEY);
      if (cached?.points?.length) {
        setHotspots(toMapHotspots(cached.points));
        setHotspotYear(cached.year);
      }
      if (isHotspotCacheFresh(cached)) {
        return;
      }

      try {
        const data = await predictGovHotspots();
        if (cancelled) return;
        writeSessionJson(GOV_HOTSPOT_CACHE_KEY, {
          year: data.year,
          points: data.points,
          fetched_at: Date.now(),
        } satisfies HotspotSessionCache);
        setHotspots(toMapHotspots(data.points ?? []));
        setHotspotYear(data.year);
      } catch (e) {
        if (!cancelled && !cached?.points?.length) {
          console.warn('[GovDashboard] hotspots', e);
        }
      }
    }

    void loadHotspots();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedName) {
      setHistoryData(null);
      setHistoryError(null);
      setHistoryLoading(false);
      return;
    }

    const mem = historyCacheRef.current[selectedName];
    if (mem) {
      setHistoryData(mem);
      setHistoryError(null);
      setHistoryLoading(false);
      return;
    }

    const sess = readSessionJson<GovHistoryResponse>(
      historySessionKey(selectedName),
    );
    if (sess && sess.지역 === selectedName) {
      historyCacheRef.current[selectedName] = sess;
      setHistoryData(sess);
      setHistoryLoading(false);
      setHistoryError(null);
    } else {
      setHistoryData(null);
      setHistoryLoading(true);
      setHistoryError(null);
    }

    let cancelled = false;

    async function loadHistory() {
      try {
        const data = await predictGovHistory({
          지역: selectedName!,
          n_history: 4,
        });
        if (cancelled) return;
        historyCacheRef.current[selectedName!] = data;
        writeSessionJson(historySessionKey(selectedName!), data);
        setHistoryData(data);
        setHistoryError(null);
      } catch (e) {
        if (!cancelled) {
          if (!sess || sess.지역 !== selectedName) {
            setHistoryData(null);
          }
          setHistoryError(e instanceof Error ? e.message : 'history 실패');
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [selectedName]);

  useEffect(() => {
    if (!allRows.length || !selectedName) {
      setAiSummary(null);
      return;
    }
    const row = allRows.find((r) => r.지역 === selectedName);
    setAiSummary(row ? toAiSummary(row) : null);
  }, [selectedCode, selectedName, allRows]);

  return (
    <div className={`${styles.govGrid} ${mapExpanded ? styles.govGridMapExpanded : ''}`}>
      <div className={styles.cellMap}>
        <MapCard
          title="시군구 중대사고 위험 · 우선점검"
          riskByCode={riskByCode}
          hotspots={hotspots}
          hotspotYear={hotspotYear}
          mapExpanded={mapExpanded}
          onToggleMapExpand={() => setMapExpanded((v) => !v)}
          legend={[
            { label: '중대율 상위 25%', color: RISK_COLORS.CRITICAL },
            { label: '상위 25–50%', color: RISK_COLORS.HIGH },
            { label: '하위 25–50%', color: RISK_COLORS.MODERATE },
            { label: '중대율 하위 25%', color: RISK_COLORS.LOW },
          ]}
        />
      </div>
      
      <div className={styles.cellSeverity}>
        <SeverityStackedCard
          regionName={selectedName}
          data={historyData}
          loading={historyLoading && !historyData}
          error={historyError}
        />
      </div>
  
      <div
        className={styles.cellDistrict}
        hidden={mapExpanded}
        aria-hidden={mapExpanded}
      >
        <DashboardCard title="구별 우선점검 TOP3">
          <div className={styles.priorityPanel}>
            {loading ? (
              <p className={styles.loadingHint} aria-busy="true">
                분석 중…
              </p>
            ) : error ? (
              <p className={styles.loadingHint}>{error}</p>
            ) : priorityRegions.length === 0 ? (
              <p className={styles.loadingHint}>순위 데이터가 없습니다.</p>
            ) : (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">순위</th>
                      <th scope="col">지역</th>
                      <th scope="col">중대율</th>
                      <th scope="col">위험</th>
                    </tr>
                  </thead>
                  <tbody>
                  {priorityRegions.map((row) => {
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
                          if (code) setSelectedCode(code);
                        }}
                        onKeyDown={(e) => {
                          if (!code) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedCode(code);
                          }
                        }}
                        style={{
                          cursor: code ? 'pointer' : 'default',
                          background: selected ? 'var(--color-page-bg)' : undefined,
                        }}
                      >
                        <td>{row.rank}</td>
                        <td>{row.regionName}</td>
                        <td>{row.score}%</td>
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
                <p className={styles.priorityHint}>
                  예측 중대사고율(%) 높은 순 · TOP3
                </p>
              </>
            )}
          </div>
        </DashboardCard>
      </div>
  
      <div className={styles.cellReport}>
        {aiSummary ? (
          <AiSummaryCard
            key={selectedCode ?? 'none'}
            data={aiSummary}
            accent="teal"
          />
        ) : (
          <DashboardCard title="사고유형">
            <p className={styles.loadingHint}>
              {loading ? '분석 중…' : '지도에서 구·군을 선택하세요.'}
            </p>
          </DashboardCard>
        )}
      </div>
    </div>
  );
}

export default GovDashboardPage;
