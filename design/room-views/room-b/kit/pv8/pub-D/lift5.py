# The lift: the pieces a PLACE edit painted, taken off their picture as layers, by the Lead's recipe of 18 November 2026: d, the
# largest of |placed - start| over R, G and B; the pixels where d is above 16, inside the PLACE mask; closed with a 7 x 7 max then a
# 7 x 7 min, kept inside the mask; holes filled; parts smaller than 400 px dropped; feathered with a 1 px Gaussian (Pillow's
# GaussianBlur(1)); clipped to the mask. On PV5-A-3 it gives the Lead's three parts (62,642, 14,331 and 4,747 px). NumPy and Pillow only. Imported by fix5_tools.py's lift and by the PV5-A page's build; run alone it lifts PV5-A-3's
# pieces from the records page's files and prints the parts. Usage: python3 -I lift5.py <records folder>
import numpy as np
from PIL import Image, ImageFilter
THRESH, CLOSE_R, MIN_PX = 16, 3, 400
def grow(a, r):   # the square max filter, (2r + 1) x (2r + 1), on a binary mask (outside the picture counts as empty)
    out = a.copy()
    for d in range(1, r + 1): out[d:, :] |= a[:-d, :]; out[:-d, :] |= a[d:, :]
    a2 = out.copy()
    for d in range(1, r + 1): out[:, d:] |= a2[:, :-d]; out[:, :-d] |= a2[:, d:]
    return out
def shrink(a, r): return ~grow(~a, r)   # the square min filter (outside the picture counts as full)
def parts(m, conn=8):
    # connected parts of a binary mask, by row runs and union-find: (labels, sizes), label 0 the background
    H, W = m.shape; parent = []; rows = []; prev = None; k = 1 if conn == 8 else 0
    def find(i):
        while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
        return i
    for y in range(H):
        r = m[y]
        if not r.any(): rows.append(None); prev = None; continue
        d = np.diff(np.concatenate(([0], r.astype(np.int8), [0]))); s = np.where(d == 1)[0]; e = np.where(d == -1)[0]
        ids = list(range(len(parent), len(parent) + len(s))); parent.extend(ids)
        if prev is not None:
            ps, pe, pid = prev; j = 0
            for i in range(len(s)):
                while j < len(ps) and pe[j] + k <= s[i]: j += 1
                jj = j
                while jj < len(ps) and ps[jj] < e[i] + k:
                    a, b = find(ids[i]), find(pid[jj])
                    if a != b: parent[b] = a
                    jj += 1
        prev = (s, e, ids); rows.append(prev)
    lab = np.zeros((H, W), np.int32); sizes = [0]; roots = {}
    for y, rr in enumerate(rows):
        if rr is None: continue
        s, e, ids = rr
        for i in range(len(s)):
            t = find(ids[i]); L = roots.get(t)
            if L is None: L = roots[t] = len(sizes); sizes.append(0)
            lab[y, s[i]:e[i]] = L; sizes[L] += int(e[i] - s[i])
    return lab, np.array(sizes)
def fill_holes(m, conn=4):   # background parts that do not reach the picture's edge become foreground
    lab, _ = parts(~m, conn); edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    return m | ((lab > 0) & ~np.isin(lab, edge))
def drop_small(m, min_px=MIN_PX, conn=8):
    lab, sizes = parts(m, conn); keep = sizes >= min_px; keep[0] = False
    return keep[lab]
def matte(start, placed, mask, thresh=THRESH, close_r=CLOSE_R, min_px=MIN_PX, fill_conn=4, part_conn=8):
    """start, placed: H x W x 3 uint8; mask: H x W bool, True = the PLACE area. Returns (binary, alpha 0..1)."""
    d = np.abs(placed.astype(np.int16) - start.astype(np.int16)).max(axis=2)
    b = (d > thresh) & mask
    b = shrink(grow(b, close_r), close_r) & mask   # the closing may reach past the mask: clipped
    b = fill_holes(b, fill_conn) & mask
    b = drop_small(b, min_px, part_conn)
    a = np.array(Image.fromarray((b * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))).astype(np.float64) / 255
    return b, a * mask
def rebuild(start, placed, alpha):   # the start picture with the lifted pieces over it
    a = alpha[..., None]; return np.clip(np.rint(placed * a + start * (1 - a)), 0, 255).astype(np.uint8)
if __name__ == '__main__':
    import os, sys, json
    F = sys.argv[1]; rgb = lambda p: np.array(Image.open(os.path.join(F, p)).convert('RGB'))
    s1, a3 = rgb('img/PV5-A-3-s1.png'), rgb('img/PV5-A-3.png'); m = np.array(Image.open(os.path.join(F, 'check/PV5-A-3-S2-mask.png')))[..., 3] < 128
    b, a = matte(s1, a3, m); lab, sizes = parts(b)
    out = []
    for L in range(1, len(sizes)):
        ys, xs = np.where(lab == L); out.append({'px': int(sizes[L]), 'x': [int(xs.min()), int(xs.max())], 'y': [int(ys.min()), int(ys.max())]})
    r = rebuild(s1, a3, a); diff = np.abs(r.astype(int) - a3)
    print(json.dumps({'parts': sorted(out, key=lambda p: p['x'][0]), 'binaryPx': int(b.sum()), 'outsideMask': int((b & ~m).sum()), 'rebuildMeanAbsDiff': round(float(diff.mean()), 4), 'rebuildMeanMaxChannel': round(float(diff.max(axis=2).mean()), 4)}, indent=1))
