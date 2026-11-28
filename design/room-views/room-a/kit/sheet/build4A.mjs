// Sheet RA-A version 6's step 4 (the Lead, 13:07 and 13:24 on 19 November): writes room-a-ra-a-s4.json, step 4's kit (the files and
// their sha256, the prompt and its hash, the mask's expected share and alpha hash, the split's grey, the start picture by name and
// hash, the measurements), and room-a-ra-a-s4-prompt.txt; then adds to pub/ step 4's files only: the mask, the split, the kit, the
// prompt, the tool's version 2 (ra2_tools.py) and the step-4 review overlays. Version 4's files in pub/ (buildA.mjs's) are kept
// byte for byte, its manifest room-a-ra-a.json among them: steps 1 to 3 are done and stay as they were. Run after buildA.mjs,
// kit4A.py and overlay4A.py. Generates nothing. Usage: node build4A.mjs
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { prompt4 } from './promptsA.mjs';
const DIR = new URL('./', import.meta.url).pathname, PUB = DIR + 'pub/', DATE = '2026-11-19';
const shaB = b => createHash('sha256').update(b).digest('hex'), sha = f => shaB(readFileSync(DIR + f)), J = f => JSON.parse(readFileSync(DIR + f, 'utf8'));
const FIX = J('fix4A.json'), K4 = J('kit4-A.json'), V4 = J('_readback-4/room-a-ra-a.json');
// version 4's manifest, as published and accepted: the base of steps 1 to 3, unchanged
if (sha('pub/room-a-ra-a.json') !== sha('_readback-4/room-a-ra-a.json') || V4.version !== 4) throw new Error("pub/room-a-ra-a.json is not version 4's manifest as published");
if (K4.fix.sha256 !== sha('fix4A.json')) throw new Error('kit4-A.json was not made from this fix4A.json: run kit4A.py');
const P4 = prompt4(), files = { place4: { published: 'img/ra-A-place4.png', sha256: sha('ra-A-place4.png') }, split4: { published: 'img/ra-A-split4.png', sha256: sha('ra-A-split4.png') } };
const S4 = {
  sheet: 'RA-A', room: 'Room A', view: 'A', version: 6, step: 4, date: DATE,
  about: "Step 4 of sheet RA-A: a fix over RA-A-4, the cabinet's right side, one masked edit (the Lead, 13:07 and 13:24 on 19 November). RA-A-3 painted the cabinet's frame down its left side and along its bottom but not its right: its top bar, with the second orange light, and the breaker rows' cables fade softly into the wall. Version 4's files are kept byte for byte, its manifest room-a-ra-a.json among them, for steps 1 to 3, which are done; this file adds step 4.",
  rules: ['Every picture made from this sheet is AI-generated. Its record says so, with its tool, model, prompt, date and settings, and it is never presented as made by a person.',
    "The owner's reference pictures are never inputs. Step 4's only input is RA-A-4, the accepted step-3 picture, with this file's mask.",
    'Test pages only: no picture from this sheet is an asset or contract, and none is committed.',
    "The Lead gives step 4's go, for one call, and names this file's hashes."],
  manifest: { file: 'room-a-ra-a.json', sha256: sha('pub/room-a-ra-a.json'), version: 4, note: "version 4's manifest, byte for byte (version id 1795092955-447e, restored as 1795094570-9e36): steps 1 to 3. RA-A-3 (step 2) and RA-A-4 (step 3) were painted from it and accepted by the Lead." },
  startPicture: { step: 3, ...FIX.picture },
  stepOnePicture: FIX.stepOne,
  tool: { file: 'ra2_tools.py', sha256: sha('ra2_tools.py'), version: 2, note: "version 1's commands unchanged (ra1_tools.py, kept byte for byte), with s4, keep4, lift4 and frame4" },
  files, split4: K4.split4, expected: { s4: K4.expected4 },
  prompts: { s4: { text: P4, sha256: shaB(Buffer.from(P4, 'utf8')), chars: P4.length } },
  mask: { ...FIX.mask, px: K4.place4.px, bbox: K4.place4.bbox, measured: FIX.measured },
  checks: { gaps: K4.gaps4, paintedOverInStep2: K4.paintedOverInStep2, gapToStep3Px: K4.gapToStep3Px, secondLight: K4.secondLight, lift4Area: K4.lift4Area },
  frameRule: K4.frameRule,
  steps: [{ step: 4, what: "a fix: the cabinet's right side, one masked edit", inputs: [`RA-A-4, the kept step-3 picture (sha256 ${FIX.picture.sha256}), itself, with no guide (ra2_tools.py s4)`],
    mask: `${files.place4.published} (white = repaint; the tool writes it as RGBA, alpha 0 = repaint)`, secondPicture: 'none', prompt: 's4', keep: 'ra2_tools.py keep4',
    lift: "ra2_tools.py lift4: the cabinet's layer refreshed, the Lead's recipe on RA-A-1 and the step-4 picture inside the cabinet's step-2 split area with step 4's mask",
    measure: `ra2_tools.py frame4: the frame's outer edge beside the grille, at x ${K4.frameRule.frameOuterEdgeAtMostX} or less (${K4.frameRule.minClearPx} px from the grille's edge at x ${K4.frameRule.grilleEdgeX})` }],
  budget: 'one edit, about $0.06, over RA-A-4; Room A has spent about $0.23 of its cap under $5 (the Lead, 13:20)',
  changes: [
    { version: 5, date: DATE, what: 'Published in error, at about 13:14 to 13:16 (1795094103-c6d4, then 1795094212-bc2a), after RA-A-3 and RA-A-4 had been painted from version 4 and after the Lead had stopped it: the Lead\'s messages reached this session late. No picture was made from it. It was replaced by version 4\'s bytes, every file and the page byte for byte (1795094570-9e36), and it is set aside.' },
    { version: 6, date: DATE, by: 'the Lead, 13:07 and 13:24 on 19 November', what: `Step 4, a fix over RA-A-4: the cabinet's right side. The mask is x ${FIX.mask.x[0]} to ${FIX.mask.x[1]}, y ${FIX.mask.y[0]} to ${FIX.mask.y[1]} (${K4.place4.px} px): from just inside the breaker rows' right ends to 15 px past the cabinet's outline, its full height. Version 4's files are kept byte for byte; this file, its prompt, the mask, the split, the tool's version 2 and two review overlays are added.` }],
};
writeFileSync(DIR + 'room-a-ra-a-s4.json', JSON.stringify(S4, null, 1));
writeFileSync(DIR + 'room-a-ra-a-s4-prompt.txt', [`Room A · sheet RA-A · step 4 · prompt · ${DATE}`, S4.rules[0], 'The prompt is the text between its BEGIN line and its END line (the newline after BEGIN and the one before END are not part of it); its sha256 is of that text in UTF-8.', '',
  `===== BEGIN RA-A s4: step 4 (a fix: the cabinet's right side, one masked edit) · input RA-A-4 itself, no guide, inside img/ra-A-place4.png (mask alpha 0 = repaint); no second picture · sha256 ${S4.prompts.s4.sha256} · ${P4.length} characters`, P4, '===== END RA-A s4', ''].join('\n'));
// step 4's files only, added to pub/
for (const [src, dst] of [['ra-A-place4.png', 'img/ra-A-place4.png'], ['ra-A-split4.png', 'img/ra-A-split4.png'], ['room-a-ra-a-s4.json', 'room-a-ra-a-s4.json'], ['room-a-ra-a-s4-prompt.txt', 'room-a-ra-a-s4-prompt.txt'], ['ra2_tools.py', 'ra2_tools.py']]) copyFileSync(DIR + src, PUB + dst);
export const REVIEW4 = ['ra-A-review4-cabinet.png', 'ra-A-review4-402.png'];
mkdirSync(PUB + 'img/review', { recursive: true }); for (const f of REVIEW4) if (existsSync(DIR + f)) copyFileSync(DIR + f, PUB + 'img/review/' + f);
for (const [k, e] of Object.entries(files)) if (sha('pub/' + e.published) !== e.sha256) throw new Error('copy differs: ' + k);
console.log(`RA-A step 4: mask ${K4.place4.px} px (share ${K4.expected4.maskedShare}), prompt ${P4.length} characters, kit ${sha('room-a-ra-a-s4.json').slice(0, 12)}`);
