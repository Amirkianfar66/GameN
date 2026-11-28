// Sheet RA-@V@'s page (Room A, view @V@: @N@'s place), version 2, for the Lead's review, as sheet RA-B's (sheetB.mjs), with sheet
// RA-A's step-3 section where the food capsule is in view: what the image session receives and does, step by step, with every
// file's sha256; the checks run on the sheet's own files (the dry run and the colour check's calibration); what carries over from
// views A and B; the spend and the rules. Its look is sheet RA-A's (the style block read from ../sheet/sheetA.mjs); the view's own
// words are words@V@.mjs's. Writes sheet-ra-@v@.html and copies it, with the phone crops, into pub/. Reads room-a-ra-@v@.json,
// kit-@V@.json, pub/_dry/summary.json and the colour check's calibration (_cal-*.json). Version 2: the accepted step-1 picture, the 15 px rule and the
// view's own checks, with review pictures of the step-1 picture, each labelled as AI-generated in itself and in its caption; every other
// picture is drawn by code.
// Generates nothing. Usage: node sheet@V@.mjs
import { readFileSync, writeFileSync, copyFileSync, statSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { WORDS } from './words@V@.mjs';
import { spendV2, spendTextV2, v11Note, seamFigures, CRATE_TOP } from '../sheetV/sharedV.mjs';
const DIR = new URL('./', import.meta.url).pathname, PUB = DIR + 'pub/', TOOL = 'r@v@1_tools.py';
const J = f => JSON.parse(readFileSync(DIR + f, 'utf8')), shaF = f => createHash('sha256').update(readFileSync(f)).digest('hex');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const M = J('room-a-ra-@v@.json'), KIT = J('kit-@V@.json'), DRY = J('pub/_dry/summary.json'), V = M.kit.views['@V@'], COST = JSON.parse(readFileSync(DIR + '../owner/cost-A.json', 'utf8')), STEP3 = !!V.prompts.s3;
const CAL = { empty: J('_cal-empty.json'), guide: J('_cal-guide.json'), roomB: J('_cal-roomb.json') };
if (DRY.manifestSha256 !== shaF(DIR + 'room-a-ra-@v@.json')) throw new Error('the dry run is not of this manifest');
const A = readFileSync(DIR + '../sheet/sheetA.mjs', 'utf8'), CSS = A.slice(A.indexOf('<style>') + 7, A.indexOf('</style>'));
for (const w of [390, 430, 402]) copyFileSync(DIR + `ra-@V@-phone-${w}.png`, PUB + `img/ra-@V@-phone-${w}.png`);
const SLANT = M.changes.find(c => c.version === 1.1).added.some(a => a.block === 'view');   // version 1.1's slant treatment: the before/after of the guide (beforeafter.py)
if (SLANT) for (const t of ['v1', 'v11']) copyFileSync(DIR + `ra-@V@-seams-${t}.png`, PUB + `img/ra-@V@-seams-${t}.png`);
const pct = (x, d = 1) => `${(100 * x).toFixed(d)}%`, num = n => n.toLocaleString('en-GB'), yes = b => (b ? '<span class="pill ok">pass</span>' : '<span class="pill no">fail</span>');
// version 2: the accepted step-1 picture (step1-@V@.json), the 15 px rule, the review pictures (overlayV2.py's review-@V@.json) and the
// view's own extra sections (v2extra-@V@.mjs, where there is one)
const S1P = J('step1-@V@.json'), S1N = S1P.name, S2N = S1P.next, S3N = S1P.next3, REVIEW = J('review-@V@.json');
for (const r of REVIEW) copyFileSync(DIR + r.file, PUB + `img/${r.file}`);
const curly = t => String(t).replace(/'/g, '’').split(S1P.sha256).join(S1P.sha256.slice(0, 16) + '…');   // a whole hash does not wrap at a phone's width
const C2 = M.changes[0], C11 = M.changes.find(c => c.version === 1.1), FT = KIT.featureTest;
if (Math.floor(C2.version) !== 2 || !C11 || !FT.passed || FT.picture.sha256 !== S1P.sha256) throw new Error('the manifest or the kit is not version 2 on the accepted step-1 picture');
const nExc = FT.exceptions.reduce((n, e) => n + e.parts.length, 0), nPass = FT.features.filter(f => !f.exception).length;
const stTxt = r => r.status === 'clear' ? `clear by ${r.clearPx}${r.clearPx >= 60 ? '+' : ''} px` : r.status === 'inside' ? `inside by ${r.insidePx} px` : r.status;
const ftRows = FT.features.map(f => `<tr><td>${esc(curly(f.name))}</td><td>${stTxt(f.step2)}${STEP3 && f.step3.status !== 'no step 3' ? `; step 3: ${stTxt(f.step3)}` : ''}</td><td class="n">${num(f.pxWithin15.step2 + f.pxWithin15.step3)}</td><td>${(f.exception || []).map(e => `<b>${esc(curly(e.where))}.</b> ${esc(curly(e.why))}`).join('<br>') || 'passes outright'}</td></tr>`).join('');
const fig = r => `<figure><img src="img/${r.file}" alt="${esc(r.alt)}" width="${r.w}" height="${r.h}" loading="lazy"><figcaption>${esc(r.caption)}</figcaption></figure>`;
const figs = sec => REVIEW.filter(r => r.section === sec).map(fig).join('\n');
const newFiles = (() => { const seen = new Set(); return Object.values(C2.files).filter(f => !seen.has(f.published) && seen.add(f.published)); })();
const crate = V.prompts.s2.text.includes(CRATE_TOP);
const EXTRA = existsSync(DIR + 'v2extra-@V@.mjs') ? (await import('./v2extra-@V@.mjs')).extra({ M, KIT, V, J, esc, curly, num, figs, S1P }) : { notes: [], sections: '' };
const GR = KIT.growth, PREV = S1P.previous;
// version 3, where a kept step-2 picture was held for cut edges and completed in code (v3-@V@.mjs, where there is one)
const V3 = existsSync(DIR + 'v3-@V@.mjs') ? (await import('./v3-@V@.mjs')).v3({ M, J, esc, curly, num, yes, shaF, DIR, PUB, DRY, S1N, S2N }) : null;
const v2Note = `<div class="note"><b>Version ${M.version}, from the Lead’s review of ${esc(S1N)}, 27 November.</b> ${esc(curly(S1P.why[0]))}${PREV ? ` Version ${PREV.version} (${esc(PREV.published)}) was the same but for the growth; ${esc(curly(PREV.review))}.` : ''}<ul>
${GR ? `<li><b>The selective 12 px growth</b> (the Lead, 27 November, 18:38). Step 2’s mask grows 12 px more wherever no traced feature, small light, window or step-3 capsule lies within 15 px of the new edge, so a piece painted a little past its outline is not cut: ${num(GR.addedPx)} px added, ${pct(GR.maskedShareBefore, 2)} → ${pct(GR.maskedShareAfter, 2)} of the picture. The split map grows with it, each added pixel taking its piece’s grey. Larger overruns are completed in code from the raw, as RA-B-3c was. <a href="#step1">The overlay</a>.</li>` : ''}
<li><b>The 15 px rule, against ${esc(S1N)}’s painted features.</b> Passed: ${FT.features.length} features near the mask${STEP3 ? 's' : ''}; ${nPass} pass outright${FT.exceptions.length ? ` and ${FT.exceptions.length} on ${nExc} named exceptions, for the Lead’s decision, each where a piece stands in front of a feature` : ''}. <a href="#rule15">Below</a>.</li>
${EXTRA.notes.map(n => `<li>${n}</li>`).join('\n')}
<li><b>The prompts</b> are version 1.1’s, byte for byte, as ${esc(S1N)} was made with them${crate ? `; step 2’s PLACE block carries the Lead’s crate-top line, as it has since version 1: “${esc(curly(CRATE_TOP))}”` : ''}.</li>
<li><b>Files.</b> ${newFiles.some(f => !f.same) ? `New bytes: ${newFiles.filter(f => !f.same).map(f => `<code>${esc(f.published)}</code>`).join(', ')}; the other ${newFiles.filter(f => f.same).length} pictures are version 1.1’s, byte for byte.` : `All ${newFiles.length} pictures are version 1.1’s, byte for byte.`} The manifest is new: step 1 done, step 2’s input pinned, the checks and the evidence files.</li></ul></div>`;
const v2Sections = `<section id="step1">
<h2>Step 1 · done: ${esc(S1N)}</h2>
<p>${esc(S1N)} (sha256 <code>${S1P.sha256.slice(0, 16)}…</code>) was made on version 1.1 and ${esc(curly(S1P.result))}. It is an AI-generated picture; its record, with its tool, prompt, date and settings, is in the image session’s records. The pictures in this version that show it, with this sheet’s masks drawn over it, are for review only: each is labelled as AI-generated in itself and in its caption, and none is an input, an asset or a commit.</p>
<div class="pics">${figs('step1')}</div>
</section>
${EXTRA.sections}
<section id="rule15">
<h2>The 15 px rule on ${esc(S1N)}</h2>
<p>Every edge of ${STEP3 ? 'steps 2 and 3’s masks' : 'step 2’s mask'} either covers a painted feature with 15 px to spare or clears it by 15 px. ${esc(S1N)}’s features near the mask${STEP3 ? 's' : ''} were traced at three or four times on a 10 px grid (<code>features@V@.json</code>), and the test is view A’s own code (<code>feat15.py</code>). ${nPass} of the ${FT.features.length} pass outright.${FT.exceptions.length ? ` The other ${FT.exceptions.length} pass on ${nExc} named exceptions, each a zone where a piece stands in front of the feature, so its outline must cross it or run along it: these are for the Lead’s decision.` : ''} The ${FT.lights.length} indicator dots are at least ${Math.min(...FT.lights.map(l => Math.min(l.step2ClearPx, l.step3ClearPx ?? 99)))} px from every mask.</p>
<div class="scroll wide"><table><thead><tr><th>Feature</th><th>Against the mask</th><th>Px within 15</th><th>Named exception</th></tr></thead><tbody>${ftRows}</tbody></table></div>
<div class="pics">${figs('rule15')}</div>
</section>`;
const N_STEPS = STEP3 ? 3 : 2, STEPS_WORD = STEP3 ? 'three' : 'two';
const DESC = { empty: "step 1's input: the empty-room guide", emptyRegions: "the colour check's map for step 1", emptyAnnotated: "for checking the lines: the horizon, the phones' slices, where people stand",
  guide: STEP3 ? "the guide with the furniture and the capsule: step 3's input inside its mask" : "the guide with the furniture: step 2's input inside the PLACE mask", guideS2: "the guide without the capsule: step 2's input inside the PLACE mask",
  regions: STEP3 ? "the colour check's map for steps 2 and 3" : "the colour check's map for step 2", place: "step 2's PLACE mask (white = repaint)", split: "step 2's split map: one grey a piece, for the lift",
  place3: "step 3's mask (white = repaint)", split3: "step 3's split map: the capsule's grey, for its layer" };
const RECEIVES = [
  ...Object.entries(V.files).filter(([k, e]) => !(k === 'guideS2' && e.published === V.files.guide.published)).map(([k, e]) => [e.published, DESC[k]]),
  ['room-a-ra-@v@.json', 'the manifest: the kit the tool reads, the prompts, the expected hashes, the camera'], ['room-a-ra-@v@-prompts.txt', `the ${STEPS_WORD} prompts, each with its sha256`],
  [TOOL, STEP3 ? "the tool, version 1: sheet RA-A's, with view @V@'s manifest" : "the tool, version 1: sheet RA-B's, with view @V@'s manifest and no step 3"], ['lift5.py', "the lift, the Lead's recipe (the same bytes as sheet RA-A's)"], ['colour-check-ra1.py', "the Room A colour check, version 1 (the same bytes as sheet RA-A's)"],
  ['camera-report-@V@.json', "the camera report, version 2 (the Room A plan's; regenerated byte for byte on today's stage)"]].map(([f, what]) => ({ f, what, bytes: statSync(PUB + f).size, sha: shaF(PUB + f) }));
const hashRows = RECEIVES.map(r => `<tr><td><code>${esc(r.f)}</code><div class="dim">${esc(r.what)}</div></td><td class="n">${num(r.bytes)}</td><td class="h"><code>${r.sha}</code></td></tr>`).join('');
const promptBlock = (k, title) => { const p = V.prompts[k]; return `<details><summary>${title}: the prompt, ${num(p.chars)} characters · sha256 <code>${p.sha256.slice(0, 16)}…</code></summary><pre>${esc(p.text)}</pre><p class="dim">sha256 <code>${p.sha256}</code>, of the text in UTF-8, as <code>room-a-ra-@v@-prompts.txt</code> gives it.</p></details>`; };
const pieceRows = KIT.pieces.map(p => `<tr><td>${esc(p.name)}</td><td class="n">${p.grey}</td><td class="n">${num(p.px)}</td><td class="n">${DRY.lifted[`${p.place} ${p.name}`] !== undefined ? num(DRY.lifted[`${p.place} ${p.name}`]) : '–'}</td><td>${esc(WORDS.pieces[p.name] ?? '')}</td></tr>`).join('');
const gateRows = Object.keys(CAL.empty.result).map(g => `<tr><td>${esc(g)}</td><td>${esc(CAL.empty.gates?.[g] ?? '')}</td><td>${yes(CAL.empty.result[g])}</td><td>${yes(CAL.guide.result[g])}</td><td>${yes(CAL.roomB.result[g])}</td></tr>`).join('');
const gapRows = Object.entries(KIT.gaps).map(([k, g]) => `<tr><td>${esc(k)}</td><td class="n">${g.tightPx >= 199 ? '199+ px' : `${g.tightPx} px`}</td><td class="n">${g.grownPx < 0 ? 'overlap' : g.grownPx >= 199 ? '199+ px' : `${g.grownPx} px`}</td></tr>`).join('');
const OWN = Object.entries(KIT.ownStation.objects), ownShown = OWN.some(([, o]) => o.paintingPx > 0);
const ownRows = OWN.map(([n, o]) => `<tr><td>${esc(n)}</td><td class="n">${num(o.paintingPx)}</td>${['390x844', '430x932', '402x742'].map(s => `<td class="n">${num(o.slicePx[s])}</td>`).join('')}</tr>`).join('');
const O = KIT.openings, sl = M.camera.phones.slices, R = JSON.parse(readFileSync(DIR + 'pub/camera-report-@V@.json', 'utf8'));
const cmd = s => `<pre class="cmd">${esc(s)}</pre>`;
const people = Object.values(R.people).map(p => `${esc(p.name)} (${esc(p.work)}, seen ${esc(p.seenSide)}, ${esc(p.head)})`).join('; ');
const X = { M, KIT, V, DRY, O, R, people, pct, num, STEP3 };
const html = `<title>Room A sheet RA-@V@</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600&display=swap">
<style>${CSS}</style>
<div class="wrap">
<header>
<h1>Sheet RA-@V@ · Room A, view @V@</h1>
<span class="status">${V3 ? V3.status : `Version ${M.version} · for the Lead’s review · step 2 after the Lead’s go`}</span>
<p class="lede">${WORDS.lede}</p>
${V3 ? `${V3.note}\n<details><summary>Version ${M.version}’s changes</summary>${v2Note}</details>` : v2Note}
<details><summary>Version 1.1’s changes</summary>${v11Note({ changes: [C11] }, esc)}</details>
<div class="note"><b>What carries over from views A and B.</b><ul>
${WORDS.carries(X).map(([t, s]) => `<li><b>${t}.</b> ${s}</li>`).join('\n')}</ul></div>
<div class="facts">${V3 ? V3.fact : ''}<span class="pill ok">Step 1 done: ${esc(S1N)}</span><span class="pill ok">15 px rule: passed${nExc ? `, ${nExc} named exceptions` : ''}</span><span class="pill">Step 2’s mask ${pct(V.expected.s2.maskedShare)} in ${KIT.shapes.length} ${KIT.shapes.length === 1 ? 'area' : 'areas'}</span>${STEP3 ? `<span class="pill">Step 3’s mask ${pct(V.expected.s3.maskedShare, 2)}</span>` : ''}${O['window frame (as drawn)'] ? `<span class="pill ok">Window frame ${O['window frame (as drawn)'].clearPx} px clear</span>` : ''}<span class="pill ok">Dry run: every step matches its manifest</span><span class="pill ok">Colour check: the guides pass</span><span class="pill">Camera report v2</span>${ownShown ? '<span class="pill">Own station left out, as the plan</span>' : ''}</div>
</header>

${V3 ? V3.section + '\n' : ''}<section id="picture">
<h2>The picture</h2>
<p>As views A’s and B’s: 1024 × 1536, straight lines, ${M.camera.acrossDeg}° across (focal ${M.camera.focalPx} px), level, the horizon ${M.camera.horizonY} px from the top. ${WORDS.where(X)} In view: ${people}. ${esc(R.outOfView.name)} is out of view.</p>
<div class="pics">
<figure><img src="img/ra-@V@-empty.png" alt="${esc(WORDS.alts.empty)}" width="1024" height="1536" loading="lazy"><figcaption>Step 1’s input: the empty room, Room A’s colour plan.</figcaption></figure>
<figure><img src="img/ra-@V@-guide.png" alt="${esc(WORDS.alts.guide)}" width="1024" height="1536" loading="lazy"><figcaption>${STEP3 ? 'With the furniture and the capsule: where steps 2 and 3 paint.' : 'With the furniture: where step 2 paints.'}</figcaption></figure>
<figure><img src="img/ra-@V@-empty-annotated.png" alt="The annotated guide: the horizon, the three phones' slices, the furniture's outlines and the people's stand-ins at their spots" width="1024" height="1536" loading="lazy"><figcaption>For checking: the horizon, the three phones’ slices, the outlines, and where the people stand (stand-ins, never painted).</figcaption></figure>
</div>
${SLANT ? seamFigures('@V@') : ''}
<h3>What each phone shows</h3>
<div class="pics three">
${[[390, 844], [430, 932], [402, 742]].map(([w, h]) => { const s = sl[`${w}x${h}`]; return `<figure><img src="img/ra-@V@-phone-${w}.png" alt="What the ${w} by ${h} phone shows of the guide" width="${s.stage[0]}" height="${s.stage[1]}" loading="lazy"><figcaption>${w} × ${h}${w === 402 ? ', your phone in the app' : ''}: the room’s ${s.stage[0]} × ${s.stage[1]} px, from x ${Math.round(s.paintingRect[0])}–${Math.round(s.paintingRect[2])}, y ${Math.round(s.paintingRect[1])}–${Math.round(s.paintingRect[3])} of the painting.</figcaption></figure>`; }).join('\n')}
</div>
</section>
${v2Sections}

<section id="steps">
<h2>The ${STEPS_WORD} steps</h2>
<p>Step 1 is done: <code>${esc(S1N)}</code>, accepted. Step 2 makes <code>${esc(S2N)}</code>${STEP3 ? `, and step 3 <code>${esc(S3N)}</code>` : ''}. The Lead gives each step’s go, naming this sheet’s version and hashes, and accepts each picture before the next step starts. All commands run from the sheet’s folder with NumPy and Pillow, and the tool stops if any file is not the sheet’s.</p>
<div class="step">
<h3>Step 1 · the empty room · done</h3>
<p>${esc(S1N)}, from the prompt below (version 1.1’s, unchanged in version 2), ${esc(curly(S1P.result))}.</p>
<dl><dt>Input</dt><dd><code>${V.files.empty.published}</code>, with no mask and no second picture</dd><dt>Size</dt><dd>1024 × 1536, one picture</dd><dt>Check</dt><dd>${WORDS.step1Check(X)}</dd></dl>
${promptBlock('s1', 'Step 1')}
</div>
<div class="step">
<h3>Step 2 · the furniture</h3>
<p>One masked PLACE edit of <code>${esc(S1N)}.png</code> (sha256 <code>${S1P.sha256.slice(0, 16)}…</code>) inside the furniture’s outlines grown 6 px (${pct(V.expected.s2.maskedShare)} of the picture, in ${KIT.shapes.length} ${KIT.shapes.length === 1 ? 'area' : 'areas'}). The input shows ${STEP3 ? 'the step-2 guide, without the capsule,' : 'the guide'} there. The kept edit is lifted into one layer a piece, for the people’s depth. <b>The 15 px rule:</b> passed against ${esc(S1N)}’s painted features${nExc ? `, with ${nExc} named exceptions for the Lead’s decision` : ''} (<a href="#rule15">below</a>).</p>
<div class="pics three">
<figure><img src="img/ra-@V@-place.png" alt="Step 2's PLACE mask, white where the edit repaints" width="1024" height="1536" loading="lazy"><figcaption>The PLACE mask: white = repaint.</figcaption></figure>
<figure><img src="img/ra-@V@-split.png" alt="Step 2's split map: one grey for each piece" width="1024" height="1536" loading="lazy"><figcaption>The split map: one grey a piece.</figcaption></figure>
</div>
<div class="scroll wide"><table><thead><tr><th>Piece</th><th>Grey</th><th>Outline px</th><th>Lifted in the dry run</th><th>What it is</th></tr></thead><tbody>${pieceRows}</tbody></table></div>
${cmd(`python3 -I ${TOOL} s2 @V@ ${S1N}.png ${S2N}\n# the image tool edits ${S2N}-S2-input.png with ${S2N}-S2-mask.png (alpha 0 = repaint) and the step-2 prompt\npython3 -I ${TOOL} keep @V@ ${S1N}.png ${S2N}-raw.png ${S2N}.png\npython3 -I ${TOOL} lift @V@ ${S1N}.png ${S2N}.png ${S2N}\npython3 -I ${TOOL} colours @V@ 2 ${S2N}.png ${S2N}`)}
${promptBlock('s2', 'Step 2')}
</div>
${STEP3 ? `<div class="step">
<h3>Step 3 · the food capsule</h3>
<p>${WORDS.step3(X)}</p>
<div class="pics three">
<figure><img src="img/ra-@V@-place3.png" alt="Step 3's mask: the capsule's outline grown 2 pixels" width="1024" height="1536" loading="lazy"><figcaption>Step 3’s mask: white = repaint.</figcaption></figure>
<figure><img src="img/ra-@V@-split3.png" alt="Step 3's split map: the capsule's grey" width="1024" height="1536" loading="lazy"><figcaption>The capsule’s own layer: ${num(Object.values(DRY.lifted3 ?? {})[0] ?? 0)} px in the dry run.</figcaption></figure>
</div>
${cmd(`python3 -I ${TOOL} s3 @V@ ${S2N}.png ${S3N}\n# the image tool edits ${S3N}-S3-input.png with ${S3N}-S3-mask.png (alpha 0 = repaint) and the step-3 prompt\npython3 -I ${TOOL} keep3 @V@ ${S2N}.png ${S3N}-raw.png ${S3N}.png\npython3 -I ${TOOL} lift3 @V@ ${S2N}.png ${S3N}.png ${S3N}\npython3 -I ${TOOL} colours @V@ 3 ${S3N}.png ${S3N}`)}
${promptBlock('s3', 'Step 3')}
</div>` : ''}
</section>

<section id="checks">
<h2>Checks on this sheet</h2>
<h3>The dry run</h3>
<p>Every command of the tool, once, on the sheet’s own published files, with the code-drawn guides standing in for the image tool’s pictures. This shows that the files, the ${STEP3 ? 'masks' : 'mask'}, the prompts and the lift agree with the manifest. It says nothing about a real picture.</p>
<div class="scroll"><table><tbody>
<tr><td>Every file and expected hash</td><td>${yes(DRY.check === 'all files and expected hashes match')}</td></tr>
<tr><td>The ${STEPS_WORD} prompts as the manifest gives them</td><td>${yes(Object.values(DRY.promptsAsManifest).every(Boolean))}</td></tr>
<tr><td>Step 2’s mask: ${pct(DRY.s2.maskedShare, 2)}, alpha as expected</td><td>${yes(DRY.s2.alphaAsExpected)}</td></tr>
<tr><td>Step 2’s kept edit changes nothing more than 4 px outside its mask</td><td>${yes(DRY.s2.keptOutsideMax === 0)}</td></tr>
<tr><td>Step 2’s lift: all ${Object.keys(DRY.lifted).length} pieces, none missing</td><td>${yes(!DRY.missing.length && Object.keys(DRY.lifted).length === KIT.pieces.length)}</td></tr>
${STEP3 ? `<tr><td>Step 3’s mask: ${pct(DRY.s3.maskedShare, 2)}, alpha as expected</td><td>${yes(DRY.s3.alphaAsExpected)}</td></tr>
<tr><td>Step 3’s kept edit changes nothing more than 4 px outside its mask</td><td>${yes(DRY.s3.keptOutsideMax === 0)}</td></tr>
<tr><td>Step 3’s lift: the capsule’s layer</td><td>${yes(!DRY.missing3.length && Object.keys(DRY.lifted3).length === 1)}</td></tr>` : ''}
<tr><td>The colour check on steps ${STEP3 ? '1, 2 and 3' : '1 and 2'}</td><td>${yes(Object.values(DRY.colours).every(Boolean))}</td></tr>
</tbody></table></div>
<h3>Gaps and openings</h3>
<p>${WORDS.gaps(X)}</p>
<div class="scroll"><table><thead><tr><th>Pieces</th><th>Tight</th><th>Grown</th></tr></thead><tbody>${gapRows}</tbody></table></div>
${ownShown ? `<h3>${esc(R.viewer)}’s own station</h3>
<p>${WORDS.own(X)}</p>
<div class="scroll"><table><thead><tr><th>Left out</th><th>In the painting, px</th><th>390 × 844</th><th>430 × 932</th><th>402 × 742</th></tr></thead><tbody>${ownRows}</tbody></table></div>` : ''}
<h3>The colour check, version 1 for Room A</h3>
<p>The same check as views A’s and B’s, byte for byte. ${WORDS.colour(X)} The guides pass every gate. Room B’s own empty-room guide, put through it, fails ${Object.values(CAL.roomB.result).filter(v => !v).length} of them, so it tells the two rooms apart.</p>
<div class="scroll wide"><table><thead><tr><th>Gate</th><th>What it asks</th><th>Empty guide</th><th>Guide</th><th>Room B’s guide</th></tr></thead><tbody>${gateRows}</tbody></table></div>
</section>

<section id="files">
<h2>Everything the image session receives</h2>
<p>${RECEIVES.length} files, by their path on this page. The tool checks each one against the manifest before it uses it. Pass these names and hashes on with the go.</p>
<div class="scroll wide"><table><thead><tr><th>File</th><th>Bytes</th><th>sha256</th></tr></thead><tbody>${hashRows}</tbody></table></div>
<p class="dim">For this page only: the three phone crops (<code>img/ra-@V@-phone-390.png</code>, <code>-430</code>, <code>-402</code>)${SLANT ? ' and version 1.1’s before and after of the guide (<code>img/ra-@V@-seams-v1.png</code>, <code>-v11</code>)' : ''}, drawn by code; and the review pictures of ${esc(S1N)} (${REVIEW.map(r => `<code>img/${r.file}</code>`).join(', ')}), AI-generated and labelled as such.${V3 ? ' ' + V3.pageOnly : ''}</p>\n<p>Also published, as the evidence for version 2’s checks: ${Object.entries(M.evidence).map(([f, e]) => `<code>${esc(f)}</code> (${esc(curly(e.what))}; sha256 <code>${e.sha256.slice(0, 12)}…</code>)`).join(', ')}.</p>${V3 ? '\n' + V3.evidence : ''}
</section>

<section id="spend">
<h2>Spend and order</h2>
<p>${spendTextV2(spendV2(COST), `View @V@’s ${STEP3 ? 'steps 2 and 3 are its two pictures left' : 'step 2 is its one picture left'}, with a re-run if a check fails.`)}</p>
<div class="note"><b>Rules.</b> ${M.rules.map(esc).join(' ')}</div>
</section>

<footer class="foot">
<p>Every picture on this page is drawn by code (the guides, masks, maps and phone crops, made from the approved Room A plan, version 1795050100-be2f, and the owner’s layout file, read unchanged, sha256 <code>36edd4c7…</code>), except the review pictures of ${esc(S1N)}${V3 ? V3.footerPics : ''}, which are AI-generated and labelled as such.</p>
<p>${V3 ? V3.footer : `Sheet RA-@V@, version ${M.version}, ${M.date}. Manifest sha256 <code>${DRY.manifestSha256}</code>.`}</p>
</footer>
</div>`;
writeFileSync(DIR + 'sheet-ra-@v@.html', html); copyFileSync(DIR + 'sheet-ra-@v@.html', PUB + 'sheet-ra-@v@.html');
console.log('sheet-ra-@v@.html', html.length, 'chars;', RECEIVES.length, 'files the image session receives');
