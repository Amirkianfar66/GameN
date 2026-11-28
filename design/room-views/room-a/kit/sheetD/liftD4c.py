# View D's lift for the people layers (the Lead, 27 November, 23:49 and 23:54: "run D's lift and checks on RA-D-4c"), as views B, C
# and E's (../sheetE/liftE2c.py): the pieces of RA-D-4c (view D's final plate: RA-D-1 with RA-D-3's desk and cabinet completed in code,
# RA-D-3x; step 2b's hatch, lid and toolbox completed in code, RA-D-3hc; step 3's capsule, RA-D-4, completed in code with the toolbox's
# cast shadow, RA-D-4c) lifted off RA-D-1 (view D's accepted step 1) as one RGBA layer a piece, by the Lead's recipe (lift5.py). The
# lift's area: step 2's PLACE mask where it kept the desk and the cabinet, step 2b's mask, step 3's mask, and each code completion's
# traced outline grown 2 px (RA-D-3x's three, RA-D-3hc's one, RA-D-4c's capsule), each in its piece's grey: step 2's split for the desk
# and the cabinet, step 2b's for the hatch, the lid and the toolbox, RA-D-3hc's outline by its parts (the lid, the hatch's rims and the
# gap, the toolbox), and step 3's split for the capsule, its own layer as in view A (painted-D.json's capsule: the lift and the
# occlusion use the painted capsule). Not lifted, left in the plate: the toolbox's cast shadow on the deck (RA-D-4c's shadow outline: a
# floor shadow is not drawn over a person) and the keeps' blends. Writes _lift/D-<piece>.png and lift-D4c.json. Reads RA-D-1 from the
# records (by its sha256) and the plate by its record's pixels. --stand-in runs on compositeD4c.py's dry run (RA-D-3hc standing in for
# RA-D-4, no capsule) into _d4c/standin/. Calls no service; generates nothing. Usage: python3 -I liftD4c.py <records folder> [--stand-in]
import hashlib, importlib.util, json, math, os, sys
import numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__)); args = [a for a in sys.argv[1:] if a != '--stand-in']; SI = '--stand-in' in sys.argv
REC = args[0] if args else os.path.join(D, '_rec2'); OUTD = os.path.join(D, '_d4c', 'standin') if SI else D
mod = lambda n, f: (lambda s: (lambda m: (s.loader.exec_module(m), m)[1])(importlib.util.module_from_spec(s)))(importlib.util.spec_from_file_location(n, f))
L5 = mod('lift5', os.path.join(D, 'lift5.py'))
fsha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest(); psha = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()
J = lambda f: json.load(open(os.path.join(D, f)))
MAN, C3X, C3HC = J('room-a-ra-d.json'), J('composite-D3x.json'), J('composite-D3hc.json')
C4 = json.load(open(os.path.join(OUTD, 'composite-D4c-standin.json' if SI else 'composite-D4c.json')))
if fsha(os.path.join(D, 'lift5.py')) != MAN['kit']['lift']['sha256']: sys.exit("STOP: lift5.py is not the sheet's")
B1 = 'c8842de16d63076fe69306b247bcc643b6dc5576f6c389364ce49bc970f2fe75'
if fsha(os.path.join(REC, 'img', 'RA-D-1.png')) != B1: sys.exit('STOP: img/RA-D-1.png is not RA-D-1')
rgb = lambda f: np.array(Image.open(f).convert('RGB'))
PNAME = 'ra-D-4c-standin.png' if SI else 'ra-D-4c.png'
start, kept = rgb(os.path.join(REC, 'img', 'RA-D-1.png')), rgb(os.path.join(OUTD, PNAME))
if psha(kept) != C4['outputs'][PNAME]['pixelsSha256'] or not C4['pass']: sys.exit('STOP: the plate is not the one composite-D4c records, or it did not pass')
V = MAN['kit']['views']['D']; G = lambda f: np.array(Image.open(os.path.join(D, f)).convert('L'))
for k, f in (('place', 'ra-D-place.png'), ('split', 'ra-D-split.png'), ('place2b', 'ra-D-place2b.png'), ('split2b', 'ra-D-split2b.png'), ('place3', 'ra-D-place3.png'), ('split3', 'ra-D-split3.png')):
    if fsha(os.path.join(D, f)) != V['files'][k]['sha256']: sys.exit(f"STOP: {f} is not the sheet's {k}")
place, place2b, place3 = G('ra-D-place.png') > 127, G('ra-D-place2b.png') > 127, G('ra-D-place3.png') > 127
split, split2b = G('ra-D-split.png'), G('ra-D-split2b.png'); H, W = place.shape
GREY = V['split']
if any(GREY[k] != v for k, v in V['split2b'].items()): sys.exit("STOP: step 2b's greys are not step 2's")
def sdist(poly, X, Y):
    P = np.array(poly, float); A, Bq = P, np.roll(P, -1, axis=0); px, py = X[..., None], Y[..., None]
    ax, ay, bx, by = A[:, 0], A[:, 1], Bq[:, 0], Bq[:, 1]; dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / np.maximum(dx * dx + dy * dy, 1e-12), 0, 1); d = np.hypot(px - (ax + t * dx), py - (ay + t * dy)).min(axis=-1)
    cross = ((ay <= py) & (by > py)) | ((by <= py) & (ay > py)); xint = ax + (py - ay) * dx / np.where(dy == 0, 1, dy)
    return np.where((cross & (px < xint)).sum(axis=-1) % 2 == 1, d, -d)
def inside(poly, grow=0.0):   # pixel centres inside the outline, or within `grow` px of it
    xs = [q[0] for q in poly]; ys = [q[1] for q in poly]; x0, x1, y0, y1 = max(0, int(min(xs)) - 4), min(W, int(max(xs)) + 5), max(0, int(min(ys)) - 4), min(H, int(max(ys)) + 5)
    a = np.zeros((H, W), bool); X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5); a[y0:y1, x0:x1] = sdist(poly, X, Y) > -grow; return a
# step 2's areas, as RA-D-3x kept them: the desk's (less the trim in front of it) and the cabinet's
yy, xx = np.mgrid[0:H, 0:W]; DESK = place & (xx < 380); CAB = place & (xx > 740) & (yy < 1000)
trim = inside([tuple(q) for q in C3X['trim']['polygon']]) & DESK; A2 = (DESK & ~trim) | CAB
split_x = np.zeros((H, W), np.uint8); lift_mask = A2 | place2b
split_x[DESK & ~trim] = GREY['A PC workstation']; split_x[CAB] = GREY['C electrical cabinet']
split_x[place2b] = split2b[place2b]
if set(np.unique(split_x[place2b])) - {GREY['E toolbox'], GREY['E floor hatch'], GREY['E hatch lid']}: sys.exit("STOP: step 2b's split has an unknown grey")
comp = {}
OF3X = {'cabinet': 'C electrical cabinet', 'monitor': 'A PC workstation', 'desk-end': 'A PC workstation'}
for p in C3X['pieces']:
    a = inside([tuple(q) for q in p['outline']], 2.0); comp['RA-D-3x ' + p['key']] = (a, OF3X[p['key']]); out_ = a & ~lift_mask
    split_x[out_] = GREY[OF3X[p['key']]]; lift_mask |= a
# RA-D-3hc's one outline, by its parts: each pixel to the nearest run (the lid's, the hatch's or the toolbox's), as composite-D3hc.json counts them
runs = C3HC['outline']['runs']; poly = [tuple(q) for r in runs for q in r['points']]; a3 = inside(poly, 2.0)
PARTS = {'E hatch lid': [0, 1, 2, 3, 16], 'E floor hatch': [4, 5, 6, 7, 15], 'E toolbox': [8, 9, 10, 11, 12, 13, 14]}
ys, xs = np.nonzero(a3 & ~place2b); best = np.full(len(xs), np.inf); ri = np.zeros(len(xs), int)
for i, r in enumerate(runs):
    Q = np.array(r['points'], float); Q = np.vstack([Q, Q]) if len(Q) == 1 else Q; A_, B_ = Q[:-1], Q[1:]
    px_, py_ = (xs + 0.5)[:, None], (ys + 0.5)[:, None]; dx, dy = B_[:, 0] - A_[:, 0], B_[:, 1] - A_[:, 1]
    t = np.clip(((px_ - A_[:, 0]) * dx + (py_ - A_[:, 1]) * dy) / np.maximum(dx * dx + dy * dy, 1e-12), 0, 1)
    dd = np.hypot(px_ - (A_[:, 0] + t * dx), py_ - (A_[:, 1] + t * dy)).min(axis=1); w = dd < best; best[w] = dd[w]; ri[w] = i
part = np.array([next(k for k, ids in PARTS.items() if r in ids) for r in ri])
for k in PARTS:
    sel = part == k; split_x[ys[sel], xs[sel]] = GREY[k]
lift_mask |= a3
for k in PARTS: comp['RA-D-3hc ' + k] = ((a3 & ~place2b) & (split_x == GREY[k]), k)
# step 3's capsule, its own layer as in view A: step 3's mask and RA-D-4c's capsule outline grown 2 px (its 1 px feather), in step 3's grey
CAPSULE = 'capsule' in C4; GREY3 = V['split3'] if CAPSULE else {}
if CAPSULE:
    split3 = G('ra-D-split3.png')
    if set(np.unique(split3[place3])) - {GREY3['wall food capsule']}: sys.exit("STOP: step 3's split has an unknown grey")
    aCap = place3 | inside([tuple(q) for r in C4['capsule']['outline']['runs'] for q in r['points']], 2.0)
    if (lift_mask & aCap).any(): sys.exit("STOP: the capsule's area meets another piece's")
    split_x[aCap] = GREY3['wall food capsule']; lift_mask |= aCap; comp['RA-D-4c capsule'] = (aCap & ~place3, 'wall food capsule')
# left in the plate: the toolbox's cast shadow (RA-D-4c's shadow outline and its feather) and the keeps' blends (each keep's 2 px
# Gaussian reaches up to 7 px past its mask); nothing else may differ from RA-D-1 outside the lift
shadow = inside([tuple(q) for r in (C4['shadow']['outline']['runs'] if 'shadow' in C4 else C4['outline']['runs']) for q in r['points']], 1.0)
lift_mask &= ~shadow   # the floor shadow is not lifted, even where the box's grown outline reaches it
band = lambda m_: L5.grow(m_, 7) & ~m_
allowed = band(A2) | band(place2b) | L5.grow(place3, 7) | shadow
changed = np.abs(kept.astype(int) - start.astype(int)).max(axis=2) > 0
stray = changed & ~lift_mask & ~allowed
if stray.any(): sys.exit(f'STOP: {int(stray.sum())} px of the plate differ from RA-D-1 outside the lift and what is left in the plate')
left = changed & ~lift_mask
b, al = L5.matte(start, kept, lift_mask)
os.makedirs(os.path.join(OUTD, '_lift'), exist_ok=True)
out = {'view': 'D', 'what': "view D's people layers: RA-D-4c's pieces lifted off RA-D-1, one RGBA layer a piece" + (' (stand-in dry run)' if SI else ''), 'recipe': MAN['kit']['lift']['recipe'],
       'area': "step 2's PLACE mask where RA-D-3x kept the desk and the cabinet (less the trim in front of the desk), step 2b's mask, step 3's mask, and each code completion's traced outline grown 2 px (RA-D-3x's three, RA-D-3hc's one by its parts, RA-D-4c's capsule), each in its piece's grey; less the toolbox's cast shadow",
       'start': {'name': 'RA-D-1', 'sha256': B1, 'aiGenerated': True}, 'kept': {'name': 'RA-D-4c', 'file': PNAME, 'pixelsSha256': psha(kept), 'aiGenerated': True, 'codeComposite': True, 'standIn': SI},
       'leftInThePlate': {'px': int(left.sum()), 'shadowPx': int((left & shadow).sum()), 'keepBlendPx': int((left & ~shadow).sum()), 'ofWhichRoundTheCapsulePx': int((left & ~shadow & L5.grow(place3, 7)).sum()),
                          'what': "the toolbox's cast shadow on the deck, and the keeps' blends (step 3's round the capsule, outside its area)"},
       'liftAreaPx': int(lift_mask.sum()), 'pieces': {}, 'missing': []}
for name, grey in {**GREY, **GREY3}.items():
    own = (split_x == grey) & lift_mask; m_ = b & own; a_ = al * own
    if not m_.any(): out['missing'].append(name); continue
    a8 = np.rint(a_ * 255).astype(np.uint8); f = f"_lift/D-{name.split(' ', 1)[1].replace(' ', '-')}.png"
    Image.fromarray(np.dstack([kept * (a8 > 0)[..., None], a8]), 'RGBA').save(os.path.join(OUTD, f), optimize=True)
    yq, xq = np.where(m_); cin = {k: int((m_ & cm & ~(A2 | place2b)).sum()) for k, (cm, pn) in comp.items() if pn == name}
    out['pieces'][name] = {'file': f, 'sha256': fsha(os.path.join(OUTD, f)), 'grey': grey, 'px': int(m_.sum()), 'box': [int(xq.min()), int(yq.min()), int(xq.max()) + 1, int(yq.max()) + 1],
                           'areaPx': int(own.sum()), 'shareOfItsArea': round(float(m_.sum() / own.sum()), 4), 'completionPxPastTheMasks': cin,
                           'alphaFull': int((a8 == 255).sum()), 'alphaPartial': int(((a8 > 0) & (a8 < 255)).sum())}
rb = L5.rebuild(start, kept, al); d = np.abs(rb.astype(int) - kept.astype(int)).max(axis=2)
out['rebuild'] = {'how': "RA-D-1 with every layer over it, against RA-D-4c, inside the lift's area (the shadow and the keeps' blends are left in the plate)",
                  'meanAbsDiff': round(float(np.abs(rb.astype(int) - kept.astype(int))[lift_mask].mean()), 4), 'pxOver16': int((d[lift_mask] > 16).sum()), 'maxDiff': int(d[lift_mask].max())}
json.dump(out, open(os.path.join(OUTD, 'lift-D4c-standin.json' if SI else 'lift-D4c.json'), 'w'), indent=1)
print('lift area', out['liftAreaPx'], 'px | left in the plate', out['leftInThePlate'], '| missing', out['missing'])
for k, v in out['pieces'].items(): print(f"  {k}: {v['px']} px, box {v['box']}, {v['shareOfItsArea']} of its area, completions past the masks {v['completionPxPastTheMasks']}")
print('rebuild', out['rebuild'])
