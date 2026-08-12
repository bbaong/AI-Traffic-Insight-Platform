import styles from './InsStepIndicator.module.css';

const STEPS = [
  { id: 1 as const, label: '고객·AI 분석', shortLabel: '분석' },
  { id: 2 as const, label: '체크리스트·특약', shortLabel: '특약' },
];

type Props = {
  current: 1 | 2;
  step1Done: boolean;
  onGoTo: (step: 1 | 2) => void;
};

export function InsStepIndicator({ current, step1Done, onGoTo }: Props) {
  return (
    <nav className={styles.bar} aria-label="상담 단계">
      {STEPS.map((s) => {
        const done = s.id === 1 && step1Done && current !== 1;
        const isCurrent = current === s.id;
        return (
          <button
            key={s.id}
            type="button"
            className={`${styles.step} ${isCurrent ? styles.current : ''} ${done ? styles.done : ''}`}
            onClick={() => onGoTo(s.id)}
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
            <span className={styles.labelFull}>{s.label}</span>
            <span className={styles.labelShort} aria-hidden="true">
              {s.shortLabel}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
