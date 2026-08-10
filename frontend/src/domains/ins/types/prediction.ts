export type RiskGrade = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface InsPredictRequest {
  구군: string;
  연령대: string;
  성별: string;
  차종: string;
}

/** 표준약관 6대 담보 추천 (AI coverage_rules) */
export interface CoverageRecommendItem {
  id: string;
  name: string;
  recommended: boolean;
  script: string;
  reason: string;
}

export interface InsPredictData {
  버전: string;
  variant: 'ins' | string;
  예측등급: RiskGrade | string;
  위험도: number;
  등급확률: Record<string, number>;
  사고경중비율?: Record<string, number>;
  담보추천?: CoverageRecommendItem[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}