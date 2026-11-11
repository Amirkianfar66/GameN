// mothership:dev-only
//
// Ship life's handoff record for Frontend (docs/design/ship-life.md): design/ship-life/handoff.json,
// written from the package's own modules so it cannot drift from them. It names the sources and
// asset versions the package draws on (with their hashes), every place's activity, each room's food
// capsule (box, hatch, layer, the visitor's spot, the walks, the room's depth line), the layer
// order, the timing (each beat, the walk, the scheduler's waits, a cancel, a resume), each visit's
// length from every place, the framings at the pack's phone sizes, and what the game must supply.
// A proposal, in no release: nothing here is in the game.
//
// Usage: node design/tools/ship-life-export.mjs [--check]
//   --check: builds the record and compares it with the file on disk; writes nothing; exits 1 on any difference.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOMS } from '../room-pilot/rooms.mjs';
import { ANCHORS, BUILDERS, RESTING } from '../ship-life/activities.mjs';
import { BEATS, KINDS, WALK, visitTimeline } from '../ship-life/eating.mjs';
import { REACH, SEAM } from '../ship-life/extend.mjs';
import { ZOOMS, frameReport, overlaps, pressRects, roomFrame } from '../ship-life/framing.mjs';
import { ACTIVITIES, CAPSULES, EATING_ROOMS, PLACE_ORDER } from '../ship-life/positions.mjs';
import { CANCEL_MS, RESUME_MS, WAIT } from '../ship-life/schedule.mjs';

const ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = resolve(ROOT, 'design/ship-life/handoff.json');
const sha = path => createHash('sha256').update(readFileSync(resolve(ROOT, path))).digest('hex');
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/** The phones the pack reviews: the room view between its bars (kit.css: a 52-pixel bar, 58-pixel tabs). */
const PHONES = [['320x568', 320, 568, 20, 0], ['390x844', 390, 844, 47, 34], ['430x932', 430, 932, 47, 34]];

export function build() {
  const slotsOf = r => r.scene.slots;
  const places = PLACE_ORDER.map(id => {
    const r = ROOMS.find(room => room.id === ACTIVITIES[id].room);
    const slot = slotsOf(r).find(s => s.id === id);
    const a = ACTIVITIES[id];
    return {
      id, room: a.room, name: a.name, does: a.does, props: a.props, ...(a.never ? { never: a.never } : {}), ...(a.rests ? { rests: true } : {}),
      gesture: slot.gesture, at: slot.at, scale: slot.scale, depth: slot.depth ?? slot.at[1], mirror: Boolean(slot.mirror),
      builder: BUILDERS[id].build.name, restBetweenCycles: BUILDERS[id].rest ?? [1600, 4200],
      ...(ANCHORS[id] ? { anchors: ANCHORS[id] } : {}), ...(RESTING[id] ? { waitingProps: RESTING[id] } : {}),
    };
  });
  const capsules = Object.fromEntries(EATING_ROOMS.map(room => {
    const c = CAPSULES[room];
    const r = ROOMS.find(x => x.id === room);
    const visits = Object.fromEntries(slotsOf(r).map(slot => [slot.id, Object.fromEntries(KINDS.map(kind => {
      const v = visitTimeline(slot, c, { kind });
      return [kind, { ms: Math.round(v.end), atCapsule: v.atCapsule.map(Math.round), bites: v.bites }];
    }))]));
    return [room, { kind: c.kind, box: c.box, hatch: c.hatch, z: c.z, spot: c.spot, scale: c.scale, depthLine: c.depth, paths: c.paths ?? {}, ...(c.light ? { light: c.light } : {}), visits }];
  }));
  const framings = Object.fromEntries(ROOMS.map(r => [r.id, Object.fromEntries(PHONES.map(([id, width, height, safeTop, safeBottom]) => {
    const panel = { width, height: height - safeTop - 52 - safeBottom - 58, cap: 46, pad: 8 };
    return [id, Object.fromEntries(ZOOMS.map(z => {
      const frame = roomFrame(r.scene, panel, slotsOf(r), { zoom: z.zoom, room: r.id });
      const rep = frameReport(frame, panel);
      const rects = pressRects(slotsOf(r), panel, frame);
      const capsule = CAPSULES[r.id];
      const inView = capsule ? frame.tx + capsule.box[0] * frame.k >= 0 && frame.tx + (capsule.box[0] + capsule.box[2]) * frame.k <= width : null;
      return [z.id, { k: round(frame.k, 4), tx: round(frame.tx), ty: round(frame.ty), across: Math.round(rep.across), down: Math.round(rep.down), pastPicture: rep.beyondPicture, capsuleInView: inView, minPress: Math.min(...rects.map(x => Math.round(x.side))), overlaps: overlaps(rects) }];
    }))];
  }))]));
  const inputs = [
    ...ROOMS.map(r => `design/room-drawing/assets/${r.id}.back.svg`),
    ...ROOMS.map(r => `design/ship-life/assets/${r.id}.extend.svg`),
    'design/room-drawing/assets/room-b.bench.svg', 'design/room-drawing/assets/command-room.table.svg',
  ];
  return {
    devOnly: 'mothership:dev-only',
    what: 'Ship life: activities at the 20 places, wider room framings, local food capsules and the visit to them. A design proposal for the owner and Frontend (11 November 2026), in no release and not in the game.',
    sources: {
      rooms: 'room-drawing-1.0.0 (release candidate, PR #197): design/room-drawing/assets/',
      crew: 'crew-drawing-1.0.0: design/crew-drawing/source/ (imported unchanged)',
      rig: 'board-motion-0.3.0 figures: design/board-motion/figures/ (imported unchanged)',
      places: 'design/board-motion/scenes/ and the Hospital ward of four, design/room-pilot/ward-four.mjs',
      ambient: 'the phone pack\'s ambient motion: design/phone-ui/prototype/ambient.mjs (imported unchanged)',
      hashes: Object.fromEntries(inputs.map(path => [path, sha(path)])),
    },
    places,
    capsules,
    noCapsule: ROOMS.filter(r => !CAPSULES[r.id]).map(r => r.id),
    layers: [
      'z 0: the room picture; its extension (wider framings only) over the picture\'s border',
      'z 1: the ambient layer (windows, screens, lights)',
      'z 2 (942 in Room B, over the bench): the food capsule',
      'z 2 x depth - 1: what waits at a place (A4\'s parcel, B2\'s laptop)',
      'z 2 x depth: a figure\'s body with what its hands hold; depth is the place\'s (slot.depth, else its feet), on a walk the path\'s',
      'z 2 x depth + 1: a room layer (Room B\'s bench, the Command Room\'s table, the ward\'s berths)',
      'z 1500 + depth: a figure\'s front layer',
      'the interface over all of it, unchanged: press areas, tags, marks, labels',
    ],
    timing: {
      beatsMs: BEATS, walk: WALK, kinds: KINDS, waitMs: WAIT, cancelMs: CANCEL_MS, resumeMs: RESUME_MS,
      activityRestMs: [1600, 4200], hospitalRestMs: [0, 300],
    },
    extension: { reach: REACH, seam: SEAM },
    framings: { zooms: ZOOMS, phones: PHONES.map(([id, width, height, safeTop, safeBottom]) => ({ id, width, height, safeTop, safeBottom, bar: 52, tabs: 58 })), rooms: framings },
    theGameMustSupply: [
      'Each turn\'s end, in order, with the seat, its room and place, and the round (the after-turn order: a visit is keyed by round and seat)',
      'Per room, the food availability: stocked, empty or unknown (the future approved gameplay contract; unknown plays no visit)',
      'Whether availability is public to every player; if a player may not know it, that player\'s phone shows unknown',
      'Real moves, injuries, eliminations, conversations, phase changes and the lights going out, as today, to stop a visit at once',
      'The game\'s clock, so a phone that comes back plays only a visit that began less than a second ago',
    ],
  };
}

const json = `${JSON.stringify(build(), null, 2)}\n`;
if (process.argv.includes('--check')) {
  const disk = await readFile(OUT, 'utf8').catch(() => '');
  if (disk !== json) { console.error('design/ship-life/handoff.json is not what design/tools/ship-life-export.mjs writes'); process.exit(1); }
  console.log('design/ship-life/handoff.json is up to date');
} else {
  await writeFile(OUT, json);
  console.log('wrote design/ship-life/handoff.json');
}
