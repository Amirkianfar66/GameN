// mothership:dev-only
//
// The pre-game films, redrawn for the owner's "AAA animation" (8 November 2026;
// docs/design/pregame-films.md): the Game N brand intro, the role films (the Doctor's, the pilot)
// and the boarding. These tests hold what the handoff promises:
//   - each film is exactly its length, its beats are the ones the owner has seen, and the last
//     frames of the intro and the boarding are the night alone;
//   - every frame is a pure function of time: drawn twice, it is drawn the same;
//   - reduced motion holds still pictures: nothing changes inside a still;
//   - a role film tells its own player and no neighbour: every role keeps the same clock, it draws
//     no colour near a faction's accent (no team colour at all), the card on the desk shows the
//     role's mark, the title is one plain blue for every role, and only the player's own character
//     is drawn in colour;
//   - the boarding takes the public roster alone;
//   - the review renders are exactly their lengths, silent, and match their records;
//   - the films are development code that nothing in the game imports.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { BEATS as BRAND_BEATS, BRAND, BRAND_MS, NIGHT, brandSvg } from '../../../design/pregame-films/brand/brand.mjs';
import { CHANGES, PANEL_STARTS, ROLE_MS, STILLS as ROLE_STILLS, roleFrame } from '../../../design/pregame-films/roles/clock.mjs';
import { roleCaptions, rolePageText, roleSvg } from '../../../design/pregame-films/roles/film.mjs';
import { TITLE_BLUE } from '../../../design/pregame-films/roles/page.mjs';
import { ROLES } from '../../../design/pregame-films/roles/roles.mjs';
import { BOARDING_MS, memberOutside, boardingSvg } from '../../../design/pregame-films/boarding/boarding.mjs';
import { STILLS as BOARDING_STILLS, TITLE } from '../../../design/pregame-films/boarding/clock.mjs';
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

test('reduced motion holds still pictures: nothing changes inside a still', () => {
  const brand = t => brandSvg(t, { ...PHONE, variant: 'reduced' });
  assert.equal(brand(400), brand(1500));
  const role = t => roleSvg(t, { ...PHONE, role: 'doctor', character: 'c3', variant: 'reduced' });
  assert.equal(role(500), role(2900));
  assert.equal(role(3200), role(7700));
  assert.equal(role(8000), role(9900));
  const board = t => boardingSvg(t, { ...PHONE, roster: REVIEW_ROSTERS[7], variant: 'reduced' });
  assert.equal(board(300), board(2300));
  assert.equal(board(7100), board(8800));
  for (const [svg, what] of [[brand(1000), 'brand'], [role(5000), 'role'], [board(4000), 'boarding']]) {
    assert.ok(!svg.includes('mix-blend-mode:screen"><line'), `${what}: sparks in reduced motion`);
  }
});

test('a role film tells its own player and no neighbour', () => {
  // Every role keeps the shared clock: a role carries pictures and words, never times.
  for (const role of Object.values(ROLES)) assert.deepEqual(Object.keys(role).sort(), ['captions', 'gadget', 'id', 'mark', 'name', 'panels', 'team']);
  // Colours: none near a faction's accent. No team colour is drawn at all.
  const role = ROLES.doctor;
  const seen = new Set();
  for (const t of [300, 1500, 2400, 3600, 5200, 6800, 8600]) for (const c of colours(roleSvg(t, { ...PHONE, role: role.id, character: 'c3', seat: 4 }))) seen.add(c);
  for (const c of seen) {
    for (const accent of Object.values(FACTION_ACCENTS)) assert.ok(cie76(c, accent) >= MIN_ACCENT_DISTANCE, `${c} is ${cie76(c, accent).toFixed(1)} from ${accent}`);
  }
  // The card on the desk shows the role's mark, at the owner's word: the Doctor's, a medical cross,
  // paper on a dark plate; no word, portrait or team.
  const opener = roleSvg(300, { ...PHONE, role: role.id, character: 'c3', seat: 4 });
  assert.match(opener, /<linearGradient id="dc-mark-paper"/);
  assert.doesNotMatch(opener, /bf-card-(c\d|name|team)/, 'the card draws no portrait, name or team line');
  // The title is simple, at the owner's word: the name in one plain blue, the same for every role and
  // clear of every accent, and no team colour beside it.
  const title = roleSvg(9500, { ...PHONE, role: role.id, character: 'c3', seat: 4 });
  assert.ok(title.includes(`stroke="${TITLE_BLUE}"`), 'the title is drawn in the title blue');
  for (const accent of Object.values(FACTION_ACCENTS)) assert.ok(cie76(TITLE_BLUE, accent) >= MIN_ACCENT_DISTANCE, `the title blue is ${cie76(TITLE_BLUE, accent).toFixed(1)} from ${accent}`);
  assert.equal(roleSvg(9500, { ...PHONE, role: role.id, character: 'c3', seat: 4, variant: 'reduced' }).includes(`stroke="${TITLE_BLUE}"`), true);
  // Other people are silhouettes: the panel aboard draws its patient as one flat colour.
  const aboard = roleSvg(6800, { ...PHONE, role: 'doctor', character: 'c3', seat: 4 });
  assert.match(aboard, /<filter id="dc3-patient-light"[^>]*><feFlood flood-color="#0A1A1A" result="sil"\/>/);
  // The narration is page text: two boxes of few words, the title's name for screen readers.
  assert.deepEqual(roleCaptions(4000, PHONE).map(c => c.lines), [role.captions[0]]);
  assert.deepEqual(roleCaptions(5000, PHONE).map(c => c.lines), role.captions);
  assert.equal(rolePageText(8000), role.name);
  for (const lines of role.captions) assert.ok(lines.every(line => line.length <= 17), lines.join(' '));
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

test('the films are development code: marked dev-only, and nothing in the game refers to them', () => {
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
  for (const path of shipped) assert.ok(!text(path).includes('pregame-films'), `${path} refers to the pre-game films`);
});
