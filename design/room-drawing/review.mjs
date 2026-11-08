// mothership:dev-only
//
// The room drawing release's review page (design/room-drawing/review.html): for each room, the
// release's own pictures (design/room-drawing/assets/, read from its manifest), lit (the back and
// its layers, by depth) and with the lights out, beside the lights-out picture the board shows
// today. Rendered by design/tools/room-drawing-render.mjs.

window.__designReady = false;

// A repository path as this page (design/room-drawing/review.html) reaches it.
const url = path => `../${path.replace(/^design\//, '')}`;
const NAMES = { 'command-room': 'Command Room', 'room-a': 'Room A', 'room-b': 'Room B', hospital: 'Hospital', jail: 'Jail' };

const manifest = await (await fetch('./assets/manifest.json')).json();
const rooms = Object.keys(NAMES).map(id => {
  const assets = manifest.assets.filter(asset => asset.room === id);
  const lit = [assets.find(asset => asset.kind === 'back'), ...assets.filter(asset => asset.kind === 'layer').sort((a, b) => a.depth - b.depth)];
  return { id, lit, dark: assets.find(asset => asset.kind === 'dark') };
});
// Today's picture: the ward's is the runtime copy of its release snapshot's, which this page can reach.
const todayOf = asset => (asset.replaces.sourceCommit ? `design/releases/source-snapshots/${asset.replaces.sourceCommit}/${asset.replaces.source}` : asset.replaces.path);
const stack = paths => `<div class="room">${paths.map(path => `<img src="${url(path)}" alt="">`).join('')}</div>`;

document.getElementById('root').innerHTML = `<header><h1>The rooms, released: lit and with the lights out</h1>`
  + `<p>The release's own pictures (room-drawing-1.0.0, trimmed), each room lit and in a Blackout, beside today's lights-out picture. The lights-out picture is drawn from the redrawn room: the light taken away, every fill almost ink, the ink's lines faint steel, the view through a window dimmed more gently, by the reviewed night rule.</p></header>`
  + `<div class="grid"><span></span><span class="head">Today, lights out</span><span class="head">Released, lit</span><span class="head">Released, lights out</span>`
  + rooms.map(room => `<h2>${NAMES[room.id]}</h2>${stack([todayOf(room.dark)])}${stack(room.lit.map(asset => asset.path))}${stack([room.dark.path])}`).join('')
  + '</div><footer>A design review page in desktop Chrome: it shows the drawing, not how a phone shows or runs it.</footer>';
await Promise.all([...document.images].map(image => image.decode()));
window.__designReady = true;
