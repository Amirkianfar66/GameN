# Room A view A's occlusion (version 1), by depth as Room B's views (pv6b/occlude6.py): a painted piece is drawn in front of a person
# where it overlaps them and is nearer the camera there. The pieces are the sheet's lifted layers, taken as their split areas (sheet
# RA-A version 4's ra-A-split.png and ra-A-split3.png: each piece's outline grown, the area its layer is lifted from; the layers fill
# 98 to 99.96% of them). A piece's depth at a pixel is where that pixel's ray first meets the piece's solids (geo-A.json), along the
# camera's axis; a person is a figure standing at their depth (scene.json's slot), drawn above their feet line in their box. So a
# piece on the deck that is nearer than a person shows only below that person's feet, never over them. Writes occlusion.json: the
# order far to near, any piece in front of a person (a band), and every overlap measured. Generates nothing. Usage: python3 -I occludeA.py
import json, os
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); S = os.path.join(D, '..', 'sheet')
J = lambda f: json.load(open(f))
G, SC, KIT = J(os.path.join(D, 'geo-A.json')), J(os.path.join(D, 'scene.json')), J(os.path.join(S, 'kit-A.json'))
split2 = np.array(Image.open(os.path.join(S, 'ra-A-split.png')).convert('L')); split3 = np.array(Image.open(os.path.join(S, 'ra-A-split3.png')).convert('L'))
areas = {k: split2 == g for k, g in KIT['split'].items()}; areas.update({('wall ' + k.split(' ', 1)[1]) if k.startswith('wall') else k: split3 == g for k, g in KIT['split3'].items()})
depth = {k: s['solids'][0]['depthM'] for k, s in G['stations'].items()}
depth['back plain wall'] = [None, None]   # the wall itself: behind everything
CAM = G['camera']; C = np.array(CAM['C']); yaw = CAM['yaw']; fwd = np.array([np.sin(yaw), 0, np.cos(yaw)]); right = np.array([np.cos(yaw), 0, -np.sin(yaw)]); up = np.array([0.0, 1.0, 0.0])
def depth_at(name, ys, xs):   # each pixel's ray against the piece's faces: the nearest hit's depth along the camera's axis (inf: no hit)
    if name not in G['stations']: return np.full(len(xs), np.inf)
    d = (right[None, :] * ((xs + 0.5 - CAM['cx']) / CAM['f'])[:, None] + up[None, :] * ((CAM['hy'] - (ys + 0.5)) / CAM['f'])[:, None] + fwd[None, :])
    best = np.full(len(xs), np.inf)
    for so in G['stations'][name]['solids']:
        for face in so['faces']:
            P = np.array(face, float); n = np.cross(P[1] - P[0], P[2] - P[0]); n = n / np.linalg.norm(n)
            den = d @ n; ok = np.abs(den) > 1e-9; t = np.where(ok, ((P[0] - C) @ n) / np.where(ok, den, 1), np.inf)
            H = C[None, :] + t[:, None] * d; inside = ok & (t > 0)
            for i in range(len(P)):   # a convex face: the hit is on the inner side of every edge
                e = P[(i + 1) % len(P)] - P[i]; inside &= (np.cross(e[None, :], H - P[i][None, :]) @ n) >= -1e-9
            best = np.where(inside & (t < best), t, best)
    return best
TOL = 0.02   # a piece counts as in front only where it is more than 2 cm nearer: at the feet line a piece on the deck is level with the feet
out = {'view': 'A', 'version': 1, 'rule': 'by depth at each pixel: where a piece overlaps a person above their feet line, it is drawn in front of them where its surface, met by that pixel\'s ray, is more than 2 cm nearer the camera than the person', 'toleranceM': TOL,
       'pieces': {k: {'areaPx': int(m.sum()), 'depthM': depth.get(k)} for k, m in areas.items()}, 'people': [{'id': p['id'], 'name': p['name'], 'Z': p['Z']} for p in G['people']],
       'order': None, 'fronts': {}, 'bands': [], 'overlaps': {}}
for key, ph in SC['phones'].items():
    x0, y0, k = ph['slice']['x0'], ph['slice']['y0'], ph['k']; rows = []
    for p in ph['people']:
        b = p['box']; X0, Y0, X1, Y1 = [int(round(v)) for v in (x0 + b[0] * k, y0 + b[1] * k, x0 + b[2] * k, y0 + b[3] * k)]
        box = np.zeros(split2.shape, bool); box[max(0, Y0):Y1, max(0, X0):X1] = True
        feetY = y0 + p['feet'][1] * k; body = box.copy(); body[int(np.ceil(feetY)):, :] = False   # the figure is drawn above its feet line
        for name, m in areas.items():
            ov = int((m & box).sum())
            if not ov: continue
            ys, xs = np.where(m & body); dz = depth_at(name, ys, xs); front = int((dz < p['Z'] - TOL).sum()); level = int(((dz >= p['Z'] - TOL) & (dz < p['Z'])).sum())
            hit = np.isfinite(dz)
            rows.append({'person': p['name'], 'piece': name, 'overlapPx': ov, 'aboveFeetPx': int(len(xs)), 'pieceDepthHereM': [round(float(dz[hit].min()), 3), round(float(dz[hit].max()), 3)] if hit.any() else None,
                         'personZ': p['Z'], 'nearerPx': front, 'withinTolPx': level, 'drawn': 'in front where nearer' if front else 'behind'})
            if front: out['fronts'].setdefault(p['name'], []).append({'phone': key, 'piece': name, 'nearerPx': front})
    out['overlaps'][key] = rows
far_to_near = sorted(G['people'], key=lambda p: -p['Z'])
out['order'] = ['the plate (RA-A-4, every piece painted in it)'] + [p['name'] for p in far_to_near]
out['note'] = ("No piece is nearer than a person it overlaps, so no band is needed: the plate is drawn first and the people over it, far to near. "
               "Two cases are the Motion builder's: Lyra's hands and wrench below the hatch's rim are drawn only inside the hatch's opening (marks-A.json); "
               "a visitor at the food unit (2.59 m) stands behind the hatch's lid (2.06 to 2.42 m) where they overlap (geo-A.json's solids)") if not out['fronts'] else 'bands needed: see fronts'
json.dump(out, open(os.path.join(D, 'occlusion.json'), 'w'), indent=1)
print('order:', out['order']); print('fronts:', out['fronts'] or 'none')
for key, rows in out['overlaps'].items(): print(key, [(r['person'], r['piece'], r['overlapPx'], r['aboveFeetPx'], r['pieceDepthHereM'], r['nearerPx'], r['withinTolPx']) for r in rows])
