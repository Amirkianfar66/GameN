// Sheet RA-B's page (Room A, view B: Mira's place), version 2, for the Lead's review: what the image session receives and does, step
// by step, with every file's sha256; the checks run on the sheet's own files (the dry run and the colour check's calibration); what
// carries over from view A; the spend and the rules. Its look is sheet RA-A's (the style block read from ../sheet/sheetA.mjs). Writes
// sheet-ra-b.html and copies it, with the phone crops, into pub/. Reads room-a-ra-b.json, kit-B.json, pub/_dry/summary.json and the
// colour check's calibration (_cal-*.json). Version 2: step 1's result (RA-B-2), the desk's floor fit, the 15 px rule and Vega's foot
// line, from kit-B.json, measure-B2.json and the manifest, with four review pictures of RA-B-2 (overlayB2.py), each labelled as an
// AI-generated picture in itself and in its caption; every other picture is drawn by code. Version 3 (where composite-B3.json is
// present): RA-B-3, the kept step 2, completed in code as RA-B-3c (compositeB3.py), with view B's screens fitted for the live
// monitors (screens-B.json) and nine review pictures (reviewB3.py), each labelled as AI-generated; version 2's files are kept byte
// for byte and its note is folded. Generates nothing. Usage: node sheetB.mjs
import { readFileSync, writeFileSync, copyFileSync, statSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { RA_B_1, RA_B_1B, RA_B_2, spendV2, spendTextV2, v11Note, seamFigures } from '../sheetV/sharedV.mjs';
const DIR = new URL('./', import.meta.url).pathname, PUB = DIR + 'pub/';
const J = f => JSON.parse(readFileSync(DIR + f, 'utf8')), shaF = f => createHash('sha256').update(readFileSync(f)).digest('hex');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const M = J('room-a-ra-b.json'), KIT = J('kit-B.json'), DRY = J('pub/_dry/summary.json'), V = M.kit.views.B, COST = JSON.parse(readFileSync(DIR + '../owner/cost-A.json', 'utf8'));
const CAL = { empty: J('_cal-empty.json'), guide: J('_cal-guide.json'), roomB: J('_cal-roomb.json') };
if (DRY.manifestSha256 !== shaF(DIR + 'room-a-ra-b.json')) throw new Error('the dry run is not of this manifest');
const A = readFileSync(DIR + '../sheet/sheetA.mjs', 'utf8'), CSS = A.slice(A.indexOf('<style>') + 7, A.indexOf('</style>'));
for (const w of [390, 430, 402]) copyFileSync(DIR + `ra-B-phone-${w}.png`, PUB + `img/ra-B-phone-${w}.png`);
for (const t of ['v1', 'v11']) copyFileSync(DIR + `ra-B-seams-${t}.png`, PUB + `img/ra-B-seams-${t}.png`);   // version 1.1's before/after of the guide (beforeafter.py)
const pct = (x, d = 1) => `${(100 * x).toFixed(d)}%`, num = n => n.toLocaleString('en-GB'), yes = b => (b ? '<span class="pill ok">pass</span>' : '<span class="pill no">fail</span>');
const S1 = 'RA-B-2', S2 = 'RA-B-3';   // step 1's accepted picture, and the name step 2's picture takes
// version 2: RA-B-2, the desk's floor fit, the 15 px rule and Vega's foot line
const REVIEW = ['ra-B-2-masks.png', 'ra-B-2-desk.png', 'ra-B-2-features-desk.png', 'ra-B-2-features-crates.png'];
for (const f of REVIEW) copyFileSync(DIR + f, PUB + `img/${f}`);
const curly = t => String(t).replace(/'/g, '’').replace(RA_B_2.sha256, RA_B_2.sha256.slice(0, 16) + '…');   // a whole hash does not wrap at a phone's width
const C2 = M.changes[0], C11 = M.changes.find(c => c.version === 1.1), FT = KIT.featureTest, FF = KIT.floorFit, VF = KIT.vegaFoot, MB = J('measure-B2.json');
if (C2.version !== 2 || !C11 || !FT.passed || FT.picture.sha256 !== RA_B_2.sha256 || VF.moved) throw new Error('the manifest or the kit is not version 2 on RA-B-2');
const nExc = FT.exceptions.reduce((n, e) => n + e.parts.length, 0), nPass = FT.features.filter(f => !f.exception).length;
const ftRows = FT.features.map(f => { const st = f.step2.status, d = st === 'clear' ? `clear by ${f.step2.clearPx}${f.step2.clearPx >= 60 ? '+' : ''} px` : st === 'inside' ? `inside by ${f.step2.insidePx} px` : 'crosses';
  const ex = (f.exception || []).map(e => `<b>${esc(curly(e.where))}.</b> ${esc(curly(e.why))}`).join('<br>'); return `<tr><td>${esc(curly(f.name))}</td><td>${d}</td><td class="n">${num(f.pxWithin15.step2)}</td><td>${ex || 'passes outright'}</td></tr>`; }).join('');
const cornerRows = FF.deskCorners.map(c => `<tr><td>${c.fromWallM === 0 ? 'back, at the north wall' : `front, ${c.fromWallM} m out`}, x ${Math.round(c.guide[0])}</td><td class="n">${c.guide[1].toFixed(1)}</td><td class="n">${c.painted[1].toFixed(1)}</td><td class="n">+${c.downPx}</td></tr>`).join('');
const footOff = Object.entries(MB.wallFoot.offsetByX).map(([x, o]) => `+${o.toFixed(0)} at x ${x}`), seamOff = Object.values(MB.farSeam.offsetByX).filter((o, i) => i < 5);
const newFiles = (() => { const seen = new Set(); return Object.values(C2.files).filter(f => !seen.has(f.published) && seen.add(f.published)); })();
const v2Note = `<div class="note"><b>Version 2, from the Lead’s review of RA-B-2, 27 November.</b> ${esc(curly(C2.why[0]))}<ul>
<li><b>The desk stands on the painted deck.</b> Its floor corners are drawn on RA-B-2’s painted deck, ${FF.deskCorners.map(c => `+${c.downPx}`).join(', ')} px down; the tabletop and the monitors stay where the camera puts them, so the desk covers the kick strip behind it. Only the desk’s area changes, in the mask and the guide: no warp. <a href="#desk">Below</a>.</li>
<li><b>The 15 px rule, against RA-B-2’s painted features.</b> Passed: ${FT.features.length} features near the mask; ${nPass} pass outright and ${FT.exceptions.length} on ${nExc} named exceptions, for the Lead’s decision, each where the desk, its monitors or the crates stand in front of a feature. <a href="#rule15">Below</a>.</li>
<li><b>Vega’s foot line.</b> ${VF.paintedOffsetPx} px off the painted deck (the nearest seam crossing ${VF.seamCrossingOffsetPx.join(', ')} px): under the Lead’s 8 px, so it stays. <a href="#vega">Below</a>.</li>
<li><b>Added to step 2’s PLACE block</b>, after “${esc(C2.added[0].after)}”: “${esc(curly(C2.added[0].text))}”</li>
<li><b>The tool.</b> rb1_tools.py version 2: its s1 command prints rb1_tools.py in its colour check (version 1 printed ra1_tools.py).</li>
<li><b>Files.</b> New bytes: ${newFiles.filter(f => !f.same).map(f => `<code>${esc(f.published)}</code>`).join(', ')}; ${newFiles.filter(f => f.same).map(f => `<code>${esc(f.published)}</code>`).join(' and ')} (step 1’s) are version 1.1’s, byte for byte. Step 1’s prompt is version 1.1’s, byte for byte, as RA-B-2 was made with it; step 2’s is version 1.1’s with the crate-top line alone (the build checks both): step 2 <code>${C2.prompts.s2.v11.slice(0, 12)}…</code> → <code>${C2.prompts.s2.now.slice(0, 12)}…</code>.</li></ul></div>`;
// version 3 (the Lead, 17:43): RA-B-3 held for cut edges; RA-B-3c completes them in code, and view B's screens are fitted
const C3 = existsSync(DIR + 'composite-B3.json') ? J('composite-B3.json') : null, SC = C3 ? J('screens-B.json') : null, RS = C3 ? J('review-B3.json') : {};
if (C3 && (!C3.pass || C3.screens.sha256 !== shaF(DIR + 'screens-B.json') || !SC.screens.every(s => s.pass))) throw new Error('composite-B3.json does not pass, or screens-B.json is not the one it records');
const V3FILES = [['compositeB3.py', "the composite in code: the traced outlines, the 1 px feather, the checks and the screens’ fit"], ['composite-B3.json', "its record: the sources and their sha256, the outlines, each piece’s changed pixels, the checks and the plate’s pixel sha256"], ['screens-B.json', "view B’s two screens, fitted to the painted flat black, for the live monitors"]];
const REVIEW3 = C3 ? Object.keys(RS) : [];
if (C3) { for (const f of REVIEW3) copyFileSync(DIR + f, PUB + `img/${f}`); for (const [f] of V3FILES) copyFileSync(DIR + f, PUB + f); }
const fig3 = (f, alt, cap) => `<figure><img src="img/${f}" alt="${esc(alt)}" width="${RS[f][0]}" height="${RS[f][1]}" loading="lazy"><figcaption>${cap}</figcaption></figure>`;
const B3 = C3 ? C3.sources.find(s => s.name === 'RA-B-3') : null, PLATE = C3 ? C3.outputs['ra-B-3c.png'] : null;
const v3Note = C3 ? `<div class="note"><b>Version 3, from the Lead’s review of RA-B-3, 27 November.</b> RA-B-3, view B’s kept step 2, was held for cut edges: where a piece ran past step 2’s mask, the keep cut it. RA-B-3c completes them in code, as the Lead asked: RA-B-3 is the base, and inside each cut piece’s own painted outline (its ink line, traced by hand on RA-B-3’s raw edit) the raw edit’s pixels are taken back, with 1 px of feather outside the outline and nothing else from the raw. So RA-B-3c is a code composite of two AI-generated pictures, RA-B-2 and RA-B-3’s raw edit. No picture is generated, and nothing is lifted yet. Version 2’s files are kept byte for byte; version 3 adds the composite’s code (<code>compositeB3.py</code>), its record (<code>composite-B3.json</code>), view B’s screens for the live monitors (<code>screens-B.json</code>) and nine review pictures. <a href="#ra-b-3c">Below</a>.</div>` : '';
const pieceRows3 = C3 ? C3.pieces.map(p => `<tr><td>${esc(curly(p.name[0].toUpperCase() + p.name.slice(1)))}${p.listed ? '' : ' <span class="pill">one more</span>'}</td><td class="n">${num(p.checks.changedPx)}</td><td class="n">${num(p.checks.changedOutsideTheMask)}</td><td class="n">${num(p.checks.changedInsideTheMask)}</td><td>x ${p.checks.changedBox[0]}–${p.checks.changedBox[2]}, y ${p.checks.changedBox[1]}–${p.checks.changedBox[3]}</td></tr>`).join('') : '';
const scRows = SC ? SC.screens.map(s => `<tr><td>${esc(s.name[0].toUpperCase() + s.name.slice(1))}</td><td>${s.corners.map(c => `(${c[0].toFixed(1)}, ${c[1].toFixed(1)})`).join(' ')}</td><td class="n">${s.size[0]} × ${s.size[1]}</td><td class="n">${num(s.px)}</td><td class="n">${s.p95L.toFixed(3)}</td><td>${yes(s.pass)}</td><td>x ${s.map.box[0]}–${s.map.box[2]}, y ${s.map.box[1]}–${s.map.box[3]}</td></tr>`).join('') : '';
const PZ = { 'desk-left': "the desk’s left end", 'monitor-left': 'the left monitor', toolbox: 'the toolbox', 'monitor-right': 'the right monitor (one more)', 'foot-right': 'the desk’s right foot (one more)' };
const step2Section = C3 ? `<section id="ra-b-3c">
<h2>Step 2 · RA-B-3, completed in code: RA-B-3c</h2>
<p>RA-B-3 (sha256 <code>${B3.sha256.slice(0, 16)}…</code>) is the image tool’s keep: RA-B-3’s raw edit over RA-B-2 inside step 2’s mask, feathered by a 2 px Gaussian. Rebuilt here from those two pictures, it matches pixel for pixel. Where a piece ran past the mask, the keep cut it. Each cut piece’s outline was traced on the raw edit along the outer edge of its ink line, and closes at least 6 px inside the mask, where RA-B-3 already equals the raw (the keep’s blend reaches 5 px in). Inside the outline RA-B-3c takes the raw’s pixels; the alpha falls from 1 to 0 over the 1 px outside it; nothing else comes from the raw. Where a completed piece covers a pipe or panel of RA-B-2’s wall, that is the occlusion the Lead asked for.</p>
<p><b>The three the Lead named,</b> each completed along its outline wherever it runs past the mask: the desk’s left end, from the tabletop’s left end and back corner down the pedestal to its foot on the deck; the left monitor’s left frame, with its top bezel, which the same cut runs along (the left frame alone would leave a step in the bezel at x 453); and the toolbox’s left side and handle, with its bottom edge as far as the lid’s foot (the deck seen through the handle stays RA-B-2’s). <b>Two more with the same cut,</b> done the same way and recorded apart so either can be dropped: the right monitor’s top bezel and right frame, and the corner of the desk’s right foot. <b>Left as they are:</b> ${C3.leftAlone.map(l => `${esc(curly(l.what))} (${esc(curly(l.why))})`).join('; ')}.</p>
<div class="facts"><span class="pill ok">Changed against RA-B-3: ${num(C3.checks.changedPx)} px, all inside the completions</span><span class="pill ok">Outside them: ${C3.checks.changedOutsideTheCompletions} px</span><span class="pill ok">The raw taken whole inside the outlines</span><span class="pill ok">RA-B-3 rebuilt from RA-B-2 and the raw: exact</span><span class="pill ok">Screens: flat black, p95 ${SC.screens.map(s => s.p95L.toFixed(3)).join(' and ')}</span></div>
<div class="scroll wide"><table><thead><tr><th>Piece</th><th>Changed px</th><th>Outside the mask</th><th>Inside it (the keep’s blend)</th><th>Where</th></tr></thead><tbody>${pieceRows3}</tbody></table></div>
<p>The pictures below show RA-B-3 and RA-B-3c, both AI-generated (RA-B-3c a code composite of AI-generated pictures); each is labelled in itself and in its caption, and none is an input, an asset or a commit.</p>
<div class="pics">
${C3.pieces.map(p => fig3(`ra-B-3c-${p.key}.png`, `AI-generated pictures RA-B-3 and RA-B-3c: ${PZ[p.key]}, before, after, and with the traced outline`, `AI-generated pictures: ${PZ[p.key]} at 3×, before (RA-B-3), after (RA-B-3c) and with the traced outline (cyan).`)).join('\n')}
</div>
<h3>The screens, for the live monitors</h3>
<p>Fitted to RA-B-3c’s painted flat black: along each side, the edge where the OKLCH lightness crosses 0.12, scanned every 2 px; a straight line through each side’s points; the corners where the lines meet. Each region passes the colour check’s flat-black gate (95% of it under lightness 0.12). The painted screens are not where step 2’s map draws them: both are larger than the map’s and sit higher and further left. In RA-B-3 the right monitor’s top was cut at the mask’s edge (y 788 to 793), which made its black read smaller; completed, it is the larger of the two. The corners, in painting pixels (a pixel spans i to i + 1), are in <code>screens-B.json</code>, for the live monitors.</p>
<div class="scroll wide"><table><thead><tr><th>Screen</th><th>Corners: top-left, top-right, bottom-right, bottom-left</th><th>Size</th><th>Px</th><th>p95</th><th>Gate</th><th>The map’s</th></tr></thead><tbody>${scRows}</tbody></table></div>
<div class="pics">${fig3('ra-B-3c-screens.png', 'AI-generated picture RA-B-3c: the two monitors, with the fitted screens in cyan and the map’s screens in magenta', 'AI-generated picture RA-B-3c (a code composite), the monitors at 3×: the fitted screens (cyan) and the map’s (magenta).')}</div>
<h3>The whole picture, the 402 × 742 view and the check</h3>
<div class="pics three">
${fig3('ra-B-3c-full.png', 'AI-generated picture RA-B-3c, view B’s step 2 with its cut pieces completed in code', 'AI-generated picture RA-B-3c (a code composite), whole.')}
${fig3('ra-B-3c-402.png', 'AI-generated picture RA-B-3c, the 402 by 742 phone’s slice', 'AI-generated picture RA-B-3c: the 402 × 742 phone’s slice, at twice its stage size.')}
${fig3('ra-B-3c-changed.png', 'AI-generated picture RA-B-3c dimmed, with every pixel that differs from RA-B-3 lit: all inside the completions', `AI-generated picture RA-B-3c, dimmed: every pixel that differs from RA-B-3 (${num(C3.checks.changedPx)}) lit, the Lead’s three cyan, the two more orange; none outside the outlines.`)}
</div>
<pre class="cmd">${esc(`python3 -I compositeB3.py <records folder>   # reads img/RA-B-3.png, img/RA-B-3-raw.png and img/RA-B-2.png there, each by its sha256\n# writes ra-B-3c.png (the plate), composite-B3.json and screens-B.json, and stops if a check fails`)}</pre>
<div class="scroll wide"><table><thead><tr><th>File</th><th>Bytes</th><th>sha256</th></tr></thead><tbody>${V3FILES.map(([f, what]) => `<tr><td><code>${esc(f)}</code><div class="dim">${esc(what)}</div></td><td class="n">${num(statSync(PUB + f).size)}</td><td class="h"><code>${shaF(PUB + f)}</code></td></tr>`).join('')}</tbody></table></div>
<p>The plate, <code>ra-B-3c.png</code>, is not published here, being an AI-generated picture without a label of its own: the command above makes it from the image session’s records. Its pixels’ sha256 is <code>${PLATE.pixelsSha256}</code>.</p>
</section>` : '';
const step1Section = `<section id="step1">
<h2>Step 1 · done: RA-B-2</h2>
<p>RA-B-2 (sha256 <code>${RA_B_2.sha256.slice(0, 16)}…</code>) was made on version 1.1 and accepted by the Lead on 27 November. It is an AI-generated picture; its record, with its tool, prompt, date and settings, is in the image session’s records. The four pictures in this version that show it, with this sheet’s masks and measurements drawn over it, are for review only: each is labelled as AI-generated in itself and in its caption, and none is an input, an asset or a commit.</p>
<div class="pics"><figure><img src="img/ra-B-2-masks.png" alt="AI-generated picture RA-B-2, view B's empty room, with version 2's step-2 mask tinted over the desk, the crates and the hatch" width="1024" height="1536" loading="lazy"><figcaption>AI-generated picture RA-B-2, with version 2’s step-2 mask over it (tinted, its edge gold).</figcaption></figure></div>
</section>
<section id="desk">
<h2>The desk on the painted deck</h2>
<p>RA-B-2 paints the north wall’s foot lower than the guide does across the desk’s span: ${footOff.join(', ')} px, read on the foot of its kick strip (${MB.wallFoot.readings} readings, a straight line within ${MB.wallFoot.rmsPx} px). Its far deck seam, 1 m out, lies within ${Math.max(...seamOff.map(Math.abs)).toFixed(0)} px of the guide’s there. So each of the desk’s floor corners keeps its place between the wall’s foot and that seam, as the guide’s camera puts it, and is drawn at the same place between the painted ones. The tabletop and the monitors stay where the camera puts them: the desk’s legs grow, it stands on the painted deck, and it covers the kick strip behind it. Nothing else in the guide moves.</p>
<div class="scroll"><table><thead><tr><th>Desk floor corner</th><th>Guide y</th><th>Painted y</th><th>Down, px</th></tr></thead><tbody>${cornerRows}</tbody></table></div>
<div class="pics"><figure><img src="img/ra-B-2-desk.png" alt="AI-generated picture RA-B-2, zoomed on the desk's bottom edge: version 2's mask edge below version 1.1's, on the painted deck" width="960" height="720" loading="lazy"><figcaption>AI-generated picture RA-B-2, the desk’s bottom edge at 3×: version 2’s mask (red) against version 1.1’s (gold), the desk’s outline (cyan), the painted wall foot (magenta) and far seam (green).</figcaption></figure></div>
</section>
<section id="rule15">
<h2>The 15 px rule on RA-B-2</h2>
<p>Every edge of step 2’s mask either covers a painted feature with 15 px to spare or clears it by 15 px. RA-B-2’s features near the mask were traced at three or four times on a 10 px grid (<code>featuresB.json</code>), and the test is view A’s own code (<code>feat15.py</code>). ${nPass} of the ${FT.features.length} pass outright. The other ${FT.exceptions.length} pass on ${nExc} named exceptions, each a zone where the desk, its monitors or the crates stand in front of the feature, so their outline must cross it or run along it: these are for the Lead’s decision. The ${FT.lights.length} indicator dots are at least 60 px from the mask. Near the toolbox and the hatch only structural lines lie close (the kick strip and the deck seams), which the rule leaves out, as in view A.</p>
<div class="scroll wide"><table><thead><tr><th>Feature</th><th>Against the mask</th><th>Px within 15</th><th>Named exception</th></tr></thead><tbody>${ftRows}</tbody></table></div>
<div class="pics">
<figure><img src="img/ra-B-2-features-desk.png" alt="AI-generated picture RA-B-2 round the desk, with the traced features in cyan and the exception zones in magenta" width="680" height="660" loading="lazy"><figcaption>AI-generated picture RA-B-2 round the desk at 2×: features cyan, exception zones magenta, the mask gold.</figcaption></figure>
<figure><img src="img/ra-B-2-features-crates.png" alt="AI-generated picture RA-B-2 round the crates, with the traced features in cyan and the exception zones in magenta" width="720" height="680" loading="lazy"><figcaption>AI-generated picture RA-B-2 round the crates at 2×: features cyan, exception zones magenta, the mask gold.</figcaption></figure>
</div>
</section>
<section id="vega">
<h2>Vega’s foot line</h2>
<p>Vega’s feet stand 0.875 m out from the north wall, between its foot and the far seam. Kept at its place between the painted lines (${MB.vegaFoot.fractionWallToSeam} of the way), Vega’s anchor sits ${VF.paintedOffsetPx} px below the guide’s (about ${(VF.paintedOffsetPx / 2.191).toFixed(1)} px on the 390 phone); the nearest seam crossing, 1 m out and 1 m west of the middle, is ${MB.seamBesideVega.offset[0]}, ${MB.seamBesideVega.offset[1]} px off the guide’s. Both are under the Lead’s 8 px, so Vega’s foot line stays where the plan puts it.</p>
</section>`;
const RECEIVES = [
  ...Object.entries(V.files).filter(([k]) => k !== 'guideS2').map(([k, e]) => [e.published, { empty: "step 1's input: the empty-room guide", emptyRegions: "the colour check's map for step 1", emptyAnnotated: "for checking the lines: the horizon, the phones' slices, where people stand",
    guide: "the guide with the furniture: step 2's input inside the PLACE mask", regions: "the colour check's map for step 2", place: "step 2's PLACE mask (white = repaint)", split: "step 2's split map: one grey a piece, for the lift" }[k]]),
  ['room-a-ra-b.json', 'the manifest: the kit the tool reads, the prompts, the expected hashes, the camera'], ['room-a-ra-b-prompts.txt', 'the two prompts, each with its sha256'],
  ['rb1_tools.py', "the tool, version 1: sheet RA-A's, with view B's manifest and no step 3"], ['lift5.py', "the lift, the Lead's recipe (the same bytes as sheet RA-A's)"], ['colour-check-ra1.py', "the Room A colour check, version 1 (the same bytes as sheet RA-A's)"],
  ['camera-report-B.json', "the camera report, version 2 (the Room A plan's; regenerated byte for byte on today's stage)"]].map(([f, what]) => ({ f, what, bytes: statSync(PUB + f).size, sha: shaF(PUB + f) }));
const hashRows = RECEIVES.map(r => `<tr><td><code>${esc(r.f)}</code><div class="dim">${esc(r.what)}</div></td><td class="n">${num(r.bytes)}</td><td class="h"><code>${r.sha}</code></td></tr>`).join('');
const promptBlock = (k, title) => { const p = V.prompts[k]; return `<details><summary>${title}: the prompt, ${num(p.chars)} characters · sha256 <code>${p.sha256.slice(0, 16)}…</code></summary><pre>${esc(p.text)}</pre><p class="dim">sha256 <code>${p.sha256}</code>, of the text in UTF-8, as <code>room-a-ra-b-prompts.txt</code> gives it.</p></details>`; };
const words = { 'PC workstation': "Vega's desk against the north wall, left of the round window, with its two monitors. Their screens are openings: painted flat black, for the game to fill. Vega's chair is drawn with Vega, so none is painted.", crates: "Atlas's two crates against the west wall, nearest the camera and cut by the left edge.", 'floor hatch': "Lyra's open hatch in the deck, its near rim crisp and lit. Its lid stands at the painting's right edge, outside every phone's slice, so it is part of the hatch's piece here.", toolbox: "The closed toolbox at the hatch's left end." };
const pieceRows = KIT.pieces.map(p => `<tr><td>${esc(p.name)}</td><td class="n">${p.grey}</td><td class="n">${num(p.px)}</td><td class="n">${DRY.lifted[`${p.place} ${p.name}`] !== undefined ? num(DRY.lifted[`${p.place} ${p.name}`]) : '–'}</td><td>${esc(words[p.name] ?? '')}</td></tr>`).join('');
const gateRows = Object.keys(CAL.empty.result).map(g => `<tr><td>${esc(g)}</td><td>${esc(CAL.empty.gates?.[g] ?? '')}</td><td>${yes(CAL.empty.result[g])}</td><td>${yes(CAL.guide.result[g])}</td><td>${yes(CAL.roomB.result[g])}</td></tr>`).join('');
const gapRows = Object.entries(KIT.gaps).map(([k, g]) => `<tr><td>${esc(k)}</td><td class="n">${g.tightPx} px</td><td class="n">${g.grownPx < 0 ? 'overlap' : `${g.grownPx} px`}</td></tr>`).join('');
const O = KIT.openings, sl = M.camera.phones.slices, R = JSON.parse(readFileSync(DIR + 'pub/camera-report-B.json', 'utf8'));
const cmd = s => `<pre class="cmd">${esc(s)}</pre>`;
const people = Object.values(R.people).map(p => `${esc(p.name)} (${esc(p.work)}, seen ${esc(p.seenSide.replace(/^from /, 'from '))}, ${esc(p.head)})`).join('; ');
const html = `<title>Room A sheet RA-B</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600&display=swap">
<style>${CSS}</style>
<div class="wrap">
<header>
<h1>Sheet RA-B · Room A, view B</h1>
<span class="status">${C3 ? 'Version 3 · for the Lead’s review · RA-B-3c, before any lift' : `Version ${M.version} · for the Lead’s review · step 2 after the Lead’s go`}</span>
<p class="lede">Room A’s second view, from Mira’s place by the south wall, painted the way view A was: two pictures, the empty room and then its furniture. The food capsule and Echo’s cabinet are out of this view, so there is no third step. No people are painted, because code draws them. Every picture made from this sheet is AI-generated and recorded as such. The only inputs are the code-drawn guides and masks on this page, and the picture its own step 1 keeps.</p>
${C3 ? `${v3Note}\n<details><summary>Version 2’s changes</summary>${v2Note}</details>` : v2Note}
<details><summary>Version 1.1’s changes</summary>${v11Note({ changes: [C11] }, esc)}</details>
<div class="note"><b>What carries over from view A.</b><ul>
<li><b>Every piece whole.</b> View A’s step 2 left the cabinet’s right side open, fading into the wall at the mask’s edge, and two masked fixes could not close it, so its frame was drawn in code. Step 2’s prompt here asks for each piece whole, its outline and frame closed on every side, and nothing fading into the wall or the deck at an area’s edge.</li>
<li><b>The 15 px rule.</b> View A’s step-1 picture painted wall features that step 2’s mask then had to clear. Here RA-B-2’s painted features are traced and step 2’s mask is checked against them (every edge covers a feature by 15 px or clears it by 15 px): it passes, with named exceptions where the furniture stands in front of a feature (<a href="#rule15">below</a>).</li>
<li><b>Openings.</b> The round window and the two monitors’ screens are painted flat black and empty, for the game to fill; the colour check holds them to it. The mask stays ${O['window frame (as drawn)'].clearPx} px clear of the window’s frame as the guide draws it.</li>
<li><b>The lid.</b> The hatch’s lid stands at the painting’s right edge, a sliver about 9 px wide (x 1015 to 1024), outside every phone’s slice (they end at x 939) and too small to lift as a layer of its own, so in view B it is part of the hatch’s piece.</li></ul></div>
<div class="facts">${C3 ? '<span class="pill ok">Step 2: RA-B-3, completed in code as RA-B-3c</span>' : ''}<span class="pill ok">Step 1 done: RA-B-2</span><span class="pill ok">15 px rule: passed, ${nExc} named exceptions</span><span class="pill ok">Vega’s foot +${VF.paintedOffsetPx} px: stays</span><span class="pill">Step 2’s mask ${pct(V.expected.s2.maskedShare)} in ${KIT.shapes.length} areas</span><span class="pill ok">Window frame ${O['window frame (as drawn)'].clearPx} px clear</span><span class="pill ok">Dry run: every step matches its manifest</span><span class="pill ok">Colour check: the guides pass</span><span class="pill">Camera report v2</span></div>
</header>
${step2Section}

<section id="picture">
<h2>The picture</h2>
<p>As view A’s: 1024 × 1536, straight lines, ${M.camera.acrossDeg}° across (focal ${M.camera.focalPx} px), level, the horizon ${M.camera.horizonY} px from the top. The camera is at Mira’s place by the south wall’s middle, at eye height (${M.camera.eyeM} m), facing ${M.camera.yawCompass}°, a little west of north. The north wall is the back wall, with the round window right of the middle; the west wall is on the left. In view: ${people}. Echo is out of view.</p>
<div class="pics">
<figure><img src="img/ra-B-empty.png" alt="Step 1's guide: Room A's empty room from Mira's place, the round window black in the north wall, the two light bars across the ceiling" width="1024" height="1536" loading="lazy"><figcaption>Step 1’s input: the empty room, Room A’s colour plan.</figcaption></figure>
<figure><img src="img/ra-B-guide.png" alt="The guide with the furniture: Vega's desk with two black-screened monitors, Atlas's crates on the left, Lyra's hatch and toolbox on the right" width="1024" height="1536" loading="lazy"><figcaption>With the furniture: where step 2 paints.</figcaption></figure>
<figure><img src="img/ra-B-empty-annotated.png" alt="The annotated guide: the horizon, the three phones' slices, the furniture's outlines and the people's stand-ins at their spots" width="1024" height="1536" loading="lazy"><figcaption>For checking: the horizon, the three phones’ slices, the outlines, and where the people stand (stand-ins, never painted).</figcaption></figure>
</div>
${seamFigures('B')}
<h3>What each phone shows</h3>
<div class="pics three">
${[[390, 844], [430, 932], [402, 742]].map(([w, h]) => { const s = sl[`${w}x${h}`]; return `<figure><img src="img/ra-B-phone-${w}.png" alt="What the ${w} by ${h} phone shows of the guide" width="${s.stage[0]}" height="${s.stage[1]}" loading="lazy"><figcaption>${w} × ${h}${w === 402 ? ', your phone in the app' : ''}: the room’s ${s.stage[0]} × ${s.stage[1]} px, from x ${Math.round(s.paintingRect[0])}–${Math.round(s.paintingRect[2])}, y ${Math.round(s.paintingRect[1])}–${Math.round(s.paintingRect[3])} of the painting.</figcaption></figure>`; }).join('\n')}
</div>
</section>
${step1Section}

<section id="steps">
<h2>The two steps</h2>
<p>The image session names each picture <code>RA-B-1</code>, <code>RA-B-2</code> and so on in the order it makes them. Step 1 is done: <code>${S1}</code>, made on version 1.1 and accepted (RA-B-1 and RA-B-1b, made on version 1, came first). Step 2 makes <code>${S2}</code>. The Lead gives each step’s go, naming this sheet’s version and hashes, and accepts each picture before the next step starts. All commands run from the sheet’s folder with NumPy and Pillow, and the tool stops if any file is not the sheet’s.</p>
<div class="step">
<h3>Step 1 · the empty room · done</h3>
<p>RA-B-2, from the prompt below (version 1.1’s, unchanged in version 2), accepted by the Lead on 27 November.</p>
<dl><dt>Input</dt><dd><code>${V.files.empty.published}</code>, with no mask and no second picture</dd><dt>Size</dt><dd>1024 × 1536, one picture</dd><dt>Check</dt><dd>The colour check with the empty room’s map (the window held flat black), and the lines against the annotated guide: the horizon at ${M.camera.horizonY}, every vertical upright, the corner and floor seams where the guide puts them, the window round and where the guide has it</dd></dl>
${promptBlock('s1', 'Step 1')}
</div>
<div class="step">
<h3>Step 2 · the furniture</h3>
<p>One masked PLACE edit of <code>${S1}.png</code> (sha256 <code>${RA_B_2.sha256.slice(0, 16)}…</code>) inside the furniture’s outlines grown 6 px (${pct(V.expected.s2.maskedShare)} of the picture, in ${KIT.shapes.length} areas), the desk drawn on RA-B-2’s painted deck. The input shows the guide there. The kept edit is lifted into one layer a piece, for the people’s depth. <b>The 15 px rule:</b> passed against RA-B-2’s painted features, with ${nExc} named exceptions for the Lead’s decision (<a href="#rule15">below</a>).</p>
<div class="pics three">
<figure><img src="img/ra-B-place.png" alt="Step 2's PLACE mask, white where the edit repaints" width="1024" height="1536" loading="lazy"><figcaption>The PLACE mask: white = repaint.</figcaption></figure>
<figure><img src="img/ra-B-split.png" alt="Step 2's split map: one grey for each piece" width="1024" height="1536" loading="lazy"><figcaption>The split map: one grey a piece.</figcaption></figure>
</div>
<div class="scroll wide"><table><thead><tr><th>Piece</th><th>Grey</th><th>Outline px</th><th>Lifted in the dry run</th><th>What it is</th></tr></thead><tbody>${pieceRows}</tbody></table></div>
${cmd(`python3 -I rb1_tools.py s2 B ${S1}.png ${S2}\n# the image tool edits ${S2}-S2-input.png with ${S2}-S2-mask.png (alpha 0 = repaint) and the step-2 prompt\npython3 -I rb1_tools.py keep B ${S1}.png ${S2}-raw.png ${S2}.png\npython3 -I rb1_tools.py lift B ${S1}.png ${S2}.png ${S2}\npython3 -I rb1_tools.py colours B 2 ${S2}.png ${S2}`)}
${promptBlock('s2', 'Step 2')}
</div>
</section>

<section id="checks">
<h2>Checks on this sheet</h2>
<h3>The dry run</h3>
<p>Every command of the tool, once, on the sheet’s own published files, with the code-drawn guides standing in for the image tool’s pictures. This shows that the files, the mask, the prompts and the lift agree with the manifest. It says nothing about a real picture.</p>
<div class="scroll"><table><tbody>
<tr><td>Every file and expected hash</td><td>${yes(DRY.check === 'all files and expected hashes match')}</td></tr>
<tr><td>The two prompts as the manifest gives them</td><td>${yes(Object.values(DRY.promptsAsManifest).every(Boolean))}</td></tr>
<tr><td>Step 2’s mask: ${pct(DRY.s2.maskedShare, 2)}, alpha as expected</td><td>${yes(DRY.s2.alphaAsExpected)}</td></tr>
<tr><td>The kept edit changes nothing more than 4 px outside its mask</td><td>${yes(DRY.s2.keptOutsideMax === 0)}</td></tr>
<tr><td>The lift: all ${Object.keys(DRY.lifted).length} pieces, none missing</td><td>${yes(!DRY.missing.length && Object.keys(DRY.lifted).length === KIT.pieces.length)}</td></tr>
<tr><td>The colour check on steps 1 and 2</td><td>${yes(Object.values(DRY.colours).every(Boolean))}</td></tr>
</tbody></table></div>
<h3>Gaps and openings</h3>
<p>The clear space between each two pieces, tight and with the masks’ 6 px growth; pieces in one area (the hatch and the toolbox) share it, split by their greys. The round window’s glass is ${O['window glass'].clearPx} px from the mask and its frame, as drawn, ${O['window frame (as drawn)'].clearPx} px. The screens lie inside the desk’s piece.</p>
<div class="scroll"><table><thead><tr><th>Pieces</th><th>Tight</th><th>Grown</th></tr></thead><tbody>${gapRows}</tbody></table></div>
<h3>The colour check, version 1 for Room A</h3>
<p>The same check as view A’s, byte for byte. Here the window is in view, so the openings gate holds the window and the screens to flat black. The guides pass every gate. Room B’s own empty-room guide, put through it, fails ${Object.values(CAL.roomB.result).filter(v => !v).length} of them, so it tells the two rooms apart.</p>
<div class="scroll wide"><table><thead><tr><th>Gate</th><th>What it asks</th><th>Empty guide</th><th>Guide</th><th>Room B’s guide</th></tr></thead><tbody>${gateRows}</tbody></table></div>
</section>

<section id="files">
<h2>Everything the image session receives</h2>
<p>${RECEIVES.length} files, by their path on this page. The tool checks each one against the manifest before it uses it. Pass these names and hashes on with the go.</p>
<div class="scroll wide"><table><thead><tr><th>File</th><th>Bytes</th><th>sha256</th></tr></thead><tbody>${hashRows}</tbody></table></div>
<p>Also published, as the evidence for version 2’s checks: ${Object.entries(M.evidence).map(([f, e]) => `<code>${esc(f)}</code> (${esc(curly(e.what))}; sha256 <code>${e.sha256.slice(0, 12)}…</code>)`).join(', ')}.</p>
<p class="dim">For this page only: the three phone crops (<code>img/ra-B-phone-390.png</code>, <code>-430</code>, <code>-402</code>) and version 1.1’s before and after of the guide (<code>img/ra-B-seams-v1.png</code>, <code>-v11</code>), drawn by code; and the four review pictures of RA-B-2 (<code>img/ra-B-2-masks.png</code>, <code>-desk</code>, <code>-features-desk</code>, <code>-features-crates</code>), AI-generated and labelled as such.${C3 ? ` Version 3’s nine review pictures of RA-B-3 and RA-B-3c (${REVIEW3.map(f => `<code>img/${f}</code>`).join(', ')}) are AI-generated and labelled as such too.` : ''}</p>
</section>

<section id="spend">
<h2>Spend and order</h2>
<p>${spendTextV2(spendV2(COST), 'View B’s step 2 is its one picture left, with a re-run if a check fails.')}</p>
<div class="note"><b>Rules.</b> ${M.rules.map(esc).join(' ')}</div>
</section>

<footer class="foot">
<p>Every picture on this page is drawn by code (the guides, masks, maps and phone crops, made from the approved Room A plan, version 1795050100-be2f, and the owner’s layout file, read unchanged, sha256 <code>36edd4c7…</code>), except the four review pictures of RA-B-2${C3 ? ' and the nine of RA-B-3 and RA-B-3c (RA-B-3c a code composite of AI-generated pictures)' : ''}, which are AI-generated and labelled as such. RA-B-1 and RA-B-1b, made on version 1 (sha256 <code>${RA_B_1.sha256.slice(0, 16)}…</code> and <code>${RA_B_1B.sha256.slice(0, 16)}…</code>), are in the image session’s records; they are not shown here.</p>
<p>${C3 ? `Sheet RA-B, version 3, ${C3.date}. Version 2’s manifest, unchanged: sha256 <code>${DRY.manifestSha256}</code>. RA-B-3c’s record: sha256 <code>${shaF(PUB + 'composite-B3.json')}</code>. Version 1 was 1795101353-bbde, version 1.1 1795798187-af10, version 2 1795800983-7c70.` : `Sheet RA-B, version ${M.version}, ${M.date}. Manifest sha256 <code>${DRY.manifestSha256}</code>.`}</p>
</footer>
</div>`;
writeFileSync(DIR + 'sheet-ra-b.html', html); copyFileSync(DIR + 'sheet-ra-b.html', PUB + 'sheet-ra-b.html');
console.log('sheet-ra-b.html', html.length, 'chars;', RECEIVES.length, 'files the image session receives');
