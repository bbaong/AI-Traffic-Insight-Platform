import { useEffect, useRef } from 'react';
import {
  DAEGU_DISTRICTS,
  DAEGU_OUTLINE_PATHS,
  type DistrictBoundary,
} from '../../constants/daeguBoundaries';
import { DAEGU_CENTER, DAEGU_ZOOM_LEVEL } from '../../constants/map';
import { useKakaoLoader } from '../../hooks/useKakaoLoader';
import { useDistrictStore } from '../../stores/districtStore';
import type { RiskLevel } from '../../types/dashboard';
import { DashboardCard } from './DashboardCard';
import styles from './MapCard.module.css';

/** Choropleth 위험등급 색 (선보다 영역이 중심) */
export const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: '#2E7D32',
  MODERATE: '#D89B00',
  HIGH: '#D97706',
  CRITICAL: '#C62828',
};

/** 임시 구·군 위험도 — 이후 API 연동 시 교체 */
export const DISTRICT_RISK_MOCK: Record<string, RiskLevel> = {
  jung: 'LOW',
  dong: 'MODERATE',
  seo: 'LOW',
  nam: 'MODERATE',
  buk: 'HIGH',
  suseong: 'CRITICAL',
  dalseo: 'HIGH',
  dalseong: 'MODERATE',
  gunwi: 'LOW',
};

const LEGEND = [
  { label: '⚠ Critical', color: RISK_COLORS.CRITICAL },
  { label: '▲ High', color: RISK_COLORS.HIGH },
  { label: '△ Moderate', color: RISK_COLORS.MODERATE },
  { label: '● Low', color: RISK_COLORS.LOW },
] as const;

const ACCENT = '#0E7C86';

const BASE_STROKE = {
  strokeWeight: 1,
  strokeColor: '#FFFFFF',
  strokeOpacity: 0.85,
  fillOpacity: 0.58,
} as const;

const HOVER_STROKE = {
  strokeWeight: 2,
  strokeColor: ACCENT,
  strokeOpacity: 1,
  fillOpacity: 0.68,
} as const;

const SELECTED_STROKE = {
  strokeWeight: 3,
  strokeColor: ACCENT,
  strokeOpacity: 1,
  fillOpacity: 0.72,
} as const;

export interface MapCardProps {
  title: string;
  riskByCode?: Record<string, RiskLevel>;
  onDistrictSelect?: (district: DistrictBoundary) => void;
}

interface KakaoPolygon {
  setMap: (map: unknown | null) => void;
  setOptions: (opts: Record<string, unknown>) => void;
}

interface DistrictLayer {
  district: DistrictBoundary;
  risk: RiskLevel;
  polygons: KakaoPolygon[];
}

function ringCentroid(ring: { lat: number; lng: number }[]) {
  const n = ring.length || 1;
  const sum = ring.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / n, lng: sum.lng / n };
}

function styleFor(
  code: string,
  risk: RiskLevel,
  hovered: string | null,
  selected: string | null,
) {
  const fillColor = RISK_COLORS[risk];
  if (selected === code) {
    return { ...SELECTED_STROKE, fillColor };
  }
  if (hovered === code) {
    return { ...HOVER_STROKE, fillColor };
  }
  return { ...BASE_STROKE, fillColor };
}

/** GOV·INS 공용 카카오맵 · 구·군 Choropleth */
export function MapCard({
  title,
  riskByCode = DISTRICT_RISK_MOCK,
  onDistrictSelect,
}: MapCardProps) {
  const { status, retry } = useKakaoLoader();
  const selectedCode = useDistrictStore((s) => s.selectedCode);
  const setSelectedCode = useDistrictStore((s) => s.setSelectedCode);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{
    relayout?: () => void;
    setBounds: (...args: unknown[]) => void;
    setCenter: (latlng: unknown) => void;
    setLevel: (level: number) => void;
  } | null>(null);
  const layersRef = useRef<DistrictLayer[]>([]);
  const outlineRef = useRef<KakaoPolygon[]>([]);
  const overlayRef = useRef<{ setMap: (map: unknown | null) => void } | null>(
    null,
  );
  const hoveredRef = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const riskRef = useRef(riskByCode);
  const selectCbRef = useRef(onDistrictSelect);
  riskRef.current = riskByCode;
  selectCbRef.current = onDistrictSelect;
  selectedRef.current = selectedCode;

  const applyStyles = (hovered: string | null, selected: string | null) => {
    for (const layer of layersRef.current) {
      const opts = styleFor(
        layer.district.code,
        layer.risk,
        hovered,
        selected,
      );
      for (const poly of layer.polygons) poly.setOptions(opts);
    }
  };

  const showLabel = (
    map: unknown,
    district: DistrictBoundary,
    ring: { lat: number; lng: number }[],
  ) => {
    const c = ringCentroid(district.paths[0] ?? ring);
    if (overlayRef.current) overlayRef.current.setMap(null);
    const overlay = new window.kakao.maps.CustomOverlay({
      content: `<div style="padding:4px 8px;background:#fff;border:1px solid ${ACCENT};border-radius:4px;font-size:12px;font-weight:600;color:#1a1a1a;white-space:nowrap;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.12)">${district.name}</div>`,
      position: new window.kakao.maps.LatLng(c.lat, c.lng),
      yAnchor: 1.4,
      zIndex: 10,
    });
    overlay.setMap(map);
    overlayRef.current = overlay;
  };

  const hideLabel = () => {
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }
  };

  useEffect(() => {
    if (status !== 'loaded') return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    window.kakao.maps.load(() => {
      if (cancelled || !containerRef.current) return;

      for (const layer of layersRef.current) {
        for (const poly of layer.polygons) poly.setMap(null);
      }
      for (const poly of outlineRef.current) poly.setMap(null);
      hideLabel();
      layersRef.current = [];
      outlineRef.current = [];
      container.innerHTML = '';
      mapRef.current = null;

      const center = new window.kakao.maps.LatLng(
        DAEGU_CENTER.lat,
        DAEGU_CENTER.lng,
      );
      const map = new window.kakao.maps.Map(container, {
        center,
        level: DAEGU_ZOOM_LEVEL,
      });
      mapRef.current = map;

      const bounds = new window.kakao.maps.LatLngBounds();
      const layers: DistrictLayer[] = [];

      for (const district of DAEGU_DISTRICTS) {
        const risk = riskRef.current[district.code] ?? 'LOW';
        const polygons: KakaoPolygon[] = [];
        const base = styleFor(district.code, risk, null, selectedRef.current);

        for (const ring of district.paths) {
          if (ring.length < 3) continue;
          const path = ring.map(
            (p) => new window.kakao.maps.LatLng(p.lat, p.lng),
          );
          for (const ll of path) bounds.extend(ll);

          const polygon = new window.kakao.maps.Polygon({
            path,
            strokeStyle: 'solid',
            ...base,
          });
          polygon.setMap(map);
          polygons.push(polygon);

          window.kakao.maps.event.addListener(polygon, 'mouseover', () => {
            hoveredRef.current = district.code;
            applyStyles(district.code, selectedRef.current);
            showLabel(map, district, ring);
          });

          window.kakao.maps.event.addListener(polygon, 'mouseout', () => {
            hoveredRef.current = null;
            applyStyles(null, selectedRef.current);
            hideLabel();
          });

          window.kakao.maps.event.addListener(polygon, 'click', () => {
            selectedRef.current = district.code;
            setSelectedCode(district.code);
            applyStyles(hoveredRef.current, district.code);
            console.log('[MapCard] district select', {
              code: district.code,
              districtCode: district.districtCode,
              name: district.name,
              risk,
            });
            selectCbRef.current?.(district);
          });
        }

        if (polygons.length > 0) {
          layers.push({ district, risk, polygons });
        }
      }

      layersRef.current = layers;

      const outlines: KakaoPolygon[] = [];
      for (const ring of DAEGU_OUTLINE_PATHS) {
        if (ring.length < 3) continue;
        const path = ring.map(
          (p) => new window.kakao.maps.LatLng(p.lat, p.lng),
        );
        const outline = new window.kakao.maps.Polygon({
          path,
          strokeWeight: 2,
          strokeColor: ACCENT,
          strokeOpacity: 0.9,
          strokeStyle: 'solid',
          fillColor: ACCENT,
          fillOpacity: 0,
          zIndex: 2,
        });
        outline.setMap(map);
        outlines.push(outline);
      }
      outlineRef.current = outlines;

      window.setTimeout(() => {
        map.relayout?.();
        if (!bounds.isEmpty?.()) {
          map.setBounds(bounds, 40, 40, 40, 40);
        } else {
          map.setCenter(center);
        }
      }, 0);
    });

    return () => {
      cancelled = true;
      for (const layer of layersRef.current) {
        for (const poly of layer.polygons) poly.setMap(null);
      }
      for (const poly of outlineRef.current) poly.setMap(null);
      layersRef.current = [];
      outlineRef.current = [];
      hideLabel();
      mapRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [status, setSelectedCode]);

  useEffect(() => {
    for (const layer of layersRef.current) {
      layer.risk = riskByCode[layer.district.code] ?? 'LOW';
    }
    applyStyles(hoveredRef.current, selectedRef.current);
  }, [riskByCode]);

  useEffect(() => {
    selectedRef.current = selectedCode;
    applyStyles(hoveredRef.current, selectedCode);
  }, [selectedCode]);

  return (
    <DashboardCard
      title={title}
      action={
        <div className={styles.regionFilters}>
          <select
            className={styles.regionSelect}
            value="daegu"
            aria-label="시도 선택"
            disabled
          >
            <option value="daegu">대구광역시</option>
          </select>
          <select
            className={styles.regionSelect}
            value={selectedCode ?? ''}
            aria-label="구군 선택"
            onChange={(e) => setSelectedCode(e.target.value || null)}
          >
            <option value="">구·군 선택</option>
            {DAEGU_DISTRICTS.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className={styles.mapWrap}>
        {status === 'loading' ? (
          <div className={styles.stateBox} aria-busy="true">
            지도를 불러오는 중…
          </div>
        ) : null}

        {status === 'error' ? (
          <div className={styles.stateBox} role="alert">
            <p className={styles.stateText}>지도를 불러오지 못했습니다</p>
            <p className={styles.stateHint}>
              API 키(.env) 또는 네트워크를 확인한 뒤 다시 시도하세요.
            </p>
            <button type="button" className={styles.retryBtn} onClick={retry}>
              다시 시도
            </button>
          </div>
        ) : null}

        <div
          ref={containerRef}
          className={styles.mapContainer}
          style={{ display: status === 'loaded' ? 'block' : 'none' }}
          aria-label="카카오맵 · 대구 구·군 위험도"
        />

        {selectedCode ? (
          <p className={styles.selectionHint} aria-live="polite">
            선택:{' '}
            {DAEGU_DISTRICTS.find((d) => d.code === selectedCode)?.name ??
              selectedCode}
          </p>
        ) : null}
      </div>

      <ul className={styles.legend} aria-label="위험도 범례">
        {LEGEND.map((item) => (
          <li key={item.label} className={styles.legendItem}>
            <span
              className={styles.swatch}
              style={{ background: item.color }}
              aria-hidden="true"
            />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}