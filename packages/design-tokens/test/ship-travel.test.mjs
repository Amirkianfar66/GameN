// The ship travel component (design/phone-ui/components/ship-travel): a runtime source the game imports as it is,
// so its module graph, its styles' scope, the port of the approved transit's drawing, its inputs, its time and its
// privacy are checked here; its drawing, lifecycle and agreement with the approved poster in a browser under the
// production headers by design/tools/ship-travel-check.mjs, whose record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as art from '../../../design/phone-ui/components/ship-travel/ship-art.mjs';
import {
  CAPTIONS, LABELS, REDUCED_FADE_MS, SHIP_TRAVEL_DEFAULTS, SHIP_TRAVEL_VERSION, STILL, TRAVEL_BEATS,
  frontMarkup, nextShipTravelInput, shipMarkup, shipTravelFraming, shipTravelFrame, starDepths, streakMarkup, travelBeats,
} from '../../../design/phone-ui/components/ship-travel/ship-travel.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/ship-travel';
const read = path => readFileSync(join(REPO, path), 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');

/** The static imports of a module, resolved: relative ones to files, the rest as package names. */
function graph(entry) {
  const seen = new Map();
  const visit = file => {
    if (seen.has(file)) return;
    const source = readFileSync(file, 'utf8');
    const specifiers = [...source.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+'([^']+)'|^\s*import\s+'([^']+)'|@import url\("([^"]+)"\)/gm)].map(m => m[1] ?? m[2] ?? m[3]);
    seen.set(file, specifiers);
    for (const s of specifiers) if (s.startsWith('.')) visit(resolve(dirname(file), s));
  };
  visit(entry);
  return seen;
}

/**
 * The SHA-256 of each ported function's text, as it is in its source on claude/designer-library-navigation at
 * 6b63560d (the same blobs as PR #184's approved head 0fb17a35): Function.prototype.toString() of the source's own
 * function. The port must be that text, character for character.
 */
const SOURCE_TEXT = Object.freeze({
  shipSvg: '9a226eeca721a0a118e2c8ba45b08fcbdcae218a590e66a729967ef753bcdc2d',
  stars: 'c99cce580505bec256e83a8448fbb4157364f99354addd6652e0672079818001',
  streaks: '8c62258de9b9c1d7fffa2097d454623d65d0afbc7c8c2b927d10a77e8a81aa8f',
  vignette: '5d43f9c78aa0476b9f1e8d1876a7b6a919bae49045bf6c53bbd3762b4c1f6d37',
  letterbox: 'b5e4a3e33ea148c530c780c499929529e4244b793e0e5af292f1ea00684409e2',
  fxDefs: '57a6ca4c632d5093fb16963848fd535e58ceedde68cfb32332273c0c3123b237',
  hash: '9e39321fb75c4170f88bcb6bfd941519264a795a9e231b8df080597631514eec',
  rand: '2c903d93221209bd8c3519a9b73183f7d9fbd0c3e8adb188cefd2c026e51b23c',
  clamp01: '39ace354bbde55d922bcb85227cb6f7de98971fc017197281cf8af71590c0f34',
  lerp: '4a9e61297826dd568caf927b3eb606794141179019ff2ce90f3d89f0aa9777f7',
  easeOutCubic: '9fbdab0efe4efb5a35a439822557bc54b9f87055209f7896f99745a38aa2b5cb',
  filmEnd: '89e485df7b048b263d4d75b8543a494000c67c43d2b9ede967bde407191df928',
  kindOf: '4fb9f87d956df8c5e68c395a2ffb73d2b6cb302304e1865f5b1f1e42be0a6f5b',
  ship: '1d8ab79f0f74d921af4091a7a6b00df217c17b18281c1149105377093ee977dc',
  transitX: 'c61501d069fb277a1feae5f53df99971e0334f3e7af40910e585610102a5f9fa',
  transitContent: 'a2c6416fb40bc72fe8b73a7467e7481c0ee9bc8daf65b5dca17242745c6eafba',
  transitInsert: 'f2d28bb21d2399d3c6ddc22954657c5f80721960d2114341631aee83e2708721',
});
/** The SHA-256 of the source's transitInsert(1200, { width: 1920, height: 1080, variant: 'full' }).svg: the approved poster's frame. */
const POSTER_FRAME = '87c3de084c40dd70dab8a8d0a0b617623db699ee04f5ce62f0152104a0a9dd74';
const POSTER_FILE = 'apps/game/candidates/planet-library/transit.poster.webp';

test('the component is a runtime source: its whole graph is runtime-safe and in the hosted graph', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'ship-travel.mjs')), ...graph(join(REPO, COMPONENT, 'ship-travel.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/ship-travel.mjs`, `${COMPONENT}/ship-travel.css`, `${COMPONENT}/ship-art.mjs`, 'design/phone-ui/components/kit/kit.mjs',
    'design/phone-ui/components/kit/kit.css', 'design/phone-ui/components/icons.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  assert.ok(!local.some(p => /\/(?:room-scene|phone-shell)\//.test(p)), 'the film depends on neither the room scene nor the shell: Frontend mounts it in the shell\'s stage');
  // It loads no picture or video: everything it draws is drawn from code.
  for (const path of [`${COMPONENT}/ship-travel.mjs`, `${COMPONENT}/ship-art.mjs`, `${COMPONENT}/ship-travel.css`]) {
    const code = read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/@import url\("\.\.\/kit\/kit\.css"\);/, '');
    assert.doesNotMatch(code, /\.(?:webp|png|jpe?g|gif|mp4|webm)\b|url\((?!#|\$\{)/, `${path}: no picture or video is loaded`);
  }
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/compare.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/ship-travel-check.mjs'), /^\/\/ mothership:dev-only/);
});

test('its styles reach nothing outside the film: every rule is scoped under .ms-ship-travel, the kit imported first', () => {
  const raw = read(`${COMPONENT}/ship-travel.css`);
  assert.match(raw, /^@import url\("\.\.\/kit\/kit\.css"\);/, 'the kit\'s styles first');
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]+;/g, '');
  const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]);
  assert.deepEqual(keyframes, ['ms-st-fade'], 'one keyframes, its own');
  const body = css.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const selectors = [...body.matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(s => s && !s.startsWith('@'));
  assert.ok(selectors.length >= 8, `found the rules (${selectors.length})`);
  const split = list => {
    const out = [''];
    let depth = 0;
    for (const ch of list) {
      if (ch === '(') depth += 1;
      if (ch === ')') depth -= 1;
      if (ch === ',' && depth === 0) out.push(''); else out[out.length - 1] += ch;
    }
    return out.map(s => s.trim());
  };
  for (const list of selectors) {
    for (const selector of split(list)) {
      assert.match(selector, /^\.ms-ship-travel(?:[\s.:\[]|$)/, `"${selector}" is scoped`);
      assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
      assert.doesNotMatch(selector, /^\.ms-ship-travel(?:\[[^\]]*\])?\s+(?::is\()?(?:button|div|span|b|p|svg|g|path|circle)\b/, `"${selector}": no bare element`);
      if (/\.ms-k-/.test(selector)) assert.match(selector, /\.ms-st-[\w-]+[^,]*\.ms-k-/, `"${selector}": a kit part styled only inside the film's own parts`);
    }
  }
  const declared = [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))];
  assert.deepEqual(declared.filter(p => !p.startsWith('--ms-st-')), [], 'custom properties are the film\'s own; no --ms-k- is redeclared');
  // Reduce motion is the one fade.
  assert.match(css, /\[data-fade\]\s*\{\s*animation:\s*ms-st-fade 80ms linear both;\s*\}/);
  assert.equal(REDUCED_FADE_MS, 80);
});

test('the port is the approved transit\'s drawing, character for character, and draws the approved poster\'s frame byte for byte', () => {
  for (const [name, digest] of Object.entries(SOURCE_TEXT)) {
    assert.equal(typeof art[name], 'function', `${name} is ported`);
    assert.equal(sha256(art[name].toString()), digest, `${name}: its source's text`);
  }
  assert.equal(art.f.toString(), 'v => Number((+v).toFixed(2))');
  assert.deepEqual(art.SHIP, { w: 620, h: 210, nose: [606, 112], exhaust: [28, 118] });
  assert.equal(art.VOID.space, '#05060C');
  assert.deepEqual([art.INK, art.PAPER], ['#151923', '#F4EBDD']);
  assert.deepEqual(art.FILM.transit, { display: 2400, phone: 1800, insert: 2400, open: 240, reduced: 1200, fade: 160 });
  // The poster's frame: the runtime insert at 1200 ms of its 2400, full, 1920 × 1080.
  assert.deepEqual(art.TRANSIT_POSTER, { t: 1200, width: 1920, height: 1080, variant: 'full', sha256: 'cd2ee84274ed955176005b4ed0bb44c353e26cf3f5585b5ff1ce515c8903daa2' });
  assert.equal(sha256(art.transitInsert(art.TRANSIT_POSTER.t, art.TRANSIT_POSTER).svg), POSTER_FRAME);
  // The approved poster is the file Integration approved.
  const approval = JSON.parse(read('docs/integration/planet-library-art-approval-2026-11-06.json'));
  const entry = approval.approvedFiles.find(e => e.consumerCandidate === POSTER_FILE);
  assert.equal(entry?.sha256, art.TRANSIT_POSTER.sha256);
  assert.equal(sha256(readFileSync(join(REPO, POSTER_FILE))), art.TRANSIT_POSTER.sha256);
  // Its header names the source, the commit and the approval, and nothing of the arrival is ported.
  const header = read(`${COMPONENT}/ship-art.mjs`).split('\n// ── ')[0];
  for (const words of ['design/cinematic/pilots/blackhole/art.mjs', 'shipSvg', '6b63560d990c50dd1d16e44e6f40f5b7b77b6b68', '0fb17a35c4b2fdd3418c9ffb575dbd4a7d0d9878',
    'docs/integration/planet-library-art-approval-2026-11-06.json', 'Integration reviews this file']) {
    assert.ok(header.includes(words), `the header names ${words}`);
  }
  assert.ok(!('PLANETS' in art) && !('planetSvg' in art) && !('arrivalSvg' in art), 'no planet and no arrival');
});

test('the film\'s still is the poster\'s frame, layer by layer: transitContent() at 1200 ms', () => {
  const frame = art.transitInsert(1200).svg;
  const content = art.transitContent('nti', 1200, { x: 0, y: 0, w: 1920, h: 1080, end: 2400, shipRatio: 0.24 });
  assert.ok(frame.includes(content), 'the insert draws transitContent()');
  const circles = s => (s.replace(/<defs>[\s\S]*?<\/defs>/g, '').match(/<circle[^>]*\/>/g) ?? []);
  const shipAt = content.indexOf('<g opacity="1" transform="translate(960 532.59)');
  assert.ok(shipAt > 0, 'the ship rests at the middle of the pass');
  assert.deepEqual(circles(starDepths().join('')).sort(), circles(content.slice(0, shipAt)).sort(), 'every star, exactly as drawn, in its depth');
  assert.ok(content.includes(streakMarkup(STILL)), 'the streaks, exactly');
  assert.equal(content.slice(shipAt), shipMarkup('nti', 1), 'the ship, exactly');
  assert.ok(frame.includes(frontMarkup('nti').slice(art.fxDefs('nti').length)), 'the vignette, grain and letterbox, exactly');
  assert.ok(frame.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080" data-film="navigation-transit-insert">${art.fxDefs('nti')}`));
  assert.deepEqual([STILL.beat, STILL.tau, STILL.x, STILL.engine, STILL.open], ['still', 1200, art.transitX(0.5, 1920), 1, 1]);
  assert.ok(STILL.drift.every(d => d === 0), 'every depth where the poster has it');
});

test('time: the beats, the world\'s clock anchored on the poster, and a window of any length', () => {
  assert.deepEqual(TRAVEL_BEATS, { open: 200, enter: 1200, settle: 1200 });
  assert.deepEqual(travelBeats(15000), { duration: 15000, enter: 1200, settle: 1200, cruise: 12600, settleAt: 13800 });
  assert.deepEqual(travelBeats(2000), { duration: 2000, enter: 1000, settle: 1000, cruise: 0, settleAt: 1000 }, 'shorter than 2.4 s: both scale to fit');
  assert.deepEqual(travelBeats(20000), { duration: 20000, enter: 1200, settle: 1200, cruise: 17600, settleAt: 18800 }, 'longer: the cruise fills it');
  const beats = [[0, 'enter'], [1199, 'enter'], [1200, 'cruise'], [13799, 'cruise'], [13800, 'settle'], [14999, 'settle'], [15000, 'still']];
  for (const [t, beat] of beats) assert.equal(shipTravelFrame(t).beat, beat, `${t} ms: ${beat}`);
  assert.equal(shipTravelFrame(-300).t, 0, 'clamped to the window');
  assert.equal(shipTravelFrame(99999).t, 15000, 'clamped to the window');
  assert.equal(shipTravelFrame(0).open, 0, 'the space opens from nothing');
  assert.equal(shipTravelFrame(TRAVEL_BEATS.open).open, 1);
  assert.ok(shipTravelFrame(0).x < -500, 'the ship comes in from beyond the left edge');
  assert.equal(shipTravelFrame(1200).x, STILL.x, 'and rests where the poster has it');
  // Continuous: no jump anywhere, for windows of three lengths; the world's clock never runs backwards.
  for (const duration of [15000, 2000, 20000]) {
    let last = shipTravelFrame(0, duration);
    for (let t = 10; t <= duration; t += 10) {
      const next = shipTravelFrame(t, duration);
      assert.ok(next.tau >= last.tau && next.tau - last.tau <= 10.0001, `${duration}: the world's clock at ${t}`);
      assert.ok(Math.abs(next.x - last.x) <= 50 && Math.abs(next.y - last.y) <= 1, `${duration}: the ship at ${t}`);
      last = next;
    }
    assert.equal(last.tau, 1200, `${duration}: ends on the poster's 1200 ms`);
  }
  // Pure: the same moment is the same frame, on every phone.
  assert.deepEqual(shipTravelFrame(7321), shipTravelFrame(7321));
});

test('framing: the poster covers the whole phone, as the pack draws it, and the film\'s host is its part between the bars', () => {
  const whole = shipTravelFraming({ width: 390, height: 844 });
  assert.equal(whole.k, 844 / 1080);
  const stage = shipTravelFraming({ width: 390, height: 711 }, { top: 99, bottom: 34 });
  assert.equal(stage.k, whole.k, 'the same scale as the whole phone');
  assert.ok(Math.abs(stage.viewBox[0] - whole.viewBox[0]) < 1e-9, 'the same horizontal crop');
  assert.ok(Math.abs(stage.viewBox[1] - (whole.viewBox[1] + 99 / whole.k)) < 1e-9, 'the host begins below the top bar');
  const wide = shipTravelFraming({ width: 1920, height: 1080 });
  assert.equal(wide.k, 1);
  assert.deepEqual(wide.viewBox.map(v => v + 0), [0, 0, 1920, 1080], 'at its own size, the poster as it is');
});

test('inputs: public only, checked, and anything unknown refused, a course\'s above all', () => {
  assert.deepEqual(Object.keys(SHIP_TRAVEL_DEFAULTS), ['window', 'clock', 'state', 'size', 'insets', 'caption', 'status', 'reducedMotion']);
  const ok = nextShipTravelInput(SHIP_TRAVEL_DEFAULTS, { window: { id: 'p1', startedAt: 1000, endsAt: 16000 }, clock: { now: () => 0 }, state: 'moved' });
  assert.equal(ok.state, 'moved');
  assert.ok(Object.isFrozen(ok));
  for (const key of ['direction', 'position', 'route', 'arm', 'tie', 'offices', 'captain', 'officer', 'weights', 'choice', 'destination', 'arrivedAt', 'privateNavigation', 'skip']) {
    assert.throws(() => nextShipTravelInput(SHIP_TRAVEL_DEFAULTS, { [key]: 'x' }), TypeError, `"${key}" is refused`);
  }
  const refused = [
    { window: { id: 'p1', startedAt: 1, endsAt: 2, direction: 'Blue' } }, { window: { id: 'p1', startedAt: 5, endsAt: 1 } }, { window: { startedAt: 1, endsAt: 2 } },
    { window: 'p1' }, { clock: Date.now }, { state: 'arrived' }, { status: 'hidden' }, { size: { width: 0, height: 10 } }, { size: { width: 1, height: 1, depth: 1 } },
    { insets: { top: -1, bottom: 0 } }, { insets: { top: 0, bottom: 0, left: 0 } }, { caption: 'yes' }, { reducedMotion: 1 },
  ];
  for (const changes of refused) assert.throws(() => nextShipTravelInput(SHIP_TRAVEL_DEFAULTS, changes), TypeError, JSON.stringify(changes));
  assert.throws(() => nextShipTravelInput(SHIP_TRAVEL_DEFAULTS, null), TypeError);
});

test('privacy and words: nothing it draws or says names a course, a side or an office; sheet 41\'s captions', () => {
  assert.deepEqual(CAPTIONS, { setting: 'Same 15 seconds every round', moved: 'One step on the route · destination hidden' });
  assert.deepEqual(LABELS, { setting: 'The ship is travelling. Destination hidden.', moved: 'The ship moved one step. Destination hidden.', concealed: 'Hidden' });
  const drawn = [0, 600, 4000, 14400, 15000].map(t => starDepths().join('') + streakMarkup(shipTravelFrame(t)) + shipMarkup('p', shipTravelFrame(t).engine)).join('') + frontMarkup('p');
  // The planets' and the route's hues (films.mjs PLANETS, the pack's routeSvg), and their names.
  for (const hue of ['#8FD0FF', '#2F6FD6', '#0B1F4A', '#A8E4FF', '#D6ECFF', '#2C9C8A', '#FFB07A', '#C8452B', '#3A0E0A', '#FFC08A', '#FFE2C4', '#8E2A1A', '#2979FF', '#E8423F', '#2B4C80', '#7A2E2C']) {
    assert.ok(!drawn.toUpperCase().includes(hue), `no ${hue}`);
  }
  assert.doesNotMatch(drawn, /planet|Blue|Red|Junction|Start|Captain|Officer/i);
  assert.equal(SHIP_TRAVEL_VERSION, 'ship-travel-0.1.0');
});

test('the check\'s record: every capture, probe check and comparison passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/ship-travel-check.mjs');
  assert.equal(record.version, SHIP_TRAVEL_VERSION);
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /img-src 'self' data: blob:/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  assert.ok(record.poster.ok && record.poster.sha256 === record.poster.approvedSha256, 'compared with the approved poster');
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 32, 'eight states at two sizes, in full motion and with the device\'s Reduce motion');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
  }
  for (const size of ['390x844', '430x932']) {
    assert.equal(record.captures[`${size}/moved/full`].pill, CAPTIONS.moved, `${size}: moved, sheet 41's caption`);
    assert.ok(record.captures[`${size}/setting/reduced`].frame.still, `${size}: Reduce motion, the still`);
    assert.equal(record.captures[`${size}/concealed/full`].layersShown, 0, `${size}: concealed, nothing drawn`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = new Set(record.probe.full.checks.map(c => c.id.split(':')[0]));
  for (const group of ['time', 'still', 'reduced', 'lifecycle', 'privacy']) assert.ok(groups.has(group), `probe group ${group}`);
  // The still against the approved poster, and the controls a redrawn ship would fail.
  const full = record.compare.full;
  assert.ok(full.ok && full.ship.mean <= full.limits.ship && full.frame.mean <= full.limits.frame, 'the still is the poster');
  for (const control of Object.values(full.controls)) assert.ok(control.mean > full.limits.ship && control.mean >= full.ship.mean * full.limits.controlFactor, 'a control is told apart');
  for (const size of ['390x844', '430x932']) {
    const phone = record.compare.phones[size];
    assert.ok(phone.ok && phone.film.mean <= full.limits.phone && phone.shipBox.mean <= full.limits.ship, `${size}: the film sits where the pack's poster does`);
    assert.ok(existsSync(join(REPO, phone.file)), `${size}: ${phone.file}`);
  }
  assert.ok(record.beats.ok && existsSync(join(REPO, record.beats.file)), 'the beats strip');
});
