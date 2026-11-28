# View B's lift for the people layers (the Lead, 27 November, 18:56: "the lift for the people layers, from RA-B-3c"): the pieces of
# RA-B-3c (view B's accepted step 2: RA-B-3 with five cut pieces completed in code from its raw, compositeB3.py) lifted off RA-B-2
# (view B's accepted step 1) as one RGBA layer a piece, by the Lead's recipe (lift5.py, the same bytes as the sheet's), as the sheet's
# tool lifts a kept step 2 (rb1_tools.py lift), with one change: the lift's area is step 2's PLACE mask together with each completion's
# traced outline grown 2 px, which covers its 1 px feather (composite-B3.json), each completion taking its piece's grey in the split map, so the parts
# the code completed past the mask are in their piece's layer too. Writes _lift/B-<piece>.png (RGBA: RA-B-3c's colour where the
# layer is, alpha the lift's matte) and lift-B3c.json (each layer's pixels, box, share of its area, the completions' pixels in it, and
# the rebuild: the layers over RA-B-2 against RA-B-3c). Reads RA-B-2 from the records (by its sha256) and ra-B-3c.png (by its pixels'
# sha256, composite-B3.json). Calls no service; generates nothing. Usage: python3 -I liftB3c.py <records folder>
import hashlib, importlib.util, json, os, sys
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); REC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, '_rec3')
mod = lambda n, f: (lambda s: (lambda m: (s.loader.exec_module(m), m)[1])(importlib.util.module_from_spec(s)))(importlib.util.spec_from_file_location(n, f))
L5, F15 = mod('lift5', os.path.join(D, 'lift5.py')), mod('feat15', os.path.join(D, '..', 'sheetV', 'feat15.py'))
fsha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest(); psha = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()
J = lambda f: json.load(open(os.path.join(D, f)))
C, KIT, MAN = J('composite-B3.json'), J('kit-B.json'), J('room-a-ra-b.json')
if fsha(os.path.join(D, 'lift5.py')) != MAN['kit']['lift']['sha256']: sys.exit("STOP: lift5.py is not the sheet's")
B2 = 'aefddadcb3ce554c215d121dd7a49b8e4197a1dcce77325e54982252c8038605'
if fsha(os.path.join(REC, 'img', 'RA-B-2.png')) != B2: sys.exit('STOP: img/RA-B-2.png is not RA-B-2')
rgb = lambda f: np.array(Image.open(f).convert('RGB'))
start, kept = rgb(os.path.join(REC, 'img', 'RA-B-2.png')), rgb(os.path.join(D, 'ra-B-3c.png'))
if psha(kept) != C['outputs']['ra-B-3c.png']['pixelsSha256']: sys.exit('STOP: ra-B-3c.png is not the plate composite-B3.json records')
V = MAN['kit']['views']['B']
if fsha(os.path.join(D, 'ra-B-place.png')) != V['files']['place']['sha256'] or fsha(os.path.join(D, 'ra-B-split.png')) != V['files']['split']['sha256'] or C['mask']['sha256'] != V['files']['place']['sha256']:
    sys.exit("STOP: the mask or the split map is not the one RA-B-3 was kept in")
place = np.array(Image.open(os.path.join(D, 'ra-B-place.png')).convert('L')) > 127
split = np.array(Image.open(os.path.join(D, 'ra-B-split.png')).convert('L'))
H, W = place.shape
# each completion's piece, and its area: the traced outline (pixel centres inside) grown 2 px, covering the 1 px feather
OF = {'desk-left': 'A PC workstation', 'monitor-left': 'A PC workstation', 'monitor-right': 'A PC workstation', 'foot-right': 'A PC workstation', 'toolbox': 'E toolbox'}
if sorted(OF) != sorted(p['key'] for p in C['pieces']): sys.exit("STOP: the completions are not composite-B3.json's five")
GREY = V['split']; comp = {}
split_x = split.copy(); lift_mask = place.copy()
for p in C['pieces']:
    a = L5.grow(F15.raster([p['outline']]), 2); comp[p['key']] = a   # 2 px: the feather, 1 px by distance from the outline, reaches past 1 px at its corners
    out = a & ~place
    if (split_x[out] != 0).any() and (split_x[out] != GREY[OF[p['key']]]).any(): sys.exit(f"STOP: {p['key']}'s completion runs into another piece's area")
    split_x[out] = GREY[OF[p['key']]]; lift_mask |= a
# what differs from RA-B-2 outside the lift's area must be the keep's own blend: its 2 px Gaussian reaches a few px past the mask, and
# those pixels stay in the plate, as the sheet's tool leaves them (its lift is clipped to the mask)
changed = np.abs(kept.astype(int) - start.astype(int)).max(axis=2) > 0
blend = changed & ~lift_mask; band = L5.grow(place, 6) & ~place
if (blend & ~band).any(): sys.exit(f"STOP: {int((blend & ~band).sum())} px of RA-B-3c differ from RA-B-2 outside the lift's area and the keep's blend")
blend_max = int(np.abs(kept.astype(int) - start.astype(int)).max(axis=2)[blend].max()) if blend.any() else 0
b, al = L5.matte(start, kept, lift_mask)
os.makedirs(os.path.join(D, '_lift'), exist_ok=True)
out = {'view': 'B', 'what': "view B's people layers: RA-B-3c's pieces lifted off RA-B-2, one RGBA layer a piece", 'recipe': MAN['kit']['lift']['recipe'],
       'area': "step 2's PLACE mask (ra-B-place.png) and each code completion's traced outline grown 2 px, covering its 1 px feather (composite-B3.json), each completion in its piece's grey",
       'start': {'name': 'RA-B-2', 'sha256': B2, 'aiGenerated': True}, 'kept': {'name': 'RA-B-3c', 'file': 'ra-B-3c.png', 'pixelsSha256': psha(kept), 'aiGenerated': True, 'codeComposite': True},
       'changedOutsideTheArea': {'px': int(blend.sum()), 'maxLevels': blend_max, 'what': "the keep's blend, its 2 px Gaussian reaching up to 6 px past the mask: left in the plate, as the sheet's tool leaves it"}, 'liftAreaPx': int(lift_mask.sum()), 'completionPxOutsideTheMask': int((lift_mask & ~place).sum()), 'pieces': {}, 'missing': []}
for name, grey in GREY.items():
    own = split_x == grey; m = b & own; a = al * own
    if not m.any(): out['missing'].append(name); continue
    a8 = np.rint(a * 255).astype(np.uint8); f = f"_lift/B-{name.split(' ', 1)[1].replace(' ', '-')}.png"
    Image.fromarray(np.dstack([kept * (a8 > 0)[..., None], a8]), 'RGBA').save(os.path.join(D, f), optimize=True)
    ys, xs = np.where(m); cin = {k: int((m & comp[k] & ~place).sum()) for k, v in OF.items() if v == name}
    out['pieces'][name] = {'file': f, 'sha256': fsha(os.path.join(D, f)), 'grey': grey, 'px': int(m.sum()), 'box': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1],
                           'areaPx': int(own.sum()), 'shareOfItsArea': round(float(m.sum() / own.sum()), 4), 'completionPxPastTheMask': cin,
                           'alphaFull': int((a8 == 255).sum()), 'alphaPartial': int(((a8 > 0) & (a8 < 255)).sum())}
rb = L5.rebuild(start, kept, al)
d = np.abs(rb.astype(int) - kept.astype(int)).max(axis=2)
out['rebuild'] = {'how': "RA-B-2 with every layer over it, against RA-B-3c", 'meanAbsDiff': round(float(np.abs(rb.astype(int) - kept.astype(int)).mean()), 4), 'pxOver16': int((d > 16).sum()), 'maxDiff': int(d.max())}
json.dump(out, open(os.path.join(D, 'lift-B3c.json'), 'w'), indent=1)
print('lift area', out['liftAreaPx'], 'px, of which past the mask', out['completionPxOutsideTheMask'], '| missing', out['missing'])
for k, v in out['pieces'].items(): print(f"  {k}: {v['px']} px, box {v['box']}, {v['shareOfItsArea']} of its area, completions past the mask {v['completionPxPastTheMask']}")
print('rebuild', out['rebuild'])
