/** 대구광역시 중심 좌표 · GOV/INS 공용 (fallback; 실제로는 bounds 자동 맞춤) */
export const DAEGU_CENTER = { lat: 35.8714, lng: 128.6014 } as const;

/**
 * 초기 줌 fallback (작을수록 넓게).
 * MapCard는 구·군 경계 LatLngBounds로 setBounds 하므로 군위 포함 시 자동 조정된다.
 */
export const DAEGU_ZOOM_LEVEL = 9;
