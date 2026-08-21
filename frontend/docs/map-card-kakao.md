# MapCard — 카카오맵 (대구 중심)

## 1. 개요

대시보드 `MapCard`에 카카오맵을 붙였다.  
GOV·INS가 **같은 MapCard**를 쓰며, 첫 화면은 대구 중심(`DAEGU_CENTER` + `DAEGU_ZOOM_LEVEL`)이다.  
GeoJSON 경계·위험도 색칠은 다음 단계.

---

## 2. 파일 구조

| 파일 | 역할 |
|---|---|
| `hooks/useKakaoLoader.ts` | SDK 스크립트 1회 삽입, loading/loaded/error |
| `components/dashboard/MapCard.tsx` | 로드 후 지도 생성 · 대구 중심 |
| `constants/map.ts` | 중심 좌표·줌 (하드코딩 금지) |
| `types/kakao.d.ts` | `window.kakao` 타입 |
| `.env.example` | `VITE_KAKAO_MAP_APP_KEY` 키 이름만 |

---

## 3. SDK 로드 방식

| 항목 | 내용 |
|---|---|
| URL | `.../sdk.js?appkey=...&autoload=false` |
| 초기화 | `kakao.maps.load(callback)` — SDK 준비 후 지도 생성 |
| 중복 방지 | `script#kakao-map-sdk` + 모듈 스코프 `loadPromise` |

`autoload=false`를 쓰는 이유: 스크립트만 받고 **우리가 정한 시점**에 맵을 만든다. 컨테이너가 준비되기 전에 자동 초기화되면 높이 0·에러가 난다.

---

## 4. 핵심 판단

| 판단 | 이유 |
|---|---|
| **MapCard 하나** | GOV/INS 좌표·줌은 Role과 무관. 복붙하면 한쪽만 고쳐 어긋난다. |
| **좌표·줌 → `constants/map.ts`** | 나중에 GeoJSON bounds 자동 줌으로 바꿀 때 상수만 교체하면 된다. |
| **loading / loaded / error** | 키 누락·네트워크 실패 시 화면이 깨지지 않고 안내·재시도가 가능하다. |

---

## 5. 다음 작업

- GeoJSON 대구 시 경계
- 구·군 경계
- 위험도 Choropleth 색칠
