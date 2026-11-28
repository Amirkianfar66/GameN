# The dispenser's left edge in view C, drawn by code (the Lead, 18 November). PV6-C-5's edit did not take there: it changed 341 px
# in the edge's shape, all in parts under the lift's 400 px, and the soft streaks into the books remain. So no further picture is
# made: the guide's own drawing goes, opaque, into its own band file just after the capsule's, fix-2.png (the Lead, 19:01), so
# capsule-2.png stays as it was. A 2 px line of #340B2B (rgb 52, 11, 43) at
# columns 609-610, rows 793-865, from under the rounded top's corner down to the bench; above the hatch (rows 795-816), the housing's
# colour, rgb 149, 61, 102, at columns 611-616. The hatch's face (from column 611, rows 819-862) and the rim's corner (rows 785-792)
# stay as painted. Every number is checked against the guide's record, fix4-C.json. Writes edge4-C.json: the rows, columns and
# colours; occlude8c.py draws them and adds the layer's hash before and after. Generates nothing. Usage: python3 -I edge4c.py
import hashlib, json, os, sys
D = os.path.dirname(os.path.abspath(__file__)); P = lambda p: os.path.normpath(os.path.join(D, p))
FF = P('../fix4-C.json'); B = json.load(open(FF))['band']
LINE = {'rgb': [52, 11, 43], 'hex': '#340B2B', 'columns': [609, 610], 'rows': [793, 865], 'what': "a 2 px line just outside the housing's left side, from under the rounded top's corner down to the bench"}
HOUSING = {'rgb': [149, 61, 102], 'hex': '#953D66', 'columns': [611, 616], 'rows': [795, 816], 'what': "the housing's colour inside its left side, above the hatch"}
KEEP = {'hatchFace': {'fromColumn': 611, 'rows': [819, 862]}, 'rimCorner': {'rows': [785, 792]}}
inside0 = int(B['side'] + 0.5)   # the housing's first column inside its side (fix8.py: the side at the middle of its ramp)
same = {'line colour': LINE['rgb'] == B['ink']['rgb'], 'line columns': LINE['columns'] == B['ink']['columns'], 'line rows': LINE['rows'] == B['ink']['rows'],
        'housing colour': HOUSING['rgb'] == B['housing'], 'housing columns': HOUSING['columns'] == [inside0, B['columns'][1]], 'housing rows': HOUSING['rows'] == B['housingRows'],
        'hatch face': KEEP['hatchFace']['rows'] == B['hatch']['faceRows'] and set(B['hatch']['faceLeftByRow'].values()) == {KEEP['hatchFace']['fromColumn']},
        'rim corner': KEEP['rimCorner']['rows'] == [B['top'], LINE['rows'][0] - 1],
        'colours as hex': '#%02X%02X%02X' % tuple(LINE['rgb']) == LINE['hex'] and '#%02X%02X%02X' % tuple(HOUSING['rgb']) == HOUSING['hex']}
if not all(same.values()): sys.exit(f'STOP: not the guide\'s numbers: {[k for k, v in same.items() if not v]}')
# the drawing stays clear of what is kept as painted
if HOUSING['rows'][1] >= KEEP['hatchFace']['rows'][0] or LINE['rows'][0] <= KEEP['rimCorner']['rows'][1] or LINE['columns'][1] >= KEEP['hatchFace']['fromColumn']: sys.exit('STOP: the drawing reaches what stays as painted')
rec = {'view': 'C', 'what': "the dispenser's left edge, drawn by code, opaque, in its own band file just after the capsule's (fix-2.png), so the capsule's layer stays as it was", 'drawnBy': 'code',
       'decision': "the Lead, 18 November 2026: PV6-C-5 is C's final picture; its edit did not take at the dispenser's left edge (341 px changed, the soft streaks into the books remain), so the edge is fixed in code, with no further generation",
       'line': LINE, 'housing': HOUSING, 'leftAsPainted': KEEP,
       'fromTheGuide': {'record': 'fix4-C.json', 'sha256': hashlib.sha256(open(FF, 'rb').read()).hexdigest(), 'checks': same},
       'units': 'painting pixel indices (1024 x 1536), inclusive ranges'}
json.dump(rec, open(P('edge4-C.json'), 'w'), indent=1); print(json.dumps(rec, indent=1))
