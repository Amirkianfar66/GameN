// Shared by sheets RA-C, RA-D and RA-E's prompts (Room A, views C, D and E): the Lead's line of 19 November for every view where
// Atlas works at the crates, and the small helpers sheet RA-B's prompts use (promptsB.mjs), so the views word their pieces alike.
export const CRATE_TOP = "The upper crate's top face stays clear: nothing lies or stands on it, because code adds the parcel Atlas lifts.";
export const COUNT = ['no', 'one', 'two', 'three', 'four', 'five'];
export const thirdOf = GW => p => (p.visibleCentreX < GW / 3 ? 'on the left' : p.visibleCentreX > (2 * GW) / 3 ? 'on the right' : 'ahead');
export const pieceOf = KIT => n => { const p = KIT.pieces.find(p => p.name === n); if (!p) throw new Error(`kit-${KIT.view}.json: no ${n}`); return p; };
export const areaOf = KIT => n => { const s = KIT.shapes.find(s => s.pieces.some(i => KIT.pieces[i].name === n)); return s.pieces.map(i => KIT.pieces[i].name).sort().join(' + '); };
// What carries over from views A and B: sheet RA-B's lessons, read from its manifest as published (version 1), and the page's notes
import { readFileSync } from 'fs';
const B = JSON.parse(readFileSync(new URL('../sheetB/_readback-1/room-a-ra-b.json', import.meta.url), 'utf8'));   // sheet RA-B version 1 as published (its read-back)
if (B.sheet !== 'RA-B' || B.version !== 1) throw new Error("sheet RA-B's manifest is not version 1");
export const LESSONS_B = B.lessons;
export const LESSON_CRATE = "The Lead, 19 November: wherever Atlas works at the crates in view, the upper crate's top face stays clear, because code adds the parcel Atlas lifts. Step 2's prompt says so in the Lead's words.";
export const LESSON_CAPSULE = "View A's step 3: the food capsule painted in a masked step of its own, after the furniture, closed and unlit; code draws its opening over it.";
export const LESSON_OWN = "The approved plan leaves each viewer's own station out of their own view. In view E, slivers of Lyra's hatch, its lid and the toolbox would show at the painting's foot on two phones: they are measured, not painted, for the Lead's decision.";
export const CARRY_WHOLE = ['Every piece whole', 'View A’s step 2 left the cabinet’s right side open, fading into the wall at the mask’s edge, and two masked fixes could not close it, so its frame was drawn in code. Step 2’s prompt here asks for each piece whole, its outline and frame closed on every side, and nothing fading into the wall or the deck at an area’s edge.'];
export const carry15 = (V, step3) => ['The 15 px rule', `View A’s step-1 picture painted wall features that step 2’s mask then had to clear. Here the accepted step-1 picture’s painted features are traced and ${step3 ? 'steps 2 and 3’s masks are' : 'step 2’s mask is'} checked against them (every edge covers a feature by 15 px or clears it by 15 px), in version 2: <a href="#rule15">below</a>.`];
export const CARRY_CRATE = ['The crate top', 'Atlas works at the crates in this view. In the Lead’s words, step 2’s prompt says: “The upper crate’s top face stays clear: nothing lies or stands on it, because code adds the parcel Atlas lifts.”'];
// Version 1.1 (the Lead, 27 November): the shared colour block adds one sentence after the indicator lights, in every sheet B to E,
// so no picture paints a column or row of lit cells (RA-B-1's junction boxes did, which reads as a level). Sheet RA-A's own colour
// block (promptsA.mjs) is left as view A's pictures were made with it.
import { COLOUR_A } from '../sheet/promptsA.mjs';
export const INDICATOR = 'Each indicator is a single small dot, never several in a row or a column.';
export const INDICATOR_AFTER = 'no green, purple or red light.';
if (COLOUR_A.split(INDICATOR_AFTER).length !== 2) throw new Error("the colour block's indicator sentence changed");
export const COLOUR_V = COLOUR_A.replace(INDICATOR_AFTER, `${INDICATOR_AFTER} ${INDICATOR}`);
// Version 1.1, the slant treatment (the Lead, 27 November): where the wall ahead is seen at a slant only a little off square (views
// B and E, 17.7 degrees), the guide draws the deck seams stronger (the same 1 m plates as every view) and the view block says so
export const SEAM_STYLE_V11 = { opacity: 1, stroke: 3 };   // the seams at full strength, with a 3 px stroke of the same deep navy
export const V11 = { version: 1.1, date: '2026-11-27', from: "the Lead's review of RA-B-1, 27 November" };
// RA-B-1 as its record gives it (the image session's records): the first step-1 picture of view B, on sheet RA-B version 1, held
export const RA_B_1 = { name: 'RA-B-1', sha256: 'd05b45889a6bacb69426eba64d26a513c958f407e6c7260bf63f970c6de8822a', usd: 0.0586, runningUsd: 0.4001, runningImages: 7 };
export const WHY_INDICATOR = "RA-B-1 painted the indicators of view B's two wall junction boxes as stacks of lit cells (two and three), which read as a level meter. The colour block now asks for single dots, in every sheet B to E.";
export const WHY_SLANT = (V, wall) => `RA-B-1 squared view B's north wall, which is seen 17.7 degrees off square: its painted foot sloped 0.047 against the guide's 0.132, and its far corner stood at x 369 against the guide's 396. ${V === 'B' ? 'So' : `View ${V}'s ${wall} wall is seen at the same 17.7 degrees, so`} the guide draws the deck seams stronger (the same 1 m plates as every view) and the view block says the wall is seen at a slant.`;
export const SEAMS_V11 = 'The deck seams in the guides are drawn at full strength with a 3 px stroke of the same deep navy (version 1: the seam alone, at 0.9 opacity). The plates are the same 1 m plates.';
// The version 1.1 pages' shared parts, so sheet RA-B's page (sheetB.mjs) and views C to E's (sheet.tmpl.mjs) say the same.
// The spend: Room A's six view-A pictures (../owner/cost-A.json) and RA-B-1 (its record's running total), from the image session's
// records, and views B to E's pictures still planned at Room A's average so far: nine (view B's step 1 again, then its step 2; two
// each in views C and E; three in view D), and at most 15 in all as planned, one of them RA-B-1.
// RA-B-1b as its record gives it: the Lead's one re-run of RA-B step 1 on sheet RA-B version 1 (the same input and prompt), rejected
export const RA_B_1B = { name: 'RA-B-1b', sha256: '4d727118ac8018a11dd8bdcec97d5876beb13a4950d372a04db3d6f75f09de7e', usd: 0.0586, runningUsd: 0.4587, runningImages: 8 };
// RA-B-2 as its record gives it: view B's step 1 on sheet RA-B version 1.1, accepted by the Lead on 27 November
export const RA_B_2 = { name: 'RA-B-2', sha256: 'aefddadcb3ce554c215d121dd7a49b8e4197a1dcce77325e54982252c8038605', usd: 0.0589, runningUsd: 0.5176, runningImages: 9 };
// Room A's running total at the image session's latest record read for the version 2 pages: RA-D-2's (17:13 UTC, 27 November).
// Views B to E's step 1s took seven pictures (the Lead's reviews of 27 November)
// The image session's latest record read (27 November, after RA-B-3): Room A's running total chains from RA-D-2's (13 pictures,
// $0.7524) by RA-B-3's estimate ($0.0579)
export const RA_D_2_TOTAL = { runningUsd: 0.7524, runningImages: 13 };
export const RA_B_3 = { name: 'RA-B-3', sha256: '95c742f2e47b4ea37a197b339b4377a5fe75c41405d589f54076af26ec55eb25', usd: 0.0579, runningUsd: 0.8103, runningImages: 14 };
// The image session's latest record read (27 November, 19:06 UTC): RA-C-2, view C's step 2, chains from RA-B-3's total by its estimate
export const RA_C_2 = { name: 'RA-C-2', sha256: '70f1a853492bb577bd00b274cac8411dc5928e6a84fe53279b46c8c7ea363910', usd: 0.0577, runningUsd: 0.868, runningImages: 15 };
// The image session's latest record read (27 November, 19:12 UTC): RA-E-2, view E's step 2, chains from RA-C-2's total by its estimate
export const RA_E_2 = { name: 'RA-E-2', sha256: 'eeadc937bf93f79152a5e0e6d8aee77816d4a8d845d45bdf88bce65fbfae9b95', usd: 0.0574, runningUsd: 0.9254, runningImages: 16 };
// The image session's latest records read (27 November, 20:57 and 21:01 UTC): RA-D-3 and its re-run RA-D-3b, view D's step 2, both held
export const RA_D_3 = { name: 'RA-D-3', sha256: 'abaf334d030a674e9e030f14477a25ec57d82a3870d4850db1637329fd1d7c2a', usd: 0.0579, runningUsd: 0.9833, runningImages: 17 };
export const RA_D_3B = { name: 'RA-D-3b', sha256: '7abd1f4fd9c3d0a669703d970dd0eb1eaf511c330898388db84093ed8ffe6561', usd: 0.0579, runningUsd: 1.0412, runningImages: 18 };
export const LATEST = { name: 'RA-D-3b', runningUsd: RA_D_3B.runningUsd, runningImages: RA_D_3B.runningImages, viewAImages: 6,
  stepOnes: ['RA-B-1 (kept as the fallback)', 'RA-B-1b (rejected)', 'RA-B-2 (accepted)', 'RA-C-1 (accepted)', 'RA-D-1 (accepted)', 'RA-D-2 (rejected)', 'RA-E-1 (accepted)'],
  stepTwos: ['RA-B-3 (held, and completed in code as RA-B-3c)', 'RA-C-2 (held, and completed in code as RA-C-2c)', 'RA-E-2 (held, and completed in code as RA-E-2c)', 'RA-D-3 (held)', 'RA-D-3b (held, its re-run)'],
  stillPlanned: [['view D’s hatch-only step 2b', 1], ['view D’s step 3', 1]] };
export function spendV2(COST) {
  if (COST.used !== LATEST.viewAImages || Math.abs(RA_B_1B.runningUsd + RA_B_2.usd - RA_B_2.runningUsd) > 0.0002) throw new Error("the records' running totals do not chain");
  if (RA_D_2_TOTAL.runningImages + 1 !== RA_B_3.runningImages || Math.abs(RA_D_2_TOTAL.runningUsd + RA_B_3.usd - RA_B_3.runningUsd) > 0.0002) throw new Error("RA-B-3's running total does not chain from RA-D-2's");
  if (RA_B_3.runningImages + 1 !== RA_C_2.runningImages || Math.abs(RA_B_3.runningUsd + RA_C_2.usd - RA_C_2.runningUsd) > 0.0002) throw new Error("RA-C-2's running total does not chain from RA-B-3's");
  if (RA_C_2.runningImages + 1 !== RA_E_2.runningImages || Math.abs(RA_C_2.runningUsd + RA_E_2.usd - RA_E_2.runningUsd) > 0.0002) throw new Error("RA-E-2's running total does not chain from RA-C-2's");
  if (RA_E_2.runningImages + 1 !== RA_D_3.runningImages || Math.abs(RA_E_2.runningUsd + RA_D_3.usd - RA_D_3.runningUsd) > 0.0002) throw new Error("RA-D-3's running total does not chain from RA-E-2's");
  if (RA_D_3.runningImages + 1 !== RA_D_3B.runningImages || Math.abs(RA_D_3.runningUsd + RA_D_3B.usd - RA_D_3B.runningUsd) > 0.0002) throw new Error("RA-D-3b's running total does not chain from RA-D-3's");
  const made = LATEST.stepOnes.length + LATEST.stepTwos.length;
  if (LATEST.runningImages - LATEST.viewAImages !== made) throw new Error('the pictures made for views B to E are not the running total');
  const avg = LATEST.runningUsd / LATEST.runningImages, planned = LATEST.stillPlanned.reduce((n, [, k]) => n + k, 0), most = 15 - made;
  return { used: LATEST.runningImages, usedUsd: LATEST.runningUsd.toFixed(2), averageUsd: avg.toFixed(4), planned, plannedUsd: (planned * avg).toFixed(2), most, mostUsd: (most * avg).toFixed(2) };
}
const NUMWORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const spendTextV2 = (S, lead) => `${lead} Room A has used about $${S.usedUsd} of its cap, which is under $5: ${S.used} pictures by the image session’s latest record (${LATEST.name}). Views B to E’s step 1s took ${NUMWORD[LATEST.stepOnes.length]}: ${LATEST.stepOnes.join(', ')}; the step 2s so far took ${NUMWORD[LATEST.stepTwos.length]}: ${LATEST.stepTwos.join(', ')}. Still planned: ${NUMWORD[S.planned]} pictures (${LATEST.stillPlanned.map(([w]) => w).join('; ')}), about $${S.plannedUsd} at Room A’s average so far ($${S.averageUsd} a picture), and at most ${NUMWORD[S.most]} more with re-runs (15 in all for views B to E, as planned), about $${S.mostUsd}. The Lead gives each step’s go.`;
// (the Lead, 27 November: count RA-B-1b too, so the pages agree with the image session's records)
export function spendV11(COST) {
  const used = COST.used + 2, usd1 = +COST.usedExact + RA_B_1.usd, usd = usd1 + RA_B_1B.usd;
  if (COST.used + 1 !== RA_B_1.runningImages || Math.abs(usd1 - RA_B_1.runningUsd) > 0.0002) throw new Error("RA-B-1's running total is not view A's six pictures and RA-B-1");
  if (used !== RA_B_1B.runningImages || Math.abs(usd - RA_B_1B.runningUsd) > 0.0002) throw new Error("RA-B-1b's running total is not RA-B-1's and RA-B-1b");
  const avg = RA_B_1B.runningUsd / used, planned = 9, most = COST.most - 2;
  return { used, usedUsd: RA_B_1B.runningUsd.toFixed(2), averageUsd: avg.toFixed(4), planned, plannedUsd: (planned * avg).toFixed(2), most, mostUsd: (most * avg).toFixed(2) };
}
export const spendTextV11 = (S, V, stepsWord) => `View ${V}’s ${stepsWord} pictures, with a re-run each if a check fails. Room A has used about $${S.usedUsd} of its cap, which is under $5: ${S.used} pictures, from the image session’s records, the last two of them view B’s step-1 pictures on sheet RA-B version 1: RA-B-1, kept as the fallback, and its re-run RA-B-1b, rejected. Views B to E still plan ${S.planned} pictures (view B’s step 1 again on version 1.1, then its step 2; two each in views C and E; three in view D), about $${S.plannedUsd} at Room A’s average so far ($${S.averageUsd} a picture), and at most ${S.most} more with re-runs (15 in all, as planned), about $${S.mostUsd}. The owner gave the go on 27 November; the Lead gives each step’s go.`;
// The note at the top of each page: what version 1.1 changed, word for word, from the manifest's changes
const BLOCK_WORD = { colour: 'the colour block', view: 'the view block' }, STEP_WORD = { s1: 'step 1', s2: 'step 2', s3: 'step 3' };
const andList = a => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const stepsWord = ks => (ks.length === 1 ? STEP_WORD[ks[0]] : `steps ${andList(ks.map(k => k.slice(1)))}`);
const curly = s => s.replace(/'/g, '’');   // the page's apostrophes, for the note's own sentences (the quoted prompt text has none)
export function v11Note(M, esc) {
  const c = M.changes[0], seen = new Set(), rows = Object.values(c.files).filter(f => !seen.has(f.published) && seen.add(f.published));
  const changed = rows.filter(f => !f.same), same = rows.filter(f => f.same), slant = c.added.some(a => a.block === 'view');
  if (c.added.some(a => /'/.test(a.text + a.after))) throw new Error('the quoted prompt text has an apostrophe: show it as written');
  const added = c.added.map(a => `<li><b>Added to ${BLOCK_WORD[a.block]}</b> (${stepsWord(a.steps)}), after “${esc(a.after)}”: “${esc(a.text)}”</li>`).join('\n');
  return `<div class="note"><b>Version ${c.version}, from ${esc(curly(c.from))}.</b> ${c.why.map(w => esc(curly(w))).join(' ')}<ul>
${added}
<li><b>The guide.</b> ${slant ? `${esc(curly(c.guide))} The before and after are under the picture.` : 'Unchanged: the guides are version 1’s, byte for byte.'}</li>
<li><b>Files.</b> ${changed.length ? `New bytes: ${changed.map(f => `<code>${esc(f.published)}</code>`).join(', ')}; the other ${same.length} pictures are version 1’s, byte for byte.` : `All ${same.length} pictures are version 1’s, byte for byte.`} The manifest and the prompts are new. Each prompt is version 1’s with only these sentences added (the build checks it): ${Object.entries(c.prompts).map(([k, p]) => `${STEP_WORD[k]} <code>${p.v1.slice(0, 12)}…</code> → <code>${p.now.slice(0, 12)}…</code>`).join(', ')}.</li></ul></div>`;
}
// The before/after of the guide, for the views with the slant treatment (beforeafter.py's crops)
const SEAM_WORDS = { B: ['north', 'the far corner on the left, the wall’s foot running down to the right edge'], E: ['south', 'the far corner on the right, the wall’s foot running down to its corner with the east wall on the left'] };
export function seamFigures(V) {
  const [wall, where] = SEAM_WORDS[V];
  return `<h3>The guide’s deck seams, version 1 and 1.1</h3>
<p>The same 744 × 440 px crop of step 1’s guide, at 1:1, where the ${wall} wall meets the deck: ${where}. Version 1.1 changes the seams alone.</p>
<div class="pics">
<figure><img src="img/ra-${V}-seams-v1.png" alt="Before: version 1's guide where the ${wall} wall meets the deck, with thin, faint deck seams" width="744" height="440" loading="lazy"><figcaption>Version 1: the seams thin, at 0.9 opacity.</figcaption></figure>
<figure><img src="img/ra-${V}-seams-v11.png" alt="After: version 1.1's guide, the same crop, the deck seams drawn stronger on the same 1 m plates" width="744" height="440" loading="lazy"><figcaption>Version 1.1: the same 1 m plates, the seams at full strength with a 3 px stroke.</figcaption></figure>
</div>`;
}
