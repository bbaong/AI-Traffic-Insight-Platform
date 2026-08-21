/** InsureGuard v1.0.3 정본. LabelEncoder 매칭용 — 임의 변경 금지. */

export const GENDER_OPTIONS = ['남', '여'] as const;

export const AGE_OPTIONS = [
  '20세 이하',
  '21-30세',
  '31-40세',
  '41-50세',
  '51-60세',
  '61-64세',
  '65세 이상',
] as const;

export const VEHICLE_OPTIONS = [
  '승용',
  '승합',
  '화물',
  '이륜',
  '원동기',
  '자전거',
  '개인형이동수단(PM)',
  '사륜오토바이(ATV)',
  '건설기계',
  '농기계',
  '특수',
] as const;

/** 짧은 구·군명만 (대구광역시 prefix 금지) */
export const REGION_OPTIONS = [
  '중구',
  '동구',
  '서구',
  '남구',
  '북구',
  '수성구',
  '달서구',
  '달성군',
  '군위군',
] as const;

export type GenderOption = (typeof GENDER_OPTIONS)[number];
export type AgeOption = (typeof AGE_OPTIONS)[number];
export type VehicleOption = (typeof VEHICLE_OPTIONS)[number];
export type RegionOption = (typeof REGION_OPTIONS)[number];

export const PROFILE_FIELDS = [
  { id: 'gender', label: '성별', options: GENDER_OPTIONS },
  { id: 'age', label: '연령대', options: AGE_OPTIONS },
  { id: 'vehicle', label: '차종', options: VEHICLE_OPTIONS },
  { id: 'region', label: '지역', options: REGION_OPTIONS },
] as const;

export type ProfileFieldId = (typeof PROFILE_FIELDS)[number]['id'];
