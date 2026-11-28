# The skylight's mask for Room B test page v5, from the plate's own black: inside the guide's skylight (the empty room's map,
# pv6-A-empty-regions.png, azure) widened by 16 px, the pixels of PV6-A-2 darker than lightness 0.15 (OKLab, colour check v4's
# conversion). The mask is the glass's panes; the painted rim, cross and lights are lighter, so they stay out. There is no
# window or screen in this view. Writes mask-skylight.png (1024 x 1536, alpha) and masks.json with how well the mask fits the
# guide. Usage: python3 -I masks6a.py
import importlib.util, json, os, numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('cc', os.path.join(D, '..', 'pv6', 'colour-check-v4.py')); cc = importlib.util.module_from_spec(spec); spec.loader.exec_module(cc)
PIC = json.load(open(os.path.join(D, 'picture.json'))); pic = np.array(Image.open(os.path.join(D, PIC['plate']['file'])).convert('RGB'))
L, C, H = cc.oklch(pic)
m = np.array(Image.open(os.path.join(D, '..', 'pv6', 'pv6-A-empty-regions.png')).convert('RGB'))
def img(a): return Image.fromarray((a * 255).astype(np.uint8))
def grow(a, r): return np.array(img(a).filter(ImageFilter.MaxFilter(2 * r + 1))) > 0
def shrink(a, r): return np.array(img(a).filter(ImageFilter.MinFilter(2 * r + 1))) > 0
out = {}
for name, col in (('skylight', (0, 128, 255)),):
    guide = (m == col).all(axis=2)
    near = grow(guide, 16)
    dark = near & (L < 0.15)
    mask = grow(shrink(dark, 1), 1)            # open: drop specks
    mask = shrink(grow(mask, 2), 2) & near     # close: fill pinholes, stay inside the widened guide
    inter, union = (mask & guide).sum(), (mask | guide).sum()
    within = {f'{r}px': round(float((mask & grow(guide, r)).sum() / mask.sum()), 4) for r in (2, 4, 8, 16)}
    out[name] = {'guidePx': int(guide.sum()), 'maskPx': int(mask.sum()), 'iou': round(float(inter / union), 4), 'guideCovered': round(float(inter / guide.sum()), 4),
                 'maskWithinOfGuide': within, 'maskP95L': round(float(np.percentile(L[mask], 95)), 3), 'bbox': [int(v) for v in (np.where(mask.any(0))[0].min(), np.where(mask.any(1))[0].min(), np.where(mask.any(0))[0].max() + 1, np.where(mask.any(1))[0].max() + 1)]}
    soft = img(mask).filter(ImageFilter.GaussianBlur(0.7))
    Image.merge('LA', (Image.new('L', soft.size, 255), soft)).save(os.path.join(D, f'mask-{name}.png'), optimize=True)
json.dump(out, open(os.path.join(D, 'masks.json'), 'w'), indent=1)
print(json.dumps(out, indent=1))
