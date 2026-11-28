# The painted openings' masks for a view B to E (masks6a.py, PV6-A's skylight mask, for any view and for the wall window too; the
# Lead, 18 November: the window shows the sky on the one shared voyage's clock, as the skylight does). For each opening the view's
# empty-room map holds (the skylight, azure; the window, magenta), inside the guide's area widened by 16 px, the plate's pixels
# darker than lightness 0.15 (OKLab, colour check v4's conversion): opened by 1 px (specks dropped), closed by 2 px (pinholes
# filled), kept inside the widened guide. The mask is the black glass; the painted frame, rim, cross and lights are lighter, so
# they stay out. Writes people-<view>/mask-<opening>.png (1024 x 1536, white, the mask in alpha, softened by a 0.7 px Gaussian)
# and people-<view>/masks.json: per opening, how well the mask fits the guide (masks6a.py's numbers), its bounding box, and the
# plate's label and sha256. Generates nothing. Usage: python3 -I masks8.py <view>
import hashlib, importlib.util, json, os, sys, numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__)); V = sys.argv[1]; assert V in 'BCDE' and len(V) == 1; F = os.path.join(D, f'people-{V}')
spec = importlib.util.spec_from_file_location('cc', os.path.join(D, '..', 'pv6', 'colour-check-v4.py')); cc = importlib.util.module_from_spec(spec); spec.loader.exec_module(cc)
PIC = json.load(open(os.path.join(F, 'picture.json'))); plate = os.path.join(F, PIC['plate']['file'])
if hashlib.sha256(open(plate, 'rb').read()).hexdigest() != PIC['plate']['sha256']: sys.exit(f"{PIC['plate']['file']} is not picture.json's plate")
pic = np.array(Image.open(plate).convert('RGB')); L, C, H = cc.oklch(pic)
m = np.array(Image.open(os.path.join(D, f'pv6-{V}-empty-regions.png')).convert('RGB'))
def img(a): return Image.fromarray((a * 255).astype(np.uint8))
def grow(a, r): return np.array(img(a).filter(ImageFilter.MaxFilter(2 * r + 1))) > 0
def shrink(a, r): return np.array(img(a).filter(ImageFilter.MinFilter(2 * r + 1))) > 0
out = {'view': V, 'plate': {'label': PIC['plate']['label'], 'sha256': PIC['plate']['sha256']}, 'method': 'masks6a.py: the plate darker than lightness 0.15 inside the guide widened by 16 px; opened 1 px, closed 2 px; softened 0.7 px'}
for name, col in (('skylight', (0, 128, 255)), ('window', (255, 0, 255))):
    guide = (m == col).all(axis=2)
    if not guide.any(): out[name] = 'not in this view'; continue
    near = grow(guide, 16)
    dark = near & (L < 0.15)
    mask = grow(shrink(dark, 1), 1)            # open: drop specks
    mask = shrink(grow(mask, 2), 2) & near     # close: fill pinholes, stay inside the widened guide
    inter, union = (mask & guide).sum(), (mask | guide).sum()
    within = {f'{r}px': round(float((mask & grow(guide, r)).sum() / mask.sum()), 4) for r in (2, 4, 8, 16)}
    soft = img(mask).filter(ImageFilter.GaussianBlur(0.7)); f = os.path.join(F, f'mask-{name}.png')
    Image.merge('LA', (Image.new('L', soft.size, 255), soft)).save(f, optimize=True)
    out[name] = {'file': f'mask-{name}.png', 'sha256': hashlib.sha256(open(f, 'rb').read()).hexdigest(), 'guidePx': int(guide.sum()), 'maskPx': int(mask.sum()),
                 'iou': round(float(inter / union), 4), 'guideCovered': round(float(inter / guide.sum()), 4), 'maskWithinOfGuide': within, 'maskP95L': round(float(np.percentile(L[mask], 95)), 3),
                 'bbox': [int(np.where(mask.any(0))[0].min()), int(np.where(mask.any(1))[0].min()), int(np.where(mask.any(0))[0].max()) + 1, int(np.where(mask.any(1))[0].max()) + 1]}
json.dump(out, open(os.path.join(F, 'masks.json'), 'w'), indent=1)
print(json.dumps(out, indent=1))
