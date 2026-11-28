# C's step 4 into the people data (the Lead, 18 November: PV6-C-5 accepted as C's final picture). Checks PV6-C-5 against the
# sha256 the Lead names, its lift4 record against sheet C version 9 and each lifted piece against the record, and copies them in:
# the three jars' tops. The dispenser's left edge did not take in the edit (lift4 lists its changes as under the recipe's 400 px
# parts): it is not lifted but drawn by code in its own band file, fix-2.png, just after the capsule's (edge4c.py, edge4-C.json; the
# Lead's decision), so the capsule's layer stays as it was. Then it writes
# picture.json's placed4 and layers4, and its placed: step 4's picture, no longer provisional. Generates nothing.
# Usage: python3 -I step4c.py <PV6-C-5.png> <PV6-C-5-lift4.json> <PV6-C-5's sha256> <records version>
import hashlib, json, os, shutil, sys
D = os.path.dirname(os.path.abspath(__file__)); P = lambda p: os.path.normpath(os.path.join(D, p))
pic, recf, want, version = sys.argv[1:5]
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
if sha(pic) != want: sys.exit(f'STOP: {pic} is not the PV6-C-5 named ({want[:12]}…)')
PIC = json.load(open(P('picture.json'))); MF = P('../pub-C/room-b-pv6c.json'); M = json.load(open(MF)); V = M['kit']['views']['C']
if M['version'] < 9 or 'jarTops4' not in V: sys.exit('STOP: the sheet is not version 9')
rec = json.load(open(recf))
if rec.get('view') != 'C' or rec.get('step') != 4 or rec.get('missing'): sys.exit(f"STOP: the lift4 record is not C's step 4, or it misses parts: {rec.get('missing')}")
if set(rec['pieces']) | set(rec['belowTheRecipesSize']) != set(V['split4']): sys.exit("STOP: the record does not name step 4's four parts")
c4 = P(PIC['placed3']['file'])   # PV6-C-4: step 3's picture, the one step 4 fixed
if sha(c4) != PIC['placed3']['sha256'] or sha(c4) != M['steps']['s4']['base']['sha256']: sys.exit("STOP: PV6-C-4 is not the sheet's step-4 base")
dirs = [os.path.dirname(os.path.abspath(pic)), os.path.dirname(os.path.abspath(recf))]
find = lambda f: next((os.path.join(d, f) for d in dirs if os.path.exists(os.path.join(d, f))), None)
pieces = {}
for st, e in rec['pieces'].items():
    f = find(e['file'])
    if not f or sha(f) != e['sha256']: sys.exit(f"STOP: {e['file']} is missing or not the record's")
    if os.path.abspath(f) != P(e['file']): shutil.copyfile(f, P(e['file']))
    pieces[st] = dict(e)
notLifted = {st: {**e, 'then': "drawn by code in its own band file, fix-2.png, just after the capsule's (edge4c.py, edge4-C.json): the edit did not take there (the Lead, 18 November)"}
             for st, e in rec['belowTheRecipesSize'].items()}
if set(notLifted) - {'D dispenser left edge'}: sys.exit(f'STOP: a part other than the edge was not lifted: {sorted(notLifted)}')
shutil.copyfile(pic, P('PV6-C-5.png')); os.makedirs(P('_in'), exist_ok=True); shutil.copyfile(recf, P('_in/PV6-C-5-lift4.json'))
p4 = {'label': 'PV6-C-5', 'file': 'PV6-C-5.png', 'records': 'img/PV6-C-5.png', 'sha256': want,
      'what': "step 4: the three glass jars' tops on the cart and the dispenser's left edge, one masked edit of PV6-C-4 inside step 4's four shapes (sheet C version 9), kept in code; for step 4's layers' check"}
L4 = {'record': {'file': '_in/PV6-C-5-lift4.json', 'records': 'records/PV6-C-5-lift4.json', 'sha256': sha(recf)}, 'recipe': rec['recipe'], 'from': 'PV6-C-5 over PV6-C-4 (pv9_tools.py lift4 C)',
      'pieces': pieces, **({'notLifted': notLifted} if notLifted else {})}
out = {}
for key, v in PIC.items():
    if key == 'note':
        v = ("The pictures of Room B's view C (Lyra's) for the people and C's page: the plate is PV6-C-2, the empty room; the three furniture pieces are the layers lifted from PV6-C-3 inside step 2's PLACE mask; "
             "the food capsule, Juno's stool and the two vent strips are the layers lifted from PV6-C-4 inside step 3's mask; the three jars' tops are the layers lifted from PV6-C-5 inside step 4's mask (sheet C version 9); the dispenser's left edge, which that edit did not fix, is drawn by code in its own band file, fix-2.png, just after the capsule's (edge4-C.json). "
             "All are AI-generated pictures from the records page, checked by hash. This record keeps hashes, not links (the Lead, 18 November).")
    if key == 'records': v = {'version': version, 'passed': "the Lead, 18 November 2026: PV6-C-3 accepted (step 2); PV6-C-4, step 3's picture; PV6-C-5 accepted as C's final picture (step 4, sheet C version 9: the jars' tops; the dispenser's left edge did not take and is fixed in code)"}
    if key == 'placed': v = {**p4, 'what': "the picture the bands rebuild: PV6-C-5, step 4's"}
    if key == 'sheet': v = {'label': 'PV6-C', 'version': M['version'], 'manifest': '../pub-C/room-b-pv6c.json', 'sha256': sha(MF)}
    if key in ('placed4', 'layers4'): continue
    out[key] = v
    if key == 'placed3': out['placed4'] = p4
    if key == 'layers3': out['layers4'] = L4
json.dump(out, open(P('picture.json'), 'w'), indent=1)
print(json.dumps({'placed': out['placed']['label'], 'pieces': {st: {x: e[x] for x in ('file', 'px', 'x', 'y')} for st, e in pieces.items()}, 'notLifted': list(notLifted), 'sheet': out['sheet']['version']}, indent=1))
