# Sheet RA-E version 3: RA-E-2c, view E's step-2 picture completed in code (the Lead, 27 November 2026, 19:15). The kept step 2,
# RA-E-2, is the image tool's keep: RA-E-2's raw edit over RA-E-1 inside the step-2 PLACE mask (version 2, with the selective 12 px
# growth), feathered by a 2 px Gaussian. Where a piece of furniture ran past the mask, the keep cut it. RA-E-2c is RA-E-2 with the raw
# edit's pixels taken back inside each cut piece's own painted outline (its ink line), traced on the raw, with 1 px of feather outside
# the outline and nothing else from the raw. So it is a code composite of two AI-generated pictures, RA-E-1 and RA-E-2's raw edit. No
# picture is generated.
#
# The pieces. The Lead named two. The crates' left ends: the upper crate's top-left corner, its bracket and its left side, and the
# lower crate's whole left end (its top face's back edge, its top-left bracket, its left side, its bottom-left bracket and its bottom
# edge). The cabinet's right frame: the raw closes it 7 px past the painted corner at x 107, to the outer edge of its ink (its face
# x 104-111, its ink x 112-113); at 3 times it reads as the cabinet standing in the corner, its right post where the corner was, not
# as a face wrapping onto the south wall, so the raw's frame is taken whole. The same cut ran on along the frame's bottom bar (its
# lower edge and ink, 5 to 6 px past the mask's diagonal edge, to the picture's left edge) and along its top bar's top ink (0 to 2.5 px
# past the mask, so the keep's feather had faded it), so the cabinet's piece follows the frame's outer ink all round and closes up the
# picture's left edge: its frame is closed on every side. Two gaps in the mask, where the selective growth stopped short inside the
# crates (a notch at x 818-829, y 881-888, and a slot at x 788-791, y 941-956), had let RA-E-1's wall show faintly through them; they
# lie inside the crates' outlines and are completed with them.
#
# How the outlines were read: on the raw, along scan lines across each ink line, at the midpoint between the ink's value and the
# value just outside it, linear between pixel centres; where the wall beside the ink is as dark as the ink, or a pipe or the wall's
# kick strip met the scan line first, the reading was taken from the luminance at 8 times, the far side of the ink (1.5 to 2 px). The
# cabinet's bottom edge is the least-squares line through its readings (within 0.7 px), its right side a vertical line, its top edge
# follows its readings. Each outline closes inside the mask, at least 7.9 px from its edge, where RA-E-2 already equals the raw (the
# keep's blend reaches 5 px), or along the picture's own edge; the checks below confirm RA-E-2 equals the raw just outside every
# closing path and in its feather, within 1.5 px of it.
#
# Reads from <records folder>: img/RA-E-2.png, img/RA-E-2-raw.png and img/RA-E-1.png, each checked by its sha256, and from its own
# folder ra-E-place.png (the step-2 PLACE mask, version 2), checked. Writes to its own folder: ra-E-2c.png (the plate, AI-generated, not
# for display without a label) and composite-E2.json (the record). NumPy and Pillow only.
# Usage: python3 -I compositeE2.py <records folder>
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2: sys.exit('usage: python3 -I compositeE2.py <records folder>')
REC = sys.argv[1]
fsha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
psha = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()
IN = {'RA-E-2': ('img/RA-E-2.png', 'eeadc937bf93f79152a5e0e6d8aee77816d4a8d845d45bdf88bce65fbfae9b95'),
      'RA-E-2-raw': ('img/RA-E-2-raw.png', 'd33ed69614725431ef2172494c74952fad39726a64c6e64dcf18a53a66222d73'),
      'RA-E-1': ('img/RA-E-1.png', 'e0d928ef4c1dabd3968b20568bd0d6e3f923682df7f6d938c61bd26cb2d0730f')}
OWN = {'ra-E-place.png': '973550c2f32612b185e4994e9c8134c5f157984f48407e71714cad3b533fc366'}   # version 2's step-2 PLACE mask
for k, (f, h) in IN.items():
    if fsha(os.path.join(REC, f)) != h: sys.exit(f'STOP: {f} is not {k}')
for f, h in OWN.items():
    if fsha(os.path.join(D, f)) != h: sys.exit(f'STOP: {f} is not the file version 2 published')
rgb = lambda f: np.array(Image.open(f).convert('RGB'))
kept, raw, e1 = rgb(os.path.join(REC, IN['RA-E-2'][0])), rgb(os.path.join(REC, IN['RA-E-2-raw'][0])), rgb(os.path.join(REC, IN['RA-E-1'][0]))
place = np.array(Image.open(os.path.join(D, 'ra-E-place.png')).convert('L')) > 127
H, W = place.shape
# RA-E-2 is the keep of the two AI-generated pictures (re1_tools.py's keep): checked here, so RA-E-2c's sources are those two
Lm = Image.fromarray((place * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
keepAgain = np.array(Image.composite(Image.fromarray(raw), Image.fromarray(e1), Lm))
keepIsExact = bool((keepAgain == kept).all())
if not keepIsExact: sys.exit("STOP: RA-E-2 is not the keep of RA-E-2's raw over RA-E-1 in the step-2 mask")

# ---- the traced outlines: painting pixels, a pixel spanning i to i + 1. Each runs along the outer edge of the piece's ink line
# outside the mask and closes inside the mask or along the picture's edge ('closing', the part of the outline that is not ink)
PIECES = [
 {'key': 'crate-upper', 'listed': True, 'lead': 1, 'name': "the upper crate's left end: its top edge, its top-left bracket and its left side, down to where the mask holds it",
  'ink': "the top edge (y 833.0-842.0, from inside the mask to x 801.5), the bracket's outer ink (x 800.0-801.1, y 844-860) and the side (x 801.8-802.2, to y 898.5)",
  'note': "the raw's bracket reaches x 800, 18 px past the mask (x 818); the mask's notch at x 818-829, y 881-888 lies inside the outline",
  'outline': [(831.0, 833.05), (830.5, 833.05), (829.5, 833.04), (828.5, 833.27), (827.5, 833.77), (826.5, 833.92), (825.5, 834.0), (823.5, 834.48),
              (822.5, 834.94), (821.5, 835.04), (820.5, 835.08), (817.5, 835.79), (816.5, 835.99), (813.5, 836.23), (812.5, 836.62), (811.5, 836.76),
              (810.5, 836.98), (808.5, 837.06), (806.5, 837.99), (805.5, 838.59), (804.5, 839.1), (803.5, 839.94), (802.5, 840.79), (801.5, 841.96),
              (800.12, 844.5), (799.99, 846.5), (800.03, 848.5), (800.05, 850.5), (800.06, 852.5), (800.0, 854.5), (799.98, 856.5), (799.99, 858.5),
              (801.09, 860.5), (801.96, 862.5), (801.99, 864.5), (801.9, 866.5), (802.03, 868.5), (802.23, 870.5), (802.11, 872.5), (801.84, 888.5),
              (801.89, 890.5), (801.89, 892.5), (801.85, 894.5), (801.83, 896.5), (801.76, 898.5), (838.0, 898.5), (838.0, 833.05)],
  'closing': [(801.76, 898.5), (838.0, 898.5), (838.0, 833.05), (831.0, 833.05)],
  },
 {'key': 'crate-lower', 'listed': True, 'lead': 1, 'name': "the lower crate's left end: its top face's back edge, its top-left bracket, its left side, its bottom-left bracket and its bottom edge into the mask",
  'ink': "the top face's back edge (y 917.0-923.3, with 1.5 px of its ink), the bracket's top-left corner and outer side (x 760.0-762.1), the side (x 762.2-762.4), the bottom bracket (x 760.2-760.9), its lower diagonal and the bottom edge (y 1026.2-1039.0)",
  'note': "the raw's end reaches x 760, 20 px past the mask (x 780); the mask's slot at x 788-791, y 941-956 lies inside the outline",
  'outline': [(800.6, 917.2), (799.0, 917.0), (796.0, 917.5), (793.0, 918.5), (788.0, 919.5), (783.0, 920.5), (780.0, 921.5), (777.0, 922.5),
              (774.0, 923.0), (771.0, 923.3), (768.0, 923.3), (766.0, 924.3), (764.5, 925.5), (763.0, 927.0), (762.0, 928.3), (761.1, 930.0),
              (760.5, 931.5), (760.0, 935.5), (760.0, 940.5), (760.1, 945.5), (760.8, 950.5), (762.1, 952.5), (762.16, 960.5), (762.24, 962.5),
              (762.26, 964.5), (762.28, 966.5), (762.2, 968.5), (762.27, 970.5), (762.29, 972.5), (762.23, 974.5), (762.23, 976.5), (762.28, 978.5),
              (762.36, 980.5), (762.34, 982.5), (762.32, 984.5), (762.31, 986.5), (762.34, 988.5), (762.33, 990.5), (762.3, 992.5), (762.31, 994.5),
              (762.25, 996.5), (762.21, 998.5), (762.22, 1000.5), (762.25, 1002.5), (762.28, 1004.5), (761.92, 1006.5), (760.46, 1008.5),
              (760.16, 1010.5), (760.22, 1012.5), (760.48, 1014.5), (760.56, 1016.5), (760.61, 1018.5), (760.89, 1020.5), (760.5, 1022.5),
              (761.5, 1026.18), (762.5, 1027.23), (763.5, 1028.71), (764.5, 1029.89), (765.5, 1030.68), (766.5, 1031.21), (767.5, 1031.89),
              (768.5, 1032.29), (769.5, 1032.92), (770.5, 1033.25), (771.5, 1033.9), (772.5, 1034.52), (774.5, 1035.52), (776.0, 1036.0),
              (781.5, 1036.2), (785.0, 1037.4), (788.0, 1039.0), (790.0, 1039.0), (790.0, 966.0), (800.6, 966.0)],
  'closing': [(788.0, 1039.0), (790.0, 1039.0), (790.0, 966.0), (800.6, 966.0), (800.6, 917.2)],
  },
 {'key': 'cabinet', 'listed': True, 'lead': 2, 'name': "the cabinet's frame, all round: its right post with its top-right and bottom-right corners, its bottom bar's lower edge to the picture's left edge, and its top bar's top edge",
  'ink': "the top bar's top ink (y 549.5-612.8), the top-right corner, the right post's outer ink (x 113.9), the bottom-right corner, the bottom bar's lower ink (x = 977.29 - 0.8908 y, y 978-1076) and the frame's bottom edge (y 1084.0) to the picture's left edge",
  'note': "the Lead named the right frame; the same cut ran on along the bottom bar's lower edge (5 to 6 px past the mask's diagonal edge) and the top bar's top ink (0 to 2.5 px past it), so the piece follows the frame's outer ink all round and closes up the picture's left edge",
  'outline': [(-1.0, 549.86), (0.5, 549.86), (12.5, 549.5), (18.5, 551.9), (24.5, 556.0), (30.5, 560.35), (36.5, 563.2), (42.5, 567.14),
              (48.5, 570.4), (56.5, 576.0), (60.5, 579.87), (64.5, 583.06), (70.5, 587.0), (76.5, 591.5), (80.5, 594.7), (86.5, 597.9),
              (90.5, 601.0), (96.5, 606.28), (100.5, 609.64), (104.5, 612.82), (106.5, 613.85), (108.5, 615.0), (110.5, 616.9), (111.5, 618.3),
              (112.8, 619.6), (113.9, 621.0), (113.9, 966.5), (113.5, 968.5), (112.7, 971.0), (111.7, 972.0), (110.8, 973.0), (110.3, 974.0),
              (109.5, 975.0), (109.0, 976.0), (106.11, 978.0), (104.33, 980.0), (102.55, 982.0), (100.77, 984.0), (98.99, 986.0), (97.21, 988.0),
              (95.42, 990.0), (93.64, 992.0), (91.86, 994.0), (90.08, 996.0), (88.3, 998.0), (86.52, 1000.0), (84.74, 1002.0), (82.95, 1004.0),
              (81.17, 1006.0), (79.39, 1008.0), (77.61, 1010.0), (75.83, 1012.0), (74.05, 1014.0), (72.26, 1016.0), (70.48, 1018.0), (68.7, 1020.0),
              (66.92, 1022.0), (65.14, 1024.0), (63.36, 1026.0), (61.58, 1028.0), (59.79, 1030.0), (58.01, 1032.0), (56.23, 1034.0), (54.45, 1036.0),
              (52.67, 1038.0), (50.89, 1040.0), (49.1, 1042.0), (47.32, 1044.0), (45.54, 1046.0), (43.76, 1048.0), (41.98, 1050.0), (40.2, 1052.0),
              (38.42, 1054.0), (36.63, 1056.0), (34.85, 1058.0), (33.07, 1060.0), (31.29, 1062.0), (29.51, 1064.0), (27.73, 1066.0), (25.94, 1068.0),
              (24.16, 1070.0), (22.38, 1072.0), (20.6, 1074.0), (18.82, 1076.0), (13.5, 1080.0), (11.5, 1081.6), (9.5, 1083.0), (8.0, 1084.0),
              (-1.0, 1084.0)],
  'closing': [(-1.0, 1084.0), (-1.0, 549.86)],
  },
]
CORNER = {'paintedCornerX': 107, 'how': "the corner of the left-hand wall and the south wall in RA-E-1 (and in the raw above the cabinet): the darkest column in x 100-115, a 1 px line at x 107 from y 460 to 1000",
          'rawFrame': {'faceX': [104, 111], 'inkX': [112, 113], 'outerEdgeX': 113.9, 'pastTheCornerPx': {'toTheFace': 4, 'toTheInksOuterEdge': 6.9}},
          'decision': "taken whole: at 3 times the raw's right post stands where the corner was, the corner line above and below the cabinet meeting its top and foot, and reads as the cabinet standing in the corner, not as a face wrapping onto the south wall (the Lead: take the raw's frame whole if it reads as the cabinet ending at the corner; otherwise close it at the corner in code)",
          'ifTheLeadReadsItAsWrapping': "the right post would be closed at the corner in code instead, as view A's cabinet frame was drawn"}
MASK_GAPS = [{'what': "a notch in the mask's left edge inside the upper crate", 'box': [818, 881, 830, 889], 'piece': 'crate-upper'},
             {'what': "a slot in the mask inside the lower crate's front", 'box': [788, 941, 792, 957], 'piece': 'crate-lower'}]
LEFT_ALONE = [{'what': "the contact shadows under the crates", 'why': "shadows, not pieces, as the Lead asked for B"},
              {'what': "the wall's pipe behind the crates' left ends, left of the mask", 'why': "RA-E-1's wall, outside the crates' outlines; the raw's pipe meets it at the keep's own seam, inside the mask"},
              {'what': "the bracket above the cabinet's top bar, x 15-40, y 543-556", 'why': "RA-E-1's own wall fixture, outside the frame's outline; the raw paints one much like it"}]

def sdist(poly, X, Y):   # signed distance from the points to the polygon's outline: + inside, - outside (even-odd)
    P = np.array(poly, float); A, B = P, np.roll(P, -1, axis=0)
    px, py = X[..., None], Y[..., None]; ax, ay, bx, by = A[:, 0], A[:, 1], B[:, 0], B[:, 1]; dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    d = np.hypot(px - (ax + t * dx), py - (ay + t * dy)).min(axis=-1)
    cross = ((ay <= py) & (by > py)) | ((by <= py) & (ay > py))
    xint = ax + (py - ay) * dx / np.where(dy == 0, 1, dy)
    inside = (cross & (px < xint)).sum(axis=-1) % 2 == 1
    return np.where(inside, d, -d)
def segdist(path, X, Y):   # unsigned distance from the points to an open polyline
    P = np.array(path, float); A, B = P[:-1], P[1:]
    px, py = X[..., None], Y[..., None]; ax, ay, bx, by = A[:, 0], A[:, 1], B[:, 0], B[:, 1]; dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / np.maximum(dx * dx + dy * dy, 1e-12), 0, 1)
    return np.hypot(px - (ax + t * dx), py - (ay + t * dy)).min(axis=-1)
FEATHER = 1.0   # px: alpha 1 inside the outline, falling to 0 over 1 px outside it
alpha = np.zeros((H, W)); per = {}; boxes = {}
for p in PIECES:
    xs = [q[0] for q in p['outline']]; ys = [q[1] for q in p['outline']]
    x0, x1, y0, y1 = max(0, int(min(xs)) - 2), min(W, int(max(xs)) + 3), max(0, int(min(ys)) - 2), min(H, int(max(ys)) + 3)
    X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
    d = sdist(p['outline'], X, Y)
    a = np.zeros((H, W)); a[y0:y1, x0:x1] = np.clip(1 + d / FEATHER, 0, 1); per[p['key']] = a; boxes[p['key']] = (x0, y0, x1, y1); alpha = np.maximum(alpha, a)
out = np.rint(kept * (1 - alpha[..., None]) + raw * alpha[..., None]).astype(np.uint8)

# ---- checks
changed = (out != kept).any(axis=2); touched = alpha > 0
changedOutside = int((changed & ~touched).sum())
fullRaw = alpha == 1; rawWhereFull = bool((out[fullRaw] == raw[fullRaw]).all())
diff = np.abs(kept.astype(int) - raw.astype(int)).max(axis=2)
pieceChecks = {}
for p in PIECES:
    a = per[p['key']]; c = changed & (a > 0); ys, xs = np.nonzero(c)
    # along the closing path (the part of the outline that is not ink), on its outer side and in its feather (alpha under 1), RA-E-2
    # must already equal the raw, so the join cannot show; a path along the picture's own edge has no join
    segs = [(q0, q1) for q0, q1 in zip(p['closing'][:-1], p['closing'][1:]) if not ((q0[0] < 0 and q1[0] < 0) or (q0[0] >= W and q1[0] >= W) or (q0[1] >= H and q1[1] >= H))]
    x0, y0, x1, y1 = boxes[p['key']]; X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
    near = np.zeros((H, W), bool)
    for q0, q1 in segs: near[y0:y1, x0:x1] |= segdist([q0, q1], X, Y) <= 1.5
    closingDiffer = int((near & (a < 1) & (diff > 0)).sum())
    ux, uy = np.nonzero(~place[y0:y1, x0:x1])[1] + x0 + 0.5, np.nonzero(~place[y0:y1, x0:x1])[0] + y0 + 0.5
    samples = np.array([(q0[0] + s * (q1[0] - q0[0]), q0[1] + s * (q1[1] - q0[1])) for q0, q1 in segs for s in np.linspace(0, 1, max(2, int(np.hypot(q1[0] - q0[0], q1[1] - q0[1]) / 0.5)))]) if segs else np.zeros((0, 2))
    depth = float(np.sqrt((samples[:, 0, None] - ux[None]) ** 2 + (samples[:, 1, None] - uy[None]) ** 2).min()) if len(samples) and len(ux) else None
    pieceChecks[p['key']] = {'changedPx': int(c.sum()), 'changedOutsideTheMask': int((c & ~place).sum()), 'changedInsideTheMask': int((c & place).sum()),
                             'changedBox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if c.any() else None,
                             'featherPx': int(((a > 0) & (a < 1)).sum()), 'closingPathPx': int((near & (a < 1)).sum()), 'closingPathPxWhereRA-E-2DiffersFromTheRaw': closingDiffer,
                             'closingPathMinDepthPx': round(depth, 2) if depth is not None else None,
                             'closingAlongThePicturesEdge': not segs}
# the cabinet's parts, by where they lie: the top bar's top edge (left of the mask's right edge, above y 600), the right post with its
# corners (x 95 and right), the bottom bar's lower edge (left of x 95, below y 970)
cc = changed & (per['cabinet'] > 0); yy, xx = np.mgrid[0:H, 0:W]
parts = {'theTopBarsTopEdge': int((cc & (xx < 95) & (yy < 640)).sum()), 'theRightPostAndItsCorners': int((cc & (xx >= 95)).sum()),
         'theBottomBarsLowerEdge': int((cc & (xx < 95) & (yy >= 940)).sum()), 'elsewhereOnTheFrame': int((cc & (xx < 95) & (yy >= 640) & (yy < 940)).sum())}
gaps = [{**g, 'changedPx': int(changed[g['box'][1]:g['box'][3], g['box'][0]:g['box'][2]].sum()), 'unmaskedPx': int((~place[g['box'][1]:g['box'][3], g['box'][0]:g['box'][2]]).sum())} for g in MASK_GAPS]
overlap = int((sum((per[p['key']] > 0).astype(int) for p in PIECES) > 1).sum())
if changedOutside or not rawWhereFull: sys.exit(f'STOP: {changedOutside} px changed outside the completions, or the raw is not taken whole inside them')
if any(v['closingPathPxWhereRA-E-2DiffersFromTheRaw'] for v in pieceChecks.values()): sys.exit('STOP: a closing path runs where RA-E-2 differs from the raw: ' + json.dumps({k: v['closingPathPxWhereRA-E-2DiffersFromTheRaw'] for k, v in pieceChecks.items()}))

Image.fromarray(out).save(os.path.join(D, 'ra-E-2c.png'), optimize=True)
J = lambda o, f: (json.dump(o, open(os.path.join(D, f), 'w'), indent=1), open(os.path.join(D, f), 'a').write('\n'))
plate = {'file': 'ra-E-2c.png', 'sha256': fsha(os.path.join(D, 'ra-E-2c.png')), 'pixelsSha256': psha(out), 'size': [W, H], 'aiGenerated': True, 'codeComposite': True}
src = lambda k, what: {'name': k, 'file': IN[k][0], 'sha256': IN[k][1], 'aiGenerated': True, 'what': what}
depths = [v['closingPathMinDepthPx'] for v in pieceChecks.values() if v['closingPathMinDepthPx'] is not None]
J({'sheet': 'RA-E', 'version': 3, 'view': 'E', 'step': 2, 'date': '2026-11-27', 'name': 'RA-E-2c',
   'what': "view E's step-2 picture completed in code: RA-E-2 with RA-E-2's raw edit taken back inside each cut piece's own ink outline",
   'drawnBy': 'code', 'generated': False, 'codeComposite': {'of': ['RA-E-1', "RA-E-2's raw edit"], 'aiGenerated': True,
   'how': "RA-E-2 (the keep of RA-E-2's raw over RA-E-1 in the step-2 mask, rebuilt here and equal pixel for pixel) is the base; inside each traced outline, the raw's pixels, with 1 px of feather outside the outline; nothing else from the raw"},
   'decision': "the Lead, 27 November 2026, 19:15: RA-E-2 held for two cut edges; make RA-E-2c, a code composite of RA-E-1 and RA-E-2's raw: complete both crates' near-left corners and their brackets, and the cabinet's right frame, never left open",
   'sources': [src('RA-E-2', "the kept step 2 (the base)"), src('RA-E-2-raw', "RA-E-2's raw edit (inside the outlines)"), src('RA-E-1', "view E's accepted step 1 (in RA-E-2, outside the mask)")],
   'record': {'file': 'records/RA-E-2.json', 'sha256': '751c6901662a09eea2f55f3defc0a084653618237ab330b5a0e48a48d0764c92', 'what': "the image session's record of RA-E-2 (its records page)"},
   'mask': {'file': 'ra-E-place.png', 'sha256': fsha(os.path.join(D, 'ra-E-place.png')), 'what': "version 2's step-2 PLACE mask"},
   'feather': {'px': FEATHER, 'how': 'alpha = 1 inside the outline, falling linearly to 0 at 1 px outside it, by each pixel centre\'s distance from the outline'},
   'tracing': "on the raw, along scan lines across each ink line, at the midpoint between the ink's value and the value just outside it, linear between pixel centres; where the wall beside the ink was as dark as the ink, or a pipe or the wall's kick strip met the scan line first, read from the luminance at 8 times (the far side of the ink, 1.5 to 2 px); the cabinet's bottom edge a least-squares line through its readings (within 0.7 px), its right side a vertical line",
   'theFrameAtTheCorner': CORNER, 'maskGaps': gaps,
   'pieces': [{k: v for k, v in p.items() if k != 'key'} | {'key': p['key'], 'checks': pieceChecks[p['key']]} for p in PIECES],
   'cabinetParts': parts, 'leftAlone': LEFT_ALONE,
   'checks': {'keepRebuiltExactly': keepIsExact, 'changedPx': int(changed.sum()), 'changedOutsideTheCompletions': changedOutside,
              'unchangedPx': int(W * H - changed.sum()), 'unchangedOutsideTheCompletions': int((~touched).sum()), 'picturePx': W * H,
              'rawTakenWholeInsideTheOutlines': rawWhereFull, 'overlappingPx': overlap,
              'closingPathsWhereRA-E-2DiffersFromTheRaw': sum(v['closingPathPxWhereRA-E-2DiffersFromTheRaw'] for v in pieceChecks.values()),
              'keepBlendReachesPxInsideTheMask': 5, 'closingPathMinDepthPx': min(depths)},
   'pass': changedOutside == 0 and rawWhereFull and keepIsExact,
   'outputs': {'ra-E-2c.png': {'what': 'the plate: RA-E-2c, a code composite of two AI-generated pictures', **{k: v for k, v in plate.items() if k != 'file'}}},
   'note': "pixelsSha256 is of the decoded pixels (8-bit RGB, row by row), which another Pillow writes the same; the PNG file's own sha256 may differ with another Pillow or zlib",
   'units': 'painting pixels (1024 x 1536); outlines in pixel-edge coordinates (a pixel spans i to i + 1)'}, 'composite-E2.json')
print('RA-E-2c:', plate['pixelsSha256'][:16], '| changed', int(changed.sum()), 'px | outside the completions', changedOutside, '| unchanged outside them', int((~touched).sum()))
print('per piece', {k: (v['changedPx'], v['changedOutsideTheMask'], v['closingPathMinDepthPx'], v['closingPathPxWhereRA-E-2DiffersFromTheRaw']) for k, v in pieceChecks.items()})
print('cabinet parts', parts, '| gaps', [(g['what'][:24], g['changedPx'], g['unmaskedPx']) for g in gaps])
