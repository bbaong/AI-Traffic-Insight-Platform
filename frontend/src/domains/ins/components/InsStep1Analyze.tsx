import {
  AGE_OPTIONS,
  GENDER_OPTIONS,
  REGION_OPTIONS,
  VEHICLE_OPTIONS,
} from '../constants/insFeatures';
import type { CustomerInfo, ProfileInput } from '../types/consulting';
import type { InsPredictData } from '../types/prediction';
import { AiAnalysisResultCard } from './AiAnalysisResultCard';
import styles from './insConsultingShared.module.css';

type Props = {
  customer: CustomerInfo;
  profile: ProfileInput;
  prediction: InsPredictData | null;
  analyzeLoading: boolean;
  analyzeError: string | null;
  onCustomerChange: (next: CustomerInfo) => void;
  onProfileChange: (next: ProfileInput) => void;
  onAnalyze: () => void;
  onNext: () => void;
};

export function InsStep1Analyze({
  customer,
  profile,
  prediction,
  analyzeLoading,
  analyzeError,
  onCustomerChange,
  onProfileChange,
  onAnalyze,
  onNext,
}: Props) {
  return (
    <div className={styles.stepRoot}>
      <div className={styles.grid2}>
        <div className={styles.column}>
          <section className={`${styles.card} ${styles.cardFill}`}>
            <h2 className={styles.cardTitle}>고객 · 프로필 입력</h2>

            <div className={styles.cardBody}>
              <div className={styles.fieldStack}>
                <label className={styles.field} htmlFor="customer-name">
                  <span className={styles.fieldLabel}>고객명</span>
                  <input
                    id="customer-name"
                    className={styles.input}
                    value={customer.name}
                    onChange={(e) =>
                      onCustomerChange({ ...customer, name: e.target.value })
                    }
                    placeholder="홍길동"
                    autoComplete="name"
                  />
                </label>
                <label className={styles.field} htmlFor="customer-phone">
                  <span className={styles.fieldLabel}>휴대폰</span>
                  <input
                    id="customer-phone"
                    className={styles.input}
                    value={customer.phone}
                    onChange={(e) =>
                      onCustomerChange({ ...customer, phone: e.target.value })
                    }
                    placeholder="010-0000-0000"
                    autoComplete="tel"
                  />
                </label>

                <div className={styles.field}>
                  <span className={styles.fieldLabel}>성별</span>
                  <div className={styles.segment} role="group" aria-label="성별">
                    {GENDER_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`${styles.segmentBtn} ${
                          profile.gender === opt ? styles.segmentActive : ''
                        }`}
                        onClick={() =>
                          onProfileChange({ ...profile, gender: opt })
                        }
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <label className={styles.field} htmlFor="profile-age">
                  <span className={styles.fieldLabel}>연령대</span>
                  <select
                    id="profile-age"
                    className={styles.select}
                    value={profile.age}
                    onChange={(e) =>
                      onProfileChange({ ...profile, age: e.target.value })
                    }
                  >
                    {AGE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field} htmlFor="profile-vehicle">
                  <span className={styles.fieldLabel}>차종</span>
                  <select
                    id="profile-vehicle"
                    className={styles.select}
                    value={profile.vehicle}
                    onChange={(e) =>
                      onProfileChange({ ...profile, vehicle: e.target.value })
                    }
                  >
                    {VEHICLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field} htmlFor="profile-region">
                  <span className={styles.fieldLabel}>지역</span>
                  <select
                    id="profile-region"
                    className={styles.select}
                    value={profile.region}
                    onChange={(e) =>
                      onProfileChange({ ...profile, region: e.target.value })
                    }
                  >
                    {REGION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className={styles.cardActions}>
              {analyzeError ? (
                <p className={styles.errorBanner} role="alert">
                  {analyzeError}
                </p>
              ) : null}
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={onAnalyze}
                disabled={analyzeLoading}
              >
                {analyzeLoading ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    분석 중…
                  </>
                ) : (
                  'AI 분석하기'
                )}
              </button>
            </div>
          </section>
        </div>

        <div className={`${styles.column} ${styles.columnGrow}`}>
          <AiAnalysisResultCard
            profile={profile}
            prediction={prediction}
            analyzeLoading={analyzeLoading}
            fill
          />
          <div className={styles.footerNav}>
            <button
              type="button"
              className={styles.primaryBtn}
              style={{ width: 'auto', minWidth: 140, padding: '0 20px' }}
              onClick={onNext}
              disabled={!prediction}
            >
              다음 단계 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
