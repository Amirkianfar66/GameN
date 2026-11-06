// mothership:dev-only
//
// The EJECT cut on the cinematic stage. A review page's controller, not a client: every input is the
// board-v2 review page's synthetic Captain fixture (design/board-v2/js/captain-fixtures.mjs, outcome
// "eject" for nine players: seats 3 and 4 living, seat 9's body, all in the Jail). The words are page
// text over the composition, as a client draws them: the plate's EJECT, the closing USED stamp, and
// S7's captainWords() in the lower letterbox from S7's announce.
//
//   display  the default, as on every phone: the approved S7 on the board-v2 review page itself,
//            unchanged, re-drawn at each seek from its own &film=eject and &t. CAPTAIN_EJECT is a
//            command during the turns, so decisions are open while it plays: the board treatment
//            covers nothing (design/cinematic/lib/visibility.mjs; the owner's review of
//            6 November 2026; the brief: "long medical/ejection films need shorter or nonblocking
//            forms")
//   phone    the same at a phone's size
//   cut      the 1920 x 1080 cut, full or reduced: it covers the board, so it plays only in a phase
//            where nobody decides; no such phase follows an EJECT today, so it needs a presentation
//            stage the owner would have to approve
//   insert   the identity-free exterior insert (a runtime export): no person, no word, no count

import { captainWords } from '../../../board-v2/films/captain.mjs';
import { captainOutcome } from '../../../board-v2/js/captain-fixtures.mjs';
import { frames, pictureLibrary } from '../../lib/stage-kit.mjs';
import { castOf, cutSvg, insertSvg } from './compose.mjs';
import { EJECT_CUT_VERSION, VARIANTS, cutEnd, insertEnd } from './film.mjs';

const ASSETS = '../board-motion/assets/scenes';
const ROSTER = 9;

function layer(root, w, h) {
  const node = document.createElement('div');
  Object.assign(node.style, { position: 'absolute', left: '0', top: '0', width: `${w}px`, height: `${h}px`, overflow: 'hidden' });
  root.append(node);
  return node;
}

/** The page text over the composition: the plate's word, the stamp, the caption. */
function wordsLayer(root, w, h) {
  const node = layer(root, w, h);
  node.style.pointerEvents = 'none';
  const span = (style) => { const el = document.createElement('span'); Object.assign(el.style, { position: 'absolute', display: 'grid', placeItems: 'center', fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', ...style }); node.append(el); return el; };
  // S7's own styles for the plate's word and the stamp (design/board-v2/css: .v2-cpt__word, .v2-cpt__stamp).
  const plate = span({ fontFamily: '"Arial Narrow", "Helvetica Neue", Arial, sans-serif', fontWeight: '800', letterSpacing: '0.06em' });
  const stamp = span({ color: '#151923', background: '#F4EBDD', border: '3px solid #151923', rotate: '-8deg', fontFamily: '"Arial Narrow", "Helvetica Neue", Arial, sans-serif', letterSpacing: '0.12em' });
  const caption = span({ left: '0', width: `${w}px`, color: '#F4EBDD', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontWeight: '700', textTransform: 'none', letterSpacing: '0.01em' });
  return {
    draw(words, text) {
      for (const el of [plate, stamp, caption]) el.style.display = 'none';
      if (!words) return;
      if (words.plate) {
        const [x, y, bw, bh] = words.plate.box;
        Object.assign(plate.style, { display: 'grid', left: `${x}px`, top: `${y}px`, width: `${bw}px`, height: `${bh}px`, fontSize: `${Math.round(bh * 0.62)}px`, color: words.plate.lit ? '#FFB3A3' : '#8A97AB' });
        plate.textContent = words.plate.word;
      }
      if (words.stamp) {
        const [x, y, bw, bh] = words.stamp.box;
        Object.assign(stamp.style, { display: 'grid', left: `${x}px`, top: `${y}px`, width: `${bw}px`, height: `${bh}px`, fontSize: `${Math.round(bh * 0.5)}px`, opacity: String(words.stamp.opacity) });
        stamp.textContent = words.stamp.word;
      }
      if (words.caption && words.bars >= 40) {
        Object.assign(caption.style, { display: 'grid', top: `${h - words.bars}px`, height: `${words.bars}px`, fontSize: `${Math.round(Math.min(40, words.bars * 0.36))}px` });
        caption.textContent = text;
      }
    },
  };
}

/** The covering cut (design/cinematic/lib/visibility.mjs mayCover()): one 1920 x 1080 SVG and its page text. */
export async function mountCut(root, { variant = 'full', w = 1920, h = 1080, roster = ROSTER } = {}) {
  root.style.width = `${w}px`; root.style.height = `${h}px`;
  const outcome = captainOutcome('eject', roster);
  const cast = castOf(outcome, roster);
  const text = captainWords('EJECT', outcome.seatIds);
  const library = pictureLibrary(root, [{ href: `${ASSETS}/jail.back.svg`, w: 1024, h: 768 }]);
  await library.ready;
  const host = layer(root, w, h);
  const words = wordsLayer(root, w, h);
  const end = cutEnd(variant);
  let last = null;
  const seek = async t => {
    const out = cutSvg(t, { cast, assets: ASSETS, variant, width: w, height: h });
    host.innerHTML = library.swap(out.svg);
    words.draw(out.words, text);
    last = out.frame;
    await frames();
    return { t, stage: out.frame.shot, done: t >= end };
  };
  return { seek, end, size: [w, h], selector: '#stage', last: () => last, fixture: { outcome: 'eject', seatIds: outcome.seatIds, roster } };
}

/** The approved S7 on the board-v2 review page, unchanged: the page re-drawn at each seek from its &t. */
export async function mountBoard(root, { variant = 'full', w = 1920, h = 1080, roster = ROSTER } = {}) {
  root.style.width = `${w}px`; root.style.height = `${h}px`;
  const iframe = document.createElement('iframe');
  iframe.title = 'Board v2 review page (synthetic)';
  Object.assign(iframe.style, { position: 'absolute', left: '0', top: '0', width: `${w}px`, height: `${h}px`, border: '0' });
  root.append(iframe);
  const motion = variant === 'reduced' ? '&motion=reduced' : '';
  const end = cutEnd(variant);
  const seek = async t => {
    iframe.src = `../board-v2/index.html?beds=4&roster=${roster}&film=eject&t=${Math.max(0, Math.min(end, Math.round(t)))}${motion}`;
    await new Promise(done => iframe.addEventListener('load', done, { once: true }));
    const doc = iframe.contentDocument;
    for (let i = 0; i < 200 && !doc.querySelector('.v2-room'); i += 1) await new Promise(done => setTimeout(done, 20));
    await Promise.all([...doc.images].map(img => (img.complete ? null : new Promise(done => { img.onload = img.onerror = done; }))));
    await frames();
    return { t, done: t >= end };
  };
  return { seek, end, size: [w, h], selector: '#stage', fixture: { outcome: 'eject', s7: 'approved, unchanged', roster } };
}

export const mountDisplay = (root, options = {}) => mountBoard(root, { w: 1920, h: 1080, ...options });
export const mountPhone = (root, options = {}) => mountBoard(root, { w: 390, h: 844, ...options });

export async function mountInsert(root, { w = 1920, h = 1080 } = {}) {
  root.style.width = `${w}px`; root.style.height = `${h}px`;
  const host = layer(root, w, h);
  const end = insertEnd();
  const seek = async t => { host.innerHTML = insertSvg(t, { width: w, height: h }).svg; await frames(); return { t, done: t >= end }; };
  return { seek, end, size: [w, h], selector: '#stage', fixture: null };
}

export const PILOT_STAGE = Object.freeze({
  id: 'eject', version: EJECT_CUT_VERSION, variants: VARIANTS,
  surfaces: Object.freeze({ display: mountDisplay, phone: mountPhone, cut: mountCut, insert: mountInsert }),
});
