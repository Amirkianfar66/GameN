// mothership:dev-only
//
// The crew drawing release (DSN-REQ-17, docs/design/crew-drawing-release.md): the owner's
// approved restyle of the nine, packaged for runtime adoption. These tests hold what the handoff
// promises: sources a port can copy exactly (the dev-only mark and two import specifiers aside),
// the approved traced heads byte for byte, a drop-in for the rig's wardrobe and crew that draws
// every gesture, outfit and health mark, the films' effects on its output, a unique id prefix per
// mounted figure, the motion interface (independent blinks, no lids on Echo's visor, only Mira's
// hair and Echo's locs swing, reduced motion and still figures), the caching interface (pose keys,
// live attributes equal to a rebuild), the palette rule, the exports and their record, the tokens
// candidate and the review renders' record. Nothing here adopts the release: Integration does.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { FRAME, hasFront } from '../../../design/board-motion/figures/body.mjs';
import { CREW as RIG_CREW } from '../../../design/board-motion/figures/crew.mjs';
import { GESTURES, skeletonOf } from '../../../design/board-motion/figures/gestures.mjs';
import { walkPose } from '../../../design/board-motion/figures/motion.mjs';
import * as rigWardrobe from '../../../design/board-motion/figures/wardrobe.mjs';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { CREW, CREW_DRAWING_VERSION, CREW_ORDER, SUIT, crewMember } from '../../../design/crew-drawing/source/crew.mjs';
import { HEADS, lidPaths } from '../../../design/crew-drawing/source/head.mjs';
import { applyCrewFrame, crewArtDefs, crewFrame, poseKey } from '../../../design/crew-drawing/source/mount.mjs';
import { STILL_DRIFT, blinkAt, crewMotion, hairFollow, hasHangingHair, hasLids, isStill } from '../../../design/crew-drawing/source/motion.mjs';
import { CARD, PORTRAIT_HEAD, STANDEE_ANCHORS, crewCardSvg, crewPortraitSvg, crewStandeeSvg } from '../../../design/crew-drawing/source/portrait.mjs';
import { OUTFITS, dressedFigureSvg, outfitFor } from '../../../design/crew-drawing/source/wardrobe.mjs';
import { IMPORT_REWRITES, build, portOf } from '../../../design/tools/crew-drawing-export.mjs';
import { prototypeReferences } from '../../../design/tools/lib/drawing-port-fence.mjs';
import { memorialSvg } from '../../../apps/game/hosted/board-v2-drawing/captain-fx.mjs';
import { halftoneSvg, outlineSvg } from '../../../apps/game/hosted/board-v2-drawing/clone-fx.mjs';

const root = new URL('../../../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const text = path => read(path).toString('utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ids = svg => [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const refs = svg => [...svg.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map(m => m[1] ?? m[2]);
const colours = svg => new Set([...svg.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map(m => m[0].toUpperCase()));
const nearest = hex => Math.min(...Object.values(FACTION_ACCENTS).map(accent => cie76(hex, accent)));
const SOURCE = 'design/crew-drawing/source/';
const sources = [...readdirSync(new URL(SOURCE, root)).filter(f => f.endsWith('.mjs')), ...readdirSync(new URL(`${SOURCE}heads/`, root)).map(f => `heads/${f}`)].sort();

function wellFormed(svg, label, { defs = '' } = {}) {
  assert.ok(svg.startsWith('<svg') && svg.trimEnd().endsWith('</svg>'), `${label}: one SVG`);
  assert.ok(!/NaN|undefined|Infinity/.test(svg), `${label}: every number is a number`);
  assert.ok(!/<text[\s>]|<script|<foreignObject|<image/.test(svg), `${label}: no text, script, foreign object or image`);
  const all = ids(svg), outer = ids(defs);
  assert.equal(new Set(all).size, all.length, `${label}: an id twice`);
  for (const ref of refs(svg)) assert.ok(all.includes(ref) || outer.includes(ref), `${label}: #${ref} has no target`);
}

test('the sources: dev-only, importing only one another and two rig modules, never the character pilot', () => {
  assert.equal(sources.length, 17);
  for (const file of sources) {
    const source = text(`${SOURCE}${file}`);
    assert.ok(source.startsWith('// mothership:dev-only\n'), `${file}: first line`);
    const imports = [...source.matchAll(/^import .* from '([^']+)';$/gm)].map(m => m[1]);
    for (const spec of imports) assert.ok(spec.startsWith('./') || spec in IMPORT_REWRITES, `${file}: imports ${spec}`);
    assert.ok(!source.includes("'../../character-pilot") && !/import[^;]*character-pilot/.test(source), `${file}: imports the pilot`);
    // The port: the mark dropped and the rig's two imports rewritten; then nothing in it names a prototype.
    const port = portOf(source);
    assert.ok(!port.includes('mothership:dev-only'), `${file}: the port keeps the mark`);
    assert.deepEqual(prototypeReferences(`apps/game/hosted/crew-drawing/${file}`, port), [], `${file}: the port names a prototype`);
    assert.ok(!port.toLowerCase().includes('board-motion') && !port.includes('design/abilities'), `${file}: the port's text names a prototype`);
  }
});

test('the heads are the approved traces, byte for byte', () => {
  for (const id of CREW_ORDER) {
    const name = `${CREW[id].sign.toLowerCase()}.mjs`;
    assert.equal(sha(read(`${SOURCE}heads/${name}`)), sha(read(`design/character-pilot/faces/${name}`)), name);
  }
});

test('a drop-in for the rig\'s crew: the same public ids, call signs and flags', () => {
  assert.deepEqual(CREW_ORDER, Object.keys(RIG_CREW));
  for (const id of CREW_ORDER) {
    assert.equal(CREW[id].id, id);
    for (const [key, value] of Object.entries(RIG_CREW[id])) if (key === 'sign' || typeof value === 'boolean') assert.equal(CREW[id][key], value, `${id}.${key}`);
    assert.equal(crewMember(RIG_CREW[id]), CREW[id], `${id}: the rig's entry names the same person`);
  }
  assert.throws(() => crewMember({ sign: 'Nobody' }));
  assert.equal(CREW_DRAWING_VERSION, 'crew-drawing-1.0.0');
});

test('a drop-in for the rig\'s wardrobe: the same rule of what is worn where, and every gesture, outfit and health mark draws', () => {
  assert.equal(outfitFor, rigWardrobe.outfitFor);
  assert.equal(OUTFITS, rigWardrobe.OUTFITS);
  const gestures = Object.keys(GESTURES);
  assert.equal(gestures.length, 27);
  gestures.forEach((name, i) => {
    for (const [k, outfit] of ['crew', 'gown', 'prison'].entries()) {
      const id = CREW_ORDER[(i + k * 3) % 9];
      for (const mark of ['', '+injured', '+still']) {
        const sk = skeletonOf(`${name}${mark}`);
        const prefix = `t-${name}-${outfit}-${mark.slice(1) || 'x'}`;
        wellFormed(dressedFigureSvg(CREW[id], sk, { outfit, prefix }), `${id} ${name}${mark} ${outfit}`);
        if (hasFront(sk)) wellFormed(dressedFigureSvg(CREW[id], sk, { outfit, prefix: `${prefix}-front`, layer: 'front' }), `${id} ${name}${mark} ${outfit} front`);
      }
    }
  });
  for (const id of CREW_ORDER) for (let p = 0; p < 1; p += 0.125) wellFormed(dressedFigureSvg(CREW[id], walkPose(p), { prefix: `w${id}` }), `${id} walk ${p}`);
  // The rig's call names a character with the rig's own CREW entry: the same drawing.
  const sk = skeletonOf('stand');
  assert.equal(dressedFigureSvg(RIG_CREW.c8, sk, { prefix: 'a' }), dressedFigureSvg(CREW.c8, sk, { prefix: 'a' }));
  // The rig's box and its file mode.
  assert.match(dressedFigureSvg(CREW.c1, sk), new RegExp(`viewBox="${FRAME.box.join(' ')}"`));
  const file = dressedFigureSvg(CREW.c1, sk, { inline: false, header: 'A test' });
  assert.ok(file.startsWith('<?xml') && file.includes('A test') && /<svg[^>]* width="[\d.]+" height="[\d.]+"/.test(file));
  // Deterministic.
  assert.equal(dressedFigureSvg(CREW.c9, sk, { outfit: 'gown', prefix: 'd' }), dressedFigureSvg(CREW.c9, sk, { outfit: 'gown', prefix: 'd' }));
});

test('a unique id prefix per mounted figure keeps every id apart; shared art is one hidden block', () => {
  const sk = skeletonOf('benchSling+injured');
  const a = dressedFigureSvg(CREW.c6, sk, { outfit: 'gown', prefix: 'seat-1-body' }), b = dressedFigureSvg(CREW.c6, sk, { outfit: 'gown', prefix: 'seat-2-body' });
  const shared = ids(a).filter(x => ids(b).includes(x));
  assert.deepEqual(shared, []);
  assert.ok(ids(a).every(x => x.startsWith('seat-1-body-')));
  const defs = crewArtDefs();
  wellFormed(defs, 'art defs');
  assert.deepEqual(ids(defs), CREW_ORDER.map(id => `crew-art-${id}`));
  for (const id of CREW_ORDER) {
    const lean = dressedFigureSvg(CREW[id], sk, { outfit: 'gown', prefix: `l${id}`, art: { ref: 'crew-art' }, live: true });
    wellFormed(lean, `${id} with shared art`, { defs });
    assert.ok(lean.length < dressedFigureSvg(CREW[id], sk, { outfit: 'gown', prefix: `l${id}` }).length - 20000, `${id}: shared art is smaller`);
  }
});

test('the films\' effects take the drop-in\'s figures: the memorial, the outline and the halftone', () => {
  for (const id of CREW_ORDER) {
    const figure = dressedFigureSvg(CREW[id], skeletonOf('stand'), { outfit: 'crew', prefix: `cl-${id}` });
    const memorial = memorialSvg(dressedFigureSvg(CREW[id], skeletonOf('stand'), { outfit: 'crew', prefix: `mem-${id}` }));
    wellFormed(memorial, `${id} memorial`);
    for (const hex of colours(memorial)) assert.ok(nearest(hex) >= MIN_ACCENT_DISTANCE, `${id} memorial ${hex}`);
    wellFormed(outlineSvg(figure, { prefix: `ol-${id}` }), `${id} outline`);
    wellFormed(halftoneSvg(figure, { density: 1, prefix: `ht-${id}` }), `${id} halftone`);
  }
});

test('motion: independent blinks, no lids on Echo\'s visor, and only Mira\'s hair and Echo\'s locs swing', () => {
  assert.deepEqual(CREW_ORDER.filter(id => !hasLids(id)), ['c9']);
  assert.deepEqual(lidPaths('c9', 1), []);
  assert.deepEqual(CREW_ORDER.filter(hasHangingHair), ['c8', 'c9']);
  const minute = Array.from({ length: 60000 / 20 }, (_, i) => i * 20);
  const shut = id => minute.map(t => blinkAt(t, id) > 0.5);
  const blinks = id => shut(id).filter((s, i, all) => s && !all[i - 1]).length;
  for (const id of CREW_ORDER.filter(hasLids)) {
    const n = blinks(id);
    assert.ok(n >= 12 && n <= 26, `${id}: ${n} blinks a minute`);
  }
  assert.equal(blinks('c9'), 0);
  // Independent: no two characters blink together more than now and then.
  const lidded = CREW_ORDER.filter(hasLids);
  for (let i = 0; i < lidded.length; i += 1) for (let j = i + 1; j < lidded.length; j += 1) {
    const [a, b] = [shut(lidded[i]), shut(lidded[j])];
    const together = a.filter((s, k) => s && b[k]).length;
    assert.ok(together <= 12, `${lidded[i]} and ${lidded[j]} shut together ${together} samples`);
  }
  // A live Echo has no lid hooks; the others have one per eye.
  for (const id of CREW_ORDER) {
    const svg = dressedFigureSvg(CREW[id], skeletonOf('stand'), { prefix: 'm', live: true });
    assert.equal((svg.match(/data-crew-lid="/g) ?? []).length, HEADS[id].eyes.length, id);
    assert.equal((svg.match(/data-crew-head="/g) ?? []).length, 1, id);
    assert.equal((svg.match(/data-crew-hang="/g) ?? []).length, hasHangingHair(id) ? 1 : 0, id);
  }
});

test('motion: the hair trails a move and settles; reduced motion keeps the blinks and stops drift and swing; a still figure does not move', () => {
  for (const id of ['c8', 'c9']) {
    const follow = hairFollow(id);
    let x = 0, peak = 0, t = 0;
    follow.step(0, x, 0);
    for (; t < 900; t += 16) { x += 0.12 * 16; peak = Math.max(peak, Math.abs(follow.step(16, x, 0).sway)); }
    assert.ok(peak > 1, `${id}: trails (${peak.toFixed(2)})`);
    let after = null;
    for (; t < 3900; t += 16) after = follow.step(16, x, 0);
    assert.ok(Math.abs(after.sway) < 0.05 && Math.abs(after.lift) < 0.05, `${id}: settles`);
  }
  assert.deepEqual(hairFollow('c1').step(16, 10, 0), { sway: 0, lift: 0 });
  for (const id of CREW_ORDER) for (let t = 0; t < 20000; t += 137) {
    const full = crewMotion(t, id), calm = crewMotion(t, id, { reduced: true });
    assert.equal(calm.blink, full.blink);
    assert.deepEqual([calm.sway, calm.lift, calm.drift], [0, 0, STILL_DRIFT]);
    assert.deepEqual(crewMotion(t, id, { still: true }), { blink: 0, sway: 0, lift: 0, drift: STILL_DRIFT });
  }
  assert.ok(CREW_ORDER.some(id => crewMotion(1500, id).drift.dx !== 0));
  assert.deepEqual(['down', 'slumpDesk', 'slumpBench', 'bedLying+still', 'benchSling+injured+still'].map(isStill), [true, true, true, true, true]);
  assert.deepEqual(['stand', 'bedLying', 'benchSling+injured', 'tablet', 'downstairs'].map(isStill), [false, false, false, false, false]);
});

test('caching: a pose key names a drawing; a frame\'s live attributes are what a rebuild would draw', () => {
  const sk = skeletonOf('think');
  const opts = { outfit: 'crew', layer: 'body', art: { ref: 'crew-art' }, live: true };
  assert.equal(poseKey(CREW.c1, sk, opts), poseKey(CREW.c1, structuredClone(sk), opts));
  assert.equal(poseKey(RIG_CREW.c1, sk, opts), poseKey(CREW.c1, sk, opts));
  assert.notEqual(poseKey(CREW.c1, sk, opts), poseKey(CREW.c1, skeletonOf('stand'), opts));
  assert.notEqual(poseKey(CREW.c1, sk, opts), poseKey(CREW.c2, sk, opts));
  assert.notEqual(poseKey(CREW.c1, sk, opts), poseKey(CREW.c1, sk, { ...opts, outfit: 'gown' }));
  assert.notEqual(poseKey(CREW.c1, walkPose(0), opts), poseKey(CREW.c1, walkPose(0.0625), opts));
  // A frame set by attributes equals the figure drawn with that motion.
  const attr = (svg, hook, name) => svg.match(new RegExp(`<[^>]*${hook}[^>]*>`))[0].match(new RegExp(` ${name}="([^"]*)"`))[1];
  for (const id of CREW_ORDER) for (const t of [0, 1234, 4321, 9876]) {
    const motion = crewMotion(t, id, { follow: hasHangingHair(id) ? { sway: 2.5, lift: -1 } : null });
    const drawn = dressedFigureSvg(CREW[id], sk, { prefix: 'f', live: true, motion });
    const frame = crewFrame(CREW[id], sk, motion);
    assert.equal(attr(drawn, 'data-crew-head=""', 'transform'), frame.head, `${id} at ${t}: head`);
    frame.lids.forEach(({ lid, lash }, i) => {
      assert.equal(attr(drawn, `data-crew-lid="${i}"`, 'd'), lid, `${id} at ${t}: lid ${i}`);
      assert.equal(attr(drawn, `data-crew-lash="${i}"`, 'd'), lash, `${id} at ${t}: lash ${i}`);
    });
    if (frame.hang) assert.equal(attr(drawn, 'data-crew-hang=""', 'transform'), frame.hang, `${id} at ${t}: hang`);
  }
  // applyCrewFrame sets each hook it finds, on any element with querySelector and setAttribute.
  const fake = () => {
    const set = [];
    return { set, querySelector: selector => ({ setAttribute: (name, value) => set.push([selector, name, value]) }) };
  };
  const a = fake(), b = fake();
  assert.equal(applyCrewFrame(a, crewFrame(CREW.c1, skeletonOf('stand'), crewMotion(100, 'c1'))), 5);
  assert.equal(applyCrewFrame(b, crewFrame(CREW.c9, skeletonOf('stand'), crewMotion(100, 'c9'))), 2);
  assert.deepEqual(crewFrame(CREW.c2, skeletonOf('doorBack'), {}).lids, [], 'turned away, no lids');
  assert.ok(crewFrame(CREW.c2, skeletonOf('tablet'), { blink: 0 }).lids.length > 0, 'looking down, the lids are lowered');
});

test('the palette rule: everything a character is drawn with keeps at least 30 from each faction accent', () => {
  for (const hex of Object.values(SUIT)) assert.ok(nearest(hex) >= MIN_ACCENT_DISTANCE, `suit ${hex}`);
  for (const id of CREW_ORDER) {
    const drawn = new Set([
      ...colours(crewPortraitSvg(CREW[id])), ...colours(crewCardSvg(CREW[id])), ...colours(crewStandeeSvg(CREW[id])),
      ...['crew', 'gown', 'prison'].flatMap(outfit => [...colours(dressedFigureSvg(CREW[id], skeletonOf('benchSling+injured'), { outfit }))]),
    ]);
    for (const hex of drawn) assert.ok(nearest(hex) >= MIN_ACCENT_DISTANCE, `${CREW[id].sign}: ${hex} is ${nearest(hex).toFixed(1)} from a team colour`);
  }
});

test('the cards keep the old cards\' box and face: every crop of the face still holds it; the standees keep the stand\'s anchors', () => {
  const shipped = JSON.parse(text('design/exports/asset-manifest.json')).assets.find(a => a.id === 'piece-crew');
  // The phone kit's avatar and the ability chip: 50% 22% / 175% of a 30 px circle, in card units.
  const width = 30 * 1.75, height = width * 96 / 84;
  const centre = [8 + ((width - 30) / 2 + 15) / width * 84, ((height - 30) * 0.22 + 15) / height * 96], radius = 15 / width * 84;
  for (const id of CREW_ORDER) {
    const old = shipped.variants.find(v => v.variant === `card-${id}`);
    const svg = crewCardSvg(CREW[id]);
    assert.match(svg, new RegExp(`viewBox="${old.viewBox}"`));
    // Echo's eyes are behind the visor (about x -11 to 12, y -5 to 3 in head units): two points on it.
    const eyes = HEADS[id].eyes.length ? HEADS[id].eyes : [[-6, -2], [4, -3]];
    const k = CARD.scale * PORTRAIT_HEAD.scale;
    for (const [ex, ey] of eyes) {
      const at = [CARD.face[0] + k * ex, CARD.face[1] + k * ey];
      assert.ok(Math.hypot(at[0] - centre[0], at[1] - centre[1]) < radius * 0.7, `${id}: an eye at ${at.map(v => v.toFixed(1))} is inside the crop`);
    }
    assert.deepEqual(STANDEE_ANCHORS, JSON.parse(JSON.stringify(shipped.variants.find(v => v.variant === `standee-${id}`).anchors)));
  }
});

test('the exports and the handoff record are what the tool draws, and name what they replace', async () => {
  const { files } = await build();
  for (const [path, body] of files) assert.equal(text(path), body, `${path} is stale: run node design/tools/crew-drawing-export.mjs`);
  const manifest = JSON.parse(files.get('design/crew-drawing/assets/manifest.json'));
  assert.equal(manifest.assets.length, 36);
  for (const asset of manifest.assets) {
    const bytes = read(asset.path);
    assert.equal(sha(bytes), asset.sha256, asset.path);
    assert.ok(!bytes.toString('utf8').includes('mothership:dev-only'), `${asset.path}: no dev-only mark`);
    wellFormed(bytes.toString('utf8'), asset.path);
    if (asset.replaces) assert.equal(sha(read(asset.replaces.path)), asset.replaces.sha256, `${asset.path}: replaces ${asset.replaces.path}`);
    if (asset.character) assert.ok(asset.colours.nearestFactionAccentCie76 >= MIN_ACCENT_DISTANCE, asset.path);
  }
  // A card uses its own character's token colours and no other character's.
  const tokens = JSON.parse(text('packages/design-tokens/src/tokens-0.5.0.json'));
  for (const id of CREW_ORDER) {
    const drawn = colours(text(`design/crew-drawing/assets/cards/card-${id}.svg`));
    for (const hex of Object.values(tokens.color.crew[id])) assert.ok(drawn.has(hex), `card-${id} draws ${hex}`);
    for (const [other, parts] of Object.entries(tokens.color.crew)) if (other !== id) for (const hex of Object.values(parts)) assert.ok(!drawn.has(hex), `card-${id} draws ${other}'s ${hex}`);
  }
  // The devices change only the old suit's grey.
  for (const asset of manifest.assets.filter(a => a.kind === 'device-held')) {
    assert.equal(text(asset.path), text(asset.replaces.path).split('#C6CDD4').join(SUIT.light), asset.path);
  }
  const candidate = JSON.parse(text('design/crew-drawing/release-candidate.json'));
  assert.equal(candidate.sources.length, 17);
  for (const s of candidate.sources) {
    assert.equal(sha(read(s.source)), s.sourceSha256, s.source);
    assert.equal(sha(portOf(text(s.source))), s.runtimeSha256, s.runtime);
  }
  const pins = JSON.parse(text('design/releases/design-0.6.0.json')).sources;
  for (const d of candidate.dependencies) assert.equal(pins[d.path], sha(read(d.path)), d.path);
  assert.equal(candidate.assets.sha256, sha(read('design/crew-drawing/assets/manifest.json')));
  assert.equal(candidate.tokens.sha256, sha(read('packages/design-tokens/src/tokens-0.5.0.json')));
  assert.equal(candidate.filmArt.shipped.length, 27);
});

test('tokens 0.5.0: the approved crew colours, every 0.4.0 key kept, and only the listed entries changed', () => {
  const previous = JSON.parse(text('packages/design-tokens/src/tokens-0.4.0.json'));
  const next = JSON.parse(text('packages/design-tokens/src/tokens-0.5.0.json'));
  assert.deepEqual([next.version, next.supersedes, next.status], ['0.5.0', '0.4.0', 'proposal_for_evaluation']);
  for (const id of CREW_ORDER) {
    assert.deepEqual(next.color.crew[id], { field: CREW[id].field, accent: CREW[id].accent, skin: CREW[id].skin }, id);
    assert.deepEqual(next.color.crewHairByCharacter[id], { hair: CREW[id].hair, hairLight: CREW[id].hairLight }, id);
  }
  assert.deepEqual(next.color.crewSuit, { ...SUIT });
  // Every 0.4.0 leaf is in 0.5.0 with the same shape, and a changed value is listed with its reason.
  const changed = new Set(next.revisedFrom040.map(r => r.path));
  const walk = (a, b, path) => {
    if (path === 'revisedFrom030') return;
    if (a && typeof a === 'object') {
      assert.equal(typeof b, 'object', path);
      assert.equal(Array.isArray(a), Array.isArray(b), path);
      for (const key of Object.keys(a)) walk(a[key], b?.[key], path ? `${path}.${key}` : key);
      return;
    }
    if (['version', 'supersedes', 'compatibility'].includes(path)) return;
    if (a !== b) assert.ok(changed.has(path) || [...changed].some(p => path.startsWith(`${p}.`)), `${path} changed without a reason`);
  };
  walk(previous, next, '');
  for (const r of next.revisedFrom040) assert.ok(r.because.length > 20, r.path);
  assert.match(text('packages/design-tokens/src/index.ts'), /tokens-0\.4\.0\.json/);
});

test('the review renders are recorded: each file\'s hash, and each preview exactly 360 frames at 30 fps', () => {
  const record = JSON.parse(text('design/crew-drawing/review/renders.json'));
  const files = Object.keys(record.outputs).sort();
  assert.deepEqual(files, ['compare.png', 'preview-full-poster.png', 'preview-full.mp4', 'preview-reduced-poster.png', 'preview-reduced.mp4'].map(f => `design/crew-drawing/review/${f}`));
  for (const file of files) {
    const bytes = read(file);
    assert.equal(sha(bytes), record.outputs[file].sha256, file);
    assert.equal(bytes.length, record.outputs[file].bytes, file);
  }
  for (const [name, reducedMotion] of [['preview-full.mp4', false], ['preview-reduced.mp4', true]]) {
    const video = record.outputs[`design/crew-drawing/review/${name}`];
    assert.deepEqual([video.frames, video.fps, video.durationMs, video.reducedMotion], [360, 30, 12000, reducedMotion], name);
  }
  assert.ok(record.desktopTimings?.msPerFrame, 'the desktop timings');
});
