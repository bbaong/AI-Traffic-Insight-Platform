import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import type { SignupAccent } from './SignupAccountFields';
import { CheckIcon } from './RoleIcons';
import styles from './SignupStepper.module.css';

export interface SignupStepperProps {
  currentStep: 1 | 2;
  /** Step 2에서 역할 표시. 예: "지자체" → "지자체로 가입 중 · 변경" */
  roleLabel?: string;
  /** Step 2 accent. 기본 teal */
  accent?: SignupAccent;
  /** 기본 라벨 대신 커스텀 노드 */
  label?: ReactNode;
}

export function SignupStepper({
  currentStep,
  roleLabel,
  accent = 'teal',
  label,
}: SignupStepperProps) {
  const accentClass = accent === 'amber' ? styles.accentAmber : styles.accentTeal;

  const defaultLabel =
    currentStep === 2 && roleLabel ? (
      <>
        {roleLabel}로 가입 중 ·{' '}
        <Link to={ROUTES.SIGNUP} className={styles.changeLink}>
          변경
        </Link>
      </>
    ) : (
      '유형 선택 · 정보 입력'
    );

  return (
    <div
      className={`${styles.stepper} ${accentClass}`}
      aria-label={`회원가입 ${currentStep}단계`}
    >
      <div className={styles.track} aria-hidden="true">
        <span
          className={`${styles.step} ${
            currentStep === 2 ? styles.completed : styles.active
          }`}
        >
          {currentStep === 2 ? <CheckIcon size={14} /> : '1'}
        </span>
        <span
          className={`${styles.line} ${currentStep === 2 ? styles.lineActive : ''}`}
        />
        <span
          className={`${styles.step} ${
            currentStep === 2 ? styles.active : styles.inactive
          }`}
        >
          2
        </span>
      </div>
      <p className={styles.label}>{label ?? defaultLabel}</p>
    </div>
  );
}
