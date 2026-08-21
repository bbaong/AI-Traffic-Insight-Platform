import { GovApiError } from './govDashboard';
import { apiFetch } from '../../../shared/api/http';

export interface RegionCompareMeta {
  asOf: string;
  forecastLabel: string | null;
  modelVersion: string;
  benchmarkPeriodEnd: string;
  benchmarkCalculatedAt: string;
  accidentTypePeriodEnd: string | null;
  riskWeights: {
    scale: number;
    severity: number;
    pedestrian: number;
    night: number;
    signal: number;
  };
  maxDistricts: number;
}

export interface ComparisonMetrics {
  pedestrianPct: number;
  nightPct: number;
  seriousPct: number;
  signalPct: number;
  pedestrianCount: number;
  nightCount: number;
  seriousCount: number;
  signalCount: number;
  totalCount: number;
}

export interface AccidentTypeMix {
  차대차: number;
  차대사람: number;
  차량단독: number;
}

export interface TrendPoint {
  quarterLabel: string;
  total: number;
  seriousAbove: number | null;
  isForecast: boolean;
}

export interface RegionCompareSummary {
  riskScore: number;
  rank: number | null;
  rankTotal: number;
  tags: string[];
  predictedAccidentCount: number;
  predictedSharePct: number | null;
  predictedSevereRatePct: number | null;
}

export interface RegionCompareEntity {
  summary: RegionCompareSummary;
  metrics: ComparisonMetrics;
  accidentTypes: AccidentTypeMix;
  trend: {
    history: TrendPoint[];
    forecast: TrendPoint;
  };
}

export interface RegionCompareDistrict extends RegionCompareEntity {
  districtId: number;
  districtName: string;
  suggestions: Array<{
    key: string;
    icon: string;
    title: string;
    desc: string;
  }>;
}

export interface RegionCompareInsight {
  districtId: number | null;
  districtName: string | null;
  key: string;
  text: string;
}

export interface RegionCompareData {
  meta: RegionCompareMeta;
  cityAvg: RegionCompareEntity;
  districts: RegionCompareDistrict[];
  insights: RegionCompareInsight[];
}

export { GovApiError };

export async function fetchRegionCompare(
  districtIds: number[],
): Promise<RegionCompareData> {
  const res = await apiFetch(
    '/api/gov/region-compare',
    {},
    { districtIds: districtIds.join(',') },
  );

  let json: { success?: boolean; message?: string; data?: RegionCompareData } =
    {};
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new GovApiError(res.status, '응답을 해석하지 못했습니다.');
  }

  if (!res.ok || !json.success || !json.data) {
    if (res.status === 400) {
      throw new GovApiError(
        400,
        json.message ?? '비교할 구를 1개 이상 선택하세요.',
      );
    }
    if (res.status === 404) {
      throw new GovApiError(404, json.message ?? '데이터 준비 중');
    }
    throw new GovApiError(
      res.status || 500,
      json.message ?? '지역비교 조회 실패',
    );
  }

  return json.data;
}
