import { useState } from 'react';
import {
  AiSummaryCard,
  DashboardCard,
  DashboardShell,
  MapCard,
} from '../../components/dashboard';
import { insDashboardMock } from '../../mocks/data/insDashboard.mock';
import styles from '../gov/GovDashboardPage.module.css';

export function InsDashboardPage() {
  const d = insDashboardMock;
  const maxCohort = Math.max(...d.cohortByAge.map((b) => b.value), 1);
  const [profile, setProfile] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of d.profileFields) {
      initial[field.id] = field.options[0]?.value ?? '';
    }
    return initial;
  });

  return (
    <DashboardShell
      kpis={d.kpis}
      mapSlot={<MapCard title="지역 위험도 지도 · Choropleth" />}
      aiSummarySlot={<AiSummaryCard data={d.aiSummary} accent="amber" />}
      bottomLeftSlot={
        <DashboardCard title="고객 프로필 입력">
          <div className={styles.formGrid}>
            {d.profileFields.map((field) => (
              <label key={field.id} className={styles.field} htmlFor={field.id}>
                <span className={styles.fieldLabel}>{field.label}</span>
                <select
                  id={field.id}
                  className={styles.select}
                  value={profile[field.id] ?? ''}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      [field.id]: e.target.value,
                    }))
                  }
                >
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <button
              type="button"
              className={styles.analyzeBtn}
              onClick={() => {
                console.log('[InsProfileAnalyze]', profile);
              }}
            >
              분석 실행
            </button>
          </div>
        </DashboardCard>
      }
      bottomRightSlot={
        <DashboardCard title="유사 고객군 위험도 · 연령대별">
          <div
            className={styles.chart}
            role="img"
            aria-label="연령대별 위험 점수"
          >
            {d.cohortByAge.map((item) => (
              <div key={item.label} className={styles.barCol}>
                <div
                  className={`${styles.bar} ${styles.barAmber}`}
                  style={{ height: `${(item.value / maxCohort) * 100}%` }}
                  title={`${item.label}: ${item.value}`}
                />
                <span className={styles.barLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </DashboardCard>
      }
    />
  );
}

export default InsDashboardPage;
