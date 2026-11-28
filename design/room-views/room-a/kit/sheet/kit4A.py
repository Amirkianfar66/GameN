# Sheet RA-A's step 4 (version 6; the Lead, 13:07 and 13:24 on 19 November): a fix over RA-A-4, the cabinet's right side. From
# fix4A.json (the mask's ranges and the measurements on RA-A-4), version 4's kit (kit-A.json, ra-A-split.png, the step-2 and step-3
# masks) and featuresA.json, it writes:
#   ra-A-place4.png   step 4's mask: one narrow rectangle at the cabinet's right side; white = repaint
#   ra-A-split4.png   the cabinet's grey (20) inside step 4's mask, for the cabinet's refreshed lift
# and kit4-A.json: the mask's share and alpha hash (alpha 0 = repaint, 255 = keep; sha256 of the alpha bytes), the cabinet's lift
# area (its step-2 split area with step 4's mask), the second orange light's pixels inside the mask, and the clear gap from the
# mask's edge to each painted feature of featuresA.json within 60 px (square pixels). It stops if the mask touches step 3's mask or
# the plain-wall area, or comes within 15 px of the pipe run. A feature step 2 painted over entirely is listed, not measured: it
# is not in RA-A-4. Version 4's files are only read. Usage: python3 -I kit4A.py
import hashlib, importlib.util, json, os
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); W, H = 1024, 1536
spec = importlib.util.spec_from_file_location('lift5', os.path.join(D, 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
J = lambda f: json.load(open(os.path.join(D, f)))
FIX, FEAT, KIT, PLAIN = J('fix4A.json'), J('featuresA.json'), J('kit-A.json'), J('plainA.json')
binary = lambda f: np.array(Image.open(os.path.join(D, f)).convert('L')) > 127
save = lambda a, f: Image.fromarray((a * 255).astype(np.uint8) if a.dtype == bool else a.astype(np.uint8), 'L').save(os.path.join(D, f), optimize=True)
alpha = lambda a: hashlib.sha256(np.where(a, 0, 255).astype(np.uint8).tobytes()).hexdigest()
def raster(polys):   # the pixels whose centres lie inside any of the polygons (as kitA.py)
    m = np.zeros((H, W), bool)
    for poly in polys:
        P = np.array(poly, float); x0, y0 = P[:, 0], P[:, 1]; x1, y1 = np.roll(x0, -1), np.roll(y0, -1)
        for r in range(max(0, int(np.floor(y0.min()))), min(H, int(np.ceil(y0.max())) + 1)):
            yc = r + 0.5; cross = ((y0 <= yc) & (y1 > yc)) | ((y1 <= yc) & (y0 > yc))
            if not cross.any(): continue
            xs = np.sort(x0[cross] + (yc - y0[cross]) * (x1[cross] - x0[cross]) / (y1[cross] - y0[cross]))
            for a, b in zip(xs[0::2], xs[1::2]): m[r, max(0, int(np.ceil(a - 0.5))):min(W, int(np.ceil(b - 0.5)))] = True
    return m
def clear_gap(a, b, limit=200):   # square pixels of clear space between two masks: -1 if they overlap, 0 if they touch
    g = a.copy(); k = 0
    while not (g & b).any() and k < limit: g = L.grow(g, 1); k += 1
    return k - 1
def window_gap(a, b, limit=60):
    ys, xs = np.where(a); y0, y1, x0, x1 = max(0, ys.min() - limit - 3), min(H, ys.max() + limit + 4), max(0, xs.min() - limit - 3), min(W, xs.max() + limit + 4)
    return clear_gap(a[y0:y1, x0:x1], b[y0:y1, x0:x1], limit + 1)
(mx0, mx1), (my0, my1) = FIX['mask']['x'], FIX['mask']['y']
place4 = np.zeros((H, W), bool); place4[my0:my1 + 1, mx0:mx1 + 1] = True
grey = FIX['piece']['grey']; split2 = np.array(Image.open(os.path.join(D, 'ra-A-split.png')).convert('L'))
cab = next(p for p in KIT['pieces'] if p['name'] == FIX['piece']['name'])
if cab['grey'] != grey or cab['place'] != FIX['piece']['place']: raise SystemExit("STOP: fix4A.json's piece is not version 4's cabinet")
split4 = np.where(place4, grey, 0).astype(np.uint8)
place2, place3 = binary('ra-A-place.png'), binary('ra-A-place3.png')
plain = raster(PLAIN['polygons'] if 'polygons' in PLAIN else [PLAIN['polygon']])
failures = []
if (place4 & place3).any() or window_gap(place4, place3) < 15: failures.append("step 4's mask is within 15 px of step 3's")
if (place4 & plain).any(): failures.append("step 4's mask touches the plain-wall area")
FM = {f['name']: raster(f['polygons']) for f in FEAT['features']}
gaps = {}
gone = []   # features step 2 painted over entirely: not in RA-A-4, so not measured
for f in FEAT['features']:
    fm = FM[f['name']]
    if not (fm & ~place2).any(): gone.append(f['name']); continue
    inside = int((fm & place4).sum())
    if inside: gaps[f['name']] = {'status': 'crosses' if (fm & ~place4).any() else 'inside', 'pxInside': inside, 'test': f['test']}; continue
    g = window_gap(fm, place4)
    if g < 60: gaps[f['name']] = {'status': 'clear', 'clearPx': g, 'test': f['test']}
if gaps.get('pipe run', {}).get('clearPx', 99) < 15: failures.append(f"step 4's mask is {gaps['pipe run']['clearPx']} px from the pipe run")
lb = FIX['measured']['secondLight']['box']; light = np.zeros((H, W), bool); light[lb[1]:lb[3] + 1, lb[0]:lb[2] + 1] = True
area = (split2 == grey) | place4   # the cabinet's lift after step 4: its step-2 split area with step 4's mask
if failures: raise SystemExit('STOP: ' + ' | '.join(failures))
save(place4, 'ra-A-place4.png'); save(split4, 'ra-A-split4.png')
ys, xs = np.where(place4)
out = {'fix': {'file': 'fix4A.json', 'sha256': hashlib.sha256(open(os.path.join(D, 'fix4A.json'), 'rb').read()).hexdigest()}, 'picture': FIX['picture'],
       'place4': {'px': int(place4.sum()), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1], 'widthPx': int(mx1 - mx0 + 1), 'heightPx': int(my1 - my0 + 1)},
       'split4': {f"{FIX['piece']['place']} {FIX['piece']['name']}": grey},
       'expected4': {'maskedShare': round(float(place4.mean()), 4), 'rawMaskAlpha': alpha(place4)},
       'lift4Area': {'px': int(area.sum()), 'step2SplitPx': int((split2 == grey).sum()), 'addedByStep4Px': int((place4 & ~(split2 == grey)).sum())},
       'secondLight': {'box': lb, 'px': int(light.sum()), 'insideMaskPx': int((light & place4).sum())},
       'gaps4': gaps, 'paintedOverInStep2': gone, 'gapToStep3Px': window_gap(place4, place3),
       'frameRule': FIX['frameRule']}
json.dump(out, open(os.path.join(D, 'kit4-A.json'), 'w'), indent=1)
print('step 4: mask', out['place4'], '| share', out['expected4']['maskedShare'], '| lift area', out['lift4Area'], '| light', out['secondLight'])
for k, v in gaps.items(): print(f"  {'TEST' if v['test'] else 'note'} {k}: {v}")
print('painted over in step 2, not measured:', gone)
