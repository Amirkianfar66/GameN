// mothership:dev-only
//
// The room scene's extension pictures (design/phone-ui/components/room-scene/room-extension.mjs): for
// each room, the ceiling above and the deck below its approved picture (room-drawing-1.0.0), lit and
// with the lights out, for the owner's "a fifth wider" room view. It samples each picture along its top
// and bottom edges in desktop Chromium and writes design/phone-ui/components/room-scene/assets/
// <room>.extend.svg and <room>.extend-dark.svg.
//   node design/tools/room-scene-extend.mjs           write them
//   node design/tools/room-scene-extend.mjs --check   write nothing; fail if a file differs
// Needs a Chromium-based browser (CHROME_PATH).
//
// The drawing is ship life's (#230, design/ship-life/extend.mjs, which the owner reviewed in its
// framing sheets), unchanged for the lit pictures. The lights-out ones are drawn the same way from the
// lights-out pictures, with the night rule the lights-out pictures were made by (design/board-v2/scenes/
// lighting.mjs, read and not changed): the shadow they fall into goes almost to ink with a trace of the
// room's hue (nightFill), and their lines go to faint steel (NIGHT.line). Once #230 is on main, ship
// life uses these files and this drawing.

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILIES } from '../room-pilot/rooms.mjs';
import { NIGHT, nightFill } from '../board-v2/scenes/lighting.mjs';
import { REACH, ROOM_EXTENSION } from '../phone-ui/components/room-scene/room-extension.mjs';
import { ROOM_ART } from '../phone-ui/components/room-scene/room-art.mjs';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';

const DESIGN = resolve(fileURLToPath(new URL('../', import.meta.url)));
const ASSETS = join(DESIGN, 'phone-ui/components/room-scene/assets');
const PICTURES = join(DESIGN, 'room-drawing/assets');

/** Where each band starts inside the picture (its feather), and the row its colours are read along. */
export const SEAM = Object.freeze({ top: Object.freeze({ feather: [14, 30], sample: 22 }), bottom: Object.freeze({ feather: [730, 750], sample: 736 }) });

const INK = '#151923';
const hex = rgb => `#${rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/** Colour stops along a row: sampled colours [[r, g, b], ...] evenly across 0..1024, smoothed over a few neighbours. */
function stops(row) {
  const n = row.length;
  return row.map((_, i) => {
    let r = 0, g = 0, b = 0, w = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j += 1) { const k = 3 - Math.abs(i - j); r += row[j][0] * k; g += row[j][1] * k; b += row[j][2] * k; w += k; }
    return `<stop offset="${(i / (n - 1)).toFixed(4)}" stop-color="${hex([r / w, g / w, b / w])}"/>`;
  }).join('');
}

/**
 * One room's extension, as an SVG in the room's own coordinates (viewBox 0 −REACH 1024 768 + 2 ×
 * REACH: laid over the picture with the picture's box offset by REACH). sampled: { top, bottom }, each
 * a row of [r, g, b] colours across the picture, read along SEAM.*.sample. prefix: the ids' prefix.
 * night: the lights-out extension, its colours by the night rule (sampled from the lights-out picture).
 */
export function extensionSvg(room, sampled, { header = '', prefix = `ext-${room}`, night = false } = {}) {
  // An XML comment cannot hold two hyphens in a row.
  if (header.includes('--')) throw new Error('A file header cannot hold "--"');
  const family = FAMILIES[room];
  if (!family) throw new Error(`No colour family for ${room}`);
  const p = prefix;
  // The shadow the bands fall into, the far ink and the bands' lines: the room's, or by the night rule.
  const deep = night ? nightFill(family.deep) : family.deep, ink = night ? nightFill(INK) : INK, line = night ? NIGHT.line : family.deep;
  const H = 768, R = REACH;
  const [tf0, tf1] = SEAM.top.feather, [bf0, bf1] = SEAM.bottom.feather;
  // The deck's seams run toward the room's far wall as the picture's do; the ceiling's toward its back.
  const seams = (y0, y1, dir) => [96, 224, 352, 512, 672, 800, 928].map((x, i) => {
    const lean = (x - 512) * 0.34 * dir;
    return `<path d="M${x} ${y0} L${(x + lean).toFixed(1)} ${y1}" stroke="${line}" stroke-width="${i === 3 ? 2.6 : 2.2}" opacity="0.38" fill="none"/>`;
  }).join('');
  const rows = (ys, color) => ys.map(y => `<path d="M0 ${y} H1024" stroke="${color}" stroke-width="2.2" opacity="0.32" fill="none"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${-R} 1024 ${H + 2 * R}" width="1024" height="${H + 2 * R}">${header ? `\n<!--\n${header}\n-->` : ''}
<defs>
  <linearGradient id="${p}-top" x1="0" x2="1024" y1="0" y2="0" gradientUnits="userSpaceOnUse">${stops(sampled.top)}</linearGradient>
  <linearGradient id="${p}-bottom" x1="0" x2="1024" y1="0" y2="0" gradientUnits="userSpaceOnUse">${stops(sampled.bottom)}</linearGradient>
  <linearGradient id="${p}-top-in" x1="0" x2="0" y1="${tf1}" y2="${tf0}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
  <linearGradient id="${p}-bottom-in" x1="0" x2="0" y1="${bf0}" y2="${bf1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
  <mask id="${p}-top-mask" maskUnits="userSpaceOnUse" x="0" y="${-R}" width="1024" height="${R + tf1}"><rect x="0" y="${-R}" width="1024" height="${R + tf0}" fill="#fff"/><rect x="0" y="${tf0}" width="1024" height="${tf1 - tf0}" fill="url(#${p}-top-in)"/></mask>
  <mask id="${p}-bottom-mask" maskUnits="userSpaceOnUse" x="0" y="${bf0}" width="1024" height="${H + R - bf0}"><rect x="0" y="${bf0}" width="1024" height="${bf1 - bf0}" fill="url(#${p}-bottom-in)"/><rect x="0" y="${bf1}" width="1024" height="${H + R - bf1}" fill="#fff"/></mask>
  <linearGradient id="${p}-top-fall" x1="0" x2="0" y1="${tf1}" y2="${-R}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${deep}" stop-opacity="0"/><stop offset="0.45" stop-color="${deep}" stop-opacity="0.55"/><stop offset="1" stop-color="${ink}" stop-opacity="0.96"/></linearGradient>
  <linearGradient id="${p}-bottom-fall" x1="0" x2="0" y1="${bf0}" y2="${H + R}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${deep}" stop-opacity="0"/><stop offset="0.4" stop-color="${deep}" stop-opacity="0.5"/><stop offset="1" stop-color="${ink}" stop-opacity="0.94"/></linearGradient>
  <pattern id="${p}-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><path d="M0 4.5 H9" stroke="${ink}" stroke-width="1.6"/></pattern>
  <linearGradient id="${p}-hatch-top" x1="0" x2="0" y1="${tf0}" y2="${-R}" gradientUnits="userSpaceOnUse"><stop offset="0.25" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.7"/></linearGradient>
  <linearGradient id="${p}-hatch-bottom" x1="0" x2="0" y1="${bf1}" y2="${H + R}" gradientUnits="userSpaceOnUse"><stop offset="0.25" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.7"/></linearGradient>
  <mask id="${p}-hatch-top-mask" maskUnits="userSpaceOnUse" x="0" y="${-R}" width="1024" height="${R + tf0}"><rect x="0" y="${-R}" width="1024" height="${R + tf0}" fill="url(#${p}-hatch-top)"/></mask>
  <mask id="${p}-hatch-bottom-mask" maskUnits="userSpaceOnUse" x="0" y="${bf1}" width="1024" height="${H + R - bf1}"><rect x="0" y="${bf1}" width="1024" height="${H + R - bf1}" fill="url(#${p}-hatch-bottom)"/></mask>
</defs>
<g data-band="top" mask="url(#${p}-top-mask)">
  <rect x="0" y="${-R}" width="1024" height="${R + tf1}" fill="url(#${p}-top)"/>
  ${seams(tf1, -R, -1)}${rows([-28, -96], line)}
  <rect x="0" y="${-R}" width="1024" height="${R + tf1}" fill="url(#${p}-top-fall)"/>
  <rect x="0" y="${-R}" width="1024" height="${R + tf0}" fill="url(#${p}-hatch)" mask="url(#${p}-hatch-top-mask)" opacity="0.5"/>
</g>
<g data-band="bottom" mask="url(#${p}-bottom-mask)">
  <rect x="0" y="${bf0}" width="1024" height="${H + R - bf0}" fill="url(#${p}-bottom)"/>
  ${seams(bf0, H + R, 1)}${rows([806, 884], line)}
  <rect x="0" y="${bf0}" width="1024" height="${H + R - bf0}" fill="url(#${p}-bottom-fall)"/>
  <rect x="0" y="${bf1}" width="1024" height="${H + R - bf1}" fill="url(#${p}-hatch)" mask="url(#${p}-hatch-bottom-mask)" opacity="0.5"/>
</g>
</svg>
`;
}

/** In the page: a picture drawn at its own size, and its colours along two rows, a column every 16 units. */
const SAMPLE = `async (src, rows) => {
  const im = new Image(); im.src = src; await im.decode();
  const canvas = new OffscreenCanvas(1024, 768), context = canvas.getContext('2d');
  context.drawImage(im, 0, 0, 1024, 768);
  const out = {};
  for (const [name, y] of Object.entries(rows)) {
    const data = context.getImageData(0, y - 2, 1024, 5).data;
    const row = [];
    for (let x = 0; x <= 1024; x += 16) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = 0; dy < 5; dy += 1) for (let dx = -6; dx <= 6; dx += 1) {
        const cx = Math.max(0, Math.min(1023, x + dx)), i = (dy * 1024 + cx) * 4;
        if (data[i + 3] < 200) continue;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1;
      }
      row.push(n ? [r / n, g / n, b / n] : [21, 25, 35]);
    }
    out[name] = row;
  }
  return out;
}`;

const header = (room, dark) => `  room scene · ${room}${dark ? ' · lights out' : ''}: the ceiling above and the deck below the approved picture (room-drawing-1.0.0) for the room view a fifth wider · generated, do not edit by hand
  Each band starts in the ${dark ? 'lights-out ' : ''}picture's own colours along its edge (sampled at y ${SEAM.top.sample} and ${SEAM.bottom.sample}, a column every 16 units, in desktop Chrome), feathered
  over the picture's last rows, and falls into the room's shadow${dark ? ' by the night rule' : ''}. ${REACH} units each way. Written by design/tools/room-scene-extend.mjs (the drawing of ship life, #230).`;

function serve(root) {
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://x').pathname;
    if (path === '/blank.html') { response.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><title>sample</title>'); return; }
    const file = normalize(join(root, decodeURIComponent(path)));
    if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const body = await readFile(file).catch(() => null);
    if (body === null) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': extname(file) === '.svg' ? 'image/svg+xml' : 'application/octet-stream' }).end(body);
  });
  return new Promise(done => server.listen(0, '127.0.0.1', () => done({ server, origin: `http://127.0.0.1:${server.address().port}` })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  const { server, origin } = await serve(PICTURES);
  const chrome = await launchBrowser();
  const browser = await connect(chrome.endpoint);
  let differ = 0;
  try {
    const page = await openPage(browser, { width: 400, height: 300 });
    await page.goto(`${origin}/blank.html`, 'document.readyState === "complete"');
    await mkdir(ASSETS, { recursive: true });
    for (const [room, art] of Object.entries(ROOM_ART)) {
      for (const dark of [false, true]) {
        const picture = dark ? art.dark.file : art.back.file;
        const sampled = await page.evaluate(`(${SAMPLE})(${JSON.stringify(`${origin}/${picture}`)}, ${JSON.stringify({ top: SEAM.top.sample, bottom: SEAM.bottom.sample })})`);
        const svg = extensionSvg(room, sampled, { header: header(room, dark), prefix: dark ? `ext-${room}-dark` : `ext-${room}`, night: dark });
        const file = join(ASSETS, (dark ? ROOM_EXTENSION[room].dark : ROOM_EXTENSION[room].lit).file);
        if (check) {
          const now = await readFile(file, 'utf8').catch(() => null);
          if (now !== svg) { differ += 1; console.log(`differs: ${file.slice(DESIGN.length)}`); }
        } else {
          await writeFile(file, svg);
          console.log(`wrote ${file.slice(DESIGN.length)}`);
        }
      }
    }
    await page.close();
  } finally {
    browser.close();
    chrome.close?.();
    server.close();
  }
  if (check) console.log(differ ? `${differ} extension picture(s) differ` : 'the extension pictures are current');
  if (differ) process.exitCode = 1;
}
