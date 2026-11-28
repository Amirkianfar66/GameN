# View E's stool strip against the people (the Lead, 18 November). The 375 px of Juno's stool layer that step 3 painted over the
# cart's right end are drawn with the cart (stool-2, just after band-2), so after Juno and Atlas. For every frame of view E's people
# at rest and along every walk to the food capsule and back (visits-A1.json, view E, every 1 cm; the way back is the same path),
# each person as the visits' body for depth tests (a cylinder 0.2 m in radius and 1.72 m tall, standing at their deck point):
# the strip pixels the body covers (the ray from the painting's camera through the pixel's centre meets it above the deck) where
# the person is nearer than the cart at that pixel (the person's depth along the camera's axis to where they stand, against the
# cart's depth there as occlude8e.py gives it), and, of those, the pixels the strip is drawn over: those of a person whose place
# in the order is before stool-2. The people at rest are also measured by their placeholder shapes, as the page draws them.
# Writes strip-check.json and a 2x crop of the frame with the most such pixels (strip-check-2x.png). Generates nothing.
# Usage: python3 -I stripcheck8e.py
import json, os, numpy as np
from PIL import Image, ImageDraw, ImageOps
D = os.path.dirname(os.path.abspath(__file__)); P = lambda p: os.path.normpath(os.path.join(D, p))
G = json.load(open(P('_geo-E.json'))); S = json.load(open(P('scene.json'))); O = json.load(open(P('occlusion.json'))); PIC = json.load(open(P('picture.json')))
VIS = json.load(open(P('../visits-A1.json')))['views']['E']; H, W = 1536, 1024
cam = G['camera']; C = np.array(cam['C'], float); yaw = cam['yaw']
fwd, right, up = np.array([np.sin(yaw), 0.0, np.cos(yaw)]), np.array([np.cos(yaw), 0.0, -np.sin(yaw)]), np.array([0.0, 1.0, 0.0])
def ray(xs, ys): u = (xs + 0.5 - cam['cx']) / cam['f']; v = (cam['hy'] - (ys + 0.5)) / cam['f']; return fwd[None, :] + u[:, None] * right[None, :] + v[:, None] * up[None, :]
# the cart's depth per pixel, as occlude8e.py computes it: the ray into its solids, pixels the solids miss taking the nearest known depth
cart = np.array(Image.open(P(PIC['layers']['pieces']['B laptop cart']['file'])).convert('RGBA'))[..., 3] > 0
def depth_of(station, region):
    ys, xs = np.where(region); d = ray(xs.astype(float), ys.astype(float)); best = np.full(len(xs), np.inf)
    for sol in G['stations'][station]['solids']:
        planes = []
        for f in sol['faces']:
            p0, p1, p2 = (np.array(v, float) for v in f[:3]); n = np.cross(p1 - p0, p2 - p0); n /= np.linalg.norm(n)
            if n @ (np.array(sol['c']) - p0) > 0: n = -n
            planes.append((n, p0))
        planes.append((np.array([0.0, -1.0, 0.0]), np.zeros(3)))
        lo = np.zeros(len(xs)); hi = np.full(len(xs), np.inf); miss = np.zeros(len(xs), bool)
        for n, p0 in planes:
            den = d @ n; num = n @ (p0 - C)
            with np.errstate(divide='ignore', invalid='ignore'): r = num / den
            ent = den < -1e-12; ext = den > 1e-12
            lo[ent] = np.maximum(lo[ent], r[ent]); hi[ext] = np.minimum(hi[ext], r[ext]); miss |= (~ent & ~ext) & (num < 0)
        hit = ~miss & (lo <= hi); best = np.where(hit, np.minimum(best, lo), best)
    out = np.full((H, W), np.nan); out[ys, xs] = np.where(np.isfinite(best), best, np.nan); return out
dz = depth_of('B laptop cart', cart); known = np.isfinite(dz)
for _ in range(60):
    todo = cart & ~known
    if not todo.any(): break
    pad = np.pad(np.where(known, dz, np.inf), 1, constant_values=np.inf)
    nb = np.min(np.stack([pad[1 + dy:1 + dy + H, 1 + dx:1 + dx + W] for dy in (-1, 0, 1) for dx in (-1, 0, 1)]), axis=0)
    fill = todo & np.isfinite(nb); dz[fill] = nb[fill]; known |= fill
strip = np.array(Image.open(P('stool-2.png')))[..., 3] > 0; sy, sx = np.where(strip); sd = ray(sx.astype(float), sy.astype(float)); cartZ = dz[sy, sx]
if len(sx) != O['check']['stoolRaisedOverTheFurniture']['px'] or np.isnan(cartZ).any(): raise SystemExit('the strip or the cart depth under it is not as occlude8e.py gave it')
# the body: a vertical cylinder, 0.2 m in radius, 1.72 m tall, at deck point (x, z); a strip pixel is covered where its ray enters it above the deck
def covers(x, z):
    ox, oz = C[0] - x, C[2] - z; a = sd[:, 0] ** 2 + sd[:, 2] ** 2; b = 2 * (ox * sd[:, 0] + oz * sd[:, 2]); c = ox * ox + oz * oz - 0.04
    disc = b * b - 4 * a * c; t = np.where(disc >= 0, (-b - np.sqrt(np.maximum(disc, 0))) / (2 * a), np.inf); y = C[1] + t * sd[:, 1]
    return (disc >= 0) & (t > 0) & (y >= 0) & (y <= 1.72)
depth = lambda x, z: float((np.array([x, 0.0, z]) - C) @ fwd)
people = {p['id']: p for p in O['people']}; slot = {pid: O['order'].index(pid) for pid in people}; s2 = O['order'].index('stool-2')
name_id = {p['name']: pid for pid, p in people.items()}; geo = {p['id']: p for p in G['people']}
def frame(pid, x, z):
    cov = covers(x, z); Z = depth(x, z); nearer = cov & (Z < cartZ)
    return {'Z': round(Z, 3), 'underStrip': int(cov.sum()), 'nearerThanTheCart': int(nearer.sum()), 'stripDrawnOverThem': int(nearer.sum()) if slot[pid] < s2 else 0}
rows = {}
for pid, p in people.items():   # at rest, at their deck point
    rows[f"{p['name']} at rest"] = frame(pid, geo[pid]['x'], geo[pid]['z'])
walks = {}
for w in VIS['walks']:
    pid = name_id.get(w['who'])
    if pid is None: walks[w['who']] = {'inView': False, 'note': 'out of view in E (the chip); the walk is out of frame all the way' if w['there']['phones']['390x844']['outOfFrame'] else 'not in this view'}; continue
    pts = w['points']; samples = []; s0 = 0.0
    for a, b in zip(pts, pts[1:]):
        L = float(np.hypot(b[0] - a[0], b[1] - a[1])); n = max(1, int(np.ceil(L / 0.01)))
        samples += [(s0 + L * k / n, a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n) for k in range(n)]; s0 += L
    samples.append((s0, pts[-1][0], pts[-1][1]))
    fr = [(s, frame(pid, x, z)) for s, x, z in samples]; hit = [(s, f) for s, f in fr if f['nearerThanTheCart']]
    walks[w['who']] = {'inView': True, 'frames': len(fr), 'stepM': 0.01, 'lengthM': round(s0, 3), 'depthM': [round(min(f['Z'] for _, f in fr), 3), round(max(f['Z'] for _, f in fr), 3)],
                       'framesUnderTheStrip': sum(1 for _, f in fr if f['underStrip']), 'underSectionM': (lambda u: [round(u[0], 2), round(u[-1], 2)] if u else None)([s for s, f in fr if f['underStrip']]),
                       'framesNearerThanTheCartUnderIt': len(hit),
                       'nearerSectionM': [round(hit[0][0], 2), round(hit[-1][0], 2)] if hit else None, 'mostNearerPx': max((f['nearerThanTheCart'] for _, f in fr), default=0),
                       'stripDrawnOverThemPx': sum(f['stripDrawnOverThem'] for _, f in fr), 'slot': 'before stool-2' if slot[pid] < s2 else 'after stool-2',
                       'best': max(fr, key=lambda t: t[1]['nearerThanTheCart'])}
# the people at rest by their placeholder shapes, as the page draws them on 390 x 844
ph = S['phones']['390x844']
def shape_alpha(q):
    k = ph['k']; x0, y0 = ph['slice']['x0'], ph['slice']['y0']; r = q['rect']; left, top, size = x0 + r['left'] * k, y0 + r['top'] * k, r['size'] * k
    im = Image.open(P(q['png'])).convert('RGBA')
    if r['flip']: im = ImageOps.mirror(im)
    sw = im.size[0] / size
    return np.array(im.split()[3].transform((W, H), Image.AFFINE, (sw, 0, (0.5 - left) * sw - 0.5, 0, sw, (0.5 - top) * sw - 0.5), resample=Image.BILINEAR)).astype(float) / 255
shapes = {}
for q in ph['people']:
    a = shape_alpha(q)[sy, sx] > 0.02; Z = q['Z']; n = a & (Z < cartZ)
    shapes[q['name']] = {'Z': Z, 'underStrip': int(a.sum()), 'nearerThanTheCart': int(n.sum()), 'stripDrawnOverThem': int(n.sum()) if slot[q['id']] < s2 else 0}
covered = sum(r['stripDrawnOverThem'] for r in rows.values()) + sum(w.get('stripDrawnOverThemPx', 0) for w in walks.values()) + sum(r['stripDrawnOverThem'] for r in shapes.values())
out = {'view': 'E', 'strip': {'px': int(strip.sum()), 'x': [int(sx.min()), int(sx.max())], 'y': [int(sy.min()), int(sy.max())], 'file': 'stool-2.png', 'cartDepthM': [round(float(cartZ.min()), 3), round(float(cartZ.max()), 3)]},
       'body': "the visits' body for depth tests: a cylinder 0.2 m in radius and 1.72 m tall at the person's deck point; a strip pixel is covered where its ray enters the body above the deck",
       'order': O['order'], 'rule': "a person's pixels under the strip count where the person is nearer than the cart at that pixel; the strip is drawn over them only if their place in the order is before stool-2",
       'atRest': {'body': rows, 'placeholderShapes390': shapes}, 'walks': {k: {kk: vv for kk, vv in v.items() if kk != 'best'} for k, v in walks.items()},
       'peoplePixelsCovered': covered}
for k, v in walks.items():
    if v.get('best'): out['walks'][k]['mostAt'] = {'atM': round(v['best'][0], 2), **v['best'][1]}
json.dump(out, open(P('strip-check.json'), 'w'), indent=1)
print(json.dumps(out, indent=1))
# the 2x crop of the frame with the most pixels nearer than the cart under the strip: as drawn (the person in their place in the
# order, tinted) and with those pixels marked
best = max(((k, v['best']) for k, v in walks.items() if v.get('best')), key=lambda t: t[1][1]['nearerThanTheCart'], default=None)
if best and best[1][1]['nearerThanTheCart']:
    who, (s, f) = best; pid = name_id[who]; w = next(x for x in VIS['walks'] if x['who'] == who)
    pts = w['points']; s0 = 0.0
    for a, b in zip(pts, pts[1:]):
        L = float(np.hypot(b[0] - a[0], b[1] - a[1]))
        if s <= s0 + L + 1e-9: x, z = a[0] + (b[0] - a[0]) * (s - s0) / L, a[1] + (b[1] - a[1]) * (s - s0) / L; break
        s0 += L
    X0, Y0, X1, Y1 = 300, 860, 470, 1060; ys, xs = np.mgrid[Y0:Y1, X0:X1]; dd = ray(xs.ravel().astype(float), ys.ravel().astype(float))
    ox, oz = C[0] - x, C[2] - z; a2 = dd[:, 0] ** 2 + dd[:, 2] ** 2; b2 = 2 * (ox * dd[:, 0] + oz * dd[:, 2]); c2 = ox * ox + oz * oz - 0.04; disc = b2 * b2 - 4 * a2 * c2
    t = np.where(disc >= 0, (-b2 - np.sqrt(np.maximum(disc, 0))) / (2 * a2), np.inf); yy = C[1] + t * dd[:, 1]; body = ((disc >= 0) & (t > 0) & (yy >= 0) & (yy <= 1.72)).reshape(Y1 - Y0, X1 - X0)
    comp = np.array(Image.open(P(PIC['plate']['file'])).convert('RGB')).astype(float)[Y0:Y1, X0:X1]
    def over(L): global comp; L = L[Y0:Y1, X0:X1].astype(float); al = L[..., 3:] / 255; comp = L[..., :3] * al + comp * (1 - al)
    for item in O['order']:
        if item.startswith('band-') or item.startswith('stool-'): over(np.array(Image.open(P(item + '.png')).convert('RGBA')))
        if item == pid: comp = np.where(body[..., None], comp * 0.35 + np.array([90, 230, 255]) * 0.65, comp)
    left = Image.fromarray(np.clip(np.rint(comp), 0, 255).astype(np.uint8)); mark = left.copy(); m = np.zeros((Y1 - Y0, X1 - X0), bool)
    nearer = covers(x, z) & (depth(x, z) < cartZ); m[sy[nearer] - Y0, sx[nearer] - X0] = True
    ma = np.array(mark).astype(float); ma[m] = [255, 40, 40]; mark = Image.fromarray(ma.astype(np.uint8))
    for im in (left, mark): ImageDraw.Draw(im).rectangle([int(sx.min()) - X0 - 1, int(sy.min()) - Y0 - 1, int(sx.max()) - X0 + 1, int(sy.max()) - Y0 + 1], outline=(255, 210, 0))
    Z2 = lambda im: im.resize(((X1 - X0) * 2, (Y1 - Y0) * 2), Image.NEAREST)
    sheet = Image.new('RGB', ((X1 - X0) * 4 + 12, (Y1 - Y0) * 2), (255, 255, 255)); sheet.paste(Z2(left), (0, 0)); sheet.paste(Z2(mark), ((X1 - X0) * 2 + 12, 0))
    sheet.save(P('strip-check-2x.png'), optimize=True); print('crop', who, 'at', round(s, 2), 'm', f, 'deck point', [round(x, 3), round(z, 3)])
