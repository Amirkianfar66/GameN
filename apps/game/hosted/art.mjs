// All phones request the same complete bundles before any match view is read. A role,
// character selection or private action can never choose a URL or cause a later fetch.
export const ART_BUNDLES = Object.freeze({
  'public-board': '/art/public-board.art.1f47b9f920.css',
  'player-ui': '/art/player-ui.art.fc4830756c.css',
  roles: '/art/roles.art.14e56b5e3e.css',
  'scene-art': '/art/scenes.art.0ff8b3c930.css',
  abilities: '/art/abilities.art.f7ff31a86d.css',
});

// Reviewed common candidate supplement. Historical release bundles/pins are unchanged.
export const BOARD_V2_ART_URL = '/art/board-v2.art.5dedbf2450.css';
export const SETUP_ART_URL = '/art/setup.art.f196649c9c.css';
export const BOARD_V2_MOTION_ART_URL = '/art/board-v2-motion.art.7793869d6b.css';
export const BOARD_V2_FILMS_ART_URL = '/art/board-v2-films.art.9e6abdef0f.css';
export const COMMON_ART_BUNDLES = Object.freeze({ 'board-v2-art': BOARD_V2_ART_URL, 'setup-art': SETUP_ART_URL, 'board-v2-motion-art': BOARD_V2_MOTION_ART_URL, 'board-v2-films-art': BOARD_V2_FILMS_ART_URL });
function noteArrival(document, name) {
  const names = new Set((document.documentElement.dataset.art ?? '').split(' ').filter(Boolean));
  names.add(name); document.documentElement.dataset.art = [...names].join(' ');
  document.dispatchEvent?.(new Event('mothership:art-ready'));
}
function loadBundle(document, name, url) {
  return new Promise(resolve => {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = url;
    const timer = globalThis.setTimeout(() => resolve(null), 8000);
    link.addEventListener('load', () => {
      globalThis.clearTimeout(timer); noteArrival(document, name); resolve(name);
    }, { once: true });
    link.addEventListener('error', () => { globalThis.clearTimeout(timer); resolve(null); }, { once: true });
    document.head.append(link);
  });
}
export function loadBoardV2Art(document = globalThis.document) {
  return loadBundle(document, 'board-v2-art', BOARD_V2_ART_URL).then(name => name !== null);
}

export function bundlesFor(device, { abilities = true, scenes = true } = {}) {
  return ['public-board', ...(device === 'player' ? ['player-ui', 'roles'] : []), ...(scenes ? ['scene-art'] : []), ...(device === 'player' && abilities ? ['abilities'] : [])];
}

export async function loadArt(device, document = globalThis.document, options = {}) {
  document.documentElement.dataset.artSettled = 'false';
  // The same complete supplements load before any private role is consulted.
  // Historical bundles keep their original URLs and are checked independently.
  await Promise.all([
    ...Object.keys(ART_BUNDLES).map(name => loadBundle(document, name, ART_BUNDLES[name])),
    ...Object.entries(COMMON_ART_BUNDLES).map(([name, url]) => loadBundle(document, name, url)),
  ]);
  document.documentElement.dataset.art ??= '';
  document.documentElement.dataset.artSettled = 'true';
  document.dispatchEvent?.(new Event('mothership:art-ready'));
}
