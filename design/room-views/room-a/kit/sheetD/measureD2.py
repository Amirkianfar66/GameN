# Sheet RA-D version 2: the painted deck of RA-D-1, view D's AI-generated step-1 picture (accepted by the Lead on 27 November),
# measured against the guide's deck lines (lines-D.json, linesD.mjs), for the foot lines (the Lead: "Vega (+13), Lyra (+17), Echo
# (-1) and the capsule walkers' spot (+20 to +29): move any more than 8 px off and record all four; put the capsule spot in view D's
# geometry") and for the desk's, the hatch's and the lid's areas ("extend them down to the painted deck where it is more than 8 px
# below the guide"). Picture pixels of the 1024 x 1536 painting.
#   the walls' feet: the foot of each wall's rust kick strip, column by column, every 4 px (OKLCH rust, as measureB2.py and
#     measureE2.py: hue 15-70, chroma 0.045 or more, lightness 0.25-0.75; in each column the longest run of at least 5 rust rows
#     within 50 px of the guide's foot), and a straight line through the readings away from the corner, refitted on the readings
#     within 4 px of a first fit: the north wall (the left wall) over x 100-530, the east wall (the right wall) over x 600-1010
#   the deck seams: the darkest straight line within 40 px of the guide's (slopes within 0.12 to 0.16 of the guide's): 1 m out from
#     the north wall (z = 1 m) over x 120-560, and 1 and 2 m out from the east wall (x = 1 m over x 600-1000, where the wall's base is far enough away not to be taken for it;
#     x = 0 m over x 330-1000)
# A point on the deck is kept at its fraction of the way between two of the guide's lines (at its x) and placed at that fraction
# between the painted ones: by the north wall's lines (its foot and the seam 1 m out) for Vega, Lyra and the desk; by the east wall's
# (its foot and the seams 1 and 2 m out, the pair around the point) for Echo, the capsule visitors' spot, the hatch and the lid; the
# visitors' spot by the north wall's lines too, as a cross-check. A foot moves where it is more than 8 px off, up or down; a floor
# point of the desk, the hatch or the lid moves only down, and only where the painted deck is more than 8 px below the guide (points
# outside the picture are left). Writes measure-D2.json and floorfit-D.json (the points the guide draws where they say, guideD.mjs).
# Reads the records' RA-D-1 from _rec1/img and checks its sha256 first. Generates nothing. Usage: python3 -I measureD2.py
import hashlib, json, os
import numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
SRC, WANT = os.path.join(D, '_rec1', 'img', 'RA-D-1.png'), 'c8842de16d63076fe69306b247bcc643b6dc5576f6c389364ce49bc970f2fe75'
if hashlib.sha256(open(SRC, 'rb').read()).hexdigest() != WANT: raise SystemExit("STOP: the records' img/RA-D-1.png is not RA-D-1")
G = json.load(open(os.path.join(D, 'lines-D.json')))
at = lambda ln, x: ln['intercept'] + ln['slope'] * x
im = Image.open(SRC).convert('RGB'); rgb = np.array(im).astype(float) / 255
lum = np.array(im.convert('L').filter(ImageFilter.GaussianBlur(1.0))).astype(float)
c = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
l = 0.4122214708 * c[..., 0] + 0.5363325363 * c[..., 1] + 0.0514459929 * c[..., 2]; m = 0.2119034982 * c[..., 0] + 0.6806995451 * c[..., 1] + 0.1073969566 * c[..., 2]; s = 0.0883024619 * c[..., 0] + 0.2817188376 * c[..., 1] + 0.6299787005 * c[..., 2]
l_, m_, s_ = np.cbrt(l), np.cbrt(m), np.cbrt(s)
L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_; A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_; B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
C = np.hypot(A, B); Hh = np.degrees(np.arctan2(B, A)) % 360
rust = (Hh > 15) & (Hh < 70) & (C > 0.045) & (L > 0.25) & (L < 0.75)
def foot(gl, x0, x1, fx0, fx1):
    rd = {}
    for x in range(x0, x1 + 1, 4):
        g = at(gl, x); ya, yb = int(g - 50), int(g + 50)
        col = rust[ya:yb, x - 2:x + 3].mean(axis=1) > 0.5; ys = np.where(col)[0] + ya
        if not len(ys): continue
        runs, st = [], ys[0]
        for i in range(1, len(ys) + 1):
            if i == len(ys) or ys[i] != ys[i - 1] + 1: runs.append((st, ys[i - 1])); st = ys[i] if i < len(ys) else None
        t, b = max(runs, key=lambda r: r[1] - r[0])
        if b - t >= 5: rd[x] = int(b) + 1
    xs = np.array(sorted(rd)); ys = np.array([rd[x] for x in xs]); sel = (xs >= fx0) & (xs <= fx1)
    p = np.polyfit(xs[sel], ys[sel], 1); sel2 = sel & (np.abs(ys - np.polyval(p, xs)) <= 4); p = np.polyfit(xs[sel2], ys[sel2], 1)
    rms = float(np.sqrt(np.mean((ys[sel2] - np.polyval(p, xs[sel2])) ** 2)))
    return {'how': f"the foot of the wall's rust kick strip, every 4 px; a straight line through x {fx0}-{fx1}", 'slope': round(float(p[0]), 5), 'intercept': round(float(p[1]), 2),
            'readings': int(sel2.sum()), 'of': int(sel.sum()), 'rmsPx': round(rms, 2), 'readingsByX': {int(x): int(y) for x, y in zip(xs, ys)}}
def darkest(gl, x0, x1, span=40, ds=0.12):
    X = np.arange(x0, x1); best = None
    for sl in np.arange(gl['slope'] - ds, gl['slope'] + ds + 1e-9, 0.002):
        for d in range(-span, span + 1):
            y0 = at(gl, x0) + d; Y = np.round(y0 + sl * (X - x0)).astype(int)
            if Y.min() < 1 or Y.max() > lum.shape[0] - 2: continue
            v = (lum[Y, X] + lum[Y - 1, X] + lum[Y + 1, X]).mean() / 3
            if best is None or v < best[0]: best = (v, y0 - sl * x0, sl)
    return {'how': "the darkest straight line within 40 px of the guide's", 'x0': int(x0), 'x1': int(x1), 'slope': round(float(best[2]), 5), 'intercept': round(float(best[1]), 2), 'meanLum': round(float(best[0]), 1)}
painted = {'northFoot': foot(G['northFoot'], 8, 540, 100, 530), 'eastFoot': foot(G['eastFoot'], 556, 1016, 600, 1010),
           'northSeam1': darkest(G['northSeam1'], 120, 560), 'eastSeam1': darkest(G['eastSeam1'], 600, 1000, ds=0.16), 'eastSeam0': darkest(G['eastSeam0'], 330, 1000, ds=0.1)}
for k, v in painted.items(): v['offsetByX'] = {int(x): round(float(at(v, x) - at(G[k], x)), 1) for x in (range(100, 541, 110) if k.startswith('north') else range(560, 1001, 110))}
def place(x, y, pair):   # kept at its fraction between two guide lines at its x, placed at that fraction between the painted ones
    g0, g1 = at(G[pair[0]], x), at(G[pair[1]], x); t = (y - g0) / (g1 - g0); p0, p1 = at(painted[pair[0]], x), at(painted[pair[1]], x)
    return t, p0 + t * (p1 - p0)
NORTH, EAST1, EAST0 = ('northFoot', 'northSeam1'), ('eastFoot', 'eastSeam1'), ('eastSeam1', 'eastSeam0')
eastPair = lambda wx: EAST1 if wx >= 1 else EAST0
# The Lead (27 November, 20:57): each foot follows the painted deck at its spot, as above (its fraction between the two guide lines
# around it, placed at that fraction between the painted ones). The other reading, each foot moved by its wall's painted foot at its
# x, is kept as a switch, off; on, it replaces the deck reading for the people (not for the visitors' spot, which has its own pair).
WALL_FOOT = False
def by_wall_foot(x, y, pair):   # the wall's painted foot minus the guide's, at x, added to the anchor
    return None, y + at(painted[pair[0]], x) - at(G[pair[0]], x)
feet = []
for p in G['people']:
    pair = NORTH if p['name'] in ('Vega', 'Lyra') else EAST1; t, yp = (by_wall_foot if WALL_FOOT else place)(*p['anchor'], pair); off = round(float(yp - p['anchor'][1]), 1)
    feet.append({'name': p['name'], 'anchor': p['anchor'], 'onDeck': p['onDeck'], 'lines': list(pair), **({'by': "the wall's painted foot at its x (WALL_FOOT on)"} if WALL_FOOT else {'fraction': round(float(t), 3)}), 'paintedY': round(float(yp), 1), 'offsetPx': off, 'moved': abs(off) > 8,
                 **({'movedTo': [p['anchor'][0], round(float(yp), 1)]} if abs(off) > 8 else {})})
cs = G['capsuleSpot']; t, yp = place(*cs['anchor'], EAST1); t2, yp2 = place(*cs['anchor'], NORTH); off = round(float(yp - cs['anchor'][1]), 1)
feet.append({'name': 'capsule visitors', 'what': cs['what'], 'anchor': cs['anchor'], 'onDeck': cs['world'], 'lines': list(EAST1), 'fraction': round(float(t), 3), 'paintedY': round(float(yp), 1), 'offsetPx': off,
             'crossCheck': {'lines': list(NORTH), 'fraction': round(float(t2), 3), 'offsetPx': round(float(yp2 - cs['anchor'][1]), 1), 'note': "the north wall's lines run past the painted corner here, so this is a cross-check only"},
             'moved': abs(off) > 8, **({'movedTo': [cs['anchor'][0], round(float(yp), 1)]} if abs(off) > 8 else {})})
for f in feet: f['rule'] = 'the Lead: move a foot line more than 8 px off, and record all four'
pts, allpts = [], []
for obj, key, fam in (('PC desk', 'desk', 'north'), ('floor hatch', 'hatch', 'east'), ('hatch lid', 'lid', 'east')):
    for q in G[key]:
        x, y = q['px']; wx = q['world'][0]; pair = NORTH if fam == 'north' else eastPair(wx)
        if not (0 <= x < 1024): allpts.append({'object': obj, 'world': q['world'], 'px': q['px'], 'left': 'outside the picture'}); continue
        t, yp = place(x, y, pair); off = round(float(yp - y), 1); mv = off > 8
        e = {'object': obj, 'world': q['world'], 'px': q['px'], 'lines': list(pair), 'fraction': round(float(t), 3), 'offsetPx': off, 'moved': mv}
        if mv: e['to'] = [round(x, 2), round(float(yp), 2)]; pts.append({'object': obj, 'world': q['world'], 'to': e['to'], 'offsetPx': off})
        allpts.append(e)
corner = (lambda a, b: [round((b['intercept'] - a['intercept']) / (a['slope'] - b['slope']), 1), round(a['intercept'] + a['slope'] * (b['intercept'] - a['intercept']) / (a['slope'] - b['slope']), 1)])(painted['northFoot'], painted['eastFoot'])
out = {'picture': {'name': 'RA-D-1', 'sha256': WANT, 'aiGenerated': True}, 'guide': {k: {kk: G[k][kk] for kk in ('slope', 'intercept')} for k in painted},
       **painted, 'corner': {'painted': corner, 'guide': G['corner'], 'how': "where the two painted wall feet's lines meet"},
       'feet': feet, 'floorPoints': allpts,
       'leadsFigures': {'Vega': 13, 'Lyra': 17, 'Echo': -1, 'capsule visitors': [20, 29], 'what': "the Lead's figures, from RA-D-1's base readings, for comparison"}}
fit = {'objects': ['PC desk', 'floor hatch', 'hatch lid'], 'points': pts, 'rule': 'the Lead: extend the areas down to the painted deck where it is more than 8 px below the guide (only down, only past 8 px)',
       'from': 'measure-D2.json (RA-D-1)'}
J = lambda o, f: (json.dump(o, open(os.path.join(D, f), 'w'), indent=1), open(os.path.join(D, f), 'a').write('\n'))
J(out, 'measure-D2.json'); J(fit, 'floorfit-D.json')
for k, v in painted.items(): print(k, v['slope'], v['intercept'], v.get('rmsPx', v.get('meanLum')), v['offsetByX'])
print('corner', corner, 'guide', G['corner'])
for f in feet: print('foot', f['name'], f['offsetPx'], 'moved' if f['moved'] else 'stays', f.get('crossCheck', {}).get('offsetPx', ''))
for e in allpts: print('point', e['object'], e['px'], e.get('offsetPx', e.get('left')), 'MOVED' if e.get('moved') else '')
