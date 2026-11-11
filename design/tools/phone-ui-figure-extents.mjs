// mothership:dev-only
//
// The painted extent of every gesture a room can draw, for the phone room view's framing (T1, the
// owner's decision of 11 November 2026: "nobody present is cut off"). Frontend and Integration found
// on #222 that framing by the press points keeps every press area whole but can still cut a drawn
// figure: A3 crouched at the floor hatch reaches far past its press point. So the framing needs each
// figure's own outline, and this measures it.
//
// In desktop Chrome it draws each gesture of the game's rig (apps/game/hosted/scene-drawing, the one
// the pack and the game draw with), plain, Injured and still (Eliminated), with each of the nine
// characters (apps/game/hosted/crew-drawing) in each outfit (crew, gown, prison), both layers, onto a
// canvas well past the figure's own box (figures may paint outside it: .fig > svg is overflow:
// visible), and keeps the union of everything painted, in the figure's frame units. Then the crew's
// own motion (crew-drawing/motion.mjs, the native game's crew-runtime): every gesture that moves is
// drawn again at the corners of that motion's range (the head's idle drift and tilt, and the hanging
// hair's swing and lift up to their clamp, both read from the module), and how far that paints past
// the still outline is kept: the phone frame's MOTION_ALLOWANCE must cover it (the test checks). It
// writes design/phone-ui/prototype/figure-extents.mjs with the hashes of the modules it drew with.
//   node design/tools/phone-ui-figure-extents.mjs           writes the module
//   node design/tools/phone-ui-figure-extents.mjs --check   compares, writes nothing, exits 1 on a difference
// Needs a Chromium-based browser (CHROME_PATH). A measurement of drawn pixels in desktop Chrome.

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startServer } from './phone-ui-render.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = resolve(REPO, 'design/phone-ui/prototype/figure-extents.mjs');
/** The modules the measurement draws with: a change to any of them means measuring again. */
export const SOURCES = [
  'apps/game/hosted/scene-drawing/gestures.mjs',
  'apps/game/hosted/scene-drawing/body.mjs',
  'apps/game/hosted/crew-drawing/wardrobe.mjs',
  'apps/game/hosted/crew-drawing/figure.mjs',
  'apps/game/hosted/crew-drawing/head.mjs',
  'apps/game/hosted/crew-drawing/crew.mjs',
  'apps/game/hosted/crew-drawing/ink.mjs',
  'apps/game/hosted/crew-drawing/motion.mjs',
];
export const sourceHashes = () => Object.fromEntries(SOURCES.map(path => [path, createHash('sha256').update(readFileSync(resolve(REPO, path))).digest('hex')]));

/** In the page: a canvas well past the figure's own box, and a draw that returns a drawing's painted bounds in frame units. */
const SETUP = `
  const PX = 3, VB = [-240, -190, 600, 600];
  const canvas = new OffscreenCanvas(VB[2] * PX, VB[3] * PX), ctx = canvas.getContext('2d', { willReadFrequently: true });
  const draw = async svg => {
    const wide = svg.replace(/viewBox="[^"]*"/, 'viewBox="' + VB.join(' ') + '"').replace(/ width="[^"]*"/, ' width="' + VB[2] + '"').replace(/ height="[^"]*"/, ' height="' + VB[3] + '"');
    const url = URL.createObjectURL(new Blob([wide], { type: 'image/svg+xml' }));
    const im = new Image(); im.src = url; await im.decode(); URL.revokeObjectURL(url);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(im, 0, 0, canvas.width, canvas.height);
    im.src = '';
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return x0 === Infinity ? null : [VB[0] + x0 / PX, VB[1] + y0 / PX, VB[0] + (x1 + 1) / PX, VB[1] + (y1 + 1) / PX];
  };
  const atEdge = box => box && (box[0] <= VB[0] + 1 || box[1] <= VB[1] + 1 || box[2] >= VB[0] + VB[2] - 1 || box[3] >= VB[1] + VB[3] - 1);
  const join = (box, b) => (box ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])] : b);
`;

/** In the page: these gestures' painted bounds as drawn (plain, Injured, still), the union over characters, outfits and layers. */
const STILL_EXTENTS = names => `(async () => {
  const { skeletonOf, INJURED, STILL } = await import('/apps/game/hosted/scene-drawing/gestures.mjs');
  const { dressedFigureSvg, OUTFITS } = await import('/apps/game/hosted/crew-drawing/wardrobe.mjs');
  const { CREW } = await import('/apps/game/hosted/crew-drawing/crew.mjs');
  ${SETUP}
  const out = {}, edge = [];
  let n = 0;
  for (const name of ${JSON.stringify(names)}) {
    for (const mark of ['', INJURED, STILL]) {
      const gesture = name + mark;
      const sk = skeletonOf(gesture);
      let box = null;
      for (const c of Object.values(CREW)) for (const outfit of OUTFITS) for (const layer of ['body', 'front']) {
        if (layer === 'front' && !sk.front?.length) continue;
        const b = await draw(dressedFigureSvg(c, sk, { outfit, layer, prefix: 'm' + (n += 1) }));
        if (b) box = join(box, b);
      }
      if (atEdge(box)) edge.push(gesture);
      out[gesture] = box.map(v => Math.round(v * 10) / 10);
    }
  }
  return { out, edge, drawn: n };
})()`;

/**
 * In the page: the crew's own motion, its range read from its module: the idle drift sampled over a
 * minute for every character and seat; the hanging hair's follow-through driven hard both ways to its clamp.
 */
const MOTION_RANGE = `(async () => {
  const { CREW } = await import('/apps/game/hosted/crew-drawing/crew.mjs');
  const { idleDrift, hairFollow, hasHangingHair } = await import('/apps/game/hosted/crew-drawing/motion.mjs');
  let dx = 0, dy = 0, tilt = 0, hair = 0;
  for (const id of Object.keys(CREW)) for (let seat = 0; seat < 9; seat += 1) for (let t = 0; t < 60000; t += 5) {
    const d = idleDrift(t, id, { seat });
    dx = Math.max(dx, Math.abs(d.dx)); dy = Math.max(dy, Math.abs(d.dy)); tilt = Math.max(tilt, Math.abs(d.tilt));
  }
  for (const id of Object.keys(CREW).filter(hasHangingHair)) for (const dir of [1, -1]) {
    const follow = hairFollow(id);
    follow.step(1, 0, 0);
    for (let i = 1; i <= 400; i += 1) { const r = follow.step(16, dir * 50 * i, dir * 50 * i); hair = Math.max(hair, Math.abs(r.sway), Math.abs(r.lift)); }
  }
  return { dx, dy, tilt, hair };
})()`;

/**
 * In the page: how far these gestures, where they move (not gone still), paint past their still
 * outlines at every corner of that range. The head is the same in every outfit (wardrobe.mjs keeps
 * the crew's head), so the crew suit stands for all three.
 */
const MOTION_REACH = (names, still, range) => `(async () => {
  const { skeletonOf, INJURED } = await import('/apps/game/hosted/scene-drawing/gestures.mjs');
  const { dressedFigureSvg } = await import('/apps/game/hosted/crew-drawing/wardrobe.mjs');
  const { CREW } = await import('/apps/game/hosted/crew-drawing/crew.mjs');
  const { hasHangingHair, isStill } = await import('/apps/game/hosted/crew-drawing/motion.mjs');
  ${SETUP}
  const still = ${JSON.stringify(still)}, { dx, dy, tilt, hair } = ${JSON.stringify(range)};
  const reach = {}, edge = [];
  let n = 0;
  for (const name of ${JSON.stringify(names)}) {
    for (const mark of ['', INJURED]) {
      const gesture = name + mark;
      if (isStill(gesture)) continue;
      const sk = skeletonOf(gesture);
      let box = null;
      for (const c of Object.values(CREW)) {
        const hairs = hasHangingHair(c.id) ? [-hair, hair] : [0];
        for (const layer of ['body', 'front']) {
          if (layer === 'front' && !sk.front?.length) continue;
          for (const sx of [-dx, dx]) for (const sy of [-dy, dy]) for (const st of [-tilt, tilt]) for (const sway of hairs) for (const lift of hairs) {
            const motion = { blink: 0, sway, lift, drift: { dx: sx, dy: sy, tilt: st } };
            const b = await draw(dressedFigureSvg(c, sk, { outfit: 'crew', layer, motion, prefix: 'm' + (n += 1) }));
            if (b) box = join(box, b);
          }
        }
      }
      if (atEdge(box)) edge.push(gesture + ' (moving)');
      const s = still[gesture];
      reach[gesture] = [s[0] - box[0], s[1] - box[1], box[2] - s[2], box[3] - s[3]].map(v => Math.max(0, Math.ceil(v * 10 - 1e-6) / 10));
    }
  }
  return { reach, edge, drawn: n };
})()`;

/** Gestures per page: each batch is measured on a fresh page, so the browser's memory stays bounded. */
const BATCH = 3;

const header = `// mothership:dev-only
//
// The painted extent of every gesture the rooms draw, for the phone room view's framing
// (art.mjs phoneFrame; T1, the owner's decision of 11 November 2026: nobody present is cut off).
// Generated by design/tools/phone-ui-figure-extents.mjs, do not edit by hand: each gesture of the
// game's rig, plain, Injured (+injured) and still (+still), drawn with each of the nine characters
// in each outfit, both layers, in desktop Chrome; the union of every painted pixel, in the figure's
// frame units ([x0, y0, x1, y1]; the figure's box is -90 -40 300 300, its feet at y 233, its anchor
// x 62). A figure may paint outside its box: these are its own pixels, wherever they fall. The
// crew's own motion is measured the same way (FIGURE_MOTION_*): the phone frame's MOTION_ALLOWANCE
// covers it, and the test checks that it does.`;

const server = await startServer();
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
try {
  let page = null;
  // Each batch in a new tab, the last one closed, so the browser's memory stays bounded. measure.html
  // imports nothing, so a measurement never depends on the files it is about to write.
  const fresh = async () => {
    if (page) await page.close();
    page = await openPage(browser, { width: 800, height: 600 });
    await page.goto(`${server.origin}/design/phone-ui/prototype/measure.html`, `document.readyState === 'complete'`);
  };
  await fresh();
  const names = await page.evaluate(`import('/apps/game/hosted/scene-drawing/gestures.mjs').then(m => Object.keys(m.GESTURES))`);
  const batches = [];
  for (let i = 0; i < names.length; i += BATCH) batches.push(names.slice(i, i + BATCH));
  const out = {}, edge = [];
  let drawn = 0, drawnMoving = 0;
  for (const batch of batches) {
    await fresh();
    const part = await page.evaluate(STILL_EXTENTS(batch));
    Object.assign(out, part.out); edge.push(...part.edge); drawn += part.drawn;
  }
  await fresh();
  const raw = await page.evaluate(MOTION_RANGE);
  const reach = {};
  for (const batch of batches) {
    await fresh();
    const part = await page.evaluate(MOTION_REACH(batch, out, raw));
    Object.assign(reach, part.reach); edge.push(...part.edge); drawnMoving += part.drawn;
  }
  const motion = { range: Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Math.ceil(v * 100) / 100])), reach };
  if (edge.length) throw new Error(`Measured to the canvas edge, widen it: ${edge.join(', ')}`);
  const body = `${header}

/** The modules measured, by SHA-256: a change to any means measuring again (the test compares). */
export const FIGURE_EXTENTS_SOURCES = Object.freeze(${JSON.stringify(sourceHashes(), null, 2).replace(/\n/g, '\n')});

/** Each gesture's painted extent, [x0, y0, x1, y1] in frame units, over ${drawn} drawings. */
export const FIGURE_EXTENTS = Object.freeze({
${Object.entries(out).map(([gesture, box]) => `  ${JSON.stringify(gesture)}: Object.freeze([${box.join(', ')}]),`).join('\n')}
});

/**
 * The range of the crew's own motion measured (crew-drawing/motion.mjs): the idle drift's largest
 * move of the head (dx, dy, in frame units) and tilt (degrees), and the hanging hair's clamp (sway
 * and lift, head units), as the native game's crew runtime moves a figure that is not gone still.
 */
export const FIGURE_MOTION_RANGE = Object.freeze(${JSON.stringify(motion.range)});

/**
 * How far each gesture that moves paints past its still outline (FIGURE_EXTENTS) anywhere in that
 * range, [left, top, right, bottom] in frame units, 0 where it stays inside, over ${drawnMoving}
 * drawings. Gone still (+still, down, the slumps) does not move and is not listed.
 */
export const FIGURE_MOTION_REACH = Object.freeze({
${Object.entries(motion.reach).map(([gesture, r]) => `  ${JSON.stringify(gesture)}: Object.freeze([${r.join(', ')}]),`).join('\n')}
});
`;
  if (process.argv.includes('--check')) {
    const disk = await readFile(OUT, 'utf8').catch(() => '');
    if (disk !== body) { console.error('design/phone-ui/prototype/figure-extents.mjs is not what the tool measures now'); process.exitCode = 1; }
    else console.log('figure-extents.mjs is current');
  } else {
    await writeFile(OUT, body);
    const worst = Object.values(motion.reach).reduce((m, r) => [Math.max(m[0], r[0], r[2]), Math.max(m[1], r[1]), Math.max(m[2], r[3])], [0, 0, 0]);
    console.log(`wrote design/phone-ui/prototype/figure-extents.mjs: ${Object.keys(out).length} gestures from ${drawn} drawings, their motion from ${drawnMoving}; motion ${JSON.stringify(motion.range)} reaches at most ${worst[0]} across, ${worst[1]} above, ${worst[2]} below`);
  }
} finally {
  browser.close();
  await chrome.close();
  await server.close();
}
