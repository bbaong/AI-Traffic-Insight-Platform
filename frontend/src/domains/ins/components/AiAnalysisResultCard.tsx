import type { ProfileInput } from '../types/consulting';
import type {
  CoverageRecommendItem,
  InsPredictData,
  RiskGrade,
} from '../types/prediction';
import { formatPct1, toRiskGrade } from '../utils/riskMeta';
import styles from './AiAnalysisResultCard.module.css';

type Props = {
  profile: ProfileInput;
  prediction: InsPredictData | null;
  analyzeLoading: boolean;
  /** Step1 좌측 카드와 동일 높이로 stretch */
  fill?: boolean;
};

const GRADE_KO: Record<RiskGrade, string> = {
  LOW: '낮음',
  MODERATE: '보통',
  HIGH: '높음',
  CRITICAL: '위험',
};

const GRADE_TONE: Record<RiskGrade, string> = {
  LOW: styles.gradeLow,
  MODERATE: styles.gradeModerate,
  HIGH: styles.gradeHigh,
  CRITICAL: styles.gradeCritical,
};

function topFactors(grades: Record<string, number>, limit = 3) {
  return Object.entries(grades)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function gaugeGeometry(val: number) {
  const clamped = Math.min(100, Math.max(0, val));
  const a = Math.PI * (1 - clamped / 100);
  const ex = 100 + 86 * Math.cos(a);
  const ey = 100 - 86 * Math.sin(a);
  return {
    pathD: `M14 100 A86 86 0 0 1 ${ex} ${ey}`,
    ex,
    ey,
  };
}

function buildConsultPoint(
  topName: string | undefined,
  recommended: CoverageRecommendItem[],
): string {
  const top = topName ?? '주요 법규위반';
  const focus =
    recommended
      .slice(0, 2)
      .map((c) => c.name)
      .join('·') || '대인 관련 담보';
  return `${top} 경향이 상대적으로 높습니다. ${focus} 우선 보장과 안전운전 안내를 권장합니다.`;
}

function MapPinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function GenderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="4.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M13.5 6.5 18 2M15 2h3v3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 14h16l-1.2-4.2A2 2 0 0 0 16.9 8H7.1a2 2 0 0 0-1.9 1.8L4 14Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M4 14v3h2.5M20 14v3h-2.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="7.5" cy="17" r="1.5" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="16.5" cy="17" r="1.5" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="m8.5 12.2 2.4 2.4 4.6-5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" />
      <path d="m9 9 6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function PointPinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s-7-5.8-7-11a7 7 0 1 1 14 0c0 5.2-7 11-7 11Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

export function AiAnalysisResultCard({
  profile,
  prediction,
  analyzeLoading,
  fill = false,
}: Props) {
  const cardClass = fill ? `${styles.card} ${styles.cardFill}` : styles.card;

  if (!prediction && !analyzeLoading) {
    return (
      <section className={cardClass}>
        <h2 className={styles.title}>AI 분석 결과</h2>
        <div className={styles.locked}>
          <span className={styles.lockIcon} aria-hidden="true">
            🔒
          </span>
          <p className={styles.lockText}>AI 분석 후 결과를 확인할 수 있습니다</p>
        </div>
      </section>
    );
  }

  if (analyzeLoading && !prediction) {
    return (
      <section className={cardClass}>
        <h2 className={styles.title}>AI 분석 결과</h2>
        <p className={styles.loading}>분석 중입니다…</p>
      </section>
    );
  }

  if (!prediction) return null;

  const grade = toRiskGrade(String(prediction.예측등급));
  const score = Math.min(100, Math.max(0, Number(prediction.위험도)));
  const { pathD, ex, ey } = gaugeGeometry(score);
  const factors = prediction.등급확률 ? topFactors(prediction.등급확률) : [];
  const coverages = prediction.담보추천 ?? [];
  const recommended = coverages.filter((c) => c.recommended);
  const excluded = coverages.filter((c) => !c.recommended);
  const topName = factors[0]?.[0];
  const pointText = buildConsultPoint(topName, recommended);

  const chips = [
    { key: 'region', label: profile.region, icon: <MapPinIcon /> },
    { key: 'age', label: profile.age, icon: <CalendarIcon /> },
    { key: 'gender', label: profile.gender, icon: <GenderIcon /> },
    { key: 'vehicle', label: profile.vehicle, icon: <CarIcon /> },
  ] as const;

  return (
    <section className={cardClass}>
      <h2 className={styles.title}>AI 분석 결과</h2>

      <ul className={styles.chips}>
        {chips.map((chip) => (
          <li key={chip.key} className={styles.chip}>
            <span className={styles.chipIcon}>{chip.icon}</span>
            <span>{chip.label}</span>
          </li>
        ))}
      </ul>

      <div className={styles.midRow}>
        <div className={styles.gaugeBlock}>
          <div
            className={styles.gaugeSvgWrap}
            role="img"
            aria-label={`위험 점수 ${score.toFixed(1)}점, ${GRADE_KO[grade]}`}
          >
            <svg
              className={styles.gaugeSvg}
              viewBox="0 0 200 120"
              width="200"
              height="120"
            >
              <defs>
                <linearGradient
                  id="insRiskArcGrad"
                  x1="14"
                  y1="100"
                  x2="186"
                  y2="100"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#22C55E" />
                  <stop offset="45%" stopColor="#EAB308" />
                  <stop offset="100%" stopColor="#F97316" />
                </linearGradient>
              </defs>
              <path
                d="M14 100 A86 86 0 0 1 186 100"
                fill="none"
                stroke="#EEF1F5"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d={pathD}
                fill="none"
                stroke="url(#insRiskArcGrad)"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <circle cx={ex} cy={ey} r="9" fill="#fff" />
              <circle cx={ex} cy={ey} r="6" fill="#F97316" />
            </svg>
            <div className={styles.gaugeCenter}>
              <span className={`${styles.gradePill} ${GRADE_TONE[grade]}`}>
                {GRADE_KO[grade]}
              </span>
              <p className={styles.scoreLine}>
                <span className={styles.scoreVal}>{score.toFixed(1)}</span>
                <span className={styles.scoreUnit}> / 100</span>
              </p>
            </div>
          </div>
          <div className={styles.gaugeEnds}>
            <span>0</span>
            <span>100</span>
          </div>
          <p className={styles.gaugeCaption}>
            유사 프로필 기준 상대 위험도입니다
          </p>
        </div>

        {factors.length > 0 ? (
          <div className={styles.top3}>
            <h3 className={styles.sectionTitle}>법규위반 경향 TOP3</h3>
            <ul className={styles.top3List}>
              {factors.map(([name, ratio], idx) => {
                const pct = Math.min(100, ratio * 100);
                return (
                  <li key={name} className={styles.top3Row}>
                    <span
                      className={`${styles.rank} ${
                        idx === 0 ? styles.rankPrimary : styles.rankSecondary
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className={styles.top3Body}>
                      <div className={styles.top3Head}>
                        <span className={styles.top3Name}>{name}</span>
                        <span className={styles.top3Pct}>
                          {formatPct1(ratio)}%
                        </span>
                      </div>
                      <div className={styles.top3Track}>
                        <span
                          className={
                            idx === 0 ? styles.top3Fill1 : styles.top3FillRest
                          }
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <div className={styles.covBlock}>
        <h3 className={styles.sectionTitle}>표준 6대 담보 추천</h3>
        {coverages.length === 0 ? (
          <p className={styles.emptyCov}>분석 후 6대 담보 추천이 표시됩니다.</p>
        ) : (
          <div className={styles.covGrid}>
            <div className={styles.covCol}>
              <p className={styles.covColTitle}>
                <span className={styles.covCheck}>
                  <CheckCircleIcon />
                </span>
                추천 담보 · {recommended.length}건
              </p>
              <ul className={styles.covList}>
                {recommended.map((item) => (
                  <li key={item.id} className={styles.covRowOn}>
                    <span className={styles.covRowIcon}>
                      <CheckCircleIcon />
                    </span>
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.covCol}>
              <p className={`${styles.covColTitle} ${styles.covColTitleMuted}`}>
                <span className={styles.covX}>
                  <XCircleIcon />
                </span>
                제외 담보 · {excluded.length}건
              </p>
              <ul className={styles.covList}>
                {excluded.map((item) => (
                  <li key={item.id} className={styles.covRowOff}>
                    <span className={styles.covRowIconMuted}>
                      <XCircleIcon />
                    </span>
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className={styles.point}>
        <span className={styles.pointIcon}>
          <PointPinIcon />
        </span>
        <p className={styles.pointText}>
          <strong>상담 포인트 —</strong> {pointText}
        </p>
      </div>
    </section>
  );
}
