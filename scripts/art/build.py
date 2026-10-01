"""Builds public/art from the traced sheet (assets/art-sheet.webp).

  python3 -m venv .venv && .venv/bin/pip install pillow numpy opencv-python-headless scipy potracer
  .venv/bin/python scripts/art/build.py

Writes public/art/{id}.svg (light), public/art/dark/{id}.svg and public/art/tile/{id}-{tint}.svg
(on a hub tint, for covers and thumbnails), and src/art/catalog.ts. Colour classes: fp paper, fa accent,
fl line, fh solid ink; the same classes as the old hand-drawn kit.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from trace import svg_for  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent.parent
OUT = ROOT / 'public' / 'art'

# Cell index on the sheet -> scene id. Cells left out are duplicates of a cleaner one.
NAMES = {
    0: 'restaurant-exterior', 1: 'outdoor-bistro', 2: 'beer-break', 3: 'coffee-break', 4: 'snack-break', 5: 'dining-plate',
    6: 'table-rest', 7: 'cafe-table', 8: 'beer-standing', 9: 'snack-bite', 10: 'coffee-cup', 11: 'wine-tasting',
    12: 'restaurant-menu', 13: 'paying-bill', 14: 'landmark-paris', 15: 'landmark-paris-2', 16: 'landmark-newyork',
    17: 'landmark-egypt', 18: 'landmark-london', 19: 'landmark-japan', 20: 'landmark-japan-2', 21: 'landmark-paris-3',
    24: 'landmark-egypt-2', 27: 'landmark-japan-torii', 28: 'itinerary-empty', 29: 'itinerary-empty-2', 30: 'pocket-empty',
    31: 'search-location', 32: 'search-pin', 33: 'no-results', 34: 'map-looking', 35: 'backpacking', 36: 'luggage-travel',
    37: 'photo-memory', 38: 'train-journey', 39: 'train-station', 40: 'departure-board', 41: 'waiting-gate',
    42: 'backpacking-2', 43: 'luggage-travel-2', 44: 'photo-memory-2', 46: 'bike-ride', 47: 'bike-ride-2',
    48: 'window-waiting', 49: 'city-walk', 50: 'tourist-guide', 52: 'public-transport', 53: 'public-transport-2',
    54: 'museum-visit', 55: 'museum-visit-2', 56: 'resort-hammock', 57: 'beach-relaxation', 58: 'beach-relaxation-2',
    59: 'beach-surfing', 60: 'swimming', 61: 'swimming-2', 62: 'poolside-cocktail', 64: 'beach-drink', 65: 'beach-sit',
    66: 'sofa-rest', 67: 'sleeping', 68: 'cafe-cat', 69: 'window-cat', 70: 'cat-petting-street', 71: 'cat-petting-street-2',
    72: 'cat-petting', 73: 'cat-sofa', 74: 'window-cat-2',
}

TINTS = {'peach': '#F6CDB6', 'butter': '#F7DB6A', 'sage': '#C9D8BC', 'mist': '#DCE3E8', 'lilac': '#E7D7F3'}
LIGHT = dict(line='#141412', paper='#FFFDF9', hair='#141412', accent='#F2B33D')
DARK = dict(line='#EDEAE2', paper='#2A2A25', hair='#0A0A09', accent='#E3A94B')

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

def css(c):
    return (f".fl{{fill:{c['line']}}}.fp{{fill:{c['paper']}}}.fh{{fill:{c['hair']}}}.fa{{fill:{c['accent']}}}"
            f".ks{{fill:none;stroke:{c['line']};stroke-linecap:round;stroke-linejoin:round}}")

def svg(m, c, bg=None):
    vx, vy, s, _ = (int(v) for v in m['vb'].split())
    rect = f'<rect x="{vx}" y="{vy}" width="{s}" height="{s}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{m["vb"]}" width="{s}" height="{s}"><style>{css(c)}</style>{rect}{m["body"]}</svg>'

def main():
    for d in (OUT, OUT / 'dark', OUT / 'tile'):
        d.mkdir(parents=True, exist_ok=True)
        for f in d.glob('*.svg'): f.unlink()
    ids = []
    for idx, name in NAMES.items():
        m = svg_for(idx)
        (OUT / f'{name}.svg').write_text(svg(m, LIGHT))
        (OUT / 'dark' / f'{name}.svg').write_text(svg(m, DARK))
        for tid, tint in TILES:
            if tid == name:
                (OUT / 'tile' / f'{name}-{tint}.svg').write_text(svg(m, LIGHT, TINTS[tint]))
        ids.append(name)
    missing = [t for t, _ in TILES if t not in ids]
    assert not missing, missing
    lines = ["// Generated by scripts/art/build.py from assets/art-sheet.webp. Do not edit by hand.", "",
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
