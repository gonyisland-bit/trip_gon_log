"""Builds public/art from the illustrations in assets/illust (full-colour flat pictures of the bear).

  python3 -m venv .venv && .venv/bin/pip install pillow numpy scipy
  .venv/bin/python scripts/art/build.py

Writes public/art/{id}.webp (the scene, transparent where the picture stood on white), public/art/tile/{id}-{tint}.svg
(the scene on a hub tint, square, for covers and thumbnails; a plain path so it also works stored as a cover) and
src/art/catalog.ts. The source pictures are portrait JPEGs; each one is cleaned here: the caption some of them carry is
cut off, a white ground is made transparent, and a picture that fills its frame (a room, a pool) is cut to a window around
the bear and given round corners.
"""
import base64, io
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent.parent
SRC = ROOT / 'assets' / 'illust'
OUT = ROOT / 'public' / 'art'

# scene id -> source file
FILES = {
    'restaurant-exterior': 'restaurant-exterior.jpg', 'outdoor-bistro': 'Teal_bear_sitting_at_cafe_20261001215430.jpg',
    'beer-break': 'beer-break.jpg', 'coffee-break': 'coffee-break1.jpg', 'snack-break': 'Teal_bear_eating_snack_20261001215430_2.jpg',
    'dining-plate': 'dining-plate.jpg', 'cafe-table': 'cafe-table.jpg', 'beer-standing': 'beer-standing.jpg',
    'snack-bite': 'snack-bite.jpg', 'coffee-cup': 'coffee-cup.jpg', 'wine-tasting': 'wine-tasting.jpg',
    'restaurant-menu': 'restaurant-menu.jpg', 'paying-bill': 'paying-bill.jpg', 'landmark-paris': 'landmark-paris.jpg',
    'landmark-newyork': 'landmark-newyork.jpg', 'landmark-egypt': 'landmark-egypt.jpg', 'landmark-japan-torii': 'landmark-japan-torii.jpg',
    'landmark-london': 'landmark-london.jpg', 'landmark-japan': 'landmark-japan.jpg', 'terminal-airport': 'terminal-airport.jpg',
    'itinerary-empty': 'itinerary-empty.jpg', 'pocket-empty': 'pocket-empty.jpg', 'no-results': 'no-results.jpg',
    'map-looking': 'map-looking.jpg', 'backpacking': 'backpacking.jpg', 'luggage-travel': 'luggage-travel.jpg',
    'photo-memory': 'photo-memory.jpg', 'train-journey': 'train-journey.jpg', 'train-station': 'train-station.jpg',
    'departure-board': 'departure-board.jpg', 'waiting-gate': 'waiting-gate.jpg', 'window-waiting': 'window-waiting.jpg',
    'friends-pair': 'Two_bears_high_fiving_20261001235729.jpg', 'trash-empty': 'Teal_bear_holding_broom_20261001235729.jpg',
    'error-oops': 'Teal_bear_holding_snapped_cable_20261001235729.jpg', 'offline': 'Teal_bear_holding_umbrella_20261001235729.jpg',
    'boarding-done': 'Teal_bear_waving_boarding_pass_20261001235729.jpg', 'settlement-done': 'Teal_bear_giving_thumbs_up_20261001235729.jpg',
    'calendar-empty': 'Bear_hugging_blank_calendar_20261001235729.jpg', 'notice-bell': 'Teal_bear_dozing_near_bell_20261001235729.jpg',
    'welcome-passport': 'Bear_holding_passport_and_suitcase_20261001235729.jpg', 'magazine-cover': 'Bear_holding_open_magazine_20261001235729.jpg',
    'season-spring': 'Teal_bear_holding_cherry_branch_20261001235729.jpg', 'season-summer': 'Teal_bear_holding_popsicle_20261001235729.jpg',
    'season-autumn': 'Teal_bear_wearing_autumn_scarf_20261001235729.jpg', 'season-winter': 'Teal_bear_wearing_winter_gear_20261001235729.jpg',
    'weather-rain': 'Teal_bear_holding_yellow_umbrella_20261001235729.jpg', 'weather-snow': 'Bear_catching_snowflakes_20261001235729.jpg',
    'backpacking-2': 'backpacking-2.jpg',
    'luggage-travel-2': 'luggage-travel-2.jpg', 'photo-memory-2': 'photo-memory-2.jpg', 'bike-ride': 'bike-ride.jpg',
    'city-walk': 'city-walk.jpg', 'tourist-guide': 'tourist-guide.jpg',
    'public-transport': 'public-transport1.jpg', 'public-transport-2': 'public-transport2.jpg', 'museum-visit': 'museum-visit.jpg',
    'museum-visit-2': 'museum-visit-2.jpg', 'resort-hammock': 'resort-hammock.jpg', 'beach-relaxation': 'beach-relaxation.jpg',
    'beach-relaxation-2': 'beach-relaxation-2.jpg', 'beach-surfing': 'beach-surfing.jpg', 'swimming': 'swimming.jpg',
    'poolside-cocktail': 'poolside-cocktail.jpg', 'beach-drink': 'beach-drink1.jpg', 'sofa-rest': 'sofa-rest.jpg', 'sleeping': 'sleeping.jpg',
    # app states (v1.3.8): uploading, empty receipts, saved, invitations, published, first photo, lost
    'uploading-photo': 'Bear_carrying_framed_photo_20261002174915.jpg', 'receipt-empty': 'Bear_examining_receipt_paper_20261002174915.jpg',
    'done-check': 'Bear_holding_green_checkmark_20261002174915.jpg', 'invite-letter': 'Teal_bear_holding_envelope_20261002174915.jpg',
    'publish-done': 'Teal_bear_holding_magazine_20261002174915.jpg', 'photo-add': 'Teal_bear_standing_near_frame_20261002174915.jpg',
    'lost-guide': 'Two_bears_waving_and_confused_20261002174915.jpg',
}

# Pictures that carry a caption under the art: rows from this one down are dropped
CAPTION_FROM = {
    'backpacking-2': 1100, 'beach-drink': 1260, 'beer-break': 1000, 'luggage-travel-2': 970, 'map-looking': 1100,
    'photo-memory-2': 1000, 'public-transport': 990, 'resort-hammock': 1030, 'restaurant-menu': 960, 'sleeping': 1020,
    'snack-bite': 1130, 'sofa-rest': 910, 'window-waiting': 1060, 'wine-tasting': 1030,
    'friends-pair': 1030, 'error-oops': 1060, 'season-spring': 1050, 'season-summer': 1100, 'season-autumn': 1130, 'season-winter': 1160,
}

# Pictures that fill their frame: the window (x0, y0, x1, y1) kept around the bear; they become a rounded card
CARDS = {
    'coffee-cup': (0, 300, 768, 1260), 'departure-board': (0, 60, 768, 1290), 'waiting-gate': (42, 252, 768, 960), 'landmark-japan': (0, 250, 768, 1250), 'landmark-egypt': (0, 300, 768, 1260),
    'poolside-cocktail': (0, 200, 768, 1160), 'restaurant-exterior': (0, 200, 768, 1160), 'swimming': (0, 300, 768, 1180),
    'train-journey': (0, 250, 768, 1250), 'public-transport-2': (0, 130, 768, 1075),
    'boarding-done': (40, 240, 768, 1215), 'landmark-paris': (0, 140, 768, 1300), 'museum-visit-2': (0, 300, 768, 1180),
}

# Pictures with a white pocket the ground cannot reach (between a staff and an arm): enclosed pure white above this size is dropped too
HOLES = {'backpacking-2': 1500, 'friends-pair': 1500}

# A caption printed beside the art, not under it: boxes (x0, y0, x1, y1) painted white before the ground is cut
ERASE = {'offline': [(330, 860, 768, 1040)]}

# A wide picture used whole (the terminal's window): no cut, no corners
WIDE = {'terminal-airport'}

TINTS = {'peach': '#F6CDB6', 'butter': '#F7DB6A', 'sage': '#C9D8BC', 'mist': '#DCE3E8', 'lilac': '#E7D7F3'}

# What a place or plan item looks like, by kind (src/utils/placeArt.ts picks one scene by seed).
# Each kind sits on one hub tint, so a tile exists once per scene, not once per tint.
KIND_ART = {
    'beach': ['beach-relaxation', 'beach-relaxation-2', 'beach-surfing', 'swimming', 'resort-hammock', 'poolside-cocktail'],
    'mountain': ['backpacking', 'backpacking-2', 'map-looking'],
    'city': ['city-walk', 'tourist-guide', 'public-transport-2'],
    'temple': ['landmark-japan', 'landmark-japan-torii', 'museum-visit-2'],
    'meal': ['restaurant-exterior', 'outdoor-bistro', 'dining-plate', 'restaurant-menu'],
    'cafe': ['coffee-break', 'coffee-cup', 'cafe-table'],
    'landmark': ['landmark-paris', 'landmark-newyork', 'landmark-london', 'landmark-egypt', 'landmark-japan'],
    'stay': ['resort-hammock', 'sofa-rest', 'sleeping'],
    'transit': ['train-journey', 'public-transport', 'train-station', 'bike-ride'],
    'shopping': ['luggage-travel', 'luggage-travel-2', 'paying-bill'],
    'night': ['wine-tasting', 'beer-break', 'beer-standing'],
    'art': ['museum-visit', 'museum-visit-2', 'photo-memory'],
    'market': ['outdoor-bistro', 'snack-break', 'snack-bite'],
    'activity': ['bike-ride', 'beach-surfing', 'swimming', 'photo-memory-2'],
}
KIND_TINT = {
    'beach': 'mist', 'mountain': 'sage', 'city': 'lilac', 'temple': 'peach', 'meal': 'butter', 'cafe': 'peach', 'landmark': 'mist',
    'stay': 'sage', 'transit': 'mist', 'shopping': 'lilac', 'night': 'lilac', 'art': 'peach', 'market': 'butter', 'activity': 'sage',
}
TILES = sorted({(i, KIND_TINT[k]) for k, ids in KIND_ART.items() for i in ids})

SCENE_MAX = 640      # longest side of a scene, px
TILE_ART = 400       # longest side of the art inside a tile, px (the tile itself is a 320 unit square)
WATERMARK = 1296     # the source pictures carry a faint mark in the bottom corner; nothing below this row is used


def load(name):
    return np.array(Image.open(SRC / FILES[name]).convert('RGB'))[:WATERMARK]


def cut_ground(rgb, holes=0):
    """RGBA of a picture standing on white: the white that touches the edge is dropped, whites inside stay.
    Colour under the transparent part is copied from the nearest picture pixel so resizing leaves no halo."""
    near_white = rgb.min(axis=2) >= 236
    lab, _ = ndi.label(near_white)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    ground = np.isin(lab, edge[edge > 0])
    if holes:
        white = rgb.min(axis=2) >= 246
        wl, wn = ndi.label(white)
        sizes = ndi.sum(white, wl, index=np.arange(1, wn + 1))
        for k in np.where(sizes >= holes)[0]:
            ground |= wl == k + 1
    solid = ~ground
    # specks (compression noise, the corner mark) are not part of the picture
    sl, n = ndi.label(solid)
    if n:
        sizes = ndi.sum(solid, sl, index=np.arange(1, n + 1))
        for k in np.where(sizes < 120)[0]:
            solid[sl == k + 1] = False
    core = ndi.binary_erosion(solid, iterations=1)
    alpha = ndi.gaussian_filter(core.astype(np.float32), 0.7)
    _, (iy, ix) = ndi.distance_transform_edt(~core, return_indices=True)
    out = np.dstack([rgb[iy, ix], (alpha * 255).astype(np.uint8)])
    ys, xs = np.where(solid)
    pad = int(0.06 * max(ys.max() - ys.min(), xs.max() - xs.min()))
    y0, y1 = max(0, ys.min() - pad), min(out.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(out.shape[1], xs.max() + pad + 1)
    return Image.fromarray(out[y0:y1, x0:x1], 'RGBA')


def rounded(im, frac=0.055):
    w, h = im.size
    k = 4
    m = Image.new('L', (w * k, h * k), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w * k - 1, h * k - 1), radius=int(min(w, h) * frac * k), fill=255)
    out = im.convert('RGBA')
    out.putalpha(m.resize((w, h), Image.LANCZOS))
    return out


def fit(im, longest):
    w, h = im.size
    s = longest / max(w, h)
    return im if s >= 1 else im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)


def webp_b64(im, q=82, alpha=True):
    buf = io.BytesIO()
    (im if alpha else im.convert('RGB')).save(buf, 'WEBP', quality=q, method=6)
    return base64.b64encode(buf.getvalue()).decode()


def scene_for(name):
    """(scene image, tile image, tile art is a full square picture)"""
    if name in WIDE:
        return fit(Image.fromarray(np.array(Image.open(SRC / FILES[name]).convert('RGB'))), 1200), None, False
    if name in CARDS:
        x0, y0, x1, y1 = CARDS[name]
        card = Image.fromarray(load(name)[y0:y1, x0:x1])
        w, h = card.size
        s = min(w, h)
        sq = card.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))
        return rounded(fit(card, SCENE_MAX)), fit(sq, 480), True
    rgb = load(name)
    for x0, y0, x1, y1 in ERASE.get(name, []):
        rgb[y0:y1, x0:x1] = 255
    if name in CAPTION_FROM:
        rgb = rgb[:CAPTION_FROM[name]]
    art = cut_ground(rgb, HOLES.get(name, 0))
    return fit(art, SCENE_MAX), fit(art, TILE_ART), False


def tile_svg(tile, full, tint):
    s = 320
    if full:
        x = y = 0
        w = h = s
    else:
        k = 0.84 * s / max(tile.size)
        w, h = tile.size[0] * k, tile.size[1] * k
        x, y = (s - w) / 2, (s - h) / 2
    img = f'<image x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" href="data:image/webp;base64,{webp_b64(tile, 80, not full)}"/>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {s} {s}" width="{s}" height="{s}"><rect width="{s}" height="{s}" fill="{TINTS[tint]}"/>{img}</svg>'


def main():
    (OUT / 'tile').mkdir(parents=True, exist_ok=True)
    for d in (OUT, OUT / 'tile'):
        for f in list(d.glob('*.svg')) + list(d.glob('*.webp')):
            f.unlink()
    dark = OUT / 'dark'
    if dark.exists():
        for f in dark.glob('*'):
            f.unlink()
        dark.rmdir()
    used = {i for ids in KIND_ART.values() for i in ids}
    assert used <= set(FILES), sorted(used - set(FILES))
    ids = list(FILES)
    made = {}
    for name in ids:
        scene, tile, full = scene_for(name)
        made[name] = (tile, full)
        scene.save(OUT / f'{name}.webp', 'WEBP', quality=84, method=6)
    for name, tint in TILES:
        tile, full = made[name]
        (OUT / 'tile' / f'{name}-{tint}.svg').write_text(tile_svg(tile, full, tint))
    lines = ["// Generated by scripts/art/build.py from assets/illust. Do not edit by hand.", "",
             "export const ART_IDS = ["] + [f"  '{i}'," for i in ids] + ["] as const;", "",
             "export type ArtId = typeof ART_IDS[number];", "",
             "export type ArtTint = 'peach' | 'butter' | 'sage' | 'mist' | 'lilac';", "",
             "/** Scenes for what a place or plan item is like; each kind sits on one hub tint (public/art/tile) */",
             "export const KIND_ART: Record<string, readonly ArtId[]> = {"]
    lines += [f"  {k}: [" + ", ".join(f"'{i}'" for i in v) + "]," for k, v in KIND_ART.items()]
    lines += ["};", "", "export const KIND_TINT: Record<string, ArtTint> = {"]
    lines += [f"  {k}: '{v}'," for k, v in KIND_TINT.items()]
    lines += ["};", ""]
    (ROOT / 'src' / 'art').mkdir(exist_ok=True)
    (ROOT / 'src' / 'art' / 'catalog.ts').write_text("\n".join(lines))
    print(len(ids), 'scenes,', len(TILES), 'tiles')


if __name__ == '__main__':
    main()
