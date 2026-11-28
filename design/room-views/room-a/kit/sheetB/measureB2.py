# Sheet RA-B version 2: the painted deck of RA-B-2, view B's AI-generated step-1 picture (accepted by the Lead on 27 November), measured
# against the guide's floor lines, for the desk's area (the Lead: "extend the desk's area down to the painted base and the deck in front
# of it") and Vega's foot line (the Lead: "move the line only if it is more than 8 px off, and record either way"). Picture pixels of
# the 1024 x 1536 painting.
#   the north wall's foot: the foot of its rust kick strip, column by column, every 4 px (OKLCH rust: hue 15-70, chroma 0.045 or
#     more, lightness 0.25-0.75; in each column the longest run of at least 5 rust rows starting within 10 px above and 60 px below
#     the guide's foot), and a straight line through the readings of x 400-700, the desk's span, refitted on the readings within
#     6 px of a first fit; the whole wall's readings are kept for the record
#   the far deck seam (1 m from the north wall) and the near one (2 m): the darkest straight line within 20 px of the guide's,
#     slopes within 0.05 of the guide's, over the x the seam is clear of furniture in the guide (x 420-960 and 300-700)
#   the deck seam 1 m west of the middle (x = -1 m, beside Vega's feet): the darkest straight line within 20 px of the guide's, over
#     y 990-1170, and its crossing with the painted far seam, against the guide's crossing
# Then Vega's foot anchor and the desk's floor corners, each kept at its fraction of the way from the guide's foot line to its far
# seam (at its x) and placed at that fraction between the painted ones; and floorfit-B.json, the painted lines the guide's floor fit
# uses for the desk (guideB.mjs). The guide's lines are its camera's (lines-B.json, linesB.mjs). Writes measure-B2.json and
# floorfit-B.json. Reads the records' RA-B-2 from _rec2/img and checks its sha256 first. Generates nothing.
# Usage: python3 -I measureB2.py
import hashlib, json, os
import numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
SRC, WANT = os.path.join(D, '_rec2', 'img', 'RA-B-2.png'), 'aefddadcb3ce554c215d121dd7a49b8e4197a1dcce77325e54982252c8038605'
if hashlib.sha256(open(SRC, 'rb').read()).hexdigest() != WANT: raise SystemExit("STOP: the records' img/RA-B-2.png is not RA-B-2")
G = json.load(open(os.path.join(D, 'lines-B.json')))
gy = lambda ln, x: ln['intercept'] + ln['slope'] * x
im = Image.open(SRC).convert('RGB'); rgb = np.array(im).astype(float) / 255
lum = np.array(im.convert('L').filter(ImageFilter.GaussianBlur(1.0))).astype(float)
c = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
l = 0.4122214708 * c[..., 0] + 0.5363325363 * c[..., 1] + 0.0514459929 * c[..., 2]; m = 0.2119034982 * c[..., 0] + 0.6806995451 * c[..., 1] + 0.1073969566 * c[..., 2]; s = 0.0883024619 * c[..., 0] + 0.2817188376 * c[..., 1] + 0.6299787005 * c[..., 2]
l_, m_, s_ = np.cbrt(l), np.cbrt(m), np.cbrt(s)
L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_; A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_; B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
C = np.hypot(A, B); Hh = np.degrees(np.arctan2(B, A)) % 360
rust = (Hh > 15) & (Hh < 70) & (C > 0.045) & (L > 0.25) & (L < 0.75)
foot = {}
for x in range(380, 1021, 4):
    g = gy(G['wallFoot'], x); y0, y1 = int(g - 10), int(g + 60)
    col = rust[y0:y1, x - 2:x + 3].mean(axis=1) > 0.5; ys = np.where(col)[0] + y0
    if not len(ys): continue
    runs, st = [], ys[0]
    for i in range(1, len(ys) + 1):
        if i == len(ys) or ys[i] != ys[i - 1] + 1: runs.append((st, ys[i - 1])); st = ys[i] if i < len(ys) else None
    t, b = max(runs, key=lambda r: r[1] - r[0])
    if b - t >= 5: foot[x] = int(b) + 1
xs = np.array(sorted(foot)); ys = np.array([foot[x] for x in xs])
def fit(lo, hi):
    sel = (xs >= lo) & (xs <= hi); p = np.polyfit(xs[sel], ys[sel], 1); sel2 = sel & (np.abs(ys - np.polyval(p, xs)) <= 6); p = np.polyfit(xs[sel2], ys[sel2], 1)
    return p, sel, sel2, float(np.sqrt(np.mean((ys[sel2] - np.polyval(p, xs[sel2])) ** 2)))
pD, selD, selD2, rmsD = fit(400, 700)
def darkest(ln, x0, x1, span=20, ds=0.05):
    X = np.arange(x0, x1); best = None
    for sl in np.arange(ln['slope'] - ds, ln['slope'] + ds + 1e-9, 0.002):
        for d in range(-span, span + 1):
            y0 = gy(ln, x0) + d; Y = np.round(y0 + sl * (X - x0)).astype(int); v = (lum[Y, X] + lum[Y - 1, X] + lum[Y + 1, X]).mean() / 3
            if best is None or v < best[0]: best = (v, y0 - sl * x0, sl)
    return {'x0': int(x0), 'x1': int(x1), 'slope': round(float(best[2]), 4), 'intercept': round(float(best[1]), 2), 'meanLum': round(float(best[0]), 1)}
far, near = darkest(G['seam1'], 420, 960), darkest(G['seam2'], 300, 700)
at = lambda q, x: q['intercept'] + q['slope'] * x
out = {'picture': {'name': 'RA-B-2', 'sha256': WANT, 'aiGenerated': True},
       'guide': {k: {'slope': G[k]['slope'], 'intercept': G[k]['intercept']} for k in ('wallFoot', 'seam1', 'seam2')},
       'wallFoot': {'how': "the foot of the rust kick strip, every 4 px; a straight line through x 400-700 (the desk's span)", 'slope': round(float(pD[0]), 5), 'intercept': round(float(pD[1]), 2),
                    'readings': int(selD2.sum()), 'of': int(selD.sum()), 'rmsPx': round(rmsD, 2), 'readingsByX': {int(x): int(y) for x, y in zip(xs, ys)},
                    'offsetByX': {int(x): round(float(np.polyval(pD, x) - gy(G['wallFoot'], x)), 1) for x in range(400, 701, 40)}},
       'farSeam': {'how': 'the darkest straight line within 20 px of the guide\'s seam 1 m from the north wall', **far, 'offsetByX': {int(x): round(float(at(far, x) - gy(G['seam1'], x)), 1) for x in range(420, 961, 60)}},
       'nearSeam': {'how': 'the same, for the seam 2 m from the north wall', **near, 'offsetByX': {int(x): round(float(at(near, x) - gy(G['seam2'], x)), 1) for x in range(300, 701, 50)}}}
# the seam beside Vega's feet and its crossing with the far seam
S = G['seamXm1']; best = None; Yr = np.arange(990, 1170)
for k in np.arange(S['dxdy'] - 0.12, S['dxdy'] + 0.1201, 0.004):
    for d in range(-20, 21):
        X = np.round(S['at'][0] + d + k * (Yr - S['at'][1])).astype(int); v = (lum[Yr, X] + lum[Yr, X - 1] + lum[Yr, X + 1]).mean() / 3
        if best is None or v < best[0]: best = (v, d, k)
v, d, k = best; x0 = S['at'][0] + d; a, b = far['intercept'], far['slope']; yc = (a + b * (x0 - k * S['at'][1])) / (1 - b * k); xc = x0 + k * (yc - S['at'][1])
out['seamBesideVega'] = {'how': "the darkest straight line within 20 px of the guide's seam x = -1 m, over y 990-1170, and its crossing with the painted far seam", 'atWallY': S['at'][1], 'x': round(float(x0), 1), 'dxdy': round(float(k), 4), 'meanLum': round(float(v), 1),
                         'crossing': [round(float(xc), 1), round(float(yc), 1)], 'guideCrossing': S['crossSeam1'], 'offset': [round(float(xc - S['crossSeam1'][0]), 1), round(float(yc - S['crossSeam1'][1]), 1)]}
# a floor point between the north wall's foot and the far seam, from the guide's lines to the painted ones (as guideB.mjs's floor fit)
pf = lambda x: pD[1] + pD[0] * x; ps = lambda x: far['intercept'] + far['slope'] * x
def onPaint(x, y):
    t = (y - gy(G['wallFoot'], x)) / (gy(G['seam1'], x) - gy(G['wallFoot'], x)); return t, pf(x) + t * (ps(x) - pf(x))
t, yv = onPaint(*G['vega']['anchor'])
out['vegaFoot'] = {'anchor': G['vega']['anchor'], 'fractionWallToSeam': round(float(t), 3), 'painted': round(float(yv), 1), 'offsetPx': round(float(yv - G['vega']['anchor'][1]), 1)}
out['deskCorners'] = [{**c, 'fraction': round(float(onPaint(*c['px'])[0]), 3), 'paintedY': round(float(onPaint(*c['px'])[1]), 1), 'offsetPx': round(float(onPaint(*c['px'])[1] - c['px'][1]), 1)} for c in G['desk']]
json.dump(out, open(os.path.join(D, 'measure-B2.json'), 'w'), indent=1)
fit = {'about': "Sheet RA-B version 2's floor fit (the Lead, 27 November: the desk stands on the painted deck and covers the skirting behind it): the objects whose floor points are drawn on RA-B-2's painted deck, and the painted lines they keep their place between, from measure-B2.json (measureB2.py).",
       'picture': out['picture'], 'objects': ['PC desk'],
       'painted': {'wallFoot': {k: out['wallFoot'][k] for k in ('slope', 'intercept', 'rmsPx', 'readings')}, 'seam1': {k: far[k] for k in ('slope', 'intercept', 'x0', 'x1')}}}
json.dump(fit, open(os.path.join(D, 'floorfit-B.json'), 'w'), indent=1)
print(json.dumps({k: out[k] for k in ('seamBesideVega', 'vegaFoot')}), '\ndesk corners:', [(c['px'], c['offsetPx']) for c in out['deskCorners']])
