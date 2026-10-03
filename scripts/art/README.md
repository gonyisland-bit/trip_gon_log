# 일러스트 만들기 (scripts/art)

`assets/illust`의 곰 그림(풀컬러 JPG)을 앱에서 쓰는 파일로 바꿉니다.

```
python3 -m venv .venv && .venv/bin/pip install pillow numpy scipy
.venv/bin/python scripts/art/build.py
```

- 만들어지는 것: `public/art/{id}.webp`(장면, 흰 바탕은 투명), `public/art/tile/{id}-{tint}.svg`(허브 색 바탕 정사각 타일, 커버 · 썸네일용), `src/art/catalog.ts`.
- 라이트 · 다크 구분 없이 한 파일을 씁니다. 그림이 흰 바탕 위에 서 있으면 바탕을 투명하게 만들고, 방 · 수영장처럼 화면을 가득 채우는 그림은 곰 주변 창으로 잘라 둥근 카드로 만듭니다(`CARDS`).
- 그림 아래에 글자 캡션이 있는 컷은 `CAPTION_FROM`의 줄부터 아래를 잘라 냅니다. 새 그림에 캡션이 있으면 거기에 추가합니다.
- 컷을 바꾸거나 더하려면 `assets/illust`에 JPG를 넣고 `FILES`에 `id: 파일명`을 적은 뒤, 종류별 목록 `KIND_ART`에 id를 넣고 다시 실행합니다. 가로로 넓은 그림을 그대로 쓰려면 `WIDE`에 넣습니다(`terminal-airport`, 터미널 하단 창).
- 원본에서 아래쪽 약 80px(`WATERMARK` 아래)는 쓰지 않습니다. 모서리에 옅은 표시가 있기 때문입니다.

## 벡터 곰 (scripts/art/bear_trace.py)

원본 곰 그림을 트레이싱해 `src/art/bear/shapes.ts`를 만듭니다. 지도 이동 마커, 터미널 창, `Bear` 컴포넌트가 이 파일을 씁니다.

```
.venv/bin/pip install pillow numpy scipy vtracer
.venv/bin/python scripts/art/bear_trace.py
```

- 자세마다 청록 영역을 하나의 실루엣으로 트레이싱합니다. 원본처럼 목 없이 머리와 몸이 한 곡면으로 이어지고, 몸 안쪽의 검정 선(팔, 배)은 그리지 않습니다.
- 얼굴(눈·코·입)은 서 있는 곰에서 한 번만 트레이싱하고, 각 자세의 눈 위치와 간격에 맞춰 얹습니다.
- 자세를 더하려면 `POSES`에 `자세: 파일명`을 적고 다시 실행합니다.
