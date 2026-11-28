// Sheet RA-A's manifest and publishing folder (Room A, view A). Writes room-a-ra-a.json (the manifest, with the kit that ra1_tools.py
// reads: the files and their sha256, the prompts and theirs, the masks' expected shares and alpha hashes, the split maps' greys) and
// room-a-ra-a-prompts.txt, and stages pub/: the page's files (img/*.png at their published paths, the tool, the lift, the colour
// check, the camera report, the manifest and the prompts). Reads guideA.mjs, kitA.py's kit-A.json and promptsA.mjs; the owner's
// reference pictures are never read, copied or published. Version 3 (the Lead, 19 November): records RA-A-1, the step-1 picture,
// by name and sha256 only; adds the plain-wall area and the 15 px test against RA-A-1 (plainA.json, featuresA.json) and stages
// overlayA.py's review overlays for the page. Version 4: the Lead's 15 px rule against RA-A-1's features, every piece's gaps.
// Generates nothing. Usage: node buildA.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { GW, GH, ACROSS, FP, GHY, FOV, PITCH, PHONES, slice, ROLES, cam, NAME, VIEWER } from './guideA.mjs';
import { prompts, STYLE_CHANGES_A } from './promptsA.mjs';
import { CAST } from '../vis/visA.mjs';
const DIR = new URL('./', import.meta.url).pathname, PUB = DIR + 'pub/', DATE = '2026-11-19';
const shaB = b => createHash('sha256').update(b).digest('hex'), sha = f => shaB(readFileSync(DIR + f)), J = f => JSON.parse(readFileSync(DIR + f, 'utf8'));
const KIT = J('kit-A.json'), REPORT = JSON.parse(readFileSync(DIR + '../camera-report-A.json', 'utf8'));
// version 1 as published (1795086808-585b), read back: step 1's files must be its bytes, so that RA-A-1 carries over (the Lead, 19 November)
const V1 = J('_readback-1/room-a-ra-a.json'), V3 = J('_readback-3/room-a-ra-a.json'), FEAT = J('featuresA.json');
if (V3.version !== 3 || V3.changes?.length !== 2) throw new Error('_readback-3 is not version 3 as published');
if (REPORT.version !== 2 || REPORT.view !== 'A') throw new Error('camera-report-A.json is not version 2 of view A');
// the files the image session receives, at their published paths
export const IMG = { empty: 'ra-A-empty.png', emptyRegions: 'ra-A-empty-regions.png', emptyAnnotated: 'ra-A-empty-annotated.png', guide: 'ra-A-guide.png', guideS2: 'ra-A-guide-s2.png', regions: 'ra-A-regions.png',
  place: 'ra-A-place.png', split: 'ra-A-split.png', place3: 'ra-A-place3.png', split3: 'ra-A-split3.png' };
export const TOOLS = { tool: 'ra1_tools.py', lift: 'lift5.py', colourCheck: 'colour-check-ra1.py', report: 'camera-report-A.json' };
const P = prompts(), promptEntry = t => ({ text: t, sha256: shaB(Buffer.from(t, 'utf8')), chars: t.length });
const LIFT_RECIPE = "the Lead's recipe of 18 November (lift5.py): d, the largest of |placed - start| over R, G and B; the pixels where d is above 16, inside the mask; closed with a 7 x 7 max then a 7 x 7 min, kept inside the mask; holes filled; parts under 400 px dropped; feathered with a 1 px Gaussian; clipped to the mask";
const files = Object.fromEntries(Object.entries(IMG).map(([k, f]) => [k, { published: `img/${f}`, sha256: sha(f) }]));
const sl = Object.fromEntries(PHONES.map(ph => { const s = slice(ph), r = s.rect; return [`${ph[0]}x${ph[1]}`, { stage: [s.W, s.SH], paintingRect: [r.x0, r.y0, r.x1, r.y1].map(v => +v.toFixed(1)), scale: +s.k.toFixed(4) }]; }));
const manifest = {
  sheet: NAME, room: 'Room A', view: VIEWER, viewer: `${CAST[VIEWER].name} (${CAST[VIEWER].crew})`, version: 4, date: DATE,
  about: "Room A's first view, painted as Room B's PV6 views were: three pictures, the empty room, the furniture and the food capsule. No people are painted: code draws them.",
  plan: { page: 'Room A plan', version: '1795050100-be2f', approved: "the owner, about 10:45 UTC on 19 November: Room A all as recommended (a solid ceiling; the back view for walks between 100 and 118 degrees), the cap under $5 for Room A (docs/design/owner-decisions.md, ab849d40 on #280)" },
  rules: ['Every picture made from this sheet is AI-generated. Its record says so, with its tool, model, prompt, date and settings, and it is never presented as made by a person.',
    "The owner's reference pictures are never inputs. The only inputs are this sheet's code-drawn guides and masks, and the pictures its own steps keep.",
    'Test pages only: no picture from this sheet is an asset or contract, and none is committed.',
    "The Lead gives each step's go and names this sheet's version and hashes. The work stops and asks before it would pass the cap."],
  camera: { painting: [GW, GH], lens: 'straight lines, level, every vertical upright', acrossDeg: ACROSS, focalPx: +FP.toFixed(1), horizonY: GHY, eyeM: REPORT.camera.eyeM, at: REPORT.camera.at, yawCompass: REPORT.camera.yawCompass,
    phones: { fovDeg: FOV, downDeg: -PITCH, how: "each phone's 70 degree slice, 5 degrees down, is a centred crop of the painting (the same straight-line camera, scaled about the horizon point)", slices: sl },
    walls: ROLES, report: { file: 'camera-report-A.json', version: REPORT.version, sha256: sha('../camera-report-A.json') } },
  kit: {
    views: { [VIEWER]: { files, prompts: { s1: promptEntry(P.s1), s2: promptEntry(P.s2), s3: promptEntry(P.s3) }, split: KIT.split, split3: KIT.split3,
      expected: { s2: { maskedShare: KIT.expected.s2.maskedShare, rawMaskAlpha: KIT.expected.s2.rawMaskAlpha }, s3: { maskedShare: KIT.expected.s3.maskedShare, rawMaskAlpha: KIT.expected.s3.rawMaskAlpha } } } },
    lift: { file: 'lift5.py', sha256: sha('lift5.py'), recipe: LIFT_RECIPE },
    colourCheck: { file: 'colour-check-ra1.py', sha256: sha('colour-check-ra1.py'), version: 1 },
    tool: { file: 'ra1_tools.py', sha256: sha('ra1_tools.py'), version: 1 } },
  steps: [
    { step: 1, what: 'the empty room, a first pass', inputs: [files.empty.published], mask: 'none', secondPicture: 'none', prompt: 's1', check: `ra1_tools.py colours ${VIEWER} 1 (colour-check-ra1.py with ${files.emptyRegions.published}), and the lines against ${files.emptyAnnotated.published}` },
    { step: 2, what: 'PLACE, one masked edit: the furniture, without the capsule, and the plain-wall area', inputs: [`RA-A-1, the step-1 picture (sha256 ${FEAT.picture.sha256}), with the step-2 guide inside the PLACE mask (ra1_tools.py s2)`], mask: `${files.place.published} (white = repaint; the tool writes it as RGBA, alpha 0 = repaint)`, secondPicture: 'none', prompt: 's2', keep: 'ra1_tools.py keep', lift: 'ra1_tools.py lift' },
    { step: 3, what: 'the food capsule alone, one masked edit', inputs: ['the kept step-2 picture, with the guide inside step 3\'s mask (ra1_tools.py s3)'], mask: `${files.place3.published} (white = repaint)`, secondPicture: 'none', prompt: 's3', keep: 'ra1_tools.py keep3', lift: 'ra1_tools.py lift3' }],
  pieces: { step2: KIT.pieces.map(p => ({ name: p.name, place: p.place, ...(p.kind ? { kind: p.kind } : {}), parts: p.parts, grey: p.grey, depthM: p.depthM, px: p.px, bbox: p.bbox })), step3: KIT.pieces3.map(p => ({ name: p.name, kind: p.kind, parts: p.parts, grey: p.grey, depthM: p.depthM, px: p.px, bbox: p.bbox })) },
  style: { base: "the owner's style text (pv1-shared version 2)", changes: STYLE_CHANGES_A.map(([from, to]) => ({ from, to })) },
};
// step 1's files checked against version 1's: a step-1 picture made on version 1 carries over (the Lead, 19 November)
const stepOne = { empty: [manifest.kit.views[VIEWER].files.empty.sha256, V1.kit.views[VIEWER].files.empty.sha256], emptyRegions: [manifest.kit.views[VIEWER].files.emptyRegions.sha256, V1.kit.views[VIEWER].files.emptyRegions.sha256],
  s1Prompt: [manifest.kit.views[VIEWER].prompts.s1.sha256, V1.kit.views[VIEWER].prompts.s1.sha256], tool: [manifest.kit.tool.sha256, V1.kit.tool.sha256], lift: [manifest.kit.lift.sha256, V1.kit.lift.sha256], colourCheck: [manifest.kit.colourCheck.sha256, V1.kit.colourCheck.sha256] };
const changedStepOne = Object.entries(stepOne).filter(([, [a, b]]) => a !== b).map(([k]) => k);
if (changedStepOne.length) throw new Error(`step 1's files differ from version 1's: ${changedStepOne.join(', ')}`);
// the start picture: RA-A-1, by name and hash (its record, with its tool and settings, is on Room A's records page; no link is kept)
manifest.startPicture = { step: 1, name: FEAT.picture.name, sha256: FEAT.picture.sha256, aiGenerated: true, size: [GW, GH],
  role: "the Lead's base for steps 2 and 3 (19 November): step 2's input is this picture with the step-2 guide inside the PLACE mask", record: "its record, with the tool, prompt, date and settings, is kept with the image session's pictures; this sheet keeps its hash, not a link" };
// version 4: what changed, from kit-A.json's test against RA-A-1 (versions 2 and 3 as published)
const FT = KIT.featureTest, F = n => FT.features.find(f => f.name === n), WALLP = KIT.pieces.find(p => p.kind === 'background'), PAIR = (a, f) => FT.pairs[a]?.[f];
const LC = KIT.gaps['hatch lid / electrical cabinet'] ?? KIT.gaps['electrical cabinet / hatch lid'], gap = r => r.clearPx ?? r.insidePx;
const tested = FT.features.filter(f => f.test), clean = tested.filter(f => !f.exception).length;
manifest.changes = [...V3.changes, { version: 4, date: DATE, by: "the Lead, 19 November: one rule for every step-2 and step-3 edge, checked against RA-A-1's painted features",
  what: `RA-A-1's painted features are now the kit's fixed obstacles (featuresA.json): the pipe run along the back wall's foot and its three clamps, the locker bank, the grille, the four junction boxes and the papers (three parts). Every step-2 and step-3 mask edge covers each of them with at least ${FT.minClearPx} px to spare or clears it by at least ${FT.minClearPx} px, and the build measures it: ${clean} of the ${tested.length} pass outright, and two have named exceptions for the Lead's decision. The electrical cabinet is 0.88 m wide (was 1.1 m), its north side where it was, so it centres on Echo's spot; it hangs 0.8 to 1.95 m above the deck, clear of the pipe run by ${gap(PAIR('C electrical cabinet', 'pipe run'))} px and of the clamps by at least ${Math.min(...['left', 'middle', 'right'].map(k => gap(PAIR('C electrical cabinet', 'pipe clamp, ' + k))))} px; it has no door, since folded south the door would end on the grille and folded north it would reach the food capsule; it clears the grille by ${gap(PAIR('C electrical cabinet', 'grille'))} px. The hatch's lid is 0.48 m long (was 0.6 m), so its top stays ${gap(PAIR('E hatch lid', 'pipe run'))} px under the pipe run: raised less, it hardly moves in the picture (65 degrees puts its top within 3 px of where 80 degrees does). The lid and the cabinet are ${LC.tightPx} px apart (grown ${LC.grownPx}). The plain-wall area keeps the locker bank and the panels beside it, and adds a small patch above the cabinet's top so the papers' clip is covered with ${gap(F('papers: clip').step2)} px to spare; the grille is no longer repainted. Nothing else on the floor plan moved: the five views' layout checks and the five camera reports are as before.`,
  stepOne: { sameAsVersion1: true, files: Object.fromEntries(Object.entries(stepOne).map(([k, [a]]) => [k, a])), note: "step 1's input, its region map, its prompt, the tool, the lift and the colour check are version 1's bytes" } }];
manifest.checks = { gaps: KIT.gaps, target: KIT.target, featureTest: FT, plainWall: { file: 'plainA.json', sha256: sha('plainA.json'), drawnPx: WALLP.drawnPx, splitPx: WALLP.px, share: KIT.plainShare },
  features: { file: 'featuresA.json', sha256: sha('featuresA.json'), picture: FEAT.picture } };
writeFileSync(DIR + 'room-a-ra-a.json', JSON.stringify(manifest, null, 1));
const promptsTxt = [`Room A · sheet ${NAME} · prompts · ${DATE}`, manifest.rules[0], 'Each prompt is the text between its BEGIN line and its END line (the newline after BEGIN and the one before END are not part of it); its sha256 is of that text in UTF-8.', '',
  ...[['s1', `step 1 (the empty room, a first pass) · input img/${IMG.empty}; no mask; no second picture`], ['s2', `step 2 (PLACE, one masked edit: the furniture, without the capsule) · input the step-1 picture with the step-2 guide (img/${IMG.guideS2}) inside img/${IMG.place} (mask alpha 0 = repaint); no second picture`],
    ['s3', `step 3 (the food capsule alone, one masked edit) · input the kept step-2 picture with the guide (img/${IMG.guide}) inside img/${IMG.place3} (mask alpha 0 = repaint); no second picture`]]
    .flatMap(([k, what]) => { const e = manifest.kit.views[VIEWER].prompts[k]; return [`===== BEGIN ${NAME} ${k}: ${what} · sha256 ${e.sha256} · ${e.chars} characters`, e.text, `===== END ${NAME} ${k}`, '']; })].join('\n');
writeFileSync(DIR + 'room-a-ra-a-prompts.txt', promptsTxt);
// the publishing folder
rmSync(PUB, { recursive: true, force: true }); mkdirSync(PUB + 'img', { recursive: true });
for (const f of Object.values(IMG)) copyFileSync(DIR + f, PUB + 'img/' + f);
for (const f of ['ra1_tools.py', 'lift5.py', 'colour-check-ra1.py', 'room-a-ra-a.json', 'room-a-ra-a-prompts.txt', 'featuresA.json', 'plainA.json']) copyFileSync(DIR + f, PUB + f);
// the review overlays (overlayA.py), for the page only: AI-generated, labelled on the picture and in the page's captions
export const REVIEW = ['ra-A-review-full.png', 'ra-A-review-wall.png', 'ra-A-review-390.png', 'ra-A-review-402.png', 'ra-A-review-430.png'];
mkdirSync(PUB + 'img/review', { recursive: true }); for (const f of REVIEW) if (existsSync(DIR + f)) copyFileSync(DIR + f, PUB + 'img/review/' + f);
copyFileSync(DIR + '../camera-report-A.json', PUB + 'camera-report-A.json');
for (const f of Object.values(IMG)) if (sha('pub/img/' + f) !== sha(f)) throw new Error('copy differs: ' + f);
console.log(`${NAME} manifest: prompts s1 ${P.s1.length}, s2 ${P.s2.length}, s3 ${P.s3.length} characters | ${Object.keys(IMG).length} pictures, 5 files | step 2 mask ${KIT.expected.s2.maskedShare}, step 3 mask ${KIT.expected.s3.maskedShare}`);
