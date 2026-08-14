import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Toast } from '../../shared/components/ui/Toast';
import {
  CtaSection,
  HeroSection,
  LandingFooter,
  LandingNav,
  MetricSection,
  ProcessSection,
  RoleIntroSection,
} from './index';
import { scrollToLandingSection } from './scrollToLandingSection';

function scrollToHash(hash: string): void {
  const id = hash.replace('#', '');
  if (!id) return;
  scrollToLandingSection(id);
}

export function LandingPage() {
  const location = useLocation();
  const [signupToastVisible, setSignupToastVisible] = useState(false);

  useEffect(() => {
    const state = location.state as { signupSuccess?: boolean } | null;
    if (!state?.signupSuccess) return;

    setSignupToastVisible(true);
    window.history.replaceState({}, '');

    const t = window.setTimeout(() => setSignupToastVisible(false), 1800);
    return () => window.clearTimeout(t);
  }, [location.state]);

  useEffect(() => {
    if (location.hash) return;
    window.scrollTo(0, 0);
  }, [location.key, location.hash]);

  useEffect(() => {
    if (!location.hash) return;
    const t = window.setTimeout(() => scrollToHash(location.hash), 80);
    return () => window.clearTimeout(t);
  }, [location.hash]);

  return (
    <>
      <LandingNav />
      <main>
        <HeroSection />
        <RoleIntroSection />
        <MetricSection />
        <ProcessSection />
        <CtaSection />
      </main>
      <LandingFooter />
      <Toast message="가입성공" visible={signupToastVisible} />
    </>
  );
}

export default LandingPage;
