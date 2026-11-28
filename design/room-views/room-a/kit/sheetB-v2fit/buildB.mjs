// Sheet RA-B's manifest and publishing folder (Room A, view B: Mira's place), version 2 (the Lead, 27 November): on RA-B-1, the
// accepted step-1 picture. Adds the start picture (RA-B-1 with two cells in each junction box dimmed in code, dimB.py, dim-B.json),
// the floor fit (measureB.py, measure-B.json, fit-B.json), the 15 px rule against RA-B-1 (featuresB.json, in kit-B.json), the
// crate-top line in step 2's prompt and the tool's corrected message, with the review pictures; step 1's input, map and prompt stay
// version 1's bytes (checked against its read-back). Version 1, as sheet RA-A's (buildA.mjs). Writes
// room-a-ra-b.json (the manifest, with the kit that rb1_tools.py reads: the files and their sha256, the prompts and theirs, the
// mask's expected share and alpha hash, the split map's greys) and room-a-ra-b-prompts.txt, and stages pub/: the page's files
// (img/*.png at their published paths, the tool, the lift, the colour check, the camera report, the manifest and the prompts). Reads
// guideB.mjs, kitB.py's kit-B.json and promptsB.mjs; the owner's reference pictures are never read, copied or published. Generates
// nothing. Usage: node buildB.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'fs';
import { createHash } from 'crypto';
import { GW, GH, ACROSS, FP, GHY, FOV, PITCH, PHONES, slice, ROLES, NAME, VIEWER } from './guideB.mjs';
import { prompts } from './promptsB.mjs';
import { STYLE_CHANGES_A } from '../sheet/promptsA.mjs';
import { CAST } from '../vis/visA.mjs';
const DIR = new URL('./', import.meta.url).pathname, PUB = DIR + 'pub/', DATE = '2026-11-27';
const shaB = b => createHash('sha256').update(b).digest('hex'), sha = f => shaB(readFileSync(DIR + f)), J = f => JSON.parse(readFileSync(DIR + f, 'utf8'));
const KIT = J('kit-B.json'), FIT = J('fit-B.json'), DIM = J('dim-B.json'), FEAT = J('featuresB.json'), MEAS = J('measure-B.json'), V1 = J('_readback-1/room-a-ra-b.json'), REPORT = JSON.parse(readFileSync(DIR + '../camera-report-B.json', 'utf8'));
if (REPORT.version !== 2 || REPORT.view !== 'B') throw new Error('camera-report-B.json is not version 2 of view B');
if (sha('lift5.py') !== sha('../sheet/lift5.py') || sha('colour-check-ra1.py') !== sha('../sheet/colour-check-ra1.py')) throw new Error("the lift or the colour check differs from sheet RA-A's");
export const IMG = { empty: 'ra-B-empty.png', emptyRegions: 'ra-B-empty-regions.png', emptyAnnotated: 'ra-B-empty-annotated.png', guide: 'ra-B-guide.png', regions: 'ra-B-regions.png', place: 'ra-B-place.png', split: 'ra-B-split.png' };
const P = prompts(), promptEntry = t => ({ text: t, sha256: shaB(Buffer.from(t, 'utf8')), chars: t.length });
const LIFT_RECIPE = "the Lead's recipe of 18 November (lift5.py): d, the largest of |placed - start| over R, G and B; the pixels where d is above 16, inside the mask; closed with a 7 x 7 max then a 7 x 7 min, kept inside the mask; holes filled; parts under 400 px dropped; feathered with a 1 px Gaussian; clipped to the mask";
const files = Object.fromEntries(Object.entries(IMG).map(([k, f]) => [k, { published: `img/${f}`, sha256: sha(f) }]));
const START = { published: 'img/ra-B-1-dim.png', sha256: sha('ra-B-1-dim.png') };
if (START.sha256 !== DIM.output.sha256) throw new Error('ra-B-1-dim.png is not the picture dim-B.json records');
files.guideS2 = files.guide;   // view B's step-2 guide is its guide: there is no step 3, so nothing is left out of it
const sl = Object.fromEntries(PHONES.map(ph => { const s = slice(ph), r = s.rect; return [`${ph[0]}x${ph[1]}`, { stage: [s.W, s.SH], paintingRect: [r.x0, r.y0, r.x1, r.y1].map(v => +v.toFixed(1)), scale: +s.k.toFixed(4) }]; }));
const manifest = {
  sheet: NAME, room: 'Room A', view: VIEWER, viewer: `${CAST[VIEWER].name} (${CAST[VIEWER].crew})`, version: 2, date: '2026-11-27',
  about: "Room A's second view, painted as view A was (sheet RA-A): two pictures, the empty room and the furniture. The food capsule is out of view B, so there is no step 3. No people are painted: code draws them. Version 2 is built on RA-B-1, the accepted step-1 picture: Vega's desk and Vega follow its painted floor by the back wall, two of the lit cells in its junction boxes are dimmed in code, and the masks pass the 15 px rule against its painted features, with named exceptions for the Lead's decision.",
  plan: { page: 'Room A plan', version: '1795050100-be2f', approved: "the owner, about 10:45 UTC on 19 November: Room A all as recommended, the cap under $5 for Room A (docs/design/owner-decisions.md, ab849d40 on #280)" },
  rules: ['Every picture made from this sheet is AI-generated. Its record says so, with its tool, model, prompt, date and settings, and it is never presented as made by a person.',
    "The owner's reference pictures are never inputs. The only inputs are this sheet's code-drawn guides and masks, and the picture its own step 1 keeps.",
    'Test pages only: no picture from this sheet is an asset or contract, and none is committed.',
    "The owner's go on view A's page was given on 27 November (#280 at 3b9b251b). The Lead gives each step's go and names this sheet's version and hashes. The work stops and asks before it would pass the cap."],
  camera: { painting: [GW, GH], lens: 'straight lines, level, every vertical upright', acrossDeg: ACROSS, focalPx: +FP.toFixed(1), horizonY: GHY, eyeM: REPORT.camera.eyeM, at: REPORT.camera.at, yawCompass: REPORT.camera.yawCompass,
    phones: { fovDeg: FOV, downDeg: -PITCH, how: "each phone's 70 degree slice, 5 degrees down, is a centred crop of the painting (the same straight-line camera, scaled about the horizon point)", slices: sl },
    walls: ROLES, report: { file: 'camera-report-B.json', version: REPORT.version, sha256: sha('../camera-report-B.json') } },
  kit: {
    views: { [VIEWER]: { files, prompts: { s1: promptEntry(P.s1), s2: promptEntry(P.s2) }, split: KIT.split,
      expected: { s2: { maskedShare: KIT.expected.s2.maskedShare, rawMaskAlpha: KIT.expected.s2.rawMaskAlpha } } } },
    lift: { file: 'lift5.py', sha256: sha('lift5.py'), recipe: LIFT_RECIPE },
    colourCheck: { file: 'colour-check-ra1.py', sha256: sha('colour-check-ra1.py'), version: 1 },
    tool: { file: 'rb1_tools.py', sha256: sha('rb1_tools.py'), version: 2, note: "sheet RA-A's tool (ra1_tools.py) with view B's manifest and without step 3; version 2 corrects one printed message (s1's colour check names this tool)" } },
  steps: [
    { step: 1, what: 'the empty room, a first pass', inputs: [files.empty.published], mask: 'none', secondPicture: 'none', prompt: 's1', check: `rb1_tools.py colours ${VIEWER} 1 (colour-check-ra1.py with ${files.emptyRegions.published}), and the lines against ${files.emptyAnnotated.published}` },
    { step: 2, what: 'PLACE, one masked edit: the furniture', inputs: [`${START.published}: RA-B-1 with two of the lit cells in each junction box dimmed in code (sha256 ${DIM.output.sha256}), with the step-2 guide inside the PLACE mask (rb1_tools.py s2)`], mask: `${files.place.published} (white = repaint; the tool writes it as RGBA, alpha 0 = repaint)`, secondPicture: 'none', prompt: 's2', keep: 'rb1_tools.py keep', lift: 'rb1_tools.py lift' }],
  pieces: { step2: KIT.pieces.map(p => ({ name: p.name, place: p.place, parts: p.parts, grey: p.grey, depthM: p.depthM, px: p.px, bbox: p.bbox })) },
  checks: { gaps: KIT.gaps, openings: KIT.openings, featureTest: KIT.featureTest, features: { file: 'featuresB.json', sha256: sha('featuresB.json') } },
  style: { base: "the owner's style text (pv1-shared version 2)", changes: STYLE_CHANGES_A.map(([from, to]) => ({ from, to })), blocks: "sheet RA-A's style, colour, lens and keep-out blocks, word for word; the room block with one sentence for the round window; view B's own view and PLACE blocks" },
  lessons: ["View A's step 2 left the cabinet's right side open, fading into the wall at the mask's edge (RA-A-2, RA-A-3), and two masked fixes could not close it (RA-A-5, RA-A-6): the frame was drawn in code. Step 2's prompt here asks for every piece whole, its outline and frame closed on every side, nothing fading into the wall or the deck at an area's edge.",
    "View A's step-1 picture painted wall features (lockers, a grille, papers, pipes) that the step-2 mask then had to clear by 15 px: here the rule is applied once RA-B-1 exists, before step 2's go."],
};
// version 2: the start picture, the fit, the cells' edit, the changes; step 1's files checked against version 1's read-back
manifest.startPicture = { step: 1, name: 'RA-B-1', sha256: DIM.picture.sha256, aiGenerated: true, size: [GW, GH], record: "its record, with the tool, prompt, date and settings, is kept with the image session's pictures; this sheet keeps its hash, not a link",
  step2Start: { name: DIM.output.name, file: START.published, sha256: DIM.output.sha256, pixelsSha256: DIM.output.pixelsSha256, aiGenerated: true, edit: DIM.output.edit, code: { file: 'dimB.py', sha256: sha('dimB.py') }, record: { file: 'dim-B.json', sha256: sha('dim-B.json') }, changedPx: DIM.changed.px,
    how: 'python3 -I dimB.py <records folder> remakes it from the records\' img/RA-B-1.png (pixels as recorded)' } };
manifest.fit = { file: 'fit-B.json', sha256: sha('fit-B.json'), measured: { file: 'measure-B.json', sha256: sha('measure-B.json'), code: { file: 'measureB.py', sha256: sha('measureB.py') } }, rule: FIT.rule,
  backWallFoot: FIT.measured.backWallFoot.offsetPx, over16: FIT.measured.backWallFoot.over16, farCorner: FIT.measured.farCorner, desk: { footOffsetPx: [Math.min(...FIT.desk.corners.map(c => c.footOffsetPx)), Math.max(...FIT.desk.corners.map(c => c.footOffsetPx))] }, vega: FIT.vega };
const stepOne = { empty: [files.empty.sha256, V1.kit.views[VIEWER].files.empty.sha256], emptyRegions: [files.emptyRegions.sha256, V1.kit.views[VIEWER].files.emptyRegions.sha256], s1Prompt: [manifest.kit.views[VIEWER].prompts.s1.sha256, V1.kit.views[VIEWER].prompts.s1.sha256],
  lift: [manifest.kit.lift.sha256, V1.kit.lift.sha256], colourCheck: [manifest.kit.colourCheck.sha256, V1.kit.colourCheck.sha256] };
const changedStepOne = Object.entries(stepOne).filter(([, [a, b]]) => a !== b).map(([k]) => k);
if (changedStepOne.length) throw new Error(`step 1's files differ from version 1's: ${changedStepOne.join(', ')}`);
const FT = KIT.featureTest;
manifest.changes = [{ version: 2, date: '2026-11-27', by: "the Lead, 27 November: build version 2 on RA-B-1",
  what: [`RA-B-1 (sha256 ${DIM.picture.sha256}) is the accepted step-1 picture. Step 2 starts from it with two of the three lit cells in each junction box dimmed to unlit steel in code (dimB.py; ${DIM.changed.px} px changed, all inside the two boxes; the top cell of each stays lit).`,
    `The floor fit: RA-B-1 painted the back wall's foot ${FIT.measured.backWallFoot.offsetPx['420']} px under the guide's at x 420 and ${FIT.measured.backWallFoot.offsetPx['640']} px at x 640, more than 16 px from the far corner (painted at x ${FIT.measured.farCorner.painted}, the guide's at ${FIT.measured.farCorner.guide}) to x ${FIT.measured.backWallFoot.over16.to}. Vega's desk and monitors and Vega follow the painted floor there: each point is scaled about the horizon by its foot's k, the desk's feet moving ${manifest.fit.desk.footOffsetPx[0]} to ${manifest.fit.desk.footOffsetPx[1]} px and Vega's ${FIT.vega.footOffsetPx} px (k ${FIT.vega.k}; ${FIT.vega.onPhones['402x742'].shiftPx} px on the 402 x 742 phone). The rest is the guide's.`,
    `The 15 px rule against RA-B-1's painted features (featuresB.json, view A's test): ${FT.features.filter(f => f.test && !f.exception).length} features pass outright and ${FT.exceptions.length} cross an edge where the desk or the crates stand in front of them, as named exceptions for the Lead's decision.`,
    "Step 2's prompt adds the Lead's line: \"The upper crate's top face stays clear: nothing lies or stands on it, because code adds the parcel Atlas lifts.\"",
    "The tool's s1 message names rb1_tools.py (it named ra1_tools.py); its outputs are unchanged."],
  stepOne: { sameAsVersion1: true, files: Object.fromEntries(Object.entries(stepOne).map(([k, [a]]) => [k, a])), note: "step 1's input, its region map, its prompt, the lift and the colour check are version 1's bytes; the tool changed only in s1's printed message" } }];
manifest.lessons = [...manifest.lessons, "View B's step-1 picture turned the back wall to face the viewer: its foot and the deck's cross-seams run flatter than the guide's, so the furniture and the people by the back wall were fitted to the painting (fit-B.json)."];
writeFileSync(DIR + 'room-a-ra-b.json', JSON.stringify(manifest, null, 1));
const promptsTxt = [`Room A · sheet ${NAME} · prompts · ${DATE}`, manifest.rules[0], 'Each prompt is the text between its BEGIN line and its END line (the newline after BEGIN and the one before END are not part of it); its sha256 is of that text in UTF-8.', '',
  ...[['s1', `step 1 (the empty room, a first pass) · input img/${IMG.empty}; no mask; no second picture`], ['s2', `step 2 (PLACE, one masked edit: the furniture) · input img/ra-B-1-dim.png (RA-B-1 with two cells in each junction box dimmed in code) with the step-2 guide (img/${IMG.guide}) inside img/${IMG.place} (mask alpha 0 = repaint); no second picture`]]
    .flatMap(([k, what]) => { const e = manifest.kit.views[VIEWER].prompts[k]; return [`===== BEGIN ${NAME} ${k}: ${what} · sha256 ${e.sha256} · ${e.chars} characters`, e.text, `===== END ${NAME} ${k}`, '']; })].join('\n');
writeFileSync(DIR + 'room-a-ra-b-prompts.txt', promptsTxt);
rmSync(PUB, { recursive: true, force: true }); mkdirSync(PUB + 'img', { recursive: true });
for (const f of Object.values(IMG)) copyFileSync(DIR + f, PUB + 'img/' + f);
for (const f of ['rb1_tools.py', 'lift5.py', 'colour-check-ra1.py', 'room-a-ra-b.json', 'room-a-ra-b-prompts.txt', 'dimB.py', 'dim-B.json', 'measureB.py', 'measure-B.json', 'fit-B.json', 'featuresB.json']) copyFileSync(DIR + f, PUB + f);
copyFileSync(DIR + 'ra-B-1-dim.png', PUB + 'img/ra-B-1-dim.png');
// the review pictures (reviewDimB.py, overlayB.py), for the page only: AI-generated, labelled on the picture and in the page's captions
export const REVIEW = ['ra-B-dim-boxes.png', 'ra-B-dim-402.png', 'ra-B-review-full.png', 'ra-B-review-desk.png', 'ra-B-review-crates.png', 'ra-B-review-402.png'];
mkdirSync(PUB + 'img/review', { recursive: true }); for (const f of REVIEW) copyFileSync(DIR + f, PUB + 'img/review/' + f);
copyFileSync(DIR + '../camera-report-B.json', PUB + 'camera-report-B.json');
for (const f of Object.values(IMG)) if (sha('pub/img/' + f) !== sha(f)) throw new Error('copy differs: ' + f);
console.log(`${NAME} manifest: prompts s1 ${P.s1.length}, s2 ${P.s2.length} characters | ${Object.keys(IMG).length} pictures | step 2 mask ${KIT.expected.s2.maskedShare}`);
