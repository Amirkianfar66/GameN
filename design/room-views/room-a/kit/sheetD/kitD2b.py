# Sheet RA-D version 2.1: step 2b's masks (Room A, view D: Atlas's place), a hatch-only edit on RA-D-3x (the Lead, 27 November 2026,
# 21:03). Both full step-2 runs painted the hatch bigger and nearer than its area, running it across the toolbox's part of the same
# area, and put the toolbox outside its area. Step 2b repaints the hatch, its lid and the toolbox alone, in two areas: the hatch and its
# lid as one, the toolbox as its own. The desk and the cabinet, already painted in RA-D-3x, are not masked.
#   The toolbox's area: its outline grown 6 px, as in step 2, but no more than 2 px over the hatch's outline, where the toolbox (the
#     nearer piece) stands in front of the hatch's near-left end.
#   The hatch and lid's area: their outlines grown 6 px, stopping 8 px short of the toolbox's area, so a strip of RA-D-3x's painted
#     deck at least 8 px wide parts the two areas.
#   Then the selective 12 px growth (the Lead, 18:38; kitD.py's rule): each area grows 12 px more where no traced feature of RA-D-1,
#     small light, window or step-3 capsule lies within 15 px of the new edge; each on its own, kept apart from the other, with no
#     islands. New for step 2b, RA-D-3x's painted desk and cabinet (its pixels that differ from RA-D-1's) are obstacles too.
# Writes ra-D-place2b.png (white = repaint), ra-D-split2b.png (each piece's grey: toolbox 80, hatch 60, lid 20, the nearer piece where
# two meet), ra-D-regions2b.png (the colour check's map for step 2b: step 2's map with the two screens where RA-D-3x paints them,
# screens-D.json, in place of the map's), and kit-D2b.json (the areas, their gap, the growth, the 15 px rule, the clearances, the
# expected masked share and alpha hash, and RA-D-3x's pixel hash). Reads the kit's own files and, to find RA-D-3x's painted pieces,
# RA-D-1 from the image session's records (checked by its sha256). Usage: python3 -I kitD2b.py [records folder, default _rec2]
import hashlib, importlib.util, json, os, sys
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); W, H, GROW, GROW12, MIN, GAP, TBAND = 1024, 1536, 6, 12, 15, 8, 2
# Version 2.2 (the Lead, 27 November, 22:29): the selective growth is off for step 2b, on both areas: in the input the grown band shows
# as about 18 px of flat guide deck round each piece, which invites a bigger hatch, and the prompt says each piece fills its own area
# exactly. Each area is its outline plus the 6 px, with the 8 px gap kept; a right-sized piece that overruns a little is completed
# from the raw, as for B, C and E. The growth stays in the code as this switch.
GROWTH = False
REC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, '_rec2')
mod = lambda n, f: (lambda s: (lambda m: (s.loader.exec_module(m), m)[1])(importlib.util.module_from_spec(s)))(importlib.util.spec_from_file_location(n, f))
L, F15 = mod('lift5', os.path.join(D, 'lift5.py')), mod('feat15', os.path.join(D, '..', 'sheetV', 'feat15.py'))
fsha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest(); psha = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()
J = lambda f: json.load(open(os.path.join(D, f)))
binary = lambda f: np.array(Image.open(os.path.join(D, f)).convert('L')) > 127
rgb = lambda f: np.array(Image.open(f).convert('RGB'))
alpha = lambda a: hashlib.sha256(np.where(a, 0, 255).astype(np.uint8).tobytes()).hexdigest()
save = lambda a, f: Image.fromarray((a * 255).astype(np.uint8) if a.dtype == bool else a.astype(np.uint8), 'L' if a.ndim == 2 else 'RGB').save(os.path.join(D, f), optimize=True)
clear_gap = F15.clear_gap
KIT, FEAT, COMP, SCR = J('kit-D.json'), J('featuresD.json'), J('composite-D3x.json'), J('screens-D.json')
RA_D_1 = 'c8842de16d63076fe69306b247bcc643b6dc5576f6c389364ce49bc970f2fe75'
if fsha(os.path.join(REC, 'img', 'RA-D-1.png')) != RA_D_1: sys.exit('STOP: img/RA-D-1.png is not RA-D-1')
d1, d3x = rgb(os.path.join(REC, 'img', 'RA-D-1.png')), rgb(os.path.join(D, 'ra-D-3x.png'))
if psha(d3x) != COMP['outputs']['ra-D-3x.png']['pixelsSha256']: sys.exit('STOP: ra-D-3x.png is not the RA-D-3x that composite-D3x.json records')
if SCR['picture']['pixelsSha256'] != psha(d3x): sys.exit("STOP: screens-D.json is not of RA-D-3x")
lab = np.array(Image.open(os.path.join(D, 'ra-D-stations.png')).convert('L')).astype(int)
P = {p['name']: p for p in KIT['pieces']}
tight = {n: np.abs(lab - P[n]['grey']) <= 2 for n in ('toolbox', 'floor hatch', 'hatch lid')}
T, HT, LD = tight['toolbox'], tight['floor hatch'], tight['hatch lid']
place2 = binary('ra-D-place.png'); split2 = np.array(Image.open(os.path.join(D, 'ra-D-split.png')).convert('L'))
# ---- the two areas, 6 px, kept 8 px apart
T6 = L.grow(T, GROW) & ~(HT & ~T & ~L.grow(T, TBAND))
HL6 = L.grow(HT | LD, GROW) & ~T6 & ~L.grow(T6, GAP)
gap6 = clear_gap(T6, HL6)
if gap6 < GAP: sys.exit(f'STOP: the two areas are {gap6} px apart (want {GAP})')
# ---- the selective 12 px growth, as kitD.py's, with RA-D-3x's painted desk and cabinet as obstacles too
obst = F15.raster([q for f in FEAT['features'] for q in f['polygons']])
for lt in FEAT.get('lights', []): obst[lt['box'][1]:lt['box'][3] + 1, lt['box'][0]:lt['box'][2] + 1] = True
em = np.array(Image.open(os.path.join(D, 'ra-D-empty-regions.png')).convert('RGB')).astype(int); gl = np.abs(em - np.array((255, 0, 255))).max(axis=2) <= 8
obst |= gl | (L.grow(gl, 14) & (np.abs(em).max(axis=2) <= 8))
cap = binary('ra-D-capsule.png'); obst |= cap
painted = np.abs(d3x.astype(int) - d1.astype(int)).max(axis=2) > 0   # RA-D-3x's desk and cabinet: where it differs from RA-D-1
obst |= painted
AREAS = [('toolbox', T6), ('floor hatch + hatch lid', HL6)]
base = T6 | HL6; extra = L.grow(base, GROW12) & ~base & ~L.grow(obst, MIN)
def attached(a, m):   # only the growth joined to its own area: the exclusions can cut a band into islands, which are dropped
    cu, _ = L.parts(a | m); own = np.unique(cu[a]); return m & np.isin(cu, own[own > 0])
# each area grows on its own and the two stay at least 8 px apart: the toolbox's first (the nearer piece, as it owns an overlap in
# the split), never more than 2 px over the hatch's outline nor within 8 px of the hatch's area; then the hatch's and lid's, never
# within 8 px of the toolbox's area as grown
mT = attached(T6, L.grow(T6, GROW12) & extra & ~(HT & ~L.grow(T, TBAND)) & ~L.grow(HL6, GAP)) if GROWTH else np.zeros_like(T6)
mHL = attached(HL6, L.grow(HL6, GROW12) & extra & ~L.grow(T6 | mT, GAP)) if GROWTH else np.zeros_like(HL6)
mine = [mT, mHL]
TA, HLA = T6 | mine[0], HL6 | mine[1]; place2b = TA | HLA
comp, sizes = L.parts(place2b)
if len(sizes) - 1 != 2: sys.exit(f'STOP: step 2b has {len(sizes) - 1} masked areas, not two')
gapA = clear_gap(TA, HLA)
if gapA < GAP: sys.exit(f'STOP: after the growth the two areas are {gapA} px apart (want {GAP})')
if (place2b & ~place2).any(): sys.exit("STOP: step 2b's mask reaches outside step 2's")
# ---- the split: the toolbox's area all its grey; in the hatch and lid's area, the nearer of the two where both reach (as kitD.py)
split2b = np.zeros((H, W), np.uint8); split2b[TA] = P['toolbox']['grey']
for n in ('hatch lid', 'floor hatch'):   # far to near: the lid (3.06 m) then the hatch (2.63 m)
    split2b[HL6 & L.grow(tight[n], GROW)] = P[n]['grey']
for n in ('hatch lid', 'floor hatch'):
    split2b[mine[1] & L.grow(tight[n], GROW + GROW12)] = P[n]['grey']
if ((split2b > 0) != place2b).any(): sys.exit("STOP: the split map is not step 2b's mask")
# ---- checks
def box(m): ys, xs = np.where(m); return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
pieces = []
for n in ('toolbox', 'floor hatch', 'hatch lid'):
    own = split2b == P[n]['grey']
    pieces.append({'name': n, 'place': P[n]['place'], 'grey': P[n]['grey'], 'depthM': P[n]['depthM'], 'outlinePx': int(tight[n].sum()), 'outlineBbox': box(tight[n]),
                   'outlinePxInTheMask': int((tight[n] & place2b).sum()), 'areaPx': int(own.sum()), 'areaBbox': box(own)})
left_out = HT & ~place2b
areas = [{'pieces': ['toolbox'], 'px': int(TA.sum()), 'bbox': box(TA), 'grownPx': int(mine[0].sum())}, {'pieces': ['floor hatch', 'hatch lid'], 'px': int(HLA.sum()), 'bbox': box(HLA), 'grownPx': int(mine[1].sum())}]
# the painted crossing the toolbox stands on, and the seams the hatch runs between (the painted lines measured on RA-D-1, measure-D2.json)
M2 = J('measure-D2.json'); ln = lambda k: (M2[k]['intercept'], M2[k]['slope'])
def meet(a, b): (ia, sa), (ib, sb) = ln(a), ln(b); x = (ib - ia) / (sa - sb); return [round(x, 1), round(ia + sa * x, 1)]
crossA = meet('northSeam1', 'eastSeam0'); cxy = (int(crossA[0]), int(crossA[1]))
gl_ = lambda k: (M2['guide'][k]['intercept'], M2['guide'][k]['slope'])
crossG = (lambda a, b: (lambda x: [round(x, 1), round(a[0] + a[1] * x, 1)])((b[0] - a[0]) / (a[1] - b[1])))(gl_('northSeam1'), gl_('eastSeam0'))
FF = J('floorfit-D.json')['points']; MP = J('measure-D2.json')['floorPoints']
corner = lambda w: next((o['to'] for o in FF if o['object'] == 'floor hatch' and o['world'] == w), None) or next(o['px'] for o in MP if o['object'] == 'floor hatch' and o['world'] == w)   # fitted where it moved, else the guide's
at = lambda k, x: ln(k)[0] + ln(k)[1] * x
hatch_ends = {'near end (x = 0.13 m)': [corner([0.13, 0, 0.65]), corner([0.13, 0, 1.15])], 'far end (x = 1.13 m), the lid\'s hinge': [corner([1.13, 0, 1.15])]}
seams = {'nearEndPastSeamX0Px': [round(at('eastSeam0', p[0]) - p[1], 1) for p in hatch_ends['near end (x = 0.13 m)']],
         'farEndPastSeamX1Px': [round(at('eastSeam1', corner([1.13, 0, 1.15])[0]) - corner([1.13, 0, 1.15])[1], 1), round(at('eastSeam1', corner([1.13, 0, 0.65])[0]) - corner([1.13, 0, 0.65])[1], 1)]}
seams['how'] = "at each of the hatch's end corners (the guide's, fitted to the painted deck: floorfit-D.json), the painted seam's y (measure-D2.json's line through RA-D-1's deck) minus the corner's y: how far, in px up the picture, the hatch's end lies beyond the seam"
if min(seams['nearEndPastSeamX0Px'] + seams['farEndPastSeamX1Px']) <= 0: sys.exit('STOP: the hatch does not run from just past one seam to just past the next')
if not T[cxy[1], cxy[0]]: sys.exit('STOP: the painted crossing the toolbox stands on is not inside its outline')
crossing = {'world': [0, 0, 1], 'painted': crossA, 'guide': crossG, 'paintedMinusGuidePx': [round(crossA[0] - crossG[0], 1), round(crossA[1] - crossG[1], 1)], 'insideToolboxOutline': bool(T[cxy[1], cxy[0]]), 'insideToolboxArea': bool(TA[cxy[1], cxy[0]]),
            'how': "where RA-D-1's painted seams x = 0 (eastSeam0) and z = 1 (northSeam1) meet, from their fitted lines (measure-D2.json)"}
wf = {'window glass': gl, 'window frame (as drawn)': L.grow(gl, 14) & (np.abs(em).max(axis=2) <= 8) & ~gl}
clear = {'paintedDeskAndCabinet': clear_gap(painted, place2b, 120), **{k: clear_gap(m, place2b, 120) for k, m in wf.items()}, 'step3Capsule': clear_gap(binary('ra-D-place3.png'), place2b, 120),
         'lights': {lt['name']: F15.window_gap(np.pad(np.ones((lt['box'][3] - lt['box'][1] + 1, lt['box'][2] - lt['box'][0] + 1), bool), ((lt['box'][1], H - lt['box'][3] - 1), (lt['box'][0], W - lt['box'][2] - 1))), place2b) for lt in FEAT.get('lights', [])}}
if min(v for k, v in clear.items() if k != 'lights') < MIN or min(clear['lights'].values()) < MIN: sys.exit(f'STOP: step 2b comes within 15 px of something it must clear: {clear}')
place3 = binary('ra-D-place3.png')
FT, failures = F15.test(FEAT, place2b, place3, {f"{P[n]['place']} {n}": split2b == P[n]['grey'] for n in ('toolbox', 'floor hatch', 'hatch lid')})
if failures: sys.exit('STOP: the 15 px rule fails on step 2b: ' + ' | '.join(failures))
# ---- the colour check's map for step 2b: step 2's map with RA-D-3x's painted screens (screens-D.json) in place of the map's
smap = np.array(Image.open(os.path.join(D, 'ra-D-regions.png')).convert('RGB'))
is_mag = np.abs(smap.astype(int) - np.array((255, 0, 255))).max(axis=2) <= 8
map_screens = is_mag & ~gl   # the map's screens: its window colour, but for the round window's glass
painted_screens = F15.raster([s['corners'] for s in SCR['screens']])
regions2b = smap.copy(); regions2b[map_screens] = (0, 0, 0); regions2b[painted_screens] = (255, 0, 255)
save(place2b, 'ra-D-place2b.png'); save(split2b, 'ra-D-split2b.png'); Image.fromarray(regions2b, 'RGB').save(os.path.join(D, 'ra-D-regions2b.png'), optimize=True)
sh = lambda f: fsha(os.path.join(D, f))
out = {'view': 'D', 'step': '2b', 'date': '2026-11-27', 'decision': "the Lead, 27 November 2026, 21:03: a hatch-only edit sheet, RA-D v2.1, step 2b on RA-D-3x: the hatch and lid as one area and the toolbox as its own area, with the selective growth; the desk and cabinet not masked",
       'base': {'name': 'RA-D-3x', 'pixelsSha256': psha(d3x), 'file': 'ra-D-3x.png', 'aiGenerated': True, 'codeComposite': True, 'record': 'composite-D3x.json', 'rebuild': 'python3 -I compositeD3x.py <records folder> (from RA-D-1, RA-D-3 and RA-D-3-raw)'},
       'rule': {'toolboxArea': f"the toolbox's outline grown {GROW} px, as in step 2, but no more than {TBAND} px over the hatch's outline", 'hatchArea': f"the hatch's and the lid's outlines grown {GROW} px, stopping {GAP} px short of the toolbox's area",
                'growth': (f"the selective {GROW12} px growth (the Lead, 18:38; kitD.py's rule), each area on its own, kept apart, no islands; RA-D-3x's painted desk and cabinet are obstacles too" if GROWTH else "none: the selective growth is off for step 2b (the Lead, 27 November, 22:29), so each area is its outline plus 6 px"), 'notMasked': 'the desk and its monitors, the cabinet'},
       'pieces': pieces, 'areas': areas, 'split2b': {f"{P[n]['place']} {n}": P[n]['grey'] for n in ('toolbox', 'floor hatch', 'hatch lid')},
       'gapPx': {'at6px': gap6, 'grown': gapA, 'want': GAP}, 'hatchOutlineLeftOut': {'px': int(left_out.sum()), 'of': int(HT.sum()), 'bbox': box(left_out) if left_out.any() else None,
       'why': "the hatch's outline within the gap or the toolbox's area: where the toolbox stands in front of the hatch's near-left end, its outline and the hatch's touch, so the strip that parts the two areas is cut from the hatch's side; RA-D-3x keeps its painted deck there"},
       'growth': {'on': GROWTH, **({} if GROWTH else {'decision': "the Lead, 27 November 2026, 22:29: off for step 2b, on both areas; each area its outline plus 6 px, the 8 px gap kept; a right-sized piece that overruns a little is completed from the raw"}),
                  'addedPx': int(mine[0].sum() + mine[1].sum()), 'byArea': {'toolbox': int(mine[0].sum()), 'floor hatch + hatch lid': int(mine[1].sum())}, 'maskedShareBefore': round(float(base.mean()), 4), 'maskedShareAfter': round(float(place2b.mean()), 4)},
       'insideStep2Mask': True, 'clearPx': clear, 'paintedPiecesPx': int(painted.sum()), 'crossing': crossing, 'seams': seams,
       'featureTest': FT, 'regions2b': {'file': 'ra-D-regions2b.png', 'from': 'ra-D-regions.png', 'mapScreensPx': int(map_screens.sum()), 'paintedScreensPx': int(painted_screens.sum()), 'screens': 'screens-D.json', 'screensSha256': sh('screens-D.json')},
       'expected': {'s2b': {'maskedShare': round(float(place2b.mean()), 4), 'rawMaskAlpha': alpha(place2b), 'basePixels': psha(d3x)}},
       'files': {f: sh(f) for f in ('ra-D-place2b.png', 'ra-D-split2b.png', 'ra-D-regions2b.png')},
       'inputs': {'ra-D-stations.png': sh('ra-D-stations.png'), 'ra-D-place.png': sh('ra-D-place.png'), 'ra-D-place3.png': sh('ra-D-place3.png'), 'ra-D-regions.png': sh('ra-D-regions.png'), 'ra-D-empty-regions.png': sh('ra-D-empty-regions.png'),
                  'ra-D-capsule.png': sh('ra-D-capsule.png'), 'featuresD.json': sh('featuresD.json'), 'measure-D2.json': sh('measure-D2.json'), 'floorfit-D.json': sh('floorfit-D.json'), 'RA-D-1': RA_D_1}}
# the colour check on RA-D-3x itself, with step 2b's map and with step 2's: the screens are why step 2b has its own map
CC = mod('cc', os.path.join(D, 'colour-check-ra1.py'))
def cc(m):
    r = CC.check(os.path.join(D, 'ra-D-3x.png'), os.path.join(D, m)); w = r['areas'].get('window', {})
    return {'map': m, 'pass': r['pass'], 'failed': [k for k, v in r['result'].items() if not v], 'openings': {'px': w.get('pixels'), 'p95L': w.get('p95L')}}
out['colourCheckOnRA-D-3x'] = {'map2b': cc('ra-D-regions2b.png'), 'map2': cc('ra-D-regions.png')}
if not out['colourCheckOnRA-D-3x']['map2b']['pass']: sys.exit("STOP: RA-D-3x fails the colour check with step 2b's map")
json.dump(out, open(os.path.join(D, 'kit-D2b.json'), 'w'), indent=1)
print('step 2b: mask', out['expected']['s2b']['maskedShare'], '| areas', [(a['pieces'], a['px'], a['bbox']) for a in areas], '| gap', gap6, '->', gapA)
print('pieces:', [(p['name'], p['outlinePx'], p['outlinePxInTheMask'], p['areaPx'], p['areaBbox']) for p in pieces])
print('hatch outline left out:', out['hatchOutlineLeftOut']['px'], 'of', out['hatchOutlineLeftOut']['of'], out['hatchOutlineLeftOut']['bbox'])
print('growth:', out['growth']); print('clear:', clear); print('crossing:', crossing); print('seams:', seams)
print('15 px rule:', 'passed' if FT['passed'] else 'FAILED', '| exceptions', [(e['name'], [p['where'] for p in e['parts']]) for e in FT['exceptions']], '| lights', [l['step2ClearPx'] for l in FT['lights']])
print('regions2b: map screens', out['regions2b']['mapScreensPx'], '-> painted', out['regions2b']['paintedScreensPx'], '| colour check on RA-D-3x:', out['colourCheckOnRA-D-3x'])
