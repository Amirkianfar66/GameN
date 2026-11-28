// Sheet RA-D version 2.1's manifest (buildD.mjs calls this where it exists, after building version 2's): step 2b, a hatch-only
// masked edit of RA-D-3x (the Lead, 27 November 2026, 21:03). Adds to the kit step 2b's mask, split map and colour map, its prompt,
// its split greys and its expected share, alpha hash and base pixels (kit-D2b.json); marks step 2 as held, with its two runs
// (step2-D.json), inserts step 2b after it and starts step 3 from step 2b's kept picture; names the tool's version 2; adds the
// evidence files (RA-D-3x's record and script, the screens, step 2b's kit); and puts version 2.1's change first, version 2's after
// it unchanged. Returns the files to stage in pub/. Generates nothing.
import { readFileSync, existsSync } from 'fs';
import { prompt2b, S2_HATCH, S2B_AREAS, S2B_SIZE, S2B_BOX } from './promptsD.mjs';
export function extend(manifest, { DIR, sha, promptEntry, TOOL }) {
  const J = f => JSON.parse(readFileSync(DIR + f, 'utf8')), K2 = J('kit-D2b.json'), COMP = J('composite-D3x.json'), S2 = J('step2-D.json'), V = manifest.kit.views.D;
  if (manifest.version !== 2) throw new Error('version 2.1 extends version 2');
  const base = COMP.outputs['ra-D-3x.png'].pixelsSha256;
  if (base !== K2.expected.s2b.basePixels || base !== S2.base2b.pixelsSha256) throw new Error('RA-D-3x is not one picture across its records');
  const IMG = { place2b: 'ra-D-place2b.png', split2b: 'ra-D-split2b.png', regions2b: 'ra-D-regions2b.png' };
  for (const [k, f] of Object.entries(IMG)) { if (sha(f) !== K2.files[f]) throw new Error(`${f} is not kit-D2b.json's`); V.files[k] = { published: `img/${f}`, sha256: sha(f) }; }
  const P2B = prompt2b(), s2 = V.prompts.s2.text;
  V.prompts.s2b = promptEntry(P2B); V.split2b = K2.split2b;
  V.expected.s2b = { maskedShare: K2.expected.s2b.maskedShare, rawMaskAlpha: K2.expected.s2b.rawMaskAlpha, basePixels: base };
  // the prompt against step 2's: the style, colour and keep-out blocks the same; in the PLACE block, sentence by sentence
  const blocks = t => t.split('\n\n'), b2 = blocks(s2), b2b = blocks(P2B);
  if (b2.length !== 4 || b2b.length !== 4 || [0, 1, 3].some(i => b2[i] !== b2b[i])) throw new Error("step 2b's style, colour and keep-out blocks are not step 2's");
  const sents = t => t.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()), p2 = sents(b2[2]), p2b = sents(b2b[2]);
  const promptDiff = { blocksSame: ['style', 'colour', 'keep-out'], place: { kept: p2.filter(s => p2b.includes(s)), dropped: p2.filter(s => !p2b.includes(s)), added: p2b.filter(s => !p2.includes(s)) } };
  if (!promptDiff.place.kept.includes(S2_HATCH) || ![S2B_AREAS.split('. ')[0] + '.', S2B_SIZE, S2B_BOX].every(s => promptDiff.place.added.some(a => a.startsWith(s.slice(0, 40))))) throw new Error('the prompt diff is not as written');
  manifest.version = 2.1;
  // the tool as versions 2.1 and 2.2 published it (version 2); version 2.3 names its version 3 below
  const TOOL_V2 = 'd92ff2d6296e8796f29d8e54ce5919a517cc16e0c733d837ad67cdd19d5331da', V23ON = existsSync(DIR + 'composite-D3hc.json');
  if (!V23ON && sha(TOOL) !== TOOL_V2) throw new Error('the tool is not version 2');
  manifest.kit.tool = { file: TOOL, sha256: TOOL_V2, version: 2, note: "sheet RA-A's tool (ra1_tools.py, version 1) with view D's manifest, its three steps unchanged; version 2 adds step 2b's commands (s2b, keep2b, lift2b and colours D 2b), which check that their start picture is RA-D-3x pixel for pixel" };
  const st2 = manifest.steps.find(s => s.step === 2), i2 = manifest.steps.indexOf(st2), st3 = manifest.steps.find(s => s.step === 3);
  st2.done = { runs: S2.runs.map(r => ({ name: r.name, sha256: r.sha256, raw: r.raw.sha256 })), result: S2.result, madeOn: S2.madeOn, record: "the image session's records" };
  delete st2.go;
  const nExc = K2.featureTest.exceptions.reduce((n, e) => n + e.parts.length, 0);
  manifest.steps.splice(i2 + 1, 0, { step: '2b', what: "the hatch, its lid and the toolbox, one masked edit on RA-D-3x; the desk and the cabinet are RA-D-3x's, not masked",
    inputs: [`RA-D-3x (pixels sha256 ${base}), rebuilt with compositeD3x.py from the image session's records (RA-D-1, RA-D-3 and RA-D-3-raw), with the step-2 guide inside step 2b's mask (${TOOL} s2b)`],
    picture: { name: 'RA-D-3x', pixelsSha256: base, record: 'composite-D3x.json', script: 'compositeD3x.py' },
    mask: `${V.files.place2b.published} (white = repaint; the tool writes it as RGBA, alpha 0 = repaint): two areas, the hatch and its lid as one, the toolbox as its own, at least ${K2.gapPx.grown} px apart`, secondPicture: 'none', prompt: 's2b',
    keep: `${TOOL} keep2b`, lift: `${TOOL} lift2b`, check: `${TOOL} colours D 2b (colour-check-ra1.py with ${V.files.regions2b.published}: step 2's map with RA-D-3x's painted screens)`,
    before: `the 15 px rule against RA-D-1's painted features: passed, with ${nExc} named exceptions, each one the Lead accepted for step 2 on 27 November (20:57); and ${K2.clearPx.paintedDeskAndCabinet} px clear of RA-D-3x's painted desk and cabinet`, go: "after the Lead's review of this version" });
  if (st3) st3.inputs = [`the kept step-2b picture, with the guide inside step 3's mask (${TOOL} s3)`];
  const EV = [['composite-D3x.json', "RA-D-3x's record: its sources, which run each area came from and why, the trim, the completions and their checks"], ['compositeD3x.py', 'the script that rebuilds RA-D-3x from the image session\'s records, pixel for pixel'],
    ['screens-D.json', "view D's two screens, fitted to RA-D-3x's painted black and gated: the live monitors' regions"], ['kit-D2b.json', "step 2b's areas, gap, growth, 15 px rule, clearances, seams and crossing, and its expected hashes"], ['step2-D.json', "step 2's two runs, held, and RA-D-3x"]];
  for (const [f, what] of EV) manifest.evidence[f] = { what, sha256: sha(f) };
  manifest.changes = [{ version: 2.1, date: '2026-11-27', from: "the Lead, 27 November, 21:03", decision: S2.decision, why: S2.result,
    base: `RA-D-3x, pixels sha256 ${base}: ${S2.base2b.what}`,
    mask2b: `the hatch and its lid as one area (${K2.areas[1].px} px), the toolbox as its own (${K2.areas[0].px} px), ${K2.gapPx.grown} px apart; ${K2.expected.s2b.maskedShare} of the picture with the selective growth (+${K2.growth.addedPx} px); ${K2.hatchOutlineLeftOut.px} px of the hatch's outline, next to the toolbox, left out for the gap`,
    prompt: { s2b: { sha256: V.prompts.s2b.sha256, chars: V.prompts.s2b.chars }, against: 's2', ...promptDiff },
    tool: 'version 2: step 2b\'s commands', files: Object.fromEntries(Object.entries(IMG).map(([k, f]) => [k, { published: `img/${f}`, sha256: sha(f), added: true }])) }, ...manifest.changes];
  // version 2.2 (the Lead, 27 November, 22:29): step 2b's growth off, on both areas; only the step-2b mask, split and alpha change.
  // Version 2.1's change is kept as published (its read-back, _readback-21/), under version 2.2's.
  if (K2.growth.on === false) {
    const R21 = JSON.parse(readFileSync(DIR + '_readback-21/room-a-ra-d.json', 'utf8')), O = R21.kit.views.D;
    if (R21.version !== 2.1 || JSON.stringify(R21.changes.slice(1)) !== JSON.stringify(manifest.changes.slice(1))) throw new Error("version 2.1's read-back is not the version this builds on");
    for (const k of ['s1', 's2', 's2b', 's3']) if (O.prompts[k].sha256 !== V.prompts[k].sha256) throw new Error(`${k} is not version 2.1's prompt`);
    for (const k of Object.keys(O.files)) if (!['place2b', 'split2b'].includes(k) && O.files[k].sha256 !== V.files[k].sha256) throw new Error(`${k} is not version 2.1's file`);
    if (O.expected.s2b.basePixels !== V.expected.s2b.basePixels || R21.kit.tool.sha256 !== manifest.kit.tool.sha256) throw new Error("RA-D-3x or the tool is not version 2.1's");
    manifest.version = 2.2;
    manifest.changes = [{ version: 2.2, date: '2026-11-27', from: 'the Lead, 27 November, 22:29', decision: K2.growth.decision,
      why: "both failed runs painted the hatch too big; in the input the grown band shows as about 18 px of flat guide deck round each piece, which invites a bigger hatch, while the prompt says each piece fills its own area exactly",
      mask2b: `the hatch and its lid as one area (${K2.areas[1].px} px), the toolbox as its own (${K2.areas[0].px} px), ${K2.gapPx.grown} px apart; each its outline plus 6 px, no growth: ${K2.expected.s2b.maskedShare} of the picture (version 2.1: ${O.expected.s2b.maskedShare})`,
      expected: { s2b: { v21: { maskedShare: O.expected.s2b.maskedShare, rawMaskAlpha: O.expected.s2b.rawMaskAlpha }, now: { maskedShare: V.expected.s2b.maskedShare, rawMaskAlpha: V.expected.s2b.rawMaskAlpha } } },
      files: Object.fromEntries(['place2b', 'split2b'].map(k => [k, { published: V.files[k].published, v21: O.files[k].sha256, now: V.files[k].sha256 }])),
      unchanged: 'every prompt (s2b included), the guide, the colour maps, the tool, RA-D-3x and every other file the tool reads', redrawn: "the page's two overlays of step 2b's mask on RA-D-3x (img/ra-D-3x-step2b.png and its 2x zoom)" }, R21.changes[0], ...manifest.changes.slice(1)];
  }
  // version 2.3 (the Lead, 27 November, 22:54): step 2b made RA-D-3h, kept and completed in code as RA-D-3hc (compositeD3hc.py); step 3
  // starts from RA-D-3hc, pinned by the tool's version 3, and checks its colours with step 2b's map. Version 2.2's manifest, as published
  // (its read-back, _readback-22/), is the base: every prompt, file and expected value its own, its changes kept under 2.3's.
  let V23 = null;
  if (existsSync(DIR + 'composite-D3hc.json')) {
    const HC = J('composite-D3hc.json'), PDJ = J('painted-D.json');
    if (!HC.pass || HC.checks.changedOutsideTheOutlineAndItsFeather !== 0 || !HC.checks.keepRebuiltExactly || !HC.checks.rawTakenWholeInsideTheOutline) throw new Error('RA-D-3hc does not pass its checks');
    const R22 = JSON.parse(readFileSync(DIR + '_readback-22/room-a-ra-d.json', 'utf8')), O = R22.kit.views.D;
    if (R22.version !== 2.2 || JSON.stringify(R22.changes) !== JSON.stringify(manifest.changes) || JSON.stringify(R22.steps) !== JSON.stringify(manifest.steps)) throw new Error("version 2.2's read-back is not the version this builds on");
    for (const k of ['s1', 's2', 's2b', 's3']) if (O.prompts[k].sha256 !== V.prompts[k].sha256) throw new Error(`${k} is not version 2.2's prompt`);
    if (JSON.stringify(Object.keys(O.files).sort()) !== JSON.stringify(Object.keys(V.files).sort())) throw new Error("the kit's files are not version 2.2's");
    for (const k of Object.keys(O.files)) if (O.files[k].sha256 !== V.files[k].sha256) throw new Error(`${k} is not version 2.2's file`);
    if (JSON.stringify(O.expected) !== JSON.stringify(V.expected)) throw new Error("the expected values are not version 2.2's");
    if (R22.kit.tool.sha256 === sha(TOOL)) throw new Error('the tool is still version 2');
    const px = HC.outputs['ra-D-3hc.png'].pixelsSha256, src = n => HC.sources.find(x => x.name === n), CK = HC.checks, TB = PDJ.toolbox;
    if (PDJ.picture.pixelsSha256 !== px && !existsSync(DIR + 'composite-D4c.json')) throw new Error('painted-D.json is not of RA-D-3hc');   // version 2.4 moves it on to RA-D-4c
    manifest.version = 2.3;
    V.expected.s3 = { ...V.expected.s3, startPixels: px };
    manifest.kit.tool = { file: TOOL, sha256: sha(TOOL), version: 3, note: "sheet RA-A's tool (ra1_tools.py, version 1) with view D's manifest, its three steps unchanged; version 2 adds step 2b's commands (s2b, keep2b, lift2b and colours D 2b), which check that their start picture is RA-D-3x pixel for pixel; version 3 pins step 3's start: s3, keep3 and lift3 check that it is RA-D-3hc pixel for pixel, and colours D 3 uses step 2b's map (the screens where they are painted)" };
    const st2b = manifest.steps.find(x => x.step === '2b'), st3 = manifest.steps.find(x => x.step === 3);
    st2b.done = { run: { name: 'RA-D-3h', sha256: src('RA-D-3h').sha256, raw: src('RA-D-3h-raw').sha256 }, madeOn: 'sheet RA-D version 2.2 (manifest 45c8562f42272eccc489444824c5174333f46dc2ead4c9427d65ec89b4e888db)',
      result: "the hatch right-sized and in its place, the lid upright; the toolbox right-sized, painted about 27 px left of its area", record: "the image session's records",
      completed: { name: 'RA-D-3hc', pixelsSha256: px, record: 'composite-D3hc.json', script: 'compositeD3hc.py', what: "RA-D-3h with the hatch, its lid and the toolbox completed in code from its raw" } };
    delete st2b.go;
    st3.inputs = [`RA-D-3hc (pixels sha256 ${px}), rebuilt with compositeD3hc.py from the image session's records (RA-D-3h, its raw, and RA-D-3x), with the guide inside step 3's mask (${TOOL} s3)`];
    st3.picture = { name: 'RA-D-3hc', pixelsSha256: px, record: 'composite-D3hc.json', script: 'compositeD3hc.py' };
    st3.check = `${TOOL} colours D 3 (colour-check-ra1.py with ${V.files.regions2b.published}: step 2's map with the screens where they are painted, as RA-D-3hc has them)`;
    st3.go = "after the Lead's review of this version";
    const EV3 = [['compositeD3hc.py', "the script that rebuilds RA-D-3hc, step 3's start picture, from the image session's records, pixel for pixel"],
      ['composite-D3hc.json', "RA-D-3hc's record: its sources, the outline traced on the raw, the parts completed and their checks"],
      ['painted-D.json', "the toolbox's painted place on the deck, for view D's lift and occlusion"]];
    for (const [f, what] of EV3) manifest.evidence[f] = { what, sha256: sha(f) };
    manifest.changes = [{ version: 2.3, date: '2026-11-27', from: 'the Lead, 27 November, 22:54', decision: HC.decision,
      plate: { name: 'RA-D-3hc', pixelsSha256: px, of: HC.codeComposite.of, how: HC.codeComposite.how },
      checks: { 'changedPxAgainstRA-D-3h': CK['changedPxAgainstRA-D-3h'], 'unchangedPxAgainstRA-D-3h': CK['unchangedPxAgainstRA-D-3h'], picturePx: CK.picturePx, changedOutsideTheOutlineAndItsFeather: CK.changedOutsideTheOutlineAndItsFeather },
      parts: Object.fromEntries(Object.entries(HC.parts).map(([k, v]) => [k, { changedPx: v.changedPx, furthestPastTheMaskPx: v.furthestPastTheMaskPx }])),
      toolbox: { file: 'painted-D.json', deckShiftM: TB.deck.shift, turnDeg: TB.deck.turnDeg, leftOut: HC.leftOut },
      tool: "version 3: step 3's commands pinned to RA-D-3hc; step 3's colour check on step 2b's map",
      expected: { s3: { startPixels: px } },
      unchanged: "every prompt (s3 included), every mask (step 3's place3 included), split map, colour map and guide, and every other file the tool reads, as version 2.2's" }, ...R22.changes];
    V23 = { files: EV3.map(([f]) => f) };
  }

  // version 2.4 (the Lead, 27 November, 23:49 and 23:54): step 3 made RA-D-4, kept and completed in code as RA-D-4c (compositeD4c.py):
  // the capsule's housing from step 3's raw, the bracket plate left out, and the toolbox's cast shadow from RA-D-3h's raw; painted-D.json
  // on RA-D-4c, with the capsule's painted box. Version 2.3's manifest, as published (its read-back, _readback-23/), is the base: every
  // prompt, file, expected value and the tool its own, its changes kept under 2.4's.
  let V24 = null;
  if (V23 && existsSync(DIR + 'composite-D4c.json')) {
    const C4 = J('composite-D4c.json'), PDJ = J('painted-D.json'), CK = C4.checks;
    if (!C4.pass || CK.changedOutsideTheOutlinesAndTheirFeather !== 0 || !CK.keep3RebuiltExactly || !CK.rawTakenWholeInsideTheOutlines.capsule || !CK.rawTakenWholeInsideTheOutlines.shadow
        || CK.bracketPxTakenWhole !== 0 || !CK.wallSeamBehindTheHousing || CK.boxPxChanged !== 0 || !CK.colours.pass) throw new Error('RA-D-4c does not pass its checks');
    const R23 = JSON.parse(readFileSync(DIR + '_readback-23/room-a-ra-d.json', 'utf8')), O = R23.kit.views.D;
    if (R23.version !== 2.3 || JSON.stringify(R23.changes) !== JSON.stringify(manifest.changes) || JSON.stringify(R23.steps) !== JSON.stringify(manifest.steps)) throw new Error("version 2.3's read-back is not the version this builds on");
    for (const k of ['s1', 's2', 's2b', 's3']) if (O.prompts[k].sha256 !== V.prompts[k].sha256) throw new Error(`${k} is not version 2.3's prompt`);
    if (JSON.stringify(Object.keys(O.files).sort()) !== JSON.stringify(Object.keys(V.files).sort())) throw new Error("the kit's files are not version 2.3's");
    for (const k of Object.keys(O.files)) if (O.files[k].sha256 !== V.files[k].sha256) throw new Error(`${k} is not version 2.3's file`);
    if (JSON.stringify(O.expected) !== JSON.stringify(V.expected)) throw new Error("the expected values are not version 2.3's");
    if (R23.kit.tool.sha256 !== sha(TOOL) || JSON.stringify(R23.kit.tool) !== JSON.stringify(manifest.kit.tool)) throw new Error("the tool is not version 2.3's");
    const px = C4.outputs['ra-D-4c.png'].pixelsSha256, src = n => C4.sources.find(x => x.name === n), CA = C4.capsule, PC = PDJ.capsule;
    if (PDJ.picture.pixelsSha256 !== px || !PC) throw new Error('painted-D.json is not of RA-D-4c, or has no capsule');
    manifest.version = 2.4;
    const st3 = manifest.steps.find(x => x.step === 3);
    st3.done = { run: { name: 'RA-D-4', sha256: src('RA-D-4').sha256, raw: src('RA-D-4-raw').sha256 }, madeOn: 'sheet RA-D version 2.3 (manifest 36593953b9b7d8c077b62f0ef469658ac67b0dc624d8bd26e5999b2954d03d3d)',
      result: "the capsule whole and in its place; the keep cut the housing's bottom edge, the handle's lower half, the bracket plate and the right side face's outer ink at the shape's edge",
      record: "the image session's records", accepted: "the Lead, 27 November 2026, 23:54, for completion in code",
      completed: { name: 'RA-D-4c', pixelsSha256: px, record: 'composite-D4c.json', script: 'compositeD4c.py', what: "RA-D-4 with the capsule's housing completed from its raw (the bracket plate left out) and the toolbox's cast shadow from RA-D-3h's raw" } };
    delete st3.go;
    const EV4 = [['compositeD4c.py', "the script that rebuilds RA-D-4c, view D's final plate, from the image session's records, pixel for pixel"],
      ['composite-D4c.json', "RA-D-4c's record: its sources, the two outlines traced on the raws, the pixels changed by part and the checks"],
      ['painted-D.json', "view D's pieces painted away from the plan's place, on RA-D-4c: the toolbox's place on the deck and the capsule's painted box, for view D's lift, occlusion and overlays"]];
    for (const [f, what] of EV4) manifest.evidence[f] = { what, sha256: sha(f) };
    manifest.changes = [{ version: 2.4, date: '2026-11-28', from: 'the Lead, 27 November, 23:49 and 23:54', decision: C4.decision,
      plate: { name: 'RA-D-4c', pixelsSha256: px, of: C4.codeComposite.of, how: C4.codeComposite.how },
      checks: { 'changedPxAgainstRA-D-4': CK['changedPxAgainstRA-D-4'], changedPxByPart: CK.changedPxByPart, 'unchangedPxAgainstRA-D-4': CK['unchangedPxAgainstRA-D-4'], picturePx: CK.picturePx,
                changedOutsideTheOutlinesAndTheirFeather: CK.changedOutsideTheOutlinesAndTheirFeather, bracketPxTakenWhole: CK.bracketPxTakenWhole, wallSeamBehindTheHousing: CK.wallSeamBehindTheHousing, colours: CK.colours.pass },
      capsule: { outlineBox: CA.outlineBox, shapeBox: CA.shapeBox, pastTheShapePx: CA.pastTheShapePx, bracket: { px: CA.bracket.px, takenWhole: CA.bracket.takenWhole, inTheFeather: CA.bracket.inTheFeather } },
      shadow: { crossingsApartPx: C4.shadow.seam.crossingsApartPx },
      painted: { file: 'painted-D.json', capsule: { outlineBox: PC.picture.outlineBox, wall: PC.wall.painted, sizeM: PC.wall.sizeM } },
      unchanged: "every prompt, mask, split map, colour map and guide, the tool (version 3) and every other file the tool reads, as version 2.3's" }, ...R23.changes];
    V24 = { files: EV4.map(([f]) => f).filter(f => !V23.files.includes(f)) };
  }
  return { img: Object.values(IMG), files: [...EV.map(([f]) => f), ...(V23 ? V23.files : []), ...(V24 ? V24.files : [])], promptDiff, what: `step 2b (the hatch, its lid and the toolbox, one masked edit on RA-D-3x) · input RA-D-3x with the step-2 guide (img/ra-D-guide-s2.png) inside img/${IMG.place2b} (mask alpha 0 = repaint); no second picture` };
}
