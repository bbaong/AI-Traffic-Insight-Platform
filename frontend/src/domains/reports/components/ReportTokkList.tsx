import {
    TOKK_LEGEND_STATUSES,
    TOKK_STATUS_META,
  } from '../../ins/constants/tokkStatus';
  import type { TokkResult } from '../../ins/types/consulting';
  import styles from './ReportTokkList.module.css';
  
  type Props = { items: TokkResult[] };
  
  export function ReportTokkList({ items }: Props) {
    if (!items.length) {
      return (
        <p className={styles.empty}>
          특약 검토 결과가 없습니다. 대시보드에서 특약 검토 후 다시 생성해 주세요.
        </p>
      );
    }
  
    return (
      <>
        <div className={styles.legend} aria-label="특약 상태 범례">
          {TOKK_LEGEND_STATUSES.map((key) => {
            const m = TOKK_STATUS_META[key];
            return (
              <span
                key={key}
                className={styles.legendItem}
                style={{ color: m.color }}
              >
                <span
                  className={styles.legendDot}
                  style={{ background: m.color }}
                  aria-hidden
                />
                {m.label}
              </span>
            );
          })}
        </div>
        <ul className={styles.list}>
          {items.map((row) => {
            const st = TOKK_STATUS_META[row.status];
            return (
              <li key={row.id} className={styles.row} title={row.desc}>
                <span className={styles.icon} aria-hidden>
                  {row.icon}
                </span>
                <div className={styles.main}>
                  <div className={styles.top}>
                    <span className={styles.name}>{row.name}</span>
                    <span
                      className={styles.tag}
                      style={{
                        color: st.color,
                        background: st.bg,
                        borderColor: st.color,
                      }}
                    >
                      {st.label}
                    </span>
                  </div>
                  <p className={styles.desc}>{row.desc}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </>
    );
  }