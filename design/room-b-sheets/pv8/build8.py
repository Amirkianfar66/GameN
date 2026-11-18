# Sheets PV6-B to PV6-E, version 2: each view's publishing folder pub-<view>/ and its manifest room-b-pv6<view>.json, from the
# guides (guide8.mjs, rendered), the kit (kit8.py), version 1's marks (the camera and room are unchanged), the camera report
# (report8.mjs), the prompts (prompts8.mjs), the capsule visits (visits8.mjs) and PV6-A's manifest (its colour plan, colour check
# and lift, unchanged). Every file is listed with its sha256. Generates nothing. Usage: PV8_LAYOUT=A1 python3 -I build8.py B C D E
import hashlib, json, os, shutil, sys
D = os.path.dirname(os.path.abspath(__file__)); A = json.load(open(os.path.join(D, '..', 'pv6', 'room-b-pv6a.json')))
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
LAYOUT = os.environ.get('PV8_LAYOUT', 'A1'); LAYOUT_CHOICE = os.environ.get('PV8_CHOICE', "the owner chose one capsule: the counter unit on Atlas's bench, at its north-west end, its hatch facing east into the room; painted in B and C; in A, D and E the visitor walks out of view to it and back; no edit to A (relayed by the Lead, 18 November)")   # the owner's choice, relayed by the Lead on 18 November
NAMES = {'B': ('Juno', 'c7', 2), 'C': ('Lyra', 'c3', 3), 'D': ('Atlas', 'c4', 4), 'E': ('Vega', 'c1', 5)}
REFS = {'empty': ('PV6-A-2', os.path.join(D, '..', 'pv6b', 'PV6-A-2.png'), 'img/PV6-A-2.png', '738061ae21931cabf70ba7e82ebb916c1dabcc5c2b16ac3bf6c65663d13783a5'),
        'furnished': ('PV6-A-3', os.path.join(D, '..', 'pv6b', 'PV6-A-3.png'), 'img/PV6-A-3.png', '731ec58d6773dc0ae6fd17ec4e12bf7cecec92a8b66ff25f99408a1e6b76e4dc'),
        'aMap': ("PV6-A's colour map (colour check version 4)", os.path.join(D, '..', 'pv6', 'pv6-A-empty-regions.png'), 'img/pv6-A-empty-regions.png', None),
        'aMarks': ("PV6-A's lamps and ring lights (marks7.mjs)", os.path.join(D, 'pv6-A-marks.json'), 'pv6-A-marks.json', None)}
FILES = ['guide', 'regions', 'empty', 'empty-regions', 'empty-annotated', 'furniture', 'place', 'split']
key = lambda f: {'empty-regions': 'emptyRegions', 'empty-annotated': 'emptyAnnotated', 'guide-s2': 'guideS2'}.get(f, f)
FILES3 = ['guide-s2', 'place3', 'split3']   # version 4: a view whose capsule is painted alone, in a step 3 (B and C)
def build(V):
    out = os.path.join(D, f'pub-{V}'); shutil.rmtree(out, ignore_errors=True); os.makedirs(os.path.join(out, 'img'))
    cp = lambda src, rel: (shutil.copyfile(src, os.path.join(out, rel)), {'published': rel, 'sha256': sha(os.path.join(out, rel))})[1]
    K = json.load(open(os.path.join(D, f'kit8-{V}.json'))); STEP3 = 'shapes3' in K
    files = {key(f): cp(os.path.join(D, f'pv6-{V}-{f}.png'), f'img/pv6-{V}-{f}.png') for f in FILES + (FILES3 if STEP3 else [])}
    files['marks'] = cp(os.path.join(D, f'pv6-{V}-marks.json'), f'pv6-{V}-marks.json')
    figures = {f: cp(os.path.join(D, f'pv6-{V}-{f}.png'), f'img/pv6-{V}-{f}.png') for f in ('plan', 'walks')}
    refs = {}
    for k, (name, src, rel, want) in REFS.items():
        e = cp(src, rel); refs[k] = {'name': name, **e}
        if want and e['sha256'] != want: sys.exit(f'{name} is not the records page\'s picture')
    TOOL = 'pv8_tools.py' if STEP3 else 'pv7_tools.py'   # version 4's views take the tool's version 2, with step 3
    for f in ('lift5.py', 'colour-check-v4.py', TOOL): shutil.copyfile(os.path.join(D, f), os.path.join(out, f))
    if not STEP3 and sha(os.path.join(out, 'pv7_tools.py')) != sha(os.path.join(D, '..', 'pv7', 'pv7_tools.py')): sys.exit('the tool is not version 1\'s')
    if sha(os.path.join(out, 'lift5.py')) != A['kit']['lift']['sha256'] or sha(os.path.join(out, 'colour-check-v4.py')) != A['colourCheck']['sha256']: sys.exit('lift5.py or colour-check-v4.py is not PV6-A\'s')
    rep = cp(os.path.join(D, f'camera-report-{V}.json'), f'camera-report-{V}.json')
    P = json.load(open(os.path.join(D, f'prompts8-{V}.json'))); R = json.load(open(os.path.join(D, f'camera-report-{V}.json')))
    VI = cp(os.path.join(D, f'visits-{LAYOUT}.json'), f'visits-{LAYOUT}.json'); VJ = json.load(open(os.path.join(D, f'visits-{LAYOUT}.json')))
    prompts = {k: {'text': t, 'sha256': hashlib.sha256(t.encode('utf-8')).hexdigest(), 'chars': len(t)} for k, t in P.items()}
    name, crew, num = NAMES[V]
    VER = {'B': 4, 'C': 7, 'D': 2, 'E': 3}[V]   # C's version 5 and E's version 3: Juno's stool painted in step 3 as well; C's version 6: the vent strips; C's version 7: the seat trimmed by the cart's jars
    S3ALL = {q['name'] for q in K['pieces'] if q.get('step') == 3}; STRIPS3 = sorted(n for n in S3ALL if n.startswith('vent strip')); S3 = S3ALL - set(STRIPS3)
    SF = os.path.join(D, f'strips-{V}.json'); STRIPS_REC = json.load(open(SF)) if os.path.exists(SF) else None
    TF = os.path.join(D, f'trim-{V}.json'); TRIM_REC = json.load(open(TF)) if os.path.exists(TF) else None
    # C's version 7 (the Lead, 18 November): step 2 is done and accepted; step 3 starts from its picture, the trim's base
    B2 = TRIM_REC['source']['base'] if TRIM_REC else None
    STEPS = {'s1': {'status': 'done', 'picture': STRIPS_REC['source']['label'], 'sha256': STRIPS_REC['source']['sha256']},
             's2': {'status': 'done', 'picture': B2['label'], 'records': B2['records'], 'sha256': B2['sha256'], 'accepted': 'the Lead, 18 November 2026'},
             's3': {'status': "for the Lead's go", 'base': {'picture': B2['label'], 'records': B2['records'], 'sha256': B2['sha256']}}} if B2 else None
    S3WHAT = 'the food capsule and the stool, two separate shapes' if S3 == {'food capsule', 'stool'} else 'the stool alone' if S3 == {'stool'} else 'the food capsule alone'
    if STRIPS3: S3WHAT = 'the food capsule, the stool and the two vent strips, four separate shapes'
    WITHOUT = 'without the capsule and the stool' if S3 == {'food capsule', 'stool'} else 'without the stool' if S3 == {'stool'} else 'without the capsule'
    BUDGET3 = {'B': 'one PLACE edit (step 2) and one capsule edit (step 3), about $0.12, over the accepted step 1; one re-run only if a check fails, at most $0.18',
               'C': 'one PLACE edit (step 2) and one edit for the capsule, the stool and the two vent strips (step 3), about $0.12, over the accepted step 1 (PV6-C-2); one re-run only if a check fails, at most $0.18',
               'E': 'one PLACE edit (step 2) and one stool edit (step 3), about $0.12, over the accepted step 1 (PV6-E-1); one re-run only if a check fails, at most $0.18'}
    if STEPS: BUDGET3[V] = f"one edit for the capsule, the stool and the two vent strips (step 3), about $0.057, over the accepted step 2 ({B2['label']}); no re-run; C ends at about $0.245 (the Lead, 18 November)"
    STATUS = f"Version {VER}, for the Lead's go on step 3. Step 2 is done ({B2['label']}, accepted by the Lead); nothing more is generated before the go." if STEPS else f"Version {VER}, for the Lead's go. Nothing is generated before it."
    m = {'sheet': f'PV6-{V}', 'version': VER, 'date': '2026-11-18', 'status': STATUS, **({'steps': STEPS} if STEPS else {}), 'generated': A['generated'],
         'owner': {'decision': "accepted the one-view test as the way to go for Room B: name tags at the feet; stronger shadows on the people (the In-game animation builder's); start the other four views, B, C, D and E, in this look",
                   'recorded': '#280 at 4350eee6 (relayed by the Lead)', 'spend': 'about $0.12 a view, at most $0.18 with one re-run',
                   'capsule': {'asked': "Just don't forget in each room you have a food capsule characters eating from eat like past (the owner, relayed by the Lead, 18 November)", 'design': "ship-life's food capsule (#230, approved 11 November)", 'layout': LAYOUT, 'chosen': LAYOUT_CHOICE},
                   'staging': "option 1 (the Lead's approval, 18 November): identical furniture in D and E, a person cheated alone; in B and C a station moves with its person, as in version 1, each move listed with its distance"},
         'test': f"One view, {name}'s (place {V}): the empty room painted over a straight-lined guide, then one PLACE edit for the furniture" + (f", then one masked edit for {S3WHAT}" if STEP3 else '') + ", by PV6-A's method; the people stay code.",
         'camera': {**{k: A['camera'][k] for k in ('lens', 'acrossDeg', 'eyeM', 'pitchDeg', 'pitchAs', 'back', 'turnDeg', 'painting', 'slices')}, 'at': R['camera']['at'], 'yawDeg': R['camera']['yawDeg'], 'yawDegExact': R['camera']['yawDegExact']},
         'staging': {'rule': "one staging of the whole room, shared by every view (PV6-A's stations for Vega, Lyra and Juno; the layout's for Mira and Atlas). In D and E the furniture is that staging's and a cheat moves a person alone, along their own station (Mira steps about her console); in B and C, as in version 1, a cheated person's station moves with them, keeping its facing. Every move is listed with its distance", 'listed': R['staging']['listed'], 'ownStation': R['staging']['ownStation'],
                     'people': {k: {f: p[f] for f in ('name', 'crew', 'plan', 'pv6a', 'spot', 'fromPlanM', 'fromPv6aM', 'facing', 'seenFromDeg', 'seenSide', 'pose')} | {'shareOfStageHeight': [p['390x844']['shareOfStageHeight'], p['430x932']['shareOfStageHeight']]} for k, p in R['people'].items()},
                     'outOfView': R['outOfView'], 'windowAndScreen': R['features'], 'layoutIssues': R['issues'], 'roomRules': R['fits']},
         'room': {'sameAsPV6A': 'the same room: the same lamps, ring, skylight, window, screen, colour plan and furniture', 'lamps': A['room']['lamps'], 'ceiling': A['room']['ceiling'],
                  'inThisView': [{'id': l['id'], 'wall': l['wall'], 'depthM': l['depthM'], 'coreInFrame': l['coreInFrame']} for l in json.load(open(os.path.join(D, f'pv6-{V}-marks.json')))['lamps']]},
         'colourPlan': A['colourPlan'], 'colourCheck': A['colourCheck'],
         'kit': {'views': {V: {'files': files, 'refs': refs, 'expected': {'s1': {'inputSha256': files['empty']['sha256']}, 's2': K['expected'], **({'s3': K['expected3']} if STEP3 else {})}, 'prompts': prompts, 'split': K['split'], 'shapes': K['shapes'],
                               **({'split3': K['split3'], 'shapes3': K['shapes3']} if STEP3 else {}), **({'strips3': STRIPS_REC} if STRIPS_REC else {}), **({'trim3': TRIM_REC} if TRIM_REC else {}), 'pieces': [{k: q[k] for k in ('place', 'name', 'unit', 'kind', 'grey') + (('step',) if STEP3 else ()) + ('trim',) if k in q} for q in K['pieces']], 'outlineShare': K['outlineShare']}},
                 'lift': A['kit']['lift'], 'colourCheck': {'file': 'colour-check-v4.py', 'sha256': A['colourCheck']['sha256']}, 'tool': {'file': TOOL, 'sha256': sha(os.path.join(out, TOOL))}},
         'capsule': R['capsule'], 'visits': {**VI, 'layout': LAYOUT, 'units': VJ['units'], 'beats': VJ['beats'], 'measure': VJ['measure']},
         'figures': figures,
         'cameraReport': rep, 'budget': {'afterTheGo': BUDGET3[V] if STEP3 else 'one empty-room picture (step 1) and one PLACE edit (step 2), about $0.12; one re-run only if a check fails, at most $0.18', 'generatedSoFar': 0},
         'referencesSentToTheModel': "PV6-A-2 at step 1 and PV6-A-3 at step 2, the team's own AI-generated pictures of this room (records page), as a second picture where the image tool takes one" + ('; none at step 3' if STEP3 else '') + "; none of the owner's reference pictures"}
    json.dump(m, open(os.path.join(out, f'room-b-pv6{V.lower()}.json'), 'w'), indent=1)
    lines = [f'Room B · sheet PV6-{V} · prompts · 2026-11-18', A['generated'], 'Each prompt is the text between its BEGIN line and its END line (the newline after BEGIN and the one before END are not part of it); its sha256 is of that text in UTF-8.', '']
    what = {'s1': ('step 1 (the empty room, a first pass)', f'inputs img/pv6-{V}-empty.png, then img/PV6-A-2.png as the reference; no mask'),
            's1-one': ('step 1 (the empty room, a first pass), for a tool that takes one picture', f'input img/pv6-{V}-empty.png; no mask'),
            's2': ('step 2 (PLACE, one masked edit)', f'inputs the step-1 picture with the guide inside img/pv6-{V}-place.png (mask alpha 0 = repaint), then img/PV6-A-3.png as the reference'),
            's2-one': ('step 2 (PLACE, one masked edit), for a tool that takes one picture', f'input the step-1 picture with the guide inside img/pv6-{V}-place.png; mask alpha 0 = repaint')}
    if STEP3:   # version 4: step 2's input shows the step-2 guide (no capsule); step 3 paints the capsule alone, with no second picture
        what['s2'] = (f'step 2 (PLACE, one masked edit: the furniture, {WITHOUT})', f'inputs the step-1 picture with the step-2 guide (img/pv6-{V}-guide-s2.png) inside img/pv6-{V}-place.png (mask alpha 0 = repaint), then img/PV6-A-3.png as the reference')
        what['s2-one'] = (f'step 2 (PLACE, one masked edit: the furniture, {WITHOUT}), for a tool that takes one picture', f'input the step-1 picture with the step-2 guide (img/pv6-{V}-guide-s2.png) inside img/pv6-{V}-place.png; mask alpha 0 = repaint')
        what['s3'] = (f'step 3 ({S3WHAT}, one masked edit)', f'input the kept step-2 picture with the guide (img/pv6-{V}-guide.png) inside img/pv6-{V}-place3.png (mask alpha 0 = repaint); no second picture')
        what['s3-one'] = ('step 3, for a tool that takes one picture: the same text as s3', f'input the kept step-2 picture with the guide inside img/pv6-{V}-place3.png; mask alpha 0 = repaint')
    if STEPS:   # C's version 7: step 2's part stays for the record, marked done; step 3's input is its accepted picture
        for k in ('s2', 's2-one'): what[k] = (f"{what[k][0]}; done: {B2['label']}, accepted by the Lead", what[k][1])
        what['s3'] = (what['s3'][0], f"input the kept step-2 picture, {B2['label']} (sha256 {B2['sha256']}), with the guide (img/pv6-{V}-guide.png) inside img/pv6-{V}-place3.png (mask alpha 0 = repaint); no second picture")
        what['s3-one'] = (what['s3-one'][0], f"input {B2['label']} with the guide inside img/pv6-{V}-place3.png; mask alpha 0 = repaint")
    for k, (title, inp) in what.items():
        lines += [f"===== BEGIN PV6-{V} {k}: {title} · {inp} · sha256 {prompts[k]['sha256']} · {prompts[k]['chars']} characters", prompts[k]['text'], '===== END', '']
    open(os.path.join(out, f'room-b-pv6{V.lower()}-prompts.txt'), 'w', encoding='utf-8', newline='').write('\n'.join(lines))
    print(V, 'layout', LAYOUT, 'files', len(os.listdir(out)) + len(os.listdir(os.path.join(out, 'img'))) - 1, '| PLACE', K['expected'], '| prompts', {k: v['sha256'][:12] for k, v in prompts.items()})
for V in sys.argv[1:]: build(V)
