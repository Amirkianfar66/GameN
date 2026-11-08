// mothership:dev-only
//
// The pre-game films, in the order a player meets them: the brand intro on the app's first entry,
// their role's film in the role-reading stage, and the boarding before Round 1. Each entry gives the
// film's exact length, its frame function and the options a review page passes it.

import { BRAND, BRAND_MS, brandSvg } from './brand/brand.mjs';
import { ROLE_MS, roleCaptions, rolePageText, roleSvg } from './roles/film.mjs';
import { BOARDING_MS, BOARDING_TEXT, boardingSvg } from './boarding/boarding.mjs';
import { REVIEW_ROSTERS } from './boarding/roster.mjs';

export const FILMS = Object.freeze({
  brand: Object.freeze({
    duration: BRAND_MS,
    options: query => ({ variant: query.get('variant') === 'reduced' ? 'reduced' : 'full' }),
    svg: (t, o) => brandSvg(t, o),
    caption: () => BRAND.text,
  }),
  role: Object.freeze({
    duration: ROLE_MS,
    options: query => ({
      variant: query.get('variant') === 'reduced' ? 'reduced' : 'full',
      role: query.get('role') ?? 'doctor',
      character: query.get('character') ?? 'c3',
      seat: Number(query.get('seat') ?? 4),
    }),
    svg: (t, o) => roleSvg(t, o),
    boxes: (t, o) => roleCaptions(t, o),
    caption: (t, o) => rolePageText(t, o),
  }),
  boarding: Object.freeze({
    duration: BOARDING_MS,
    options: query => ({
      variant: query.get('variant') === 'reduced' ? 'reduced' : 'full',
      // A review roster (a synthetic fixture); a client passes its match's public roster.
      roster: REVIEW_ROSTERS[query.get('roster') ?? '8'],
    }),
    svg: (t, o) => boardingSvg(t, o),
    caption: () => BOARDING_TEXT,
  }),
});
