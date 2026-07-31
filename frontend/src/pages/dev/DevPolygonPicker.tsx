import { useEffect, useRef, useState } from 'react';
import { useKakaoLoader } from '../../shared/hooks/useKakaoLoader';
import { DAEGU_CENTER, DAEGU_ZOOM_LEVEL } from '../../shared/constants/map';

interface LatLng {
  lat: number;
  lng: number;
}

export function DevPolygonPicker() {
  const { status } = useKakaoLoader();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const [points, setPoints] = useState<LatLng[]>([]);

  useEffect(() => {
    if (status !== 'loaded' || !containerRef.current) return;

    window.kakao.maps.load(() => {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';

      const map = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(DAEGU_CENTER.lat, DAEGU_CENTER.lng),
        level: DAEGU_ZOOM_LEVEL,
      });
      mapRef.current = map;

      window.kakao.maps.event.addListener(map, 'click', (e: any) => {
        const latlng = e.latLng;
        setPoints((prev) => [
          ...prev,
          { lat: latlng.getLat(), lng: latlng.getLng() },
        ]);
      });
    });

    return () => {
      mapRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [status]);

  // Update polyline when points change
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (points.length < 2) return;

    const path = points.map(
      (p) => new window.kakao.maps.LatLng(p.lat, p.lng),
    );
    const polyline = new window.kakao.maps.Polyline({
      path,
      strokeWeight: 3,
      strokeColor: '#e63946',
      strokeOpacity: 0.9,
    });
    polyline.setMap(mapRef.current);
    polylineRef.current = polyline;
  }, [points]);

  const output = JSON.stringify(
    points.map((p) => ({ lat: +p.lat.toFixed(5), lng: +p.lng.toFixed(5) })),
    null,
    2,
  );

  const handleUndo = () => setPoints((prev) => prev.slice(0, -1));
  const handleReset = () => setPoints([]);
  const handleCopy = () => {
    navigator.clipboard.writeText(output);
  };

  if (status === 'loading') return <p>SDK 로딩 중…</p>;
  if (status === 'error') return <p>SDK 로드 실패</p>;

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
      <div
        style={{
          width: 340,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          borderLeft: '1px solid #ddd',
          overflow: 'hidden',
        }}
      >
        <h3 style={{ margin: 0 }}>Polygon Picker ({points.length} pts)</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleUndo} disabled={points.length === 0}>
            마지막 취소
          </button>
          <button onClick={handleReset} disabled={points.length === 0}>
            전체 초기화
          </button>
          <button onClick={handleCopy} disabled={points.length === 0}>
            좌표 복사
          </button>
        </div>
        <textarea
          readOnly
          value={output}
          style={{ flex: 1, fontFamily: 'monospace', fontSize: 11 }}
        />
      </div>
    </div>
  );
}
