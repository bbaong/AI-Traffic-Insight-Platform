import styles from './RoleIntroSection.module.css';
import { useFadeInClassName } from './useFadeInClassName';

const GOV_TAGS = [
  '위험도 지도',
  '구별 비교 분석',
  'AI 우선점검 제안',
  '분기별 추세 예측',
  '행정 참고 리포트',
] as const;

const INS_TAGS = [
  'AI 위험도 분석',
  '6대 담보 자동 추천',
  '할인특약 5종 체크',
  '고객 이력 관리',
  'PDF 리포트 즉시 발송',
] as const;

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
        <p className={styles.eyebrow}>맞춤 분석 엔진</p>
        <h2 id="role-intro-heading" className={styles.title}>
          두 개의 전용 대시보드
        </h2>
        <p className={styles.subtitle}>
          지자체와 보험사, 업무 목적이 다르면 필요한 데이터도 다릅니다. 같은 사고
          데이터를 각자의 언어로 해석합니다.
        </p>

        <div className={styles.grid}>
          <article className={`${styles.card} ${styles.cardGov}`}>
            <p className={`${styles.label} ${styles.labelGov}`}>
              지자체 교통안전 담당자
            </p>
            <h3 className={styles.cardTitle}>어디를 먼저 점검할까</h3>
            <p className={styles.body}>
              위험도 지도·추세 예측·구별 비교를 한 화면에서. AI가 제안하는
              우선점검 순위와 행정 리포트로 의사결정 근거를 바로 확보합니다.
            </p>
            <ul className={styles.tags}>
              {GOV_TAGS.map((tag) => (
                <li key={tag} className={`${styles.tag} ${styles.tagGov}`}>
                  {tag}
                </li>
              ))}
            </ul>
          </article>

          <article className={`${styles.card} ${styles.cardIns}`}>
            <p className={`${styles.label} ${styles.labelIns}`}>
              보험사 상담·심사 담당자
            </p>
            <h3 className={styles.cardTitle}>
              분석부터 리포트까지,
              <br />
              한 화면에서
            </h3>
            <p className={styles.body}>
              고객 프로필 입력 → AI 위험도 분석 → 담보 추천 → 할인특약 검토 →
              PDF 리포트 발송까지, 상담 전 과정을 하나의 워크플로로 완성합니다.
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
