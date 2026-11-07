// mothership:dev-only
//
// The two openings on the cinematic stage (../../stage.html), each on a phone (w x h) or the shared
// display (1920 x 1080 unless given):
//   pilot=brand-intro     the 2,000 ms app brand intro
//   pilot=boarding        the 10,000 ms crew boarding; roster=7|8|9 picks a review roster, or
//                         crew=c3,c1,... (seat order) gives one; every character is public;
//                         layer=environment|crew draws one layer alone
// A review page, not a client: the rosters are synthetic review fixtures and no server stage exists
// yet (docs/design/cinematic/openings.md, "Integration"). The page text (the brand's words, the
// boarding's description) is set on the stage for screen readers; nothing is drawn as text.

import { frames } from '../../lib/stage-kit.mjs';
import { brandSvg } from './brand.mjs';
import { boardingSvg } from './boarding.mjs';
import { BOARDING_END, BRAND_END, OPENINGS_VERSION, VARIANTS } from './film.mjs';
import { reviewRoster, rosterFromCrew } from './roster.mjs';

function surface(root, w, h, label) {
  root.style.width = `${w}px`; root.style.height = `${h}px`;
  root.style.position = 'relative'; root.style.overflow = 'hidden'; root.style.background = '#07090F';
  root.setAttribute('aria-label', label);
  const host = document.createElement('div');
  Object.assign(host.style, { position: 'absolute', left: '0', top: '0', width: `${w}px`, height: `${h}px` });
  root.append(host);
  return host;
}

const mountBrand = (defaults) => async (root, { variant = 'full', w = defaults[0], h = defaults[1] } = {}) => {
  const host = surface(root, w, h, 'Game N, by Plan B');
  const seek = async t => {
    const out = brandSvg(t, { variant, width: w, height: h });
    host.innerHTML = out.svg;
    await frames();
    return { t, stage: out.frame.done ? 'done' : null, done: t >= BRAND_END };
  };
  return { seek, end: BRAND_END, size: [w, h], selector: '#stage', fixture: { synthetic: false, inputs: 'none' } };
};

const mountBoarding = (defaults) => async (root, { variant = 'full', w = defaults[0], h = defaults[1], roster = 9, crew = null, layer = 'all', case: size = null } = {}) => {
  // The gallery names the roster's size as its case (9, 8 or 7).
  const members = crew ? rosterFromCrew(crew) : reviewRoster(Number(size ?? roster));
  const host = surface(root, w, h, `The crew of ${members.length} boards the Mothership`);
  const seek = async t => {
    const out = boardingSvg(t, { variant, roster: members, width: w, height: h, layer });
    host.innerHTML = out.svg;
    await frames();
    return { t, stage: out.frame.world, done: t >= BOARDING_END };
  };
  return { seek, end: BOARDING_END, size: [w, h], selector: '#stage', fixture: { synthetic: true, roster: members } };
};

export const BRAND_STAGE = Object.freeze({
  id: 'brand-intro', version: OPENINGS_VERSION, variants: VARIANTS,
  surfaces: Object.freeze({ phone: mountBrand([390, 844]), display: mountBrand([1920, 1080]) }),
});

export const BOARDING_STAGE = Object.freeze({
  id: 'boarding', version: OPENINGS_VERSION, variants: VARIANTS,
  surfaces: Object.freeze({ phone: mountBoarding([390, 844]), display: mountBoarding([1920, 1080]) }),
});
