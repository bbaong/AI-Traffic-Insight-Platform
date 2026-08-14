import { Link } from 'react-router-dom';
import { ROUTES } from '../../shared/constants/routes';
import { HeroGovMock, HeroInsMock } from './HeroDashboardMocks';
import styles from './SolutionHero.module.css';
import { useFadeInClassName } from './useFadeInClassName';

type SolutionTone = 'gov' | 'ins';

interface SolutionHeroProps {
  tone: SolutionTone;
  eyebrow: string;
  title: string;
  body: string;
}

export function SolutionHero({
  tone,
  eyebrow,
  title,
  body,
}: SolutionHeroProps) {
  const { ref, className, visible } = useFadeInClassName({
    threshold: 0.2,
    subLanding: true,
  });

  return (
    <section
      ref={ref}
      className={`${styles.section} ${tone === 'ins' ? styles.ins : styles.gov} ${className} ${visible ? styles.ready : ''}`}
      aria-labelledby="solution-hero-heading"
    >
      <div className={styles.inner}>
        <div className={styles.copy}>
          <Link to={{ pathname: ROUTES.LANDING, hash: '#intro' }} className={styles.back}>
            ← 전체 서비스 보기
          </Link>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 id="solution-hero-heading" className={styles.title}>
            {title}
          </h1>
          <p className={styles.body}>{body}</p>
        </div>

        <div
          className={styles.preview}
          aria-label={
            tone === 'gov'
              ? '지자체 대시보드 미리보기'
              : '보험사 상담 대시보드 미리보기'
          }
        >
          <div className={styles.previewMock}>
            {tone === 'gov' ? <HeroGovMock /> : <HeroInsMock />}
          </div>
        </div>
      </div>
    </section>
  );
}
