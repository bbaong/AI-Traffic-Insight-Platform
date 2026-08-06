import { useEffect, useRef, useState } from 'react';
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
  HIGH: '#F77C34',
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

const DEFAULT_LEGEND = [
  { label: '≥35% 매우높음', color: RISK_COLORS.CRITICAL },
  { label: '≥28% 높음', color: RISK_COLORS.HIGH },
  { label: '≥22% 보통', color: RISK_COLORS.MODERATE },
  { label: '<22% 낮음', color: RISK_COLORS.LOW },
] as const;

export type MapLegendItem = { label: string; color: string };

/** 공식 사고다발 원 (카카오 Circle) */
export type MapHotspot = {
  lat: number;
  lon: number;
  count: number;
  name?: string;
  region?: string | null;
};

export interface MapCardProps {
  mapExpanded?: boolean;
  onToggleMapExpand?: () => void;
  title: string;
  riskByCode?: Record<string, RiskLevel>;
  legend?: readonly MapLegendItem[];
  /** 공식 사고다발 TOP3 등 — lat/lon 원 */
  hotspots?: MapHotspot[];
  hotspotYear?: number | null;
  onDistrictSelect?: (district: DistrictBoundary) => void;
}

const ACCENT = '#21ADC4';
/** 중대율 CRITICAL 빨강과 구분 — 보라 계열 */
const HOTSPOT_STROKE = '#4A148C';
const HOTSPOT_FILL = '#8E24AA';
/** 이 레벨 이하(확대)에서만 공식 다발 원 표시. 숫자가 작을수록 확대 */
const HOTSPOT_MAX_LEVEL = 7;

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
  strokeWeight: 4,
  strokeColor: '#333333',
  strokeOpacity: 1,
  fillOpacity: 0.8,
} as const;

interface KakaoPolygon {
  setMap: (map: unknown | null) => void;
  setOptions: (opts: Record<string, unknown>) => void;
}

interface KakaoCircle {
  setMap: (map: unknown | null) => void;
}

interface DistrictLayer {
  district: DistrictBoundary;
  risk: RiskLevel;
  polygons: KakaoPolygon[];
}

function hotspotRadiusMeters(count: number): number {
  // TOP3 건수(대개 수~수십) → 지도에서 보이는 원 크기
  return Math.max(70, Math.min(420, Math.round(count * 28 + 40)));
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
    return { ...SELECTED_STROKE, fillColor, zIndex: 5 };
  }
  if (hovered === code) {
    return { ...HOVER_STROKE, fillColor, zIndex: 4 };
  }
  return { ...BASE_STROKE, fillColor, zIndex: 1 };
}

/** GOV·INS 공용 카카오맵 · 구·군 Choropleth + 공식 다발 원 */
export function MapCard({
  title,
  riskByCode = DISTRICT_RISK_MOCK,
  legend = DEFAULT_LEGEND,
  hotspots = [],
  hotspotYear = null,
  onDistrictSelect,
  mapExpanded = false,
  onToggleMapExpand,
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
    getLevel: () => number;
  } | null>(null);
  const layersRef = useRef<DistrictLayer[]>([]);
  const outlineRef = useRef<KakaoPolygon[]>([]);
  const circlesRef = useRef<KakaoCircle[]>([]);
  const hotspotOverlayRef = useRef<{
    setMap: (map: unknown | null) => void;
  } | null>(null);
  const overlayRef = useRef<{ setMap: (map: unknown | null) => void } | null>(
    null,
  );
  const hoveredRef = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const riskRef = useRef(riskByCode);
  const hotspotsRef = useRef(hotspots);
  const selectCbRef = useRef(onDistrictSelect);
  riskRef.current = riskByCode;
  hotspotsRef.current = hotspots;
  selectCbRef.current = onDistrictSelect;
  selectedRef.current = selectedCode;

  const [onlySelectedHotspots, setOnlySelectedHotspots] = useState(false);
  const onlySelectedRef = useRef(onlySelectedHotspots);
  onlySelectedRef.current = onlySelectedHotspots;

  const clearHotspotOverlay = () => {
    if (hotspotOverlayRef.current) {
      hotspotOverlayRef.current.setMap(null);
      hotspotOverlayRef.current = null;
    }
  };

  const clearCircles = () => {
    for (const c of circlesRef.current) c.setMap(null);
    circlesRef.current = [];
    clearHotspotOverlay();
  };

  const drawHotspots = (map: unknown, points: MapHotspot[]) => {
    clearCircles();
    if (!map || !window.kakao?.maps) return;

    for (const p of points) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
      const center = new window.kakao.maps.LatLng(p.lat, p.lon);
      const circle = new window.kakao.maps.Circle({
        center,
        radius: hotspotRadiusMeters(p.count),
        strokeWeight: 2.5,
        strokeColor: HOTSPOT_STROKE,
        strokeOpacity: 1,
        strokeStyle: 'solid',
        fillColor: HOTSPOT_FILL,
        fillOpacity: 0.4,
        zIndex: 6,
      });
      circle.setMap(map);
      circlesRef.current.push(circle);

      const label = `${p.name ?? '사고다발지점'} · ${p.count}건`;
      window.kakao.maps.event.addListener(circle, 'mouseover', () => {
        clearHotspotOverlay();
        const overlay = new window.kakao.maps.CustomOverlay({
          content: `<div style="padding:5px 9px;background:#fff;border:1px solid ${HOTSPOT_STROKE};border-radius:4px;font-size:12px;font-weight:600;color:#1a1a1a;white-space:nowrap;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.14)">${label}</div>`,
          position: center,
          yAnchor: 1.5,
          zIndex: 12,
        });
        overlay.setMap(map);
        hotspotOverlayRef.current = overlay;
      });
      window.kakao.maps.event.addListener(circle, 'mouseout', () => {
        clearHotspotOverlay();
      });
    }
  };

  const syncHotspotsVisibility = (map: {
    getLevel: () => number;
  } | null) => {
    if (!map || !window.kakao?.maps) return;
  
    const all = hotspotsRef.current;
    const selected = selectedRef.current;
    const filterSelected = onlySelectedRef.current;
    const levelOk = map.getLevel() <= HOTSPOT_MAX_LEVEL;
  
    const selectedPoints = () => {
      if (!selected) return [] as typeof all;
      const name = DAEGU_DISTRICTS.find((d) => d.code === selected)?.name;
      return name
        ? all.filter((p) => p.region === name || p.name?.includes(name))
        : [];
    };
  
    // 체크: 선택 구만
    if (filterSelected) {
      if (!selected) {
        clearCircles();
        return;
      }
      drawHotspots(map, selectedPoints());
      return;
    }
  
    // 체크 해제 + 확대: 전체
    if (levelOk) {
      drawHotspots(map, all);
      return;
    }
  
    // 체크 해제 + 구 선택(확대 전): 선택 구 다발은 유지
    if (selected) {
      drawHotspots(map, selectedPoints());
      return;
    }
  
    clearCircles();
  };

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
      clearCircles();
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
          zIndex: 0, // 구군(선택 zIndex 5)보다 아래
        });
        outline.setMap(map);
        outlines.push(outline);
      }
      outlineRef.current = outlines;

      syncHotspotsVisibility(map);
      window.kakao.maps.event.addListener(map, 'zoom_changed', () => {
        syncHotspotsVisibility(map);
      });

      window.setTimeout(() => {
        map.relayout?.();
        if (!bounds.isEmpty?.()) {
          map.setBounds(bounds, 40, 40, 40, 40);
        } else {
          map.setCenter(center);
        }
        syncHotspotsVisibility(map);
      }, 0);
    });

    return () => {
      cancelled = true;
      for (const layer of layersRef.current) {
        for (const poly of layer.polygons) poly.setMap(null);
      }
      for (const poly of outlineRef.current) poly.setMap(null);
      clearCircles();
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
    hotspotsRef.current = hotspots;
    const map = mapRef.current;
    if (!map || status !== 'loaded') return;
    syncHotspotsVisibility(map);
  }, [hotspots, status]);

  useEffect(() => {
    onlySelectedRef.current = onlySelectedHotspots;
    const map = mapRef.current;
    if (!map || status !== 'loaded') return;
    syncHotspotsVisibility(map);
  }, [onlySelectedHotspots, status]);
  
  useEffect(() => {
    if (!selectedCode) setOnlySelectedHotspots(false);
  }, [selectedCode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'loaded') return;

    const refresh = () => {
      map.relayout?.();
      if (!selectedRef.current || !window.kakao?.maps) return;
      const district = DAEGU_DISTRICTS.find(
        (d) => d.code === selectedRef.current,
      );
      if (!district) return;
      const bounds = new window.kakao.maps.LatLngBounds();
      for (const ring of district.paths) {
        for (const p of ring) {
          bounds.extend(new window.kakao.maps.LatLng(p.lat, p.lng));
        }
      }
      map.setBounds(bounds, 40, 40, 40, 40);
      syncHotspotsVisibility(map);
    };

    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(refresh);
    });
    const t = window.setTimeout(refresh, 100);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [mapExpanded, status]);

  useEffect(() => {
    selectedRef.current = selectedCode;
    applyStyles(hoveredRef.current, selectedCode);

    const map = mapRef.current;
    if (!map || !selectedCode || !window.kakao?.maps) return;

    const district = DAEGU_DISTRICTS.find((d) => d.code === selectedCode);
    if (!district) return;

    const bounds = new window.kakao.maps.LatLngBounds();
    for (const ring of district.paths) {
      for (const p of ring) {
        bounds.extend(new window.kakao.maps.LatLng(p.lat, p.lng));
      }
    }
    map.setBounds(bounds, 40, 40, 40, 40);
    // setBounds 후 레벨 반영 타이밍을 위해 한 번 더 맞춤
    window.setTimeout(() => syncHotspotsVisibility(map), 0);
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
          aria-label="카카오맵 · 대구 구·군 위험도 및 사고다발"
        />

        {onToggleMapExpand ? (
          <button
            type="button"
            className={styles.expandBtn}
            onClick={onToggleMapExpand}
            aria-pressed={mapExpanded}
            aria-label={mapExpanded ? '지도 축소' : '지도 확장'}
            title={mapExpanded ? '축소' : '확장'}
          >
            {mapExpanded ? '⤓' : '⤢'}
          </button>
        ) : null}

        {selectedCode ? (
          <p className={styles.selectionHint} aria-live="polite">
            선택:{' '}
            {DAEGU_DISTRICTS.find((d) => d.code === selectedCode)?.name ??
              selectedCode}
          </p>
        ) : null}

        <ul className={styles.legend} aria-label="위험도 범례">
          {legend.map((item) => (
            <li key={item.label} className={styles.legendItem}>
              <span
                className={styles.swatch}
                style={{ background: item.color }}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </li>
          ))}
          <li className={styles.legendItem}>
            <span
              className={styles.swatchCircle}
              style={{ borderColor: HOTSPOT_STROKE, background: HOTSPOT_FILL }}
              aria-hidden="true"
            />
            <span>
              사고 다발 지역
            </span>
          </li>
        </ul>
      </div>
      <label className={styles.hotspotFilter}>
        <input
          type="checkbox"
          checked={onlySelectedHotspots}
          disabled={!selectedCode}
          onChange={(e) => setOnlySelectedHotspots(e.target.checked)}
        />
        선택한 구·군의 사고 다발 지역만 표시{hotspotYear != null ? ` (${hotspotYear})` : ''}
      </label>
    </DashboardCard>
  );
}