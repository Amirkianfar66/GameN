# Sheets v1.1, for the page only: the before/after of step 1's guide where the wall ahead meets the deck, in the views with the
# slant treatment (B and E). The same crop, at 1:1, of the empty-room guide as version 1 published it (the sheet's read-back,
# _readback-1/img/) and as version 1.1 draws it. Drawn by code from code-drawn guides; writes ra-<V>-seams-v1.png and
# ra-<V>-seams-v11.png in the sheet's folder and prints their sha256 and how many pixels differ. Views without the treatment (C, D)
# get none. Generates nothing. Usage: python3 -I beforeafter.py <V>
import sys, os, hashlib
import numpy as np
from PIL import Image
V = sys.argv[1]
BOX = {'B': (280, 860, 1024, 1300), 'E': (100, 860, 844, 1300)}   # x0, y0, x1, y1: both ends of the wall's foot in view, and the far seams
if V not in BOX: print(f'view {V}: no slant treatment, so no before/after'); sys.exit(0)
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', f'sheet{V}')
old = Image.open(os.path.join(D, '_readback-1', 'img', f'ra-{V}-empty.png')).convert('RGB')
new = Image.open(os.path.join(D, f'ra-{V}-empty.png')).convert('RGB')
if old.size != (1024, 1536) or new.size != (1024, 1536): raise SystemExit('the guides are not 1024 x 1536')
a, b = np.asarray(old), np.asarray(new); diff = np.any(a != b, axis=2)
x0, y0, x1, y1 = BOX[V]
if diff[:, :].sum() != diff[y0:y1, x0:x1].sum(): print(f'note: {int(diff.sum() - diff[y0:y1, x0:x1].sum())} changed pixels lie outside the crop')
for tag, im in (('v1', old), ('v11', new)):
    f = os.path.join(D, f'ra-{V}-seams-{tag}.png'); im.crop(BOX[V]).save(f)
    print(f'ra-{V}-seams-{tag}.png', hashlib.sha256(open(f, 'rb').read()).hexdigest())
print(f'view {V}: {int(diff.sum())} pixels differ in the whole guide, {int(diff[y0:y1, x0:x1].sum())} in the crop {BOX[V]}')
