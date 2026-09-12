# TripGon Log — 디자인 시스템 및 UI/UX 지침 (DESIGN.md)

본 문서는 **TripGon Log** 프로젝트의 시각적 일관성과 미학적 완성도를 유지하기 위한 핵심 디자인 원칙 및 구현 지침입니다. 모든 신규 페이지 개발, 컴포넌트 추가, UI 리팩토링 시 본 지침을 준수해야 합니다.

---

## 1. 디자인 철학: 스위스 미니멀리즘 (Swiss Minimal Design)
스위스 국제 타이포그래픽 스타일(International Typographic Style)을 바탕으로, 불필요한 장식과 과도한 그래픽을 배제하고 정보의 명확성과 구조적 질서를 최우선으로 합니다.

1. **여백의 적극적 활용 (Mathematical Whitespace)**:
   - 여백은 단순한 빈 공간이 아닌 시각적 계층 구조를 드러내는 적극적인 디자인 요소입니다.
   - 불필요한 테두리 중첩, 과도한 패딩이나 무의미한 래퍼를 지양하고 단정하고 슬림한 헤어라인(`border-black/10 dark:border-white/10`)을 사용합니다.
2. **원스톱 컴팩트 1행 레이아웃 (Compact 1-Row Layout)**:
   - 모바일 및 웹 공통으로 정보는 가로 1행 내에서 명확한 탭과 라벨로 직관적으로 정돈합니다.
3. **기능적 정직함 (Form Follows Function)**:
   - 장식을 위한 그래픽 요소를 배제하고, 버튼과 인터랙션 요소는 본연의 역할(클릭, 드래그, 전환)을 명료하게 나타냅니다.

---

## 2. 타이포그래피 체계 (Typography System)

폰트는 콘텐츠의 가독성과 인터내셔널 모던 감성을 전달하는 핵심 요소입니다.

| 구분 | 적용 폰트 패밀리 | 주 용도 및 스타일 특성 |
| :--- | :--- | :--- |
| **영문 메인 (Sans)** | Inter, Satoshi | 헤드라인, 탭 타이틀, 영문 레이블, 인터랙티브 텍스트 |
| **한글 메인 (Korean)** | Noto Sans KR | 설명문, 일기/기록 본문, 모달 안내, 한글 여행지 명칭 |
| **숫자 및 메트릭 (Mono)** | SF Mono, Consolas | 날짜(YYYY.MM.DD), 기간(3-D), 카운트, 시간, 위경도 좌표 |

### 타이포그래피 규칙:
- **대문자(Uppercase) 악센트**: 주요 영문 레이블, 상태 태그, 카테고리 명칭은 `uppercase font-black tracking-wider`를 적용하여 정돈된 현대적 감각을 부여합니다.
- **숫자 데이터의 모노스페이스 고정**: 날짜, 일수, 카운터 등 숫자가 변동되는 영역은 가변폭 산세리프 대신 `font-mono`를 지정하여 레이아웃의 흔들림(Layout Shift)을 방지합니다.

---

## 3. 이모지 금지 조항 (Strict Emoji Ban)

- **비규격 이모지 사용 전면 금지**:
  - 비규격 유니코드 이모지를 UI 레이블, 버튼, 헤더, 배지에 사용하는 것을 엄격히 금지합니다.
- **대체 수단**:
  1. **정갈한 대문자 텍스트**: `JOURNEY`, `FLIGHT`, `STAY`, `TRANSIT`, `SCHEDULE`
  2. **통일된 Lucide 아이콘**: `Calendar`, `Plane`, `MapPin`, `Compass`, `Clock`, `ArrowRight` 등 선 두께(`stroke-[1.5]`~`stroke-[2.5]`)가 통일된 벡터 아이콘 활용.

---

## 4. 군더더기 설명 배제 (Minimal Microcopy)

- 사용자가 직관적으로 인지할 수 있는 자명한 기능에 대한 부차적인 한글 설명문을 화면에 과도하게 나열하지 않습니다.
- 예시:
  - ❌ "일반 날짜를 클릭하면 해당 날짜로 이동합니다." / "드래그하여 기간을 선택하세요."
  - ✅ 간결한 상태 표시: `2026.04.12 ~ 2026.04.15 (4D SELECTED)`
- 툴팁(`title` 속성)이나 단정한 모노스페이스 배지를 통해 시각적 노이즈 없이 필요한 힌트를 제공합니다.

---

## 5. 컬러 팔레트 (Color Palette)

TripGon Log는 고대비 무채색 모노크롬을 바탕으로 하되, 엄선된 인터내셔널 포인트 컬러만 절제하여 사용합니다.

- **Background**:
  - Light: `#FAF9F6` (따뜻한 오프화이트/아이보리 캔버스)
  - Dark: `#141414` (정밀한 딥 차콜/블랙)
- **Base Text / Borders**:
  - Primary Text: `text-black dark:text-white`
  - Secondary Text: `text-black/60 dark:text-white/60`
  - Subtle Hairline: `border-black/10 dark:border-white/10`
- **Functional Accent (스위스 포인트 컬러)**:
  - **International Vermilion (#FF4500)**: 등록된 확정 여정(Trip) 및 실시간 오늘/강조 포인트.
  - **Curated Amber (#F59E0B)**: 계획 중인 여정(Plan).
  - **Swiss Active Red (#DC2626)**: 일요일 및 공휴일 인디케이터, 삭제/위험 액션.
  - **Signal Blue (#2563EB)**: 토요일 및 커스텀 일정 기본 카테고리.

---

## 6. 컴포넌트별 그리드 및 스케일 가이드

### 1) 달력 허브 (Calendar Hub)
- **월달력 (Month View)**:
  - 컨테이너 폭: `max-w-4xl lg:max-w-5xl mx-auto`로 넓고 시원한 시인성 확보.
  - 날짜 원형(Circle): `w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-13 lg:h-13 aspect-square`로 균일한 원형 유지.
  - 연속 여정 알약(Capsule ribbon): 상하 여백(`top-1.5 bottom-1.5 sm:top-2 sm:bottom-2 md:top-2.5 md:bottom-2.5 lg:top-3 lg:bottom-3`)과 좌우 캡슐 라운딩 반경을 일치시켜 단정한 대칭 실루엣 유지.
- **년달력 (Year View)**:
  - 레이아웃: 모바일 2열(`grid-cols-2`), 태블릿 3열(`sm:grid-cols-3`), 데스크톱 4열(`lg:grid-cols-4`, 3행 x 4열 포스터 그리드).
  - 모바일과 웹의 카드 폭과 폰트 크기 비율을 정돈하여 시각적 밀도를 일관되게 유지.
  - 기간 표기: `1D`, `3D` 대신 하이픈을 추가한 고대비 슬림 배지(`TRIP 3-D`, `EVENT 1-D`) 적용.

### 2) 모달 다이얼로그 (Modals)
- 모달 내부에 무거운 카드 박스를 중첩하지 않고 슬림한 라인 구분선과 타이포그래피로 구성.
- 닫기: 우측 상단 `X` 아이콘, 바깥 배경 클릭(Backdrop Click), 또는 `ESC` 키로 닫힘 보장.
- 수정/삭제: 텍스트 박스 형태의 과도한 레터박스를 지양하고, 클릭 시 자연스러운 인라인 편집 또는 간결한 모달 활용.
