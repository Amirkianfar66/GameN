// mothership:dev-only
//
// The room drawing release's review page (design/room-drawing/review.html). Rendered by
// design/tools/room-drawing-render.mjs.
//   ?view=night (the default): for each room, the release's own pictures (design/room-drawing/
//     assets/, read from its manifest), lit (the back and its layers, by depth) and with the lights
//     out, beside the lights-out picture the board shows today;
//   ?view=films: the films' pieces of the rooms, today and redrawn: the Captain's Jail door at
//     rest, half open, open and in a lockdown with the EJECT airlock open; the Hospital's drone in
//     its four poses, a berth's monitor and its lamp; the private-talk capsule.

import { AIRLOCK, JAIL_DOOR, airlockSvg, jailDoorSvg } from './source/captain.mjs';
import { DRONE, berthScreenSvg, droneSvg, lampSvg } from './source/medical.mjs';

window.__designReady = false;

// A repository path as this page (design/room-drawing/review.html) reaches it.
const url = path => `../${path.replace(/^design\//, '')}`;
const NAMES = { 'command-room': 'Command Room', 'room-a': 'Room A', 'room-b': 'Room B', hospital: 'Hospital', jail: 'Jail' };
const SNAPSHOT = 'design/releases/source-snapshots/cb9386bd716dc346160509d5e49d7348fdaf4f84/design/board-v2/assets';

const manifest = await (await fetch('./assets/manifest.json')).json();
// Today's picture: the ward's is the runtime copy of its release snapshot's, which this page can reach.
const todayOf = asset => (asset.replaces.sourceCommit ? `design/releases/source-snapshots/${asset.replaces.sourceCommit}/${asset.replaces.source}` : asset.replaces.path);
const stack = paths => `<div class="room">${paths.map(path => `<img src="${url(path)}" alt="">`).join('')}</div>`;

function night() {
  const rooms = Object.keys(NAMES).map(id => {
    const assets = manifest.assets.filter(asset => asset.room === id);
    const lit = [assets.find(asset => asset.kind === 'back'), ...assets.filter(asset => asset.kind === 'layer').sort((a, b) => a.depth - b.depth)];
    return { id, lit, dark: assets.find(asset => asset.kind === 'dark') };
  });
  return `<header><h1>The rooms, released: lit and with the lights out</h1>`
    + `<p>The release's own pictures (room-drawing-1.0.0, trimmed), each room lit and in a Blackout, beside today's lights-out picture. The lights-out picture is drawn from the redrawn room: the light taken away, every fill almost ink, the ink's lines faint steel, the view through a window dimmed more gently, by the reviewed night rule.</p></header>`
    + `<div class="grid"><span></span><span class="head">Today, lights out</span><span class="head">Released, lit</span><span class="head">Released, lights out</span>`
    + rooms.map(room => `<h2>${NAMES[room.id]}</h2>${stack([todayOf(room.dark)])}${stack(room.lit.map(asset => asset.path))}${stack([room.dark.path])}`).join('')
    + '</div><footer>A design review page in desktop Chrome: it shows the drawing, not how a phone shows or runs it.</footer>';
}

// ---------- the films ----------

/** A crop of the Jail (the door and the airlock's wall), 660 x 360 scene units, the room under its overlays. */
const CROP = [190, 40, 660, 360];
const place = (box, inner) => `<div class="over" style="left:${box[0] - CROP[0]}px;top:${box[1] - CROP[1]}px;width:${box[2]}px;height:${box[3]}px">${inner}</div>`;
const jail = (room, overlays) => `<div class="crop"><div class="inner"><div class="scene" style="left:${-CROP[0]}px;top:${-CROP[1]}px"><img src="${url(room)}" alt=""></div>${overlays.join('')}</div></div>`;
const img = path => `<img src="${url(path)}" alt="">`;

function films() {
  const roomToday = 'design/board-motion/assets/scenes/jail.back.svg', roomNew = 'design/room-drawing/assets/jail.back.svg';
  const doorToday = name => place(JAIL_DOOR.box, img(`${SNAPSHOT}/captain/jail-door-${name}.svg`));
  const frames = [['At rest', 'rest', {}], ['Half open (RELEASE)', 'half', { open: 0.5, wheel: 180, lamp: 'green', keypad: 'green' }], ['Open', 'open', { open: 1, wheel: 360, lamp: 'green', keypad: 'green' }], ['Lockdown and the airlock (EJECT)', 'lockdown', { lamp: 'red', keypad: 'amber' }]];
  const door = frames.map(([title, name, state], i) => `<div class="cell"><h3>${title}</h3>`
    + jail(roomToday, [doorToday(name), ...(name === 'lockdown' ? [place(AIRLOCK.box, img(`${SNAPSHOT}/captain/airlock-open.svg`))] : [])])
    + jail(roomNew, [place(JAIL_DOOR.box, jailDoorSvg({ ...state, prefix: `door${i}` })), ...(name === 'lockdown' ? [place(AIRLOCK.box, airlockSvg({ clamps: 1, open: 1, glow: 1, prefix: 'lock' }))] : [])]) + '</div>').join('');
  const sprite = (today, redrawn, cls) => `<div class="sprite ${cls}">${img(today)}${redrawn}</div>`;
  const ward = [
    ...DRONE.frames.map(frame => sprite(`${SNAPSHOT}/medical/drone-${frame}.svg`, droneSvg(frame), 'drone')),
    ...['stable', 'unstable'].map(kind => sprite(`${SNAPSHOT}/medical/berth-screen-${kind}.svg`, berthScreenSvg(kind), 'screen')),
    ...['calm', 'red'].map(state => sprite(`${SNAPSHOT}/medical/lamp-${state}.svg`, lampSvg(state), 'lamp')),
  ].join('');
  const capsule = manifest.assets.filter(asset => asset.room === 'capsule');
  const cap = name => capsule.find(asset => asset.layer === name).path;
  const cabin = paths => `<div class="cabin">${paths.map(path => img(path)).join('')}</div>`;
  return '<header><h1>The films\' pieces of the rooms, redrawn</h1>'
    + '<p>The films that draw parts of a room again, today (above) and redrawn with the rooms (below). The Captain\'s Jail door at rest is the redrawn Jail itself, then slides open in its hand, the room\'s light staying where it is; the EJECT airlock opens in the same hand. The Hospital\'s drone, a berth\'s monitor and its lamp keep their boxes, signals and colours. The private-talk capsule is redrawn as the rooms are.</p></header>'
    + `<section><h2>The Jail: RELEASE and EJECT</h2><div class="row">${door}</div></section>`
    + `<section><h2>The Hospital: the drone, a berth's monitor and lamp</h2><div class="row ward">${ward}</div></section>`
    + `<section><h2>The private-talk capsule</h2><div class="row">${[['Today', cabin(['design/board-v2/assets/capsule/back.svg', 'design/board-v2/assets/capsule/door-0.svg'])], ['Redrawn', cabin([cap('back'), cap('door-0')])], ['In use: the door open, the light on', cabin([cap('back'), cap('door-2'), cap('busy')])], ['Lights out', cabin([cap('dark')])]].map(([title, body]) => `<div class="cell"><h3>${title}</h3>${body}</div>`).join('')}</div></section>`
    + '<footer>A design review page in desktop Chrome: it shows the drawing, not how a phone shows or runs it.</footer>';
}

const view = new URLSearchParams(location.search).get('view') ?? 'night';
document.documentElement.dataset.view = view;
document.getElementById('root').innerHTML = view === 'films' ? films() : night();
await Promise.all([...document.images].map(image => image.decode()));
window.__designReady = true;
