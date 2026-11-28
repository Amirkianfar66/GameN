# Version 3 of the tool (pv9_tools.py), for sheet PV6-C version 8: version 2 (pv8_tools.py, below) with its commands unchanged, and a
# step 4 where the view's kit has one (the Lead, 18 November; the owner's yes): a fix, one masked edit of the kept step-3 picture
# inside step 4's shapes (the kit's place4: the three glass jars' tops and the dispenser's left edge). Its input shows step 4's guide
# there, an overlay (RGBA, alpha 0 or 255) laid over the picture, so the picture shows around what it draws; no second picture
# (s4 and s4-one are the same text). keep4 and lift4 are keep and lift on step 4's mask and split map. Version 2 was:
# Version 2 of the tool (pv8_tools.py), for sheets PV6-B and PV6-C version 4: version 1 (pv7_tools.py, below) with its commands unchanged,
# and a step 3 where the view's kit has one (the Lead and the owner, 18 November): the food capsule alone, one masked edit of the kept
# step-2 picture inside the capsule's outline grown 2 px (the kit's place3), its input showing the guide there, with no second picture
# (s3 and s3-one are the same text); step 2's input shows the step-2 guide, the stations without the capsule (guideS2). keep3 and lift3
# are keep and lift on step 3's mask and split map, so the capsule is lifted as its own piece. Version 1 was:
# The tool for sheets PV6-B to PV6-E (Room B's views from Juno's, Lyra's, Atlas's and Vega's places): PV6-A's tool (pv6_tools.py),
# its steps unchanged, for one view per sheet. Step 1 is a first pass over the empty-room guide; step 2 is one masked PLACE edit of
# that picture inside the pieces' outlines grown 6 px, its input showing the guide there. A mask is RGBA: the input's RGB, alpha 0 =
# repaint, 255 = keep. To keep the edit, it is composited over the step-1 picture inside the mask, the mask blurred by a 2 px
# Gaussian (Pillow's GaussianBlur(2)); replay-a shows this gives PV5-A-3's kept pictures byte for byte. The lift (lift5.py, the
# Lead's recipe) takes the pieces off the kept picture as layers, split by the split map. New for B to E: each step has two prompts,
# one for a tool that takes a second picture as a reference (PV6-A-2 for step 1, PV6-A-3 for step 2: the same room) and one for a
# tool that takes one; and the same-room check (same), which measures a step-1 picture against PV6-A-2: colour check version 4 with
# the view's map, its palette beside PV6-A-2's, every lamp and ring light lit where the guide puts it, and the room's surfaces that
# both pictures show, PV6-A-2 cast onto them through the room's planes. PNGs are written with Pillow's defaults; raw hashes (sha256
# of the RGB or alpha bytes) do not depend on the PNG encoder.
# Driven by the sheet's files: its manifest room-b-pv6<view>.json (its kit: files, prompts, expected hashes), the view's img/ files,
# lift5.py and colour-check-v4.py, each checked against its sha256 before use. Calls no service; generates nothing.
# Usage, from the sheet's folder (NumPy and Pillow):
#   python3 -I pv7_tools.py check                                     the files and the expected hashes
#   python3 -I pv7_tools.py s1 <view> <prefix> [--one-input]          <prefix>-S1-prompt.txt; prints the inputs and hashes
#   python3 -I pv7_tools.py same <view> <step-1 picture.png> <prefix> the same-room check: <prefix>-same.json and -same.png
#   python3 -I pv7_tools.py s2 <view> <step-1 picture.png> <prefix> [--one-input]   <prefix>-S2-input.png, -S2-mask.png, -S2-prompt.txt
#   python3 -I pv7_tools.py keep <view> <step-1 picture.png> <raw.png> <out.png>   the edit kept inside the PLACE mask
#   python3 -I pv7_tools.py lift <view> <step-1 picture.png> <kept.png> <prefix>   one RGBA layer per piece, and <prefix>-lift.json
#   python3 -I pv7_tools.py replay-a <folder>                         PV5-A-3's keeps and lift again, from its records page's files
#   python3 -I pv8_tools.py s3 <view> <step-2 kept.png> <prefix>       <prefix>-S3-input.png, -S3-mask.png, -S3-prompt.txt (version 2)
#   python3 -I pv8_tools.py keep3 <view> <step-2 kept.png> <raw.png> <out.png>   the capsule's edit kept inside step 3's mask (version 2)
#   python3 -I pv8_tools.py lift3 <view> <step-2 kept.png> <step-3 kept.png> <prefix>   the capsule's own layer (version 2)
# (version 2 runs every command above as pv8_tools.py)
#   python3 -I pv9_tools.py s4 <view> <step-3 kept.png> <prefix>       <prefix>-S4-input.png, -S4-mask.png, -S4-prompt.txt (version 3)
#   python3 -I pv9_tools.py keep4 <view> <step-3 kept.png> <raw.png> <out.png>   the fix kept inside step 4's mask (version 3)
#   python3 -I pv9_tools.py lift4 <view> <step-3 kept.png> <step-4 kept.png> <prefix>   the fixed parts as layers (version 3); a part the fix
#        changed only in parts smaller than the recipe keeps (400 px) is listed under belowTheRecipesSize, not lifted
# (version 3 runs every command above as pv9_tools.py)
import glob, hashlib, importlib.util, json, os, sys, zlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, __version__ as PILLOW
D = os.path.dirname(os.path.abspath(__file__)); W, H = 1024, 1536
spec = importlib.util.spec_from_file_location('lift5', os.path.join(D, 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
spec = importlib.util.spec_from_file_location('cc4', os.path.join(D, 'colour-check-v4.py')); CC = importlib.util.module_from_spec(spec); spec.loader.exec_module(CC)
sha = lambda b: hashlib.sha256(b).hexdigest()
fsha = lambda p: sha(open(p, 'rb').read())
def fail(msg): sys.exit('STOP: ' + msg)
def kit():
    found = sorted(glob.glob(os.path.join(D, 'room-b-pv6[b-e].json')))
    if len(found) != 1: fail(f'the folder holds {len(found)} sheet manifests, not one')
    m = json.load(open(found[0]))
    if 'kit' not in m: fail(f'{os.path.basename(found[0])} has no kit')
    if fsha(os.path.join(D, 'lift5.py')) != m['kit']['lift']['sha256']: fail('lift5.py is not the sheet\'s')
    if fsha(os.path.join(D, 'colour-check-v4.py')) != m['kit']['colourCheck']['sha256']: fail('colour-check-v4.py is not the sheet\'s')
    return m['kit']
def kitfile(e):
    p = os.path.join(D, e['published'])
    if not os.path.exists(p): fail(f"missing {e['published']}")
    if fsha(p) != e['sha256']: fail(f"{e['published']} is not the sheet's file (sha256 {fsha(p)[:12]}, want {e['sha256'][:12]})")
    return p
def view(K, X):
    if X not in K['views']: fail(f"view {X}: the kit is for {', '.join(K['views'])} only")
    return K['views'][X]
def rgb_of(p):
    im = Image.open(p)
    if im.size != (W, H): fail(f'{p} is {im.size[0]} x {im.size[1]}, not {W} x {H}')
    return np.array(im.convert('RGB'))
def place_of(V):
    a = np.array(Image.open(kitfile(V['files']['place'])).convert('L')) > 127   # True = repaint
    al = np.where(a, 0, 255).astype(np.uint8); e = V['expected']['s2']
    if sha(al.tobytes()) != e['rawMaskAlpha']: fail(f"PLACE mask alpha {sha(al.tobytes())[:12]}, want {e['rawMaskAlpha'][:12]}")
    return a, al
def prompt_of(V, step):
    t = V['prompts'][step]['text']
    if sha(t.encode('utf-8')) != V['prompts'][step]['sha256']: fail(f'{step} prompt hash')
    return t
def save(arr, p, mode=None): Image.fromarray(arr, mode).save(p); return fsha(p)
def write_prompt(t, p): open(p, 'w', encoding='utf-8', newline='').write(t)
def inputs_of(V, first, ref_key, one):
    out = [first]
    if not one: r = kitfile(V['refs'][ref_key]); out.append({'role': f"the same room, as a reference ({V['refs'][ref_key]['name']}): a second input, where the tool takes one", 'file': V['refs'][ref_key]['published'], 'sha256': fsha(r)})
    return out
def s1(X, prefix, one=False):
    K = kit(); V = view(K, X); g = kitfile(V['files']['empty']); key = 's1-one' if one else 's1'; t = prompt_of(V, key); write_prompt(t, f'{prefix}-S1-prompt.txt')
    first = {'role': 'the picture to paint over: the empty-room guide', 'file': V['files']['empty']['published'], 'sha256': fsha(g), 'rawRGB': sha(rgb_of(g).tobytes())}
    print(json.dumps({'view': X, 'step': 'S1 (the empty room, a first pass)', 'prompt': {'key': key, 'file': f'{os.path.basename(prefix)}-S1-prompt.txt', 'sha256': sha(t.encode('utf-8')), 'chars': len(t)},
                      'inputs': inputs_of(V, first, 'empty', one), 'settings': {'size': f'{W}x{H}', 'n': 1},
                      'check': {'sameRoom': f'pv7_tools.py same {X} <picture> <prefix>', 'colour': f"colour-check-v4.py with {V['files']['emptyRegions']['published']} (inside same)", 'lines': f"against {V['files']['emptyAnnotated']['published']}"}}, indent=1))
def s2(X, picture, prefix, one=False):
    K = kit(); V = view(K, X); pic = rgb_of(picture); a, al = place_of(V); guide = rgb_of(kitfile(V['files'].get('guideS2', V['files']['guide']))); inp = pic.copy(); inp[a] = guide[a]   # version 2: the step-2 guide, without the capsule, where there is one
    fi = save(inp, f'{prefix}-S2-input.png'); fm = save(np.dstack([inp, al]), f'{prefix}-S2-mask.png'); key = 's2-one' if one else 's2'; t = prompt_of(V, key); write_prompt(t, f'{prefix}-S2-prompt.txt')
    first = {'role': 'the picture to edit: the step-1 picture with the guide inside the PLACE mask, and the mask (alpha 0 = repaint)', 'file': f'{os.path.basename(prefix)}-S2-input.png', 'sha256': fi, 'mask': {'file': f'{os.path.basename(prefix)}-S2-mask.png', 'sha256': fm}}
    print(json.dumps({'view': X, 'step': 'S2 (place)', 'picture': {'file': os.path.basename(picture), 'sha256': fsha(picture), 'rawRGB': sha(pic.tobytes())},
                      'maskedShare': round(float(a.mean()), 4), 'rawInputRGB': sha(inp.tobytes()), 'rawMaskAlpha': sha(al.tobytes()), 'inputs': inputs_of(V, first, 'furnished', one),
                      'prompt': {'key': key, 'file': f'{os.path.basename(prefix)}-S2-prompt.txt', 'sha256': sha(t.encode('utf-8')), 'chars': len(t)}, 'settings': {'size': f'{W}x{H}', 'n': 1}}, indent=1))
# ---- the same-room check
def poly_mask(poly, grow=0):
    im = Image.new('L', (W, H), 0); ImageDraw.Draw(im).polygon([(float(p[0]), float(p[1])) for p in poly], fill=255); m = np.array(im) > 0
    return L.grow(m, grow) if grow else m
def lights(rgb):
    Lc, Cc, Hc = CC.oklch(rgb); cr = CC.CREAM; o = CC.ORANGE
    cream = (Hc >= cr['hue'][0]) & (Hc <= cr['hue'][1]) & (Cc >= cr['C']) & (Lc >= cr['L'])
    orange = (Lc >= CC.L_BLACK) & (Hc >= o['hue'][0]) & (Hc <= o['hue'][1]) & (Cc >= o['C']) & (Lc >= o['L'])
    return cream, orange, cream | orange
def lamp_stats(rgb, marks):
    cream, orange, lit = lights(rgb); out = {}; yy, xx = np.mgrid[:H, :W]
    for l in marks['lamps']:
        pl = np.array(l['plate']); w, h = np.ptp(pl[:, 0]), np.ptp(pl[:, 1]); g = max(6, int(round(0.35 * w)))
        core = poly_mask(l['core'], g); cx, cy = pl.mean(axis=0); R = 2.5 * max(w, h); glow = ((xx - cx) ** 2 + (yy - cy) ** 2 <= R * R) & ~poly_mask(l['plate'], g)
        out[l['id']] = {'wall': l['wall'], 'depthM': l['depthM'], 'corePx': int(core.sum()), 'coreCream': round(float(cream[core].mean()), 4) if core.any() else None,
                        'glowPx': int(glow.sum()), 'glowOrange': round(float(orange[glow].mean()), 4) if glow.any() else None}
    return out
def ring_stats(rgb, marks):
    _, _, lit = lights(rgb); return [{'k': r['k'], 'lit': round(float(lit[poly_mask(r['poly'], 4)].mean()), 4)} for r in marks['ring'] if poly_mask(r['poly'], 4).any()]
SURFACES = ['deck', 'ceiling', 'north wall', 'south wall', 'east wall', 'west wall']
def cam_axes(cam):
    y = np.radians(cam['yawDeg']); return np.array(cam['at'], float), np.array([np.sin(y), 0, np.cos(y)]), np.array([np.cos(y), 0, -np.sin(y)])
def room_hits(cam):   # each pixel's ray from the camera to the first of the room's six planes (the empty room is a box)
    C, fwd, right = cam_axes(cam); X, Y = np.meshgrid(np.arange(W) + 0.5, np.arange(H) + 0.5); f = cam['focalPx']
    d = ((X - cam['cx']) / f)[..., None] * right + ((cam['horizonY'] - Y) / f)[..., None] * np.array([0.0, 1.0, 0.0]) + fwd
    h, top = cam['room']['halfM'], cam['room']['ceilingM']; t = np.full((H, W), np.inf); surf = np.full((H, W), -1)
    for k, (ax, val) in enumerate([(1, 0.0), (1, top), (2, h), (2, -h), (0, h), (0, -h)]):
        with np.errstate(divide='ignore', invalid='ignore'): tk = (val - C[ax]) / d[..., ax]
        P = C + tk[..., None] * d; e = 1e-6
        ok = (tk > e) & (np.abs(P[..., 0]) <= h + e) & (np.abs(P[..., 2]) <= h + e) & (P[..., 1] >= -e) & (P[..., 1] <= top + e) & (tk < t); t[ok] = tk[ok]; surf[ok] = k
    return C + t[..., None] * d, surf
def seen_from(cam, P):
    C, fwd, right = cam_axes(cam); d = P - C; v2 = d @ fwd
    with np.errstate(divide='ignore', invalid='ignore'): u = cam['cx'] + cam['focalPx'] * (d @ right) / v2; v = cam['horizonY'] - cam['focalPx'] * d[..., 1] / v2
    return u, v, (v2 > 0.1) & (u >= 0) & (u < W) & (v >= 0) & (v < H)
def oklab(rgb):
    Lc, Cc, Hc = CC.oklch(rgb); hr = np.radians(Hc); return np.dstack([Lc, Cc * np.cos(hr), Cc * np.sin(hr)])
def edges(Lc):
    b = np.array(Image.fromarray(np.clip(Lc * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(2))).astype(float); gy, gx = np.gradient(b); return np.hypot(gx, gy)
def shared_surfaces(pic, ref, camX, camA):
    P, surf = room_hits(camX); u, v, ok = seen_from(camA, P); ui, vi = np.clip(u.astype(int), 0, W - 1), np.clip(v.astype(int), 0, H - 1)
    cast = np.zeros_like(pic); cast[ok] = ref[vi[ok], ui[ok]]
    A, B = oklab(pic), oklab(cast); dE = np.sqrt(((A - B) ** 2).sum(axis=2)); eA, eB = edges(A[..., 0]), edges(B[..., 0]); rows = {}
    for k, name in enumerate(SURFACES):
        m = ok & (surf == k)
        if m.sum() < 2000: continue
        x, y = eA[m], eB[m]; cor = float(np.corrcoef(x, y)[0, 1]) if x.std() > 0 and y.std() > 0 else None
        rows[name] = {'shareOfPicture': round(float(m.mean()), 4), 'medianDeltaE': round(float(np.median(dE[m])), 4), 'edgeCorrelation': round(cor, 3) if cor is not None else None}
    allm = ok & (surf >= 0); x, y = eA[allm], eB[allm]
    rows['all shared'] = {'shareOfPicture': round(float(allm.mean()), 4), 'medianDeltaE': round(float(np.median(dE[allm])), 4), 'edgeCorrelation': round(float(np.corrcoef(x, y)[0, 1]), 3)}
    shown = cast.copy(); shown[~ok] = (shown[~ok] * 0 + 40).astype(np.uint8)
    return rows, np.hstack([pic, np.full((H, 16, 3), 255, np.uint8), shown])
# the gates, against PV6-A-2 measured the same way (proposed for B to E, to be set again on the first view's picture): PV6-A-2 passes
# them against itself, PV6-A-3 (the same room, furnished) passes, PV5-A-2 (the earlier violet look) fails
GATE = {'walls and deck median lightness': 0.06, 'walls and deck median chroma': 0.03, 'walls and deck median hue': 15.0, 'deck median lightness': 0.08,
        'orange share': (0.5, 2.0), 'cream share': (0.33, 3.0), 'lamp core': 0.5, 'ring lights lit': (0.5, 0.75), 'shared surfaces median delta E': 0.10}
def same(X, picture, prefix):
    K = kit(); V = view(K, X); pic = rgb_of(picture); ref = rgb_of(kitfile(V['refs']['empty']))
    mX = json.load(open(kitfile(V['files']['marks']))); mA = json.load(open(kitfile(V['refs']['aMarks'])))
    cX = CC.check(picture, kitfile(V['files']['emptyRegions'])); cA = CC.check(kitfile(V['refs']['empty']), kitfile(V['refs']['aMap']))
    wX, wA, dX, dA = cX['areas']['walls and deck'], cA['areas']['walls and deck'], cX['areas']['deck'], cA['areas']['deck']
    hue = lambda a, b: abs(((a - b) + 180) % 360 - 180)
    within = lambda x, r, k: r * k[0] <= x <= r * k[1] if r > 0 else x <= 0.002
    palette = {'walls and deck median lightness': [wX['medianL'], wA['medianL']], 'walls and deck median chroma': [wX['medianChroma'], wA['medianChroma']],
               'walls and deck median hue': [wX['medianHueOfReadable'], wA['medianHueOfReadable']], 'deck median lightness': [dX['medianL'], dA['medianL']],
               'orange share': [cX['warm']['orange'], cA['warm']['orange']], 'cream share': [cX['warm']['cream'], cA['warm']['cream']], 'rust share': [cX['warm']['rust'], cA['warm']['rust']]}
    lX, lA = lamp_stats(pic, mX), lamp_stats(ref, mA); rX, rA = ring_stats(pic, mX), ring_stats(ref, mA)
    medA = lambda key: float(np.median([v[key] for v in lA.values() if v[key] is not None])); rmed = float(np.median([r['lit'] for r in rA]))
    edge = {l['id'] for l in mX['lamps'] if l['coreInFrame'] < 0.5}   # a lamp whose core is mostly past the edge is reported, not gated
    # a lamp is lit at its place when its cream core is there (the glow round it is reported: a screen, a window or a corner beside a
    # lamp takes part of its ring, and the warm light as a whole is the palette's orange gate)
    lamps_ok = {k: v['coreCream'] is not None and v['coreCream'] >= GATE['lamp core'] * medA('coreCream') for k, v in lX.items() if k not in edge}
    ring_lit = [r['lit'] >= GATE['ring lights lit'][0] * rmed for r in rX]
    shared, vis = shared_surfaces(pic, ref, mX['camera'], mA['camera'])
    gates = {'colour check version 4 with the view\'s map': cX['pass'],
             'walls and deck: median lightness, chroma and hue as PV6-A-2\'s': abs(wX['medianL'] - wA['medianL']) <= GATE['walls and deck median lightness'] and abs(wX['medianChroma'] - wA['medianChroma']) <= GATE['walls and deck median chroma'] and hue(wX['medianHueOfReadable'], wA['medianHueOfReadable']) <= GATE['walls and deck median hue'],
             'deck: median lightness as PV6-A-2\'s': abs(dX['medianL'] - dA['medianL']) <= GATE['deck median lightness'],
             'warm light: orange and cream shares as PV6-A-2\'s': within(cX['warm']['orange'], cA['warm']['orange'], GATE['orange share']) and within(cX['warm']['cream'], cA['warm']['cream'], GATE['cream share']),
             'every lamp in view lit at its place': all(lamps_ok.values()),
             'the ring lights lit at their places': len(ring_lit) > 0 and sum(ring_lit) >= GATE['ring lights lit'][1] * len(ring_lit),
             'the surfaces both pictures show: PV6-A-2\'s colour (median delta E)': shared['all shared']['medianDeltaE'] <= GATE['shared surfaces median delta E']}
    out = {'view': X, 'picture': {'file': os.path.basename(picture), 'sha256': fsha(picture)}, 'reference': {'file': V['refs']['empty']['published'], 'sha256': fsha(kitfile(V['refs']['empty']))},
           'pass': all(gates.values()), 'gates': gates, 'tolerances': GATE, 'palette': {k: {'picture': a, 'PV6-A-2': b} for k, (a, b) in palette.items()},
           'lamps': {'picture': lX, 'PV6-A-2': lA, 'PV6-A-2 median core': round(medA('coreCream'), 4), 'PV6-A-2 median glow (reported)': round(medA('glowOrange'), 4), 'lit': lamps_ok, 'atTheEdgeNotGated': sorted(edge)}, 'ring': {'picture': rX, 'PV6-A-2 median lit': round(rmed, 4), 'litCount': f'{sum(ring_lit)} of {len(ring_lit)}'},
           'sharedSurfaces': {'note': 'PV6-A-2 cast onto the room planes this view and PV6-A-2 both show (pipes and shelves stand off the walls, so they shift a little): the median delta E in OKLab is gated (proposed, 0.10), the edge correlation of the two lightness pictures there is reported', **shared},
           'colourCheck': {'picture': cX['result'], 'pass': cX['pass']}}
    json.dump(out, open(f'{prefix}-same.json', 'w'), indent=1); Image.fromarray(vis).resize((vis.shape[1] // 2, vis.shape[0] // 2), Image.LANCZOS).save(f'{prefix}-same.png')
    print(json.dumps({k: out[k] for k in ('view', 'pass', 'gates')} | {'sharedSurfaces': shared}, indent=1)); sys.exit(0 if out['pass'] else 1)
def composite(start, raw, a):
    Lm = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
    return np.array(Image.composite(Image.fromarray(raw), Image.fromarray(start), Lm))
def keep(X, start, raw, outp):
    K = kit(); V = view(K, X); a, _ = place_of(V); s = rgb_of(start); o = composite(s, rgb_of(raw), a); f = save(o, outp)
    d = np.abs(o.astype(int) - s).max(axis=2); far = ~L.grow(a, 4)
    print(json.dumps({'view': X, 'step': 'S2 kept', 'start': {'file': os.path.basename(start), 'sha256': fsha(start)}, 'raw': {'file': os.path.basename(raw), 'sha256': fsha(raw)},
                      'kept': {'file': os.path.basename(outp), 'sha256': f, 'rawRGBsha256': sha(o.tobytes())}, 'how': 'the raw edit over the step-1 picture inside the PLACE mask, feathered by a 2 px Gaussian',
                      'moreThan4pxOutsideMask': {'meanAbsDiff': round(float(d[far].mean()), 4), 'maxAbsDiff': int(d[far].max())}}, indent=1))
def lift(X, start, kept, prefix):
    K = kit(); V = view(K, X); a, _ = place_of(V); s, k = rgb_of(start), rgb_of(kept)
    split = np.array(Image.open(kitfile(V['files']['split'])).convert('L'))
    b, al = L.matte(s, k, a); out = {'view': X, 'recipe': K['lift']['recipe'], 'pieces': {}, 'missing': []}
    for st, grey in V['split'].items():
        own = split == grey; m = b & own; alpha = al * own
        if not m.any(): out['missing'].append(st); continue
        ys, xs = np.where(m); a8 = np.rint(alpha * 255).astype(np.uint8); f = f"{prefix}-{st.replace(' ', '-')}.png"
        fh = save(np.dstack([k * (a8 > 0)[..., None], a8]), f, 'RGBA')
        out['pieces'][st] = {'file': os.path.basename(f), 'sha256': fh, 'px': int(m.sum()), 'x': [int(xs.min()), int(xs.max())], 'y': [int(ys.min()), int(ys.max())], 'shareOfItsOutline': round(float(m.sum() / own.sum()), 4)}
    out['rebuildMeanAbsDiff'] = round(float(np.abs(L.rebuild(s, k, al).astype(int) - k).mean()), 4)
    json.dump(out, open(f'{prefix}-lift.json', 'w'), indent=1); print(json.dumps(out, indent=1))
    if out['missing']: sys.exit(1)
# ---- version 2: step 3, the food capsule alone
def place3_of(V):
    if 'place3' not in V['files']: fail('this view has no step 3')
    a = np.array(Image.open(kitfile(V['files']['place3'])).convert('L')) > 127   # True = repaint
    al = np.where(a, 0, 255).astype(np.uint8); e = V['expected']['s3']
    if sha(al.tobytes()) != e['rawMaskAlpha']: fail(f"step 3's mask alpha {sha(al.tobytes())[:12]}, want {e['rawMaskAlpha'][:12]}")
    return a, al
def s3(X, kept2, prefix):
    K = kit(); V = view(K, X); a, al = place3_of(V); pic = rgb_of(kept2); guide = rgb_of(kitfile(V['files']['guide'])); inp = pic.copy(); inp[a] = guide[a]
    fi = save(inp, f'{prefix}-S3-input.png'); fm = save(np.dstack([inp, al]), f'{prefix}-S3-mask.png'); t = prompt_of(V, 's3'); write_prompt(t, f'{prefix}-S3-prompt.txt')
    if prompt_of(V, 's3-one') != t: fail('s3 and s3-one differ')
    first = {'role': "the picture to edit: the kept step-2 picture with the guide inside step 3's mask (the capsule's outline grown 2 px), and the mask (alpha 0 = repaint)", 'file': f'{os.path.basename(prefix)}-S3-input.png', 'sha256': fi, 'mask': {'file': f'{os.path.basename(prefix)}-S3-mask.png', 'sha256': fm}}
    print(json.dumps({'view': X, 'step': 'S3 (the food capsule alone, one masked edit)', 'picture': {'file': os.path.basename(kept2), 'sha256': fsha(kept2), 'rawRGB': sha(pic.tobytes())},
                      'maskedShare': round(float(a.mean()), 4), 'rawInputRGB': sha(inp.tobytes()), 'rawMaskAlpha': sha(al.tobytes()), 'inputs': [first], 'secondPicture': 'none: s3 and s3-one are the same text',
                      'prompt': {'key': 's3', 'file': f'{os.path.basename(prefix)}-S3-prompt.txt', 'sha256': sha(t.encode('utf-8')), 'chars': len(t)}, 'settings': {'size': f'{W}x{H}', 'n': 1}}, indent=1))
def keep3(X, kept2, raw, outp):
    K = kit(); V = view(K, X); a, _ = place3_of(V); s = rgb_of(kept2); o = composite(s, rgb_of(raw), a); f = save(o, outp)
    d = np.abs(o.astype(int) - s).max(axis=2); far = ~L.grow(a, 4)
    print(json.dumps({'view': X, 'step': 'S3 kept', 'start': {'file': os.path.basename(kept2), 'sha256': fsha(kept2)}, 'raw': {'file': os.path.basename(raw), 'sha256': fsha(raw)},
                      'kept': {'file': os.path.basename(outp), 'sha256': f, 'rawRGBsha256': sha(o.tobytes())}, 'how': "the raw edit over the kept step-2 picture inside step 3's mask, feathered by a 2 px Gaussian",
                      'moreThan4pxOutsideMask': {'meanAbsDiff': round(float(d[far].mean()), 4), 'maxAbsDiff': int(d[far].max())}}, indent=1))
def lift3(X, kept2, kept3, prefix):
    K = kit(); V = view(K, X); a, _ = place3_of(V); s, k = rgb_of(kept2), rgb_of(kept3)
    split = np.array(Image.open(kitfile(V['files']['split3'])).convert('L'))
    b, al = L.matte(s, k, a); out = {'view': X, 'step': 3, 'recipe': K['lift']['recipe'], 'pieces': {}, 'missing': []}
    for st, grey in V['split3'].items():
        own = split == grey; m = b & own; alpha = al * own
        if not m.any(): out['missing'].append(st); continue
        ys, xs = np.where(m); a8 = np.rint(alpha * 255).astype(np.uint8); f = f"{prefix}-{st.replace(' ', '-')}.png"
        fh = save(np.dstack([k * (a8 > 0)[..., None], a8]), f, 'RGBA')
        out['pieces'][st] = {'file': os.path.basename(f), 'sha256': fh, 'px': int(m.sum()), 'x': [int(xs.min()), int(xs.max())], 'y': [int(ys.min()), int(ys.max())], 'shareOfItsOutline': round(float(m.sum() / own.sum()), 4)}
    out['rebuildMeanAbsDiff'] = round(float(np.abs(L.rebuild(s, k, al).astype(int) - k).mean()), 4)
    json.dump(out, open(f'{prefix}-lift3.json', 'w'), indent=1); print(json.dumps(out, indent=1))
    if out['missing']: sys.exit(1)
# ---- version 3: step 4, a fix over the kept step-3 picture
def place4_of(V):
    if 'place4' not in V['files']: fail('this view has no step 4')
    a = np.array(Image.open(kitfile(V['files']['place4'])).convert('L')) > 127   # True = repaint
    al = np.where(a, 0, 255).astype(np.uint8); e = V['expected']['s4']
    if sha(al.tobytes()) != e['rawMaskAlpha']: fail(f"step 4's mask alpha {sha(al.tobytes())[:12]}, want {e['rawMaskAlpha'][:12]}")
    return a, al
def guide4_of(V, a):
    g = Image.open(kitfile(V['files']['guideS4']))
    if g.mode != 'RGBA' or g.size != (W, H): fail("step 4's guide is not a 1024 x 1536 RGBA overlay")
    g = np.array(g); ga = g[..., 3]
    if not set(np.unique(ga).tolist()) <= {0, 255}: fail("step 4's guide has partial alpha")
    if (ga[~a] > 0).any(): fail("step 4's guide draws outside step 4's mask")
    return g[..., :3], ga == 255
def s4(X, kept3, prefix):
    K = kit(); V = view(K, X); a, al = place4_of(V); pic = rgb_of(kept3); g, drawn = guide4_of(V, a); inp = pic.copy(); inp[drawn] = g[drawn]
    fi = save(inp, f'{prefix}-S4-input.png'); fm = save(np.dstack([inp, al]), f'{prefix}-S4-mask.png'); t = prompt_of(V, 's4'); write_prompt(t, f'{prefix}-S4-prompt.txt')
    if prompt_of(V, 's4-one') != t: fail('s4 and s4-one differ')
    first = {'role': "the picture to edit: the kept step-3 picture with step 4's guide laid over it inside step 4's mask (the jars' tops and the dispenser's left edge), and the mask (alpha 0 = repaint)", 'file': f'{os.path.basename(prefix)}-S4-input.png', 'sha256': fi, 'mask': {'file': f'{os.path.basename(prefix)}-S4-mask.png', 'sha256': fm}}
    print(json.dumps({'view': X, 'step': "S4 (a fix: the glass jars' tops and the dispenser's left edge, one masked edit)", 'picture': {'file': os.path.basename(kept3), 'sha256': fsha(kept3), 'rawRGB': sha(pic.tobytes())},
                      'maskedShare': round(float(a.mean()), 4), 'guideDrawnPx': int(drawn.sum()), 'rawInputRGB': sha(inp.tobytes()), 'rawMaskAlpha': sha(al.tobytes()), 'inputs': [first], 'secondPicture': 'none: s4 and s4-one are the same text',
                      'prompt': {'key': 's4', 'file': f'{os.path.basename(prefix)}-S4-prompt.txt', 'sha256': sha(t.encode('utf-8')), 'chars': len(t)}, 'settings': {'size': f'{W}x{H}', 'n': 1}}, indent=1))
def keep4(X, kept3, raw, outp):
    K = kit(); V = view(K, X); a, _ = place4_of(V); s = rgb_of(kept3); o = composite(s, rgb_of(raw), a); f = save(o, outp)
    d = np.abs(o.astype(int) - s).max(axis=2); far = ~L.grow(a, 4)
    print(json.dumps({'view': X, 'step': 'S4 kept', 'start': {'file': os.path.basename(kept3), 'sha256': fsha(kept3)}, 'raw': {'file': os.path.basename(raw), 'sha256': fsha(raw)},
                      'kept': {'file': os.path.basename(outp), 'sha256': f, 'rawRGBsha256': sha(o.tobytes())}, 'how': "the raw edit over the kept step-3 picture inside step 4's mask, feathered by a 2 px Gaussian",
                      'moreThan4pxOutsideMask': {'meanAbsDiff': round(float(d[far].mean()), 4), 'maxAbsDiff': int(d[far].max())}}, indent=1))
def lift4(X, kept3, kept4, prefix):
    K = kit(); V = view(K, X); a, _ = place4_of(V); s, k = rgb_of(kept3), rgb_of(kept4)
    split = np.array(Image.open(kitfile(V['files']['split4'])).convert('L'))
    b, al = L.matte(s, k, a); ch = np.abs(k.astype(np.int16) - s.astype(np.int16)).max(axis=2) > L.THRESH
    out = {'view': X, 'step': 4, 'recipe': K['lift']['recipe'], 'pieces': {}, 'belowTheRecipesSize': {}, 'missing': []}
    for st, grey in V['split4'].items():
        own = split == grey; m = b & own; alpha = al * own
        if not m.any():   # a thin fix (the edge band) can change only parts smaller than the recipe keeps: reported, not missing
            if (ch & own).any(): out['belowTheRecipesSize'][st] = {'changedPx': int((ch & own).sum()), 'minPartPx': L.MIN_PX}
            else: out['missing'].append(st)
            continue
        ys, xs = np.where(m); a8 = np.rint(alpha * 255).astype(np.uint8); f = f"{prefix}-{st.replace(' ', '-')}.png"
        fh = save(np.dstack([k * (a8 > 0)[..., None], a8]), f, 'RGBA')
        out['pieces'][st] = {'file': os.path.basename(f), 'sha256': fh, 'px': int(m.sum()), 'x': [int(xs.min()), int(xs.max())], 'y': [int(ys.min()), int(ys.max())], 'shareOfItsOutline': round(float(m.sum() / own.sum()), 4)}
    out['rebuildMeanAbsDiff'] = round(float(np.abs(L.rebuild(s, k, al).astype(int) - k).mean()), 4)
    json.dump(out, open(f'{prefix}-lift4.json', 'w'), indent=1); print(json.dumps(out, indent=1))
    if out['missing']: sys.exit(1)
def check():
    K = kit(); ok = True
    print(f'PV6-B to PV6-E kit for {", ".join(K["views"])}; Pillow {PILLOW}, zlib {zlib.ZLIB_RUNTIME_VERSION}; lift5.py {K["lift"]["sha256"][:12]}; colour-check-v4.py {K["colourCheck"]["sha256"][:12]}')
    for X, V in K['views'].items():
        for e in list(V['files'].values()) + list(V['refs'].values()): kitfile(e)
        a, _ = place_of(V); [prompt_of(V, k) for k in ('s1', 's1-one', 's2', 's2-one')]
        if round(float(a.mean()), 4) != V['expected']['s2']['maskedShare']: ok = False; print(f'  {X}: masked share {a.mean():.4f}')
        print(f"{X}: S1 input {V['files']['empty']['published']} {V['files']['empty']['sha256']}, reference {V['refs']['empty']['published']} {V['refs']['empty']['sha256']}")
        print(f"   prompts s1 {V['prompts']['s1']['sha256']}, s1-one {V['prompts']['s1-one']['sha256']}")
        print(f"   S2 mask {V['files']['place']['published']}: share {V['expected']['s2']['maskedShare']}, rawMaskAlpha {V['expected']['s2']['rawMaskAlpha']}, reference {V['refs']['furnished']['published']}")
        print(f"   prompts s2 {V['prompts']['s2']['sha256']}, s2-one {V['prompts']['s2-one']['sha256']}")
        if 'place3' in V['files']:   # version 2: step 3
            a3, _ = place3_of(V); [prompt_of(V, k) for k in ('s3', 's3-one')]
            if round(float(a3.mean()), 4) != V['expected']['s3']['maskedShare']: ok = False; print(f'  {X}: step 3 masked share {a3.mean():.4f}')
            print(f"   S3 mask {V['files']['place3']['published']}: share {V['expected']['s3']['maskedShare']}, rawMaskAlpha {V['expected']['s3']['rawMaskAlpha']}, no second picture; S2 guide {V['files']['guideS2']['published']}")
            print(f"   prompts s3 {V['prompts']['s3']['sha256']} (s3-one the same)")
        if 'place4' in V['files']:   # version 3: step 4
            a4, _ = place4_of(V); guide4_of(V, a4); [prompt_of(V, k) for k in ('s4', 's4-one')]
            if round(float(a4.mean()), 4) != V['expected']['s4']['maskedShare']: ok = False; print(f'  {X}: step 4 masked share {a4.mean():.4f}')
            print(f"   S4 mask {V['files']['place4']['published']}: share {V['expected']['s4']['maskedShare']}, rawMaskAlpha {V['expected']['s4']['rawMaskAlpha']}, guide {V['files']['guideS4']['published']} (an overlay), no second picture")
            print(f"   prompts s4 {V['prompts']['s4']['sha256']} (s4-one the same)")
    print('all files and expected hashes match' if ok else 'MISMATCH'); sys.exit(0 if ok else 1)
# PV5-A-3's record (records page version 1794962903-4c9a), and the Lead's three parts of its lift
A3 = {'s1': {'start': 'img/PV5-A-2-fix.png', 'raw': 'img/PV5-A-3-s1-raw.png', 'mask': 'check/PV5-A-3-S1-mask.png', 'input': 'check/PV5-A-3-S1-input.png',
              'keptSha256': '096735ea6ac5d372a015f07fdf3abf4f90b85c8ebacbfd1d9ecd6d1407df4c89', 'keptRawRGB': '7e59f1f926e9cd5a69ada4ae221345021ef521c906fc225e08f98151522dcac6', 'maskSha256': '48d2752c260954bc90edde8a1f61011a3742e2e61df999a8284bdfeb18de2be1'},
      's2': {'start': 'img/PV5-A-3-s1.png', 'raw': 'img/PV5-A-3-s2-raw.png', 'mask': 'check/PV5-A-3-S2-mask.png', 'input': 'check/PV5-A-3-S2-input.png',
              'keptSha256': '95564a050ba04aa5e059aa61eb09e64a0f3dc725e7f698e446ba07c19572c4e8', 'keptRawRGB': '553ef352aac49c99a8200e9de1d70da6241e22c6a3acf49acb9341e1d960651b', 'maskSha256': 'cf69673c8bc0254f5e45d170f38ce618bd214c3e755cacf5aabae23767c94dec'}}
A3_PARTS = [(62642, [229, 390], [819, 1281]), (14331, [547, 645], [820, 983]), (4747, [793, 851], [890, 980])]
def replay_a(folder):
    ok = True; P = lambda r: os.path.join(folder, r)
    for step, r in A3.items():
        m = np.array(Image.open(P(r['mask']))); a = m[..., 3] < 128
        o = composite(rgb_of(P(r['start'])), rgb_of(P(r['raw'])), a); tmp = P(f'_replay-{step}.png'); f = save(o, tmp); os.remove(tmp)
        tmp2 = P(f'_replay-{step}-mask.png'); Image.fromarray(np.dstack([rgb_of(P(r['input'])), np.where(a, 0, 255).astype(np.uint8)])).save(tmp2); fm = fsha(tmp2); os.remove(tmp2)
        res = {'keptRawRGB': sha(o.tobytes()) == r['keptRawRGB'], 'keptFile': f == r['keptSha256'], 'maskFileFromInputAndAlpha': fm == r['maskSha256']}
        ok &= all(res.values()); print(step, res)
    a = np.array(Image.open(P(A3['s2']['mask'])))[..., 3] < 128; b, al = L.matte(rgb_of(P('img/PV5-A-3-s1.png')), rgb_of(P('img/PV5-A-3.png')), a); comp, sizes = L.parts(b)
    parts = sorted(((int(sizes[c]), [int(np.where(comp == c)[1].min()), int(np.where(comp == c)[1].max())], [int(np.where(comp == c)[0].min()), int(np.where(comp == c)[0].max())]) for c in range(1, len(sizes))), key=lambda t: t[1][0])
    same = parts == A3_PARTS; ok &= same; print('lift', {'parts': parts, 'theLeadsThreeParts': same})
    print('PV5-A-3 replayed: keeps byte for byte, lift as the Lead measured' if ok else 'REPLAY DIFFERS'); sys.exit(0 if ok else 1)
if __name__ == '__main__':
    a = [x for x in sys.argv[1:] if x != '--one-input']; one = '--one-input' in sys.argv[1:]
    if a[:1] == ['check'] and len(a) == 1: check()
    elif a[:1] == ['s1'] and len(a) == 3: s1(a[1], a[2], one)
    elif a[:1] == ['same'] and len(a) == 4: same(a[1], a[2], a[3])
    elif a[:1] == ['s2'] and len(a) == 4: s2(a[1], a[2], a[3], one)
    elif a[:1] == ['keep'] and len(a) == 5: keep(a[1], a[2], a[3], a[4])
    elif a[:1] == ['lift'] and len(a) == 5: lift(a[1], a[2], a[3], a[4])
    elif a[:1] == ['replay-a'] and len(a) == 2: replay_a(a[1])
    elif a[:1] == ['s3'] and len(a) == 4: s3(a[1], a[2], a[3])
    elif a[:1] == ['keep3'] and len(a) == 5: keep3(a[1], a[2], a[3], a[4])
    elif a[:1] == ['lift3'] and len(a) == 5: lift3(a[1], a[2], a[3], a[4])
    elif a[:1] == ['s4'] and len(a) == 4: s4(a[1], a[2], a[3])
    elif a[:1] == ['keep4'] and len(a) == 5: keep4(a[1], a[2], a[3], a[4])
    elif a[:1] == ['lift4'] and len(a) == 5: lift4(a[1], a[2], a[3], a[4])
    else: sys.exit(open(__file__).read().split('import glob')[0])
