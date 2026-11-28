# Sheet RA-B version 3: RA-B-3c, view B's step-2 picture completed in code (the Lead, 27 November 2026, 17:43). The kept step 2,
# RA-B-3, is the image tool's keep: RA-B-3's raw edit over RA-B-2 inside the step-2 PLACE mask, feathered by a 2 px Gaussian. Where
# a piece of furniture ran past the mask, the keep cut it. RA-B-3c is RA-B-3 with the raw edit's pixels taken back inside each cut
# piece's own painted outline (its ink line), traced by hand on the raw, with 1 px of feather outside the outline and nothing else
# from the raw. So it is a code composite of two AI-generated pictures, RA-B-2 and RA-B-3's raw edit, as view A's cabinet frame was
# a code drawing on an AI-generated picture. No picture is generated.
#
# The pieces: the three the Lead named (the desk's left end, down to its foot on the deck; the left monitor's left frame, with the
# top bezel the same cut runs along; the toolbox's left side and handle, with its bottom edge), and two more with the same cut, done
# the same way and recorded apart so either can be dropped: the right monitor's top bezel and right frame, and the corner of the
# desk's right foot. Left as they are: the lid's foot (the Lead: leave it), the shadow under the drawers (a shadow, not a piece) and
# the brace at the desk's right end (wholly outside the mask, so absent rather than cut).
#
# It also fits view B's two screen regions to the painted screens' flat black in RA-B-3c, for the live monitors: along each side,
# the edge where the OKLCH lightness crosses 0.12, a straight line fitted through it, and the corners where the lines meet. Each
# fitted region is gated as the colour check gates an opening: 95% of it under lightness 0.12.
#
# Reads from <records folder>: img/RA-B-3.png, img/RA-B-3-raw.png and img/RA-B-2.png, each checked by its sha256, and from its own
# folder: ra-B-place.png (the step-2 PLACE mask) and ra-B-regions.png (the step-2 map, for the map's screens), each checked. Writes
# to its own folder: ra-B-3c.png (the plate, AI-generated, not for display without a label), composite-B3.json (the record) and
# screens-B.json (view B's screens for the live monitors). NumPy and Pillow only. Usage: python3 -I compositeB3.py <records folder>
import hashlib, importlib.util, json, os, sys
import numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2: sys.exit('usage: python3 -I compositeB3.py <records folder>')
REC = sys.argv[1]
fsha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
psha = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()
IN = {'RA-B-3': ('img/RA-B-3.png', '95c742f2e47b4ea37a197b339b4377a5fe75c41405d589f54076af26ec55eb25'),
      'RA-B-3-raw': ('img/RA-B-3-raw.png', '392431f68b83dc4c20415befdb25ac6c39f42d72a4baeea7a192cd225b7bedba'),
      'RA-B-2': ('img/RA-B-2.png', 'aefddadcb3ce554c215d121dd7a49b8e4197a1dcce77325e54982252c8038605')}
OWN = {'ra-B-place.png': 'aa7f2e0e400d8f17531fc93a591aa08c414a15720ecb376375fc2d477bfa3a98',          # version 2's step-2 PLACE mask
       'ra-B-regions.png': 'c0161df84eba50b735a0dea67a3f31b37b3da22752510c238222c6b7b15965f6',        # the step-2 map
       'ra-B-empty-regions.png': 'cdab7d900472bd83d5b601cb77255c025f97ef3cdb2b6dd6c1ba05927ce93625'}  # the step-1 map (the window)
for k, (f, h) in IN.items():
    if fsha(os.path.join(REC, f)) != h: sys.exit(f'STOP: {f} is not {k}')
for f, h in OWN.items():
    if fsha(os.path.join(D, f)) != h: sys.exit(f'STOP: {f} is not the file version 2 published')
rgb = lambda f: np.array(Image.open(f).convert('RGB'))
kept, raw, b2 = rgb(os.path.join(REC, IN['RA-B-3'][0])), rgb(os.path.join(REC, IN['RA-B-3-raw'][0])), rgb(os.path.join(REC, IN['RA-B-2'][0]))
place = np.array(Image.open(os.path.join(D, 'ra-B-place.png')).convert('L')) > 127
H, W = place.shape
# RA-B-3 is the keep of the two AI-generated pictures (rb1_tools.py's composite): checked here, so RA-B-3c's sources are those two
Lm = Image.fromarray((place * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
keepAgain = np.array(Image.composite(Image.fromarray(raw), Image.fromarray(b2), Lm))
keepIsExact = bool((keepAgain == kept).all())
if not keepIsExact: sys.exit("STOP: RA-B-3 is not the keep of RA-B-3's raw over RA-B-2 in the step-2 mask")

# ---- the traced outlines: painting pixels, a pixel spanning i to i + 1; each runs along the outer edge of the piece's ink line
# outside the mask, and closes at least 6 px inside the mask, where RA-B-3 already equals the raw (the keep's blend reaches 5 px)
PIECES = [
 {'key': 'desk-left', 'listed': True, 'name': "the desk's left end: the tabletop's left end and back corner, the pedestal and its foot on the deck",
  'outline': [(341.0, 870.0), (343.0, 870.0), (372.0, 860.0), (386.0, 854.5), (399.0, 850.0), (428.0, 850.0), (428.0, 858.0), (404.0, 866.0),
              (404.0, 1004.0), (365.0, 1004.0), (365.0, 1013.0), (367.0, 1015.0), (350.0, 1015.0), (350.0, 888.0), (341.0, 888.0)],
  'ink': "the tabletop's side and back edges, its left end (on the pipe's ink, x 341), the leg's outer ink (x 350), the drawers' base (y 1002-1003) and the foot plate (to y 1014)"},
 {'key': 'monitor-left', 'listed': True, 'name': "the left monitor: its left frame and its top bezel",
  'outline': [(409.0, 772.0), (510.0, 772.0), (512.0, 774.0), (512.0, 796.0), (461.0, 796.0), (461.0, 840.0), (406.0, 840.0), (406.0, 816.0),
              (407.0, 814.0), (407.0, 774.0)],
  'ink': 'the frame outline: left x 406-407, top y 772, bottom y 838-839, the right frame x 510-511'},
 {'key': 'toolbox', 'listed': True, 'name': "the toolbox: its left side, its handle and its bottom edge",
  'outline': [(591.0, 1073.0), (592.0, 1070.0), (593.0, 1068.0), (596.0, 1066.0), (600.0, 1065.0), (604.0, 1063.0), (608.0, 1061.5),
              (612.0, 1060.0), (616.0, 1058.5), (620.0, 1057.0), (624.0, 1055.5), (628.0, 1054.0), (632.0, 1052.0), (636.0, 1050.5),
              (638.0, 1049.5), (639.0, 1049.0), (639.0, 1045.0), (640.0, 1043.0), (641.0, 1042.0), (642.0, 1041.0), (643.0, 1040.0),
              (644.0, 1039.0), (645.0, 1038.0), (648.0, 1037.0), (650.0, 1036.0), (652.0, 1035.5), (660.0, 1032.5), (670.0, 1029.0),
              (673.0, 1028.0), (677.0, 1027.0), (680.0, 1028.0), (683.0, 1031.0), (686.0, 1034.0), (680.0, 1040.0), (680.0, 1122.0),
              (690.0, 1122.0), (690.0, 1134.0), (688.0, 1134.5), (685.0, 1136.0), (680.0, 1139.0), (675.0, 1142.0), (670.0, 1145.0),
              (665.0, 1148.5), (660.0, 1151.5), (655.0, 1155.0), (650.0, 1158.0), (645.0, 1160.0), (640.0, 1159.5), (635.0, 1158.0),
              (630.0, 1156.0), (625.0, 1155.0), (620.0, 1153.0), (615.0, 1152.0), (610.0, 1150.0), (605.0, 1149.0), (600.0, 1148.0),
              (595.0, 1146.0), (593.0, 1144.0), (592.0, 1141.0), (592.0, 1091.0), (591.0, 1090.0)],
  'holes': [[(650.0, 1050.0), (651.0, 1048.0), (652.0, 1047.0), (656.0, 1045.5), (660.0, 1044.0), (664.0, 1042.5), (668.0, 1041.0),
             (672.0, 1039.5), (675.5, 1038.5), (675.5, 1046.5), (672.0, 1047.5), (668.0, 1049.0), (664.0, 1051.0), (660.0, 1052.5),
             (656.0, 1054.0), (652.0, 1055.5), (650.0, 1056.0)]],
  'ink': "the lid's back edge, the handle's outer ink (the deck seen through the handle stays RA-B-2's), the left side (x 591-593) and the bottom edge to x 690, where it meets the lid's foot"},
 {'key': 'monitor-right', 'listed': False, 'name': "the right monitor: its top bezel and right frame",
  'outline': [(518.0, 772.0), (624.5, 772.0), (626.0, 774.0), (626.0, 841.0), (610.0, 841.0), (610.0, 801.0), (525.0, 797.0), (517.0, 797.0),
              (517.0, 774.0)],
  'ink': 'the frame outline: top y 772, the right frame x 623-625 down to its corner at y 840, the left frame x 517 above the mask'},
 {'key': 'foot-right', 'listed': False, 'name': "the desk's right foot: its right side and corner",
  'outline': [(640.0, 1000.0), (648.0, 1000.0), (648.0, 1009.0), (650.0, 1011.0), (650.0, 1021.5), (645.0, 1028.0), (634.0, 1028.0), (634.0, 1013.0)],
  'ink': "the leg's and the foot's outer ink (x 647-649) and the foot's bottom corner (to y 1027)"},
]
LEFT_ALONE = [{'what': "the lid's foot at the toolbox's right", 'why': "the Lead: leave it"},
              {'what': 'the shadow under the drawers, x 365-396, y 1004-1015', 'why': 'a shadow on the deck, not a piece: nothing else is taken from the raw'},
              {'what': "the brace at the desk's right end, x 650-670, y 980-1003", 'why': 'wholly outside the mask, so absent from RA-B-3 rather than cut'}]

def sdist(poly, X, Y):   # signed distance from the points to the polygon's outline: + inside, - outside (even-odd)
    P = np.array(poly, float); A, B = P, np.roll(P, -1, axis=0)
    px, py = X[..., None], Y[..., None]; ax, ay, bx, by = A[:, 0], A[:, 1], B[:, 0], B[:, 1]; dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    d = np.hypot(px - (ax + t * dx), py - (ay + t * dy)).min(axis=-1)
    cross = ((ay <= py) & (by > py)) | ((by <= py) & (ay > py))
    xint = ax + (py - ay) * dx / np.where(dy == 0, 1, dy)
    inside = (cross & (px < xint)).sum(axis=-1) % 2 == 1
    return np.where(inside, d, -d)
FEATHER = 1.0   # px: alpha 1 inside the outline, falling to 0 over 1 px outside it
alpha = np.zeros((H, W)); per = {}
for p in PIECES:
    xs = [q[0] for q in p['outline']]; ys = [q[1] for q in p['outline']]
    x0, x1, y0, y1 = int(min(xs)) - 2, int(max(xs)) + 3, int(min(ys)) - 2, int(max(ys)) + 3
    X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
    d = sdist(p['outline'], X, Y)
    for h in p.get('holes', []): d = np.minimum(d, -sdist(h, X, Y))
    a = np.zeros((H, W)); a[y0:y1, x0:x1] = np.clip(1 + d / FEATHER, 0, 1); per[p['key']] = a; alpha = np.maximum(alpha, a)
out = np.rint(kept * (1 - alpha[..., None]) + raw * alpha[..., None]).astype(np.uint8)

# ---- checks
changed = (out != kept).any(axis=2); touched = alpha > 0
changedOutside = int((changed & ~touched).sum())
fullRaw = alpha == 1; rawWhereFull = bool((out[fullRaw] == raw[fullRaw]).all())
mask_far = ~place   # outside the mask
pieceChecks = {}
for p in PIECES:
    a = per[p['key']]; c = changed & (a > 0)
    ys, xs = np.nonzero(c)
    pieceChecks[p['key']] = {'changedPx': int(c.sum()), 'changedOutsideTheMask': int((c & mask_far).sum()), 'changedInsideTheMask': int((c & place).sum()),
                             'changedBox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if c.any() else None,
                             'featherPx': int(((a > 0) & (a < 1)).sum())}
overlap = int(sum((per[p['key']] > 0).astype(int) for p in PIECES).__gt__(1).sum())
if changedOutside or not rawWhereFull: sys.exit(f'STOP: {changedOutside} px changed outside the completions, or the raw is not taken whole inside them')
listedKeys = [p['key'] for p in PIECES if p['listed']]
changedListed = int((changed & (sum(per[k] for k in listedKeys) > 0)).sum())

# ---- the screens: fitted to the painted flat black in RA-B-3c
spec = importlib.util.spec_from_file_location('cc', os.path.join(D, '..', 'sheet', 'colour-check-ra1.py')); CC = importlib.util.module_from_spec(spec); spec.loader.exec_module(CC)
Lk = CC.oklch(out)[0]; T = 0.12
def crossings(seed, side):   # the edge where the lightness crosses T, scanning outward from the seed box's side, every 2 px
    x0, y0, x1, y1 = seed; pts = []
    if side in ('left', 'right'):
        for y in range(y0 + 2, y1 - 1, 2):
            x = x0 if side == 'left' else x1; step = -1 if side == 'left' else 1
            while Lk[y, x] < T and abs(x - (x0 if side == 'left' else x1)) < 30: x += step
            xin = x - step; l0, l1 = Lk[y, xin], Lk[y, x]; f = (T - l0) / (l1 - l0)
            pts.append(((xin + 0.5) + step * f, y + 0.5))
    else:
        for x in range(x0 + 2, x1 - 1, 2):
            y = y0 if side == 'top' else y1; step = -1 if side == 'top' else 1
            while Lk[y, x] < T and abs(y - (y0 if side == 'top' else y1)) < 30: y += step
            yin = y - step; l0, l1 = Lk[yin, x], Lk[y, x]; f = (T - l0) / (l1 - l0)
            pts.append((x + 0.5, (yin + 0.5) + step * f))
    return pts
def fitline(pts, vertical):   # least squares, x = a + b y for the sides, y = a + b x for the top and bottom; outliers over 1.5 px dropped once
    P = np.array(pts); u, v = (P[:, 1], P[:, 0]) if vertical else (P[:, 0], P[:, 1])
    b, a = np.polyfit(u, v, 1); r = np.abs(v - (a + b * u)); keep = r <= 1.5
    if keep.sum() < len(r): b, a = np.polyfit(u[keep], v[keep], 1); r = np.abs(v - (a + b * u))
    return {'a': float(a), 'b': float(b), 'points': int(keep.sum()), 'dropped': int((~keep).sum()), 'rmsPx': round(float(np.sqrt(np.mean(r[keep] ** 2))), 3)}
def meet(vl, hl):   # x = a1 + b1 y and y = a2 + b2 x
    y = (hl['a'] + hl['b'] * vl['a']) / (1 - hl['b'] * vl['b']); return [round(vl['a'] + vl['b'] * y, 2), round(y, 2)]
smap = np.array(Image.open(os.path.join(D, 'ra-B-regions.png')).convert('RGB')).astype(int)
emap = np.array(Image.open(os.path.join(D, 'ra-B-empty-regions.png')).convert('RGB')).astype(int)
isc = lambda a, c: np.abs(a - np.array(c)).max(axis=2) <= 8
mapScreens = isc(smap, (255, 0, 255)) & ~isc(emap, (255, 0, 255))
SEEDS = {'left screen': (420, 786, 496, 826), 'right screen': (530, 786, 610, 826)}
screens = []
for name, seed in SEEDS.items():
    lines = {s: fitline(crossings(seed, s), s in ('left', 'right')) for s in ('left', 'top', 'right', 'bottom')}
    quad = [meet(lines['left'], lines['top']), meet(lines['right'], lines['top']), meet(lines['right'], lines['bottom']), meet(lines['left'], lines['bottom'])]
    qx = [q[0] for q in quad]; qy = [q[1] for q in quad]; x0, x1, y0, y1 = int(min(qx)) - 1, int(max(qx)) + 2, int(min(qy)) - 1, int(max(qy)) + 2
    X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5); inq = np.zeros((H, W), bool); inq[y0:y1, x0:x1] = sdist(quad, X, Y) > 0
    l = Lk[inq]; p95 = round(float(np.percentile(l, 95)), 4)
    mine = mapScreens & ((np.arange(W) < 531)[None, :] if name == 'left screen' else (np.arange(W) >= 531)[None, :])
    my, mx = np.nonzero(mine)
    screens.append({'name': name, 'corners': quad, 'cornerOrder': 'top-left, top-right, bottom-right, bottom-left',
                    'box': [round(min(qx), 2), round(min(qy), 2), round(max(qx), 2), round(max(qy), 2)], 'size': [round(max(qx) - min(qx), 1), round(max(qy) - min(qy), 1)],
                    'px': int(inq.sum()), 'p95L': p95, 'maxL': round(float(l.max()), 4), 'medianL': round(float(np.median(l)), 4), 'pass': p95 < T,
                    'edges': {s: {**v, 'form': 'x = a + b y' if s in ('left', 'right') else 'y = a + b x'} for s, v in lines.items()},
                    'map': {'box': [int(mx.min()), int(my.min()), int(mx.max()) + 1, int(my.max()) + 1], 'px': int(mine.sum())}})
if not all(s['pass'] for s in screens): sys.exit('STOP: a fitted screen fails the flat-black gate: ' + ', '.join(f"{s['name']} p95 {s['p95L']}" for s in screens))

Image.fromarray(out).save(os.path.join(D, 'ra-B-3c.png'), optimize=True)
J = lambda o, f: (json.dump(o, open(os.path.join(D, f), 'w'), indent=1), open(os.path.join(D, f), 'a').write('\n'))
plate = {'file': 'ra-B-3c.png', 'sha256': fsha(os.path.join(D, 'ra-B-3c.png')), 'pixelsSha256': psha(out), 'size': [W, H], 'aiGenerated': True, 'codeComposite': True}
src = lambda k, what: {'name': k, 'file': IN[k][0], 'sha256': IN[k][1], 'aiGenerated': True, 'what': what}
J({'view': 'B', 'what': "view B's two monitor screens, fitted to the painted screens' flat black in RA-B-3c, for the live monitors", 'date': '2026-11-27',
   'picture': {'name': 'RA-B-3c', **plate}, 'gate': 'flat black, as the colour check gates an opening (colour-check-ra1.py): 95% of the region under OKLCH lightness 0.12',
   'method': "along each side, scanning out from inside the black every 2 px, the edge where the OKLCH lightness crosses 0.12 (between pixel centres, linear); a straight line fitted through each side's points (least squares, points more than 1.5 px off dropped once); the corners where the lines meet. The region is the pixels whose centres lie inside the corners' outline.",
   'screens': screens, 'map': "the step-2 map's screens (ra-B-regions.png, the window colour less the window), for comparison: the painted screens are not where the map draws them",
   'units': 'painting pixels (1024 x 1536); a pixel spans i to i + 1, so corners are in pixel-edge coordinates'}, 'screens-B.json')
J({'sheet': 'RA-B', 'version': 3, 'view': 'B', 'step': 2, 'date': '2026-11-27', 'name': 'RA-B-3c',
   'what': "view B's step-2 picture completed in code: RA-B-3 with RA-B-3's raw edit taken back inside each cut piece's own ink outline",
   'drawnBy': 'code', 'generated': False, 'codeComposite': {'of': ['RA-B-2', "RA-B-3's raw edit"], 'aiGenerated': True,
   'how': "RA-B-3 (the keep of RA-B-3's raw over RA-B-2 in the step-2 mask, rebuilt here and equal pixel for pixel) is the base; inside each traced outline, the raw's pixels, with 1 px of feather outside the outline; nothing else from the raw"},
   'decision': "the Lead, 27 November 2026, 17:43: RA-B-3 held for cut edges; make RA-B-3c, a code composite, before any lift",
   'sources': [src('RA-B-3', "the kept step 2 (the base)"), src('RA-B-3-raw', "RA-B-3's raw edit (inside the outlines)"), src('RA-B-2', "view B's accepted step 1 (in RA-B-3, outside the mask)")],
   'mask': {'file': 'ra-B-place.png', 'sha256': fsha(os.path.join(D, 'ra-B-place.png')), 'what': "version 2's step-2 PLACE mask"},
   'feather': {'px': FEATHER, 'how': 'alpha = 1 inside the outline, falling linearly to 0 at 1 px outside it, by each pixel centre\'s distance from the outline'},
   'pieces': [{k: v for k, v in p.items() if k != 'key'} | {'key': p['key'], 'checks': pieceChecks[p['key']]} for p in PIECES],
   'leftAlone': LEFT_ALONE,
   'checks': {'keepRebuiltExactly': keepIsExact, 'changedPx': int(changed.sum()), 'changedInTheListedThree': changedListed,
              'changedOutsideTheCompletions': changedOutside, 'rawTakenWholeInsideTheOutlines': rawWhereFull, 'overlappingPx': overlap,
              'keepBlendReachesPxInsideTheMask': 5, 'closedInsideTheMaskAtLeastPx': 6},
   'pass': changedOutside == 0 and rawWhereFull and keepIsExact,
   'screens': {'file': 'screens-B.json', 'sha256': None, 'gate': {s['name']: {'p95L': s['p95L'], 'pass': s['pass']} for s in screens}},
   'outputs': {'ra-B-3c.png': {'what': 'the plate: RA-B-3c, a code composite of two AI-generated pictures', **{k: v for k, v in plate.items() if k != 'file'}}},
   'note': "pixelsSha256 is of the decoded pixels (8-bit RGB, row by row), which another Pillow writes the same; the PNG file's own sha256 may differ with another Pillow or zlib",
   'units': 'painting pixels (1024 x 1536); outlines in pixel-edge coordinates (a pixel spans i to i + 1)'}, 'composite-B3.json')
R = json.load(open(os.path.join(D, 'composite-B3.json'))); R['screens']['sha256'] = fsha(os.path.join(D, 'screens-B.json')); J(R, 'composite-B3.json')
print('RA-B-3c:', plate['pixelsSha256'][:16], '| changed', int(changed.sum()), 'px, outside the completions', changedOutside, '| per piece', {k: v['changedPx'] for k, v in pieceChecks.items()})
for s in screens: print(f"{s['name']}: corners {s['corners']} | {s['px']} px, p95 L {s['p95L']}, max {s['maxL']} | map box {s['map']['box']}")
