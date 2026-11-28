# Sheet RA-B version 2's review overlays, for the page only, as sheet RA-A's (overlayA.py): RA-B-1, the AI-generated step-1 picture
# (here with its two cells per junction box dimmed in code, ra-B-1-dim.png), with version 2's step-2 mask edge (gold), the painted
# features of the 15 px test (featuresB.json: green inside a mask, cyan clear of it, magenta a named exception, its zone dashed), the
# two kept lit cells (pink), and the floor fit: the guide's back-wall foot (cyan dashes), the painted foot RA-B-1 shows (magenta), the
# painted far corner, and Vega's foot in the guide (hollow ring) and fitted (filled). Each picture carries a visible label saying it
# is AI-generated. Writes ra-B-review-full.png, the desk at 2 times (ra-B-review-desk.png), the crates at 2 times
# (ra-B-review-crates.png) and the 402 x 742 phone's slice at twice its stage size (ra-B-review-402.png). For review: never an input,
# never an asset, never committed. Checks ra-B-1-dim.png against dim-B.json first. Usage: python3 -I overlayB.py
import hashlib, importlib.util, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); J = lambda f: json.load(open(os.path.join(D, f)))
FEAT, KIT, FIT, DIM = J('featuresB.json'), J('kit-B.json'), J('fit-B.json'), J('dim-B.json')
MAN = J('_readback-1/room-a-ra-b.json')   # version 1 as published: the camera's slices, the same in version 2
SRC = os.path.join(D, 'ra-B-1-dim.png')
if hashlib.sha256(np.ascontiguousarray(np.array(Image.open(SRC).convert('RGB'))).tobytes()).hexdigest() != DIM['output']['pixelsSha256']: raise SystemExit('STOP: ra-B-1-dim.png is not the picture dim-B.json records')
spec = importlib.util.spec_from_file_location('lift5', os.path.join(D, 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
place = np.array(Image.open(os.path.join(D, 'ra-B-place.png')).convert('L')) > 127
pic = np.array(Image.open(SRC).convert('RGB')).astype(float)
pic[place & ~L.shrink(place, 2)] = (255, 209, 102)
img = Image.fromarray(pic.round().clip(0, 255).astype(np.uint8)); d = ImageDraw.Draw(img)
KF = {f['name']: f for f in KIT['featureTest']['features']}
def dashed(pts, col, w=1, on=4, off=4):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(1, int(max(abs(x1 - x0), abs(y1 - y0)))); step = on + off
        for i in range(0, n, step): t0, t1 = i / n, min(1, (i + on) / n); d.line([(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0), (x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1)], fill=col, width=w)
for f in FEAT['features']:
    k = KF[f['name']]; col = (255, 255, 255) if not f['test'] else (255, 64, 200) if k.get('exception') else (124, 252, 154) if k['step2']['status'] == 'inside' else (0, 229, 255)
    for poly in f['polygons']: d.line([tuple(p) for p in poly] + [tuple(poly[0])], fill=col, width=1)
    for z in f.get('exceptions', []): dashed([tuple(p) for p in z['zone']] + [tuple(z['zone'][0])], (255, 64, 200), 1, 3, 3)
for lt in FEAT['lights']: x0, y0, x1, y1 = lt['box']; d.rectangle([x0 - 3, y0 - 3, x1 + 2, y1 + 2], outline=(255, 111, 181), width=2)
m = FIT['measured']; foot = lambda x: m['backWallFoot']['painted']['slope'] * x + m['backWallFoot']['painted']['intercept']
gx0, gy0 = m['backWallFoot']['guide']['at']; gx1, gy1 = m['backWallFoot']['guide']['to']; g = lambda x: gy0 + (gy1 - gy0) * (x - gx0) / (gx1 - gx0)
dashed([(gx0, g(gx0)), (1024, g(1024))], (0, 229, 255), 2, 8, 5)
c = m['farCorner']['painted']; d.line([(c, foot(c)), (1024, foot(1024))], fill=(255, 79, 216), width=2); d.line([(c, 500), (c, foot(c))], fill=(255, 79, 216), width=2)
dashed([(m['farCorner']['guide'], 500), (m['farCorner']['guide'], g(m['farCorner']['guide']))], (0, 229, 255), 2, 8, 5)
v = FIT['vega']; (ax, ay), (bx, by) = v['footGuide'], v['footFitted']
d.ellipse([ax - 9, ay - 4, ax + 9, ay + 4], outline=(0, 229, 255), width=2); d.ellipse([bx - 9, by - 4, bx + 9, by + 4], fill=(255, 79, 216))
def font(px):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()
def labelled(im, line2):   # the AI-generated label, burned in at the top, its size fitted to the width
    w = im.width; line1 = 'AI-generated picture (RA-B-1): review overlay'; px = max(13, round(w / 34))
    while px > 12 and max(ImageDraw.Draw(im).textlength(line1, font=font(px)), ImageDraw.Draw(im).textlength(line2, font=font(round(px * 0.8)))) > w - 2 * round(px * 0.6): px -= 1
    f1, f2 = font(px), font(round(px * 0.8)); h = round(px * 2.9)
    out = Image.new('RGB', (w, im.height + h), (10, 12, 18)); out.paste(im, (0, h)); dd = ImageDraw.Draw(out)
    dd.text((round(px * 0.6), round(px * 0.35)), line1, font=f1, fill=(255, 224, 160)); dd.text((round(px * 0.6), round(px * 1.6)), line2, font=f2, fill=(235, 235, 235)); return out
V = FIT['version']
labelled(img, f'Sheet RA-B v{V}: gold mask edge; green/cyan/magenta features; cyan dashes guide foot, magenta painted foot').save(os.path.join(D, 'ra-B-review-full.png'), optimize=True)
for name, box, what in (('desk', (330, 740, 720, 1110), 'Vega\'s desk, fitted to the painted floor'), ('crates', (0, 820, 360, 1180), 'Atlas\'s crates and the left wall')):
    z = img.crop(box); z = z.resize((z.width * 2, z.height * 2), Image.LANCZOS)
    labelled(z, f'{what}: x {box[0]}-{box[2]}, y {box[1]}-{box[3]}, twice its size').save(os.path.join(D, f'ra-B-review-{name}.png'), optimize=True)
s = MAN['camera']['phones']['slices']['402x742']; x0, y0, x1, y1 = s['paintingRect']; W, SH = s['stage']
c = img.crop((round(x0), round(y0), round(x1), round(y1))).resize((2 * W, 2 * SH), Image.LANCZOS)
labelled(c, "402x742: the phone's slice, twice its stage size").save(os.path.join(D, 'ra-B-review-402.png'), optimize=True)
print('review overlays: full, desk, crates, 402')
