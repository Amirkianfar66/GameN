// The board's name tags (design/phone-ui/components/board-tags): a runtime source the game imports as it is, so its
// module graph, its styles' scope, its words, its inputs and its rules (layoutTags() is pure) are checked here; its
// drawing, its privacy and its agreement with sheet 26 in a browser under the production headers by
// design/tools/board-tags-check.mjs, whose record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOARD_TAGS_DEFAULTS, BOARD_TAGS_VERSION, TAG_RULES, TAG_WORDS, checkBoardTags, layoutTags, seatNumber } from '../../../design/phone-ui/components/board-tags/board-tags.mjs';
import { BOARD_STATES, CAPTURES, PACK_FRAMES } from '../../../design/phone-ui/components/board-tags/preview/states.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/board-tags';
const read = path => readFileSync(join(REPO, path), 'utf8');
const sha256 = path => createHash('sha256').update(readFileSync(join(REPO, path))).digest('hex');

/** The static imports of a module, resolved: relative ones to files, the rest as package names. */
function graph(entry) {
  const seen = new Map();
  const visit = file => {
    if (seen.has(file)) return;
    const source = readFileSync(file, 'utf8');
    const specifiers = [...source.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+'([^']+)'|^\s*import\s+'([^']+)'|@import\s+(?:url\()?['"]([^'"]+)['"]/gm)].map(m => m[1] ?? m[2] ?? m[3]);
    seen.set(file, specifiers);
    for (const s of specifiers) if (s.startsWith('.')) visit(resolve(dirname(file), s));
  };
  visit(entry);
  return seen;
}

test('the component is a runtime source: a small graph, nothing development-only, marked previews', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'board-tags.mjs')), ...graph(join(REPO, COMPONENT, 'board-tags.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f)).sort();
  assert.deepEqual(local, ['design/phone-ui/components/board-tags/board-tags.css', 'design/phone-ui/components/board-tags/board-tags.mjs', 'design/phone-ui/components/icons.mjs', 'design/phone-ui/components/kit/kit.css']);
  assert.deepEqual([...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))], [], 'no package import');
  for (const path of local) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs', 'preview/states.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/board-tags-check.mjs'), /^\/\/ mothership:dev-only/);
  assert.equal(BOARD_TAGS_VERSION, 'board-tags-0.1.0');
});

test('its styles reach nothing outside the layer, the type is 11 px at every text size, and the layer takes no taps', () => {
  const css = read(`${COMPONENT}/board-tags.css`).replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]+;/g, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ selectors: m[1].trim(), body: m[2] }));
  assert.ok(rules.length > 10);
  for (const { selectors } of rules) for (const s of selectors.split(',')) assert.match(s.trim(), /^\.ms-board-tags(?:\s|$|\[|\.)/, `${s.trim()}: under the layer`);
  const layer = rules.find(r => r.selectors === '.ms-board-tags').body;
  assert.match(layer, /z-index: var\(--ms-board-tags-z, 3150\)/, 'over the room scene\'s rings (3100) by default; Frontend sets it over Board V2\'s');
  assert.match(layer, /pointer-events: none/);
  // Fixed px type (the Lead's Q1), never rem: the tag, its number and its status.
  for (const r of rules.filter(r => /font:/.test(r.body))) assert.match(r.body, /font: \d+ 11px\/1 /, `${r.selectors}: 11 px`);
  assert.doesNotMatch(css, /\d+(?:\.\d+)?rem/, 'nothing grows with the text size');
  assert.doesNotMatch(css, /transition|animation/, 'tags never animate');
});

test('the words are the pack\'s (art.mjs paintRoom)', () => {
  assert.deepEqual(TAG_WORDS, { you: 'You', injured: '· Injured', out: '· Out', captain: 'Captain', officer: 'Officer' });
  const art = read('design/phone-ui/prototype/art.mjs');
  for (const w of ['· Injured', '· Out', "'You'"]) assert.ok(art.includes(w), `${w} is the pack's`);
});

test('inputs: every key, seat, place, health, office, status, size and box is checked; seats come back as numbers', () => {
  const person = { seat: 'seat-4', name: 'Dev', health: 'Healthy', office: null, at: { x: 90, bottom: 150 } };
  const base = { size: { width: 176, height: 186 }, people: [person] };
  const bad = [
    { ...base, colour: 'red' }, { ...base, people: [person, { ...person }] }, { ...base, people: [{ ...person, seat: 0 }] }, { ...base, people: [{ ...person, at: { x: 1 } }] },
    { ...base, people: [{ ...person, health: 'Asleep' }] }, { ...base, people: [{ ...person, office: 'admiral' }] }, { ...base, people: [{ ...person, name: ' ' }] },
    { ...base, people: [{ ...person, colour: 1 }] }, { ...base, status: 'asleep' }, { people: [] }, { ...base, size: { width: 0, height: 10 } },
    { ...base, keepClear: [{ left: 0, top: 0, width: -1, height: 2 }] }, { ...base, dim: ['seat-10'] }, { ...base, viewer: 'Dev' }, { ...base, versions: 'v1' },
  ];
  for (const input of bad) assert.throws(() => checkBoardTags(input), TypeError, JSON.stringify(input).slice(0, 80));
  const ok = checkBoardTags({ ...base, viewer: 'seat-4', active: 4, dim: ['seat-7', 7, 'seat-2'] });
  assert.equal(ok.people[0].seat, 4);
  assert.equal(ok.viewer, 4);
  assert.deepEqual(ok.dim, [2, 7]);
  assert.deepEqual(checkBoardTags(ok), ok, 'a checked input checks to itself');
  assert.deepEqual(Object.keys(BOARD_TAGS_DEFAULTS), ['status', 'versions', 'size', 'keepClear', 'people', 'active', 'viewer', 'dim']);
  assert.equal(seatNumber('seat-9'), 9);
  assert.throws(() => seatNumber('seat-10'), TypeError);
});

test('layoutTags(): where sheet 26 puts a tag, inside, clear of a box, up before down, and "You" gives way first', () => {
  const panel = { width: 176, height: 186 };
  const tag = (seat, x, bottom, extra = {}) => ({ seat, at: { x, bottom }, width: 60, height: 22, self: false, ...extra });
  const place = (r, seat) => r.places.find(p => p.seat === seat);
  assert.deepEqual(place(layoutTags({ panel, tags: [tag(1, 88, 120)] }), 1), { seat: 1, left: 58, top: 114 }, 'centred on the press point, 6 px above the foot');
  assert.equal(place(layoutTags({ panel, tags: [tag(1, 88, 186)] }), 1).top, panel.height - TAG_RULES.footClear, 'no lower than the pack\'s floor');
  const edge = layoutTags({ panel, tags: [tag(1, 2, 120), tag(2, 175, 60)] });
  assert.equal(place(edge, 1).left, TAG_RULES.pad);
  assert.equal(place(edge, 2).left, panel.width - TAG_RULES.pad - 60);
  assert.equal(place(layoutTags({ panel, keepClear: [{ left: 0, top: 0, width: 176, height: 40 }], tags: [tag(1, 88, 40)] }), 1).top, 40, 'clear of the caption');
  const back = layoutTags({ panel, tags: [tag(1, 88, 120), tag(2, 92, 110)] });
  assert.equal(place(back, 1).top, 114, 'the one in front keeps its place');
  assert.equal(place(back, 2).top, 114 - 22 - TAG_RULES.gap, 'the one further back moves up, no further than it needs');
  const you = layoutTags({ panel, tags: [tag(1, 88, 120, { self: true }), tag(2, 92, 110)] });
  assert.equal(place(you, 2).top, 104, 'the other keeps its place');
  assert.equal(place(you, 1).top, 80, '"You" gives way, up, though down would be nearer');
  // Only down is left: the caption is in the way above.
  const down = layoutTags({ panel, keepClear: [{ left: 0, top: 0, width: 176, height: 40 }], tags: [tag(1, 88, 60), tag(2, 92, 50)] });
  assert.equal(place(down, 2).top, place(down, 1).top + 22 + TAG_RULES.gap);
  assert.ok(back.apart && you.apart && down.apart && back.inside);
  // Deterministic: the same people in any order.
  const crowd = [tag(1, 40, 150), tag(2, 60, 150), tag(3, 80, 140), tag(4, 100, 150, { self: true }), tag(5, 120, 130)];
  const one = layoutTags({ panel, tags: crowd });
  assert.deepEqual(layoutTags({ panel, tags: [...crowd].reverse() }), one);
  assert.deepEqual(layoutTags({ panel, tags: [crowd[2], crowd[4], crowd[0], crowd[3], crowd[1]] }), one);
  assert.ok(one.apart && one.inside);
  // Too many for the panel: said, not hidden.
  assert.equal(layoutTags({ panel: { width: 70, height: 60 }, tags: [tag(1, 35, 50), tag(2, 35, 50), tag(3, 35, 50)] }).apart, false);
});

test('the preview\'s states: the Lead\'s sizes (Q2), the worst rooms, and sheet 26\'s frames', () => {
  for (const c of CAPTURES) assert.ok(BOARD_STATES[c.state], c.state);
  const at = size => [...new Set(CAPTURES.filter(c => c.size === size).map(c => c.text))].sort();
  assert.deepEqual(at('390x844'), [100, 150, 200]);
  assert.deepEqual(at('430x932'), [100, 150, 200]);
  assert.deepEqual(at('320x568'), [100], '320 × 568 at Standard only');
  const crowd = BOARD_STATES['crowd-hj'].scene.seats;
  assert.equal(crowd.filter(s => s.location === 'Hospital').length, 4);
  assert.equal(crowd.filter(s => s.location === 'Jail').length, 5);
  assert.equal(BOARD_STATES['crowd-ab'].scene.seats.filter(s => s.location === 'Room A').length, 5);
  assert.ok(crowd.some(s => s.name.length === 12), 'a twelve-character name');
  assert.deepEqual(PACK_FRAMES.map(f => BOARD_STATES[f.state].frame ?? null).filter(Boolean), ['board', 'board&state=move', 'board&state=targets', 'board', 'board']);
});

test('the check\'s record: every capture, the probe and the agreement passed, on clean committed source, under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/board-tags-check.mjs');
  assert.equal(record.sourceClean, true, 'recorded from committed source');
  assert.match(record.sourceCommit, /^[0-9a-f]{40}$/);
  assert.equal(record.headersSha256, '424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb', 'the production headers, as the other components\' checks');
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, CAPTURES.length);
  for (const [key, c] of captures) {
    assert.ok(c.ok, `${key} passed`);
    assert.equal(c.sha256, sha256(c.file), `${key}: the committed capture is the recorded one`);
    if (!key.endsWith('/concealed')) assert.ok(c.inside && c.apart && c.cut.length === 0 && !c.ellipsis, `${key}: whole and apart`);
  }
  assert.deepEqual(record.captures['390x844@100/concealed'].leaked, []);
  assert.ok(record.probe.full.ok);
  assert.deepEqual(record.probe.full.checks.map(c => c.id), ['whole', 'apart', 'deterministic', 'still', 'layer', 'privacy', 'inputs', 'kept', 'rules', 'dispose']);
  assert.ok(record.agree.ok);
  assert.equal(record.agree.checks.length, PACK_FRAMES.length);
  for (const c of record.agree.checks) assert.deepEqual(c.detail.differences, [], `${c.id}: no difference from the pack`);
});
