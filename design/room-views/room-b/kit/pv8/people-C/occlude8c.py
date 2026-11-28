# View C's furniture placed by code (occlude8e.py, view E's, for Lyra's view on sheet PV6-C version 8), by depth alone. Two sets of
# layers from the records page: the three furniture pieces lifted from PV6-C-3 (step 2) over the plate PV6-C-2, and step 3's four
# pieces lifted from PV6-C-4 over PV6-C-3: the food capsule on Atlas's bench, Juno's stool, and the two vent strips at the foot of
# the back wall. Each pixel's depth is where a ray from the painting's camera through the pixel's centre enters its piece's solids,
# as the distance along the camera's axis (pixels the solids miss, at the painted edges, take their neighbours' depth); a person's
# depth is the same distance to where they stand. Each pixel of a piece is drawn once, in a band between the people: after every
# person farther than it and before every person nearer (the Lead's approval of 18 November). The stool is Juno's seat, so its
# pixels stay behind Juno (the seat rule). The vent strips are wall: behind everyone (band 0). Step 3's pieces have their own band
# files (wall-<b>, stool-<b>, capsule-<b>.png), each drawn just after the furniture band of the same number, and a step-3 pixel
# painted over a furniture pixel never goes into a lower band than it. Step 4 (sheet C version 8: the jars' tops and the
# dispenser's left edge) joins when its picture passes: then its parts, lifted from PV6-C-5 over PV6-C-4, take the depth of the
# piece each belongs to (the jars' tops the cart's, the edge the capsule's) and go in their own band files (fix-<b>.png), each just
# after step 3's of the same band and never under a pixel it was painted over. Where edge4-C.json exists (edge4c.py; the Lead, 18
# November), the dispenser's left edge, which the edit did not fix, is drawn by code, opaque, in its own band file just after the
# capsule's (fix-<b>.png; the Lead, 19:01), so the capsule's layer stays as it was. Writes the bands as full-size RGBA layers and occlusion.json: the order,
# and per person the pieces in front of them and the share of their drawing, box, face and press area hidden.
# Generates nothing. Usage: python3 -I occlude8c.py
import hashlib, json, os, numpy as np
from PIL import Image, ImageFilter, ImageOps
D = os.path.dirname(os.path.abspath(__file__)); P = lambda p: os.path.normpath(os.path.join(D, p))
PIC = json.load(open(P('picture.json'))); G = json.load(open(P('_geo-C.json'))); S = json.load(open(P('scene.json')))
rgb = lambda p: np.array(Image.open(P(p)).convert('RGB'))
start, placed2, placed3, placed = rgb(PIC['plate']['file']), rgb(PIC['placed2']['file']), rgb(PIC['placed3']['file']), rgb(PIC['placed']['file']); H, W = start.shape[:2]
def img(a): return Image.fromarray((a * 255).astype(np.uint8))
def grow(a, r): return np.array(img(a).filter(ImageFilter.MaxFilter(2 * r + 1))) > 0
ST = {f"{p['place']} {p['name']}": p for p in json.load(open(P('../pieces8-C.json')))}
smap = np.array(Image.open(P('../pv6-C-stations.png')).convert('L')).astype(int)
WALL = ('wall vent strip left', 'wall vent strip right')   # step 3's strips: wall, no station
# ---- 1. the layers: set 2, the furniture (checked against PV6-C-3), and set 3, step 3's four pieces (checked against PV6-C-4)
def load_set(pieces, against, name):
    alpha = np.zeros((H, W)); owner = np.full((H, W), '', dtype=object); reach = {}; parts = []; layer_rgb = np.zeros((H, W, 3))
    for s, piece in pieces.items():
        L = np.array(Image.open(P(piece['file'])).convert('RGBA')); a = L[..., 3].astype(np.float64) / 255; m = a > 0
        if (np.abs(L[..., :3][m].astype(int) - against[m].astype(int)).max() if m.any() else 0) != 0: raise SystemExit(f"{s}: its colours are not {name}'s")
        if (owner[m] != '').any(): raise SystemExit(f'{s} meets another piece of its set: split them by their outlines first')
        alpha[m] = a[m]; owner[m] = s; reach[s] = m; layer_rgb[m] = L[..., :3][m]
        ys, xs = np.where(m)
        if s not in ST:   # the strips have no station outline
            parts.append({'station': s, 'file': os.path.basename(piece['file']), 'from': name, 'px': int(m.sum()), 'x': [int(xs.min()), int(xs.max())], 'y': [int(ys.min()), int(ys.max())]}); continue
        outline = np.abs(smap - ST[s]['grey']) <= 2; oys, oxs = np.where(outline)
        cx, cy = float((a * np.indices((H, W))[1]).sum() / a.sum()), float((a * np.indices((H, W))[0]).sum() / a.sum())
        parts.append({'station': s, 'file': os.path.basename(piece['file']), 'from': name, 'px': int(m.sum()), 'x': [int(xs.min()), int(xs.max())], 'y': [int(ys.min()), int(ys.max())],
                      'inItsOutline': round(float((m & grow(outline, 6)).sum() / m.sum()), 4), 'outlineCovered': round(float((m & outline).sum() / outline.sum()), 4),
                      'iouWithOutline': round(float((m & outline).sum() / (m | outline).sum()), 4),
                      'offPlan': {'left': int(xs.min() - oxs.min()), 'right': int(xs.max() - oxs.max()), 'top': int(ys.min() - oys.min()), 'bottom': int(ys.max() - oys.max()),
                                  'centre': [round(cx - float(oxs.mean()), 1), round(cy - float(oys.mean()), 1)]}})
    return alpha, owner, reach, parts, layer_rgb
alpha, owner, reach, parts2, layer_rgb = load_set(PIC['layers']['pieces'], placed2, 'PV6-C-3')
alpha_c, owner_c, reach_c, parts3, layer_rgb_c = load_set(PIC['layers3']['pieces'], placed3, 'PV6-C-4')
parts = parts2 + parts3
# step 4 (sheet C version 9; the Lead, 18 November): a fix over PV6-C-4, the three jars' tops on the cart and the dispenser's left
# edge, lifted from PV6-C-5 over PV6-C-4 (lift4 C; the edge by lift5's recipe within its own shape, without its 400 px floor, where
# lift4 listed it as too small: step4c.py). Each part belongs to a piece of the earlier steps, whose depth it takes
S4 = 'layers4' in PIC
PARENT = {'B coral jar top': 'B laptop cart', 'B bead jar top': 'B laptop cart', 'B flask top': 'B laptop cart', 'D dispenser left edge': 'D food capsule'}
if S4:
    placed4 = rgb(PIC['placed4']['file'])
    alpha_f, owner_f, reach_f, parts4, layer_rgb_f = load_set(PIC['layers4']['pieces'], placed4, 'PV6-C-5')
    parts += parts4
# away from step 3's mask (its four shapes, then their 2 px feather), PV6-C-4 is PV6-C-3, so the furniture layers hold PV6-C-4's
# colours wherever step 3 did not paint: measured under the furniture outside that mask grown 6 px
place3 = np.array(Image.open(P('../pub-C/img/pv6-C-place3.png')).convert('L')) > 127
d23 = np.abs(placed2.astype(int) - placed3.astype(int)).max(axis=2); away = (alpha > 0) & ~grow(place3, 6)
step3_outside = {'furniturePx': int(away.sum()), 'differingPx': int((d23[away] > 0).sum()), 'maxAbsDiff': int(d23[away].max()) if away.any() else 0}
if step3_outside['maxAbsDiff'] > 2: raise SystemExit(f'PV6-C-3 and PV6-C-4 differ under the furniture away from step 3: {step3_outside}')
if S4:   # away from step 4's mask (its four shapes, then their 2 px feather), PV6-C-5 is PV6-C-4 everywhere
    place4 = np.array(Image.open(P('../pub-C/img/pv6-C-place4.png')).convert('L')) > 127
    d34 = np.abs(placed3.astype(int) - placed4.astype(int)).max(axis=2); away4 = ~grow(place4, 6)
    step4_outside = {'px': int(away4.sum()), 'differingPx': int((d34[away4] > 0).sum()), 'maxAbsDiff': int(d34[away4].max())}
    if step4_outside['maxAbsDiff'] > 2: raise SystemExit(f'PV6-C-4 and PV6-C-5 differ away from step 4: {step4_outside}')
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
        if s in WALL: src[s] = {'hit': 0, 'pixels': int(r.sum()), 'depthM': 'wall: behind everyone'}; continue   # no depth: band 0
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
if S4:   # step 4's parts: their own piece's solids where the ray meets them, else the nearest known depth, seeded by that piece's
    # pixels in the earlier sets (the jars' tops rise above the cart's solids, so they take the depth of the jars' lower halves)
    depth_f = np.full((H, W), np.nan)
    for s, r in reach_f.items():
        st = PARENT[s]; dz = depth_of(st, r); known = np.isfinite(dz) & r; src[s] = {'hit': int(known.sum()), 'pixels': int(r.sum()), 'of': st}
        seed = ((owner == st) & np.isfinite(depth)) | ((owner_c == st) & np.isfinite(depth_c)); sd = np.where(owner == st, depth, depth_c)
        work = np.where(known, dz, np.where(seed & ~r, sd, np.nan))
        ys, xs = np.where(r); y0, y1, x0, x1 = max(0, ys.min() - 8), min(H, ys.max() + 9), max(0, xs.min() - 8), min(W, xs.max() + 9)
        w = work[y0:y1, x0:x1].copy(); kn = np.isfinite(w); rr = r[y0:y1, x0:x1]; h_, w_ = w.shape
        for _ in range(200):
            todo = rr & ~kn
            if not todo.any(): break
            pad = np.pad(np.where(kn, w, np.inf), 1, constant_values=np.inf)
            nb = np.min(np.stack([pad[1 + dy:1 + dy + h_, 1 + dx:1 + dx + w_] for dy in (-1, 0, 1) for dx in (-1, 0, 1)]), axis=0)
            fill = todo & np.isfinite(nb); w[fill] = nb[fill]; kn |= fill
        if (rr & ~kn).any(): raise SystemExit(f'{s}: {int((rr & ~kn).sum())} px with no depth')
        work[y0:y1, x0:x1] = w; depth_f[r] = work[r]; src[s]['depthM'] = [round(float(np.nanmin(work[r])), 2), round(float(np.nanmax(work[r])), 2)]
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
bench_wall = None
if os.path.exists(P(f"bench-{G['view']}.json")):
    BW = json.load(open(P(f"bench-{G['view']}.json"))); wall_strip = np.zeros((H, W), bool)
    for y, x0, x1 in BW['strip']['runs']: wall_strip[y, x0:x1 + 1] = True
    if hashlib.sha256(np.packbits(wall_strip).tobytes()).hexdigest() != BW['strip']['maskSha256'] or BW['layer']['sha256'] != hashlib.sha256(open(P(BW['layer']['file']), 'rb').read()).hexdigest(): raise SystemExit('the bench record is not this layer\'s')
    ws = wall_strip & piece & (owner == 'D bench')
    if int(ws.sum()) != BW['strip']['px']: raise SystemExit('the strip is not all in the bench\'s layer')
    bench_wall = {'record': f"bench-{G['view']}.json", 'sha256': hashlib.sha256(open(P(f"bench-{G['view']}.json"), 'rb').read()).hexdigest(), 'px': int(ws.sum()),
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
if S4:   # step 4's bands by depth, then never under what step 4 painted over: the earlier sets' pixels beneath it
    piece_f = alpha_f > 0; band_f = bands_of(piece_f, depth_f)
    lo = np.maximum(np.where(piece & piece_f, band, 0), np.where(piece_c & piece_f, band_c, 0))
    raised4 = {'px': int((piece_f & (band_f < lo)).sum())}; band_f = np.where(piece_f, np.maximum(band_f, lo), band_f)
    step4_bands = {s: {'bands': sorted({int(b) for b in band_f[reach_f[s]]}), 'of': PARENT[s],
                       'itsPieceBands': sorted({int(b) for b in band[piece & (owner == PARENT[s])]} | {int(b) for b in band_c[piece_c & (owner_c == PARENT[s])]})} for s in reach_f}
for f in os.listdir(D):
    if f.split('-')[0] in ('band', 'stool', 'capsule', 'wall', 'fix') and f.endswith('.png') and f.split('-')[-1][:-4].isdigit(): os.remove(os.path.join(D, f))
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
# the dispenser's left edge, drawn by code (edge4c.py, edge4-C.json; the Lead, 18 November): the guide's own line and housing
# colour, opaque, at the capsule's band, in step 4's own file for that band, drawn just after the capsule's (the Lead, 19:01), so
# the capsule's layer stays byte for byte
EF = P('edge4-C.json'); EDGE = json.load(open(EF)) if os.path.exists(EF) else None; ES = 'D dispenser left edge'
if EDGE:
    if not S4: raise SystemExit('the code-drawn edge belongs to step 4: picture.json has no layers4')
    cap = piece_c & (owner_c == 'D food capsule'); cb = sorted({int(b) for b in band_c[cap]})
    if len(cb) != 1: raise SystemExit(f'the capsule is in more than one band: {cb}')
    edge = np.zeros((H, W), bool); edge_rgb = np.zeros((H, W, 3))
    for part in ('line', 'housing'):
        e = EDGE[part]; (c0, c1), (r0, r1) = e['columns'], e['rows']; edge[r0:r1 + 1, c0:c1 + 1] = True; edge_rgb[r0:r1 + 1, c0:c1 + 1] = e['rgb']
    if (edge & piece_c & (owner_c != 'D food capsule')).any(): raise SystemExit('the edge would cover another piece of step 3')
    if (edge & piece & (band > cb[0])).any() or (edge & piece_c & (band_c > cb[0])).any(): raise SystemExit('the edge would be drawn under a nearer band')
    if (edge & piece_f).any(): raise SystemExit('the edge meets a lifted part of step 4')
    new = edge & ~cap; dmed = float(np.nanmedian(depth_c[cap]))
    alpha_f[edge] = 1.0; layer_rgb_f[edge] = edge_rgb[edge]; owner_f[edge] = ES; band_f[edge] = cb[0]; depth_f[edge] = dmed; piece_f = alpha_f > 0; reach_f[ES] = edge
    src[ES] = {'hit': 0, 'pixels': int(edge.sum()), 'of': 'D food capsule', 'depthM': [round(dmed, 2), round(dmed, 2)], 'drawnBy': 'code (edge4-C.json): at the capsule\'s median depth'}
    ys, xs = np.where(edge); parts.append({'station': ES, 'file': 'edge4-C.json', 'from': 'code', 'px': int(edge.sum()), 'x': [int(xs.min()), int(xs.max())], 'y': [int(ys.min()), int(ys.max())]})
    step4_bands[ES] = {'bands': [cb[0]], 'of': 'D food capsule', 'itsPieceBands': cb, 'drawnBy': 'code'}
bands = write_bands(piece, band, alpha, layer_rgb, owner, 'band')
KIND = {'stool': piece_c & (owner_c == 'B stool'), 'capsule': piece_c & (owner_c == 'D food capsule'), 'wall': piece_c & np.isin(owner_c, WALL)}
assert not (piece_c & ~(KIND['stool'] | KIND['capsule'] | KIND['wall'])).any(), 'a step-3 piece of no kind'
kbands = {k: write_bands(m, band_c, alpha_c, layer_rgb_c, owner_c, k) for k, m in KIND.items()}; sbands = kbands['stool']
if S4: kbands['fix'] = write_bands(piece_f, band_f, alpha_f, layer_rgb_f, owner_f, 'fix')   # step 4: its own files, after step 3's
if EDGE:
    ff, cf = f'fix-{cb[0]}.png', f'capsule-{cb[0]}.png'; hsh = lambda f: hashlib.sha256(open(os.path.join(D, f), 'rb').read()).hexdigest()
    EDGE.pop('layer', None)
    EDGE['layer'] = {'file': ff, 'band': cb[0], 'sha256': hsh(ff), 'drawnAfter': cf, 'capsuleLayerSha256': hsh(cf), 'capsuleLayerUnchanged': True,
                     'drawnPx': int(edge.sum()), 'overTheCapsulesLiftPx': int((edge & cap).sum()), 'newPx': int(new.sum()),
                     'how': "its own band file, opaque, drawn just after the capsule's, which stays byte for byte (the Lead, 18 November, 19:01)"}
    json.dump(EDGE, open(EF, 'w'), indent=1)
# a person's 'front' element (a figure's part drawn over their own station where it is nearer than them, such as hands on their
# work surface; the Lead, 18 November) goes just above the highest band that holds their own station's nearer pixels; a seat
# is not counted
fronts = {}
for i, q in enumerate(people):
    own = piece & np.isin(owner, [s for s in reach if s.split(' ')[0] == q['place'] and s != geo[q['id']]['seat']]) & (band > i)
    if own.any(): fronts[q['id']] = int(band[own].max())
order = []
for b in range(len(people) + 1):
    if any(x['band'] == b for x in kbands['wall']): order.append(f'wall-{b}')
    if any(x['band'] == b for x in bands): order.append(f'band-{b}')
    for k in ('stool', 'capsule', 'fix'):
        if any(x['band'] == b for x in kbands.get(k, [])): order.append(f'{k}-{b}')
    order += [f'{pid} front' for pid, fb in fronts.items() if fb == b]
    if b < len(people): order.append(people[b]['id'])
fronts = {pid: f'band-{b}' for pid, b in fronts.items()}
# the plate with every layer file over it in the order (the page without the people), against the four layers over the plate
# (the furniture, then step 3's), and against the picture the bands rebuild (picture.json's placed); and the furniture bands alone against PV6-C-3
files_in_order = [f'{x}.png' for x in order if x.split('-')[0] in ('band', 'stool', 'capsule', 'wall', 'fix')]
def over_plate(files):
    comp = start.astype(np.float64)
    for f in files:
        L = np.array(Image.open(os.path.join(D, f) if not f.startswith('/') else f).convert('RGBA')).astype(np.float64); a = L[..., 3:] / 255; comp = L[..., :3] * a + comp * (1 - a)
    return np.clip(np.rint(comp), 0, 255).astype(int)
by_bands = over_plate(files_in_order)
if EDGE:   # the code-drawn edge as a layer of its own, over step 3's layers, for the check
    Image.fromarray(np.dstack([(edge_rgb * edge[..., None]).astype(np.uint8), (edge * 255).astype(np.uint8)]), 'RGBA').save(os.path.join(D, '_edge4-layer.png'))
by_layers = over_plate([P(v['file']) for v in PIC['layers']['pieces'].values()] + [P(v['file']) for v in PIC['layers3']['pieces'].values()] + ([os.path.join(D, '_edge4-layer.png')] if EDGE else []) + ([P(v['file']) for v in PIC['layers4']['pieces'].values()] if S4 else []))
if EDGE: os.remove(os.path.join(D, '_edge4-layer.png'))
by_bands2 = over_plate([x['file'] for x in bands]); by_layers2 = over_plate([P(v['file']) for v in PIC['layers']['pieces'].values()])
dp = np.abs(by_bands - placed.astype(int)).max(axis=2); dp2 = np.abs(by_bands2 - placed2.astype(int)).max(axis=2)
if under.any():   # the raised pixels against the rebuilt picture: as drawn, and as they would be with the furniture's layer over step 3's
    swapped = over_plate([P(v['file']) for v in PIC['layers3']['pieces'].values()] + [P(v['file']) for v in PIC['layers']['pieces'].values()])
    ds = np.abs(swapped - placed.astype(int)).max(axis=2)
    raised['againstPlaced'] = {'asDrawn': {'meanAbsDiff': round(float(dp[under].mean()), 2), 'max': int(dp[under].max()), 'over16Px': int((dp[under] > 16).sum())},
                              'furnitureOverStep3': {'meanAbsDiff': round(float(ds[under].mean()), 2), 'max': int(ds[under].max()), 'over16Px': int((ds[under] > 16).sum())}}
check = {'bandsAgainstLayers': {'maxAbsDiff': int(np.abs(by_bands - by_layers).max()), 'furnitureOnly': int(np.abs(by_bands2 - by_layers2).max())},
         'againstPlaced': {'meanAbsDiff': round(float(dp.mean()), 4), 'p99': float(np.percentile(dp, 99)), 'max': int(dp.max()), 'measure': 'the largest of |R|, |G|, |B| per pixel, over the whole picture'},
         'furnitureAgainstStep2': {'meanAbsDiff': round(float(dp2.mean()), 4), 'p99': float(np.percentile(dp2, 99))},
         'seatBehindItsOwnerPx': seated, 'step3RaisedOverTheFurniture': raised, 'step3UnderTheFurniturePx': int(stool_under.sum()),
         'step2AgainstStep3UnderTheFurniture': step3_outside, 'sameOnBothPhones': same}
if EDGE: check['edge4'] = {'record': 'edge4-C.json', **{k: EDGE['layer'][k] for k in ('file', 'band', 'drawnPx', 'overTheCapsulesLiftPx', 'newPx', 'sha256', 'drawnAfter', 'capsuleLayerSha256')}}
if S4:   # step 4: its bands, what it was raised over, PV6-C-5 against PV6-C-4 away from it, and the hatch's face and the glass untouched
    gy, gx = np.mgrid[0:H, 0:W]; hb = PIC['hatch']['painted']['bbox']; face = (gx >= hb[0]) & (gx <= hb[2]) & (gy >= hb[1]) & (gy <= hb[3])
    gc, gr = PIC['glass']['centre'], PIC['glass']['radius']; disc = (gx - gc[0]) ** 2 + (gy - gc[1]) ** 2 <= gr * gr   # pixel centres, the centre's too
    sp4 = np.array(Image.open(P('../pub-C/img/pv6-C-split4.png')).convert('L')); jars4, edge4 = np.isin(sp4, [140, 160, 180]), sp4 == 240
    region = lambda m: {'px': int(m.sum()), 'meanAbsDiff': round(float(dp[m].mean()), 4), 'p99': float(np.percentile(dp[m], 99)), 'max': int(dp[m].max())}
    check['againstPlacedByRegion'] = {'jarsShapes': region(jars4), 'edgeShape': region(edge4), 'elsewhere': region(~(jars4 | edge4)),
                                      'note': "against PV6-C-5: in the edge's shape the code draws the guide's edge where the edit left soft streaks"}
    check['step4'] = {'bands': step4_bands, 'raisedOverEarlierPx': raised4['px'], 'step3AgainstStep4AwayFromIt': step4_outside,
                      'hatchFace': {'px': int(face.sum()), 'differingPx': int((d34[face] > 0).sum())}, 'glass': {'px': int(disc.sum()), 'differingPx': int((d34[disc] > 0).sum())}}
    def face_rule(c):   # hatch8c.py's face rule (fix8.py's): the face's corners in a picture
        lum = 0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2]
        frame = next(y for y in range(805, 867) if np.median(lum[y, 615:651]) < 60); rows = [y for y in range(frame, 867) if np.median(lum[y, 615:651]) > 140]; lefts, rights = [], []
        for y in range(rows[0], rows[-1] + 1):
            hi = float(np.median(lum[y, 613:617])); hit = np.where(lum[y, 609:617] > (min(lum[y, 609], lum[y, 610]) + hi) / 2)[0]
            lefts.append(int(hit[0]) + 609 if len(hit) else 617); rights.append(650 + int(np.argmin(lum[y, 650:659])) - 1)
        return [int(np.median(lefts)), rows[0], int(np.median(rights)), rows[-1]]
    fr3, fr4 = face_rule(placed3.astype(float)), face_rule(placed4.astype(float))
    check['step4']['hatchFace'].update({'faceRuleBbox': {'PV6-C-4': fr3, 'PV6-C-5': fr4}, 'sameCorners': fr3 == fr4 == list(PIC['hatch']['painted']['bbox'])})
# ---- 5. per person: what hides them, their drawing, box, face and press area (moved onto their visible part if a piece hides it)
def square(c, side): return (c[0] - side / 2, c[1] - side / 2, c[0] + side / 2, c[1] + side / 2)
yy, xx = np.mgrid[0:H, 0:W]
def in_rect(r): return (xx + 0.5 >= r[0]) & (xx + 0.5 < r[2]) & (yy + 0.5 >= r[1]) & (yy + 0.5 < r[3])
report = {}
for i, q in enumerate(people):
    a = A[q['id']]; c2 = alpha * (piece & (band > i)); c3 = alpha_c * (piece_c & (band_c > i)); c4 = alpha_f * (piece_f & (band_f > i)) if S4 else 0
    cov = 1 - (1 - c2) * (1 - c3) * (1 - c4); hid = a * cov; tot = a.sum(); k = first['k']
    by = {s: round(float((a * c2 * (owner == s)).sum() / tot), 4) for s in reach if (a * c2 * (owner == s)).sum() > 0.5}
    by.update({s: round(float((a * c3 * (owner_c == s)).sum() / tot), 4) for s in reach_c if (a * c3 * (owner_c == s)).sum() > 0.5})
    if S4: by.update({s: round(float((a * c4 * (owner_f == s)).sum() / tot), 4) for s in reach_f if (a * c4 * (owner_f == s)).sum() > 0.5})
    hx, hy = toP(first, q['head']); hr = q['headR'] * k; face = ((xx + 0.5 - hx) ** 2 + (yy + 0.5 - hy) ** 2) <= hr * hr
    b0, b1 = toP(first, q['box'][:2]), toP(first, q['box'][2:]); bx = in_rect((*b0, *b1)); lower = in_rect((b0[0], (b0[1] + b1[1]) / 2, b1[0], b1[1]))
    sq = in_rect(square(toP(first, q['press']), q['side'] * k)); sqHidden = float((cov * sq).sum() / sq.sum())
    centreHidden = float(cov[int(toP(first, q['press'])[1]), int(toP(first, q['press'])[0])])
    ovl = {}
    for st, own_set, dep in [(s, owner, depth) for s in reach] + [(s, owner_c, depth_c) for s in reach_c] + ([(s, owner_f, depth_f) for s in reach_f] if S4 else []):
        ov = (own_set == st) & (a > 0.02)
        if ov.any() and st in WALL: ovl[st] = {'px': int(ov.sum()), 'drawn': 'behind them: wall'}; continue
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
out = {'view': G['view'], 'layers': "the records page's layers (picture.json), by the Lead's recipe: " + PIC['layers']['recipe'] + '; the furniture from PV6-C-3 over PV6-C-2, step 3\'s four pieces (the food capsule, Juno\'s stool, the two vent strips) from PV6-C-4 over PV6-C-3',
       'camera': "straight lines: d = forward + u right + v up; depth along the camera's axis",
       'rule': "by depth alone: each pixel after every person farther than it; a seat stays behind its owner; the vent strips are wall, behind everyone (band 0); step 3's bands each just after the furniture band of the same number, and a step-3 pixel painted over a furniture pixel never under it" + ("; step 4's parts at the depth of the piece each belongs to, their bands (fix-<b>) each just after step 3's of the same number, never under a pixel they were painted over" if S4 else ''),
       **({'layers4': "step 4's parts lifted from PV6-C-5 over PV6-C-4: " + ', '.join(f"the {k[2:]}" for k in PIC['layers4']['pieces'])
                      + ("; the dispenser's left edge did not take in that edit and is drawn by code in its own file, just after the capsule's (edge4-C.json)" if EDGE else '')} if S4 else {}),
       **({'benchWallStrip': bench_wall} if bench_wall else {}),
       'parts': parts, 'depthHits': src, 'people': [{'id': q['id'], 'name': q['name'], 'Z': q['Z']} for q in people], 'order': order, 'fronts': fronts, 'bands': bands, 'stoolBands': kbands['stool'], 'capsuleBands': kbands['capsule'], 'wallBands': kbands['wall'], **({'fixBands': kbands['fix']} if S4 else {}),
       'conflictPx': int(conflict.sum()), 'check': check, 'report': report, 'tags': "drawn above every layer (the page's overlay)"}
json.dump(out, open(os.path.join(D, 'occlusion.json'), 'w'), indent=1, allow_nan=False)
print(json.dumps({k: out[k] for k in ('depthHits', 'order', 'fronts', 'bands', 'stoolBands', 'capsuleBands', 'wallBands', 'conflictPx', 'check', 'report')}, indent=1))
