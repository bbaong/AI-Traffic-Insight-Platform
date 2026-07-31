import styles from './RoleIntroSection.module.css';
import { useFadeInClassName } from './useFadeInClassName';

const GOV_TAGS = ['위험도 지도', '우선점검 순위', '행정 참고 리포트'] as const;
const INS_TAGS = ['연령대별 위험 점수', '유사 고객군 분석', '상담 참고 리포트'] as const;

export function RoleIntroSection() {
  const { ref, className } = useFadeInClassName();

  return (
    <section
      id="intro"
      ref={ref}
      className={`${styles.section} ${className}`}
      aria-labelledby="role-intro-heading"
    >
      <div className={styles.inner}>
        <h2 id="role-intro-heading" className={styles.title}>
        맞춤 분석 엔진, 두 개의 전용 대시보드
        </h2>
        <p className={styles.subtitle}>
        지자체와 보험사, 업무 목적에 최적화된 업무 화면을 제공합니다.
        </p>

        <div className={styles.grid}>
          <article className={styles.card}>
            <p className={`${styles.label} ${styles.labelGov}`}>
              지자체 교통안전 담당자
            </p>
            <h3 className={styles.cardTitle}>어디를 먼저 점검할까</h3>
            <p className={styles.body}>
              시군구 위험도 지도에서 대상을 찾고, 요인별 기여도로 근거를
              확보합니다.
            </p>
            <ul className={styles.tags}>
              {GOV_TAGS.map((tag) => (
                <li key={tag} className={`${styles.tag} ${styles.tagGov}`}>
                  {tag}
                </li>
              ))}
            </ul>
          </article>

          <article className={styles.card}>
            <p className={`${styles.label} ${styles.labelIns}`}>
              보험사 상담 · 심사 담당자
            </p>
            <h3 className={styles.cardTitle}>이 고객을 어떻게 설득할까</h3>
            <p className={styles.body}>
              5가지 요인을 바탕으로 고객별 위험 점수와 심각도를 산출하여, 객관적인 상담 및 심사 
              근거를 확보할 수 있습니다.
            </p>
            <ul className={styles.tags}>
              {INS_TAGS.map((tag) => (
                <li key={tag} className={`${styles.tag} ${styles.tagIns}`}>
                  {tag}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
