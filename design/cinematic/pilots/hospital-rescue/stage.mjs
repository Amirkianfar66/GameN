// mothership:dev-only
//
// Pilot 1 on the cinematic stage (../../stage.html): the board treatment (the cinematic pass over
// the board's own Hospital panel) on a phone and, by default, on the display; the display's covering
// cut (surface "cut": only in a phase where nobody decides, ../../lib/visibility.mjs); and the
// identity-free drone insert. RESCUED is published as the navigation confirmations begin, a phase
// with an open decision, so the display's default is the board treatment, never the cut. A review page's
// controller, not a client: every input is the board-v2 review page's synthetic medical fixture
// (design/board-v2/js/medical-fixtures.mjs): outcome "rescue" (Rigel, seat 2, Injured at H1, healed;
// free, so the published snapshot has Rigel in Room A at A2) or, with case=detained, outcome
// "rescue-detained" (Mira, seat 8, Injured and detained at H2, healed; the snapshot has Mira back in
// the Jail at J1). t is the stage's to seek. The film ends on that placement: the patient walks out,
// the berth is left empty, and the playable figure at its place is never hidden.
//
// The phone board is the approved board-v2 review page itself (index.html?beds=4&film=rescue at
// t = -1: the board, the berth states and the snapshot, no film), unmodified, in a same-origin
// frame; this stage draws the pass over its Hospital panel with the same geometry the approved S5
// controller uses (fitBoardV2(), slotRects(), insetBox(), droneFit()), checks that geometry against
// the frame's own drawing, and marks the subject's snapshot figure away while the film plays, as S5 does.

import { CREW } from '../../../board-motion/figures/crew.mjs';
import { frameScene } from '../../../board-motion/scenes/frame.mjs';
import { SCENES } from '../../../board-motion/scenes/index.mjs';
import { LABEL_MARGIN } from '../../../board-v2/fx/label-box.mjs';
import { DOCK, DRONE, MEDICAL, droneFit, droneSvg, insetBox } from '../../../board-v2/fx/medical.mjs';
import { fourBerthKit, fourFilmBerth } from '../../../board-v2/fx/medical-four.mjs';
import { barsShell, fitBoardV2, insetsOf, sceneOf, slotRects } from '../../../board-v2/js/layout.mjs';
import { medicalOutcome } from '../../../board-v2/js/medical-fixtures.mjs';
import { turnsOptions } from '../../../board-v2/js/turns-view.mjs';
import { fxDefs, grade, letterbox, lightCone, lightPool, vignette } from '../../lib/comic.mjs';
import { beat, clamp01, easeInCubic, easeInOutCubic, easeOutBack, lerp, noise, r2 } from '../../lib/ease.mjs';
import { placeSvg } from '../../lib/scene.mjs';
import { frames, pictureLibrary } from '../../lib/stage-kit.mjs';
import { irisSvg } from './art.mjs';
import { displaySvg, filmItems } from './compose.mjs';
import { HOSPITAL_RESCUE_VERSION, pilotEnd, rescueCinematicFrame, VARIANTS } from './film.mjs';

const ASSETS = '../board-v2/assets/scenes';
const SVGNS = 'http://www.w3.org/2000/svg';
const f = v => Number((+v).toFixed(2));

/** The review cases: a free patient healed back to Room A, and a detained one healed back to the Jail. */
export const CASES = Object.freeze({ free: 'rescue', detained: 'rescue-detained' });

/**
 * The review fixture: one of the board-v2 review page's rescue outcomes on the four-berth board, with
 * where the snapshot places the patient (destination: the room, the slot and the room's occupants).
 */
export function reviewOutcome(roster = 9, name = 'rescue') {
  const outcome = medicalOutcome(name, roster);
  const seats = outcome.after.map(seat => ({ seat: seat.seat, slotId: seat.room === 'hospital' ? seat.slot : null }));
  const film = fourFilmBerth(outcome.anchor, seats, outcome.subject.seat);
  const occupants = outcome.after.filter(seat => seat.room === 'hospital' && seat.seat !== outcome.subject.seat);
  const after = outcome.after.find(seat => seat.seat === outcome.subject.seat);
  const destination = { room: after.room, slotId: after.slot, seats: outcome.after.filter(seat => seat.room === after.room), subjectSeat: after.seat };
  const subject = { ...outcome.subject, detained: Boolean(after.jailed) };
  return { outcome, film, occupants, subject, destination, leaves: after.room !== 'hospital' };
}

const WARD_PICTURES = ['hospital-ward-four.back.svg', 'hospital-ward-four.berth-four-h1-head.svg', 'hospital-ward-four.berth-four-h1.svg', 'hospital-ward-four.berth-four-h2-head.svg', 'hospital-ward-four.berth-four-h2.svg', 'hospital-ward-four.berth-four-h3.svg', 'hospital-ward-four.berth-four-h4.svg'].map(name => ({ href: `${ASSETS}/${name}`, w: 1024, h: 768 }));

const ROOM_ASSETS = '../board-motion/assets/scenes';
/** A room's pictures (page.js scenePictures()), for the closing panel. */
const roomPictures = room => [{ href: `${ROOM_ASSETS}/${room}.back.svg`, w: 1024, h: 768 }, ...Object.keys(SCENES[room].layers ?? {}).map(id => ({ href: `${ROOM_ASSETS}/${room}.${id.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}.svg`, w: 1024, h: 768 }))];

/** The display's covering cut: a 1920 x 1080 SVG redrawn at each seek. Only where lib/visibility.mjs mayCover(). */
export async function mountCut(root, { variant = 'full', width = 1920, height = 1080, roster = 9, case: which = 'free' } = {}) {
  const { film, occupants, subject, destination } = reviewOutcome(roster, CASES[which] ?? CASES.free);
  const library = pictureLibrary(root, [...WARD_PICTURES, ...(destination.room !== 'hospital' ? roomPictures(destination.room) : [])]);
  await library.ready;
  const host = document.createElement('div');
  root.append(host);
  let last = null;
  const seek = async t => {
    const { svg, frame } = displaySvg(t, { berthId: film.berth, subject, occupants, variant, assets: ASSETS, roomAssets: ROOM_ASSETS, destination, roster, width, height });
    host.innerHTML = library.swap(svg);
    last = frame;
    await frames();
    return { t, stage: frame.base?.stage ?? (frame.done ? 'done' : null), done: frame.done };
  };
  return { seek, end: pilotEnd(variant), size: [width, height], selector: '#stage', last: () => last, fixture: { subject: subject.seat, berth: film.berth, destination: `${destination.room} ${destination.slotId}`, detained: subject.detained } };
}

/** The frame's Hospital panel geometry, computed as page.js and medical-view.mjs compute it, checked against the frame's drawing. */
function boardGeometry(doc, { w, h, roster, film, outcome }) {
  const { bars } = turnsOptions(new URLSearchParams(''));
  const board = fitBoardV2({ width: w, height: h }, roster, { insets: insetsOf(null), capsule: false, shell: barsShell(bars) });
  const panel = board.panels.hospital;
  const frame = frameScene(sceneOf('hospital', roster), panel);
  const section = doc.querySelector('.v2-room[data-room="hospital"]');
  const back = section.querySelector('.v2-art > img');
  const drawn = { k: parseFloat(back.style.width) / 1024, tx: parseFloat(back.style.left), ty: parseFloat(back.style.top) };
  if (Math.abs(drawn.k - frame.k) > 1e-3 || Math.abs(drawn.tx - frame.tx) > 0.05 || Math.abs(drawn.ty - frame.ty) > 0.05) throw new Error(`Hospital frame drift: drawn ${JSON.stringify(drawn)}, computed ${JSON.stringify(frame)}`);
  const rects = slotRects('hospital', roster, panel);
  const rect = rects.find(entry => entry.id === film.berth);
  const capNode = section.querySelector('.v2-cap');
  const caption = capNode ? { left: capNode.offsetLeft, top: capNode.offsetTop, width: capNode.offsetWidth, height: capNode.offsetHeight } : null;
  const held = outcome.after.filter(seat => seat.room === 'hospital' && seat.slot !== film.berth).map(seat => rects.find(entry => entry.id === seat.slot)).map(r => ({ left: r.left, top: r.top, width: r.side, height: r.side }));
  const place = insetBox({ rect, panel, width: Math.max(60, Math.min(84, Math.round(panel.width * 0.42))), caption, keepClear: held });
  const kit = fourBerthKit(film.berth);
  const fit = droneFit({ kit, frame, keepClear: [...(caption ? [{ left: caption.left - LABEL_MARGIN, top: caption.top - LABEL_MARGIN, width: caption.width + 2 * LABEL_MARGIN, height: caption.height + 2 * LABEL_MARGIN }] : []), ...held] });
  const inset = place ? { x: (place.left - frame.tx) / frame.k, y: (place.top - frame.ty) / frame.k, width: place.width / frame.k } : null;
  // The pass keeps clear of what S5 keeps clear of: the room label (with its margin) and the other occupants' berths, in scene units.
  const toScene = r => ({ x: (r.left - frame.tx) / frame.k, y: (r.top - frame.ty) / frame.k, w: r.width / frame.k, h: r.height / frame.k });
  const keepClear = [...(caption ? [{ left: caption.left - LABEL_MARGIN, top: caption.top - LABEL_MARGIN, width: caption.width + 2 * LABEL_MARGIN, height: caption.height + 2 * LABEL_MARGIN }] : []), ...held].map(toScene);
  return { section, art: section.querySelector('.v2-art'), frame, panel, rect, inset, fit, place, keepClear };
}

/**
 * The phone board: the approved review page in a frame w x h, the pass over its Hospital panel.
 * Each seek redraws the pass's layers, each as one scene-sized SVG at its board z-index.
 */
export async function mountPhone(root, { variant = 'full', w = 390, h = 844, roster = 9, case: which = 'free' } = {}) {
  const { outcome, film, subject, leaves } = reviewOutcome(roster, CASES[which] ?? CASES.free);
  if (!film.plays) throw new Error('The review outcome plays no film');
  const iframe = document.createElement('iframe');
  iframe.title = 'Board v2 review page (synthetic)';
  Object.assign(iframe.style, { width: `${w}px`, height: `${h}px`, border: '0', display: 'block' });
  iframe.src = `../board-v2/index.html?beds=4&roster=${roster}&film=rescue&outcome=${outcome.name}&t=-1`;
  root.append(iframe);
  await new Promise(done => iframe.addEventListener('load', done, { once: true }));
  const win = iframe.contentWindow, doc = iframe.contentDocument;
  for (let i = 0; i < 200 && win.__medicalFrame === undefined; i += 1) await new Promise(done => setTimeout(done, 25));
  await Promise.all([...doc.images].map(img => (img.complete ? null : new Promise(done => { img.onload = img.onerror = done; }))));
  const geo = boardGeometry(doc, { w, h, roster, film, outcome });
  const { art, section, frame: fr, rect, panel } = geo;
  const defs = doc.createElementNS(SVGNS, 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
  defs.style.position = 'absolute';
  defs.innerHTML = fxDefs('hb');
  section.append(defs);
  const snapshot = [...doc.querySelectorAll(`.v2-fig[data-seat="${subject.seat}"]`)];
  const after = outcome.after.find(seat => seat.seat === subject.seat);
  const ownBerth = after.room === 'hospital' && after.slot === film.berth;
  // The subject's name tag at the berth while the film draws it there (S5's, the board's drawTag()).
  const tag = doc.createElement('span');
  tag.className = 'v2-tag';
  tag.dataset.seat = String(subject.seat);
  tag.dataset.film = 'cine-rescue';
  Object.assign(tag.style, { left: `${rect.press[0]}px`, top: `${Math.min(panel.height - 16, rect.top + rect.side - 14)}px` });
  tag.innerHTML = `<b>${subject.seat}</b>${CREW[subject.character].sign}`;
  const live = doc.querySelector('[data-live="public"]');
  let layers = [];
  const end = pilotEnd(variant);
  const seek = async t => {
    for (const node of layers) node.remove();
    layers = [];
    const playing = t >= 0 && t < end;
    const frame = rescueCinematicFrame(t, film.berth, { variant, surface: 'board', fit: geo.fit, leaves: leaves && !ownBerth });
    // The playable figure at its snapshot place is always drawn: greyed as away while the film shows
    // the patient at the berth, back in colour (settling onto its place) as the walker leaves the ward.
    const arriving = playing && !ownBerth && frame.arrive > 0;
    for (const node of snapshot) {
      node.classList.toggle('v2-fig--away', playing && !ownBerth && !arriving);
      node.style.visibility = playing && ownBerth ? 'hidden' : '';
      node.style.translate = arriving && frame.arrive < 1 ? `0 ${r2(-7 * (1 - frame.arrive))}px` : '';
    }
    const onBerth = !frame.release || frame.release.phase === 'bed';
    if (playing && !ownBerth && onBerth) section.append(tag); else tag.remove();
    const sentence = playing && (frame.base.announce || (variant === 'reduced' && t >= 800)) ? `Player ${subject.seat}: Healed.` : '';
    if (live && live.textContent !== sentence) live.textContent = sentence;
    // A film may shake the art layer, never its press areas: 1.5 px for 300 ms at the pulse (full only).
    const shake = variant === 'full' && t >= 3500 && t < 3800 ? (1 - beat(t, [3500, 3800])) * 1.5 : 0;
    art.style.translate = shake ? `${r2(noise(3, t / 28) * shake)}px ${r2(noise(5, t / 31) * shake)}px` : '';
    if (!playing) { await frames(); return { t, done: t >= end }; }
    const items = filmItems(frame, { berthId: film.berth, character: subject.character, surface: 'board', prefix: 'hb', inset: geo.inset, fit: geo.fit, detained: subject.detained, keepClear: geo.keepClear });
    const byZ = new Map();
    for (const item of items) byZ.set(item.z, (byZ.get(item.z) ?? '') + item.svg);
    for (const [z, markup] of [...byZ.entries()].sort((a, b) => a[0] - b[0])) {
      const node = doc.createElementNS(SVGNS, 'svg');
      node.setAttribute('viewBox', '0 0 1024 768');
      node.setAttribute('overflow', 'visible');
      node.dataset.film = 'cine-rescue';
      Object.assign(node.style, { position: 'absolute', left: `${fr.tx}px`, top: `${fr.ty}px`, width: `${1024 * fr.k}px`, height: `${768 * fr.k}px`, zIndex: String(z), pointerEvents: 'none' });
      node.innerHTML = markup;
      art.append(node);
      layers.push(node);
    }
    await frames();
    return { t, stage: frame.base.stage, done: false };
  };
  return { seek, end, size: [w, h], selector: '#stage iframe', fixture: { subject: subject.seat, berth: film.berth, fit: geo.fit, inset: geo.place?.place ?? null, leaves: leaves && !ownBerth } };
}

// ---------- the identity-free drone insert ----------

/** The insert: the ceiling dock's iris opening and the drone dropping through it, 1.4 s. No ward below, no person. */
export const INSERT = Object.freeze({ id: 'cine-hospital-drone-insert', end: 1400, open: Object.freeze([120, 420]), drop: Object.freeze([380, 1250]) });

/** One frame of the insert, 1920 x 1080: the ceiling in close-up (camera on the dock), its light, the drone's descent and its exit through the bottom of frame. */
export function insertSvg(t, { width = 1920, height = 1080 } = {}) {
  const prefix = 'hi';
  const zoom = lerp(5.6, 6.4, easeInOutCubic(clamp01(t / INSERT.end)));
  const center = [DOCK[0], DOCK[1] + 62 + 6 * easeInOutCubic(clamp01(t / INSERT.end))];
  const view = `translate(${width / 2} ${height / 2}) scale(${f(zoom)}) translate(${f(-center[0])} ${f(-center[1])})`;
  const open = t < INSERT.open[0] ? 0 : clamp01(easeOutBack(beat(t, INSERT.open), 2.2));
  const v = beat(t, INSERT.drop);
  const lens = [DOCK[0], lerp(DOCK[1] - 6, DOCK[1] + 190, easeInCubic(v))];
  const droneWidth = 120 * 1.42;
  const droneHeight = (droneWidth * DRONE.h) / DRONE.w;
  const drone = t >= INSERT.drop[0] ? placeSvg(droneSvg(v > 0.55 ? 'open' : 'folded'), { x: lens[0] - (DRONE.lens[0] / DRONE.w) * droneWidth, y: lens[1] - (DRONE.lens[1] / DRONE.h) * droneHeight, width: droneWidth, height: droneHeight }) : '';
  const blur = v > 0.35 && v < 0.98 ? ` filter="url(#${prefix}-mblur-v)"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-film="insert" data-t="${t}">`
    + fxDefs(prefix)
    + `<defs><filter id="${prefix}-mblur-v" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="0 ${f(2 + 5 * Math.sin(Math.PI * v))}"/></filter></defs>`
    + `<rect width="${width}" height="${height}" fill="#05070B"/>`
    + `<g transform="${view}"><use href="#pic-0"/>`
    + grade({ width: 1024, height: 768, color: '#1B2747', amount: 0.35, mode: 'multiply' })
    + irisSvg(prefix, open)
    + (open > 0 ? lightCone(prefix, 'insert', { from: [DOCK[0], DOCK[1] + 4], to: [DOCK[0], DOCK[1] + 210], spread: 70, color: MEDICAL.lens, opacity: 0.35 * open, near: 20 }) : '')
    + `<g${blur}>${drone}</g>`
    + (t >= INSERT.drop[0] ? lightPool(prefix, 'insert-lens', { cx: lens[0], cy: lens[1], rx: 18, color: '#FFFFFF', opacity: 0.6 }) : '')
    + `</g>`
    + vignette(prefix, { width, height, strength: 0.7 })
    + `<rect width="${width}" height="${height}" filter="url(#${prefix}-grain)" opacity="0.6"/>`
    + letterbox({ width, height, h: 0.085 * height })
    + `</svg>`;
}

export async function mountInsert(root, { width = 1920, height = 1080 } = {}) {
  const library = pictureLibrary(root, [WARD_PICTURES[0]]);
  await library.ready;
  const host = document.createElement('div');
  root.append(host);
  const seek = async t => { host.innerHTML = insertSvg(t, { width, height }); await frames(); return { t, done: t >= INSERT.end }; };
  return { seek, end: INSERT.end, size: [width, height], selector: '#stage', fixture: null };
}

/** The display's default: the board treatment on the display's own board, under everything selectable or read. */
export const mountDisplay = (root, { variant = 'full', w = 1920, h = 1080, roster = 9, case: which = 'free' } = {}) => mountPhone(root, { variant, w, h, roster, case: which });

export const PILOT_STAGE = Object.freeze({
  id: 'hospital-rescue', version: HOSPITAL_RESCUE_VERSION, variants: VARIANTS,
  surfaces: Object.freeze({ display: mountDisplay, cut: mountCut, phone: mountPhone, insert: mountInsert }),
});
