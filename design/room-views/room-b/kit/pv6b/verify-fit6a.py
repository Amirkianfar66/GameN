# The skylight's fit on the rendered page (verify6a.cjs's frames of a copy, at 1 px per CSS px): where the mask puts the voyage
# (the skylight filled magenta) against the plate's own black as the page draws it, inside the guide's skylight widened by 16
# painting px; and against the guide's skylight itself. Then the page's frames against the same frames re-rendered from the
# copy. Usage: python3 -I verify-fit6a.py <verify folder>
import importlib.util, io, json, os, sys, numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__)); V = os.path.abspath(sys.argv[1])
spec = importlib.util.spec_from_file_location('cc', os.path.join(D, '..', 'pv6', 'colour-check-v4.py')); cc = importlib.util.module_from_spec(spec); spec.loader.exec_module(cc)
S = json.load(open(os.path.join(D, 'scene.json')))
guide_map = Image.open(os.path.join(D, '..', 'pv6', 'pv6-A-empty-regions.png')).convert('RGB')
def img(a): return Image.fromarray((a * 255).astype(np.uint8))
def grow(a, r): return np.array(img(a).filter(ImageFilter.MaxFilter(2 * r + 1))) > 0 if r > 0 else a
def shrink(a, r): return np.array(img(a).filter(ImageFilter.MinFilter(2 * r + 1))) > 0 if r > 0 else a
iou = lambda a, b: round(float((a & b).sum() / max(1, (a | b).sum())), 4)
out = {}
for key, P in S['phones'].items():
    masks = np.array(Image.open(os.path.join(V, f'{key}-masks.png')).convert('RGB')).astype(int)
    pic = np.array(Image.open(os.path.join(V, f'{key}-picture.png')).convert('RGB'))
    h, w = pic.shape[:2]; k = P['k']; x0, y0 = P['slice']['x0'], P['slice']['y0']
    # the guide's map on the stage: stage (sx, sy) shows painting (x0 + sx k, y0 + sy k)
    gm = np.array(guide_map.transform((w, h), Image.AFFINE, (k, 0, x0, 0, k, y0), resample=Image.NEAREST))
    magenta = (masks[..., 0] > 170) & (masks[..., 1] < 110) & (masks[..., 2] > 170)
    L, C, H = cc.oklch(pic)
    res = {}
    for name, col in (('skylight', (0, 128, 255)),):
        guide = (gm == col).all(axis=2)
        near = grow(guide, int(round(16 / k)))
        dark = grow(shrink(near & (L < 0.15), 1), 1) & near   # drop specks, as the mask was made
        rendered = magenta & near                             # the voyage's place around the skylight
        res[name] = {'stagePx': int(rendered.sum()), 'iouWithPictureBlack': iou(rendered, dark), 'iouWithGuide': iou(rendered, guide), 'outsidePictureBlackPx': int((rendered & ~grow(dark, 1)).sum()),
                     'magentaElsewherePx': int((magenta & ~near).sum())}
    out[key] = res
# the page's own frames against the same frames re-rendered from the copy
frames = {}
CK = json.load(open(os.path.join(D, 'checks.json')))
for f in [*CK['frames'].keys(), 'held-390', 'held-430']:
    # the page's frames are JPEG (quality 88 for the skylight's, 86 for the held phones): the copy's frame is encoded the same way first
    buf = io.BytesIO(); Image.open(os.path.join(V, f'{f}.png')).convert('RGB').save(buf, 'JPEG', quality=86 if f.startswith('held') else 88); buf.seek(0)
    a = np.array(Image.open(os.path.join(D, 'shots', f'{f}.jpg')).convert('RGB')).astype(int); b = np.array(Image.open(buf).convert('RGB')).astype(int)
    if a.shape != b.shape: frames[f] = {'sameSize': False, 'page': a.shape[:2], 'copy': b.shape[:2]}; continue
    d = np.abs(a - b).max(axis=2); frames[f] = {'sameSize': True, 'meanDiff': round(float(d.mean()), 2), 'p99Diff': int(np.percentile(d, 99)), 'over32': round(float((d > 32).mean()), 5)}
out['frames'] = frames
json.dump(out, open(os.path.join(V, 'fit.json'), 'w'), indent=1)
print(json.dumps(out, indent=1))
