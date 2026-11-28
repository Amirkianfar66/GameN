# Sheet RA-D: RA-D-4c, view D's final plate (the Lead, 27 November 2026, 23:49 and 23:54). Step 3 painted the food capsule on RA-D-3hc;
# its kept picture, RA-D-4, cuts the housing where step 3's shape ends (the keep's 2 px Gaussian): its bottom edge and the handle's lower
# half, and the right side face's outer ink. RA-D-4c completes it in one code step with the toolbox's cast shadow (the Lead's decision on
# RA-D-3hc's review): a code composite of AI-generated pictures (RA-D-4, itself the keep of step 3's raw over RA-D-3hc; step 3's raw;
# RA-D-3h's raw). No picture is generated.
#
# How. RA-D-4 is the image tool's keep (rd1_tools.py keep3): step 3's raw over RA-D-3hc inside step 3's mask, feathered by a 2 px
# Gaussian; rebuilt here and checked pixel for pixel. Two outlines, far apart, each with 1 px of feather outside it:
# - the capsule: one outline round the housing, traced on step 3's raw where it closes on the housing's own outer ink (the top face's,
#   the right side face's, the left side's and the bottom's, with the handle inside); the bracket plate the raw paints below it is left
#   out (view A's accepted capsule has none), so RA-D-4's wall stays below the housing and its seam passes behind it. Inside, step 3's
#   raw. The raw file carries an alpha channel (221 to 241, never 255); as the keep did, its RGB is taken and the alpha ignored.
# - the shadow: traced on RA-D-3h's raw where it is darker than the lit deck RA-D-4 keeps there (RA-D-3hc's, as step 3's mask lies
#   330 px or more away): its west and lower edges fitted as straight lines, its east end read along rays, closing at the shadow's crisp
#   edge and, under the box's bottom-right edge, inside the toolbox's area where the plate already holds the raw; it closes inside the
#   box, 4 px in from its ink, where the plate is the raw already. Inside, RA-D-3h's raw. The deck seam that crosses the band (z = 1,
#   meeting the box at x 424) is the raw's inside the outline and the plate's outside: where its dark and light lines cross the outline,
#   the raw's and the plate's lie within 1 px of each other, measured here; over 1 px the script stops.
# Writes ra-D-4c.png, composite-D4c.json and painted-D.json (its picture now RA-D-4c; the toolbox's place unchanged; the capsule's
# painted box added: its outline's box in the picture, and on the east wall the box whose outline spans it).
#
# Reads from <records folder>: img/RA-D-4.png, img/RA-D-4-raw.png and img/RA-D-3h-raw.png, each checked by its sha256; from its own
# folder (or img/): ra-D-3hc.png (by its pixels; compositeD3hc.py writes it), ra-D-place3.png, screens-D.json, composite-D3hc.json,
# painted-D.json, the colour map ra-D-regions2b.png and colour-check-ra1.py, each checked. --stand-in (the dry run before step 3) stands
# RA-D-3hc in for RA-D-4, takes the shadow only, and writes into _d4c/standin/. NumPy and Pillow only.
# Usage: python3 -I compositeD4c.py <records folder> [--stand-in]
import hashlib, importlib.util, json, math, os, sys
import numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
args = [a for a in sys.argv[1:] if a != '--stand-in']; SI = '--stand-in' in sys.argv
if not args: sys.exit('usage: python3 -I compositeD4c.py <records folder> [--stand-in]')
REC = args[0]; OUTD = os.path.join(D, '_d4c', 'standin') if SI else D
os.makedirs(OUTD, exist_ok=True)
OWNP = lambda f: os.path.join(D, f) if os.path.exists(os.path.join(D, f)) else os.path.join(D, 'img', f)
fsha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
psha = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()
RAW3H = ('img/RA-D-3h-raw.png', '3b67e224fb4bcb0a70c938f81754a3b29f617a1f643fbde6ba4a5bc4971d9df2')
RA_D_4 = ('img/RA-D-4.png', '4b1c22bedee4232919863bdcccd6a38e06c9dae92c977a0d1ff585b4bec1f45a')          # the record of step 3 (RA-D-4.json), accepted by the Lead
RA_D_4_RAW = ('img/RA-D-4-raw.png', '5b744e667bfbc275a1947672bf6b405e0e13f74e52bae2e4a268e446f33a1a86')
HC_PIXELS = '5a7f55ad9bbf048e0784afe8da0c2dd49d10fadedc33a275208872b5d7beef09'
OWN = {'ra-D-place3.png': '796dcb31de2abf2218a6364564b8efd5579bbe484a44c3ea915ffec8ddb667dd',
       'screens-D.json': '6c29a22b82104f1eab823ed248a71c9d59e19a0599122a799f1c02d7b14bcba5',
       'composite-D3hc.json': '7de3de7cbdef1e6bdcae928318e28310f23d11870bdcd9af21114e01c70815c5',
       'painted-D.json': 'f5e7c231b3032ea927c1f5d0bd6e561f8a025746e75b86adb9ff62d34ac7b73e',
       'ra-D-regions2b.png': 'c4d5168dda51ac73d1f04960a213fac9dbd3cd8a4ac4477a4eb3bb5bf91b5786',
       'colour-check-ra1.py': 'c882f4f8259b44bf8d689021daa2e5b0e8f028539cc076cc457fe144f582dbd2'}
if fsha(os.path.join(REC, RAW3H[0])) != RAW3H[1]: sys.exit(f'STOP: {RAW3H[0]} is not RA-D-3h-raw')
# painted-D.json: version 2.3's file, or this script's own output from it (its picture and capsule replaced; its toolbox and camera
# version 2.3's, checked by their canonical JSON)
CANON = lambda P: hashlib.sha256(json.dumps({'toolbox': P['toolbox'], 'camera': P['camera']}, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
PD_TC = 'd1d8c14bf4fb0984983d4c918c9c333930099e00dbc9166848e324964c914d07'
for f, h in OWN.items():
    if fsha(OWNP(f)) != h and not (f == 'painted-D.json' and CANON(json.load(open(OWNP(f)))) == PD_TC): sys.exit(f'STOP: {f} is not the file version 2.3 published')
rgb = lambda f: np.array(Image.open(f).convert('RGB'))
hc = rgb(OWNP('ra-D-3hc.png'))
if psha(hc) != HC_PIXELS: sys.exit('STOP: ra-D-3hc.png is not RA-D-3hc (rebuild it with compositeD3hc.py)')
raw = rgb(os.path.join(REC, RAW3H[0])); H, W = raw.shape[:2]
p3 = np.array(Image.open(OWNP('ra-D-place3.png')).convert('L')) > 127
if SI:
    d4, keep3Exact, d4src = hc.copy(), None, {'name': 'RA-D-3hc, standing in for RA-D-4 (a dry run before step 3)', 'pixelsSha256': HC_PIXELS}
else:
    if not RA_D_4[1] or not RA_D_4_RAW[1]: sys.exit("STOP: RA-D-4's and its raw's sha256 are not pinned yet: pin them from the image session's record of step 3")
    for f, h in (RA_D_4, RA_D_4_RAW):
        if fsha(os.path.join(REC, f)) != h: sys.exit(f'STOP: {f} is not the picture the record of step 3 names')
    d4, raw4 = rgb(os.path.join(REC, RA_D_4[0])), rgb(os.path.join(REC, RA_D_4_RAW[0]))
    blur3 = Image.fromarray((p3 * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
    keep3Exact = bool((np.array(Image.composite(Image.fromarray(raw4), Image.fromarray(hc), blur3)) == d4).all())
    if not keep3Exact: sys.exit("STOP: RA-D-4 is not the keep of step 3's raw over RA-D-3hc in step 3's mask")
    d4src = {'name': 'RA-D-4', 'file': RA_D_4[0], 'sha256': RA_D_4[1], 'pixelsSha256': psha(d4)}

# ---- the shadow's outline, traced on RA-D-3h's raw (painting pixels, pixel-edge coordinates), clockwise on screen from inside the box
SHADOW = [
 ("inside the box, along its left side 4 px in from its ink, to the shadow's top",
  [(393.0, 1190.65), (393.0, 1179.0)]),
 ("the shadow's top, from the box's left side to its west edge",
  [(393.0, 1179.0), (384.72, 1179.0)]),
 ("the shadow's west edge: x = 2198.727 - 1.5386 y (19 readings, rms 0.48 px) to y 1197, then its blunt corner as read",
  [(384.72, 1179.0), (357.03, 1197.0), (356.0, 1198.5), (356.0, 1201.5)]),
 ("the shadow's lower edge, parallel to the box's bottom-left edge",
  [(356.0, 1201.5), (357.0, 1203.1), (467.7, 1241.8)]),
 ("the shadow's east end, read along rays",
  [(468.86697534428043, 1241.9505310751927), (470.0, 1241.75), (471.0458689129719, 1240.9543363771008), (472.08377813200315, 1240.8176930361465), (472.976419018679, 1240.1081470023244), (473.93323164824517, 1239.806465139038), (474.6488008791477, 1238.969385657403), (475.125, 1237.8767603887904), (476.16594669077375, 1237.8058844761067), (476.9099668041303, 1237.234977763529), (477.95495128834864, 1236.9549512883486), (479.38404442820746, 1236.8741482186601), (480.85376458682913, 1236.5998877816514), (481.907849302036, 1235.875), (482.6883090185131, 1234.9166556643697), (482.92077353580623, 1233.7027769707279), (484.7303688509083, 1232.9469904378134), (486.9879337394606, 1231.9954310647545), (492.6634293815872, 1230.9827931475093), (494.75, 1229.0), (495.90106215038537, 1226.733950688561), (496.8360112695827, 1224.2680871585762), (496.80444167952163, 1221.8177714984051), (497.9, 1216.0)]),
 ("into the toolbox's area beside its bottom-right edge, where RA-D-3hc already holds the raw",
  [(497.9, 1216.0), (499.5, 1208.0), (494.0, 1208.0)]),
 ("inside the box, 4 px in from its bottom edges, back to the start",
  [(494.0, 1208.0), (484.0, 1216.5), (478.0, 1219.6), (393.0, 1190.65)]),
]
# ---- the capsule housing's outline, traced on step 3's raw (painting pixels, pixel-edge coordinates), clockwise on screen from its
# top-left corner; each edge read as the midpoint between its ink and the level 1.5-3.5 px beside it
CAPSULE = [
 ("the top-left corner and the top face's left edge: read along rays every 6\u00b0 from inside the housing to x 642, then down columns (the wall's cables above it, at x 642-648, left out)",
  [(632.07, 724.0), (632.58, 722.8), (632.85, 721.63), (633.84, 720.7), (634.67, 719.85), (635.54, 719.12), (636.24, 718.36), (637.31, 717.97), (638.15, 717.5), (639.0, 717.12), (639.95, 716.98), (640.79, 716.8), (641.46, 716.19), (642.29, 715.98), (643.5, 715.0), (644.5, 714.77), (646.5, 714.1), (647.5, 713.84), (650.5, 712.84)]),
 ("the top face's outer ink: y = 709.539 + 0.00474 x (34 readings, rms 0.064 px)",
  [(651.3, 712.63), (695.55, 712.84)]),
 ("the top-right corner: read along rays every 6\u00b0",
  [(696.35, 712.96), (697.56, 713.06), (699.79, 713.97), (700.9, 714.5), (701.89, 715.24), (702.8, 716.08), (703.51, 717.09), (704.13, 718.15), (704.65, 719.26), (704.99, 720.43), (705.35, 721.59), (705.59, 722.78), (705.43, 724.0)]),
 ("the right side face's outer ink: x = 707.04 - 0.00244 y (43 readings, rms 0.054 px)",
  [(705.27, 724.8), (705.06, 811.2)]),
 ("the bottom-right corner and the side face's bottom edge: read along rays every 6\u00b0",
  [(705.07, 812.0), (705.03, 813.58), (705.27, 818.8), (701.32, 822.19), (700.68, 823.87), (697.8, 825.51), (693.25, 827.3), (691.68, 827.97), (690.0, 828.34)]),
 ("the housing's bottom ink: read up columns from the bracket below (its face in the housing's shadow), stray readings dropped",
  [(688.5, 828.94), (687.5, 829.34), (686.5, 829.75), (685.5, 829.85), (684.5, 829.8), (683.5, 829.73), (682.5, 829.71), (681.5, 829.4), (680.5, 829.25), (679.5, 829.28), (678.5, 829.21), (677.5, 829.18), (676.5, 829.28), (675.5, 829.64), (674.5, 829.62), (673.5, 829.55), (672.5, 829.47), (671.5, 829.49), (670.5, 829.41), (669.5, 829.5), (668.5, 829.47), (667.5, 829.57), (666.5, 829.54), (665.5, 829.47), (664.5, 829.31), (663.5, 829.27), (662.5, 829.24), (661.5, 829.19), (660.5, 829.15), (659.5, 829.02), (658.5, 828.89), (657.5, 828.85), (656.5, 828.45), (655.5, 828.24), (654.5, 828.0), (653.5, 827.88), (652.5, 827.32), (651.5, 827.35), (648.5, 827.66), (647.5, 827.63), (646.5, 827.33), (645.5, 827.34)]),
 ("the bottom-left corner: read along rays every 5-6\u00b0 (the bracket's left ink, met at 115\u00b0, left out)",
  [(644.0, 826.8), (642.71, 826.23), (641.47, 825.92), (640.19, 825.72), (638.97, 825.29), (634.62, 824.59), (634.31, 823.69), (634.01, 822.99), (633.88, 822.12), (632.76, 819.91)]),
 ("the left side's outer ink: x = 633.431 - 0.00185 y (44 readings, rms 0.066 px)",
  [(631.92, 819.11), (632.09, 724.8)]),
]

def sdist(poly, X, Y):   # signed distance from the points to the polygon's outline: + inside, - outside (even-odd)
    P = np.array(poly, float); A, B = P, np.roll(P, -1, axis=0); px, py = X[..., None], Y[..., None]
    ax, ay, bx, by = A[:, 0], A[:, 1], B[:, 0], B[:, 1]; dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / np.maximum(dx * dx + dy * dy, 1e-12), 0, 1)
    d = np.hypot(px - (ax + t * dx), py - (ay + t * dy)).min(axis=-1)
    cross = ((ay <= py) & (by > py)) | ((by <= py) & (ay > py)); xint = ax + (py - ay) * dx / np.where(dy == 0, 1, dy)
    return np.where((cross & (px < xint)).sum(axis=-1) % 2 == 1, d, -d)
def polygon(runs):
    P = []
    for _, pts in runs:
        for q in pts:
            if not P or math.hypot(q[0] - P[-1][0], q[1] - P[-1][1]) > 0.05: P.append(q)
    if math.hypot(P[0][0] - P[-1][0], P[0][1] - P[-1][1]) < 0.05: P.pop()
    return P
FEATHER = 1.0
def alpha_of(P):
    xs = [q[0] for q in P]; ys = [q[1] for q in P]; x0, x1, y0, y1 = max(0, int(min(xs)) - 2), min(W, int(max(xs)) + 3), max(0, int(min(ys)) - 2), min(H, int(max(ys)) + 3)
    a = np.zeros((H, W)); X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5); a[y0:y1, x0:x1] = np.clip(1 + sdist(P, X, Y) / FEATHER, 0, 1); return a
SP = polygon(SHADOW); aS = alpha_of(SP)
CP = polygon(CAPSULE); aC = np.zeros((H, W)) if SI else alpha_of(CP)
if ((aS > 0) & (aC > 0)).any(): sys.exit('STOP: the two outlines meet')
src4 = d4 if SI else raw4
out = np.rint(d4 * (1 - aC - aS)[..., None] + src4 * aC[..., None] + raw * aS[..., None]).astype(np.uint8)

# ---- checks
changed = (out != d4).any(axis=2); inS, inC = aS > 0, aC > 0
changedOutside = int((changed & ~inS & ~inC).sum())
rawWhole = bool((out[aS == 1] == raw[aS == 1]).all()); capRawWhole = None if SI else bool((out[aC == 1] == raw4[aC == 1]).all())
byPart = {'capsule': int((changed & inC).sum()), 'shadow': int((changed & inS).sum())}
# the box: inside RA-D-3hc's outline RA-D-4 is the raw already, so nothing there changes
C3 = json.load(open(OWNP('composite-D3hc.json'))); BP = polygon([(r['name'], [tuple(q) for q in r['points']]) for r in C3['outline']['runs']])
aB = alpha_of(BP); boxChanged = int((changed & (aB == 1)).sum())
# how far the shadow's change lies from step 3's mask
yy, xx = np.nonzero(changed & inS); py, px = np.nonzero(p3)
far = float(np.sqrt(((xx[:, None] - px[None, ::7]) ** 2 + (yy[:, None] - py[None, ::7]) ** 2).min())) if len(xx) else None
# the screens
S = json.load(open(OWNP('screens-D.json'))); scr = {}
for s in S['screens']:
    q = s['corners']; qx = [c[0] for c in q]; qy = [c[1] for c in q]; a0, a1, b0, b1 = int(min(qx)) - 1, int(max(qx)) + 2, int(min(qy)) - 1, int(max(qy)) + 2
    X, Y = np.meshgrid(np.arange(a0, a1) + 0.5, np.arange(b0, b1) + 0.5); inq = np.zeros((H, W), bool); inq[b0:b1, a0:a1] = sdist(q, X, Y) > 0
    scr[s['name']] = {'px': int(inq.sum()), 'equalToRA-D-3hc': bool((out[inq] == hc[inq]).all())}
# the deck seam (z = 1) where it crosses the outline: its dark line and the light line beside it, in the raw and in the plate
Lum = lambda a: 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
def bil(L, x, y):
    x, y = x - 0.5, y - 0.5; i, j = int(np.floor(x)), int(np.floor(y)); fx, fy = x - i, y - j
    return L[j, i] * (1 - fx) * (1 - fy) + L[j, i + 1] * fx * (1 - fy) + L[j + 1, i] * (1 - fx) * fy + L[j + 1, i + 1] * fx * fy
def extremum(L, p, v, ts, kind):
    prof = np.array([bil(L, *(p + t * v)) for t in ts]); i = int(np.argmin(prof) if kind == 'dark' else np.argmax(prof))
    if not 0 < i < len(ts) - 1: return None
    a_, b_, c_ = prof[i - 1], prof[i], prof[i + 1]; den = a_ - 2 * b_ + c_; off = 0.5 * (a_ - c_) / den if den != 0 else 0
    return p + (ts[i] + (ts[1] - ts[0]) * off) * v
def robust(pts):
    Q = np.array(pts); b, a = np.polyfit(Q[:, 0], Q[:, 1], 1); r = np.abs(Q[:, 1] - (a + b * Q[:, 0])); k = r <= 1.2
    if k.sum() < len(r): b, a = np.polyfit(Q[k, 0], Q[k, 1], 1); r = np.abs(Q[:, 1] - (a + b * Q[:, 0]))
    return a, b, int(k.sum()), int((~k).sum()), round(float(np.sqrt(np.mean(r[k] ** 2))), 3)
LOW = (1078.2596093073887, 0.34967917963029893)   # the outline's lower edge, y = a + b x
seam = {}
Lr, Lp = Lum(raw.astype(float)), Lum(d4.astype(float))
k0 = -0.87195; u = np.array([1, k0]) / math.hypot(1, k0); v = np.array([-u[1], u[0]]); v = v if v[1] > 0 else -v
x_c = (1575.01 - LOW[0]) / (LOW[1] + 0.87195); c = np.array([x_c, LOW[0] + LOW[1] * x_c])
seed = [q for q in (extremum(Lp, c - s * u, v, np.arange(-4, 4.001, 0.1), 'dark') for s in np.arange(4, 24.01, 0.5)) if q is not None]
a0, b0, *_ = robust(seed); u = np.array([1, b0]) / math.hypot(1, b0); v = np.array([-u[1], u[0]]); v = v if v[1] > 0 else -v
x0_ = (a0 - LOW[0]) / (LOW[1] - b0); c0 = np.array([x0_, LOW[0] + LOW[1] * x0_])
for name, L in (('raw', Lr), ('plate', Lp)):
    pts = [q for q in (extremum(L, c0 + s * u, v, np.arange(-3, 3.001, 0.1), 'dark') for s in np.arange(-12, 12.01, 0.5)) if q is not None]
    a, b, n, dr, rms = robust(pts); xc = (a - LOW[0]) / (LOW[1] - b); cc = np.array([xc, LOW[0] + LOW[1] * xc])
    uu = np.array([1, b]) / math.hypot(1, b); vv = np.array([-uu[1], uu[0]]); vv = vv if vv[1] > 0 else -vv
    offs = [abs(t) for t in (lambda q: [q])(None) if False]
    lt = []
    for s in np.arange(-12, 12.01, 0.5):
        q = extremum(L, cc + s * uu, vv, np.arange(0.5, 4.001, 0.1), 'light')
        if q is not None: lt.append(float(np.dot(q - (cc + s * uu), vv)))
    light = cc + float(np.median(lt)) * vv
    seam[name] = {'dark': {'line': f'y = {a:.2f} + {b:.4f} x', 'readings': n, 'dropped': dr, 'rmsPx': rms, 'crossing': [round(float(cc[0]), 2), round(float(cc[1]), 2)]},
                  'light': {'offsetFromDarkPx': round(float(np.median(lt)), 2), 'crossing': [round(float(light[0]), 2), round(float(light[1]), 2)]}}
seamApart = {k: round(math.hypot(seam['raw'][k]['crossing'][0] - seam['plate'][k]['crossing'][0], seam['raw'][k]['crossing'][1] - seam['plate'][k]['crossing'][1]), 2) for k in ('dark', 'light')}
# ---- the capsule: its extents against step 3's shape and the plan's, the bracket left out, the wall's seam behind it, the ink it
# closes on, and its painted box (on the east wall, the box whose outline in the picture spans the painted outline's box)
CAP = None
if not SI:
    cx_ = [q[0] for q in CP]; cy_ = [q[1] for q in CP]; obox = [round(min(cx_), 2), round(min(cy_), 2), round(max(cx_), 2), round(max(cy_), 2)]
    sy_, sx_ = np.nonzero(p3); sbox = [int(sx_.min()), int(sy_.min()), int(sx_.max()) + 1, int(sy_.max()) + 1]
    PD0 = json.load(open(OWNP('painted-D.json'))); CAMD = PD0['camera']
    fw_ = (math.sin(CAMD['yaw']), math.cos(CAMD['yaw'])); rt_ = (math.cos(CAMD['yaw']), -math.sin(CAMD['yaw']))
    def toPic(x, y, z):
        d_ = (x - CAMD['C'][0], y - CAMD['C'][1], z - CAMD['C'][2]); vx_ = d_[0] * rt_[0] + d_[2] * rt_[1]; vz_ = d_[0] * fw_[0] + d_[2] * fw_[1]
        return (CAMD['cx'] + CAMD['focalPx'] * vx_ / vz_, CAMD['horizonY'] - CAMD['focalPx'] * d_[1] / vz_)
    def silhouette(z0, z1, y0, y1):   # the box x 1.78 to 2.0 (the plan's depth off the east wall), z0 to z1, y0 to y1: its outline's box in the picture
        P_ = [toPic(x, y, z) for x in (1.78, 2.0) for y in (y0, y1) for z in (z0, z1)]
        return np.array([min(p[0] for p in P_), min(p[1] for p in P_), max(p[0] for p in P_), max(p[1] for p in P_)])
    PLAN = (0.89, 1.21, 1.0, 1.55); pbox = silhouette(*PLAN)   # stageA.mjs: 0.32 m wide, 0.22 m deep, 1.0 to 1.55 m up, its centre at z 1.05
    q_ = np.array(PLAN, float); tgt = np.array(obox, float)
    for _ in range(40):
        r_ = silhouette(*q_) - tgt
        if np.abs(r_).max() < 1e-6: break
        Jm = np.zeros((4, 4))
        for k in range(4):
            dq = np.zeros(4); dq[k] = 1e-6; Jm[:, k] = (silhouette(*(q_ + dq)) - silhouette(*q_)) / 1e-6
        q_ = q_ - np.linalg.solve(Jm, r_)
    fitRes = silhouette(*q_) - tgt; z0, z1, y0, y1 = [float(v) for v in q_]
    if np.abs(fitRes).max() > 0.01: sys.exit(f"STOP: no box's outline spans the painted outline: {fitRes}")
    # the bracket the raw paints under the housing: none of it taken (only the outline's 1 px feather reaches below the bottom edge)
    yb0 = int(math.floor(obox[3])) - 3; Xb, Yb = np.meshgrid(np.arange(636, 705) + 0.5, np.arange(yb0, 849) + 0.5); under = sdist(CP, Xb, Yb) < 0
    aU = aC[yb0:849, 636:705][under]
    # where the plate's top meets the housing's bottom ink, in step 3's raw: along the bottom run, the ink's darkest within 3 px above each
    # point, and the plate's level 1.5 to 3.5 px below it (in the housing's shadow, darker than the wall)
    Lr4_ = Lum(raw4.astype(float)); BOT = next(pts for n_, pts in CAPSULE if n_.startswith("the housing's bottom ink"))
    inkB = [min(bil(Lr4_, x_, y_ - t) for t in np.arange(0.1, 3.01, 0.1)) for x_, y_ in BOT]
    plB = [float(np.median([bil(Lr4_, x_, y_ + t) for t in np.arange(1.5, 3.51, 0.25)])) for x_, y_ in BOT]
    bracket = {'area': "the raw's bracket plate under the housing: x 636 to 705, from the housing's bottom edge down to y 849, outside the outline",
               'px': int(under.sum()), 'takenWhole': int((aU >= 1).sum()), 'inTheFeather': int((aU > 0).sum()), 'maxAlphaInTheFeather': round(float(aU.max()), 3),
               'whereItMeetsTheBottomInk': {'readings': len(BOT), 'inkMedian': round(float(np.median(inkB)), 1), 'inkMax': round(float(max(inkB)), 1),
                                            'plateMin': round(float(min(plB)), 1), 'plateMedian': round(float(np.median(plB)), 1),
                                            'what': "in step 3's raw, along the bottom run: the ink's darkest within 3 px above each point, and the plate's level 1.5 to 3.5 px below it (luminance)"}}
    # the wall's seam in RA-D-4 at about y 820 (RA-D-4c keeps RA-D-4's wall round the housing): its darkest row in each column either
    # side of the housing (x 610-613 and 624-631 left, past a pipe; x 707-727 right), against the housing's top and bottom
    Lo = Lum(out.astype(float)); Lk = Lum(d4.astype(float))
    def seam_side(xs_):
        P_ = [(x_ + 0.5, 814 + int(np.argmin(Lo[814:827, x_])) + 0.5, float(Lo[814:827, x_].min())) for x_ in xs_]
        return [p for p in P_ if p[2] < 40]
    sL, sR = seam_side(list(range(610, 614)) + list(range(624, 632))), seam_side(range(707, 728))
    bL, aL_ = np.polyfit([p[0] for p in sL], [p[1] for p in sL], 1) if len(sL) > 2 else (0, float(np.median([p[1] for p in sL])))
    bR, aR_ = np.polyfit([p[0] for p in sR], [p[1] for p in sR], 1)
    yL, yR = aL_ + bL * obox[0], aR_ + bR * obox[2]
    botAt = lambda x_: max(q[1] for q in CP if abs(q[0] - x_) < 3.5)
    seamCap = {'left': {'readings': len(sL), 'yAtTheHousing': round(float(yL), 2), 'housingBottomThere': round(botAt(obox[0] + 3), 2)},
               'right': {'readings': len(sR), 'yAtTheHousing': round(float(yR), 2), 'housingBottomThere': round(botAt(obox[2] - 3), 2)},
               'behindTheHousing': bool(obox[1] < yL < botAt(obox[0] + 3) and obox[1] < yR < botAt(obox[2] - 3)),
               'unchangedEitherSide': bool((out[814:827, 600:631] == d4[814:827, 600:631]).all() and (out[814:827, 708:740] == d4[814:827, 708:740]).all())}
    # the ink the outline closes on: along each run, every 1 px, the darkest of step 3's raw within 1.5 px inside, and RA-D-4c's level
    # 1.5 to 3.5 px outside (the median of each, by run)
    Lr4 = Lum(raw4.astype(float))
    ink = {}
    for nm, pts in CAPSULE:
        vals_in, vals_out = [], []
        for (x_a, y_a), (x_b, y_b) in zip(pts[:-1], pts[1:]) if len(pts) > 1 else []:
            seg = math.hypot(x_b - x_a, y_b - y_a)
            for t in np.arange(0, max(seg, 1e-9), 1.0):
                p_ = np.array([x_a, y_a]) + (np.array([x_b - x_a, y_b - y_a]) / max(seg, 1e-9)) * t
                n_ = np.array([-(y_b - y_a), x_b - x_a]) / max(seg, 1e-9)
                if sdist(CP, np.array([[p_[0] + 0.6 * n_[0]]]), np.array([[p_[1] + 0.6 * n_[1]]]))[0, 0] < 0: n_ = -n_
                vals_in.append(min(bil(Lr4, *(p_ + s_ * n_)) for s_ in np.arange(0.1, 1.51, 0.1)))
                vals_out.append(float(np.median([bil(Lo, *(p_ - s_ * n_)) for s_ in np.arange(1.5, 3.51, 0.25)])))
        if vals_in: ink[nm.split(':')[0]] = {'samples': len(vals_in), 'inkInside': round(float(np.median(vals_in)), 1), 'outside': round(float(np.median(vals_out)), 1)}
    # the hatch (the paper-white panel) and the lens on the plate, for an overlay at the capsule
    Lc = Lo[712:831, 631:707]; Rc = out[712:831, 631:707].astype(int); paper = (Lc > 150) & (Rc[..., 0] > Rc[..., 2] + 15)
    def largest(mask_):
        lab_ = np.zeros(mask_.shape, int); best_ = (0, None); n_ = 0
        for j0, i0 in zip(*np.nonzero(mask_)):
            if lab_[j0, i0]: continue
            n_ += 1; st = [(j0, i0)]; lab_[j0, i0] = n_; cnt = 0
            while st:
                j1, i1 = st.pop(); cnt += 1
                for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    j2, i2 = j1 + dj, i1 + di
                    if 0 <= j2 < mask_.shape[0] and 0 <= i2 < mask_.shape[1] and mask_[j2, i2] and not lab_[j2, i2]: lab_[j2, i2] = n_; st.append((j2, i2))
            if cnt > best_[0]: best_ = (cnt, n_)
        return lab_ == best_[1], best_[0]
    hm, hn = largest(paper); hy_, hx_ = np.nonzero(hm)
    lens = Lo[722:755, 645:678] < 45; ly_, lx_ = np.nonzero(lens)
    parts = {'hatch': {'box': [int(hx_.min()) + 631, int(hy_.min()) + 712, int(hx_.max()) + 632, int(hy_.max()) + 713], 'px': int(hn), 'how': 'its paper-white pixels (luminance over 150, red over blue by 16 or more), the largest connected part'},
             'lens': {'box': [int(lx_.min()) + 645, int(ly_.min()) + 722, int(lx_.max()) + 646, int(ly_.max()) + 723], 'how': 'its dark ring and glass (luminance under 45) high on the front'}}
    r2 = lambda v: round(float(v), 2); r3 = lambda v: round(float(v), 3)
    CAP = {'outline': {'runs': [{'name': n_.split(':')[0], 'how': n_.split(': ', 1)[1], 'points': [list(q) for q in pts]} for n_, pts in CAPSULE], 'vertices': len(CP)},
           'outlineBox': obox, 'shapeBox': sbox, 'planBox': [r2(v) for v in pbox],
           'pastTheShapePx': {'left': r2(sbox[0] - obox[0]), 'top': r2(sbox[1] - obox[1]), 'right': r2(obox[2] - sbox[2]), 'bottom': r2(obox[3] - sbox[3])},
           'pastThePlanPx': {'left': r2(pbox[0] - obox[0]), 'top': r2(pbox[1] - obox[1]), 'right': r2(obox[2] - pbox[2]), 'bottom': r2(obox[3] - pbox[3])},
           'bracket': bracket, 'wallSeam': seamCap, 'inkAlongTheOutline': ink, 'parts': parts,
           'wall': {'z': [r3(z0), r3(z1)], 'y': [r3(y0), r3(y1)], 'fitResidualPx': [round(float(v), 4) for v in fitRes]}}

seamOk = all(v_ <= 1.0 for v_ in seamApart.values())
ok = (changedOutside == 0 and rawWhole and boxChanged == 0 and all(s['equalToRA-D-3hc'] for s in scr.values()) and (keep3Exact is not False)
      and (SI or (capRawWhole and CAP['bracket']['takenWhole'] == 0 and CAP['wallSeam']['behindTheHousing'] and CAP['wallSeam']['unchangedEitherSide'])))
if not seamOk: sys.exit(f'HOLD: the seam crossings are more than 1 px apart: {seamApart}; show the Lead the zoom')
if not ok: sys.exit(f"STOP: changed outside {changedOutside}, raw whole {rawWhole}/{capRawWhole}, box changed {boxChanged}, screens {scr}, capsule {json.dumps({k: CAP[k] for k in ('bracket', 'wallSeam')}) if CAP else None}")

# ---- outputs
name = 'ra-D-4c-standin.png' if SI else 'ra-D-4c.png'
Image.fromarray(out).save(os.path.join(OUTD, name), optimize=True)
spec = importlib.util.spec_from_file_location('cc', OWNP('colour-check-ra1.py')); CCm = importlib.util.module_from_spec(spec); spec.loader.exec_module(CCm)
r = CCm.check(os.path.join(OUTD, name), OWNP('ra-D-regions2b.png'))
colours = {'map': 'ra-D-regions2b.png', 'pass': r['pass'], 'failing': [k for k, v_ in r['result'].items() if not v_], 'openingsP95L': r['areas']['window']['p95L'], 'wallsAndDeckInBase': r['areas']['walls and deck']['inBase']}
J = lambda o, f: (json.dump(o, open(os.path.join(OUTD, f), 'w'), indent=1), open(os.path.join(OUTD, f), 'a').write('\n'))
plate = {'file': name, 'sha256': fsha(os.path.join(OUTD, name)), 'pixelsSha256': psha(out), 'size': [W, H], 'aiGenerated': True, 'codeComposite': True}
rec = {'sheet': 'RA-D', 'view': 'D', 'step': '3 (after step 3)', 'date': '2026-11-28', 'name': 'RA-D-4c' + (' (stand-in dry run)' if SI else ''),
       'what': "view D's final plate: RA-D-4 (step 3's keep, the food capsule on RA-D-3hc) with the capsule's housing completed from step 3's raw and the toolbox's cast shadow taken from RA-D-3h's raw",
       'drawnBy': 'code', 'generated': False, 'standIn': SI,
       'codeComposite': {'of': ['RA-D-4', "step 3's raw edit (RA-D-4-raw)", "RA-D-3h's raw edit"], 'aiGenerated': True,
                         'how': "inside the capsule's traced outline, step 3's raw; inside the shadow's traced outline, RA-D-3h's raw; each with 1 px of feather outside it; elsewhere RA-D-4 unchanged"},
       'decision': ["the Lead, 27 November 2026, 23:49: take the toolbox's shadow from RA-D-3h's raw, after step 3 so its pin stands, in one code step with any capsule completion step 3 needs; close at the shadow's crisp edge and on the box's ink; the raw's seam inside, the plate's outside, the crossings within 1 px",
                    "the Lead, 27 November 2026, 23:54: RA-D-4 accepted as step 3's kept picture, for completion in code: one outline closing on the housing's own ink (the top, the left side, the right side face's outer ink, the bottom edge with the handle), 1 px of feather; the bracket plate left out, as view A's accepted capsule has none; RA-D-4's wall stays below the housing and its seam passes behind it; the capsule's painted box into painted-D.json"],
       'sources': [d4src] + ([] if SI else [{'name': 'RA-D-4-raw', 'file': RA_D_4_RAW[0], 'sha256': RA_D_4_RAW[1], 'aiGenerated': True, 'what': "the capsule's housing, inside its outline (its RGB; the file's alpha channel, 221 to 241, ignored, as the keep did)"}])
                  + [{'name': 'RA-D-3h-raw', 'file': RAW3H[0], 'sha256': RAW3H[1], 'aiGenerated': True, 'what': 'the shadow, inside its outline'}],
       'feather': {'px': FEATHER, 'how': "alpha = 1 inside each outline, falling linearly to 0 at 1 px outside it, by each pixel centre's distance from the outline"},
       **({} if SI else {'capsule': {'what': "the food capsule's housing: one outline closing on its own outer ink, traced on step 3's raw; the bracket plate below it left out", **CAP}}),
       'shadow': {'tracing': "on RA-D-3h's raw, where it is darker than the plate's lit deck: the difference in luminance, median-filtered 5 x 5, above 10 levels (closed 7 x 7 so the seam does not cut the band); the lower edge read along normals to the box's bottom-left edge every 2 px (y = 1078.260 + 0.34968 x, 41 readings, rms 0.47 px), the west edge along rows (x = 2198.727 - 1.5386 y, 19 readings, rms 0.48 px), its blunt corner and the east end as read",
                  'outline': {'runs': [{'name': n_, 'points': [list(q) for q in pts]} for n_, pts in SHADOW], 'vertices': len(SP)},
                  'seam': {'which': "the painted deck seam z = 1, meeting the box's bottom-left edge at x 424, crossing the outline's lower edge", **seam, 'crossingsApartPx': seamApart, 'withinOnePx': seamOk},
                  'nearestChangeToStep3MaskPx': round(far, 1) if far is not None else None},
       'checks': {'keep3RebuiltExactly': keep3Exact, 'changedPxAgainstRA-D-4': int(changed.sum()), 'changedPxByPart': byPart, 'unchangedPxAgainstRA-D-4': int(W * H - changed.sum()), 'picturePx': W * H,
                  'changedOutsideTheOutlinesAndTheirFeather': changedOutside, 'rawTakenWholeInsideTheOutlines': {'capsule': capRawWhole, 'shadow': rawWhole}, 'boxPxChanged': boxChanged,
                  'bracketPxTakenWhole': None if SI else CAP['bracket']['takenWhole'], 'wallSeamBehindTheHousing': None if SI else CAP['wallSeam']['behindTheHousing'], 'screens': scr, 'colours': colours},
       'pass': ok and seamOk,
       'outputs': {name: {'what': 'the plate: RA-D-4c, a code composite of AI-generated pictures', **{k: v_ for k, v_ in plate.items() if k != 'file'}}},
       'units': 'painting pixels (1024 x 1536); outlines in pixel-edge coordinates (a pixel spans i to i + 1)'}
J(rec, 'composite-D4c-standin.json' if SI else 'composite-D4c.json')
if not SI:
    PD = json.load(open(OWNP('painted-D.json'))); PD['picture'] = {'name': 'RA-D-4c', **{k: v_ for k, v_ in plate.items() if k != 'file'}}
    PD['what'] = "view D's pieces painted away from the plan's place, for view D's lift, occlusion and overlays, on its final plate RA-D-4c"; PD['date'] = '2026-11-28'
    cz, cy = (z0 + z1) / 2, (y0 + y1) / 2
    PD['capsule'] = {
        'station': 'wall food capsule',
        'decision': "the Lead, 27 November 2026, 23:54: the housing runs about 11 px below the shape and 2-4 px past its right edge; add the capsule's painted box, as for the toolbox, so D's lift and any eating-visit overlay use the painted capsule",
        'picture': {'outlineBox': CAP['outlineBox'], 'shapeBox': CAP['shapeBox'], 'planBox': CAP['planBox'], 'pastTheShapePx': CAP['pastTheShapePx'], 'pastThePlanPx': CAP['pastThePlanPx'],
                    'centre': [r2((obox[0] + obox[2]) / 2), r2((obox[1] + obox[3]) / 2)], 'planCentre': [r2((pbox[0] + pbox[2]) / 2), r2((pbox[1] + pbox[3]) / 2)], 'parts': CAP['parts'],
                    'how': "the box of the capsule's traced outline (composite-D4c.json); step 3's shape is the plan's outline grown 2 px; the plan's box is the plan's capsule through view D's guide camera"},
        'wall': {'painted': {'x': [1.78, 2.0], 'z': CAP['wall']['z'], 'y': CAP['wall']['y']}, 'plan': {'x': [1.78, 2.0], 'z': [0.89, 1.21], 'y': [1.0, 1.55]},
                 'centre': [r3(cz), r3(cy)], 'planCentre': [1.05, 1.275], 'sizeM': {'painted': [r3(z1 - z0), r3(y1 - y0)], 'plan': [0.32, 0.55]}, 'fitResidualPx': CAP['wall']['fitResidualPx'],
                 'how': "on the east wall, the plan's depth (0.22 m) kept: the box whose outline through view D's guide camera has the painted outline's box (its left, top, right and bottom), found by Newton's method from the plan's; the painting draws the housing's top face as if seen from above, which a box at this height is not, so the box spans the painted outline rather than modelling the top face",
                 'units': 'room metres: x east, y up, z north; z and y are the box\'s south and north sides and its bottom and top'},
        'use': "view D's lift takes the capsule's area from its outline here (composite-D4c.json's capsule outline, grown 2 px, with step 3's mask); its solid for the occlusion is the painted box above, not the plan's; an overlay at the capsule (an eating visit) goes on the painted outline and its hatch and lens boxes"}
    J(PD, 'painted-D.json')
print('RA-D-4c' + (' (stand-in)' if SI else '') + ':', plate['pixelsSha256'][:16], '| changed against RA-D-4', int(changed.sum()), 'by part', byPart, '| outside the outlines', changedOutside, '| raw whole', capRawWhole, rawWhole, '| box px changed', boxChanged, '| nearest shadow change to step 3 mask', round(far, 1) if far else far, 'px')
print('seam', json.dumps(seam), '| apart', seamApart); print('screens', scr, '| colours', colours)
if CAP: print('capsule', json.dumps({k: CAP[k] for k in ('outlineBox', 'shapeBox', 'planBox', 'pastTheShapePx', 'pastThePlanPx', 'bracket', 'wallSeam', 'inkAlongTheOutline', 'parts', 'wall')}, indent=0))
