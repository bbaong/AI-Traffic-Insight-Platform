/// <reference types="vite/client" />

// Vite 환경변수 타입 정의
interface ImportMetaEnv {
  readonly VITE_KAKAO_MAP_APP_KEY: string
}

// import.meta.env 타입 연결
interface ImportMeta {
  readonly env: ImportMetaEnv
}

// window 객체에 카카오맵 SDK 추가
declare global {
  interface Window {
    kakao: typeof kakao
  }
}

// 카카오맵에서 사용하는 객체 타입 정의
declare namespace kakao.maps {
  // 좌표 객체
  class LatLng {
    constructor(lat: number, lng: number)
  }

  // 지도 객체
  class Map {
    constructor(
      container: HTMLElement,
      options: {
        center: LatLng
        level: number
      },
    )
  }

  // 이벤트 등록
  namespace event {
    function addListener(
      target: object,
      type: string,
      handler: (...args: unknown[]) => void,
    ): void
  }

  // SDK 로드 완료 후 실행
  function load(callback: () => void): void
}

export {}