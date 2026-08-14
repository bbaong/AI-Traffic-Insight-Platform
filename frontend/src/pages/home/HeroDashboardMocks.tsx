import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ComparisonCard } from '../../domains/gov/components/ComparisonCard';
import { PriorityTop3Card } from '../../domains/gov/components/PriorityTop3Card';
import { SeverityStackedCard } from '../../domains/gov/components/SeverityStackedCard';
import { SuggestionsCard } from '../../domains/gov/components/SuggestionsCard';
import { InsStep1Analyze } from '../../domains/ins/components/InsStep1Analyze';
import { InsStepIndicator } from '../../domains/ins/components/InsStepIndicator';
import insPage from '../../domains/ins/pages/InsDashboardPage.module.css';
import { flattenSidebarMenus } from '../../shared/constants/sidebarMenus';
import { HeroChoropleth } from './HeroChoropleth';
import {
  HERO_GOV_COMPARISON,
  HERO_GOV_DISTRICT,
  HERO_GOV_HISTORY,
  HERO_GOV_SELECTED_CODE,
  HERO_GOV_SUGGESTIONS,
  HERO_GOV_TOP3,
  HERO_INS_CUSTOMER,
  HERO_INS_PREDICTION,
  HERO_INS_PROFILE,
} from './heroMockData';
import styles from './HeroDashMock.module.css';

const STAGE_W = 1440;
const STAGE_H = 900;

function useFitScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 0.5, x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const apply = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width < 8 || height < 8) return;
      const scale =
        Math.min(width / STAGE_W, height / STAGE_H) * 0.9;
      setFit({
        scale,
        x: (width - STAGE_W * scale) / 2,
        y: (height - STAGE_H * scale) / 2,
      });
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, ...fit };
}

function DashShell({
  tone,
  title,
  children,
}: {
  tone: 'gov' | 'ins';
  title: string;
  children: ReactNode;
}) {
  const isGov = tone === 'gov';
  const menus = flattenSidebarMenus(isGov ? 'ROLE_A' : 'ROLE_B');

  return (
    <div
      className={`${styles.shell} ${isGov ? styles.shellGov : styles.shellIns}`}
      style={{ width: STAGE_W, height: STAGE_H }}
    >
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src="/icon_logo.png" alt="" className={styles.logo} />
          <span className={styles.brandName}>AI Traffic Insight</span>
        </div>
        <nav className={styles.nav}>
          {menus.map((item, i) => (
            <span
              key={item.id}
              className={`${styles.navItem} ${i === 0 ? styles.navActive : ''}`}
            >
              {item.label}
            </span>
          ))}
        </nav>
        <div className={styles.sideFooter}>
          <span className={styles.userName}>담당자</span>
          <span className={styles.logout}>로그아웃</span>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <h3 className={styles.pageTitle}>{title}</h3>
          <span className={styles.roleTag}>{isGov ? '지자체' : '보험사'}</span>
        </header>
        <div className={isGov ? styles.bodyGov : styles.bodyIns}>{children}</div>
      </div>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const { ref, scale, x, y } = useFitScale();

  return (
    <div ref={ref} className={styles.viewport}>
      <div
        className={styles.stage}
        style={{
          width: STAGE_W,
          height: STAGE_H,
          left: x,
          top: y,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function noop(): void {
  /* landing preview — not interactive */
}

export function HeroGovMock() {
  return (
    <Frame>
      <DashShell tone="gov" title="지자체 대시보드">
        <div className={styles.govPage}>
          <div className={styles.row1}>
            <div className={styles.cellMap}>
              <HeroChoropleth selectedCode={HERO_GOV_SELECTED_CODE} />
            </div>
            <div className={styles.cell}>
              <ComparisonCard
                districtName={HERO_GOV_DISTRICT}
                data={HERO_GOV_COMPARISON}
              />
            </div>
          </div>
          <div className={styles.row2}>
            <div className={styles.cell}>
              <SeverityStackedCard
                regionName={HERO_GOV_DISTRICT}
                data={HERO_GOV_HISTORY}
              />
            </div>
            <div className={styles.cell}>
              <SuggestionsCard data={HERO_GOV_SUGGESTIONS} />
            </div>
            <div className={styles.cell}>
              <PriorityTop3Card
                rows={HERO_GOV_TOP3}
                selectedCode={HERO_GOV_SELECTED_CODE}
                onSelectCode={noop}
              />
            </div>
          </div>
        </div>
      </DashShell>
    </Frame>
  );
}

export function HeroInsMock() {
  return (
    <Frame>
      <DashShell tone="ins" title="보험 상담 대시보드">
        <div className={`${insPage.page} ${styles.insPage}`}>
          <div className={insPage.toolbar}>
            <InsStepIndicator current={1} step1Done={false} onGoTo={noop} />
            <span className={insPage.memoBtn}>메모</span>
          </div>
          <InsStep1Analyze
            customer={HERO_INS_CUSTOMER}
            profile={HERO_INS_PROFILE}
            prediction={HERO_INS_PREDICTION}
            analyzeLoading={false}
            analyzeError={null}
            onCustomerChange={noop}
            onProfileChange={noop}
            onAnalyze={noop}
            onNext={noop}
          />
        </div>
      </DashShell>
    </Frame>
  );
}
