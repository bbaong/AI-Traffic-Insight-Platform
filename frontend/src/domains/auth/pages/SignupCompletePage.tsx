import { Link } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';

/** 가입 완료 placeholder — 정식 성공 화면은 이후 구현 */
export function SignupCompletePage() {
  return (
    <main
      style={{
        padding: 48,
        fontFamily: 'var(--font-sans)',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>
        가입 요청이 접수되었습니다
      </h1>
      <p style={{ color: 'var(--color-body)', fontSize: 14, lineHeight: 1.6 }}>
        Step 2 (준비 중) — 실제 가입 API 연동 후 이 화면을 교체합니다.
      </p>
      <p style={{ marginTop: 24 }}>
        <Link to={ROUTES.LOGIN} style={{ color: 'var(--color-teal)', fontSize: 14 }}>
          로그인으로 이동
        </Link>
        {' · '}
        <Link to={ROUTES.LANDING} style={{ color: 'var(--color-teal)', fontSize: 14 }}>
          랜딩으로
        </Link>
      </p>
    </main>
  );
}

export default SignupCompletePage;
