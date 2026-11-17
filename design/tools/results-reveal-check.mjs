// mothership:dev-only
//
// The results reveal's check (design/phone-ui/components/results-reveal). It bundles the component's preview the
// way the game bundles the component (Vite: ordinary bundling, no copy), serves the bundle with the hosted game's
// production response headers (scripts/prepare-hosted-preview.mjs: the Content Security Policy of
// scripts/hosted-preview-policy.mjs and the six other headers), and looks, in desktop Chromium at 2× pixels, at
// the two development phone sizes, 390 × 844 and 430 × 932. The reveal sits in the phone shell's cover, with the
// room scene in the shell's stage and the vote's own result window in the reveal's host, as in the game.
//   Captures: the rise held at 120 ms, the window at rest, Reduce motion's still (the game's and the device's),
//   reconnecting at 120 ms and concealed. A capture passes with no policy violation, no failed or refused request
//   and no page error, with the host where its moment puts it, the window's headline as the pack writes it and
//   the room's crew drawn behind.
//   The strip: the arrival at 0, 40, 80, 120, 160, 240 and 320 ms and at rest, side by side, one picture a size.
//   At rest, unchanged: for each of the pack's result states (sheets 37 and 38), the phone with the window in the
//   reveal's host and the phone with the window straight in the cover, pixel for pixel.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion
//   emulated: seeking, a late phone, the run, suspend, reconnecting, concealed, Reduce motion, a new phase, one
//   animation at most, taps, what assistive technology meets, refused inputs and dispose;
//   the agreement (preview/agree.mjs): every part of the window, in the reveal's host and in the cover, box for box.
// It writes design/phone-ui/components/results-reveal/review/: one JPEG per capture, a strip a size, the results
// at rest, and check.json (the headers and their SHA-256, the source commit, what each capture showed and its
// SHA-256, and each probe and agreement check with what it saw). It exits non-zero when any check fails, and says
// which.
//   node design/tools/results-reveal-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone, not
// Safari, not a performance measure. A held moment is the component suspended on a clock that stands there.
// The bundling, the headers and the policy reports are every component check's (lib/component-check.mjs).

import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/results-reveal');
const REVIEW = join(COMPONENT, 'review');
const { REVEAL_BEATS, RESULTS_REVEAL_VERSION, revealFrame } = await import(pathToFileURL(join(COMPONENT, 'results-reveal.mjs')).href);
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
// The moment of the voyage the captures hold, as the shell's and the vote's do (2:10).
const AT = 130;
// How far the browser's own solving of the curve may leave the host from the component's arithmetic, in px.
const CURVE_SLACK_PX = 0.05;
const STRIP = [0, 40, 80, 120, 160, 240, 320, null];
/** The pack's result states (sheets 37 and 38) and the headline each window writes. */
const RESULTS = {
  'result-elected': 'BEN IS CAPTAIN', 'result-runoff': 'TIE · RUNOFF', 'result-no-captain': 'NO CAPTAIN',
  'result-jailed': 'GUS GOES TO JAIL', 'result-jail-full': 'GUS CHOSEN · JAIL FULL', 'result-no-one': 'NO ONE GOES TO JAIL', 'result-jailed-8': 'GUS GOES TO JAIL',
};
/** The captures: what is asked of the page, and what the phone must show. */
const CAPTURES = {
  'rise-120': { query: 't=120', t: 120, beat: 'rise' },
  rest: { query: '', t: null, beat: 'rest' },
  reduced: { query: 'motion=reduced', t: null, beat: 'rest', reduced: true },
  'device-reduced': { query: 't=120', t: null, beat: 'rest', reduced: true, media: { 'prefers-reduced-motion': 'reduce' } },
  'stale-120': { query: 't=120&status=stale', t: 120, beat: 'rise', status: 'stale' },
  concealed: { query: 't=120&status=concealed', t: null, beat: 'rest', status: 'concealed' },
};

const near = (a, b, slack) => Math.abs(a - b) <= slack;
const problemsOf = page => page.problems().filter(p => !/\/favicon\.ico$/.test(p)); // the browser asks for it by itself; the live site has none
async function open(browser, origin, query, { width, height, media = null }) {
  const page = await openPage(browser, { width, height, scale: 2 });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
  if (media) await page.media(media);
  await page.goto(`${origin}/index.html?${query}`, 'window.__reveal !== undefined');
  await page.evaluate('window.__reveal.ready');
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
/** Where the host must lie for a moment of the reveal, and whether a phone's facts agree. */
function placed(seen, t) {
  const want = revealFrame(t ?? Infinity).offset * seen.cover.height;
  return { want, ok: near(seen.host.top, want, CURVE_SLACK_PX) && near(seen.host.left, 0, 0.01) && near(seen.host.width, seen.cover.width, 0.01) && near(seen.host.height, seen.cover.height, 0.01) };
}
const restBox = seen => ({ left: 10, top: 8, width: seen.cover.width - 20, height: seen.cover.height - 18 });
const sameBox = (a, b) => !!a && ['left', 'top', 'width', 'height'].every(k => near(a[k], b[k], 0.01));

// The source the captures show, read before anything is written: the components' files, the room pictures and
// the result art, without the review folders checks write.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/room-drawing/assets', 'apps/game/hosted/scene-drawing/phone-kit-art.mjs']);
const out = await bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'results-reveal-check' });
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const captures = {}, strips = {}, unchanged = {}, probes = {};
let agreement = null;
let failed = 0;
const say = (ok, line) => { if (!ok) failed += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${line}`); };
try {
  await mkdir(REVIEW, { recursive: true });
  // A clean review folder: captures of states that no longer exist do not linger.
  for (const name of await readdir(REVIEW)) if (/\.jpg$/.test(name)) await rm(join(REVIEW, name));

  // ── The captures ──
  for (const [sizeKey, [width, height]] of Object.entries(SIZES)) for (const [name, spec] of Object.entries(CAPTURES)) {
    const page = await open(browser, origin, `single=1&size=${sizeKey}&state=result-jailed&at=${AT}${spec.query ? `&${spec.query}` : ''}`, { width, height, media: spec.media });
    const [seen] = await page.evaluate('window.__reveal.seen()');
    const violations = await violationsOf(page, out), problems = problemsOf(page);
    const bytes = await shot(page, { width, height });
    const file = join(REVIEW, `${sizeKey}-${name}.jpg`);
    await writeFile(file, bytes);
    const concealed = spec.status === 'concealed', rising = spec.beat === 'rise';
    const where = concealed ? { want: null, ok: seen.host.hidden && seen.window === null } : placed(seen, spec.t);
    const drawn = seen.frame.beat === spec.beat && seen.frame.status === (spec.status ?? 'live') && seen.frame.reduced === !!spec.reduced && seen.frame.shown === !concealed
      && where.ok && seen.host.style === null
      && (rising ? seen.frame.t === spec.t && seen.host.animations.length === 1 && seen.host.animations[0].state === 'paused' && seen.host.animations[0].time === spec.t
        : seen.host.animations.length === 0 && seen.frame.offset === 0)
      && (concealed ? seen.title === null && seen.figures === 0 : seen.title === RESULTS['result-jailed'] && seen.figures > 0)
      && (rising || concealed || sameBox(seen.window, restBox(seen)))
      && seen.status === (spec.status ?? 'live');
    const ok = drawn && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    captures[`${sizeKey}/${name}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn, emulated: spec.media ?? {}, hostBelowPx: seen.host.top, wantBelowPx: where.want, ...seen, violations, problems };
    await page.close();
    say(ok, `${sizeKey} ${name}: ${seen.frame.beat}${seen.frame.t === null ? '' : ` at ${seen.frame.t} ms`}, host ${seen.host.hidden ? 'hidden' : `${seen.host.top.toFixed(2)} px below its place${where.want === null ? '' : ` (${where.want.toFixed(2)} by the curve)`}`}, ${seen.title ?? 'no window'}, crew ${seen.figures}, unexpected violations ${violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${drawn ? '' : ', NOT AS EXPECTED'}`);
  }

  // ── The strip: the arrival, moment by moment, in one picture a size ──
  for (const [sizeKey, [width, height]] of Object.entries(SIZES)) {
    const gap = 16, caption = 64;
    const view = { width: STRIP.length * width + (STRIP.length + 1) * gap, height: height + caption + gap * 2 };
    const page = await openPage(browser, { ...view, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    await page.goto(`${origin}/index.html?strip=1&size=${sizeKey}&at=${AT}`, 'window.__reveal !== undefined');
    await page.evaluate('window.__reveal.ready');
    await sleep(600);
    const seen = await page.evaluate('window.__reveal.seen()');
    const size = await page.evaluate('({ width: Math.ceil(document.documentElement.scrollWidth), height: Math.ceil(document.documentElement.scrollHeight) })');
    const violations = await violationsOf(page, out), problems = problemsOf(page);
    const bytes = await shot(page, { width: size.width, height: size.height });
    const file = join(REVIEW, `strip-${sizeKey}.jpg`);
    await writeFile(file, bytes);
    const moments = seen.map((s, i) => ({ t: STRIP[i], beat: s.frame.beat, hostBelowPx: s.host.top, wantBelowPx: placed(s, STRIP[i]).want, share: 1 - s.frame.offset, ok: placed(s, STRIP[i]).ok && s.frame.beat === (STRIP[i] === null || STRIP[i] >= REVEAL_BEATS.rise[1] ? 'rest' : 'rise') && s.title === RESULTS['result-jailed'] }));
    const falling = moments.every((m, i) => i === 0 || m.hostBelowPx <= moments[i - 1].hostBelowPx);
    const ok = seen.length === STRIP.length && moments.every(m => m.ok) && falling && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    strips[sizeKey] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), width: size.width, height: size.height, ok, moments, violations, problems };
    await page.close();
    say(ok, `${sizeKey} strip: ${moments.map(m => `${m.t ?? 'rest'}:${m.hostBelowPx.toFixed(1)}`).join('  ')} px below its place`);
  }

  // ── At rest, unchanged: the window in the reveal's host and the window in the cover, pixel for pixel ──
  for (const [sizeKey, [width, height]] of Object.entries(SIZES)) for (const [state, title] of Object.entries(RESULTS)) {
    const shots = {}, facts = {};
    let problems = [], violations = [];
    for (const [side, query] of [['hosted', ''], ['direct', '&direct=1']]) {
      const page = await open(browser, origin, `single=1&size=${sizeKey}&state=${state}&at=${AT}${query}`, { width, height });
      [facts[side]] = await page.evaluate('window.__reveal.seen()');
      shots[side] = await shot(page, { width, height, format: 'png' });
      if (side === 'hosted') { const bytes = await shot(page, { width, height }); const file = join(REVIEW, `${sizeKey}-rest-${state}.jpg`); await writeFile(file, bytes); facts.file = file.slice(REPO.length + 1); facts.sha256 = sha256(bytes); }
      problems = problems.concat(problemsOf(page)); violations = violations.concat(await violationsOf(page, out));
      await page.close();
    }
    let differing = 0;
    if (!shots.hosted.equals(shots.direct)) {
      // Not the same bytes: count the pixels that differ, in a page of this bundle (data: pictures are allowed).
      const page = await open(browser, origin, `single=1&size=${sizeKey}&state=${state}&at=${AT}`, { width, height });
      differing = await page.evaluate(`(async () => {
        const load = src => new Promise((done, fail) => { const image = new Image(); image.onload = () => done(image); image.onerror = () => fail(new Error('picture')); image.src = src; });
        const [a, b] = await Promise.all([load('data:image/png;base64,${shots.hosted.toString('base64')}'), load('data:image/png;base64,${shots.direct.toString('base64')}')]);
        if (a.width !== b.width || a.height !== b.height) return -1;
        const data = image => { const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, image.width, image.height).data; };
        const x = data(a), y = data(b);
        let n = 0;
        for (let i = 0; i < x.length; i += 4) if (x[i] !== y[i] || x[i + 1] !== y[i + 1] || x[i + 2] !== y[i + 2]) n += 1;
        return n;
      })()`);
      await page.close();
    }
    const hosted = facts.hosted, direct = facts.direct;
    const ok = differing === 0 && hosted.title === title && direct.title === title && sameBox(hosted.window, direct.window) && sameBox(hosted.window, restBox(hosted))
      && hosted.host.animations.length === 0 && hosted.host.transform === 'none' && hosted.host.style === null && hosted.figures > 0
      && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    unchanged[`${sizeKey}/${state}`] = { file: facts.file, sha256: facts.sha256, ok, differingPixels: differing, sameBytes: shots.hosted.equals(shots.direct), pngSha256: { hosted: sha256(shots.hosted), direct: sha256(shots.direct) },
      title: hosted.title, window: { hosted: hosted.window, direct: direct.window }, host: hosted.host, violations, problems };
    say(ok, `${sizeKey} at rest ${state}: ${hosted.title}, ${differing === 0 ? 'pixel for pixel the window in the cover' : `${differing} pixels differ`}`);
  }

  // ── The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement ──
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}&at=${AT}`, 'window.__reveal !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__reveal.agree' : 'window.__reveal.probe');
    const violations = await violationsOf(page, out), problems = problemsOf(page);
    const ok = outcome.ok && outcome.mode === mode && outcome.checks.length > 0 && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    if (!ok) failed += 1;
    // The run's own verdict last, so the page's (outcome.ok) never stands in for it.
    const entry = { emulated: media ?? {}, ...outcome, ok, violations, problems };
    if (mode === 'agree') agreement = entry; else probes[mode] = entry;
    await page.close();
    for (const c of outcome.checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${mode === 'agree' ? 'agree · ' : `probe ${mode} · `}${c.id}${c.ok ? '' : ` ${JSON.stringify(c.detail).slice(0, 1800)}`}`);
    if (outcome.error) console.log(`FAIL ${mode}: ${outcome.error}`);
    if (problems.length) console.log(`FAIL ${mode}: problems ${JSON.stringify(problems).slice(0, 1500)}`);
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}
const record = {
  tool: 'design/tools/results-reveal-check.mjs',
  component: 'design/phone-ui/components/results-reveal',
  version: RESULTS_REVEAL_VERSION,
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels; the preview bundled by Vite and served with the production headers below. A held moment is the component suspended on a clock that stands at that moment. Not a phone, not Safari, not a performance measure.',
  ...recordedHeaders(),
  voyageAt: AT,
  curveSlackPx: CURVE_SLACK_PX,
  captures, strips, unchanged,
  probe: probes,
  agree: agreement,
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const count = group => `${Object.values(group).filter(r => r.ok).length} of ${Object.keys(group).length}`;
const probeChecks = Object.values(probes).flatMap(p => p.checks ?? []), agreeChecks = agreement?.checks ?? [];
console.log(`${count(captures)} captures passed; ${count(strips)} strips; ${count(unchanged)} results unchanged at rest; probe ${probeChecks.filter(c => c.ok).length} of ${probeChecks.length} checks; agreement ${agreeChecks.filter(c => c.ok).length} of ${agreeChecks.length}; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
