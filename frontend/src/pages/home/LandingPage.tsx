import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Toast } from '../../shared/components/ui/Toast';
import {
  CtaSection,
  GovDetailSection,
  HeroSection,
  InsDetailSection,
  LandingFooter,
  LandingNav,
  MetricSection,
  RoleIntroSection,
} from './index';

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

  return (
    <>
      <LandingNav />
      <main>
        <HeroSection />
        <RoleIntroSection />
        <GovDetailSection />
        <InsDetailSection />
        <MetricSection />
        <CtaSection />
      </main>
      <LandingFooter />
      <Toast message="가입성공" visible={signupToastVisible} />
    </>
  );
}

export default LandingPage;
