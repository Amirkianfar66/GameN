# C's version 6 (the Lead, 18 November): the two lit strips at the foot of the back wall in C's step-1 picture, which read as a
# level gauge, cut from the picture so that step 3 can repaint each as a plain vent grille. In each window: the lit teal cells
# (G > R + 35, B > R + 25, G > 110), and the plaque around them, bounded by its dark outer frame: the darkest row or column
# within 8 px outside the cells on each side. Writes strips-<view>.json: the boxes (inclusive pixel indices) and the picture's
# sha256 only; the picture itself stays on the records page. Generates nothing.
# Usage: python3 -I strips8.py C <step-1 picture.png>
import hashlib, json, os, sys, numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); V, pic = sys.argv[1], sys.argv[2]
WINDOWS = {'C': [('vent strip left', (270, 925, 350, 975)), ('vent strip right', (765, 925, 845, 975))]}   # x0, y0, x1, y1 (exclusive)
im = np.asarray(Image.open(pic).convert('RGB')).astype(int); R, G, B = im[..., 0], im[..., 1], im[..., 2]
L = 0.299 * R + 0.587 * G + 0.114 * B; teal = (G > R + 35) & (B > R + 25) & (G > 110)
out = []
for name, (x0, y0, x1, y1) in WINDOWS[V]:
    ys, xs = np.nonzero(teal[y0:y1, x0:x1]); cx0, cx1, cy0, cy1 = x0 + xs.min(), x0 + xs.max(), y0 + ys.min(), y0 + ys.max()
    row = lambda y: L[y, cx0:cx1 + 1].mean(); col = lambda x: L[cy0:cy1 + 1, x].mean()
    top = min(range(cy0 - 8, cy0), key=row); bottom = min(range(cy1 + 1, cy1 + 9), key=row)
    left = min(range(cx0 - 9, cx0), key=col); right = min(range(cx1 + 1, cx1 + 10), key=col)
    out.append({'name': name, 'window': [x0, y0, x1 - 1, y1 - 1], 'cells': [int(cx0), int(cy0), int(cx1), int(cy1)], 'cellsPx': int(teal[y0:y1, x0:x1].sum()),
                'plaque': [int(left), int(top), int(right), int(bottom)]})
rec = {'view': V, 'what': "the lit strips at the foot of the back wall, each a plaque of four teal cells that reads as a level gauge, cut from the step-1 picture for step 3 to repaint as a plain vent grille (the Lead, 18 November)",
       'method': 'the lit teal cells (G > R + 35, B > R + 25, G > 110) in each window, and the plaque around them bounded by its dark outer frame: the darkest row or column within 8 px outside the cells on each side; boxes are inclusive pixel indices',
       'source': {'label': f'PV6-{V}-2', 'sha256': hashlib.sha256(open(pic, 'rb').read()).hexdigest()}, 'strips': out}
json.dump(rec, open(os.path.join(D, f'strips-{V}.json'), 'w'), indent=1)
print(json.dumps(rec['strips']))
