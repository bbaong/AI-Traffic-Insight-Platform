import styles from './MetricSection.module.css';
import { useFadeInClassName } from './useFadeInClassName';

const METRICS = [
  {
    value: '18.8%',
    label: '대구 전체 보행자 사고 비율\n(대구평균 기준선)',
  },
  {
    value: '40.1%',
    label: '야간 사고 비율\n일부 구는 42%까지 초과',
  },
  {
    value: '26.1%',
    label: '중상 이상 사고 비율\n군위군은 47.1%로 최고',
  },
  {
    value: '67,916',
    label: '안전운전불이행 건수\n전체 법규위반의 56%',
  },
] as const;

export function MetricSection() {
  const { ref, className } = useFadeInClassName();

  return (
    <section
      id="data"
      ref={ref}
      className={`${styles.section} ${className}`}
      aria-labelledby="metric-heading"
    >
      <div className={styles.inner}>
        <p className={styles.eyebrow}>명확한 정량 수치</p>
        <h2 id="metric-heading" className={styles.title}>
          객관적 분석 근거
        </h2>
        <p className={styles.subtitle}>
          단순 통계를 넘어 의사결정에 필요한 데이터를 제공합니다. 모든 수치는
          한국도로교통공단 TAAS 실측 데이터에 근거합니다.
        </p>

        <div className={styles.grid}>
          {METRICS.map((metric) => (
            <div key={metric.value} className={styles.card}>
              <p className={styles.value}>{metric.value}</p>
              <p className={styles.label}>
                {metric.label.split('\n').map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
