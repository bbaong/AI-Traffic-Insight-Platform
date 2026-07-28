import type { KeyboardEvent } from 'react';
import type { RoleMeta, UserRole } from '../../types/signup';
import { ArrowRightIcon, RoleIcon } from './RoleIcons';
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

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(role);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.card} ${accentClass}`}
      onClick={() => onSelect(role)}
      onKeyDown={handleKeyDown}
      aria-label={`${meta.label}로 가입`}
    >
      <span className={styles.arrow} aria-hidden="true">
        <ArrowRightIcon size={18} />
      </span>

      <span className={`${styles.badge} ${badgeClass}`}>
        <RoleIcon name={meta.icon} size={24} />
      </span>

      <p className={styles.label}>{meta.label}</p>
      <p className={styles.description}>{meta.description}</p>

      <ul className={styles.tags}>
        {meta.tags.map((tag) => (
          <li key={tag} className={`${styles.tag} ${tagClass}`}>
            {tag}
          </li>
        ))}
      </ul>
    </div>
  );
}
