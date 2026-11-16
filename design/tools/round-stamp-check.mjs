// mothership:dev-only
//
// The round stamp's check (design/phone-ui/components/round-stamp). It bundles the component's preview the way the
// game bundles the component (Vite: ordinary bundling, no copy), serves the bundle with the hosted game's production
// response headers (scripts/prepare-hosted-preview.mjs: the Content Security Policy of
// scripts/hosted-preview-policy.mjs and the six other headers), and looks, in desktop Chromium at 2× pixels, at the
// two development phone sizes, 390 × 844 and 430 × 932. The stamp sits in the phone shell's cover, with the room
// scene in the shell's stage, as in the game.
//   Captures: the landing held at 30 and 80 ms, the stamp standing, leaving at 1,250 ms, and gone; Reduce motion
//   fading in and standing (the game's) and fading in (the device's); reconnecting at 60 ms; concealed. A capture
//   passes with no policy violation, no failed or refused request and no page error, with the stamp at the size and
//   strength its moment gives it, its centre at the phone's, its words as the pack writes them and the room's crew
//   drawn under it.
//   The strips: the stamp at 0, 30, 80, 120, 600, 1,250 and 1,330 ms and gone, side by side, one picture a size, in
//   full motion and with Reduce motion.
//   Beside the pack: the pinned pack's own "Round 1 begins" frame (design/phone-ui/prototype/index.html?s=room
//   &room=room-a&stamp=round1, served unchanged by phone-ui-render.mjs's reference server) and the phone with the
//   stamp standing, at each size: the same words, the same look property by property, the same box to half a CSS
//   pixel, and the stamp's face compared pixel by pixel, with two controls a stamp drawn a little differently would
//   fail (preview/agree.mjs).
// It then runs, in the same bundle under the same headers, the lifecycle probe (preview/probe.mjs), once as the
// page comes and once with the device's Reduce motion emulated: seeking, a late phone, the run, a long first frame,
// suspend, reconnecting, concealed, a new phase, one animation at most, taps, what assistive technology meets,
// refused inputs, dispose and Reduce motion.
// It writes design/phone-ui/components/round-stamp/review/: one JPEG per capture, the strips, the stamp beside the
// pack a size, and check.json (the headers and their SHA-256, the source commit, what each capture showed and its
// SHA-256, each comparison and each probe check with what it saw). It exits non-zero when any check fails, and says
// which.
//   node design/tools/round-stamp-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone, not
// Safari, not a performance measure. A held moment is the component suspended on a clock that stands there.
// The bundling, the headers and the policy reports are every component check's (lib/component-check.mjs).

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { startServer } from './phone-ui-render.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/round-stamp');
const REVIEW = join(COMPONENT, 'review');
const { ROUND_STAMP_VERSION, ROUND_STAMP_WORDS, roundStampFrame } = await import(pathToFileURL(join(COMPONENT, 'round-stamp.mjs')).href);
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** The pack's review frames' safe areas (design/phone-ui/prototype/app.mjs `safe=47,34`), as the preview gives the shell. */
const SAFE = { top: 47, bottom: 34 };
// The moment of the voyage the captures hold, as the shell's do (2:10).
const AT = 130;
const STRIP = [0, 30, 80, 120, 600, 1250, 1330, null];
const WORDS = ROUND_STAMP_WORDS.round(1).toUpperCase();
/**
 * How close the stamp must be. `curve`: its size and strength against the component's arithmetic, as shares (the
 * browser solves the same curve its own way). `centrePx`, `boxPx`: its centre against the phone's, and its box
 * against the pack's, in CSS px. `face`: the stamp's face against the pack's, as the mean difference in 0–255 levels
 * per channel; each control must be at least `controlFactor` times as far, and past `face`.
 */
export const LIMITS = Object.freeze({ curve: 0.003, centrePx: 0.5, boxPx: 0.5, face: 3, controlFactor: 2 });
/** The captures: what is asked of the page, and the moment of the stamp the phone must show. */
const CAPTURES = {
  'snap-30': { query: 't=30', t: 30 },
  'snap-80': { query: 't=80', t: 80 },
  hold: { query: 't=600', t: 600 },
  'leave-1250': { query: 't=1250', t: 1250 },
  gone: { query: 't=gone', t: null },
  'reduced-in-40': { query: 't=40&motion=reduced', t: 40, reduced: true },
  reduced: { query: 't=600&motion=reduced', t: 600, reduced: true },
  'device-reduced-40': { query: 't=40', t: 40, reduced: true, media: { 'prefers-reduced-motion': 'reduce' } },
  'stale-60': { query: 't=60&status=stale', t: 60, status: 'stale' },
  concealed: { query: 't=600&status=concealed', t: null, status: 'concealed' },
};
const PACK_PAGE = `design/phone-ui/prototype/index.html?s=room&room=room-a&stamp=round1&safe=${SAFE.top},${SAFE.bottom}&chrome=0`;
const PACK_FILES = ['app.mjs', 'screens-game.mjs', 'screens.mjs', 'screens.css', 'kit.css', 'ui.mjs'].map(file => `design/phone-ui/prototype/${file}`);
/** The stamp's look, property by property, as the preview's seen() and the pack's page both give it. */
const LOOK = ['fontSize', 'fontWeight', 'fontFamily', 'letterSpacing', 'lineHeight', 'padding', 'border', 'radius', 'background', 'color', 'shadow', 'tilt', 'textTransform'];
const PACK_READY = `(async () => { await document.fonts.ready; await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))); return true; })()`;
const PACK_SEEN = `(() => {
  const ph = document.querySelector('.ph'), phone = ph.getBoundingClientRect();
  const r2 = v => Math.round(v * 100) / 100;
  const stamp = ph.querySelector('.stamp[data-tone="gold"]'), layer = stamp.parentElement;
  const b = stamp.getBoundingClientRect(), style = getComputedStyle(stamp), ls = getComputedStyle(layer);
  return { phone: { x: r2(phone.left), y: r2(phone.top), w: r2(phone.width), h: r2(phone.height) },
    stamp: { x: r2(b.left - phone.left), y: r2(b.top - phone.top), w: r2(b.width), h: r2(b.height) },
    size: { w: stamp.offsetWidth, h: stamp.offsetHeight },
    words: stamp.innerText, tone: stamp.dataset.tone ?? null,
    look: { fontSize: style.fontSize, fontWeight: style.fontWeight, fontFamily: style.fontFamily, letterSpacing: style.letterSpacing, lineHeight: style.lineHeight, padding: style.padding, border: style.borderTopWidth + ' ' + style.borderTopStyle + ' ' + style.borderTopColor, radius: style.borderTopLeftRadius, background: style.backgroundColor, color: style.color, shadow: style.boxShadow, tilt: style.transform, textTransform: style.textTransform },
    layer: { in: layer.parentElement === ph ? 'the phone' : layer.parentElement.className, position: ls.position, inset: [ls.top, ls.right, ls.bottom, ls.left].join(' '), pointer: ls.pointerEvents, stampPointer: style.pointerEvents },
    bar: ph.querySelector('.tb')?.innerText.replace(/\\s+/g, ' ').trim() ?? null };
})()`;

const near = (a, b, slack) => a !== null && b !== null && Math.abs(a - b) <= slack;
const round3 = v => Math.round(v * 1000) / 1000;
const round2 = v => Math.round(v * 100) / 100;
const problemsOf = page => page.problems().filter(p => !/\/favicon\.ico$/.test(p)); // the browser asks for it by itself; the live site has none
async function open(browser, origin, query, { width, height, media = null, scale = 2 }) {
  const page = await openPage(browser, { width, height, scale });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
  if (media) await page.media(media);
  await page.goto(`${origin}/index.html?${query}`, 'window.__stamp !== undefined');
  await page.evaluate('window.__stamp.ready');
  await sleep(400);
  return page;
}
async function shot(page, { width, height, format = 'jpeg' }) {
  const { data } = await page.send('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality: 82 } : {}), clip: { x: 0, y: 0, width, height, scale: 1 } });
  return Buffer.from(data, 'base64');
}
async function violationsOf(page, out) {
  const violations = await page.evaluate('window.__policy');
  for (const v of violations) v.kind = await classify(out, v);
  return violations;
}
/** The size a computed transform draws at: 1 for none, the matrix's first term otherwise. */
const scaleOf = transform => (transform === null ? null : transform === 'none' ? 1 : Number(/matrix\(([^,]+)/.exec(transform)?.[1] ?? NaN));
/**
 * Whether a phone shows the stamp as its moment gives it: `t` ms of stamp time (null: gone), in a status, with
 * Reduce motion or not (the game's unless `device`). Returns the verdict with what was wanted and what was drawn.
 */
function judge(seen, { t, status = 'live', reduced = false, device = false }, [width, height]) {
  const concealed = status === 'concealed';
  const want = roundStampFrame(t ?? Infinity, { reduced });
  const scale = scaleOf(seen.transform);
  const centre = seen.stamp ? { x: round2(seen.stamp.x + seen.stamp.w / 2), y: round2(seen.stamp.y + seen.stamp.h / 2) } : null;
  let ok = seen.frame !== null && seen.frame.round === 1 && seen.frame.status === status && seen.frame.reduced === reduced && seen.frame.shown === !concealed && !seen.frame.running
    && seen.root !== null && seen.root.ariaHidden === 'true' && seen.root.focusable === 0 && seen.root.status === status && seen.root.motion === (reduced && !device ? 'reduced' : null)
    && seen.status === status && seen.tone === 'gold';
  if (concealed) ok = ok && seen.root.hidden && seen.stamp === null && seen.animations.length === 0 && seen.frame.beat === 'gone';
  else if (want.beat === 'gone') ok = ok && !seen.root.hidden && seen.animations.length === 0 && seen.opacity === 0 && seen.frame.beat === 'gone' && seen.figures > 0;
  else {
    ok = ok && !seen.root.hidden && seen.root.pointer === 'none' && seen.frame.t === t && seen.frame.beat === want.beat
      && seen.animations.length === 1 && seen.animations[0].state === 'paused' && seen.animations[0].time === t
      && near(scale, want.scale, LIMITS.curve) && near(seen.opacity, want.opacity, LIMITS.curve) && seen.words === WORDS && seen.figures > 0
      && near(centre.x, width / 2, LIMITS.centrePx) && near(centre.y, height / 2, LIMITS.centrePx);
  }
  return { ok, want: { beat: want.beat, scale: round3(want.scale), opacity: round3(want.opacity) }, drawn: { scale: scale === null ? null : round3(scale), opacity: seen.opacity === null ? null : round3(seen.opacity), centre } };
}
/** The largest upright rectangle inside the tilted stamp, `margin` px clear of its edge (its border, and one more). */
function faceOf(size, centre, tilt, margin = 4) {
  const [m0, m1] = /matrix\(([^)]+)\)/.exec(tilt)[1].split(',').map(Number);
  const angle = Math.abs(Math.atan2(m1, m0)), c = Math.cos(angle), s = Math.sin(angle), d = c * c - s * s;
  const A = size.w / 2 - margin, B = size.h / 2 - margin;
  const a = (A * c - B * s) / d, b = (B * c - A * s) / d;
  return { box: { x: round2(centre.x - a), y: round2(centre.y - b), w: round2(2 * a), h: round2(2 * b) }, tiltDegrees: round2(angle * 180 / Math.PI) };
}

const pack = { page: PACK_PAGE, files: {} };
for (const file of PACK_FILES) pack.files[file] = sha256(await readFile(join(REPO, file)));
// The source the captures show, read before anything is written: the components' files (the stamp, the kit, the
// shell and the room scene it is previewed with), the pinned pack it is compared with, and the room's and the
// crew's pictures, without the review folders checks write.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/phone-ui/prototype', 'design/room-drawing/assets', 'design/crew-drawing/assets/portraits']);
const out = await bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'round-stamp-check' });
const { server, origin } = await serve(out);
const reference = await startServer();
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const captures = {}, strips = {}, agreements = {}, probes = {}, stood = {};
let failed = 0;
const say = (ok, line) => { if (!ok) failed += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${line}`); };
const clean = (problems, violations) => problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
try {
  await mkdir(REVIEW, { recursive: true });
  // A clean review folder: captures of states that no longer exist do not linger.
  for (const name of await readdir(REVIEW)) if (/\.jpg$/.test(name)) await rm(join(REVIEW, name));

  // ── The captures ──
  for (const [sizeKey, [width, height]] of Object.entries(SIZES)) for (const [name, spec] of Object.entries(CAPTURES)) {
    const page = await open(browser, origin, `single=1&size=${sizeKey}&at=${AT}&${spec.query}`, { width, height, media: spec.media });
    const [seen] = await page.evaluate('window.__stamp.seen()');
    const violations = await violationsOf(page, out), problems = problemsOf(page);
    const bytes = await shot(page, { width, height });
    const file = join(REVIEW, `${sizeKey}-${name}.jpg`);
    await writeFile(file, bytes);
    const verdict = judge(seen, { t: spec.t, status: spec.status, reduced: !!spec.reduced, device: !!spec.media }, [width, height]);
    const ok = verdict.ok && clean(problems, violations);
    if (name === 'hold') {
      // The standing stamp is what the pack's frame is compared with, from this same page.
      stood[sizeKey] = { seen, png: await shot(page, { width, height, format: 'png' }) };
    }
    captures[`${sizeKey}/${name}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, asExpected: verdict.ok, emulated: spec.media ?? {}, want: verdict.want, drawn: verdict.drawn, ...seen, violations, problems };
    await page.close();
    const f = seen.frame;
    say(ok, `${sizeKey} ${name}: ${f ? `${f.beat}${f.beat === 'gone' ? '' : ` at ${f.t} ms`}` : 'no stamp'}${verdict.drawn.scale === null ? '' : `, ${Math.round(verdict.drawn.scale * 1000) / 10} % of its size, ${Math.round(verdict.drawn.opacity * 1000) / 10} % solid, centre ${verdict.drawn.centre ? `${verdict.drawn.centre.x}, ${verdict.drawn.centre.y}` : 'not drawn'}`}, crew ${seen.figures}, unexpected violations ${violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${verdict.ok ? '' : ', NOT AS EXPECTED'}`);
  }

  // ── The strips: the stamp, moment by moment, in one picture a size, in full motion and with Reduce motion ──
  for (const [sizeKey, [width, height]] of Object.entries(SIZES)) for (const motion of ['full', 'reduced']) {
    const gap = 16, caption = 64, reduced = motion === 'reduced';
    const view = { width: STRIP.length * width + (STRIP.length + 1) * gap, height: height + caption + gap * 2 };
    const page = await openPage(browser, { ...view, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    await page.goto(`${origin}/index.html?strip=1&size=${sizeKey}&at=${AT}${reduced ? '&motion=reduced' : ''}`, 'window.__stamp !== undefined');
    await page.evaluate('window.__stamp.ready');
    await sleep(600);
    const seen = await page.evaluate('window.__stamp.seen()');
    const size = await page.evaluate('({ width: Math.ceil(document.documentElement.scrollWidth), height: Math.ceil(document.documentElement.scrollHeight) })');
    const violations = await violationsOf(page, out), problems = problemsOf(page);
    const bytes = await shot(page, { width: size.width, height: size.height });
    const file = join(REVIEW, `strip-${sizeKey}${reduced ? '-reduced' : ''}.jpg`);
    await writeFile(file, bytes);
    const moments = seen.map((s, i) => { const v = judge(s, { t: STRIP[i], reduced }, [width, height]); return { t: STRIP[i], ok: v.ok, want: v.want, drawn: v.drawn }; });
    const ok = seen.length === STRIP.length && moments.every(m => m.ok) && clean(problems, violations);
    strips[`${sizeKey}/${motion}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), width: size.width, height: size.height, ok, moments, violations, problems };
    await page.close();
    say(ok, `${sizeKey} strip${reduced ? ', Reduce motion' : ''}: ${moments.map(m => `${m.t ?? 'gone'}:${m.drawn.scale === null || m.want.beat === 'gone' ? '–' : `${Math.round(m.drawn.scale * 100)}%/${Math.round(m.drawn.opacity * 100)}%`}`).join('  ')} (size/solid)`);
  }

  // ── Beside the pinned pack's own "Round 1 begins" frame, at each size: the words, the look, the box and the face ──
  for (const [sizeKey, [width, height]] of Object.entries(SIZES)) {
    const packPage = await openPage(browser, { width, height, scale: 2 });
    await packPage.goto(`${reference.origin}/${PACK_PAGE}`, 'window.__phoneReady === true');
    await packPage.evaluate(PACK_READY);
    await sleep(400);
    const theirs = await packPage.evaluate(PACK_SEEN);
    const packPng = await shot(packPage, { width, height, format: 'png' });
    const packProblems = problemsOf(packPage);
    await packPage.close();
    const ours = stood[sizeKey].seen;
    await writeFile(join(out, `pack-${sizeKey}.png`), packPng);
    await writeFile(join(out, `shot-${sizeKey}.png`), stood[sizeKey].png);

    const words = { pack: theirs.words, stamp: ours.words, tone: { pack: theirs.tone, stamp: ours.tone }, ok: theirs.words === ours.words && theirs.words === WORDS && theirs.tone === ours.tone };
    const look = Object.fromEntries(LOOK.map(key => [key, { pack: theirs.look[key], stamp: ours.look[key], ok: theirs.look[key] === ours.look[key] }]));
    const delta = Math.max(...['x', 'y', 'w', 'h'].map(k => Math.abs(theirs.stamp[k] - ours.stamp[k])));
    const box = { pack: theirs.stamp, stamp: ours.stamp, size: { pack: theirs.size, stamp: ours.size }, delta: round2(delta),
      ok: delta <= LIMITS.boxPx && theirs.size.w === ours.size.w && theirs.size.h === ours.size.h && theirs.phone.x === 0 && theirs.phone.y === 0 && theirs.phone.w === width && theirs.phone.h === height };
    const centre = { x: theirs.stamp.x + theirs.stamp.w / 2, y: theirs.stamp.y + theirs.stamp.h / 2 };
    const face = faceOf(theirs.size, centre, theirs.look.tilt);
    const around = { x: Math.floor(theirs.stamp.x - 16), y: Math.floor(theirs.stamp.y - 16), w: Math.ceil(theirs.stamp.w + 32), h: Math.ceil(theirs.stamp.h + 32) };

    // One pixel a point: the two phones side by side for the eye; the stamp's surroundings under them, pixel for pixel.
    const page = await openPage(browser, { width: width * 2 + 80, height: height + 900, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    await page.goto(`${origin}/index.html?agree=1`, 'window.__stamp !== undefined');
    const result = await page.evaluate(`window.__stamp.agree.then(a => a.compareWithPack(${JSON.stringify({ pack: `pack-${sizeKey}.png`, shot: `shot-${sizeKey}.png`, scale: 2, width, height, face: face.box, around, centre,
      labels: { pack: `The pack’s frame · ${sizeKey.replace('x', ' × ')} (prototype, ?s=room&stamp=round1)`, shot: `The component, standing (600 ms) · ${sizeKey.replace('x', ' × ')}` } })}))`);
    await sleep(200);
    const picture = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, captureBeyondViewport: true, clip: { x: 0, y: 0, width: result.picture.width, height: result.picture.height, scale: 1 } });
    const bytes = Buffer.from(picture.data, 'base64');
    const violations = await violationsOf(page, out), problems = problemsOf(page);
    await page.close();
    const file = join(REVIEW, `agree-${sizeKey}.jpg`);
    await writeFile(file, bytes);
    const controls = Object.fromEntries(Object.entries(result.controls).map(([key, c]) => [key, { ...c, ok: c.mean >= Math.max(LIMITS.face, result.face.mean * LIMITS.controlFactor) && c.mean > LIMITS.face }]));
    const pixels = { box: result.box, boxPixels: result.boxPixels, tiltDegrees: face.tiltDegrees, face: result.face, controls, ok: result.face.mean <= LIMITS.face && Object.values(controls).every(c => c.ok) };
    const ok = words.ok && Object.values(look).every(l => l.ok) && box.ok && pixels.ok && packProblems.length === 0 && clean(problems, violations);
    agreements[sizeKey] = { pack: PACK_PAGE, file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, words, look, box, pixels,
      // The pack lays the stamp over the whole phone, and gives it its own taps; the component takes none (the Lead Designer, #288, 16 November 2026).
      layer: { pack: theirs.layer, stamp: { pointer: ours.root.pointer } }, bar: { pack: theirs.bar, shell: ours.bar }, packProblems, violations, problems };
    say(ok, `beside the pack's frame at ${sizeKey}: words ${words.ok ? 'the same' : 'DIFFER'}, look ${Object.values(look).every(l => l.ok) ? 'the same' : `DIFFERS in ${Object.entries(look).filter(([, l]) => !l.ok).map(([k]) => k).join(', ')}`}, box ${box.delta} px apart (pack ${JSON.stringify(theirs.stamp)}), face ${result.face.mean} levels (max ${result.face.max}, ${result.face.pixels} pixels); moved 1 px ${result.controls.moved1px.mean}, 3 % larger ${result.controls.larger3percent.mean}`);
  }

  // ── The lifecycle probe, as the page comes and with the device's Reduce motion ──
  for (const [mode, media] of [['full', null], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }]]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&probe=1&at=${AT}`, 'window.__stamp !== undefined');
    const outcome = await page.evaluate('window.__stamp.probe');
    const violations = await violationsOf(page, out), problems = problemsOf(page);
    const ok = outcome.ok && outcome.mode === mode && outcome.checks.length > 0 && clean(problems, violations);
    if (!ok) failed += 1;
    // The run's own verdict last, so the page's (outcome.ok) never stands in for it.
    probes[mode] = { emulated: media ?? {}, ...outcome, ok, violations, problems };
    await page.close();
    for (const c of outcome.checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'} probe ${mode} · ${c.id}${c.ok ? '' : ` ${JSON.stringify(c.detail).slice(0, 2400)}`}`);
    if (outcome.error) console.log(`FAIL ${mode}: ${outcome.error}`);
    if (problems.length) console.log(`FAIL ${mode}: problems ${JSON.stringify(problems).slice(0, 1500)}`);
  }
} finally {
  browser.close();
  await chrome.close();
  server.close();
  await reference.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}
const record = {
  tool: 'design/tools/round-stamp-check.mjs',
  component: 'design/phone-ui/components/round-stamp',
  version: ROUND_STAMP_VERSION,
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels (the strips at 1x); the preview bundled by Vite and served with the production headers below; the pinned pack served unchanged by design/tools/phone-ui-render.mjs\'s reference server. A held moment is the component suspended on a clock that stands at that moment. Not a phone, not Safari, not a performance measure.',
  ...recordedHeaders(),
  voyageAt: AT,
  limits: LIMITS,
  pack,
  captures, strips,
  agree: agreements,
  probe: probes,
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const count = group => `${Object.values(group).filter(r => r.ok).length} of ${Object.keys(group).length}`;
const probeChecks = Object.values(probes).flatMap(p => p.checks ?? []);
console.log(`${count(captures)} captures passed; ${count(strips)} strips; beside the pack ${count(agreements)}; probe ${probeChecks.filter(c => c.ok).length} of ${probeChecks.length} checks; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
