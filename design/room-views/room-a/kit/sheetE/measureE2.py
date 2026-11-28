# Sheet RA-E version 2: the painted deck of RA-E-1, view E's AI-generated step-1 picture (accepted by the Lead on 27 November),
# measured against the guide's floor lines, for Atlas's crates (the Lead: "extend their area down to the painted base at the far
# corner, as for B's desk"), Atlas's foot line (the Lead: "measure it and move it only if more than 8 px off, recording either way")
# and Echo's cabinet (the Lead: "confirm the cabinet's area stays inside the painted east-wall strip"). Picture pixels of the 1024 x
# 1536 painting.
#   the west wall's foot: the foot of its rust kick strip, column by column, every 4 px (OKLCH rust, as measureB2.py: hue 15-70, chroma
#     0.045 or more, lightness 0.25-0.75; in each column the longest run of at least 5 rust rows starting within 10 px above and 60 px
#     below the guide's foot), and a straight line through the readings of x 790-1020, the crates' span, refitted on the readings
#     within 6 px of a first fit
#   the deck seam 1 m out from the west wall (x = -1 m): the darkest straight line within 20 px of the guide's, slopes within 0.05 of
#     the guide's, over x 650-990, where no furniture stands in the guide
# Then the crates' floor corners and Atlas's foot anchor, each kept at its fraction of the way from the guide's west-wall foot to the
# guide's seam (at its x) and placed at that fraction between the painted ones; floorfit-E.json, the painted lines the guide's floor
# fit uses for the crates (guideE.mjs, its lines named). Echo's cabinet is checked after the kit, on the final mask (checkE2.py).
# The guide's lines are its camera's (lines-E.json, linesE.mjs). Writes measure-E2.json and floorfit-E.json. Reads the records' RA-E-1 from
# _rec1/img and checks its sha256 first. Generates nothing. Usage: python3 -I measureE2.py
import hashlib, json, os
import numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
SRC, WANT = os.path.join(D, '_rec1', 'img', 'RA-E-1.png'), 'e0d928ef4c1dabd3968b20568bd0d6e3f923682df7f6d938c61bd26cb2d0730f'
if hashlib.sha256(open(SRC, 'rb').read()).hexdigest() != WANT: raise SystemExit("STOP: the records' img/RA-E-1.png is not RA-E-1")
G = json.load(open(os.path.join(D, 'lines-E.json')))
gy = lambda ln, x: ln['intercept'] + ln['slope'] * x
im = Image.open(SRC).convert('RGB'); rgb = np.array(im).astype(float) / 255
lum = np.array(im.convert('L').filter(ImageFilter.GaussianBlur(1.0))).astype(float)
c = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
l = 0.4122214708 * c[..., 0] + 0.5363325363 * c[..., 1] + 0.0514459929 * c[..., 2]; m = 0.2119034982 * c[..., 0] + 0.6806995451 * c[..., 1] + 0.1073969566 * c[..., 2]; s = 0.0883024619 * c[..., 0] + 0.2817188376 * c[..., 1] + 0.6299787005 * c[..., 2]
l_, m_, s_ = np.cbrt(l), np.cbrt(m), np.cbrt(s)
L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_; A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_; B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
C = np.hypot(A, B); Hh = np.degrees(np.arctan2(B, A)) % 360
rust = (Hh > 15) & (Hh < 70) & (C > 0.045) & (L > 0.25) & (L < 0.75)
WF, WS = G['westFoot'], G['westSeam1']
foot = {}
for x in range(752, 1021, 4):
    g = gy(WF, x); y0, y1 = int(g - 10), int(g + 60)
    col = rust[y0:y1, x - 2:x + 3].mean(axis=1) > 0.5; ys = np.where(col)[0] + y0
    if not len(ys): continue
    runs, st = [], ys[0]
    for i in range(1, len(ys) + 1):
        if i == len(ys) or ys[i] != ys[i - 1] + 1: runs.append((st, ys[i - 1])); st = ys[i] if i < len(ys) else None
    t, b = max(runs, key=lambda r: r[1] - r[0])
    if b - t >= 5: foot[x] = int(b) + 1
xs = np.array(sorted(foot)); ys = np.array([foot[x] for x in xs])
sel = (xs >= 790) & (xs <= 1020); p = np.polyfit(xs[sel], ys[sel], 1); sel2 = sel & (np.abs(ys - np.polyval(p, xs)) <= 6); pF = np.polyfit(xs[sel2], ys[sel2], 1)
rmsF = float(np.sqrt(np.mean((ys[sel2] - np.polyval(pF, xs[sel2])) ** 2)))
def darkest(ln, x0, x1, span=20, ds=0.05):
    X = np.arange(x0, x1); best = None
    for sl in np.arange(ln['slope'] - ds, ln['slope'] + ds + 1e-9, 0.002):
        for d in range(-span, span + 1):
            y0 = gy(ln, x0) + d; Y = np.round(y0 + sl * (X - x0)).astype(int); v = (lum[Y, X] + lum[Y - 1, X] + lum[Y + 1, X]).mean() / 3
            if best is None or v < best[0]: best = (v, y0 - sl * x0, sl)
    return {'x0': int(x0), 'x1': int(x1), 'slope': round(float(best[2]), 4), 'intercept': round(float(best[1]), 2), 'meanLum': round(float(best[0]), 1)}
seam = darkest(WS, 650, 990)
at = lambda q, x: q['intercept'] + q['slope'] * x
pf = lambda x: pF[1] + pF[0] * x; ps = lambda x: at(seam, x)
def onPaint(x, y):
    t = (y - gy(WF, x)) / (gy(WS, x) - gy(WF, x)); return t, pf(x) + t * (ps(x) - pf(x))
out = {'picture': {'name': 'RA-E-1', 'sha256': WANT, 'aiGenerated': True},
       'guide': {'westFoot': {k: WF[k] for k in ('slope', 'intercept')}, 'westSeam1': {k: WS[k] for k in ('slope', 'intercept')}},
       'westFoot': {'how': "the foot of the west wall's rust kick strip, every 4 px; a straight line through x 790-1020 (the crates' span)", 'slope': round(float(pF[0]), 5), 'intercept': round(float(pF[1]), 2),
                    'readings': int(sel2.sum()), 'of': int(sel.sum()), 'rmsPx': round(rmsF, 2), 'readingsByX': {int(x): int(y) for x, y in zip(xs, ys)},
                    'offsetByX': {int(x): round(float(pf(x) - gy(WF, x)), 1) for x in range(760, 1021, 40)}},
       'westSeam1': {'how': "the darkest straight line within 20 px of the guide's seam 1 m out from the west wall (x = -1 m)", **seam, 'offsetByX': {int(x): round(float(at(seam, x) - gy(WS, x)), 1) for x in range(650, 991, 60)}}}
out['crateCorners'] = [{**c, 'fraction': round(float(onPaint(*c['px'])[0]), 3), 'paintedY': round(float(onPaint(*c['px'])[1]), 1), 'offsetPx': round(float(onPaint(*c['px'])[1] - c['px'][1]), 1)} for c in G['crates']]
t, ya = onPaint(*G['atlas']['anchor']); off = round(float(ya - G['atlas']['anchor'][1]), 1)
feet = [{'name': 'Atlas', 'anchor': G['atlas']['anchor'], 'fractionWallToSeam': round(float(t), 3), 'paintedY': round(float(ya), 1), 'offsetPx': off, 'moved': abs(off) > 8,
         'rule': "the Lead: move the line only if it is more than 8 px off, and record either way", 'how': "kept at its fraction of the way from the guide's west-wall foot to its seam 1 m out, placed at that fraction between the painted ones"}]
if feet[0]['moved']: feet[0]['movedTo'] = [G['atlas']['anchor'][0], round(float(ya), 1)]
fit = {'objects': ['crate'], 'lines': {'axis': 'x', 'wall': -2, 'seam': -1, 'along': [-1.9, -0.5]},
       'painted': {'wallFoot': {'slope': out['westFoot']['slope'], 'intercept': out['westFoot']['intercept']}, 'seam1': {'slope': seam['slope'], 'intercept': seam['intercept']}},
       'from': 'measure-E2.json (RA-E-1)'}
out['floorFit'] = {'objects': ['crate'], 'summary': "Atlas's crates stand on RA-E-1's painted deck: their floor corners, kept at their places between the west wall's foot and the seam 1 m out, are drawn on the painted lines, " + ', '.join(f"{int(round(c['offsetPx'])):+d}" for c in out['crateCorners']) + ' px; the rest of the guide is the camera\'s',
                   'corners': out['crateCorners'], 'file': 'floorfit-E.json'}
out['feet'] = feet
json.dump(out, open(os.path.join(D, 'measure-E2.json'), 'w'), indent=1); json.dump(fit, open(os.path.join(D, 'floorfit-E.json'), 'w'), indent=1)
print('west foot', out['westFoot']['slope'], out['westFoot']['intercept'], 'rms', out['westFoot']['rmsPx'], 'readings', out['westFoot']['readings'], '/', out['westFoot']['of'], '| offsets', out['westFoot']['offsetByX'])
print('seam x=-1', seam, '| offsets', out['westSeam1']['offsetByX'])
print('crate corners', [(c['world'], c['px'], c['fraction'], c['offsetPx']) for c in out['crateCorners']])
print('Atlas', feet[0])
