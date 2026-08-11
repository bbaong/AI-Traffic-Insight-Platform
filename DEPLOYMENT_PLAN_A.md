# 배포 방안 A — Lightsail DB + 2GB 인스턴스

MySQL은 기존 **AWS Lightsail Managed DB**를 그대로 쓰고, 앱은 메모리를 아끼는 형태로 나눕니다.  
인스턴스 RAM은 **2GB 고정**(증설 없음)을 전제로 합니다.

---

## 아키텍처

```text
사용자 브라우저
    │
    ├─ HTTPS → Frontend (Cloudflare Pages / GitHub Pages 등)   ← RAM 안 씀
    │              │
    │              │ VITE_API_BASE_URL
    │              ▼
    └─ HTTPS → Lightsail 인스턴스 2GB
                  Nginx/Caddy (:443)
                    └─ /api/*  → Backend :5000
                         Backend → http://127.0.0.1:8000  (AI, 외부 비공개)
                         Backend → Lightsail MySQL
```

| 레이어 | 어디에 | 이유 |
|--------|--------|------|
| Frontend | 정적 호스팅 | Vite 빌드 결과물이라 서버 RAM 불필요 |
| Backend | Lightsail 2GB | Prisma·JWT·AI 중계, DB와 가까운 곳 |
| AI | 같은 Lightsail | `AI_SERVICE_URL=http://127.0.0.1:8000` |
| MySQL | 기존 Lightsail DB | Trusted sources에 인스턴스만 허용 |

**인스턴스에 올리지 않는 것:** MySQL 컨테이너, Docker Compose(권장 안 함), Playwright/Chromium(PDF), uvicorn workers 2+

---

## 다른 방안과의 짧은 비교

| 항목 | A. 앱도 Lightsail (이 문서) | B. DB만 Lightsail, 앱은 PaaS |
|------|-----------------------------|------------------------------|
| RAM 압박 | 큼 (PDF·Docker 사실상 불가) | 완화 |
| 구성 | 단순 | 프론트/백/AI/DB 분리로 복잡 |
| DB 연결 | 인스턴스 고정 IP → 허용 쉬움 | PaaS 출구 IP 변동 → 화이트리스트 어려움 |
| 비용 | 인스턴스 + 기존 DB | DB + PaaS 추가 요금 |
| 적합 | 데모·소수 사용자·비용 고정 | 자동배포·여유 RAM이 필요할 때 |

---

## Railway와의 비교 (방안 B 예시)

Railway는 **배포·운영 편의는 좋고**, DB를 Lightsail에 두는 전제에서는 **비용·네트워크가 A보다 까다로운** 선택입니다.

### 이 프로젝트에 맞추면

| 서비스 | Railway에서의 형태 |
|--------|-------------------|
| Frontend | 정적 사이트 서비스 또는 별도 Pages |
| Backend | Node 서비스, `DATABASE_URL` → Lightsail MySQL |
| AI | Docker/Python 서비스, 메모리 여유 있게 |
| Backend → AI | 같은 프로젝트 **Private Networking** (`*.railway.internal`) — 강점 |
| MySQL | Railway 밖 (Lightsail) — 약점 |

로컬과 비슷하게 **BE + AI를 한 프로젝트에 두기**엔 Railway가 편합니다. Git 연동, HTTPS, 재시작 부담이 적습니다.

### 장점

1. **2GB Lightsail RAM 압박에서 벗어남** — AI에 1~2GB+ 할당 가능, PDF(Playwright)도 A보다 현실적
2. **BE ↔ AI 내부망** — `AI_SERVICE_URL=http://ai.railway.internal:8000` 형태가 자연스러움
3. **배포 UX** — push → 빌드 → 환경변수 대시보드
4. **스케일·로그** — 데모 이후 확장에 A보다 유리

### 단점·리스크 (Lightsail DB 고정 시)

1. **DB IP 화이트리스트**  
   Railway 기본 출구 IP는 고정이 아님. Lightsail Trusted sources에 맞추려면 문서상 **Static Outbound IPs = Pro 플랜**이 필요. Hobby만으로는 DB를 넓게 열거나 IP 변경에 시달릴 수 있음.
2. **지연·리전**  
   Backend가 Lightsail DB와 가까운 리전이 아니면 RTT가 붙음. Prisma 쿼리가 많은 화면은 A보다 체감이 나쁠 수 있음.
3. **비용**  
   Backend + AI 상시 기동 + (필요 시) Pro 고정 IP는, 기존 Lightsail 2GB에 BE/AI만 올리는 A보다 월 비용이 나오기 쉬움. AI(sklearn)는 메모리 과금에 민감.
4. **콜드 스타트**  
   스케일다운 시 첫 예측이 길어질 수 있음. 데모용이면 **항상 켜 두기**를 전제로 보는 것이 좋음.

### A vs Railway 한눈에

| | **A (Lightsail 앱)** | **Railway 앱 + Lightsail DB** |
|--|----------------------|-------------------------------|
| 단순·저비용 데모 | 유리 | 보통~불리 |
| 배포 편의 | 보통 | 유리 |
| RAM / PDF | 빠듯 | 유리 |
| DB 보안(IP 제한) | 쉬움 | Pro 고정 IP 없으면 불편 |
| 추천 상황 | 지금 조건 그대로 | 운영 편함·RAM 여유를 살 때 |

### Railway를 쓸 때 현실적인 전제

- **Hobby만** 쓰면서 Lightsail DB에 `0.0.0.0/0`으로 열기 → **비추천**
- **Pro + Static Outbound IP**를 Lightsail Trusted sources에 넣고, Backend만 DB에 붙이기 → 현실적인 Railway 경로
- **DB도 Railway MySQL로 이전**하면 네트워크는 제일 깔끔하지만, “DB는 Lightsail” 전제와는 다름

### 절충안

Frontend만 Pages, **AI만 Railway**, Backend는 Lightsail에 두면 DB IP 문제는 사라지고 무거운 AI만 밖으로 뺌.  
대신 BE ↔ AI는 공인 HTTPS가 됨.

### 정리

- 팀 데모·비용·DB 방화벽을 단순하게 → **A가 더 맞음**
- 배포를 편히 하고 AI/PDF 메모리 여유가 필요하며 Pro·고정 IP·월 요금을 감수 → **Railway 방향이 좋음**
- Lightsail DB를 유지한 채 Hobby Railway만 쓰는 구성은 **가장 애매**함 (IP·보안·안정성)

---

## Lightsail 인스턴스에서 실행

1. OS (Ubuntu 22.04/24.04 권장)
2. Nginx 또는 Caddy — HTTPS, `/api` → Backend
3. Backend — `node dist/index.js` (또는 pm2)
4. AI — `uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1`
5. (권장) swap 1~2GB — OOM 방지

### 방화벽 (Lightsail Networking)

| 포트 | 허용 | 용도 |
|------|------|------|
| 22 | 본인 IP만 | SSH |
| 80 | 전체 | HTTPS 리다이렉트 |
| 443 | 전체 | API |
| 5000, 8000 | **닫기** | 루프백만 |

AI(`8000`)는 공인에 열지 않습니다. Managed DB Trusted sources에는 **이 인스턴스 Static IP만** 추가합니다 (`0.0.0.0/0` 비추천).

### 프로세스 기동 (개념)

```bash
# AI — 외부 바인딩 금지
cd /opt/app/ai
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1

# Backend
cd /opt/app/backend
node dist/index.js
```

순서는 **AI → Backend**. 재부팅 대비 `systemd` 또는 `pm2 startup` 권장.

Nginx 개념:

```nginx
server {
  server_name api.your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

---

## 환경 변수 — `.env`를 Git에 올리지 말 것

**실제 비밀이 든 `.env`는 GitHub / GitHub Pages / 공개 저장소에 커밋하지 않습니다.**

| 파일 | Git 커밋? | 어디에 설정 |
|------|-----------|-------------|
| `frontend/.env` | ❌ | Pages/CI **빌드 환경 변수**(Secrets) |
| `backend/.env` | ❌ | Lightsail 서버에만 (SSH로 생성) |
| `ai/.env` | ❌ | Lightsail 서버에만 |
| `.env.example` | ✅ (값 비우거나 가짜) | 팀 안내용 키 목록만 |

### Frontend (빌드 시)

```env
VITE_API_BASE_URL=https://api.your-domain.com
VITE_KAKAO_MAP_APP_KEY=...
```

- `VITE_*`는 **빌드 시점**에 JS에 박힙니다. API URL이 바뀌면 프론트를 **다시 빌드·재배포**해야 합니다.
- 저장소에 `.env`를 올리는 대신 GitHub Actions / Cloudflare Pages Secrets에 넣고 빌드합니다.
- 빌드 결과물에는 키가 들어가므로, 카카오 개발자 콘솔에서 **서비스 도메인 제한**을 겁니다.

### Backend (Lightsail만)

```env
DATABASE_URL=mysql://USER:PASSWORD@LIGHTSAIL_DB_HOST:3306/DB_NAME
JWT_SECRET=...
JWT_ACCESS_EXPIRATION=1800000
JWT_REFRESH_EXPIRATION=604800000
AI_SERVICE_URL=http://127.0.0.1:8000
PORT=5000
```

### AI (Lightsail만)

```env
KOROAD_AUTH_KEY=...
HOTSPOT_CACHE_TTL_HOURS=168
HOTSPOT_DEFAULT_YEAR=2025119
```

`DATABASE_URL`, `JWT_SECRET`, `KOROAD_AUTH_KEY` 등은 Pages·프론트 빌드에 넣지 않습니다.

### 모델 파일

`ai/models/*.pkl`(예: InsureGuard v1.0.3, GovGuard v1.0.4)은 보통 Git에 없습니다.  
**서버에 직접 업로드**해야 하며, 없으면 예측 API가 503을 반환할 수 있습니다.

---

## GitHub Pages는 public인가?

**기본적으로 public입니다.** URL만 알면 누구나 사이트를 볼 수 있습니다.

| 구분 | 내용 |
|------|------|
| 공개 저장소 | Pages 무료, 사이트도 공개 |
| 비공개 저장소 | Pages를 켜도 보통 **빌드된 사이트는 공개** (소스만 private) |
| 접근 제한 | Enterprise Cloud Private Pages 등이 아닌 한, “로그인 필수 Pages”는 일반 플랜에 없음 |

프론트에 넣은 화면·JS·`VITE_*` 값은 공개된다고 보면 됩니다.  
비밀은 Backend/AI(Lightsail)에만 둡니다.

팀 내부만 노출하려면 GitHub Pages보다 Cloudflare Access, 또는 Lightsail쪽 Basic Auth/VPN 등을 검토합니다.

---

## 2GB 메모리 운영 규칙

대략 예산: OS 0.3~0.5GB + Backend ~0.1GB + AI 0.8~1.2GB + 여유/swap.

1. swap 1~2GB
2. AI `workers=1`
3. **Playwright/PDF 비활성** (Chromium이 RAM을 급증시킴) — 예측·로그인·대시보드 중심
4. Docker Compose 지양 (오버헤드)
5. 프로덕션 venv는 서빙 패키지 위주
6. CORS는 프론트 도메인만 허용하도록 제한 권장

PDF가 데모에 필수면 같은 2GB A 구성에서는 비추천입니다.

---

## Frontend 배포

1. `npm run build` → `dist/`
2. Cloudflare Pages / GitHub Pages 등에 업로드
3. SPA 폴백: 모든 경로 → `index.html`
4. 도메인: 프론트 `app.`, API `api.` 분리 권장
5. Lightsail 인스턴스에 **Static IP** 연결 (DB 화이트리스트·DNS 안정)

---

## 배포 반복 흐름

```text
1. 코드 동기화 (git pull / rsync) — .env 제외
2. Backend: npm ci → npx prisma generate → npm run build → restart
3. AI: 필요 시 pip → pkl 동기화 → restart
4. Frontend: VITE_* 넣고 build → Pages 배포
5. 스모크: AI /health, 로그인, predict-ins, predict-gov
```

---

## 초기 체크리스트

1. Lightsail 인스턴스 2GB + Static IP, DB와 같은 리전
2. DB Trusted sources에 인스턴스 IP, `DATABASE_URL` 접속 테스트
3. Node 18+, Python 3.11+ 설치
4. 코드 + `models/*.pkl` 배치 (`.env`는 서버에서만 작성)
5. AI venv (Playwright 제외 권장) → uvicorn → `/health`
6. Backend build + env → 로그인·예측 프록시 확인
7. swap, systemd/pm2
8. Nginx/Caddy + HTTPS
9. Frontend 빌드·정적 배포, 카카오 도메인 등록
10. CORS를 프론트 도메인으로 제한
11. 22번은 본인 IP만, 5000/8000 공인 차단

---

## A의 한계

- 인스턴스 1대 SPOF
- 오토스케일 없음
- PDF·고동시 트래픽에 부적합
- 배포·HTTPS·보안 패치는 직접 관리

데모·내부용·소수 사용자에는 응답(로컬 E2E 기준 Ins ~100ms, Gov 전체 ~370ms 수준)과 비용·구성 단순함 면에서 적합합니다.
