import type { CSSProperties, ReactNode } from 'react';
import styles from './GovDetailSection.module.css';
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
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
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
      <path d="M3 20h18" />
    </svg>
  );
}

function BulbIcon() {
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
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </svg>
  );
}

function CompareIcon() {
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
      <rect x="3" y="3" width="7" height="18" rx="1" />
      <rect x="14" y="8" width="7" height="13" rx="1" />
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

interface FeatureCard {
  title: string;
  body: string;
  icon: ReactNode;
}

const FEATURES: FeatureCard[] = [
  {
    icon: <MapIcon />,
    title: '사고위험 지도 / 우선점검',
    body: '9개 구·군을 5단계 컬러맵으로 시각화. 사고 다발지역을 지도에서 바로 확인합니다.',
  },
  {
    icon: <ChartIcon />,
    title: '대구 평균 대비 비교',
    body: '보행자·야간·중상·신호위반 4개 지표를 대구 전체 평균과 나란히 비교합니다.',
  },
  {
    icon: <BulbIcon />,
    title: 'AI 우선점검 제안',
    body: '지표가 대구 평균을 초과하면 야간조명·신호체계·보행자보호 등 조치 카드를 자동 생성합니다.',
  },
  {
    icon: <CompareIcon />,
    title: '지역비교',
    body: '최대 3개 구를 동시에 비교하고, 인사이트를 자동으로 생성합니다.',
  },
  {
    icon: <DocIcon />,
    title: '행정 참고 리포트',
    body: '분석 결과를 PDF로 즉시 다운로드해 회의·보고 자료로 활용합니다.',
  },
];

const TOP3 = [
  {
    rank: '1위',
    name: '군위군',
    badge: 'CRITICAL',
    meta: '중상이상 비율 47.1% · 예측 건수 38건',
    accent: 'rank1' as const,
  },
  {
    rank: '2위',
    name: '남구',
    badge: 'HIGH',
    meta: '보행자 사고 비율 21.9%',
    accent: 'rank2' as const,
  },
  {
    rank: '3위',
    name: '달성군',
    badge: 'HIGH',
    meta: '중상이상 비율 29.8%',
    accent: 'rank3' as const,
  },
];

export function GovDetailSection() {
  const { ref, className, visible } = useFadeInClassName();

  return (
    <section
      id="gov-section"
      ref={ref}
      className={`${styles.section} ${className}`}
      aria-labelledby="gov-detail-heading"
    >
      <div className={styles.inner}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>지자체 — 위험도 분석</p>
          <h2 id="gov-detail-heading" className={styles.title}>
            우선순위가 필요한
            <br />
            행정 담당자를 위해
          </h2>
          <p className={styles.body}>
            9개 구·군을 동시에 비교하고, AI가 어디를 먼저 점검해야 할지 카드로
            제안합니다. 회의 자료와 행정 리포트도 즉시 뽑을 수 있습니다.
          </p>
        </div>

        <div
          className={`${styles.split} ${visible ? styles.isVisible : ''}`}
        >
          <div className={styles.featureCol}>
            {FEATURES.map((feature, index) => (
              <article
                key={feature.title}
                className={`${styles.featureCard} ${styles.stagger}`}
                style={
                  {
                    '--stagger-delay': `${index * 160}ms`,
                  } as CSSProperties
                }
              >
                <div className={styles.featureHead}>
                  {feature.icon}
                  <h3 className={styles.cardTitle}>{feature.title}</h3>
                </div>
                <p className={styles.cardBody}>{feature.body}</p>
              </article>
            ))}
          </div>

          <aside className={styles.mock} aria-label="우선점검 미리보기">
            <div
              className={`${styles.mockHeader} ${styles.stagger}`}
              style={{ '--stagger-delay': '720ms' } as CSSProperties}
            >
              <p className={styles.mockTitle}>우선점검 TOP 3</p>
              <p className={styles.mockSub}>AI 우선순위 제안</p>
            </div>

            <div className={styles.mockList}>
              {TOP3.map((item, index) => (
                <div
                  key={item.name}
                  className={`${styles.mockBlock} ${styles[item.accent]} ${styles.stagger}`}
                  style={
                    {
                      '--stagger-delay': `${880 + index * 160}ms`,
                    } as CSSProperties
                  }
                >
                  <div className={styles.mockRow}>
                    <span className={styles.mockName}>
                      <span className={styles.mockRank}>{item.rank}</span>
                      {item.name}
                    </span>
                    <span className={styles.badge}>{item.badge}</span>
                  </div>
                  <p className={styles.mockMeta}>{item.meta}</p>
                </div>
              ))}
            </div>

            <div
              className={`${styles.tipsBlock} ${styles.stagger}`}
              style={{ '--stagger-delay': '1400ms' } as CSSProperties}
            >
              <p className={styles.tipsLabel}>AI 우선점검 제안</p>
              <div className={styles.tips}>
                <p className={styles.tip}>야간 보행자 구간 조명 강화 권장</p>
                <p className={styles.tip}>교차로 신호체계 개선 검토</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
