import { useState } from 'react';
import { predictRisk } from '../api/prediction';
import { DAEGU_DISTRICTS } from '../../../shared/constants/daeguBoundaries';
import { useDistrictStore } from '../../../shared/stores/districtStore';
import {
  AiSummaryCard,
  DashboardCard,
  DashboardShell,
  MapCard,
} from '../../../shared/components/dashboard';
import { InsDataNoticeFooter } from '../components/InsDataNoticeFooter';
import noticeStyles from '../components/InsDataNoticeFooter.module.css';
import { insDashboardMock } from '../mocks/insDashboard.mock';
import type { AiSummaryData, RiskLevel } from '../../../shared/types/dashboard';
import styles from '../../../shared/components/dashboard/GovDashboardPage.module.css';

/** 모델이 학습한 연령대 (차트 X축) */
const AGE_BANDS = [
  '20세 이하',
  '21-30세',
  '31-40세',
  '41-50세',
  '51-60세',
  '61-64세',
  '65세 이상',
] as const;

const AGE_SHORT: Record<string, string> = {
  '20세 이하': '≤20',
  '21-30세': '21-30',
  '31-40세': '31-40',
  '41-50세': '41-50',
  '51-60세': '51-60',
  '61-64세': '61-64',
  '65세 이상': '65+',
};

export function InsDashboardPage() {
  const d = insDashboardMock;
  const setSelectedCode = useDistrictStore((s) => s.setSelectedCode);
  const [profile, setProfile] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of d.profileFields) {
      initial[field.id] = field.options[0]?.value ?? '';
    }
    return initial;
  });
  const [aiSummary, setAiSummary] = useState<AiSummaryData | null>(null);
  const [cohortByAge, setCohortByAge] = useState<
    { label: string; value: number }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const values = cohortByAge.map((b) => b.value);
  const dataMin = values.length ? Math.min(...values) : 0;
  const dataMax = values.length ? Math.max(...values) : 0;
  const pad = 5;
  const yMin = Math.max(0, Math.floor(dataMin - pad));
  const yMax = Math.min(100, Math.ceil(Math.max(dataMax + pad, yMin + 10)));

  async function handleAnalyze() {
    try {
      setLoading(true);

      const base = {
        구군: profile.region,
        성별: profile.gender,
        차종: profile.vehicle,
      };
  
      // 연령대별 병렬 예측 (유사 조건 비교)
      const ageResults = await Promise.all(
        AGE_BANDS.map(async (age) => {
          const r = await predictRisk({ ...base, 연령대: age });
          return { age, result: r };
        }),
      );
  
      setCohortByAge(
        ageResults.map(({ age, result }) => ({
          label: AGE_SHORT[age] ?? age,
          value: result.위험도,
        })),
      );
  
      // 선택한 연령대 결과 → AI 요약
      const selected =
        ageResults.find((x) => x.age === profile.age)?.result ??
        ageResults[0].result;
  
      const factors = Object.entries(selected.등급확률).map(([name, p]) => ({
        name,
        contribution: Math.round(p * 100),
      }));
      
      const level = selected.예측등급 as RiskLevel;
      
      setAiSummary({
        riskLevel:
          level === 'CRITICAL' || level === 'HIGH' || level === 'MODERATE' || level === 'LOW'
            ? level
            : 'MODERATE',
        title: '상담 고객 위험 요약',
        scoreLabel: '위험 점수',
        score: selected.위험도,
        factors,
        recommendation: '참고 지표이며 인수 심사의 직접 근거가 아닙니다',
        profileSummary: [
          profile.region,
          profile.age,
          profile.gender,
          profile.vehicle,
        ]
          .filter(Boolean)
          .join(' · '),
      });

      // 프로필 지역 → 지도 선택 동기화
      const district = DAEGU_DISTRICTS.find((d) => d.name === profile.region);
      if (district) {
        setSelectedCode(district.code);
      }
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
      aiSummarySlot={
        aiSummary ? (
          <AiSummaryCard data={aiSummary} accent="amber" />
        ) : (
          <DashboardCard title="AI 분석 요약">
            <div className={styles.emptyHint}>
              <span>
                고객 프로필을 입력한 뒤 <strong>분석 실행</strong>을 눌러 주세요.
              </span>
            </div>
          </DashboardCard>
        )
      }
      sideBottomSlot={
        <DashboardCard title="동일 조건 · 연령대별 위험도">
          {cohortByAge.length === 0 ? (
            <div className={styles.emptyHint}>
              <span>
                분석 실행 후 동일 조건의 연령대별 위험도가 표시됩니다.
              </span>
            </div>
          ) : (
            <div
              className={styles.chart}
              role="img"
              aria-label="연령대별 위험 점수"
            >
              {cohortByAge.map((item) => (
                <div key={item.label} className={styles.barCol}>
                  <span className={styles.barValue}>{item.value}</span>
                  <div
                    className={`${styles.bar} ${styles.barAmber}`}
                    style={{
                      height: `${
                        ((item.value - yMin) / (yMax - yMin || 1)) * 100
                      }%`,
                    }}
                    title={`${item.label}: ${item.value}`}
                  />
                  <span className={styles.barLabel}>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      }
      kpis={d.kpis}
    />
  );
}

export default InsDashboardPage;