import { useEffect, useRef, useState } from 'react';
import { COMPARE_MAX_CHIPS, districtColor, onDistrictColor, type CompareChip } from '../utils/regionCompareUi';
import styles from './CompareSelectBar.module.css';

function AddCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden
    >
      <path d="M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160Zm40 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
    </svg>
  );
}

export function CompareSelectBar({
  chips,
  options,
  comparing,
  canReset,
  onRemove,
  onAdd,
  onCompare,
  onReset,
}: {
  chips: CompareChip[];
  options: CompareChip[];
  comparing: boolean;
  canReset: boolean;
  onRemove: (districtId: number) => void;
  onAdd: (chip: CompareChip) => void;
  onCompare: () => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const remaining = options.filter(
    (opt) => !chips.some((c) => c.districtId === opt.districtId),
  );
  const atMax = chips.length >= COMPARE_MAX_CHIPS;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={styles.bar}>
      <div className={styles.copy}>
        <p className={styles.label}>비교 지역 선택</p>
        <p className={styles.hint}>지도를 클릭하거나 + 로 비교 지역을 선택하세요</p>
      </div>

      <div className={styles.actions}>
        <div className={styles.chips} aria-label="선택된 비교 지역">
          {chips.map((chip) => {
            const color = districtColor(chip.name);
            return (
            <span
              key={chip.districtId}
              className={styles.chip}
              style={{ background: color, color: onDistrictColor(color) }}
            >
              {chip.name}
              <button
                type="button"
                className={styles.chipX}
                aria-label={`${chip.name} 제거`}
                onClick={() => onRemove(chip.districtId)}
              >
                ×
              </button>
            </span>
            );
          })}

          <div className={styles.addWrap} ref={wrapRef}>
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => {
                if (atMax) return;
                setOpen((v) => !v);
              }}
              disabled={atMax || remaining.length === 0}
              aria-expanded={open}
              aria-haspopup="listbox"
              aria-label="비교 지역 추가"
            >
              <AddCircleIcon />
            </button>
            {open && !atMax ? (
              <ul className={styles.menu} role="listbox" aria-label="추가할 구·군">
                {remaining.length === 0 ? (
                  <li className={styles.menuEmpty}>추가할 구가 없습니다</li>
                ) : (
                  remaining.map((opt) => (
                    <li key={opt.districtId}>
                      <button
                        type="button"
                        className={styles.menuItem}
                        onClick={() => {
                          onAdd(opt);
                          setOpen(false);
                        }}
                      >
                        <i
                          className={styles.swatch}
                          style={{ background: districtColor(opt.name) }}
                        />
                        {opt.name}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
          <span className={styles.max}>최대 {COMPARE_MAX_CHIPS}개</span>
        </div>

        <div className={styles.btns}>
          <button
            type="button"
            className={styles.compareBtn}
            onClick={onCompare}
            disabled={comparing || chips.length === 0}
          >
            {comparing ? '비교 중…' : '비교하기'}
          </button>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={onReset}
            disabled={!canReset || comparing}
            aria-label="필터 초기화"
          >
            초기화
          </button>
        </div>
      </div>
    </div>
  );
}
