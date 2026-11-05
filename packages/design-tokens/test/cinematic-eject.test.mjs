// mothership:dev-only
//
// The Captain's EJECT as a cinematic display cut (design/cinematic/pilots/eject/;
// docs/design/cinematic/eject-cut.md). These test the cut's own modules: none of them is a rule, a
// server contract or a measurement of a display. They hold the cut to the approved S7 under it
// (design/board-v2/films/captain.mjs), to S7's timing, and to what may be baked into a movie.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FRAME } from '../../../design/board-motion/figures/body.mjs';
import { EJECT_FILM, captainWords, ejectEnd, ejectFrame } from '../../../design/board-v2/films/captain.mjs';
import { captainOutcome } from '../../../design/board-v2/js/captain-fixtures.mjs';
import { CATALOGUE } from '../../../design/cinematic/catalogue/catalogue.mjs';
import { CUES, mix } from '../../../design/cinematic/lib/audio.mjs';
import { castOf, cutSvg, insertSvg } from '../../../design/cinematic/pilots/eject/compose.mjs';
import { AUDIO, INSERT, SETS, SHOTS, STILLS, VARIANTS, cameraView, cutEnd, cutFrame, insertEnd, insertFrame } from '../../../design/cinematic/pilots/eject/film.mjs';
import { PILOTS } from '../../../design/cinematic/pilots/index.mjs';

const step = (end, ms = 40) => Array.from({ length: Math.ceil(end / ms) + 1 }, (_, i) => Math.min(end, i * ms));
const ids = svg => [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const FIGURE = `viewBox="${FRAME.box.join(' ')}"`;
const outcome = captainOutcome('eject', 9);
const cast = castOf(outcome, 9);
const subjects = cast.map(c => ({ body: c.body }));

test('the cut is S7 under a camera: at every moment its frame carries S7\'s own frame, unchanged, and ends when S7 ends', () => {
  for (const variant of VARIANTS) {
    const reduced = variant === 'reduced';
    assert.equal(cutEnd(variant), ejectEnd(reduced));
    for (const t of step(cutEnd(variant) + 200)) assert.deepEqual(cutFrame(t, { reduced, subjects }).s7, ejectFrame(t, { reduced, subjects }), `${variant} ${t}`);
    assert.equal(cutFrame(cutEnd(variant), { reduced, subjects }).done, true);
    assert.equal(cutFrame(-1, { reduced, subjects }).set, null, 'nothing before the outcome\'s presentation start');
  }
  assert.deepEqual(cast.map(c => [c.seat, c.body, c.slot.id]), [[3, false, 'J1'], [4, false, 'J2'], [9, true, 'J5']], 'the review fixture: two living prisoners and a body');
});

test('the shots cover S7 end to end without a gap, cutting only on S7\'s own beats', () => {
  assert.equal(SHOTS[0].from, 0);
  assert.equal(SHOTS.at(-1).to, EJECT_FILM.end);
  for (let i = 1; i < SHOTS.length; i += 1) assert.equal(SHOTS[i].from, SHOTS[i - 1].to, SHOTS[i].id);
  // Each cut sits on a beat of S7: the console inset closes, the iris opens, the exterior comes in, the iris shuts.
  assert.deepEqual(SHOTS.slice(1).map(s => s.from), [EJECT_FILM.insetClose[1], EJECT_FILM.iris[0], EJECT_FILM.exterior.in[0], EJECT_FILM.irisClose[0]]);
  assert.deepEqual(SHOTS.map(s => s.set), ['console', 'wall', 'wall', 'exterior', 'wall']);
});

test('the camera never shows past its set\'s edge and never shakes; the stills never move', () => {
  for (const t of step(cutEnd('full') - 1, 20)) {
    const frame = cutFrame(t, { subjects });
    const set = SETS[frame.set];
    const view = cameraView(frame.camera);
    assert.ok(view.x >= -0.01 && view.y >= -0.01 && view.x + view.w <= set.width + 0.01 && view.y + view.h <= set.height + 0.01, `${t}: ${JSON.stringify(view)} in ${frame.set}`);
    assert.equal(frame.camera.shake, undefined);
  }
  for (const t of step(cutEnd('reduced') - 1, 20)) {
    const frame = cutFrame(t, { reduced: true, subjects });
    assert.deepEqual(frame.camera, { center: [...STILLS[frame.shot].camera.center], k: STILLS[frame.shot].camera.k }, `${t}`);
  }
  for (const t of step(INSERT.end - 1, 20)) {
    const view = cameraView(insertFrame(t).camera);
    assert.ok(view.x >= 0 && view.y >= 0 && view.x + view.w <= SETS.exterior.width && view.y + view.h <= SETS.exterior.height, `insert ${t}`);
  }
});

test('reduced is S7\'s four stills: no suction, debris, silhouette, push or travel, the stills on one camera', () => {
  const seen = new Set();
  for (const t of step(cutEnd('reduced') - 1, 20)) {
    const { svg, frame } = cutSvg(t, { cast, assets: 'A', variant: 'reduced' });
    seen.add(frame.shot);
    assert.equal(frame.s7.suction.opacity, 0);
    assert.equal(frame.s7.debris.opacity, 0);
    assert.ok(!svg.includes('url(#ej-sil)'), `${t}: no silhouette`);
    assert.equal(frame.letterbox, 0.1, 'the bars stand, no slide');
  }
  assert.deepEqual([...seen], [...EJECT_FILM.reduced.stages]);
  const walls = ['open', 'empty', 'memorial'].map(name => JSON.stringify(STILLS[name].camera));
  assert.equal(new Set(walls).size, 1);
});

test('the composition is one 1920 x 1080 SVG with no repeated id and no baked word; the words are page text from S7\'s announce', () => {
  for (const variant of VARIANTS) {
    for (const t of step(cutEnd(variant) - 1, 100)) {
      const { svg, frame, words } = cutSvg(t, { cast, assets: 'A', variant });
      assert.match(svg, /^<svg[^>]+viewBox="0 0 1920 1080"/);
      const list = ids(svg);
      assert.equal(new Set(list).size, list.length, `${variant} ${t}: repeated id`);
      assert.doesNotMatch(svg, /<text\b|<foreignObject\b|EJECT|Used|USED|Player \d|ejected/, `${variant} ${t}: a word in the picture`);
      assert.equal(words.caption, t >= EJECT_FILM.announce || (variant === 'reduced' && frame.s7.announce), `${variant} ${t}: words only from the announce`);
    }
  }
  // The plate's word sits on the plate's label in the close-up, as S7's inset places it.
  const { words } = cutSvg(400, { cast, assets: 'A' });
  assert.equal(words.plate.word, 'EJECT');
  assert.equal(captainWords('EJECT', outcome.seatIds), 'Player 3, Player 4, Player 9: ejected.');
  // The living are drawn by the approved rig; the cut's own frames show them until the air takes them.
  assert.ok(cutSvg(1900, { cast, assets: 'A' }).svg.includes(FIGURE));
  assert.ok(!cutSvg(6000, { cast, assets: 'A' }).svg.includes(FIGURE), 'nobody left in the Jail at the closure');
});

test('the insert is the same for every EJECT: nothing of a person, a word or a count, and it ends', () => {
  assert.equal(insertEnd(), INSERT.end);
  for (const t of step(INSERT.end, 50)) {
    const { svg, frame } = insertSvg(t);
    assert.ok(!svg.includes(FIGURE), `${t}: a figure`);
    assert.doesNotMatch(svg, /<text\b|<foreignObject\b|<image\b/, `${t}`);
    assert.equal(svg, insertSvg(t).svg, 'deterministic');
    if (t >= INSERT.end) assert.equal(frame.done, true);
  }
  assert.ok(Object.keys(PILOTS.eject.surfaces).includes('insert') && Object.keys(PILOTS.eject.surfaces).includes('display'));
});

test('the cue sheets: known cues inside the film, the alarm under 2 Hz, nothing at the memorial, the insert silent', () => {
  for (const [name, sheet] of Object.entries(AUDIO)) {
    for (const entry of sheet) {
      assert.ok(CUES[entry.cue], entry.cue);
      assert.ok(entry.at >= 0 && entry.at < cutEnd(name === 'reduced' ? 'reduced' : 'full'), `${name} ${entry.cue} at ${entry.at}`);
      if (name === 'full') assert.ok(entry.at < EJECT_FILM.plaque[0], `${entry.cue} at the memorial`);
    }
  }
  const blips = AUDIO.full.filter(entry => entry.cue === 'alert-blip').map(entry => entry.at);
  for (let i = 1; i < blips.length; i += 1) assert.ok(blips[i] - blips[i - 1] >= 500, 'under 2 Hz');
  assert.deepEqual(AUDIO.insert, []);
  const samples = mix(AUDIO.full, cutEnd('full') + 400);
  let peak = 0;
  for (const v of samples) { assert.ok(Number.isFinite(v)); peak = Math.max(peak, Math.abs(v)); }
  assert.ok(Math.abs(20 * Math.log10(peak) + 3) < 0.01);
});

test('the motion bible\'s EJECT entry points at the cut, with no gap left', () => {
  const entry = CATALOGUE.find(s => s.id === 'captain-eject');
  assert.deepEqual(entry.gaps, []);
  assert.ok(entry.assets.some(a => a.startsWith('design/cinematic/pilots/eject/')));
});
