import { useState } from 'react';
import { predictRisk } from '../../api/prediction';
import {
  AiSummaryCard,
  DashboardCard,
  DashboardShell,
  MapCard,
} from '../../components/dashboard';
import { InsDataNoticeFooter } from '../../components/dashboard/InsDataNoticeFooter';
import noticeStyles from '../../components/dashboard/InsDataNoticeFooter.module.css';
import { insDashboardMock } from '../../mocks/data/insDashboard.mock';
import type { AiSummaryData, RiskLevel } from '../../types/dashboard';
import styles from '../gov/GovDashboardPage.module.css';

/** 보험사 대시보드 페이지 */
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
  const [aiSummary, setAiSummary] = useState<AiSummaryData>(d.aiSummary);
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    try {
      setLoading(true);
      const result = await predictRisk({
        구군: profile.region,
        연령대: profile.age,
        성별: profile.gender,
        차종: profile.vehicle,
        주야: profile.time,
        variant: 'weighted',
      });

      const gradeMap: Record<string, RiskLevel> = {
        사망사고: 'CRITICAL',
        중상사고: 'HIGH',
        경상사고: 'MODERATE',
        부상신고사고: 'LOW',
      };

      const factors = Object.entries(result.등급확률).map(([name, p]) => ({
        name,
        contribution: Math.round(p * 100),
      }));

      setAiSummary({
        riskLevel: gradeMap[result.예측등급] ?? 'MODERATE',
        title: '상담 고객 위험 요약',
        scoreLabel: '위험 점수',
        score: result.위험도,
        factors,
        recommendation: `예측 등급: ${result.예측등급} · 참고 지표이며 인수 심사의 직접 근거가 아닙니다`,
      });
    } catch (e) {
      console.error(e);
      alert('분석에 실패했습니다. AI/백엔드 서버를 확인하세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell
      topSlot={
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
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? '분석 중…' : '분석 실행'}
            </button>
          </div>
        </DashboardCard>
      }
      mapSlot={
        <div className={noticeStyles.mapStack}>
          <MapCard title="지역 위험도 지도 · Choropleth" />
          <InsDataNoticeFooter />
        </div>
      }
      aiSummarySlot={<AiSummaryCard data={aiSummary} accent="amber" />}
      sideBottomSlot={
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
      kpis={d.kpis}
    />
  );
}

export default InsDashboardPage;