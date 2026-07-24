import { useEffect, useRef } from 'react'
import './App.css'

// .env에 저장된 Kakao Maps JavaScript Key
const KAKAO_MAP_APP_KEY = import.meta.env.VITE_KAKAO_MAP_APP_KEY

// 지도 초기 중심 좌표 (대구광역시)
const DAEGU_CENTER = { lat: 35.8714, lng: 128.6014 }

/**
 * Kakao Maps SDK를 동적으로 로드하는 함수
 * - 이미 로드되어 있으면 재사용
 * - 없으면 script 태그를 생성하여 로드
 */
function loadKakaoMapScript(appKey: string): Promise<void> {
  // 이미 SDK가 로드되어 있는 경우
  if (window.kakao?.maps) {
    return Promise.resolve()
  }

  // 기존 script 태그가 있는 경우
  const existing = document.getElementById('kakao-map-script')
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(new Error('카카오맵 스크립트 로드 실패')),
      )
    })
  }

  // 처음 실행 시 script 태그 생성
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')

    script.id = 'kakao-map-script'
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`
    script.async = true

    script.onload = () => resolve()
    script.onerror = () => reject(new Error('카카오맵 스크립트 로드 실패'))

    document.head.appendChild(script)
  })
}

function App() {
  // 지도가 생성될 div를 참조
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // API Key가 없으면 종료
    if (!KAKAO_MAP_APP_KEY) {
      console.error('VITE_KAKAO_MAP_APP_KEY가 설정되지 않았습니다.')
      return
    }

    // 컴포넌트가 언마운트되었는지 확인하는 플래그
    let cancelled = false

    // SDK 로드
    loadKakaoMapScript(KAKAO_MAP_APP_KEY)
      .then(() => {
        if (cancelled || !mapRef.current) return

        // SDK 초기화 후 지도 생성
        window.kakao.maps.load(() => {
          if (cancelled || !mapRef.current) return

          // 지도 중심 좌표 생성
          const center = new window.kakao.maps.LatLng(
            DAEGU_CENTER.lat,
            DAEGU_CENTER.lng,
          )

          // 지도 객체 생성
          new window.kakao.maps.Map(mapRef.current, {
            center,
            level: 5,
          })
        })
      })
      .catch((error) => {
        console.error(error)
      })

    // 컴포넌트 종료 시 실행
    return () => {
      cancelled = true
    }
  }, [])

  // 지도가 표시될 영역
  return <div ref={mapRef} className="map" />
}

export default App
