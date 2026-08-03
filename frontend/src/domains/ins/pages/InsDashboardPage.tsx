import { useState } from 'react';
import { predictIns } from '../api/prediction';
import {
  PROFILE_FIELDS,
  type ProfileFieldId,
} from '../constants/insFeatures';
import type { InsPredictData } from '../types/prediction';
import {
  formatPct1,
  getInsRiskMeta,
  toRiskGrade,
} from '../utils/riskMeta';
import styles from './InsDashboardPage.module.css';

const EMPTY_HINT = '프로필을 선택하고 분석하기를 누르세요';
const FOOTER_NOTICE =
  '데이터 기준 2016–2025년 · 통계적 분석 모델이며 실제 사고 발생을 보장하지 않습니다';

const GUIDE_ITEMS = [
  {
    title: '위험점수',
    body: '유사 프로필 대비 상대 위험도(0–100)입니다. 개별 사고 확률이 아닙니다.',
  },
  {
    title: '법규위반 경향',
    body: '모델이 추정한 주요 법규위반 기여도를 비율(%)로 보여 줍니다.',
  },
  {
    title: '활용 방법',
    body: '상담·심사 시 참고 지표로 사용하세요. 인수·요율의 직접 근거가 아닙니다.',
  },
] as const;

function SparklesIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2" />
      <path d="M16 6a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2" />
      <path d="M9 18a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6" />
    </svg>
  );
}

function initialProfile(): Record<ProfileFieldId, string> {
  return {
    gender: PROFILE_FIELDS[0].options[0],
    age: PROFILE_FIELDS[1].options[4],
    vehicle: PROFILE_FIELDS[2].options[0],
    region: PROFILE_FIELDS[3].options[6],
  };
}

export function InsDashboardPage() {
  const [profile, setProfile] =
    useState<Record<ProfileFieldId, string>>(initialProfile);
  const [result, setResult] = useState<InsPredictData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const data = await predictIns({
        구군: profile.region,
        연령대: profile.age,
        성별: profile.gender,
        차종: profile.vehicle,
      });
      setResult(data);
    } catch (e) {
      setResult(null);
      setError(
        e instanceof Error
          ? e.message
          : '분석에 실패했습니다. 서버 상태를 확인해 주세요.',
      );
    } finally {
      setLoading(false);
    }
  }

  const grade = result ? toRiskGrade(String(result.예측등급)) : null;
  const meta = grade ? getInsRiskMeta(grade) : null;
  const score = result ? Number(result.위험도) : 0;
  const scoreClamped = Math.min(100, Math.max(0, score));
  const factors = result
    ? Object.entries(result.등급확률).sort((a, b) => b[1] - a[1])
    : [];
  const maxFactor = factors[0]?.[1] ?? 1;

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>프로필 정보 입력</h2>
          <p className={styles.cardSub}>아래 4가지 항목을 선택해주세요.</p>
        </div>

        <div className={styles.formGrid}>
          {PROFILE_FIELDS.map((field) => (
            <label key={field.id} className={styles.field} htmlFor={field.id}>
              <span className={styles.fieldLabel}>{field.label}</span>
              <select
                id={field.id}
                className={styles.select}
                value={profile[field.id]}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    [field.id]: e.target.value,
                  }))
                }
              >
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <button
          type="button"
          className={styles.analyzeBtn}
          onClick={() => void handleAnalyze()}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              분석 중…
            </>
          ) : (
            <>
              <SparklesIcon />
              분석하기
            </>
          )}
        </button>

        {error ? (
          <p className={styles.errorBanner} role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {!result && !loading ? (
        <div className={styles.emptyState} role="status">
          {EMPTY_HINT}
        </div>
      ) : null}

      {loading && !result ? (
        <div className={styles.emptyState} role="status">
          분석 중입니다…
        </div>
      ) : null}

      {result && meta ? (
        <div className={styles.resultGrid}>
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>프로필 위험점수</h2>
            </div>

            <div className={styles.scoreBlock}>
              <p
                className={styles.scoreValue}
                style={{ color: meta.color }}
              >
                <span className={styles.scoreNum}>
                  {scoreClamped.toFixed(1)}
                </span>
                <span className={styles.scoreDenom}> / 100</span>
              </p>

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

              <p className={styles.scoreNote}>
                ※ 점수는 개별 사고 확률이 아니라 유사 프로필 간 상대 위험도를
                나타냅니다
              </p>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>주요 법규위반 경향</h2>
            </div>

            {factors.length === 0 ? (
              <p className={styles.emptyInline}>표시할 요인이 없습니다.</p>
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
                      <span className={styles.rankBadge}>{index + 1}</span>
                      <div className={styles.factorMain}>
                        <div className={styles.factorTop}>
                          <span className={styles.factorName}>{name}</span>
                          <span className={styles.factorPct}>{pct}%</span>
                        </div>
                        <div className={styles.factorBarTrack} aria-hidden="true">
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

            <p className={styles.factorNote}>※ 상위 항목 순으로 표시됩니다</p>
          </section>
        </div>
      ) : null}

      <section className={styles.guideGrid} aria-label="해석 가이드">
        {GUIDE_ITEMS.map((item) => (
          <article key={item.title} className={styles.guideCard}>
            <h3 className={styles.guideTitle}>{item.title}</h3>
            <p className={styles.guideBody}>{item.body}</p>
          </article>
        ))}
      </section>

      <p className={styles.footerNotice} role="note">
        {FOOTER_NOTICE}
      </p>
    </div>
  );
}

export default InsDashboardPage;
