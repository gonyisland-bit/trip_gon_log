"""Builds the terminal window's layers (v1.3.8) from assets/illust/terminal-lobby.jpg and bear-suitcase.jpg.

  .venv/bin/python scripts/art/terminal.py

Writes
  public/art/terminal-lobby.webp   the lobby with the sky beyond the glass cut out, so the app's own sky shows through
  public/art/terminal-outside.webp a mask of everything seen through the glass (sky and apron), for the night tint
  public/art/bear-suitcase.webp    the bear pulling a suitcase, facing right, on a transparent ground
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent.parent
SRC = ROOT / 'assets' / 'illust'
OUT = ROOT / 'public' / 'art'

LOBBY_W = 1600          # output width of the lobby; the window is at most ~1500 device px wide
HORIZON = 652           # below this row the far hills and the apron begin; only sky above it is cut
WINDOW = (0, 112, 1885, 1112)   # the glass wall (x0, y0, x1, y1) in the source, up to the café's menu board
SIGNS = [(125, 172, 572, 292), (667, 172, 1355, 485), (1885, 365, 2000, 1500), (1630, 1010, 1885, 1500)]  # gate sign, board, café board and counter: never outside
SPARKLE = (1840, 1340, 1960, 1450)   # the generator's mark on the floor, painted over


def lobby():
    img = Image.open(SRC / 'terminal-lobby.jpg').convert('RGB')
    a = np.array(img).astype(np.int16)
    h, w, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]

    # The mark on the floor: copy the floor just left of it (the floor only changes from top to bottom)
    x0, y0, x1, y1 = SPARKLE
    a[y0:y1, x0:x1] = a[y0:y1, x0 - 160:x1 - 160]

    ys = np.arange(h)[:, None]
    xs = np.arange(w)[None, :]
    in_window = (xs >= WINDOW[0]) & (xs < WINDOW[2]) & (ys >= WINDOW[1]) & (ys < WINDOW[3])
    not_sign = np.ones((h, w), bool)
    for sx0, sy0, sx1, sy1 in SIGNS:
        not_sign &= ~((xs >= sx0) & (xs < sx1) & (ys >= sy0) & (ys < sy1))

    # Sky: the pale blue (and the lighter streaks of glare on it) above the horizon, in large patches (a pane or the
    # part of one below a sign); small bluish specks elsewhere stay
    bluish = (b - r > 12) & (b > 205) & (g > 180)
    sky = bluish & in_window & not_sign & (ys < HORIZON)
    lab, n = ndi.label(sky)
    sizes = ndi.sum(sky, lab, range(1, n + 1))
    sky = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v > 3000])
    sky = ndi.binary_fill_holes(sky) & in_window & not_sign & (ys < HORIZON + 2)
    # Small specks inside the sky that are not sky-blue (a lamp's glare) stay; the edge is softened by a pixel
    alpha = np.where(sky, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.8))

    rgba = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert('RGBA')
    rgba.putalpha(alpha_img)
    out_h = round(h * LOBBY_W / w)
    rgba.resize((LOBBY_W, out_h), Image.LANCZOS).save(OUT / 'terminal-lobby.webp', quality=84, method=6)

    # Outside: the glass wall minus its frames, the signs and the seats in front of it
    frame = (np.abs(r - 86) < 26) & (np.abs(g - 118) < 26) & (np.abs(b - 129) < 26)
    seat = (r - b > 45)              # the seats, the café's roof and counter: all warm brown
    lamp = (xs > 1640) & (np.abs(r - g) < 14) & (np.abs(g - b) < 14) & (r < 150)
    dark = (r + g + b) < 200
    outside = in_window & not_sign & ~frame & ~seat & ~dark & ~lamp
    outside = ndi.binary_opening(outside, iterations=2)
    m = Image.fromarray(np.where(outside, 255, 0).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    m = m.resize((400, round(h * 400 / w)), Image.LANCZOS)
    mask = Image.new('RGBA', m.size, (0, 0, 0, 0))
    mask.putalpha(m)
    mask.save(OUT / 'terminal-outside.webp', lossless=True, method=6)
    print('lobby', LOBBY_W, out_h, 'sky px', int(sky.sum()))


def bear():
    a = np.array(Image.open(SRC / 'bear-suitcase.jpg').convert('RGB')).astype(np.int16)
    white = (a.min(axis=2) > 236)
    lab, _ = ndi.label(white)
    ground = np.isin(lab, np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    ground &= white
    alpha = np.where(ground, 0, 255).astype(np.uint8)
    # Anti-aliased edge: near-white pixels touching the ground fade with their lightness
    edge = ndi.binary_dilation(ground, iterations=2) & ~ground
    light = a.min(axis=2)
    alpha[edge] = np.clip((255 - light[edge]) * 255 // 60, 0, 255).astype(np.uint8)
    rgba = Image.fromarray(a.astype(np.uint8)).convert('RGBA')
    rgba.putalpha(Image.fromarray(alpha))
    box = Image.fromarray(alpha).point(lambda v: 255 if v > 24 else 0).getbbox()
    rgba = rgba.crop(box)
    hgt = 300
    rgba = rgba.resize((round(rgba.width * hgt / rgba.height), hgt), Image.LANCZOS)
    rgba.save(OUT / 'bear-suitcase.webp', quality=88, method=6)
    print('bear', rgba.size)


if __name__ == '__main__':
    lobby()
    bear()
