import { MapCard } from '../../../shared/components/dashboard';
import { useDistrictStore } from '../../../shared/stores/districtStore';
import { DAEGU_DISTRICTS } from '../../../shared/constants/daeguBoundaries';
import type { PriorityRegionRow, RiskLevel } from '../../../shared/types/dashboard';
import {
  fetchGovForecasts,
  getPredictedCount,
  GOV_SEVERITY_KEYS,
  predictGov,
  predictGovHistory,
  predictGovHotspots,
  severeRateToMapLevel,
  type GovHistoryResponse,
  type GovHotspotPoint,
  type GovPredictResult,
} from '../api/prediction';
import {
  GovApiError,
  fetchGovComparison,
  fetchGovSuggestions,
  type GovComparisonData,
  type GovSuggestionItem,
} from '../api/govDashboard';
import { RISK_COLORS, type MapHotspot } from '../../../shared/components/dashboard/MapCard';
import { ComparisonCard } from '../components/ComparisonCard';
import { PriorityTop3Card } from '../components/PriorityTop3Card';
import { SeverityStackedCard } from '../components/SeverityStackedCard';
import { SuggestionsCard } from '../components/SuggestionsCard';
import styles from '../../../shared/components/dashboard/GovDashboardPage.module.css';
import { useState, useEffect, useRef } from 'react';


function getAccidentCount(row: GovPredictResult): number {
  return getPredictedCount(row);
}

/** 우선점검 점수(0~100) = 예측 중대사고율(%) */
function priorityScore(row: GovPredictResult): number {
  return Number((row.예측사고율_퍼센트 ?? 0).toFixed(1));
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

function govFetchErrorMessage(error: unknown, notFound: string): string {
  if (error instanceof GovApiError) {
    if (error.status === 400) return 'id 형식이 올바르지 않습니다.';
    if (error.status === 404) return notFound;
    return error.message;
  }
  return error instanceof Error ? error.message : '불러오지 못했습니다.';
}

const GOV_PRED_CACHE_KEY = 'gov:forecasts:Q';
const GOV_HOTSPOT_CACHE_KEY = 'gov:hotspots';
/** ReportsPage PDF — 대시보드 스냅샷 (재추론 스킵) */
const GOV_PDF_SNAPSHOT_KEY = 'gov_pdf_snapshot_v1';
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
  const setPeriodLabel = useDistrictStore((s) => s.setPeriodLabel);
  const selectedName =
    DAEGU_DISTRICTS.find((d) => d.code === selectedCode)?.name ?? null;

  const [riskByCode, setRiskByCode] = useState<Record<string, RiskLevel>>({});
  const [allRows, setAllRows] = useState<GovPredictResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priorityRegions, setPriorityRegions] = useState<PriorityRegionRow[]>([]);
  const [mapExpanded, setMapExpanded] = useState(false);

  const [comparison, setComparison] = useState<GovComparisonData | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<GovSuggestionItem[] | null>(
    null,
  );
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

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
    const sample = rows[0];
    const from = formatPeriodLabel(sample?.기준분기);
    const to = formatPeriodLabel(sample?.예측분기);
    setPeriodLabel(
      from === '-' && to === '-'
        ? '기간 정보 없음'
        : to === '-'
          ? from
          : `${from} ~ ${to}`,
    );

    setPriorityRegions(
      bySevere.slice(0, 3).map((row, i) => ({
        rank: i + 1,
        regionName: row.지역,
        score: priorityScore(row),
        accidentCount: getAccidentCount(row),
        riskLevel: toRiskLevel(row.중대사고등급),
      })),
    );

    const rates = rows.map((r) => r.예측사고율_퍼센트 ?? 0);
    const nextRisk: Record<string, RiskLevel> = {};
    for (const row of rows) {
      const code = DAEGU_DISTRICTS.find((d) => d.name === row.지역)?.code;
      if (code) {
        nextRisk[code] = severeRateToMapLevel(
          row.예측사고율_퍼센트 ?? 0,
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
        let rows: GovPredictResult[];
        try {
          const snap = await fetchGovForecasts({ freq: 'Q' });
          rows = snap.rows;
        } catch {
          // 배치 없거나 API 오류 → 기존 AI 실시간 폴백
          const all = await predictGov({ freq: 'Q' });
          rows = [...(Array.isArray(all) ? all : [all])];
        }
        if (cancelled) return;
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

  const selectedDistrictId =
    allRows.find((r) => r.지역 === selectedName)?.districtId ?? null;

  useEffect(() => {
    if (!selectedName) {
      setComparison(null);
      setComparisonError(null);
      setComparisonLoading(false);
      setSuggestions(null);
      setSuggestionsError(null);
      setSuggestionsLoading(false);
      return;
    }
    if (selectedDistrictId == null) {
      const ready = allRows.length > 0;
      setComparison(null);
      setSuggestions(null);
      setComparisonError(ready ? '구 식별자를 불러오지 못했습니다.' : null);
      setSuggestionsError(ready ? '구 식별자를 불러오지 못했습니다.' : null);
      setComparisonLoading(!ready);
      setSuggestionsLoading(!ready);
      return;
    }

    let cancelled = false;
    setComparisonLoading(true);
    setComparisonError(null);
    setSuggestionsLoading(true);
    setSuggestionsError(null);

    void fetchGovComparison(selectedDistrictId)
      .then((data) => {
        if (cancelled) return;
        setComparison(data);
        setComparisonError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setComparison(null);
        setComparisonError(
          govFetchErrorMessage(e, '해당 구 데이터가 없습니다'),
        );
      })
      .finally(() => {
        if (!cancelled) setComparisonLoading(false);
      });

    void fetchGovSuggestions(selectedDistrictId)
      .then((data) => {
        if (cancelled) return;
        setSuggestions(data);
        setSuggestionsError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setSuggestions(null);
        setSuggestionsError(
          govFetchErrorMessage(e, '해당 구 데이터가 없습니다'),
        );
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedName, selectedDistrictId, allRows.length]);

  // PDF용 대시보드 스냅샷 — ReportsPage에서 sessionStorage로 읽음
  useEffect(() => {
    if (!selectedName || !allRows.length || !priorityRegions.length) return;

    const selected = allRows.find((r) => r.지역 === selectedName);
    if (!selected) return;

    const total = getAccidentCount(selected);
    const types = selected.예측사고유형_퍼센트 ?? {};
    const typeItems = Object.entries(types)
      .map(
        ([name, pct]) =>
          [name, Math.round((Number(pct) / 100) * total)] as [string, number],
      )
      .sort((a, b) => b[1] - a[1]);

    const from = formatPeriodLabel(selected.기준분기);
    const to = formatPeriodLabel(selected.예측분기);
    const period_label =
      from === '-' && to === '-'
        ? '-'
        : to === '-'
          ? from
          : `${from} → ${to}`;

    const severityLatest =
      historyData?.지역 === selectedName && historyData.forecast?.경중_건수
        ? GOV_SEVERITY_KEYS.map((label) => ({
            label,
            value: Number(historyData.forecast.경중_건수[label] ?? 0),
          }))
        : undefined;

    writeSessionJson(GOV_PDF_SNAPSHOT_KEY, {
      지역: selectedName,
      period_label,
      top3: priorityRegions.map((r) => ({
        rank: r.rank,
        region: r.regionName,
        severe_rate: r.score,
        count: r.accidentCount,
        grade: r.riskLevel,
      })),
      selected: {
        grade: selected.중대사고등급,
        severe_rate: Number(selected.예측중대사고율_퍼센트.toFixed(1)),
        count: total,
        types: typeItems,
      },
      comparison: comparison ?? undefined,
      suggestions: suggestions?.map((s) => ({
        title: s.title,
        desc: s.desc,
      })),
      severityLatest,
    });
  }, [
    selectedName,
    allRows,
    priorityRegions,
    comparison,
    suggestions,
    historyData,
  ]);

  return (
    <div
      className={`${styles.govPage} ${mapExpanded ? styles.govPageMapExpanded : ''}`}
    >
      <div className={styles.row1}>
        <div className={styles.cellMap}>
          <MapCard
            title="사고위험 지도 / 우선점검 점수"
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
        <div className={styles.cellCompare}>
          <ComparisonCard
            districtName={selectedName}
            data={comparison}
            loading={comparisonLoading}
            error={comparisonError}
          />
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.cellTrend}>
          <SeverityStackedCard
            regionName={selectedName}
            data={historyData}
            loading={historyLoading && !historyData}
            error={historyError}
          />
        </div>
        <div className={styles.cellSuggest}>
          <SuggestionsCard
            data={suggestions}
            loading={suggestionsLoading}
            error={suggestionsError}
          />
        </div>
        <div className={styles.cellTop3}>
          <PriorityTop3Card
            rows={priorityRegions}
            selectedCode={selectedCode}
            loading={loading}
            error={error}
            onSelectCode={setSelectedCode}
          />
        </div>
      </div>
    </div>
  );
}

export default GovDashboardPage;
