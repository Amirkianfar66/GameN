# Sheet RA-A version 7's review pictures, for the page only (the Lead, 13:59 on 19 November: "a before/after zoom of the cabinet,
# and the 402 x 742 crop"). They show RA-A-4, the AI-generated step-3 picture, before and after its right frame was drawn in code
# (frameA.py). Each carries a visible label saying it is AI-generated.
# - ra-A-frame-cabinet.png: the cabinet's right side at 3 times, before and after, side by side.
# - ra-A-frame-402.png: the 402 x 742 phone's 402 x 551 slice of the framed plate, at twice its stage size, as version 6's.
# Never an input, never an asset, never committed. Reads RA-A-4 and ra-A-4-frame.png, each checked against frame-A.json.
# Usage: python3 -I reviewFrameA.py <records folder>
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); REC = sys.argv[1]
FR, MAN = json.load(open(os.path.join(D, 'frame-A.json'))), json.load(open(os.path.join(D, 'room-a-ra-a.json')))
pix = lambda im: hashlib.sha256(np.ascontiguousarray(np.array(im)).tobytes()).hexdigest()
src = os.path.join(REC, FR['start']['file'])
if hashlib.sha256(open(src, 'rb').read()).hexdigest() != FR['start']['sha256']: sys.exit('STOP: not RA-A-4')
before = Image.open(src).convert('RGB'); after = Image.open(os.path.join(D, 'ra-A-4-frame.png')).convert('RGB')
if pix(after) != FR['outputs']['ra-A-4-frame.png']['pixelsSha256']: sys.exit('STOP: ra-A-4-frame.png is not the plate frame-A.json records')
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
    im = im.copy(); dd = ImageDraw.Draw(im, 'RGBA'); f = font(17); x0, y0, x1, y1 = dd.textbbox((0, 0), text, font=f)
    dd.rectangle([6, 6, 6 + (x1 - x0) + 14, 6 + (y1 - y0) + 12], fill=(10, 12, 18, 215)); dd.text((13, 11 - y0), text, font=f, fill=(255, 255, 255)); return im
box, S = (430, 610, 570, 900), 3
z = lambda im: im.crop(box).resize(((box[2] - box[0]) * S, (box[3] - box[1]) * S), Image.NEAREST)
pa, pb = tag(z(before), 'Before: RA-A-4'), tag(z(after), 'After: the frame drawn in code')
gap = 10; both = Image.new('RGB', (pa.width * 2 + gap, pa.height), (10, 12, 18)); both.paste(pa, (0, 0)); both.paste(pb, (pa.width + gap, 0))
labelled(both, 'AI-generated picture (RA-A-4), its right frame drawn in code', f"The cabinet's right side, x {box[0]}-{box[2]}, y {box[1]}-{box[3]}, 3 times: before and after.").save(os.path.join(D, 'ra-A-frame-cabinet.png'), optimize=True)
s = MAN['camera']['phones']['slices']['402x742']; x0, y0, x1, y1 = s['paintingRect']; Wd, SH = s['stage']
c = after.crop((round(x0), round(y0), round(x1), round(y1))).resize((2 * Wd, 2 * SH), Image.LANCZOS)
labelled(c, 'AI-generated picture (RA-A-4), its right frame drawn in code', "402x742: the phone's slice, twice its stage size").save(os.path.join(D, 'ra-A-frame-402.png'), optimize=True)
print('version 7 review pictures: cabinet, 402')
