// Sheet RA-A's page (Room A, view A): what the image session receives and does, step by step, with every file's sha256; the checks
// run on the sheet's own files (the dry run and the colour check's calibration); the spend and the rules. Writes sheet-ra-a.html
// and copies it, with the phone crops, into pub/. Reads room-a-ra-a.json, kit-A.json, pub/_dry/summary.json and the colour check's
// calibration (_cal-*.json). Version 3: the 15 px test against RA-A-1 and its review overlays (overlayA.py), which are RA-A-1, an
// AI-generated picture, with the masks drawn over it: labelled so on the picture and in their captions. Version 6 (the Lead, 13:07 and
// 13:24 on 19 November): where room-a-ra-a-s4.json is present, step 4, a fix of the cabinet's right side over RA-A-4, its own section,
// files and dry-run rows; version 4's files and sections are kept, its change note folded. Version 7 (the Lead, 13:59 on 19 November):
// where frame-A.json is present, step 4 failed twice and the cabinet's right frame is drawn in code on RA-A-4 (frameA.py): its own
// section, files and review pictures (reviewFrameA.py: RA-A-4 before and after, labelled AI-generated); version 6's files are kept
// byte for byte, its change note folded. Generates nothing. Usage: node sheetA.mjs
import { readFileSync, writeFileSync, copyFileSync, statSync, existsSync } from 'fs';
import { createHash } from 'crypto';
const DIR = new URL('./', import.meta.url).pathname, PUB = DIR + 'pub/';
const J = f => JSON.parse(readFileSync(DIR + f, 'utf8')), shaF = f => createHash('sha256').update(readFileSync(f)).digest('hex');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const M = J('room-a-ra-a.json'), KIT = J('kit-A.json'), DRY = J('pub/_dry/summary.json'), V = M.kit.views.A;
const CAL = { empty: J('_cal-empty.json'), guide: J('_cal-guide.json'), roomB: J('_cal-roomb.json') };
const S4 = existsSync(DIR + 'room-a-ra-a-s4.json') ? J('room-a-ra-a-s4.json') : null;   // version 6: step 4's kit
const FR = S4 && existsSync(DIR + 'frame-A.json') ? J('frame-A.json') : null;   // version 7: step 4 failed twice; the frame drawn in code
if (DRY.manifestSha256 !== shaF(DIR + 'room-a-ra-a.json')) throw new Error('the dry run is not of this manifest');
for (const w of [390, 430, 402]) copyFileSync(DIR + `ra-A-phone-${w}.png`, PUB + `img/ra-A-phone-${w}.png`);   // the page's own crops, first: their hashes are listed
const pct = (x, d = 1) => `${(100 * x).toFixed(d)}%`, num = n => n.toLocaleString('en-GB'), yes = b => (b ? '<span class="pill ok">pass</span>' : '<span class="pill no">fail</span>');
// everything the image session receives, at its published path
const RECEIVES = [
  ...Object.entries(V.files).map(([k, e]) => [e.published, { empty: "step 1's input: the empty-room guide", emptyRegions: "the colour check's map for step 1", emptyAnnotated: 'for checking the lines: the horizon, the phones\' slices, where people stand',
    guide: "the guide with the furniture and the capsule: step 3's input inside its mask", guideS2: "the guide with the furniture, without the capsule: step 2's input inside the PLACE mask", regions: "the colour check's map for steps 2 and 3",
    place: "step 2's PLACE mask (white = repaint)", split: "step 2's split map: one grey a piece, for the lift", place3: "step 3's mask (white = repaint)", split3: "step 3's split map: the capsule's grey" }[k]]),
  ['room-a-ra-a.json', 'the manifest: the kit the tool reads, the prompts, the expected hashes, the camera'], ['room-a-ra-a-prompts.txt', 'the three prompts, each with its sha256'],
  ['ra1_tools.py', 'the tool, version 1 (Room B\'s PV6 tool with step 3 and the colour check)'], ['lift5.py', "the lift, the Lead's recipe (the same bytes as Room B's sheets')"], ['colour-check-ra1.py', 'the Room A colour check, version 1'],
  ['camera-report-A.json', 'the camera report, version 2 (the Room A plan\'s)']].map(([f, what]) => ({ f, what, bytes: statSync(PUB + f).size, sha: shaF(PUB + f) }));
const REVIEWFILES = [...['ra-A-phone-390.png', 'ra-A-phone-430.png', 'ra-A-phone-402.png'].map(f => 'img/' + f), ...['full', 'wall', '390', '402', '430'].map(k => `img/review/ra-A-review-${k}.png`), 'featuresA.json', 'plainA.json', ...(S4 ? ['img/review/ra-A-review4-cabinet.png', 'img/review/ra-A-review4-402.png'] : []), ...(FR ? ['img/review/ra-A-frame-cabinet.png', 'img/review/ra-A-frame-402.png'] : [])]
  .map(f => `<tr><td><code>${esc(f)}</code></td><td class="n">${num(statSync(PUB + f).size)}</td><td class="h"><code>${shaF(PUB + f)}</code></td></tr>`).join('');
const hashRows = RECEIVES.map(r => `<tr><td><code>${esc(r.f)}</code><div class="dim">${esc(r.what)}</div></td><td class="n">${num(r.bytes)}</td><td class="h"><code>${r.sha}</code></td></tr>`).join('');
const promptBlock = (k, title) => { const p = V.prompts[k]; return `<details><summary>${title}: the prompt, ${num(p.chars)} characters · sha256 <code>${p.sha256.slice(0, 16)}…</code></summary><pre>${esc(p.text)}</pre><p class="dim">sha256 <code>${p.sha256}</code>, of the text in UTF-8, as <code>room-a-ra-a-prompts.txt</code> gives it.</p></details>`; };
const pieceWords = { 'plain wall': 'The back wall where RA-A-1 painted the locker bank and the panels beside it, and a small patch above the cabinet over the papers\' clip, repainted as plain steel wall: a background piece, the farthest grey, so nothing of the lockers runs into the capsule. In the dry run the stand-ins are the same there, so it lifts nothing; only a real step-2 picture changes it.', 'electrical cabinet': 'The open cabinet on the back wall, 0.88 m wide and 0.8 to 1.95 m up, with no door. Its cables are painted neatly bundled, none loose: code draws the wire Echo draws out.', 'floor hatch': 'The open hatch in the deck, its near rim crisp and lit: code draws Lyra\'s hands and wrench going into it, so the rim is its own layer.', 'hatch lid': 'The hatch\'s lid, 0.48 m long, raised almost upright at its far end: its own piece, as the Motion builder asked.', toolbox: 'The closed toolbox beside the hatch\'s near end, cut off by the bottom edge.' };
const pieceRows = KIT.pieces.map(p => `<tr><td>${esc(p.name)}</td><td class="n">${p.grey}</td><td class="n">${num(p.px)}</td><td class="n">${DRY.lifted[`${p.place} ${p.name}`] !== undefined ? num(DRY.lifted[`${p.place} ${p.name}`]) : DRY.missingExpected.includes(`${p.place} ${p.name}`) ? 'none, as expected' : '–'}</td><td>${esc(pieceWords[p.name] ?? '')}</td></tr>`).join('');
const gateRows = Object.keys(CAL.empty.result).map(g => `<tr><td>${esc(g)}</td><td>${esc(CAL.empty.gates?.[g] ?? '')}</td><td>${yes(CAL.empty.result[g])}</td><td>${yes(CAL.guide.result[g])}</td><td>${yes(CAL.roomB.result[g])}</td></tr>`).join('');
const sl = M.camera.phones.slices;
// version 4: the change; versions 3 and 2 as the manifest records them, folded
const LC = KIT.gaps['hatch lid / electrical cabinet'] ?? KIT.gaps['electrical cabinet / hatch lid'], FT = KIT.featureTest, F = n => FT.features.find(f => f.name === n), PAIR = (a, f) => FT.pairs[a]?.[f];
const gp = r => (r ? (r.clearPx ?? r.insidePx) : FT.atLeastPx), tested = FT.features.filter(f => f.test), clean = tested.filter(f => !f.exception).length, CH = v => M.changes.find(c => c.version === v).what;
const CHANGE = `<div class="note"><b>What changed in version 4.</b> Your one rule, built into the kit: RA-A-1’s painted features are fixed obstacles (<code>featuresA.json</code>), and every step-2 and step-3 mask edge covers each one with at least ${FT.minClearPx} px to spare or clears it by at least ${FT.minClearPx} px. The build measures it and stops if it fails. ${clean} of the ${tested.length} features in the test pass outright; <b>two named exceptions are yours to decide</b> (below).
<ul><li><b>The cabinet</b> is 0.88 m wide (was 1.1 m), its north side where it was, so it centres on Echo’s spot. It hangs 0.8 to 1.95 m up, ${gp(PAIR('C electrical cabinet', 'pipe run'))} px clear of the pipe run and at least ${Math.min(...['left', 'middle', 'right'].map(k => gp(PAIR('C electrical cabinet', 'pipe clamp, ' + k))))} px clear of its clamps. It has <b>no door</b>: folded south the door would end on the grille, folded north it would reach the food capsule. It clears the grille by ${gp(PAIR('C electrical cabinet', 'grille'))} px.</li>
<li><b>The hatch’s lid</b> is 0.48 m long (was 0.6 m), so its top stays ${gp(PAIR('E hatch lid', 'pipe run'))} px under the pipe run. Raised less, it hardly moves in the picture: at 65° its top lies within 3 px of where it is at 80°. The lid and the cabinet are ${LC.tightPx} px apart.</li>
<li><b>The plain-wall area</b> keeps the locker bank and the panels beside it, and adds a small patch above the cabinet’s top so the papers’ clip is covered with ${gp(F('papers: clip').step2)} px to spare. The grille is no longer repainted.</li>
<li>Nothing else on the floor plan moved: the five views’ layout checks and the five camera reports are as before. Step 1’s files are byte for byte version 1’s.</li></ul></div>
<details><summary>What changed in version 3</summary><p>${esc(CH(3))}</p></details>
<details><summary>What changed in version 2</summary><p>${esc(CH(2))}</p></details>`;
const cell = r => r.status === 'inside' ? `covered, ${r.insidePx >= FT.atLeastPx ? `${FT.atLeastPx}+` : r.insidePx} px to spare` : r.status === 'clear' ? `clear by ${r.clearPx >= FT.atLeastPx ? `${FT.atLeastPx}+` : r.clearPx} px` : r.status === 'crosses' ? `crosses an edge (${num(r.pxInside)} px inside)` : r.status;
const featRow = f => { const ok = !f.test ? '<span class="pill">noted</span>' : f.exception ? '<span class="pill warn">your call</span>' : '<span class="pill ok">pass</span>';
  return `<tr><td>${esc(f.name)}</td><td>${esc(f.kind)}</td><td>${esc(cell(f.step2))}</td><td>${esc(cell(f.step3))}</td><td>${ok}</td></tr>`; };
const featRows = FT.features.map(featRow).join('');
const exNotes = FT.exceptions.map(x => `<div class="note"><b>For your decision: the ${esc(x.name)}.</b> ${x.parts.map(pt => `<b>${esc(pt.where[0].toUpperCase() + pt.where.slice(1))}:</b> ${esc(pt.why)}`).join(' ')}</div>`).join('\n');
const PIECENAME = { 'back plain wall': 'Plain-wall area (as drawn)', 'C electrical cabinet': 'Electrical cabinet (grown 6 px)', 'E hatch lid': 'Hatch lid (grown 6 px)', 'E floor hatch': 'Floor hatch (grown 6 px)', 'E toolbox': 'Toolbox (grown 6 px)', 'wall food capsule (step 3)': 'Food capsule, step 3 (grown 2 px)' };
const FEATS = Object.fromEntries(FT.features.map(f => [f.name, f.test]));
const pairRows = Object.entries(FT.pairs).map(([an, row]) => `<tr><td>${esc(PIECENAME[an] ?? an)}</td><td>${Object.keys(row).length ? Object.entries(row).map(([fn, r]) => `${esc(fn)}${FEATS[fn] ? '' : '*'}: ${esc(cell(r))}`).join('; ') : `every feature ${FT.atLeastPx}+ px clear`}</td></tr>`).join('');
const REVIEW = [['ra-A-review-wall.png', 'The back wall, 1.5 times'], ['ra-A-review-full.png', 'The whole painting']];
const cmd = s => `<pre class="cmd">${esc(s)}</pre>`;
// version 6: step 4, a fix over RA-A-4 (room-a-ra-a-s4.json); version 4's files are kept byte for byte
let S4CHANGE = '', S4FACTS = '', S4SECTION = '', S4DRY = '', S4FILES = '', S4NOTE = '';
if (S4) {
  const G = S4.checks.gaps, R = S4.frameRule, MK = S4.mask, P4 = S4.prompts.s4, D4 = DRY.s4;
  if (!D4 || D4.kitSha256 !== shaF(DIR + 'room-a-ra-a-s4.json')) throw new Error("the dry run is not of this step-4 kit");
  const gapWords = Object.entries(G).map(([n, g]) => `the ${n} ${g.status === 'clear' ? `${g.clearPx} px` : g.status}${g.test ? '' : ' (noted, not tested)'}`).join('; ');
  S4CHANGE = `<div class="note"><b>What changed in version 6.</b> Steps 1 to 3 are done: RA-A-3 (step 2) and RA-A-4 (step 3) were painted from version 4 and accepted by the Lead. Version 6 adds one thing, step 4: a fix of the cabinet’s right side over RA-A-4, which the Lead asked for at 13:07 and confirmed at 13:24. Version 4’s files are kept byte for byte, its manifest among them. Step 4’s files are added: the mask, the split, step 4’s kit with its prompt and expected hashes, and the tool’s version 2.</div>
<div class="note"><b>Version 5 was published in error.</b> It went up at about 13:14 to 13:16 (1795094103-c6d4, then 1795094212-bc2a), after RA-A-3 and RA-A-4 had been painted from version 4 and after the Lead had stopped it: the Lead’s messages reached this session late. No picture was made from it. Version 4’s bytes replaced it at 1795094570-9e36, every file and the page byte for byte, and it is set aside.</div>
<details><summary>What changed in version 4, the accepted version</summary>${CHANGE}</details>`;
  S4FACTS = `<div class="facts"><span class="pill ok">Steps 1–3 done: RA-A-3 and RA-A-4 accepted</span><span class="pill">Step 4: one edit over RA-A-4, for the Lead’s go</span><span class="pill">Mask ${MK.x[1] - MK.x[0] + 1} × ${MK.y[1] - MK.y[0] + 1} px</span><span class="pill ok">Pipe run ${G['pipe run'].clearPx} px clear</span><span class="pill">Frame edge: x ${R.frameOuterEdgeAtMostX} or less</span><span class="pill ok">Dry run with step 4: pass</span><span class="pill">Room A: about $0.23 of under $5</span></div>`;
  S4SECTION = `<section id="step4">
<h2>Step 4 · the cabinet’s right side</h2>
${FR ? '<p class="dim">Tried twice, RA-A-5 and RA-A-6, and both failed: the frame is drawn in code instead (above). This section is version 6’s, unchanged.</p>' : ''}
<p>RA-A-3 painted the cabinet’s frame down its left side and along its bottom, but not its right: its top bar, with the second orange light, and the breaker rows’ cables fade softly into the wall. Step 4 is one masked edit of RA-A-4, the accepted step-3 picture (sha256 <code>${S4.startPicture.sha256}</code>), inside a narrow mask at that side, with the Lead’s short prompt. The input is the picture itself, with no guide in it, and there is no second picture.</p>
<div class="pics review">
<figure><img src="img/review/ra-A-review4-cabinet.png" alt="AI-generated picture RA-A-4: the cabinet's right side at three times, with step 4's mask edge, the frame's limit at x ${R.frameOuterEdgeAtMostX} and the grille's edge drawn over it" loading="lazy"><figcaption><b>AI-generated (RA-A-4), review overlay.</b> The cabinet’s right side, 3 times. Gold: step 4’s mask. Cyan, dashed: the frame’s limit, x ${R.frameOuterEdgeAtMostX}. Magenta, dashed: the grille’s edge, x ${R.grilleEdgeX}. Pink: the second orange light.</figcaption></figure>
<figure style="max-width: 420px"><img src="img/review/ra-A-review4-402.png" alt="AI-generated picture RA-A-4 with step 4's mask, as the 402 by 742 phone's slice" width="804" height="1102" loading="lazy"><figcaption><b>AI-generated (RA-A-4), review overlay.</b> 402 × 742, your phone in the app: its 402 × 551 slice, twice its size.</figcaption></figure>
</div>
<h3>The mask</h3>
<dl><dt>Where</dt><dd>x ${MK.x[0]}–${MK.x[1]}, y ${MK.y[0]}–${MK.y[1]}: ${num(MK.px)} px, ${pct(S4.expected.s4.maskedShare, 2)} of the picture (<code>img/ra-A-place4.png</code>, white = repaint)</dd>
<dt>Left edge</dt><dd>Just inside the breaker rows’ right ends, which are at x ${MK.measured.breakerRowsRightEnd.x}.</dd>
<dt>Right edge</dt><dd>15 px past the cabinet’s outline (x ${MK.measured.cabinetOutlineRight.x}), on plain wall, ${G.grille.clearPx} px short of the grille’s seam (x ${R.grilleEdgeX}).</dd>
<dt>Height</dt><dd>The cabinet’s full height, with room for its frame’s corners. Its foot is ${G['pipe run'].clearPx} px above the pipe run.</dd>
<dt>The second light</dt><dd>${S4.checks.secondLight.insideMaskPx} of its ${S4.checks.secondLight.px} px are inside the mask, and the prompt keeps it whole.</dd>
<dt>Gaps</dt><dd>${esc(gapWords)}. The papers and the two panels behind the cabinet were painted over in step 2 and are not in RA-A-4.</dd>
<dt>The 15 px rule</dt><dd>It is for the new frame’s edge, as the Lead set it: its outer edge at x ${R.frameOuterEdgeAtMostX} or less, ${R.minClearPx} px from the grille. <code>ra2_tools.py frame4</code> measures it ${esc(R.how)}. On RA-A-4 as it is, it reads x 537, the cables’ outer edge. The mask’s wall beyond that is there so that the frame’s outline and the wall meet cleanly.</dd>
<dt>The lift</dt><dd>The cabinet’s layer is refreshed: the Lead’s recipe on RA-A-1 and the step-4 picture, inside the cabinet’s step-2 split area with step 4’s mask (${num(S4.checks.lift4Area.px)} px, ${num(S4.checks.lift4Area.addedByStep4Px)} of them new).</dd></dl>
<div class="pics three" style="max-width: 380px">
<figure><img src="img/ra-A-place4.png" alt="Step 4's mask: a narrow upright strip at the cabinet's right side" width="1024" height="1536" loading="lazy"><figcaption>Step 4’s mask: white repaints.</figcaption></figure>
<figure><img src="img/ra-A-split4.png" alt="Step 4's split map: the cabinet's grey in the strip" width="1024" height="1536" loading="lazy"><figcaption>The split: the cabinet’s grey, ${Object.values(S4.split4)[0]}.</figcaption></figure>
</div>
${cmd(`python3 -I ra2_tools.py check\npython3 -I ra2_tools.py s4 A RA-A-4.png RA-A-5   # RA-A-4.png: sha256 ${S4.startPicture.sha256}\n# the image tool edits RA-A-5-S4-input.png with RA-A-5-S4-mask.png (alpha 0 = repaint) and the step-4 prompt\npython3 -I ra2_tools.py keep4 A RA-A-4.png RA-A-5-raw.png RA-A-5.png\npython3 -I ra2_tools.py lift4 A RA-A-1.png RA-A-5.png RA-A-5   # RA-A-1.png: sha256 ${S4.stepOnePicture.sha256}\npython3 -I ra2_tools.py frame4 A RA-A-5.png RA-A-5\npython3 -I ra2_tools.py colours A 4 RA-A-5.png RA-A-5`)}
<details><summary>Step 4: the prompt, ${num(P4.chars)} characters · sha256 <code>${P4.sha256.slice(0, 16)}…</code></summary><pre>${esc(P4.text)}</pre><p class="dim">sha256 <code>${P4.sha256}</code>, of the text in UTF-8, as <code>room-a-ra-a-s4-prompt.txt</code> gives it. The colour block is left out: it speaks of a guide, and step 4’s input has none.</p></details>
</section>`;
  S4DRY = `<tr><td>Step 4, with the tool’s version 2: every file and hash, the prompt as the kit gives it, the mask (${pct(D4.maskedShare, 2)}) with its alpha as expected</td><td>${yes(D4.check2 === 'all files and expected hashes match' && D4.promptAsKit && D4.alphaAsExpected)}</td></tr>
<tr><td>Step 4: the kept edit changes nothing more than 4 px outside its mask; the cabinet’s refreshed layer lifts (${num(Object.values(D4.lifted4)[0] ?? 0)} px with the stand-ins); the frame measure runs (x ${D4.frame4.edgeX}, the stand-in’s outline); the colour check passes</td><td>${yes(D4.keptOutsideMax === 0 && !D4.missing4.length && D4.colours4)}</td></tr>`;
  const F4 = [['img/ra-A-place4.png', "step 4's mask (white = repaint)"], ['img/ra-A-split4.png', "step 4's split map: the cabinet's grey, for its refreshed lift"], ['room-a-ra-a-s4.json', "step 4's kit: the files, the prompt, the expected hashes, the start picture by name and hash, the measurements"],
    ['room-a-ra-a-s4-prompt.txt', 'the step-4 prompt, with its sha256'], ['ra2_tools.py', "the tool, version 2: version 1's commands unchanged, with s4, keep4, lift4 and frame4"]];
  S4FILES = `<h3>Step 4’s files, added in version 6</h3>
<p>The files above are version 4’s, unchanged, byte for byte. Step 4 adds these ${F4.length}. <code>ra2_tools.py</code> checks each against <code>room-a-ra-a-s4.json</code> before it uses it, and that file names version 4’s manifest by its sha256.</p>
<div class="scroll wide"><table><thead><tr><th>File</th><th>Bytes</th><th>sha256</th></tr></thead><tbody>${F4.map(([f, what]) => `<tr><td><code>${esc(f)}</code><div class="dim">${esc(what)}</div></td><td class="n">${num(statSync(PUB + f).size)}</td><td class="h"><code>${shaF(PUB + f)}</code></td></tr>`).join('')}</tbody></table></div>`;
  S4NOTE = '<p class="dim">This section is version 4’s check, as the Lead accepted it at 12:59, with both named exceptions accepted as built.</p>';
}
// version 7: step 4 failed twice; the cabinet's right frame drawn in code on RA-A-4 (frame-A.json); version 6's files kept byte for byte
let S7CHANGE = '', S7FACTS = '', S7SECTION = '', S7FILES = '';
if (FR) {
  const C = FR.checks, P = FR.post, T = FR.tries, O = FR.outputs, L = C['layerOverRA-A-1EqualsThePlate'];
  S7CHANGE = `<div class="note"><b>What changed in version 7.</b> Step 4 was tried twice, and both tries failed: ${T.map(t => `${t.name}’s frame edge reads x ${t.frameOuterEdgeX}, ${t.clearPxToTheGrille} px from the grille`).join(', and ')}, where x ${FR.rule.frameOuterEdgeAtMostX} or less was wanted. As the Lead found, without a guide the edit extended the breaker rows into the strip and never drew a frame. So RA-A-4 stays view A’s picture, and the cabinet’s right frame is drawn into it in code, as view C’s dispenser edge was in Room B (the Lead, 13:59). No picture is generated. Version 6’s files are kept byte for byte. Version 7 adds the drawing’s code (<code>frameA.py</code>), its record (<code>frame-A.json</code>) and two review pictures.</div>
<details><summary>What changed in version 6</summary>${S4CHANGE}</details>`;
  S7FACTS = `<div class="facts"><span class="pill ok">Steps 1–3 done: RA-A-3 and RA-A-4 accepted</span><span class="pill no">Step 4: two tries failed (RA-A-5, RA-A-6)</span><span class="pill">The frame drawn in code on RA-A-4</span><span class="pill ok">Outer edge x ${C.outerEdgeByTheFrameRule} · ${C.clearOfTheGrillePx} px from the grille</span><span class="pill ok">The second light whole</span><span class="pill ok">Every check: ${FR.pass ? 'pass' : 'FAIL'}</span></div>`;
  S7SECTION = `<section id="frame">
<h2>The cabinet’s right frame, drawn in code</h2>
<p>RA-A-4 (sha256 <code>${FR.start.sha256}</code>) stays view A’s picture. Code draws the frame into the cabinet: a steel post down its right side that matches the painted left frame, its colours sampled from it. Around the second orange light the post is cut away, so the light stays whole as painted. Outside the new edge, the soft fade that step 2 left is cleaned to the wall’s own paint: RA-A-1’s pixels, the picture the lift starts from.</p>
<div class="pics review">
<figure><img src="img/review/ra-A-frame-cabinet.png" alt="AI-generated picture RA-A-4: the cabinet's right side at three times, before and after its right frame was drawn in code" width="850" height="940" loading="lazy"><figcaption><b>AI-generated (RA-A-4), its frame drawn in code.</b> The cabinet’s right side, 3 times: before and after.</figcaption></figure>
<figure style="max-width: 420px"><img src="img/review/ra-A-frame-402.png" alt="AI-generated picture RA-A-4 with its right frame drawn in code, as the 402 by 742 phone's slice" width="804" height="1166" loading="lazy"><figcaption><b>AI-generated (RA-A-4), its frame drawn in code.</b> 402 × 742, your phone in the app: its 402 × 551 slice, twice its size.</figcaption></figure>
</div>
<h3>The post</h3>
<dl><dt>Where</dt><dd>x ${P.x[0]}–${P.x[1]}, y ${P.y[0]}–${P.y[1]}. The outer edge is at x ${P.x[1]}, ${C.clearOfTheGrillePx} px clear of the grille at x ${FR.rule.grilleEdgeX}; the inner edge is at x ${P.x[0]}, over the cables’ run. ${P.x[1] - P.x[0] + 1} px wide, it is slightly thinner than the left frame. It closes the top bar’s right end at the top and the bottom frame’s corner at its foot.</dd>
<dt>Like the left frame</dt><dd>Mirrored, as measured on RA-A-4: the ink outline outside (rgb ${P.ink.rgb.join(', ')}), on its right, top and bottom, the outer corners rounded at ${P.outerCornersRadius} px; the left frame’s steel blue (rgb ${P.steel.rgb.join(', ')}) with that frame’s own grain, kept away from its stencilled letters; the light top edge (rgb ${P.lightTopEdge.rgb.join(', ')}, row ${P.lightTopEdge.row}); and the darker inner edge (rgb ${P.innerEdge.rgb.join(', ')}, x ${P.innerEdge.x}), with the left frame’s lighter column beside it.</dd>
<dt>Rivets</dt><dd>Three, top, middle and bottom, at y ${P.rivets.centres.map(c => c[1]).join(', ')} (radius ${P.rivets.radius} px), coloured as the left frame’s. The bottom one is level with the left frame’s.</dd>
<dt>The second light</dt><dd>The post is cut away at x ${P.cutForTheLight.x[0]}–${P.cutForTheLight.x[1]}, y ${P.cutForTheLight.y[0]}–${P.cutForTheLight.y[1]}, and keeps only x 535–537 there. The light and its rim, ${num(C.lightPx)} px, are unchanged.</dd>
<dt>The foot</dt><dd>The bottom frame’s ledge (rows ${P.ledge.rows[0]}–${P.ledge.rows[1]}) meets the post’s inner edge. Below it the post stands against the wall, and its inner side takes the ink outline.</dd>
<dt>The wall</dt><dd>x ${FR.wall.x[0]}–${FR.wall.x[1]} on the cabinet’s rows is RA-A-1’s, pixel for pixel. RA-A-4 differed from it there only in rows ${C.wallRowsCleaned[0]}–${C.wallRowsCleaned[1]}, and equals it from x 542.</dd>
<dt>The layer</dt><dd>The cabinet’s step-2 layer gets the same post. Over RA-A-1 it gives the plate exactly, on the post and on the cleaned wall.</dd></dl>
<h3>Checks</h3>
<div class="scroll"><table><tbody>
<tr><td>Only the strip changes: ${num(C.changedPx)} px, x ${C.changedBox[0]}–${C.changedBox[2]}, y ${C.changedBox[1]}–${C.changedBox[3]}. Everything left of x ${P.x[0]}, and right of x ${FR.wall.x[1]}, is RA-A-4’s.</td><td>${yes(C.changedOnlyInTheStrip && C.leftOfThePostUnchanged && C.rightOfTheWallUnchanged && C.wallUnchangedOffTheCabinetRows)}</td></tr>
<tr><td>The second orange light is whole: its ${num(C.lightPx)} px are unchanged.</td><td>${yes(C.lightWhole)}</td></tr>
<tr><td>The 15 px rule, measured as step 4’s <code>frame4</code> measures it: the outer edge at x ${C.outerEdgeByTheFrameRule}, ${C.clearOfTheGrillePx} px clear of the grille (x ${FR.rule.frameOuterEdgeAtMostX} or less wanted).</td><td>${yes(C.outerEdgeByTheFrameRule <= FR.rule.frameOuterEdgeAtMostX && C.clearOfTheGrillePx >= FR.rule.minClearPx)}</td></tr>
<tr><td>The wall outside the post is RA-A-1’s, pixel for pixel.</td><td>${yes(C['wallEqualsRA-A-1'])}</td></tr>
<tr><td>The cabinet’s layer over RA-A-1 gives the plate. The largest difference is ${L.onThePostAndTheCleanedWall} on the post and the cleaned wall, and ${L.inTheWholeStripMax} in the whole strip, where the post’s edges blend.</td><td>${yes(L.onThePostAndTheCleanedWall <= 1)}</td></tr>
</tbody></table></div>
${cmd(`python3 -I frameA.py <records folder>   # reads img/RA-A-4.png, img/RA-A-1.png and img/RA-A-3-C-electrical-cabinet.png there, each by its sha256\n# writes ra-A-4-frame.png (the plate), ra-A-cabinet-frame.png (the cabinet's layer) and frame-A.json`)}
<div class="scroll wide"><table><thead><tr><th>Output</th><th>Pixels sha256</th><th>File sha256, as written here</th></tr></thead><tbody>${Object.entries(O).map(([f, o]) => `<tr><td><code>${esc(f)}</code><div class="dim">${esc(o.what)}</div></td><td class="h"><code>${o.pixelsSha256}</code></td><td class="h"><code>${o.sha256}</code></td></tr>`).join('')}</tbody></table></div>
<p class="dim">${esc(FR.note)}. The plate is not on this page. Once the Lead accepts it, it goes to the room data page and the owner page.</p>
<h3>Step 4’s two tries</h3>
<div class="scroll wide"><table><thead><tr><th>Picture</th><th>Frame edge</th><th>Clear of the grille</th><th>sha256</th></tr></thead><tbody>${T.map(t => `<tr><td>${esc(t.name)}</td><td class="n">x ${t.frameOuterEdgeX}</td><td class="n">${t.clearPxToTheGrille} px</td><td class="h"><code>${t.sha256}</code></td></tr>`).join('')}</tbody></table></div>
<p class="dim">As the image session’s <code>frame4</code> records give them. Both pictures are AI-generated and kept with those records. Neither is used.</p>
</section>`;
  S7FILES = `<h3>The drawn frame’s files, added in version 7</h3>
<p>Version 6’s files above are unchanged, byte for byte. Version 7 adds these two. <code>frameA.py</code> checks <code>room-a-ra-a-s4.json</code>, and each picture it reads, by its sha256.</p>
<div class="scroll wide"><table><thead><tr><th>File</th><th>Bytes</th><th>sha256</th></tr></thead><tbody>${[['frameA.py', 'the frame drawn in code: the post, the cut for the light, the rivets, the wall cleaned to RA-A-1, and the checks'], ['frame-A.json', 'its record: every number and colour, the checks, the two tries and each output’s sha256']].map(([f, what]) => `<tr><td><code>${esc(f)}</code><div class="dim">${esc(what)}</div></td><td class="n">${num(statSync(PUB + f).size)}</td><td class="h"><code>${shaF(PUB + f)}</code></td></tr>`).join('')}</tbody></table></div>`;
}
const html = `<title>Room A sheet RA-A</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600&display=swap">
<style>
:root { --bg: #F2F5F9; --panel: #FFFFFF; --sunk: #E6ECF3; --fg: #14202E; --muted: #536173; --line: #D5DEE8; --accent: #2D609E; --accent-soft: #E1EAF5; --ok: #1D6B45; --ok-soft: #E2F3EA; --no: #9B2C2C; --no-soft: #F9E3E3; --warn: #8A4B0F; --warn-soft: #FBEEDD;
  --f-body: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; --f-head: "Space Grotesk", Inter, system-ui, sans-serif; --f-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0E1520; --panel: #16202E; --sunk: #1C2939; --fg: #E6EDF6; --muted: #9AA9BC; --line: #2A3A50; --accent: #8DB6E4; --accent-soft: #1E3250; --ok: #6FD39E; --ok-soft: #173126; --no: #F29B9B; --no-soft: #3A1C1C; --warn: #F0B072; --warn-soft: #3A2817; color-scheme: dark } }
:root[data-theme="dark"] { --bg: #0E1520; --panel: #16202E; --sunk: #1C2939; --fg: #E6EDF6; --muted: #9AA9BC; --line: #2A3A50; --accent: #8DB6E4; --accent-soft: #1E3250; --ok: #6FD39E; --ok-soft: #173126; --no: #F29B9B; --no-soft: #3A1C1C; --warn: #F0B072; --warn-soft: #3A2817; color-scheme: dark }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--fg); font: 400 15px/1.55 var(--f-body); }
.wrap { max-width: 1060px; margin: 0 auto; padding: 22px 16px 48px; }
h1, h2, h3 { font-family: var(--f-head); font-weight: 600; text-wrap: balance; margin: 0; }
h1 { font-size: 28px; line-height: 1.15; } h2 { font-size: 21px; margin-top: 34px; } h3 { font-size: 16px; margin-top: 18px; }
p { margin: 10px 0 0; } .lede { font-size: 16px; max-width: 70ch; } .dim { color: var(--muted); font-size: 13.5px; }
.status { display: inline-block; margin-top: 12px; padding: 6px 12px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-weight: 600; font-size: 14px; }
.facts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 13px; font-weight: 600; background: var(--sunk); color: var(--fg); }
.pill.ok { background: var(--ok-soft); color: var(--ok); } .pill.no { background: var(--no-soft); color: var(--no); } .pill.warn { background: var(--warn-soft); color: var(--warn); }
section { margin-top: 8px; }
.pics { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-top: 14px; }
.pics.three { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.pics.phones { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); align-items: start; } .pics.review { align-items: start; }
.note ul { margin: 8px 0 0; padding-left: 20px; } .note li { margin-top: 6px; }
figure { margin: 0; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 8px; }
figure img { display: block; width: 100%; height: auto; border-radius: 6px; background: #0B1220; }
figcaption { font-size: 13px; color: var(--muted); margin-top: 6px; }
.step { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin-top: 16px; }
.step h3 { margin-top: 0; }
dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 14px; margin: 12px 0 0; } dt { font-weight: 600; } dd { margin: 0; min-width: 0; }
@media (max-width: 520px) { dl { grid-template-columns: 1fr; } dt { margin-top: 6px; } }
pre { white-space: pre-wrap; overflow-wrap: anywhere; font: 12.5px/1.5 var(--f-mono); background: var(--sunk); border-radius: 8px; padding: 10px 12px; margin: 10px 0 0; }
pre.cmd { background: #0F1724; color: #DCE6F1; white-space: pre; overflow-x: auto; overflow-wrap: normal; }
code { font-family: var(--f-mono); font-size: 12.5px; overflow-wrap: anywhere; }
details { margin-top: 12px; border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; background: var(--panel); }
summary { cursor: pointer; font-weight: 600; font-size: 14px; } summary code { font-weight: 400; }
.scroll { overflow-x: auto; margin-top: 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); }
table { border-collapse: collapse; width: 100%; font-size: 13.5px; font-variant-numeric: tabular-nums; }
th, td { text-align: left; padding: 8px 11px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); background: var(--sunk); }
tr:last-child td { border-bottom: 0; }
td.n { white-space: nowrap; font-family: var(--f-mono); font-size: 12.5px; } td.h code { font-size: 11.5px; }
.mid table { min-width: 620px; } .wide table { min-width: 760px; }
.note { margin-top: 14px; padding: 12px 14px; border-left: 4px solid var(--accent); background: var(--accent-soft); border-radius: 0 8px 8px 0; }
.foot { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 13.5px; color: var(--muted); }
</style>
<div class="wrap">
<header>
<h1>Sheet RA-A · Room A, view A</h1>
<span class="status">${FR ? 'Version 7 · step 4 failed twice, so the cabinet’s right frame is drawn in code on RA-A-4 · for the Lead’s review' : S4 ? 'Version 6 · step 4, a fix of the cabinet’s right side over RA-A-4 · for the Lead’s go' : 'Version 4 · the Lead’s 15 px rule against RA-A-1 · for the Lead’s review of steps 2 and 3'}</span>
<p class="lede">Room A’s first picture sheet: view A, from Vega’s place, painted the way Room B’s views were. Three pictures in three steps: the empty room, its furniture, then the food capsule. No people are painted, because code draws them. Every picture made from this sheet is AI-generated and recorded as such. Your reference pictures are never inputs: the only inputs are the code-drawn guides and masks on this page, and the pictures its own steps keep.</p>
${FR ? S7CHANGE : S4 ? S4CHANGE : CHANGE}
${FR ? S7FACTS : S4 ? S4FACTS : `<div class="facts"><span class="pill ok">15 px rule: ${clean} of ${tested.length} pass</span><span class="pill warn">${FT.exceptions.length} exceptions for your decision</span><span class="pill ok">Lid and cabinet ${LC.tightPx} px apart</span><span class="pill">3 pictures planned · at most 6</span><span class="pill">Cap: under $5 for Room A</span><span class="pill">Camera report v2</span><span class="pill ok">Dry run: every step matches its manifest</span><span class="pill ok">Colour check: the guides pass</span></div>`}
</header>
${S7SECTION}
${S4SECTION}

<section id="ra-a-1">
<h2>Checked against RA-A-1</h2>
${S4NOTE}
<p>RA-A-1 is step 1’s picture, made by the image tool and recorded as AI-generated. These review overlays draw this version’s masks over it. Gold is step 2’s mask edge. Orange is step 3’s. The pale blue tint is the plain-wall area. Green outlines are painted features covered by a mask, cyan ones are clear of it, and magenta ones carry a named exception. White dots are features noted but not tested (pipes and the rail), and pink boxes are the four small lights. The overlays are for review only: never an input, never an asset.</p>
<div class="pics review">
${REVIEW.map(([f, what]) => `<figure><img src="img/review/${f}" alt="AI-generated picture RA-A-1 with sheet RA-A version ${M.version}'s mask edges and feature outlines drawn over it: ${what.toLowerCase()}" loading="lazy"><figcaption><b>AI-generated (RA-A-1), review overlay.</b> ${what}.</figcaption></figure>`).join('\n')}
</div>
<h3>At the three phones</h3>
<div class="pics phones">
${[[390, 844], [402, 742], [430, 932]].map(([w, h]) => { const st = sl[`${w}x${h}`].stage; return `<figure style="max-width: ${st[0] + 18}px"><img src="img/review/ra-A-review-${w}.png" alt="AI-generated picture RA-A-1 with the masks drawn over it, as the ${w} by ${h} phone's slice" width="${2 * st[0]}" height="${2 * st[1]}" loading="lazy"><figcaption><b>AI-generated (RA-A-1), review overlay.</b> ${w} × ${h}${w === 402 ? ', your phone in the app' : ''}: its ${st[0]} × ${st[1]} px slice.</figcaption></figure>`; }).join('\n')}
</div>
<h3>The 15 px rule</h3>
<p>${esc(FT.rule)} Each feature was measured on RA-A-1 (<code>featuresA.json</code>). Features covered by step 2’s mask are repainted there, so step 3 meets plain wall.</p>
<div class="scroll wide"><table><thead><tr><th>Painted feature</th><th>Kind</th><th>Step 2’s mask</th><th>Step 3’s mask</th><th>Result</th></tr></thead><tbody>${featRows}</tbody></table></div>
${exNotes}
<h3>Every piece against every feature</h3>
<p>Each piece’s own area, measured against each painted feature within ${FT.atLeastPx} px of it. A star marks a feature noted but not on your list. The plain-wall patch sits just above the papers and covers them only together with the cabinet below it, so its own small gaps to them do not count: together they cover the clip with ${gp(F('papers: clip').step2)} px to spare and the large sheet with ${gp(F('papers: large sheet').step2)} px, as the table above gives.</p>
<div class="scroll wide"><table><thead><tr><th>Piece</th><th>Gaps to the painted features near it</th></tr></thead><tbody>${pairRows}</tbody></table></div>
<p class="dim">Noted, not on your list: the rail above the lockers is ${gp(F('rail above the lockers').step2)} px from the plain wall’s top edge, as only 12 to 14 px of plain wall separate it from the lockers. The patch above the cabinet passes ${gp(F('riveted plate and ledge').step2)} px under the riveted plate’s ledge. The cabinet’s foot crosses the small square panel, whose lower part stays in view below it. Everything else is at least ${FT.minClearPx} px from every edge.</p>
<h3>The four small lights</h3>
<p>For the Motion builder, if it wants a soft glow in code: ${FT.lights.map(l => `${esc(l.name)} at x ${l.box[0]}–${l.box[2]}, y ${l.box[1]}–${l.box[3]}`).join('; ')} (painting pixels). None is inside a mask: the nearest is ${Math.min(...FT.lights.map(l => l.step2ClearPx))} px from step 2’s.</p>
</section>

<section id="picture">
<h2>The picture</h2>
<p>As Room B’s PV6 views: 1024 × 1536, straight lines, ${M.camera.acrossDeg}° across (focal ${M.camera.focalPx} px), level, the horizon ${M.camera.horizonY} px from the top. The camera is at Vega’s place by the north wall, at eye height (${M.camera.eyeM} m), facing ${M.camera.yawCompass}° (south-east). Each phone’s 70° slice, 5° down, is a centred crop of the painting, so one picture serves all three phones. The ceiling is solid, as you approved: the two light bars, and no window in this view. The east wall is the back wall and the south wall is on the right.</p>
<div class="pics">
<figure><img src="img/ra-A-empty.png" alt="Step 1's guide: Room A's empty room from Vega's place, in its blue-steel colour plan, the two warm light bars across the ceiling" width="1024" height="1536" loading="lazy"><figcaption>Step 1’s input: the empty room, Room A’s colour plan.</figcaption></figure>
<figure><img src="img/ra-A-guide.png" alt="The guide with the furniture: the electrical cabinet and the capsule on the back wall, the open hatch, its lid and the toolbox on the deck" width="1024" height="1536" loading="lazy"><figcaption>With the furniture and the capsule: where steps 2 and 3 paint.</figcaption></figure>
<figure><img src="img/ra-A-empty-annotated.png" alt="The annotated guide: the horizon, the three phones' slices, the furniture's outlines and the people's stand-ins at their spots" width="1024" height="1536" loading="lazy"><figcaption>For checking: the horizon, the three phones’ slices, the outlines, and where the people stand (stand-ins, never painted).</figcaption></figure>
</div>
<h3>What each phone shows</h3>
<div class="pics three">
${[[390, 844], [430, 932], [402, 742]].map(([w, h]) => { const s = sl[`${w}x${h}`]; return `<figure><img src="img/ra-A-phone-${w}.png" alt="What the ${w} by ${h} phone shows of the guide" width="${s.stage[0]}" height="${s.stage[1]}" loading="lazy"><figcaption>${w} × ${h}${w === 402 ? ', your phone in the app' : ''}: the room’s ${s.stage[0]} × ${s.stage[1]} px, from x ${Math.round(s.paintingRect[0])}–${Math.round(s.paintingRect[2])}, y ${Math.round(s.paintingRect[1])}–${Math.round(s.paintingRect[3])} of the painting.</figcaption></figure>`; }).join('\n')}
</div>
</section>

<section id="steps">
<h2>The three steps</h2>
<p>The image session names each picture <code>RA-A-1</code>, <code>RA-A-2</code> and so on in the order it makes them, as Room B’s are named. The Lead gives each step’s go, naming this sheet’s version and hashes, and accepts each picture before the next step starts. All commands run from the sheet’s folder with NumPy and Pillow, and the tool stops if any file is not the sheet’s.</p>
<div class="step">
<h3>Step 1 · the empty room</h3>
<dl><dt>Input</dt><dd><code>${V.files.empty.published}</code>, with no mask and no second picture</dd><dt>Size</dt><dd>1024 × 1536, one picture</dd><dt>Check</dt><dd>The colour check with the empty room’s map, and the lines against the annotated guide: the horizon at ${M.camera.horizonY}, every vertical upright, the corner and floor seams where the guide puts them</dd></dl>
${cmd(`python3 -I ra1_tools.py check\npython3 -I ra1_tools.py s1 A RA-A-1\npython3 -I ra1_tools.py colours A 1 RA-A-1.png RA-A-1`)}
${promptBlock('s1', 'Step 1')}
</div>
<div class="step">
<h3>Step 2 · the furniture</h3>
<p>One masked PLACE edit of RA-A-1, the step-1 picture, inside the furniture’s outlines grown 6 px and the plain-wall area (${pct(V.expected.s2.maskedShare)} of the picture, in ${KIT.shapes.length} areas). The input shows the step-2 guide there: the furniture without the capsule, and the wall’s colour plan where the plain wall goes. The kept edit is lifted into one layer a piece, for the people’s depth.</p>
<div class="pics three">
<figure><img src="img/ra-A-guide-s2.png" alt="Step 2's guide: the furniture without the capsule" width="1024" height="1536" loading="lazy"><figcaption>The step-2 guide, shown inside the mask.</figcaption></figure>
<figure><img src="img/ra-A-place.png" alt="Step 2's PLACE mask, white where the edit repaints" width="1024" height="1536" loading="lazy"><figcaption>The PLACE mask: white = repaint.</figcaption></figure>
<figure><img src="img/ra-A-split.png" alt="Step 2's split map: one grey for each piece" width="1024" height="1536" loading="lazy"><figcaption>The split map: one grey a piece.</figcaption></figure>
</div>
<div class="scroll wide"><table><thead><tr><th>Piece</th><th>Grey</th><th>Outline px</th><th>Lifted in the dry run</th><th>Why it is its own piece</th></tr></thead><tbody>${pieceRows}</tbody></table></div>
${cmd(`python3 -I ra1_tools.py s2 A RA-A-1.png RA-A-2   # RA-A-1.png: sha256 ${M.startPicture.sha256}\n# the image tool edits RA-A-2-S2-input.png with RA-A-2-S2-mask.png (alpha 0 = repaint) and the step-2 prompt\npython3 -I ra1_tools.py keep A RA-A-1.png RA-A-2-raw.png RA-A-2.png\npython3 -I ra1_tools.py lift A RA-A-1.png RA-A-2.png RA-A-2\npython3 -I ra1_tools.py colours A 2 RA-A-2.png RA-A-2`)}
${promptBlock('s2', 'Step 2')}
</div>
<div class="step">
<h3>Step 3 · the food capsule</h3>
<p>One masked edit of the kept step-2 picture, inside the capsule’s outline grown 2 px (${pct(V.expected.s3.maskedShare, 2)} of the picture), with no furniture in it. The input shows the guide there. The capsule is Room A’s wall unit on its bracket, on the east wall 1 m north of its middle, 1.0 to 1.55 m up, with the front Room B’s unit was painted with, so the ship’s dispensers match. It is painted closed and unlit. Code draws its open hatch, its compartment, the tray, its light and the shutter over it, as in Room B.</p>
<div class="pics three">
<figure><img src="img/ra-A-place3.png" alt="Step 3's mask: the capsule's outline grown 2 pixels" width="1024" height="1536" loading="lazy"><figcaption>Step 3’s mask: white = repaint.</figcaption></figure>
<figure><img src="img/ra-A-split3.png" alt="Step 3's split map: the capsule's grey" width="1024" height="1536" loading="lazy"><figcaption>The capsule’s own layer: ${num(DRY.lifted3['wall food capsule'] ?? 0)} px in the dry run.</figcaption></figure>
</div>
${cmd(`python3 -I ra1_tools.py s3 A RA-A-2.png RA-A-3\n# the image tool edits RA-A-3-S3-input.png with RA-A-3-S3-mask.png (alpha 0 = repaint) and the step-3 prompt\npython3 -I ra1_tools.py keep3 A RA-A-2.png RA-A-3-raw.png RA-A-3.png\npython3 -I ra1_tools.py lift3 A RA-A-2.png RA-A-3.png RA-A-3\npython3 -I ra1_tools.py colours A 3 RA-A-3.png RA-A-3`)}
${promptBlock('s3', 'Step 3')}
</div>
</section>

<section id="checks">
<h2>Checks on this sheet</h2>
<h3>The dry run</h3>
<p>Every command of the tool, once, on the sheet’s own published files, with the code-drawn guides standing in for the image tool’s pictures. This shows that the files, the masks, the prompts and the lift agree with the manifest. It says nothing about a real picture.</p>
<div class="scroll"><table><tbody>
<tr><td>Every file and expected hash</td><td>${yes(DRY.check === 'all files and expected hashes match')}</td></tr>
<tr><td>The three prompts as the manifest gives them</td><td>${yes(Object.values(DRY.promptsAsManifest).every(Boolean))}</td></tr>
<tr><td>Step 2’s mask: ${pct(DRY.s2.maskedShare, 2)}, alpha as expected</td><td>${yes(DRY.s2.alphaAsExpected)}</td></tr>
<tr><td>Step 3’s mask: ${pct(DRY.s3.maskedShare, 2)}, alpha as expected</td><td>${yes(DRY.s3.alphaAsExpected)}</td></tr>
<tr><td>A kept edit changes nothing more than 4 px outside its mask (steps 2 and 3)</td><td>${yes(DRY.s2.keptOutsideMax === 0 && DRY.s3.keptOutsideMax === 0)}</td></tr>
<tr><td>The lift: ${Object.keys(DRY.lifted).length} pieces in step 2 and the capsule in step 3. The plain wall lifts nothing here, as expected: the stand-ins are the same there.</td><td>${yes(JSON.stringify(DRY.missing) === JSON.stringify(DRY.missingExpected) && DRY.missingExpected.length === 1 && !DRY.missing3.length)}</td></tr>
<tr><td>The colour check on steps 1, 2 and 3</td><td>${yes(Object.values(DRY.colours).every(Boolean))}</td></tr>
${S4DRY}
</tbody></table></div>
<h3>The colour check, version 1 for Room A</h3>
<p>Room B’s colour check, version 4, with Room A’s blue steel in place of Room B’s violet. The base band is ${CAL.empty.hueBand[0]}–${CAL.empty.hueBand[1]}° (OKLCH), the tokens’ 248.5–260.3° with 15° either side. Room B’s warm light and wear are kept, and one gate is new: no purple, which is Room B’s colour. The guides pass every gate. Room B’s own empty-room guide, put through it, fails ${Object.values(CAL.roomB.result).filter(v => !v).length} of them, so it tells the two rooms apart.</p>
<div class="scroll wide"><table><thead><tr><th>Gate</th><th>What it asks</th><th>Empty guide</th><th>Guide</th><th>Room B’s guide</th></tr></thead><tbody>${gateRows}</tbody></table></div>
</section>

<section id="files">
<h2>Everything the image session receives</h2>
<p>${RECEIVES.length} files, by their path on this page. The tool checks each one against the manifest before it uses it. Pass these names and hashes on with the go.</p>
<div class="scroll wide"><table><thead><tr><th>File</th><th>Bytes</th><th>sha256</th></tr></thead><tbody>${hashRows}</tbody></table></div>
${S4FILES}${S7FILES}
<p class="dim">For this page only, and not received by the image session: the three phone crops (<code>img/ra-A-phone-390.png</code>, <code>-430</code>, <code>-402</code>), the ${FR ? 'nine review pictures' : S4 ? 'seven review overlays' : 'five review overlays'} (<code>img/review/</code>, AI-generated), and the test’s data (<code>featuresA.json</code>, <code>plainA.json</code>):</p>
<div class="scroll wide"><table><thead><tr><th>File</th><th>Bytes</th><th>sha256</th></tr></thead><tbody>${REVIEWFILES}</tbody></table></div>
</section>

<section id="spend">
<h2>Spend and order</h2>
<p>View A’s three pictures, and up to three re-runs: at most 6 pictures, about $0.37 at Room B’s average of $0.062 a picture. The cap is under $5 for all of Room A, as you set it on 19 November. The Lead gives each step’s go. View A goes to you before anything else in Room A is painted, and the work stops and asks before it would pass the cap.${FR ? ' Steps 1 to 3 are done: four pictures, about $0.23 (the Lead, 13:20). Step 4 was tried twice (RA-A-5 and RA-A-6), about $0.06 each at Room B’s average. Drawing the frame in code costs nothing.' : S4 ? ' Steps 1 to 3 are done: four pictures, about $0.23 (the Lead, 13:20). Step 4 is one edit, about $0.06, over RA-A-4, on the Lead’s go.' : ''}</p>
<div class="note"><b>Rules.</b> ${M.rules.map(esc).join(' ')}</div>
</section>

<footer class="foot">
<p>The five review overlays of version 4 are RA-A-1, a picture the image tool made, with this sheet’s masks drawn over it by code${S4 ? '; the two of step 4 are RA-A-4, also made by the image tool, with step 4’s mask drawn over it' : ''}${FR ? '; the two of version 7 are RA-A-4 before and after its right frame was drawn in code' : ''}. They are labelled AI-generated on the picture and in their captions. Every other picture on this page is drawn by code: the guides, masks, maps and phone crops, made from the approved Room A plan (version 1795050100-be2f) and your layout file, read unchanged (sha256 <code>36edd4c7…</code>). Your go is recorded in <code>docs/design/owner-decisions.md</code> (ab849d40).</p>
<p>${FR ? `Sheet RA-A, version 7, ${FR.date}. Version 4’s manifest, unchanged: sha256 <code>${DRY.manifestSha256}</code>. Step 4’s kit, unchanged: sha256 <code>${shaF(DIR + 'room-a-ra-a-s4.json')}</code>. The drawn frame’s record: sha256 <code>${shaF(PUB + 'frame-A.json')}</code>. Version 1 was 1795086808-585b, version 2 1795087851-aa86, version 3 1795091212-4d99, version 4 1795092955-447e (restored as 1795094570-9e36), version 5 1795094103-c6d4 and 1795094212-bc2a (published in error; no picture was made from it), version 6 1795096306-1df9.` : S4 ? `Sheet RA-A, version 6, ${S4.date}. Version 4’s manifest, unchanged: sha256 <code>${DRY.manifestSha256}</code>. Step 4’s kit: sha256 <code>${shaF(DIR + 'room-a-ra-a-s4.json')}</code>. Version 1 was 1795086808-585b, version 2 1795087851-aa86, version 3 1795091212-4d99, version 4 1795092955-447e (restored as 1795094570-9e36), version 5 1795094103-c6d4 and 1795094212-bc2a (published in error; no picture was made from it).` : `Sheet RA-A, version 4, ${M.date}. Manifest sha256 <code>${DRY.manifestSha256}</code>. Version 1 was 1795086808-585b, version 2 1795087851-aa86, version 3 1795091212-4d99.`}</p>
</footer>
</div>`;
writeFileSync(DIR + 'sheet-ra-a.html', html); copyFileSync(DIR + 'sheet-ra-a.html', PUB + 'sheet-ra-a.html');
console.log('sheet-ra-a.html', html.length, 'chars;', RECEIVES.length, 'files the image session receives');
