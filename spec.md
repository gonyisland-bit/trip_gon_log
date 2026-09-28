# TRIP_GON_LOG 제품 사양서 (Specification Document)

## 1. 프로젝트 개요 (Overview)

### 1.1 앱의 목적 및 핵심 가치
`trip_gon_log`는 여행 전 영감 탐색부터 여정 계획, 여행 중 실시간 일정/지도 확인, 여행 후 감각적인 기록과 매거진 아카이빙까지 여행의 전 주기를 하나로 연결하는 **스위스 미니멀 감성의 올인원 여행 아카이브 및 스마트 플래너 플랫폼**입니다.

- **미니멀 & 직관성 (Swiss Minimal Design)**: 화려한 장식과 과도한 그래픽을 배제하고, 국제 타이포그래피 스타일(Swiss International Style) 기반의 단정한 레이아웃, 절제된 모노크롬과 핵심 포인트 컬러(레드)를 통해 정보 자체의 가독성과 몰입도를 극대화합니다.
- **클라우드 우선 영속성 (Cloud-First Architecture)**: 다중 디바이스 환경에서 데이터 유실 없이 실시간으로 동기화되도록 Firebase Firestore와 Cloudflare R2 오브젝트 스토리지를 기본 영속 저장소로 활용합니다.
- **스마트 여정 큐레이션 (Intelligent Curation Engine)**: 전 세계 국가 및 주요 도시의 데이터셋을 바탕으로 일정, 테마, 방문 선호도에 맞춤화된 여행 일정을 스마트하게 제안하고, 지도 위에서 동적으로 시각화합니다.
- **포켓 스크랩 & 레이더 연동 (Pocket Scrap & Radar)**: SNS(인스타그램, 유튜브 등)나 웹에서 발견한 핫플레이스를 스마트하게 스크랩(OCR, 링크 파싱)하여 보관하고, 여행지 현장 지도에서 반경 내 스팟을 레이더 형태로 추천받습니다.

### 1.2 타깃 사용자
1. **디테일한 감각의 개인 여행자**: 여행 일정을 시간대별, 동선별로 체계적으로 계획하고, 감각적인 사진과 메모로 아카이빙하길 원하는 사용자.
2. **동행자와 함께 여행을 준비하는 팀/패밀리**: 일정, 비용, 항공/숙소 예약 정보를 실시간으로 공유하고 공동으로 관리하길 원하는 그룹.
3. **인사이트 중심의 장소 수집가**: SNS나 미디어에서 본 장소를 카테고리/도시별로 체계적으로 스크랩해 두고, 여정 생성 시 한 번의 클릭으로 타임라인에 삽입하고자 하는 사용자.

---

## 2. 기술 스택 및 아키텍처 (Tech Stack & Architecture)

### 2.1 프론트엔드 및 프레임워크
| 구분 | 기술 스택 | 버전/특징 |
| :--- | :--- | :--- |
| **Core Framework** | React | 19.x (최신 동시성 모드 및 최적화된 훅 활용) |
| **Language** | TypeScript | 6.0 (`npx tsc --noEmit` 무결점 유지) |
| **Build Tool** | Vite | 8.x (고속 HMR 및 최적화된 프로덕션 빌드 번들러) |
| **Styling** | Tailwind CSS | 3.4.x (Utility-First 기반의 스위스 미니멀 디자인 규격화) |
| **Icons** | Lucide React | 정갈한 라인 기반의 통일된 규격 아이콘 세트 (비규격 이모지 배제) |
| **Mapping Engine** | Leaflet 1.9.4 + Google Maps Places | `index.html`에서 CDN 스크립트로 로드 (npm 의존성 아님). 장소 자동완성·지오코딩은 Google Places |
| **State Management** | React Hooks + Context API | 단방향 데이터 흐름 및 로컬/세션 캐싱 조합 |

### 2.2 백엔드 및 클라우드 인프라 (BaaS & External APIs)
| 구분 | 서비스 / 라이브러리 | 용도 및 아키텍처 |
| :--- | :--- | :--- |
| **Database** | Firebase Firestore | NoSQL 클라우드 데이터베이스 (여정, 타임라인, 포켓 스팟, 유저 프로필 등 실시간 동기화) |
| **Authentication** | Firebase Authentication | 이메일/비밀번호 기반 인증, 권한 관리 (Admin, User, Super Admin) |
| **Object Storage** | Cloudflare R2 | 커버 이미지, 갤러리 원본, 영수증, 스크랩 이미지. 업로드/삭제는 서버 함수 `/api/r2`를 경유 (2.3 참조) |
| **OCR** | OCR.space REST API (`src/utils/ocrHelper.ts`) | 스크랩 이미지 내 텍스트 인식, 장소명 후보 추출. 키는 `VITE_OCR_SPACE_KEY` (미설정 시 호출 제한이 있는 공용 데모 키) |
| **Hosting & CI/CD** | Vercel | GitHub main 브랜치 푸시 시 자동 빌드·배포. `api/` 폴더는 Vercel Serverless Function으로 배포 |

### 2.3 R2 스토리지 보안 구조
- R2 자격 증명은 **서버 전용 환경변수**(`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`)로만 관리하며 클라이언트 번들에 포함하지 않습니다. `VITE_` 접두사 사용 금지.
- 업로드: 클라이언트가 Firebase ID 토큰과 함께 `POST /api/r2 {action:'upload'}` 요청 → 서버가 토큰 검증 후 5분 유효 서명 PUT URL 발급 → 클라이언트가 R2에 직접 업로드.
- 삭제: `POST /api/r2 {action:'delete'}` → 서버가 토큰 검증 후 삭제.
- 익명 로그인 토큰은 거부하며, 파일 크기 상한은 500MB입니다.
- 로컬 개발(`npm run dev`)에서는 `vite.config.ts`의 개발 미들웨어가 같은 핸들러(`api/_r2core.ts`)를 제공하며 `.env.local`의 `R2_*` 값을 사용합니다.
- 공개 조회 URL은 `VITE_R2_PUBLIC_URL`(r2.dev)입니다.

### 2.4 Firestore 보안 규칙 (`firestore.rules`)
- 규칙 원본은 저장소의 `firestore.rules`이며, Firebase 콘솔(Firestore → 규칙)에 게시합니다.
- **관리자**: `gonyisland@naver.com`, `users/public/settings/admin`의 `superAdminEmail`·`allowedAdmins`, 또는 루트 프로필의 `role == 'admin'`.
- **가입 승인제**: 신규 가입자는 `status: 'pending'`으로 생성되며, 관리자가 승인(`approved`)해야 여정·설정·휴지통·일정에 쓸 수 있습니다. 승인 대기 회원은 읽기만 가능하고 상단에 안내 배너가 표시됩니다. 승인 흐름 도입 전에 만들어진 상태값 없는 프로필은 승인된 것으로 간주합니다.
- **회원 프로필**(`users/{uid}`, `users/public/users/{uid}`): 본인과 관리자만 읽습니다. 본인은 `role`·`permissions`·`status`를 변경할 수 없습니다.
- **공개 읽기**: 공유 링크용 여정 콘텐츠(trips, plans, timeline, flights, stays, transits)와 화면 설정 문서. 휴지통·개인 일정은 로그인 사용자만 읽습니다.
- `pendingApproval_*`와 `settings/admin` 변경은 관리자 전용이며, `mail` 컬렉션과 목록에 없는 경로는 모두 차단합니다. 익명 로그인은 쓰기에서 제외됩니다.

### 2.5 계정 (Authentication)
- 로그인은 이메일 + 비밀번호 방식입니다.
- 가입 폼은 비밀번호 확인 칸이 있으며, 두 값이 다르면 가입 버튼이 비활성화됩니다. 모든 비밀번호 칸에 보기/숨기기(눈 아이콘) 토글이 있습니다(`PasswordInput`).
- 본인 비밀번호 변경: 관리자·회원 모두 프로필 수정(비밀번호 재확인 후 진입)에서 새 비밀번호와 확인을 입력해 변경합니다.
- 관리자는 USERS 모드에서 회원에게 비밀번호 재설정 메일을 보낼 수 있습니다(다른 회원의 비밀번호를 직접 지정하지는 않음).

---

## 3. 핵심 기능 사양 (Functional Specifications)

### 3.1 허브별 화면 사양

#### 1) 맵 허브 (Map Hub)
- **인터랙티브 글로벌 지도**:
  - 전 세계 국가 및 도시의 위치 정보 시각화.
  - 방문 완료 국가(Visited Red Pin), 위시리스트 국가(Wishlist), 인기 여행지 핀 표시.
  - 국가 클릭 시 해당 국가의 시차, 날씨, 통화, 대표 도시, 저장된 여정 목록을 담은 모달 노출.
- **키보드 내비게이션 검색창**:
  - 검색창 입력 시 국가/도시 추천 드롭다운 즉시 노출.
  - `↑ (ArrowUp)`, `↓ (ArrowDown)` 키보드 탐색 및 자동 스크롤 추적, `Enter` 키 즉시 선택.
- **인라인 트립 가이드 (Trip Builder Panel)**:
  - 지도 화면 42%를 분할하여 즉시 여정 빌더 활성화.
  - 큐레이터(Curator), 템플릿(Templates), 커스텀(Custom) 3대 생성 모드 지원.
  - 로그인 사용자의 실제 '이름'(First Name, 성 제외)을 기본 1인 멤버로 자동 세팅 (0명 방지).
  - 테마, 기간(박/일), 방문 희망 도시 선택 시 실시간 타임라인 및 동선 프리뷰.
  - 가이드가 열린 상태에서 지도(국가 영역·핀·도시 점)나 검색으로 다른 국가·도시를 고르면 가이드 목적지가 확인 없이 즉시 바뀝니다(국가는 대표 도시 기준). 현재 가이드 국가를 다시 고르면 작성 중인 가이드는 유지됩니다.

#### 2) 여정 상세 (Journey Detail)
- **Hero & Overview**:
  - 대표 커버 이미지/비디오, 여정 타이틀, 날짜, 동행 멤버, 태그, 상태 뱃지(`NEW`, `PLAN` 등).
  - 총 지출 및 개인별 정산 요약 위젯.
- **일자별 타임라인 (Day Timeline)**:
  - 날짜별 시간대 순서로 정렬된 스팟 카드 (시간, 장소명, 카테고리, 비용, 메모, 사진).
  - 이동 수단(차량, 기차, 선박, 항공기) 아이콘 및 경로 연결선 표시.
  - 장소 추가/수정/삭제 및 드래그 앤 드롭 순서 변경.
- **플로팅 포켓 위젯 (Floating Pocket Widget & Radar)**:
  - 현재 보고 있는 여정의 해당 도시/국가와 일치하는 스팟 포켓 아이템만 필터링하여 레이더에 노출.
  - 포켓 아이템 클릭 시 주소, 메모, 운영시간 등 상세 정보 카드 확장.
  - 원클릭으로 해당 날짜의 타임라인에 장소 자동 추가.
- **항공/숙소/교통 예약 모듈**:
  - 편명, 터미널, 좌석, PNR 예약번호 관리.
  - 호텔 체크인/아웃, 예약번호, 영수증 첨부.

#### 3) 포켓 허브 (Pocket Hub)
- **스마트 스팟 보관함**:
  - 인스타그램, 유튜브, 네이버 블로그 등 외부 링크 스크랩 및 OCR 자동 파싱.
  - 썸네일 자동 추출, 구글 장소 자동완성 연동.
- **분류 및 정렬**:
  - 카테고리별 필터: `ALL`, `CAFE`, `FOOD`, `STAY`, `SPOT`, `SHOP`, `TIP` 등.
  - 국가별(Country) 그룹화 및 도시별(City) 그룹화 지원 (동일 국가 내 도시 순차 정렬).
  - 아코디언 토글을 통한 그룹 접기/펼치기.
- **선택 모드 & 트립 생성**:
  - 다중 스팟 선택(Multi-select) 후 'CREATE TRIP' 실행 시 선택된 장소들이 1일차 타임라인에 자동으로 배치된 신규 여정 생성.

#### 4) 아카이브 & 플랜 허브 (Archive & Plan Hub)
- **그리드/리스트 뷰**: 완료된 여행(Archive)과 예정된 여행(Plan)을 분리하여 감각적인 카드 그리드로 전시.
- **상태 관리**: 여정 완료 시 Plan에서 Archive로 전환, 복제(Clone), 소프트 삭제(Trash Bin).
- **여정 순서 배치**: 신규 여정은 항상 첫 번째 인덱스(0번)에 우선 배치되고, 드래그를 통한 자유로운 순서 재배치 지원.

#### 5) 매거진 허브 (Magazine Hub)
- **에디토리얼 포토 저널**:
  - 여행 중 촬영한 고화질 사진을 매거진 레이아웃(Tall, Wide, Large, Landscape, Portrait)으로 구성.
  - 사진별 인용구(Quote), 캡션, 촬영 날짜 및 장소 메타데이터 렌더링.

#### 6) 캘린더 허브 (Calendar Hub)
- **통합 연간/월간 뷰**:
  - 과거 여행 아카이브, 예정된 플랜, 개인 맞춤 일정(업무, 가족 등)을 타임라인 바 형태로 오버레이.
  - 날짜 클릭 시 해당 일자의 세부 스케줄 팝오버 확인.

### 3.2 사용자 플로우 및 인터랙션 규칙
1. **2단계 확인 필수 (Two-Step Confirmation)**:
   - 여정 생성, 여정 삭제, 타임라인 삭제, 포켓 삭제 등 데이터 파괴적 동작은 브라우저 기본 `window.confirm` 대신 일관된 디자인의 `ConfirmModal`을 통해 2단계 확인을 거칩니다.
2. **이탈 방지 (Leave Guard)**:
   - Trip Builder 작성 중 다른 메뉴(허브)로 이탈 시 작성 중인 내용 저장 여부를 묻는 이탈 확인 모달 노출.
3. **낙관적 UI 및 무결점 상태 동기화**:
   - 좋아요(Like), 순서 변경, 접기/펼치기 등 사용자 인터랙션은 화면에 즉시 반영되고 백그라운드에서 Firestore에 기록.

---

## 4. 디자인 시스템 및 스타일 가이드 (Design System & UI Specs)

### 4.1 디자인 컨셉: 스위스 국제 타이포그래피 스타일 (Swiss International Style)
- **단순함과 기능성**: 시각적 장식을 배제하고 명확한 그리드, 타이포그래피 계층, 여백의 조화로 완성.
- **이모지 사용 지양**: 라벨, 버튼, 메뉴에 비규격 이모지 사용을 엄격히 금지하며, 일관된 굵기의 Lucide 아이콘으로 통일.
- **단일 얇은 보더**: 이중 컨테이너 및 무거운 그림자 박스를 지양하고, `border border-black/20 dark:border-white/20`의 단일 헤어라인 보더 적용.

### 4.2 컬러 팔레트 (Color Palette)
디자인 기준 문서는 `AGENTS.md`가 유일하며, 포인트 컬러는 레드 계열로 통일합니다. 날씨·기온 등 색 자체가 의미를 갖는 시각화에 한해 앰버/오렌지를 허용합니다.

| 토큰명 | 라이트 모드 (Light) | 다크 모드 (Dark) | 용도 및 의미 |
| :--- | :--- | :--- | :--- |
| **Background Base** | `#FFFFFF` | `#141414` | 전체 페이지 및 메인 캔버스 배경 |
| **Card / Surface** | `#FFFFFF` / `#FAF9F6` | `#181818` / `#1E1E1E` | 모달, 플로팅 패널, 팝오버 표면 |
| **Text Primary** | `#000000` (`text-black`) | `#FFFFFF` (`text-white`) | 주요 헤드라인, 장소명, 핵심 수치 |
| **Text Secondary** | `rgba(0,0,0,0.6)` | `rgba(255,255,255,0.6)` | 보조 설명, 날짜, 서브타이틀 |
| **Text Muted** | `rgba(0,0,0,0.4)` | `rgba(255,255,255,0.4)` | 메타데이터, 단위, 플레이스홀더 |
| **Border Normal** | `rgba(0,0,0,0.15)` ~ `0.2` | `rgba(255,255,255,0.15)` ~ `0.2` | 카드 외곽선, 구분선, 모달 보더 |
| **Accent Primary** | `#DC2626` (`red-600`) | `#EF4444` (`red-500`) | 활성 탭, 방문 핀, 주요 액션 버튼, 강조 뱃지 |
| **Accent Sub** | `#D97706` (`amber-600`) | `#F59E0B` (`amber-500`) | 위시리스트 스타, PLAN 상태 뱃지 |

### 4.3 타이포그래피 규칙 (Typography Specs)
- **폰트 패밀리**:
  - 기본 본문: `Inter, Noto Sans KR, -apple-system, sans-serif` (Tailwind `font-sans`는 Satoshi → Inter → Noto Sans KR 순)
  - 코드 / 데이터 / 라벨: `SF Mono, Consolas, Noto Sans KR, monospace`
  - 웹폰트는 300~800 굵기만 로드합니다 (900 미사용).
- **폰트 굵기 규격 (font-black 엄격 금지)**:
  - 과도한 피로감을 주는 `font-black` (weight: 900) 사용을 금지하며, 가장 강조되는 제목도 최대 `font-extrabold` (weight: 800) 이하로 작성.
  - 라벨/메타: `font-bold` (700) 또는 `font-semibold` (600).
  - 본문: `font-normal` (400) 또는 `font-medium` (500).

### 4.4 UI 컴포넌트 규격
- **버튼 (Buttons)**:
  - 각진 형태(`rounded-none` 또는 `rounded-sm`)의 스위스 미니멀 스타일.
  - 고유 높이: `h-8` (스몰/보조), `h-9` (기본), `h-10` (강조 액션).
  - 호버 인터랙션: 반전 컬러 (`hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black`).
- **모달 (Modals)**:
  - 딤 배경: `bg-black/60 backdrop-blur-xs`.
  - 상단 헤더: 영문 대문자 모노스페이스 서브 라벨 + 메인 볼드 타이틀 + 우측 `X` 닫기 버튼.

### 4.5 로고 (Brand)
- 정규 로고는 벡터 로고타입 하나만 사용합니다: `public/tripgon-logotype.svg`(이미지용), `BrandLogo` 컴포넌트(인라인, `currentColor`). 원본은 `Logotype_Tripgon log.svg`입니다.
- 글꼴로 로고를 다시 조판하지 않습니다. 라이트 모드는 검정, 다크 모드는 반전(흰색)으로만 씁니다. 빨강은 로고 밖 포인트에만 씁니다.
- 스플래시(Tiny Planet, 5.8초): 캐리어를 끄는 여성이 빨간 지평선 위를 걷다 카메라가 물러나며 도트 행성이 드러남 → 비행기 궤도 선회 → 행성의 점들이 로고로 재조립, 인물은 헤어라인 끝에 섬 → 헤더 로고(`[data-brand-logo]`) 자리로 이어짐. 점 그리드 배경 없음. 세션당 1회, 클릭 시 건너뜀. 구현: `src/components/splash/`(캐릭터 리그 `travelerRig.ts`, 씬 `tinyPlanetScene.ts`), 도트 데이터 `src/data/worldDots.ts`(`node scripts/build-world-dots.mjs`로 생성).
- 캐릭터: 긴 흑발, 흰 민소매, 검정 와이드 팬츠, 밝은 피부, 빨간 캐리어. 다크 모드에서는 머리와 바지만 차콜로 밝히고 눈은 검정 유지.
- favicon과 앱 아이콘은 현재 파일을 유지합니다.

### 4.6 시인성 (Legibility)
- 최소 글씨 크기: `text-micro`(11px, 대문자 모노 라벨·배지), `text-meta`(12px, 날짜·장소·보조 설명). 11px 미만은 쓰지 않습니다.
- 글씨 투명도 하한: 60%(`text-black/60`, `text-white/60`, 명도 대비 라이트 5.7:1, 다크 7.1:1). 입력칸 안내 문구는 50% 이상. 40% 이하는 비활성 상태와 장식선에만 씁니다.

### 4.7 피드백 (Feedback)
- 알림은 `notify(message, tone?)`(토스트: NOTICE / DONE / ERROR), 확인은 `await confirmDialog(message)`(ConfirmModal)를 씁니다. `window.alert`, `window.confirm`은 쓰지 않습니다. 단, 페이지 이동 직전 알림은 예외입니다.
- 삭제처럼 되돌릴 수 없는 동작의 확인 버튼은 빨강입니다.
- 키보드 포커스는 빨간 2px 링으로 표시합니다. 아이콘만 있는 버튼에는 `tap-target`을 붙여 터치 영역을 넓힙니다.

### 4.8 모션 (Motion)
- 토큰: `duration-fast`(120ms), `duration-base`(220ms), `duration-emph`(420ms), `duration-hero`(900ms+) / `ease-standard`, `ease-emphasized`.
- 허브 간 이동은 View Transition으로 교차 전환합니다(헤더 고정). 여정 상세 탭은 활성 블록이 미끄러져 이동합니다. Trip Guide 목적지가 바뀌면 이름이 롤링되고 헤더에 빨간 선이 스칩니다. 타임라인 날짜 헤더는 스크롤에 맞춰 드러나고, 요약 숫자는 0에서 올라갑니다.
- `prefers-reduced-motion`이면 모든 애니메이션과 전환을 즉시 처리합니다.
- v1.3 추가 토큰: `ease-spring`(스프링 안착), `--motion-stagger`(40ms). 인터랙션 클래스: `tgl-press`(누름 축소), `tgl-sweep`(레드 밑줄), `tgl-pop`(아이콘 교체), `tgl-rise`(순차 등장). 헬퍼: `src/motion/`(공유 요소 전환, fly-to, bump).

### 4.9 카드 (v1.3)
- 여정(`JourneyCard`): 사진 좌상단에 대형 연도와 월. 사진 아래 기간 → 타이틀 → 멘트 → 헤어라인 아래 장소. 계획 여정은 흑백 + 점선 테두리 + 앰버 D-day(출발 30일 전부터 컬러 복원). 목록은 전체 정렬 유지.
- 매거진(`IssueCard`): 3:4 표지가 카드 전체, 뒤에 종이 2장. 호버 시 표지가 책등을 축으로 열림.
- 포켓: 분류 라벨, 장소명 → 위치 → 메모, 하단 왼쪽 좋아요 · 댓글 말풍선 · 출처, 오른쪽 아래 여정 추가 버튼.
- 홈 상단 `JourneyPhaseStrip`: 여행 중 LIVE, 출발 60일 이내 D-n, 그 외 지난 해 같은 주의 여정 회상.

### 4.11 매거진 · Memory Reel (v1.3)
- 이슈 카드를 누르면 표지가 책등을 축으로 넘어간 뒤 이슈가 열립니다.
- 이슈 첫 화면(`IssueTextWindow`): 장소명을 크게 두고 글자 안으로 커버 사진이 비칩니다. 스크롤하면 글자 안으로 들어가 사진이 화면을 채운 뒤 기존 히어로로 이어집니다. 본문 행은 스크롤에 맞춰 드러나고, 상단 빨간 선이 읽은 위치를 표시합니다.
- Memory Reel(`MemoryReel`): 이슈 히어로의 버튼으로 엽니다. 켄번스 효과와 교차 페이드, 장소 · 날짜 · 한 줄 자막, 진행 표시, 엔딩 크레딧. 같은 도메인의 음악은 저음 박자에 맞춰 컷이 넘어가고, 그 외에는 설정의 슬라이드 간격을 따릅니다. Space 재생/정지, 좌우 화살표, Esc 닫기.
- 앱 루트는 `overflow-x: clip`을 씁니다(`hidden`은 sticky 요소를 무력화).

### 4.10 날씨 · 지도 (v1.3)
- 날씨 배경 파티클(비 · 물튀김 · 눈 · 별 · 햇살)은 캔버스 한 장(`WeatherParticleCanvas`)으로 그립니다. 강수 강도는 날씨 코드와 강수확률, 빗줄기 기울기는 바람과 스크롤 속도를 따르며, 날씨가 바뀌면 1.2초 동안 교차 전환합니다. 탭이 숨으면 멈추고, 프레임이 밀리면 입자 수를 줄입니다.
- 홈 날씨 카드(`WeatherGlass`): 비 · 뇌우는 유리창 물방울과 흘러내림, 눈은 모서리 서리, 맑음은 빛 번짐.
- 지도 낮 · 밤: 밤 타일은 태양 고도(+0.8° ~ -10°)에 따른 황혼 그라데이션 마스크로 드러납니다. 경계선은 블러 없는 1px 선 + 밝은 헤일로, 태양 직하점 표시. 도시 불빛은 캔버스로 그리고 황혼에 서서히 켜집니다.
- 지도 마커: 40px 안에 모인 여정 핀은 합계 숫자 핀으로 묶이고 누르면 확대됩니다. 국가 점 · 즐겨찾기 핀은 더 중요한 마커에 가려지면 숨습니다. 즐겨찾기 = 앰버, 도시 점 = 잉크.

---

## 5. 데이터 모델 (Data Schema)

### 5.1 Trip & Plan 엔티티 (`Trip`, `Plan`)
Firestore 컬렉션: `users/public/trips`, `users/public/plans` (연관 컬렉션: `users/public/flights`, `users/public/stays`, `users/public/transits`, `users/public/trash`)

| 필드명 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :---: | :--- |
| `id` | `number` | 필수 | 유니크 타임스탬프 ID (`Date.now()`) |
| `title` | `string` | 필수 | 여정 제목 (동일 이름 시 `#2`, `#3` 자동 부여) |
| `date` | `string` | 필수 | 여정 기간 문자열 (예: `2026.10.12 - 2026.10.16`) |
| `locationStr` | `string` | 필수 | 대표 도시/지역 명칭 (예: `Fukuoka`) |
| `country` | `string` | 선택 | 대표 국가 영문명 (예: `Japan`) |
| `tags` | `string[]` | 필수 | 테마 및 분류 태그 배열 |
| `img` | `string` | 필수 | 목록 카드 커버 이미지 URL (Cloudflare R2 또는 Unsplash) |
| `mapImg` | `string` | 필수 | 지도 썸네일 이미지 URL |
| `displayOrder` | `number` | 필수 | 정렬 우선순위 (0 = 최신 최우선) |
| `members` | `string[]` | 필수 | 여정 동행 멤버 목록 (기본 1인 작성자 이름 포함) |
| `statusBadge` | `'NEW' \| 'EDITING' \| 'PLAN' \| ''` | 선택 | 여정 상태 뱃지 |
| `ownerId` | `string` | 필수 | 작성자 Firebase Auth UID |
| `ownerEmail` | `string` | 필수 | 작성자 이메일 주소 |
| `deletedAt` | `number \| null` | 선택 | 소프트 삭제 타임스탬프 (휴지통 복원용) |

### 5.2 타임라인 엔티티 (`TimelineItem`)
Firestore 컬렉션: `users/public/timeline` (단일 통합 컬렉션, `tripId`로 여정 구분)

| 필드명 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :---: | :--- |
| `id` | `number` | 필수 | 타임라인 아이템 고유 ID |
| `date` | `string` | 필수 | 해당 일자 (`YYYY.MM.DD`) |
| `time` | `string` | 필수 | 방문 시간 (예: `14:30`) |
| `place` / `title` | `string` | 필수 | 장소명 또는 활동명 |
| `type` | `string` | 필수 | 카테고리 (`spot`, `food`, `cafe`, `hotel`, `transit` 등) |
| `cost` | `string` | 선택 | 지출 금액 문자열 |
| `currency` | `string` | 선택 | 통화 코드 (`KRW`, `JPY`, `USD`, `EUR` 등) |
| `memo` | `string` | 선택 | 장소 관련 메모 및 꿀팁 |
| `lat` / `lng` | `number` | 선택 | 좌표 (지도 상 핀 매핑용) |
| `vehicleType` | `'car' \| 'train' \| 'ship' \| 'flight' \| null` | 선택 | 이동 수단 구분 |
| `tripId` | `number` | 필수 | 소속 여정 ID |

### 5.3 포켓 스팟 엔티티 (`SpotPocketItem`)
Firestore 문서: `users/public/settings/pockets` (단일 문서의 `items` 배열에 전체 포켓 저장, `onSnapshot`으로 실시간 동기화)

| 필드명 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :---: | :--- |
| `id` | `string` | 필수 | 포켓 고유 ID (`pocket_${Date.now()}_...`) |
| `title` | `string` | 필수 | 장소명 또는 꿀팁 제목 |
| `category` | `PocketCategory` | 필수 | `CAFE`, `FOOD`, `STAY`, `SPOT`, `SHOP`, `TIP` |
| `country` | `string` | 필수 | 국가명 (예: `Japan`, `Korea`) |
| `city` | `string` | 필수 | 도시명 (예: `Tokyo`, `Fukuoka`) |
| `thumbnailUrl` | `string` | 선택 | 썸네일 이미지 URL (R2 업로드) |
| `memo` | `string` | 선택 | 핵심 메모 및 할인/웨이팅 정보 |
| `sourceUrl` | `string` | 선택 | SNS 원본 링크 |
| `likes` | `number` | 필수 | 추천수 (기본값 0) |
| `likedBy` | `string[]` | 필수 | 좋아요 누른 유저 식별자 배열 |
| `createdAt` | `number` | 필수 | 생성 타임스탬프 |

### 5.4 사용자 프로필 (`UserProfile`)
Firestore 컬렉션: `users/{uid}`, `users/public/users/{uid}`

| 필드명 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :---: | :--- |
| `uid` | `string` | 필수 | Firebase Auth UID |
| `email` | `string` | 필수 | 계정 이메일 |
| `lastName` | `string` | 필수 | 성 (Last Name) |
| `firstName` | `string` | 필수 | 이름 (First Name, 멤버 기본값으로 활용) |
| `username` | `string` | 선택 | 닉네임 |
| `role` | `'admin' \| 'user'` | 필수 | 계정 역할 |
| `permissions` | `UserPermissions` | 필수 | `canCreate`, `canEdit`, `canDelete` |
| `status` | `'pending' \| 'approved' \| 'rejected'` | 선택 | 가입 승인 상태 (신규 가입은 `pending`, 관리자 승인 후 쓰기 가능) |

---

## 6. 구현 로드맵 (Milestones)

### Phase 1: MVP 핵심 기능 (완료)
- [x] Firebase Authentication 및 사용자 가입/승인 파이프라인.
- [x] 여정 생성, 편집, 타임라인 관리(날짜/시간/장소/경비).
- [x] Leaflet 기반 글로벌 맵 허브 및 국가/도시 데이터셋 구축.
- [x] 인라인 트립 빌더 패널 (큐레이터/템플릿/커스텀 모드).
- [x] Cloudflare R2 스토리지 연동 및 이미지 압축 업로드.
- [x] 스위스 미니멀 디자인 시스템(모노크롬 + 레드 포인트, 단일 1px 보더) 표준화.

### Phase 2: 디테일 개선 및 사용성 극대화 (진행 완료)
- [x] 맵 허브 검색창 키보드 방향키 탐색(`ArrowUp`/`ArrowDown`) 및 엔터 선택.
- [x] Trip Guide 멤버 기본 1인(사용자 First Name) 자동 지정 및 0명 버그 원천 해결.
- [x] 포켓 허브 도시별(City) 그룹화 및 국가별 묶음 정렬.
- [x] 플로팅 포켓 위젯의 상세 카드 확장 및 원클릭 타임라인 병합.
- [x] 신규 여정 생성 시 최우선 순위(0번 인덱스) 자동 정렬 및 기존 순서 영속 보존.
- [x] Vercel 배포 빌드 타입 검사(`npx tsc --noEmit`) 무결점 CI/CD 체계 구축.
- [x] R2 자격 증명 서버 이전(서명 URL 방식) 및 클라이언트 번들 내 비밀 키 제거.

### Phase 3: 차세대 확장 (Next Roadmap)
- [ ] 오프라인 PWA 지원 및 ServiceWorker 기반 캐싱 고도화.
- [ ] 여정 링크 공유 시 비회원 전용 읽기 모드(Guest Read-only Mode) 최적화.
- [ ] 여행 경비 영수증 다중 파일 실시간 OCR 정산 모듈 고도화.
- [ ] 날씨 API 실시간 연동을 통한 여정 일자별 예보 자동 업데이트.

## 7. 변경 이력 (Changelog)

### v1.3.0 (2026.09.28)
- 버전 단일 소스(package.json)와 버전 관리 지침 추가.
- 모션 토큰 v2와 인터랙션 클래스, `src/motion/` 헬퍼.
- 여정 · 매거진 · 포켓 카드 리디자인, 홈 상단 시점별 모듈.
- 날씨 캔버스 엔진과 Weather Glass, 지도 황혼 그라데이션 · 경계선 · 마커 겹침 개선.
- 매거진 표지 넘김 진입, 글자 창문 오프너, 스크롤 등장 · 읽기 진행선, Memory Reel.
