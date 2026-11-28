# Furniture placed by code for Room B test page v5 (PV6-A, Mira's view), by depth alone: the four layers lifted from PV6-A-3 inside its PLACE
# mask (the records page's files, each named by its station), drawn in front of or behind each person where they are nearer or
# farther. As version 4 (occlude5.py), with the straight-line camera of camera report v4: each pixel's depth is where a ray from
# the painting's camera through the pixel's centre, d = forward + u right + v up with u = (x + 0.5 - cx) / f and
# v = (hy - y - 0.5) / f, enters its station's solids, as the distance along the camera's axis (pixels the solids miss, at the
# painted edges, take their neighbours' depth); a person's depth is the same distance to where they stand (coverOn's measure).
# Each pixel of a piece is drawn once, in a band between the people: after every person farther than it and before every person
# nearer, whatever their pose (the Lead's approval of 18 November), so the order holds for figures that move; a person's own
# seat stays behind them (Juno's stool). Where a person's own station is nearer than them, the order marks where their figure's
# 'front' element goes (just above that band). Writes the bands as full-size RGBA layers (the plate's size, so they share its
# placement) and occlusion.json: the order, and per person, for the slots' placeholder shapes moved into the painting by the
# slice formula, the pieces in front of them and the share of their drawing, box, face and press area hidden (the page's
# capture measures the same shares as rendered, for whatever fills the slots). Also measures each piece against its station's outline in the guide (how far it is painted off the plan).
# Generates nothing. Usage: python3 -I occlude6.py
import json, os, numpy as np
from PIL import Image, ImageFilter, ImageOps
D = os.path.dirname(os.path.abspath(__file__)); P = lambda p: os.path.normpath(os.path.join(D, p))
PIC = json.load(open(P('picture.json'))); G = json.load(open(P('_geo-A.json'))); S = json.load(open(P('scene.json')))
rgb = lambda p: np.array(Image.open(P(p)).convert('RGB'))
start, placed = rgb(PIC['plate']['file']), rgb(PIC['placed']['file']); H, W = start.shape[:2]
def img(a): return Image.fromarray((a * 255).astype(np.uint8))
def grow(a, r): return np.array(img(a).filter(ImageFilter.MaxFilter(2 * r + 1))) > 0
# ---- 1. the layers, each its station's piece; checked against PV6-A-3
alpha = np.zeros((H, W)); owner = np.full((H, W), '', dtype=object); reach = {}; parts = []; layer_rgb = np.zeros((H, W, 3))
ST = {p['name'] if p['place'] == '' else f"{p['place']} {p['name']}": p for p in json.load(open(P('../pv6/pieces6.json')))}
smap = np.array(Image.open(P('../pv6/pv6-A-stations.png')).convert('L')).astype(int)
for s, piece in PIC['layers']['pieces'].items():
    L = np.array(Image.open(P(piece['file'])).convert('RGBA')); a = L[..., 3].astype(np.float64) / 255; m = a > 0
    if (np.abs(L[..., :3][m].astype(int) - placed[m].astype(int)).max() if m.any() else 0) != 0: raise SystemExit(f'{s}: its colours are not PV6-A-3\'s')
    if (owner[m] != '').any(): raise SystemExit(f'{s} meets another piece: split them by their outlines first')
    alpha[m] = a[m]; owner[m] = s; reach[s] = m; layer_rgb[m] = L[..., :3][m]
    outline = np.abs(smap - ST[s]['grey']) <= 2; ys, xs = np.where(m); oys, oxs = np.where(outline)
    cx, cy = float((a * np.indices((H, W))[1]).sum() / a.sum()), float((a * np.indices((H, W))[0]).sum() / a.sum())
    parts.append({'station': s, 'file': os.path.basename(piece['file']), 'px': int(m.sum()), 'x': [int(xs.min()), int(xs.max())], 'y': [int(ys.min()), int(ys.max())],
                  'inItsOutline': round(float((m & grow(outline, 6)).sum() / m.sum()), 4), 'outlineCovered': round(float((m & outline).sum() / outline.sum()), 4),
                  'iouWithOutline': round(float((m & outline).sum() / (m | outline).sum()), 4),
                  'offPlan': {'left': int(xs.min() - oxs.min()), 'right': int(xs.max() - oxs.max()), 'top': int(ys.min() - oys.min()), 'bottom': int(ys.max() - oys.max()),
                              'centre': [round(cx - float(oxs.mean()), 1), round(cy - float(oys.mean()), 1)]}})
# ---- 2. depth per pixel: the straight-line camera's ray into each station's solids, the distance along its axis
cam = G['camera']; C = np.array(cam['C'], float); yaw = cam['yaw']
fwd, right, up = np.array([np.sin(yaw), 0.0, np.cos(yaw)]), np.array([np.cos(yaw), 0.0, -np.sin(yaw)]), np.array([0.0, 1.0, 0.0])
def ray(xs, ys): u = (xs + 0.5 - cam['cx']) / cam['f']; v = (cam['hy'] - (ys + 0.5)) / cam['f']; return fwd[None, :] + u[:, None] * right[None, :] + v[:, None] * up[None, :]
def project(p): q = np.array(p, float) - C; z = q @ fwd; return cam['cx'] + cam['f'] * (q @ right) / z, cam['hy'] - cam['f'] * (q @ up) / z, z
for sol in G['stations']['E bench']['solids'][:1]:   # the ray and the projection agree: a corner of Vega's bench comes back at its own depth
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
depth = np.full((H, W), np.nan); src = {}
for s, r in reach.items():
    dz = depth_of(s, r); known = np.isfinite(dz); src[s] = {'hit': int((known & r).sum()), 'pixels': int(r.sum())}
    for _ in range(60):   # pieces' pixels the solids miss (painted past the plan's outline) take the nearest known depth
        todo = r & ~known
        if not todo.any(): break
        pad = np.pad(np.where(known, dz, np.inf), 1, constant_values=np.inf)
        nb = np.min(np.stack([pad[1 + dy:1 + dy + H, 1 + dx:1 + dx + W] for dy in (-1, 0, 1) for dx in (-1, 0, 1)]), axis=0)
        fill = todo & np.isfinite(nb); dz[fill] = nb[fill]; known |= fill
    if (r & ~known).any(): raise SystemExit(f'{s}: {int((r & ~known).sum())} px with no depth')
    depth[r] = dz[r]; src[s]['depthM'] = [round(float(np.nanmin(dz[r])), 2), round(float(np.nanmax(dz[r])), 2)]
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
# ---- 4. the bands, by depth alone (the Lead's approval of 18 November, for the figures that may move): each pixel of a piece is
# drawn after every person farther than it and before every person nearer, whatever their pose; the people go far to near, so a
# pixel's band is the number of people farther than it. A person's own seat stays behind them (Juno's stool): its pixels are
# capped at that person's band; a seat pixel that would also have to go after someone nearer than its owner is a conflict.
piece = alpha > 0; band = np.zeros((H, W), np.int16)
for i, q in enumerate(people):
    nearer = piece & (depth < q['Z']); band[nearer] = np.maximum(band[nearer], i + 1)
conflict = np.zeros((H, W), bool)
for i, q in enumerate(people):
    seat = geo[q['id']]['seat']
    if not seat: continue
    m = piece & (owner == seat) & (band > i); conflict |= m & (band > i + 1); band[m] = i
bands = []
for f in os.listdir(D):
    if f.startswith('band-') and f.endswith('.png'): os.remove(os.path.join(D, f))
# Under each band, a seam fill: the nearer bands' fully opaque pixels within 2 px of it, in their own colours. Their own band
# draws them again on top, so the order is unchanged; the fill closes the seam the browser's scaling would open where one piece
# is split between two layers (its feathered outer edges, under alpha 1, are not filled, so they are not drawn twice).
a8all = np.rint(alpha * 255).astype(np.uint8)
for b in range(len(people) + 1):
    m = piece & (band == b)
    if not m.any(): continue
    fill = grow(m, 2) & piece & (band > b) & (a8all == 255)
    a8 = np.where(m | fill, a8all, 0).astype(np.uint8); rgba = np.dstack([(layer_rgb * (a8 > 0)[..., None]).astype(np.uint8), a8]); f = f'band-{b}.png'   # no colour under alpha 0
    Image.fromarray(rgba, 'RGBA').save(os.path.join(D, f), optimize=True)
    bands.append({'band': b, 'file': f, 'after': [q['id'] for q in people[:b]], 'before': [q['id'] for q in people[b:]], 'px': int(m.sum()), 'seamFillPx': int(fill.sum()), 'stations': sorted({s for s in owner[m] if s})})
# a person's 'front' element (a figure's part drawn over their own station where it is nearer than them, such as Juno's hands on
# her laptop; the Lead, 18 November) goes just above the highest band that holds their own station's nearer pixels
fronts = {}
for i, q in enumerate(people):
    own = piece & np.isin(owner, [s for s in reach if s.split(' ')[0] == q['place'] and s != geo[q['id']]['seat']]) & (band > i)
    if own.any(): fronts[q['id']] = f'band-{int(band[own].max())}'
order = []
for b in range(len(people) + 1):
    if any(x['band'] == b for x in bands): order.append(f'band-{b}'); order += [f'{pid} front' for pid, fb in fronts.items() if fb == f'band-{b}']
    if b < len(people): order.append(people[b]['id'])
# the plate with every band over it (the page without the people) against the four layers over the plate, and against PV6-A-3
def over_plate(files):
    comp = start.astype(np.float64)
    for f in files:
        L = np.array(Image.open(os.path.join(D, f)).convert('RGBA')).astype(np.float64); a = L[..., 3:] / 255; comp = L[..., :3] * a + comp * (1 - a)
    return np.clip(np.rint(comp), 0, 255).astype(int)
by_bands = over_plate([x['file'] for x in bands]); by_layers = over_plate([P(v['file']) for v in PIC['layers']['pieces'].values()])
dp = np.abs(by_bands - placed.astype(int)).max(axis=2)
check = {'bandsAgainstLayers': {'maxAbsDiff': int(np.abs(by_bands - by_layers).max())},
         'againstPlaced': {'meanAbsDiff': round(float(dp.mean()), 4), 'p99': float(np.percentile(dp, 99)), 'max': int(dp.max()), 'measure': 'the largest of |R|, |G|, |B| per pixel, over the whole picture'},
         'sameOnBothPhones': same}
# ---- 5. per person: what hides them, their drawing, box, face and press area (moved onto their visible part if a piece hides it)
def square(c, side): return (c[0] - side / 2, c[1] - side / 2, c[0] + side / 2, c[1] + side / 2)
yy, xx = np.mgrid[0:H, 0:W]
def in_rect(r): return (xx + 0.5 >= r[0]) & (xx + 0.5 < r[2]) & (yy + 0.5 >= r[1]) & (yy + 0.5 < r[3])
report = {}
for i, q in enumerate(people):
    a = A[q['id']]; after = piece & (band > i); cov = alpha * after; hid = a * cov; tot = a.sum(); k = first['k']
    by = {s: round(float((hid * (owner == s)).sum() / tot), 4) for s in reach if (hid * (owner == s)).sum() > 0.5}
    hx, hy = toP(first, q['head']); hr = q['headR'] * k; face = ((xx + 0.5 - hx) ** 2 + (yy + 0.5 - hy) ** 2) <= hr * hr
    b0, b1 = toP(first, q['box'][:2]), toP(first, q['box'][2:]); bx = in_rect((*b0, *b1)); lower = in_rect((b0[0], (b0[1] + b1[1]) / 2, b1[0], b1[1]))
    sq = in_rect(square(toP(first, q['press']), q['side'] * k)); sqHidden = float((cov * sq).sum() / sq.sum())
    centreHidden = float(cov[int(toP(first, q['press'])[1]), int(toP(first, q['press'])[0])])
    ovl = {}
    for st in reach:
        ov = piece & (owner == st) & (a > 0.02)
        if ov.any():
            nr = ov & (depth < q['Z']); ovl[st] = {'px': int(ov.sum()), 'nearerPx': int(nr.sum()), 'depthM': [round(float(depth[ov].min()), 2), round(float(depth[ov].max()), 2)],
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
out = {'view': G['view'], 'layers': 'the records page\'s four layers (picture.json), by the Lead\'s recipe: ' + PIC['layers']['recipe'], 'camera': 'straight lines: d = forward + u right + v up; depth along the camera\'s axis',
       'rule': 'by depth alone: each pixel after every person farther than it; a person\'s seat behind them', 'parts': parts, 'depthHits': src, 'people': [{'id': q['id'], 'name': q['name'], 'Z': q['Z']} for q in people], 'order': order, 'fronts': fronts, 'bands': bands, 'conflictPx': int(conflict.sum()),
       'check': check, 'report': report, 'tags': 'drawn above every layer (the page\'s overlay)'}
json.dump(out, open(os.path.join(D, 'occlusion.json'), 'w'), indent=1)
print(json.dumps({k: out[k] for k in ('depthHits', 'order', 'fronts', 'bands', 'conflictPx', 'check', 'report')}, indent=1))
