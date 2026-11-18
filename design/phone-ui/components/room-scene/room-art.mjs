// Runtime source of the room scene component (design/phone-ui/components/room-scene): the pictures each
// room draws. They are the approved room-drawing-1.0.0 release (design/room-drawing/assets/manifest.json;
// the owner, 8 November 2026). Each is reached through the CSS property of the bundle picture it
// replaces, so a phone draws the art its match's bundles carry: a pinned match keeps its pictures, and
// the release reaches a match once Integration builds it into that match's bundles (DSN-REQ-18). The
// component's preview defines the properties from the release's own files (`file`, beside the manifest).
// Nothing here fetches, and every picture is public: the same for every phone, whoever is in the room.
// Written from the manifest; the room scene's test checks that it still matches.

export const ROOM_ART_RELEASE = "room-drawing-1.0.0";

/** room → the back picture, the layers drawn in front of its places (at their depth), the lights-out picture. */
export const ROOM_ART = Object.freeze({
  "command-room": Object.freeze({
    back: Object.freeze({ property: "--bm-scene-command-room-back", file: "command-room.back.svg" }),
    layers: Object.freeze([Object.freeze({ id: "table", depth: 470, property: "--bm-scene-command-room-table", file: "command-room.table.svg" })]),
    dark: Object.freeze({ property: "--board-v2-motion-command-room-dark", file: "command-room.dark.svg" }),
  }),
  "room-a": Object.freeze({
    back: Object.freeze({ property: "--bm-scene-room-a-back", file: "room-a.back.svg" }),
    layers: Object.freeze([]),
    dark: Object.freeze({ property: "--board-v2-motion-room-a-dark", file: "room-a.dark.svg" }),
  }),
  "room-b": Object.freeze({
    back: Object.freeze({ property: "--bm-scene-room-b-back", file: "room-b.back.svg" }),
    layers: Object.freeze([Object.freeze({ id: "bench", depth: 470, property: "--bm-scene-room-b-bench", file: "room-b.bench.svg" })]),
    dark: Object.freeze({ property: "--board-v2-motion-room-b-dark", file: "room-b.dark.svg" }),
  }),
  "hospital": Object.freeze({
    back: Object.freeze({ property: "--board-v2-film-scenes-hospital-ward-four-back", file: "hospital.back.svg" }),
    layers: Object.freeze([Object.freeze({ id: "berth-four-h3", depth: 560, property: "--board-v2-film-scenes-hospital-ward-four-berth-four-h3", file: "hospital.berth-four-h3.svg" }), Object.freeze({ id: "berth-four-h4", depth: 560, property: "--board-v2-film-scenes-hospital-ward-four-berth-four-h4", file: "hospital.berth-four-h4.svg" }), Object.freeze({ id: "berth-four-h1-head", depth: 600, property: "--board-v2-film-scenes-hospital-ward-four-berth-four-h1-head", file: "hospital.berth-four-h1-head.svg" }), Object.freeze({ id: "berth-four-h2-head", depth: 600, property: "--board-v2-film-scenes-hospital-ward-four-berth-four-h2-head", file: "hospital.berth-four-h2-head.svg" }), Object.freeze({ id: "berth-four-h1", depth: 770, property: "--board-v2-film-scenes-hospital-ward-four-berth-four-h1", file: "hospital.berth-four-h1.svg" }), Object.freeze({ id: "berth-four-h2", depth: 770, property: "--board-v2-film-scenes-hospital-ward-four-berth-four-h2", file: "hospital.berth-four-h2.svg" })]),
    dark: Object.freeze({ property: "--board-v2-film-lighting-hospital-ward-four-dark", file: "hospital.dark.svg" }),
  }),
  "jail": Object.freeze({
    back: Object.freeze({ property: "--bm-scene-jail-back", file: "jail.back.svg" }),
    layers: Object.freeze([]),
    dark: Object.freeze({ property: "--board-v2-motion-jail-dark", file: "jail.dark.svg" }),
  }),
});

/**
 * The room's picture layers in drawing order, each with the stacking depth of the room's places
 * (z = 2 × depth + 1, so a layer covers the places behind it): the back at −1000, the room's own
 * layers, and with the lights out the dark picture, which covers the whole room, at 1400.
 */
export function roomLayers(room, { dark = false } = {}) {
  const art = ROOM_ART[room];
  if (!art) throw new Error(`No room art for ${JSON.stringify(room)}`);
  return [{ id: 'back', depth: -1000, property: art.back.property },
    ...art.layers.map(({ id, depth, property }) => ({ id, depth, property })),
    ...(dark ? [{ id: 'dark', depth: 1400, property: art.dark.property }] : [])];
}
