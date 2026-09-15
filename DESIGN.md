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

## 6. 레이아웃 원칙 (Swiss Minimal Structure)

### 박스인박스(Box-in-Box) 및 이중 컨테이너 배제
- **이중 컨테이너 및 두꺼운 배경 박스 제거**: 컨테이너 안에 불필요하게 중첩된 테두리, 카드 래퍼, 두꺼운 회색 배경 박스(`bg-black/5`, `p-4 inside p-4` 등)의 중복 사용을 엄격히 금지합니다.
- **단일 라인 및 얇은 모노크롬 보더**: 컴포넌트 및 모달의 경계선은 단일 라인의 얇은 모노크롬 보더(`border border-black/20 dark:border-white/20`)만을 사용합니다.
- **구분선 및 포인트 바**: 섹션 구분이 필요할 때는 단일 분할선(`border-t border-black/10 dark:border-white/10`) 또는 스위스 스타일의 얇은 좌측 포인트 바(`border-l-2`)만을 활용합니다.
- **타이포그래피 계층**: 정보의 위계는 중첩 박스가 아닌 산세리프(Sans)와 고정폭(Mono) 폰트의 크기/굵기 스케일 대비 및 투명도(`text-black/60 dark:text-white/60`)로 표현합니다.

### 여백 및 그리드
- 모바일: px-3~4 py-3~4, 컴팩트한 그리드 간격(`gap-2` ~ `gap-3`)
- 데스크탑: sm:px-6 sm:py-5
- 섹션 간: space-y-4 기본
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

## 9. 용어 (Terminology)

| 사용 금지 | 올바른 표현 |
|----------|------------|
| Journey / journey | Trip / trip |
| 여정 | 트립 |
| JOURNEY TITLE | TRIP TITLE |
| CREATE JOURNEY | CREATE TRIP |
| GENERATE JOURNEY | GENERATE TRIP |

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

*최종 업데이트: 2026-09-15*
