# Room A, views B and C: who covers whom (version 1), by depth, as view A's (../data/occludeA.py): a painted piece is drawn in front of
# a person where it overlaps them and is nearer the camera there. The pieces are the view's lifted layers (the sheet's lift-<plate>.json:
# each layer's pixels, where its alpha is above 0). A piece's depth at a pixel is where that pixel's ray first meets the piece's solids
# (geo-<V>.json), along the camera's axis; a person is a figure standing at their depth (scene-<V>.json's slot), drawn above their feet
# line in their box, so a piece on the deck that is nearer than a person shows only below their feet, never over them. Writes
# occlusion-<V>.json: the order far to near, each layer in front of a person (the pixels where it is drawn over them, by phone), and
# every overlap measured. Generates nothing. Usage: python3 -I occludeV.py B|C
import json, os, sys
import numpy as np
from PIL import Image
V = sys.argv[1] if len(sys.argv) > 1 else ''
if V not in ('B', 'C', 'E', 'D'): sys.exit('usage: python3 -I occludeV.py B|C|E|D')
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, V); S = os.path.join(D, '..', f'sheet{V}')
J = lambda f: json.load(open(f))
G, SC = J(os.path.join(OUT, f'geo-{V}.json')), J(os.path.join(OUT, f'scene-{V}.json'))
areas = {k: np.array(Image.open(os.path.join(S, s['layer'])).convert('RGBA'))[..., 3] > 0 for k, s in G['stations'].items()}
CAM = G['camera']; C = np.array(CAM['C']); yaw = CAM['yaw']; fwd = np.array([np.sin(yaw), 0, np.cos(yaw)]); right = np.array([np.cos(yaw), 0, -np.sin(yaw)]); up = np.array([0.0, 1.0, 0.0])
def depth_at(name, ys, xs):   # each pixel's ray against the piece's faces: the nearest hit's depth along the camera's axis (inf: no hit)
    d = (right[None, :] * ((xs + 0.5 - CAM['cx']) / CAM['f'])[:, None] + up[None, :] * ((CAM['hy'] - (ys + 0.5)) / CAM['f'])[:, None] + fwd[None, :])
    best = np.full(len(xs), np.inf)
    for so in G['stations'][name]['solids']:
        for face in so['faces']:
            P = np.array(face, float); n = np.cross(P[1] - P[0], P[2] - P[0]); nn = np.linalg.norm(n)
            if nn < 1e-12: continue
            n = n / nn; den = d @ n; ok = np.abs(den) > 1e-9; t = np.where(ok, ((P[0] - C) @ n) / np.where(ok, den, 1), np.inf)
            Hh = C[None, :] + t[:, None] * d; inside = ok & (t > 0)
            for i in range(len(P)):   # a convex face: the hit is on the inner side of every edge
                e = P[(i + 1) % len(P)] - P[i]; inside &= (np.cross(e[None, :], Hh - P[i][None, :]) @ n) >= -1e-9
            best = np.where(inside & (t < best), t, best)
    return best
# each layer's depth map: its pixels' ray depths; a painted pixel whose ray meets none of the piece's solids (the painting runs a little
# past the stage's boxes) takes the depth of the nearest pixel whose ray does, filled outward a pixel at a time (8 neighbours, the least)
DEPTH, FILLED = {}, {}
for name, m in areas.items():
    ys, xs = np.where(m); dz = depth_at(name, ys, xs); dm = np.full(m.shape, np.inf); dm[ys, xs] = dz
    miss = m & ~np.isfinite(dm); FILLED[name] = int(miss.sum()); k = 0
    while (m & ~np.isfinite(dm)).any() and k < 400:
        sh = np.full(dm.shape, np.inf)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy or dx: sh = np.minimum(sh, np.roll(np.roll(dm, dy, 0), dx, 1))
        fill = m & ~np.isfinite(dm) & np.isfinite(sh); dm[fill] = sh[fill]; k += 1
    if (m & ~np.isfinite(dm)).any(): sys.exit(f'STOP: {name} has pixels no depth reaches')
    DEPTH[name] = dm
TOL = 0.02   # a piece counts as in front only where it is more than 2 cm nearer: at the feet line a piece on the deck is level with the feet
out = {'view': V, 'version': 1, 'rule': "by depth at each pixel: where a lifted layer overlaps a person above their feet line, it is drawn in front of them where its surface, met by that pixel's ray, is more than 2 cm nearer the camera than the person", 'toleranceM': TOL,
       'layers': {k: {'file': s['layer'], 'areaPx': int(areas[k].sum()), 'depthM': [min(o['depthM'][0] for o in s['solids']), max(o['depthM'][1] for o in s['solids'])]} for k, s in G['stations'].items()},
       'people': [{'id': p['id'], 'name': p['name'], 'Z': p['Z']} for p in G['people']], 'order': None, 'fronts': {}, 'overlaps': {}}
H, W = next(iter(areas.values())).shape; FRONT = {}
for key, ph in SC['phones'].items():
    x0, y0, k = ph['slice']['x0'], ph['slice']['y0'], ph['k']; rows = []
    for p in ph['people']:
        b = p['box']; X0, Y0, X1, Y1 = [int(round(v)) for v in (x0 + b[0] * k, y0 + b[1] * k, x0 + b[2] * k, y0 + b[3] * k)]
        box = np.zeros((H, W), bool); box[max(0, Y0):max(0, Y1), max(0, X0):max(0, X1)] = True
        feetY = y0 + p['feet'][1] * k; body = box.copy(); body[int(np.ceil(feetY)):, :] = False   # the figure is drawn above its feet line
        for name, m in areas.items():
            ov = int((m & box).sum())
            if not ov: continue
            ys, xs = np.where(m & body); dz = DEPTH[name][ys, xs]; hit = np.isfinite(dz); raw = depth_at(name, ys, xs)
            front = int((dz < p['Z'] - TOL).sum()); level = int(((dz >= p['Z'] - TOL) & (dz < p['Z'])).sum()); miss = int((~np.isfinite(raw)).sum())
            if front:   # the part of the layer drawn over this person: nearer than them, above their feet line, in their box
                fm = np.zeros((H, W), bool); fm[ys[dz < p['Z'] - TOL], xs[dz < p['Z'] - TOL]] = True; FRONT.setdefault((p['name'], name), np.zeros((H, W), bool)); FRONT[(p['name'], name)] |= fm
            rows.append({'person': p['name'], 'layer': name, 'overlapPx': ov, 'aboveFeetPx': int(len(xs)), 'layerDepthHereM': [round(float(dz[hit].min()), 3), round(float(dz[hit].max()), 3)] if hit.any() else None,
                         'personZ': p['Z'], 'nearerPx': front, 'withinTolPx': level, 'depthFilledPx': miss, 'drawn': 'in front where nearer' if front else 'behind'})
            if front: out['fronts'].setdefault(p['name'], []).append({'phone': key, 'layer': name, 'nearerPx': front})
    out['overlaps'][key] = rows
# each front part as an image: the layer's own pixels (its colour and alpha) where it is drawn over that person, on any phone
out['frontParts'] = []
for (person, name), fm in sorted(FRONT.items()):
    lay = np.array(Image.open(os.path.join(S, G['stations'][name]['layer'])).convert('RGBA')); lay[..., 3] = np.where(fm, lay[..., 3], 0); lay[..., :3] *= (lay[..., 3:] > 0)
    f = f"front-{person}-{name.split(' ', 1)[1].replace(' ', '-')}.png"; Image.fromarray(lay, 'RGBA').save(os.path.join(OUT, f), optimize=True)
    ys, xs = np.where(fm); out['frontParts'].append({'person': person, 'layer': name, 'file': f, 'px': int(fm.sum()), 'box': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1],
        'drawn': f"right after {person}, over them and everything farther"})
out['depthFilledPx'] = FILLED
far_to_near = sorted(G['people'], key=lambda p: -p['Z'])
out['order'] = [f"the plate ({SC['plate']['name']}, every piece painted in it)"] + [x for p in far_to_near for x in [p['name']] + [f"{q['layer']}'s part in front of {p['name']} ({q['file']})" for q in out['frontParts'] if q['person'] == p['name']]]
json.dump(out, open(os.path.join(OUT, f'occlusion-{V}.json'), 'w'), indent=1)
print('order:', out['order']); print('fronts:', json.dumps(out['fronts']) or 'none'); print('depth filled:', FILLED); print('front parts:', [(q['file'], q['px'], q['box']) for q in out['frontParts']])
for key, rows in out['overlaps'].items(): print(key, [(r['person'], r['layer'], r['overlapPx'], r['aboveFeetPx'], r['layerDepthHereM'], r['nearerPx'], r['withinTolPx'], r['depthFilledPx']) for r in rows])
