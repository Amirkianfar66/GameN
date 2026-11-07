// mothership:dev-only
//
// Library group 7: the match's end and recovery. The end is the one moment the sides are public,
// so this group alone draws in the faction accents (design/board-v2/fx/blocked.mjs FACTION_ACCENTS),
// and only in the side-specific pictures: each side's emblem and banner. Everything else (the Code
// plate, the no-survivors flatline, the connection and failure marks) keeps MIN_ACCENT_DISTANCE from
// every accent. The Blue and Red emblems are the arrival film's own planets
// (design/library/navigation/films.mjs planetSvg: the ringed Blue Planet, the cratered Red Planet
// with its moon), so the reveal reads as the arrival's ending; the Alien's emblem is the Blackhole's
// spiral. Shape tells every side apart, not only colour. No picture holds a word or a number.

import { FACTION_ACCENTS } from '../../board-v2/fx/blocked.mjs';
import { planetSvg } from '../navigation/films.mjs';

export const END_ART_VERSION = 'library-end-0.1.0';
/** The neutral palette (off every accent), and the side accents (side pictures only). */
export const N = Object.freeze({ ink: '#151923', paper: '#F4EBDD', cream: '#E6D8C0', steel: '#3A4A6B', navy: '#1B2747', plate: '#8D97A8', night: '#0D1422', amber: '#F2A33A', yellow: '#F7C52B' });
export const SIDE = Object.freeze({
  Blue: Object.freeze({ accent: FACTION_ACCENTS.blue, deep: '#1E4F9A' }),
  Red: Object.freeze({ accent: FACTION_ACCENTS.red, deep: '#8E2A1A' }),
  Alien: Object.freeze({ accent: FACTION_ACCENTS.alien, deep: '#4B2C7A' }),
});

function asset(name, about, w, h, body, stretch = false) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!--\n  Mothership · library art proposal · ${name} ${END_ART_VERSION} · generated, do not edit by hand\n  ${about}\n  Built by design/tools/library-assets.mjs from design/library/end/art.mjs. Not in the reviewed manifest design-0.2.0.\n-->\n`
    + `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${stretch ? ' preserveAspectRatio="none"' : ''}><g id="${name}">${body}</g></svg>\n`;
}

// ---------- emblems (48 x 48) ----------

const disc = (fill, rim) => `<circle cx="25.5" cy="25.5" r="21" fill="${N.ink}" opacity="0.4"/><circle cx="24" cy="24" r="21" fill="${fill}" stroke="${rim}" stroke-width="2.6"/>`;
export const EMBLEM_FILES = Object.freeze({ Blue: 'en-emblem-blue', Red: 'en-emblem-red', Alien: 'en-emblem-alien' });
export function emblemSvg(side) {
  if (side === 'Alien') {
    const spiral = 'M24 24 m0 -2 a2 2 0 1 1 -2 2 a4 4 0 0 1 4 -4 a6 6 0 0 1 6 6 a8 8 0 0 1 -8 8 a10 10 0 0 1 -10 -10 a12 12 0 0 1 12 -12 a14 14 0 0 1 14 14';
    return asset(EMBLEM_FILES.Alien, 'The Alien\'s emblem at the end: the Blackhole\'s spiral on night.', 48, 48, disc(N.night, N.ink) + `<path d="${spiral}" fill="none" stroke="${SIDE.Alien.accent}" stroke-width="2.6" stroke-linecap="round"/>`);
  }
  const planet = planetSvg(`en-${side.toLowerCase()}`, side, { cx: 24, cy: 24, r: 14, glow: 0.6 });
  return asset(EMBLEM_FILES[side], `The ${side} team's emblem at the end: the arrival film's ${side} Planet${side === 'Blue' ? ', ringed' : ', cratered, with its moon'}.`, 48, 48, disc(N.night, N.ink) + planet);
}

// ---------- banners (320 x 72, stretched) ----------

export const BANNER_FILES = Object.freeze({ Blue: 'en-banner-blue', Red: 'en-banner-red', none: 'en-banner-none' });
export function bannerSvg(kind) {
  const fill = kind === 'none' ? N.plate : SIDE[kind].accent, deep = kind === 'none' ? N.steel : SIDE[kind].deep;
  const shape = 'M8 10 H312 L300 36 L312 62 H8 L20 36 Z';
  const body = `<path d="${shape}" transform="translate(3 4)" fill="${N.ink}" opacity="0.4"/><path d="${shape}" fill="${fill}" stroke="${N.ink}" stroke-width="3" stroke-linejoin="round"/>`
    + `<path d="M28 18 H292 M28 54 H292" stroke="${deep}" stroke-width="2.4" opacity="0.7"/>`;
  const about = kind === 'none' ? 'The ending\'s banner when there is no winner (no survivors): plate grey.' : `The ${kind} team's winning banner: the ${kind} accent, a notched ribbon; the words are page text.`;
  return asset(BANNER_FILES[kind], about, 320, 72, body, true);
}

// ---------- the Code plate, the flatline, the connection and failure marks ----------

/** The Code's plate: four sunken slots for the four player numbers (page text). */
export function codePlateSvg() {
  const slots = [0, 1, 2, 3].map(i => `<rect x="${16 + i * 46}" y="12" width="38" height="32" rx="5" fill="${N.night}" stroke="${N.ink}" stroke-width="2"/>`).join('');
  return asset('en-code', 'The Code\'s plate at the end: four sunken slots for the four player numbers, which are page text.', 200, 56, `<rect x="3" y="5" width="194" height="48" rx="9" fill="${N.ink}" opacity="0.4"/><rect x="1" y="2" width="194" height="48" rx="9" fill="${N.steel}" stroke="${N.ink}" stroke-width="2.6"/>${slots}`);
}
/** No survivors: a monitor strip with one flat line. */
export function flatlineSvg() {
  const body = `<rect x="0" y="0" width="320" height="64" fill="${N.night}"/><path d="M0 16 H320 M0 32 H320 M0 48 H320" stroke="${N.steel}" stroke-width="1" opacity="0.5"/>`
    + `<path d="M0 34 H120 L128 28 L134 38 L140 34 H320" stroke="${N.plate}" stroke-width="2.6" fill="none" stroke-linejoin="round"/><path d="M0 62 H320" stroke="${N.ink}" stroke-width="4"/>`;
  return asset('en-flatline', 'The no-survivors strip: a monitor line gone flat (plate grey, never a side\'s colour).', 320, 64, body, true);
}
/** Reconnecting: an antenna with its arcs. */
export function signalSvg() {
  const body = `<path d="M16 28 V14" stroke="${N.ink}" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="12" r="3.2" fill="${N.amber}" stroke="${N.ink}" stroke-width="1.8"/>`
    + `<path d="M9.5 6.5 A9 9 0 0 0 9.5 17.5 M22.5 6.5 A9 9 0 0 1 22.5 17.5 M5 3 A14 14 0 0 0 5 21 M27 3 A14 14 0 0 1 27 21" stroke="${N.ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  return asset('en-signal', 'The reconnecting mark: an antenna with its arcs.', 32, 32, body);
}
/** A picture or film that did not load: a frame with a torn corner. */
export function brokenSvg() {
  const body = `<path d="M4 6 H22 L28 12 V26 H4 Z" fill="${N.cream}" stroke="${N.ink}" stroke-width="2.4" stroke-linejoin="round"/><path d="M22 6 V12 H28" fill="${N.paper}" stroke="${N.ink}" stroke-width="2" stroke-linejoin="round"/>`
    + `<path d="M8 22 L13 15 L17 19 L20 16 L24 22 Z" fill="${N.plate}"/><path d="M6 27 L27 6" stroke="${N.ink}" stroke-width="2" opacity="0.45"/>`;
  return asset('en-broken', 'The failed-picture mark: a picture frame with its corner torn.', 32, 32, body);
}

/** Every picture of group 7, by name. */
export function endAssets() {
  const out = {};
  for (const side of ['Blue', 'Red', 'Alien']) out[EMBLEM_FILES[side]] = { svg: emblemSvg(side), size: '48x48', role: `public at the end: the ${side} emblem`, about: `The ${side === 'Alien' ? 'Alien\'s' : `${side} team's`} emblem in the end reveal, beside its side's roles.` };
  for (const kind of ['Blue', 'Red', 'none']) out[BANNER_FILES[kind]] = { svg: bannerSvg(kind), size: '320x72', role: `public at the end: the ${kind === 'none' ? 'no-winner' : `${kind} winning`} banner`, about: kind === 'none' ? 'The ending\'s banner when there is no winner.' : `The ${kind} team's winning banner over the end reveal.` };
  out['en-code'] = { svg: codePlateSvg(), size: '200x56', role: 'public at the end: the Code\'s plate', about: 'The Code\'s plate in the end reveal; the four numbers are page text.' };
  out['en-flatline'] = { svg: flatlineSvg(), size: '320x64', role: 'public at the end: no survivors', about: 'The no-survivors strip under the banner: a flat line.' };
  out['en-signal'] = { svg: signalSvg(), size: '32x32', role: 'own screen: reconnecting', about: 'The reconnecting mark in the connection strip.' };
  out['en-broken'] = { svg: brokenSvg(), size: '32x32', role: 'own screen: a failed picture', about: 'The mark that stands in for a picture or a film that did not load.' };
  return out;
}
