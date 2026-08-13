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
  /** GOV 대시보드: 시도·구군 선택을 지도 카드 상단에 표시 */
  showRegionFilters?: boolean;
}

const ACCENT = '#21ADC4';
/** 중대율 CRITICAL 빨강과 구분 — 보라 계열 */
const HOTSPOT_STROKE = '#4A148C';
const HOTSPOT_FILL = '#8E24AA';
/** 이 레벨 이하(확대)에서만 전체 다발 원 표시. 숫자가 작을수록 확대 */
const HOTSPOT_MAX_LEVEL = 7;
/**
 * 구 선택 setBounds 후 줌 클램프.
 * - 너무 확대(level 작음)되면 당김 → 남구·수성 등이 답답하지 않게
 * - 너무 축소(level 큼)되면 당김 → 달성·군위 과도 줌아웃 방지
 */
const DISTRICT_MIN_IN_LEVEL = 8;
const DISTRICT_MAX_OUT_LEVEL = 9;
const DISTRICT_CLAMP_OUT_LEVEL = 8;
const DISTRICT_BOUNDS_PADDING = 56;

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

/** 대략적인 링 면적(상대 비교용) — 달성군처럼 분리된 path 중 본토 선택 */
function ringAreaScore(ring: { lat: number; lng: number }[]) {
  if (ring.length < 3) return 0;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of ring) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return Math.max(0, maxLat - minLat) * Math.max(0, maxLng - minLng);
}

function largestRing(paths: { lat: number; lng: number }[][]) {
  let best = paths[0] ?? [];
  let bestScore = -1;
  for (const ring of paths) {
    const score = ringAreaScore(ring);
    if (score > bestScore) {
      bestScore = score;
      best = ring;
    }
  }
  return best;
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

function MapExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MapCollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 8h5V3M16 3v5h5M3 16h5v5M21 16h-5v5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** GOV·INS 공용 카카오맵 · 구·군 Choropleth + 공식 다발 원 */
export function MapCard({
  title,
  riskByCode = DISTRICT_RISK_MOCK,
  legend = DEFAULT_LEGEND,
  hotspots = [],
  onDistrictSelect,
  mapExpanded = false,
  onToggleMapExpand,
  showRegionFilters = false,
}: MapCardProps) {
  const { status, retry } = useKakaoLoader();
  const selectedCode = useDistrictStore((s) => s.selectedCode);
  const setSelectedCode = useDistrictStore((s) => s.setSelectedCode);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{
    relayout?: () => void;
    setBounds: (...args: unknown[]) => void;
    setCenter: (latlng: unknown) => void;
    getCenter: () => unknown;
    setLevel: (level: number) => void;
    getLevel: () => number;
  } | null>(null);
  const layersRef = useRef<DistrictLayer[]>([]);
  const outlineRef = useRef<KakaoPolygon[]>([]);
  const circlesRef = useRef<KakaoCircle[]>([]);
  /** 클릭한 폴리곤 링 — 달성군처럼 분리된 구는 클릭한 쪽만 맞춤 */
  const focusRingRef = useRef<{ lat: number; lng: number }[] | null>(null);
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
    const levelOk = map.getLevel() <= HOTSPOT_MAX_LEVEL;
  
    const selectedPoints = () => {
      if (!selected) return [] as typeof all;
      const name = DAEGU_DISTRICTS.find((d) => d.code === selected)?.name;
      return name
        ? all.filter((p) => p.region === name || p.name?.includes(name))
        : [];
    };
  
    // 확대: 전체 다발
    if (levelOk) {
      drawHotspots(map, all);
      return;
    }
  
    // 구 선택(확대 전): 선택 구 다발만
    if (selected) {
      drawHotspots(map, selectedPoints());
      return;
    }
  
    clearCircles();
  };

  /**
   * 구 선택 시 확대: 수성·동구처럼 구 경계에 맞춤.
   * 달성·군위는 분리/광역 경계 때문에 전체가 잡히면 과도하게 줌아웃되므로
   * 클릭한 링(또는 가장 큰 링)만 맞춰 제스처를 통일한다.
   */
  const focusDistrict = (
    map: {
      setBounds: (...args: unknown[]) => void;
      setLevel: (level: number) => void;
      getLevel: () => number;
    },
    district: DistrictBoundary,
  ) => {
    if (!window.kakao?.maps) return;

    const preferred = focusRingRef.current;
    const preferredOk =
      preferred != null &&
      preferred.length >= 3 &&
      district.paths.some((r) => r === preferred);
    const focusRing = preferredOk
      ? preferred
      : district.paths.length > 1
        ? largestRing(district.paths)
        : null;

    const bounds = new window.kakao.maps.LatLngBounds();
    if (focusRing) {
      for (const p of focusRing) {
        bounds.extend(new window.kakao.maps.LatLng(p.lat, p.lng));
      }
    } else {
      for (const ring of district.paths) {
        for (const p of ring) {
          bounds.extend(new window.kakao.maps.LatLng(p.lat, p.lng));
        }
      }
    }

    map.setBounds(
      bounds,
      DISTRICT_BOUNDS_PADDING,
      DISTRICT_BOUNDS_PADDING,
      DISTRICT_BOUNDS_PADDING,
      DISTRICT_BOUNDS_PADDING,
    );

    window.setTimeout(() => {
      const level = map.getLevel();
      if (level < DISTRICT_MIN_IN_LEVEL) {
        map.setLevel(DISTRICT_MIN_IN_LEVEL);
      } else if (level > DISTRICT_MAX_OUT_LEVEL) {
        map.setLevel(DISTRICT_CLAMP_OUT_LEVEL);
      }
      syncHotspotsVisibility(map);
    }, 40);
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

  const refreshMapTiles = (map: {
    relayout?: () => void;
    getCenter?: () => unknown;
    setCenter?: (latlng: unknown) => void;
  }) => {
    map.relayout?.();
    // 컨테이너 크기 복구 후 타일 재요청 (정비율 아닐 때 빈 지도 방지)
    const c = map.getCenter?.();
    if (c && map.setCenter) map.setCenter(c);
  };

  useEffect(() => {
    if (status !== 'loaded') return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let sizeObserver: ResizeObserver | null = null;

    const waitForContainerSize = () =>
      new Promise<void>((resolve) => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          resolve();
          return;
        }
        sizeObserver = new ResizeObserver(() => {
          if (container.clientWidth > 0 && container.clientHeight > 0) {
            sizeObserver?.disconnect();
            sizeObserver = null;
            resolve();
          }
        });
        sizeObserver.observe(container);
        window.setTimeout(() => {
          sizeObserver?.disconnect();
          sizeObserver = null;
          resolve();
        }, 2500);
      });

    window.kakao.maps.load(() => {
      void waitForContainerSize().then(() => {
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
              focusRingRef.current = ring;
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
            zIndex: 0,
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
          if (cancelled || mapRef.current !== map) return;
          refreshMapTiles(map);
          const selected = selectedRef.current;
          const selectedDistrict = selected
            ? DAEGU_DISTRICTS.find((d) => d.code === selected)
            : null;
          if (selectedDistrict) {
            focusDistrict(map, selectedDistrict);
          } else if (!bounds.isEmpty?.()) {
            map.setBounds(bounds, 40, 40, 40, 40);
            syncHotspotsVisibility(map);
          } else {
            map.setCenter(center);
            syncHotspotsVisibility(map);
          }
        }, 100);
      });
    });

    return () => {
      cancelled = true;
      sizeObserver?.disconnect();
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

  /* 반응형·레이아웃 변화 시 타일 깨짐 방지 */
  useEffect(() => {
    if (status !== 'loaded') return;
    const el = containerRef.current;
    if (!el) return;

    let timer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const map = mapRef.current;
        if (!map) return;
        if (el.clientWidth <= 0 || el.clientHeight <= 0) return;
        refreshMapTiles(map);
      }, 120);
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, [status]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'loaded') return;

    const refresh = () => {
      refreshMapTiles(map);
      if (!selectedRef.current || !window.kakao?.maps) return;
      const district = DAEGU_DISTRICTS.find(
        (d) => d.code === selectedRef.current,
      );
      if (!district) return;
      focusDistrict(map, district);
    };

    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(refresh);
    });
    const t = window.setTimeout(refresh, 160);

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

    focusDistrict(map, district);
  }, [selectedCode]);

  return (
    <DashboardCard
      title={title}
      className={styles.card}
      action={
        showRegionFilters ? (
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
        ) : undefined
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
            title={mapExpanded ? '지도 축소' : '지도 확장'}
          >
            {mapExpanded ? <MapCollapseIcon /> : <MapExpandIcon />}
            지도 레이어
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
    </DashboardCard>
  );
}