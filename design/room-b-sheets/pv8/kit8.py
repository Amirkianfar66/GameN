# Version 3 (the capsule grown 2 px, not 6; see below). Version 2: the PLACE kit of a view B to E (the capsule units are pieces of their own) (PV6-A's kit6.py, for any view), from guide7.mjs's renders: pv6-A-furniture.png, the tight outlines of every piece in view (binary); pv6-A-
# place.png, the PLACE edit's mask: the outlines grown 6 px (as fix2_tools.py's step 2); pv6-A-split.png, each piece's outline
# grown 6 px in its own grey, the nearer drawn over the farther, so the nearer piece owns an overlap; the mask's shapes (its
# connected parts) with the pieces each holds; the expected share and alpha hash (alpha 0 = repaint). Writes kit6.json.
# Usage: python3 -I kit8.py <view>
import hashlib, importlib.util, json, os, numpy as np
from PIL import Image
import sys
D = os.path.dirname(os.path.abspath(__file__)); W, H, GROW = 1024, 1536, 6; V = sys.argv[1]; assert V in 'BCDE' and len(V) == 1
spec = importlib.util.spec_from_file_location('lift5', os.path.join(D, '..', 'pv5', 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
PIECES = json.load(open(os.path.join(D, f'pieces8-{V}.json')))
binary = lambda f: np.array(Image.open(os.path.join(D, f)).convert('L')) > 127
save = lambda a, f: Image.fromarray((a * 255).astype(np.uint8) if a.dtype == bool else a.astype(np.uint8), 'L').save(os.path.join(D, f), optimize=True)
alpha = lambda a: hashlib.sha256(np.where(a, 0, 255).astype(np.uint8).tobytes()).hexdigest()
furn = binary(f'pv6-{V}-furniture.png'); lab = np.array(Image.open(os.path.join(D, f'pv6-{V}-stations.png')).convert('L')).astype(int)
pieces = []
for p in PIECES:
    m = np.abs(lab - p['grey']) <= 2
    if not m.any(): continue
    ys, xs = np.where(m); pieces.append({**p, 'px': int(m.sum()), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1], 'visibleCentreX': round(float(xs.mean())), 'cutByEdge': bool(xs.min() == 0 or xs.max() == W - 1)})
# version 3 (the Lead, 18 November): the capsule's shape is the closed housing's own outline with at most 2 px to spare (its hatch
# slides up inside it, so it needs no room above); every other piece keeps 6 px. The mask is the union of the grown outlines.
# version 4 (the Lead and the owner, 18 November): where the capsule is in the picture it is painted alone, in a step 3 after the
# furniture: step 2's mask and split map hold the furniture only; step 3's mask is the capsule's outline grown 2 px, its own split map.
CAP = [p for p in pieces if p['name'] == 'food capsule']; STEP2 = [p for p in pieces if p['name'] != 'food capsule']
place = np.zeros((H, W), bool); split = np.zeros((H, W), np.uint8)
for p in sorted(STEP2, key=lambda p: p['grey']): g = L.grow(np.abs(lab - p['grey']) <= 2, GROW); place |= g; split[g] = p['grey']
place3 = np.zeros((H, W), bool); split3 = np.zeros((H, W), np.uint8)
for p in CAP: g = L.grow(np.abs(lab - p['grey']) <= 2, 2); place3 |= g; split3[g] = p['grey']
for p in pieces: p['step'] = 3 if p in CAP else 2
assert not (furn & ~(place | place3)).any(), 'an outline is outside the masks'
assert ((split > 0) == place).all(), 'the split map is not the PLACE mask'
pieces.sort(key=lambda p: p['visibleCentreX'])
def shapes_of(mask, smap):
    comp, sizes = L.parts(mask); out = []
    for c in range(1, len(sizes)):
        m = comp == c; ys, xs = np.where(m); greys = set(int(g) for g in np.unique(smap[m])) - {0}
        out.append({'pieces': [i for i, p in enumerate(pieces) if p['grey'] in greys], 'px': int(m.sum()), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1], 'visibleCentreX': round(float(xs.mean())),
                    'cutByEdge': bool(xs.min() == 0 or xs.max() == W - 1), 'tall': round((ys.max() + 1 - ys.min()) / max(1, xs.max() + 1 - xs.min()), 2)})
    return sorted(out, key=lambda s: s['visibleCentreX'])
shapes = shapes_of(place, split)
save(place, f'pv6-{V}-place.png'); save(split, f'pv6-{V}-split.png')
# the split maps' pieces in their left-to-right order, as before
out = {'pieces': pieces, 'shapes': shapes, 'split': {f"{p['place']} {p['name']}": p['grey'] for p in pieces if p['name'] != 'food capsule'}, 'outlineShare': round(float(furn.mean()), 4),
       'expected': {'maskedShare': round(float(place.mean()), 4), 'rawMaskAlpha': alpha(place), 'over10': bool(place.mean() > 0.10)}}
if CAP:   # version 4: step 3, the capsule alone
    save(place3, f'pv6-{V}-place3.png'); save(split3, f'pv6-{V}-split3.png')
    out |= {'shapes3': shapes_of(place3, split3), 'split3': {f"{p['place']} {p['name']}": p['grey'] for p in pieces if p['name'] == 'food capsule'}, 'expected3': {'maskedShare': round(float(place3.mean()), 4), 'rawMaskAlpha': alpha(place3)}}
json.dump(out, open(os.path.join(D, f'kit8-{V}.json'), 'w'), indent=1)
print('outlines', out['outlineShare'], '| PLACE mask', out['expected']['maskedShare'], '(over 10%)' if out['expected']['over10'] else '', '| step 3', out.get('expected3'), '|', len(shapes), 'shapes:', ' | '.join(' + '.join(f"{pieces[i]['place']}'s {pieces[i]['name']}" for i in s['pieces']) + f" x {s['bbox'][0]}-{s['bbox'][2]}" for s in shapes))
