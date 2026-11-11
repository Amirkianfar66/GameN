// mothership:dev-only
//
// The pre-game films, redrawn for the owner's "AAA animation" (8 November 2026;
// docs/design/pregame-films.md): the Game N brand intro, the role films (the Doctor's, the pilot)
// and the boarding. These tests hold what the handoff promises:
//   - each film is exactly its length, its beats are the ones the owner has seen, and the last
//     frames of the intro and the boarding are the night alone;
//   - every frame is a pure function of time: drawn twice, it is drawn the same;
//   - reduced motion holds still pictures: nothing changes inside a still;
//   - a role film tells its own player and no neighbour more than the owner chose: every role keeps
//     the same clock, nothing before the title is near a faction's accent, the card on the desk shows
//     the role's mark, the title is in its team's colour (the owner's word), and only the player's
//     own character is drawn in colour;
//   - the boarding takes the public roster alone;
//   - the review renders are exactly their lengths, silent, and match their records;
//   - prototype films remain development-only; only exact reviewed runtime ports may ship.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { prototypeReferences, productionDrawingProblems } from '../../../design/tools/lib/drawing-port-fence.mjs';
import { verifyPregameRuntimePorts } from '../../../scripts/pregame-runtime-ports.mjs';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { BEATS as BRAND_BEATS, BRAND, BRAND_MS, NIGHT, brandSvg } from '../../../design/pregame-films/brand/brand.mjs';
import { CHANGES, PANEL_STARTS, ROLE_MS, STILLS as ROLE_STILLS, roleFrame } from '../../../design/pregame-films/roles/clock.mjs';
import { roleCaptions, rolePageText, roleSvg } from '../../../design/pregame-films/roles/film.mjs';
import { TITLE_COLOURS } from '../../../design/pregame-films/roles/page.mjs';
import { ROLES } from '../../../design/pregame-films/roles/roles.mjs';
import { BOARDING_MS, memberOutside, boardingSvg } from '../../../design/pregame-films/boarding/boarding.mjs';
import { STILL_FADE_MS as BOARDING_FADE_MS, STILL_OUT as BOARDING_OUT, STILLS as BOARDING_STILLS, TITLE } from '../../../design/pregame-films/boarding/clock.mjs';
import { REVIEW_ROSTERS, publicRoster } from '../../../design/pregame-films/boarding/roster.mjs';
import { RENDERS } from '../../../design/pregame-films/renders.mjs';

const root = new URL('../../../', import.meta.url);
const text = path => readFileSync(new URL(path, root), 'utf8');
const PHONE = { width: 390, height: 844 };
const DISPLAY = { width: 1920, height: 1080 };
const lastElement = svg => svg.slice(svg.lastIndexOf('<rect'), svg.lastIndexOf('</svg>'));
/** Well-formed: every element closed in order, under one <svg> root. Returns the root's tag. */
function rootOf(svg) {
  const stack = [];
  let root = null;
  for (const [, close, tag, , self] of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g)) {
    if (close) { assert.equal(stack.pop(), tag, `</${tag}> closes the wrong element`); continue; }
    if (!root) root = tag;
    if (!self) stack.push(tag);
  }
  assert.deepEqual(stack, [], 'an element is left open');
  return root;
}
const colours = svg => [...svg.matchAll(/(?:fill|stroke|stop-color|flood-color|lighting-color)="(#[0-9A-Fa-f]{6})"/g)].map(m => m[1].toUpperCase());

test('each film is exactly its length, on the beats the owner has seen', () => {
  assert.equal(BRAND_MS, 2000);
  assert.equal(ROLE_MS, 10000);
  assert.equal(BOARDING_MS, 10000);
  assert.deepEqual(CHANGES, [3000, 4500, 6000, 7800, 9300]);
  assert.deepEqual(PANEL_STARTS, [3000, 4500, 6000]);
  assert.deepEqual(ROLE_STILLS.map(s => s.at), [0, 3000, 7800]);
  assert.deepEqual(BOARDING_STILLS.map(s => s.at), [0, 2400, 5200, 6900, 8900]);
  assert.deepEqual([BRAND_BEATS.fade[1], BRAND_BEATS.night], [1960, 1960]);
  assert.equal(TITLE.night, 9960);
  assert.deepEqual(BRAND, { name: 'Game N', credit: 'by Plan B', text: 'Game N, by Plan B' });
});

test('the last frames of the intro (black) and the boarding (the game\'s night) are that colour alone', () => {
  for (const size of [PHONE, DISPLAY]) {
    for (const t of [1960, 1983.3, 2000]) assert.equal(lastElement(brandSvg(t, size)), `<rect width="${size.width}" height="${size.height}" fill="${NIGHT}"/>`);
    // The boarding ends on the game's night, the colour its first view opens on.
    for (const t of [9960, 9983.3]) assert.equal(lastElement(boardingSvg(t, { ...size, roster: REVIEW_ROSTERS[9] })), `<rect width="${size.width}" height="${size.height}" fill="#07090F"/>`);
  }
});

test('every frame is a pure function of time, and a well-formed picture', () => {
  const cases = [
    ['brand', t => brandSvg(t, PHONE), [0, 120, 470, 1100, 1700]],
    ['role', t => roleSvg(t, { ...PHONE, role: 'doctor', character: 'c3', seat: 4 }), [400, 1400, 2900, 3700, 6500, 8600]],
    ...Object.keys(ROLES).filter(id => id !== 'doctor').map(id => [`role ${id}`, t => roleSvg(t, { ...PHONE, role: id, character: 'c3', seat: 4 }), [400, 2900, 3700, 5200, 6800, 8600]]),
    ['boarding', t => boardingSvg(t, { ...DISPLAY, roster: REVIEW_ROSTERS[8] }), [500, 3300, 6600, 8000, 9400]],
  ];
  for (const [name, draw, times] of cases) {
    for (const t of times) {
      const a = draw(t), b = draw(t);
      assert.equal(a, b, `${name} at ${t} ms`);
      assert.equal(rootOf(a), 'svg', `${name} at ${t} ms`);
      const ids = [...a.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
      assert.equal(new Set(ids).size, ids.length, `${name} at ${t} ms: an id is used twice`);
      for (const [, ref] of a.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(ref), `${name} at ${t} ms: url(#${ref}) has no definition`);
    }
  }
});

/** The ids an SVG repeats, and the references in it to an id it does not define. */
function idFaults(svg) {
  const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
  const defined = new Set(ids);
  return {
    repeated: [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))],
    dangling: [...svg.matchAll(/(?:url\(#|href="#)([^"')]+)/g)].map(m => m[1]).filter(ref => !defined.has(ref)),
  };
}
/** Times from `from` up to (not including) `to`, every `step` ms: finer than a blink (170 ms). */
const every = (from, to, step = 83) => Array.from({ length: Math.ceil((to - from) / step) }, (_, i) => from + i * step);

test('reduced motion: each still held, the first fading in, crossfades with unique ids (Integration review of 79254cc4)', () => {
  const FADE = 80;
  const HELD_ROLE = { character: 'c3', seat: 4, ...PHONE, variant: 'reduced' };
  for (const id of Object.keys(ROLES)) {
    const draw = t => roleSvg(t, { ...HELD_ROLE, role: id });
    // Each still is one picture from the end of its fade to the next still: sampled finer than a
    // blink, so a figure's live blink would be caught.
    ROLE_STILLS.forEach((still, i) => {
      const end = ROLE_STILLS[i + 1]?.at ?? ROLE_MS;
      const held = draw(still.at + FADE);
      for (const t of every(still.at + FADE, end)) assert.equal(draw(t), held, `${id}: the ${still.still} still changes at ${t} ms`);
    });
    // The first still fades in from the night over its 80 ms.
    assert.notEqual(draw(0), draw(FADE), `${id}: the first still does not fade in`);
    assert.match(draw(0), /<rect width="390" height="844" fill="#07090F"\/><g opacity="0">/, `${id}: the first frame is the night`);
    // Every frame, inside both crossfades and at their edges, defines each id once and resolves
    // every reference.
    for (const t of [0, 40, 79, 80, 2999, 3000, 3020, 3040, 3060, 3079, 3080, 7799, 7800, 7820, 7840, 7860, 7879, 7880, 9999]) {
      const { repeated, dangling } = idFaults(draw(t));
      assert.deepEqual(repeated, [], `${id} at ${t} ms repeats ids`);
      assert.deepEqual(dangling, [], `${id} at ${t} ms refers to missing ids`);
    }
  }
  // The boarding's stills hold too, from the end of each fade-in to the next still or the fade out.
  const board = t => boardingSvg(t, { ...PHONE, roster: REVIEW_ROSTERS[8], variant: 'reduced' });
  BOARDING_STILLS.forEach((still, i) => {
    const end = BOARDING_STILLS[i + 1]?.at ?? BOARDING_OUT[0];
    const held = board(still.at + BOARDING_FADE_MS);
    for (const t of every(still.at + BOARDING_FADE_MS, end)) assert.equal(board(t), held, `the boarding's still at ${still.at} changes at ${t} ms`);
  });
  for (const t of [0, 80, 2400, 2480, 5200, 6900, 8900, 9800]) assert.deepEqual(idFaults(board(t)), { repeated: [], dangling: [] }, `the boarding at ${t} ms`);
});

test('reduced motion holds still pictures: nothing changes inside a still', () => {
  const brand = t => brandSvg(t, { ...PHONE, variant: 'reduced' });
  assert.equal(brand(400), brand(1500));
  const role = t => roleSvg(t, { ...PHONE, role: 'doctor', character: 'c3', seat: 4, variant: 'reduced' });
  for (const id of Object.keys(ROLES)) {
    const still = t => roleSvg(t, { ...PHONE, role: id, character: 'c3', seat: 4, variant: 'reduced' });
    assert.equal(still(500), still(2900), `${id}: the first still`);
    assert.equal(still(3200), still(7700), `${id}: the page`);
    assert.equal(still(8000), still(9900), `${id}: the title`);
  }
  const board = t => boardingSvg(t, { ...PHONE, roster: REVIEW_ROSTERS[7], variant: 'reduced' });
  assert.equal(board(300), board(2300));
  assert.equal(board(7100), board(8800));
  for (const [svg, what] of [[brand(1000), 'brand'], [role(5000), 'role'], [board(4000), 'boarding']]) {
    assert.ok(!svg.includes('mix-blend-mode:screen"><line'), `${what}: sparks in reduced motion`);
  }
});

test('a role film tells its own player, and a neighbour no more than the owner chose', () => {
  // Every role keeps the shared clock: a role carries pictures and words, never times.
  for (const role of Object.values(ROLES)) assert.deepEqual(Object.keys(role).sort(), ['captions', 'gadget', 'id', 'mark', 'name', 'panels', 'team']);
  // A film binds the role, the player's own character and the public seat exactly: no review default.
  assert.throws(() => roleSvg(4000, { ...PHONE, character: 'c3', seat: 4 }), /No role film/);
  assert.throws(() => roleSvg(4000, { ...PHONE, role: 'Doctor', character: 'c3', seat: 4 }), /No role film/);
  assert.throws(() => roleSvg(4000, { ...PHONE, role: 'constructor', character: 'c3', seat: 4 }), /No role film/);
  assert.throws(() => roleSvg(4000, { ...PHONE, role: 'doctor', character: 'constructor', seat: 4 }), /No crew character/);
  assert.throws(() => roleSvg(4000, { ...PHONE, role: 'doctor', seat: 4 }), /No crew character/);
  assert.throws(() => roleSvg(4000, { ...PHONE, role: 'doctor', character: 'c3' }), /No seat/);
  assert.throws(() => roleCaptions(4000, PHONE), /No role film/);
  assert.throws(() => rolePageText(8000), /No role film/);
  // Nothing is coerced, and the seat is a whole number from 1 to 9 (Integration's re-review of 51bc841d).
  const bound = over => roleSvg(4000, { ...PHONE, role: 'doctor', character: 'c3', seat: 4, ...over });
  for (const role of [['doctor'], new String('doctor'), { toString: () => 'doctor' }, Symbol('doctor')]) {
    assert.throws(() => bound({ role }), /No role film for (object|symbol)$/);
    assert.throws(() => roleCaptions(4000, { ...PHONE, role }), /No role film/);
    assert.throws(() => rolePageText(8000, { role }), /No role film/);
  }
  for (const character of [['c3'], new String('c3'), { toString: () => 'c3' }]) assert.throws(() => bound({ character }), /No crew character object$/);
  for (const seat of [0, -1, 10, 100000, 4.5, NaN, Infinity, '4', [4], null]) assert.throws(() => bound({ seat }), /No seat/);
  for (const seat of [1, 9]) assert.match(bound({ seat }), /^<svg /, `seat ${seat} is a table's`);
  // The game's nine roles, and the two Disablers' one film.
  assert.deepEqual(Object.values(ROLES).map(r => r.name).sort(), ['Alien', 'Blue Disabler', 'Doctor', 'Engineer', 'Hacker', 'Insider', 'Red Disabler', 'Supplier', 'Undercover']);
  for (const key of ['mark', 'gadget', 'panels', 'captions']) assert.equal(ROLES['blue-disabler'][key], ROLES['red-disabler'][key], `the Disablers share their ${key}`);
  for (const t of [300, 2400, 3600, 5200, 6800, 7700]) assert.equal(roleSvg(t, { ...PHONE, role: 'blue-disabler', character: 'c2', seat: 5 }), roleSvg(t, { ...PHONE, role: 'red-disabler', character: 'c2', seat: 5 }), `the Disablers' film at ${t} ms`);
  // Colours: none near a faction's accent, in any role's film, but for the title, which the owner
  // asked in the role's team colour.
  for (const [id, r] of Object.entries(ROLES)) {
    const seen = new Set();
    for (const t of [300, 1500, 2400, 3600, 5200, 6800, 8600]) for (const c of colours(roleSvg(t, { ...PHONE, role: id, character: 'c3', seat: 4 }))) seen.add(c);
    seen.delete(TITLE_COLOURS[r.team]);
    for (const c of seen) {
      for (const accent of Object.values(FACTION_ACCENTS)) assert.ok(cie76(c, accent) >= MIN_ACCENT_DISTANCE, `${id}: ${c} is ${cie76(c, accent).toFixed(1)} from ${accent}`);
    }
    // The team's colour is the title's alone: no frame before the title draws it.
    for (const t of [300, 2400, 3600, 5200, 6800]) assert.ok(!colours(roleSvg(t, { ...PHONE, role: id, character: 'c3', seat: 4 })).includes(TITLE_COLOURS[r.team]), `${id} at ${t} ms draws its title colour`);
  }
  const role = ROLES.doctor;
  // The card on the desk shows the role's mark, at the owner's word: the Doctor's, a medical cross,
  // paper on a dark plate; no word, portrait or team.
  const opener = roleSvg(300, { ...PHONE, role: role.id, character: 'c3', seat: 4 });
  assert.match(opener, /<linearGradient id="dc-mark-paper"/);
  assert.doesNotMatch(opener, /bf-card-(c\d|name|team)/, 'the card draws no portrait, name or team line');
  // The title is simple, at the owner's word, in its team's colour: plain blue for the Blue team, plain
  // red for the Red team, purple for the Alien.
  assert.deepEqual(TITLE_COLOURS, { blue: '#2979FF', red: '#E8423F', alien: '#9B5CFF' });
  assert.deepEqual(Object.fromEntries(Object.values(ROLES).map(r => [r.id, r.team])), {
    doctor: 'blue', insider: 'blue', 'blue-disabler': 'blue', supplier: 'blue', engineer: 'blue',
    undercover: 'red', hacker: 'red', 'red-disabler': 'red', alien: 'alien',
  });
  for (const r of Object.values(ROLES)) {
    for (const variant of ['full', 'reduced']) {
      const title = roleSvg(9500, { ...PHONE, role: r.id, character: 'c3', seat: 4, variant });
      assert.ok(title.includes(`stroke="${TITLE_COLOURS[r.team]}"`), `${r.id} (${variant}): the title in the ${r.team} team's colour`);
      for (const other of Object.values(TITLE_COLOURS)) if (other !== TITLE_COLOURS[r.team]) assert.ok(!title.includes(other), `${r.id}: another team's title colour`);
    }
  }
  // Other people are nobody: one flat colour, and a plain head (a crew member's own, in silhouette,
  // could be read as that player). The Doctor's patient is drawn so.
  const aboard = roleSvg(6800, { ...PHONE, role: 'doctor', character: 'c3', seat: 4 });
  assert.match(aboard, /<filter id="dc3-patient-light"[^>]*><feFlood flood-color="#0A1A1A" result="sil"\/>/);
  assert.match(aboard, /<mask id="dc3-patient-nohead"/);
  // The narration is page text: two boxes of few words, the title's name for screen readers.
  for (const r of Object.values(ROLES)) {
    assert.equal(r.captions.length, 2, `${r.id}: two narration boxes`);
    assert.deepEqual(roleCaptions(4000, { ...PHONE, role: r.id }).map(c => c.lines), [r.captions[0]], r.id);
    assert.deepEqual(roleCaptions(5000, { ...PHONE, role: r.id }).map(c => c.lines), r.captions, r.id);
    assert.equal(rolePageText(8000, { role: r.id }), r.name);
    for (const lines of r.captions) assert.ok(lines.length <= 2 && lines.every(line => line.length <= 17), `${r.id}: ${lines.join(' ')}`);
  }
});

test('the boarding takes the public roster alone, places by seat order', () => {
  assert.throws(() => publicRoster([{ seat: 1, character: 'c1' }]), /7, 8 or 9/);
  const roster = [...REVIEW_ROSTERS[8]];
  assert.throws(() => publicRoster([...roster.slice(0, 7), { seat: 8, character: 'c1' }]), /taken once/);
  const leaked = roster.map(m => ({ ...m, role: 'Doctor', faction: 'Blue' }));
  assert.deepEqual(publicRoster(leaked), publicRoster(roster));
  assert.equal(boardingSvg(4000, { ...PHONE, roster: leaked }), boardingSvg(4000, { ...PHONE, roster }));
  // A member's place outside depends on its place in seat order alone, never on its character.
  for (const t of [2500, 3500, 5000]) for (let i = 0; i < 8; i += 1) {
    const a = memberOutside(i, 8, t), b = memberOutside(i, 8, t);
    assert.deepEqual(a, b);
  }
  // Everyone is aboard before the ramp comes up.
  for (const n of [7, 8, 9]) for (let i = 0; i < n; i += 1) assert.equal(memberOutside(i, n, 6150), null, `member ${i} of ${n}`);
});

test('the review renders are exactly their lengths, silent, and match their records', () => {
  const dir = 'design/pregame-films/review/records/';
  if (!existsSync(new URL(dir, root))) return;
  for (const job of RENDERS) {
    const path = `${dir}${job.name}.json`;
    assert.ok(existsSync(new URL(path, root)), `${job.name} has a record`);
    const record = JSON.parse(text(path));
    for (const out of record.outputs) {
      const bytes = readFileSync(new URL(out.file, root));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), out.sha256, out.file);
      if (out.kind !== 'video') continue;
      assert.equal(out.probe.frames, Math.round((job.ms / 1000) * 60), out.file);
      assert.equal(out.probe.streams, 1, `${out.file} has an audio stream`);
      assert.deepEqual([out.probe.width, out.probe.height], [job.width * job.scale, job.height * job.scale]);
    }
  }
});

test('prototype films remain development-only and the game uses only exact reviewed runtime ports', async () => {
  const walk = dir => readdirSync(new URL(dir, root)).flatMap(name => {
    const path = `${dir}${name}`;
    return statSync(new URL(path, root)).isDirectory() ? walk(`${path}/`) : [path];
  });
  const sources = walk('design/pregame-films/').filter(path => /\.m?js$/.test(path));
  assert.ok(sources.length >= 14);
  for (const path of [...sources, 'design/tools/pregame-films-render.mjs']) assert.ok(text(path).startsWith('// mothership:dev-only\n'), path);
  assert.match(text('design/pregame-films/stage.html').split('\n')[1], /^<!-- mothership:dev-only\./);
  const shipped = ['apps/game/src/', 'apps/game/hosted/', 'packages/presentation/src/'].flatMap(walk)
    .filter(path => /\.(?:m?js|ts|tsx|json|html|css|svg)$/.test(path));
  assert.ok(shipped.length > 0);
  for (const path of shipped) {
    const references = prototypeReferences(path, text(path)).filter(problem => problem.includes('pregame-films prototype'));
    assert.deepEqual(references, [], `${path} refers to the pregame prototype`);
  }
  assert.equal(verifyPregameRuntimePorts(fileURLToPath(root)), 22);
  assert.deepEqual(await productionDrawingProblems(fileURLToPath(root)), []);
});
