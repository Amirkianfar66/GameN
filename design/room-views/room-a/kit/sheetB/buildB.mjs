// Sheet RA-B's manifest and publishing folder (Room A, view B: Mira's place), version 2, as sheet RA-A's (buildA.mjs). Writes
// room-a-ra-b.json (the manifest, with the kit that rb1_tools.py reads: the files and their sha256, the prompts and theirs, the
// mask's expected share and alpha hash, the split map's greys) and room-a-ra-b-prompts.txt, and stages pub/: the page's files
// (img/*.png at their published paths, the tool, the lift, the colour check, the camera report, the manifest and the prompts). Reads
// guideB.mjs, kitB.py's kit-B.json and promptsB.mjs; the owner's reference pictures are never read, copied or published. Version 2
// (the Lead, 27 November, on RA-B-2): step 1 is done (RA-B-2, accepted); step 2's input is RA-B-2, pinned by its sha256; the 15 px
// rule, the desk's floor fit and Vega's foot line are recorded from kit-B.json, and their evidence files are published with the
// sheet (featuresB.json, measure-B2.json, floorfit-B.json, lines-B.json). Generates nothing. Usage: node buildB.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'fs';
import { createHash } from 'crypto';
import { GW, GH, ACROSS, FP, GHY, FOV, PITCH, PHONES, slice, ROLES, NAME, VIEWER } from './guideB.mjs';
import { prompts, ADDED_V2 } from './promptsB.mjs';
import { RA_B_2 } from '../sheetV/sharedV.mjs';
import { STYLE_CHANGES_A } from '../sheet/promptsA.mjs';
import { CAST } from '../vis/visA.mjs';
const V2 = { version: 2, date: '2026-11-27', from: "the Lead's review of RA-B-2, 27 November" };
const DIR = new URL('./', import.meta.url).pathname, PUB = DIR + 'pub/', DATE = V2.date;
const shaB = b => createHash('sha256').update(b).digest('hex'), sha = f => shaB(readFileSync(DIR + f)), J = f => JSON.parse(readFileSync(DIR + f, 'utf8'));
const KIT = J('kit-B.json'), REPORT = JSON.parse(readFileSync(DIR + '../camera-report-B.json', 'utf8'));
if (REPORT.version !== 2 || REPORT.view !== 'B') throw new Error('camera-report-B.json is not version 2 of view B');
if (sha('lift5.py') !== sha('../sheet/lift5.py') || sha('colour-check-ra1.py') !== sha('../sheet/colour-check-ra1.py')) throw new Error("the lift or the colour check differs from sheet RA-A's");
export const IMG = { empty: 'ra-B-empty.png', emptyRegions: 'ra-B-empty-regions.png', emptyAnnotated: 'ra-B-empty-annotated.png', guide: 'ra-B-guide.png', regions: 'ra-B-regions.png', place: 'ra-B-place.png', split: 'ra-B-split.png' };
const P = prompts(), promptEntry = t => ({ text: t, sha256: shaB(Buffer.from(t, 'utf8')), chars: t.length });
// Version 2: the manifest says what changed from version 1.1 as published (its read-back in _readback-11/): step 1's prompt is
// version 1.1's, byte for byte (RA-B-2 was made with it), and step 2's is version 1.1's with exactly the sentence ADDED_V2 puts in;
// every file's sha256 is set beside version 1.1's. Version 1.1's own note is kept after version 2's.
const OLD = JSON.parse(readFileSync(DIR + '_readback-11/room-a-ra-b.json', 'utf8'));
if (OLD.sheet !== NAME || OLD.version !== 1.1) throw new Error('the read-back is not version 1.1 of this sheet');
const addTo = (text, k) => ADDED_V2.filter(a => a.steps.includes(k)).reduce((t, a) => { if (t.split(a.after).length !== 2) throw new Error(`${k}: no single "${a.after}"`); return t.replace(a.after, `${a.after} ${a.text}`); }, text);
for (const k of Object.keys(P)) if (P[k] !== addTo(OLD.kit.views[VIEWER].prompts[k].text, k)) throw new Error(`${k} is not version 1.1's prompt with version 2's sentence alone`);
if (P.s1 !== OLD.kit.views[VIEWER].prompts.s1.text || promptEntry(P.s1).sha256 !== 'fc22f7ccdfe9b1b23bbb1e931764bc53f50450e0302a7d96ce9f30e38d2e4df0') throw new Error("step 1's prompt is not the one RA-B-2 was made with");
if (KIT.featureTest.picture.sha256 !== RA_B_2.sha256 || !KIT.featureTest.passed) throw new Error("the 15 px rule did not pass on RA-B-2's features");
const FT = KIT.featureTest, nExc = FT.exceptions.reduce((n, e) => n + e.parts.length, 0);
const EVIDENCE = { 'featuresB.json': "RA-B-2's painted features and the named exceptions (the 15 px rule's obstacles)", 'measure-B2.json': "RA-B-2's painted wall foot, deck seams, Vega's foot and the desk's floor corners, measured against the guide", 'floorfit-B.json': "the desk's floor fit: the painted lines the guide draws its floor corners between", 'lines-B.json': "the guide's own lines on the deck, from its camera" };
const LIFT_RECIPE = "the Lead's recipe of 18 November (lift5.py): d, the largest of |placed - start| over R, G and B; the pixels where d is above 16, inside the mask; closed with a 7 x 7 max then a 7 x 7 min, kept inside the mask; holes filled; parts under 400 px dropped; feathered with a 1 px Gaussian; clipped to the mask";
const files = Object.fromEntries(Object.entries(IMG).map(([k, f]) => [k, { published: `img/${f}`, sha256: sha(f) }]));
files.guideS2 = files.guide;   // view B's step-2 guide is its guide: there is no step 3, so nothing is left out of it
const sl = Object.fromEntries(PHONES.map(ph => { const s = slice(ph), r = s.rect; return [`${ph[0]}x${ph[1]}`, { stage: [s.W, s.SH], paintingRect: [r.x0, r.y0, r.x1, r.y1].map(v => +v.toFixed(1)), scale: +s.k.toFixed(4) }]; }));
const manifest = {
  sheet: NAME, room: 'Room A', view: VIEWER, viewer: `${CAST[VIEWER].name} (${CAST[VIEWER].crew})`, version: V2.version, date: DATE,
  about: "Room A's second view, painted as view A was (sheet RA-A): two pictures, the empty room and the furniture. The food capsule is out of view B, so there is no step 3. No people are painted: code draws them.",
  plan: { page: 'Room A plan', version: '1795050100-be2f', approved: "the owner, about 10:45 UTC on 19 November: Room A all as recommended, the cap under $5 for Room A (docs/design/owner-decisions.md, ab849d40 on #280)" },
  rules: ['Every picture made from this sheet is AI-generated. Its record says so, with its tool, model, prompt, date and settings, and it is never presented as made by a person.',
    "The owner's reference pictures are never inputs. The only inputs are this sheet's code-drawn guides and masks, and the picture its own step 1 keeps.",
    'Test pages only: no picture from this sheet is an asset or contract, and none is committed.',
    "Nothing is painted before the owner's go on view A's page. The Lead gives each step's go and names this sheet's version and hashes. The work stops and asks before it would pass the cap."],
  camera: { painting: [GW, GH], lens: 'straight lines, level, every vertical upright', acrossDeg: ACROSS, focalPx: +FP.toFixed(1), horizonY: GHY, eyeM: REPORT.camera.eyeM, at: REPORT.camera.at, yawCompass: REPORT.camera.yawCompass,
    phones: { fovDeg: FOV, downDeg: -PITCH, how: "each phone's 70 degree slice, 5 degrees down, is a centred crop of the painting (the same straight-line camera, scaled about the horizon point)", slices: sl },
    walls: ROLES, report: { file: 'camera-report-B.json', version: REPORT.version, sha256: sha('../camera-report-B.json') } },
  kit: {
    views: { [VIEWER]: { files, prompts: { s1: promptEntry(P.s1), s2: promptEntry(P.s2) }, split: KIT.split,
      expected: { s2: { maskedShare: KIT.expected.s2.maskedShare, rawMaskAlpha: KIT.expected.s2.rawMaskAlpha } } } },
    lift: { file: 'lift5.py', sha256: sha('lift5.py'), recipe: LIFT_RECIPE },
    colourCheck: { file: 'colour-check-ra1.py', sha256: sha('colour-check-ra1.py'), version: 1 },
    tool: { file: 'rb1_tools.py', sha256: sha('rb1_tools.py'), version: 2, note: "sheet RA-A's tool (ra1_tools.py) with view B's manifest and without step 3; version 2: its s1 command's printed colour check names rb1_tools.py (version 1 printed ra1_tools.py)" } },
  steps: [
    { step: 1, what: 'the empty room, a first pass', inputs: [files.empty.published], mask: 'none', secondPicture: 'none', prompt: 's1', check: `rb1_tools.py colours ${VIEWER} 1 (colour-check-ra1.py with ${files.emptyRegions.published}), and the lines against ${files.emptyAnnotated.published}`,
      done: { picture: RA_B_2.name, sha256: RA_B_2.sha256, madeOn: "sheet RA-B version 1.1 (manifest 87851edb45ee2cb44d66bddfaf8577d636377775afd39db10f2854682e428a65)", result: "accepted by the Lead, 27 November", record: "the image session's records", earlier: ['RA-B-1, on version 1: kept as the fallback', 'RA-B-1b, on version 1: rejected'] } },
    { step: 2, what: 'PLACE, one masked edit: the furniture', inputs: [`${RA_B_2.name}.png (sha256 ${RA_B_2.sha256}), the accepted step-1 picture, with the step-2 guide inside the PLACE mask (rb1_tools.py s2)`], picture: { name: RA_B_2.name, sha256: RA_B_2.sha256 }, mask: `${files.place.published} (white = repaint; the tool writes it as RGBA, alpha 0 = repaint)`, secondPicture: 'none', prompt: 's2', keep: 'rb1_tools.py keep', lift: 'rb1_tools.py lift',
      before: `the 15 px rule against RA-B-2's painted features (sheet RA-A version 4's rule): passed, with ${nExc} named exceptions for the Lead's decision (featuresB.json; checks.featureTest)`, go: "after the Lead's review of this version" }],
  pieces: { step2: KIT.pieces.map(p => ({ name: p.name, place: p.place, parts: p.parts, grey: p.grey, depthM: p.depthM, px: p.px, bbox: p.bbox })) },
  checks: { gaps: KIT.gaps, openings: KIT.openings, featureTest: KIT.featureTest, floorFit: KIT.floorFit, vegaFoot: KIT.vegaFoot },
  evidence: Object.fromEntries(Object.entries(EVIDENCE).map(([f, what]) => [f, { what, sha256: sha(f) }])),
  style: { base: "the owner's style text (pv1-shared version 2)", changes: STYLE_CHANGES_A.map(([from, to]) => ({ from, to })), blocks: "sheet RA-A's style, lens and keep-out blocks, word for word, and its colour block with one sentence for the indicators (version 1.1); the room block with one sentence for the round window; view B's own view and PLACE blocks, the view block with a sentence naming the north wall's slant (version 1.1); the PLACE block with the Lead's crate-top line (version 2)" },
  lessons: ["View A's step 2 left the cabinet's right side open, fading into the wall at the mask's edge (RA-A-2, RA-A-3), and two masked fixes could not close it (RA-A-5, RA-A-6): the frame was drawn in code. Step 2's prompt here asks for every piece whole, its outline and frame closed on every side, nothing fading into the wall or the deck at an area's edge.",
    "View A's step-1 picture painted wall features (lockers, a grille, papers, pipes) that the step-2 mask then had to clear by 15 px: here it is applied to RA-B-2's painted features (version 2), before step 2's go."],
  changes: [{ ...V2,
    why: [`RA-B-2, made on version 1.1, is accepted as view B's step 1 (sha256 ${RA_B_2.sha256}). Its far deck seam slopes 0.154 against the guide's 0.182 and its far corner sits on the guide, but the north wall's foot is painted 26 to 15 px low across the desk's span.`,
      "The Lead's list for version 2: the 15 px rule against RA-B-2's painted features; the desk's area extended down to the painted base and the deck in front of it, so the desk stands on the painted deck and covers the skirting behind it (a local change to the mask and the guide, not a warp); Vega's foot line measured and moved only if more than 8 px off; the crate-top line in step 2; the tool's corrected message."],
    added: ADDED_V2,
    guide: `the desk's floor corners drawn on RA-B-2's painted deck (floorfit-B.json): down ${KIT.floorFit.deskCorners.map(c => c.downPx).join(', ')} px; the tabletop and the monitors where the camera puts them; nothing else in the guide moves`,
    featureTest: `passed: ${FT.features.length} features, ${nExc} named exceptions in ${FT.exceptions.length} of them, ${FT.lights.length} indicator dots clear of every mask`,
    vegaFoot: `${KIT.vegaFoot.paintedOffsetPx} px off the painted deck (the nearest seam crossing ${KIT.vegaFoot.seamCrossingOffsetPx.join(', ')} px): under the Lead's 8 px, so the line stays`,
    tool: 'rb1_tools.py version 2: the s1 command prints rb1_tools.py in its colour check (version 1 printed ra1_tools.py)',
    prompts: Object.fromEntries(Object.keys(P).map(k => [k, { v11: OLD.kit.views[VIEWER].prompts[k].sha256, now: promptEntry(P[k]).sha256 }])),
    files: Object.fromEntries(Object.entries(files).map(([k, e]) => { const o = OLD.kit.views[VIEWER].files[k]; return [k, { published: e.published, v11: o.sha256, now: e.sha256, same: o.sha256 === e.sha256 }]; })) },
    ...OLD.changes],
};
writeFileSync(DIR + 'room-a-ra-b.json', JSON.stringify(manifest, null, 1));
const promptsTxt = [`Room A · sheet ${NAME} · prompts · ${DATE}`, manifest.rules[0], 'Each prompt is the text between its BEGIN line and its END line (the newline after BEGIN and the one before END are not part of it); its sha256 is of that text in UTF-8.', '',
  ...[['s1', `step 1 (the empty room, a first pass) · input img/${IMG.empty}; no mask; no second picture`], ['s2', `step 2 (PLACE, one masked edit: the furniture) · input the step-1 picture with the step-2 guide (img/${IMG.guide}) inside img/${IMG.place} (mask alpha 0 = repaint); no second picture`]]
    .flatMap(([k, what]) => { const e = manifest.kit.views[VIEWER].prompts[k]; return [`===== BEGIN ${NAME} ${k}: ${what} · sha256 ${e.sha256} · ${e.chars} characters`, e.text, `===== END ${NAME} ${k}`, '']; })].join('\n');
writeFileSync(DIR + 'room-a-ra-b-prompts.txt', promptsTxt);
rmSync(PUB, { recursive: true, force: true }); mkdirSync(PUB + 'img', { recursive: true });
for (const f of Object.values(IMG)) copyFileSync(DIR + f, PUB + 'img/' + f);
for (const f of ['rb1_tools.py', 'lift5.py', 'colour-check-ra1.py', 'room-a-ra-b.json', 'room-a-ra-b-prompts.txt', ...Object.keys(EVIDENCE)]) copyFileSync(DIR + f, PUB + f);
copyFileSync(DIR + '../camera-report-B.json', PUB + 'camera-report-B.json');
for (const f of Object.values(IMG)) if (sha('pub/img/' + f) !== sha(f)) throw new Error('copy differs: ' + f);
console.log(`${NAME} manifest: prompts s1 ${P.s1.length}, s2 ${P.s2.length} characters | ${Object.keys(IMG).length} pictures | step 2 mask ${KIT.expected.s2.maskedShare}`);
