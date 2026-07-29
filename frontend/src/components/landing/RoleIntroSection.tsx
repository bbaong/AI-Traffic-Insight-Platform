import styles from './RoleIntroSection.module.css';
import { useFadeInClassName } from './useFadeInClassName';

const GOV_TAGS = ['위험도 지도', '우선점검 순위', '행정 참고 리포트'] as const;
const INS_TAGS = ['위험 점수', '유사 고객군', '상담 참고 리포트'] as const;

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
          두 가지 업무, 하나의 데이터
        </h2>
        <p className={styles.subtitle}>
          같은 사고 데이터를 업무에 맞게 다르게 보여줍니다.
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
            <h3 className={styles.cardTitle}>이 고객은 언제 위험해질까</h3>
            <p className={styles.body}>
              6개 조건을 입력하면 위험 점수와 중상 확률, 상담에 쓸 근거를
              받습니다.
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
