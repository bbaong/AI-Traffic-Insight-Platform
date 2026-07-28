import { useState } from 'react';
import { checkLoginId } from '../../api/signup';
import { FormField } from './FormField';
import fieldStyles from './FormField.module.css';

const LOGIN_ID_PATTERN = /^[A-Za-z0-9]{4,50}$/;

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

  function handleChange(next: string): void {
    onChange(next);
    if (isChecked || error || success) {
      onCheckedChange(false);
      setError(undefined);
      setSuccess(undefined);
    }
  }

  async function handleCheck(): Promise<void> {
    if (!LOGIN_ID_PATTERN.test(value)) {
      onCheckedChange(false);
      setSuccess(undefined);
      setError('영문·숫자 4~50자로 입력하세요');
      return;
    }

    setChecking(true);
    setError(undefined);
    setSuccess(undefined);

    try {
      const result = await checkLoginId(value);
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

  const describedBy = error
    ? `${id}-error`
    : success
      ? `${id}-success`
      : undefined;

  return (
    <FormField
      id={id}
      label="아이디"
      required
      hint="· 영문·숫자 4~50자"
      error={error}
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
          className={`${fieldStyles.control} ${error ? fieldStyles.controlInvalid : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          maxLength={50}
        />
        <button
          type="button"
          className={fieldStyles.checkBtn}
          onClick={() => {
            void handleCheck();
          }}
          disabled={checking || value.trim() === ''}
        >
          {checking ? '확인 중' : '중복확인'}
        </button>
      </div>
    </FormField>
  );
}
