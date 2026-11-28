# Sheet RA-B's masks (Room A, view B: Mira's place), version 2, from guideB.mjs's renders, as sheet RA-A's (kitA.py) makes them:
#   ra-B-place.png   step 2's PLACE mask: the step-2 pieces' tight outlines (ra-B-furniture.png) grown 6 px; white = repaint
#   ra-B-split.png   each piece's outline grown 6 px in its own grey, the nearer drawn over the farther (the nearer piece owns an
#                    overlap); its non-zero pixels are exactly the PLACE mask
# and kit-B.json: the pieces (with their pixels, box and visible centre), the mask's shapes (connected parts) with the pieces each
# holds, the expected masked share and alpha hash (alpha 0 = repaint, 255 = keep; sha256 of the alpha bytes), the clear gap between
# each two pieces (tight and grown), and the gap from the mask to the openings the guide draws (the round window's frame and glass,
# the screens). View B has no plain-wall area and no step 3: the food capsule and Echo's cabinet are out of view. Version 2 (the
# Lead, 27 November, on RA-B-2): the 15 px rule (sheet RA-A version 4's) against RA-B-2's painted features (featuresB.json, by
# sheetV/feat15.py, the same code as view A's); the build stops if it fails. kit-B.json also records the desk's floor fit (the
# guide draws its floor corners on RA-B-2's painted deck: floorfit-B.json, measure-B2.json) and Vega's foot line, measured against
# the painted deck and moved only if more than 8 px off (the Lead's rule): measure-B2.json. The build stops, as before, if a mask
# edge falls within 15 px of the window's frame as drawn.
# Usage: python3 -I kitB.py
import hashlib, importlib.util, json, os
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); W, H, GROW, MIN = 1024, 1536, 6, 15
spec = importlib.util.spec_from_file_location('lift5', os.path.join(D, 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
PIECES = json.load(open(os.path.join(D, 'pieces-B.json')))
binary = lambda f: np.array(Image.open(os.path.join(D, f)).convert('L')) > 127
grey_of = lambda f: np.array(Image.open(os.path.join(D, f)).convert('L')).astype(int)
save = lambda a, f: Image.fromarray((a * 255).astype(np.uint8) if a.dtype == bool else a.astype(np.uint8), 'L').save(os.path.join(D, f), optimize=True)
alpha = lambda a: hashlib.sha256(np.where(a, 0, 255).astype(np.uint8).tobytes()).hexdigest()
def described(p, m):
    ys, xs = np.where(m)
    return {**p, 'px': int(m.sum()), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1], 'visibleCentreX': round(float(xs.mean())), 'visibleCentreY': round(float(ys.mean())),
            'cutByEdge': bool(xs.min() == 0 or xs.max() == W - 1 or ys.min() == 0 or ys.max() == H - 1)}
def shapes_of(mask, split, pieces):
    comp, sizes = L.parts(mask); out = []
    for c in range(1, len(sizes)):
        m = comp == c; ys, xs = np.where(m); greys = set(int(g) for g in np.unique(split[m])) - {0}
        out.append({'pieces': [i for i, p in enumerate(pieces) if p['grey'] in greys], 'px': int(m.sum()), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1], 'visibleCentreX': round(float(xs.mean())),
                    'cutByEdge': bool(xs.min() == 0 or xs.max() == W - 1 or ys.max() == H - 1)})
    return sorted(out, key=lambda s: s['visibleCentreX'])
def clear_gap(a, b, limit=200):   # the square pixels of clear space between two masks: -1 if they overlap, 0 if they touch
    g = a.copy(); k = 0
    while not (g & b).any() and k < limit: g = L.grow(g, 1); k += 1
    return k - 1
furn, lab = binary('ra-B-furniture.png'), grey_of('ra-B-stations.png')
pieces = []
for p in [p for p in PIECES if p['step'] == 2]:
    m = np.abs(lab - p['grey']) <= 2
    if m.any(): pieces.append(described(p, m))
if [p['step'] for p in PIECES if p['step'] != 2]: raise SystemExit('STOP: view B has step 2 only')
place = L.grow(furn, GROW); split = np.zeros((H, W), np.uint8)
for p in sorted(pieces, key=lambda p: p['grey']): split[L.grow(np.abs(lab - p['grey']) <= 2, GROW)] = p['grey']   # the greys run far to near: the nearer drawn last
assert ((split > 0) == place).all(), 'the split map is not the PLACE mask'
pieces = sorted(pieces, key=lambda p: p['visibleCentreX']); shapes = shapes_of(place, split, pieces)
own = {p['name']: np.abs(lab - p['grey']) <= 2 for p in pieces}
gaps = {f"{p['name']} / {q['name']}": {'tightPx': clear_gap(own[p['name']], own[q['name']]), 'grownPx': clear_gap(split == p['grey'], split == q['grey'])} for i, p in enumerate(pieces) for q in pieces[i + 1:]}
# the openings as the guide draws them: the round window (its glass, black in the empty guide, and its frame, which the region map
# leaves black) and the screens (the window colour in the step-2 map)
emap, smap = np.array(Image.open(os.path.join(D, 'ra-B-empty-regions.png')).convert('RGB')).astype(int), np.array(Image.open(os.path.join(D, 'ra-B-regions.png')).convert('RGB')).astype(int)
is_col = (lambda a, c: (np.abs(a - np.array(c)).max(axis=2) <= 8))
glass = is_col(emap, (255, 0, 255)); frame = L.grow(glass, 14) & is_col(emap, (0, 0, 0)) & ~glass   # the frame: the black ring the map leaves round the glass
screens = is_col(smap, (255, 0, 255)) & ~glass
if not glass.any() or not screens.any(): raise SystemExit('STOP: the guide has no window or no screens')
def gap_to(m): return clear_gap(m, place, 120)
openings = {'window glass': {'px': int(glass.sum()), 'clearPx': gap_to(glass)}, 'window frame (as drawn)': {'px': int(frame.sum()), 'clearPx': gap_to(frame)},
            'screens': {'px': int(screens.sum()), 'insidePlaceMask': bool((screens & ~place).sum() == 0), 'note': "the monitors' screens are part of the PC workstation's piece: openings painted flat black inside the mask"}}
if openings['window frame (as drawn)']['clearPx'] < MIN: raise SystemExit(f"STOP: the PLACE mask comes within {openings['window frame (as drawn)']['clearPx']} px of the window's frame (want {MIN})")
# version 2: the 15 px rule against RA-B-2's painted features; each piece's own area (grown 6 px) for the pair table
spec = importlib.util.spec_from_file_location('feat15', os.path.join(D, '..', 'sheetV', 'feat15.py')); F15 = importlib.util.module_from_spec(spec); spec.loader.exec_module(F15)
FEAT = json.load(open(os.path.join(D, 'featuresB.json')))
areas = {f"{p['place']} {p['name']}": L.grow(np.abs(lab - p['grey']) <= 2, GROW) for p in pieces}
featureTest, failures = F15.test(FEAT, place, np.zeros_like(place), areas)
if failures: raise SystemExit('STOP: the 15 px rule fails: ' + ' | '.join(failures))
M2, FIT = json.load(open(os.path.join(D, 'measure-B2.json'))), json.load(open(os.path.join(D, 'floorfit-B.json')))
if FIT['picture']['sha256'] != FEAT['picture']['sha256'] or M2['picture']['sha256'] != FEAT['picture']['sha256']: raise SystemExit('STOP: the features, the measure and the fit are not of one picture')
floorFit = {'objects': FIT['objects'], 'picture': FIT['picture']['name'], 'paintedWallFoot': M2['wallFoot']['offsetByX'], 'paintedFarSeam': M2['farSeam']['offsetByX'],
            'deskCorners': [{'fromWallM': c['fromWallM'], 'guide': c['px'], 'painted': [c['px'][0], c['paintedY']], 'downPx': c['offsetPx']} for c in M2['deskCorners']],
            'how': "each of the desk's floor corners keeps its fraction of the way from the north wall's foot to the deck seam 1 m out, as the guide's camera puts it, and is drawn at that fraction between RA-B-2's painted foot and seam; the tabletop and the monitors stay where the camera puts them"}
v = M2['vegaFoot']; vegaFoot = {'anchor': v['anchor'], 'paintedOffsetPx': v['offsetPx'], 'seamCrossingOffsetPx': M2['seamBesideVega']['offset'], 'limitPx': 8,
            'moved': bool(abs(v['offsetPx']) > 8), 'how': "the painted deck at Vega's anchor (its fraction of the way from the wall's foot to the far seam, placed between the painted ones), and the nearest seam crossing (x -1 m, 1 m out) against the guide's"}
if vegaFoot['moved']: raise SystemExit("STOP: Vega's foot line is more than 8 px off the painted deck: move it in the people's data first")
save(place, 'ra-B-place.png'); save(split, 'ra-B-split.png')
out = {'pieces': pieces, 'shapes': shapes, 'split': {f"{p['place']} {p['name']}": p['grey'] for p in pieces}, 'outlineShare': round(float(furn.mean()), 4), 'gaps': gaps, 'openings': openings,
       'featureTest': featureTest, 'floorFit': floorFit, 'vegaFoot': vegaFoot,
       'expected': {'s2': {'maskedShare': round(float(place.mean()), 4), 'rawMaskAlpha': alpha(place), 'over10': bool(place.mean() > 0.10)}}}
json.dump(out, open(os.path.join(D, 'kit-B.json'), 'w'), indent=1)
print('step 2: outlines', out['outlineShare'], '| PLACE mask', out['expected']['s2']['maskedShare'], '|', len(shapes), 'shapes:',
      ' | '.join(' + '.join(pieces[i]['name'] for i in s['pieces']) + f" x {s['bbox'][0]}-{s['bbox'][2]} y {s['bbox'][1]}-{s['bbox'][3]}" for s in shapes))
print('gaps:', ' | '.join(f"{k} {v['tightPx']} px (grown {v['grownPx']})" for k, v in gaps.items()))
print('openings:', json.dumps(openings))
print('15 px rule:', 'passed' if featureTest['passed'] else 'FAILED', '|', len(featureTest['features']), 'features,', sum(len(e['parts']) for e in featureTest['exceptions']), 'named exceptions | lights clear', [l['step2ClearPx'] for l in featureTest['lights']], "| Vega's foot", vegaFoot['paintedOffsetPx'], 'px, moved', vegaFoot['moved'])
