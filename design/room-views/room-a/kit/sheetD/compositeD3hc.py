# Sheet RA-D version 2.3: RA-D-3hc, view D's step-2 plate (the Lead, 27 November 2026, 22:54). The hatch-only step 2b on RA-D-3x
# (RA-D-3h) put the hatch right-sized and in its place, with the lid upright, and the toolbox right-sized but painted about 27 px left
# of its area. The Lead's decision: keep the toolbox where the raw painted it (a loose prop, about 10 px on the phone), and complete
# the cut pieces from the raw. RA-D-3hc is RA-D-3h with its pieces completed from RA-D-3h's raw: a code composite of AI-generated
# pictures (RA-D-3x, itself a code composite of RA-D-1 and RA-D-3's raw, and RA-D-3h's raw edit). No picture is generated.
#
# How. RA-D-3h is the image tool's keep (rd1_tools.py keep2b): the raw over RA-D-3x inside step 2b's mask, feathered by a 2 px Gaussian;
# rebuilt here and checked pixel for pixel. The toolbox stands on the hatch's near-left end in the raw, so the hatch's left rim runs
# into the box's handle and its near rim into the box's right side: one outline, traced on the raw all round the outer ink of the lid,
# the hatch's rims and the toolbox together, closes on their own ink everywhere (no closing path through a piece). Inside it, the
# raw's pixels, with 1 px of feather outside it; outside it, RA-D-3h unchanged. That completes the lid's top, both its sides and its
# corners, the rims' outer edges and corners, the 8 px gap between step 2b's two areas where the raw runs the hatch on to the box, and
# the toolbox whole at the raw's place: its left side, its bottom edges and corners, its top and its handle. Where the raw paints the
# box's shadow on the deck, outside its ink and outside its area, RA-D-3h's deck (RA-D-3x's) stays: the outline closes on the box's ink.
# The toolbox's painted place on the deck is measured from the outline's base corners and written to painted-D.json, for view D's lift
# and occlusion.
#
# Reads from <records folder>: img/RA-D-3h.png and img/RA-D-3h-raw.png, each checked by its sha256, and RA-D-3x (img/RA-D-3x.png
# there, or ra-D-3x.png in its own folder as compositeD3x.py writes it), checked by its pixels; from its own folder (or its img/
# folder, as the sheet publishes them) ra-D-place2b.png (step 2b's mask), screens-D.json, the two colour maps and colour-check-ra1.py,
# each checked; the colour check is run on RA-D-3hc with step 2b's map and with step 2's. Writes to its own folder:
# ra-D-3hc.png (the plate, AI-generated, not for display without a label), composite-D3hc.json (the record) and painted-D.json.
# NumPy and Pillow only. Usage: python3 -I compositeD3hc.py <records folder>
import hashlib, importlib.util, json, math, os, sys
import numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2: sys.exit('usage: python3 -I compositeD3hc.py <records folder>')
REC = sys.argv[1]
OWNP = lambda f: os.path.join(D, f) if os.path.exists(os.path.join(D, f)) else os.path.join(D, 'img', f)
fsha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
psha = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()
IN = {'RA-D-3h': ('img/RA-D-3h.png', '3383dba869dd7fbccf593f44347f685895c9f606a9b10bce43bf8960bd50d86d'),
      'RA-D-3h-raw': ('img/RA-D-3h-raw.png', '3b67e224fb4bcb0a70c938f81754a3b29f617a1f643fbde6ba4a5bc4971d9df2')}
X3 = {'name': 'RA-D-3x', 'pixels': '3575e978f51f10f4f0b722dc4f4bf4c90e9026754ade49e5d361410ba423c0ec'}
OWN = {'ra-D-place2b.png': 'b549067b5ec5e4af38305c0a9a1b92fe093647b51d3df65448f85a26b25bb4b0',     # step 2b's mask (version 2.2)
       'screens-D.json': '6c29a22b82104f1eab823ed248a71c9d59e19a0599122a799f1c02d7b14bcba5',        # view D's two screens, on RA-D-3x
       'ra-D-regions2b.png': 'c4d5168dda51ac73d1f04960a213fac9dbd3cd8a4ac4477a4eb3bb5bf91b5786',    # step 2b's colour map (step 2's, the painted screens)
       'ra-D-regions.png': 'b95f8a5a16560029c173551b29b72a04ac3be542cde6258855a26fdc84c7dc7f',      # step 2's colour map
       'colour-check-ra1.py': 'c882f4f8259b44bf8d689021daa2e5b0e8f028539cc076cc457fe144f582dbd2'}   # the Room A colour check
RECORD = {'file': 'records/RA-D-3h.json', 'sha256': '54ada5b2667a25fab648f651308a1649257f1b6a75265ef14f8109d6c7472f0a'}
for k, (f, h) in IN.items():
    if fsha(os.path.join(REC, f)) != h: sys.exit(f'STOP: {f} is not {k}')
for f, h in OWN.items():
    if fsha(OWNP(f)) != h: sys.exit(f'STOP: {f} is not the file version 2.2 published')
rgb = lambda f: np.array(Image.open(f).convert('RGB'))
x3f = os.path.join(REC, 'img', 'RA-D-3x.png') if os.path.exists(os.path.join(REC, 'img', 'RA-D-3x.png')) else os.path.join(D, 'ra-D-3x.png')
d3x = rgb(x3f)
if psha(d3x) != X3['pixels']: sys.exit(f'STOP: {x3f} is not RA-D-3x (rebuild it with compositeD3x.py)')
kept, raw = (rgb(os.path.join(REC, IN[k][0])) for k in ('RA-D-3h', 'RA-D-3h-raw'))
m = np.array(Image.open(OWNP('ra-D-place2b.png')).convert('L')) > 127
H, W = m.shape
blurL = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
keepIsExact = bool((np.array(Image.composite(Image.fromarray(raw), Image.fromarray(d3x), blurL)) == kept).all())
if not keepIsExact: sys.exit("STOP: RA-D-3h is not the keep of RA-D-3h's raw over RA-D-3x in step 2b's mask")
reach = np.array(blurL) > 0

# ---- the outline, traced on the raw (painting pixels, pixel-edge coordinates: a pixel spans i to i + 1), clockwise from the lid's
# top-left: each run along the outer edge of the pieces' ink, read across it where the ink meets the wall, the deck or the shadow
# beside it, at the midpoint between the ink and what lies right beside it (1.5 to 3.5 px out); straight runs are fitted lines
RUNS = [
 ("the lid's top-left corner, its frame's rounded outer ink", "a circular arc of 10.0 px tangent to the lid's left side and top (the wall's rivet and its vertical seam beside the corner defeat the scans)",
  [(598.59, 904.48), (599.08, 902.56), (599.94, 900.78), (601.13, 899.2), (602.62, 897.89), (604.33, 896.9), (606.2, 896.26), (608.16, 896.01), (610.14, 896.14)]),
 ("the lid's top", "its frame's outer ink, y = 793.064 + 0.16894 x (26 readings, rms 0.198 px)",
  [(610.14, 896.14), (697.0, 910.82)]),
 ("the lid's top-right corner", "read along rays every 6\u00b0",
  [(697.0, 910.89), (698.68, 911.03), (700.29, 911.54), (701.9, 911.92), (703.43, 912.55), (705.05, 913.05), (706.41, 914.05), (707.43, 915.42), (708.53, 916.62), (709.24, 918.11), (709.96, 919.52), (710.4, 921.03), (710.87, 922.49), (710.86, 924.05), (711.03, 925.53), (710.8, 927.0)]),
 ("the lid's right side", "x = 872.742 + -0.1749 y (37 readings, rms 0.188 px), down to where it meets the far rim",
  [(710.61, 927.0), (688.61, 1052.78)]),
 ("the far rim's top edge right of the lid, and the rim's far-right corner", "read down columns, then along rays every 8\u00b0 (the painted deck seam at x 707, y 1069 left out), then the right rim's first readings",
  [(691.5, 1054.51), (693.5, 1054.88), (695.5, 1055.54), (697.5, 1055.77), (698.41, 1055.99), (700.32, 1057.19), (701.43, 1059.08), (701.73, 1060.03), (702.18, 1060.77), (702.38, 1061.6), (702.41, 1062.45), (702.44, 1063.24), (702.67, 1064.0), (702.44, 1064.76), (702.1, 1065.46), (699.67, 1071.5), (696.29, 1074.5)]),
 ("the right rim's outer edge", "x = 1636.61 + -0.87732 y (39 readings, rms 0.202 px)",
  [(691.3, 1077.5), (585.51, 1198.08)]),
 ("the hatch's near-right corner", "read along rays every 6\u00b0",
  [(585.8, 1198.08), (585.23, 1198.98), (584.27, 1199.55), (583.61, 1200.34), (582.96, 1201.2), (582.17, 1201.95), (581.28, 1202.61), (580.33, 1203.25), (579.31, 1203.86), (578.18, 1204.2), (577.0, 1204.61), (575.74, 1204.97), (574.39, 1205.27), (572.92, 1205.55)]),
 ("the near rim's bottom edge", "y = 1008.127 + 0.3449 x (16 readings, rms 0.159 px), to the toolbox's right side",
  [(572.92, 1205.73), (515.0, 1185.75)]),
 ("the toolbox's right side under the near rim, and its bottom-right corner", "read along rows, the ink against what lies right beside it",
  [(515.94, 1188.5), (515.78, 1189.5), (515.16, 1190.5), (513.95, 1194.5), (511.5, 1197.0), (509.02, 1198.5), (507.88, 1199.5)]),
 ("the toolbox's bottom-right edge", "read along rows (its edge against the shadow band beside it)",
  [(506.7, 1200.5), (504.2, 1202.5), (501.88, 1204.5), (499.68, 1206.5), (497.46, 1208.5), (495.1, 1210.5), (492.95, 1212.5), (490.36, 1214.5), (488.33, 1216.5), (486.53, 1218.5), (484.19, 1220.5)]),
 ("the toolbox's front-bottom corner", "read up columns",
  [(482.5, 1221.94), (480.5, 1223.23), (478.5, 1223.87), (476.5, 1223.89), (474.5, 1223.16)]),
 ("the toolbox's bottom-left edge", "y = 1060.877 + 0.34098 x (20 readings, rms 0.195 px; a deck seam meeting its ink at x 418-428 left out)",
  [(472.5, 1221.99), (397.05, 1196.26)]),
 ("the toolbox's bottom-left corner", "read along rays every 8\u00b0",
  [(397.05, 1197.05), (395.67, 1196.24), (394.12, 1196.01), (392.66, 1195.4), (391.03, 1194.85), (389.67, 1193.83), (388.79, 1192.38), (388.15, 1190.83), (388.04, 1189.14), (388.07, 1187.54), (388.27, 1186.0)]),
 ("the toolbox's left side", "read along rows (the lid 2 px wider than the body above y 1148)",
  [(388.31, 1182.5), (388.61, 1179.5), (388.85, 1176.5), (388.93, 1173.5), (388.88, 1170.5), (388.89, 1167.5), (388.39, 1164.5), (388.9, 1161.5), (388.82, 1158.5), (388.86, 1155.5), (388.83, 1152.5), (388.95, 1149.5), (386.93, 1146.5), (387.15, 1143.5), (387.24, 1140.5), (387.04, 1137.5), (386.99, 1134.5), (387.21, 1131.5)]),
 ("the toolbox's top-left corner, the top's left edge and its handle's arch and top bar", "read down columns and along rays, to where the handle's top bar meets the hatch's left rim (the box's back edge lies behind the handle)",
  [(390.89, 1127.39), (391.68, 1126.42), (392.5, 1125.94), (395.5, 1124.18), (398.5, 1123.19), (401.5, 1121.14), (404.5, 1119.56), (407.5, 1117.75), (410.5, 1115.92), (413.5, 1114.11), (416.5, 1112.47), (419.5, 1110.73), (422.5, 1108.9), (424.5, 1107.38), (426.5, 1102.93), (428.5, 1100.86), (430.5, 1099.51), (432.5, 1098.44), (434.5, 1097.74), (436.5, 1097.13), (438.5, 1097.05), (440.5, 1097.73), (442.5, 1097.97), (443.5, 1099.69), (449.5, 1099.82), (452.5, 1100.71), (455.5, 1101.26), (458.5, 1102.12), (461.5, 1102.97), (464.5, 1103.88), (467.5, 1104.78), (470.5, 1104.81), (472.0, 1104.46)]),
 ("the hatch's left rim's outer edge", "y = 1431.24 + -0.69234 x (30 readings, rms 0.182 px), from behind the toolbox to the lid's left side",
  [(472.0, 1104.46), (579.24, 1030.21)]),
 ("the lid's left side", "x = 737.759 + -0.15387 y (36 readings, rms 0.291 px)",
  [(579.24, 1030.21), (598.59, 904.48)]),
]
POLY = []
for _, _, pts in RUNS:
    for q in pts:
        if not POLY or math.hypot(q[0] - POLY[-1][0], q[1] - POLY[-1][1]) > 0.05: POLY.append(q)
if math.hypot(POLY[0][0] - POLY[-1][0], POLY[0][1] - POLY[-1][1]) < 0.05: POLY.pop()
def sdist(poly, X, Y):   # signed distance from the points to the polygon's outline: + inside, - outside (even-odd)
    P = np.array(poly, float); A, B = P, np.roll(P, -1, axis=0); px, py = X[..., None], Y[..., None]
    ax, ay, bx, by = A[:, 0], A[:, 1], B[:, 0], B[:, 1]; dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / np.maximum(dx * dx + dy * dy, 1e-12), 0, 1)
    d = np.hypot(px - (ax + t * dx), py - (ay + t * dy)).min(axis=-1)
    cross = ((ay <= py) & (by > py)) | ((by <= py) & (ay > py)); xint = ax + (py - ay) * dx / np.where(dy == 0, 1, dy)
    return np.where((cross & (px < xint)).sum(axis=-1) % 2 == 1, d, -d)
FEATHER = 1.0
xs = [q[0] for q in POLY]; ys = [q[1] for q in POLY]
x0, x1, y0, y1 = max(0, int(min(xs)) - 2), min(W, int(max(xs)) + 3), max(0, int(min(ys)) - 2), min(H, int(max(ys)) + 3)
alpha = np.zeros((H, W))
for ya in range(y0, y1, 64):   # in bands, to keep memory small
    yb = min(y1, ya + 64); X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(ya, yb) + 0.5)
    alpha[ya:yb, x0:x1] = np.clip(1 + sdist(POLY, X, Y) / FEATHER, 0, 1)
out = np.rint(kept * (1 - alpha[..., None]) + raw * alpha[..., None]).astype(np.uint8)

# ---- checks
def grow(a, n):
    b = a.copy()
    for _ in range(n):
        c = b.copy(); c[1:] |= b[:-1]; c[:-1] |= b[1:]; c[:, 1:] |= b[:, :-1]; c[:, :-1] |= b[:, 1:]; b = c
    return b
def flood(seed, within):
    a = np.zeros_like(within); a[seed[1], seed[0]] = True
    while True:
        b = grow(a, 1) & within
        if (b == a).all(): return a
        a = b
changed = (out != kept).any(axis=2); touched = alpha > 0; full = alpha == 1
changedOutside = int((changed & ~touched).sum())
rawWhole = bool((out[full] == raw[full]).all())
changed3x = (out != d3x).any(axis=2); changed3xOutside = int((changed3x & ~reach & ~touched).sum())
T = flood((480, 1150), m); HL = flood((620, 1100), m)
if int((T | HL).sum()) != int(m.sum()): sys.exit("STOP: step 2b's mask is not the toolbox's and the hatch's two areas")
gap = ~m & grow(T, 8) & grow(HL, 8)
# how far past the mask each changed pixel lies (straight-line, pixel centre to the nearest masked pixel's centre), and which part of
# the outline it is nearest to; and how far past the mask each run of the outline reaches
edgeY, edgeX = np.nonzero(m & grow(~m, 1)); EP = np.stack([edgeX + 0.5, edgeY + 0.5], 1)
def pastMask(px, py):
    out_ = np.zeros(len(px))
    for i0 in range(0, len(px), 2000):
        a, b = px[i0:i0 + 2000, None], py[i0:i0 + 2000, None]; out_[i0:i0 + 2000] = np.sqrt((a - EP[None, :, 0]) ** 2 + (b - EP[None, :, 1]) ** 2).min(1)
    return out_
dist = np.zeros((H, W)); oy, ox = np.nonzero(changed & ~m); dist[oy, ox] = pastMask(ox + 0.5, oy + 0.5)
runReach = {}
for name, _, pts in RUNS:
    P = np.array(pts, float); smp = np.vstack([P[0:1]] + [np.linspace(P[i], P[i + 1], max(2, int(np.hypot(*(P[i + 1] - P[i])) / 0.5)))[1:] for i in range(len(P) - 1)]) if len(P) > 1 else P
    ins = m[np.clip(smp[:, 1].astype(int), 0, H - 1), np.clip(smp[:, 0].astype(int), 0, W - 1)]
    d = pastMask(smp[~ins, 0], smp[~ins, 1]) if (~ins).any() else np.zeros(1)
    runReach[name] = round(float(d.max()), 1)
PARTS = {'lid': [0, 1, 2, 3, 16], 'hatch': [4, 5, 6, 7, 15], 'toolbox': [8, 9, 10, 11, 12, 13, 14]}
cy, cx = np.nonzero(changed); runOf = np.zeros(len(cx), int); best = np.full(len(cx), np.inf)
for i, (_, _, pts) in enumerate(RUNS):
    P = np.array(pts, float)
    if len(P) == 1: P = np.vstack([P, P])
    A, B = P[:-1], P[1:]; px, py = (cx + 0.5)[:, None], (cy + 0.5)[:, None]; dx, dy = B[:, 0] - A[:, 0], B[:, 1] - A[:, 1]
    t = np.clip(((px - A[:, 0]) * dx + (py - A[:, 1]) * dy) / np.maximum(dx * dx + dy * dy, 1e-12), 0, 1)
    dd = np.hypot(px - (A[:, 0] + t * dx), py - (A[:, 1] + t * dy)).min(axis=1); w = dd < best; best[w] = dd[w]; runOf[w] = i
partOf = np.array([next(p for p, ids in PARTS.items() if r in ids) for r in runOf])
gapC = gap[cy, cx]; partOf = np.where(gapC, 'gap', partOf)
parts = {}
for p in ('lid', 'hatch', 'gap', 'toolbox'):
    w = partOf == p; dd = dist[cy[w], cx[w]]
    parts[p] = {'changedPx': int(w.sum()), 'outsideTheMask': int((~m[cy[w], cx[w]]).sum()), 'insideTheMask': int(m[cy[w], cx[w]].sum()),
                'furthestPastTheMaskPx': round(float(dd.max()), 1) if w.any() else 0,
                'box': [int(cx[w].min()), int(cy[w].min()), int(cx[w].max()) + 1, int(cy[w].max()) + 1] if w.any() else None}
gapPx = int(gap.sum()); gapInside = int((gap & full).sum()); gapRaw = bool((out[gap & full] == raw[gap & full]).all())
# the screens (view D's two, fitted on RA-D-3x): untouched
S = json.load(open(OWNP('screens-D.json'))); scr = {}
for s in S['screens']:
    q = s['corners']; qx = [c[0] for c in q]; qy = [c[1] for c in q]; a0, a1, b0, b1 = int(min(qx)) - 1, int(max(qx)) + 2, int(min(qy)) - 1, int(max(qy)) + 2
    X, Y = np.meshgrid(np.arange(a0, a1) + 0.5, np.arange(b0, b1) + 0.5); inq = np.zeros((H, W), bool); inq[b0:b1, a0:a1] = sdist(q, X, Y) > 0
    scr[s['name']] = {'px': int(inq.sum()), 'equalToRA-D-3x': bool((out[inq] == d3x[inq]).all())}
ok = keepIsExact and changedOutside == 0 and rawWhole and changed3xOutside == 0 and gapRaw and all(v['equalToRA-D-3x'] for v in scr.values())
if not ok: sys.exit(f'STOP: changed outside the outline {changedOutside}, raw whole {rawWhole}, changed against RA-D-3x outside the keep and the outline {changed3xOutside}, gap {gapRaw}, screens {scr}')

# ---- the toolbox's painted place on the deck. Its base corners in the picture, from the outline's runs: the left side's foot, the
# front-bottom corner and the right side's foot; on the deck through view D's guide camera (guideD.mjs, the camera report's place and
# heading: C, yaw; focal 512 / tan 40°, centre x 512, horizon y 714), each painted point first moved by the painted deck's local
# offset from the guide's at the box (the crossing of the painted seams x = 0 and z = 1 under it: painted minus guide (-11.3, +7.7) px,
# kit-D2b.json), as the deck is painted there. The plan's box: x -0.12 to 0.08, z 0.8 to 1.16, 0.18 high (stageA.mjs).
CAM = {'C': [-1.68, 1.6, -0.39659600000000017], 'yaw': 0.9352521329736817, 'f': 512 / math.tan(math.radians(40)), 'cx': 512, 'hy': 714}
OFF = (-11.3, 7.7)
fw = (math.sin(CAM['yaw']), math.cos(CAM['yaw'])); rt = (math.cos(CAM['yaw']), -math.sin(CAM['yaw']))
def toDeck(p):
    u, v = p[0] - OFF[0], p[1] - OFF[1]; vz = CAM['C'][1] * CAM['f'] / (v - CAM['hy']); vx = (u - CAM['cx']) * vz / CAM['f']
    return [round(CAM['C'][0] + vx * rt[0] + vz * fw[0], 4), round(CAM['C'][2] + vx * rt[1] + vz * fw[1], 4)]
def toPic(x, y, z):
    d = (x - CAM['C'][0], y - CAM['C'][1], z - CAM['C'][2]); vx = d[0] * rt[0] + d[2] * rt[1]; vz = d[0] * fw[0] + d[2] * fw[1]
    return [round(CAM['cx'] + CAM['f'] * vx / vz, 2), round(CAM['hy'] - CAM['f'] * d[1] / vz, 2)]
def line(pts, vertical):
    P = np.array(pts, float); u, w = (P[:, 1], P[:, 0]) if vertical else (P[:, 0], P[:, 1]); b, a = np.polyfit(u, w, 1); return float(a), float(b)
R = {name: pts for name, _, pts in RUNS}
aL, bL = line(R["the toolbox's left side"][:10], True)                       # x = a + b y, the body below the lid's step
aB, bB = line(R["the toolbox's bottom-left edge"], False)                    # y = a + b x
aR, bR = line(R["the toolbox's bottom-right edge"], True)                    # x = a + b y
def meetXY(ax_, bx_, ay_, by_): y = (ay_ + by_ * ax_) / (1 - by_ * bx_); return [round(ax_ + bx_ * y, 2), round(y, 2)]
left = meetXY(aL, bL, aB, bB); front = meetXY(aR, bR, aB, bB)
rs = [q for q in R["the toolbox's right side under the near rim, and its bottom-right corner"] if q[0] > 513]; xr = float(np.mean([q[0] for q in rs]))
right = [round(xr, 2), round((xr - aR) / bR, 2)]
plan = {'left (north-west)': (-0.12, 1.16), 'front (south-west)': (-0.12, 0.8), 'right (south-east)': (0.08, 0.8)}
painted = {'left (north-west)': left, 'front (south-west)': front, 'right (south-east)': right}
deck = {k: toDeck(v) for k, v in painted.items()}
Pp = np.array([plan[k] for k in plan]); Pd = np.array([deck[k] for k in plan]); cp, cd = Pp.mean(0), Pd.mean(0)
Hm = (Pp - cp).T @ (Pd - cd); U, _, Vt = np.linalg.svd(Hm); Rm = (U @ Vt).T
if np.linalg.det(Rm) < 0: Vt[-1] *= -1; Rm = (U @ Vt).T
turn = math.degrees(math.atan2(Rm[1, 0], Rm[0, 0])); planC = np.array([-0.02, 0.98]); paintedC = Rm @ (planC - cp) + cd
resid = {k: round(float(np.hypot(*((Rm @ (np.array(plan[k]) - cp) + cd) - np.array(deck[k])))), 3) for k in plan}
edges = {'west face (left to front)': [round(float(np.hypot(*(Pd[0] - Pd[1]))), 3), 0.36], 'south face (front to right)': [round(float(np.hypot(*(Pd[1] - Pd[2]))), 3), 0.2]}
tbox = [int(cx[partOf == 'toolbox'].min()), int(cy[partOf == 'toolbox'].min())]
outlineBox = lambda names: [round(min(q[0] for n in names for q in R[n]), 1), round(min(q[1] for n in names for q in R[n]), 1), round(max(q[0] for n in names for q in R[n]), 1), round(max(q[1] for n in names for q in R[n]), 1)]
boxNames = [n for n, _, _ in RUNS if n.startswith("the toolbox's")]
planPic = [toPic(x, y, z) for x in (-0.12, 0.08) for z in (0.8, 1.16) for y in (0, 0.18)]

# ---- outputs
Image.fromarray(out).save(os.path.join(D, 'ra-D-3hc.png'), optimize=True)
spec = importlib.util.spec_from_file_location('cc', OWNP('colour-check-ra1.py')); CCm = importlib.util.module_from_spec(spec); spec.loader.exec_module(CCm); colours = {}
for key, mf in (('map2b', 'ra-D-regions2b.png'), ('map2', 'ra-D-regions.png')):
    r = CCm.check(os.path.join(D, 'ra-D-3hc.png'), OWNP(mf))
    colours[key] = {'map': mf, 'sha256': OWN[mf], 'pass': r['pass'], 'failing': [k for k, v in r['result'].items() if not v], 'openingsP95L': r['areas']['window']['p95L'], 'wallsAndDeckInBase': r['areas']['walls and deck']['inBase']}
if not colours['map2b']['pass']: sys.exit('STOP: RA-D-3hc fails the colour check with step 2b\'s map: ' + json.dumps(colours['map2b']))
J = lambda o, f: (json.dump(o, open(os.path.join(D, f), 'w'), indent=1), open(os.path.join(D, f), 'a').write('\n'))
plate = {'file': 'ra-D-3hc.png', 'sha256': fsha(os.path.join(D, 'ra-D-3hc.png')), 'pixelsSha256': psha(out), 'size': [W, H], 'aiGenerated': True, 'codeComposite': True}
TOOLBOX = {'station': 'E toolbox', 'decision': "the Lead, 27 November 2026, 22:54: keep the toolbox where RA-D-3h's raw painted it, about 27 px left of its area (a loose prop, about 10 px on the phone)",
           'picture': {'outlineBox': outlineBox(boxNames), 'planBox': [min(p[0] for p in planPic), min(p[1] for p in planPic), max(p[0] for p in planPic), max(p[1] for p in planPic)],
                       'area': [415, 1078, 542, 1217], 'baseCorners': painted,
                       'how': "the base corners where the outline's runs meet: the left side's foot (the body's left side and the bottom-left edge), the front-bottom corner (the bottom-left and bottom-right edges) and the right side's foot (the right side under the near rim and the bottom-right edge)"},
           'deck': {'baseCorners': deck, 'planCorners': {k: list(v) for k, v in plan.items()}, 'centre': [round(float(v), 3) for v in paintedC], 'planCentre': [-0.02, 0.98],
                    'shift': [round(float(paintedC[0] - planC[0]), 3), round(float(paintedC[1] - planC[1]), 3)], 'turnDeg': round(turn, 1),
                    'fitResidualM': resid, 'faceLengthsM': {k: {'painted': v[0], 'plan': v[1]} for k, v in edges.items()},
                    'how': "each painted base corner moved by the painted deck's local offset from the guide's at the box (painted minus guide (-11.3, +7.7) px, where the painted seams x = 0 and z = 1 cross under it: kit-D2b.json) and taken down to the deck through view D's guide camera; the plan's box then placed on them by the least-squares turn and shift (its size kept)",
                    'units': 'room metres: x east, z north; the turn is about the vertical, positive from east toward north'},
           'use': "view D's lift and occlusion use this place for the toolbox, not the plan's: the lift's area for the toolbox is its outline here (composite-D3hc.json), and its solid is the plan's box turned and shifted as above"}
J({'view': 'D', 'what': "view D's pieces painted away from the plan's place, for view D's lift and occlusion", 'date': '2026-11-27', 'picture': {'name': 'RA-D-3hc', **{k: v for k, v in plate.items() if k != 'file'}},
   'toolbox': TOOLBOX, 'camera': {'C': CAM['C'], 'yaw': CAM['yaw'], 'focalPx': round(CAM['f'], 3), 'cx': CAM['cx'], 'horizonY': CAM['hy'], 'from': 'guideD.mjs (the camera report camera-report-D.json, version 2)'}}, 'painted-D.json')
src = lambda k, what: {'name': k, 'file': IN[k][0], 'sha256': IN[k][1], 'aiGenerated': True, 'what': what}
J({'sheet': 'RA-D', 'version': '2.3', 'view': 'D', 'step': '2 (after step 2b)', 'date': '2026-11-27', 'name': 'RA-D-3hc',
   'what': "view D's step-2 plate: RA-D-3h (the hatch-only step 2b on RA-D-3x) with the hatch, its lid and the toolbox completed in code from RA-D-3h's raw",
   'drawnBy': 'code', 'generated': False,
   'codeComposite': {'of': ['RA-D-3x', "RA-D-3h's raw edit"], 'aiGenerated': True,
                     'how': "RA-D-3h's raw over RA-D-3x inside step 2b's mask, feathered by a 2 px Gaussian (the image tool's keep, so equal to RA-D-3h); inside the traced outline, the raw's pixels, with 1 px of feather outside it; nothing else from the raw"},
   'decision': "the Lead, 27 November 2026, 22:54: the hatch-only edit worked (the hatch right-sized and in its place, the lid upright); keep the toolbox where the raw painted it; make RA-D-3hc, completing from the raw the hatch's small overruns (the lid's right edge and top, the rim's right side, the near-left rim through the 8 px gap) and the toolbox whole at the raw's place, closing on its own ink; record the toolbox's painted place for the lift and the occlusion",
   'sources': [{'name': 'RA-D-3x', 'pixelsSha256': X3['pixels'], 'aiGenerated': True, 'codeComposite': True, 'what': "step 2b's start (rebuilt with compositeD3x.py)"},
               src('RA-D-3h', "step 2b's kept picture (its keep, rebuilt here and equal pixel for pixel)"), src('RA-D-3h-raw', "RA-D-3h's raw edit (inside the outline)")],
   'records': {'RA-D-3h': RECORD},
   'mask': {'file': 'ra-D-place2b.png', 'sha256': OWN['ra-D-place2b.png'], 'what': "step 2b's mask (version 2.2): the toolbox's area and the hatch and lid's area, 8 px apart", 'toolboxPx': int(T.sum()), 'hatchAndLidPx': int(HL.sum()), 'gapPx': gapPx},
   'feather': {'px': FEATHER, 'how': "alpha = 1 inside the outline, falling linearly to 0 at 1 px outside it, by each pixel centre's distance from the outline"},
   'tracing': "on the raw: each edge's outer ink read across it every 2 to 3 px (bilinear luminance, 0.25 px steps, walking in from just outside), at the midpoint between the ink and what lies right beside it (1.5 to 3.5 px out: the wall, the deck, or the box's shadow), straight runs fitted by least squares (readings over 1.2 px off dropped once), corners read along rays every 6 to 8°; the lid's top-left corner, where a rivet and a seam of the wall touch it, is a 10 px arc tangent to its sides; readings on painted deck seams beside the ink left out",
   'outline': {'runs': [{'name': n, 'ink': ink, 'reachesPastTheMaskPx': runReach[n], 'points': [list(q) for q in pts]} for n, ink, pts in RUNS], 'vertices': len(POLY), 'closesOnItsOwnInk': True, 'closingPaths': 0,
               'reach': 'how far the run lies outside step 2b\'s mask at most (px, straight-line to the nearest masked pixel); 0 where it lies inside'},
   'parts': parts,
   'checks': {'keepRebuiltExactly': keepIsExact, 'changedPxAgainstRA-D-3h': int(changed.sum()), 'unchangedPxAgainstRA-D-3h': int(W * H - changed.sum()), 'picturePx': W * H,
              'changedOutsideTheOutlineAndItsFeather': changedOutside, 'rawTakenWholeInsideTheOutline': rawWhole,
              'changedAgainstRA-D-3xOutsideTheKeepAndTheOutline': changed3xOutside, 'gapPxInsideTheOutline': gapInside, 'gapTakenFromTheRaw': gapRaw, 'screens': scr},
   'pass': ok,
   'toolbox': {'file': 'painted-D.json', 'sha256': fsha(os.path.join(D, 'painted-D.json')), 'deckShiftM': TOOLBOX['deck']['shift'], 'turnDeg': TOOLBOX['deck']['turnDeg']},
   'colourCheck': {**colours, 'how': "colour-check-ra1.py's ten gates on RA-D-3hc: with step 2b's map (the screens where they are painted), which step 3's check uses from version 2.3, and with step 2's map (the screens where the plan put them), for comparison"},
   'leftOut': "the raw paints the box's shadow on the deck round its foot: a band about 8 px wide beside its bottom-right edge (inside its area, so RA-D-3h already has it) and a broad one to its front-left, about 20 px, outside its area; the outline closes on the box's ink, so RA-D-3h's deck (RA-D-3x's, lit) stays there",
   'outputs': {'ra-D-3hc.png': {'what': 'the plate: RA-D-3hc, a code composite of AI-generated pictures', **{k: v for k, v in plate.items() if k != 'file'}}},
   'note': "pixelsSha256 is of the decoded pixels (8-bit RGB, row by row), which another Pillow writes the same; the PNG file's own sha256 may differ with another Pillow or zlib",
   'units': 'painting pixels (1024 x 1536); outlines in pixel-edge coordinates (a pixel spans i to i + 1)'}, 'composite-D3hc.json')
print('RA-D-3hc:', plate['pixelsSha256'][:16], '| changed against RA-D-3h', int(changed.sum()), '| unchanged', int(W * H - changed.sum()), 'of', W * H, '| outside the outline', changedOutside, '| raw whole inside', rawWhole, '| vs RA-D-3x outside keep+outline', changed3xOutside)
print('colours', json.dumps(colours)); print('parts', json.dumps(parts)); print('runs past the mask', runReach); print('gap', gapPx, 'px, inside the outline', gapInside, '| screens', scr)
print('toolbox: corners', painted, '| deck', deck, '| centre', TOOLBOX['deck']['centre'], 'shift', TOOLBOX['deck']['shift'], 'm, turn', TOOLBOX['deck']['turnDeg'], '° | residual', resid, '| faces', edges)
