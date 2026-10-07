// All phones request the same complete bundles before any match view is read. A role,
// character selection or private action can never choose a URL or cause a later fetch.
export const ART_BUNDLES = Object.freeze({
  'public-board': '/art/public-board.art.1f47b9f920.css',
  'player-ui': '/art/player-ui.art.fc4830756c.css',
  roles: '/art/roles.art.14e56b5e3e.css',
});

export function bundlesFor(device) {
  return device === 'player' ? ['public-board', 'player-ui', 'roles'] : ['public-board'];
}

export async function loadArt(device, document = globalThis.document) {
  const arrived = await Promise.all(bundlesFor(device).map(name => new Promise(resolve => {
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
  document.documentElement.dataset.art = arrived.filter(Boolean).join(' ');
}
