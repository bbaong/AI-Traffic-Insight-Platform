import type { MouseEvent } from 'react';
import type { RoleMeta, UserRole } from '../../types/signup';
import { RoleIcon } from './RoleIcons';
import styles from './RoleGateCard.module.css';

export interface RoleGateCardProps {
  role: UserRole;
  meta: RoleMeta;
  onSelect: (role: UserRole) => void;
}

export function RoleGateCard({ role, meta, onSelect }: RoleGateCardProps) {
  const isTeal = meta.accent === 'teal';
  const accentClass = isTeal ? styles.cardTeal : styles.cardAmber;
  const badgeClass = isTeal ? styles.badgeTeal : styles.badgeAmber;
  const tagClass = isTeal ? styles.tagTeal : styles.tagAmber;
  const btnClass = isTeal ? styles.btnTeal : styles.btnAmber;

  function handleButtonClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    onSelect(role);
  }

  return (
    <div
      className={`${styles.card} ${accentClass}`}
      onClick={() => onSelect(role)}
    >
      <span className={`${styles.badge} ${badgeClass}`} aria-hidden="true">
        <RoleIcon name={meta.icon} size={27} />
      </span>

      <p className={styles.label}>{meta.label}</p>
      <p className={styles.description}>
        {meta.description.split('\n').map((line, index, lines) => (
          <span key={line}>
            {line}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>

      <ul className={styles.tags}>
        {meta.tags.map((tag) => (
          <li key={tag} className={`${styles.tag} ${tagClass}`}>
            {tag}
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`${styles.cta} ${btnClass}`}
        onClick={handleButtonClick}
      >
        {meta.label}로 가입하기
      </button>
    </div>
  );
}
