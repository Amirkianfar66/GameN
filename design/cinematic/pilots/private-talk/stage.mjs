// mothership:dev-only
//
// Pilot 3 on the cinematic stage. display: the comic page over the board-v2 review page's own
// capsule board (film=capsule, synthetic pair 1 and 5, unmodified) in a frame, the board before the
// page under it until the page covers it, the board after it from then on (the page never shows a
// state the board has not published): the entrance, in the five-second result stage where nobody
// decides (../../lib/visibility.mjs), and the talk excerpt for review. The exit is the live game's,
// on the board (the owner's review of 6 November 2026, request R2): on the display too it is the
// approved S2 exit on the board itself, never a page over the next phase. phone: the approved S2
// on the board-v2 review page itself, unchanged, re-drawn at each seek from its own &stage and &t
// (its only time input). A review page's controller: no claim, side, role or speaker exists here.

import { SCENES } from '../../../board-motion/scenes/index.mjs';
import { fixtureSeats } from '../../../board-v2/js/fixtures.mjs';
import { LOCATION_OF, slotsOf } from '../../../board-v2/js/layout.mjs';
import { frames, pictureLibrary } from '../../lib/stage-kit.mjs';
import { CAPSULE_ART, ROOM_ART, pageSvg } from './compose.mjs';
import { CASES, PAGE, PRIVATE_TALK_VERSION, VARIANTS, exitEnd, pageEnd } from './film.mjs';

const PAIR = Object.freeze([1, 5]);
const ROSTER = 9;
const boardUrl = query => `../board-v2/index.html?beds=4&roster=${ROSTER}&fixture=mixed&film=capsule&pair=${PAIR.join(',')}&${query}`;

async function loadFrame(iframe, src, ready) {
  iframe.src = src;
  await new Promise(done => iframe.addEventListener('load', done, { once: true }));
  const win = iframe.contentWindow;
  for (let i = 0; i < 200 && !ready(win); i += 1) await new Promise(done => setTimeout(done, 20));
  const doc = iframe.contentDocument;
  await Promise.all([...doc.images].map(img => (img.complete ? null : new Promise(done => { img.onload = img.onerror = done; }))));
}

function frameNode(root, w, h) {
  const iframe = document.createElement('iframe');
  iframe.title = 'Board v2 review page (synthetic)';
  Object.assign(iframe.style, { position: 'absolute', left: '0', top: '0', width: `${w}px`, height: `${h}px`, border: '0' });
  root.append(iframe);
  return iframe;
}

/** The board under the page: before it and after it, per case (the review page's own capsule states). */
const BACKDROP = Object.freeze({
  entrance: Object.freeze({ before: 'stage=declare&t=0', after: 'stage=talk&t=0', swapAt: 460 }),
  talk: Object.freeze({ before: 'stage=talk&t=0', after: 'stage=talk&t=0', swapAt: 0 }),
});

export async function mountDisplay(root, { variant = 'full', case: caseName = 'entrance', w = 1920, h = 1080 } = {}) {
  // The exit plays over whatever phase comes next, so it stays the live game's: S2 on the board.
  if (caseName === 'exit') return mountPhone(root, { variant, case: 'exit', w, h });
  if (!CASES.includes(caseName)) throw new Error(`No case ${caseName}`);
  const reduced = variant === 'reduced';
  const back = BACKDROP[caseName];
  const before = frameNode(root, w, h), after = frameNode(root, w, h);
  const motion = reduced ? '&motion=reduced' : '';
  await loadFrame(before, boardUrl(back.before + motion), win => win.__capsuleFrame !== undefined);
  await loadFrame(after, boardUrl(back.after + motion), win => win.__capsuleFrame !== undefined);
  const pictures = [
    ...['room-a.back.svg', 'room-b.back.svg', 'room-b.bench.svg'].map(name => ({ href: `${ROOM_ART}/${name}`, w: 1024, h: 768 })),
    ...['back', 'door-0', 'door-1', 'door-2', 'door-3', 'busy'].map(name => ({ href: `${CAPSULE_ART}/${name}.svg`, w: 512, h: 768 })),
  ];
  const library = pictureLibrary(root, pictures);
  await library.ready;
  const host = document.createElement('div');
  Object.assign(host.style, { position: 'absolute', left: '0', top: '0', width: `${w}px`, height: `${h}px` });
  root.append(host);
  const seats = fixtureSeats('mixed', ROSTER);
  const ctx = { pair: PAIR.map(n => seats.find(seat => seat.seat === n)), seats, slotsOf: room => slotsOf(room, ROSTER), location: room => LOCATION_OF[room], scenes: SCENES, exchangeId: 'x-review', reduced };
  const end = pageEnd(caseName, variant);
  const seek = async t => {
    const { svg } = pageSvg(caseName, t, ctx);
    host.innerHTML = library.swap(svg);
    const showAfter = t >= (reduced ? PAGE.reduced.fade : back.swapAt);
    before.style.visibility = showAfter ? 'hidden' : '';
    after.style.visibility = showAfter ? '' : 'hidden';
    await frames();
    return { t, done: t >= end };
  };
  return { seek, end, size: [w, h], selector: '#stage', fixture: { pair: PAIR, case: caseName } };
}

/** The approved S2 on a phone's board, unchanged: the review page re-drawn at each seek. */
export async function mountPhone(root, { variant = 'full', case: caseName = 'entrance', w = 390, h = 844 } = {}) {
  const stage = caseName === 'entrance' ? 'result' : caseName;
  const iframe = frameNode(root, w, h);
  const motion = variant === 'reduced' ? '&motion=reduced' : '';
  const end = caseName === 'talk' ? 6000 : caseName === 'exit' ? exitEnd(variant) : (variant === 'reduced' ? 1100 : 3600) + 300;
  const seek = async t => {
    await loadFrame(iframe, boardUrl(`stage=${stage}&t=${Math.max(0, Math.round(t))}${motion}`), win => win.__capsuleFrame !== undefined);
    await frames();
    return { t, done: t >= end };
  };
  return { seek, end, size: [w, h], selector: '#stage', fixture: { pair: PAIR, case: caseName, s2: 'approved, unchanged' } };
}

export const PILOT_STAGE = Object.freeze({
  id: 'private-talk', version: PRIVATE_TALK_VERSION, variants: VARIANTS,
  surfaces: Object.freeze({ display: mountDisplay, phone: mountPhone }),
});
