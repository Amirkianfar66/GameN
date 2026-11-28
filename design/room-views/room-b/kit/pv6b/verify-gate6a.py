# Passes or fails a verify folder (verify6a.cjs, then verify-fit6a.py) for Room B test page v5: on both phones the plate drawn
# at its full size where scene.json puts it, the skylight's holder and the layers on it, the layers and slots drawn in
# occlusion.json's order, the placeholder shapes in their slots, no console or load errors, the skylight's voyage on the
# painted black (IoU 0.9 or more, at most 100 stage pixels off it, none elsewhere), the room with its layers and no people
# drawn as PV6-A-3 (mean difference at most 0.5, 99th percentile at most 4 levels), and the page's frames matching the copy's
# (mean difference at most 2 levels), and who is in front of whom as rendered from the copy matching the page's numbers (within
# half a percentage point). Usage: python3 -I verify-gate6a.py <verify folder>
import json, os, sys, numpy as np
from PIL import Image
V = os.path.abspath(sys.argv[1]); v = json.load(open(os.path.join(V, 'verify.json'))); f = json.load(open(os.path.join(V, 'fit.json')))
bad = [f'errors: {v["errors"]}'] if v['errors'] else []
for key, m in v['phones'].items():
    if not m['plateOk']: bad.append(f'{key}: the plate is drawn {m["pic"]["width"]} wide, not {m["plateWanted"]["width"]}')
    if not m['holdersOnPlate']: bad.append(f'{key}: the skylight is off the plate')
    if not m['bandsOnPlate']: bad.append(f'{key}: the layers are off the plate')
    if not m['orderOk']: bad.append(f"{key}: drawn as {m['layers']}, not {m['order']}")
    if not m['slotsOk']: bad.append(f'{key}: a slot is not filled as scene.json says')
    a = np.array(Image.open(os.path.join(V, f'{key}-rebuild.png')).convert('RGB')).astype(int); b = np.array(Image.open(os.path.join(V, f'{key}-placed.png')).convert('RGB')).astype(int)
    d = np.abs(a - b).max(axis=2); m['rebuild'] = {'meanAbsDiff': round(float(d.mean()), 3), 'p99': int(np.percentile(d, 99)), 'max': int(d.max())}
    if m['rebuild']['meanAbsDiff'] > 0.5 or m['rebuild']['p99'] > 4: bad.append(f"{key}: the room and its layers differ from PV6-A-3: {m['rebuild']}")
    for name, r in f[key].items():
        if r['iouWithPictureBlack'] < 0.9 or r['outsidePictureBlackPx'] > 100 or r['magentaElsewherePx'] > 0: bad.append(f'{key} {name}: IoU {r["iouWithPictureBlack"]}, {r["outsidePictureBlackPx"]} px off the painted black, {r["magentaElsewherePx"]} px elsewhere')
# who is in front of whom, as rendered from this copy, against the page's own numbers (within half a percentage point)
c = json.load(open(os.path.join(V, 'cover.json'))); page = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '_cover', 'cover.json')))
for key, people in page.items():
    for pid, r in people.items():
        if (r.get('pressCentreCovered') or 0) > 0.5: bad.append(f'{key} {r["name"]}: the press area\'s centre is behind furniture ({r["pressCentreCovered"]})')
        for k in ('hiddenShare', 'boxShare', 'faceShare', 'pressShare', 'pressCentreCovered'):
            a, b = r[k], c.get(key, {}).get(pid, {}).get(k)
            if (a is None) != (b is None) or (a is not None and abs(a - b) > 0.005): bad.append(f'{key} {r["name"]} {k}: page {a}, copy {b}')
for name, r in f['frames'].items():
    if not r['sameSize'] or r['meanDiff'] > 2: bad.append(f'frame {name}: {r}')
print('verify: ' + ('pass' if not bad else 'FAIL: ' + '; '.join(bad)) + ' · ' + ', '.join(f'{k} {n} IoU {r["iouWithPictureBlack"]}' for k in v['phones'] for n, r in f[k].items()) + ' · ' + ', '.join(f"{k} layers {'+'.join(m['layers'])}, rebuild {m['rebuild']}" for k, m in v['phones'].items()) + ' · frames ' + ', '.join(f"{n} {r.get('meanDiff')}" for n, r in f['frames'].items()) + ' · in front, as rendered: ' + '; '.join(f"{k} " + ', '.join(f"{r['name']} {100 * r['hiddenShare']:.1f}%/box {100 * r['boxShare']:.1f}%" for r in v2.values()) for k, v2 in c.items()))
sys.exit(1 if bad else 0)
