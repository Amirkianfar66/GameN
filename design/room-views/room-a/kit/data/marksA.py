# Room A view A's data page pictures: RA-A-4 (AI-generated, view A's accepted step-3 picture) with marks-A.json drawn over it by code:
# the hatch's opening as painted (near edges gold, far edges cyan), the stage's deck-level outline (white, dashed), the Motion
# builder's wrench point (pink), and Echo's wire point (pink) beside Echo's slot edge (white, dashed). Each picture carries a visible
# label saying it is AI-generated. For the page only: never an input or an asset, never committed. Reads RA-A-4 from the sheet's
# _in4/ and checks its sha256. Usage: python3 -I marksA.py
import hashlib, json, os
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); M = json.load(open(os.path.join(D, 'marks-A.json')))
SRC = os.path.join(D, '..', 'sheet', '_in4', 'img', 'RA-A-4.png')
if hashlib.sha256(open(SRC, 'rb').read()).hexdigest() != M['picture']['sha256']: raise SystemExit('STOP: not RA-A-4')
im = Image.open(SRC).convert('RGB')
def font(px):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()
def labelled(c, line2):
    w = c.width; px = max(13, round(w / 32)); f1, f2 = font(px), font(round(px * 0.8)); h = round(px * 2.9)
    d = ImageDraw.Draw(c, 'RGBA'); d.rectangle([0, 0, w, h], fill=(10, 12, 18, 225))
    d.text((round(px * 0.6), round(px * 0.35)), 'AI-generated picture (RA-A-4) with marks', font=f1, fill=(255, 224, 160))
    d.text((round(px * 0.6), round(px * 1.6)), line2, font=f2, fill=(235, 235, 235)); return c
def crop(box, S): return im.crop(box).resize(((box[2] - box[0]) * S, (box[3] - box[1]) * S), Image.LANCZOS)
def dashed(d, a, b, col, w=2, on=8, off=6):
    import math
    L = math.hypot(b[0] - a[0], b[1] - a[1]); n = int(L // (on + off)) + 1
    for i in range(n):
        t0, t1 = i * (on + off) / L, min(1, (i * (on + off) + on) / L)
        if t0 >= 1: break
        d.line([(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0), (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)], fill=col, width=w)
# the hatch, 2 times
box, S = (220, 1100, 600, 1510), 2; c = crop(box, S); d = ImageDraw.Draw(c); T = lambda p: ((p[0] - box[0]) * S, (p[1] - box[1]) * S)
H = M['hatch']; O = H['opening']['painting']; so = H['stageOutline']['painting']
for i in range(4): dashed(d, T(so[i]), T(so[(i + 1) % 4]), (255, 255, 255))
for e in H['farEdges']: d.line([T(O[e['from']]), T(O[e['to']])], fill=(0, 229, 255), width=3)
for e in H['nearEdges']: d.line([T(O[e['from']]), T(O[e['to']])], fill=(255, 196, 0), width=4)
wx, wy = T(H['wrenchSeen']['painting']); d.ellipse([wx - 7, wy - 7, wx + 7, wy + 7], outline=(255, 111, 181), width=3)
labelled(c, '2x: near edges gold, far edges cyan, stage outline dashed').save(os.path.join(D, 'marks-A-hatch.png'), optimize=True)
# Echo's wire point, 4 times
box, S = (350, 720, 470, 840), 4; c = crop(box, S); d = ImageDraw.Draw(c); T = lambda p: ((p[0] - box[0]) * S, (p[1] - box[1]) * S)
dashed(d, T((420, 720)), T((420, 840)), (255, 255, 255))
x, y = T(M['wire']['painting']); d.ellipse([x - 9, y - 9, x + 9, y + 9], outline=(255, 111, 181), width=3); d.line([(x - 16, y), (x + 16, y)], fill=(255, 111, 181), width=2); d.line([(x, y - 16), (x, y + 16)], fill=(255, 111, 181), width=2)
labelled(c, "Echo's wire point, 4x; dashed: Echo's slot edge, x 420").save(os.path.join(D, 'marks-A-wire.png'), optimize=True)
print('marks pictures: hatch, wire')
