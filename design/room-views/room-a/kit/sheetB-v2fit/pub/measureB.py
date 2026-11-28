# Sheet RA-B version 2: the painted floor lines of RA-B-1, view B's AI-generated step-1 picture, measured for the fit the Lead set on
# 27 November ("where the back wall's base and far corner are more than 16 px off the guide, the desk's mask and Vega's foot line
# follow the painting"). Picture pixels of the 1024 x 1536 painting.
#   the back wall's foot: the foot of its rust kick strip, column by column (OKLCH rust: hue 15-70, chroma 0.045 or more, lightness
#     0.25-0.75; the longest run of rust rows within 55 px under 930-1040, at least 5 rows), and a straight line through those from
#     x 420 to 900 (a first fit, then the readings within 6 px of it)
#   the far corner: the darkest column between x 340 and 420, averaged over rows 560-960 (the corner's dark seam)
#   the far deck seam (the seam 1 m from the back wall): the darkest straight line within 18 px of y 1068 + 0.033 (x - 255) over
#     x 260-640, slopes 0.033 +- 0.04
#   the near deck seam (2 m from the back wall), for the record only: the same search within 24 px of y 1195 + 0.14 (x - 80), x 100-640
# Writes measure-B.json. Reads the records' RA-B-1 from _rec1/img and checks its sha256 first. Generates nothing.
# Usage: python3 -I measureB.py [records folder]
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__)); REC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, '_rec1')
SRC, WANT = os.path.join(REC, 'img', 'RA-B-1.png'), 'd05b45889a6bacb69426eba64d26a513c958f407e6c7260bf63f970c6de8822a'
if hashlib.sha256(open(SRC, 'rb').read()).hexdigest() != WANT: raise SystemExit("STOP: the records' img/RA-B-1.png is not RA-B-1")
im = Image.open(SRC).convert('RGB'); rgb = np.array(im).astype(float) / 255
lum = np.array(im.convert('L').filter(ImageFilter.GaussianBlur(1.0))).astype(float)
c = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
l = 0.4122214708 * c[..., 0] + 0.5363325363 * c[..., 1] + 0.0514459929 * c[..., 2]; m = 0.2119034982 * c[..., 0] + 0.6806995451 * c[..., 1] + 0.1073969566 * c[..., 2]; s = 0.0883024619 * c[..., 0] + 0.2817188376 * c[..., 1] + 0.6299787005 * c[..., 2]
l_, m_, s_ = np.cbrt(l), np.cbrt(m), np.cbrt(s)
L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_; A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_; B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
C = np.hypot(A, B); H = np.degrees(np.arctan2(B, A)) % 360
rust = (H > 15) & (H < 70) & (C > 0.045) & (L > 0.25) & (L < 0.75)
foot = {}
for x in range(360, 1024, 4):
    col = rust[930:1040, x - 2:x + 3].mean(axis=1) > 0.5; ys = np.where(col)[0] + 930
    if not len(ys): continue
    runs, st = [], ys[0]
    for i in range(1, len(ys) + 1):
        if i == len(ys) or ys[i] != ys[i - 1] + 1: runs.append((st, ys[i - 1])); st = ys[i] if i < len(ys) else None
    t, b = max(runs, key=lambda r: r[1] - r[0])
    if b - t >= 5: foot[x] = int(b) + 1
xs = np.array(sorted(foot)); ys = np.array([foot[x] for x in xs])
sel = (xs >= 420) & (xs <= 900); p = np.polyfit(xs[sel], ys[sel], 1); sel2 = sel & (np.abs(ys - np.polyval(p, xs)) <= 6); p = np.polyfit(xs[sel2], ys[sel2], 1)
rms = float(np.sqrt(np.mean((ys[sel2] - np.polyval(p, xs[sel2])) ** 2)))
prof = lum[560:960, 340:420].mean(axis=0); corner = int(np.argmin(prof)) + 340
def darkest(x0, x1, y0, s0, span):
    X = np.arange(x0, x1); best = None
    for sl in np.arange(s0 - 0.04, s0 + 0.0401, 0.002):
        for d in range(-span, span + 1):
            Y = np.round(y0 + d + sl * (X - x0)).astype(int); v = (lum[Y, X] + lum[Y - 1, X] + lum[Y + 1, X]).mean() / 3
            if best is None or v < best[0]: best = (v, y0 + d, sl)
    return {'x0': int(x0), 'x1': int(x1), 'y0': round(float(best[1]), 1), 'slope': round(float(best[2]), 4), 'meanLum': round(float(best[0]), 1)}
far = darkest(260, 640, 1068 + 0.033 * 5, 0.033, 18)
near = darkest(100, 640, 1195 + 0.14 * 20, 0.14, 24)
out = {'picture': {'name': 'RA-B-1', 'sha256': WANT, 'aiGenerated': True},
       'backWallFoot': {'how': 'the foot of the rust kick strip, every 4 px; a straight line through x 420-900', 'slope': round(float(p[0]), 5), 'intercept': round(float(p[1]), 2), 'readings': int(sel2.sum()), 'of': int(sel.sum()), 'rmsPx': round(rms, 2),
                        'readingsByX': {int(x): int(y) for x, y in zip(xs, ys)}},
       'farCorner': {'how': 'the darkest column of x 340-420, rows 560-960', 'x': corner, 'meanLum': round(float(prof.min()), 1)},
       'farSeam': {'how': 'the darkest straight line, the deck seam 1 m from the back wall', **far},
       'nearSeam': {'how': 'the darkest straight line, the deck seam 2 m from the back wall, for the record', **near}}
json.dump(out, open(os.path.join(D, 'measure-B.json'), 'w'), indent=1)
print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk != 'readingsByX'} for k, v in out.items() if k != 'picture'}))
