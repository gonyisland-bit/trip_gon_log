import numpy as np, cv2
from pathlib import Path
from PIL import Image
im = Image.open(Path(__file__).resolve().parent.parent.parent / 'assets' / 'art-sheet.webp').convert('RGB')
print(im.size)
a = np.array(im)
g = a.mean(axis=2)
mask = (g > 225).astype(np.uint8)
# close small gaps, then components
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5,5),np.uint8))
n, lab, stats, cent = cv2.connectedComponentsWithStats(mask)
cells = [tuple(s[:4]) for s in stats[1:] if s[2] > 100 and s[3] > 100 and s[2] < 200 and s[3] < 200]
cells.sort(key=lambda c: (round(c[1]/ 30), c[0]))
print(len(cells))
for c in cells[:16]: print(c)
import json; json.dump([list(map(int,c)) for c in cells], open(Path(__file__).resolve().parent / 'cells.json','w'))
