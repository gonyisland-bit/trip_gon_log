import json, sys, numpy as np, cv2
from scipy import ndimage as ndi
from lib import *

def drop_bottom_specks(mask):
    n, lab, st, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    out = mask.copy()
    for k in range(1, n):
        x,y,w,h,a = st[k]
        if a < 260 and y > 104*S: out[lab == k] = False
    return out


def refine_faces(ink, hair):
    """Faces are a few pixels in the sheet, so traced eyes come out lumpy, doubled or missing. Find each
    face (the gap inside a head of hair), drop what was traced there and draw clean features instead:
    round dot eyes (a missing one mirrored), a small dot nose, a short curved mouth."""
    ink = ink.copy()
    inkU = ink.astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(inkU, connectivity=8)
    hn, hl, hst, _ = cv2.connectedComponentsWithStats(hair.astype(np.uint8), connectivity=8)
    shapes = []
    for k in range(1, hn):
        x, y, w, h, a = hst[k]
        if a < 140 * S * S:
            continue
        comp = hl == k
        top = comp[y:y + max(1, int(h * 0.45))]
        cols = np.where(top.any(axis=0))[0]
        hw = int(cols.max() - cols.min() + 1)
        r0, r1 = y, min(ink.shape[0], y + int(hw * 1.3))
        sub = comp[r0:r1].astype(np.uint8)
        pts = cv2.findNonZero(sub)
        if pts is None:
            continue
        zone = np.zeros_like(sub)
        cv2.fillConvexPoly(zone, cv2.convexHull(pts), 1)
        zone[sub > 0] = 0
        white = zone.astype(bool) & ~ink[r0:r1]
        # the face is the highest white patch inside the hair (below it the neck and the clothes join in)
        wn, wl, wst, _ = cv2.connectedComponentsWithStats(white.astype(np.uint8), connectivity=4)
        cand = [c for c in range(1, wn) if wst[c, cv2.CC_STAT_AREA] >= 40 * S * S and wst[c, cv2.CC_STAT_WIDTH] >= 7 * S]
        if not cand:
            continue
        best = min(cand, key=lambda c: (wst[c, cv2.CC_STAT_TOP], -wst[c, cv2.CC_STAT_AREA]))
        fx, fy, fw, fh, fa = wst[best]
        if fa < 0.06 * zone.sum():
            continue
        face = (wl == best)
        # small standalone ink pieces inside the face
        isl = []
        for j in range(1, n):
            xx, yy, ww, hh, aa = st[j]
            cx, cy = cen[j]
            iy = int(cy) - r0
            if aa > 70 * S * S // 2 or max(ww, hh) > 13 * S or iy < 0 or iy >= face.shape[0]:
                continue
            if not (fx - S <= cx <= fx + fw + S and fy - S <= iy <= fy + fh + S):
                continue
            # inside the face: white on the sides at its row, hair or edge beyond
            if face[max(0, iy - 3 * S):iy + 3 * S, max(0, int(cx) - 6 * S):int(cx) + 6 * S].sum() < 20 * S * S:
                continue
            isl.append(dict(j=j, cx=float(cx), cy=float(iy), w=ww, h=hh, a=aa))
        if not isl:
            continue
        # eyes: the topmost pair on one row, else the topmost piece and its mirror
        isl.sort(key=lambda d: d['cy'])
        pair = None
        for ai in range(len(isl)):
            for bi in range(ai + 1, len(isl)):
                A, B = isl[ai], isl[bi]
                if abs(A['cy'] - B['cy']) <= 0.14 * fh and abs(A['cx'] - B['cx']) >= 0.2 * fw:
                    pair = (A, B); break
            if pair: break
        rest = [d for d in isl]
        def run(row_y, x0):
            """The face's continuous white run on a row around x0: (left, right)"""
            row = face[min(face.shape[0] - 1, max(0, int(row_y)))]
            x0 = int(min(max(x0, 0), len(row) - 1))
            if not row[x0]:
                xs = np.where(row)[0]
                if len(xs) == 0: return x0, x0
                x0 = int(xs[np.argmin(np.abs(xs - x0))])
            l = x0
            while l > 0 and row[l - 1]: l -= 1
            r = x0
            while r < len(row) - 1 and row[r + 1]: r += 1
            return l, r
        eyes = []
        if pair:
            ey = (pair[0]['cy'] + pair[1]['cy']) / 2
            eyes = [(pair[0]['cx'], ey), (pair[1]['cx'], ey)]
            rest = [d for d in isl if d not in pair]
        else:
            A = isl[0]
            l, r = run(A['cy'], A['cx'])
            xc = (l + r) / 2
            mx = 2 * xc - A['cx']
            ok = abs(A['cx'] - xc) > 0.12 * (r - l) and 0 <= int(mx) < face.shape[1] and face[int(A['cy']), int(mx)]
            eyes = [(A['cx'], A['cy'])] + ([(mx, A['cy'])] if ok else [])
            rest = isl[1:]
        eye_y = sum(e[1] for e in eyes) / len(eyes)
        fl_, fr_ = run(eye_y, eyes[0][0])
        fw_row = max(fr_ - fl_, 6 * S)
        r_e = min(max(0.075 * fw_row, 1.3 * S), 3.6 * S)
        fw = fw_row
        below = [d for d in rest if d['cy'] > eye_y + 0.1 * fh]
        below.sort(key=lambda d: d['cy'])
        nose = mouth = None
        if len(below) == 1:
            d = below[0]
            if d['w'] >= 1.5 * d['h'] or d['w'] > 0.26 * fw or d['cy'] > eye_y + 0.5 * (fy + fh - eye_y):
                mouth = d
            else:
                nose = d
        elif len(below) >= 2:
            nose, mouth = below[0], below[-1]
        for d in isl:
            ink[lab == d['j']] = False
        for ex, ey in eyes:
            shapes.append(f'<circle class="fl" cx="{ex:.0f}" cy="{ey + r0:.0f}" r="{r_e:.1f}"/>')
        if nose:
            shapes.append(f'<circle class="fl" cx="{nose["cx"]:.0f}" cy="{nose["cy"] + r0:.0f}" r="{r_e * 0.55:.1f}"/>')
        if mouth:
            mw = min(max(mouth['w'], 0.22 * fw), 0.4 * fw)
            mx_, my_ = mouth['cx'], mouth['cy'] + r0
            shapes.append(f'<path class="ks" style="stroke-width:{max(1.0 * S * 0.7, r_e * 0.75):.1f}" d="M{mx_ - mw / 2:.0f},{my_:.0f}Q{mx_:.0f},{my_ + mw * 0.45:.0f} {mx_ + mw / 2:.0f},{my_:.0f}"/>')
    return ink, ''.join(shapes)

def layers(i):
    cell = crop(i)
    ink = drop_bottom_specks(black_mask(cell, thr=134, blur=1.1))
    # solid areas (hair, awning stripes, lenses): wider than any line, kept a little inside so a light ring remains in the dark
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (27, 27))
    hair_open = cv2.morphologyEx(ink.astype(np.uint8), cv2.MORPH_OPEN, k)
    ink, face_svg = refine_faces(ink, hair_open > 0)
    thick = cv2.erode(hair_open, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))) > 0
    # paper: the picture's silhouette with the gaps closed and the inside filled
    closed = cv2.morphologyEx(ink.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21)))
    paper = ndi.binary_fill_holes(closed > 0)
    paper = cv2.erode(paper.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))) > 0
    # accent
    ym = yellow_mask(cell)
    yb = cv2.resize(ym.astype(np.float32), (CW*S, CH*S), interpolation=cv2.INTER_CUBIC)
    yb = cv2.GaussianBlur(yb, (0,0), 2.0) > 0.45
    yb = cv2.dilate(yb.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7,7))) > 0
    return ink, thick, paper, yb, face_svg

def svg_for(i):
    ink, thick, paper, yb, face_svg = layers(i)
    ys, xs = np.where(ink)
    if len(xs) == 0: return None
    x0,x1,y0,y1 = xs.min(), xs.max(), ys.min(), ys.max()
    bw, bh = x1-x0, y1-y0
    s = max(bw, bh) + 70
    vx = int((x0+x1)/2 - s/2); vy = int((y0+y1)/2 - s/2)
    parts = []
    if paper.any(): parts.append(f'<path class="fp" d="{to_path(paper, turd=200, opt=1.2)}"/>')
    if yb.any():
        d = to_path(yb, turd=40, opt=0.8)
        if d: parts.append(f'<path class="fa" d="{d}"/>')
    parts.append(f'<path class="fl" fill-rule="evenodd" d="{to_path(ink, turd=40, opt=0.9)}"/>')
    parts.append(face_svg)
    if thick.any():
        d = to_path(thick, turd=120, opt=0.9)
        if d: parts.append(f'<path class="fh" fill-rule="evenodd" d="{d}"/>')
    return dict(vb=f'{vx} {vy} {int(s)} {int(s)}', body=''.join(parts))

if __name__ == '__main__':
    meta = {}
    for i in range(len(CELLS)):
        r = svg_for(i)
        if r: meta[i] = r
    json.dump(meta, open(HERE / 'traced.json','w'))
    print(len(meta), sum(len(v['body']) for v in meta.values())//1024, 'KB')
