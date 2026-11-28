# The food capsule's hatch as PV6-C-4 paints it, by the method of view B's hatch record (PV6-B-4-hatch.json): the sheet's corners
# are camera report C's capsule.units[0].hatch projected with the view's camera (pv6-C-marks.json); the painted hatch is the largest
# connected warm paper-white region (R > 170, G > 150, B > 120, R >= B) within 40 px of the sheet's hatch, its corners the extreme
# points along the diagonals. Step 4 (sheet C version 8) repaints neither the hatch's face nor the lens, so they hold for PV6-C-5
# too (checked against step 4's mask when its picture comes). Code follows the painting (the Lead's decision for view B,
# 18 November). Writes hatch-C.json; the lens is added by lens8.py's measurement. Generates nothing. Usage: python3 -I hatch8c.py
import hashlib, json, os, numpy as np
from PIL import Image, ImageDraw
D = os.path.dirname(os.path.abspath(__file__)); P = lambda p: os.path.join(D, p)
PIC = json.load(open(P('picture.json'))); src = PIC['placed3']
if hashlib.sha256(open(P(src['file']), 'rb').read()).hexdigest() != src['sha256']: raise SystemExit(f"{src['file']} is not picture.json's")
rgb = np.asarray(Image.open(P(src['file'])).convert('RGB')).astype(int); H, W = rgb.shape[:2]
cam = json.load(open(P('../pv6-C-marks.json')))['camera']; rep = json.load(open(P('../camera-report-C.json')))['capsule']['units'][0]
C = np.array(cam['at'], float); yaw = np.radians(cam['yawDeg']); fwd = np.array([np.sin(yaw), 0, np.cos(yaw)]); right = np.array([np.cos(yaw), 0, -np.sin(yaw)])
def proj(p): d = np.array(p, float) - C; z = d @ fwd; return [cam['cx'] + cam['focalPx'] * (d @ right) / z, cam['horizonY'] - cam['focalPx'] * d[1] / z]
pts = [proj(p) for p in rep['hatch']]; xs, ys = [p[0] for p in pts], [p[1] for p in pts]
cx, cy = np.mean(xs), np.mean(ys); name = lambda p: ('top' if p[1] < cy else 'bottom') + ('Left' if p[0] < cx else 'Right')
sheet = {name(p): [round(p[0], 1), round(p[1], 1)] for p in pts}
assert len(sheet) == 4, sheet
R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]; white = (R > 170) & (G > 150) & (B > 120) & (R >= B)
quad = Image.new('L', (W, H), 0); ImageDraw.Draw(quad).polygon([tuple(sheet[k]) for k in ('topLeft', 'topRight', 'bottomRight', 'bottomLeft')], fill=255)
near = np.array(quad) > 0
from PIL import ImageFilter
near = np.array(Image.fromarray((near * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(81))) > 0   # within 40 px
cand = white & near
import importlib.util
spec = importlib.util.spec_from_file_location('lift5', P('../../pv5/lift5.py')); L5 = importlib.util.module_from_spec(spec); spec.loader.exec_module(L5)
lab, sizes = L5.parts(cand, conn=8); big = int(np.argmax(sizes[1:])) + 1; reg = lab == big
yy, xx = np.where(reg); s, d = xx + yy, xx - yy
painted = {'topLeft': [int(xx[np.argmin(s)]), int(yy[np.argmin(s)])], 'topRight': [int(xx[np.argmax(d)]), int(yy[np.argmax(d)])],
           'bottomRight': [int(xx[np.argmax(s)]), int(yy[np.argmax(s)])], 'bottomLeft': [int(xx[np.argmin(d)]), int(yy[np.argmin(d)])],
           'bbox': [int(xx.min()), int(yy.min()), int(xx.max()), int(yy.max())], 'px': int(reg.sum())}
# In C, that colour rule takes only the face's upper two thirds: the lower third, around the handle, is lit warm (B under 120). So
# the hatch is the face by fix8.py's rule (sheet C version 8: its rows from the frame line to the last row whose middle is brighter
# than 140; in each, its left edge at the middle of its ramp), out to the column before its dark right outline (the darkest in x 650-658)
lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
frame = next(y for y in range(805, 867) if np.median(lum[y, 615:651]) < 60); rows = [y for y in range(frame, 867) if np.median(lum[y, 615:651]) > 140]
lefts, rights = [], []
for y in range(rows[0], rows[-1] + 1):
    hi = float(np.median(lum[y, 613:617])); hit = np.where(lum[y, 609:617] > (min(lum[y, 609], lum[y, 610]) + hi) / 2)[0]
    lefts.append(int(hit[0]) + 609 if len(hit) else 617); rights.append(650 + int(np.argmin(lum[y, 650:659])) - 1)
x0, x1, y0, y1 = int(np.median(lefts)), int(np.median(rights)), rows[0], rows[-1]
face = {'topLeft': [x0, y0], 'topRight': [x1, y0], 'bottomRight': [x1, y1], 'bottomLeft': [x0, y1], 'bbox': [x0, y0, x1, y1], 'px': int((x1 - x0 + 1) * (y1 - y0 + 1)),
        'rule': "fix8.py's face rule: rows from the frame line to the last row whose middle (x 615-650) is brighter than 140; left edge at the middle of its ramp (median over the rows); right edge the column before the dark outline (median)",
        'leftEdges': sorted(set(lefts)), 'rightEdges': sorted(set(rights))}
rec = {'view': 'C', 'picture': {'label': src['label'], 'sha256': src['sha256']},
       'sheetHatchCorners': sheet, 'paintedHatchCorners': face, 'byViewBsColourRule': painted,
       'offsetPx': {k: [round(face[k][0] - sheet[k][0], 1), round(face[k][1] - sheet[k][1], 1)] for k in sheet},
       'projectedLens': [round(v, 1) for v in proj(rep['light']['at'])], 'projectedHandle': [[round(v, 1) for v in proj(p)] for p in rep['handle']],
       'method': "sheet corners: camera report C's capsule.units[0].hatch projected with the view's camera (pv6-C-marks.json); painted: the face by fix8.py's rule (paintedHatchCorners), since view B's colour rule (byViewBsColourRule: the largest connected warm paper-white region, R>170, G>150, B>120, R>=B, within 40 px of the sheet's hatch, its corners the extreme points along the diagonals) leaves out the face's warm-lit lower third here"}
json.dump(rec, open(P('hatch-C.json'), 'w'), indent=1); print(json.dumps(rec, indent=1))
