# View E's furniture placed by code (occlude8b.py, view B's, for Vega's view on sheet PV6-E version 3), by depth alone. Two sets
# of layers from the records page: the three furniture pieces lifted from PV6-E-3 (step 2) over the plate PV6-E-1, and Juno's
# stool lifted from PV6-E-4 (step 3) over PV6-E-3, its own piece. Each pixel's depth is where a ray from the painting's camera
# through the pixel's centre, d = forward + u right + v up with u = (x + 0.5 - cx) / f and v = (hy - y - 0.5) / f, enters its
# piece's solids, as the distance along the camera's axis (pixels the solids miss, at the painted edges, take their neighbours'
# depth); a person's depth is the same distance to where they stand. Each pixel of a piece is drawn once, in a band between the
# people: after every person farther than it and before every person nearer (the Lead's approval of 18 November), so the order
# holds for figures that move. The stool is Juno's seat, so its pixels stay behind Juno (the seat rule). The stool has its own
# bands (stool-<b>.png), each drawn just after the furniture band of the same number. Where step 3 painted over a furniture
# layer's pixel (the cart's right end, which step 3 repainted beside the stool), the stool's pixel is never in a lower band than
# the furniture pixel under it, so the bands rebuild PV6-E-4 there (the pixels raised are counted). Where a person's own station
# is nearer than them, the order marks where their figure's 'front' element goes (just above that band). Writes the bands as
# full-size RGBA layers (the plate's size, so they share its placement) and occlusion.json: the order, and per person, for the
# slots' placeholder shapes moved into the painting by the slice formula, the pieces in front of them and the share of their
# drawing, box, face and press area hidden. Also measures each piece against its outline in the guide.
# Generates nothing. Usage: python3 -I occlude8e.py
import hashlib, json, os, numpy as np
from PIL import Image, ImageFilter, ImageOps
D = os.path.dirname(os.path.abspath(__file__)); P = lambda p: os.path.normpath(os.path.join(D, p))
PIC = json.load(open(P('picture.json'))); G = json.load(open(P('_geo-E.json'))); S = json.load(open(P('scene.json')))
rgb = lambda p: np.array(Image.open(P(p)).convert('RGB'))
start, placed2, placed = rgb(PIC['plate']['file']), rgb(PIC['placed2']['file']), rgb(PIC['placed']['file']); H, W = start.shape[:2]
def img(a): return Image.fromarray((a * 255).astype(np.uint8))
def grow(a, r): return np.array(img(a).filter(ImageFilter.MaxFilter(2 * r + 1))) > 0
ST = {f"{p['place']} {p['name']}": p for p in json.load(open(P('../pieces8-E.json')))}
smap = np.array(Image.open(P('../pv6-E-stations.png')).convert('L')).astype(int)
# ---- 1. the layers: set 2, the furniture (checked against PV6-E-3), and set 3, the stool (checked against PV6-E-4)
def load_set(pieces, against, name):
    alpha = np.zeros((H, W)); owner = np.full((H, W), '', dtype=object); reach = {}; parts = []; layer_rgb = np.zeros((H, W, 3))
    for s, piece in pieces.items():
        L = np.array(Image.open(P(piece['file'])).convert('RGBA')); a = L[..., 3].astype(np.float64) / 255; m = a > 0
        if (np.abs(L[..., :3][m].astype(int) - against[m].astype(int)).max() if m.any() else 0) != 0: raise SystemExit(f"{s}: its colours are not {name}'s")
        if (owner[m] != '').any(): raise SystemExit(f'{s} meets another piece of its set: split them by their outlines first')
        alpha[m] = a[m]; owner[m] = s; reach[s] = m; layer_rgb[m] = L[..., :3][m]
        outline = np.abs(smap - ST[s]['grey']) <= 2; ys, xs = np.where(m); oys, oxs = np.where(outline)
        cx, cy = float((a * np.indices((H, W))[1]).sum() / a.sum()), float((a * np.indices((H, W))[0]).sum() / a.sum())
        parts.append({'station': s, 'file': os.path.basename(piece['file']), 'from': name, 'px': int(m.sum()), 'x': [int(xs.min()), int(xs.max())], 'y': [int(ys.min()), int(ys.max())],
                      'inItsOutline': round(float((m & grow(outline, 6)).sum() / m.sum()), 4), 'outlineCovered': round(float((m & outline).sum() / outline.sum()), 4),
                      'iouWithOutline': round(float((m & outline).sum() / (m | outline).sum()), 4),
                      'offPlan': {'left': int(xs.min() - oxs.min()), 'right': int(xs.max() - oxs.max()), 'top': int(ys.min() - oys.min()), 'bottom': int(ys.max() - oys.max()),
                                  'centre': [round(cx - float(oxs.mean()), 1), round(cy - float(oys.mean()), 1)]}})
    return alpha, owner, reach, parts, layer_rgb
alpha, owner, reach, parts2, layer_rgb = load_set(PIC['layers']['pieces'], placed2, 'PV6-E-3')
alpha_c, owner_c, reach_c, parts3, layer_rgb_c = load_set(PIC['layers3']['pieces'], placed, 'PV6-E-4')
parts = parts2 + parts3
# away from step 3's mask (the stool's shape, then its 2 px feather), PV6-E-4 is PV6-E-3, so the furniture layers hold
# PV6-E-4's colours wherever the stool is not: measured under the furniture outside that mask grown 6 px
place3 = np.array(Image.open(P('../pub-E/img/pv6-E-place3.png')).convert('L')) > 127
d23 = np.abs(placed2.astype(int) - placed.astype(int)).max(axis=2); away = (alpha > 0) & ~grow(place3, 6)
step3_outside = {'furniturePx': int(away.sum()), 'differingPx': int((d23[away] > 0).sum()), 'maxAbsDiff': int(d23[away].max()) if away.any() else 0}
if step3_outside['maxAbsDiff'] > 2: raise SystemExit(f'PV6-E-3 and PV6-E-4 differ under the furniture away from step 3: {step3_outside}')
# ---- 2. depth per pixel: the straight-line camera's ray into each piece's solids, the distance along its axis
cam = G['camera']; C = np.array(cam['C'], float); yaw = cam['yaw']
fwd, right, up = np.array([np.sin(yaw), 0.0, np.cos(yaw)]), np.array([np.cos(yaw), 0.0, -np.sin(yaw)]), np.array([0.0, 1.0, 0.0])
def ray(xs, ys): u = (xs + 0.5 - cam['cx']) / cam['f']; v = (cam['hy'] - (ys + 0.5)) / cam['f']; return fwd[None, :] + u[:, None] * right[None, :] + v[:, None] * up[None, :]
def project(p): q = np.array(p, float) - C; z = q @ fwd; return cam['cx'] + cam['f'] * (q @ right) / z, cam['hy'] - cam['f'] * (q @ up) / z, z
for sol in G['stations']['D bench']['solids'][:1]:   # the ray and the projection agree: a corner of Atlas's bench comes back at its own depth
    p0 = np.array(sol['faces'][0][2], float); x, y, z = project(p0); d = ray(np.array([x - 0.5]), np.array([y - 0.5]))[0]; back = C + d * z
    if np.abs(back - p0).max() > 1e-6: raise SystemExit('the ray does not match the camera')
def depth_of(station, region):
    ys, xs = np.where(region); d = ray(xs.astype(float), ys.astype(float)); best = np.full(len(xs), np.inf)
    for sol in G['stations'][station]['solids']:
        planes = []
        for f in sol['faces']:
            p0, p1, p2 = (np.array(v, float) for v in f[:3]); n = np.cross(p1 - p0, p2 - p0); n /= np.linalg.norm(n)
            if n @ (np.array(sol['c']) - p0) > 0: n = -n
            planes.append((n, p0))
        planes.append((np.array([0.0, -1.0, 0.0]), np.zeros(3)))   # the deck
        lo = np.zeros(len(xs)); hi = np.full(len(xs), np.inf); miss = np.zeros(len(xs), bool)
        for n, p0 in planes:
            den = d @ n; num = n @ (p0 - C)
            with np.errstate(divide='ignore', invalid='ignore'): r = num / den
            ent = den < -1e-12; ext = den > 1e-12
            lo[ent] = np.maximum(lo[ent], r[ent]); hi[ext] = np.minimum(hi[ext], r[ext]); miss |= (~ent & ~ext) & (num < 0)
        hit = ~miss & (lo <= hi)
        best = np.where(hit, np.minimum(best, lo), best)
    out = np.full((H, W), np.nan); out[ys, xs] = np.where(np.isfinite(best), best, np.nan); return out
src = {}
def depths(reach_set):
    depth = np.full((H, W), np.nan)
    for s, r in reach_set.items():
        dz = depth_of(s, r); known = np.isfinite(dz); src[s] = {'hit': int((known & r).sum()), 'pixels': int(r.sum())}
        for _ in range(60):   # pieces' pixels the solids miss (painted past the plan's outline) take the nearest known depth
            todo = r & ~known
            if not todo.any(): break
            pad = np.pad(np.where(known, dz, np.inf), 1, constant_values=np.inf)
            nb = np.min(np.stack([pad[1 + dy:1 + dy + H, 1 + dx:1 + dx + W] for dy in (-1, 0, 1) for dx in (-1, 0, 1)]), axis=0)
            fill = todo & np.isfinite(nb); dz[fill] = nb[fill]; known |= fill
        if (r & ~known).any(): raise SystemExit(f'{s}: {int((r & ~known).sum())} px with no depth')
        depth[r] = dz[r]; src[s]['depthM'] = [round(float(np.nanmin(dz[r])), 2), round(float(np.nanmax(dz[r])), 2)]
    return depth
depth, depth_c = depths(reach), depths(reach_c)
# ---- 3. the people on the stage (their placeholder shapes, as the page draws them), moved into the painting
phones = S['phones']; first = next(iter(phones.values()))
def person_alpha(q, ph):
    k = ph['k']; x0, y0 = ph['slice']['x0'], ph['slice']['y0']; r = q['rect']; left, top, size = x0 + r['left'] * k, y0 + r['top'] * k, r['size'] * k
    im = Image.open(P(q['png'])).convert('RGBA')
    if r['flip']: im = ImageOps.mirror(im)   # the page mirrors the shape about the middle of its square (scaleX(-1))
    sw = im.size[0] / size
    a = im.split()[3].transform((W, H), Image.AFFINE, (sw, 0, (0.5 - left) * sw - 0.5, 0, sw, (0.5 - top) * sw - 0.5), resample=Image.BILINEAR)
    return np.array(a).astype(np.float64) / 255
toP = lambda ph, pt: (ph['slice']['x0'] + pt[0] * ph['k'], ph['slice']['y0'] + pt[1] * ph['k'])
geo = {p['id']: p for p in G['people']}
people = sorted(first['people'], key=lambda q: -q['Z'])   # far to near: the page's drawing order
for q in people:
    if abs(q['Z'] - geo[q['id']]['Z']) > 1e-6: raise SystemExit(f"{q['name']}: the scene and the geometry disagree on depth")
A = {q['id']: person_alpha(q, first) for q in people}
same = {}
for key, ph in phones.items():   # the second phone puts them in the same place
    for q in ph['people']:
        a2 = person_alpha(q, ph); dd = np.abs(a2 - A[q['id']]).max(); same[f"{key} {q['name']}"] = round(float(dd), 3)
        if dd > 0.6: raise SystemExit(f"{q['name']} is not in the same place on {key}")
# ---- 4. the bands, by depth alone: a pixel's band is the number of people farther than it (the people go far to near). A
# person's own seat stays behind them: Juno's stool, in set 3.
def bands_of(piece, depth_set):
    band = np.zeros((H, W), np.int16)
    for i, q in enumerate(people):
        nearer = piece & (depth_set < q['Z']); band[nearer] = np.maximum(band[nearer], i + 1)
    return band
piece, piece_c = alpha > 0, alpha_c > 0
band, band_c = bands_of(piece, depth), bands_of(piece_c, depth_c)
conflict = np.zeros((H, W), bool); seated = {}
for i, q in enumerate(people):
    seat = geo[q['id']]['seat']
    if not seat: continue
    for pc, own_set, bd in ((piece, owner, band), (piece_c, owner_c, band_c)):
        m = pc & (own_set == seat) & (bd > i); conflict |= m & (bd > i + 1); bd[m] = i
        if m.any(): seated[seat] = seated.get(seat, 0) + int(m.sum())
# Atlas's bench (the In-game animation builder's report and the Lead's order, 18 November): the wall step 2 re-painted above the
# bench top's painted back edge, carried in the bench's layer, is wall: drawn behind every person (band 0). bench8e.py finds the
# edge and the things standing on the bench, which stay in front (bench-E.json: the strip as row runs, its mask's sha256)
BW = json.load(open(P('bench-E.json'))); wall_strip = np.zeros((H, W), bool)
for y, x0, x1 in BW['strip']['runs']: wall_strip[y, x0:x1 + 1] = True
if hashlib.sha256(np.packbits(wall_strip).tobytes()).hexdigest() != BW['strip']['maskSha256'] or BW['layer']['sha256'] != hashlib.sha256(open(P(BW['layer']['file']), 'rb').read()).hexdigest(): raise SystemExit('bench-E.json is not this layer\'s')
ws = wall_strip & piece & (owner == 'D bench')
if int(ws.sum()) != BW['strip']['px']: raise SystemExit('the strip is not all in the bench\'s layer')
bench_wall = {'record': 'bench-E.json', 'sha256': hashlib.sha256(open(P('bench-E.json'), 'rb').read()).hexdigest(), 'px': int(ws.sum()),
              'fromBands': {str(int(b)): int((band[ws] == b).sum()) for b in np.unique(band[ws])}, 'toBand': 0}
band[ws] = 0
# where step 3 painted over a furniture pixel, the stool's pixel goes no lower than that furniture pixel's band (it is drawn
# just after it, as the rebuild draws step 3 over step 2)
under = piece & piece_c & (band_c < band)
raised = {'px': int(under.sum())}
if under.any():
    ys, xs = np.where(under); raised.update({'x': [int(xs.min()), int(xs.max())], 'y': [int(ys.min()), int(ys.max())],
        'over': sorted({s for s in owner[under] if s}), 'fromBands': sorted({int(b) for b in band_c[under]}), 'toBands': sorted({int(b) for b in band[under]}),
        'stoolOpaquePx': int((alpha_c[under] == 1).sum()), 'furnitureOpaquePx': int((alpha[under] == 1).sum())})
    band_c[under] = band[under]
stool_under = piece & piece_c & (band_c < band)   # none left: checked
if stool_under.any(): raise SystemExit('a stool pixel is still under the furniture pixel beneath it')
for f in os.listdir(D):
    if (f.startswith('band-') or f.startswith('stool-')) and f.endswith('.png'): os.remove(os.path.join(D, f))
# Under each band, a seam fill: the nearer bands' fully opaque pixels of the same set within 2 px of it, in their own colours.
# Their own band draws them again on top, so the order is unchanged; the fill closes the seam the browser's scaling would open
# where one piece is split between two layers.
def write_bands(piece_set, band_set, alpha_set, rgb_set, owner_set, prefix):
    out = []; a8all = np.rint(alpha_set * 255).astype(np.uint8)
    for b in range(len(people) + 1):
        m = piece_set & (band_set == b)
        if not m.any(): continue
        fill = grow(m, 2) & piece_set & (band_set > b) & (a8all == 255)
        a8 = np.where(m | fill, a8all, 0).astype(np.uint8); rgba = np.dstack([(rgb_set * (a8 > 0)[..., None]).astype(np.uint8), a8]); f = f'{prefix}-{b}.png'   # no colour under alpha 0
        Image.fromarray(rgba, 'RGBA').save(os.path.join(D, f), optimize=True)
        out.append({'band': b, 'file': f, 'after': [q['id'] for q in people[:b]], 'before': [q['id'] for q in people[b:]], 'px': int(m.sum()), 'seamFillPx': int(fill.sum()), 'stations': sorted({s for s in owner_set[m] if s})})
    return out
bands = write_bands(piece, band, alpha, layer_rgb, owner, 'band'); sbands = write_bands(piece_c, band_c, alpha_c, layer_rgb_c, owner_c, 'stool')
# a person's 'front' element (a figure's part drawn over their own station where it is nearer than them, such as hands on their
# work surface; the Lead, 18 November) goes just above the highest band that holds their own station's nearer pixels; a seat
# is not counted
fronts = {}
for i, q in enumerate(people):
    own = piece & np.isin(owner, [s for s in reach if s.split(' ')[0] == q['place'] and s != geo[q['id']]['seat']]) & (band > i)
    if own.any(): fronts[q['id']] = int(band[own].max())
order = []
for b in range(len(people) + 1):
    if any(x['band'] == b for x in bands): order.append(f'band-{b}')
    if any(x['band'] == b for x in sbands): order.append(f'stool-{b}')
    order += [f'{pid} front' for pid, fb in fronts.items() if fb == b]
    if b < len(people): order.append(people[b]['id'])
fronts = {pid: f'band-{b}' for pid, b in fronts.items()}
# the plate with every layer file over it in the order (the page without the people), against the four layers over the plate
# (the furniture, then the stool), and against PV6-E-4; and the furniture bands alone against PV6-E-3
files_in_order = [f'{x}.png' for x in order if x.startswith('band-') or x.startswith('stool-')]
def over_plate(files):
    comp = start.astype(np.float64)
    for f in files:
        L = np.array(Image.open(os.path.join(D, f) if not f.startswith('/') else f).convert('RGBA')).astype(np.float64); a = L[..., 3:] / 255; comp = L[..., :3] * a + comp * (1 - a)
    return np.clip(np.rint(comp), 0, 255).astype(int)
by_bands = over_plate(files_in_order)
by_layers = over_plate([P(v['file']) for v in PIC['layers']['pieces'].values()] + [P(v['file']) for v in PIC['layers3']['pieces'].values()])
by_bands2 = over_plate([x['file'] for x in bands]); by_layers2 = over_plate([P(v['file']) for v in PIC['layers']['pieces'].values()])
dp = np.abs(by_bands - placed.astype(int)).max(axis=2); dp2 = np.abs(by_bands2 - placed2.astype(int)).max(axis=2)
if under.any():   # the raised pixels against PV6-E-4: as drawn, and as they would be with the furniture's layer over the stool's
    swapped = over_plate([P(v['file']) for v in PIC['layers3']['pieces'].values()] + [P(v['file']) for v in PIC['layers']['pieces'].values()])
    ds = np.abs(swapped - placed.astype(int)).max(axis=2)
    raised['againstPV6E4'] = {'asDrawn': {'meanAbsDiff': round(float(dp[under].mean()), 2), 'max': int(dp[under].max()), 'over16Px': int((dp[under] > 16).sum())},
                              'furnitureOverTheStool': {'meanAbsDiff': round(float(ds[under].mean()), 2), 'max': int(ds[under].max()), 'over16Px': int((ds[under] > 16).sum())}}
check = {'bandsAgainstLayers': {'maxAbsDiff': int(np.abs(by_bands - by_layers).max()), 'furnitureOnly': int(np.abs(by_bands2 - by_layers2).max())},
         'againstPlaced': {'meanAbsDiff': round(float(dp.mean()), 4), 'p99': float(np.percentile(dp, 99)), 'max': int(dp.max()), 'measure': 'the largest of |R|, |G|, |B| per pixel, over the whole picture'},
         'furnitureAgainstPV6E3': {'meanAbsDiff': round(float(dp2.mean()), 4), 'p99': float(np.percentile(dp2, 99))},
         'seatBehindItsOwnerPx': seated, 'stoolRaisedOverTheFurniture': raised, 'stoolUnderTheFurniturePx': int(stool_under.sum()),
         'pv6e3AgainstPv6e4UnderTheFurniture': step3_outside, 'sameOnBothPhones': same}
# ---- 5. per person: what hides them, their drawing, box, face and press area (moved onto their visible part if a piece hides it)
def square(c, side): return (c[0] - side / 2, c[1] - side / 2, c[0] + side / 2, c[1] + side / 2)
yy, xx = np.mgrid[0:H, 0:W]
def in_rect(r): return (xx + 0.5 >= r[0]) & (xx + 0.5 < r[2]) & (yy + 0.5 >= r[1]) & (yy + 0.5 < r[3])
report = {}
for i, q in enumerate(people):
    a = A[q['id']]; c2 = alpha * (piece & (band > i)); c3 = alpha_c * (piece_c & (band_c > i)); cov = 1 - (1 - c2) * (1 - c3); hid = a * cov; tot = a.sum(); k = first['k']
    by = {s: round(float((a * c2 * (owner == s)).sum() / tot), 4) for s in reach if (a * c2 * (owner == s)).sum() > 0.5}
    by.update({s: round(float((a * c3 * (owner_c == s)).sum() / tot), 4) for s in reach_c if (a * c3 * (owner_c == s)).sum() > 0.5})
    hx, hy = toP(first, q['head']); hr = q['headR'] * k; face = ((xx + 0.5 - hx) ** 2 + (yy + 0.5 - hy) ** 2) <= hr * hr
    b0, b1 = toP(first, q['box'][:2]), toP(first, q['box'][2:]); bx = in_rect((*b0, *b1)); lower = in_rect((b0[0], (b0[1] + b1[1]) / 2, b1[0], b1[1]))
    sq = in_rect(square(toP(first, q['press']), q['side'] * k)); sqHidden = float((cov * sq).sum() / sq.sum())
    centreHidden = float(cov[int(toP(first, q['press'])[1]), int(toP(first, q['press'])[0])])
    ovl = {}
    for st, own_set, dep in [(s, owner, depth) for s in reach] + [(s, owner_c, depth_c) for s in reach_c]:
        ov = (own_set == st) & (a > 0.02)
        if ov.any():
            nr = ov & (dep < q['Z']); ovl[st] = {'px': int(ov.sum()), 'nearerPx': int(nr.sum()), 'depthM': [round(float(dep[ov].min()), 2), round(float(dep[ov].max()), 2)],
                'drawn': 'behind them: their seat' if st == geo[q['id']]['seat'] else ('in front where nearer' if nr.any() else 'behind them')}
    rec = {'name': q['name'], 'Z': q['Z'], 'seat': geo[q['id']]['seat'], 'overlaps': ovl, 'inFrontOfThem': by, 'hiddenShare': round(float(hid.sum() / tot), 4),
           'boxShare': round(float((cov * bx).sum() / bx.sum()), 4), 'lowerShare': round(float((cov * lower).sum() / lower.sum()), 4),
           'faceHidden': round(float((cov * face).sum() / face.sum()), 4), 'pressHiddenShare': round(sqHidden, 4), 'pressCentreHidden': round(centreHidden, 3)}
    if sqHidden > 0.25 or centreHidden > 0.5:   # move it onto the visible part: the square over the most of the person still seen
        vis = a * (1 - cov); side = q['side'] * k; best = None; x0, y0 = toP(first, q['press'])
        for cy in np.arange(y0 - 2 * side, y0 + 2 * side + 1, 2):
            for cx in np.arange(x0 - 2 * side, x0 + 2 * side + 1, 2):
                r = square((cx, cy), side); xa, ya, xb, yb = max(0, int(r[0])), max(0, int(r[1])), min(W, int(r[2])), min(H, int(r[3]))
                if xb <= xa or yb <= ya: continue
                v = vis[ya:yb, xa:xb].sum() - 0.001 * np.hypot(cx - x0, cy - y0)
                if best is None or v > best[0]: best = (v, cx, cy)
        rec['pressMoved'] = {key: [round((best[1] - ph['slice']['x0']) / ph['k'], 1), round((best[2] - ph['slice']['y0']) / ph['k'], 1)] for key, ph in phones.items()}
        rec['pressMovedHiddenShare'] = round(float((cov * in_rect(square((best[1], best[2]), side))).sum() / in_rect(square((best[1], best[2]), side)).sum()), 4)
    report[q['id']] = rec
out = {'view': G['view'], 'layers': "the records page's layers (picture.json), by the Lead's recipe: " + PIC['layers']['recipe'] + '; the furniture from PV6-E-3 over PV6-E-1, Juno\'s stool from PV6-E-4 over PV6-E-3',
       'camera': "straight lines: d = forward + u right + v up; depth along the camera's axis",
       'rule': "by depth alone: each pixel after every person farther than it; a seat stays behind its owner; the stool's bands each just after the furniture band of the same number, and a stool pixel painted over a furniture pixel never under it; the wall step 2 re-painted above the bench top's painted back edge, in the bench's layer, behind every person (band 0)",
       'benchWallStrip': bench_wall,
       'parts': parts, 'depthHits': src, 'people': [{'id': q['id'], 'name': q['name'], 'Z': q['Z']} for q in people], 'order': order, 'fronts': fronts, 'bands': bands, 'stoolBands': sbands,
       'conflictPx': int(conflict.sum()), 'check': check, 'report': report, 'tags': "drawn above every layer (the page's overlay)"}
json.dump(out, open(os.path.join(D, 'occlusion.json'), 'w'), indent=1)
print(json.dumps({k: out[k] for k in ('depthHits', 'order', 'fronts', 'bands', 'stoolBands', 'conflictPx', 'check', 'report')}, indent=1))
