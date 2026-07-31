import { useState } from 'react';
import { checkLoginId } from '../api/signup';
import { FormField } from './FormField';
import fieldStyles from './FormField.module.css';

/** 영문·숫자 모두 포함, 4~50자 (영문만/숫자만 불가) */
const LOGIN_ID_PATTERN = /^(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9]{4,50}$/;

const FORMAT_HINT = '· 영문·숫자 모두 포함, 4~50자';
const FORMAT_ERROR = '영문과 숫자를 모두 포함한 4~50자로 입력하세요';

export interface IdCheckFieldProps {
  id?: string;
  value: string;
  isChecked: boolean;
  onChange: (value: string) => void;
  onCheckedChange: (checked: boolean) => void;
}

export function IdCheckField({
  id = 'loginId',
  value,
  isChecked,
  onChange,
  onCheckedChange,
}: IdCheckFieldProps) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const trimmed = value.trim();
  const isFormatValid = LOGIN_ID_PATTERN.test(trimmed);
  const formatError =
    trimmed.length > 0 && !isFormatValid ? FORMAT_ERROR : undefined;
  const displayError = error ?? formatError;

  function handleChange(next: string): void {
    onChange(next);
    if (isChecked || error || success) {
      onCheckedChange(false);
      setError(undefined);
      setSuccess(undefined);
    }
  }

  async function handleCheck(): Promise<void> {
    if (!isFormatValid) {
      onCheckedChange(false);
      setSuccess(undefined);
      setError(FORMAT_ERROR);
      return;
    }

    setChecking(true);
    setError(undefined);
    setSuccess(undefined);

    try {
      const result = await checkLoginId(trimmed);
      if (result.available) {
        onCheckedChange(true);
        setSuccess('✓ 사용 가능한 아이디입니다');
        setError(undefined);
      } else {
        onCheckedChange(false);
        setError('이미 사용 중인 아이디입니다');
        setSuccess(undefined);
      }
    } catch {
      onCheckedChange(false);
      setError('중복확인에 실패했습니다. 다시 시도하세요');
      setSuccess(undefined);
    } finally {
      setChecking(false);
    }
  }

  const describedBy = displayError
    ? `${id}-error`
    : success
      ? `${id}-success`
      : undefined;

  return (
    <FormField
      id={id}
      label="아이디"
      required
      hint={FORMAT_HINT}
      error={displayError}
      success={isChecked ? success : undefined}
    >
      <div className={fieldStyles.idRow}>
        <input
          id={id}
          name="loginId"
          type="text"
          autoComplete="username"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className={`${fieldStyles.control} ${displayError ? fieldStyles.controlInvalid : ''}`}
          aria-invalid={Boolean(displayError)}
          aria-describedby={describedBy}
          maxLength={50}
        />
        <button
          type="button"
          className={fieldStyles.checkBtn}
          onClick={() => {
            void handleCheck();
          }}
          disabled={checking || !isFormatValid}
        >
          {checking ? '확인 중' : '중복확인'}
        </button>
      </div>
    </FormField>
  );
}
