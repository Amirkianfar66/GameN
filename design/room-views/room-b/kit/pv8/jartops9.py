# C's version 9 (the Lead, 18 November): step 4's guide draws the three jars' tops as glass, in lines only, so the edit sees
# PV6-C-4 through them (the seat behind, and the blurred cut it repaints) instead of a flat fill. This measures, from PV6-C-4's
# pixels below step 2's cut, what kit8.py draws besides fix8.py's outlines:
#  - each jar's streak on its lit side: in each row of its lower half, the brightest column near each side (a cylinder: 1-4 px
#    inside its outline; the flask: inside its cone, 5 px clear of its left outline or 3 px clear of its right); the rows where that
#    column is brighter than 170 are the side's streak, fitted as a line x = a + b (y - y0) through the middle of each row's run, with its width (the
#    run of columns brighter than halfway from the row's median to the peak, the median over the rows) and colour (the median of
#    the peak pixels). The lit side is the side whose streak scores more: the sum over its rows of the peak's lightness above 120;
#  - the pale glass colour of its lower half: the median colour of the pixels brighter than 170 along its own outline, inside it:
#    1-3 px inside its walls, and the 3 rows above its base's dark near edge (the darkest of rows baseBottom-3 to baseBottom+1 in
#    each column).
# Lightness here is 0.299 R + 0.587 G + 0.114 B, as in fix8.py. Writes jartops4-<view>.json: numbers, colours and the picture's
# sha256 only (the picture stays on the records page). Generates nothing. Usage: python3 -I jartops9.py C <step-3 picture.png>
import hashlib, json, os, sys, numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); V, pic = sys.argv[1], sys.argv[2]; assert V == 'C'
F = json.load(open(os.path.join(D, f'fix4-{V}.json'))); shaPic = hashlib.sha256(open(pic, 'rb').read()).hexdigest()
if shaPic != F['source']['sha256']: sys.exit(f"STOP: {pic} is not fix4-{V}.json's picture ({F['source']['label']})")
rgb = np.asarray(Image.open(pic).convert('RGB')).astype(int); lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
place = np.array(Image.open(os.path.join(D, f'pv6-{V}-place.png')).convert('L')) > 127   # step 2's PLACE mask: its first row from y 1000 is the cut
def cut(x):
    col = np.where(place[1000:1300, x])[0]; return 1000 + int(col[0]) if len(col) else 10 ** 6
BRIGHT, LOW = 170, 120
hexof = lambda c: '#%02X%02X%02X' % tuple(int(v) for v in c)
def streak(rows, window):   # rows: the lower half's rows; window(y) -> the side's columns in that row
    peaks = []
    for y in rows:
        cols = [x for x in window(y) if y >= cut(x) + 5]
        if not cols: continue
        x = cols[int(np.argmax([lum[y, c] for c in cols]))]
        if lum[y, x] < BRIGHT: continue
        seg = lum[y, min(cols) - 4:max(cols) + 5]; half = (lum[y, x] + float(np.median(seg))) / 2; x0 = x1 = x
        while lum[y, x0 - 1] >= half and x0 - 1 >= min(cols) - 2: x0 -= 1
        while lum[y, x1 + 1] >= half and x1 + 1 <= max(cols) + 2: x1 += 1
        peaks.append((y, x, float(lum[y, x]), x1 - x0 + 1, (x0 + x1) / 2))
    if len(peaks) < 3: return None
    ys = np.array([p[0] for p in peaks], float); xs = np.array([p[4] for p in peaks], float); y0 = int(ys.min())
    b, a = np.polyfit(ys - y0, xs, 1)
    return {'line': {'a': round(float(a), 2), 'b': round(float(b), 3), 'y0': y0, 'form': "x = a + b (y - y0): the streak's middle, fitted through each row's run"},
            'rows': [y0, int(ys.max())], 'rowsBright': len(peaks), 'meanLightness': round(float(np.mean([p[2] for p in peaks])), 1),
            'widthPx': int(np.median([p[3] for p in peaks])), 'rgb': [int(v) for v in np.median(np.array([rgb[p[0], p[1]] for p in peaks]), axis=0)],
            'score': round(float(sum(p[2] - LOW for p in peaks)), 1)}
out = []
for j in F['jars']:
    if j['kind'] == 'cylinder':
        Lx, Rx = j['outline']; top = int(np.floor(j['baseCentre'] - j['ellipseHalfHeight']))
        left = lambda y: range(Lx + 1, Lx + 5); right = lambda y: range(Rx - 4, Rx)
        walls = lambda y: list(range(Lx + 1, Lx + 4)) + list(range(Rx - 3, Rx)); front = range(Lx + 3, Rx - 2)
    else:
        (al, bl), (ar, br) = j['sides']['left'], j['sides']['right']; xl = lambda y: al + bl * (y - 1100); xr = lambda y: ar + br * (y - 1100)
        top = int(np.floor(j['baseBottom'] - 2 * j['ellipseHalfHeight'])); ax_ = j['axis']
        left = lambda y: range(int(round(xl(y))) + 5, int(round(ax_)) + 1); right = lambda y: range(int(round(ax_)), int(round(xr(y))) - 2)
        walls = lambda y: list(range(int(round(xl(y))) + 1, int(round(xl(y))) + 4)) + list(range(int(round(xr(y))) - 3, int(round(xr(y)))))
        yb = j['baseBottom'] - 6; front = range(int(round(xl(yb))) + 3, int(round(xr(yb))) - 2)
    span = range(Lx, Rx + 1) if j['kind'] == 'cylinder' else range(int(round(xl(top))), int(round(xr(top))) + 1)   # the jar's columns at its widest
    rows = range(min(cut(x) for x in span) + 5, top + 1)   # from the cut's highest row over the jar; each column is still taken only 5 px below its own cut
    sides = {'left': streak(rows, left), 'right': streak(rows, right)}
    lit = max((s for s in sides if sides[s]), key=lambda s: sides[s]['score'])
    pale = []
    for y in rows:
        for x in walls(y):
            if y >= cut(x) + 5 and lum[y, x] > BRIGHT: pale.append(rgb[y, x])
    nearEdge = 0
    for x in front:
        yd = j['baseBottom'] - 3 + int(np.argmin(lum[j['baseBottom'] - 3:j['baseBottom'] + 2, x]))
        for y in range(yd - 3, yd):
            if lum[y, x] > BRIGHT: pale.append(rgb[y, x]); nearEdge += 1
    pg = [int(v) for v in np.median(np.array(pale), axis=0)]
    out.append({'name': j['name'], 'kind': j['kind'], 'lowerHalfRows': [int(rows.start), top], 'litSide': lit, 'streak': {**sides[lit], 'side': lit, 'hex': hexof(sides[lit]['rgb'])},
                'otherSide': ({**sides[[s for s in sides if s != lit][0]], 'side': [s for s in sides if s != lit][0]} if sides[[s for s in sides if s != lit][0]] else None),
                'paleGlass': {'rgb': pg, 'hex': hexof(pg), 'px': len(pale), 'nearEdgePx': nearEdge}})
rec = {'view': V, 'what': "step 4's guide, version 9: each jar's top in lines only, its lit side's streak continued and its rim's near edge in its lower half's pale glass colour (the Lead, 18 November)",
       'source': {'label': F['source']['label'], 'records': F['source']['records'], 'sha256': shaPic}, 'fix4': {'record': f'fix4-{V}.json', 'sha256': hashlib.sha256(open(os.path.join(D, f'fix4-{V}.json'), 'rb').read()).hexdigest()},
       'method': "below step 2's cut (5 px clear of it): each side's streak is its brightest column in each row (a cylinder: 1-4 px inside its outline; the flask: inside its cone, 5 px clear of its left outline or 3 px clear of its right), kept where brighter than 170 and fitted as a line through the middle of each row's run, with its width (the run brighter than halfway from the row's median to the peak) and colour (the median of the peaks); the lit side is the one whose streak scores more (the sum of its peaks' lightness above 120). The pale glass colour is the median of the pixels brighter than 170 along the jar's outline, inside it: 1-3 px inside its walls and the 3 rows above its base's dark near edge. Lightness 0.299 R + 0.587 G + 0.114 B",
       'thresholds': {'bright': BRIGHT, 'scoreAbove': LOW, 'clearOfTheCutPx': 5}, 'jars': out}
json.dump(rec, open(os.path.join(D, f'jartops4-{V}.json'), 'w'), indent=1)
print(json.dumps(rec, indent=1))
