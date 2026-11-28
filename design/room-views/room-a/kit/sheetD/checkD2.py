# Sheet RA-D version 2: the food capsule against RA-D-1's painted corner, on version 2's final step-3 mask (after the kit, so with the
# selective growth): the Lead, "confirm step 3's capsule stays on the painted east wall, right of the painted corner". RA-D-1 is view
# D's AI-generated step-1 picture. The painted corner of the north and east walls is the column in x 515-565 darkest on average over
# the capsule's rows, a vertical line; in each row, every 10 px, the darkest column within 3 px of it, against the mask's left edge
# there; the painted walls' feet meet at the deck at measure-D2.json's corner, the guide's corner is its camera's (lines-D.json).
# Also the window: the colour map's opening for steps 2 and 3 (the painted opening inside the guide's glass, guideD.mjs) against the
# painted opening (window-D.json). Writes check-D2.json. Generates nothing. Usage: python3 -I checkD2.py
import hashlib, json, os
import numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
SRC, WANT = os.path.join(D, '_rec1', 'img', 'RA-D-1.png'), 'c8842de16d63076fe69306b247bcc643b6dc5576f6c389364ce49bc970f2fe75'
if hashlib.sha256(open(SRC, 'rb').read()).hexdigest() != WANT: raise SystemExit("STOP: the records' img/RA-D-1.png is not RA-D-1")
G, ME, WD = (json.load(open(os.path.join(D, f))) for f in ('lines-D.json', 'measure-D2.json', 'window-D.json'))
lum = np.array(Image.open(SRC).convert('L').filter(ImageFilter.GaussianBlur(1.0))).astype(float)
sha = lambda f: hashlib.sha256(open(os.path.join(D, f), 'rb').read()).hexdigest()
place3 = np.array(Image.open(os.path.join(D, 'ra-D-place3.png')).convert('L')) > 127
ys = np.nonzero(place3.any(axis=1))[0]; y0, y1 = int(ys.min()), int(ys.max())
cols = lum[y0:y1 + 1, 515:566].mean(axis=0); corner = 515 + int(np.argmin(cols)); rows = []
for y in range(y0, y1 + 1, 10):
    inside = np.where(place3[y])[0]
    if not len(inside): continue
    edge = int(inside.min()); cx = corner - 3 + int(np.argmin(lum[y, corner - 3:corner + 4]))
    rows.append({'y': y, 'maskLeftEdgeX': edge, 'paintedCornerX': cx, 'clearPx': edge - cx - 1})
clr = [r['clearPx'] for r in rows]
out = {'picture': {'name': 'RA-D-1', 'sha256': WANT, 'aiGenerated': True}, 'mask3': {'file': 'ra-D-place3.png', 'sha256': sha('ra-D-place3.png')},
       'capsule': {'how': "the painted corner of the north and east walls: the column in x 515-565 darkest on average over the capsule's rows; in each row, every 10 px, the darkest column within 3 px of it, against step 3's mask's left edge there",
                   'rows': rows, 'paintedCornerX': corner, 'paintedCornerAtTheDeck': ME['corner']['painted'], 'guideCorner': G['corner'],
                   'maskLeftEdgeX': int(np.median([r['maskLeftEdgeX'] for r in rows])), 'clearPxMin': int(min(clr)),
                   'clearOfTheFeetCornerPx': round(float(min(r['maskLeftEdgeX'] for r in rows) - ME['corner']['painted'][0]), 1),
                   'note': "over the capsule's rows the darkest column by the corner is the shadow at the corner's pipes, right of where the walls' feet meet on the deck: the mask is measured against both",
                   'onThePaintedEastWall': bool(min(clr) >= 15)}}
rg = np.array(Image.open(os.path.join(D, 'ra-D-regions.png')).convert('RGB')).astype(int)
win = (np.abs(rg - np.array((255, 0, 255))).max(axis=2) <= 8); win &= (np.arange(win.shape[1]) < 450)[None, :] & (np.arange(win.shape[0]) < 820)[:, None]
wy, wx = np.nonzero(win)
out['window'] = {'mapOpeningPx': int(win.sum()), 'mapOpeningBox': [int(wx.min()), int(wy.min()), int(wx.max()) + 1, int(wy.max()) + 1], 'paintedOpeningPx': WD['region']['px'], 'paintedOpeningBox': WD['region']['box'],
                 'share': round(float(win.sum() / WD['region']['px']), 4), 'what': "steps 2 and 3's colour map takes the window's opening from the painted black where it lies inside the guide's glass, so the colour check's opening gate reads flat black on the painting and on the dry run's code guides alike"}
json.dump(out, open(os.path.join(D, 'check-D2.json'), 'w'), indent=1)
print('capsule', {k: v for k, v in out['capsule'].items() if k not in ('rows', 'how')}, '| window', out['window']['mapOpeningPx'], out['window']['mapOpeningBox'], out['window']['share'])
