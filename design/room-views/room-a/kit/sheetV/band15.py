# For tracing a step-1 picture's painted features for the 15 px rule (sheets RA-B to RA-E, version 2): the AI-generated step-1
# picture with the sheet's version-1 masks over it. The step-2 mask's edge is gold, step 3's orange; the 15 px band on either side of
# each edge is tinted (the zone where no painted feature may lie), and a thin line marks 60 px out (the rule's report limit). Strong
# brightness edges of the picture inside the band are marked magenta: hints of a feature the edge would cut, for reading by eye; the
# rule itself is tested on the outlines traced into features<V>.json (feat15.py). Writes <out>/band-<V>-full.png and one crop per
# masked area, twice its size (band-<V>-area<k>.png), each labelled as an AI-generated picture. For review only: never an input, an
# asset or a commit. Usage: python3 -I band15.py <sheet folder> <view> <step-1 picture.png> <out folder>
import importlib.util, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SD, V, PIC, OUT = sys.argv[1:5]; os.makedirs(OUT, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('lift5', os.path.join(HERE, '..', 'sheet', 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
binary = lambda f: np.array(Image.open(os.path.join(SD, f)).convert('L')) > 127
place = binary(f'ra-{V}-place.png'); p3f = os.path.join(SD, f'ra-{V}-place3.png'); place3 = binary(f'ra-{V}-place3.png') if os.path.exists(p3f) else np.zeros_like(place)
im = Image.open(PIC).convert('RGB')
if im.size != (1024, 1536): raise SystemExit(f'{PIC} is {im.size}, not 1024 x 1536')
pic = np.array(im).astype(float); name = os.path.splitext(os.path.basename(PIC))[0]
band = lambda m, r: L.grow(m, r) & L.grow(~m, r)
edge = lambda m: m & ~L.shrink(m, 2)
B15 = band(place, 15) | band(place3, 15); B60 = (L.grow(place, 60) & ~L.grow(place, 59)) | (L.grow(place3, 60) & ~L.grow(place3, 59))
# brightness edges: the Sobel magnitude of the luminance, strong where it is in the top 4% of the band's own values
lum = np.array(im.convert('L').filter(ImageFilter.GaussianBlur(1))).astype(float)
gx = np.zeros_like(lum); gy = np.zeros_like(lum); gx[:, 1:-1] = lum[:, 2:] - lum[:, :-2]; gy[1:-1, :] = lum[2:, :] - lum[:-2, :]
mag = np.hypot(gx, gy); strong = B15 & ~(L.grow(edge(place), 2) | L.grow(edge(place3), 2)) & (mag > np.percentile(mag[B15], 96) if B15.any() else False)
out = pic.copy(); out[B15] = out[B15] * 0.7 + np.array([90, 200, 255]) * 0.3; out[B60] = out[B60] * 0.5 + np.array([255, 255, 255]) * 0.5
out[strong] = (255, 64, 200)
for m, col in ((place, (255, 209, 102)), (place3, (255, 159, 90))): out[edge(m)] = col
img = Image.fromarray(out.round().clip(0, 255).astype(np.uint8))
def font(px):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()
def labelled(x, line2):   # the AI-generated label, burned in at the top
    x = x.copy(); w = x.width; px = max(12, min(30, round(w / 34))); f1, f2 = font(px), font(round(px * 0.8)); h = round(px * 2.9)
    d = ImageDraw.Draw(x, 'RGBA'); d.rectangle([0, 0, w, h], fill=(10, 12, 18, 225))
    d.text((round(px * 0.6), round(px * 0.35)), f'AI-generated picture ({name}): review overlay', font=f1, fill=(255, 224, 160))
    d.text((round(px * 0.6), round(px * 1.6)), line2, font=f2, fill=(235, 235, 235)); return x
labelled(img, f'Sheet RA-{V} v1 masks: gold step 2, orange step 3, tint = 15 px band, magenta = strong edges in it').save(os.path.join(OUT, f'band-{V}-full.png'), optimize=True)
comp, sizes = L.parts(place | place3); rows = []
for k in range(1, len(sizes)):
    ys, xs = np.where(comp == k); x0, y0, x1, y1 = max(0, xs.min() - 70), max(0, ys.min() - 70), min(1024, xs.max() + 71), min(1536, ys.max() + 71)
    c = img.crop((x0, y0, x1, y1)); c = c.resize((c.width * 2, c.height * 2), Image.LANCZOS)
    labelled(c, f'area {k}: x {x0}-{x1}, y {y0}-{y1}, twice its size').save(os.path.join(OUT, f'band-{V}-area{k}.png'), optimize=True)
    rows.append({'area': k, 'box': [int(x0), int(y0), int(x1), int(y1)], 'px': int(sizes[k]), 'strongEdgePxInBand': int((strong & (comp[...] >= 0) & L.grow(comp == k, 16)).sum())})
print(json.dumps({'picture': name, 'areas': rows, 'bandPx': int(B15.sum()), 'strongEdgePx': int(strong.sum())}))
