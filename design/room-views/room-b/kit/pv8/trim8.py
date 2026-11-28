# C's version 7 (the Lead, 18 November): PV6-C-3, C's accepted step 2, paints three glass jars on the cart's top, and their tops
# reach into the stool seat's step-3 shape. The stool stands behind the cart, so the jars are in front of the seat. The seat's
# shape is trimmed by the cart's own lift from PV6-C-3 (the records page's layer, not a new cut, so the seat and the cart's front
# layer share one edge): the layer's alpha above 127, grown 1 px (a 3 x 3 max). Writes trim-<view>.json: that trim inside the
# stool's outline grown 2 px (the only place the seat's shape can be), as row runs (y, x0, x1, inclusive pixel indices), with the
# layer's and the step-2 picture's sha256 only; the pictures stay on the records page. Checks that the layer's colours are the
# step-2 picture's. Generates nothing.
# Usage: python3 -I trim8.py C <the cart's lift from step 2.png> <the step-2 picture.png>
import hashlib, importlib.util, json, os, sys, numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); V, lift, pic = sys.argv[1], sys.argv[2], sys.argv[3]; W, H = 1024, 1536
spec = importlib.util.spec_from_file_location('lift5', os.path.join(D, '..', 'pv5', 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
LABEL = {'C': ('PV6-C-3', 'B laptop cart')}[V]   # the step-2 picture and the piece whose lift trims the seat
la = np.asarray(Image.open(lift).convert('RGBA')); base = np.asarray(Image.open(pic).convert('RGB'))
if la.shape[:2] != (H, W) or base.shape[:2] != (H, W): sys.exit(f'STOP: the pictures are not {W} x {H}')
on = la[..., 3] > 0
if (la[..., :3][on] != base[on]).any(): sys.exit(f"STOP: the layer's colours are not {LABEL[0]}'s")
PIECES = json.load(open(os.path.join(D, f'pieces8-{V}.json'))); lab = np.asarray(Image.open(os.path.join(D, f'pv6-{V}-stations.png')).convert('L')).astype(int)
stool = next(p for p in PIECES if p['name'] == 'stool'); zone = L.grow(np.abs(lab - stool['grey']) <= 2, 2)
trim = L.grow(la[..., 3] > 127, 1) & zone
runs = []
for y in np.where(trim.any(axis=1))[0]:
    row = np.concatenate([[0], trim[y].astype(np.int8), [0]]); d = np.diff(row); starts, ends = np.where(d == 1)[0], np.where(d == -1)[0] - 1
    runs += [[int(y), int(a), int(b)] for a, b in zip(starts, ends)]
ys, xs = np.where(trim)
rec = {'view': V, 'what': f"the glass jars {LABEL[0]} paints on the cart's top reach into the stool seat's step-3 shape; the stool stands behind the cart, so the seat's shape is trimmed by the cart's lift and the jars stay in front of it (the Lead, 18 November)",
       'method': "the cart's lift from the step-2 picture (the records page's layer, not a new cut): its alpha above 127, grown 1 px (a 3 x 3 max), kept inside the stool's outline grown 2 px; row runs (y, x0, x1), inclusive pixel indices",
       'source': {'cartLift': {'label': f"{LABEL[0]}-B-laptop-cart", 'records': f"img/{LABEL[0]}-B-laptop-cart.png", 'sha256': sha(lift)},
                  'base': {'label': LABEL[0], 'records': f'img/{LABEL[0]}.png', 'sha256': sha(pic)}},
       'zone': "the stool's outline grown 2 px", 'px': int(trim.sum()), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())], 'runs': runs}
txt = json.dumps({k: v for k, v in rec.items() if k != 'runs'}, indent=1)[:-2] + ',\n "runs": [\n  ' + ',\n  '.join(json.dumps(r) for r in runs) + '\n ]\n}\n'   # a run a line
if json.loads(txt) != rec: sys.exit('STOP: the record does not read back')
open(os.path.join(D, f'trim-{V}.json'), 'w').write(txt)
print(json.dumps({k: rec[k] for k in ('source', 'px', 'bbox')}), len(runs), 'runs')
