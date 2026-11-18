// mothership:dev-only
//
// Ship life: the painted extent of each place's activity, for the room views' framing
// (design/ship-life/framing.mjs; T1, the owner's decision of 11 November 2026: nobody present is
// cut off). The phone frame keeps each present figure's outline whole (the phone pack's
// paintedExtent: its gesture's measured pixels, figure-extents.mjs), but an activity moves the
// figure beyond its resting gesture: a hand reaches up to a panel, a parcel is lifted, a cloth wipes
// along a tank. So the framing needs each activity's own outline too, and this measures it.
//
// In desktop Chrome it draws every pose each place's activity takes (./activities.mjs, two seats'
// variations over 40 seconds, at each of its keys), with what the hands hold (./props.mjs), with
// each of the nine characters in the room's outfit, both layers, onto a canvas well past the
// figure's own box, a pixel to a unit, and keeps the union of everything painted, in the figure's
// frame units (to the unit: the framing's margin for the crew's own motion is 8 across and 6 above).
// An injury's bandage sits on the head, inside the outline the activity already reaches. It writes design/ship-life/activity-extents.mjs with the hashes of the modules it drew with.
// The crew's own motion (the head's drift, the hanging hair) is the phone pack's margin, added by
// the framing as for a figure at rest.
//   node design/tools/ship-life-extents.mjs           writes the module
//   node design/tools/ship-life-extents.mjs --check   compares, writes nothing, exits 1 on a difference
// Needs a Chromium-based browser (CHROME_PATH). A measurement of drawn pixels in desktop Chrome.

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startServer } from './phone-ui-render.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = resolve(REPO, 'design/ship-life/activity-extents.mjs');
/** The modules the measurement draws with: a change to any of them means measuring again (the test compares). */
export const SOURCES = [
  'design/ship-life/activities.mjs',
  'design/ship-life/props.mjs',
  'design/board-motion/figures/gestures.mjs',
  'design/board-motion/figures/motion.mjs',
  'design/crew-drawing/source/wardrobe.mjs',
  'design/crew-drawing/source/figure.mjs',
  'design/crew-drawing/source/head.mjs',
  'design/crew-drawing/source/crew.mjs',
  'design/crew-drawing/source/ink.mjs',
  'apps/game/hosted/board-v2-drawing/slots-four.mjs',
];
export const sourceHashes = () => Object.fromEntries(SOURCES.map(path => [path, createHash('sha256').update(readFileSync(resolve(REPO, path))).digest('hex')]));

/** In the page: the rooms' places, in order. */
const PLACES = `import('/apps/game/hosted/board-v2-drawing/slots-four.mjs').then(m => m.BOARD_ROOMS.flatMap(room => m.slotsOf(room, 9).map(slot => [room, slot.id])))`;

/** In the page: one place's activity outline, the union over poses, props, characters and layers, in frame units. */
const MEASURE = (room, place) => `(async () => {
  const { activityTimeline, activityAt } = await import('/design/ship-life/activities.mjs');
  const { propsSvg } = await import('/design/ship-life/props.mjs');
  const { dressedFigureSvg, outfitFor } = await import('/design/crew-drawing/source/wardrobe.mjs');
  const { CREW } = await import('/design/crew-drawing/source/crew.mjs');
  const { LOCATION_OF, slotsOf } = await import('/apps/game/hosted/board-v2-drawing/slots-four.mjs');
  const PX = 1, VB = [-240, -190, 600, 600];
  const canvas = new OffscreenCanvas(VB[2] * PX, VB[3] * PX), ctx = canvas.getContext('2d', { willReadFrequently: true });
  const wide = svg => svg.replace(/viewBox="[^"]*"/, 'viewBox="' + VB.join(' ') + '"').replace(/ width="[^"]*"/, ' width="' + VB[2] + '"').replace(/ height="[^"]*"/, ' height="' + VB[3] + '"');
  const draw = async svgs => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const svg of svgs.filter(Boolean)) {
      const url = URL.createObjectURL(new Blob([wide(svg)], { type: 'image/svg+xml' }));
      const im = new Image(); im.src = url; await im.decode(); URL.revokeObjectURL(url);
      ctx.drawImage(im, 0, 0, canvas.width, canvas.height);
    }
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return x0 === Infinity ? null : [VB[0] + x0 / PX, VB[1] + y0 / PX, VB[0] + (x1 + 1) / PX, VB[1] + (y1 + 1) / PX];
  };
  const out = {}, poses = {}, edge = [];
  let n = 0;
  const room = ${JSON.stringify(room)};
  for (const slot of slotsOf(room, 9).filter(s => s.id === ${JSON.stringify(place)})) {
    const outfit = outfitFor(LOCATION_OF[room]);
    // Every distinct pose the activity takes, with what the hands hold then.
    const distinct = new Map();
    for (const seat of [0, 1]) {
      const timeline = activityTimeline(slot.id, slot.gesture, { seat, until: 40000 });
      for (const key of timeline.keys) {
        const { sk, props } = activityAt(timeline, key.at);
        const id = JSON.stringify([sk, props]);
        if (!distinct.has(id)) distinct.set(id, { sk, props, anchors: timeline.anchors });
      }
    }
    let box = null;
    for (const { sk, props, anchors } of distinct.values()) for (const c of Object.values(CREW)) {
      const layers = ['body', ...(sk.front?.length ? ['front'] : [])].map(layer => dressedFigureSvg(c, sk, { outfit, layer, prefix: 's' + (n += 1) }));
      const held = Object.keys(props ?? {}).length ? propsSvg(sk, props, { prefix: 'h' + n, anchors }) : '';
      const b = await draw([...layers, held]);
      if (b) box = box ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])] : b;
    }
    if (box && (box[0] <= VB[0] + 1 || box[1] <= VB[1] + 1 || box[2] >= VB[0] + VB[2] - 1 || box[3] >= VB[1] + VB[3] - 1)) edge.push(slot.id);
    out[slot.id] = box.map(v => Math.round(v * 10) / 10);
    poses[slot.id] = distinct.size;
  }
  return { out, poses, edge, drawn: n };
})()`;

const header = `// mothership:dev-only
//
// Ship life: the painted extent of each place's activity, for the room views' framing
// (./framing.mjs). Generated by design/tools/ship-life-extents.mjs, do not edit by hand: every pose
// each place's activity takes (./activities.mjs, two seats' variations over 40 seconds, at each key)
// with what the hands hold (./props.mjs), drawn with each of the nine characters in the room's
// outfit, both layers, in desktop Chrome, a pixel to a unit; the union of every painted pixel, in the
// figure's frame units ([x0, y0, x1, y1]; the figure's box is -90 -40 300 300, its feet at y 233, its
// anchor x 62). The crew's own motion is the phone pack's margin, added by the framing.`;

const server = await startServer();
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
try {
  let page = null;
  // Each place in a new tab, the last one closed, so the browser's memory stays bounded.
  // measure.html imports nothing, so a measurement never depends on what it is about to write.
  const fresh = async () => {
    if (page) await page.close();
    page = await openPage(browser, { width: 800, height: 600 });
    await page.goto(`${server.origin}/design/phone-ui/prototype/measure.html`, `document.readyState === 'complete'`);
  };
  await fresh();
  const places = await page.evaluate(PLACES);
  const out = {}, poses = {}, edge = [];
  let drawn = 0;
  for (const [room, place] of places) {
    await fresh();
    const part = await page.evaluate(MEASURE(room, place));
    Object.assign(out, part.out); Object.assign(poses, part.poses); edge.push(...part.edge); drawn += part.drawn;
  }
  if (edge.length) throw new Error(`Measured to the canvas edge, widen it: ${edge.join(', ')}`);
  const body = `${header}

/** The modules measured, by SHA-256: a change to any means measuring again (the test compares). */
export const ACTIVITY_EXTENTS_SOURCES = Object.freeze(${JSON.stringify(sourceHashes(), null, 2)});

/** Each place's activity, its painted extent, [x0, y0, x1, y1] in frame units, over ${drawn} drawings. */
export const ACTIVITY_EXTENTS = Object.freeze({
${Object.entries(out).map(([place, box]) => `  ${place}: Object.freeze([${box.join(', ')}]), // ${poses[place]} poses`).join('\n')}
});
`;
  if (process.argv.includes('--check')) {
    const disk = await readFile(OUT, 'utf8').catch(() => '');
    if (disk !== body) { console.error('design/ship-life/activity-extents.mjs is not what the tool measures now'); process.exitCode = 1; }
    else console.log('activity-extents.mjs is current');
  } else {
    await writeFile(OUT, body);
    console.log(`wrote design/ship-life/activity-extents.mjs: ${Object.keys(out).length} places from ${drawn} drawings`);
  }
} finally {
  browser.close();
  await chrome.close();
  await server.close();
}
