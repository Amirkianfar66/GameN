// Room A's people for the layout test, by place (the owner's perimeter-five-v1 places A to E), each with what they do there.
// The work comes from Room A's five stations (the Board's Room A, design/board-motion/scenes/room-a.mjs; ship life's activities,
// design/ship-life/activities.mjs), never from a role. The people are Room A's cast in the room pilot (design/room-pilot/rooms.mjs:
// Vega, Mira, Lyra, Atlas and Echo), each given the place where their work fits every view that sees them (assignA.mjs, optA.mjs)
// and the heads rule holds (the Lead, 18 November): Lyra and Atlas have turned heads and may be seen at any angle; Vega, Mira and
// Echo have the approved face and the back view only, and are never seen between about 100° and 118°.
// gesture: the stand-in's pose. board: the Board's own gesture for that work, where the stand-in differs (the Board's crouch is
// drawn side-on and is 1.2 m across; at the edge of a 70° view that does not fit, so the stand-in is the crew's compact
// sitting-on-the-deck pose, about as wide as the crouch seen from the front).
export const CAST = {
  A: { id: 'A1', name: 'Vega', crew: 'c1', num: 1, gesture: 'consoleBack', work: 'PC workstation', does: 'types, pauses to read a monitor, reaches to a control, types again' },
  B: { id: 'A2', name: 'Mira', crew: 'c8', num: 2, gesture: 'think', work: 'open deck', does: 'reads a maintenance checklist from the belt, glances round, puts it away' },
  C: { id: 'A3', name: 'Echo', crew: 'c9', num: 3, gesture: 'wallPanelBack', work: 'electrical panel', does: 'traces the cables, draws a wire out and holds it, checks its connector, puts it back' },
  D: { id: 'A4', name: 'Atlas', crew: 'c4', num: 4, gesture: 'leanCrates', work: 'crates', does: 'reads a label, tightens a strap, lifts a small parcel off the top crate and puts it back' },
  E: { id: 'A5', name: 'Lyra', crew: 'c3', num: 5, gesture: 'floorSit', board: 'crouchHatch', work: 'floor hatch', does: 'small turns of the wrench in the open hatch, looks closely at the fitting, rests' },
};
export const TURNED_HEADS = new Set(['Juno', 'Atlas', 'Lyra']);
