import type { ReactNode } from 'react';
import styles from './FeatureSection.module.css';
import { useFadeInClassName } from './useFadeInClassName';

function MapIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}

interface FeatureItem {
  title: string;
  body: string;
  icon: ReactNode;
}

const FEATURES: FeatureItem[] = [
  {
    icon: <MapIcon />,
    title: '시군구 단위로 봅니다',
    body: '지도와 표, 리포트까지 지역 단위가 같습니다.',
  },
  {
    icon: <ChartIcon />,
    title: '근거를 함께 줍니다',
    body: '요인별 기여도와 평균 대비 배율까지 보여줍니다.',
  },
  {
    icon: <DocIcon />,
    title: '바로 문서가 됩니다',
    body: '보고서와 상담 자료를 화면에서 그대로 만듭니다.',
  },
];

export function FeatureSection() {
  const { ref, className } = useFadeInClassName();

  return (
    <section
      ref={ref}
      className={`${styles.section} ${className}`}
      aria-labelledby="feature-heading"
    >
      <div className={styles.inner}>
        <h2 id="feature-heading" className={styles.title}>
          점수 하나로 끝내지 않습니다
        </h2>
        <p className={styles.subtitle}>
          판단에 필요한 근거를 함께 제공합니다.
        </p>

        <div className={styles.grid}>
          {FEATURES.map((feature) => (
            <article key={feature.title} className={styles.card}>
              {feature.icon}
              <h3 className={styles.cardTitle}>{feature.title}</h3>
              <p className={styles.body}>{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
