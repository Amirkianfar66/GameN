// mothership:dev-only
//
// Ship life: one room on a stage, as the board composes it (design/room-pilot/review.mjs), with
// its people alive: the approved room (room-drawing-1.0.0's pictures), its ambient motion (the
// phone pack's, design/phone-ui/prototype/ambient.mjs), its food capsule (./capsule.mjs), and the
// approved crew (design/crew-drawing/source/, mounted live and posed in place) doing their places'
// activities (./activities.mjs) and visiting the capsule (./eating.mjs).
//
// Everything runs on one clock the page sets (set(t), in ms), so a render of a moment is always
// the same picture. A design preview: it never reads or writes a game fact. What a visit shows of
// food comes from the fixture the page names (stocked, empty or unknown).
//
// Layers, back to front: the back picture (z 0), the ambient layer (z 1), the capsule (z 2), each
// figure's body with what its hands hold (z 2 × its floor depth) and the room's own layers between
// them (z 2 × depth + 1), each figure's front layer over every room layer (z 1500 + depth).

import { FRAME, hasFront } from '../board-motion/figures/body.mjs';
import { applyCrewFrame, applyCrewPose, crewArtDefs, crewFrame, crewPoseFrame } from '../crew-drawing/source/mount.mjs';
import { CREW } from '../crew-drawing/source/crew.mjs';
import { crewMotion, hairFollow } from '../crew-drawing/source/motion.mjs';
import { dressedFigureSvg, outfitFor } from '../crew-drawing/source/wardrobe.mjs';
import { ambientLayer, settleAmbient } from '../phone-ui/prototype/ambient.mjs';
import { roomOf } from '../room-pilot/rooms.mjs';
import { activityAt, activityTimeline } from './activities.mjs';
import { capsuleSvg } from './capsule.mjs';
import { visitAt, visitTimeline } from './eating.mjs';
import { CAPSULES } from './positions.mjs';
import { propsSvg, restingSvg } from './props.mjs';

const ART = Object.freeze({ ref: 'crew-art' });
const [AX, AY] = FRAME.anchor;
const [BX, BY, BW] = FRAME.box;
const NS = 'http://www.w3.org/2000/svg';

/** The approved room pictures (room-drawing-1.0.0), as a page in design/ship-life/ reaches them. */
export const roomPicture = (room, name = 'back') => `../room-drawing/assets/${room}.${name}.svg`;

const el = (tag, cls) => { const node = document.createElement(tag); if (cls) node.className = cls; return node; };

/** A figure mounted live on the stage: its body (with its props) and front, placed and posed each frame. */
function mountFigure(scene, c, prefix, outfit) {
  const body = el('div', 'piece'), front = el('div', 'piece');
  const layers = { body: el('span', 'layer'), front: el('span', 'layer') };
  const held = el('span', 'layer');
  body.append(layers.body, held);
  front.append(layers.front);
  scene.append(body, front);
  const state = { sk: null, front: null, props: '' };
  const draw = (sk, motion) => {
    state.front = hasFront(sk);
    for (const [name, node] of Object.entries(layers)) {
      node.innerHTML = name === 'front' && !state.front ? '' : dressedFigureSvg(c, sk, { outfit, layer: name, prefix: `${prefix}-${name}`, art: ART, live: true, motion });
    }
  };
  return {
    place([x, y], s, mirror) {
      const ox = (AX - BX) * s, oy = (AY - BY) * s, depth = Math.round(y);
      for (const [node, z] of [[body, depth * 2], [front, 1500 + depth]]) {
        Object.assign(node.style, { left: `${x - ox}px`, top: `${y - oy}px`, width: `${BW * s}px`, height: `${BW * s}px`, transformOrigin: `${ox}px ${oy}px`, zIndex: String(z) });
        node.dataset.mirror = String(Boolean(mirror));
      }
    },
    show(sk, motion, props, anchors) {
      if (state.sk === null || state.front !== hasFront(sk)) draw(sk, motion);
      else if (state.sk !== sk) {
        for (const [name, node] of Object.entries(layers)) {
          const svg = node.firstElementChild;
          if (svg && applyCrewPose(svg, crewPoseFrame(c, sk, { outfit, layer: name, prefix: `${prefix}-${name}`, art: ART, motion })) < 0) { draw(sk, motion); break; }
        }
      } else {
        const frame = crewFrame(c, sk, motion);
        for (const node of Object.values(layers)) { const svg = node.firstElementChild; if (svg) applyCrewFrame(svg, frame); }
      }
      state.sk = sk;
      const markup = Object.keys(props).length ? propsSvg(sk, props, { prefix: `${prefix}-p`, anchors }) : '';
      if (markup !== state.props) { held.innerHTML = markup; state.props = markup; }
    },
  };
}

/**
 * A room on the stage. options: room (an id of design/room-pilot/rooms.mjs), cast ({ place: crew
 * id }), capsule (the fixture: stocked | empty | unknown), visits ([{ place, at, kind }]: who ends
 * a turn when), reduced (Reduce motion: every place at rest, no visit), ambient (the room's ambient
 * motion). Returns { root, set(t), visits }.
 */
export function roomStage({ room, cast, capsule = 'unknown', visits = [], reduced = false, ambient = true }) {
  const r = roomOf(room);
  if (!r) throw new Error(`No room ${room}`);
  const device = CAPSULES[room] ?? null;
  if (visits.length && !device) throw new Error(`${r.name} has no food capsule: no visit plays there`);
  if (visits.some(v => v.kind !== capsule)) throw new Error('A visit shows the capsule\'s fixture: stocked visits a stocked capsule, empty an empty one');
  if (capsule === 'unknown' && visits.length) throw new Error('Unknown availability plays no visit');

  const root = el('div', 'stage');
  root.dataset.room = room;
  const scene = el('div', 'scene');
  root.append(scene);
  if (!document.getElementById('crew-art-c1')) document.body.insertAdjacentHTML('afterbegin', crewArtDefs());
  const back = el('img');
  Object.assign(back, { src: roomPicture(room), alt: '', width: 1024, height: 768 });
  back.style.zIndex = '0';
  scene.append(back);
  for (const [id, layer] of Object.entries(r.scene.layers ?? {})) {
    const img = el('img');
    Object.assign(img, { src: roomPicture(room, id), alt: '', width: 1024, height: 768 });
    img.dataset.layer = id;
    img.style.zIndex = String(Math.round(layer.depth) * 2 + 1);
    scene.append(img);
  }
  // The room's ambient motion (the phone pack's); under Reduce motion, as there, a still picture.
  const amb = ambient ? ambientLayer(room, { tx: 0, ty: 0, k: 1 }) : null;
  if (amb) { amb.style.zIndex = '1'; scene.append(amb); }

  // The capsule, redrawn only when what it shows changes.
  let cap = null, capKey = '';
  if (device) {
    cap = el('div', 'capsule');
    const [x, y, w, h] = device.box;
    Object.assign(cap.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, zIndex: '2' });
    scene.append(cap);
  }
  const showCapsule = (open, portion) => {
    if (!cap) return;
    const key = `${capsule}|${open.toFixed(3)}|${portion}`;
    if (key === capKey) return;
    capKey = key;
    cap.innerHTML = capsuleSvg({ box: device.box, hatch: device.hatch, state: capsule, open, portion: capsule === 'stocked' && portion, family: r.family, kind: device.kind, light: device.light ?? null, prefix: `cap-${room}` });
  };

  const slots = r.scene.slots.filter(slot => cast[slot.id]);
  const people = slots.map((slot, seat) => {
    const c = CREW[cast[slot.id]];
    const fig = mountFigure(scene, c, `sl-${room}-${slot.id}`, outfitFor(r.name));
    const own = visits.filter(v => v.place === slot.id).sort((a, b) => a.at - b.at);
    const runs = [activityTimeline(slot.id, slot.gesture, { seat })];
    // What waits at the place (A4's parcel on the crate top): drawn at the place, behind its occupant, while not held.
    let set = null;
    if (Object.keys(runs[0].resting).length) {
      set = el('div', 'piece');
      const [x, y] = slot.at, s = slot.scale, ox = (AX - BX) * s, oy = (AY - BY) * s;
      Object.assign(set.style, { left: `${x - ox}px`, top: `${y - oy}px`, width: `${BW * s}px`, height: `${BW * s}px`, transformOrigin: `${ox}px ${oy}px`, zIndex: String(Math.round(y) * 2 - 1) });
      set.dataset.mirror = String(Boolean(slot.mirror));
      set.dataset.set = slot.id;
      scene.append(set);
    }
    return { slot, seat, c, fig, own, set, setKey: null, follow: hairFollow(c.id), acc: null, runs, visits: [] };
  });

  // The visits, and the activity that starts again after each, laid out once in time order.
  for (const p of people) {
    for (const [i, v] of p.own.entries()) {
      const before = p.runs[p.runs.length - 1];
      const from = activityAt(before, v.at);
      const visit = visitTimeline(p.slot, device, { kind: v.kind, start: v.at, from: from.sk, fromProps: Object.keys(from.props).length ? from.props : null });
      p.visits.push(visit);
      p.runs.push(activityTimeline(p.slot.id, p.slot.gesture, { seat: p.seat, start: visit.end, round: i + 1 }));
    }
  }

  let last = null;
  function set(t) {
    const restart = last === null || t < last;
    const dt = restart ? 0 : t - last;
    last = t;
    if (amb) settleAmbient(scene, { at: reduced ? 0 : t / 1000 });
    let open = 0, portion = true;
    for (const p of people) {
      const visit = reduced ? null : p.visits.find(v => t >= v.start && t < v.end);
      let sk, pos = p.slot.at, scale = p.slot.scale, mirror = Boolean(p.slot.mirror), props = {}, anchors = {};
      if (visit) {
        const now = visitAt(visit, t);
        ({ sk, pos, scale, mirror, props } = now);
        open = now.open;
        portion = now.portion;
      } else {
        const run = [...p.runs].reverse().find(x => t >= x.keys[0].at) ?? p.runs[0];
        const now = activityAt(run, t, { reduced });
        sk = now.sk;
        props = now.props;
        anchors = run.anchors;
      }
      // The hanging hair follows the head through a visit, the travel included (the crew review's way).
      const world = [pos[0] / scale, pos[1] / scale], head = sk.head;
      if (restart || !p.acc) { p.follow.reset(); p.acc = { world, head, local: [head[0], head[1]] }; }
      const sign = mirror ? -1 : 1;
      p.acc.local = [p.acc.local[0] + sign * (world[0] - p.acc.world[0]) + (head[0] - p.acc.head[0]), p.acc.local[1] + (world[1] - p.acc.world[1]) + (head[1] - p.acc.head[1])];
      p.acc.world = world; p.acc.head = head;
      const follow = reduced ? null : p.follow.step(dt, p.acc.local[0], p.acc.local[1]);
      const motion = crewMotion(t, p.c.id, { reduced, seat: p.seat, follow: visit ? follow : null });
      p.fig.place(pos, scale, mirror);
      p.fig.show(sk, motion, props, anchors);
      if (p.set) {
        const key = Object.keys(props).sort().join(',');
        if (key !== p.setKey) { p.set.innerHTML = restingSvg(p.runs[0].resting, props, { prefix: `sl-${room}-${p.slot.id}-r` }); p.setKey = key; }
      }
    }
    showCapsule(open, portion);
  }
  return { root, set, visits: people.flatMap(p => p.visits), people };
}
