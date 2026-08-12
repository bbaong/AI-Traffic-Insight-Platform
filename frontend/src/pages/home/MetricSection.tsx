import styles from './MetricSection.module.css';
import { useFadeInClassName } from './useFadeInClassName';

interface MetricItem {
  label: string;
  value: string;
}

const METRICS: MetricItem[] = [
  { label: '분석 단위', value: '시군구' },
  { label: '위험 예측 응답', value: '3초 이내' },
  { label: '데이터 갱신', value: '주 1회' },
  { label: '분석 조건', value: '4축' },
];

export function MetricSection() {
  const { ref, className } = useFadeInClassName();

  return (
    <section
      id="data"
      ref={ref}
      className={`${styles.section} ${className}`}
      aria-label="데이터 기준"
    >
      <div className={styles.inner}>
        <div className={styles.grid}>
          {METRICS.map((metric) => (
            <div key={metric.label}>
              <p className={styles.label}>{metric.label}</p>
              <p className={styles.value}>{metric.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
