# 고객관리 페이지

## 1. 개요

보험사(ROLE_B) 전용 마스터-디테일 화면이다.

- 좌측 고객 목록 → 행 클릭 → 우측 기본정보·위험점수·상담 이력·특약
- 상담 클릭 → 특약·리포트가 해당 상담 기준으로 갱신
- 특약 카드의 **상담 참고 리포트** → 우측 드로어

데이터:

| 영역 | 출처 |
|------|------|
| 고객 목록 | 실제 `GET /api/customers` |
| 상담 이력·특약 | 실제 `GET /api/customers/:id/consultations` |
| 상담 참고 리포트 | 목업 (`mocks/report.mock.ts`) + TODO |

지자체(GOV)와 무관하다. accent는 보험사 주황 `#F77C34`.

## 2. 생성·수정 파일

| 경로 | 역할 |
|------|------|
| `src/domains/ins/types/customers.ts` | 목록·이력·특약·리포트 타입 |
| `src/domains/ins/constants/insEnums.ts` | enum code → 한글/색 매핑 |
| `src/domains/ins/api/customers.ts` | 실제 API 2개 + 리포트 목업 함수 |
| `src/domains/ins/mocks/report.mock.ts` | 6대 담보 리포트 목업 |
| `src/domains/ins/pages/CustomersPage.tsx` | 마스터-디테일 페이지 |
| `src/domains/ins/pages/CustomersPage.module.css` | 페이지 스타일 |
| `src/domains/ins/components/customers/ReportDrawer.tsx` | 리포트 드로어 |
| `src/domains/ins/components/customers/ReportDrawer.module.css` | 드로어 스타일 |
| `src/app/router/AppRouter.tsx` | `ROUTES.CUSTOMERS` + ROLE_B 가드 |
| `src/shared/layouts/AppLayout.tsx` | 헤더 제목 `고객관리` |
| `src/shared/constants/routes.ts` | 기존 `CUSTOMERS: '/common/customers'` 재사용 |
| `src/shared/constants/sidebarMenus.ts` | 기존 ROLE_B `고객관리` 메뉴 재사용 |

## 3. 실제 API 매핑

### GET `/api/customers` (`?q=` 이름·전화 부분검색)

프론트는 `json.data[]`만 사용.

| 응답 필드 | UI |
|-----------|-----|
| `name` | 목록 고객명 |
| `phone` | 목록 연락처 |
| `lastConsultedAt` | 목록 최근 상담일 (`MM-DD`) |
| `consultationCount` | 목록 상담 수 |
| `lastRegion` / `lastAgeGroup` / `lastGender` / `lastVehicleType` | 우측 기본정보 폴백(최신 상담 profile 우선) |
| `lastRiskScore` / `lastStatus` | **목록에 표시하지 않음** (우측 상세만) |

### GET `/api/customers/:customerId/consultations`

응답: `{ success, customerId, customer, data[] }`.

| 응답 필드 | UI |
|-----------|-----|
| `customer.name` / `phone` | 기본 정보 |
| `data[0].profile` | 기본 정보(최근 상담 기준) |
| `data[n].riskScore` / `riskGrade` | 위험점수(선택 상담, 기본 최신) |
| `data[]` | 상담 이력 목록 |
| `consultationType` / `consultedAt` / `status` | 이력 상단 줄 |
| `riskScore` / `counselorName` / `memo` | 이력 하단 줄 |
| `riders[]` | 특약 검토 결과 |
| `checklist[]` | 현재 화면 미사용(응답만 보관) |

## 4. 리포트 목업 + 교체 지점

- 함수: `fetchConsultationReport(consultationId, riskGrade?)` (`api/customers.ts`)
- 데이터: `mocks/report.mock.ts`
  - `MOCK_REPORT[consultationId]` 우선
  - 없으면 위험등급별 6대 담보 시연 목업
  - 등급도 없으면 `[]` → “저장된 리포트가 없습니다”

TODO — 상담 저장 시 리포트 저장 스펙 확정 후:

- **(a)** consultation 응답에 `report`가 포함되면 `consultation.report` 사용
- **(b)** 별도 API면 `GET /api/consultations/:id/report` 로 교체

PDF 내려받기 버튼은 비활성 + TODO.

## 5. enum 매핑 (화면에는 label만)

| code | label |
|------|--------|
| `NEW` / `RENEWAL` / `CLAIM` / `COVERAGE_ANALYSIS` / `OTHER` | 신규 / 갱신 / 사고/청구 / 담보분석 / 기타 |
| `REVIEW_RECOMMENDED` | 검토 권장 |
| `FURTHER_CHECK_REQUIRED` | 추가 확인 |
| `CURRENTLY_EXCLUDED` | 현재 제외 |
| `EXISTING_MEMBER_VERIFIED` | 기존 가입 |
| `COMPLETED` / `IN_PROGRESS` / null | 상담완료 / 진행중 / `-` |
| `MALE` / `FEMALE` | 남 / 여 |
| `Low` / `Moderate` / `High` / `Critical` | 색 `#2E8B4E` / `#CA8A04` / `#F77C34` / `#B3261E` |

백엔드 위험등급은 `Low` 형태, AI 예측은 `LOW`일 수 있어 `toRiskGrade`가 둘 다 받는다.

## 6. 클라이언트 처리 + TODO

| 기능 | 현재 | TODO |
|------|------|------|
| 검색 `q` | 300ms 디바운스 후 `GET ?q=` | — |
| 최근 상담일 기간 | `lastConsultedAt` 클라이언트 필터 | 서버 기간 파라미터 지원 확인 |
| 페이지네이션 | 8건 단위 클라이언트 | 서버 페이지 지원 확인 |
| 상담 유형 탭 | 클라이언트 필터 | — |

과구현(서버에 없는 정렬·다중필터)은 넣지 않았다.

## 7. 라우트

- `ROUTES.CUSTOMERS` = `/common/customers`
- AppRouter: `RoleRoute allow="ROLE_B"` 안쪽에 등록
- 사이드바 ROLE_B `고객관리` → 동일 경로 (기존 등록 유지)

## 8. 안 넣은 것

- 목록의 위험점수·상태 컬럼
- 법규위반 TOP3 (응답에 없음)
- 기본정보 편집 (조회만)
- GOV 메뉴/라우트
- 리포트 실API·PDF 다운로드
