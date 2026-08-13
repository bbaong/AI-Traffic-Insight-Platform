import { DashboardCard } from '../../../shared/components/dashboard';
import type {
  AccidentTypeMix,
  RegionCompareDistrict,
  RegionCompareEntity,
} from '../api/govRegionCompare';
import surface from './compareSurface.module.css';
import styles from './CompareAccidentTypesCard.module.css';

const TYPES = [
  { key: '차대차' as const, color: '#21adc4', label: '차대차' },
  { key: '차대사람' as const, color: '#f77c34', label: '차대사람' },
  { key: '차량단독' as const, color: '#6FCF97', label: '차량단독' },
];

const AXIS = [0, 20, 40, 60, 80, 100];

function parts(mix: AccidentTypeMix) {
  return TYPES.map((t) => ({
    ...t,
    value: Number(mix[t.key]) || 0,
  }));
}

function Row({
  name,
  mix,
  highlight,
}: {
  name: string;
  mix: AccidentTypeMix;
  highlight?: boolean;
}) {
  const segs = parts(mix);
  return (
    <li className={highlight ? styles.rowCity : styles.row}>
      <span className={styles.rowName}>{name}</span>
      <div
        className={styles.stack}
        role="img"
        aria-label={`${name} 사고유형 구성 ${segs
          .map((s) => `${s.label} ${s.value.toFixed(1)}%`)
          .join(', ')}`}
      >
        {segs.map((s) => (
          <span
            key={s.key}
            className={styles.seg}
            style={{ width: `${s.value}%`, background: s.color }}
            title={`${s.label} ${s.value.toFixed(1)}%`}
          >
            {s.value >= 7 ? `${s.value.toFixed(1)}%` : null}
          </span>
        ))}
      </div>
    </li>
  );
}

export function CompareAccidentTypesCard({
  districts,
  cityAvg,
}: {
  districts: RegionCompareDistrict[];
  cityAvg: RegionCompareEntity;
}) {
  return (
    <DashboardCard
      title="사고유형 구성 비교"
      className={`${surface.card} ${styles.card}`}
      leading={
        <span
          className={styles.info}
          title="최근 사고유형 구성 비율입니다. 각 행의 합은 100%입니다."
        >
          i
        </span>
      }
      action={
        <ul className={styles.legend}>
          {TYPES.map((t) => (
            <li key={t.key}>
              <i style={{ background: t.color }} />
              {t.label}
            </li>
          ))}
        </ul>
      }
    >
      <ul className={styles.list}>
        {districts.map((d) => (
          <Row key={d.districtId} name={d.districtName} mix={d.accidentTypes} />
        ))}
        <Row name="대구 평균" mix={cityAvg.accidentTypes} highlight />
      </ul>
      <div className={styles.axis} aria-hidden>
        <span />
        <div className={styles.axisTrack}>
          {AXIS.map((n) => (
            <span key={n}>{n}%</span>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}
