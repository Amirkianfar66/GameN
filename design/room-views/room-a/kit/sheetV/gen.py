# Sheets RA-C, RA-D and RA-E (Room A, views C, D and E): their generic scripts, written into sheetC/, sheetD/ and sheetE/ from sheet
# RA-B's (version 1, as published) by plain text edits, so the three sheets share view B's method line for line. Each edit is
# checked to apply exactly once. The view's own words (its prompts and its page's words) are written by hand in its folder, not
# here. Usage: python3 -I gen.py C|D|E
import os, sys
V = sys.argv[1]; assert V in ('C', 'D', 'E'), 'the view is C, D or E'
assert V != 'D', "view D's generic scripts carry sheet RA-D version 2.1's step 2b by hand (rd1_tools.py, buildD.mjs, dryrunD.sh, verifyD.sh, sheetD.mjs, makeD.sh): do not regenerate them"
HERE = os.path.dirname(os.path.abspath(__file__)); B = os.path.join(HERE, '..', 'sheetB'); OUT = os.path.join(HERE, '..', f'sheet{V}')
NAMES = {'C': 'Echo', 'D': 'Atlas', 'E': 'Lyra'}; N = NAMES[V]; v = V.lower()
os.makedirs(OUT, exist_ok=True)
def edit(src, out, pairs, tail=None):
    s = open(os.path.join(B, src)).read()
    for old, new in pairs:
        assert s.count(old) == 1, (src, old[:100], s.count(old)); s = s.replace(old, new)
    if tail: s = tail(s)
    open(os.path.join(OUT, out), 'w').write(s); print('written', out)

# ---- the guide
edit('guideB.mjs', f'guide{V}.mjs', [
  ("""// Room A, view B (Mira's place), sheet RA-B, version 2: the guides, as sheet RA-A's (guideA.mjs, version 4) for view A, with view B's
// own pieces: Vega's PC desk and its two monitors, whose screens are openings (flat black, for the game to fill, and the colour
// check's openings), Atlas's crates and Lyra's hatch, its lid and the toolbox; the round window in the north wall is an opening
// too. The food capsule and Echo's cabinet are out of view B. No plain-wall area and no step 3. View A's guide notes follow.""",
   f"""// Room A, view {V} ({N}'s place), sheet RA-{V}, version 1: the guides, as sheet RA-B's (guideB.mjs, version 1) for view B, with
// view {V}'s own pieces: every station in the painting but the viewer's own, which the approved plan leaves out of the viewer's view
// (visA), and the food capsule where it is in the picture, in its own step 3. The monitors' screens and the round window, where
// they are in view, are openings: flat black, for the game to fill, and the colour check's openings. What is in view is measured,
// not listed: inView below. No plain-wall area. View B's and view A's guide notes follow.
// Room A, view B (Mira's place), sheet RA-B, version 1: the guides, as sheet RA-A's (guideA.mjs, version 4) for view A."""),
  ("export const VIEWER = 'B', NAME = 'RA-B';", f"export const VIEWER = '{V}', NAME = 'RA-{V}';"),
  ("import { LAYOUT, CAPSULE, capsuleAt, camOf, roomWith } from '../stageA.mjs';", "import { LAYOUT, CAPSULE, capsuleAt, camOf, roomWith, IDS, CAST } from '../stageA.mjs';"),
  ("""const PIECE_OF = { 'electrical panel': 'electrical cabinet', 'panel door': 'electrical cabinet', 'floor hatch': 'floor hatch', 'hatch lid': 'floor hatch', toolbox: 'toolbox', crate: 'crates', 'food capsule': 'food capsule', 'PC desk': 'PC workstation', monitor: 'PC workstation' };
// view B: the lid is part of the hatch's piece. It stands at the painting's right edge (x 1015 to 1024, 248 px), outside every phone's
// slice (they end at x 939), too small to lift as a layer of its own (the lift drops parts under 400 px)""",
   """const PIECE_OF = { 'electrical panel': 'electrical cabinet', 'panel door': 'electrical cabinet', 'floor hatch': 'floor hatch', 'hatch lid': 'hatch lid', toolbox: 'toolbox', crate: 'crates', 'food capsule': 'food capsule', 'PC desk': 'PC workstation', monitor: 'PC workstation' };
// the hatch's lid is its own piece, as in view A, wherever it is in this view (view B, where it was a 9 px sliver at the painting's
// edge, made it part of the hatch's piece)"""),
  ("const stand = roomWith(VIEWER), PNG = Object.fromEntries(['A', 'C', 'D', 'E'].map(", "const stand = roomWith(VIEWER), PNG = Object.fromEntries(IDS.filter(pl => pl !== VIEWER).map("),
  ("${NAME} · Room A from Mira's place (B) · straight lines, 80° across · horizon y 714 · eye 1.6 m, level, upright", "${NAME} · Room A from ${CAST[VIEWER].name}'s place (${VIEWER}) · straight lines, 80° across · horizon y 714 · eye 1.6 m, level, upright"),
  ("Gold dashes: step 2's furniture · the window and the screens are openings, flat black · stand-ins, for checking. No people are painted.",
   "Gold dashes: step 2's furniture${ps.some(p => p.step === 3) ? \" · orange: step 3's capsule\" : ''}${OPENINGS_TEXT} · stand-ins, for checking. No people are painted."),
  # what is in view, measured: the window, the screens, the capsule, and the viewer's own station (left out)
  ("export const pieces = () => { const out = [];",
   """// what is in view, measured on the painting: the round window (its glass inside the painting), the screens (a monitor's front face
// toward the camera, inside the painting) and the viewer's own station (left out, as the plan leaves it out; its pixels are reported)
const inPaint = pp => pp && pp.some(([x, y]) => x > 0 && x < GW && y > 0 && y < GH);
export const inView = (() => { const win = room.quads.filter(q => q.kind === 'window'), mon = room.objects.filter(o => o.name === 'monitor');
  return { window: win.some(q => seen(q) && inPaint(P(q.pts))), screens: mon.some(o => o.faces.some(fc => normalOf(fc, o).n[2] < -0.7 && facesCam(fc, o) && inPaint(P(fc.pts)))),
    capsule: room.objects.some(o => o.kind === 'capsule' && inPicture(o)), own: room.objects.filter(o => o.place === VIEWER && inPicture(o)).map(o => o.name) }; })();
const OPENINGS_TEXT = inView.window && inView.screens ? ' · the window and the screens are openings, flat black' : inView.window ? ' · the window is an opening, flat black' : inView.screens ? ' · the screens are openings, flat black' : '';
export const pieces = () => { const out = [];"""),
  # the guide's account of the view (view-X.json) and the viewer's own station, one grey a name (ra-X-own.svg), for the kit's checks
  ("  console.log('roles', JSON.stringify(ROLES)",
   """  const own = room.objects.filter(o => o.place === VIEWER), ownNames = [...new Set(own.map(o => o.name))];
  W('ra-B-own.svg', svgOf(own.map(o => o.faces.map(fc => P(fc.pts)).filter(Boolean).map(pp => `<polygon points="${pts(pp)}" fill="rgb(${20 * (ownNames.indexOf(o.name) + 1)},${20 * (ownNames.indexOf(o.name) + 1)},${20 * (ownNames.indexOf(o.name) + 1)})"/>`).join('')).join(''), '', '#000', '', true));
  W('view-B.json', JSON.stringify({ view: VIEWER, sheet: NAME, roles: ROLES, inView, own: ownNames, slices: Object.fromEntries(PHONES.map(ph => { const r = slice(ph).rect; return [ph.join('x'), [r.x0, r.y0, r.x1, r.y1].map(v => +v.toFixed(1))]; })) }, null, 1));
  console.log('roles', JSON.stringify(ROLES)"""),
], tail=lambda s: s.replace("'ra-B-", f"'ra-{V}-").replace("'pieces-B.json'", f"'pieces-{V}.json'").replace("'view-B.json'", f"'view-{V}.json'"))

# ---- the generic scripts, from the templates here: @V@ the view, @v@ its lower case, @N@ the viewer's name
def tmpl(src, out):
    s = open(os.path.join(HERE, src)).read().replace('@V@', V).replace('@v@', v).replace('@N@', N)
    open(os.path.join(OUT, out), 'w').write(s); print('written', out)
tmpl('kit.tmpl.py', f'kit{V}.py')
tmpl('build.tmpl.mjs', f'build{V}.mjs')
tmpl('crops.tmpl.py', f'crops{V}.py')
tmpl('dryrun.tmpl.sh', f'dryrun{V}.sh')
tmpl('sheet.tmpl.mjs', f'sheet{V}.mjs')
tmpl('make.tmpl.sh', f'make{V}.sh')
tmpl('verify.tmpl.sh', f'verify{V}.sh')

# ---- the tool: views C and E take sheet RA-B's (two steps), view D sheet RA-A's (three steps), each with its own manifest
import re
def tool(src, out, head_old, head_new, manifest_old, letter_old, tool_old, drop=()):
    s = open(src).read()
    for d in drop: assert s.count(d) == 1, (out, d[:80]); s = s.replace(d, '')   # sheet RA-B's own version notes
    for old, new, n in ((head_old, head_new, 1), (manifest_old, f'room-a-ra-{v}.json', 2), (f"print(f'RA-{letter_old} kit for", f"print(f'RA-{V} kit for", 1),
                        (f'\'colour\': f"{tool_old} colours {{X}} 1', f'\'colour\': f"r{v}1_tools.py colours {{X}} 1', 1)):
        assert s.count(old) == n, (out, old[:80], s.count(old)); s = s.replace(old, new)
    lines = s.split('\n'); k = 0
    for i, ln in enumerate(lines):
        if ln.startswith('#   python3 -I r'):
            new = re.sub(r'^#   python3 -I r[ab]1_tools\.py (\w+)( ' + letter_old + r')?( |$)', lambda m: f'#   python3 -I r{v}1_tools.py {m.group(1)}' + (f' {V}' if m.group(2) else '') + m.group(3), ln)
            assert new != ln, ln; lines[i] = new; k += 1
    assert k in (6, 9), (out, k); s = '\n'.join(lines)
    open(os.path.join(OUT, out), 'w').write(s); print('written', out, '| usage lines', k)
if V in ('C', 'E'):
    tool(os.path.join(B, 'rb1_tools.py'), f'r{v}1_tools.py',
         "# The tool for sheet RA-B (Room A, view B: Mira's place), version 2: sheet RA-A's tool (ra1_tools.py, version 1) with view B's\n# manifest and its two steps; step 3 and its commands are left out, since view B has no food capsule.",
         f"# The tool for sheet RA-{V} (Room A, view {V}: {N}'s place), version 1: sheet RA-B's tool (rb1_tools.py, version 1) with view {V}'s\n# manifest and its two steps; like view B, view {V} has no food capsule in view, so it has no step 3.",
         'room-a-ra-b.json', 'B', 'rb1_tools.py', drop=("# Version 2 (27 November): the s1 command's printed colour check names this tool, rb1_tools.py (version 1 printed ra1_tools.py).\n",))
else:
    tool(os.path.join(HERE, '..', 'sheet', 'ra1_tools.py'), 'rd1_tools.py',
         "# The tool for sheet RA-A (Room A, view A: Vega's place), version 1: Room B's PV6 tool (pv6_tools.py, with pv8_tools.py's step 3),\n# its steps unchanged, for Room A's first view.",
         "# The tool for sheet RA-D (Room A, view D: Atlas's place), version 1: sheet RA-A's tool (ra1_tools.py, version 1), its three\n# steps unchanged, with view D's manifest.",
         'room-a-ra-a.json', 'A', 'ra1_tools.py')
# ---- the files sheet RA-B shares byte for byte: the lift, the colour check, the renderer and the scan fix
import shutil
for f in ('lift5.py', 'colour-check-ra1.py', 'render.cjs', 'scanfixA.py'): shutil.copyfile(os.path.join(B, f), os.path.join(OUT, f))
