import { Component, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Markdown from 'react-markdown';
import {
  InsChatError,
  sendInsChat,
  type InsChatHistoryItem,
  type InsChatToolCall,
} from '../api/insChat';
import {
  formatConsultDate,
  RISK_GRADE_META,
} from '../constants/insEnums';
import type { CustomerListItem } from '../types/customers';
import styles from './InsChatPanel.module.css';

const CHIPS = [
  '최근 상담 5명',
  '고위험 고객',
  '진행 중 고위험',
] as const;

const LIST_TOOLS = new Set(['list_customers', 'find_high_risk_customers']);
const SIM_TOOLS = new Set(['analyze_risk', 'evaluate_discount_riders']);

const OFF_TOPIC_REPLY =
  '죄송합니다. 상담 외 목적은 도움을 드릴 수 없습니다.';

const TOPIC_RE =
  /고객|상담|위험|특약|스크립트|브리핑|점수|고위험|갱신|대인|대물|리포트|보험|사고|차량|지역|목록|진행/;

const OFF_TOPIC_RE =
  /점심|저녁|아침|뭐\s*먹|밥\s*먹|날씨|농담|게임|노래\s*추천|연애|주식\s*찍어|오늘\s*뭐해|심심/;

function isOffTopic(message: string, names: string[]): boolean {
  const t = message.trim();
  if (!t) return false;
  if (names.some((n) => n && t.includes(n))) return false;
  if (TOPIC_RE.test(t)) return false;
  return OFF_TOPIC_RE.test(t);
}

type Bubble =
  | { id: string; kind: 'user'; text: string }
  | {
      id: string;
      kind: 'model';
      text: string;
      toolCalls: InsChatToolCall[];
    }
  | { id: string; kind: 'error'; text: string; status: number; retryText: string };

function newId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function maskPhones(text: string): string {
  return text.replace(
    /(\d{2,3})-?(\d{3,4})-?(\d{4})/g,
    (_m, a: string, _mid: string, d: string) => `${a}-****-${d}`,
  );
}

function errorCopy(status: number, fallback: string): string {
  if (status === 401) return '세션이 만료됐어요. 다시 로그인해 주세요.';
  if (status === 400) return '질문을 이해하지 못했어요.';
  if (status === 503) return '지금 혼잡해요. 잠시 후 다시 시도해 주세요.';
  if (status === 502) return '응답을 받지 못했어요.';
  return fallback || '요청에 실패했습니다.';
}

function mentionedCustomers(
  reply: string,
  customers: CustomerListItem[],
): CustomerListItem[] {
  const hits = customers.filter(
    (c) => c.name.trim() && reply.includes(c.name.trim()),
  );
  const seen = new Set<string>();
  return hits.filter((c) => {
    if (seen.has(c.customerId)) return false;
    seen.add(c.customerId);
    return true;
  });
}

function toHistory(bubbles: Bubble[]): InsChatHistoryItem[] {
  const items: InsChatHistoryItem[] = [];
  for (const b of bubbles) {
    if (b.kind === 'user') items.push({ role: 'user', text: b.text });
    if (b.kind === 'model') items.push({ role: 'model', text: b.text });
  }
  return items.slice(-16);
}

function lastUserText(bubbles: Bubble[], beforeId: string): string {
  let found = '';
  for (const b of bubbles) {
    if (b.id === beforeId) break;
    if (b.kind === 'user') found = b.text;
  }
  return found;
}

function listCardTitle(userText: string, count: number): string {
  if (userText.includes('최근')) return `최근 상담 고객 ${count}명`;
  if (userText.includes('진행')) return '진행 중 고위험 고객';
  if (userText.includes('고위험')) return '고위험 고객';
  return `조회 결과 ${count}명`;
}

function scoreTone(
  grade: CustomerListItem['lastRiskGrade'],
  score: number | null,
): string {
  if (grade && RISK_GRADE_META[grade]) return RISK_GRADE_META[grade].color;
  if (score == null) return '#94a3b8';
  if (score >= 85) return '#b3261e';
  if (score >= 70) return '#f77c34';
  return '#64748b';
}

export function InsChatPanel({
  customers,
  selectedName,
  onSelectCustomer,
}: {
  customers: CustomerListItem[];
  selectedName: string | null;
  onSelectCustomer: (customerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [sending, setSending] = useState(false);
  const [briefChip, setBriefChip] = useState<{
    customerId: string;
    name: string;
  } | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, bubbles, sending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;

    const userBubble: Bubble = { id: newId(), kind: 'user', text: message };
    const history = toHistory(bubbles);
    setBubbles((prev) => [...prev, userBubble]);
    setDraft('');
    setBriefChip(null);

    const names = customers.map((c) => c.name.trim()).filter(Boolean);
    if (isOffTopic(message, names)) {
      setBubbles((prev) => [
        ...prev,
        {
          id: newId(),
          kind: 'model',
          text: OFF_TOPIC_REPLY,
          toolCalls: [],
        },
      ]);
      return;
    }

    setSending(true);

    try {
      const data = await sendInsChat({ message, history });
      setBubbles((prev) => [
        ...prev,
        {
          id: newId(),
          kind: 'model',
          text: maskPhones(data.reply.trim() || '답변이 없습니다.'),
          toolCalls: data.toolCalls ?? [],
        },
      ]);
    } catch (err) {
      const status = err instanceof InsChatError ? err.status : 500;
      const fallback =
        err instanceof Error ? err.message : '챗봇 요청에 실패했습니다.';
      setBubbles((prev) => [
        ...prev,
        {
          id: newId(),
          kind: 'error',
          text: errorCopy(status, fallback),
          status,
          retryText: message,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  }

  const canSend = draft.trim().length > 0 && !sending;

  return createPortal(
    <div className={styles.host}>
      <button
        type="button"
        className={styles.fab}
        aria-label={open ? '상담 어시스턴트 닫기' : '상담 어시스턴트 열기'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {open ? (
        <PanelGuard
          onReset={() => {
            setOpen(false);
            setSending(false);
          }}
        >
        <section className={styles.panel} aria-label="상담 어시스턴트">
          <header className={styles.head}>
            <span className={styles.mark} aria-hidden>
              <ChatIcon />
            </span>
            <h2 className={styles.title}>상담 어시스턴트</h2>
            <span className={styles.badge}>조회전용</span>
            <button
              type="button"
              className={styles.close}
              aria-label="닫기"
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </button>
          </header>

          <div className={styles.thread} ref={scrollerRef}>
            {bubbles.length === 0 && !sending ? (
              <div className={styles.empty}>
                <span className={styles.emptyMark} aria-hidden>
                  <ChatIcon />
                </span>
                <p className={styles.emptyCopy}>
                  고객 이름, 고위험, 최근 상담을 물어보세요
                </p>
                <div className={styles.chips}>
                  {CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className={styles.chip}
                      onClick={() => void send(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={styles.chip}
                    disabled={!selectedName}
                    title={
                      selectedName
                        ? undefined
                        : '왼쪽에서 고객을 먼저 선택하세요'
                    }
                    onClick={() => {
                      if (!selectedName) return;
                      void send(`${selectedName} 고객의 핵심 스크립트 작성해줘`);
                    }}
                  >
                    {selectedName
                      ? `「${selectedName}」 핵심 스크립트`
                      : '핵심 스크립트'}
                  </button>
                </div>
              </div>
            ) : null}

            {bubbles.map((b) => {
              if (b.kind === 'user') {
                return (
                  <p key={b.id} className={styles.userBubble}>
                    {b.text}
                  </p>
                );
              }
              if (b.kind === 'error') {
                return (
                  <div key={b.id} className={styles.errorBubble}>
                    <p>
                      ⚠️ {b.text}
                      {b.status ? ` (${b.status})` : ''}
                    </p>
                    <button
                      type="button"
                      className={styles.retry}
                      onClick={() => void send(b.retryText)}
                      disabled={sending}
                    >
                      다시 시도
                    </button>
                  </div>
                );
              }

              const calls = b.toolCalls ?? [];
              const showList = calls.some((t) => LIST_TOOLS.has(t.name));
              const showSim = calls.some((t) => SIM_TOOLS.has(t.name));
              const rows = showList
                ? mentionedCustomers(b.text, customers)
                : [];

              return (
                <div key={b.id} className={styles.modelBlock}>
                  {rows.length > 0 ? (
                    <div className={styles.listCard}>
                      <p className={styles.listTitle}>
                        {listCardTitle(lastUserText(bubbles, b.id), rows.length)}
                      </p>
                      <ul className={styles.custList}>
                        {rows.map((row) => (
                          <li key={row.customerId}>
                            <button
                              type="button"
                              className={styles.custRow}
                              onClick={() => {
                                onSelectCustomer(row.customerId);
                                setBriefChip({
                                  customerId: row.customerId,
                                  name: row.name,
                                });
                              }}
                            >
                              <span>
                                <strong>{row.name}</strong>
                                {' · '}
                                {formatConsultDate(row.lastConsultedAt)}
                              </span>
                              <em
                                style={{
                                  color: scoreTone(
                                    row.lastRiskGrade,
                                    row.lastRiskScore,
                                  ),
                                }}
                              >
                                {row.lastRiskScore != null
                                  ? row.lastRiskScore.toFixed(1)
                                  : '—'}
                                <span className={styles.scoreArrow} aria-hidden>
                                  ↗
                                </span>
                              </em>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <p className={styles.custHint}>좌측 상세로 이동 (조회)</p>
                    </div>
                  ) : (
                    <div className={styles.modelBubble}>
                      <ModelMarkdown text={b.text} />
                      {showSim ? (
                        <p className={styles.simNote}>
                          ※ 참고용 안내 — 실제 산출은 심사 기준을 따릅니다
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}

            {sending ? (
              <div className={styles.loading} aria-live="polite">
                <span />
                <span />
                <span />
              </div>
            ) : null}

            {briefChip && !sending ? (
              <button
                type="button"
                className={styles.briefChip}
                onClick={() => void send(`「${briefChip.name}」 브리핑`)}
              >
                「{briefChip.name}」 브리핑 받기 →
              </button>
            ) : null}
          </div>

          <footer className={styles.composer}>
            <div className={styles.composerBar}>
              <textarea
                ref={inputRef}
                className={styles.input}
                rows={1}
                value={draft}
                disabled={sending}
                placeholder={
                  sending ? '응답을 기다리는 중…' : '질문을 입력하세요...'
                }
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                className={styles.send}
                disabled={!canSend}
                aria-label="보내기"
                onClick={() => void send(draft)}
              >
                <SendIcon />
              </button>
            </div>
            <p className={styles.footNote}>조회 전용 · 저장/삭제 없음</p>
          </footer>
        </section>
        </PanelGuard>
      ) : null}
    </div>,
    document.body,
  );
}

class PanelGuard extends Component<
  { children: ReactNode; onReset: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <section className={styles.panel} aria-label="상담 어시스턴트">
          <div className={styles.empty}>
            <p className={styles.emptyCopy}>표시 중 문제가 생겼습니다.</p>
            <button
              type="button"
              className={styles.chip}
              onClick={() => {
                this.setState({ failed: false });
                this.props.onReset();
              }}
            >
              다시 열기
            </button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

class MarkdownGuard extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <p className={styles.modelText}>답변을 표시하지 못했습니다.</p>;
    }
    return this.props.children;
  }
}

function ModelMarkdown({ text }: { text: string }) {
  return (
    <MarkdownGuard>
      <div className={styles.modelText}>
        <Markdown
          allowedElements={[
            'p',
            'h1',
            'h2',
            'h3',
            'h4',
            'strong',
            'em',
            'ul',
            'ol',
            'li',
            'blockquote',
            'hr',
            'br',
          ]}
          unwrapDisallowed
        >
          {text}
        </Markdown>
      </div>
    </MarkdownGuard>
  );
}

function ChatIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden
    >
      <path d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden
    >
      <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 19V5M12 5l-6 6M12 5l6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
