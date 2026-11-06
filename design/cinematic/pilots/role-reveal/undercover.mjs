// mothership:dev-only
//
// The Undercover's three panels (docs/design/cinematic/role-reveal.md, "Undercover"): the agent with
// no name on any list, told around the player's own character:
//   1  Red Planet intelligence (memory, in sepia): a street lamp in the dust rain, the player's
//      character leaning on its post; in front, an open personnel file with no name in it (DRIP)
//   2  armed (memory): a pistol slides into a shoulder holster
//   3  aboard, now: the player's character beside a silhouette; a shield mark settles on the
//      silhouette's shoulder and glows once
// What the pictures show: one gun, and a protection given to another player; the role card says
// when the gun shoots and how often protection is given. The shield is paper and amber light,
// never a team colour; the protected figure is a silhouette with no face, number or name.
//
// Each panel is a pure function (local ms since the panel slammed in, { w, h, prefix, seat, character, reduced })
// -> SVG markup, drawn for a nominal 828 x 480 panel and scaled to its height (stagecraft.mjs shot()).

import { skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { AMBER, INK, lightCone, lightPool, ring, streaks } from '../../lib/comic.mjs';
import { beat, easeOutBack, easeOutCubic } from '../../lib/ease.mjs';
import { NIGHT, lampFlicker, motes, sfxSvg } from './art.mjs';
import { NOMINAL, breathe, floor, hero, shot, silhouette } from './stagecraft.mjs';

const f = v => Number((+v).toFixed(2));
/** The street's, the file's and the cabin's own fills (held clear of the faction accents by the palette test). */
const STREET = Object.freeze({ facade: '#2B2A2E', facadeLit: '#3D3B3F', window: '#E9D9A8', post: '#3A3F48', table: '#4A3B2C', folder: '#C9A867', folderShade: '#9C7F45', paper: '#E9E1CC', strap: '#3A2A1E', strapLit: '#6A5038', gun: '#727A88', gunLit: '#C3CAD4', shield: '#F4EBDD' });

/** A pistol in profile at (x, y) (its grip's foot), pointing `dir` (1 right, -1 left), at `scale`. */
function pistol({ x, y, dir = 1, scale = 1, angle = 0 }) {
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)}) scale(${f(dir * scale)} ${f(scale)})">`
    + `<path d="M0 0L-10 -62Q-10 -70 -2 -70H118Q128 -70 128 -60V-44Q128 -36 118 -36H34L28 -24Q24 -16 16 -16H22L26 0Z" fill="${STREET.gun}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="M-4 -64H120" stroke="${STREET.gunLit}" stroke-width="3" opacity="0.85"/>`
    + `<path d="M30 -34Q38 -14 54 -18" fill="none" stroke="${INK}" stroke-width="4"/>`
    + `<path d="M-2 -10L-8 -54" stroke="${INK}" stroke-width="2" opacity="0.6"/></g>`;
}

/** An open personnel file: a photograph with no face, typed lines, and the name field left blank. */
function emptyFile({ x, y }) {
  let lines = '';
  for (let i = 0; i < 5; i += 1) lines += `<rect x="${x + 196}" y="${y + 66 + i * 18}" width="${92 - (i % 3) * 18}" height="6" rx="2" fill="${STREET.folderShade}" opacity="0.8"/>`;
  return `<path d="M${x} ${y + 10}L${x + 150} ${y}L${x + 160} ${y + 140}L${x + 6} ${y + 150}Z" fill="${STREET.folder}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
    + `<path d="M${x + 156} ${y}L${x + 310} ${y + 8}L${x + 304} ${y + 150}L${x + 162} ${y + 140}Z" fill="${STREET.paper}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
    + `<rect x="${x + 30}" y="${y + 30}" width="90" height="100" fill="#8C877A" stroke="${INK}" stroke-width="3" transform="rotate(-3 ${x + 75} ${y + 80})"/>`
    + `<circle cx="${x + 75}" cy="${y + 66}" r="17" fill="${NIGHT.figure}"/><path d="M${x + 44} ${y + 126}Q${x + 75} ${y + 84} ${x + 106} ${y + 126}Z" fill="${NIGHT.figure}"/>`
    // The name field: a ruled line with nothing on it.
    + `<path d="M${x + 196} ${y + 40}H${x + 290}" stroke="${INK}" stroke-width="3"/>`
    + lines;
}

/**
 * Panel 1 (memory): Red Planet intelligence. A street at night in the dust rain; the player's
 * character leans on a street lamp's post under its light; in front, on a café table, an open
 * personnel file with no name in it, the rain dripping on it (DRIP).
 */
export function panelStreet(local, { w, h, prefix, character = 'c4', reduced = false }) {
  const t = local;
  const root = prefix.split('-p')[0];
  // The street's facades, their windows lit here and there.
  let facades = '';
  [[0, 40, 260, 400], [270, 0, 250, 440], [530, 60, 300, 380]].forEach(([fx, fy, fw, fh], b) => {
    facades += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="${b % 2 ? STREET.facadeLit : STREET.facade}" stroke="${INK}" stroke-width="4"/>`;
    for (let wy = fy + 30; wy < fy + fh - 60; wy += 64) {
      for (let wx = fx + 24; wx < fx + fw - 40; wx += 58) {
        const lit = ((wx * 7 + wy * 3 + b) % 5) < 2;
        facades += `<rect x="${wx}" y="${wy}" width="32" height="40" fill="${lit ? STREET.window : '#18171A'}" stroke="${INK}" stroke-width="3" opacity="${lit ? 0.9 : 1}"/>`;
      }
    }
  });
  const on = reduced ? 1 : lampFlicker(t, 17) * 0.2 + 0.8;
  const far = facades
    + `<rect width="${NOMINAL[0]}" height="${NOMINAL[1]}" fill="${NIGHT.deep}" opacity="0.35"/>`
    + streaks({ x: 0, y: 0, w: NOMINAL[0], h: NOMINAL[1], angle: 72, count: 50, seed: 141, color: '#E9D9B8', width: 2, length: 0.25, opacity: 0.4, phase: reduced ? 0 : t / 600 });
  // The street lamp: its post, its head, its cone of light down to the wet pavement.
  const post = `<path d="M560 480V60" stroke="${INK}" stroke-width="16"/><path d="M560 480V60" stroke="${STREET.post}" stroke-width="9"/>`
    + `<path d="M556 470V70" stroke="${NIGHT.steelPale}" stroke-width="2.5" opacity="0.5"/>`
    + `<path d="M560 64Q560 40 590 40H620" fill="none" stroke="${INK}" stroke-width="12"/><path d="M560 64Q560 40 590 40H620" fill="none" stroke="${STREET.post}" stroke-width="6"/>`
    + `<path d="M596 40L604 30H644L652 40Z" fill="${NIGHT.steelLit}" stroke="${INK}" stroke-width="4"/>`
    + `<ellipse cx="624" cy="44" rx="22" ry="6" fill="#FFF3C4" opacity="${f(0.5 + 0.5 * on)}"/>`
    + lightCone(prefix, 'street', { from: [624, 48], to: [600, 470], spread: 190, color: '#FFE7A3', opacity: 0.32 * on, near: 22 })
    + lightPool(prefix, 'street-bulb', { cx: 624, cy: 46, rx: 80, ry: 50, color: '#FFE7A3', opacity: 0.5 * on })
    + lightPool(prefix, 'pavement', { cx: 600, cy: 460, rx: 220, ry: 40, color: '#FFE7A3', opacity: 0.3 * on });
  // The player's character leaning on the post, arms folded, a foot up against it.
  const at = [610, 500];
  const leaner = hero(prefix, { character, sk: skeletonOf('wallLean'), at, scale: 1.55, mirror: true });
  const middle = floor(prefix, { y: 450, color: '#121418' }) + post
    + (reduced ? leaner : `<g transform="${breathe(t, at, 0.4, 0.008)}">${leaner}</g>`)
    + motes({ x: 520, y: 80, w: 200, h: 360, t, count: 12, seed: 149, color: '#FFE7A3', opacity: 0.45, reduced });
  // The café table in front with the file on it, and the drop that lands on the file.
  const drip = reduced ? 0.5 : (t % 1000) / 1000;
  const dropY = 150 + 230 * Math.min(1, drip / 0.45);
  const table = `<path d="M-20 400H420V480H-20Z" fill="${STREET.table}" stroke="${INK}" stroke-width="5"/>`
    + `<path d="M-20 402H420" stroke="${NIGHT.rim}" stroke-width="2.5" opacity="0.5"/>`
    + `<rect x="-20" y="400" width="440" height="80" fill="url(#${root}-dots)" opacity="0.25"/>`;
  const file = `<g transform="translate(60 312) rotate(-4)">${emptyFile({ x: 0, y: 0 })}</g>`;
  // A drop falls onto the file, then its splash spreads.
  const drop = drip < 0.45
    ? `<path d="M224 ${f(dropY - 14)}Q232 ${f(dropY)} 224 ${f(dropY + 6)}Q216 ${f(dropY)} 224 ${f(dropY - 14)}Z" fill="${NIGHT.rim}" opacity="0.8"/>`
    : `<ellipse cx="224" cy="384" rx="${f(6 + 30 * (drip - 0.45))}" ry="${f(2 + 8 * (drip - 0.45))}" fill="none" stroke="${NIGHT.rim}" stroke-width="2" opacity="${f(0.8 * (1 - drip))}"/>`;
  const near = table + file + drop
    + sfxSvg('DRIP', { x: 300, y: 250, size: 40, rotate: -6, pop: reduced ? 1 : easeOutBack(beat(t % 1000, [450, 600]), 1.8), opacity: reduced ? 1 : 1 - beat(t % 1000, [800, 990]) });
  return shot(w, h, { far, middle, near }, { local: t, focus: [480, 300] });
}

/**
 * Panel 2 (memory): armed. Close on a shoulder: the holster's strap across the chest, and a pistol
 * sliding down into the holster under the arm.
 */
export function panelHolster(local, { w, h, prefix, reduced = false }) {
  const t = local;
  const far = lightPool(prefix, 'key', { cx: 300, cy: 180, rx: 380, ry: 260, color: '#FFE7A3', opacity: 0.22 });
  // A big silhouette, chest and shoulder filling the panel, rim-lit from the upper left.
  const body = silhouette(`${prefix}-agent`, { gesture: 'stand', at: [430, 900], scale: 4.2, rim: [-8, -8] });
  // The strap over the near shoulder down to the holster, the cross strap over the chest, a buckle.
  const band = (d, wide = 22) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${wide + 8}"/><path d="${d}" fill="none" stroke="${STREET.strap}" stroke-width="${wide}"/>`;
  const strap = band('M486 140Q560 170 592 262') + band('M330 262Q450 300 572 296', 18)
    + `<path d="M490 136Q562 166 596 256" fill="none" stroke="${STREET.strapLit}" stroke-width="3" opacity="0.8"/>`
    + `<rect x="430" y="276" width="28" height="22" rx="4" fill="${NIGHT.steelPale}" stroke="${INK}" stroke-width="3" transform="rotate(12 444 287)"/>`;
  const pouch = 'M560 250Q600 246 620 270L640 420Q630 446 600 440L560 300Z';
  const holster = `<path d="${pouch}" fill="${STREET.strap}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
    + `<path d="M566 260Q600 256 614 276" fill="none" stroke="${STREET.strapLit}" stroke-width="3"/>`;
  // The pistol shows only outside the holster's pouch: it goes in, and its grip stays out.
  const mouth = `<defs><clipPath id="${prefix}-mouth"><path d="M-200 -200H1100V700H-200Z ${pouch}" clip-rule="evenodd"/></clipPath></defs>`;
  // The pistol slides down, muzzle first, into the holster; a gloved hand on its grip lets go.
  const v = reduced ? 1 : easeOutCubic(beat(t, [80, 620]));
  const gy = 120 + 150 * v;
  const gun = pistol({ x: 600, y: gy, dir: 1, scale: 1.25, angle: 100 });
  const glove = v < 1 ? `<g transform="translate(608 ${f(gy - 6)}) rotate(10)" opacity="${f(1 - beat(t, [540, 700]))}"><rect x="-40" y="-30" width="84" height="60" rx="22" fill="#20242C" stroke="${NIGHT.rim}" stroke-width="2.5"/><path d="M-26 -12H36M-26 4H36M-26 18H36" stroke="${INK}" stroke-width="2.4"/></g>` : '';
  const middle = body + strap;
  const near = holster + mouth + `<g clip-path="url(#${prefix}-mouth)">${gun}</g>` + glove;
  return shot(w, h, { far, middle, near }, { local: t, focus: [520, 260], push: 0.06 });
}

/**
 * Panel 3 (now, aboard): the shield. In a corridor aboard, the player's character beside a
 * silhouette; a shield mark settles on the silhouette's shoulder and glows once.
 */
export function panelShield(local, { w, h, prefix, character = 'c4', reduced = false }) {
  const t = local;
  let ribs = '';
  for (let rx = 0; rx <= NOMINAL[0]; rx += 104) ribs += `<rect x="${rx}" y="0" width="10" height="440" fill="${NIGHT.steelShadow}" stroke="${INK}" stroke-width="2"/>`;
  const far = ribs
    + `<rect x="160" y="14" width="500" height="12" rx="5" fill="#FFF3C4" stroke="${INK}" stroke-width="4"/>`
    + lightPool(prefix, 'strip', { cx: 414, cy: 200, rx: 380, ry: 240, color: NIGHT.slat, opacity: 0.2 });
  // The silhouette on the right and the player's character on the left, facing each other.
  const them = [560, 480], me = [270, 480];
  const other = silhouette(`${prefix}-ally`, { gesture: 'standFolded', at: them, scale: 1.55, rim: [5, -4], mirror: true });
  const self = hero(prefix, { character, sk: skeletonOf('stand'), at: me, scale: 1.6 });
  // The shield mark settles on the silhouette's shoulder, and a ring of light goes out from it once.
  const s = reduced ? 1 : easeOutBack(beat(t, [180, 460]), 1.6);
  const glow = reduced ? 0 : beat(t, [420, 1000]);
  const sx = them[0] - 36, sy = them[1] - 236;
  const shield = s > 0 ? `<g transform="translate(${f(sx)} ${f(sy)}) scale(${f(s)})">`
    + `<path d="M0 -30L26 -20V4Q26 24 0 36Q-26 24 -26 4V-20Z" fill="${STREET.shield}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="M0 -20L16 -14V4Q16 16 0 24Q-16 16 -16 4V-14Z" fill="none" stroke="${AMBER}" stroke-width="4" stroke-linejoin="round"/>`
    + `</g>` + lightPool(prefix, 'shield', { cx: sx, cy: sy, rx: 70, ry: 70, color: '#FFF3C4', opacity: 0.45 * s }) : '';
  const wave = glow > 0 && glow < 1 ? ring({ cx: sx, cy: sy, r: 30 + 160 * glow, width: 5, color: '#FFF3C4', opacity: 0.8 * (1 - glow) }) : '';
  const middle = floor(prefix, { color: '#10151F' })
    + (reduced ? other : `<g transform="${breathe(t, them, 1.3, 0.008)}">${other}</g>`)
    + (reduced ? self : `<g transform="${breathe(t, me, 0.1, 0.008)}">${self}</g>`);
  return shot(w, h, { far, middle, near: shield + wave }, { local: t, focus: [420, 260] });
}

/** The Undercover's panels, in order. */
export const UNDERCOVER_PANELS = Object.freeze([panelStreet, panelHolster, panelShield]);
