// mothership:dev-only
//
// Review pictures of the comic-figure pilot, into review/, and the pilot's own check: on
// every public state, every character's press area is at least 44 x 44 px and overlaps no
// other, a move is at least 44 px, and the phone does not scroll. Run by hand, with a
// Chromium-based browser on the machine:
//   node design/explorations/comic-figures/build.mjs
//   node design/explorations/comic-figures/render.mjs
//
// These are pictures of an exploration in desktop Chrome. They are not the review images of
// the design (design/review/), and no reviewed check reads them.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from '../../tools/lib/chrome.mjs';
import { startStaticServer } from '../../tools/lib/static-server.mjs';

const here = '/explorations/comic-figures/index.html';
const out = fileURLToPath(new URL('./review/', import.meta.url));
const phone = { width: 1180, height: 940, scale: 1.5, selector: '#cf-phone' };
const jobs = [
  { name: 'phone-board', query: '?scenario=spread&motion=reduced', ...phone },
  { name: 'phone-board-five-in-room-a', query: '?scenario=full&motion=reduced', ...phone },
  { name: 'phone-board-hospital-and-jail', query: '?scenario=crowded&motion=reduced', ...phone },
  { name: 'phone-board-five-in-room-b', query: '?scenario=fullB&motion=reduced', ...phone },
  { name: 'phone-board-five-in-hospital', query: '?scenario=fullH&motion=reduced', ...phone },
  { name: 'phone-board-five-in-jail', query: '?scenario=fullJ&motion=reduced', ...phone },
  { name: 'phone-board-no-plates', query: '?scenario=spread&motion=reduced&tags=off', ...phone },
  { name: 'phone-pick', query: '?scenario=spread&motion=reduced&pick=4', ...phone },
  { name: 'phone-picked', query: '?scenario=spread&motion=reduced&pick=4&confirm', ...phone },
  { name: 'phone-press-areas', query: '?scenario=full&motion=reduced&hits=show', ...phone },
  { name: 'today-and-pilot', query: '?motion=reduced', width: 1180, height: 940, scale: 1, selector: '#cf-compare' },
  { name: 'poses', query: '?motion=reduced', width: 1180, height: 940, scale: 1, selector: '#cf-sheet' },
];
// A move, in frames: Juno (the viewer) presses Room B. Each frame holds every cue at a moment.
const moveFrames = [
  { name: 'a-rest', step: null, at: 0 },
  { name: 'b-lift', step: 'leave', at: 90 },
  { name: 'c-gone', step: null, at: 200 },
  { name: 'd-drop', step: 'arrive', at: 120 },
  { name: 'e-land', step: null, at: 230 },
  { name: 'f-settled', step: null, at: 450 },
];

await mkdir(out, { recursive: true });
const server = await startStaticServer();
const chrome = await launchBrowser();
const report = { audits: {}, pictures: [] };
let failed = false;
try {
  const browser = await connect(chrome.endpoint);
  for (const scenario of ['spread', 'full', 'fullB', 'fullH', 'fullJ', 'crowded']) {
    for (const width of [390]) {
      const page = await openPage(browser, { width: 1180, height: 940 });
      await page.goto(`${server.origin}${here}?scenario=${scenario}&motion=reduced`);
      const audit = await page.evaluate('window.__pilot.audit()');
      report.audits[scenario] = audit;
      for (const problem of audit.problems) { console.error(`${scenario}: ${problem}`); failed = true; }
      console.log(`${scenario}: ${audit.areas.length} press areas, smallest ${Math.min(...audit.areas.map(area => area.width))} x ${Math.min(...audit.areas.map(area => area.height))} px, ${audit.problems.length} problems`);
      await page.close();
    }
  }
  for (const job of jobs) {
    const page = await openPage(browser, { width: job.width, height: job.height, scale: job.scale });
    await page.goto(`${server.origin}${here}${job.query}`);
    await sleep(300);
    const size = await page.screenshot(resolve(out, `${job.name}.png`), { selector: job.selector });
    for (const problem of page.problems()) { console.error(`${job.name}: page problem: ${problem}`); failed = true; }
    report.pictures.push(`${job.name}.png`);
    console.log(`${job.name}.png ${size.width}x${size.height}`);
    await page.close();
  }
  for (const motion of ['full', 'reduced']) {
    const page = await openPage(browser, { width: 1180, height: 940, scale: 1 });
    await page.goto(`${server.origin}${here}?scenario=spread&motion=${motion}`);
    await page.evaluate('window.__pilot.freeze(0)');
    // Under reduced motion nothing travels: three frames say it all.
    const keep = motion === 'full' ? () => true : frame => ['a-rest', 'c-gone', 'f-settled'].includes(frame.name);
    for (const frame of moveFrames) {
      if (frame.step === 'leave') await page.evaluate('window.__pilot.leave("room-b")');
      if (frame.step === 'arrive') {
        // The lifted piece has gone: its cue ends, then the piece is set down in the other room.
        await page.evaluate(`document.getAnimations().filter(animation => animation.animationName === 'cf-leave' || animation.animationName === 'cf-fade-out').forEach(animation => animation.finish())`);
        await page.evaluate('new Promise(done => setTimeout(done, 50))');
        await page.evaluate('window.__pilot.arrive()');
      }
      await page.evaluate(`new Promise(done => requestAnimationFrame(() => requestAnimationFrame(() => { window.__pilot.freeze(${motion === 'full' ? frame.at : Math.min(frame.at, 80)}); done(); })))`);
      if (!keep(frame)) continue;
      const name = `move-${motion}-${frame.name}`;
      await page.screenshot(resolve(out, `${name}.png`), { selector: '.cf-board' });
      report.pictures.push(`${name}.png`);
    }
    // Let every cue finish, then check the board where it settled.
    await page.evaluate('document.getAnimations().forEach(animation => animation.finish ? (animation.effect?.getTiming().iterations === Infinity ? animation.cancel() : animation.finish()) : null)');
    const audit = await page.evaluate('new Promise(done => setTimeout(() => done(window.__pilot.audit()), 600))');
    report.audits[`after a move (${motion})`] = audit;
    for (const problem of audit.problems) { console.error(`after a move (${motion}): ${problem}`); failed = true; }
    console.log(`after a move (${motion}): ${audit.problems.length} problems`);
    await page.close();
  }
  browser.close();
} finally {
  await chrome.close();
  await server.close();
}
await writeFile(resolve(out, 'audit.json'), `${JSON.stringify({ devOnly: 'mothership:dev-only', note: 'Measured by render.mjs in desktop Chrome at a 390 x 844 phone. Synthetic states only.', ...report }, null, 2)}\n`);
if (failed) process.exitCode = 1;
