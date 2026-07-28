import {
  CtaSection,
  FeatureSection,
  HeroSection,
  LandingFooter,
  LandingNav,
  MetricSection,
  RoleIntroSection,
} from '../../components/landing';

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
