import styles from './ProcessSection.module.css';
import { useFadeInClassName } from './useFadeInClassName';

const STEPS = [
  {
    n: '01',
    title: '구·군 단위로 읽습니다',
    body: '대구 교통사고 기록을 중구부터 군위군까지 같은 기준으로 맞춥니다. 시 평균과 구별 차이를 한눈에 봅니다.',
  },
  {
    n: '02',
    title: '다음 분기를 예측합니다',
    body: '사고 건수와 중대사고율을 상해 정도별로 이어 보여 줍니다. 실적 뒤에 예측 한 분기가 붙습니다.',
  },
  {
    n: '03',
    title: '오늘의 업무에 붙입니다',
    body: '지자체는 우선점검 제안과 리포트로, 보험사는 담보·특약 근거와 상담 기록으로 남습니다.',
  },
] as const;

export function ProcessSection() {
  const { ref, className, visible } = useFadeInClassName();

  return (
    <section
      ref={ref}
      className={`${styles.section} ${className} ${visible ? styles.ready : ''}`}
      aria-labelledby="process-heading"
    >
      <div className={styles.inner}>
        <h2 id="process-heading" className={styles.title}>
          통계에서 한 번의 판단까지
        </h2>

        <ol className={styles.list}>
          {STEPS.map((step) => (
            <li key={step.n} className={styles.item}>
              <p className={styles.num}>{step.n}</p>
              <div>
                <h3 className={styles.itemTitle}>{step.title}</h3>
                <p className={styles.body}>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
