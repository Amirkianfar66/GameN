# Sheet RA-@V@'s masks (Room A, view @V@: @N@'s place), version 1, from guide@V@.mjs's renders, as sheet RA-B's (kitB.py) make them,
# with sheet RA-A's step 3 (kitA.py) where the food capsule is in view:
#   ra-@V@-place.png    step 2's PLACE mask: the step-2 pieces' tight outlines (ra-@V@-furniture.png) grown 6 px; white = repaint
#   ra-@V@-split.png    each piece's outline grown 6 px in its own grey, the nearer drawn over the farther (the nearer piece owns an
#                       overlap); its non-zero pixels are exactly the PLACE mask
#   ra-@V@-place3.png   step 3's mask, where the capsule is in view: its outline (ra-@V@-capsule.png) grown 2 px, less every step-2
#                       piece's tight outline
#   ra-@V@-split3.png   the capsule's grey inside step 3's mask
# and kit-@V@.json: the pieces (with their pixels, box and visible centre), the masks' shapes (connected parts) with the pieces each
# holds, the expected masked shares and alpha hashes (alpha 0 = repaint, 255 = keep; sha256 of the alpha bytes), the clear gap
# between each two step-2 pieces (tight and grown), the gap from the masks to the openings the guide draws (the round window's glass
# and frame, the screens), and the viewer's own station, which the approved plan leaves out of the viewer's view: its pixels in the
# painting and in each phone's slice (ra-@V@-own.png, one grey an object). The 15 px rule against the step-1 picture's painted
# features (sheet RA-A version 4's) is applied to the masks once RA-@V@-1 exists, as it was to view A's. Until then the build stops
# if a mask comes within 15 px of the window's frame as drawn, if the hatch's lid and the cabinet are closer than view A's target
# (30 px, 18 px grown), or if the guide's account of what is in view (view-@V@.json) and its renders disagree.
# Usage: python3 -I kit@V@.py
import hashlib, importlib.util, json, os
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); W, H, GROW, GROW3, MIN = 1024, 1536, 6, 2, 15
spec = importlib.util.spec_from_file_location('lift5', os.path.join(D, 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
J = lambda f: json.load(open(os.path.join(D, f)))
PIECES, VIEW = J('pieces-@V@.json'), J('view-@V@.json')
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
STEP2, STEP3 = [p for p in PIECES if p['step'] == 2], [p for p in PIECES if p['step'] == 3]
if any(p['step'] not in (2, 3) for p in PIECES) or [p['name'] for p in STEP3] not in ([], ['food capsule']): raise SystemExit('STOP: step 2 holds the furniture and step 3 the food capsule alone')
if bool(STEP3) != VIEW['inView']['capsule']: raise SystemExit("STOP: the guide's account of the capsule and the pieces disagree")
# step 2: the furniture
furn, lab = binary('ra-@V@-furniture.png'), grey_of('ra-@V@-stations.png')
pieces = []
for p in STEP2:
    m = np.abs(lab - p['grey']) <= 2
    if m.any(): pieces.append(described(p, m))
if len(pieces) != len(STEP2): raise SystemExit('STOP: a step-2 piece has no pixels in the painting')
place = L.grow(furn, GROW); split = np.zeros((H, W), np.uint8)
for p in sorted(pieces, key=lambda p: p['grey']): split[L.grow(np.abs(lab - p['grey']) <= 2, GROW)] = p['grey']   # the greys run far to near: the nearer drawn last
assert ((split > 0) == place).all(), 'the split map is not the PLACE mask'
# version 2 (C's 2.1; the Lead, 27 November, 18:38): the selective 12 px growth. Where the view has the step-1 picture's traced
# features (features@V@.json), step 2's mask grows 12 px more, but only where no traced feature, no small light, no window (glass or
# frame, as drawn) and no step-3 capsule lies within 15 px of the new edge; each added pixel takes its piece's grey, as the 6 px
# growth does (the nearer piece where two meet). A piece painted a little past its outline is then not cut; larger overruns are
# completed in code from the raw, as RA-B-3c was.
GROW12, growth = 12, None
if os.path.exists(os.path.join(D, 'features@V@.json')):
    spec = importlib.util.spec_from_file_location('feat15', os.path.join(D, '..', 'sheetV', 'feat15.py')); F15 = importlib.util.module_from_spec(spec); spec.loader.exec_module(F15)
    FEAT = json.load(open(os.path.join(D, 'features@V@.json')))
    obst = F15.raster([q for f in FEAT['features'] for q in f['polygons']])
    for lt in FEAT.get('lights', []): obst[lt['box'][1]:lt['box'][3] + 1, lt['box'][0]:lt['box'][2] + 1] = True
    em = np.array(Image.open(os.path.join(D, 'ra-@V@-empty-regions.png')).convert('RGB')).astype(int); gl = np.abs(em - np.array((255, 0, 255))).max(axis=2) <= 8
    obst |= gl | (L.grow(gl, 14) & (np.abs(em).max(axis=2) <= 8))
    if STEP3: obst |= binary('ra-@V@-capsule.png')
    extra = L.grow(place, GROW12) & ~place & ~L.grow(obst, MIN)
    # each masked area grows on its own and stays apart: no growth where two areas' bands would meet, nor next to another area
    comp0, sizes0 = L.parts(place); G = [L.grow(comp0 == c, GROW12) for c in range(1, len(sizes0))]
    contested = sum(g.astype(np.uint8) for g in G) >= 2; mine = [g & extra & ~contested for g in G]
    mine = [m & ~L.grow(np.logical_or.reduce([(comp0 == j + 1) | mine[j] for j in range(len(G)) if j != k] or [np.zeros_like(place)]), 1) for k, m in enumerate(mine)]
    def attached(k, m):   # only the growth joined to its own area: the exclusions can cut a band into islands, which are dropped
        cu, _ = L.parts((comp0 == k + 1) | m); own = np.unique(cu[comp0 == k + 1]); return m & np.isin(cu, own[own > 0])
    mine = [attached(k, m) for k, m in enumerate(mine)]
    extra = np.logical_or.reduce(mine) if mine else np.zeros_like(place)
    grown = split.copy()
    for p in sorted(pieces, key=lambda p: p['grey']): grown[extra & L.grow(np.abs(lab - p['grey']) <= 2, GROW + GROW12)] = p['grey']
    if (extra & (grown == 0)).any(): raise SystemExit('STOP: a grown pixel has no piece')
    growth = {'px': GROW12, 'decision': "the Lead, 27 November 2026, 18:38: the selective 12 px growth, for views C, E and D",
              'rule': "step 2's mask grows 12 px more, only where no traced feature, small light, window or step-3 capsule lies within 15 px of the new edge, and each masked area on its own, kept apart from the others, with no islands; each added pixel takes its piece's grey",
              'addedPx': int(extra.sum()), 'maskedShareBefore': round(float(place.mean()), 4)}
    n0 = len(sizes0) - 1; place, split = place | extra, grown; growth['maskedShareAfter'] = round(float(place.mean()), 4)
    assert ((split > 0) == place).all(), 'the grown split map is not the PLACE mask'
    if len(L.parts(place)[1]) - 1 != n0: raise SystemExit('STOP: the growth changed the number of masked areas')
    growth['areasKeptApart'] = n0
pieces = sorted(pieces, key=lambda p: p['visibleCentreX']); shapes = shapes_of(place, split, pieces)
own = {p['name']: np.abs(lab - p['grey']) <= 2 for p in pieces}
gaps = {f"{p['name']} / {q['name']}": {'tightPx': clear_gap(own[p['name']], own[q['name']]), 'grownPx': clear_gap(split == p['grey'], split == q['grey'])} for i, p in enumerate(pieces) for q in pieces[i + 1:]}
LC = gaps.get('hatch lid / electrical cabinet') or gaps.get('electrical cabinet / hatch lid')
if LC and (LC['tightPx'] < 30 or LC['grownPx'] < 18): raise SystemExit(f"STOP: the hatch's lid and the cabinet are {LC['tightPx']} px apart (grown {LC['grownPx']}): view A's target is 30 (18)")
# step 3: the capsule alone, where it is in view
pieces3, shapes3, place3, split3 = [], [], np.zeros((H, W), bool), np.zeros((H, W), np.uint8)
if STEP3:
    cap, lab3 = binary('ra-@V@-capsule.png'), grey_of('ra-@V@-capsule-label.png')
    for p in STEP3:
        m = np.abs(lab3 - p['grey']) <= 2
        if m.any(): pieces3.append(described(p, m))
    place3 = L.grow(cap, GROW3) & ~furn
    for p in pieces3: split3[place3 & L.grow(np.abs(lab3 - p['grey']) <= 2, GROW3)] = p['grey']
    assert ((split3 > 0) == place3).all(), "the split map is not step 3's mask"
    shapes3 = shapes_of(place3, split3, pieces3)
    if len(pieces3) != 1 or len(shapes3) != 1: raise SystemExit('STOP: step 3 expects the capsule alone, in one shape')
# the openings as the guide draws them: the round window (its glass, magenta in the empty room's map, and its frame, the black ring
# that map leaves round the glass) and the screens (the window colour in step 2's map)
emap, smap = np.array(Image.open(os.path.join(D, 'ra-@V@-empty-regions.png')).convert('RGB')).astype(int), np.array(Image.open(os.path.join(D, 'ra-@V@-regions.png')).convert('RGB')).astype(int)
is_col = (lambda a, c: (np.abs(a - np.array(c)).max(axis=2) <= 8))
glass = is_col(emap, (255, 0, 255)); frame = L.grow(glass, 14) & is_col(emap, (0, 0, 0)) & ~glass
screens = is_col(smap, (255, 0, 255)) & ~glass
if bool(glass.any()) != VIEW['inView']['window'] or bool(screens.any()) != VIEW['inView']['screens']: raise SystemExit("STOP: the guide's account of the window or the screens and its renders disagree")
openings = {}
if glass.any():
    for name, m in (('window glass', glass), ('window frame (as drawn)', frame)):
        openings[name] = {'px': int(m.sum()), 'clearPx': clear_gap(m, place, 120), **({'step3ClearPx': clear_gap(m, place3, 120)} if STEP3 else {})}
    worst = min(v for k in ('clearPx', 'step3ClearPx') for v in [openings['window frame (as drawn)'].get(k)] if v is not None)
    if worst < MIN: raise SystemExit(f"STOP: a mask comes within {worst} px of the window's frame (want {MIN})")
if screens.any():
    openings['screens'] = {'px': int(screens.sum()), 'insidePlaceMask': bool((screens & ~place).sum() == 0), 'note': "the monitors' screens are part of the PC workstation's piece: openings painted flat black inside the mask"}
    if not openings['screens']['insidePlaceMask']: raise SystemExit("STOP: a screen lies outside the PLACE mask")
# the viewer's own station: left out, as the approved plan leaves it out; where it would show
ownlab = grey_of('ra-@V@-own.png'); ownStation = {'place': '@V@', 'objects': {}, 'rule': "the approved plan (visA) leaves the viewer's own station out of the viewer's view, and so does this sheet"}
for k, n in enumerate(VIEW['own']):
    m = np.abs(ownlab - 20 * (k + 1)) <= 2; row = {'paintingPx': int(m.sum())}
    if m.any():
        ys, xs = np.where(m); row['bbox'] = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    row['slicePx'] = {s: int(m[max(0, int(round(r[1]))):int(round(r[3])), max(0, int(round(r[0]))):int(round(r[2]))].sum()) for s, r in VIEW['slices'].items()}
    ownStation['objects'][n] = row
# version 2 (the Lead, 27 November): the 15 px rule against the accepted step-1 picture's painted features (features@V@.json, by
# sheetV/feat15.py, view A's own test), on steps 2 and 3; the build stops if it fails. Where the view measures its painted deck, the
# floor fit and the foot lines are recorded too (floorfit-@V@.json, measure-@V@2.json, from measure@V@2.py)
featureTest, floorFit, feet = {'status': 'after RA-@V@-1', 'rule': "the Lead's rule of 19 November (sheet RA-A version 4): every step-2 and step-3 mask edge covers each painted feature of the step-1 picture with at least 15 px to spare or clears it by at least 15 px", 'minClearPx': MIN}, None, None
if os.path.exists(os.path.join(D, 'features@V@.json')):
    spec = importlib.util.spec_from_file_location('feat15', os.path.join(D, '..', 'sheetV', 'feat15.py')); F15 = importlib.util.module_from_spec(spec); spec.loader.exec_module(F15)
    FEAT = json.load(open(os.path.join(D, 'features@V@.json')))
    areas = {f"{p['place']} {p['name']}": split == p['grey'] for p in pieces}   # each piece's own area, as split (with the growth where there is one)
    if STEP3: areas['wall food capsule (step 3)'] = place3
    featureTest, failures = F15.test(FEAT, place, place3, areas)
    if failures: raise SystemExit('STOP: the 15 px rule fails: ' + ' | '.join(failures))
    if os.path.exists(os.path.join(D, 'measure-@V@2.json')):
        M2 = json.load(open(os.path.join(D, 'measure-@V@2.json')))
        if M2['picture']['sha256'] != FEAT['picture']['sha256']: raise SystemExit('STOP: the features and the measure are not of one picture')
        floorFit, feet = M2.get('floorFit'), M2.get('feet')
        if feet and any(f['moved'] != (abs(f['offsetPx']) > 8) for f in feet): raise SystemExit("STOP: a foot line's move does not follow the Lead's 8 px rule")
save(place, 'ra-@V@-place.png'); save(split, 'ra-@V@-split.png')
if STEP3: save(place3, 'ra-@V@-place3.png'); save(split3, 'ra-@V@-split3.png')
out = {'view': '@V@', 'inView': VIEW['inView'], 'pieces': pieces, 'shapes': shapes, 'split': {f"{p['place']} {p['name']}": p['grey'] for p in pieces}, 'outlineShare': round(float(furn.mean()), 4),
       'pieces3': pieces3, 'shapes3': shapes3, 'split3': {f"{p['place'] or 'wall'} {p['name']}": p['grey'] for p in pieces3}, **({'outlineShare3': round(float(cap.mean()), 4), 'capsuleUnderFurniturePx': int((L.grow(cap, GROW3) & furn).sum())} if STEP3 else {}),
       'gaps': gaps, **({'target': {'pair': 'hatch lid / electrical cabinet', 'minTightPx': 30, 'minGrownPx': 18, 'met': True}} if LC else {}), 'openings': openings, 'ownStation': ownStation,
       'featureTest': featureTest, **({'floorFit': floorFit} if floorFit else {}), **({'feet': feet} if feet else {}), **({'growth': growth} if growth else {}),
       'expected': {'s2': {'maskedShare': round(float(place.mean()), 4), 'rawMaskAlpha': alpha(place), 'over10': bool(place.mean() > 0.10)}, **({'s3': {'maskedShare': round(float(place3.mean()), 4), 'rawMaskAlpha': alpha(place3)}} if STEP3 else {})}}
json.dump(out, open(os.path.join(D, 'kit-@V@.json'), 'w'), indent=1)
print('step 2: outlines', out['outlineShare'], '| PLACE mask', out['expected']['s2']['maskedShare'], '|', len(shapes), 'shapes:',
      ' | '.join(' + '.join(pieces[i]['name'] for i in s['pieces']) + f" x {s['bbox'][0]}-{s['bbox'][2]} y {s['bbox'][1]}-{s['bbox'][3]}" for s in shapes))
print('pieces:', ' | '.join(f"{p['name']} {p['px']} px x {p['bbox'][0]}-{p['bbox'][2]} y {p['bbox'][1]}-{p['bbox'][3]} centre {p['visibleCentreX']}{' cut' if p['cutByEdge'] else ''}" for p in pieces))
print('gaps:', ' | '.join(f"{k} {v['tightPx']} px (grown {v['grownPx']})" for k, v in gaps.items()))
if STEP3: print('step 3: outline', out['outlineShare3'], '| mask', out['expected']['s3']['maskedShare'], '|', ' | '.join(f"{p['name']} {p['px']} px x {p['bbox'][0]}-{p['bbox'][2]} y {p['bbox'][1]}-{p['bbox'][3]} centre {p['visibleCentreX']}" for p in pieces3), '| under the furniture', out['capsuleUnderFurniturePx'])
print('openings:', json.dumps(openings)); print('own station:', json.dumps(ownStation['objects']))
if growth: print('growth:', growth['addedPx'], 'px added,', growth['maskedShareBefore'], '->', growth['maskedShareAfter'])
if featureTest.get('features'): print('15 px rule:', 'passed' if featureTest['passed'] else 'FAILED', '|', len(featureTest['features']), 'features,', sum(len(e['parts']) for e in featureTest['exceptions']), 'named exceptions | lights clear', [l['step2ClearPx'] for l in featureTest['lights']])
