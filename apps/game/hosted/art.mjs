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
export function loadBoardV2Art(document = globalThis.document) {
  return new Promise(resolve => {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = BOARD_V2_ART_URL;
    link.addEventListener('load', () => {
      const names = new Set((document.documentElement.dataset.art ?? '').split(' ').filter(Boolean)); names.add('board-v2-art');
      document.documentElement.dataset.art = [...names].join(' '); document.dispatchEvent(new Event('mothership:art-ready')); resolve(true);
    }, { once: true });
    link.addEventListener('error', () => resolve(false), { once: true });document.head.append(link);
  });
}

export function bundlesFor(device, { abilities = true, scenes = true } = {}) {
  return ['public-board', ...(device === 'player' ? ['player-ui', 'roles'] : []), ...(scenes ? ['scene-art'] : []), ...(device === 'player' && abilities ? ['abilities'] : [])];
}

export async function loadArt(device, document = globalThis.document, options = {}) {
  const arrived = await Promise.all(bundlesFor(device, options).map(name => new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = ART_BUNDLES[name];
    link.addEventListener('load', () => resolve(name), { once: true });
    link.addEventListener('error', () => resolve(null), { once: true });
    document.head.append(link);
    // A slow/offline art response must never hold the game. Late success may still set
    // the gate through a subsequent launch; this attempt keeps its text fallback.
    globalThis.setTimeout(() => resolve(null), 8000);
  })));
  document.documentElement.dataset.art = [...new Set([...(document.documentElement.dataset.art ?? '').split(' ').filter(Boolean), ...arrived.filter(Boolean)])].join(' ');
  document.dispatchEvent?.(new Event('mothership:art-ready'));
}
