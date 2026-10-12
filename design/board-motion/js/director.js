// mothership:dev-only
//
// The prototype's cue director for public facts. It compares the public facts drawn before
// with the public facts drawn now, and plays a cue for what changed; nothing else can start a
// public cue. Its rules are the motion contract's (design/contract/motion-cues.json) and the
// runtime's (apps/game/hosted/comic-motion.mjs), extended for issue #87 and the owner's
// decision of 9 October 2026 (every place's gesture moves to another room and is hit):
//
//   - A cue adds no fact: every change it marks is already in the drawn view, in words.
//   - It changes nothing and nothing waits for it. It is never queued: a newer change to the
//     same seat withdraws the cue in flight and the latest authoritative state is shown.
//   - A replayed snapshot (same revision) plays nothing. A reconnect, a fresh snapshot after a
//     gap, or a page that was in the background plays nothing and settles at once.
//   - More than four moves in one update is a reshuffle, not a move: nobody walks (the
//     runtime's limit, maxSeatDropsPerView 4).
//   - A move (PUBLIC_MOVE): the character gets up from its place, walks to its new room and
//     settles into the new place's gesture (motionBeatsMs.pieceMove: 120, 450, 330 ms).
//   - A hit (PUBLIC_HEALTH_CHANGED to Injured or Eliminated): a burst and a jolt where the
//     character is (motionMs.publicImpact, 320 ms). Injured, it flinches and settles back into
//     its place's gesture, now with a bandage (400 ms); it walks, limping, only when a public
//     move takes it elsewhere (the Hospital at the end of the round). Eliminated, it falls
//     where it is (motionBeatsMs.comicBeatMaximum: 240, 260, 400 ms). Every hit in one update
//     starts at the same moment: the order the engine resolved them in is not shown. Nothing
//     in it is a weapon, a projectile or a direction.
//   - An Injured character walks limping, bandaged: the public health it already has.
//   - No cue exists for a registration on a public surface, a shot, a shooter, a weapon, a
//     block, Protection, a Rescue giver, a Supply giver or any cause.
//   - The match's end (the view's phase turning FINISHED or ABORTED): the result sheet comes
//     up, its winner is struck on its ribbon and, at a finished match, the cast list's rows turn
//     up one after another, the Code's pinned (motionMs.comicBeatMaximum: 240, 260, 400 ms). It
//     marks only what the sheet already says in words, the same on every screen; an ended match
//     has only the sheet's rise. Never on a page drawn at the end already (a scenario, a reload,
//     a reconnect).
//   - Reduced motion: nobody walks, jolts or falls; arrival and status changes use the 80 ms
//     fade. The facts and the controls are the same.

import { h } from './h.js';
import { drawFigure } from './board.js';
import { INJURED, skeletonOf } from '../figures/gestures.mjs';
import { FRAME } from '../figures/body.mjs';
import { TIMELINES, sample, walkPose } from '../figures/motion.mjs';

const MOVE = { opening: 120, accent: 450, settle: 330 }; // design tokens 0.4.0, motionBeatsMs.pieceMove
const IMPACT = 320; // motionMs.publicImpact
const FALL = { opening: 240, accent: 260, settle: 400 }; // motionBeatsMs.comicBeatMaximum
const STATUS_MS = 220;
const ROUND_MS = 700;
const END_MS = 900; // motionMs.comicBeatMaximum: the sheet's rise, the ribbon's strike, the rows turned up
const TERMINAL = ['FINISHED', 'ABORTED'];
const FRAME_MS = 1000 / 30;
const [BOX_X, BOX_Y, BOX] = FRAME.box;
const [ANCHOR_X, ANCHOR_Y] = FRAME.anchor;

export function createDirector({ board, status, fx, result = null, reduced, onCue = () => {}, hold = false }) {
  const running = new Map(); // seat -> { animations, timers, nodes, raf, restore }
  const motionQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reducedNow = () => reduced() || motionQuery?.matches === true;
  let disposed = false;
  let statusTimer = null;
  let endTimer = null;
  let lastRevision = null;

  function cancelSeat(seat) {
    const entry = running.get(seat);
    if (!entry) return;
    for (const animation of entry.animations) animation.cancel();
    for (const timer of entry.timers) clearTimeout(timer);
    for (const node of entry.nodes) node.remove();
    cancelAnimationFrame(entry.raf);
    entry.restore?.();
    const piece = board.pieces.get(seat);
    if (piece) { delete piece.dataset.moving; delete piece.dataset.cue; delete piece.dataset.arrived; }
    running.delete(seat);
  }
  function cancelAll() {
    for (const seat of [...running.keys()]) cancelSeat(seat);
    clearTimeout(statusTimer); delete status.dataset.cue;
    clearTimeout(endTimer); if (result) delete result.dataset.cue;
  }
  // An OS preference change may arrive without a new public view or an app redraw.
  const onMotionChange = event => { if (event.matches) cancelAll(); };
  motionQuery?.addEventListener('change', onMotionChange);
  function dispose() {
    if (disposed) return;
    disposed = true;
    motionQuery?.removeEventListener('change', onMotionChange);
    cancelAll();
  }
  // board.update has already installed the latest public gesture. Never restore a
  // choreography's captured destination over a newer health, place or character.
  function restoreCurrent(seat) {
    const piece = board.pieces.get(seat);
    if (!piece) return;
    const body = piece.querySelector('.bm-piece__body');
    body.dataset.drawn = '';
    drawFigure(body, piece.querySelector('.bm-piece__front'), piece.dataset.character, piece.dataset.gesture, `${board.prefix}${seat}`);
    delete piece.dataset.moving;
  }
  const entryFor = seat => { if (!running.has(seat)) running.set(seat, { animations: [], timers: [], nodes: [], raf: 0, restore: null }); return running.get(seat); };
  // A storyboard hold keeps every cue on screen: nothing is taken away by a timer.
  const later = (seat, ms, fn) => { if (!hold) entryFor(seat).timers.push(setTimeout(fn, ms)); };

  function mark(seat, cue, ms) {
    const piece = board.pieces.get(seat);
    if (!piece) return;
    piece.dataset.cue = cue;
    later(seat, ms, () => { if (piece.dataset.cue === cue) delete piece.dataset.cue; });
  }

  /**
   * Runs a choreography of duration ms for a seat: its frames are drawn from one clock, a Web
   * Animation on a node of the choreography, so that a storyboard hold that pauses every
   * animation at a time also stops the drawing at that time.
   */
  function choreograph(seat, host, duration, frame, done) {
    const entry = entryFor(seat);
    const clockNode = h('span', { class: 'bm-clock', 'aria-hidden': 'true' });
    host.append(clockNode);
    const clock = clockNode.animate([{ opacity: 0 }, { opacity: 0 }], { duration, fill: 'forwards' });
    entry.animations.push(clock);
    entry.nodes.push(clockNode);
    let drawn = -1;
    const tick = () => {
      const t = Math.min(duration, Number(clock.currentTime ?? duration));
      const step = Math.round(t / FRAME_MS);
      if (step !== drawn) { drawn = step; frame(t); }
      if (clock.playState === 'finished') { done(); return; }
      entry.raf = requestAnimationFrame(tick);
    };
    frame(0);
    entry.raf = requestAnimationFrame(tick);
  }

  /** A copy of a piece's figure where it was drawn before the update: in its old room, between the same layers. */
  function echo(seat, was) {
    const panel = board.panels.get(was.room);
    const piece = board.pieces.get(seat);
    if (!panel || !piece) return null;
    const node = h('li', { class: 'bm-piece bm-echo', 'data-mirror': String(was.mirror), 'aria-hidden': 'true' },
      h('span', { class: 'bm-piece__body' }), h('span', { class: 'bm-piece__front' }));
    for (const name of ['--bx', '--by', '--bs', '--zb', '--zf']) node.style.setProperty(name, was.vars[name]);
    panel.querySelector('.bm-pieces').append(node);
    return node;
  }

  /** The figure box of an anchor point and a scale, in the effects layer's coordinates. */
  function place(node, [ax, ay], unit, mirror) {
    const box = fx.getBoundingClientRect();
    Object.assign(node.style, {
      left: `${ax - box.left - (ANCHOR_X - BOX_X) * unit}px`, top: `${ay - box.top - (ANCHOR_Y - BOX_Y) * unit}px`,
      width: `${BOX * unit}px`, height: `${BOX * unit}px`,
    });
    node.dataset.mirror = String(mirror);
  }

  /** The burst of a hit at a figure's chest, for motionMs.publicImpact. */
  function burst(seat, was) {
    const box = fx.getBoundingClientRect();
    const node = h('span', { class: 'bm-hit', 'aria-hidden': 'true' });
    const chest = [was.anchor[0], was.anchor[1] - 150 * was.unit];
    Object.assign(node.style, { left: `${chest[0] - box.left}px`, top: `${chest[1] - box.top}px` });
    node.style.setProperty('--r', String(Math.round(70 * was.unit + 10)));
    fx.append(node);
    // At its fullest when the jolt is (a quarter of the way in), then gone by the end of the beat.
    const animation = node.animate([
      { opacity: 0, transform: 'scale(0.3) rotate(-8deg)', easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
      { opacity: 1, transform: 'scale(1.1) rotate(4deg)', offset: 0.25, easing: 'cubic-bezier(0.16, 0.84, 0.3, 1)' },
      { opacity: 0, transform: 'scale(1.4) rotate(10deg)' },
    ], { duration: IMPACT, fill: 'forwards' });
    const entry = entryFor(seat);
    entry.animations.push(animation);
    entry.nodes.push(node);
  }

  /**
   * A character's choreography between two drawings: where it was (was), where it is now (now),
   * and what happened to it (hit: 'hurt' or 'down', or none). Plays in the room it was in, then
   * walks above the board, then settles in the room it is in.
   */
  function perform(seat, was, now, { hit = null, character, step = false }) {
    const piece = board.pieces.get(seat);
    if (!piece || !was || !now) return;
    const body = piece.querySelector('.bm-piece__body'), front = piece.querySelector('.bm-piece__front');
    const from = skeletonOf(was.gesture);
    const to = skeletonOf(now.gesture);
    const moving = was.room !== now.room || was.place !== now.place;
    const prefix = `${board.prefix}m${seat}`;
    const entry = entryFor(seat);
    if (hit && !moving) {
      // Hit where it is, down or Injured: the piece itself plays it, between its own room's layers.
      const keys = hit === 'down' ? TIMELINES.hitDown(from, FALL, to, IMPACT / 4) : TIMELINES.hitStay(from, to, IMPACT, FALL.settle);
      burst(seat, was);
      const total = keys[keys.length - 1].at;
      entry.restore = () => restoreCurrent(seat);
      choreograph(seat, piece, total, t => drawFigure(body, front, character, '*', prefix, sample(keys, t)), () => { entry.restore(); entry.restore = null; });
      return;
    }
    if (!moving) return;
    // Out of its place (an echo where it was), across (a flyer above the board), into its new place (the piece).
    // Injured already, it limps and wears its bandage all the way; hit now, it limps, the bandage comes as it settles.
    const injured = !hit && String(now.gesture).includes(INJURED);
    const limp = hit || injured ? 1 : 0;
    const walk = phase => { const sk = walkPose(phase, { limp }); return injured ? { ...sk, bandage: true } : sk; };
    const opening = hit ? IMPACT : MOVE.opening;
    const out = hit ? TIMELINES.hitHurt(from, IMPACT) : TIMELINES.exit(from, MOVE.opening, walk(0));
    const into = TIMELINES.arrive(to, MOVE.settle, walk(1.5));
    const total = opening + MOVE.accent + MOVE.settle;
    const ghost = echo(seat, was);
    const flyer = h('span', { class: 'bm-flyer', 'data-character': character, 'aria-hidden': 'true' });
    fx.append(flyer);
    entry.nodes.push(flyer);
    if (ghost) entry.nodes.push(ghost);
    if (hit) burst(seat, was);
    piece.dataset.moving = '';
    const goingRight = now.anchor[0] > was.anchor[0];
    entry.restore = () => restoreCurrent(seat);
    // The ink trail and the landing puff of the reviewed public move, from feet to feet. A step to
    // the next place in the same room (layout-reflow) has neither: nobody moved between rooms.
    let trail = null, puff = null;
    if (!step) {
      const box = fx.getBoundingClientRect();
      const [x1, y1] = [was.anchor[0] - box.left, was.anchor[1] - box.top], [x2, y2] = [now.anchor[0] - box.left, now.anchor[1] - box.top];
      trail = h('span', { class: 'bm-trail', 'aria-hidden': 'true' });
      Object.assign(trail.style, { left: `${x1}px`, top: `${y1}px`, width: `${Math.hypot(x2 - x1, y2 - y1)}px`, transform: `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)` });
      puff = h('span', { class: 'bm-puff', 'aria-hidden': 'true' });
      Object.assign(puff.style, { left: `${x2}px`, top: `${y2}px` });
      fx.append(trail, puff);
      entry.nodes.push(trail, puff);
    }
    let stage = '';
    choreograph(seat, flyer, total, t => {
      if (t < opening) {
        if (stage !== 'out') { stage = 'out'; flyer.hidden = true; if (ghost) ghost.hidden = false; }
        if (ghost) drawFigure(ghost.querySelector('.bm-piece__body'), ghost.querySelector('.bm-piece__front'), character, '*', `${prefix}e`, sample(out, t));
      } else if (t < opening + MOVE.accent) {
        if (stage !== 'across') { stage = 'across'; if (ghost) ghost.hidden = true; flyer.hidden = false; }
        const u = (t - opening) / MOVE.accent;
        const eased = u < 0.5 ? 2 * u * u : 1 - ((-2 * u + 2) ** 2) / 2;
        const ax = was.anchor[0] + (now.anchor[0] - was.anchor[0]) * eased;
        const ay = was.anchor[1] + (now.anchor[1] - was.anchor[1]) * eased - Math.sin(Math.PI * eased) * 0.06 * Math.hypot(now.anchor[0] - was.anchor[0], now.anchor[1] - was.anchor[1]);
        const unit = was.unit + (now.unit - was.unit) * eased;
        place(flyer, [ax, ay], unit, goingRight);
        drawFigure(flyer, null, character, '*', `${prefix}w`, walk(u * 1.5));
      } else {
        if (stage !== 'in') { stage = 'in'; flyer.hidden = true; delete piece.dataset.moving; }
        drawFigure(body, front, character, '*', `${prefix}i`, sample(into, t - opening - MOVE.accent));
      }
    }, () => { entry.restore(); entry.restore = null; flyer.remove(); ghost?.remove(); later(seat, 340, () => { trail?.remove(); puff?.remove(); }); });
  }

  /**
   * Play what changed between two public states. kind: 'update' | 'replay' | 'reconnect'.
   * before: where every piece was drawn, taken before the board was redrawn.
   */
  function after(previous, next, before, { kind = 'update', revision = null } = {}) {
    if (disposed) return [];
    const isReduced = reducedNow();
    // Cleanup also precedes the duplicate/replay return: changing comfort settings
    // must settle work that began under full motion even if the facts are unchanged.
    if (isReduced) cancelAll();
    if (kind === 'reconnect' || previous === null) { cancelAll(); lastRevision = revision; return []; }
    if (kind === 'replay' || (revision !== null && revision === lastRevision)) return [];
    lastRevision = revision;
    if (document.visibilityState !== 'visible') { cancelAll(); return []; }
    const played = [];
    const prior = new Map(previous.seats.map(seat => [seat.n, seat]));
    const moved = next.seats.filter(seat => prior.has(seat.n) && prior.get(seat.n).location !== seat.location).map(seat => seat.n);
    const now = board.rects();
    for (const seat of next.seats) {
      const was = prior.get(seat.n);
      if (!was) continue;
      const changedMove = moved.includes(seat.n);
      const changedStatus = was.health !== seat.health || was.jailed !== seat.jailed || was.captain !== seat.captain || was.revealedFaction !== seat.revealedFaction;
      const hit = was.health !== seat.health && seat.health !== 'Healthy' ? (seat.health === 'Eliminated' ? 'down' : 'hurt') : null;
      // A character who stayed steps to its next place when the lower seat of its pair comes in, or back when it leaves.
      const from = before.get(seat.n), to = now.get(seat.n);
      const stepped = !changedMove && Boolean(from && to) && from.room === to.room && from.kind === 'place' && to.kind === 'place' && from.place !== to.place;
      if (changedMove || changedStatus || stepped) cancelSeat(seat.n); // the latest authoritative state wins
      if (isReduced || moved.length > 4) {
        if (changedMove || hit || stepped) {
          const piece = board.pieces.get(seat.n);
          if (piece) { piece.dataset.arrived = ''; later(seat.n, 80, () => delete piece.dataset.arrived); }
        }
        if (changedMove) played.push({ cue: 'cue-public-move', seat: seat.n, variant: isReduced ? 'reduced' : 'settled' });
        if (stepped) played.push({ cue: 'layout-reflow', seat: seat.n, variant: isReduced ? 'reduced' : 'settled' });
        if (hit) played.push({ cue: 'cue-public-hit', seat: seat.n, variant: isReduced ? 'reduced' : 'settled' });
      } else if (changedMove || hit || stepped) {
        perform(seat.n, from, to, { hit, character: seat.character, step: stepped });
        if (hit) played.push({ cue: 'cue-public-hit', seat: seat.n, variant: hit });
        if (changedMove) played.push({ cue: 'cue-public-move', seat: seat.n, variant: hit ? 'hurt' : 'walk' });
        if (stepped) played.push({ cue: 'layout-reflow', seat: seat.n, variant: 'step' });
      }
      if (changedStatus) { mark(seat.n, 'status', isReduced ? 80 : STATUS_MS); played.push({ cue: 'cue-status-change', seat: seat.n }); }
    }
    if (previous.active !== next.active && next.active !== null) {
      mark(next.active, 'turn', isReduced ? 80 : STATUS_MS);
      played.push({ cue: 'cue-turn-accent', seat: next.active });
    }
    const roundChanged = previous.round !== next.round;
    const phaseChanged = roundChanged || previous.phase.kind !== next.phase.kind || previous.active !== next.active;
    if (phaseChanged) {
      clearTimeout(statusTimer);
      status.dataset.cue = roundChanged ? 'round' : 'phase';
      if (!hold) statusTimer = setTimeout(() => delete status.dataset.cue, isReduced ? 80 : roundChanged ? ROUND_MS : STATUS_MS);
      played.push({ cue: roundChanged ? 'cue-round-transition' : 'cue-phase-change' });
    }
    // The match's end, the first time this page draws it: the sheet already holds every word of it.
    if (result && !TERMINAL.includes(previous.phase.kind) && TERMINAL.includes(next.phase.kind)) {
      clearTimeout(endTimer);
      result.dataset.cue = isReduced ? 'fade' : 'reveal';
      if (!hold) endTimer = setTimeout(() => delete result.dataset.cue, isReduced ? 80 : END_MS);
      played.push({ cue: 'cue-end-reveal', variant: next.phase.kind === 'ABORTED' ? 'ended' : isReduced ? 'reduced' : 'reveal' });
    }
    for (const entry of played) onCue(entry);
    return played;
  }

  /** Where every piece is drawn now, with what an echo needs to redraw it there. */
  function before() {
    const rects = board.rects();
    for (const [n, rect] of rects) {
      const piece = board.pieces.get(n);
      rect.vars = Object.fromEntries(['--bx', '--by', '--bs', '--zb', '--zf'].map(name => [name, piece.style.getPropertyValue(name)]));
    }
    return rects;
  }

  return { before, after, cancelAll, dispose };
}
