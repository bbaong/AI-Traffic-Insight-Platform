/**
 * 카카오맵 SDK 전역 타입.
 * 공식 타입이 빈약해 window.kakao 는 any 허용 (이 단계).
 * 우리 코드의 상수·props·훅 반환값은 any 금지.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window {
    kakao: any;
  }

  // MapCard 등에서 kakao.maps.Map 참조용
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace kakao.maps {
    class LatLng {
      constructor(lat: number, lng: number);
    }

    class Map {
      constructor(
        container: HTMLElement,
        options: { center: LatLng; level: number },
      );
      relayout?: () => void;
      setCenter: (latlng: LatLng) => void;
    }

    function load(callback: () => void): void;
  }
}

export {};
