// mothership:dev-only
//
// Pilot 3's composition: the comic page at t as one SVG over the display's board, its panels drawn
// from the approved art (the rooms' scene pictures, the capsule's layers) and the approved rig, the
// participants placed and posed by S2's own functions (homePerson(), capsulePerson()). Inputs are
// the public pair and the board's public seats (a synthetic fixture on the review stage).

import { CREW } from '../../../board-motion/figures/crew.mjs';
import { INJURED, skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { outfitFor } from '../../../board-motion/figures/wardrobe.mjs';
import { capsuleFrame, capsulePerson, homePerson } from '../../../board-v2/films/capsule.mjs';
import { statusOf } from '../../../board-v2/figures/capsule.mjs';
import { DOOR, DOOR_FRAMES } from '../../../board-v2/scenes/capsule.mjs';
import { INK, PAPER, fxDefs, lightPool, panelFrame } from '../../lib/comic.mjs';
import { bell, beat, clamp01, r2 } from '../../lib/ease.mjs';
import { lettering } from '../../lib/lettering.mjs';
import { compose, figureItems, scenePicture } from '../../lib/scene.mjs';
import { LAYOUT, PAGE, pageFrame } from './film.mjs';

const f = v => Number((+v).toFixed(2));
const kebab = id => id.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
export const ROOM_ART = '../board-motion/assets/scenes';
export const CAPSULE_ART = '../board-v2/assets/capsule';

/** A seat's drawn gesture at its slot (page.js drawFigure()'s rule). */
const gestureAt = (slot, health) => (health === 'Eliminated' ? slot.down : health === 'Injured' ? `${slot.gesture}${INJURED}` : slot.gesture);

/** The scene pictures a room panel stacks (page.js scenePictures()'s, for a room other than the Hospital). */
export function roomPictures(room, scenes) {
  const scene = scenes[room];
  return [{ href: `${ROOM_ART}/${room}.back.svg`, z: 0 }, ...Object.entries(scene.layers ?? {}).map(([id, layer]) => ({ href: `${ROOM_ART}/${room}.${kebab(id)}.svg`, z: Math.round(layer.depth) * 2 + 1 }))];
}

/** A name tag, the board's (drawTag()): the seat's number and its character's sign, centred under (x, y), in px. */
function tagSvg(seat, x, y, scale = 1) {
  const sign = CREW[seat.character].sign;
  const w = (16 + sign.length * 7.6) * scale, h = 18 * scale;
  return `<g transform="translate(${f(x - w / 2)} ${f(y)})"><rect width="${f(w)}" height="${f(h)}" rx="${f(3 * scale)}" fill="${PAPER}" stroke="${INK}" stroke-width="${f(2 * scale)}"/>`
    + `<rect width="${f(14 * scale)}" height="${f(h)}" rx="${f(3 * scale)}" fill="${INK}"/>`
    + `<text x="${f(7 * scale)}" y="${f(13 * scale)}" font-family="system-ui, sans-serif" font-weight="800" font-size="${f(11 * scale)}" fill="${PAPER}" text-anchor="middle">${seat.seat}</text>`
    + `<text x="${f(18 * scale)}" y="${f(13 * scale)}" font-family="system-ui, sans-serif" font-weight="700" font-size="${f(11 * scale)}" fill="${INK}">${sign}</text></g>`;
}

/** Where a panel looks, in scene units: its scale k and the scene point at its centre, clamped to the scene. */
function panelCamera(panel, k, center, [sw, sh]) {
  const hx = panel.w / 2 / k, hy = panel.h / 2 / k;
  return { k, center: [Math.min(sw - hx, Math.max(hx, center[0])), Math.min(sh - hy, Math.max(hy, center[1]))] };
}

/**
 * The page at t. ctx: { pair: [P1 seat, P2 seat] (board seats: { seat, character, room, slot, health, jailed }),
 * seats (every seat on the board), slotsOf(room), scenes (board-motion SCENES), exchangeId, reduced }.
 * Returns { svg, frame, page }.
 */
export function pageSvg(caseName, t, ctx) {
  const { width, height } = LAYOUT;
  const prefix = 'pt';
  const page = pageFrame(caseName, t, { reduced: ctx.reduced });
  if (page.done) return { svg: '', page, frame: null };
  const s2 = capsuleFrame(page.s2.stage, page.s2.t, { reduced: ctx.reduced });
  const ids = ['P1', 'P2'];
  const panels = [];
  // ---------- each participant's room ----------
  ids.forEach((id, index) => {
    const v = page.panels[id];
    if (v <= 0) return;
    const seat = ctx.pair[index];
    const box = LAYOUT[id];
    const slot = ctx.slotsOf(seat.room).find(entry => entry.id === seat.slot);
    const rest = skeletonOf(gestureAt(slot, seat.health));
    const status = statusOf(seat);
    const outfit = outfitFor(ctx.location(seat.room));
    const cam = panelCamera(box, 1.45, [slot.pressAt[0] + 64, slot.pressAt[1] + 24], [1024, 768]);
    const items = roomPictures(seat.room, ctx.scenes).map(pic => scenePicture(pic.href, pic.z));
    // The room's other occupants, as the board draws them.
    for (const other of ctx.seats.filter(entry => entry.room === seat.room && entry.seat !== seat.seat)) {
      const os = ctx.slotsOf(other.room).find(entry => entry.id === other.slot);
      items.push(...figureItems({ character: other.character, sk: skeletonOf(gestureAt(os, other.health)), outfit, at: os.at, scale: os.scale, mirror: os.mirror, depth: os.depth, prefix: `${prefix}${id}o${other.seat}` }));
    }
    const person = s2.people[id];
    let tagAt = slot.pressAt;
    if (person) {
      const ghost = person.home.ghost;
      if (ghost > 0) {
        // The away marker: the figure at its place, gray and faint, with the capsule's badge (S2's).
        const marker = figureItems({ character: seat.character, sk: rest, outfit, at: slot.at, scale: slot.scale, mirror: slot.mirror, depth: slot.depth, prefix: `${prefix}${id}g`, opacity: S2_AWAY * ghost });
        for (const item of marker) items.push({ ...item, svg: `<g filter="url(#${prefix}-gray)">${item.svg}</g>` });
        items.push({ z: 3000, svg: `<image href="${CAPSULE_ART}/badge.svg" x="${f(slot.badgeAt[0] - 24)}" y="${f(slot.badgeAt[1] - 24)}" width="48" height="48" opacity="${f(ghost)}"/>` });
      }
      if (person.home.figure > 0) {
        const drawn = homePerson(slot, person.home, rest, status);
        items.push(...figureItems({ character: seat.character, sk: drawn.sk, outfit, at: drawn.at, scale: drawn.scale, mirror: drawn.mirror, depth: slot.depth, prefix: `${prefix}${id}h`, opacity: person.home.figure }));
        // Speed lines behind a participant stepping out or back in.
        if (['stepping', 'returning'].includes(person.home.state)) {
          const dir = person.home.state === 'stepping' ? -1 : 1;
          const [ax, ay] = drawn.at;
          const lines = [0, 1, 2].map(i => `M${f(ax + dir * (40 + i * 6) * drawn.scale)} ${f(ay - (80 + i * 36) * drawn.scale)}h${f(dir * (46 - i * 8) * drawn.scale)}`).join('');
          items.push({ z: 2990, svg: `<path d="${lines}" stroke="${INK}" stroke-width="${f(4 * drawn.scale)}" stroke-linecap="round" opacity="${f(0.7 * bell(person.home.progress))}"/>` });
        }
        tagAt = [drawn.at[0], slot.pressAt[1]];
      }
    }
    panels.push({ id, box, cam, items, v, slam: page.slam[id], tag: { seat, at: tagAt } });
  });
  // ---------- the capsule ----------
  if (page.panels.capsule > 0) {
    const box = LAYOUT.capsule;
    const k = Math.max(box.w / 512, box.h / 768);
    const cam = panelCamera(box, k, [256, 400], [512, 768]);
    const door = Math.max(0, Math.min(DOOR_FRAMES - 1, s2.door));
    const items = [scenePicture(`${CAPSULE_ART}/back.svg`, 0), scenePicture(`${CAPSULE_ART}/door-${door}.svg`, 1)];
    for (const item of items) item.svg = item.svg.replace('width="1024"', 'width="512"');
    if (s2.busy) items.push({ ...scenePicture(`${CAPSULE_ART}/busy.svg`, 50), svg: scenePicture(`${CAPSULE_ART}/busy.svg`, 50).svg.replace('width="1024"', 'width="512"') });
    const tags = [];
    ids.forEach((id, index) => {
      const person = s2.people[id];
      if (!person || person.capsule.opacity <= 0) return;
      const seat = ctx.pair[index];
      const drawn = capsulePerson(id, person.capsule, statusOf(seat), { exchangeId: ctx.exchangeId, talkMs: caseName === 'talk' ? page.s2.t : 0, reduced: ctx.reduced });
      if (!drawn) return;
      items.push(...figureItems({ character: seat.character, sk: drawn.sk, outfit: outfitFor(ctx.location(seat.room)), at: drawn.at, scale: drawn.scale, mirror: drawn.mirror, depth: 10 + drawn.at[1] / 100, prefix: `${prefix}${id}c`, opacity: person.capsule.opacity }));
      if (person.capsule.state === 'seated') tags.push({ seat, at: [drawn.at[0], 662] });
    });
    // The door's comic accents: its slide (SHHK) and, once closed with the pair inside, the busy light's glow.
    const e = PAGE[caseName];
    const doorMoving = s2.door > 0 && s2.door < DOOR_FRAMES - 1;
    if (!ctx.reduced && doorMoving) items.push({ z: 60, svg: lettering('SHHK', { x: (DOOR.x0 + DOOR.x1) / 2 + 70, y: DOOR.top - 10, size: 22, fill: '#BFE8FF', highlight: '#FFFFFF', rotate: -6, opacity: 0.95 }) });
    if (s2.busy) items.push({ z: 49, svg: lightPool(prefix, 'busy', { cx: (DOOR.x0 + DOOR.x1) / 2, cy: DOOR.top - DOOR.frame - 2, rx: 60, ry: 34, color: '#F2C14E', opacity: 0.45 + 0.15 * Math.sin(t / 300) }) });
    panels.push({ id: 'capsule', box, cam, items, v: page.panels.capsule, slam: page.slam.capsule, tags, e });
  }
  // ---------- the page ----------
  let body = '';
  for (const panel of panels) {
    const { box, cam } = panel;
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const s = 1 + panel.slam;
    const clip = `${prefix}-clip-${panel.id}`;
    const view = `translate(${f(cx)} ${f(cy)}) scale(${f(cam.k)}) translate(${f(-cam.center[0])} ${f(-cam.center[1])})`;
    let tags = '';
    const toPx = ([x, y]) => [cx + (x - cam.center[0]) * cam.k, cy + (y - cam.center[1]) * cam.k];
    if (panel.tag) { const [x, y] = toPx(panel.tag.at); tags += tagSvg(panel.tag.seat, x, Math.min(box.y + box.h - 30, y + 30), 1.25); }
    for (const tag of panel.tags ?? []) { const [x, y] = toPx(tag.at); tags += tagSvg(tag.seat, x, Math.min(box.y + box.h - 30, y), 1.25); }
    body += `<g opacity="${f(panel.v)}" transform="translate(${f(cx)} ${f(cy)}) scale(${f(s)}) translate(${f(-cx)} ${f(-cy)})">`
      + `<defs><clipPath id="${clip}"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"/></clipPath></defs>`
      + `<rect x="${box.x + 9}" y="${box.y + 11}" width="${box.w}" height="${box.h}" fill="${INK}"/>`
      + `<g clip-path="url(#${clip})"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="#0B1020"/><g transform="${view}">${compose(panel.items)}</g>${tags}</g>`
      + panelFrame({ x: box.x, y: box.y, w: box.w, h: box.h, border: 7, shadow: false })
      + `</g>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-film="private-talk-${caseName}">`
    + fxDefs(prefix)
    + `<defs><filter id="${prefix}-gray"><feColorMatrix type="saturate" values="0"/></filter></defs>`
    + `<rect width="${width}" height="${height}" fill="#05070B" opacity="${f(page.dim)}"/>`
    + `<rect width="${width}" height="${height}" fill="url(#${prefix}-dots)" opacity="${f(0.18 * page.dim)}"/>`
    + body
    + `</svg>`;
  return { svg, page, frame: s2 };
}

/** S2's away marker's opacity (CAPSULE_FILM.away.opacity). */
const S2_AWAY = 0.35;

export { clamp01, beat, r2 };
