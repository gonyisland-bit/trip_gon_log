import json, numpy as np, cv2, potrace
from PIL import Image
from pathlib import Path
HERE = Path(__file__).resolve().parent
SRC = str(HERE.parent.parent / 'assets' / 'art-sheet.webp')
IM = np.array(Image.open(SRC).convert('RGB'))
CELLS = json.load(open(HERE / 'cells.json'))
S = 5            # upscale for tracing
CW, CH = 132, 136

def crop(i):
    x,y,w,h = CELLS[i]
    cell = IM[y:y+CH, x:x+CW].copy()
    # beyond the cream card (the sheet's black ground) is not part of the picture
    hh = min(h, CH) - 2
    cell[hh:, :] = 245
    cell[:, :1] = 245; cell[:, -1:] = 245
    return cell

def clean_gray(cell):
    """Gray picture with the header, captions and numbers painted out"""
    g = cv2.cvtColor(cell, cv2.COLOR_RGB2GRAY)
    small = (g < 110).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(small, connectivity=8)
    drop = np.zeros_like(small)
    for k in range(1, n):
        x,y,w,h,a = st[k]
        if y + h <= 29 or (y >= 106 and h < 10 and w < 60):
            drop[lab == k] = 1
    drop = cv2.dilate(drop, np.ones((5,5), np.uint8))
    g = g.copy(); g[:28, :] = 245
    g[drop > 0] = 245
    return g

def black_mask(cell, thr=138, blur=0.9):
    g = clean_gray(cell)
    big = cv2.resize(g, (CW*S, CH*S), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    big = cv2.GaussianBlur(big, (0,0), blur)
    return big < thr

def yellow_mask(cell):
    hsv = cv2.cvtColor(cell, cv2.COLOR_RGB2HSV)
    h,s,v = hsv[...,0], hsv[...,1], hsv[...,2]
    m = ((h >= 12) & (h <= 32) & (s > 90) & (v > 150)).astype(np.uint8)
    # drop the header logo (top-left)
    m[:29,:] = 0
    return m

def to_path(mask, turd=30, opt=0.5):
    bm = potrace.Bitmap(~mask)
    pl = bm.trace(turdsize=turd, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.05, opticurve=True, opttolerance=opt)
    out=[]
    f=lambda p: f"{p.x:.0f},{p.y:.0f}"
    for c in pl:
        out.append("M"+f(c.start_point))
        for s in c.segments:
            if s.is_corner: out.append("L"+f(s.c)+"L"+f(s.end_point))
            else: out.append("C"+f(s.c1)+" "+f(s.c2)+" "+f(s.end_point))
        out.append("Z")
    return "".join(out)
