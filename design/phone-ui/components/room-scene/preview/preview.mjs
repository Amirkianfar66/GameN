// mothership:dev-only
//
// The room scene's preview: the runtime component itself (../room-scene.mjs, unchanged) mounted on the
// phone pack's synthetic fixtures (design/phone-ui/prototype/fixtures.mjs: invented names, seats and
// places, as the review sheets use), at the two development phone sizes, in each state Frontend checks.
// The app's bars around it are plain stand-ins: they are Frontend's. The room pictures come from the
// approved release's own files (room-drawing-1.0.0), set on the CSS properties the game's bundles fill.
//   index.html                                   every state at 390 × 844 and 430 × 932
//   index.html?single=1&size=390x844&state=lit   one phone, for the check's captures
//   …&clock=still                                no trusted clock: the ambient layer still at 0 s

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { ROOM_NAMES, mountRoomScene } from '../room-scene.mjs';
import { SKY_EPOCH } from '../ambient.mjs';
import { ROOM_ART } from '../room-art.mjs';
import { FIXTURE_LABEL, ROOM_FIXTURES, SELF, board } from '../../../prototype/fixtures.mjs';

export const PREVIEW_SIZES = Object.freeze({ '390x844': [390, 844], '430x932': [430, 932] });
// The pack's review frames: safe areas 47 and 34 px, a 52 px top bar and 58 px tabs (kit.css).
const BAR_TOP = 47 + 52, BAR_BOTTOM = 34 + 58;

// The release's pictures on the properties the game's art bundles define (room-art.mjs).
for (const art of Object.values(ROOM_ART)) {
  for (const { property, file } of [art.back, ...art.layers, art.dark]) {
    document.documentElement.style.setProperty(property, `url("${new URL(`../../../../room-drawing/assets/${file}`, import.meta.url).href}")`);
  }
}

// The crew release's portraits on the properties the game's crew bundle defines (crewPortraitVariable),
// for the room-picture-unavailable cards.
for (let n = 1; n <= 9; n += 1) {
  document.documentElement.style.setProperty(`--ms-asset-crew-portrait-c${n}`, `url("${new URL(`../../../../crew-drawing/assets/portraits/portrait-c${n}.svg`, import.meta.url).href}")`);
}

// A match pinned to the crew release, as the game's crew runtime requires to draw the approved crew.
const versions = Object.freeze({ assetManifestVersion: 'design-0.9.0', ...PLANET_FOOD_TASK_PINS });
const params = new URLSearchParams(location.search);
// The ship's clock: this device's (a stand-in for the match's server time), none (`clock=still`), or a
// fixed moment of the voyage held still (`at=<seconds>`, as the pack's review sheets hold `amb`).
const at = params.has('at') ? Number(params.get('at')) : null;
const clock = params.get('clock') === 'still' ? null : at !== null ? { now: () => SKY_EPOCH + at * 1000 } : { now: () => Date.now() };

function peopleIn(room) {
  const { place, offices } = ROOM_FIXTURES[room];
  return board({ place }).filter(p => p.location === ROOM_NAMES[room]).map(p => ({
    seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
    office: offices.captain === p.seat ? 'captain' : offices.officer === p.seat ? 'officer' : null,
  }));
}
const roomB = peopleIn('room-b');
const base = Object.freeze({ room: 'room-b', roster: 9, people: roomB, self: SELF, active: ROOM_FIXTURES['room-b'].active,
  control: { id: 'windows', label: 'Windows · 2', icon: 'window' }, versions, clock });

/** Each state Frontend checks before the first connection (#222), and a few more of sheet 21's. */
export const PREVIEW_STATES = Object.freeze({
  lit: { caption: 'Lit · another player’s turn', input: base },
  own: { caption: 'Lit · your turn', input: { ...base, active: SELF } },
  targets: { caption: 'Targets offered · one picked', input: { ...base, active: SELF, control: null, targets: { seats: [3, 6, 8], picked: [6] } } },
  moves: { caption: 'Empty positions offered', input: { ...base, active: SELF, control: null, targets: { slots: ['B5'], picked: null, icon: 'move' } } },
  dark: { caption: 'Lights out · the lit frame held', input: base, then: { lighting: 'dark', hold: true, control: null } },
  cold: { caption: 'Opened in the dark · no lit frame', input: { ...base, lighting: 'dark', people: [], control: null } },
  stale: { caption: 'Reconnecting · the last room, dimmed', input: { ...base, status: 'stale' } },
  concealed: { caption: 'Concealed', input: { ...base, status: 'concealed' } },
  reduced: { caption: 'Reduce motion · still', input: { ...base, reducedMotion: true } },
  unavailable: { caption: 'Room picture unavailable', input: { ...base, artReady: false } },
});

const intents = [];
const handlers = {
  onSeat: seat => intents.push(['seat', seat]),
  onSlot: slot => intents.push(['slot', slot]),
  onControl: id => intents.push(['control', id]),
};

function phone(sizeKey, stateKey) {
  const [width, height] = PREVIEW_SIZES[sizeKey];
  const state = PREVIEW_STATES[stateKey];
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;
  const top = document.createElement('div');
  top.className = 'pv-bar'; top.dataset.at = 'top'; top.style.height = `${BAR_TOP}px`; top.textContent = 'App top bar (Frontend’s)';
  const bottom = document.createElement('div');
  bottom.className = 'pv-bar'; bottom.dataset.at = 'bottom'; bottom.style.height = `${BAR_BOTTOM}px`; bottom.textContent = 'App tabs (Frontend’s)';
  const host = document.createElement('div');
  host.className = 'pv-host';
  host.style.top = `${BAR_TOP}px`;
  frame.append(top, host, bottom);
  const size = { width, height: height - BAR_TOP - BAR_BOTTOM };
  return { frame, mount: () => {
    const scene = mountRoomScene(host, { ...state.input, size }, handlers);
    if (state.then) scene.update(state.then);
    // A fixed moment is a still picture: the voyage and the crew hold where they are.
    if (at !== null) scene.suspend();
    return scene;
  } };
}

const scenes = [];
if (params.get('single')) {
  document.body.classList.add('pv-single');
  const sizeKey = params.get('size') ?? '390x844', stateKey = params.get('state') ?? 'lit';
  if (!PREVIEW_SIZES[sizeKey] || !PREVIEW_STATES[stateKey]) throw new Error(`Unknown size or state: ${sizeKey} ${stateKey}`);
  const p = phone(sizeKey, stateKey);
  document.body.append(p.frame);
  scenes.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Room scene · preview</h1><p>The runtime component, Room B, on the phone pack’s fixtures. ${FIXTURE_LABEL}. The bars are stand-ins for Frontend’s. Desktop browser at each phone’s CSS size: not a phone.</p>`;
  const grid = document.createElement('div');
  grid.className = 'pv-grid';
  document.body.append(head, grid);
  for (const sizeKey of Object.keys(PREVIEW_SIZES)) {
    for (const [stateKey, state] of Object.entries(PREVIEW_STATES)) {
      const cell = document.createElement('figure');
      cell.className = 'pv-cell';
      const caption = document.createElement('figcaption');
      caption.innerHTML = `${state.caption}<small>${sizeKey.replace('x', ' × ')} · state=${stateKey}</small>`;
      const p = phone(sizeKey, stateKey);
      cell.append(caption, p.frame);
      grid.append(cell);
      scenes.push(p.mount());
    }
  }
}

// For the check: settled once fonts and two frames have passed.
window.__roomScene = {
  intents, scenes,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};
