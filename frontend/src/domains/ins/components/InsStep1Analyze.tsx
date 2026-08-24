import { useRef } from 'react';
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

function formatPhoneInput(next: string): string {
  const digits = next.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

const HANGUL = /[\u3131-\u318E\uAC00-\uD7A3]/;
const LATIN = /[A-Za-z]/;

function detectNameScript(value: string): 'ko' | 'en' | null {
  for (const ch of value) {
    if (HANGUL.test(ch)) return 'ko';
    if (LATIN.test(ch)) return 'en';
  }
  return null;
}

function isAllowedNameChar(ch: string, script: 'ko' | 'en' | null): boolean {
  if (ch === ' ') return true;
  if (script === 'ko') return HANGUL.test(ch);
  if (script === 'en') return LATIN.test(ch);
  return HANGUL.test(ch) || LATIN.test(ch);
}

function filterCustomerName(
  next: string,
  locked: 'ko' | 'en' | null = null,
): string {
  const chars = [...next].filter(
    (ch) => HANGUL.test(ch) || LATIN.test(ch) || ch === ' ',
  );
  const script = locked ?? detectNameScript(chars.join(''));
  if (!script) return chars.join('');
  return chars.filter((ch) => isAllowedNameChar(ch, script)).join('');
}

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
  const composingName = useRef(false);
  const customerRef = useRef(customer);
  const nameBeforeIme = useRef(customer.name);
  customerRef.current = customer;

  const phoneDigits = customer.phone.replace(/\D/g, '');
  const canAnalyze =
    customer.name.trim().length > 0 &&
    phoneDigits.length >= 10 &&
    phoneDigits.length <= 11;

  return (
    <div className={styles.stepRoot}>
      <div className={styles.grid2}>
        <div className={styles.column}>
          <section className={`${styles.card} ${styles.cardFill}`}>
            <h2 className={styles.cardTitle}>고객 · 프로필 입력</h2>

            <div className={styles.cardBody}>
              <div className={styles.fieldStack}>
                <label className={styles.field} htmlFor="customer-name">
                  <span className={styles.fieldLabel}>
                    고객명 <span className={styles.requiredMark}>*</span>
                  </span>
                  <input
                    id="customer-name"
                    className={styles.input}
                    value={customer.name}
                    onBeforeInput={(e) => {
                      if (composingName.current) return;
                      const data = e.data;
                      if (data == null) return;
                      const lock = detectNameScript(customer.name);
                      if (
                        [...data].some((ch) => !isAllowedNameChar(ch, lock))
                      ) {
                        e.preventDefault();
                      }
                    }}
                    onCompositionStart={() => {
                      composingName.current = true;
                      nameBeforeIme.current = customerRef.current.name;
                    }}
                    onCompositionEnd={(e) => {
                      composingName.current = false;
                      const lock = detectNameScript(nameBeforeIme.current);
                      onCustomerChange({
                        ...customerRef.current,
                        name: filterCustomerName(
                          e.currentTarget.value,
                          lock,
                        ),
                      });
                    }}
                    onChange={(e) => {
                      if (composingName.current) {
                        onCustomerChange({
                          ...customerRef.current,
                          name: e.target.value,
                        });
                        return;
                      }
                      onCustomerChange({
                        ...customerRef.current,
                        name: filterCustomerName(
                          e.target.value,
                          detectNameScript(customerRef.current.name),
                        ),
                      });
                    }}
                    placeholder="홍길동"
                    autoComplete="name"
                    required
                  />
                </label>
                <label className={styles.field} htmlFor="customer-phone">
                  <span className={styles.fieldLabel}>
                    휴대폰 번호 <span className={styles.requiredMark}>*</span>
                  </span>
                  <input
                    id="customer-phone"
                    className={styles.input}
                    value={customer.phone}
                    onChange={(e) =>
                      onCustomerChange({
                        ...customer,
                        phone: formatPhoneInput(e.target.value),
                      })
                    }
                    placeholder="010-1234-5678"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={13}
                    required
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
                disabled={analyzeLoading || !canAnalyze}
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
              className={`${styles.primaryBtn} ${styles.nextBtn}`}
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
