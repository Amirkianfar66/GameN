# Sheet RA-D version 2.1: RA-D-3x, view D's base for a hatch-only step 2b (the Lead, 27 November 2026, 21:03). Both full step-2 runs,
# RA-D-3 and its re-run RA-D-3b, painted the hatch bigger and nearer than its area and put the toolbox outside its area; their desks and
# cabinets are usable. RA-D-3x is RA-D-1 with two of RA-D-3's areas, the desk and the cabinet, and the hatch's area left as RA-D-1's
# empty deck: a code composite of two AI-generated pictures, RA-D-1 and RA-D-3's raw edit. No picture is generated.
#
# Why RA-D-3 for both. The cabinet: RA-D-3's frame ends 22 to 30 px below the mask, RA-D-3b's 46 to 56 px (a taller cabinet, two boxes
# hanging below it); both run about 7 px past the mask on the right. The desk: RA-D-3's runs past the mask only at the right monitor's
# right bezel (22 px) and the desk top's right corner (up to 14 px); RA-D-3b's also at the left monitor's top (about 15 px) and the desk's
# right end (about 15 px). Both runs' raws carry a sliver of the misplaced toolbox into the desk's area, on the deck in front of it.
#
# How. The desk's and the cabinet's areas are taken as the image tool's keep took them: RA-D-3's raw over RA-D-1 inside the step-2 PLACE
# mask (version 2's) feathered by a 2 px Gaussian, but with the mask limited to those two areas (the hatch's area, 45 px or more from
# both, keeps RA-D-1) and trimmed in front of the desk where the toolbox's sliver reached in (the trim polygon below, on the open deck,
# clear of the desk's foot). Then, as RA-B-3c, RA-C-2c and RA-E-2c were, the cut pieces are completed from the raw inside their own ink
# outlines with 1 px of feather: the cabinet's frame all round (its bottom bar, right side and left lip ran past the mask), the right
# monitor's right bezel, and the desk top's right end with its right leg's outer edge. The two screens, painted flat black in the raw,
# are fitted as view B's and C's were and gated.
#
# Reads from <records folder>: img/RA-D-1.png, img/RA-D-3.png and img/RA-D-3-raw.png, each checked by its sha256, and from its own
# folder (or its img/ folder, as the sheet publishes them) ra-D-place.png (version 2's step-2 PLACE mask), ra-D-regions.png and ra-D-empty-regions.png (the step-2 and step-1 maps, for
# the map's screens), each checked. Writes to its own folder: ra-D-3x.png (the plate, AI-generated, not for display without a label),
# composite-D3x.json (the record) and screens-D.json (view D's two screens for the live monitors). NumPy and Pillow only.
# Usage: python3 -I compositeD3x.py <records folder>
import hashlib, importlib.util, json, os, sys
import numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2: sys.exit('usage: python3 -I compositeD3x.py <records folder>')
REC = sys.argv[1]
OWNP = lambda f: os.path.join(D, f) if os.path.exists(os.path.join(D, f)) else os.path.join(D, 'img', f)   # the maps: here, or in img/ as published
fsha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
psha = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()
IN = {'RA-D-1': ('img/RA-D-1.png', 'c8842de16d63076fe69306b247bcc643b6dc5576f6c389364ce49bc970f2fe75'),
      'RA-D-3': ('img/RA-D-3.png', 'abaf334d030a674e9e030f14477a25ec57d82a3870d4850db1637329fd1d7c2a'),
      'RA-D-3-raw': ('img/RA-D-3-raw.png', '0a7eb69d4b2e40ad12e61c09af585a614088a091ce717aa36c57a1671cb2c648')}
OTHER = {'RA-D-3b': '7abd1f4fd9c3d0a669703d970dd0eb1eaf511c330898388db84093ed8ffe6561', 'RA-D-3b-raw': 'ce9c0cdee029bf2f2009ed5fbe78ef2a394357a3fb49ad5195c9e06819efbd8a'}
OWN = {'ra-D-place.png': '3dd7bad74327b31163009a79ae4e9e9107594866d5969197819222f413c63b64',          # version 2's step-2 PLACE mask
       'ra-D-regions.png': 'b95f8a5a16560029c173551b29b72a04ac3be542cde6258855a26fdc84c7dc7f',                                                                # version 2's step-2 map
       'ra-D-empty-regions.png': '7f98a9ba507b0bfd021f2c05ad51f0a6a8c4aa75dc5a131eb0d0ec2168b420c8'}                                                     # the step-1 map
for k, (f, h) in IN.items():
    if fsha(os.path.join(REC, f)) != h: sys.exit(f'STOP: {f} is not {k}')
for f, h in OWN.items():
    if fsha(OWNP(f)) != h: sys.exit(f'STOP: {f} is not the file version 2 published')
rgb = lambda f: np.array(Image.open(f).convert('RGB'))
d1, kept3, raw = (rgb(os.path.join(REC, IN[k][0])) for k in ('RA-D-1', 'RA-D-3', 'RA-D-3-raw'))
place = np.array(Image.open(OWNP('ra-D-place.png')).convert('L')) > 127
H, W = place.shape
blur = lambda m: Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
# RA-D-3 is the keep of the two AI-generated pictures (rd1_tools.py's keep): checked here, so RA-D-3x's sources are those two
keepIsExact = bool((np.array(Image.composite(Image.fromarray(raw), Image.fromarray(d1), blur(place))) == kept3).all())
if not keepIsExact: sys.exit("STOP: RA-D-3 is not the keep of RA-D-3's raw over RA-D-1 in the step-2 mask")

# ---- the two areas, and the trim in front of the desk
yy, xx = np.mgrid[0:H, 0:W]
DESK = place & (xx < 380); CAB = place & (xx > 740) & (yy < 1000); HATCH = place & ~DESK & ~CAB
def inpoly(poly, X, Y):   # even-odd, pixel centres
    P = np.array(poly, float); A, B = P, np.roll(P, -1, axis=0); px, py = X[..., None], Y[..., None]
    ax, ay, bx, by = A[:, 0], A[:, 1], B[:, 0], B[:, 1]; dx, dy = bx - ax, by - ay
    cross = ((ay <= py) & (by > py)) | ((by <= py) & (ay > py)); xint = ax + (py - ay) * dx / np.where(dy == 0, 1, dy)
    return (cross & (px < xint)).sum(axis=-1) % 2 == 1
TRIM = [(196.0, 1236.0), (250.0, 1218.0), (300.0, 1188.0), (318.0, 1184.0), (331.0, 1184.0), (331.0, 1300.0), (196.0, 1300.0)]
trim = np.zeros((H, W), bool); trim[1150:1310, 190:340] = inpoly(TRIM, xx[1150:1310, 190:340] + 0.5, yy[1150:1310, 190:340] + 0.5); trim &= DESK
area = (DESK & ~trim) | CAB
keep = np.array(Image.composite(Image.fromarray(raw), Image.fromarray(d1), blur(area)))

# ---- the traced outlines: painting pixels, a pixel spanning i to i + 1; each runs along the outer edge of the piece's ink outside the
# mask, and closes inside the mask where RA-D-3's keep already equals the raw ('closing'; the cabinet's closes on its own ink)
PIECES = [
 {'key': 'cabinet', 'name': "the cabinet's frame, all round its outer ink",
  'ink': "the top edge (y = 690.40 - 0.0583 x), the right side (x = 995.51 + 0.0045 y), the bottom edge (y = 863.67 + 0.0633 x) and the left side (its outer lip at x 763.8 down to y 723, its ink at x 767.0 below), the corners cut 4 px across",
  'note': "the raw's frame runs about 7 px past the mask on the right, 22 to 30 px below it at the bottom and up to 4 px past it at the left lip; its top lies 5 px inside",
  'outline': [(763.8, 649.84), (767.8, 645.61), (994.37, 632.39), (998.39, 636.15), (999.69, 922.91), (995.71, 926.66), (771.0, 912.45),
              (767.0, 908.19), (767.0, 723.0), (763.8, 723.0)],
  'closing': [],
  },
 {'key': 'monitor', 'name': "the right monitor's right bezel",
  'ink': "the bezel's top ink (y 855.5), its top-right corner and its right side's outer ink (x 233.0); the screen and the rest of the monitor lie inside the mask",
  'note': "the raw's monitor reaches x 233, 22 px past the mask (x 211) from y 852 to 922",
  'outline': [(203.0, 855.5), (228.0, 855.5), (230.5, 856.5), (232.4, 858.4), (233.0, 861.0), (233.0, 931.0), (203.0, 931.0)],
  'closing': [(233.0, 931.0), (203.0, 931.0), (203.0, 855.5)],
  },
 {'key': 'desk-end', 'name': "the desk top's right end, with its right leg's outer edge",
  'ink': "the desk top's top edge (y 966.6-972.2), its rounded corner and end (x 332.2), the leg's outer ink (x 328.0) down to its foot (y 1175)",
  'note': "the raw's desk top reaches x 332, up to 14 px past the mask (x 318) from y 966 to 996; the leg's ink lies 3 px inside the mask, where the keep's feather had faded it",
  'outline': [(311.5, 966.6), (318.0, 968.1), (324.0, 970.0), (328.0, 972.2), (330.6, 975.0), (332.0, 979.0), (332.2, 990.0), (331.6, 995.6),
              (328.0, 997.0), (328.0, 1175.0), (323.0, 1175.0), (323.0, 1004.0), (311.5, 1004.0)],
  'closing': [(323.0, 1175.0), (323.0, 1004.0), (311.5, 1004.0), (311.5, 966.6)],
  },
]
def sdist(poly, X, Y):   # signed distance from the points to the polygon's outline: + inside, - outside (even-odd)
    P = np.array(poly, float); A, B = P, np.roll(P, -1, axis=0)
    px, py = X[..., None], Y[..., None]; ax, ay, bx, by = A[:, 0], A[:, 1], B[:, 0], B[:, 1]; dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    d = np.hypot(px - (ax + t * dx), py - (ay + t * dy)).min(axis=-1)
    cross = ((ay <= py) & (by > py)) | ((by <= py) & (ay > py)); xint = ax + (py - ay) * dx / np.where(dy == 0, 1, dy)
    return np.where((cross & (px < xint)).sum(axis=-1) % 2 == 1, d, -d)
def segdist(path, X, Y):
    P = np.array(path, float); A, B = P[:-1], P[1:]; px, py = X[..., None], Y[..., None]
    ax, ay, bx, by = A[:, 0], A[:, 1], B[:, 0], B[:, 1]; dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / np.maximum(dx * dx + dy * dy, 1e-12), 0, 1)
    return np.hypot(px - (ax + t * dx), py - (ay + t * dy)).min(axis=-1)
FEATHER = 1.0
alpha = np.zeros((H, W)); per = {}; boxes = {}
for p in PIECES:
    xs = [q[0] for q in p['outline']]; ys = [q[1] for q in p['outline']]
    x0, x1, y0, y1 = max(0, int(min(xs)) - 2), min(W, int(max(xs)) + 3), max(0, int(min(ys)) - 2), min(H, int(max(ys)) + 3)
    X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
    a = np.zeros((H, W)); a[y0:y1, x0:x1] = np.clip(1 + sdist(p['outline'], X, Y) / FEATHER, 0, 1); per[p['key']] = a; boxes[p['key']] = (x0, y0, x1, y1); alpha = np.maximum(alpha, a)
out = np.rint(keep * (1 - alpha[..., None]) + raw * alpha[..., None]).astype(np.uint8)

# ---- checks
reach = np.array(blur(area)) > 0                       # where the limited keep can differ from RA-D-1
changed = (out != d1).any(axis=2); touched = alpha > 0
changedOutside = int((changed & ~reach & ~touched).sum())
hatchUnchanged = bool((out[HATCH] == d1[HATCH]).all()); hatchReachPx = int((reach & HATCH).sum())
fullRaw = alpha == 1; rawWhereFull = bool((out[fullRaw] == raw[fullRaw]).all())
diffK = np.abs(keep.astype(int) - raw.astype(int)).max(axis=2)
# the toolbox's sliver: the trimmed pixels where RA-D-3 (the full keep) differs from RA-D-1 by more than 40 levels, its ink and highlights
sl = trim & (np.abs(kept3.astype(int) - d1.astype(int)).max(axis=2) > 40)
pieceChecks = {}
for p in PIECES:
    a = per[p['key']]; c = (out != keep).any(axis=2) & (a > 0); ys, xs = np.nonzero(c)
    segs = list(zip(p['closing'][:-1], p['closing'][1:]))
    x0, y0, x1, y1 = boxes[p['key']]; X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5); near = np.zeros((H, W), bool)
    for q0, q1 in segs: near[y0:y1, x0:x1] |= segdist([q0, q1], X, Y) <= 1.5
    ux, uy = np.nonzero(~place[y0:y1, x0:x1])[1] + x0 + 0.5, np.nonzero(~place[y0:y1, x0:x1])[0] + y0 + 0.5
    samples = np.array([(q0[0] + s * (q1[0] - q0[0]), q0[1] + s * (q1[1] - q0[1])) for q0, q1 in segs for s in np.linspace(0, 1, max(2, int(np.hypot(q1[0] - q0[0], q1[1] - q0[1]) / 0.5)))]) if segs else np.zeros((0, 2))
    depth = float(np.sqrt((samples[:, 0, None] - ux[None]) ** 2 + (samples[:, 1, None] - uy[None]) ** 2).min()) if len(samples) else None
    pieceChecks[p['key']] = {'changedPxAgainstTheKeep': int(c.sum()), 'outsideTheMask': int((c & ~place).sum()), 'insideTheMask': int((c & place).sum()),
                             'changedBox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if c.any() else None, 'featherPx': int(((a > 0) & (a < 1)).sum()),
                             'closingPathPx': int((near & (a < 1)).sum()), 'closingPathPxWhereTheKeepDiffersFromTheRaw': int((near & (a < 1) & (diffK > 0)).sum()),
                             'closingPathMinDepthPx': round(depth, 2) if depth is not None else None, 'closesOnItsOwnInk': not segs}
sliverPx = int(sl.sum()); sliverLeft = int(np.abs(out.astype(int) - d1.astype(int)).max(axis=2)[sl].max()) if sl.any() else 0   # after the trim
sliverBefore = int(np.abs(kept3.astype(int) - d1.astype(int)).max(axis=2)[sl].max()) if sl.any() else 0                            # in RA-D-3
if changedOutside or not rawWhereFull or not hatchUnchanged: sys.exit(f'STOP: {changedOutside} px changed outside the areas and completions, or the raw is not whole inside them, or the hatch area changed')
if any(v['closingPathPxWhereTheKeepDiffersFromTheRaw'] for v in pieceChecks.values()): sys.exit('STOP: a closing path runs where the keep differs from the raw')

# ---- the screens: fitted to the painted black in RA-D-3x, as view B's and C's were
spec = importlib.util.spec_from_file_location('cc', os.path.join(D, 'colour-check-ra1.py')); CC = importlib.util.module_from_spec(spec); spec.loader.exec_module(CC)
Lk = CC.oklch(out)[0]; T = 0.12
def crossings(seed, side):
    x0, y0, x1, y1 = seed; pts = []
    if side in ('left', 'right'):
        for y in range(y0 + 2, y1 - 1, 2):
            x = x0 if side == 'left' else x1; step = -1 if side == 'left' else 1
            while 0 < x < W - 1 and Lk[y, x] < T and abs(x - (x0 if side == 'left' else x1)) < 40: x += step
            xin = x - step; l0, l1 = Lk[y, xin], Lk[y, x]; f = (T - l0) / (l1 - l0) if l1 != l0 else 0.5
            pts.append(((xin + 0.5) + step * f, y + 0.5))
    else:
        for x in range(x0 + 2, x1 - 1, 2):
            y = y0 if side == 'top' else y1; step = -1 if side == 'top' else 1
            while Lk[y, x] < T and abs(y - (y0 if side == 'top' else y1)) < 40: y += step
            yin = y - step; l0, l1 = Lk[yin, x], Lk[y, x]; f = (T - l0) / (l1 - l0) if l1 != l0 else 0.5
            pts.append((x + 0.5, (yin + 0.5) + step * f))
    return pts
def fitline(pts, vertical):
    P = np.array(pts); u, v = (P[:, 1], P[:, 0]) if vertical else (P[:, 0], P[:, 1])
    b, a = np.polyfit(u, v, 1); r = np.abs(v - (a + b * u)); keepp = r <= 1.5
    if keepp.sum() < len(r): b, a = np.polyfit(u[keepp], v[keepp], 1); r = np.abs(v - (a + b * u))
    return {'a': float(a), 'b': float(b), 'points': int(keepp.sum()), 'dropped': int((~keepp).sum()), 'rmsPx': round(float(np.sqrt(np.mean(r[keepp] ** 2))), 3)}
def meet(vl, hl):
    y = (hl['a'] + hl['b'] * vl['a']) / (1 - hl['b'] * vl['b']); return [round(vl['a'] + vl['b'] * y, 2), round(y, 2)]
smap = np.array(Image.open(OWNP('ra-D-regions.png')).convert('RGB')).astype(int); emap = np.array(Image.open(OWNP('ra-D-empty-regions.png')).convert('RGB')).astype(int)
isc = lambda a, c: np.abs(a - np.array(c)).max(axis=2) <= 8
mapScreen = isc(smap, (255, 0, 255)) & ~isc(emap, (255, 0, 255)) & (xx < 380)
SEEDS = {'left screen': (22, 896, 88, 960), 'right screen': (142, 880, 208, 938)}
screens = []
for name, sb in SEEDS.items():
    lines = {s: fitline(crossings(sb, s), s in ('left', 'right')) for s in ('left', 'top', 'right', 'bottom')}
    quad = [meet(lines['left'], lines['top']), meet(lines['right'], lines['top']), meet(lines['right'], lines['bottom']), meet(lines['left'], lines['bottom'])]
    qx = [c[0] for c in quad]; qy = [c[1] for c in quad]; x0, x1, y0, y1 = max(0, int(min(qx)) - 1), int(max(qx)) + 2, int(min(qy)) - 1, int(max(qy)) + 2
    X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5); inq = np.zeros((H, W), bool); inq[y0:y1, x0:x1] = sdist(quad, X, Y) > 0
    l = Lk[inq]; p95 = round(float(np.percentile(l, 95)), 4)
    half = mapScreen & ((xx < 50) if name == 'left screen' else (xx >= 50)); my, mx = np.nonzero(half)
    screens.append({'name': name, 'corners': quad, 'cornerOrder': 'top-left, top-right, bottom-right, bottom-left', 'box': [round(min(qx), 2), round(min(qy), 2), round(max(qx), 2), round(max(qy), 2)],
                    'size': [round(max(qx) - min(qx), 1), round(max(qy) - min(qy), 1)], 'px': int(inq.sum()), 'p95L': p95, 'maxL': round(float(l.max()), 4), 'medianL': round(float(np.median(l)), 4),
                    'pass': p95 < T, 'edges': {s: {**v, 'form': 'x = a + b y' if s in ('left', 'right') else 'y = a + b x'} for s, v in lines.items()}, 'seedBox': list(sb),
                    'map': {'box': [int(mx.min()), int(my.min()), int(mx.max()) + 1, int(my.max()) + 1], 'px': int(half.sum())} if half.any() else None})
if not all(s['pass'] for s in screens): sys.exit('STOP: a fitted screen fails the flat-black gate: ' + ', '.join(f"{s['name']} p95 {s['p95L']}" for s in screens))

Image.fromarray(out).save(os.path.join(D, 'ra-D-3x.png'), optimize=True)
J = lambda o, f: (json.dump(o, open(os.path.join(D, f), 'w'), indent=1), open(os.path.join(D, f), 'a').write('\n'))
plate = {'file': 'ra-D-3x.png', 'sha256': fsha(os.path.join(D, 'ra-D-3x.png')), 'pixelsSha256': psha(out), 'size': [W, H], 'aiGenerated': True, 'codeComposite': True}
src = lambda k, what: {'name': k, 'file': IN[k][0], 'sha256': IN[k][1], 'aiGenerated': True, 'what': what}
J({'view': 'D', 'what': "view D's two monitor screens, fitted to the painted black in RA-D-3x, for the live monitors", 'date': '2026-11-27',
   'picture': {'name': 'RA-D-3x', **plate}, 'gate': 'flat black, as the colour check gates an opening (colour-check-ra1.py): 95% of the region under OKLCH lightness 0.12',
   'method': "along each side, scanning out from inside the black every 2 px, the edge where the OKLCH lightness crosses 0.12 (between pixel centres, linear); a straight line fitted through each side's points (least squares, points more than 1.5 px off dropped once); the corners where the lines meet. The region is the pixels whose centres lie inside the corners' outline.",
   'screens': screens, 'map': "the step-2 map's screens (ra-D-regions.png, magenta), for comparison: the painted screens are not where the map draws them",
   'units': 'painting pixels (1024 x 1536); a pixel spans i to i + 1, so corners are in pixel-edge coordinates'}, 'screens-D.json')
J({'sheet': 'RA-D', 'version': '2.1', 'view': 'D', 'step': '2 (base for step 2b)', 'date': '2026-11-27', 'name': 'RA-D-3x',
   'what': "view D's base for the hatch-only step 2b: RA-D-1 with RA-D-3's desk and cabinet, completed in code, and the hatch's area left as RA-D-1's empty deck",
   'drawnBy': 'code', 'generated': False, 'codeComposite': {'of': ['RA-D-1', "RA-D-3's raw edit"], 'aiGenerated': True,
   'how': "RA-D-3's raw over RA-D-1 inside the step-2 mask limited to the desk's and the cabinet's areas and trimmed in front of the desk, feathered by a 2 px Gaussian (the image tool's keep, so equal to RA-D-3 there); inside each traced outline, the raw's pixels, with 1 px of feather outside it; nothing else from the raw"},
   'decision': "the Lead, 27 November 2026, 21:03: both runs painted the hatch bigger and nearer and put the toolbox outside its area; make RA-D-3x, RA-D-1 with the desk and the cabinet each from whichever run has it better, completed from its raw where needed, the screens fitted and gated, the hatch's area left as RA-D-1's empty deck",
   'whichRun': {'desk': 'RA-D-3', 'cabinet': 'RA-D-3',
                'why': {'cabinet': "RA-D-3's frame ends 22 to 30 px below the mask, RA-D-3b's 46 to 56 px (a taller cabinet, with two boxes hanging below it); both run about 7 px past the mask on the right",
                        'desk': "RA-D-3's desk runs past the mask only at the right monitor's right bezel (22 px) and the desk top's right corner (up to 14 px); RA-D-3b's also at the left monitor's top (about 15 px) and at the desk's right end (about 15 px)",
                        'both': "both raws carry a sliver of the misplaced toolbox into the desk's area, on the deck in front of it: trimmed out"},
                'theOtherRun': {k: {'sha256': v, 'aiGenerated': True} for k, v in OTHER.items()}},
   'sources': [src('RA-D-1', "view D's accepted step 1 (the base)"), src('RA-D-3', "the kept step 2 of the first run (its keep, rebuilt here and equal pixel for pixel)"), src('RA-D-3-raw', "RA-D-3's raw edit (the desk's and cabinet's areas, and inside the outlines)")],
   'records': {'RA-D-3': {'file': 'records/RA-D-3.json', 'sha256': 'd58ef421907a056017d40d9dfa551b5e26c5b8178bb69b61c883295ee8538a3b'}, 'RA-D-3b': {'file': 'records/RA-D-3b.json', 'sha256': 'd28aae8ddc2cd6c554a52b45c6779d7809f58d9d1ee33b96d986e97f6faf9132'}},
   'mask': {'file': 'ra-D-place.png', 'sha256': fsha(OWNP('ra-D-place.png')), 'what': "version 2's step-2 PLACE mask: its desk's and cabinet's areas taken, its hatch's area left out",
            'deskPx': int(DESK.sum()), 'cabinetPx': int(CAB.sum()), 'hatchPx': int(HATCH.sum()), 'trimmedPx': int(trim.sum())},
   'trim': {'polygon': TRIM, 'px': int(trim.sum()), 'what': "the deck in front of the desk where the misplaced toolbox's sliver reached into the desk's area: left as RA-D-1's deck", 'sliverPx': sliverPx, 'sliverMaxLevelsFromRA-D-1': {'inRA-D-3': sliverBefore, 'inRA-D-3x': sliverLeft}, 'sliverHow': "the trimmed pixels where RA-D-3 differs from RA-D-1 by more than 40 levels; after the trim, RA-D-3x's largest difference from RA-D-1 on them"},
   'feather': {'px': FEATHER, 'how': 'alpha = 1 inside the outline, falling linearly to 0 at 1 px outside it, by each pixel centre\'s distance from the outline'},
   'tracing': "on the raw: the cabinet's frame read across its ink every 4 px on each side, at the midpoint between the ink and the wall beside it, straight lines fitted (readings over 1.2 px off dropped once); the monitor's bezel and the desk's end read from the luminance at 5 to 6 times",
   'pieces': [{k: v for k, v in p.items() if k != 'key'} | {'key': p['key'], 'checks': pieceChecks[p['key']]} for p in PIECES],
   'checks': {'keepRebuiltExactly': keepIsExact, 'changedPxAgainstRA-D-1': int(changed.sum()), 'changedOutsideTheAreasAndTheCompletions': changedOutside,
              'unchangedPxAgainstRA-D-1': int(W * H - changed.sum()), 'picturePx': W * H, 'hatchAreaEqualsRA-D-1': hatchUnchanged, 'hatchAreaPxTheFeatherReaches': hatchReachPx,
              'rawTakenWholeInsideTheOutlines': rawWhereFull, 'closingPathsWhereTheKeepDiffersFromTheRaw': sum(v['closingPathPxWhereTheKeepDiffersFromTheRaw'] for v in pieceChecks.values()),
              'closingPathMinDepthPx': min(v['closingPathMinDepthPx'] for v in pieceChecks.values() if v['closingPathMinDepthPx'] is not None)},
   'pass': changedOutside == 0 and rawWhereFull and keepIsExact and hatchUnchanged,
   'screens': {'file': 'screens-D.json', 'sha256': None, 'gate': {s['name']: {'p95L': s['p95L'], 'pass': s['pass']} for s in screens}},
   'outputs': {'ra-D-3x.png': {'what': 'the plate: RA-D-3x, a code composite of two AI-generated pictures', **{k: v for k, v in plate.items() if k != 'file'}}},
   'note': "pixelsSha256 is of the decoded pixels (8-bit RGB, row by row), which another Pillow writes the same; the PNG file's own sha256 may differ with another Pillow or zlib",
   'units': 'painting pixels (1024 x 1536); outlines in pixel-edge coordinates (a pixel spans i to i + 1)'}, 'composite-D3x.json')
R = json.load(open(os.path.join(D, 'composite-D3x.json'))); R['screens']['sha256'] = fsha(os.path.join(D, 'screens-D.json')); J(R, 'composite-D3x.json')
print('RA-D-3x:', plate['pixelsSha256'][:16], '| changed against RA-D-1', int(changed.sum()), '| outside the areas and completions', changedOutside, '| hatch area unchanged', hatchUnchanged, '| trim', int(trim.sum()), 'px; the sliver', sliverPx, 'px, within', sliverBefore, 'levels of RA-D-1 in RA-D-3 and', sliverLeft, 'in RA-D-3x')
print('per piece', {k: (v['changedPxAgainstTheKeep'], v['outsideTheMask'], v['closingPathMinDepthPx'], v['closingPathPxWhereTheKeepDiffersFromTheRaw']) for k, v in pieceChecks.items()})
for s in screens: print(f"{s['name']}: corners {s['corners']} | {s['px']} px, p95 L {s['p95L']}, max {s['maxL']} | map {s['map']}")
