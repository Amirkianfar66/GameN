// Sheet RA-E's manifest and publishing folder (Room A, view E: Lyra's place), version 2, as sheet RA-B's (buildB.mjs), with sheet
// RA-A's step 3 (buildA.mjs) where the food capsule is in view. Writes room-a-ra-e.json (the manifest, with the kit that
// re1_tools.py reads: the files and their sha256, the prompts and theirs, the masks' expected shares and alpha hashes, the split
// maps' greys) and room-a-ra-e-prompts.txt, and stages pub/: the page's files (img/*.png at their published paths, the tool, the
// lift, the colour check, the camera report, the manifest and the prompts). Reads guideE.mjs, kitE.py's kit-E.json,
// promptsE.mjs and wordsE.mjs; the owner's reference pictures are never read, copied or published. Version 2 (the Lead, 27
// November): step 1 is done (step1-E.json: the accepted picture); step 2's input is that picture, pinned by its sha256; the 15 px
// rule and, where measured, the floor fit and the foot lines are recorded from kit-E.json, and their evidence files are published
// with the sheet. Generates nothing. Usage: node buildE.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { GW, GH, ACROSS, FP, GHY, FOV, PITCH, PHONES, slice, ROLES, NAME, VIEWER } from './guideE.mjs';
import { prompts } from './promptsE.mjs';
import { WORDS } from './wordsE.mjs';
import { STYLE_CHANGES_A } from '../sheet/promptsA.mjs';
import { CAST } from '../vis/visA.mjs';
const DIR = new URL('./', import.meta.url).pathname, PUB = DIR + 'pub/', DATE = '2026-11-27', TOOL = 're1_tools.py';
const shaB = b => createHash('sha256').update(b).digest('hex'), sha = f => shaB(readFileSync(DIR + f)), J = f => JSON.parse(readFileSync(DIR + f, 'utf8'));
const KIT = J('kit-E.json'), REPORT = JSON.parse(readFileSync(DIR + '../camera-report-E.json', 'utf8')), STEP3 = KIT.pieces3.length > 0;
if (REPORT.version !== 2 || REPORT.view !== VIEWER) throw new Error('camera-report-E.json is not version 2 of view E');
if (sha('lift5.py') !== sha('../sheet/lift5.py') || sha('colour-check-ra1.py') !== sha('../sheet/colour-check-ra1.py')) throw new Error("the lift or the colour check differs from sheet RA-A's");
export const IMG = { empty: 'ra-E-empty.png', emptyRegions: 'ra-E-empty-regions.png', emptyAnnotated: 'ra-E-empty-annotated.png', guide: 'ra-E-guide.png', ...(STEP3 ? { guideS2: 'ra-E-guide-s2.png' } : {}), regions: 'ra-E-regions.png', place: 'ra-E-place.png', split: 'ra-E-split.png',
  ...(STEP3 ? { place3: 'ra-E-place3.png', split3: 'ra-E-split3.png' } : {}) };
const P = prompts(), promptEntry = t => ({ text: t, sha256: shaB(Buffer.from(t, 'utf8')), chars: t.length }), STEPS = STEP3 ? ['s1', 's2', 's3'] : ['s1', 's2'];
if (Object.keys(P).join() !== STEPS.join()) throw new Error('the prompts are not the steps');
// Version 2: the manifest says what changed from version 1.1 as published (its read-back in _readback-11/): every prompt is version
// 1.1's, byte for byte (the step-1 picture was made with it); every file's sha256 is set beside version 1.1's. Version 1.1's own
// note is kept after version 2's.
const V2 = { version: JSON.parse(readFileSync(DIR + 'step1-E.json', 'utf8')).sheetVersion ?? 2, date: '2026-11-27', from: "the Lead's review of the step-1 pictures, 27 November" };   // C's 2.1 adds the selective growth to its published version 2
const OLD = JSON.parse(readFileSync(DIR + '_readback-11/room-a-ra-e.json', 'utf8'));
if (OLD.sheet !== NAME || OLD.version !== 1.1) throw new Error('the read-back is not version 1.1 of this sheet');
for (const k of Object.keys(P)) if (P[k] !== OLD.kit.views[VIEWER].prompts[k].text) throw new Error(`${k} is not version 1.1's prompt`);
const S1P = J('step1-E.json');   // the accepted step-1 picture: its name, sha256 and record
if (KIT.featureTest.picture?.sha256 !== S1P.sha256 || !KIT.featureTest.passed) throw new Error("the 15 px rule did not pass on the step-1 picture's features");
const FT = KIT.featureTest, nExc = FT.exceptions.reduce((n, e) => n + e.parts.length, 0);
const EVIDENCE = Object.fromEntries([['featuresE.json', "the step-1 picture's painted features and the named exceptions (the 15 px rule's obstacles)"], ['measure-E2.json', "the step-1 picture's painted deck, measured against the guide"], ['floorfit-E.json', 'the floor fit: the painted lines the guide draws the fitted floor points between'], ['lines-E.json', "the guide's own lines on the deck, from its camera"], ['check-E2.json', "the view's own checks on version 2's masks"], ['window-E.json', "the round window's opening, fitted to the step-1 picture's painted black, with its flat-black gate: the moving sky's outline"]].filter(([f]) => existsSync(DIR + f)));
const LIFT_RECIPE = "the Lead's recipe of 18 November (lift5.py): d, the largest of |placed - start| over R, G and B; the pixels where d is above 16, inside the mask; closed with a 7 x 7 max then a 7 x 7 min, kept inside the mask; holes filled; parts under 400 px dropped; feathered with a 1 px Gaussian; clipped to the mask";
const files = Object.fromEntries(Object.entries(IMG).map(([k, f]) => [k, { published: `img/${f}`, sha256: sha(f) }]));
if (!STEP3) files.guideS2 = files.guide;   // with no step 3, step 2's guide is the guide: nothing is left out of it
const sl = Object.fromEntries(PHONES.map(ph => { const s = slice(ph), r = s.rect; return [`${ph[0]}x${ph[1]}`, { stage: [s.W, s.SH], paintingRect: [r.x0, r.y0, r.x1, r.y1].map(v => +v.toFixed(1)), scale: +s.k.toFixed(4) }]; }));
const manifest = {
  sheet: NAME, room: 'Room A', view: VIEWER, viewer: `${CAST[VIEWER].name} (${CAST[VIEWER].crew})`, version: V2.version, date: DATE, about: WORDS.about,
  plan: { page: 'Room A plan', version: '1795050100-be2f', approved: "the owner, about 10:45 UTC on 19 November: Room A all as recommended, the cap under $5 for Room A (docs/design/owner-decisions.md, ab849d40 on #280)" },
  rules: ['Every picture made from this sheet is AI-generated. Its record says so, with its tool, model, prompt, date and settings, and it is never presented as made by a person.',
    `The owner's reference pictures are never inputs. The only inputs are this sheet's code-drawn guides and masks, and the ${STEP3 ? 'pictures its own steps keep' : 'picture its own step 1 keeps'}.`,
    'Test pages only: no picture from this sheet is an asset or contract, and none is committed.',
    "Nothing is painted before the owner's go on view A's page. The Lead gives each step's go and names this sheet's version and hashes. The work stops and asks before it would pass the cap."],
  camera: { painting: [GW, GH], lens: 'straight lines, level, every vertical upright', acrossDeg: ACROSS, focalPx: +FP.toFixed(1), horizonY: GHY, eyeM: REPORT.camera.eyeM, at: REPORT.camera.at, yawCompass: REPORT.camera.yawCompass,
    phones: { fovDeg: FOV, downDeg: -PITCH, how: "each phone's 70 degree slice, 5 degrees down, is a centred crop of the painting (the same straight-line camera, scaled about the horizon point)", slices: sl },
    walls: ROLES, report: { file: 'camera-report-E.json', version: REPORT.version, sha256: sha('../camera-report-E.json') } },
  kit: {
    views: { [VIEWER]: { files, prompts: Object.fromEntries(STEPS.map(k => [k, promptEntry(P[k])])), split: KIT.split, ...(STEP3 ? { split3: KIT.split3 } : {}),
      expected: { s2: { maskedShare: KIT.expected.s2.maskedShare, rawMaskAlpha: KIT.expected.s2.rawMaskAlpha }, ...(STEP3 ? { s3: { maskedShare: KIT.expected.s3.maskedShare, rawMaskAlpha: KIT.expected.s3.rawMaskAlpha } } : {}) } } },
    lift: { file: 'lift5.py', sha256: sha('lift5.py'), recipe: LIFT_RECIPE },
    colourCheck: { file: 'colour-check-ra1.py', sha256: sha('colour-check-ra1.py'), version: 1 },
    tool: { file: TOOL, sha256: sha(TOOL), version: 1, note: STEP3 ? "sheet RA-A's tool (ra1_tools.py, version 1) with view E's manifest: the same three steps" : "sheet RA-B's tool (rb1_tools.py, version 1) with view E's manifest: the same two steps, with no step 3" } },
  steps: [
    { step: 1, what: 'the empty room, a first pass', inputs: [files.empty.published], mask: 'none', secondPicture: 'none', prompt: 's1', check: `${TOOL} colours ${VIEWER} 1 (colour-check-ra1.py with ${files.emptyRegions.published}), and the lines against ${files.emptyAnnotated.published}`,
      done: { picture: S1P.name, sha256: S1P.sha256, madeOn: S1P.madeOn, result: S1P.result, record: "the image session's records", ...(S1P.earlier ? { earlier: S1P.earlier } : {}) } },
    { step: 2, what: `PLACE, one masked edit: the furniture${STEP3 ? ', without the capsule' : ''}`, inputs: [`${S1P.name}.png (sha256 ${S1P.sha256}), the accepted step-1 picture, with the step-2 guide inside the PLACE mask (${TOOL} s2)`], picture: { name: S1P.name, sha256: S1P.sha256 }, mask: `${files.place.published} (white = repaint; the tool writes it as RGBA, alpha 0 = repaint)`, secondPicture: 'none', prompt: 's2', keep: `${TOOL} keep`, lift: `${TOOL} lift`,
      before: `the 15 px rule against ${S1P.name}'s painted features (sheet RA-A version 4's rule): passed, with ${nExc} named exceptions for the Lead's decision (featuresE.json; checks.featureTest)`, go: "after the Lead's review of this version" },
    ...(STEP3 ? [{ step: 3, what: 'the food capsule alone, one masked edit', inputs: [`the kept step-2 picture, with the guide inside step 3's mask (${TOOL} s3)`], mask: `${files.place3.published} (white = repaint)`, secondPicture: 'none', prompt: 's3', keep: `${TOOL} keep3`, lift: `${TOOL} lift3` }] : [])],
  pieces: { step2: KIT.pieces.map(p => ({ name: p.name, place: p.place, parts: p.parts, grey: p.grey, depthM: p.depthM, px: p.px, bbox: p.bbox })), ...(STEP3 ? { step3: KIT.pieces3.map(p => ({ name: p.name, kind: p.kind, parts: p.parts, grey: p.grey, depthM: p.depthM, px: p.px, bbox: p.bbox })) } : {}) },
  checks: { inView: KIT.inView, gaps: KIT.gaps, ...(KIT.target ? { target: KIT.target } : {}), openings: KIT.openings, ownStation: KIT.ownStation, featureTest: KIT.featureTest, ...(KIT.floorFit ? { floorFit: KIT.floorFit } : {}), ...(KIT.feet ? { feet: KIT.feet } : {}) },
  evidence: Object.fromEntries(Object.entries(EVIDENCE).map(([f, what]) => [f, { what, sha256: sha(f) }])),
  style: { base: "the owner's style text (pv1-shared version 2)", changes: STYLE_CHANGES_A.map(([from, to]) => ({ from, to })), blocks: WORDS.blocks },
  lessons: WORDS.lessons,
  changes: [{ ...V2, why: S1P.why, featureTest: `passed: ${FT.features.length} features, ${nExc} named exceptions in ${FT.exceptions.length} of them, ${FT.lights.length} indicator dots clear of every mask`,
    guide: KIT.floorFit ? KIT.floorFit.summary : "unchanged: version 1.1's guides", ...(KIT.growth ? { growth: `the selective 12 px growth (${KIT.growth.decision}): ${KIT.growth.addedPx} px added; step 2's mask ${KIT.growth.maskedShareBefore} -> ${KIT.growth.maskedShareAfter} of the picture` } : {}), ...(S1P.previous ? { previous: S1P.previous } : {}), ...(KIT.feet ? { feet: KIT.feet.map(f => `${f.name}: ${f.offsetPx} px, ${f.moved ? 'moved' : 'stays'}`) } : {}),
    prompts: Object.fromEntries(Object.keys(P).map(k => [k, { v11: OLD.kit.views[VIEWER].prompts[k].sha256, now: promptEntry(P[k]).sha256 }])),
    files: Object.fromEntries(Object.entries(files).map(([k, e]) => { const o = OLD.kit.views[VIEWER].files[k]; return [k, { published: e.published, v11: o.sha256, now: e.sha256, same: o.sha256 === e.sha256 }]; })) },
    ...OLD.changes],
};
writeFileSync(DIR + 'room-a-ra-e.json', JSON.stringify(manifest, null, 1));
const WHAT = { s1: `step 1 (the empty room, a first pass) · input img/${IMG.empty}; no mask; no second picture`,
  s2: `step 2 (PLACE, one masked edit: the furniture${STEP3 ? ', without the capsule' : ''}) · input the step-1 picture with the step-2 guide (img/${STEP3 ? IMG.guideS2 : IMG.guide}) inside img/${IMG.place} (mask alpha 0 = repaint); no second picture`,
  s3: `step 3 (the food capsule alone, one masked edit) · input the kept step-2 picture with the guide (img/${IMG.guide}) inside img/${IMG.place3} (mask alpha 0 = repaint); no second picture` };
const promptsTxt = [`Room A · sheet ${NAME} · prompts · ${DATE}`, manifest.rules[0], 'Each prompt is the text between its BEGIN line and its END line (the newline after BEGIN and the one before END are not part of it); its sha256 is of that text in UTF-8.', '',
  ...STEPS.flatMap(k => { const e = manifest.kit.views[VIEWER].prompts[k]; return [`===== BEGIN ${NAME} ${k}: ${WHAT[k]} · sha256 ${e.sha256} · ${e.chars} characters`, e.text, `===== END ${NAME} ${k}`, '']; })].join('\n');
writeFileSync(DIR + 'room-a-ra-e-prompts.txt', promptsTxt);
rmSync(PUB, { recursive: true, force: true }); mkdirSync(PUB + 'img', { recursive: true });
for (const f of Object.values(IMG)) copyFileSync(DIR + f, PUB + 'img/' + f);
for (const f of [TOOL, 'lift5.py', 'colour-check-ra1.py', 'room-a-ra-e.json', 'room-a-ra-e-prompts.txt', ...Object.keys(EVIDENCE)]) copyFileSync(DIR + f, PUB + f);
copyFileSync(DIR + '../camera-report-E.json', PUB + 'camera-report-E.json');
for (const f of Object.values(IMG)) if (sha('pub/img/' + f) !== sha(f)) throw new Error('copy differs: ' + f);
console.log(`${NAME} manifest: prompts ${STEPS.map(k => `${k} ${P[k].length}`).join(', ')} characters | ${Object.keys(IMG).length} pictures | step 2 mask ${KIT.expected.s2.maskedShare}${STEP3 ? `, step 3 mask ${KIT.expected.s3.maskedShare}` : ''}`);
