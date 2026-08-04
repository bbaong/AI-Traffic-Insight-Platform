import type { RiderBadge } from './discountRider';

export type ReasonField =
  | 'reasonRecommend'
  | 'reasonNeedCheck'
  | 'reasonExclude'
  | 'reasonAlreadyJoined';

export interface RiderText {
  riderName: string;
  iconKey: string;
  reasonRecommend: string;
  reasonNeedCheck: string;
  reasonExclude: string;
  reasonAlreadyJoined: string;
  additionalCheckText: string | null;
}

export const REASON_FIELD_BY_BADGE: Record<RiderBadge, ReasonField> = {
  검토권장: 'reasonRecommend',
  추가확인필요: 'reasonNeedCheck',
  현재제외: 'reasonExclude',
  기존가입확인: 'reasonAlreadyJoined',
};

export const RIDER_TEXTS: Record<string, RiderText> = {
  mileage_discount: {
    riderName: '마일리지 할인특약',
    iconKey: 'car',
    reasonRecommend:
      '연간 주행거리 정보가 확인되었습니다. 보험사별 인정 구간에 맞는지 확인 후 할인을 검토하세요.',
    reasonNeedCheck:
      '연간 주행거리를 확인한 뒤 마일리지 할인특약 적용 여부를 판단하세요.',
    reasonExclude:
      '현재 조건에서는 마일리지 할인특약 안내 대상이 아닙니다.',
    reasonAlreadyJoined:
      '이미 마일리지 할인특약이 적용 중입니다. 중복 가입 없이 유지 여부만 확인하세요.',
    additionalCheckText: '보험사별 인정 주행거리 구간을 약관에서 확인하세요.',
  },
  blackbox_discount: {
    riderName: '블랙박스 할인특약',
    iconKey: 'camera',
    reasonRecommend:
      '블랙박스 고정 장착(일반형·상시녹화형)이 확인되었습니다. 할인특약 가입을 검토하세요.',
    reasonNeedCheck:
      '블랙박스 장착 여부를 추가 확인한 뒤 할인특약 적용 여부를 판단하세요.',
    reasonExclude:
      '블랙박스 미장착으로 확인되어 현재는 제외됩니다.',
    reasonAlreadyJoined:
      '이미 블랙박스 할인특약이 적용 중입니다. 중복 추천 없이 유지 여부만 확인하세요.',
    additionalCheckText: '상시·고정 장착 및 영상 보관 요건을 확인하세요.',
  },
  safe_driving_score_discount: {
    riderName: '안전운전점수 할인특약',
    iconKey: 'shield',
    reasonRecommend:
      '안전운전점수 서비스 이용이 확인되었습니다. 할인특약 가입을 검토하세요.',
    reasonNeedCheck:
      '이용 서비스·점수·주행기록을 확인한 뒤 할인특약 적용 여부를 판단하세요.',
    reasonExclude:
      '안전운전점수 서비스를 이용하지 않아 현재는 제외됩니다.',
    reasonAlreadyJoined:
      '이미 안전운전점수 할인특약이 적용 중입니다. 중복 추천 없이 유지 여부만 확인하세요.',
    additionalCheckText: '보험사 인정 앱·최소 점수·주행거리 요건을 확인하세요.',
  },
  fcw_discount: {
    riderName: '전방충돌방지장치 할인특약',
    iconKey: 'radar',
    reasonRecommend:
      '출고 시 장착이 확인되었습니다. 할인특약 가입을 검토하세요.',
    reasonNeedCheck:
      '전방충돌방지장치 출고 시 장착 여부를 추가 확인하세요.',
    reasonExclude:
      '미장착으로 확인되어 현재는 할인 대상에서 제외됩니다.',
    reasonAlreadyJoined:
      '이미 전방충돌방지장치 할인특약이 적용 중입니다. 중복 추천 없이 유지 여부만 확인하세요.',
    additionalCheckText: '출고 사양서 또는 차량등록 옵션으로 장착 시점을 확인하세요.',
  },
  ldws_discount: {
    riderName: '차선이탈경고장치 할인특약',
    iconKey: 'lane',
    reasonRecommend:
      '출고 시 장착이 확인되었습니다. 할인특약 가입을 검토하세요.',
    reasonNeedCheck:
      '차선이탈경고장치 출고 시 장착 여부를 추가 확인하세요.',
    reasonExclude:
      '미장착으로 확인되어 현재는 할인 대상에서 제외됩니다.',
    reasonAlreadyJoined:
      '이미 차선이탈경고장치 할인특약이 적용 중입니다. 중복 추천 없이 유지 여부만 확인하세요.',
    additionalCheckText: '출고 사양서 또는 차량등록 옵션으로 장착 시점을 확인하세요.',
  },
};
