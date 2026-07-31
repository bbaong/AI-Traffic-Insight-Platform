import {
  CtaSection,
  FeatureSection,
  HeroSection,
  LandingFooter,
  LandingNav,
  MetricSection,
  RoleIntroSection,
} from './index';

export function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <HeroSection />
        <RoleIntroSection />
        <FeatureSection />
        <MetricSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </>
  );
}

export default LandingPage;
