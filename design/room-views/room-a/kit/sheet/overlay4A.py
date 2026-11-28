# Sheet RA-A's step-4 review overlays, for the page only (version 6; the Lead, 13:07 and 13:24 on 19 November): RA-A-4, the
# AI-generated step-3 picture, with step 4's mask edge (gold), the frame's limit for the 15 px rule (x 537, cyan, dashed), the
# grille's edge (x 553, magenta, dashed, on the grille's rows) and the second orange light (pink box). Each picture carries a visible
# label saying it is AI-generated. Writes the cabinet's right side at 3 times (ra-A-review4-cabinet.png) and the 402 x 742 phone's
# slice at twice its stage size (ra-A-review4-402.png). These are for review: never an input, never an asset, never committed.
# Reads RA-A-4 from _in4/ and checks its sha256 first. Usage: python3 -I overlay4A.py
import hashlib, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); J = lambda f: json.load(open(os.path.join(D, f)))
FIX, K4, MAN = J('fix4A.json'), J('kit4-A.json'), J('room-a-ra-a.json')
SRC = os.path.join(D, '_in4/img/RA-A-4.png')
if hashlib.sha256(open(SRC, 'rb').read()).hexdigest() != FIX['picture']['sha256']: raise SystemExit('STOP: _in4/img/RA-A-4.png is not RA-A-4')
place4 = np.array(Image.open(os.path.join(D, 'ra-A-place4.png')).convert('L')) > 127
pic = np.array(Image.open(SRC).convert('RGB')).astype(float)
inner = place4.copy(); inner[1:-1, 1:-1] = place4[1:-1, 1:-1] & place4[:-2, 1:-1] & place4[2:, 1:-1] & place4[1:-1, :-2] & place4[1:-1, 2:]
edge = place4 & ~inner; pic[edge] = (255, 209, 102)
img = Image.fromarray(pic.round().clip(0, 255).astype(np.uint8)); d = ImageDraw.Draw(img)
R = FIX['frameRule']; (my0, my1) = FIX['mask']['y']
def dashed(x, y0, y1, col):
    for y in range(y0, y1, 6): d.line([(x, y), (x, min(y + 3, y1))], fill=col, width=1)
dashed(R['frameOuterEdgeAtMostX'] + 0.5, my0 - 8, my1 + 8, (0, 229, 255))
dashed(R['grilleEdgeX'] - 0.5, R['rows'][0], R['rows'][1], (255, 64, 200))
lb = FIX['measured']['secondLight']['box']; d.rectangle([lb[0] - 2, lb[1] - 2, lb[2] + 2, lb[3] + 2], outline=(255, 111, 181), width=1)
def font(px):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()
def labelled(im, line2):   # the AI-generated label, burned in at the top
    im = im.copy(); w = im.width; px = max(13, round(w / 34)); f1, f2 = font(px), font(round(px * 0.8)); h = round(px * 2.9)
    dd = ImageDraw.Draw(im, 'RGBA'); dd.rectangle([0, 0, w, h], fill=(10, 12, 18, 225))
    dd.text((round(px * 0.6), round(px * 0.35)), 'AI-generated picture (RA-A-4): review overlay', font=f1, fill=(255, 224, 160))
    dd.text((round(px * 0.6), round(px * 1.6)), line2, font=f2, fill=(235, 235, 235)); return im
box = (330, 560, 620, 930); z = img.crop(box); z = z.resize((z.width * 3, z.height * 3), Image.NEAREST)
labelled(z, f"Step 4's mask on the cabinet's right side, x {box[0]}-{box[2]}, y {box[1]}-{box[3]}, 3 times.").save(os.path.join(D, 'ra-A-review4-cabinet.png'), optimize=True)
s = MAN['camera']['phones']['slices']['402x742']; x0, y0, x1, y1 = s['paintingRect']; Wd, SH = s['stage']
c = img.crop((round(x0), round(y0), round(x1), round(y1))).resize((2 * Wd, 2 * SH), Image.LANCZOS)
labelled(c, "402x742: step 4's mask on the phone's slice, twice its stage size").save(os.path.join(D, 'ra-A-review4-402.png'), optimize=True)
print('step-4 review overlays: cabinet, 402')
