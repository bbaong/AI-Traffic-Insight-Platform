import styles from './MetricSection.module.css';
import { TaasLink } from '../../shared/components/ui/TaasCredit';
import { useFadeInClassName } from './useFadeInClassName';

const METRICS = [
  {
    value: '18.8%',
    label: '보행자 사고',
    note: '대구 평균',
  },
  {
    value: '40.1%',
    label: '야간 사고',
    note: '일부 구는 42%',
  },
  {
    value: '26.1%',
    label: '중상 이상',
    note: '군위군 47.1%',
  },
  {
    value: '56%',
    label: '안전운전불이행',
    note: '법규위반 중 비중',
  },
] as const;

export function MetricSection() {
  const { ref, className, visible } = useFadeInClassName();

  return (
    <section
      id="data"
      ref={ref}
      className={`${styles.section} ${className} ${visible ? styles.ready : ''}`}
      aria-labelledby="metric-heading"
    >
      <div className={styles.inner}>
        <h2 id="metric-heading" className={styles.title}>
          수치는 예측의 출발점입니다
        </h2>
        <p className={styles.subtitle}>
          한국도로교통공단 <TaasLink>TAAS</TaasLink>, 2016–2025년 대구시 교통사고 통계.
        </p>

        <ul className={styles.row}>
          {METRICS.map((metric) => (
            <li key={metric.label} className={styles.stat}>
              <p className={styles.value}>{metric.value}</p>
              <p className={styles.label}>{metric.label}</p>
              <p className={styles.note}>{metric.note}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
