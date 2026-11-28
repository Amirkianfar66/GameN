# Sheet RA-B version 2, for the page only: review pictures of RA-B-2, view B's AI-generated step-1 picture, each labelled as one in
# the picture itself. Never an input, an asset or a commit.
#   ra-B-2-masks.png            RA-B-2 with version 2's step-2 mask over it (tinted, its edge gold) and version 1.1's mask edge (white)
#   ra-B-2-desk.png             the desk's bottom edge, x 370-690, y 840-1080 at 3 times: version 2's mask (red), version 1.1's (gold),
#                               the desk's outline (cyan), RA-B-2's painted wall foot (magenta) and far deck seam (green)
#   ra-B-2-features-desk.png    the 15 px rule's features (cyan) and named exception zones (magenta) round the desk, at 2 times
#   ra-B-2-features-crates.png  the same round the crates
# Reads the records' RA-B-2 from _rec2/img (sha256 checked), the masks, featuresB.json and measure-B2.json; version 1.1's mask from
# the version 1.1 read-back. Usage: python3 -I overlayB2.py
import hashlib, importlib.util, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('lift5', os.path.join(D, 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
SRC = os.path.join(D, '_rec2', 'img', 'RA-B-2.png')
if hashlib.sha256(open(SRC, 'rb').read()).hexdigest() != 'aefddadcb3ce554c215d121dd7a49b8e4197a1dcce77325e54982252c8038605': raise SystemExit('STOP: not RA-B-2')
pic = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
binary = lambda f: np.array(Image.open(f).convert('L')) > 127
place, old, furn = binary(os.path.join(D, 'ra-B-place.png')), binary(os.path.join(D, '_readback-11', 'img', 'ra-B-place.png')), binary(os.path.join(D, 'ra-B-furniture.png'))
edge = lambda m: L.grow(m, 1) & ~m
FEAT, M = json.load(open(os.path.join(D, 'featuresB.json'))), json.load(open(os.path.join(D, 'measure-B2.json')))
def font(n):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, n)
    return ImageFont.load_default()
def label(im, lines, size=15):
    d = ImageDraw.Draw(im); f = font(size); h = 8 + len(lines) * (size + 5)
    d.rectangle([0, 0, im.size[0], h], fill=(12, 14, 20)); [d.text((8, 5 + i * (size + 5)), t, fill=(255, 224, 150) if i == 0 else (235, 235, 235), font=f) for i, t in enumerate(lines)]
    return im
# the whole picture with the masks
a = pic.copy(); a[place] = a[place] * 0.7 + np.array([255, 200, 60]) * 0.3; a[L.grow(edge(place), 1)] = [255, 200, 60]; a[edge(old) & ~place] = [255, 255, 255]
label(Image.fromarray(a.astype(np.uint8)), ['AI-generated picture: RA-B-2, view B\'s step 1', "Version 2's step-2 mask tinted, its edge gold; version 1.1's edge white where it differs"], 18).save(os.path.join(D, 'ra-B-2-masks.png'))
# the desk's bottom edge
box, S = (370, 840, 690, 1080), 3
b = pic.copy(); b[edge(old)] = [255, 200, 0]; b[edge(place)] = [255, 0, 0]; b[edge(furn)] = [0, 255, 255]
z = Image.fromarray(b.astype(np.uint8)).crop(box); w, h = z.size; z = z.resize((w * S, h * S), Image.NEAREST); d = ImageDraw.Draw(z)
for ln, col in ((M['wallFoot'], (255, 0, 255)), (M['farSeam'], (0, 255, 0))): d.line([((x - box[0]) * S, (ln['intercept'] + ln['slope'] * x - box[1]) * S) for x in (box[0], box[2])], fill=col, width=2)
label(z, ["AI-generated picture: RA-B-2, the desk's bottom edge, x 370-690, y 840-1080 at 3x", 'mask v2 red, v1.1 gold; desk outline cyan; painted wall foot magenta; painted far seam green'], 16).save(os.path.join(D, 'ra-B-2-desk.png'))
# the features and their zones
c = pic.copy(); c[edge(place)] = [255, 210, 60]; im = Image.fromarray(c.astype(np.uint8)); d = ImageDraw.Draw(im)
for f in FEAT['features']:
    for poly in f['polygons']: d.polygon([tuple(p) for p in poly], outline=(0, 255, 255))
    for zz in f['exceptions']: d.polygon([tuple(p) for p in zz['zone']], outline=(255, 0, 255))
for bx, name, what in (((360, 730, 700, 1060), 'desk', 'round the desk'), ((0, 740, 360, 1080), 'crates', 'round the crates')):
    q = im.crop(bx); w, h = q.size; q = q.resize((w * 2, h * 2), Image.NEAREST)
    label(q, [f'AI-generated picture: RA-B-2, {what} at 2x', 'features cyan; named exception zones magenta; step-2 mask gold'], 15).save(os.path.join(D, f'ra-B-2-features-{name}.png'))
print('overlays written')
