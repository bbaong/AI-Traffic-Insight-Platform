import { useState } from 'react';
import { FormField } from './FormField';
import fieldStyles from './FormField.module.css';
import { IdCheckField } from './IdCheckField';
import { EyeIcon, EyeOffIcon } from './RoleIcons';
import styles from './SignupAccountFields.module.css';

export type SignupAccent = 'teal' | 'amber';

export type SignupAccountFieldName =
  | 'loginId'
  | 'password'
  | 'passwordConfirm'
  | 'name'
  | 'position';

export interface SignupAccountValues {
  loginId: string;
  password: string;
  passwordConfirm: string;
  name: string;
  position: string;
}

export interface SignupAccountFieldsProps {
  accent: SignupAccent;
  values: SignupAccountValues;
  onChange: (field: SignupAccountFieldName, value: string) => void;
  isIdChecked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** 지자체·보험사 폼이 공유하는 계정 정보 섹션 */
export function SignupAccountFields({
  accent,
  values,
  onChange,
  isIdChecked,
  onCheckedChange,
}: SignupAccountFieldsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const passwordMismatch =
    values.passwordConfirm.length > 0 &&
    values.password !== values.passwordConfirm;

  return (
    <section
      className={styles.section}
      data-accent={accent}
      aria-labelledby="account-heading"
    >
      <h2 id="account-heading" className={styles.sectionTitle}>
        계정 정보
      </h2>

      <IdCheckField
        value={values.loginId}
        isChecked={isIdChecked}
        onChange={(value) => onChange('loginId', value)}
        onCheckedChange={onCheckedChange}
      />

      <div className={fieldStyles.grid2}>
        <FormField
          id="password"
          label="비밀번호"
          required
          hint="· 8자 이상"
          error={
            values.password.length > 0 && values.password.length < 8
              ? '비밀번호는 8자 이상이어야 합니다'
              : undefined
          }
        >
          <div className={fieldStyles.passwordWrap}>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => onChange('password', e.target.value)}
              className={fieldStyles.control}
              aria-describedby={
                values.password.length > 0 && values.password.length < 8
                  ? 'password-error'
                  : undefined
              }
            />
            <button
              type="button"
              className={fieldStyles.toggle}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
            >
              {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </div>
        </FormField>

        <FormField
          id="passwordConfirm"
          label="비밀번호 확인"
          required
          error={
            passwordMismatch ? '비밀번호가 일치하지 않습니다' : undefined
          }
        >
          <div className={fieldStyles.passwordWrap}>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type={showPasswordConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              value={values.passwordConfirm}
              onChange={(e) => onChange('passwordConfirm', e.target.value)}
              className={`${fieldStyles.control} ${
                passwordMismatch ? fieldStyles.controlInvalid : ''
              }`}
              aria-invalid={passwordMismatch}
              aria-describedby={
                passwordMismatch ? 'passwordConfirm-error' : undefined
              }
            />
            <button
              type="button"
              className={fieldStyles.toggle}
              onClick={() => setShowPasswordConfirm((v) => !v)}
              aria-label={
                showPasswordConfirm
                  ? '비밀번호 확인 숨기기'
                  : '비밀번호 확인 표시'
              }
            >
              {showPasswordConfirm ? (
                <EyeOffIcon size={18} />
              ) : (
                <EyeIcon size={18} />
              )}
            </button>
          </div>
        </FormField>
      </div>

      <div className={fieldStyles.grid2}>
        <FormField id="name" label="이름" required>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
            className={fieldStyles.control}
            maxLength={50}
          />
        </FormField>

        <FormField id="position" label="직급·직책" hint="· 선택">
          <input
            id="position"
            name="position"
            type="text"
            value={values.position}
            onChange={(e) => onChange('position', e.target.value)}
            className={fieldStyles.control}
            placeholder="예) 주무관"
            maxLength={50}
          />
        </FormField>
      </div>
    </section>
  );
}
