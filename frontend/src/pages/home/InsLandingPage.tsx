import { useEffect } from 'react';
import insDashboardImg from '../../assets/images/hero-ins-dashboard.png';
import { CtaSection } from './CtaSection';
import { InsDetailSection } from './InsDetailSection';
import { LandingFooter } from './LandingFooter';
import { LandingNav } from './LandingNav';
import { SolutionHero } from './SolutionHero';

export function InsLandingPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <LandingNav />
      <main>
        <SolutionHero
          tone="ins"
          eyebrow="보험사 솔루션"
          title="분석부터 리포트까지, 한 화면에서"
          body="고객 프로필 입력부터 AI 위험도 분석, 담보 추천, 할인특약 검토, PDF 리포트 발송까지 상담 전 과정을 하나의 워크플로로 완성합니다."
          image={insDashboardImg}
          imageAlt="보험사 상담 대시보드 화면: 고객 프로필과 AI 분석 결과"
        />
        <InsDetailSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </>
  );
}
