import { HttpError } from '../lib/http';
import { listCustomers, listCustomerConsultations } from './customer.service';
import { getConsultationReport } from './consultationReport.service';
import { predictRisk } from './aiPredict.service';
import { evaluateDiscountRiders } from './discountRider.service';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim() ?? '';
const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash';
const MAX_TOOL_ROUNDS = 6;
const MAX_HISTORY = 16;

/** 프론트 InsChatPanel 과 동일 — API 직접 호출 시 2차 차단 */
export const OFF_TOPIC_REPLY =
  '죄송합니다. 상담 외 목적은 도움을 드릴 수 없습니다.';

const TOPIC_RE =
  /고객|상담|위험|특약|스크립트|브리핑|점수|고위험|갱신|대인|대물|리포트|보험|사고|차량|지역|목록|진행/;

const OFF_TOPIC_RE =
  /점심|저녁|아침|뭐\s*먹|밥\s*먹|날씨|농담|게임|노래\s*추천|연애|주식\s*찍어|오늘\s*뭐해|심심/;

export type InsChatHistoryItem = {
  role: 'user' | 'model' | 'assistant';
  text?: string;
  content?: string;
};

export type InsChatResult = {
  reply: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown> }>;
};

type GeminiPart = {
  text?: string;
  functionCall?: { name?: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: unknown };
};

type GeminiContent = { role: string; parts: GeminiPart[] };

function kstToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function isOffTopicMessage(message: string, customerNames: string[]): boolean {
  const t = message.trim();
  if (!t) return false;
  if (customerNames.some((n) => n && t.includes(n))) return false;
  if (TOPIC_RE.test(t)) return false;
  return OFF_TOPIC_RE.test(t);
}

/** 잡담 정규식에 걸릴 때만 고객명을 조회해 프론트와 같은 판정을 한다. */
async function resolveOffTopic(
  message: string,
  userId: bigint,
): Promise<boolean> {
  const t = message.trim();
  if (!t || TOPIC_RE.test(t) || !OFF_TOPIC_RE.test(t)) return false;

  const customers = await listCustomers(undefined, userId);
  const names = customers
    .map((c) => String(c.name ?? '').trim())
    .filter(Boolean);
  return isOffTopicMessage(message, names);
}

function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '****';
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

function slimCustomer(row: Record<string, unknown>) {
  return {
    customerId: row.customerId,
    name: row.name,
    phone: maskPhone(typeof row.phone === 'string' ? row.phone : null),
    consultationCount: row.consultationCount,
    lastConsultedAt: row.lastConsultedAt,
    lastStatus: row.lastStatus,
    lastConsultationType: row.lastConsultationType,
    lastRiskScore: row.lastRiskScore,
    lastRiskGrade: row.lastRiskGrade,
    lastRegion: row.lastRegion,
    lastAgeGroup: row.lastAgeGroup,
    lastGender: row.lastGender,
    lastVehicleType: row.lastVehicleType,
  };
}

function systemPrompt(): string {
  return `당신은 AI Traffic Insight 보험 상담 보조 챗봇입니다.
상담원이 고객·상담·위험도·특약을 빠르게 확인하도록 돕습니다.

규칙:
- 고객·상담·점수가 필요하면 반드시 도구를 호출하세요. 없는 고객을 만들지 마세요.
- 도구 결과만 근거로 답하세요. ok=false 이면 그 오류를 안내하세요.
- 전화번호는 마스킹된 값만 말하고, 원본 번호를 추측하지 마세요.
- 고객 삭제/숨김, 상담 저장, PDF 생성은 하지 마세요.
- 답은 한국어, 짧게. 목록은 이름 / 최근상담일 / 점수 / 등급 / 지역 형식으로.
- 일반 보험 상식 질문은 도구 없이 답해도 됩니다.
- 오늘 날짜(KST)는 ${kstToday()} 입니다.
- 고객·상담·위험도·특약·스크립트와 무관한 일상/잡담(식사, 날씨, 농담 등)은 도구를 호출하지 말고 다음 한 문장만 답하세요: "${OFF_TOPIC_REPLY}"`;
}

const TOOL_DECLARATIONS = [
  {
    name: 'list_customers',
    description:
      '상담원이 등록한 고객 목록. 이름 검색·최근 상담 필터. query 없으면 전체.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: '고객 이름 부분 검색' },
        limit: { type: 'INTEGER', description: '1~20, 기본 8' },
        recent_days: {
          type: 'INTEGER',
          description: '최근 N일 이내 상담만',
        },
      },
    },
  },
  {
    name: 'find_high_risk_customers',
    description: '최근 상담 위험 점수가 높은 고객을 찾습니다.',
    parameters: {
      type: 'OBJECT',
      properties: {
        min_score: { type: 'NUMBER', description: '이 점수 이상' },
        grade: {
          type: 'STRING',
          description: 'Low / Moderate / High / Critical',
        },
        region: { type: 'STRING', description: '구·군 이름' },
        in_progress_only: { type: 'BOOLEAN' },
        limit: { type: 'INTEGER' },
      },
    },
  },
  {
    name: 'get_customer_brief',
    description: '고객 이름 또는 customerId로 최근 상담 요약.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name_or_id: { type: 'STRING' },
      },
      required: ['name_or_id'],
    },
  },
  {
    name: 'get_coverage_report',
    description: '저장된 상담 id로 표준담보 추천 리포트.',
    parameters: {
      type: 'OBJECT',
      properties: {
        consultation_id: { type: 'STRING' },
      },
      required: ['consultation_id'],
    },
  },
  {
    name: 'analyze_risk',
    description: '가상 프로필 위험도 예측. DB 저장 없음.',
    parameters: {
      type: 'OBJECT',
      properties: {
        district: { type: 'STRING' },
        age_group: { type: 'STRING' },
        gender: { type: 'STRING' },
        vehicle: { type: 'STRING' },
        day_night: { type: 'STRING' },
        road: { type: 'STRING' },
      },
      required: ['district', 'age_group', 'gender', 'vehicle'],
    },
  },
  {
    name: 'evaluate_discount_riders',
    description: '체크리스트 조건으로 할인특약 판정. DB 저장 없음.',
    parameters: {
      type: 'OBJECT',
      properties: {
        annual_mileage: { type: 'STRING' },
        blackbox_mounted: { type: 'STRING' },
        safe_driving_score_used: { type: 'STRING' },
        fcw_status: { type: 'STRING' },
        ldws_status: { type: 'STRING' },
        existing_discount_riders: { type: 'STRING' },
      },
    },
  },
];

function capLimit(v: unknown, fallback = 8): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(20, Math.trunc(n)));
}

async function toolListCustomers(
  userId: bigint,
  args: Record<string, unknown>,
) {
  const query =
    typeof args.query === 'string' && args.query.trim()
      ? args.query.trim()
      : undefined;
  let rows = (await listCustomers(query, userId)).map((r) =>
    slimCustomer(r as unknown as Record<string, unknown>),
  );
  const recentDays = Number(args.recent_days);
  if (Number.isFinite(recentDays) && recentDays > 0) {
    const cutoff = Date.now() - recentDays * 86400000;
    rows = rows.filter((r) => {
      const t = Date.parse(String(r.lastConsultedAt ?? ''));
      return Number.isFinite(t) && t >= cutoff;
    });
  }
  rows.sort((a, b) =>
    String(b.lastConsultedAt ?? '').localeCompare(String(a.lastConsultedAt ?? '')),
  );
  const limit = capLimit(args.limit);
  return {
    ok: true,
    count: rows.length,
    shown: Math.min(limit, rows.length),
    customers: rows.slice(0, limit),
  };
}

async function toolHighRisk(userId: bigint, args: Record<string, unknown>) {
  const minScore =
    args.min_score != null && args.min_score !== ''
      ? Number(args.min_score)
      : null;
  const grade = String(args.grade ?? '')
    .trim()
    .toLowerCase();
  const region = String(args.region ?? '').trim();
  const inProgress = Boolean(args.in_progress_only);
  let rows = (await listCustomers(undefined, userId)).map((r) =>
    slimCustomer(r as unknown as Record<string, unknown>),
  );
  rows = rows.filter((r) => {
    const score = r.lastRiskScore;
    if (score == null || typeof score !== 'number') return false;
    if (minScore != null && Number.isFinite(minScore) && score < minScore) {
      return false;
    }
    if (grade && String(r.lastRiskGrade ?? '').toLowerCase() !== grade) {
      return false;
    }
    if (region && !String(r.lastRegion ?? '').includes(region)) return false;
    if (inProgress && r.lastStatus !== 'IN_PROGRESS') return false;
    return true;
  });
  rows.sort((a, b) => {
    const ds = Number(b.lastRiskScore ?? 0) - Number(a.lastRiskScore ?? 0);
    if (ds !== 0) return ds;
    return String(b.lastConsultedAt ?? '').localeCompare(
      String(a.lastConsultedAt ?? ''),
    );
  });
  const limit = capLimit(args.limit);
  return {
    ok: true,
    count: rows.length,
    shown: Math.min(limit, rows.length),
    customers: rows.slice(0, limit),
  };
}

async function toolBrief(userId: bigint, args: Record<string, unknown>) {
  const key = String(args.name_or_id ?? '').trim();
  if (!key) return { ok: false, error: '이름 또는 고객 id가 필요합니다.' };

  let customerId = /^\d+$/.test(key) ? key : null;
  if (!customerId) {
    const hits = (await listCustomers(key, userId)).map((r) =>
      slimCustomer(r as unknown as Record<string, unknown>),
    );
    const exact = hits.filter((h) => h.name === key);
    const pool = exact.length ? exact : hits;
    if (pool.length === 0) {
      return { ok: true, found: false, message: '해당 고객이 없습니다.' };
    }
    if (pool.length > 1) {
      return {
        ok: true,
        found: true,
        multiple: true,
        message: '동명이인입니다. customerId로 다시 조회하세요.',
        candidates: pool.slice(0, 10),
      };
    }
    customerId = String(pool[0].customerId);
  }

  const detail = await listCustomerConsultations(customerId, userId);
  if (!detail) {
    return { ok: true, found: false, message: '해당 고객이 없습니다.' };
  }
  const consults = detail.consultations.map((row, i) => ({
    consultationId: row.consultationId,
    consultationType: row.consultationType,
    status: row.status,
    consultedAt: row.consultedAt,
    counselorName: row.counselorName,
    riskScore: row.riskScore,
    riskGrade: row.riskGrade,
    profile: row.profile,
    memo: row.memo,
    riders: row.riders.map((r) => ({
      riderName: r.riderKey,
      badge: r.badge,
      reason: r.reasonText,
    })),
    ...(i === 0
      ? {
          checklist: row.checklist.map((a) => ({
            label: a.itemLabel,
            value: a.answerValue,
          })),
        }
      : {}),
  }));
  return {
    ok: true,
    found: true,
    customer: {
      customerId: detail.customer.customerId,
      name: detail.customer.name,
      phone: maskPhone(detail.customer.phone),
    },
    latest: consults[0] ?? null,
    recentConsultations: consults.slice(0, 3),
    consultationCount: consults.length,
  };
}

async function toolReport(userId: bigint, args: Record<string, unknown>) {
  const cid = String(args.consultation_id ?? '').trim();
  if (!/^\d+$/.test(cid)) {
    return { ok: false, error: 'consultation_id 가 숫자가 아닙니다.' };
  }

  const report = await getConsultationReport(BigInt(cid), userId);
  if (!report) {
    return {
      ok: false,
      error: '해당 상담을 찾을 수 없거나 담보 리포트를 생성할 수 없습니다.',
    };
  }
  return { ok: true, report };
}

async function toolAnalyze(args: Record<string, unknown>) {
  let gender = String(args.gender ?? '').trim();
  if (['MALE', '남', '남성'].includes(gender)) gender = '남';
  else if (['FEMALE', '여', '여성'].includes(gender)) gender = '여';
  const analysis = await predictRisk({
    구군: String(args.district ?? ''),
    연령대: String(args.age_group ?? ''),
    성별: gender,
    차종: String(args.vehicle ?? ''),
    주야: String(args.day_night ?? '주간') || '주간',
    노면상태: String(args.road ?? '건조') || '건조',
  });
  return { ok: true, analysis };
}

function toolRiders(args: Record<string, unknown>) {
  const riders = evaluateDiscountRiders({
    annual_mileage: args.annual_mileage,
    blackbox_mounted: args.blackbox_mounted,
    safe_driving_score_used: args.safe_driving_score_used,
    fcw_status: args.fcw_status,
    ldws_status: args.ldws_status,
    existing_discount_riders: args.existing_discount_riders,
  });
  return { ok: true, riders };
}

async function executeTool(
  userId: bigint,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  try {
    switch (name) {
      case 'list_customers':
        return await toolListCustomers(userId, args);
      case 'find_high_risk_customers':
        return await toolHighRisk(userId, args);
      case 'get_customer_brief':
        return await toolBrief(userId, args);
      case 'get_coverage_report':
        return await toolReport(userId, args);
      case 'analyze_risk':
        return await toolAnalyze(args);
      case 'evaluate_discount_riders':
        return toolRiders(args);
      default:
        return { ok: false, error: `알 수 없는 도구: ${name}` };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function geminiGenerate(contents: GeminiContent[]): Promise<GeminiPart[]> {
  if (!GEMINI_API_KEY) {
    throw new HttpError('GEMINI_API_KEY 가 없습니다.', 503);
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt() }] },
      contents,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const json = (await res.json()) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  };
  if (!res.ok) {
    throw new HttpError(
      json.error?.message ?? 'Gemini 요청 실패',
      res.status === 404 ? 502 : 502,
    );
  }
  return json.candidates?.[0]?.content?.parts ?? [];
}

function historyToContents(history: InsChatHistoryItem[]): GeminiContent[] {
  const sliced = history.slice(-MAX_HISTORY);
  const out: GeminiContent[] = [];
  for (const item of sliced) {
    const text = String(item.text ?? item.content ?? '').trim();
    if (!text) continue;
    const role = item.role === 'user' ? 'user' : 'model';
    out.push({ role, parts: [{ text }] });
  }
  return out;
}

export async function runInsChat(input: {
  userId: bigint;
  message: string;
  history?: InsChatHistoryItem[];
}): Promise<InsChatResult> {
  if (await resolveOffTopic(input.message, input.userId)) {
    return { reply: OFF_TOPIC_REPLY, toolCalls: [] };
  }

  const contents: GeminiContent[] = [
    ...historyToContents(input.history ?? []),
    { role: 'user', parts: [{ text: input.message }] },
  ];
  const toolCalls: InsChatResult['toolCalls'] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const parts = await geminiGenerate(contents);
    const calls = parts.filter((p) => p.functionCall?.name);
    if (calls.length === 0) {
      const reply = parts
        .map((p) => p.text ?? '')
        .join('')
        .trim();
      return { reply: reply || '(응답이 비었습니다.)', toolCalls };
    }

    contents.push({ role: 'model', parts });
    const frParts: GeminiPart[] = [];
    for (const part of calls) {
      const name = part.functionCall!.name as string;
      const args = (part.functionCall!.args ?? {}) as Record<string, unknown>;
      toolCalls.push({ name, args });
      const result = await executeTool(input.userId, name, args);
      frParts.push({
        functionResponse: {
          name,
          response: result as Record<string, unknown>,
        },
      });
    }
    contents.push({ role: 'user', parts: frParts });
  }

  return {
    reply: '도구 호출이 너무 많아 중단했습니다. 질문을 나눠 주세요.',
    toolCalls,
  };
}
