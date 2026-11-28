# Sheet RA-A version 7: view A's cabinet, its right frame drawn by code on RA-A-4 (the Lead, 19 November 2026, 13:59). Step 4's
# masked edit failed twice: RA-A-5 and RA-A-6 extended the breaker rows into the strip and drew no frame, and their outer edges read
# x 546 and 544 against the 15 px rule's 537. So RA-A-4 stays view A's picture, and the frame is drawn into the cabinet in code, as
# view C's dispenser edge was in Room B. No picture is generated.
#
# The frame is a vertical steel post on the cabinet's right side, matching the painted left frame (its colours sampled from it): the
# ink outline outside, the left frame's steel blue, a light top edge, a darker inner edge, and three rivets. Its outer edge is at
# x 537, 15 px clear of the grille at 553. Its inner edge is at x 527, over the cables' run. It runs y 639 to 880, closing the top
# bar's right end and the bottom frame's corner. Around the second orange light the post is cut away, so the light stays whole as
# painted. The soft fade the step-2 edit left outside the new edge (x 538 to 546, on the cabinet's rows) is cleaned to the wall's own
# paint: RA-A-1's pixels, the start picture of the lift, which RA-A-4 already equals from x 542.
#
# Reads room-a-ra-a-s4.json (step 4's kit, version 6) from its own folder, and from <records folder> the image session's
# img/RA-A-4.png, img/RA-A-1.png and img/RA-A-3-C-electrical-cabinet.png (the cabinet's step-2 layer), each checked by its sha256.
# Writes to <out folder> (default: the current folder):
# - ra-A-4-frame.png: the plate, RA-A-4 (AI-generated) with the code-drawn frame;
# - ra-A-cabinet-frame.png: the cabinet's step-2 layer with the frame drawn into it;
# - frame-A.json: every number, the colours, the checks, and each output's file and pixel sha256.
# Generates nothing. NumPy and Pillow only.
# Usage: python3 -I frameA.py <records folder> [<out folder>]
import hashlib, json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2: sys.exit('usage: python3 -I frameA.py <records folder> [<out folder>]')
REC, OUT = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else '.')
sha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
KIT_SHA = '6fc6fe86bb58b2d84f4c32da8af63b5d390b90b4beec9d7d4fa7f38fda7e819a'   # room-a-ra-a-s4.json, sheet version 6 (1795096306-1df9)
KF = os.path.join(HERE, 'room-a-ra-a-s4.json')
if sha(KF) != KIT_SHA: sys.exit("STOP: room-a-ra-a-s4.json is not version 6's step-4 kit")
K4 = json.load(open(KF)); MEAS, RULE = K4['mask']['measured'], K4['frameRule']
IN = {'RA-A-4': ('img/RA-A-4.png', K4['startPicture']['sha256']), 'RA-A-1': ('img/RA-A-1.png', K4['stepOnePicture']['sha256']),
      "the cabinet's step-2 layer": ('img/RA-A-3-C-electrical-cabinet.png', '07114df95037978e45554d2c840619f75f439c9075d37dc4f4f715f971fb0e6b')}   # RA-A-3-lift.json
for k, (f, h) in IN.items():
    if sha(os.path.join(REC, f)) != h: sys.exit(f'STOP: {f} is not {k}')
a4 = np.array(Image.open(os.path.join(REC, IN['RA-A-4'][0])).convert('RGB')); a1 = np.array(Image.open(os.path.join(REC, IN['RA-A-1'][0])).convert('RGB'))
layer = np.array(Image.open(os.path.join(REC, IN["the cabinet's step-2 layer"][0])).convert('RGBA'))
H, W = a4.shape[:2]
# step 4's two tries, as the image session's frame4 records give them (its records page, version 1795096800-0c3e)
TRIES = [{'name': 'RA-A-5', 'sha256': 'abee8d08a0ceead3e72d1d8aebcd3f819ee1e12b8c7290b6a5486e78c0b17cfa', 'frameOuterEdgeX': 546, 'clearPxToTheGrille': 6, 'pass': False},
         {'name': 'RA-A-6', 'sha256': '489db1882757121e3fde5c3931ee2f3629c3109c57dc7c31f17ec284a0ff047d', 'frameOuterEdgeX': 544, 'clearPxToTheGrille': 8, 'pass': False}]

# ---- the numbers (painting pixels, 1024 x 1536; ranges inclusive) ----
X0, X1 = 527, 537            # the post: inner edge, outer edge (the Lead: about 527; at most 537)
Y0, Y1 = 639, 880            # its top and bottom rows (the Lead: about 640 to 880)
GRILLE, LIMIT = RULE['grilleEdgeX'], RULE['frameOuterEdgeAtMostX']      # 553, 537
# the left frame, measured on RA-A-4 (the median of rows 700 to 850): ink x 355-356, steel x 357-370, a lighter column x 371, a dark
# groove x 372, then the lip; mirrored here: groove, lighter column, steel, ink
INK, STEEL, LIGHTER, GROOVE = (6, 18, 41), (31, 68, 109), (39, 82, 128), (18, 39, 69)
TOPLIGHT = (150, 157, 173)   # the left frame's highlight ridge (x 374), for the light top edge
RIVET = {'ring': (30, 27, 37), 'head': (190, 174, 142), 'shade': (118, 102, 84), 'shine': (246, 238, 214), 'centre': (66, 52, 46)}   # from the left frame's rivets
RIVETS = [(531.5, 683.5), (531.5, 765.5), (531.5, 871.5)]   # top, middle and bottom (the bottom one level with the left frame's, y 871.7)
RIVET_R = 3.2
# the second orange light, kept whole: its warm pixels and orange rim (R minus B above 25) lie in x 509-534, y 655-667; the post is
# cut away 1 px around it, at x 527-534 and y 654-668, so it keeps only x 535-537 there
NOTCH = (527, 534, 654, 668)
LEDGE = (859, 865)           # the bottom frame's ledge (its dark line and highlight) meets the post's inner edge here
FOOT = 866                   # below the ledge, the post's inner side faces the wall: there it takes the ink outline
WALL = (538, 546)            # cleaned to the wall's own paint (RA-A-1), on the cabinet's rows only (the floor hatch lies below, from y 1119)
CAB_ROWS = (630, 890)
R_OUT = 3.0                  # the outer corners' radius (top right, bottom right); the inner corners at the top and foot: 2

# ---- draw the post at 8 times, then average down (anti-aliased edges, the colours exact inside) ----
SS = 8; bx0, bx1, by0, by1 = X0 - 2, X1 + 3, Y0 - 2, Y1 + 3       # the drawing box, with a margin for the edge's blend
gx = (np.arange((bx1 - bx0) * SS) + 0.5) / SS + bx0; gy = (np.arange((by1 - by0) * SS) + 0.5) / SS + by0
X, Y = np.meshgrid(gx, gy)
def rrect(x0, x1, y0, y1, r_tl, r_tr, r_br, r_bl):   # a rectangle in pixel edges [x0, x1) x [y0, y1) with rounded corners
    m = (X >= x0) & (X < x1) & (Y >= y0) & (Y < y1)
    for (cx, cy, r, sx, sy) in ((x0 + r_tl, y0 + r_tl, r_tl, -1, -1), (x1 - r_tr, y0 + r_tr, r_tr, 1, -1), (x1 - r_br, y1 - r_br, r_br, 1, 1), (x0 + r_bl, y1 - r_bl, r_bl, -1, 1)):
        if r <= 0: continue
        corner = ((X - cx) * sx > 0) & ((Y - cy) * sy > 0); m &= ~(corner & ((X - cx) ** 2 + (Y - cy) ** 2 > r * r))
    return m
outer = rrect(X0, X1 + 1, Y0, Y1 + 1, 2, R_OUT, R_OUT, 2)
notch = (X >= NOTCH[0]) & (X < NOTCH[1] + 1) & (Y >= NOTCH[2]) & (Y < NOTCH[3] + 1)
shape = outer & ~notch
def inset(m, d):   # the part of m at least d px from its outside (a square distance, on the supersampled grid)
    k = int(round(d * SS)); out = m.copy()
    for s in range(1, k + 1):
        out[s:, :] &= m[:-s, :]; out[:-s, :] &= m[s:, :]; out[:, s:] &= m[:, :-s]; out[:, :-s] &= m[:, s:]
    return out
col = np.zeros(X.shape + (3,)); col[...] = STEEL
# the ink: the outer side (x 536-537), the top (rows 639-640) and the bottom (rows 879-880), following the rounded corners; and the
# inner side of the foot, below the ledge, where the post stands against the wall
ink_band = shape & ~inset(outer, 2.0)
ink = ink_band & ((X >= X1 - 1) | (Y < Y0 + 2) | (Y >= Y1 - 1) | ((Y >= FOOT) & (X < X0 + 2)))
# the darker inner edge: the groove at x 527 and the cut's edges (1 px), with the lighter column beside it (x 528)
inner_side = shape & ~ink & ((X < X0 + 1) | ((X >= NOTCH[1] + 1) & (X < NOTCH[1] + 2) & (Y >= NOTCH[2]) & (Y < NOTCH[3] + 1))
                             | ((Y >= NOTCH[2] - 1) & (Y < NOTCH[2]) & (X < NOTCH[1] + 1)) | ((Y >= NOTCH[3] + 1) & (Y < NOTCH[3] + 2) & (X < NOTCH[1] + 1)))
lighter = shape & ~ink & ~inner_side & (X >= X0 + 1) & (X < X0 + 2) & ~((Y >= NOTCH[2] - 2) & (Y < NOTCH[3] + 3))
toplight = shape & ~ink & ~inner_side & (Y >= Y0 + 2) & (Y < Y0 + 3)
col[lighter] = LIGHTER; col[inner_side] = GROOVE; col[toplight] = TOPLIGHT; col[ink] = INK
# the rivets: a dark ring, a warm steel head shaded to the lower right, a shine to the upper left and a dark centre
for (cx, cy) in RIVETS:
    dx, dy = X - cx, Y - cy; r2 = dx * dx + dy * dy
    ring = shape & (r2 <= RIVET_R ** 2); head = r2 <= (RIVET_R - 0.8) ** 2
    t = np.clip((dx + dy) / (2 * (RIVET_R - 0.8)) + 0.5, 0, 1)[..., None]   # 0 at the upper left, 1 at the lower right
    col[ring] = RIVET['ring']
    hc = np.array(RIVET['head']) * (1 - t) + np.array(RIVET['shade']) * t; col[head] = hc[head]
    col[((dx + 0.8) ** 2 + (dy + 0.8) ** 2 <= 0.9 ** 2) & head] = RIVET['shine']
    col[((dx - 0.2) ** 2 + (dy - 0.2) ** 2 <= 0.6 ** 2) & head] = RIVET['centre']
# the grain of the left frame's own steel (its brightness at x 360-367, mirrored, less its median), so the post is painted like it,
# not flat; below row 830 the rows are mirrored back up (row 831 takes 829, row 880 takes 780), since the left frame's stencilled
# letters lie at rows 840 to 865 and must not be copied
GRAIN_CLIP = 14
lf = a4[:, 360:368].astype(float).mean(axis=2); grain = np.clip(lf - np.median(lf[Y0:831]), -GRAIN_CLIP, GRAIN_CLIP)
src_row = lambda y: np.where(y > 830, 1660 - y, y)
steel_px = shape & ~ink & ~inner_side & ~lighter & ~toplight
gcol = 7 - np.clip(X.astype(int) - (X0 + 2), 0, 7)   # mirrored: the post's outer side takes the left frame's outer side
for c in range(3): col[..., c] += np.where(steel_px, grain[np.clip(src_row(Y.astype(int)), 0, H - 1), gcol], 0)
def down(a): h, w = a.shape[0] // SS, a.shape[1] // SS; return a.reshape(h, SS, w, SS, *a.shape[2:]).mean(axis=(1, 3))
alpha = down(shape.astype(float)); rgb = down(col * shape[..., None]) / np.maximum(alpha, 1e-9)[..., None]

# ---- the plate: RA-A-4, the wall cleaned to RA-A-1 outside the post, then the post over it ----
plate = a4.astype(float).copy()
ws = (slice(CAB_ROWS[0], CAB_ROWS[1] + 1), slice(WALL[0], WALL[1] + 1))
wall_rows = CAB_ROWS[0] + np.where((np.abs(a4[ws].astype(int) - a1[ws]).max(axis=2) > 0).any(axis=1))[0]
plate[ws] = a1[ws]
sl = (slice(by0, by1), slice(bx0, bx1)); A = alpha[..., None]
plate[sl] = rgb * A + plate[sl] * (1 - A)
plate = np.clip(np.rint(plate), 0, 255).astype(np.uint8)
# the cabinet's layer: the frame drawn into it (the wall below it is RA-A-1, the lift's start); outside the new edge it was already
# empty, since the step-2 lift was clipped to its mask (x 537 at most)
lay = layer.astype(float).copy(); lay[ws][..., 3] = 0
la = lay[sl][..., 3:4] / 255; na = A + la * (1 - A)
lay[sl][..., :3] = np.where(na > 0, (rgb * A + lay[sl][..., :3] * la * (1 - A)) / np.maximum(na, 1e-9), lay[sl][..., :3]); lay[sl][..., 3:4] = na * 255
lay = np.clip(np.rint(lay), 0, 255).astype(np.uint8)

# ---- checks ----
d = np.abs(plate.astype(int) - a4.astype(int)).max(axis=2); ys, xs = np.where(d > 0)
light = np.zeros((H, W), bool); sub = a4[650:672, 505:540].astype(int); light[650:672, 505:540] = (sub[..., 0] - sub[..., 2]) > 25
rows = range(RULE['rows'][0], RULE['rows'][1] + 1)
def outer_edge(img):   # sheet v6's frame rule (ra2_tools.py frame4): the rightmost column of the mask where half the rows depart
    g = img.astype(float).mean(axis=2); dep = np.zeros(W, int)
    for y in rows:
        ref = np.median(g[max(0, y - 2):y + 3, 547:553]); dep += (np.abs(g[y] - ref) > RULE['departs'])
    m = K4['mask']['x']; cols = [x for x in range(m[0], m[1] + 1) if dep[x] >= RULE['rowsShare'] * len(rows)]
    return max(cols) if cols else None
checks = {
    'changedOnlyInTheStrip': bool(xs.min() >= X0 and xs.max() <= WALL[1] and ys.min() >= min(Y0, wall_rows.min()) and ys.max() <= max(Y1, wall_rows.max())),
    'changedBox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())], 'changedPx': int(len(xs)),
    'lightWhole': bool((d[light] == 0).all()), 'lightPx': int(light.sum()),
    'outerEdgeByTheFrameRule': outer_edge(plate), 'outerEdgeBefore': outer_edge(a4),
    'clearOfTheGrillePx': GRILLE - 1 - outer_edge(plate),
    'wallEqualsRA-A-1': bool((plate[ws] == a1[ws]).all()),
    'wallUnchangedOffTheCabinetRows': bool((plate[:CAB_ROWS[0], WALL[0]:WALL[1] + 1] == a4[:CAB_ROWS[0], WALL[0]:WALL[1] + 1]).all() and (plate[CAB_ROWS[1] + 1:, WALL[0]:WALL[1] + 1] == a4[CAB_ROWS[1] + 1:, WALL[0]:WALL[1] + 1]).all()),
    'wallRowsCleaned': [int(wall_rows.min()), int(wall_rows.max())] if len(wall_rows) else None,
    'rightOfTheWallUnchanged': bool((plate[:, WALL[1] + 1:] == a4[:, WALL[1] + 1:]).all()),
    'leftOfThePostUnchanged': bool((plate[:, :X0] == a4[:, :X0]).all()),
}
la_ = lay[..., 3:4].astype(float) / 255; reb = np.clip(np.rint(lay[..., :3] * la_ + a1 * (1 - la_)), 0, 255).astype(np.uint8)
full = np.zeros((H, W), bool); full[sl] = alpha >= 1; full[ws] = True   # the post's solid pixels and the cleaned wall
rd = np.abs(reb.astype(int) - plate).max(axis=2)
checks['layerOverRA-A-1EqualsThePlate'] = {'onThePostAndTheCleanedWall': int(rd[full].max()), 'inTheWholeStripMax': int(rd[Y0:Y1 + 1, X0:WALL[1] + 1].max()),
                                           'inTheWholeStripMean': round(float(rd[Y0:Y1 + 1, X0:WALL[1] + 1].mean()), 4)}
ok = checks['changedOnlyInTheStrip'] and checks['lightWhole'] and checks['outerEdgeByTheFrameRule'] is not None and checks['outerEdgeByTheFrameRule'] <= LIMIT \
     and checks['clearOfTheGrillePx'] >= RULE['minClearPx'] and checks['wallEqualsRA-A-1'] and checks['rightOfTheWallUnchanged'] and checks['leftOfThePostUnchanged'] \
     and checks['wallUnchangedOffTheCabinetRows'] and checks['layerOverRA-A-1EqualsThePlate']['onThePostAndTheCleanedWall'] <= 1
os.makedirs(OUT, exist_ok=True)
Image.fromarray(plate).save(os.path.join(OUT, 'ra-A-4-frame.png'), optimize=True); Image.fromarray(lay).save(os.path.join(OUT, 'ra-A-cabinet-frame.png'), optimize=True)
pix = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()
rec = {'sheet': 'RA-A', 'version': 7, 'view': 'A', 'step': 4, 'date': '2026-11-19',
       'what': "the cabinet's right frame, drawn by code into the cabinet on RA-A-4: a steel post with three rivets, cut away around the second orange light; the soft fade outside it cleaned to RA-A-1's wall",
       'drawnBy': 'code', 'generated': False,
       'decision': "the Lead, 19 November 2026, 13:59: step 4 failed twice (RA-A-5 and RA-A-6 extended the breaker rows into the strip and drew no frame); RA-A-4 stays view A's picture and the frame is drawn in code, as view C's dispenser edge was in Room B",
       'tries': TRIES, 'kit': {'file': 'room-a-ra-a-s4.json', 'sha256': KIT_SHA, 'version': 6},
       'start': {'name': 'RA-A-4', 'file': IN['RA-A-4'][0], 'sha256': IN['RA-A-4'][1], 'aiGenerated': True},
       'wallFrom': {'name': 'RA-A-1', 'file': IN['RA-A-1'][0], 'sha256': IN['RA-A-1'][1], 'aiGenerated': True},
       'layerFrom': {'name': "the cabinet's step-2 layer", 'file': IN["the cabinet's step-2 layer"][0], 'sha256': IN["the cabinet's step-2 layer"][1]},
       'post': {'x': [X0, X1], 'y': [Y0, Y1], 'outerCornersRadius': R_OUT, 'innerCornersRadius': 2,
                'ink': {'rgb': list(INK), 'where': 'x 536-537; rows 639-640 and 879-880; and the inner side of the foot below the ledge (x 527-528, from row 866)'},
                'steel': {'rgb': list(STEEL), 'grain': f"the left frame's own steel: its brightness at x 360-367, mirrored, less its median, within {GRAIN_CLIP}; rows below 830 mirrored back up, away from its stencilled letters (rows 840-865)"},
                'lighterColumn': {'rgb': list(LIGHTER), 'x': X0 + 1}, 'innerEdge': {'rgb': list(GROOVE), 'x': X0, 'alsoAround': 'the cut for the light'},
                'lightTopEdge': {'rgb': list(TOPLIGHT), 'row': Y0 + 2},
                'rivets': {'centres': [list(c) for c in RIVETS], 'radius': RIVET_R, 'colours': {k: list(v) for k, v in RIVET.items()}},
                'cutForTheLight': {'x': [NOTCH[0], NOTCH[1]], 'y': [NOTCH[2], NOTCH[3]], 'why': f"the second orange light and its rim (x 509-534, y 655-667; its warm pixels {MEAS['secondLight']['box']}) stay whole as painted"},
                'ledge': {'rows': list(LEDGE), 'note': "the bottom frame's ledge meets the post's inner edge; below it the post's foot stands against the wall"},
                'from': "the left frame on RA-A-4, the median of rows 700 to 850: ink x 355-356 (5, 17, 40), steel x 357-370 (31, 68, 109), a lighter column x 371 (39, 82, 128), a groove x 372 (18, 39, 69), a highlight ridge x 374 (150, 157, 173); rivets at (382, 625) and (382, 872)"},
       'wall': {'x': list(WALL), 'rows': list(CAB_ROWS), 'from': 'RA-A-1, the start picture of the lift (the wall the cabinet was painted on)'},
       'rule': {'grilleEdgeX': GRILLE, 'frameOuterEdgeAtMostX': LIMIT, 'minClearPx': RULE['minClearPx'], 'how': "step 4's frame rule (room-a-ra-a-s4.json's frameRule), as ra2_tools.py frame4 measures it"},
       'checks': checks, 'pass': bool(ok),
       'outputs': {'ra-A-4-frame.png': {'what': 'the plate: RA-A-4, AI-generated, with the code-drawn frame', 'sha256': sha(os.path.join(OUT, 'ra-A-4-frame.png')), 'pixelsSha256': pix(plate), 'size': [W, H], 'aiGenerated': True},
                   'ra-A-cabinet-frame.png': {'what': "the cabinet's step-2 layer with the frame drawn into it (RGBA)", 'sha256': sha(os.path.join(OUT, 'ra-A-cabinet-frame.png')), 'pixelsSha256': pix(lay), 'size': [W, H], 'aiGenerated': True}},
       'note': "pixelsSha256 is of the decoded pixels (8-bit RGB or RGBA, row by row), which another Pillow writes the same; the PNG files' own sha256 may differ with another Pillow or zlib",
       'units': 'painting pixel indices (1024 x 1536), inclusive ranges; rivet centres in pixel coordinates (a pixel spans i to i + 1)'}
json.dump(rec, open(os.path.join(OUT, 'frame-A.json'), 'w'), indent=1)
print(json.dumps(checks, indent=1)); print('pass' if ok else 'FAIL', {k: v['pixelsSha256'][:16] for k, v in rec['outputs'].items()})
if not ok: sys.exit(1)
