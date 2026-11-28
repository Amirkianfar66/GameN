# Sheet RA-A's masks (Room A, view A), from guideA.mjs's renders and plainA.json, as Room B's PV6 kits make them (kit6.py, kit8.py):
#   ra-A-place.png    step 2's PLACE mask: the step-2 pieces' tight outlines (ra-A-furniture.png) grown 6 px, and the plain-wall area
#                     (plainA.json) as drawn; white = repaint
#   ra-A-split.png    the plain-wall area in its grey, then each step-2 piece's outline grown 6 px in its own grey, the nearer drawn
#                     over the farther (the nearer piece owns an overlap); its non-zero pixels are exactly the PLACE mask
#   ra-A-place3.png   step 3's mask: the food capsule's outline (ra-A-capsule.png) grown 2 px, less every step-2 piece's tight outline
#   ra-A-split3.png   the capsule's grey inside step 3's mask
# and kit-A.json: the pieces (with their pixels, box and visible centre), the masks' shapes (connected parts) with the pieces each holds,
# the expected masked shares and alpha hashes (alpha 0 = repaint, 255 = keep; sha256 of the alpha bytes), and the clear gap between
# each two step-2 pieces, tight and grown (square pixels between them). Version 2 (the Lead, 19 November): the hatch's lid and the
# electrical cabinet at least 30 px apart, so their grown outlines stay at least 18 px apart; the build stops if they are not.
# Version 3 (the Lead, 19 November): the plain-wall area, step 2's background piece. Version 4 (the Lead's rule of 19 November):
# RA-A-1's painted features (featuresA.json) are the kit's fixed obstacles. Every step-2 and step-3 mask edge either covers a feature
# in the test with at least 15 px to spare or clears it by at least 15 px (square pixels): no part of it lies within 15 px of an
# edge, on either side. In step 3, what step 2 leaves of each feature is tested. A named exception (for the Lead's decision) passes
# only where every such part lies in its zone. The build stops on any other failure, if step 3's mask is less than 15 px inside the
# plain-wall area, or if a small light is inside a mask. kit-A.json keeps every piece's measured gap to every feature.
# Usage: python3 -I kitA.py
import hashlib, importlib.util, json, os
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); W, H, GROW, GROW3 = 1024, 1536, 6, 2
spec = importlib.util.spec_from_file_location('lift5', os.path.join(D, 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
J = lambda f: json.load(open(os.path.join(D, f)))
PIECES, PLAIN, FEAT = J('pieces-A.json'), J('plainA.json'), J('featuresA.json')
binary = lambda f: np.array(Image.open(os.path.join(D, f)).convert('L')) > 127
grey_of = lambda f: np.array(Image.open(os.path.join(D, f)).convert('L')).astype(int)
save = lambda a, f: Image.fromarray((a * 255).astype(np.uint8) if a.dtype == bool else a.astype(np.uint8), 'L').save(os.path.join(D, f), optimize=True)
alpha = lambda a: hashlib.sha256(np.where(a, 0, 255).astype(np.uint8).tobytes()).hexdigest()
def raster(polys):   # the pixels whose centres lie inside any of the polygons (picture pixels; even-odd within each polygon)
    m = np.zeros((H, W), bool)
    for poly in polys:
        P = np.array(poly, float); x0, y0 = P[:, 0], P[:, 1]; x1, y1 = np.roll(x0, -1), np.roll(y0, -1)
        for r in range(max(0, int(np.floor(y0.min()))), min(H, int(np.ceil(y0.max())) + 1)):
            yc = r + 0.5; cross = ((y0 <= yc) & (y1 > yc)) | ((y1 <= yc) & (y0 > yc))
            if not cross.any(): continue
            xs = np.sort(x0[cross] + (yc - y0[cross]) * (x1[cross] - x0[cross]) / (y1[cross] - y0[cross]))
            for a, b in zip(xs[0::2], xs[1::2]): m[r, max(0, int(np.ceil(a - 0.5))):min(W, int(np.ceil(b - 0.5)))] = True
    return m
def described(p, m):
    ys, xs = np.where(m)
    return {**p, 'px': int(m.sum()), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1], 'visibleCentreX': round(float(xs.mean())), 'visibleCentreY': round(float(ys.mean())),
            'cutByEdge': bool(xs.min() == 0 or xs.max() == W - 1 or ys.min() == 0 or ys.max() == H - 1)}
def shapes_of(mask, split, pieces):
    comp, sizes = L.parts(mask); out = []
    for c in range(1, len(sizes)):
        m = comp == c; ys, xs = np.where(m); greys = set(int(g) for g in np.unique(split[m])) - {0}
        out.append({'pieces': [i for i, p in enumerate(pieces) if p['grey'] in greys], 'px': int(m.sum()), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1], 'visibleCentreX': round(float(xs.mean())),
                    'cutByEdge': bool(xs.min() == 0 or xs.max() == W - 1), 'tall': round((ys.max() + 1 - ys.min()) / max(1, xs.max() + 1 - xs.min()), 2)})
    return sorted(out, key=lambda s: s['visibleCentreX'])
def clear_gap(a, b, limit=200):   # the square pixels of clear space between two masks: -1 if they overlap, 0 if they touch
    g = a.copy(); k = 0
    while not (g & b).any() and k < limit: g = L.grow(g, 1); k += 1
    return k - 1
def window_gap(a, b, limit=60):   # clear_gap within a window around a, up to limit (a result of limit means at least that)
    ys, xs = np.where(a); y0, y1, x0, x1 = max(0, ys.min() - limit - 3), min(H, ys.max() + limit + 4), max(0, xs.min() - limit - 3), min(W, xs.max() + limit + 4)
    return clear_gap(a[y0:y1, x0:x1], b[y0:y1, x0:x1], limit + 1)
# step 2: the furniture, and the plain-wall area as drawn
furn, lab = binary('ra-A-furniture.png'), grey_of('ra-A-stations.png')
pieces = []
for p in [p for p in PIECES if p['step'] == 2]:
    m = np.abs(lab - p['grey']) <= 2
    if m.any(): pieces.append(described(p, m))
plain = raster(PLAIN['polygons'] if 'polygons' in PLAIN else [PLAIN['polygon']])
if plain.sum() == 0 or any(p['grey'] == PLAIN['grey'] for p in pieces) or PLAIN['grey'] >= min(p['grey'] for p in pieces): raise SystemExit("STOP: the plain-wall area's grey must be its own, and the farthest")
place = L.grow(furn, GROW) | plain; split = np.zeros((H, W), np.uint8); split[plain] = PLAIN['grey']
for p in sorted(pieces, key=lambda p: p['grey']): split[L.grow(np.abs(lab - p['grey']) <= 2, GROW)] = p['grey']   # greys run far to near: the nearer drawn last
assert ((split > 0) == place).all(), 'the split map is not the PLACE mask'
wall = described({'grey': PLAIN['grey'], 'place': PLAIN['place'], 'name': PLAIN['name'], 'step': 2, 'kind': PLAIN['kind'], 'parts': PLAIN['repaints'], 'depthM': None}, split == PLAIN['grey'])
wall['drawnPx'] = int(plain.sum())
pieces = sorted(pieces + [wall], key=lambda p: p['visibleCentreX']); shapes = shapes_of(place, split, pieces)
# step 3: the capsule alone
cap, lab3 = binary('ra-A-capsule.png'), grey_of('ra-A-capsule-label.png')
pieces3 = []
for p in [p for p in PIECES if p['step'] == 3]:
    m = np.abs(lab3 - p['grey']) <= 2
    if m.any(): pieces3.append(described(p, m))
place3 = L.grow(cap, GROW3) & ~furn; split3 = np.zeros((H, W), np.uint8)
for p in pieces3: split3[place3 & L.grow(np.abs(lab3 - p['grey']) <= 2, GROW3)] = p['grey']
assert ((split3 > 0) == place3).all(), "the split map is not step 3's mask"
shapes3 = shapes_of(place3, split3, pieces3)
furniture = [p for p in pieces if p.get('kind') != 'background']
own = {p['name']: np.abs(lab - p['grey']) <= 2 for p in furniture}
gaps = {f"{p['name']} / {q['name']}": {'tightPx': clear_gap(own[p['name']], own[q['name']]), 'grownPx': clear_gap(split == p['grey'], split == q['grey'])} for i, p in enumerate(furniture) for q in furniture[i + 1:]}
LID_CAB = gaps.get('hatch lid / electrical cabinet') or gaps.get('electrical cabinet / hatch lid')
if LID_CAB['tightPx'] < 30 or LID_CAB['grownPx'] < 18: raise SystemExit(f"STOP: the hatch's lid and the cabinet are {LID_CAB['tightPx']} px apart (grown {LID_CAB['grownPx']}): the target is 30 (18)")
# the 15 px rule against RA-A-1's painted features
MIN = FEAT['minClearPx']
def against(fm, mask):
    inside, outside = int((fm & mask).sum()), int((fm & ~mask).sum())
    if outside == 0: return {'status': 'inside', 'insidePx': window_gap(fm, ~mask)}
    if inside == 0: return {'status': 'clear', 'clearPx': window_gap(fm, mask)}
    return {'status': 'crosses', 'pxInside': inside, 'pxOutside': outside}
band = lambda m: L.grow(m, MIN) & L.grow(~m, MIN)   # every pixel within 15 px of the mask's edge, on either side
BAND2, BAND3 = band(place), band(place3)
features, failures, exceptions, noted = [], [], [], []
for f in FEAT['features']:
    fm = raster(f['polygons']); r2 = against(fm, place); v2 = fm & BAND2
    left = fm & ~place; r3 = against(left, place3) if left.any() else {'status': 'repainted in step 2'}; v3 = (left & BAND3) if left.any() else np.zeros_like(fm)
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
cap_in_plain = window_gap(place3, ~place)
if cap_in_plain < MIN: failures.append(f"step 3's mask is {cap_in_plain} px inside step 2's plain-wall area (want {MIN})")
box_of = lambda b: raster([[[b[0], b[1]], [b[2] + 1, b[1]], [b[2] + 1, b[3] + 1], [b[0], b[3] + 1]]])
lights = [{'name': lt['name'], 'box': lt['box'], 'step2ClearPx': window_gap(box_of(lt['box']), place), 'step3ClearPx': window_gap(box_of(lt['box']), place3)} for lt in FEAT['lights']]
if any(l['step2ClearPx'] < 0 or l['step3ClearPx'] < 0 for l in lights): failures.append('a small light is inside a mask')
if failures: raise SystemExit('STOP: the 15 px rule: ' + ' | '.join(failures))
# every piece's own area against every feature: the gaps the Lead asked for, pair by pair
areas = {f"{p['place']} {p['name']}": plain if p.get('kind') == 'background' else L.grow(np.abs(lab - p['grey']) <= 2, GROW) for p in pieces}   # the plain wall as drawn
areas['wall food capsule (step 3)'] = place3
pairs = {}
for an, am in areas.items():
    pairs[an] = {}
    for f in FEAT['features']:
        r = against(raster(f['polygons']), am)
        if r['status'] == 'clear' and r['clearPx'] >= 60: continue
        pairs[an][f['name']] = r
save(place, 'ra-A-place.png'); save(split, 'ra-A-split.png'); save(place3, 'ra-A-place3.png'); save(split3, 'ra-A-split3.png')
out = {'pieces': pieces, 'shapes': shapes, 'split': {f"{p['place']} {p['name']}": p['grey'] for p in pieces}, 'outlineShare': round(float(furn.mean()), 4), 'plainShare': round(float(plain.mean()), 4),
       'pieces3': pieces3, 'shapes3': shapes3, 'split3': {f"{p['place'] or 'wall'} {p['name']}": p['grey'] for p in pieces3}, 'outlineShare3': round(float(cap.mean()), 4),
       'capsuleUnderFurniturePx': int((L.grow(cap, GROW3) & furn).sum()), 'gaps': gaps, 'target': {'pair': 'hatch lid / electrical cabinet', 'minTightPx': 30, 'minGrownPx': 18, 'met': True},
       'featureTest': {'picture': FEAT['picture'], 'rule': FEAT['rule'], 'minClearPx': MIN, 'atLeastPx': 60, 'passed': True, 'features': features, 'step3InsidePlainWallPx': cap_in_plain, 'exceptions': exceptions, 'noted': noted, 'lights': lights, 'pairs': pairs},
       'expected': {'s2': {'maskedShare': round(float(place.mean()), 4), 'rawMaskAlpha': alpha(place), 'over10': bool(place.mean() > 0.10)},
                    's3': {'maskedShare': round(float(place3.mean()), 4), 'rawMaskAlpha': alpha(place3)}}}
json.dump(out, open(os.path.join(D, 'kit-A.json'), 'w'), indent=1)
print('step 2: outlines', out['outlineShare'], '| plain wall', out['plainShare'], '| PLACE mask', out['expected']['s2']['maskedShare'], '(over 10%)' if out['expected']['s2']['over10'] else '', '|', len(shapes), 'shapes:',
      ' | '.join(' + '.join(pieces[i]['name'] for i in s['pieces']) + f" x {s['bbox'][0]}-{s['bbox'][2]} y {s['bbox'][1]}-{s['bbox'][3]}" for s in shapes))
print('gaps:', ' | '.join(f"{k} {v['tightPx']} px (grown {v['grownPx']})" for k, v in gaps.items()))
print('step 3: outline', out['outlineShare3'], '| mask', out['expected']['s3']['maskedShare'], '|', len(shapes3), 'shape:', ' | '.join(' + '.join(pieces3[i]['name'] for i in s['pieces']) + f" x {s['bbox'][0]}-{s['bbox'][2]} y {s['bbox'][1]}-{s['bbox'][3]}" for s in shapes3),
      '| capsule pixels under the furniture', out['capsuleUnderFurniturePx'], '| inside the plain wall by', cap_in_plain, 'px')
for e in features: print(f"  {'TEST' if e['test'] else 'note'} {e['name']}: step 2 {e['step2']} | step 3 {e['step3']} | within 15 px {e['pxWithin15']}{' | EXCEPTION ' + ', '.join(x['where'] for x in e['exception']) if 'exception' in e else ''}")
print('noted within 15 px:', [(n['name'], n['pxWithin15']) for n in noted])
for an, row in pairs.items(): print(f'  pair {an}: ' + ('; '.join(f"{k} {v['status']} {v.get('clearPx', v.get('insidePx', v.get('pxInside')))}" for k, v in row.items()) or 'everything 60+ px clear'))
