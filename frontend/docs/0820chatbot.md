# 보험 상담 챗봇 UI 연동 보고

- **문서명:** `0820chatbot`
- **기준일:** 2026-08-20
- **범위:** 보험사 고객관리 화면의 조회 전용 챗봇 (프론트 중심, 백엔드 프롬프트 일부)

백엔드 API 인수인계는 [`../../backend/docs/ins-chatbot-frontend-handoff.md`](../../backend/docs/ins-chatbot-frontend-handoff.md)를 본다.

---

## 1. 작업 개요

보험 고객관리(`/common/customers`)에 **우하단 FAB + 팝오버 채팅**을 붙였다. 브라우저에 Gemini 키를 두지 않고, 로그인 Access 토큰으로 `POST /api/insurance/chat`만 호출한다.

이번 작업에서 맞춘 점:

- 고객관리 목록·상세 그리드를 깨지 않고 챗봇만  overlay
- 빈 화면 칩, 목록 카드, 브리핑 칩, 핵심 스크립트 칩
- 모델 답변 마크다운 렌더 (`**굵게**`, `### 제목` 등 기호 숨김)
- 상담 외 잡담 거절 (프론트 키워드 + 서버 시스템 프롬프트)
- FAB 잘림, 새로고침 로그아웃, 답변 렌더 크래시 보완

숨김·상담 저장·PDF는 챗봇에서 하지 않는다. 푸터에 `조회 전용 · 저장/삭제 없음`을 유지한다.

---

## 2. 생성한 파일

| 경로 | 역할 |
|------|------|
| `src/domains/ins/api/insChat.ts` | `sendInsChat`, `InsChatError`, history/toolCalls 타입 |
| `src/domains/ins/components/InsChatPanel.tsx` | FAB, 패널, 칩, 말풍선, 목록 카드, 거절·에러 처리 |
| `src/domains/ins/components/InsChatPanel.module.css` | 챗봇 레이아웃·칩·카드·입력창 |
| `src/app/bootstrapAuth.ts` | 앱 기동 시 refresh 1회 (HMR 새로고침 방지용으로 `App.tsx`에서 분리) |
| `docs/0820chatbot.md` | 본 보고 |

의존성: `react-markdown` (`package.json`)

---

## 3. 수정한 파일

| 경로 | 변경 |
|------|------|
| `src/domains/ins/pages/CustomersPage.tsx` | `<InsChatPanel>` 장착, 선택 고객 이름 전달 |
| `src/domains/ins/pages/CustomersPage.module.css` | 특약 목록만 스크롤 → 리포트 바·FAB 잘림 완화 |
| `src/main.tsx` | `bootstrapAuth` 후 단일 `createRoot` (이중 루트·이중 refresh 제거) |
| `src/app/App.tsx` | 컴포넌트만 export. 부트스트랩 분리 |
| `src/shared/api/http.ts` | `refreshOnce` export, 챗봇은 `logoutOn401: false` 가능 |
| `src/domains/ins/api/insChat.ts` | 챗 401로 전체 로그아웃하지 않음 |
| `backend/src/services/insChat.service.ts` | 상담 외 질문은 고정 거절 문장만 답하도록 시스템 프롬프트 추가 |

---

## 4. 화면 동작

### 4.1 진입

- **위치:** 고객관리만. 대시보드에는 없음.
- **FAB:** 주황 원형, Material 말풍선 / 닫기(X) 아이콘. `document.body` 포털 + 리포트 바 위쪽 오프셋.
- **패널:** 헤더 `상담 어시스턴트` + `조회전용` 배지.

### 4.2 빈 화면 칩

| 칩 | 전송 문장 |
|----|-----------|
| 최근 상담 5명 | 그대로 전송 |
| 고위험 고객 | 그대로 전송 |
| 진행 중 고위험 | 그대로 전송 |
| 핵심 스크립트 | `{선택고객} 고객의 핵심 스크립트 작성해줘` |

스크립트 칩은 왼쪽 목록에서 고객을 고른 뒤에만 활성화된다.

### 4.3 목록·브리핑

- `list_customers` / `find_high_risk_customers` 도구가 있으면 제목 + `이름 · MM-DD` + 점수(색 + ↗) 카드.
- 행 클릭: 왼쪽 상세만 선택. **자동 전송 없음.**
- 이어서 `「이름」 브리핑 받기 →` 칩이 뜨고, 눌러야 `「이름」 브리핑` 전송.

### 4.4 입력·답변

- 알약형 입력 + 위쪽 화살표 전송. Enter 전송, Shift+Enter 줄바꿈.
- 사용자 말풍선: 주황.
- 모델 답변: `react-markdown` (제목·굵게·목록·인용·구분선). 링크·HTML은 허용하지 않음.
- 전화번호는 화면에서 `010-****-1234` 형태로 한 번 더 마스킹.
- 특약 시뮬 도구(`analyze_risk`, `evaluate_discount_riders`)가 있으면 참고용 각주.

---

## 5. API

```
POST /api/insurance/chat
Authorization: Bearer <accessToken>
```

```json
{
  "message": "최근 상담 5명",
  "history": [
    { "role": "user", "text": "..." },
    { "role": "model", "text": "..." }
  ]
}
```

- history 최대 16턴.
- 응답: `{ success, data: { reply, toolCalls? } }`.
- UI는 `reply`를 보여주고, `toolCalls[].name`으로 목록 카드/시뮬 각주만 나눈다.

Gemini 키·모델명은 서버 `.env`만 사용한다.

---

## 6. 상담 외 질문 제한

프론트만으로 완전 차단은 안 된다. 키워드를 피하면 API로 나간다.

| 층 | 내용 |
|----|------|
| 프론트 `isOffTopic` | `밥 뭐먹지` 등 잡담 정규식이면 API 없이 `죄송합니다. 상담 외 목적은 도움을 드릴 수 없습니다.` |
| 예외 | 목록에 있는 고객 이름, 또는 상담/특약/스크립트 등 주제 키워드가 있으면 통과 |
| 서버 시스템 프롬프트 | 동일 거절 문장. 실제 모델 제한은 여기 |

---

## 7. 안정화 (잘림 · 로그인 튕김 · 크래시)

| 증상 | 원인 | 조치 |
|------|------|------|
| FAB·리포트 바가 카드에 잘림 | 고객관리 `overflow: hidden`, FAB가 리포트 바와 같은 모서리 | body 포털, FAB를 바 위로, 특약 리스트만 스크롤 |
| F5 후 로그인 | refresh 토큰 회전을 두 번 호출 + StrictMode | `refreshOnce` 공유, `createRoot` 1회, `bootstrapAuth`를 `App.tsx` 밖으로 |
| 답변 직후 화면 다운 | `LIST_TOOLS`/`SIM_TOOLS` 누락, 예상 밖 위험등급 `.color` | 상수 복구, 등급 가드, 패널·마크다운 Error Boundary |
| 챗 401에 페이지 로그아웃 | `apiFetch`가 refresh 실패 시 `clearUser` | 챗 요청만 `logoutOn401: false` |

---

## 8. 확인 방법

1. 보험사 계정 로그인 → 고객관리.
2. FAB 원이 잘리지 않는지, 열면 닫기 아이콘이 가운데인지.
3. 칩 3종 → 목록 카드 → 행 클릭(왼쪽 상세) → 브리핑 칩 수동 전송.
4. 고객 선택 후 `「이름」 핵심 스크립트`.
5. 브리핑 답변에서 `**` / `###` 없이 굵게·제목으로 보이는지.
6. `밥 뭐먹지` → 거절 문장. 새로고침 후에도 로그인 유지(백엔드 기동 필요).

백엔드가 꺼져 있거나 `GEMINI_API_KEY`가 없으면 채팅은 실패한다. refresh 실패 시에도 로그인으로 돌아갈 수 있다.

---

## 9. 제한 · 남은 일

- 거절 키워드는 우회 가능. 정책 강화는 서버 프롬프트·가드가 맞다.
- 목록 카드는 답변 문자열에 **목록에 있는 이름**이 있을 때만 행을 만든다. 이름 불일치면 일반 마크다운 카드만 보인다.
- 채팅 이력은 메모리만. 새로고침하면 대화가 사라진다.
- GOV·대시보드에는 챗봇을 넣지 않았다.
