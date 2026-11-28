# The tool for sheet RA-A (Room A, view A: Vega's place), version 2 (sheet version 6): version 1 (ra1_tools.py, its header below),
# its commands unchanged, with step 4, a fix over the kept step-3 picture (the Lead, 13:07 and 13:24 on 19 November): RA-A-4's
# cabinet, whose right side has no frame, gets one masked edit inside a narrow mask at that side (img/ra-A-place4.png). Step 4's
# input is the picture itself, with no guide in it, and the mask (alpha 0 = repaint); there is no second picture. keep4 keeps the
# edit inside step 4's mask as keep does (a 2 px Gaussian feather). lift4 refreshes the cabinet's layer: the Lead's recipe (lift5.py)
# on the step-1 picture and the step-4 kept picture inside the cabinet's step-2 split area together with step 4's mask, one layer.
# frame4 measures the new frame's outer edge on the rows beside the grille (y 705 to 861): a pixel departs from the wall when it is
# more than 35 from the median brightness of the unchanged wall just outside the mask in its row (x 547 to 552, five rows), and the
# edge is the rightmost column of the mask in which at least half of those rows depart, so a vertical frame counts and the wall's
# seams, scratches and clamp tips do not. The frame passes the 15 px rule against the grille (its edge at x 553) when its edge is
# x 537 or less. It is a measure for the Lead's review, which stays by eye. Step 4's kit is its own file, room-a-ra-a-s4.json,
# beside version 4's manifest room-a-ra-a.json, which is unchanged and drives steps 1 to 3 as before.
# Usage, from the sheet's folder (NumPy and Pillow), every version 1 command as ra2_tools.py, and:
#   python3 -I ra2_tools.py s4 A <step-3 kept.png> <prefix>           <prefix>-S4-input.png, -S4-mask.png, -S4-prompt.txt
#   python3 -I ra2_tools.py keep4 A <step-3 kept.png> <raw.png> <out.png>         step 4's edit kept inside its mask
#   python3 -I ra2_tools.py lift4 A <step-1 picture.png> <step-4 kept.png> <prefix>   the cabinet's refreshed layer, <prefix>-lift4.json
#   python3 -I ra2_tools.py frame4 A <step-4 kept.png> <prefix>       the frame's outer edge beside the grille, <prefix>-frame4.json
#   python3 -I ra2_tools.py colours A 4 <picture.png> <prefix>        the colour check with steps 2 and 3's map
# Version 1 was:
# The tool for sheet RA-A (Room A, view A: Vega's place), version 1: Room B's PV6 tool (pv6_tools.py, with pv8_tools.py's step 3),
# its steps unchanged, for Room A's first view. Step 1 is a first pass over the empty-room guide, with no mask and no second picture.
# Step 2 is one masked PLACE edit of that picture inside the furniture's outlines grown 6 px, its input showing the step-2 guide (the
# furniture without the capsule) there. Step 3 is one masked edit of the kept step-2 picture inside the capsule's outline grown 2 px,
# its input showing the guide there. A mask is RGBA: the input's RGB, alpha 0 = repaint, 255 = keep. To keep an edit, it is
# composited over its start picture inside its mask, the mask blurred by a 2 px Gaussian (Pillow's GaussianBlur(2)), as Room B's
# keeps are. The lift (lift5.py, the Lead's recipe) takes the pieces off a kept picture as layers, split by the split map: each piece's
# outline grown, the nearer piece owning an overlap. The colours command runs the Room A colour check (colour-check-ra1.py) with the
# step's region map. PNGs are written with Pillow's defaults; raw hashes (sha256 of the RGB or alpha bytes) do not depend on the PNG
# encoder. Driven by the sheet's files: room-a-ra-a.json (its kit: files, prompts, expected hashes), the img/ files, lift5.py and
# colour-check-ra1.py, each checked against its sha256 before use. Calls no service; generates nothing.
# Usage, from the sheet's folder (NumPy and Pillow):
#   python3 -I ra1_tools.py check                                     the files and the expected hashes
#   python3 -I ra1_tools.py s1 A <prefix>                             <prefix>-S1-prompt.txt; prints the input guide and hashes
#   python3 -I ra1_tools.py s2 A <step-1 picture.png> <prefix>        <prefix>-S2-input.png, -S2-mask.png, -S2-prompt.txt
#   python3 -I ra1_tools.py keep A <step-1 picture.png> <raw.png> <out.png>       step 2's edit kept inside the PLACE mask
#   python3 -I ra1_tools.py lift A <step-1 picture.png> <kept.png> <prefix>       one RGBA layer per piece, and <prefix>-lift.json
#   python3 -I ra1_tools.py s3 A <step-2 kept.png> <prefix>           <prefix>-S3-input.png, -S3-mask.png, -S3-prompt.txt
#   python3 -I ra1_tools.py keep3 A <step-2 kept.png> <raw.png> <out.png>         step 3's edit kept inside its mask
#   python3 -I ra1_tools.py lift3 A <step-2 kept.png> <step-3 kept.png> <prefix>  the capsule's own layer, and <prefix>-lift3.json
#   python3 -I ra1_tools.py colours A <step 1, 2 or 3> <picture.png> <prefix>    the colour check with the step's map: <prefix>-colours.json
import hashlib, importlib.util, json, os, sys, zlib
import numpy as np
from PIL import Image, ImageFilter, __version__ as PILLOW
D = os.path.dirname(os.path.abspath(__file__)); W, H = 1024, 1536; MANIFEST, STEP4 = 'room-a-ra-a.json', 'room-a-ra-a-s4.json'
sha = lambda b: hashlib.sha256(b).hexdigest()
fsha = lambda p: sha(open(p, 'rb').read())
def fail(msg): sys.exit('STOP: ' + msg)
def module(name, f):
    spec = importlib.util.spec_from_file_location(name, os.path.join(D, f)); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
def kit():
    m = json.load(open(os.path.join(D, MANIFEST)))
    if 'kit' not in m: fail(f'{MANIFEST} has no kit')
    for k, f in (('lift', 'lift5.py'), ('colourCheck', 'colour-check-ra1.py')):
        if fsha(os.path.join(D, f)) != m['kit'][k]['sha256']: fail(f"{f} is not the sheet's")
    return m['kit']
L = None
def lift5():
    global L
    if L is None: kit(); L = module('lift5', 'lift5.py')
    return L
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
def mask_of(V, key, step):
    a = np.array(Image.open(kitfile(V['files'][key])).convert('L')) > 127   # True = repaint
    al = np.where(a, 0, 255).astype(np.uint8); e = V['expected'][step]
    if sha(al.tobytes()) != e['rawMaskAlpha']: fail(f"{step}'s mask alpha {sha(al.tobytes())[:12]}, want {e['rawMaskAlpha'][:12]}")
    return a, al
def prompt_of(V, step):
    t = V['prompts'][step]['text']
    if sha(t.encode('utf-8')) != V['prompts'][step]['sha256']: fail(f'{step} prompt hash')
    return t
def save(arr, p, mode=None): Image.fromarray(arr, mode).save(p); return fsha(p)
def write_prompt(t, p): open(p, 'w', encoding='utf-8', newline='').write(t)
def s1(X, prefix):
    K = kit(); V = view(K, X); g = kitfile(V['files']['empty']); t = prompt_of(V, 's1'); write_prompt(t, f'{prefix}-S1-prompt.txt')
    print(json.dumps({'view': X, 'step': 'S1 (the empty room, a first pass)', 'input': {'file': V['files']['empty']['published'], 'sha256': fsha(g), 'rawRGB': sha(rgb_of(g).tobytes())}, 'mask': 'none', 'secondPicture': 'none',
                      'prompt': {'file': f'{os.path.basename(prefix)}-S1-prompt.txt', 'sha256': sha(t.encode('utf-8')), 'chars': len(t)}, 'settings': {'size': f'{W}x{H}', 'n': 1},
                      'check': {'colour': f"ra1_tools.py colours {X} 1 <picture> <prefix> (colour-check-ra1.py with {V['files']['emptyRegions']['published']})", 'lines': f"against {V['files']['emptyAnnotated']['published']}"}}, indent=1))
def masked_input(V, picture, mask_key, guide_key, step):
    pic = rgb_of(picture); a, al = mask_of(V, mask_key, step); guide = rgb_of(kitfile(V['files'][guide_key])); inp = pic.copy(); inp[a] = guide[a]
    return pic, a, al, inp
def s2(X, picture, prefix):
    K = kit(); V = view(K, X); pic, a, al, inp = masked_input(V, picture, 'place', 'guideS2', 's2')
    fi = save(inp, f'{prefix}-S2-input.png'); fm = save(np.dstack([inp, al]), f'{prefix}-S2-mask.png'); t = prompt_of(V, 's2'); write_prompt(t, f'{prefix}-S2-prompt.txt')
    print(json.dumps({'view': X, 'step': 'S2 (PLACE, one masked edit: the furniture, without the capsule)', 'picture': {'file': os.path.basename(picture), 'sha256': fsha(picture), 'rawRGB': sha(pic.tobytes())},
                      'maskedShare': round(float(a.mean()), 4), 'rawInputRGB': sha(inp.tobytes()), 'rawMaskAlpha': sha(al.tobytes()),
                      'input': {'file': f'{os.path.basename(prefix)}-S2-input.png', 'sha256': fi}, 'mask': {'file': f'{os.path.basename(prefix)}-S2-mask.png', 'sha256': fm, 'convention': 'alpha 0 = repaint'}, 'secondPicture': 'none',
                      'prompt': {'file': f'{os.path.basename(prefix)}-S2-prompt.txt', 'sha256': sha(t.encode('utf-8')), 'chars': len(t)}, 'settings': {'size': f'{W}x{H}', 'n': 1}}, indent=1))
def composite(start, raw, a):
    Lm = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
    return np.array(Image.composite(Image.fromarray(raw), Image.fromarray(start), Lm))
def keep_any(X, start, raw, outp, mask_key, step, label, how):
    K = kit(); V = view(K, X); a, _ = mask_of(V, mask_key, step); s = rgb_of(start); o = composite(s, rgb_of(raw), a); f = save(o, outp)
    d = np.abs(o.astype(int) - s).max(axis=2); far = ~lift5().grow(a, 4)
    print(json.dumps({'view': X, 'step': label, 'start': {'file': os.path.basename(start), 'sha256': fsha(start)}, 'raw': {'file': os.path.basename(raw), 'sha256': fsha(raw)},
                      'kept': {'file': os.path.basename(outp), 'sha256': f, 'rawRGBsha256': sha(o.tobytes())}, 'how': how,
                      'moreThan4pxOutsideMask': {'meanAbsDiff': round(float(d[far].mean()), 4), 'maxAbsDiff': int(d[far].max())}}, indent=1))
def keep(X, start, raw, outp): keep_any(X, start, raw, outp, 'place', 's2', 'S2 kept', 'the raw edit over the step-1 picture inside the PLACE mask, feathered by a 2 px Gaussian')
def keep3(X, start, raw, outp): keep_any(X, start, raw, outp, 'place3', 's3', 'S3 kept', "the raw edit over the kept step-2 picture inside step 3's mask, feathered by a 2 px Gaussian")
def lift_any(X, start, kept, prefix, mask_key, split_key, step, out_name):
    K = kit(); V = view(K, X); a, _ = mask_of(V, mask_key, step); s, k = rgb_of(start), rgb_of(kept)
    split = np.array(Image.open(kitfile(V['files'][split_key])).convert('L'))
    b, al = lift5().matte(s, k, a); out = {'view': X, 'step': 2 if step == 's2' else 3, 'recipe': K['lift']['recipe'], 'pieces': {}, 'missing': []}
    for st, grey in V[split_key].items():
        own = split == grey; m = b & own; alpha = al * own
        if not m.any(): out['missing'].append(st); continue
        ys, xs = np.where(m); a8 = np.rint(alpha * 255).astype(np.uint8); f = f"{prefix}-{st.replace(' ', '-')}.png"
        fh = save(np.dstack([k * (a8 > 0)[..., None], a8]), f, 'RGBA')
        out['pieces'][st] = {'file': os.path.basename(f), 'sha256': fh, 'px': int(m.sum()), 'x': [int(xs.min()), int(xs.max())], 'y': [int(ys.min()), int(ys.max())], 'shareOfItsOutline': round(float(m.sum() / own.sum()), 4)}
    out['rebuildMeanAbsDiff'] = round(float(np.abs(lift5().rebuild(s, k, al).astype(int) - k).mean()), 4)
    json.dump(out, open(f'{prefix}-{out_name}.json', 'w'), indent=1); print(json.dumps(out, indent=1))
    if out['missing']: sys.exit(1)
def lift(X, start, kept, prefix): lift_any(X, start, kept, prefix, 'place', 'split', 's2', 'lift')
def lift3(X, kept2, kept3, prefix): lift_any(X, kept2, kept3, prefix, 'place3', 'split3', 's3', 'lift3')
def s3(X, kept2, prefix):
    K = kit(); V = view(K, X); pic, a, al, inp = masked_input(V, kept2, 'place3', 'guide', 's3')
    fi = save(inp, f'{prefix}-S3-input.png'); fm = save(np.dstack([inp, al]), f'{prefix}-S3-mask.png'); t = prompt_of(V, 's3'); write_prompt(t, f'{prefix}-S3-prompt.txt')
    print(json.dumps({'view': X, 'step': 'S3 (the food capsule alone, one masked edit)', 'picture': {'file': os.path.basename(kept2), 'sha256': fsha(kept2), 'rawRGB': sha(pic.tobytes())},
                      'maskedShare': round(float(a.mean()), 4), 'rawInputRGB': sha(inp.tobytes()), 'rawMaskAlpha': sha(al.tobytes()),
                      'input': {'file': f'{os.path.basename(prefix)}-S3-input.png', 'sha256': fi}, 'mask': {'file': f'{os.path.basename(prefix)}-S3-mask.png', 'sha256': fm, 'convention': 'alpha 0 = repaint'}, 'secondPicture': 'none',
                      'prompt': {'file': f'{os.path.basename(prefix)}-S3-prompt.txt', 'sha256': sha(t.encode('utf-8')), 'chars': len(t)}, 'settings': {'size': f'{W}x{H}', 'n': 1}}, indent=1))
def colours(X, step, picture, prefix):
    K = kit(); V = view(K, X)
    if step not in ('1', '2', '3', '4'): fail('the step is 1, 2, 3 or 4')
    regions = kitfile(V['files']['emptyRegions' if step == '1' else 'regions'])
    rgb_of(picture); cc = module('ccra1', 'colour-check-ra1.py'); r = cc.check(picture, regions)
    json.dump(r, open(f'{prefix}-colours.json', 'w'), indent=1)
    print(json.dumps({'view': X, 'step': int(step), 'picture': {'file': os.path.basename(picture), 'sha256': fsha(picture)}, 'map': os.path.relpath(regions, D), 'pass': r['pass'], 'result': r['result'],
                      'wallsAndDeck': {k: r['areas']['walls and deck'].get(k) for k in ('inBase', 'grey', 'purple', 'tanOlive', 'medianL', 'medianHueOfReadable')}, 'warm': r['warm'], 'accents': r['accents'], 'absent': r.get('absent', [])}, indent=1))
    if not r['pass']: sys.exit(1)
# ---- version 2: step 4, a fix over the kept step-3 picture
def kit4():
    K = kit(); m = json.load(open(os.path.join(D, STEP4)))
    if m['manifest']['sha256'] != fsha(os.path.join(D, MANIFEST)): fail(f"{STEP4} is not for this {MANIFEST}")
    if m['tool']['file'] != os.path.basename(__file__) or fsha(os.path.abspath(__file__)) != m['tool']['sha256']: fail(f"this tool is not {STEP4}'s")
    return K, m
def mask4_of(S):
    a = np.array(Image.open(kitfile(S['files']['place4'])).convert('L')) > 127   # True = repaint
    al = np.where(a, 0, 255).astype(np.uint8)
    if sha(al.tobytes()) != S['expected']['s4']['rawMaskAlpha']: fail(f"step 4's mask alpha {sha(al.tobytes())[:12]}, want {S['expected']['s4']['rawMaskAlpha'][:12]}")
    return a, al
def prompt4_of(S):
    t = S['prompts']['s4']['text']
    if sha(t.encode('utf-8')) != S['prompts']['s4']['sha256']: fail('s4 prompt hash')
    return t
def s4(X, picture, prefix):
    K, S = kit4(); view(K, X); a, al = mask4_of(S); pic = rgb_of(picture); inp = pic.copy()
    fi = save(inp, f'{prefix}-S4-input.png'); fm = save(np.dstack([inp, al]), f'{prefix}-S4-mask.png'); t = prompt4_of(S); write_prompt(t, f'{prefix}-S4-prompt.txt')
    print(json.dumps({'view': X, 'step': "S4 (a fix: the cabinet's right side, one masked edit)", 'picture': {'file': os.path.basename(picture), 'sha256': fsha(picture), 'rawRGB': sha(pic.tobytes()),
                      'isTheStartPicture': fsha(picture) == S['startPicture']['sha256'], 'startPicture': f"{S['startPicture']['name']} ({S['startPicture']['sha256'][:12]})"},
                      'maskedShare': round(float(a.mean()), 4), 'rawInputRGB': sha(inp.tobytes()), 'rawMaskAlpha': sha(al.tobytes()),
                      'input': {'file': f'{os.path.basename(prefix)}-S4-input.png', 'sha256': fi, 'note': 'the picture itself: no guide'}, 'mask': {'file': f'{os.path.basename(prefix)}-S4-mask.png', 'sha256': fm, 'convention': 'alpha 0 = repaint'},
                      'secondPicture': 'none', 'prompt': {'file': f'{os.path.basename(prefix)}-S4-prompt.txt', 'sha256': sha(t.encode('utf-8')), 'chars': len(t)}, 'settings': {'size': f'{W}x{H}', 'n': 1}}, indent=1))
def keep4(X, start, raw, outp):
    K, S = kit4(); view(K, X); a, _ = mask4_of(S); s = rgb_of(start); o = composite(s, rgb_of(raw), a); f = save(o, outp)
    d = np.abs(o.astype(int) - s).max(axis=2); far = ~lift5().grow(a, 4)
    print(json.dumps({'view': X, 'step': 'S4 kept', 'start': {'file': os.path.basename(start), 'sha256': fsha(start)}, 'raw': {'file': os.path.basename(raw), 'sha256': fsha(raw)},
                      'kept': {'file': os.path.basename(outp), 'sha256': f, 'rawRGBsha256': sha(o.tobytes())}, 'how': "the raw edit over the kept step-3 picture inside step 4's mask, feathered by a 2 px Gaussian",
                      'moreThan4pxOutsideMask': {'meanAbsDiff': round(float(d[far].mean()), 4), 'maxAbsDiff': int(d[far].max())}}, indent=1))
def lift4(X, start1, kept4, prefix):
    K, S = kit4(); V = view(K, X); a4, _ = mask4_of(S); s, k = rgb_of(start1), rgb_of(kept4)
    split2 = np.array(Image.open(kitfile(V['files']['split'])).convert('L')); split4 = np.array(Image.open(kitfile(S['files']['split4'])).convert('L'))
    (st, grey), = S['split4'].items()
    if V['split'].get(st) != grey or not (split4[a4] == grey).all(): fail(f"step 4's split is not the {st}'s")
    area = (split2 == grey) | a4; b, al = lift5().matte(s, k, area); m = b & area
    out = {'view': X, 'step': 4, 'recipe': K['lift']['recipe'], 'area': f"the {st}'s step-2 split area with step 4's mask", 'pieces': {}, 'missing': []}
    if not m.any(): out['missing'].append(st)
    else:
        ys, xs = np.where(m); a8 = np.rint(al * area * 255).astype(np.uint8); f = f"{prefix}-{st.replace(' ', '-')}.png"
        fh = save(np.dstack([k * (a8 > 0)[..., None], a8]), f, 'RGBA')
        out['pieces'][st] = {'file': os.path.basename(f), 'sha256': fh, 'px': int(m.sum()), 'x': [int(xs.min()), int(xs.max())], 'y': [int(ys.min()), int(ys.max())], 'shareOfItsArea': round(float(m.sum() / area.sum()), 4),
                             'inStep4MaskPx': int((m & a4).sum()), 'shareOfStep4Mask': round(float((m & a4).sum() / a4.sum()), 4)}
    out['rebuildMeanAbsDiff'] = round(float(np.abs(lift5().rebuild(s, k, al * area).astype(int) - k)[area].mean()), 4)
    json.dump(out, open(f'{prefix}-lift4.json', 'w'), indent=1); print(json.dumps(out, indent=1))
    if out['missing']: sys.exit(1)
def frame4(X, kept4, prefix):
    K, S = kit4(); view(K, X); a4, _ = mask4_of(S); R = S['frameRule']; Lm = rgb_of(kept4).astype(float).mean(axis=2)
    ys, xs = np.where(a4); x0, x1 = int(xs.min()), int(xs.max()); rows = list(range(max(int(ys.min()), R['rows'][0]), min(int(ys.max()), R['rows'][1]) + 1))
    wall = np.array([np.median(Lm[max(0, y - 2):y + 3, x1 + 1:R['grilleEdgeX']]) for y in rows])
    dep = np.abs(Lm[rows][:, x0:x1 + 1] - wall[:, None]) > R['departs']; share = dep.mean(axis=0)   # per column: the share of rows that depart
    cols = [x0 + i for i in range(x1 - x0 + 1) if share[i] >= R['rowsShare']]; edge = max(cols) if cols else None
    out = {'view': X, 'step': 4, 'picture': {'file': os.path.basename(kept4), 'sha256': fsha(kept4)}, 'how': R['how'], 'rows': [rows[0], rows[-1]],
           'frameOuterEdgeX': edge, 'clearPxToTheGrille': (R['grilleEdgeX'] - edge - 1) if edge is not None else None, 'want': f"x {R['frameOuterEdgeAtMostX']} or less ({R['minClearPx']} px)",
           'pass': edge is not None and edge <= R['frameOuterEdgeAtMostX'], 'departingShareByColumn': {str(x0 + i): round(float(v), 2) for i, v in enumerate(share)}}
    json.dump(out, open(f'{prefix}-frame4.json', 'w'), indent=1); print(json.dumps({k: v for k, v in out.items() if k != 'departingShareByColumn'}, indent=1))
def check():
    K = kit(); ok = True
    print(f'RA-A kit for {", ".join(K["views"])}; Pillow {PILLOW}, zlib {zlib.ZLIB_RUNTIME_VERSION}; lift5.py {K["lift"]["sha256"][:12]}; colour-check-ra1.py {K["colourCheck"]["sha256"][:12]}')
    for X, V in K['views'].items():
        for e in V['files'].values(): kitfile(e)
        for step, key in (('s2', 'place'), ('s3', 'place3')):
            a, _ = mask_of(V, key, step)
            if round(float(a.mean()), 4) != V['expected'][step]['maskedShare']: ok = False; print(f'  {X}: {step} masked share {a.mean():.4f}')
        for step in ('s1', 's2', 's3'): prompt_of(V, step)
        print(f"{X}: S1 input {V['files']['empty']['published']} {V['files']['empty']['sha256']}, prompt {V['prompts']['s1']['sha256']}")
        print(f"   S2 mask {V['files']['place']['published']}: share {V['expected']['s2']['maskedShare']}, rawMaskAlpha {V['expected']['s2']['rawMaskAlpha']}, prompt {V['prompts']['s2']['sha256']}")
        print(f"   S3 mask {V['files']['place3']['published']}: share {V['expected']['s3']['maskedShare']}, rawMaskAlpha {V['expected']['s3']['rawMaskAlpha']}, prompt {V['prompts']['s3']['sha256']}")
    if os.path.exists(os.path.join(D, STEP4)):
        _, S = kit4(); a4, _ = mask4_of(S); kitfile(S['files']['split4']); prompt4_of(S)
        if round(float(a4.mean()), 4) != S['expected']['s4']['maskedShare']: ok = False; print(f'  step 4 masked share {a4.mean():.4f}')
        print(f"   S4 mask {S['files']['place4']['published']}: share {S['expected']['s4']['maskedShare']}, rawMaskAlpha {S['expected']['s4']['rawMaskAlpha']}, prompt {S['prompts']['s4']['sha256']}; start {S['startPicture']['name']} {S['startPicture']['sha256']}")
    print('all files and expected hashes match' if ok else 'MISMATCH'); sys.exit(0 if ok else 1)
if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['check'] and len(a) == 1: check()
    elif a[:1] == ['s1'] and len(a) == 3: s1(a[1], a[2])
    elif a[:1] == ['s2'] and len(a) == 4: s2(a[1], a[2], a[3])
    elif a[:1] == ['keep'] and len(a) == 5: keep(a[1], a[2], a[3], a[4])
    elif a[:1] == ['lift'] and len(a) == 5: lift(a[1], a[2], a[3], a[4])
    elif a[:1] == ['s3'] and len(a) == 4: s3(a[1], a[2], a[3])
    elif a[:1] == ['keep3'] and len(a) == 5: keep3(a[1], a[2], a[3], a[4])
    elif a[:1] == ['lift3'] and len(a) == 5: lift3(a[1], a[2], a[3], a[4])
    elif a[:1] == ['colours'] and len(a) == 5: colours(a[1], a[2], a[3], a[4])
    elif a[:1] == ['s4'] and len(a) == 4: s4(a[1], a[2], a[3])
    elif a[:1] == ['keep4'] and len(a) == 5: keep4(a[1], a[2], a[3], a[4])
    elif a[:1] == ['lift4'] and len(a) == 5: lift4(a[1], a[2], a[3], a[4])
    elif a[:1] == ['frame4'] and len(a) == 4: frame4(a[1], a[2], a[3])
    else: sys.exit(open(__file__).read().split('import hashlib')[0])
