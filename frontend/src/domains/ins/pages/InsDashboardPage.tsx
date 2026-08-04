import { useEffect, useState } from 'react';
import { predictIns } from '../api/prediction';
import { fetchTokkReview } from '../api/tokkReview';
import { saveConsultation } from '../api/consultation';
import { CHECKLIST_ITEMS } from '../constants/checklistItems';
import {
  AGE_OPTIONS,
  GENDER_OPTIONS,
  REGION_OPTIONS,
  VEHICLE_OPTIONS,
} from '../constants/insFeatures';
import { TOKK_STATUS_META } from '../constants/tokkStatus';
import type {
  ChecklistAnswers,
  CustomerInfo,
  ProfileInput,
  TokkResult,
} from '../types/consulting';
import type { InsPredictData } from '../types/prediction';
import {
  formatPct1,
  getInsRiskMeta,
  toRiskGrade,
} from '../utils/riskMeta';
import { Toast } from '../../../shared/components/ui/Toast';
import { useAuthStore } from '../../../stores/authStore';
import styles from './InsDashboardPage.module.css';

const MEMO_MAX = 500;
const FOOTER_NOTICE =
  '데이터 기준 2016–2025년 · 통계적 분석 모델이며 실제 사고 발생을 보장하지 않습니다';

function initialChecklist(): ChecklistAnswers {
  return {
    mileage: CHECKLIST_ITEMS[0].options?.[0] ?? '',
    blackbox: CHECKLIST_ITEMS[1].options?.[0] ?? '',
    safedrive: CHECKLIST_ITEMS[2].options?.[1] ?? '미이용',
    safedriveService: '',
    safedriveScore: '',
    fcw: CHECKLIST_ITEMS[3].options?.[2] ?? '확인 필요',
    ldw: CHECKLIST_ITEMS[4].options?.[2] ?? '확인 필요',
  };
}

function initialProfile(): ProfileInput {
  return {
    gender: GENDER_OPTIONS[0],
    age: AGE_OPTIONS[4],
    vehicle: VEHICLE_OPTIONS[0],
    region: REGION_OPTIONS[6],
  };
}

export function InsDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '',
    phone: '',
  });
  const [profile, setProfile] = useState<ProfileInput>(initialProfile);
  const [prediction, setPrediction] = useState<InsPredictData | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [checklist, setChecklist] =
    useState<ChecklistAnswers>(initialChecklist);
  const [tokkResults, setTokkResults] = useState<TokkResult[]>([]);
  const [tokkLoading, setTokkLoading] = useState(false);
  const [tokkError, setTokkError] = useState<string | null>(null);

  const [memo, setMemo] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (!toastVisible) return;
    const t = window.setTimeout(() => setToastVisible(false), 1800);
    return () => window.clearTimeout(t);
  }, [toastVisible]);

  async function handleAnalyze() {
    setAnalyzeLoading(true);
    setAnalyzeError(null);
    try {
      const data = await predictIns({
        구군: profile.region,
        연령대: profile.age,
        성별: profile.gender,
        차종: profile.vehicle,
      });
      setPrediction(data);
    } catch (e) {
      setPrediction(null);
      setAnalyzeError(
        e instanceof Error
          ? e.message
          : '분석에 실패했습니다. 서버 상태를 확인해 주세요.',
      );
    } finally {
      setAnalyzeLoading(false);
    }
  }

  async function handleTokkReview() {
    setTokkLoading(true);
    setTokkError(null);
    try {
      const rows = await fetchTokkReview(checklist);
      setTokkResults(rows);
    } catch (e) {
      setTokkResults([]);
      setTokkError(
        e instanceof Error ? e.message : '특약 검토에 실패했습니다.',
      );
    } finally {
      setTokkLoading(false);
    }
  }

  async function handleSave() {
    if (!user?.userId) {
      setSaveError('로그인이 필요합니다.');
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      await saveConsultation({
        customer,
        profile,
        checklist,
        memo,
        userId: user.userId,
        prediction,
        tokkResults,
      });
      setToastVisible(true);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : '저장에 실패했습니다.',
      );
    } finally {
      setSaveLoading(false);
    }
  }

  function handleReset() {
    setCustomer({ name: '', phone: '' });
    setProfile(initialProfile());
    setPrediction(null);
    setAnalyzeLoading(false);
    setAnalyzeError(null);
    setChecklist(initialChecklist());
    setTokkResults([]);
    setTokkLoading(false);
    setTokkError(null);
    setMemo('');
    setSaveLoading(false);
    setSaveError(null);
  }

  const grade = prediction
    ? toRiskGrade(String(prediction.예측등급))
    : null;
  const meta = grade ? getInsRiskMeta(grade) : null;
  const scoreClamped = prediction
    ? Math.min(100, Math.max(0, Number(prediction.위험도)))
    : 0;
  const factors = prediction
    ? Object.entries(prediction.등급확률)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    : [];
  const maxFactor = factors[0]?.[1] ?? 1;

  function setChecklistField<K extends keyof ChecklistAnswers>(
    key: K,
    value: ChecklistAnswers[K],
  ) {
    setChecklist((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* —— 좌열 —— */}
        <div className={styles.column}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>고객 · 프로필 입력</h2>

            <div className={styles.fieldStack}>
              <label className={styles.field} htmlFor="customer-name">
                <span className={styles.fieldLabel}>고객명</span>
                <input
                  id="customer-name"
                  className={styles.input}
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="홍길동"
                  autoComplete="name"
                />
              </label>
              <label className={styles.field} htmlFor="customer-phone">
                <span className={styles.fieldLabel}>휴대폰</span>
                <input
                  id="customer-phone"
                  className={styles.input}
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="010-0000-0000"
                  autoComplete="tel"
                />
              </label>
            </div>

            <hr className={styles.divider} />

            <div className={styles.fieldStack}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>성별</span>
                <div
                  className={styles.segment}
                  role="group"
                  aria-label="성별"
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`${styles.segmentBtn} ${
                        profile.gender === opt ? styles.segmentActive : ''
                      }`}
                      onClick={() =>
                        setProfile((p) => ({ ...p, gender: opt }))
                      }
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <label className={styles.field} htmlFor="profile-age">
                <span className={styles.fieldLabel}>연령대</span>
                <select
                  id="profile-age"
                  className={styles.select}
                  value={profile.age}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, age: e.target.value }))
                  }
                >
                  {AGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field} htmlFor="profile-vehicle">
                <span className={styles.fieldLabel}>차종</span>
                <select
                  id="profile-vehicle"
                  className={styles.select}
                  value={profile.vehicle}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, vehicle: e.target.value }))
                  }
                >
                  {VEHICLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field} htmlFor="profile-region">
                <span className={styles.fieldLabel}>지역</span>
                <select
                  id="profile-region"
                  className={styles.select}
                  value={profile.region}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, region: e.target.value }))
                  }
                >
                  {REGION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => void handleAnalyze()}
              disabled={analyzeLoading}
            >
              {analyzeLoading ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  분석 중…
                </>
              ) : (
                '분석하기'
              )}
            </button>
            {analyzeError ? (
              <p className={styles.errorBanner} role="alert">
                {analyzeError}
              </p>
            ) : null}
          </section>

          <section className={`${styles.card} ${styles.riskCard}`}>
            <h2 className={styles.cardTitle}>위험점수 · 법규위반</h2>

            <div className={styles.riskBody}>
              {!prediction && !analyzeLoading ? (
                <p className={styles.emptyHint}>
                  프로필을 선택하고 분석하기를 누르세요
                </p>
              ) : null}

              {analyzeLoading && !prediction ? (
                <p className={styles.emptyHint}>분석 중입니다…</p>
              ) : null}

              {prediction && meta ? (
                <div className={styles.riskBlock}>
                  <div className={styles.scoreRow}>
                    <p
                      className={styles.scoreValue}
                      style={{ color: meta.color }}
                    >
                      <span className={styles.scoreNum}>
                        {scoreClamped.toFixed(1)}
                      </span>
                      <span className={styles.scoreDenom}> / 100</span>
                    </p>
                    <span
                      className={styles.gradeBadge}
                      style={{
                        color: meta.color,
                        borderColor: meta.color,
                        background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
                      }}
                    >
                      <span aria-hidden="true">{meta.icon}</span>
                      <span>{meta.label}</span>
                    </span>
                  </div>

                  <div
                    className={styles.gaugeTrack}
                    role="img"
                    aria-label={`위험 점수 ${scoreClamped.toFixed(1)}점`}
                  >
                    <div className={styles.gaugeFill} />
                    <span
                      className={styles.gaugeMarker}
                      style={{ left: `${scoreClamped}%` }}
                    />
                  </div>

                  <p className={styles.note}>
                    ※ 유사 프로필 간 상대 위험도이며, 개별 사고 확률이 아닙니다
                  </p>

                  <hr className={styles.divider} />

                  <h3 className={styles.subTitle}>법규위반 TOP3</h3>
                  {factors.length === 0 ? (
                    <p className={styles.note}>표시할 요인이 없습니다.</p>
                  ) : (
                    <ol className={styles.factorList}>
                      {factors.map(([name, ratio], index) => {
                        const pct = formatPct1(ratio);
                        const widthPct = Math.max(
                          4,
                          Math.round((ratio / maxFactor) * 100),
                        );
                        return (
                          <li key={name} className={styles.factorItem}>
                            <span className={styles.rankBadge}>
                              {index + 1}
                            </span>
                            <div className={styles.factorMain}>
                              <div className={styles.factorTop}>
                                <span className={styles.factorName}>
                                  {name}
                                </span>
                                <span className={styles.factorPct}>
                                  {pct}%
                                </span>
                              </div>
                              <div
                                className={styles.factorBarTrack}
                                aria-hidden="true"
                              >
                                <div
                                  className={styles.factorBarFill}
                                  style={{ width: `${widthPct}%` }}
                                />
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {/* —— 중열 —— */}
        <div className={styles.column}>
          <section className={`${styles.card} ${styles.cardGrow}`}>
            <div className={styles.cardHeadBlock}>
              <h2 className={styles.cardTitle}>체크리스트</h2>
              <p className={styles.cardSub}>
                특약 검토용 차량·운전 정보 5문항입니다.
              </p>
            </div>

            <div className={styles.checklistBody}>
              {CHECKLIST_ITEMS.map((item) => {
                const value =
                  checklist[item.id as keyof ChecklistAnswers] ?? '';
                const isActive =
                  item.type === 'toggle-detail'
                    ? value === '이용 중'
                    : Boolean(value);

                return (
                  <div
                    key={item.id}
                    className={`${styles.checkItem} ${
                      isActive ? styles.checkItemActive : ''
                    }`}
                  >
                    <p className={styles.checkQuestion}>{item.question}</p>
                    <p className={styles.checkHint}>{item.hint}</p>

                    {item.type === 'select' && item.options ? (
                      <select
                        className={styles.select}
                        value={String(value)}
                        onChange={(e) =>
                          setChecklistField(
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

                    {item.type === 'toggle-detail' && item.options ? (
                      <>
                        <div
                          className={styles.segment}
                          role="group"
                          aria-label={item.question}
                        >
                          {item.options.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              className={`${styles.segmentBtn} ${
                                value === opt ? styles.segmentActive : ''
                              }`}
                              onClick={() =>
                                setChecklistField('safedrive', opt)
                              }
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        {checklist.safedrive === '이용 중' ? (
                          <div className={styles.detailFields}>
                            <label
                              className={styles.field}
                              htmlFor="safedrive-service"
                            >
                              <span className={styles.fieldLabel}>
                                이용 서비스
                              </span>
                              <input
                                id="safedrive-service"
                                className={styles.input}
                                value={checklist.safedriveService}
                                onChange={(e) =>
                                  setChecklistField(
                                    'safedriveService',
                                    e.target.value,
                                  )
                                }
                                placeholder="예: T map 안전운전"
                              />
                            </label>
                            <label
                              className={styles.field}
                              htmlFor="safedrive-score"
                            >
                              <span className={styles.fieldLabel}>
                                현재 점수
                              </span>
                              <input
                                id="safedrive-score"
                                className={styles.input}
                                value={checklist.safedriveScore}
                                onChange={(e) =>
                                  setChecklistField(
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

            {tokkError ? (
              <p className={styles.errorBanner} role="alert">
                {tokkError}
              </p>
            ) : null}

            <button
              type="button"
              className={`${styles.primaryBtn} ${styles.btnFoot}`}
              onClick={() => void handleTokkReview()}
              disabled={tokkLoading}
            >
              {tokkLoading ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  검토 중…
                </>
              ) : (
                '맞춤 특약 검토하기'
              )}
            </button>
          </section>
        </div>

        {/* —— 우열 —— */}
        <div className={styles.column}>
          <section className={`${styles.card} ${styles.cardGrow}`}>
            <h2 className={styles.cardTitle}>맞춤 특약 검토 결과</h2>

            <div className={styles.legend} aria-label="특약 상태 범례">
              {(
                Object.keys(TOKK_STATUS_META) as Array<
                  keyof typeof TOKK_STATUS_META
                >
              ).map((key) => {
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

            <div className={styles.tokkPanel}>
              {tokkResults.length === 0 ? (
                <p className={styles.emptyHint}>
                  체크리스트를 작성한 뒤 맞춤 특약 검토하기를 누르세요
                </p>
              ) : (
                <ul className={styles.tokkList}>
                  {tokkResults.map((row) => {
                    const st = TOKK_STATUS_META[row.status];
                    return (
                      <li key={row.id} className={styles.tokkRow}>
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

            <div className={styles.memoSection}>
              <hr className={styles.divider} />

              <label className={styles.field} htmlFor="consult-memo">
                <span className={styles.fieldLabel}>상담 메모</span>
                <textarea
                  id="consult-memo"
                  className={styles.textarea}
                  value={memo}
                  maxLength={MEMO_MAX}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="상담 중 메모를 남겨 주세요"
                  rows={7}
                />
                <span className={styles.memoCount}>
                  {memo.length}/{MEMO_MAX}
                </span>
              </label>

              {saveError ? (
                <p className={styles.errorBanner} role="alert">
                  {saveError}
                </p>
              ) : null}

              <div className={styles.saveBar}>
                <div className={styles.saveActions}>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => void handleSave()}
                    disabled={saveLoading}
                  >
                    {saveLoading ? (
                      <>
                        <span className={styles.spinner} aria-hidden="true" />
                        저장 중…
                      </>
                    ) : (
                      '상담 대시보드 저장'
                    )}
                  </button>
                  <button
                    type="button"
                    className={styles.resetBtn}
                    onClick={handleReset}
                    disabled={saveLoading}
                  >
                    초기화
                  </button>
                </div>
                <p className={styles.saveHint}>
                  고객·프로필·체크리스트·메모를 저장합니다. 위험점수와 특약은
                  서버에서 다시 계산해 DB에 반영합니다.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <p className={styles.footerNotice} role="note">
        {FOOTER_NOTICE}
      </p>

      <Toast message="상담 내용이 저장되었습니다" visible={toastVisible} />
    </div>
  );
}

export default InsDashboardPage;
