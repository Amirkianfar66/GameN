# Probe (not published): pixels of each view's own station and pieces in the painting and in each phone's slice. Usage: python3 -I probe.py C
import json, sys, os
import numpy as np
W, H = 1024, 1536
def raster(polys):
    m = np.zeros((H, W), bool)
    for poly in polys:
        P = np.array(poly, float); x0, y0 = P[:, 0], P[:, 1]; x1, y1 = np.roll(x0, -1), np.roll(y0, -1)
        for r in range(max(0, int(np.floor(y0.min()))), min(H, int(np.ceil(y0.max())) + 1)):
            yc = r + 0.5; cross = ((y0 <= yc) & (y1 > yc)) | ((y1 <= yc) & (y0 > yc))
            if not cross.any(): continue
            xs = np.sort(x0[cross] + (yc - y0[cross]) * (x1[cross] - x0[cross]) / (y1[cross] - y0[cross]))
            for a, b in zip(xs[0::2], xs[1::2]):
                lo, hi = min(W, max(0, int(np.ceil(a - 0.5)))), min(W, max(0, int(np.ceil(b - 0.5))))
                if hi > lo: m[r, lo:hi] = True
    return m
V = sys.argv[1]; d = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), f'_probe-{V}.json')))
def report(name, polys):
    m = np.zeros((H, W), bool)
    for p in polys: m |= raster([p])
    row = {'painting': int(m.sum())}
    if m.any():
        ys, xs = np.where(m); row['bbox'] = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    for k, (x0, y0, x1, y1) in d['slices'].items():
        row[k] = int(m[max(0, int(round(y0))):int(round(y1)), max(0, int(round(x0))):int(round(x1))].sum())
    print(f'  {name}: {row}')
print('== view', V, '| own station (left out):')
for n, pp in d['own'].items(): report(n, pp)
print('   pieces:')
for n, pp in d['pieces'].items(): report(n, pp)
