// Sheet RA-D version 2.1's own parts of the page (sheetD.mjs imports v3-D.mjs where it exists): step 2 held, RA-D-3x (RA-D-1 with
// RA-D-3's desk and cabinet, completed in code: compositeD3x.py, composite-D3x.json) and step 2b, the hatch, its lid and the toolbox on
// RA-D-3x (kitD2b.py, kit-D2b.json; the prompt in promptsD.mjs; the tool's version 2), with the review pictures (reviewD3x.py's
// review-D3x.json), each labelled as AI-generated in itself and in its caption. Copies the review pictures into pub/img; the evidence
// files are staged by buildD.mjs. Version 2's files are kept byte for byte.
import { copyFileSync, statSync } from 'fs';
import { v23 } from './v23-D.mjs';
import { v24 } from './v24-D.mjs';
export function v3({ M, J, esc, curly, num, yes, shaF, DIR, PUB, DRY }) {
  const C = J('composite-D3x.json'), K2 = J('kit-D2b.json'), S2 = J('step2-D.json'), SCR = J('screens-D.json'), RS = J('review-D3x.json'), V = M.kit.views.D;
  const V22 = M.version >= 2.2, C22 = V22 ? M.changes.find(c => c.version === 2.2) : null;
  if (![2.1, 2.2, 2.3, 2.4].includes(M.version) || !C.pass || C.checks.changedOutsideTheAreasAndTheCompletions !== 0 || !C.checks.keepRebuiltExactly)
    throw new Error('version 2.1 needs a passing RA-D-3x');
  if (!C.checks['hatchAreaEqualsRA-D-1'] || !K2.featureTest.passed || !DRY.s2b || !DRY.s2b.alphaAsExpected || DRY.missing2b.length) throw new Error('step 2b does not pass its checks');
  const REVIEW = Object.keys(RS);
  for (const f of REVIEW) copyFileSync(DIR + f, PUB + `img/${f}`);
  const fig = (f, alt, cap) => `<figure><img src="img/${f}" alt="${esc(alt)}" width="${RS[f][0]}" height="${RS[f][1]}" loading="lazy"><figcaption>${cap}</figcaption></figure>`;
  const pct = (x, d = 2) => `${(100 * x).toFixed(d)}%`, base = V.expected.s2b.basePixels, CH = M.changes.find(c => c.version === 2.1), PD = CH.prompt.place;   // the prompt's diff is version 2.1's (2.2 keeps the prompt)
  const P = k => C.pieces.find(p => p.key === k), WR = C.whichRun, CK = C.checks, CC = K2['colourCheckOnRA-D-3x'];
  const PN = { cabinet: 'The cabinet’s frame, all round', monitor: 'The right monitor’s right bezel', 'desk-end': 'The desk top’s right end, with its leg' };
  const pieceRows = C.pieces.map(p => `<tr><td>${PN[p.key]}</td><td class="n">${num(p.checks.changedPxAgainstTheKeep)}</td><td class="n">${num(p.checks.outsideTheMask)}</td><td>${p.checks.closesOnItsOwnInk ? 'on its own ink' : `${p.checks.closingPathMinDepthPx.toFixed(1)} px inside the mask`}</td><td>x ${p.checks.changedBox[0]}–${p.checks.changedBox[2]}, y ${p.checks.changedBox[1]}–${p.checks.changedBox[3]}</td></tr>`).join('');
  const PNAME = { toolbox: 'Toolbox', 'floor hatch': 'Floor hatch', 'hatch lid': 'Hatch lid' };
  const areaRows = K2.pieces.map(p => `<tr><td>${PNAME[p.name]}</td><td class="n">${p.grey}</td><td class="n">${num(p.outlinePx)}</td><td class="n">${num(p.outlinePxInTheMask)}</td><td class="n">${num(p.areaPx)}</td><td class="n">${num(DRY.lifted2b[`${p.place} ${p.name}`] ?? 0)}</td></tr>`).join('');
  const nExc = K2.featureTest.exceptions.reduce((n, e) => n + e.parts.length, 0);
  const excTxt = K2.featureTest.exceptions.map(e => `${esc(curly(e.name))} (${esc(curly(e.parts.map(p => p.where).join('; ')))})`).join('; ');
  const li = a => a.map(s => `<li>${esc(curly(s))}</li>`).join('');
  const lt = K2.clearPx.lights, ltMin = Math.min(...Object.values(lt));
  const cmds = `# RA-D-3x, step 2b’s start picture, rebuilt from the image session’s records (img/RA-D-1.png, img/RA-D-3.png and
# img/RA-D-3-raw.png there, each checked by its sha256); it stops unless its pixels are RA-D-3x’s
python3 -I compositeD3x.py <records folder>
N=…   # the step-2b picture’s name, as the image session gives it
python3 -I rd1_tools.py s2b D ra-D-3x.png $N
# the image tool edits $N-S2b-input.png with $N-S2b-mask.png (alpha 0 = repaint) and the step-2b prompt
python3 -I rd1_tools.py keep2b D ra-D-3x.png $N-raw.png $N.png
python3 -I rd1_tools.py lift2b D ra-D-3x.png $N.png $N
python3 -I rd1_tools.py colours D 2b $N.png $N`;
  const held = S2.result.slice(S2.result.indexOf(': ') + 2);
  const note = `<div class="note"><b>Version 2.1, from the Lead’s review of RA-D-3 and RA-D-3b, 27 November (21:03).</b> ${esc(curly(held[0].toUpperCase() + held.slice(1)))}. One more go, with a hatch-only step 2b on a new base:<ul>
<li><b>RA-D-3x, the base.</b> RA-D-1 with RA-D-3’s desk and cabinet (RA-D-3 is the better run for both), completed in code from its raw where the keep cut them, its two screens fitted to the painted black and gated; the hatch’s area left as RA-D-1’s empty deck. <a href="#ra-d-3x">Below</a>.</li>
<li><b>Step 2b’s mask.</b> The hatch and its lid as one area, the toolbox as its own, ${K2.gapPx.grown} px of RA-D-3x’s painted deck between them; the selective 12 px growth on both; the desk and the cabinet not masked: ${pct(V.expected.s2b.maskedShare)} of the picture. <a href="#step2b">Below</a>.</li>
<li><b>Step 2b’s prompt.</b> Step 2’s, with its hatch, lid and toolbox sentence word for word; the desk’s and the cabinet’s sentences dropped; four sentences new, to hold the size and the place. <a href="#step2b-prompt">The lines changed</a>.</li>
<li><b>The tool, version 2,</b> adds step 2b’s commands, which stop unless their start picture is RA-D-3x, pixel for pixel; and <b>step 2b’s colour map</b> has the screens where RA-D-3x paints them.</li>
<li><b>The feet’s wall-foot reading</b> stays in the measuring script as a switch, off, as the Lead asked: on, it gives Vega +1.7, Echo −1.4 and Lyra +18.1 px, the wall’s-foot column of version 2’s table. The feet are unchanged.</li>
<li><b>Files.</b> New: <code>img/ra-D-place2b.png</code>, <code>img/ra-D-split2b.png</code>, <code>img/ra-D-regions2b.png</code>, <code>compositeD3x.py</code> and its record, <code>screens-D.json</code>, <code>kit-D2b.json</code> and <code>step2-D.json</code>. Every version-2 file and prompt is unchanged, byte for byte; the manifest adds step 2b and puts version 2’s change after version 2.1’s, unchanged.</li></ul></div>`;
  const section = `<section id="step2b-all">
<h2>Version 2.1 · step 2 held; step 2b on RA-D-3x</h2>
<p>Step 2’s two runs, ${S2.runs.map(r => `${esc(r.name)} (sha256 <code>${r.sha256.slice(0, 12)}…</code>)`).join(' and ')}, were made on version 2 (${esc(S2.madeOn.match(/\(([^;]+);/)[1])}). ${esc(curly(S2.result[0].toUpperCase() + S2.result.slice(1)))}. The Lead’s decision: ${esc(curly(S2.decision.replace(/^the Lead, 27 November 2026, 21:03: /, '')))}</p>
<h3 id="ra-d-3x">RA-D-3x, the base</h3>
<p><b>Which run, and why.</b> RA-D-3 for both areas. The cabinet: ${esc(curly(WR.why.cabinet))}. The desk: ${esc(curly(WR.why.desk))}. And ${esc(curly(WR.why.both))}.</p>
<p><b>How.</b> ${esc(curly(C.codeComposite.how))}. The trim in front of the desk is ${num(C.trim.px)} px of open deck, left as RA-D-1’s: on its ${num(C.trim.sliverPx)} px where RA-D-3 differs most from RA-D-1, the largest difference falls from ${C.trim['sliverMaxLevelsFromRA-D-1']['inRA-D-3']} levels to ${C.trim['sliverMaxLevelsFromRA-D-1']['inRA-D-3x']}. The outlines were read on the raw (${esc(curly(C.tracing))}).</p>
<div class="facts"><span class="pill ok">RA-D-3 rebuilt from RA-D-1 and its raw: exact</span><span class="pill ok">Changed against RA-D-1: ${num(CK['changedPxAgainstRA-D-1'])} px, none outside the two areas and the completions</span><span class="pill ok">The hatch’s area: RA-D-1’s, pixel for pixel</span><span class="pill ok">The raw taken whole inside the outlines</span><span class="pill ok">Closing paths at least ${CK.closingPathMinDepthPx} px inside the mask, where the keep equals the raw</span></div>
<div class="scroll wide"><table><thead><tr><th>Completed</th><th>Changed px</th><th>Past the mask</th><th>Where it closes</th><th>Where</th></tr></thead><tbody>${pieceRows}</tbody></table></div>
<p><b>The screens.</b> Painted flat black in the raw, both fitted to the black, as views B’s and C’s were, and gated (${esc(curly(SCR.gate))}): ${SCR.screens.map(s => `the ${esc(s.name)} ${num(s.px)} px, p95 lightness ${s.p95L}`).join('; ')}. They are not where step 2’s map draws them, so step 2b’s colour map (<code>img/ra-D-regions2b.png</code>) is step 2’s with these two screens in place of the map’s (${num(K2.regions2b.mapScreensPx)} px out, ${num(K2.regions2b.paintedScreensPx)} in). On RA-D-3x itself the colour check passes every gate with that map (the openings’ p95 lightness ${CC.map2b.openings.p95L}); with step 2’s map it fails one, the openings (${CC.map2.openings.p95L}). <code>screens-D.json</code> is view D’s live-screen region, as <code>screens-C.json</code> is view C’s.</p>
<p>The pictures below show RA-D-3, the two runs’ raw edits and RA-D-3x, all AI-generated (RA-D-3x a code composite of AI-generated pictures); each is labelled in itself and in its caption, and none is an input, an asset or a commit.</p>
<div class="pics">
${fig('ra-D-3x-runs.png', 'AI-generated pictures: the raw edits of RA-D-3 and RA-D-3b at the desk and at the cabinet, with step 2’s mask', 'AI-generated pictures: the two runs’ raw edits with step 2’s mask (white), at the desk and at the cabinet: which run, and why.')}
${fig('ra-D-3x-cabinet.png', 'AI-generated pictures RA-D-3 and RA-D-3x: the cabinet, before, after, and with the traced outline', 'AI-generated pictures: the cabinet at 2×, before (RA-D-3), after (RA-D-3x) and with its traced outline (cyan).')}
${fig('ra-D-3x-desk.png', 'AI-generated pictures RA-D-3 and RA-D-3x: the right monitor’s bezel and the desk’s right end, before, after, and with the traced outlines', 'AI-generated pictures: the right monitor’s bezel and the desk’s right end at 2×, before, after and with the traced outlines (cyan; orange dashes where they close inside the mask).')}
${fig('ra-D-3x-screens.png', 'AI-generated picture RA-D-3x: the two screens, with their fitted outlines and the step-2 map’s screens', 'AI-generated picture RA-D-3x: the two screens at 3×, fitted (green); the step-2 map’s screens (magenta).')}
${fig('ra-D-3x-changed.png', 'AI-generated picture RA-D-3x dimmed, every pixel that differs from RA-D-1 lit', `AI-generated picture RA-D-3x, dimmed: every pixel that differs from RA-D-1 (${num(CK['changedPxAgainstRA-D-1'])}) lit, the desk’s area cyan, the cabinet’s green, the completions past the mask orange; the trim dashed yellow.`)}
</div>
<p>RA-D-3x itself, <code>ra-D-3x.png</code>, is not published here, being an AI-generated picture without a label of its own: <code>compositeD3x.py</code> makes it from the image session’s records, and stops unless its pixels’ sha256 is <code>${base}</code>.</p>

<h3 id="step2b">Step 2b · the hatch, its lid and the toolbox</h3>
<p>One masked edit of RA-D-3x in two areas: the hatch and its lid as one, the toolbox as its own. The input shows the step-2 guide there; the desk and the cabinet, already painted, are not masked. ${esc(curly(K2.rule.toolboxArea[0].toUpperCase() + K2.rule.toolboxArea.slice(1)))}; ${esc(curly(K2.rule.hatchArea))}. ${K2.growth.on ? `Then ${esc(curly(K2.rule.growth))}: +${num(K2.growth.addedPx)} px, ${pct(K2.growth.maskedShareBefore)} → ${pct(K2.growth.maskedShareAfter)} of the picture, the two areas still ${K2.gapPx.grown} px apart.` : `No growth: it is off for step 2b, on both areas (the Lead, 22:29), so each area is its outline plus 6 px, ${pct(K2.growth.maskedShareAfter)} of the picture, the two areas ${K2.gapPx.grown} px apart. Version 2.1 had the selective 12 px growth, ${pct(C22.expected.s2b.v21.maskedShare)} of the picture.`} Where the toolbox stands in front of the hatch’s near-left end their outlines touch, so the strip between the areas is cut from the hatch’s side: ${num(K2.hatchOutlineLeftOut.px)} of the hatch’s ${num(K2.hatchOutlineLeftOut.of)} outline px (x ${K2.hatchOutlineLeftOut.bbox[0]}–${K2.hatchOutlineLeftOut.bbox[2]}) keep RA-D-3x’s painted deck.</p>
<div class="facts"><span class="pill">Mask ${pct(V.expected.s2b.maskedShare)}: the toolbox ${num(K2.areas[0].px)} px, the hatch and lid ${num(K2.areas[1].px)} px</span><span class="pill ok">${K2.gapPx.grown} px apart</span><span class="pill ok">Inside step 2’s mask</span><span class="pill ok">15 px rule: passed, ${nExc} exceptions, all accepted on 20:57</span><span class="pill ok">${K2.clearPx.paintedDeskAndCabinet} px clear of the painted desk and cabinet</span><span class="pill ok">Window ${K2.clearPx['window frame (as drawn)']} px, capsule ${K2.clearPx.step3Capsule} px, lights ${ltMin} px clear</span></div>
<div class="scroll wide"><table><thead><tr><th>Piece</th><th>Grey</th><th>Outline px</th><th>In the mask</th><th>Its area px</th><th>Lifted in the dry run</th></tr></thead><tbody>${areaRows}</tbody></table></div>
<p><b>The 15 px rule</b> on step 2b’s mask, against RA-D-1’s traced features: passed. The ${nExc} named exceptions it uses are among the eight the Lead accepted for step 2: ${excTxt}. The mask is ${K2.clearPx.paintedDeskAndCabinet} px from RA-D-3x’s painted desk and cabinet, ${K2.clearPx['window frame (as drawn)']} px from the window’s frame, ${K2.clearPx.step3Capsule} px from step 3’s capsule and at least ${ltMin} px from both indicator dots.</p>
<p><b>What the prompt can point at, measured on RA-D-1’s painted deck</b> (<code>measure-D2.json</code>’s lines): the hatch’s near end lies ${K2.seams.nearEndPastSeamX0Px.join(' and ')} px past the painted seam the toolbox stands on (x = 0), at its two corners, and its far end, the lid’s hinge, ${K2.seams.farEndPastSeamX1Px.join(' and ')} px past the next (x = 1): one deck plate long, as the room has it (x 0.13 to 1.13 m). The two painted seams under the toolbox cross at (${K2.crossing.painted.join(', ')}), inside its outline. No painted seam runs along the hatch’s near long rim: the nearest, z = 0, is 0.65 m nearer and outside the area, and z = 1 runs under the opening, 0.15 m from its far rim. So the size and place lines anchor the hatch’s two ends, and the toolbox to the crossing.</p>
<div class="pics">
${fig('ra-D-3x-step2b.png', 'AI-generated picture RA-D-3x with step 2b’s two areas and the pieces’ planned outlines', 'AI-generated picture RA-D-3x, with step 2b’s mask: the toolbox’s area (magenta); the hatch’s and the lid’s one area (cyan and gold); dashed, the planned outlines.')}
${fig('ra-D-3x-step2b-zoom.png', 'AI-generated picture RA-D-3x at twice, with step 2b’s areas, and the input the image tool receives', 'AI-generated picture RA-D-3x at 2×: step 2b’s two areas, and the input the image tool receives, the step-2 guide inside the mask.')}
</div>
<div class="pics three">
<figure><img src="img/ra-D-place2b.png" alt="Step 2b's mask, white where the edit repaints" width="1024" height="1536" loading="lazy"><figcaption>Step 2b’s mask: white = repaint.</figcaption></figure>
<figure><img src="img/ra-D-split2b.png" alt="Step 2b's split map: one grey for each piece" width="1024" height="1536" loading="lazy"><figcaption>Step 2b’s split map: one grey a piece.</figcaption></figure>
<figure><img src="img/ra-D-regions2b.png" alt="Step 2b's colour map: step 2's, with the painted screens" width="1024" height="1536" loading="lazy"><figcaption>Step 2b’s colour map: step 2’s, with RA-D-3x’s painted screens.</figcaption></figure>
</div>

<h3 id="step2b-prompt">Step 2b’s prompt, against step 2’s</h3>
<p>sha256 <code>${V.prompts.s2b.sha256}</code>, ${num(V.prompts.s2b.chars)} characters. The style, colour and keep-out blocks are step 2’s, word for word. In the PLACE block, sentence by sentence:</p>
<div class="note"><b>Kept, word for word (${PD.kept.length}):</b><ul>${li(PD.kept)}</ul><b>Dropped (${PD.dropped.length}):</b><ul>${li(PD.dropped)}</ul><b>New (${PD.added.length}):</b><ul>${li(PD.added)}</ul></div>
<p><b>Why these lines.</b> Both runs filled the one area that held the hatch, its lid and the toolbox with a hatch, and painted the toolbox nearer, outside it. Here the toolbox has its own area, and the prompt says which area holds what and that each piece fills its own. The hatch is called small and given in deck plates, which the model can see round it, with its two ends tied to the two painted seams they lie just past; the toolbox is tied to the painted crossing of two seams under it, “no larger and no nearer the viewer than its area”. ${K2.growth.on ? 'With the growth, an area is up to 18 px larger than its piece’s planned outline on each side, so a piece that fills its area exactly can come out that much larger: about 0.07 to 0.1 m at the hatch.' : 'Without the growth, an area is its piece’s planned outline plus 6 px, so a piece that fills its area exactly is at most 6 px larger each side; a right-sized piece that runs a little past it is completed from the raw, as for B, C and E.'}</p>
<details><summary>Step 2b: the prompt, ${num(V.prompts.s2b.chars)} characters · sha256 <code>${V.prompts.s2b.sha256.slice(0, 16)}…</code></summary><pre>${esc(V.prompts.s2b.text)}</pre><p class="dim">sha256 <code>${V.prompts.s2b.sha256}</code>, of the text in UTF-8, as <code>room-a-ra-d-prompts.txt</code> gives it.</p></details>

<h3>The commands</h3>
<pre class="cmd">${esc(cmds)}</pre>
<p>The dry run ran them with <code>--stand-in</code> on a code-drawn stand-in for RA-D-3x (the empty-room guide with the step-2 guide’s desk and cabinet, and the two screens where step 2b’s map has them, filled black), step 2’s guide standing in for the raw edit: the mask’s alpha as expected (${pct(DRY.s2b.maskedShare)}), nothing changed more than 4 px outside it, all three pieces lifted, and the colour check with step 2b’s map passed. Without <code>--stand-in</code> the commands stop on any picture but RA-D-3x.</p>

<h3>For the Lead</h3>
<ul>
<li><b>The toolbox’s place in the guide.</b> Version 2’s floor fit moved the desk’s, the hatch’s and the lid’s floor points down to the painted deck (the hatch’s corners 9 to 16 px); the toolbox was not among them. RA-D-1’s two seams under the toolbox cross at (${K2.crossing.painted.join(', ')}), ${Math.abs(K2.crossing.paintedMinusGuidePx[0])} px ${K2.crossing.paintedMinusGuidePx[0] < 0 ? 'left of' : 'right of'} and ${Math.abs(K2.crossing.paintedMinusGuidePx[1])} px ${K2.crossing.paintedMinusGuidePx[1] > 0 ? 'below' : 'above'} where the guide’s cross (${K2.crossing.guide.join(', ')}), so the guide’s toolbox stands about that much up and to the right of the painted crossing, toward the hatch: that is why its outline touches the hatch’s. It is left as version 2 has it, since moving it would change the guide; a fit of the toolbox to the painted crossing is yours to call.</li>
<li><b>If the hatch still will not sit</b>, the next step, as you said, is building it in code from another view’s painted hatch, before any more runs.</li>
</ul>
</section>`;
  const res = {
    status: V22 ? 'Version 2.2 · for the Lead’s review · step 2b without the growth, on RA-D-3x' : 'Version 2.1 · for the Lead’s review · step 2b, the hatch, its lid and the toolbox, on RA-D-3x',
    note: V22 ? `<div class="note"><b>Version 2.2, from the Lead’s review of version 2.1, 27 November (22:29).</b> Step 2b’s growth is off, on both areas: ${esc(curly(C22.why))}. Each area is its outline plus 6 px, the 8 px gap kept (${esc(curly(C22.mask2b))}). Only step 2b’s mask, its split map and its alpha are new: <code>img/ra-D-place2b.png</code> ${C22.files.place2b.now.slice(0, 12)}… (was ${C22.files.place2b.v21.slice(0, 12)}…), <code>img/ra-D-split2b.png</code> ${C22.files.split2b.now.slice(0, 12)}… (was ${C22.files.split2b.v21.slice(0, 12)}…), alpha <code>${C22.expected.s2b.now.rawMaskAlpha.slice(0, 12)}…</code>. ${esc(curly(C22.unchanged[0].toUpperCase() + C22.unchanged.slice(1)))} are version 2.1’s, byte for byte; ${esc(curly(C22.redrawn))} are redrawn with the new mask. The toolbox stays as version 2 has it: the painted crossing lies inside its outline.</div>\n<details><summary>Version 2.1’s changes</summary>${note}</details>` : note, section,
    fact: `<span class="pill">Step 2: two runs held; RA-D-3x made</span><span class="pill">Step 2b’s mask ${pct(V.expected.s2b.maskedShare)}, two areas ${K2.gapPx.grown} px apart</span><span class="pill ok">Step 2b: 15 px rule passed</span>`,
    pageOnly: `Version 2.1’s ${REVIEW.length} review pictures (${REVIEW.map(f => `<code>img/${f}</code>`).join(', ')}) show RA-D-3, the two runs’ raw edits and RA-D-3x, and are AI-generated and labelled as such too.`,
    evidence: `<p>Also published, for version 2.1: <code>compositeD3x.py</code>, <code>composite-D3x.json</code>, <code>screens-D.json</code>, <code>kit-D2b.json</code> and <code>step2-D.json</code> (<a href="#step2b-all">above</a>).</p>`,
    footerPics: ` and version 2.1’s ${REVIEW.length} of RA-D-3, the two runs’ raws and RA-D-3x (RA-D-3x a code composite of AI-generated pictures)`,
    footer: `Sheet RA-D, version ${M.version}, ${M.date}. Manifest sha256 <code>${DRY.manifestSha256}</code>. RA-D-3x’s record: sha256 <code>${shaF(PUB + 'composite-D3x.json')}</code>. Version 1 was 1795103314-ab8c, version 1.1 1795798324-33e6, version 2 1795812844-7ba4${V22 ? ', version 2.1 1795818348-5124' : ''}.`,
    desc: { place2b: "step 2b's mask (white = repaint): the hatch and its lid as one area, the toolbox as its own", split2b: "step 2b's split map: the toolbox's, the hatch's and the lid's greys, for the lift",
      regions2b: "the colour check's map for step 2b: step 2's, with RA-D-3x's painted screens" },
    receives: [['compositeD3x.py', "rebuilds RA-D-3x, step 2b's start picture, from the image session's records (RA-D-1, RA-D-3 and RA-D-3's raw), pixel for pixel"]],
    spendWords: 'View D’s step 2b and step 3 are its two pictures left, with a re-run if a check fails.',
    stepsWord: 'four', toolDesc: "the tool, version 2: sheet RA-A's, with view D's manifest and step 2b's commands", step2Title: ' · two runs, held',
    stepsIntro: `Step 2 made ${S2.runs.map(r => `<code>${esc(r.name)}</code>`).join(' and ')}, both held; step 2b, the hatch, its lid and the toolbox on RA-D-3x, comes next (<a href="#step2b">above</a>), then step 3 on step 2b’s kept picture.`,
    step3Names: ['$N', '$N3', 'N=…    # the kept step-2b picture’s name\nN3=…   # step 3’s picture’s name, as the image session gives it\n'],
    dryRows: `<tr><td>Step 2b’s mask: ${pct(DRY.s2b.maskedShare)}, alpha as expected (on a stand-in for RA-D-3x)</td><td>${yes(DRY.s2b.alphaAsExpected && DRY.s2b.standIn)}</td></tr>
<tr><td>Step 2b’s kept edit changes nothing more than 4 px outside its mask</td><td>${yes(DRY.s2b.keptOutsideMax === 0)}</td></tr>
<tr><td>Step 2b’s lift: all ${Object.keys(DRY.lifted2b).length} pieces, none missing</td><td>${yes(!DRY.missing2b.length && Object.keys(DRY.lifted2b).length === 3)}</td></tr>`,
  };
  const ctx = { M, J, esc, curly, num, yes, shaF, DIR, PUB, DRY };
  return M.version === 2.4 ? v24(v23(res, ctx), ctx) : M.version === 2.3 ? v23(res, ctx) : res;
}
