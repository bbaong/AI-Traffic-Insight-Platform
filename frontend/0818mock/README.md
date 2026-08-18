# 0818 mock (2026-08-18)

DB 장애 동안 PPT·화면 확인용으로 쓰던 목업입니다.

**JSON·플러그인은 2026-08-18에 삭제했습니다.** 프론트는 다시 `localhost:5000` 실백엔드를 호출합니다.

## 실행 (실 DB)

```bash
npm run dev
```

`.env`의 `VITE_API_BASE_URL=http://localhost:5000`  
카카오 지도: `VITE_KAKAO_MAP_APP_KEY`

백엔드 `npm run dev` + MySQL이 떠 있어야 합니다. 스키마가 안 바뀌었으면 `npx prisma db pull`은 생략하고 `npx prisma generate`만 하면 됩니다.

## 당시 계정 (삭제됨, DB에 없음)

| 역할 | 아이디 | 비밀번호 |
|---|---|---|
| 지자체 | `gov` | `gov123` |
| 보험사 | `ins` | `ins123` |

지금은 **회원가입한 실 DB 계정**으로 로그인하세요. 테이블만 복구하고 행이 없으면 로그인도 대시보드도 비어 있습니다.

## 당시 구 id (참고)

1 중구 · 2 동구 · 3 서구 · 4 남구 · 5 북구 · 6 수성구 · 7 달서구 · 8 달성군 · 9 군위군

지역비교 지도 색은 프론트 `src/domains/gov/utils/regionCompareUi.ts`의 `DISTRICT_COLOR_BY_CODE`입니다.

## 남겨 둔 프론트 수정

`src/domains/ins/api/customers.ts`의 `apiUrl(..., { userId })`는 목업 버그 수정이라 실서버에도 그대로 둡니다.
