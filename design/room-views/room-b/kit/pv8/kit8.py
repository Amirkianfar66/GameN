# Version 3 (the capsule grown 2 px, not 6; see below). Version 2: the PLACE kit of a view B to E (the capsule units are pieces of their own) (PV6-A's kit6.py, for any view), from guide7.mjs's renders: pv6-A-furniture.png, the tight outlines of every piece in view (binary); pv6-A-
# place.png, the PLACE edit's mask: the outlines grown 6 px (as fix2_tools.py's step 2); pv6-A-split.png, each piece's outline
# grown 6 px in its own grey, the nearer drawn over the farther, so the nearer piece owns an overlap; the mask's shapes (its
# connected parts) with the pieces each holds; the expected share and alpha hash (alpha 0 = repaint). Writes kit6.json.
# Usage: python3 -I kit8.py <view>
import hashlib, importlib.util, json, os, numpy as np
from PIL import Image
import sys
D = os.path.dirname(os.path.abspath(__file__)); W, H, GROW = 1024, 1536, 6; V = sys.argv[1]; assert V in 'BCDE' and len(V) == 1
spec = importlib.util.spec_from_file_location('lift5', os.path.join(D, '..', 'pv5', 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
PIECES = json.load(open(os.path.join(D, f'pieces8-{V}.json')))
binary = lambda f: np.array(Image.open(os.path.join(D, f)).convert('L')) > 127
save = lambda a, f: Image.fromarray((a * 255).astype(np.uint8) if a.dtype == bool else a.astype(np.uint8), 'L').save(os.path.join(D, f), optimize=True)
alpha = lambda a: hashlib.sha256(np.where(a, 0, 255).astype(np.uint8).tobytes()).hexdigest()
furn = binary(f'pv6-{V}-furniture.png'); lab = np.array(Image.open(os.path.join(D, f'pv6-{V}-stations.png')).convert('L')).astype(int)
pieces = []
for p in PIECES:
    m = np.abs(lab - p['grey']) <= 2
    if not m.any(): continue
    ys, xs = np.where(m); pieces.append({**p, 'px': int(m.sum()), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1], 'visibleCentreX': round(float(xs.mean())), 'cutByEdge': bool(xs.min() == 0 or xs.max() == W - 1)})
# version 3 (the Lead, 18 November): the capsule's shape is the closed housing's own outline with at most 2 px to spare (its hatch
# slides up inside it, so it needs no room above); every other piece keeps 6 px. The mask is the union of the grown outlines.
# version 4 (the Lead and the owner, 18 November): where the capsule is in the picture it is painted alone, in a step 3 after the
# furniture: step 2's mask and split map hold the furniture only; step 3's mask is the capsule's outline grown 2 px, its own split map.
# C's version 5 and E's version 3 (the Lead and the owner, 18 November): Juno's stool joins step 3 wherever it is in the picture, its
# shape its visible outline grown 2 px less every other piece's outline (it never repaints the cart in front of it); the shapes
# of step 3 must not touch each other.
S3NAMES = ('food capsule', 'stool')
CAP = [p for p in pieces if p['name'] in S3NAMES]; STEP2 = [p for p in pieces if p['name'] not in S3NAMES]
# C's version 7 (the Lead, 18 November): the seat's shape less the cart's lift from the accepted step-2 picture, grown 1 px
# (trim8.py, trim-<view>.json), so the glass jars painted on the cart stay in front of the seat
TF = os.path.join(D, f'trim-{V}.json'); TREC = json.load(open(TF)) if os.path.exists(TF) else None; TRIM = np.zeros((H, W), bool)
for y, x0, x1 in (TREC['runs'] if TREC else []): TRIM[y, x0:x1 + 1] = True
if TREC: assert int(TRIM.sum()) == TREC['px'], 'the trim record does not add up'
place = np.zeros((H, W), bool); split = np.zeros((H, W), np.uint8)
for p in sorted(STEP2, key=lambda p: p['grey']): g = L.grow(np.abs(lab - p['grey']) <= 2, GROW); place |= g; split[g] = p['grey']
place3 = np.zeros((H, W), bool); split3 = np.zeros((H, W), np.uint8)
grown3 = {}
for p in CAP:
    g = L.grow(np.abs(lab - p['grey']) <= 2, 2)
    if p['name'] == 'stool':
        for q in pieces:
            if q is not p: g &= ~(np.abs(lab - q['grey']) <= 2)
        if TREC:   # version 7: less the trim, which stays inside the stool's outline grown 2 px
            assert not (TRIM & ~L.grow(np.abs(lab - p['grey']) <= 2, 2)).any(), "the trim reaches past the stool's outline grown 2 px"
            before = int(g.sum()); g &= ~TRIM; ys, xs = np.where(g)
            p['trim'] = {'by': TREC['source']['cartLift']['label'], 'sha256': TREC['source']['cartLift']['sha256'], 'pxBefore': before, 'pxAfter': int(g.sum()),
                         'parts': len(L.parts(g)[1]) - 1, 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]}
    grown3[p['grey']] = g; place3 |= g; split3[g] = p['grey']
for a in grown3:
    for b in grown3:
        if a < b: assert not (L.grow(grown3[a], 1) & grown3[b]).any(), 'two shapes of step 3 touch'
# C's version 6 (the Lead, 18 November): the lit strips at the foot of the back wall, cut from the step-1 picture by strips8.py, each
# its own shape of step 3: its plaque grown 1 px (within 2 px, and within 10% of its box); none may touch another shape of step 3
# or any shape of step 2
SF = os.path.join(D, f'strips-{V}.json')
for k, s in enumerate(json.load(open(SF))['strips'] if os.path.exists(SF) else []):
    x0, y0, x1, y1 = s['plaque']; r = np.zeros((H, W), bool); r[y0:y1 + 1, x0:x1 + 1] = True; g = L.grow(r, 1); grey = 200 + 20 * k
    assert not (L.grow(g, 1) & place).any(), f"{s['name']} touches a shape of step 2"
    for b in grown3: assert not (L.grow(g, 1) & grown3[b]).any(), f"{s['name']} touches a shape of step 3"
    p = {'place': 'wall', 'name': s['name'], 'kind': 'painted', 'grey': grey, 'px': int(r.sum()), 'bbox': [x0, y0, x1 + 1, y1 + 1], 'visibleCentreX': round((x0 + x1 + 1) / 2), 'cutByEdge': False, 'plaque': s['plaque']}
    pieces.append(p); CAP.append(p); grown3[grey] = g; place3 |= g; split3[g] = grey
for p in pieces: p['step'] = 3 if p in CAP else 2
assert not (furn & ~(place | place3 | TRIM)).any(), 'an outline is outside the masks'   # version 7: or under the cart's trim, in front of it
assert ((split > 0) == place).all(), 'the split map is not the PLACE mask'
pieces.sort(key=lambda p: p['visibleCentreX'])
def shapes_of(mask, smap):
    comp, sizes = L.parts(mask); out = []
    for c in range(1, len(sizes)):
        m = comp == c; ys, xs = np.where(m); greys = set(int(g) for g in np.unique(smap[m])) - {0}
        out.append({'pieces': [i for i, p in enumerate(pieces) if p['grey'] in greys], 'px': int(m.sum()), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1], 'visibleCentreX': round(float(xs.mean())),
                    'cutByEdge': bool(xs.min() == 0 or xs.max() == W - 1), 'tall': round((ys.max() + 1 - ys.min()) / max(1, xs.max() + 1 - xs.min()), 2)})
    return sorted(out, key=lambda s: s['visibleCentreX'])
shapes = shapes_of(place, split)
save(place, f'pv6-{V}-place.png'); save(split, f'pv6-{V}-split.png')
# the split maps' pieces in their left-to-right order, as before
out = {'pieces': pieces, 'shapes': shapes, 'split': {f"{p['place']} {p['name']}": p['grey'] for p in pieces if p['step'] == 2}, 'outlineShare': round(float(furn.mean()), 4),
       'expected': {'maskedShare': round(float(place.mean()), 4), 'rawMaskAlpha': alpha(place), 'over10': bool(place.mean() > 0.10)}}
if CAP:   # version 4: step 3, the capsule alone
    save(place3, f'pv6-{V}-place3.png'); save(split3, f'pv6-{V}-split3.png')
    out |= {'shapes3': shapes_of(place3, split3), 'split3': {f"{p['place']} {p['name']}": p['grey'] for p in pieces if p['step'] == 3}, 'expected3': {'maskedShare': round(float(place3.mean()), 4), 'rawMaskAlpha': alpha(place3)}}
# C's version 8 (the Lead, 18 November; the owner's yes): a fix step, step 4, over step 3's picture (fix8.py, fix4-<view>.json):
# one shape for each glass jar's top (its silhouette up to a clean rim, grown 2 px, from 4 px below step 2's cut, where its
# PLACE mask began) and one band at the dispenser's left side (4 px outside, 6 px inside, none of its hatch's face). The shapes
# must not touch. Step 4's guide is an overlay (RGBA): each jar's top drawn as plain glass (its own colour, an ink outline and the
# rim's ellipse) and the housing's colour with an ink line down its left side, transparent elsewhere, so step 4's input shows the
# picture itself around them. The seat is in no shape, except where a jar's top crosses it: the jar is in front.
FF = os.path.join(D, f'fix4-{V}.json'); FREC = json.load(open(FF)) if os.path.exists(FF) else None
if FREC:
    from PIL import ImageDraw
    cut = np.full(W, -1)
    for x in range(W):
        col = np.where(place[1000:1300, x])[0]
        if len(col): cut[x] = 1000 + int(col[0])
    below = np.zeros((H, W), bool)   # more than 4 px below step 2's cut, or a column step 2's mask never reached: out of the shapes
    for x in range(W):
        if cut[x] >= 0: below[cut[x] + FREC['cutBelow'] + 1:, x] = True
        else: below[:, x] = True
    yy, xx = np.mgrid[0:H, 0:W]
    ell = lambda cx, cy, ax, ay: ((xx + 0.5 - cx) / ax) ** 2 + ((yy + 0.5 - cy) / ay) ** 2 <= 1
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dr = ImageDraw.Draw(ov); INK = tuple(FREC['ink']) + (255,)
    light = lambda c: tuple(min(255, round(v * 1.15)) for v in c) + (255,)
    pieces4 = []; place4 = np.zeros((H, W), bool); split4 = np.zeros((H, W), np.uint8)
    # C's version 9 (the Lead, 18 November): the jars' tops drawn as glass, in lines only, not filled, so step 4's input shows PV6-C-4
    # through them (the seat behind, and the blurred cut the edit repaints): each top's silhouette outline in ink, as version 8 draws
    # it; its rim's ellipse as an ink line with a 1 px highlight just inside its near (lower) half, in the pale glass colour of the
    # jar's lower half; and one thin vertical highlight on the lit side, continuing the lower half's own streak (the flask's carried
    # straight up its neck from the shoulder), no wider than 2 px and never over the ink. Everything else inside the shapes is alpha 0.
    # The streaks and colours are jartops9.py's (jartops4-<view>.json); the shapes, the masks and the dispenser's guide are version 8's.
    JF = os.path.join(D, f'jartops4-{V}.json'); JREC = json.load(open(JF)) if os.path.exists(JF) else None; tops = {}
    if JREC:
        assert JREC['fix4']['sha256'] == hashlib.sha256(open(FF, 'rb').read()).hexdigest() and JREC['source']['sha256'] == FREC['source']['sha256'], "jartops4 is not this fix4's"
        JT = {t['name']: t for t in JREC['jars']}
    def mask_of(draw):   # what a set of drawing calls covers, as a mask
        im = Image.new('L', (W, H), 0); draw(ImageDraw.Draw(im)); return np.array(im) > 0
    for k, j in enumerate(FREC['jars']):
        glass = tuple(j['glass']) + (255,)
        if j['kind'] == 'cylinder':
            Lx, Rx = j['outline']; cx, ax, ay, rim = (Lx + Rx + 1) / 2, (Rx + 1 - Lx) / 2, j['ellipseHalfHeight'], j['rimCentre']
            sil = ((xx >= Lx) & (xx <= Rx) & (yy + 0.5 >= rim)) | ell(cx, rim, ax, ay)
            if JREC:
                box, rw, cy = [Lx, rim - ay, Rx + 1, rim + ay], 2, rim
                sides = lambda d: (d.rectangle([Lx, rim, Lx + 1, H - 1], fill=255), d.rectangle([Rx - 1, rim, Rx, H - 1], fill=255))
            else:
                dr.rectangle([Lx, rim, Rx, H - 1], fill=glass); dr.rectangle([Lx, rim, Lx + 1, H - 1], fill=INK); dr.rectangle([Rx - 1, rim, Rx, H - 1], fill=INK)
                dr.ellipse([Lx, rim - ay, Rx + 1, rim + ay], fill=light(j['glass']), outline=INK, width=2)
        else:   # the flask: its cone up to the shoulder, the neck, the lip
            (al, bl), (ar, br) = j['sides']['left'], j['sides']['right']; xl = lambda y: al + bl * (y - 1100); xr = lambda y: ar + br * (y - 1100)
            sh, ax_, nw, lip, lw, lh = j['shoulder'], j['axis'], j['neckWidth'], j['lipCentre'], j['lipWidth'], j['lipHalfHeight']
            cone = (yy + 0.5 >= sh) & (xx + 0.5 >= xl(yy + 0.5)) & (xx + 0.5 <= xr(yy + 0.5)); neck = (yy + 0.5 >= lip) & (yy + 0.5 <= sh) & (np.abs(xx + 0.5 - ax_) <= nw / 2)
            sil = cone | neck | ell(ax_, lip, lw / 2, lh); yb = 1200
            if JREC:
                box, rw, cy = [ax_ - lw / 2, lip - lh, ax_ + lw / 2, lip + lh], 1, lip
                sides = lambda d: (d.line([(xl(sh), sh), (xl(yb), yb)], fill=255, width=2), d.line([(xr(sh), sh), (xr(yb), yb)], fill=255, width=2),
                                   d.line([(ax_ - nw / 2, lip), (ax_ - nw / 2, sh)], fill=255, width=2), d.line([(ax_ + nw / 2, lip), (ax_ + nw / 2, sh)], fill=255, width=2))
            else:
                dr.polygon([(xl(sh), sh), (xr(sh), sh), (xr(yb), yb), (xl(yb), yb)], fill=glass); dr.rectangle([ax_ - nw / 2, lip, ax_ + nw / 2, sh], fill=glass)
                dr.line([(xl(sh), sh), (xl(yb), yb)], fill=INK, width=2); dr.line([(xr(sh), sh), (xr(yb), yb)], fill=INK, width=2)
                dr.line([(ax_ - nw / 2, lip), (ax_ - nw / 2, sh)], fill=INK, width=2); dr.line([(ax_ + nw / 2, lip), (ax_ + nw / 2, sh)], fill=INK, width=2)
                dr.ellipse([ax_ - lw / 2, lip - lh, ax_ + lw / 2, lip + lh], fill=light(j['glass']), outline=INK, width=1)
        if JREC:   # version 9: lines only
            ring = mask_of(lambda d: d.ellipse(box, outline=255, width=rw)); opening = mask_of(lambda d: d.ellipse(box, fill=255)) & ~ring
            ink = mask_of(sides) | ring
            pale = np.zeros((H, W), bool)   # the 1 px line just inside the ring's near half: in each column, the row above its top there
            for x in np.where(ring.any(axis=0))[0]:
                ry = np.where(ring[:, x])[0]; ry = ry[ry + 0.5 > cy]
                if len(ry) and ry.min() - 1 + 0.5 > cy and opening[ry.min() - 1, x]: pale[ry.min() - 1, x] = True
            t = JT[j['name']]; s = t['streak']; ln = s['line']; w = min(2, s['widthPx'])
            mid = (lambda y: ln['a'] + ln['b'] * (y - ln['y0'])) if j['kind'] == 'cylinder' else (lambda y: ln['a'] + ln['b'] * (max(y, sh) - ln['y0']))
            st = np.zeros((H, W), bool)
            for y in range(int(np.floor(cy)), H):
                x0 = int(np.floor(mid(y) - (w - 1) / 2 + 0.5)); st[y, x0:x0 + w] = True
            pale &= sil & ~ink; st &= sil & ~ink & ~ring & ~opening; assert not (pale & st).any()
            oa = np.array(ov); oa[ink] = INK; oa[pale] = tuple(t['paleGlass']['rgb']) + (255,); oa[st] = tuple(s['rgb']) + (255,); ov = Image.fromarray(oa, 'RGBA'); dr = ImageDraw.Draw(ov)
            tops[j['name']] = {'ink': ink, 'pale': pale, 'streak': st, 'side': t['litSide'], 'widthPx': w}
        sil &= yy < j['baseBottom']; g = L.grow(sil & ~below, FREC['shapeMargin']) & ~below; grey = 140 + 20 * k   # no jar below its own base
        pieces4.append({'place': 'B', 'name': f"{j['name']} top", 'grey': grey, 'px': int(g.sum())}); place4 |= g; split4[g] = grey
    B_ = FREC['band']; c0, c1 = B_['columns']; band = np.zeros((H, W), bool); band[B_['top']:B_['bottom'] + 1, c0:c1 + 1] = True
    in0 = int(np.floor(B_['side'] + 0.5)); band[B_['insideRows'][1] + 1:, in0:] = False   # inside the side only above the hatch
    face = np.zeros((H, W), bool)
    for y, xf in B_['hatch']['faceLeftByRow'].items(): face[int(y), xf:680] = True
    assert not (band & face).any(), "the band reaches the hatch's face"
    ov_a = np.array(ov); r0, r1 = B_['housingRows']; ov_a[r0:r1 + 1, in0:c1 + 1] = tuple(B_['housing']) + (255,)
    (k0, k1), (i0, i1) = B_['ink']['columns'], B_['ink']['rows']; ov_a[i0:i1 + 1, k0:k1 + 1] = tuple(B_['ink']['rgb']) + (255,); ov = Image.fromarray(ov_a, 'RGBA')
    pieces4.append({'place': 'D', 'name': 'dispenser left edge', 'grey': 240, 'px': int(band.sum())}); place4 |= band; split4[band] = 240
    gs = [split4 == p['grey'] for p in pieces4]
    for a in range(len(gs)):
        for b in range(a + 1, len(gs)): assert not (L.grow(gs[a], 1) & gs[b]).any(), f"{pieces4[a]['name']} touches {pieces4[b]['name']}"
    seat = split3 == next(p['grey'] for p in pieces if p['name'] == 'stool' and p['step'] == 3)
    capsule = split3 == next(p['grey'] for p in pieces if p['name'] == 'food capsule' and p['step'] == 3)
    for p, g in zip(pieces4, gs):
        ys, xs = np.where(g); p.update({'bbox': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1], 'visibleCentreX': round(float(xs.mean())), 'step': 4,
                                        'seatPx': int((g & seat).sum()), 'capsuleShapePx': int((g & capsule).sum())})
    ova = np.array(ov); ova[~place4] = 0; ov = Image.fromarray(ova, 'RGBA')   # the overlay only where step 4 repaints
    assert set(np.unique(ova[..., 3]).tolist()) <= {0, 255}, 'the overlay is not all or nothing'
    if JREC:   # version 9: inside each jar's shape the guide draws its lines and nothing else
        drawn = ova[..., 3] > 0
        for p in pieces4:
            t = tops.get(p['name'][:-len(' top')]) if p['name'].endswith(' top') else None
            if t is None: continue
            g = split4 == p['grey']
            assert ((drawn & g) == ((t['ink'] | t['pale'] | t['streak']) & g)).all(), f"{p['name']}: the guide draws more than its lines"
            p['guide'] = {'inkPx': int((t['ink'] & g).sum()), 'rimHighlightPx': int((t['pale'] & g).sum()), 'streakPx': int((t['streak'] & g).sum()),
                          'streakSide': t['side'], 'streakWidthPx': t['widthPx'], 'transparentPx': int((g & ~drawn).sum())}
    save(place4, f'pv6-{V}-place4.png'); save(split4, f'pv6-{V}-split4.png'); ov.save(os.path.join(D, f'pv6-{V}-guide-s4.png'), optimize=True)
    comp, sizes = L.parts(place4); shapes4 = []
    for c in range(1, len(sizes)):
        m = comp == c; ys, xs = np.where(m); greys = set(int(v) for v in np.unique(split4[m])) - {0}
        shapes4.append({'pieces': [p['name'] for p in pieces4 if p['grey'] in greys], 'px': int(m.sum()), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1], 'visibleCentreX': round(float(xs.mean()))})
    assert len(shapes4) == len(pieces4) and all(len(s['pieces']) == 1 for s in shapes4), 'step 4: one connected shape a piece'
    out |= {'pieces4': pieces4, 'shapes4': sorted(shapes4, key=lambda s: s['visibleCentreX']), 'split4': {f"{p['place']} {p['name']}": p['grey'] for p in pieces4},
            'expected4': {'maskedShare': round(float(place4.mean()), 4), 'rawMaskAlpha': alpha(place4)}, 'fix4': {'record': os.path.basename(FF), 'sha256': hashlib.sha256(open(FF, 'rb').read()).hexdigest(), 'bandFacePx': int((band & face).sum()), 'facePx': int(face.sum()),
                                 'overlayPx': int((ova[..., 3] > 0).sum()), 'cut': {'x': [160, 364], 'rows': [int(cut[x]) for x in range(160, 365)]}}}
    if JREC: out |= {'jarTops4': {'record': os.path.basename(JF), 'sha256': hashlib.sha256(open(JF, 'rb').read()).hexdigest(), 'guide': {p['name']: p['guide'] for p in pieces4 if 'guide' in p}}}
json.dump(out, open(os.path.join(D, f'kit8-{V}.json'), 'w'), indent=1)
print('outlines', out['outlineShare'], '| PLACE mask', out['expected']['maskedShare'], '(over 10%)' if out['expected']['over10'] else '', '| step 3', out.get('expected3'), '|', len(shapes), 'shapes:', ' | '.join(' + '.join(f"{pieces[i]['place']}'s {pieces[i]['name']}" for i in s['pieces']) + f" x {s['bbox'][0]}-{s['bbox'][2]}" for s in shapes))
