import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import govDashboardImg from '../../assets/images/hero-gov-dashboard.png';
import { CtaSection } from './CtaSection';
import { GovDetailSection } from './GovDetailSection';
import { LandingFooter } from './LandingFooter';
import { LandingNav } from './LandingNav';
import { SolutionHero } from './SolutionHero';

export function GovLandingPage() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.key]);

  return (
    <>
      <LandingNav />
      <main>
        <SolutionHero
          key={`hero-${location.key}`}
          tone="gov"
          eyebrow="지자체 솔루션"
          title="어디를 먼저 점검할지, 한 화면에서"
          body="위험도 지도·추세 예측·구별 비교를 한 화면에서 봅니다. AI가 제안하는 우선점검 순위와 행정 리포트로 의사결정 근거를 바로 확보합니다."
          image={govDashboardImg}
          imageAlt="지자체 대시보드 화면: 사고위험 지도와 우선점검 제안"
        />
        <GovDetailSection key={location.key} />
        <CtaSection key={`cta-${location.key}`} />
      </main>
      <LandingFooter />
    </>
  );
}
