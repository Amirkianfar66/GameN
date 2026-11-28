# C's version 8 (the Lead, 18 November; the owner's yes): a fix step, step 4, over PV6-C-4, step 3's picture. Two things fail by
# eye there. Step 2 painted the three glass jars on the cart only up to its PLACE mask's top edge, which blurred their tops off;
# and the dispenser's left side has no ink line and fades into the books. This measures, from PV6-C-4's pixels: each jar's
# outline below the cut (its own width), its base, and the flask's sloping sides; the dispenser's left side and its hatch's face;
# and the colours the guide draws with. It then sets each jar's clean top by its kind's proportions (recorded below) and the
# edge band by the Lead's numbers. Writes fix4-<view>.json: numbers, colours and the picture's sha256 only (the picture stays on
# the records page); kit8.py draws step 4's shapes and guide from it. Generates nothing.
# Usage: python3 -I fix8.py C <step-3 picture.png>
import hashlib, json, os, sys, numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); V, pic = sys.argv[1], sys.argv[2]; assert V == 'C'
rgb = np.asarray(Image.open(pic).convert('RGB')).astype(float); lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
med = lambda ys, xs: [int(round(v)) for v in np.median(rgb[np.ix_(ys, xs)].reshape(-1, 3), axis=0)]
darkest = lambda y, xa, xb: xa + int(np.argmin(lum[y, xa:xb + 1]))
def column(rows, xa, xb):   # an outline's column: the darkest in the window, the median over rows
    return int(np.median([darkest(y, xa, xb) for y in rows]))
# ---- the jars: each outline's column below step 2's cut, the base (its front edge at the centre column, its ends at the sides)
RATIO = 0.21   # each base ellipse's height over its width, as painted (coral 16/72, beads 9/44, flask 12/56): the rims take it too
jars = []
for name, kind, (la, lb), (ra, rb), rows, k in (('coral jar', 'cylinder', (164, 176), (236, 246), range(1141, 1156), 0.95),
                                               ('bead jar', 'cylinder', (245, 255), (289, 299), range(1124, 1148), 1.15)):
    L, R = column(rows, la, lb), column(rows, ra, rb); W = R - L; xc = (L + R) / 2
    bottom = max(y for y in range(1140, 1180) if lum[y, int(round(xc))] < 45)   # the base's front edge, at the centre column
    half = round(RATIO * W / 2, 1); base = round(bottom - half, 1); H = round(k * W); rim = round(base - H, 1)
    glass = med(list(rows), list(range(L + 3, L + 8)) + list(range(R - 7, R - 2)))
    jars.append({'name': name, 'kind': kind, 'outline': [L, R], 'width': W, 'baseBottom': bottom, 'baseCentre': base, 'ellipseHalfHeight': half,
                 'heightOverWidth': k, 'height': H, 'rimCentre': rim, 'glass': glass})
# the flask: its sides are straight below the cut (a cone); fitted over y 1100-1124, where both outlines are clean
fy = range(1100, 1125, 2); lx = [darkest(y, int(310 - (y - 1101) * 0.30) - 4, int(310 - (y - 1101) * 0.30) + 4) for y in fy]
rx = [darkest(y, int(345 + (y - 1101) * 0.32) - 4, int(345 + (y - 1101) * 0.32) + 4) for y in fy]
la_, lb_ = np.polyfit(np.array(fy, float) - 1100, lx, 1)[::-1]; ra_, rb_ = np.polyfit(np.array(fy, float) - 1100, rx, 1)[::-1]
baseW = int(np.median([darkest(y, 349, 358) - darkest(y, 294, 302) for y in range(1126, 1133)]))   # its widest, just above the base
fbottom = max(y for y in range(1130, 1150) if lum[y, 327] < 45); fhalf = round(RATIO * baseW / 2, 1)
NECK, NECKH, LIP = 0.4, 0.25, 1.18   # the neck's width over the base's, the neck's height over the base's width, the lip over the neck
neckW = round(NECK * baseW, 1); w0 = ra_ - la_; dw = rb_ - lb_   # the width at y 1100 (right intercept less left) and its growth per row
shoulder = round(1100 - (w0 - neckW) / dw, 1); xcs = (la_ + ra_ + (lb_ + rb_) * (shoulder - 1100)) / 2
neckH = round(NECKH * baseW); lip = round(shoulder - neckH, 1); lipW = round(LIP * neckW, 1)
fglass = med(list(range(1104, 1121)), list(range(312, 318)) + list(range(336, 342)))
flask = {'name': 'flask', 'kind': 'flask', 'sides': {'left': [round(float(la_), 2), round(float(lb_), 3)], 'right': [round(float(ra_), 2), round(float(rb_), 3)],
         'form': 'x = a + b (y - 1100), fitted over y 1100-1124'}, 'baseWidth': baseW, 'baseBottom': fbottom, 'ellipseHalfHeight': fhalf,
         'neckOverBase': NECK, 'neckWidth': neckW, 'shoulder': shoulder, 'axis': round(float(xcs), 1), 'neckHeightOverBase': NECKH, 'neckHeight': neckH,
         'lipCentre': lip, 'lipWidth': lipW, 'lipHalfHeight': round(RATIO * lipW / 2, 1), 'glass': fglass}
ink = med(list(range(1128, 1156)), [241])
# ---- the dispenser's left side: the housing's edge above the hatch (the middle of its soft ramp, rows 795-816), the hatch's
# face (its paper-white, brighter than 130, joined to the hatch's middle), the rounded top's left end and the bench
ramp = []
for y in range(795, 817):
    row = lum[y, 600:626]; lo, hi = np.median(row[:6]), np.median(row[14:20]); mid = (lo + hi) / 2
    ramp.append(600 + int(np.argmax(row > mid)) - 0.5)
side = round(float(np.median(ramp)), 1)
# the hatch: its top frame line (the first row from 805 whose middle, x 615-650, is darker than 60) and its face's rows (from the first
# to the last row whose middle is brighter than 140, so the handle's rows count too); in each face row, the face's left edge is the
# first column from 609 brighter than the middle of its ramp (between the darker of x 609-610 and the face at x 613-616)
frame = next(y for y in range(805, 867) if np.median(lum[y, 615:651]) < 60)
faceRows = [y for y in range(frame, 867) if np.median(lum[y, 615:651]) > 140]; faceLeft = {}
for y in range(faceRows[0], faceRows[-1] + 1):
    hi = float(np.median(lum[y, 613:617])); hit = np.where(lum[y, 609:617] > (min(lum[y, 609], lum[y, 610]) + hi) / 2)[0]
    faceLeft[int(y)] = int(hit[0]) + 609 if len(hit) else 617
housing = med(list(range(796, 817)), list(range(613, 620)))
# the right side's outline, which the left side should match: the darkest column in x 668-676 over rows 796-840, its median colour
rrows = list(range(796, 841)); rcols = [darkest(y, 668, 676) for y in rrows]
right = {'column': int(np.median(rcols)), 'rows': [796, 840], 'rgb': [int(round(v)) for v in np.median(np.array([rgb[y, x] for y, x in zip(rrows, rcols)]), axis=0)], 'widthPx': 1}
c0 = int(np.floor(side + 0.5)) - 4; c1 = int(np.floor(side + 0.5)) + 5   # 4 columns outside the side, 6 inside
# the rounded top's two lit lines (its rim and a bevel inside it) curve down into the left side and end at (609-610, 792) and
# (610-611, 794), read from the picture's numbers: the guide's ink starts under the rim and its housing colour under the bevel, and
# the guide leaves the corner above them as the picture has it (inside the band, so the new line can meet it)
band = {'side': side, 'outside': 4, 'inside': 6, 'columns': [c0, c1], 'top': 785, 'bottom': 865, 'insideRows': [785, frame - 2],
        'hatch': {'frameRow': frame, 'faceRows': [faceRows[0], faceRows[-1]], 'faceLeftByRow': faceLeft},
        'housing': housing, 'rightOutline': right, 'ink': {'rgb': right['rgb'], 'columns': [c0 + 2, c0 + 3], 'rows': [793, 865], 'widthPx': 2},
        'housingRows': [795, frame - 2],
        'rule': "the housing's left side, 4 px outside and 6 px inside, from its rounded top (y 785, below the shelf's line) to the bench (y 865); "
                "inside the side only above the hatch (its frame line and face below stay out), so none of the hatch's face; the guide draws "
                "the housing's colour inside and a 2 px line in the right outline's colour (1 px there; 2 so the edit reads it) just outside"}
rec = {'view': V, 'what': "step 4 over PV6-C-4: the three glass jars' tops, blurred off at step 2's PLACE mask, and the dispenser's left edge, which has no ink line (the Lead, 18 November; the owner's yes)",
       'method': "each jar's outline columns below the cut (the darkest column in a window, the median over rows), its base's front edge at the centre column; the flask's sides fitted as lines; the cylinders' heights and the flask's neck set by the proportions recorded here; the dispenser's side at the middle of its soft ramp, its hatch's face the paper-white from its left edge in each of the hatch's rows; colours as medians of the picture's pixels",
       'source': {'label': 'PV6-C-4', 'records': 'img/PV6-C-4.png', 'sha256': hashlib.sha256(open(pic, 'rb').read()).hexdigest()},
       'ellipseRatio': RATIO, 'jars': jars + [flask], 'ink': ink, 'band': band, 'shapeMargin': 2, 'cutBelow': 4}
json.dump(rec, open(os.path.join(D, f'fix4-{V}.json'), 'w'), indent=1)
print(json.dumps({'jars': [{k: j[k] for k in j if k not in ('glass',)} for j in rec['jars']], 'glass': [j['glass'] for j in rec['jars']], 'band': {k: band[k] for k in ('side', 'columns', 'top', 'bottom', 'insideRows', 'housing', 'rightOutline', 'ink', 'housingRows')},
                  'hatch': {**band['hatch'], 'faceLeftByRow': sorted(set(faceLeft.values()))}}, indent=1))
