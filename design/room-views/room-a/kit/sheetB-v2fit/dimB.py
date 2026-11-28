# Sheet RA-B version 2's code edit on RA-B-1 (the Lead, 27 November): RA-B-1, view B's AI-generated step-1 picture, has two junction
# boxes each carrying a column of three lit orange cells, which reads as a level under Room A's rule. In code, as view A's cabinet
# frame was drawn (frameA.py), each box keeps its top cell lit and its other two cells are dimmed in place to unlit steel, keeping
# their texture: each cell's lit face becomes a dark steel-blue lens and its rim a darker steel outline (OKLCH: the box's own steel
# hue and chroma, the cell's own light and shade kept at a fraction), and the orange glow those two cells throw on the box's face
# is taken back to the box's steel colour. Nothing else changes: the edit is held to the two boxes' windows, and the kept cells and
# everything outside the dimmed cells' reach are left byte for byte. Writes ra-B-1-dim.png (the start picture of version 2's step 2)
# and dim-B.json (the cells, what changed, and the file and pixel sha256 of the input and the output). Reads the records' RA-B-1
# from _rec1/img and checks its sha256 first. With --scan-words <file>, the PNG is written at the first compression level whose bytes
# spell none of that list's words (as scanfixA.py does; the pixels are the same either way, and the pixels' sha256 is what the record
# pins). Generates nothing. Usage: python3 -I dimB.py [records folder] [--scan-words <file>]
import hashlib, importlib.util, json, os, sys
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); ARGS = [a for a in sys.argv[1:]]
WORDS = ARGS[ARGS.index('--scan-words') + 1] if '--scan-words' in ARGS else None
if WORDS: i = ARGS.index('--scan-words'); del ARGS[i:i + 2]
REC = ARGS[0] if ARGS else os.path.join(D, '_rec1')
SRC, WANT = os.path.join(REC, 'img', 'RA-B-1.png'), 'd05b45889a6bacb69426eba64d26a513c958f407e6c7260bf63f970c6de8822a'
sha = lambda b: hashlib.sha256(b).hexdigest()
if sha(open(SRC, 'rb').read()) != WANT: raise SystemExit('STOP: the records\' img/RA-B-1.png is not RA-B-1')
spec = importlib.util.spec_from_file_location('lift5', os.path.join(D, 'lift5.py')); L5 = importlib.util.module_from_spec(spec); spec.loader.exec_module(L5)
rgb0 = np.array(Image.open(SRC).convert('RGB'))
def to_oklch(rgb8):
    c = rgb8.astype(np.float64) / 255.0; c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l = 0.4122214708 * c[..., 0] + 0.5363325363 * c[..., 1] + 0.0514459929 * c[..., 2]; m = 0.2119034982 * c[..., 0] + 0.6806995451 * c[..., 1] + 0.1073969566 * c[..., 2]; s = 0.0883024619 * c[..., 0] + 0.2817188376 * c[..., 1] + 0.6299787005 * c[..., 2]
    l_, m_, s_ = np.cbrt(l), np.cbrt(m), np.cbrt(s)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_; a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_; b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return L, np.hypot(a, b), np.degrees(np.arctan2(b, a)) % 360.0
def to_rgb8(L, C, H):
    a, b = C * np.cos(np.radians(H)), C * np.sin(np.radians(H))
    l_ = L + 0.3963377774 * a + 0.2158037573 * b; m_ = L - 0.1055613458 * a - 0.0638541728 * b; s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s; g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s; bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    c = np.clip(np.stack([r, g, bb], -1), 0, 1); c = np.where(c <= 0.0031308, 12.92 * c, 1.055 * c ** (1 / 2.4) - 0.055)
    return np.clip(np.rint(c * 255), 0, 255).astype(np.uint8)
L, C, H = to_oklch(rgb0)
warm = (H > 10) & (H < 95) & (C > 0.06)
# the two boxes' windows (the Lead's boxes, padded), each holding a column of three lit cells
BOXES = {'back wall': (445, 622, 492, 695), 'left wall': (318, 575, 358, 636)}
def to_lab(rgb8):
    L, C, H = to_oklch(rgb8); return L, C * np.cos(np.radians(H)), C * np.sin(np.radians(H))
def lab_rgb8(L, a, b): return to_rgb8(L, np.hypot(a, b), np.degrees(np.arctan2(b, a)) % 360.0)
La, Aa, Ba = to_lab(rgb0)
ORANGE = np.array([np.cos(np.radians(60)), np.sin(np.radians(60))])   # the direction an orange cast pushes a colour in OKLab's (a, b)
out = rgb0.copy(); report = {'picture': {'name': 'RA-B-1', 'sha256': WANT, 'aiGenerated': True}, 'boxes': {}}
for name, (x0, y0, x1, y1) in BOXES.items():
    win = np.zeros(warm.shape, bool); win[y0:y1, x0:x1] = True
    core = warm & win & (L > 0.62); lab, sizes = L5.parts(core)
    cells = sorted([k for k in range(1, len(sizes)) if sizes[k] >= 20], key=lambda k: np.where(lab == k)[0].min())   # top to bottom
    cells = [k for k in cells if np.where(lab == k)[1].min() < x1 - 8]   # the column (a small warm mark on the pipe beside the back box is not a cell)
    if len(cells) != 3: raise SystemExit(f'STOP: the {name} box has {len(cells)} lit cells, not 3')
    steel = win & ~L5.grow(warm & win, 3)   # the box's own face round the cells
    Ls, As, Bs = float(np.median(La[steel])), float(np.median(Aa[steel])), float(np.median(Ba[steel]))
    # each pixel of the window goes to its nearest cell (distance to the cell's lit core), so the kept cell keeps all that is its own
    yy, xx = np.mgrid[y0:y1, x0:x1]; dist = np.full((len(cells),) + yy.shape, 1e9)
    for i, k in enumerate(cells):
        cy, cx = np.where(lab[y0:y1, x0:x1] == k)
        for py, px in zip(cy + y0, cx + x0): dist[i] = np.minimum(dist[i], np.hypot(yy - py, xx - px))
    near, dmin = dist.argmin(axis=0), dist.min(axis=0)
    rows = []
    for i, k in enumerate(cells):
        cm = lab == k; ys, xs = np.where(cm); box = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
        if i == 0: rows.append({'cell': 'top', 'box': box, 'kept': 'lit'}); continue
        # the cell's outline: a parallelogram with upright sides (the lens's own top and bottom edges, fitted to its lit face), the
        # rim 2 px round it; drawn at 8 times and brought down, as frameA.py draws
        cols = range(xs.min(), xs.max() + 1)
        tops = np.array([(x, ys[xs == x].min()) for x in cols]); bots = np.array([(x, ys[xs == x].max() + 1) for x in cols])
        sl = float(np.polyfit(np.r_[tops[:, 0], bots[:, 0]], np.r_[tops[:, 1] - np.polyval(np.polyfit(tops[:, 0], tops[:, 1], 1), tops[:, 0]) * 0 , bots[:, 1]], 1)[0]) if False else float((np.polyfit(tops[:, 0], tops[:, 1], 1)[0] + np.polyfit(bots[:, 0], bots[:, 1], 1)[0]) / 2)
        xa, xb = float(xs.min()), float(xs.max() + 1); xm = (xa + xb) / 2
        t0 = float(np.median(tops[:, 1] - sl * (tops[:, 0] - xm))); b0 = float(np.median(bots[:, 1] - sl * (bots[:, 0] - xm)))
        S = 8; R = 2.0   # supersampling; rim width
        gy, gx = np.mgrid[0:(y1 - y0) * S, 0:(x1 - x0) * S]; px = x0 + (gx + 0.5) / S; py = y0 + (gy + 0.5) / S
        def inside(grow):   # the parallelogram grown by grow px, its corners cut by 1 px for a drawn, slightly rounded look
            ty, by = t0 - grow + sl * (px - xm), b0 + grow + sl * (px - xm)
            m = (px >= xa - grow) & (px <= xb + grow) & (py >= ty) & (py <= by)
            cut = 1.0 + max(0.0, grow * 0.5)
            m &= ~(((px - (xa - grow)) + (py - ty) < cut) | (((xb + grow) - px) + (py - ty) < cut) | ((px - (xa - grow)) + (by - py) < cut) | (((xb + grow) - px) + (by - py) < cut))
            return m
        down = lambda m: m.reshape(y1 - y0, S, x1 - x0, S).mean(axis=(1, 3))
        a_out, a_in = down(inside(R)), down(inside(0.0))   # coverage of the whole cell and of its lens
        sub = (slice(y0, y1), slice(x0, x1)); Lw, Aw, Bw = La[sub], Aa[sub], Ba[sub]
        mine = near == i
        # the warm cast round it, out to 18 px, taken back to the box's steel, with the light it adds; it fades over its last 5 px
        fade = np.clip((18 - dmin) / 5, 0, 1) * mine
        push = np.clip(((Aw - As) * ORANGE[0] + (Bw - Bs) * ORANGE[1]) / 0.10, 0, 1) * fade
        Ln = Lw - push * np.maximum(0, Lw - Ls) * 0.75; An = Aw - push * (Aw - As); Bn = Bw - push * (Bw - Bs)
        # the unlit cell over it: the box's ink for the rim, a dark steel-blue lens a touch lighter at its top, with a faint glint
        # along its top edge; the lens keeps a fifth of the lit face's own shading
        fy = np.clip((yy - (t0 + sl * (xx - xm))) / max(1.0, b0 - t0), 0, 1)
        lens_L = Ls - 0.20 + 0.05 * (1 - fy) + (Lw - float(Lw[mine & (a_in > 0.5)].mean())) * 0.2
        glint = (fy < 0.22) * 0.06
        inkL, inkA, inkB = Ls - 0.30, As * 0.6, Bs * 0.6
        lensL, lensA, lensB = lens_L + glint, As * 0.9, Bs * 0.9
        cov_rim = np.clip(a_out - a_in, 0, 1) * mine; cov_lens = a_in * mine
        Lf = Ln * (1 - cov_rim - cov_lens) + inkL * cov_rim + lensL * cov_lens
        Af = An * (1 - cov_rim - cov_lens) + inkA * cov_rim + lensA * cov_lens
        Bf = Bn * (1 - cov_rim - cov_lens) + inkB * cov_rim + lensB * cov_lens
        sel = mine & ((push > 0.004) | (a_out > 0))
        blk = out[sub]; blk[sel] = lab_rgb8(Lf[sel], Af[sel], Bf[sel]); out[sub] = blk
        rows.append({'cell': ['top', 'middle', 'bottom'][i], 'box': box, 'kept': 'dimmed to unlit steel', 'outline': {'x': [round(xa, 1), round(xb, 1)], 'top': round(t0, 1), 'bottom': round(b0, 1), 'slope': round(sl, 3), 'rimPx': R},
                     'cellPx': int((a_out * mine > 0).sum()), 'castPx': int((sel & ~(a_out > 0)).sum())})
    report['boxes'][name] = {'window': [x0, y0, x1, y1], 'steelOklab': {'L': round(Ls, 3), 'a': round(As, 4), 'b': round(Bs, 4)}, 'cells': rows}
# checks: nothing changed outside the boxes' windows; the kept cells untouched; no lit orange left in the dimmed cells
changed = (out != rgb0).any(axis=2); ys, xs = np.where(changed)
inside = np.zeros_like(changed)
for (x0, y0, x1, y1) in BOXES.values(): inside[y0:y1, x0:x1] = True
L2, C2, H2 = to_oklch(out)
lit_left = []
for name, b in report['boxes'].items():
    for r in b['cells']:
        x0, y0, x1, y1 = r['box']; reg = (slice(y0, y1), slice(x0, x1))
        n = int(((H2[reg] > 10) & (H2[reg] < 95) & (C2[reg] > 0.06) & (L2[reg] > 0.62)).sum())
        if r['kept'] == 'lit': r['untouched'] = bool((out[reg] == rgb0[reg]).all())
        else: lit_left.append(n); r['litOrangePxAfter'] = n
report['changed'] = {'px': int(changed.sum()), 'box': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1], 'outsideTheWindows': int((changed & ~inside).sum())}
if report['changed']['outsideTheWindows'] or any(lit_left) or not all(r['untouched'] for b in report['boxes'].values() for r in b['cells'] if r['kept'] == 'lit'):
    raise SystemExit('STOP: ' + json.dumps(report['changed']) + f' lit left {lit_left}')
f = os.path.join(D, 'ra-B-1-dim.png'); Image.fromarray(out).save(f, optimize=True); level = 'default (optimize)'
if WORDS:   # the first compression level whose bytes spell none of the scan list's words
    import re
    rx = re.compile('|'.join(w.strip() for w in open(WORDS) if w.strip()).encode(), re.I)
    if rx.search(open(f, 'rb').read()):
        for level in (9, 6, 1, 2, 3, 4, 5, 7, 8):
            Image.fromarray(out).save(f, 'PNG', compress_level=level)
            if not rx.search(open(f, 'rb').read()): break
        else: raise SystemExit('STOP: every compression level spells a scan word')
if not (np.array(Image.open(f).convert('RGB')) == out).all(): raise SystemExit('STOP: the written pixels differ')
report['output'] = {'name': 'RA-B-1, cells dimmed', 'file': 'ra-B-1-dim.png', 'sha256': sha(open(f, 'rb').read()), 'pixelsSha256': sha(out.tobytes()), 'pngCompression': level, 'aiGenerated': True,
                    'edit': 'a code edit on an AI-generated picture: two of the three lit cells in each junction box dimmed to unlit steel (dimB.py)'}
report['input'] = {'pixelsSha256': sha(rgb0.tobytes())}
json.dump(report, open(os.path.join(D, 'dim-B.json'), 'w'), indent=1)
print(json.dumps({k: report[k] for k in ('changed', 'output')}), '| dimmed:', [(n, r['cell'], r['cellPx'], r['castPx']) for n, b in report['boxes'].items() for r in b['cells'] if r['kept'] != 'lit'])
