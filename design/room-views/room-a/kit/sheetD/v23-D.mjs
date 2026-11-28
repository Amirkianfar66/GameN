// Sheet RA-D version 2.3's own parts of the page (v3-D.mjs wraps its version-2.2 parts with these where the manifest is version 2.3):
// step 2b's run RA-D-3h, kept and completed in code as RA-D-3hc (compositeD3hc.py, composite-D3hc.json), the toolbox's painted place
// (painted-D.json), and step 3 pinned to RA-D-3hc by the tool's version 3, with the review pictures (reviewD3hc.py's review-D3hc.json),
// each labelled as AI-generated in itself and in its caption. Copies those review pictures into pub/img; the evidence files are staged
// by buildD.mjs. Version 2.2's files are kept byte for byte.
import { copyFileSync } from 'fs';
export function v23(out, { M, J, esc, curly, num, yes, shaF, DIR, PUB, DRY }) {
  const HC = J('composite-D3hc.json'), PDJ = J('painted-D.json'), RS = J('review-D3hc.json'), V = M.kit.views.D, CH = M.changes.find(c => c.version === 2.3);   // under a version 2.4 too
  if (M.version < 2.3 || !CH || !HC.pass) throw new Error('version 2.3 needs a passing RA-D-3hc');
  if (!DRY.s3 || !DRY.s3.pinned || !DRY.s3.standIn || !DRY.s3.alphaAsExpected || DRY.missing3.length || !DRY.colours['3']) throw new Error("step 3's dry run does not pass on the pinned start");
  const REVIEW = Object.keys(RS);
  for (const f of REVIEW) copyFileSync(DIR + f, PUB + `img/${f}`);
  const fig = (f, alt, cap) => `<figure><img src="img/${f}" alt="${esc(alt)}" width="${RS[f][0]}" height="${RS[f][1]}" loading="lazy"><figcaption>${cap}</figcaption></figure>`;
  const pct = (x, d = 2) => `${(100 * x).toFixed(d)}%`, px = V.expected.s3.startPixels, CK = HC.checks, TB = PDJ.toolbox, CC = HC.colourCheck;
  const src = n => HC.sources.find(s => s.name === n), run = n => HC.outline.runs.find(r => r.name === n).reachesPastTheMaskPx;
  const PN = { lid: 'The lid: its top, both sides and its corners', hatch: 'The hatch’s rims: both outer edges and their corners, the near rim', gap: 'The gap between step 2b’s two areas', toolbox: 'The toolbox, whole: its left side, bottom edges, corners, top and handle' };
  const partRows = Object.entries(HC.parts).map(([k, p]) => `<tr><td>${PN[k]}</td><td class="n">${num(p.changedPx)}</td><td class="n">${num(p.outsideTheMask)}</td><td class="n">${p.furthestPastTheMaskPx}</td><td>x ${p.box[0]}–${p.box[2]}, y ${p.box[1]}–${p.box[3]}</td></tr>`).join('');
  const bc = TB.picture.baseCorners, dk = TB.deck;
  const note = `<div class="note"><b>Version 2.3, from the Lead’s review of RA-D-3h, 27 November (22:54).</b> The hatch-only edit worked: the hatch right-sized and in its place, the lid upright. The toolbox is right-sized but painted about 27 px left of its area; it stays where the raw painted it. So:<ul>
<li><b>RA-D-3hc,</b> RA-D-3h with the hatch, its lid and the toolbox completed in code from its raw, inside one outline traced on the raw all round their outer ink, with no closing path: the lid’s top (up to ${run("the lid's top")} px past the mask) and sides, both rims’ outer edges (up to ${Math.max(run("the right rim's outer edge"), run("the hatch's left rim's outer edge"))} px), the ${num(HC.parts.gap.changedPx)} px of the gap where the raw runs the hatch on to the box, and the toolbox whole at the raw’s place. ${num(CK['changedPxAgainstRA-D-3h'])} px differ from RA-D-3h; the other ${num(CK['unchangedPxAgainstRA-D-3h'])} of ${num(CK.picturePx)} are unchanged. <a href="#ra-d-3hc">Below</a>.</li>
<li><b>The toolbox’s place,</b> recorded for view D’s lift and occlusion (<code>painted-D.json</code>): on the deck ${(Math.abs(dk.shift[0]) * 100).toFixed(1)} cm west of the plan’s place, turned ${dk.turnDeg}°.</li>
<li><b>Left out:</b> the raw’s shadow on the deck at the box’s front-left, which lies outside its ink; RA-D-3h’s lit deck stays there. It can be taken too, if you want it.</li>
<li><b>Step 3 pinned.</b> The tool, version 3: <code>s3</code>, <code>keep3</code> and <code>lift3</code> stop unless their start is RA-D-3hc, pixel for pixel; step 3’s colour check uses step 2b’s map, on which RA-D-3hc passes all ten gates. Step 3’s mask, its prompt and every other file are version 2.2’s. <a href="#step3-pin">Below</a>.</li>
<li><b>Files.</b> New: <code>compositeD3hc.py</code>, <code>composite-D3hc.json</code>, <code>painted-D.json</code> and the tool, version 3. The manifest pins step 3’s start and puts version 2.2’s change after 2.3’s, unchanged.</li></ul></div>`;
  const section = `<section id="ra-d-3hc">
<h2>Version 2.3 · step 2b’s picture, RA-D-3hc, and step 3 on it</h2>
<p>Step 2b’s run, <code>RA-D-3h</code> (kept sha256 <code>${src('RA-D-3h').sha256.slice(0, 12)}…</code>, raw <code>${src('RA-D-3h-raw').sha256.slice(0, 12)}…</code>), was made on version 2.2: the hatch right-sized and in its place, the lid upright; the toolbox right-sized, painted about 27 px left of its area. The Lead’s decision: ${esc(curly(HC.decision.replace(/^the Lead, 27 November 2026, 22:54: /, '')))}.</p>
<h3>RA-D-3hc</h3>
<p><b>How.</b> ${esc(curly(HC.codeComposite.how[0].toUpperCase() + HC.codeComposite.how.slice(1)))}. In the raw the toolbox stands on the hatch’s near-left end, its handle against the hatch’s left rim and its right side against the near rim, so one outline round all three closes on their own ink everywhere. It was read on the raw: ${esc(curly(HC.tracing.replace(/^on the raw: /, '')))}.</p>
<div class="facts"><span class="pill ok">RA-D-3h rebuilt from RA-D-3x and its raw: exact</span><span class="pill ok">Changed against RA-D-3h: ${num(CK['changedPxAgainstRA-D-3h'])} px, none outside the outline and its 1 px feather</span><span class="pill ok">Unchanged: ${num(CK['unchangedPxAgainstRA-D-3h'])} of ${num(CK.picturePx)} px</span><span class="pill ok">The raw taken whole inside the outline</span><span class="pill ok">Nothing else changed against RA-D-3x; both screens untouched</span><span class="pill ok">Colour check: all ten gates (step 2b’s map)</span></div>
<div class="scroll wide"><table><thead><tr><th>Completed</th><th>Changed px</th><th>Outside the mask</th><th>Furthest past it, px</th><th>Where</th></tr></thead><tbody>${partRows}</tbody></table></div>
<p><b>The overruns.</b> The lid’s top lies up to ${run("the lid's top")} px past step 2b’s mask (its outer ink at y 898 to 912, where the mask’s top slopes from y 916 to 936), its right side up to ${run("the lid's right side")} px at its top corner, its left side up to ${run("the lid's left side")} px; the right rim’s outer edge ${run("the right rim's outer edge")} px past at its far end, less toward the near end, and the left rim’s up to ${run("the hatch's left rim's outer edge")} px. The 8 px gap between the two areas showed RA-D-3x’s deck across the hatch’s near-left end; it is the raw’s now, the rim and the near rim running on to the box.</p>
<p><b>The toolbox, at the raw’s place.</b> Its left side lies up to ${run("the toolbox's left side")} px left of its area and its bottom-left corner ${run("the toolbox's bottom-left corner")} px past it. Its base corners in the picture: ${Object.entries(bc).map(([k, v]) => `${k.split(' ')[0]} (${v.join(', ')})`).join(', ')}. ${esc(curly(dk.how[0].toUpperCase() + dk.how.slice(1)))}: its centre at (${dk.centre.join(', ')}) m, ${(Math.abs(dk.shift[0]) * 100).toFixed(1)} cm west of the plan’s (${dk.planCentre.join(', ')}), turned ${dk.turnDeg}°, the plan’s box meeting its corners within ${Math.max(...Object.values(dk.fitResidualM)) * 100} cm (its west face ${dk.faceLengthsM['west face (left to front)'].painted} m against the plan’s ${dk.faceLengthsM['west face (left to front)'].plan}, its south face ${dk.faceLengthsM['south face (front to right)'].painted} m against ${dk.faceLengthsM['south face (front to right)'].plan}). <code>painted-D.json</code> records it: ${esc(curly(TB.use))}.</p>
<p><b>Left out.</b> ${esc(curly(HC.leftOut[0].toUpperCase() + HC.leftOut.slice(1)))}. If you want it, it can be taken from the raw too, closing where the shadow’s edge meets the lit deck.</p>
<p>The pictures below show RA-D-3h, its raw edit and RA-D-3hc, all AI-generated (RA-D-3hc a code composite of AI-generated pictures); each is labelled in itself and in its caption, and none is an input, an asset or a commit.</p>
<div class="pics">
${fig('ra-D-3hc-lid.png', 'AI-generated pictures RA-D-3h and RA-D-3hc: the lid’s edges at three times, before, after, and with the outline and the mask', 'AI-generated pictures: the lid’s edges at 3×, RA-D-3h (cut along the mask), RA-D-3hc, and RA-D-3hc with the outline (cyan) and step 2b’s mask (magenta).')}
${fig('ra-D-3hc-gap.png', 'AI-generated pictures RA-D-3h and RA-D-3hc: the hatch’s near-left rim through the gap at three times', 'AI-generated pictures: the hatch’s near-left rim through the 8 px gap at 3×, RA-D-3h (RA-D-3x’s deck across the hatch), RA-D-3hc, and RA-D-3hc with the outline and the mask.')}
${fig('ra-D-3hc-toolbox.png', 'AI-generated pictures RA-D-3h, its raw edit and RA-D-3hc: the toolbox at three times', 'AI-generated pictures: the toolbox at 3×, RA-D-3h and RA-D-3hc above; RA-D-3h’s raw edit (its shadow on the deck, left out) and RA-D-3hc with the outline and the mask below.')}
${fig('ra-D-3hc-402.png', 'AI-generated pictures RA-D-3h and RA-D-3hc at 402 by 742', 'AI-generated pictures: the 402 × 742 view, the stage’s slice of the painting at 2×, RA-D-3h and RA-D-3hc; no people or controls drawn.')}
${fig('ra-D-3hc-changed.png', 'AI-generated picture RA-D-3hc dimmed, every pixel that differs from RA-D-3h lit by part', `AI-generated picture RA-D-3hc, dimmed: every pixel that differs from RA-D-3h (${num(CK['changedPxAgainstRA-D-3h'])}) lit, the lid gold, the hatch cyan, the gap white, the toolbox magenta; step 2b’s mask dashed.`)}
${fig('ra-D-3hc-whole.png', 'AI-generated picture RA-D-3hc, whole', 'AI-generated picture RA-D-3hc, whole: view D’s step-2 plate, step 3’s start.')}
</div>
<p>RA-D-3hc itself, <code>ra-D-3hc.png</code>, is not published here as a file of the kit: <code>compositeD3hc.py</code> makes it from the image session’s records (RA-D-3h, its raw and RA-D-3x), and stops unless its pixels’ sha256 is <code>${px}</code>.</p>

<h3 id="step3-pin">Step 3 on RA-D-3hc</h3>
<p><b>The tool, version 3.</b> <code>s3</code>, <code>keep3</code> and <code>lift3</code> stop unless the picture they start from is RA-D-3hc, pixel for pixel (sha256 <code>${px}</code>), except with <code>--stand-in</code>, which only the dry run uses. <b>Step 3’s colour map</b> is step 2b’s, with the two screens where they are painted: on RA-D-3hc it passes all ten gates (the openings’ p95 lightness ${CC.map2b.openingsP95L}); with step 2’s map it would fail the openings (${CC.map2.openingsP95L}), the screens not being where the plan put them, as with RA-D-3x.</p>
<p><b>Unchanged.</b> Step 3’s mask (<code>${V.files.place3.published}</code>, ${pct(V.expected.s3.maskedShare)} of the picture, alpha <code>${V.expected.s3.rawMaskAlpha.slice(0, 12)}…</code>), on the east wall clear of the hatch and the toolbox; its prompt (sha256 <code>${V.prompts.s3.sha256.slice(0, 12)}…</code>); and ${esc(curly(CH.unchanged))}.</p>
<p>The dry run ran step 3’s commands with <code>--stand-in</code> on step 2b’s kept stand-in (the image session’s pictures are not in the kit), the guide standing in for step 3’s raw edit: the mask’s alpha as expected, nothing changed more than 4 px outside it, the capsule lifted, and the colour check with step 2b’s map passed. Without <code>--stand-in</code> they stop on any picture but RA-D-3hc.</p>
</section>`;
  const cmdPre = `# RA-D-3hc, step 3’s start picture, rebuilt from the image session’s records (img/RA-D-3h.png and img/RA-D-3h-raw.png there,
# each checked by its sha256, and RA-D-3x: img/RA-D-3x.png there, or ra-D-3x.png from compositeD3x.py); it stops unless its
# pixels are RA-D-3hc’s
python3 -I compositeD3hc.py <records folder>
N3=…   # step 3’s picture’s name, as the image session gives it
`;
  return { ...out,
    status: 'Version 2.3 · for the Lead’s review · RA-D-3hc, and step 3 pinned to it',
    note: `${note}\n<details><summary>Version 2.2’s changes</summary>${out.note}</details>`,
    section: `${section}\n${out.section}`,
    fact: `<span class="pill ok">Step 2b: RA-D-3h kept, completed as RA-D-3hc</span><span class="pill">Step 3 pinned to RA-D-3hc</span>${out.fact}`,
    pageOnly: `Version 2.3’s ${REVIEW.length} review pictures (${REVIEW.map(f => `<code>img/${f}</code>`).join(', ')}) show RA-D-3h, its raw edit and RA-D-3hc, and are AI-generated and labelled as such too. ${out.pageOnly}`,
    evidence: `${out.evidence}<p>Also published, for version 2.3: <code>compositeD3hc.py</code>, <code>composite-D3hc.json</code> and <code>painted-D.json</code> (<a href="#ra-d-3hc">above</a>).</p>`,
    footerPics: `${out.footerPics} and version 2.3’s ${REVIEW.length} of RA-D-3h, its raw and RA-D-3hc (a code composite of AI-generated pictures)`,
    footer: `Sheet RA-D, version ${M.version}, ${M.date}. Manifest sha256 <code>${DRY.manifestSha256}</code>. RA-D-3hc’s record: sha256 <code>${shaF(PUB + 'composite-D3hc.json')}</code>; RA-D-3x’s: <code>${shaF(PUB + 'composite-D3x.json')}</code>. Version 1 was 1795103314-ab8c, version 1.1 1795798324-33e6, version 2 1795812844-7ba4, version 2.1 1795818348-5124, version 2.2 1795819744-f35b.`,
    receives: [...out.receives, ['compositeD3hc.py', "rebuilds RA-D-3hc, step 3's start picture, from the image session's records (RA-D-3h, its raw, and RA-D-3x), pixel for pixel"]],
    spendWords: 'View D’s step 3 is its one picture left, with a re-run if a check fails.',
    toolDesc: "the tool, version 3: sheet RA-A's, with view D's manifest, step 2b's commands, and step 3's pinned to RA-D-3hc",
    stepsIntro: `Step 2 made <code>RA-D-3</code> and <code>RA-D-3b</code>, both held; step 2b made <code>RA-D-3h</code>, kept and completed in code as RA-D-3hc (<a href="#ra-d-3hc">above</a>); step 3, the capsule, starts from RA-D-3hc.`,
    step3Names: ['ra-D-3hc', '$N3', cmdPre],
    dryRows: `${out.dryRows}
<tr><td>Step 3’s start pinned to RA-D-3hc; on a stand-in (--stand-in), its mask’s alpha as expected (${pct(DRY.s3.maskedShare)}), nothing changed more than 4 px outside it, the capsule lifted</td><td>${yes(DRY.s3.pinned && DRY.s3.standIn && DRY.s3.alphaAsExpected && DRY.s3.keptOutsideMax === 0 && !DRY.missing3.length)}</td></tr>
<tr><td>Step 3’s colour check, with step 2b’s map, on the stand-in</td><td>${yes(DRY.colours['3'])}</td></tr>` };
}
