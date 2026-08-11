import { CHECKLIST_ITEMS } from '../constants/checklistItems';
import {
  CONSULT_TYPE_OPTIONS,
  type ConsultType,
} from '../constants/consultTypes';
import { TOKK_LEGEND_STATUSES, TOKK_STATUS_META } from '../constants/tokkStatus';
import type { ChecklistAnswers, TokkResult } from '../types/consulting';
import shared from './insConsultingShared.module.css';
import styles from './InsStep2ChecklistTokk.module.css';

const CHECK_LABELS: Record<string, string> = {
  mileage: '주행거리',
  blackbox: '블랙박스',
  safedrive: '안전운전점수',
  fcw: '전방충돌방지',
  ldw: '차선이탈경고',
};

type Props = {
  checklist: ChecklistAnswers;
  tokkResults: TokkResult[];
  tokkLoading: boolean;
  tokkError: string | null;
  consultType: ConsultType | '';
  saveLoading: boolean;
  saveError: string | null;
  onChecklistChange: <K extends keyof ChecklistAnswers>(
    key: K,
    value: ChecklistAnswers[K],
  ) => void;
  onTokkReview: () => void;
  onConsultTypeChange: (v: ConsultType) => void;
  onSave: () => void;
  onPrev: () => void;
};

export function InsStep2ChecklistTokk({
  checklist,
  tokkResults,
  tokkLoading,
  tokkError,
  consultType,
  saveLoading,
  saveError,
  onChecklistChange,
  onTokkReview,
  onConsultTypeChange,
  onSave,
  onPrev,
}: Props) {
  return (
    <div className={shared.stepRoot}>
      <div className={shared.grid2}>
        <div className={shared.column}>
          <section className={`${shared.card} ${shared.cardFill}`}>
            <div>
              <h2 className={shared.cardTitle}>체크리스트</h2>
              <p className={shared.cardSub}>특약 검토용 차량·운전 정보 5문항</p>
            </div>

            <div className={shared.cardBody}>
              <div className={shared.fieldStack}>
                {CHECKLIST_ITEMS.map((item) => {
                  const value =
                    checklist[item.id as keyof ChecklistAnswers] ?? '';
                  const label = CHECK_LABELS[item.id] ?? item.question;
                  const tip = `${item.question} — ${item.hint}`;
                  const isSafedrive = item.type === 'toggle-detail';

                  return (
                    <div key={item.id} className={shared.field}>
                      <span className={shared.fieldLabel} title={tip}>
                        {label}
                      </span>

                      {item.type === 'select' && item.options ? (
                        <select
                          className={shared.select}
                          value={String(value)}
                          title={tip}
                          onChange={(e) =>
                            onChecklistChange(
                              item.id as keyof ChecklistAnswers,
                              e.target.value,
                            )
                          }
                          aria-label={item.question}
                        >
                          {item.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : null}

                      {isSafedrive && item.options ? (
                        <>
                          <div
                            className={shared.segment}
                            role="group"
                            aria-label={item.question}
                          >
                            {item.options.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                className={`${shared.segmentBtn} ${
                                  value === opt ? shared.segmentActive : ''
                                }`}
                                onClick={() =>
                                  onChecklistChange('safedrive', opt)
                                }
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                          {checklist.safedrive === '이용 중' ? (
                            <div className={styles.detailFields}>
                              <label
                                className={shared.field}
                                htmlFor="safedrive-service"
                              >
                                <span className={shared.fieldLabel}>
                                  이용 서비스
                                </span>
                                <input
                                  id="safedrive-service"
                                  className={shared.input}
                                  value={checklist.safedriveService}
                                  onChange={(e) =>
                                    onChecklistChange(
                                      'safedriveService',
                                      e.target.value,
                                    )
                                  }
                                  placeholder="예: T map 안전운전"
                                />
                              </label>
                              <label
                                className={shared.field}
                                htmlFor="safedrive-score"
                              >
                                <span className={shared.fieldLabel}>
                                  현재 점수
                                </span>
                                <input
                                  id="safedrive-score"
                                  className={shared.input}
                                  value={checklist.safedriveScore}
                                  onChange={(e) =>
                                    onChecklistChange(
                                      'safedriveScore',
                                      e.target.value,
                                    )
                                  }
                                  placeholder="예: 85"
                                  inputMode="numeric"
                                />
                              </label>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={shared.cardActions}>
              {tokkError ? (
                <p className={shared.errorBanner} role="alert">
                  {tokkError}
                </p>
              ) : null}
              <div className={shared.cardActionsRow}>
                <button
                  type="button"
                  className={shared.ghostBtn}
                  onClick={onPrev}
                >
                  ← 이전
                </button>
                <button
                  type="button"
                  className={shared.primaryBtn}
                  onClick={onTokkReview}
                  disabled={tokkLoading}
                >
                  {tokkLoading ? (
                    <>
                      <span className={shared.spinner} aria-hidden="true" />
                      검토 중…
                    </>
                  ) : (
                    '맞춤 특약 검토하기'
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className={shared.column}>
          <section className={`${shared.card} ${shared.cardFill} ${styles.rightCard}`}>
            <div className={styles.rightHead}>
              <h2 className={shared.cardTitle}>맞춤 특약 검토 결과</h2>
              <div className={styles.legend} aria-label="특약 상태 범례">
                {TOKK_LEGEND_STATUSES.map((key) => {
                  const m = TOKK_STATUS_META[key];
                  return (
                    <span
                      key={key}
                      className={styles.legendItem}
                      style={{ color: m.color }}
                    >
                      <span
                        className={styles.legendDot}
                        style={{ background: m.color }}
                        aria-hidden="true"
                      />
                      {m.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className={styles.resultPane}>
              {tokkLoading ? (
                <p className={styles.emptyTokk}>특약을 검토하는 중…</p>
              ) : tokkResults.length === 0 ? (
                <div className={styles.lockedPane}>
                  <span className={shared.lockIcon} aria-hidden="true">
                    🔒
                  </span>
                  <p className={shared.lockText}>
                    체크리스트 검토 후 결과를 확인할 수 있습니다
                  </p>
                </div>
              ) : (
                <ul className={styles.tokkList}>
                  {tokkResults.map((row) => {
                    const st = TOKK_STATUS_META[row.status];
                    return (
                      <li
                        key={row.id}
                        className={styles.tokkRow}
                        title={row.desc}
                      >
                        <span className={styles.tokkIcon} aria-hidden="true">
                          {row.icon}
                        </span>
                        <div className={styles.tokkMain}>
                          <div className={styles.tokkTop}>
                            <span className={styles.tokkName}>{row.name}</span>
                            <span
                              className={styles.tokkTag}
                              style={{
                                color: st.color,
                                background: st.bg,
                                borderColor: st.color,
                              }}
                            >
                              {st.label}
                            </span>
                          </div>
                          <p className={styles.tokkDesc}>{row.desc}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className={styles.consultTypeBlock}>
              <span className={styles.consultTypeLabel}>
                상담 유형 <span className={styles.requiredMark}>*</span>
              </span>
              <div
                className={styles.typeGrid}
                role="group"
                aria-label="상담 유형"
              >
                {CONSULT_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.typeBtn} ${
                      consultType === opt.value ? styles.typeActive : ''
                    }`}
                    onClick={() => onConsultTypeChange(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.saveBlock}>
              {saveError ? (
                <p className={shared.errorBanner} role="alert">
                  {saveError}
                </p>
              ) : null}
              <button
                type="button"
                className={shared.primaryBtn}
                onClick={onSave}
                disabled={saveLoading || !consultType}
              >
                {saveLoading ? (
                  <>
                    <span className={shared.spinner} aria-hidden="true" />
                    저장 중…
                  </>
                ) : (
                  '상담 저장하기'
                )}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
