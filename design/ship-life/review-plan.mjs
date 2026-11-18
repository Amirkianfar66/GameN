// mothership:dev-only
//
// What design/tools/ship-life-render.mjs draws into design/ship-life/review/: the sheets (PNG) and
// the silent films (H.264), each a page of this package at a size. The record of what was drawn,
// with each file's SHA-256, is review/renders.json.

const ROOM_IDS = ['command-room', 'room-a', 'room-b', 'hospital', 'jail'];

/** The sheets: framings, the board overview, each room's activities, the visits beat by beat, the devices. */
export const SHEETS = Object.freeze([
  ...ROOM_IDS.map(room => ({ name: `framings-${room}`, page: `framings.html?room=${room}`, width: 1500 })),
  { name: 'framings-board', page: 'framings.html?view=board', width: 560 },
  ...ROOM_IDS.map(room => ({ name: `activities-${room}`, page: `boards.html?view=activities&room=${room}`, width: 1100 })),
  { name: 'visit-room-a-stocked', page: 'boards.html?view=visit&room=room-a&place=A1&kind=stocked', width: 1600 },
  { name: 'visit-room-a-brief', page: 'boards.html?view=visit&room=room-a&place=A2&kind=brief', width: 1600 },
  { name: 'visit-room-a-empty', page: 'boards.html?view=visit&room=room-a&place=A4&kind=empty', width: 1600 },
  { name: 'visit-room-b-stocked', page: 'boards.html?view=visit&room=room-b&place=B4&kind=stocked', width: 1600 },
  { name: 'visit-command-room-stocked', page: 'boards.html?view=visit&room=command-room&place=C1&kind=stocked', width: 1600 },
  { name: 'visit-jail-stocked', page: 'boards.html?view=visit&room=jail&place=J1&kind=stocked', width: 1600 },
  { name: 'visit-jail-empty', page: 'boards.html?view=visit&room=jail&place=J5&kind=empty', width: 1600 },
  { name: 'devices', page: 'boards.html?view=devices', width: 1200 },
].map(s => Object.freeze(s)));

/** The films: each room's takes in the preview (preview.mjs), at the preview's own size. */
export const FILMS = Object.freeze([
  ['room-a', 'stocked'], ['room-a', 'empty'], ['room-a', 'unknown'], ['room-a', 'reduced'], ['room-a', 'order'],
  ['room-b', 'stocked'], ['room-b', 'stop'], ['command-room', 'stocked'], ['jail', 'stocked'], ['jail', 'empty'], ['hospital', 'life'],
].map(([room, take]) => Object.freeze({ name: `${room}-${take}`, page: `preview.html?room=${room}&take=${take}`, width: 1024, height: 832, scale: 1.25 })));
