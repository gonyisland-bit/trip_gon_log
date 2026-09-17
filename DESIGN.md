# Design Guidelines --- Swiss Minimal System

## 1. 기본 철학

**Swiss International Typographic Style** (스위스 국제 타이포그래픽 스타일)  
명확한 계층/그리드/타이포그래피를 중심으로, 군더더기 없이 정보 그 자체가 디자인이 되도록 한다.

---

## 2. 컬러 시스템

| 역할 | Light | Dark |
|------|-------|------|
| 배경 기본 | #F9F8F6 | #121212 |
| 배경 보조 | white | #161616 |
| 텍스트 기본 | black | white |
| 텍스트 약 | black/50 | white/50 |
| 포인트 (상태/CTA) | orange-600 | orange-400 |
| 위험/삭제 | red-600 | red-400 |
| 경계선 | black/20 | white/20 |

무채색 모노크롬 기본. 오렌지/레드 포인트는 선택 상태, 경고, CTA에만 절제 적용.

---

## 3. 타이포그래피 (Typography System)

### 폰트 패밀리 원칙
- **영문 메인 폰트**: `Inter` (명확한 계층 구조, 높은 X-height와 탁월한 디지털 가독성)
- **한글 메인 폰트**: `Noto Sans KR` (단정한 직선미와 산세리프 한글 가독성)
- **고정폭(Mono) 폰트**: `SF Mono`, `Consolas` (날짜, 일수, 메타데이터, 코드)

### 폰트 크기 최소화 규칙 (시인성 확보)
- **초소형 폰트 지양**: `text-[9px]`, `text-[10px]` 등의 지나치게 작은 폰트 사용을 배제하고, 마이크로 카피라도 최소 `text-[11px]` 이상을 유지합니다.
- **기본 레이블/안내**: `text-xs` (12px) 이상 기본 적용.
- **본문/입력 필드**: `text-xs` ~ `text-sm` (12px~14px)을 적용하여 시인성과 터치 편의성을 극대화합니다.
- **모달/섹션 타이틀**: `text-base` ~ `text-xl` 이상으로 스케일 대비 확보.

| 용도 | 폰트 패밀리 | 권장 크기 | 변형 스타일 |
|------|-----------|----------|------------|
| 모달 헤더 대제목 | Inter (font-sans) | text-sm sm:text-base | font-black uppercase tracking-wider |
| 폼 레이블 | SF Mono (font-mono) | text-xs | font-bold uppercase tracking-wider |
| 본문 힌트/설명 | Noto Sans KR (font-sans) | text-xs | leading-relaxed text-black/60 |
| 입력 필드 텍스트 | Inter / Noto Sans KR | text-xs sm:text-sm | py-2.5 px-3 |
| 시즌/날씨 분석 | Inter / Noto Sans KR | text-xs sm:text-sm | font-bold(제목), leading-relaxed(본문) |
| 버튼/CTA | Inter / Noto Sans KR | text-xs sm:text-sm | font-black uppercase tracking-widest |

한글 안내 텍스트: 설명, 힌트, 탭 부제, 안내 메시지는 한글 우선 제공.
메뉴/탭/시스템 라벨: 정제된 영문 대문자 유지.

---

## 4. 이모지 정책

- UI 버튼, 라벨, 탭, 헤더에서 이모지 완전 금지
- 아이콘은 lucide-react 라이브러리로 단일 스타일 통일
- 프리셋 라벨: PRESETS (이모지 없이 텍스트만)

---

## 5. 버튼 원칙

[아이콘] [텍스트] 형태 사용
기호+텍스트 중복 금지 (예: + ADD X, Plus + ADD X)

- Primary CTA: bg-black text-white py-2.5~3 font-black uppercase tracking-widest
- Ghost/Cancel: border border-black/20 hover:bg-black/5
- Danger: text-red-600 hover:text-red-700

---

## 6. 레이아웃 및 뷰포트 원칙 (Swiss Minimal Viewport Standard)

### 전체 허브 표준 뷰포트 컨테이너 (Trip 기준 규격)
모든 허브 페이지(Home, Trip, Magazine, Pocket, Calendar 상단)는 일관된 에디토리얼 정렬선과 풀-와이드 개방감을 보장하기 위해 **Trip 허브 기준 표준 컨테이너 클래스**를 동일하게 적용합니다.

- **표준 메인 컨테이너**:
  `w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12`
- **고정 폭 래퍼(`max-w-7xl` 등) 배제**: 데스크톱 와이드 화면(1440px~1920px)에서 허브 간 이동 시 레이아웃이 쪼그라들거나 양옆에 불필요한 공백이 생기지 않도록 `max-w-7xl` 등 임의의 축소 래퍼 사용을 엄격히 금지합니다.
- **전 허브 카드 피드 4열 표준 그리드 (웹 기준 1줄 4개 배열)**:
  Trip, Magazine, Pocket 등 모든 허브의 카드 피드는 일관된 리듬과 모노크롬 비례를 위해 **모바일 2열 / 데스크톱 4열 표준 그리드**로 통일합니다.
  - `grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3.5 sm:gap-5 md:gap-6`

### 전체 허브 2단 가로줄 및 툴바 표준화 (Trip 기준 규격)
모든 허브 페이지(Trip, Magazine, Pocket)는 일관된 시각적 그리드와 높이 표준을 위해 **Trip 허브 기준 2단 전폭 가로줄 및 툴바 규격**을 동일하게 적용합니다.

- **1단 (마스트헤드 경계선)**:
  상단 대제목 및 설명 섹션 하단에 전폭 가로줄 (`border-b border-black/10 dark:border-white/10`, 패딩 `pt-8 sm:pt-14 pb-8`).
- **2단 (컨트롤 툴바 표준 높이 및 경계선)**:
  `w-full max-w-[1920px] mx-auto px-4 sm:px-8 md:px-12 py-4 border-b border-black/10 dark:border-white/10`
  - 두 가로줄 사이의 상하 여백 높이를 **`py-4` 표준 높이**로 전 허브에 일치시킵니다.
  - 내부 패딩 박스 안에 갇혀 있는 좌우 여백 있는 가로줄(`mb-8 border-b` 등) 및 과도한 상단 공백은 전면 폐기하고 전폭 가로줄로 통일합니다.
- **서브 라벨(`ALL ~`) Inter 폰트 및 장식 아이콘 완전 배제**:
  `ALL TRIPS`, `ALL ISSUES`, `ALL SPOTS` 등 툴바 좌측 카운터 라벨은 디자인 지침 폰트인 **`Inter`**(`font-['Inter',sans-serif] font-bold text-xs sm:text-sm uppercase tracking-wider text-black dark:text-white`)로 단일화하며, 라벨 앞의 불필요한 장식용 컬러 아이콘(예: 빨간 Layers 아이콘 등)을 일체 배제합니다.
- **허브 툴바 기능·아이콘 동일화 대원칙 (Trip 기준)**:
  허브 간 같은 기능을 가진 컴포넌트는 명칭뿐만 아니라 **아이콘까지 완전히 동일한 Lucide 아이콘**을 사용합니다.
  - **필터 (FILTER)**: 반드시 `<Tag className="w-3.5 h-3.5" />` 사용 (SlidersHorizontal 등 다른 아이콘 사용 금지)
  - **검색 (SEARCH)**: 반드시 `<Search className="w-3.5 h-3.5" />` 사용
  - **정렬 (SORT)**: 반드시 `<ArrowUpDown className="w-3.5 h-3.5" />` 사용
  - 기본 상태: `border border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 bg-black/5 dark:bg-white/5 text-black dark:text-white`
  - 활성/선택 상태: `bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs`
  - 폰트 및 패딩: `text-[10px] sm:text-[11px] px-2.5 py-1.5 uppercase font-mono font-bold tracking-wider rounded-none`
- **허브 툴바 공간 효율화 (모바일 1-Row 정렬)**:
  - 검색창을 상시 노출하여 모바일 공간을 낭비하지 않고, Trip 허브 표준인 **인라인 펼침 방식(`isSearchInputOpen`)**으로 단일화합니다.
  - 이로 인해 모바일에서도 `[FILTER]`, `[SEARCH]`, `[SORT]` 3개 핵심 컨트롤이 단 한 줄(1-row)에 간결하게 배치됩니다.
  - 정렬 컴포넌트는 `<ArrowUpDown />` 아이콘과 스위스 네이티브 모노크롬 `<select>` 요소를 결합하여 군더더기 팝업 없이 직관적으로 동작하도록 통일합니다.
- **허브 ADD 버튼 표준화 및 마우스 오버 통일**:
  - 명칭: `KEEP SPOT` 등 이질적인 명칭을 배제하고 `<Plus className="w-3.5 h-3.5" /> ADD` (Trip은 `ADD TRIP`)로 간결화.
  - 모바일 반응형: 모바일에서는 하단 1줄 전체를 시원하게 채우는 풀사이즈(`w-full`), 데스크톱에서는 우측 정렬(`sm:w-auto`).
  - 마우스 오버 전후 색상 100% 통일:
    - 오버 전: `border border-black dark:border-white text-black dark:text-white bg-transparent`
    - 오버 후: `hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors`

### 카드 렌더링 모션 시스템 (Fast Cascading Motion)
- **앱 감성의 순차적 스태거 모션(Stagger Motion)**:
  - 카드가 한 번에 정적으로 나타나지 않고, 미세한 시간차(30ms 단위)를 두고 부드럽게 솟아오르는 인터랙션을 제공합니다.
  - 키프레임: `@keyframes cardEntrance` (`from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); }`)
  - 타이밍 함수: `cubic-bezier(0.16, 1, 0.3, 1)` (스위스 모던 감성의 빠르고 정갈한 감속 곡선)
  - 지속 시간 및 상한: 기본 `260ms`, 딜레이는 `Math.min(index * 30, 240)ms`로 캡핑하여 카드가 수십 개여도 0.24초 이내에 모든 카드가 쾌적하게 안착하도록 보장합니다.

### 모바일 뷰포트 공간 최적화 (Mobile Viewport Optimization)
- **홈허브 히어로 하단 모바일 압축**: 모바일(`md` 미만)에서 3:4 사진 아래 날짜, 여정설명, 일수, 장소, 이동버튼이 세로로 길게 늘어지지 않도록, 1화면 안에 들어오는 컴팩트 인라인 블록(`px-2 pt-4 pb-2 border-t border-black/10`)으로 압축하여 스크롤 낭비를 배제합니다. 데스크톱(`md` 이상)의 웅장한 3열 오버랩 레이아웃은 그대로 유지합니다.

### 박스인박스(Box-in-Box) 및 이중 컨테이너 배제
- **이중 컨테이너 및 두꺼운 배경 박스 제거**: 컨테이너 안에 불필요하게 중첩된 테두리, 카드 래퍼, 두꺼운 회색 배경 박스(`bg-black/5`, `p-4 inside p-4` 등)의 중복 사용을 엄격히 금지합니다.
- **단일 라인의 얇은 모노크롬 보더**: 컴포넌트 및 모달의 경계선은 단일 라인의 얇은 모노크롬 보더(`border border-black/20 dark:border-white/20`)만을 사용합니다.
- **구분선 및 포인트 바**: 섹션 구분이 필요할 때는 단일 분할선(`border-t border-black/10 dark:border-white/10`) 또는 스위스 스타일의 얇은 좌측 포인트 바(`border-l-2`)만을 활용합니다.
- **타이포그래피 계층**: 정보의 위계는 중첩 박스가 아닌 산세리프(Sans)와 고정폭(Mono) 폰트의 크기/굵기 스케일 대비 및 투명도(`text-black/60 dark:text-white/60`)로 표현합니다.

### 여백 및 그리드 기본값
- 모바일: px-3~4 py-3~4, 컴팩트한 그리드 간격(`gap-2` ~ `gap-3`)
- 데스크탑: sm:px-6 sm:py-5, 상위 섹션은 `px-4 sm:px-8 md:px-12`
- 섹션 간: space-y-4 ~ space-y-8
- 한 줄 정렬(Compact 1-row layout) 및 일관된 그리드 정렬 유지

---

## 7. 모달 원칙

### ConfirmModal — 2단계 확인
생성/삭제 등 중요 동작은 반드시 ConfirmModal 경유.

### 자동완성 팝오버
- 기본 상태: 닫힘
- 타이핑 시에만 드롭다운 노출
- 선택 즉시 닫힘

### 관리자 전용 CRUD
- 프리셋 추가/수정/삭제: isAdmin === true 시에만 노출
- 뷰 모드: 읽기/선택만 가능

---

## 8. 폼 입력 원칙

- 아이콘 포함 입력창: relative 래퍼 + absolute 아이콘 + pl-10 padding
- 라벨: text-[10px] font-mono uppercase font-bold tracking-widest text-black/50
- 힌트: text-[10px] text-black/40 mt-0.5 leading-snug (한글)
- 에러: 붉은 좌측 바 border-l-2 border-red-500 pl-3

---

## 9. 허브 체계 및 용어 정의 (Terminology & Hub Architecture)

### 공식 허브 명칭 체계
| 허브 명칭 | 대응 파일 (Page) | 설명 및 역할 |
|---|---|---|
| **Home** | `src/pages/Home.tsx` | 메인 인트로 및 추천 쇼케이스 |
| **Trip** | `src/pages/Archive.tsx` | **메인 트립 목록 & 피드 (UI 라벨 'TRIP')** |
| **Magazine** | `src/pages/MagazineHub.tsx` | 매거진 및 에디토리얼 아티클 |
| **Pocket** | `src/pages/PocketHub.tsx` | 스크랩 & 스팟 꿀팁 갤러리 피드 |
| **Calendar** | `src/pages/CalendarHub.tsx` | 연간/월간 캘린더 및 일정 관리 |
| **Map** | `src/pages/MapHub.tsx` | 인터랙티브 맵 뷰포트 |

### 용어 사용 규칙 (Archive 용어 폐기)
- **Archive(아카이브) 용어 폐기**: 초기 아카이브 허브는 현재 공식적으로 **Trip(트립) 허브**로 정의합니다. UI, 라벨, 문서, 커뮤니케이션에서 '아카이브'라는 명칭은 배제하고 항상 **Trip / 트립**으로 지칭합니다.

| 사용 금지 | 올바른 표현 |
|----------|------------|
| Archive / archive (허브 지칭 시) | Trip / trip (트립) |
| Journey / journey | Trip / trip |
| 여정 | 트립 |
| JOURNEY TITLE / ARCHIVE TITLE | TRIP TITLE |
| CREATE JOURNEY | CREATE TRIP |
| GENERATE JOURNEY | GENERATE TRIP |
| POCKET ARCHIVE | POCKET |
| CALENDAR ARCHIVE | CALENDAR SCHEDULE |

---

## 10. 아이콘 용례 (Lucide)

| 아이콘 | 용례 |
|--------|------|
| MapPin | 국가(COUNTRY) 입력 또는 지도 핀 |
| Building2 | 도시/명소(LOCATIONS) 입력 |
| Calendar | 날짜 입력 |
| Tag | 태그 입력 |
| Edit3 | 제목 입력 |
| Layers | 프리셋 탭 |
| Globe | 빌더 탭 / All 테마 |
| Sliders | 수동 입력 탭 |
| Check | 확인/완료 버튼 |
| Trash2 | 삭제 |
| Edit | 편집 |
| Plus | 추가 |
| X | 닫기 |
| CheckCircle | 분석 결과/완료 상태 |

---

## 11. 브랜드 타이틀 표기 지침 (Brand Title System)

### 명칭 및 대소문자 표기 원칙
- **공식 브랜드 명칭**: `Tripgon log` (첫 글자 `T` 대문자, `log` 소문자의 감성적 혼합 표기)
- **전체 대문자 강제 변환 금지**: `TRIPGON`, `TRIPGON LOG` 등 무분별한 `uppercase` 클래스 적용을 지양하고, 고유의 브랜드 감성을 유지합니다.
- **적용 대상**: 상단 글로벌 네비게이션 로고, 게스트 랜딩 히어로 대제목, 홈 헤더 타이틀 등 모든 메인 브랜드 영역.

### 타이포그래피 사양
- **폰트 패밀리**: `Inter` (`font-['Inter',sans-serif]`)
- **폰트 두께**: `font-black` (900)
- **자간/행간**: `tracking-tight`, `leading-none`

---

*최종 업데이트: 2026-09-17 (Trip 기준 허브 레이아웃 표준화, Tripgon log 감성 타이틀 체계 정립, 포켓 댓글 시스템 도입)*

