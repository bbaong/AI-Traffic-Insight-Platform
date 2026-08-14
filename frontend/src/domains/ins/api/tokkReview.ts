import { TOKK_STATUS_ORDER } from '../constants/tokkStatus';
import type { ApiResponse } from '../types/prediction';
import type {
  ChecklistAnswers,
  TokkResult,
  TokkStatus,
} from '../types/consulting';
import { apiUrl, readJson } from "../../../shared/api/http";

/** 백엔드 POST /api/discount-riders/evaluate 응답 한 건 */
interface DiscountRiderApiItem {
  riderKey: string;
  riderName: string;
  iconKey: string;
  badge: string;
  reasonText: string;
  additionalCheckText: string | null;
}

const RIDER_KEY_TO_ID: Record<string, string> = {
  mileage_discount: 'mileage',
  blackbox_discount: 'blackbox',
  safe_driving_score_discount: 'safedrive',
  fcw_discount: 'fcw',
  ldws_discount: 'ldw',
};

const ICON_KEY_TO_EMOJI: Record<string, string> = {
  car: '🚗',
  camera: '📹',
  shield: '🛡️',
  radar: '⚠️',
  lane: '➖',
};

function badgeToStatus(badge: string): TokkStatus {
  switch (badge) {
    case '검토권장':
      return 'RECOMMEND';
    case '추가확인필요':
      return 'CHECK';
    case '현재제외':
      return 'EXCLUDE';
    case '기존가입확인':
      return 'EXISTING';
    default:
      return 'CHECK';
  }
}

function mapRiderItem(item: DiscountRiderApiItem): TokkResult {
  const id = RIDER_KEY_TO_ID[item.riderKey] ?? item.riderKey;
  const extra = item.additionalCheckText?.trim();
  const desc = extra
    ? `${item.reasonText} ${extra}`
    : item.reasonText;

  return {
    id,
    name: item.riderName,
    desc,
    status: badgeToStatus(item.badge),
    icon: ICON_KEY_TO_EMOJI[item.iconKey] ?? '📋',
  };
}

/**
 * 체크리스트 답변 → 맞춤 특약 검토 결과.
 * POST /api/discount-riders/evaluate (DB 없음, 순수 판정)
 */
export async function fetchTokkReview(
  input: ChecklistAnswers,
): Promise<TokkResult[]> {
  const res = await fetch(apiUrl('/api/discount-riders/evaluate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const json = await readJson<ApiResponse<DiscountRiderApiItem[]>>(
    res,
    '특약 검토 응답을 해석하지 못했습니다.',
  );

  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.message ?? '특약 검토에 실패했습니다.');
  }

  return json.data
    .map(mapRiderItem)
    .sort(
      (a, b) => TOKK_STATUS_ORDER[a.status] - TOKK_STATUS_ORDER[b.status],
    );
}
