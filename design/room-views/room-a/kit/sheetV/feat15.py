# The Lead's 15 px rule (19 November, sheet RA-A version 4), shared by sheets RA-B to RA-E's version 2 kits: a step-1 picture's
# painted features (features<V>.json, outlines read from the picture) are the kit's fixed obstacles. Every step-2 and step-3 mask
# edge either covers a feature in the test with at least 15 px to spare or clears it by at least 15 px (square pixels): no part of it
# lies within 15 px of an edge, on either side. In step 3, what step 2 leaves of each feature is tested. A named exception (for the
# Lead's decision) passes only where every such part lies in its zone. Features not in the test are measured and noted. Small lights
# must lie outside every mask. The same code as kitA.py's (version 4), lifted into a function; checked against kit-A.json's
# featureTest by selftest() below, on view A's own files. One change: the raster clamps polygons that run past the picture's edge
# (kitA.py's never did). Usage from a kit: import, then test(features, place, place3, areas[, plain]); python3 -I feat15.py runs the
# check against view A.
import importlib.util, json, os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); W, H = 1024, 1536
spec = importlib.util.spec_from_file_location('lift5', os.path.join(HERE, '..', 'sheet', 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
def raster(polys):   # the pixels whose centres lie inside any of the polygons (picture pixels; even-odd within each polygon)
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
def clear_gap(a, b, limit=200):   # the square pixels of clear space between two masks: -1 if they overlap, 0 if they touch
    g = a.copy(); k = 0
    while not (g & b).any() and k < limit: g = L.grow(g, 1); k += 1
    return k - 1
def window_gap(a, b, limit=60):   # clear_gap within a window around a, up to limit (a result of limit means at least that)
    ys, xs = np.where(a); y0, y1, x0, x1 = max(0, ys.min() - limit - 3), min(H, ys.max() + limit + 4), max(0, xs.min() - limit - 3), min(W, xs.max() + limit + 4)
    return clear_gap(a[y0:y1, x0:x1], b[y0:y1, x0:x1], limit + 1)
def against(fm, mask):
    inside, outside = int((fm & mask).sum()), int((fm & ~mask).sum())
    if outside == 0: return {'status': 'inside', 'insidePx': window_gap(fm, ~mask)}
    if inside == 0: return {'status': 'clear', 'clearPx': window_gap(fm, mask)}
    return {'status': 'crosses', 'pxInside': inside, 'pxOutside': outside}
def test(FEAT, place, place3, areas, plain=None):
    """FEAT: the features file (dict); place, place3: the step-2 and step-3 masks (bool; place3 all False with no step 3); areas:
    {name: bool mask} each piece's own area, for the pair table; plain: step 2's plain-wall area, where there is one. Returns
    (featureTest, failures): featureTest as kitA.py writes it into kit-A.json; failures, the reasons the build must stop."""
    MIN = FEAT['minClearPx']; step3 = bool(place3.any())
    band = lambda m: L.grow(m, MIN) & L.grow(~m, MIN)   # every pixel within 15 px of the mask's edge, on either side
    BAND2, BAND3 = band(place), band(place3)
    features, failures, exceptions, noted = [], [], [], []
    for f in FEAT['features']:
        fm = raster(f['polygons']); r2 = against(fm, place); v2 = fm & BAND2
        left = fm & ~place
        r3 = (against(left, place3) if left.any() else {'status': 'repainted in step 2'}) if step3 else {'status': 'no step 3'}
        v3 = (left & BAND3) if (step3 and left.any()) else np.zeros_like(fm)
        e = {'name': f['name'], 'kind': f['kind'], 'test': f['test'], 'px': int(fm.sum()), 'step2': r2, 'step3': r3, 'pxWithin15': {'step2': int(v2.sum()), 'step3': int(v3.sum())}}
        if f['test'] and (v2.any() or v3.any()):
            zones = f.get('exceptions', []); zm = raster([z['zone'] for z in zones]) if zones else np.zeros_like(fm)
            if zones and not ((v2 | v3) & ~zm).any():
                used = [z for z in zones if (raster([z['zone']]) & (v2 | v3)).any()]
                e['exception'] = [{'where': z['where'], 'for': z['for'], 'why': z['why'], 'pxWithin15': int((raster([z['zone']]) & (v2 | v3)).sum())} for z in used]
                exceptions.append({'name': f['name'], 'parts': e['exception']})
            else: failures.append(f"{f['name']}: step 2 {r2}, step 3 {r3}, {int(v2.sum())} + {int(v3.sum())} px within 15 px of an edge")
        if not f['test'] and (v2.any() or v3.any()): noted.append({'name': f['name'], 'step2': r2, 'pxWithin15': int(v2.sum() + v3.sum())})
        features.append(e)
    out = {'picture': FEAT['picture'], 'rule': FEAT['rule'], 'minClearPx': MIN, 'atLeastPx': 60, 'passed': True, 'features': features}
    if plain is not None and step3:
        cap_in_plain = window_gap(place3, ~place)
        if cap_in_plain < MIN: failures.append(f"step 3's mask is {cap_in_plain} px inside step 2's plain-wall area (want {MIN})")
        out['step3InsidePlainWallPx'] = cap_in_plain
    out['exceptions'], out['noted'] = exceptions, noted
    box_of = lambda b: raster([[[b[0], b[1]], [b[2] + 1, b[1]], [b[2] + 1, b[3] + 1], [b[0], b[3] + 1]]])
    out['lights'] = [{'name': lt['name'], 'box': lt['box'], 'step2ClearPx': window_gap(box_of(lt['box']), place), **({'step3ClearPx': window_gap(box_of(lt['box']), place3)} if step3 else {})} for lt in FEAT.get('lights', [])]
    if any(l['step2ClearPx'] < 0 or l.get('step3ClearPx', 0) < 0 for l in out['lights']): failures.append('a small light is inside a mask')
    pairs = {}
    for an, am in areas.items():
        pairs[an] = {}
        for f in FEAT['features']:
            r = against(raster(f['polygons']), am)
            if r['status'] == 'clear' and r['clearPx'] >= 60: continue
            pairs[an][f['name']] = r
    out['pairs'] = pairs; out['passed'] = not failures
    return out, failures
def selftest():   # view A's own files, as kitA.py (version 4) reads them: the result must be kit-A.json's featureTest, key for key
    A = os.path.join(HERE, '..', 'sheet'); J = lambda f: json.load(open(os.path.join(A, f)))
    binary = lambda f: np.array(Image.open(os.path.join(A, f)).convert('L')) > 127
    FEAT, KIT, PLAIN = J('featuresA.json'), J('kit-A.json'), J('plainA.json')
    place, place3, lab = binary('ra-A-place.png'), binary('ra-A-place3.png'), np.array(Image.open(os.path.join(A, 'ra-A-stations.png')).convert('L')).astype(int)
    plain = raster(PLAIN['polygons'] if 'polygons' in PLAIN else [PLAIN['polygon']])
    areas = {f"{p['place']} {p['name']}": plain if p.get('kind') == 'background' else L.grow(np.abs(lab - p['grey']) <= 2, 6) for p in KIT['pieces']}
    areas['wall food capsule (step 3)'] = place3
    got, failures = test(FEAT, place, place3, areas, plain)
    want = KIT['featureTest']; same = {k: got.get(k) == want.get(k) for k in sorted(set(got) | set(want))}
    print(json.dumps({'failures': failures, 'sameAsKitA': same}, indent=1)); return all(same.values()) and not failures
if __name__ == '__main__':
    raise SystemExit(0 if selftest() else 1)
