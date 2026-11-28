# Sheet RA-D version 2: view D's review zooms (zooms-D.json, drawn by sheetV/overlayV2.py on RA-D-1, view D's AI-generated step-1
# picture, labelled as one), for the Lead's "zooms of the window edge and the capsule spot". Every zoom draws version 1.1's step-2
# mask gold, version 2's red, the furniture's outline in version 2's guide cyan and step 3's mask orange, where they reach it; the key
# names only the lines the crop holds. Reads window-D.json (the painted opening), lines-D.json (the guide's window), measure-D2.json
# (the painted feet and corner, the visitors' spot) and the masks. Generates nothing. Writes zooms-D.json. Usage: python3 -I zoomsD2.py
import importlib.util, json, os
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('lift5', os.path.join(D, '..', 'sheet', 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
J = lambda f: json.load(open(os.path.join(D, f)))
W, G, M = J('window-D.json'), J('lines-D.json'), J('measure-D2.json')
binary = lambda f: np.array(Image.open(os.path.join(D, f)).convert('L')) > 127
edge = lambda m: L.grow(m, 1) & ~m   # as overlayV2.py draws them
EDGES = {'v11': edge(binary(os.path.join('_readback-11', 'img', 'ra-D-place.png'))), 'v2': edge(binary('ra-D-place.png')),
         'furniture': edge(binary('ra-D-furniture.png')), 's3': edge(binary('ra-D-place3.png'))}
def held(box): x0, y0, x1, y1 = box; return {k: bool(e[y0:y1, x0:x1].any()) for k, e in EDGES.items()}
def maskKey(h, s3first=False):
    two = ', '.join(t for k, t in (('v2', "step 2's mask red"), ('v11', "version 1.1's gold"), ('furniture', "the furniture's outline cyan")) if h[k])
    lines = ([("the capsule's mask (step 3) orange")] if h['s3'] else []) + ([two] if two else [])
    return lines or ['no mask reaches it']
WB = [176, 512, 404, 768]; hw = held(WB)
CB = [500, 690, 780, 1050]; hc = held(CB)
cap = next(f for f in M['feet'] if f['name'] == 'capsule visitors'); ax, ay = cap['anchor']; my = (cap.get('movedTo') or cap['anchor'])[1]; cx = M['corner']['painted'][0]
dia = lambda x, y, r=5: [[x, y - r], [x + r, y], [x, y + r], [x - r, y]]
Z = [{'name': 'window-edge', 'what': 'the round window', 'box': WB, 'scale': 2, 'section': 'window', 'lines': [],
      'polygons': [{'points': W['opening']['outline'], 'colour': [0, 255, 0]}, {'points': G['window'], 'colour': [255, 0, 255]}],
      'key': ' | '.join(["the painted opening green (the sky's outline)", "the guide's window magenta", *maskKey(hw)])},
     {'name': 'capsule-spot', 'what': "the capsule and its visitors' spot", 'box': CB, 'scale': 2, 'section': 'capsule', 'lines': ['eastFoot', 'eastSeam1'],
      'polygons': [{'points': [[cx - 0.5, CB[1]], [cx + 0.5, CB[1]], [cx + 0.5, CB[3]], [cx - 0.5, CB[3]]], 'colour': [255, 255, 0]}, {'points': dia(ax, ay), 'colour': [255, 0, 255]}, {'points': dia(ax, my), 'colour': [0, 255, 0]}],
      'key': ' | '.join([*maskKey(hc), "the painted east foot magenta, its seam 1 m out green", f"the painted corner yellow, x {cx:.1f} at the deck", f"visitors' spot: guide magenta, painted deck green ({cap['offsetPx']:+.1f} px)"])}]
json.dump(Z, open(os.path.join(D, 'zooms-D.json'), 'w'), indent=1)
print({z['name']: z['key'] for z in Z})
