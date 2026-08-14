import { useEffect, useRef, useState } from 'react';
import { DashboardCard } from '../../../shared/components/dashboard';
import { MapCard, DISTRICT_RISK_MOCK } from '../../../shared/components/dashboard/MapCard';
import type { DistrictBoundary } from '../../../shared/constants/daeguBoundaries';
import { DAEGU_DISTRICTS } from '../../../shared/constants/daeguBoundaries';
import type { RiskLevel } from '../../../shared/types/dashboard';
import {
  fetchGovForecasts,
  predictGov,
  severeRateToMapLevel,
  type GovPredictResult,
} from '../api/prediction';
import {
  fetchRegionCompare,
  GovApiError,
  type RegionCompareData,
} from '../api/govRegionCompare';
import { CompareAccidentTypesCard } from '../components/CompareAccidentTypesCard';
import { CompareInsightsCard } from '../components/CompareInsightsCard';
import { CompareMetricsCard } from '../components/CompareMetricsCard';
import { CompareSelectBar } from '../components/CompareSelectBar';
import { CompareSummaryCard } from '../components/CompareSummaryCard';
import { CompareTrendCard } from '../components/CompareTrendCard';
import {
  COMPARE_MAX_CHIPS,
  DISTRICT_COLOR_BY_CODE,
  DISTRICT_COLOR_LEGEND,
  resolveDistrictName,
  type CompareChip,
} from '../utils/regionCompareUi';
import surface from '../components/compareSurface.module.css';
import styles from './GovRegionComparePage.module.css';

const EMPTY_PROMPT =
  '지도에서 비교하고 싶은 구를 클릭 후 비교하기 버튼을 눌러주세요';

const GOV_PRED_CACHE_KEY = 'gov:forecasts:Q';

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
    /* ignore */
  }
}

function matchForecastRow(
  rows: GovPredictResult[],
  name: string,
): GovPredictResult | undefined {
  const resolved = resolveDistrictName(name);
  return rows.find((r) => resolveDistrictName(r.지역) === resolved);
}

function districtByForecastName(raw: string) {
  const resolved = resolveDistrictName(raw);
  return DAEGU_DISTRICTS.find((d) => d.name === resolved);
}

function rowsToRisk(rows: GovPredictResult[]): Record<string, RiskLevel> {
  const rates = rows.map((r) => r.예측사고율_퍼센트 ?? r.예측중대사고율_퍼센트 ?? 0);
  const next: Record<string, RiskLevel> = {};
  for (const row of rows) {
    const code = districtByForecastName(row.지역)?.code;
    if (code) {
      next[code] = severeRateToMapLevel(
        row.예측사고율_퍼센트 ?? row.예측중대사고율_퍼센트 ?? 0,
        rates,
      );
    }
  }
  return next;
}

function formatPeriodLabel(raw?: string | null): string {
  if (!raw) return '';
  const q = /^(\d{4})Q([1-4])$/i.exec(raw);
  if (q) return `${q[1]}년 ${q[2]}분기`;
  return raw;
}

function Placeholder({
  title,
  message,
  busy,
  error,
  onRetry,
}: {
  title: string;
  message: string;
  busy?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  return (
    <DashboardCard title={title} className={surface.card}>
      <div className={styles.placeholder}>
        <p className={error ? styles.placeholderError : undefined} aria-busy={busy}>
          {message}
        </p>
        {onRetry ? (
          <button type="button" className={styles.retry} onClick={onRetry}>
            다시 시도
          </button>
        ) : null}
      </div>
    </DashboardCard>
  );
}

export function GovRegionComparePage() {
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const forecastRowsRef = useRef<GovPredictResult[]>([]);
  const compareGenRef = useRef(0);

  const [riskByCode, setRiskByCode] = useState<Record<string, RiskLevel>>({});
  const [forecastRows, setForecastRows] = useState<GovPredictResult[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  const [chips, setChips] = useState<CompareChip[]>([]);
  const [result, setResult] = useState<RegionCompareData | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<{
    status: number;
    message: string;
  } | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    forecastRowsRef.current = forecastRows;
  }, [forecastRows]);

  useEffect(() => {
    let cancelled = false;

    function applyRows(rows: GovPredictResult[]) {
      setForecastRows(rows);
      forecastRowsRef.current = rows;
      setRiskByCode(rowsToRisk(rows));
    }

    async function loadMap() {
      const cached = readSessionJson<GovPredictResult[]>(GOV_PRED_CACHE_KEY);
      if (cached?.length) {
        applyRows(cached);
        setMapLoading(false);
      } else {
        setMapLoading(true);
      }
      setMapError(null);

      try {
        let rows: GovPredictResult[];
        try {
          const snap = await fetchGovForecasts({ freq: 'Q' });
          rows = snap.rows;
        } catch {
          const all = await predictGov({ freq: 'Q' });
          rows = [...(Array.isArray(all) ? all : [all])];
        }
        if (cancelled) return;
        writeSessionJson(GOV_PRED_CACHE_KEY, rows);
        applyRows(rows);
      } catch (e) {
        if (!cancelled && !cached?.length) {
          setMapError(
            e instanceof Error ? e.message : '지도를 불러오지 못했습니다.',
          );
        }
      } finally {
        if (!cancelled) setMapLoading(false);
      }
    }

    void loadMap();
    return () => {
      cancelled = true;
    };
  }, []);

  function showToast(message: string) {
    setToast(message);
  }

  function handleDistrictSelect(district: DistrictBoundary) {
    const row = matchForecastRow(forecastRowsRef.current, district.name);
    const districtId = row?.districtId;
    if (districtId == null) {
      showToast(
        forecastRowsRef.current.length
          ? `${district.name} 식별자를 찾지 못했습니다.`
          : '예측 데이터를 먼저 불러오는 중입니다. 잠시 후 다시 클릭하세요.',
      );
      return;
    }

    const exists = chips.some((c) => c.districtId === districtId);
    if (exists) {
      setChips((prev) => prev.filter((c) => c.districtId !== districtId));
      return;
    }
    if (chips.length >= COMPARE_MAX_CHIPS) {
      showToast(`비교 지역은 최대 ${COMPARE_MAX_CHIPS}개까지 선택할 수 있습니다.`);
      return;
    }
    setChips((prev) => [
      ...prev,
      { districtId, name: district.name, code: district.code },
    ]);
  }

  function addChip(chip: CompareChip) {
    if (chips.some((c) => c.districtId === chip.districtId)) return;
    if (chips.length >= COMPARE_MAX_CHIPS) {
      showToast(`비교 지역은 최대 ${COMPARE_MAX_CHIPS}개까지 선택할 수 있습니다.`);
      return;
    }
    setChips((prev) => [...prev, chip]);
  }

  const districtOptions: CompareChip[] = forecastRows.flatMap((row) => {
    if (row.districtId == null) return [];
    const district = districtByForecastName(row.지역);
    if (!district) return [];
    return [
      {
        districtId: row.districtId,
        name: district.name,
        code: district.code,
      },
    ];
  });

  async function runCompare(ids: number[]) {
    if (ids.length === 0) {
      showToast('비교할 구를 지도에서 선택하세요.');
      return;
    }
    const gen = ++compareGenRef.current;
    setComparing(true);
    setCompareError(null);
    try {
      const data = await fetchRegionCompare(ids);
      if (gen !== compareGenRef.current) return;
      setResult(data);
    } catch (e) {
      if (gen !== compareGenRef.current) return;
      const status = e instanceof GovApiError ? e.status : 500;
      const fallback =
        status === 400
          ? '비교할 구를 올바르게 선택하세요.'
          : status === 404
            ? '데이터 준비 중'
            : '지역비교를 불러오지 못했습니다.';
      setCompareError({
        status,
        message: e instanceof Error ? e.message : fallback,
      });
      if (status === 400) {
        showToast('칩 개수와 선택을 확인한 뒤 다시 비교하세요.');
      }
    } finally {
      if (gen === compareGenRef.current) setComparing(false);
    }
  }

  function resetFilters() {
    compareGenRef.current += 1;
    setChips([]);
    setResult(null);
    setCompareError(null);
    setComparing(false);
  }

  const selectedCodes = chips.map((c) => c.code);
  const metaCaption =
    result?.meta.asOf || result?.meta.forecastLabel
      ? [
          result.meta.asOf ? `기준 ${formatPeriodLabel(result.meta.asOf)}` : null,
          result.meta.forecastLabel
            ? `예측 ${formatPeriodLabel(result.meta.forecastLabel)}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null;

  return (
    <div className={styles.page}>
      <div className={styles.stickySelect}>
        <CompareSelectBar
          chips={chips}
          options={districtOptions}
          comparing={comparing}
          onRemove={(id) =>
            setChips((prev) => prev.filter((c) => c.districtId !== id))
          }
          onAdd={addChip}
          onCompare={() => void runCompare(chips.map((c) => c.districtId))}
          onReset={resetFilters}
          canReset={chips.length > 0 || Boolean(result) || Boolean(compareError)}
        />
      </div>

      {metaCaption ? <p className={styles.meta}>{metaCaption}</p> : null}

      <div className={styles.grid}>
        <div ref={mapSectionRef} className={styles.cellMap}>
          <MapCard
            title="구별 위험도 비교 지도"
            riskByCode={
              Object.keys(riskByCode).length > 0
                ? riskByCode
                : DISTRICT_RISK_MOCK
            }
            fillByCode={DISTRICT_COLOR_BY_CODE}
            selectedCodes={selectedCodes}
            independentSelection
            showSelectionHint={selectedCodes.length > 0}
            onDistrictSelect={handleDistrictSelect}
            legend={[...DISTRICT_COLOR_LEGEND]}
          />
          {mapLoading ? (
            <p className={styles.mapStatus}>지도 데이터를 불러오는 중…</p>
          ) : null}
          {mapError ? (
            <p className={styles.mapStatus} role="alert">
              {mapError}
            </p>
          ) : null}
        </div>

        <div className={styles.cellSummary}>
          {result ? (
            <CompareSummaryCard
              districts={result.districts}
              cityAvg={result.cityAvg}
            />
          ) : (
            <Placeholder
              title="비교 요약"
              message={
                comparing
                  ? '비교 데이터를 불러오는 중…'
                  : compareError
                    ? compareError.status === 404
                      ? '데이터 준비 중'
                      : compareError.message
                    : EMPTY_PROMPT
              }
              busy={comparing}
              error={Boolean(compareError)}
              onRetry={
                compareError && compareError.status >= 500
                  ? () => void runCompare(chips.map((c) => c.districtId))
                  : undefined
              }
            />
          )}
        </div>

        <div className={styles.cellMetrics}>
          {result ? (
            <CompareMetricsCard
              districts={result.districts}
              cityAvg={result.cityAvg}
            />
          ) : (
            <Placeholder title="핵심 지표 비교" message={EMPTY_PROMPT} />
          )}
        </div>

        <div className={styles.cellTypes}>
          {result ? (
            <CompareAccidentTypesCard
              districts={result.districts}
              cityAvg={result.cityAvg}
            />
          ) : (
            <Placeholder title="사고유형 구성 비교" message={EMPTY_PROMPT} />
          )}
        </div>

        <div className={styles.cellTrend}>
          {result ? (
            <CompareTrendCard
              districts={result.districts}
              cityAvg={result.cityAvg}
            />
          ) : (
            <Placeholder title="분기별 사고 추세 비교" message={EMPTY_PROMPT} />
          )}
        </div>

        <div className={styles.cellInsights}>
          {result ? (
            <CompareInsightsCard insights={result.insights} />
          ) : (
            <Placeholder title="비교 인사이트" message={EMPTY_PROMPT} />
          )}
        </div>
      </div>

      {compareError?.status != null && compareError.status >= 500 && result ? (
        <p className={styles.inlineError} role="alert">
          최신 비교를 불러오지 못했습니다.{' '}
          <button
            type="button"
            className={styles.retryLink}
            onClick={() => void runCompare(chips.map((c) => c.districtId))}
          >
            재시도
          </button>
        </p>
      ) : null}

      {toast ? (
        <div className={styles.toast} role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

export default GovRegionComparePage;
