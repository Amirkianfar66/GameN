# Sheet RA-E version 2: Echo's cabinet against RA-E-1's painted east-wall strip, on version 2's final step-2 mask (after the kit, so
# with the selective growth): the Lead, "confirm the cabinet's area stays inside the painted east-wall strip". RA-E-1 is view E's
# AI-generated step-1 picture. The painted corner of the east and south walls is the column in x 88-112 darkest on average over the
# cabinet's rows (y 600-980), a vertical line; in each row, every 10 px, the darkest column within 3 px of it, against the mask's
# right edge there; the guide's corner is its camera's (lines-E.json). Writes check-E2.json. Generates nothing.
# Usage: python3 -I checkE2.py
import hashlib, json, os
import numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
SRC, WANT = os.path.join(D, '_rec1', 'img', 'RA-E-1.png'), 'e0d928ef4c1dabd3968b20568bd0d6e3f923682df7f6d938c61bd26cb2d0730f'
if hashlib.sha256(open(SRC, 'rb').read()).hexdigest() != WANT: raise SystemExit("STOP: the records' img/RA-E-1.png is not RA-E-1")
G = json.load(open(os.path.join(D, 'lines-E.json')))
lum = np.array(Image.open(SRC).convert('L').filter(ImageFilter.GaussianBlur(1.0))).astype(float)
out = {'picture': {'name': 'RA-E-1', 'sha256': WANT, 'aiGenerated': True}, 'mask': {'file': 'ra-E-place.png', 'sha256': hashlib.sha256(open(os.path.join(D, 'ra-E-place.png'), 'rb').read()).hexdigest()}}
# Echo's cabinet and the painted corner of the east and south walls: the corner is the column in x 88-112 darkest on average over the
# cabinet's rows (y 600-980), a vertical line; in each row, every 10 px, the darkest column within 3 px of it, against the mask's edge
place = np.array(Image.open(os.path.join(D, 'ra-E-place.png')).convert('L')) > 127
cols = lum[600:981, 88:113].mean(axis=0); corner = 88 + int(np.argmin(cols)); rows = []
for y in range(600, 981, 10):
    inside = np.where(place[y, :200])[0]; edge = int(inside.max()); cx = corner - 3 + int(np.argmin(lum[y, corner - 3:corner + 4]))
    rows.append({'y': y, 'maskRightEdgeX': edge, 'paintedCornerX': cx, 'clearPx': cx - edge - 1})
clr = [r['clearPx'] for r in rows]
out['echoCabinet'] = {'how': "the painted corner of the east and south walls: the column in x 88-112 darkest on average over the cabinet's rows (y 600-980); in each row, every 10 px, the darkest column within 3 px of it, against the step-2 mask's right edge there",
                      'guideCornerX': G['eastSouthCorner'][0], 'paintedCornerX': corner, 'paintedLeftOfGuidePx': round(G['eastSouthCorner'][0] - corner, 1), 'rows': rows, 'maskRightEdgeX': int(np.median([r['maskRightEdgeX'] for r in rows])),
                      'clearPxMin': int(min(clr)), 'clearPxMedian': float(np.median(clr)), 'insideTheEastWallStrip': bool(min(clr) >= 0)}
json.dump(out, open(os.path.join(D, 'check-E2.json'), 'w'), indent=1)
print('Echo cabinet', {k: v for k, v in out['echoCabinet'].items() if k != 'rows'})
