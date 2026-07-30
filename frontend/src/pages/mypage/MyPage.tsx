/*
* 지자체/보험사
* 이름, 아이디, 직급, 이메일
* 지자체: 부서명 / 보험사: 회사명
* 가입일, 최근 로그인
* */

import { useAuthStore } from '../../stores/authStore';
import styles from './MyPage.module.css';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function roleLabel(role: string): string {
  if (role === 'ROLE_A') return '지자체';
  if (role === 'ROLE_B') return '보험사';
  return role;
}

export function MyPage() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  const isGov = user.role === 'ROLE_A';

  const rows: { label: string; value: string }[] = [
    { label: '이름', value: user.name },
    { label: '아이디', value: user.loginId || '—' },
    { label: '역할', value: roleLabel(user.role) },
    { label: '직급·직책', value: user.position?.trim() || '—' },
    { label: '이메일', value: user.email?.trim() || '—' },
    isGov
      ? {
          label: '소속 부서',
          value:
            user.departmentName?.trim() ||
            (user.departmentId != null ? `부서 ID ${user.departmentId}` : '—'),
        }
      : {
          label: '회사명',
          value: user.orgName?.trim() || '—',
        },
    { label: '가입일', value: formatDate(user.createdAt) },
    { label: '최근 로그인', value: formatDate(user.lastLoginAt) },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="mypage-heading">
        <h2 id="mypage-heading" className={styles.cardTitle}>
          계정 정보
        </h2>
        <p className={styles.hint}>조회만 가능합니다. 수정은 추후 제공됩니다.</p>

        <dl className={styles.list}>
          {rows.map((row) => (
            <div key={row.label} className={styles.row}>
              <dt className={styles.label}>{row.label}</dt>
              <dd className={styles.value}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export default MyPage;
