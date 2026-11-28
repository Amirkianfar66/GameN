# The tool for sheet RA-D (Room A, view D: Atlas's place), version 3: sheet RA-A's tool (ra1_tools.py, version 1), its three
# steps unchanged, with view D's manifest; version 3 (sheet RA-D version 2.3, the Lead, 27 November, 22:54) pins step 3's start: its
# commands check that the kept step-2 picture they start from is RA-D-3hc (RA-D-3h with the hatch, its lid and the toolbox completed
# in code; compositeD3hc.py rebuilds it from the image session's records), pixel for pixel, except with --stand-in, which the dry run
# uses; and step 3's colour check uses step 2b's map (step 2's with the screens where RA-D-3x paints them, as RA-D-3hc has them).
# Version 2 (sheet RA-D version 2.1, the Lead, 27 November, 21:03) adds step 2b, a hatch-only
# masked edit of RA-D-3x (RA-D-1 with RA-D-3's desk and cabinet, completed in code; compositeD3x.py rebuilds it from the image
# session's records), its input showing the step-2 guide inside step 2b's mask: the hatch and its lid as one area, the toolbox as
# its own. Its commands check that their start picture is RA-D-3x, pixel for pixel (its raw RGB's sha256), except with --stand-in,
# which the sheet's dry run uses to stand a code-drawn guide in for it and which the output then reports. Step 1 is a first pass over the empty-room guide, with no mask and no second picture.
# Step 2 is one masked PLACE edit of that picture inside the furniture's outlines grown 6 px, its input showing the step-2 guide (the
# furniture without the capsule) there. Step 3 is one masked edit of the kept step-2 picture inside the capsule's outline grown 2 px,
# its input showing the guide there. A mask is RGBA: the input's RGB, alpha 0 = repaint, 255 = keep. To keep an edit, it is
# composited over its start picture inside its mask, the mask blurred by a 2 px Gaussian (Pillow's GaussianBlur(2)), as Room B's
# keeps are. The lift (lift5.py, the Lead's recipe) takes the pieces off a kept picture as layers, split by the split map: each piece's
# outline grown, the nearer piece owning an overlap. The colours command runs the Room A colour check (colour-check-ra1.py) with the
# step's region map. PNGs are written with Pillow's defaults; raw hashes (sha256 of the RGB or alpha bytes) do not depend on the PNG
# encoder. Driven by the sheet's files: room-a-ra-d.json (its kit: files, prompts, expected hashes), the img/ files, lift5.py and
# colour-check-ra1.py, each checked against its sha256 before use. Calls no service; generates nothing.
# Usage, from the sheet's folder (NumPy and Pillow):
#   python3 -I rd1_tools.py check                                     the files and the expected hashes
#   python3 -I rd1_tools.py s1 D <prefix>                             <prefix>-S1-prompt.txt; prints the input guide and hashes
#   python3 -I rd1_tools.py s2 D <step-1 picture.png> <prefix>        <prefix>-S2-input.png, -S2-mask.png, -S2-prompt.txt
#   python3 -I rd1_tools.py keep D <step-1 picture.png> <raw.png> <out.png>       step 2's edit kept inside the PLACE mask
#   python3 -I rd1_tools.py lift D <step-1 picture.png> <kept.png> <prefix>       one RGBA layer per piece, and <prefix>-lift.json
#   python3 -I rd1_tools.py s3 D <RA-D-3hc.png> <prefix>              <prefix>-S3-input.png, -S3-mask.png, -S3-prompt.txt
#   python3 -I rd1_tools.py keep3 D <RA-D-3hc.png> <raw.png> <out.png>            step 3's edit kept inside its mask
#   python3 -I rd1_tools.py lift3 D <RA-D-3hc.png> <step-3 kept.png> <prefix>     the capsule's own layer, and <prefix>-lift3.json
#   python3 -I rd1_tools.py colours D <step 1, 2, 2b or 3> <picture.png> <prefix>    the colour check with the step's map: <prefix>-colours.json
#   python3 -I rd1_tools.py s2b D <RA-D-3x.png> <prefix>              <prefix>-S2b-input.png, -S2b-mask.png, -S2b-prompt.txt
#   python3 -I rd1_tools.py keep2b D <RA-D-3x.png> <raw.png> <out.png>            step 2b's edit kept inside its mask
#   python3 -I rd1_tools.py lift2b D <RA-D-3x.png> <kept.png> <prefix>            the hatch's, the lid's and the toolbox's layers, <prefix>-lift2b.json
import hashlib, importlib.util, json, os, sys, zlib
import numpy as np
from PIL import Image, ImageFilter, __version__ as PILLOW
D = os.path.dirname(os.path.abspath(__file__)); W, H = 1024, 1536; MANIFEST = 'room-a-ra-d.json'
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
                      'check': {'colour': f"rd1_tools.py colours {X} 1 <picture> <prefix> (colour-check-ra1.py with {V['files']['emptyRegions']['published']})", 'lines': f"against {V['files']['emptyAnnotated']['published']}"}}, indent=1))
def masked_input(V, picture, mask_key, guide_key, step):
    pic = rgb_of(picture); a, al = mask_of(V, mask_key, step); guide = rgb_of(kitfile(V['files'][guide_key])); inp = pic.copy(); inp[a] = guide[a]
    return pic, a, al, inp
def base2b(V, picture, stand_in):   # step 2b starts from RA-D-3x, pixel for pixel, unless a stand-in is declared
    px = sha(rgb_of(picture).tobytes()); want = V['expected']['s2b']['basePixels']
    if px != want and not stand_in: fail(f"{os.path.basename(picture)} is not RA-D-3x (pixels {px[:12]}, want {want[:12]}): rebuild it with compositeD3x.py")
    return {'isRA-D-3x': px == want, **({'standIn': True} if stand_in else {})}
def base3(V, picture, stand_in):   # step 3 starts from RA-D-3hc, pixel for pixel, unless a stand-in is declared
    want = V['expected']['s3'].get('startPixels')
    if not want: return {}
    px = sha(rgb_of(picture).tobytes())
    if px != want and not stand_in: fail(f"{os.path.basename(picture)} is not RA-D-3hc (pixels {px[:12]}, want {want[:12]}): rebuild it with compositeD3hc.py")
    return {'isRA-D-3hc': px == want, **({'standIn': True} if stand_in else {})}
def s2(X, picture, prefix):
    K = kit(); V = view(K, X); pic, a, al, inp = masked_input(V, picture, 'place', 'guideS2', 's2')
    fi = save(inp, f'{prefix}-S2-input.png'); fm = save(np.dstack([inp, al]), f'{prefix}-S2-mask.png'); t = prompt_of(V, 's2'); write_prompt(t, f'{prefix}-S2-prompt.txt')
    print(json.dumps({'view': X, 'step': 'S2 (PLACE, one masked edit: the furniture, without the capsule)', 'picture': {'file': os.path.basename(picture), 'sha256': fsha(picture), 'rawRGB': sha(pic.tobytes())},
                      'maskedShare': round(float(a.mean()), 4), 'rawInputRGB': sha(inp.tobytes()), 'rawMaskAlpha': sha(al.tobytes()),
                      'input': {'file': f'{os.path.basename(prefix)}-S2-input.png', 'sha256': fi}, 'mask': {'file': f'{os.path.basename(prefix)}-S2-mask.png', 'sha256': fm, 'convention': 'alpha 0 = repaint'}, 'secondPicture': 'none',
                      'prompt': {'file': f'{os.path.basename(prefix)}-S2-prompt.txt', 'sha256': sha(t.encode('utf-8')), 'chars': len(t)}, 'settings': {'size': f'{W}x{H}', 'n': 1}}, indent=1))
def s2b(X, picture, prefix, stand_in=False):
    K = kit(); V = view(K, X); b = base2b(V, picture, stand_in); pic, a, al, inp = masked_input(V, picture, 'place2b', 'guideS2', 's2b')
    fi = save(inp, f'{prefix}-S2b-input.png'); fm = save(np.dstack([inp, al]), f'{prefix}-S2b-mask.png'); t = prompt_of(V, 's2b'); write_prompt(t, f'{prefix}-S2b-prompt.txt')
    print(json.dumps({'view': X, 'step': 'S2b (the hatch, its lid and the toolbox, one masked edit on RA-D-3x)', 'picture': {'file': os.path.basename(picture), 'sha256': fsha(picture), 'rawRGB': sha(pic.tobytes()), **b},
                      'maskedShare': round(float(a.mean()), 4), 'rawInputRGB': sha(inp.tobytes()), 'rawMaskAlpha': sha(al.tobytes()),
                      'input': {'file': f'{os.path.basename(prefix)}-S2b-input.png', 'sha256': fi}, 'mask': {'file': f'{os.path.basename(prefix)}-S2b-mask.png', 'sha256': fm, 'convention': 'alpha 0 = repaint'}, 'secondPicture': 'none',
                      'prompt': {'file': f'{os.path.basename(prefix)}-S2b-prompt.txt', 'sha256': sha(t.encode('utf-8')), 'chars': len(t)}, 'settings': {'size': f'{W}x{H}', 'n': 1}}, indent=1))
def composite(start, raw, a):
    Lm = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
    return np.array(Image.composite(Image.fromarray(raw), Image.fromarray(start), Lm))
def keep_any(X, start, raw, outp, mask_key, step, label, how, extra=None):
    K = kit(); V = view(K, X); a, _ = mask_of(V, mask_key, step); s = rgb_of(start); o = composite(s, rgb_of(raw), a); f = save(o, outp)
    d = np.abs(o.astype(int) - s).max(axis=2); far = ~lift5().grow(a, 4)
    print(json.dumps({'view': X, 'step': label, 'start': {'file': os.path.basename(start), 'sha256': fsha(start), **(extra or {})}, 'raw': {'file': os.path.basename(raw), 'sha256': fsha(raw)},
                      'kept': {'file': os.path.basename(outp), 'sha256': f, 'rawRGBsha256': sha(o.tobytes())}, 'how': how,
                      'moreThan4pxOutsideMask': {'meanAbsDiff': round(float(d[far].mean()), 4), 'maxAbsDiff': int(d[far].max())}}, indent=1))
def keep(X, start, raw, outp): keep_any(X, start, raw, outp, 'place', 's2', 'S2 kept', 'the raw edit over the step-1 picture inside the PLACE mask, feathered by a 2 px Gaussian')
def keep2b(X, start, raw, outp, stand_in=False):
    K = kit(); V = view(K, X); b = base2b(V, start, stand_in)
    keep_any(X, start, raw, outp, 'place2b', 's2b', 'S2b kept', "the raw edit over RA-D-3x inside step 2b's mask, feathered by a 2 px Gaussian", b)
def keep3(X, start, raw, outp, stand_in=False):
    K = kit(); V = view(K, X); b = base3(V, start, stand_in)
    keep_any(X, start, raw, outp, 'place3', 's3', 'S3 kept', "the raw edit over the kept step-2 picture (RA-D-3hc) inside step 3's mask, feathered by a 2 px Gaussian", b)
def lift_any(X, start, kept, prefix, mask_key, split_key, step, out_name, extra=None):
    K = kit(); V = view(K, X); a, _ = mask_of(V, mask_key, step); s, k = rgb_of(start), rgb_of(kept)
    split = np.array(Image.open(kitfile(V['files'][split_key])).convert('L'))
    b, al = lift5().matte(s, k, a); out = {'view': X, 'step': {'s2': 2, 's2b': '2b', 's3': 3}[step], 'recipe': K['lift']['recipe'], **({'start': extra} if extra else {}), 'pieces': {}, 'missing': []}
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
def lift2b(X, start, kept, prefix, stand_in=False):
    K = kit(); V = view(K, X); b = base2b(V, start, stand_in); lift_any(X, start, kept, prefix, 'place2b', 'split2b', 's2b', 'lift2b', b)
def lift3(X, kept2, kept3, prefix, stand_in=False):
    K = kit(); V = view(K, X); b = base3(V, kept2, stand_in); lift_any(X, kept2, kept3, prefix, 'place3', 'split3', 's3', 'lift3', b or None)
def s3(X, kept2, prefix, stand_in=False):
    K = kit(); V = view(K, X); b = base3(V, kept2, stand_in); pic, a, al, inp = masked_input(V, kept2, 'place3', 'guide', 's3')
    fi = save(inp, f'{prefix}-S3-input.png'); fm = save(np.dstack([inp, al]), f'{prefix}-S3-mask.png'); t = prompt_of(V, 's3'); write_prompt(t, f'{prefix}-S3-prompt.txt')
    print(json.dumps({'view': X, 'step': 'S3 (the food capsule alone, one masked edit)', 'picture': {'file': os.path.basename(kept2), 'sha256': fsha(kept2), 'rawRGB': sha(pic.tobytes()), **b},
                      'maskedShare': round(float(a.mean()), 4), 'rawInputRGB': sha(inp.tobytes()), 'rawMaskAlpha': sha(al.tobytes()),
                      'input': {'file': f'{os.path.basename(prefix)}-S3-input.png', 'sha256': fi}, 'mask': {'file': f'{os.path.basename(prefix)}-S3-mask.png', 'sha256': fm, 'convention': 'alpha 0 = repaint'}, 'secondPicture': 'none',
                      'prompt': {'file': f'{os.path.basename(prefix)}-S3-prompt.txt', 'sha256': sha(t.encode('utf-8')), 'chars': len(t)}, 'settings': {'size': f'{W}x{H}', 'n': 1}}, indent=1))
def colours(X, step, picture, prefix):
    K = kit(); V = view(K, X)
    if step not in ('1', '2', '2b', '3'): fail('the step is 1, 2, 2b or 3')
    regions = kitfile(V['files']['emptyRegions' if step == '1' else 'regions2b' if step == '2b' or (step == '3' and 'regions2b' in V['files'] and V['expected']['s3'].get('startPixels')) else 'regions'])
    rgb_of(picture); cc = module('ccra1', 'colour-check-ra1.py'); r = cc.check(picture, regions)
    json.dump(r, open(f'{prefix}-colours.json', 'w'), indent=1)
    print(json.dumps({'view': X, 'step': step if step == '2b' else int(step), 'picture': {'file': os.path.basename(picture), 'sha256': fsha(picture)}, 'map': os.path.relpath(regions, D), 'pass': r['pass'], 'result': r['result'],
                      'wallsAndDeck': {k: r['areas']['walls and deck'].get(k) for k in ('inBase', 'grey', 'purple', 'tanOlive', 'medianL', 'medianHueOfReadable')}, 'warm': r['warm'], 'accents': r['accents'], 'absent': r.get('absent', [])}, indent=1))
    if not r['pass']: sys.exit(1)
def check():
    K = kit(); ok = True
    print(f'RA-D kit for {", ".join(K["views"])}; Pillow {PILLOW}, zlib {zlib.ZLIB_RUNTIME_VERSION}; lift5.py {K["lift"]["sha256"][:12]}; colour-check-ra1.py {K["colourCheck"]["sha256"][:12]}')
    for X, V in K['views'].items():
        for e in V['files'].values(): kitfile(e)
        for step, key in (('s2', 'place'), ('s2b', 'place2b'), ('s3', 'place3')):
            a, _ = mask_of(V, key, step)
            if round(float(a.mean()), 4) != V['expected'][step]['maskedShare']: ok = False; print(f'  {X}: {step} masked share {a.mean():.4f}')
        for step in ('s1', 's2', 's2b', 's3'): prompt_of(V, step)
        print(f"{X}: S1 input {V['files']['empty']['published']} {V['files']['empty']['sha256']}, prompt {V['prompts']['s1']['sha256']}")
        print(f"   S2 mask {V['files']['place']['published']}: share {V['expected']['s2']['maskedShare']}, rawMaskAlpha {V['expected']['s2']['rawMaskAlpha']}, prompt {V['prompts']['s2']['sha256']}")
        print(f"   S2b mask {V['files']['place2b']['published']}: share {V['expected']['s2b']['maskedShare']}, rawMaskAlpha {V['expected']['s2b']['rawMaskAlpha']}, on RA-D-3x (pixels {V['expected']['s2b']['basePixels']}), prompt {V['prompts']['s2b']['sha256']}")
        print(f"   S3 mask {V['files']['place3']['published']}: share {V['expected']['s3']['maskedShare']}, rawMaskAlpha {V['expected']['s3']['rawMaskAlpha']}" + (f", on RA-D-3hc (pixels {V['expected']['s3']['startPixels']})" if V['expected']['s3'].get('startPixels') else '') + f", prompt {V['prompts']['s3']['sha256']}")
    print('all files and expected hashes match' if ok else 'MISMATCH'); sys.exit(0 if ok else 1)
if __name__ == '__main__':
    a = sys.argv[1:]; SI = '--stand-in' in a; a = [x for x in a if x != '--stand-in']
    if a[:1] == ['check'] and len(a) == 1: check()
    elif a[:1] == ['s1'] and len(a) == 3: s1(a[1], a[2])
    elif a[:1] == ['s2'] and len(a) == 4: s2(a[1], a[2], a[3])
    elif a[:1] == ['keep'] and len(a) == 5: keep(a[1], a[2], a[3], a[4])
    elif a[:1] == ['lift'] and len(a) == 5: lift(a[1], a[2], a[3], a[4])
    elif a[:1] == ['s3'] and len(a) == 4: s3(a[1], a[2], a[3], SI)
    elif a[:1] == ['keep3'] and len(a) == 5: keep3(a[1], a[2], a[3], a[4], SI)
    elif a[:1] == ['lift3'] and len(a) == 5: lift3(a[1], a[2], a[3], a[4], SI)
    elif a[:1] == ['colours'] and len(a) == 5: colours(a[1], a[2], a[3], a[4])
    elif a[:1] == ['s2b'] and len(a) == 4: s2b(a[1], a[2], a[3], SI)
    elif a[:1] == ['keep2b'] and len(a) == 5: keep2b(a[1], a[2], a[3], a[4], SI)
    elif a[:1] == ['lift2b'] and len(a) == 5: lift2b(a[1], a[2], a[3], a[4], SI)
    else: sys.exit(open(__file__).read().split('import hashlib')[0])
