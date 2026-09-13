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

## 3. 타이포그래피

| 용도 | 폰트 | 크기 | 변형 |
|------|------|------|------|
| 헤더/레이블 | font-mono | text-[10px] | uppercase tracking-widest font-black |
| 본문 안내 | font-sans | text-xs | 일반 weight |
| 강조 숫자 | font-mono | text-lg+ | font-black |
| 버튼/CTA | font-mono | text-[10px] | uppercase tracking-widest font-black |

한글 안내 텍스트: 설명/힌트/오류 메시지는 한글 우선.
메뉴/탭/라벨: 영문 대문자 유지.

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

## 6. 레이아웃 원칙

### 박스인박스 지양
- 컨테이너 안에 동일한 테두리+배경을 중복 사용 금지
- 섹션 구분은 얇은 선(border-t) 또는 좌측 컬러 바(border-l-2) 사용
- 정보 계층은 타이포그래피 스케일과 색상 투명도로 표현

### 여백
- 모바일: px-4 py-4
- 데스크탑: sm:px-6 sm:py-5
- 섹션 간: space-y-4 기본
- 그리드 간격: gap-2 기본

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
| MapPin | 위치/장소 입력 |
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

*최종 업데이트: 2026-09-13*
