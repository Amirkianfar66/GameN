# Sheet RA-B version 2's review pictures of the cells' code edit, for the page only (the Lead, 27 November: "a zoom of each box and
# the 402 x 742 view"). They show RA-B-1, the AI-generated step-1 picture, before and after two of each junction box's three lit cells
# were dimmed in code (dimB.py). Each carries a visible label saying it is AI-generated. As reviewFrameA.py made view A's.
# - ra-B-dim-boxes.png: each box at 6 times, before and after, side by side (nearest-neighbour, so every pixel shows as it is).
# - ra-B-dim-402.png: the 402 x 742 phone's 402 x 551 slice of the edited picture, at twice its stage size.
# Never an input, never an asset, never committed. Reads RA-B-1 and ra-B-1-dim.png, each checked against dim-B.json.
# Usage: python3 -I reviewDimB.py [records folder]
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); REC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, '_rec1')
DM, MAN = json.load(open(os.path.join(D, 'dim-B.json'))), json.load(open(os.path.join(D, '_readback-1', 'room-a-ra-b.json')))   # version 1's camera slices, the same in version 2
pix = lambda im: hashlib.sha256(np.ascontiguousarray(np.array(im)).tobytes()).hexdigest()
src = os.path.join(REC, 'img', 'RA-B-1.png')
if hashlib.sha256(open(src, 'rb').read()).hexdigest() != DM['picture']['sha256']: sys.exit('STOP: not RA-B-1')
before = Image.open(src).convert('RGB'); after = Image.open(os.path.join(D, 'ra-B-1-dim.png')).convert('RGB')
if pix(after) != DM['output']['pixelsSha256']: sys.exit('STOP: ra-B-1-dim.png is not the picture dim-B.json records')
def font(px):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()
def labelled(im, line1, line2):   # the AI-generated label, burned in at the top, its size fitted to the width
    w = im.width; px = max(13, round(w / 34))
    while px > 12 and max(ImageDraw.Draw(im).textlength(line1, font=font(px)), ImageDraw.Draw(im).textlength(line2, font=font(round(px * 0.8)))) > w - 2 * round(px * 0.6): px -= 1
    f1, f2 = font(px), font(round(px * 0.8)); h = round(px * 2.9)
    out = Image.new('RGB', (w, im.height + h), (10, 12, 18)); out.paste(im, (0, h)); dd = ImageDraw.Draw(out)
    dd.text((round(px * 0.6), round(px * 0.35)), line1, font=f1, fill=(255, 224, 160))
    dd.text((round(px * 0.6), round(px * 1.6)), line2, font=f2, fill=(235, 235, 235)); return out
def tag(im, text):   # a small caption in a panel's top-left corner
    im = im.copy(); dd = ImageDraw.Draw(im, 'RGBA'); f = font(16); x0, y0, x1, y1 = dd.textbbox((0, 0), text, font=f)
    dd.rectangle([5, 5, 5 + (x1 - x0) + 12, 5 + (y1 - y0) + 10], fill=(10, 12, 18, 215)); dd.text((11, 10 - y0), text, font=f, fill=(255, 255, 255)); return im
S, gap, panels = 6, 10, []
for name, b in DM['boxes'].items():
    x0, y0, x1, y1 = b['window']; box = (x0 - 12, y0 - 10, x1 + 12, y1 + 10)
    z = lambda im: im.crop(box).resize(((box[2] - box[0]) * S, (box[3] - box[1]) * S), Image.NEAREST)
    panels += [tag(z(before), f'{name.capitalize()} box: before'), tag(z(after), f'{name.capitalize()} box: after')]
W = sum(p.width for p in panels) + gap * (len(panels) - 1); Hh = max(p.height for p in panels)
row = Image.new('RGB', (W, Hh), (10, 12, 18)); x = 0
for p in panels: row.paste(p, (x, 0)); x += p.width + gap
labelled(row, 'AI-generated picture (RA-B-1), two lit cells in each box dimmed in code',
         "Each junction box keeps its top cell lit; its other two are unlit steel. 6 times, before and after.").save(os.path.join(D, 'ra-B-dim-boxes.png'), optimize=True)
s = MAN['camera']['phones']['slices']['402x742']; x0, y0, x1, y1 = s['paintingRect']; Wd, SH = s['stage']
c = after.crop((round(x0), round(y0), round(x1), round(y1))).resize((2 * Wd, 2 * SH), Image.LANCZOS)
labelled(c, 'AI-generated picture (RA-B-1), two lit cells in each box dimmed in code', "402x742: the phone's slice, twice its stage size").save(os.path.join(D, 'ra-B-dim-402.png'), optimize=True)
print('review pictures: ra-B-dim-boxes.png, ra-B-dim-402.png')
