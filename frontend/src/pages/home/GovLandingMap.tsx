import {
  DISTRICT_RISK_MOCK,
  RISK_COLORS,
} from '../../shared/components/dashboard/MapCard';
import {
  DAEGU_DISTRICTS,
  type LatLngPoint,
} from '../../shared/constants/daeguBoundaries';
import type { RiskLevel } from '../../shared/types/dashboard';
import styles from './GovDetailSection.module.css';

const VIEW_W = 640;
const VIEW_H = 400;
const PAD = 16;
const HOTSPOT_STROKE = '#4A148C';
const HOTSPOT_FILL = '#8E24AA';
const SELECTED = 'suseong';

const LEGEND = [
  { label: '≥35% 매우높음', color: RISK_COLORS.CRITICAL },
  { label: '≥28% 높음', color: RISK_COLORS.HIGH },
  { label: '≥22% 보통', color: RISK_COLORS.MODERATE },
  { label: '<22% 낮음', color: RISK_COLORS.LOW },
] as const;

const HOTSPOTS: { lat: number; lng: number; r: number }[] = [
  { lat: 35.8584, lng: 128.6302, r: 7.5 },
  { lat: 35.8418, lng: 128.6814, r: 6 },
  { lat: 35.8246, lng: 128.6528, r: 5.5 },
];

function projectFactory(districts: typeof DAEGU_DISTRICTS) {
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  for (const district of districts) {
    for (const ring of district.paths) {
      for (const p of ring) {
        if (p.lat < minLat) minLat = p.lat;
        if (p.lat > maxLat) maxLat = p.lat;
        if (p.lng < minLng) minLng = p.lng;
        if (p.lng > maxLng) maxLng = p.lng;
      }
    }
  }

  const spanLng = Math.max(maxLng - minLng, 0.001);
  const spanLat = Math.max(maxLat - minLat, 0.001);
  const scale = Math.min(
    (VIEW_W - PAD * 2) / spanLng,
    (VIEW_H - PAD * 2) / spanLat,
  );
  const usedW = spanLng * scale;
  const usedH = spanLat * scale;
  const ox = (VIEW_W - usedW) / 2;
  const oy = (VIEW_H - usedH) / 2;

  return (p: LatLngPoint) => ({
    x: ox + (p.lng - minLng) * scale,
    y: oy + (maxLat - p.lat) * scale,
  });
}

function ringToPath(
  ring: LatLngPoint[],
  project: (p: LatLngPoint) => { x: number; y: number },
): string {
  return `${ring
    .map((p, i) => {
      const { x, y } = project(p);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ')} Z`;
}

export function GovLandingMap({ selectedLabel }: { selectedLabel: string }) {
  const districts = DAEGU_DISTRICTS.filter((d) => d.code !== 'gunwi');
  const project = projectFactory(districts);
  const ordered = [...districts].sort((a, b) => {
    if (a.code === SELECTED) return 1;
    if (b.code === SELECTED) return -1;
    return 0;
  });

  return (
    <div className={styles.mapStage} aria-hidden="true">
      <svg
        className={styles.choropleth}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {ordered.map((district) => {
          const risk: RiskLevel = DISTRICT_RISK_MOCK[district.code] ?? 'MODERATE';
          const selected = district.code === SELECTED;
          return district.paths.map((ring, i) => (
            <path
              key={`${district.code}-${i}`}
              d={ringToPath(ring, project)}
              fill={RISK_COLORS[risk]}
              fillOpacity={selected ? 0.82 : 0.58}
              stroke={selected ? '#333333' : '#ffffff'}
              strokeOpacity={selected ? 1 : 0.85}
              strokeWidth={selected ? 4 : 1}
              strokeLinejoin="round"
            />
          ));
        })}
        {HOTSPOTS.map((spot) => {
          const { x, y } = project({ lat: spot.lat, lng: spot.lng });
          return (
            <circle
              key={`${spot.lat}-${spot.lng}`}
              cx={x}
              cy={y}
              r={spot.r}
              fill={HOTSPOT_FILL}
              fillOpacity={0.55}
              stroke={HOTSPOT_STROKE}
              strokeWidth={1.5}
            />
          );
        })}
      </svg>
      <p className={styles.mapHint}>선택: {selectedLabel}</p>
      <ul className={styles.mapLegend}>
        {LEGEND.map((item) => (
          <li key={item.label}>
            <i style={{ background: item.color }} />
            {item.label}
          </li>
        ))}
        <li>
          <i className={styles.hotspotSwatch} />
          사고 다발 지역
        </li>
      </ul>
    </div>
  );
}
