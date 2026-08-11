import styles from './InsStepIndicator.module.css';

const STEPS = [
  { id: 1 as const, label: '고객·AI 분석' },
  { id: 2 as const, label: '체크리스트·특약' },
];

type Props = {
  current: 1 | 2;
  onGoTo: (step: 1 | 2) => void;
};

export function InsStepIndicator({ current, onGoTo }: Props) {
  return (
    <nav className={styles.bar} aria-label="상담 단계">
      {STEPS.map((s) => {
        const done = current > s.id;
        const isCurrent = current === s.id;
        const canClick = done || isCurrent;
        return (
          <button
            key={s.id}
            type="button"
            className={`${styles.step} ${isCurrent ? styles.current : ''} ${done ? styles.done : ''}`}
            onClick={() => canClick && onGoTo(s.id)}
            disabled={!canClick}
            aria-current={isCurrent ? 'step' : undefined}
          >
            {done ? (
              <span className={styles.check} aria-hidden="true">
                ✓
              </span>
            ) : (
              <span className={styles.num} aria-hidden="true">
                {s.id}
              </span>
            )}
            <span>{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
