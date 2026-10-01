# 일러스트 만들기 (scripts/art)

첨부 시트(`assets/art-sheet.webp`)를 컷별로 잘라 벡터로 변환해 `public/art`에 씁니다.

```
python3 -m venv .venv && .venv/bin/pip install pillow numpy opencv-python-headless scipy potracer
.venv/bin/python scripts/art/build.py
```

- 만들어지는 것: `public/art/{id}.svg`(밝은), `public/art/dark/{id}.svg`(어두운), `public/art/tile/{id}-{tint}.svg`(허브 색 바탕, 커버 · 썸네일용), `src/art/catalog.ts`.
- 앱에 넣을 컷은 `build.py`의 `USED`(종류별 목록 `KIND_ART` + `EXTRA_USED`)로 정합니다. 시트의 다른 컷을 쓰려면 `NAMES`에 있는 id를 거기에 추가하고 다시 실행합니다.
- 눈 · 코 · 입은 `trace.py`의 `refine_faces`가 얼굴을 찾아 동그란 점 눈 · 점 코 · 짧은 입으로 다시 그립니다(원본 얼굴은 눈이 2~3픽셀이라 변환만으로는 찌그러집니다).

## 컷 하나를 고해상도로 바꾸기

`assets/art-override/{id}.png`(또는 `.webp` `.jpg`)를 넣고 다시 실행하면 그 컷만 시트 대신 이 그림으로 만들어집니다.
흰 바탕에 검은 선, 포인트는 노랑이면 되고, 머리글 · 캡션 없이 그림만 있어야 합니다. 같은 변환(선 · 종이 · 포인트 · 머리, 얼굴 보정)을 거치므로 코드는 바꿀 필요가 없습니다.
