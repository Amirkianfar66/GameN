// mothership:dev-only
//
// The Food Supply Task, playable: a practice run on one phone against a bot partner, for the owner to
// feel the timing (13 November 2026). The design's own model plays the server (./practice.mjs): each
// press reaches it after the connection's delay and is resolved when it arrives. The screen is the
// design's own (./phone.mjs: the top bar, the strip or the meter, the controls, the cards). The room is
// drawn once; the cab, the console, the operators and the stop plates are drawn again only when they
// change; the carriage, the hook and the crate are drawn once each and moved. Not the game: no server,
// no other player and no match; nothing is saved but this phone's last choices.
//
//   play.html                                                   choose a control, a partner and a connection
//   play.html?auto=1&role=panel&partner=careful&net=normal      start at once
//   …&autoplay=1                                                 a careful bot plays your side too: watch a run

import { h, ic, topBar, pill, toast, banner, button, row, list, groupLabel } from '../phone-ui/prototype/ui.mjs';
import { ROOM_NAMES } from '../phone-ui/prototype/art.mjs';
import { ROLES, view } from './task.mjs';
import { CAST } from './boards.mjs';
import { hintFor, person, other } from './hints.mjs';
import { CUES, poseAt } from './stage.mjs';
import { operatorSvg, restPose, roomBack, sceneSvg } from './scene.mjs';
import * as M from './machine.mjs';
import { BOX, BOXES, CARRIAGE, CRATE, TAGS, VIEW, stopX } from './layout.mjs';
import { subOf, control, sweepStrip, swingMeter, briefingCard, outcomeCard, endCard, describe } from './phone.mjs';
import { PERSONAS, decide } from './bot.mjs';
import { NETS, createPractice, surprise } from './practice.mjs';

const app = document.getElementById('play');
const params = Object.fromEntries(new URLSearchParams(location.search));
const reduced = params.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.dataset.motion = reduced ? 'reduced' : 'normal';
const CHARACTERS = Object.freeze({ winch: CAST.winch.character, panel: CAST.panel.character });

// ── The player's choices, remembered on this phone only ─────────────────
const store = {
  get: (k, d) => { try { return localStorage.getItem(`food-supply-play:${k}`) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(`food-supply-play:${k}`, v); } catch { /* private browsing: not remembered */ } },
};
const pick = (value, allowed, d) => (allowed.includes(value) ? value : d);
const settings = {
  role: pick(params.role ?? store.get('role', 'winch'), ['winch', 'panel'], 'winch'),
  partner: pick(params.partner ?? store.get('partner', 'surprise'), [...Object.keys(PERSONAS), 'surprise'], 'surprise'),
  net: pick(params.net ?? store.get('net', 'normal'), Object.keys(NETS), 'normal'),
};

let loop = null;
let onKey = null;
function leave() {
  if (loop) cancelAnimationFrame(loop);
  loop = null;
  if (onKey) removeEventListener('keydown', onKey);
  onKey = null;
}
function phone(screen) {
  const root = h('div.ph', { 'data-screen': screen, 'data-motion': reduced ? 'reduced' : null });
  app.replaceChildren(root);
  return root;
}

// ── The room in layers ──────────────────────────────────────────────────
const NS = 'http://www.w3.org/2000/svg';
const [VX, VY, VW, VH] = VIEW;
const r1 = x => Math.round(x * 10) / 10;
const deg = rad => r1((rad * 180) / Math.PI);
/** One drawing on its own ink canvas: its definitions and its marks. */
const ink = (prefix, draw) => { const cv = M.inkCanvas(prefix); draw(cv); return `<defs>${cv.defs()}</defs>${cv.layer('body')}`; };
const ORDER = ['back', 'festoon', 'base', 'cabBack', 'winch', 'cabFront', 'panel', 'console', 'plates', 'high'];

/**
 * The Supply Room as stacked layers, back to front in the order of scene.mjs sceneSvg(): each drawn again
 * only when what it shows changes. The carriage, the hook and the crate are drawn once (the ink's wobble
 * follows each outline, not its place in the room) and moved with a transform.
 */
class LiveScene {
  constructor(art) {
    this.layers = {};
    this.keys = {};
    this.parts = new Map();
    for (const name of ORDER) {
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', `${VX} ${VY} ${VW} ${VH}`);
      svg.setAttribute('aria-hidden', 'true');
      art.append(svg);
      this.layers[name] = svg;
    }
    this.layers.back.innerHTML = `<rect x="${VX}" y="${VY}" width="${VW}" height="${VH}" fill="#10141C"/>${roomBack()}`;
    this.layers.cabBack.innerHTML = ink('lcb', cv => M.cabBack(cv));
  }

  layer(name, key, make) {
    if (this.keys[name] === key) return;
    this.keys[name] = key;
    this.layers[name].innerHTML = make();
  }

  part(key, make) {
    let svg = this.parts.get(key);
    if (svg === undefined) {
      svg = make();
      if (this.parts.size >= 96) this.parts.delete(this.parts.keys().next().value);
      this.parts.set(key, svg);
    }
    return svg;
  }

  draw(pose) {
    const px = stopX(pose.panel.at);
    const pl = pose.platform, cab = pose.cab, co = pose.console;
    this.layer('festoon', r1(px), () => ink('lfe', cv => M.festoon(cv, px)));
    this.layer('base', `${r1(pl.drop)}|${pl.clamp}|${pl.lamp}`, () => ink('lpb', cv => M.platform(cv, { drop: pl.drop, clamp: pl.clamp, lampLit: pl.lamp, part: 'base' })));
    this.layer('winch', pose.alive.winch, () => {
      const [cx, cy, cw, ch] = BOXES.cab;
      return `<defs><clipPath id="lw-cab-inside"><rect x="${cx}" y="${cy + 18}" width="${cw}" height="${ch - 18}"/></clipPath></defs><g clip-path="url(#lw-cab-inside)">${operatorSvg('winch', CHARACTERS.winch, { down: !pose.alive.winch, prefix: 'lw' })}</g>`;
    });
    this.layer('cabFront', `${cab.cut}|${cab.lamp}|${cab.key}|${r1(cab.buffer ?? 0)}`, () => ink('lcf', cv => M.cabFront(cv, { cut: cab.cut, lampLit: cab.lamp, key: cab.key, buffer: cab.buffer })));
    this.layer('panel', pose.alive.panel, () => operatorSvg('panel', CHARACTERS.panel, { down: !pose.alive.panel, prefix: 'lp' }));
    this.layer('console', `${co.lamp}|${co.key}|${co.locked}|${co.near}`, () => ink('lco', cv => M.consoleFront(cv, { lampLit: co.lamp, key: co.key, locked: co.locked, near: co.near })));
    this.layer('plates', `${pose.panel.lit}`, () => ink('lst', cv => M.stopPlates(cv, { lit: pose.panel.lit })));
    this.layers.high.innerHTML = this.high(pose, px);
  }

  /** The front layer, as scene.mjs draws it: the carriage, the cable and the hook, the drop line, the crate, the jaws, effects. */
  high(pose, px) {
    const out = [];
    const blade = Math.round(pose.panel.blade);
    const wheel = Math.round((pose.panel.wheel ?? 0) / 4) * 4;
    const drum = Math.round((pose.panel.drum ?? 0) / 4) * 4;
    out.push(`<g transform="translate(${r1(px)} 0)">${this.part(`carriage|${blade}|${wheel}|${drum}`, () => ink('lca', cv => M.carriage(cv, 0, { blade, wheel, drum })))}</g>`);
    const pivot = [px, CARRIAGE.pivot];
    const c = pose.crate;
    let hook;
    if (c && c.hooked) {
      const eye = [c.x + Math.sin(c.tilt) * (CRATE / 2 + 6), c.y - Math.cos(c.tilt) * (CRATE / 2 + 6)];
      out.push(ink('lcl', cv => M.cable(cv, pivot, [eye[0] + Math.sin(c.tilt) * 34, eye[1] - Math.cos(c.tilt) * 34], { slack: pose.slack })));
      hook = { at: eye, engaged: true, tilt: c.tilt };
    } else {
      const hy = pose.hookY ?? 300;
      out.push(ink('lcl', cv => M.cable(cv, pivot, [px, hy - 34])));
      hook = { at: [px, hy], engaged: false, tilt: 0 };
    }
    out.push(`<g transform="translate(${r1(hook.at[0])} ${r1(hook.at[1])}) rotate(${deg(hook.tilt)})">${this.part(`hook|${hook.engaged}`, () => ink(hook.engaged ? 'lhe' : 'lhf', cv => M.hook(cv, 0, 0, { engaged: hook.engaged })))}</g>`);
    if (pose.line) out.push(ink('ldl', cv => M.dropLine(cv, pose.line.from, pose.line.to, { tone: pose.line.tone, t: pose.line.t ?? 1 })));
    if (c) out.push(`<g transform="translate(${r1(c.x)} ${r1(c.y)}) rotate(${deg(c.tilt)})">${this.part('crate', () => ink('lcr', cv => M.crate(cv, 0, 0)))}</g>`);
    out.push(this.part(`jaws|${r1(pose.platform.drop)}|${pose.platform.clamp}`, () => ink('ljw', cv => M.platform(cv, { drop: pose.platform.drop, clamp: pose.platform.clamp, part: 'jaws' }))));
    if (pose.effects.length) {
      out.push(ink('lfx', cv => {
        for (const e of pose.effects) {
          if (e.kind === 'letters') M.letters(cv, e.text, e.at, e);
          else if (e.kind === 'burst') M.burst(cv, e.at, e.r, e.t, e);
          else if (e.kind === 'speed') M.speed(cv, e.at, e.dir, e);
          else if (e.kind === 'clunk') M.clunk(cv, e.at, e.dir, e.t);
          else if (e.kind === 'brake') M.brake(cv, e.at);
          else if (e.kind === 'warn') M.warnMark(cv, e.at, e.t ?? 1);
        }
      }));
    }
    if (pose.dim > 0) out.push(`<rect width="${BOX[0]}" height="${BOX[1]}" fill="#10141C" opacity="${(pose.dim * 0.55).toFixed(3)}"/>`);
    return out.join('');
  }
}

/** The Supply Room as one still picture (the start and the result). */
function still(pose, title) {
  const hero = h('div.play-hero', { html: sceneSvg(pose, { characters: CHARACTERS, prefix: 'hero', crop: VIEW }) });
  hero.append(h('h1.play-title', title));
  return hero;
}

// ── The start ───────────────────────────────────────────────────────────
const CHOICES = {
  role: [
    ['panel', 'Panel', 'Left and right: RELEASE and LOCK. You are Cleo, at the console.', 'lock'],
    ['winch', 'Winch', 'Up and down: Raise and Lower. You are Hana, in the cab.', 'move'],
  ],
  partner: [
    ...Object.entries(PERSONAS).map(([k, p]) => [k, p.name, p.about, null]),
    ['surprise', 'Surprise me', 'Careful, clumsy or a betrayer: you find out at the end.', null],
  ],
  net: Object.entries(NETS).map(([k, n]) => [k, n.name, `Each press takes ${n.delay / 1000} s to reach the ship.`, null]),
};
const HOWTO = [
  ['Two of you, one control each', 'The game picks who runs which. The Panel moves the crane left and right; the Winch moves the crate up and down.'],
  ['The Panel', 'RELEASE sets the locking panel clicking from stop to stop. LOCK stops it at the stop it rests at. Lock it at 6, over the platform. At 7 it cuts the Winch\'s cab.'],
  ['The Winch', 'Raise lifts the crate. Locked, the crate swings. Lower drops it where its swing has it: over the platform it lands; over the Panel it falls on them.'],
  ['Then', 'Both turn a key: +5 packages for the ship.'],
  ['The buttons', 'Amber is the next press. Striped means a press now may kill your partner. Your press counts when it reaches the ship, a moment after you press.'],
];

function setup() {
  leave();
  const root = phone('food-play-start');
  const page = h('div.play-page');
  const rows = [];
  const group = (key, label) => [groupLabel(label), list(...CHOICES[key].map(([value, title, sub, icon]) => {
    const check = h('span.play-check');
    const r = row({ icon, title, sub, trail: check });
    r.dataset.choose = `${key}:${value}`;
    rows.push([r, key, value, check]);
    return r;
  }))];
  const mark = () => {
    for (const [r, key, value, check] of rows) {
      const on = settings[key] === value;
      r.setAttribute('aria-pressed', String(on));
      check.replaceChildren(...(on ? [ic('check', { filled: true })] : []));
    }
  };
  const start = button('Start', { icon: 'supply', block: true });
  start.dataset.start = '';
  const more = button('How the Task works', { kind: 'secondary', block: true });
  more.dataset.howto = '';
  const howto = h('div.play-howto', { hidden: true }, ...HOWTO.flatMap(([title, text]) => [groupLabel(title), h('p.play-intro', text)]));
  page.append(
    still(restPose(), 'Food Supply · practice'),
    h('p.play-intro', 'Play the Task on this phone against a bot partner. Your presses reach the ship after the connection\'s delay and count when they arrive, as in the game. 30 seconds, the briefing included.'),
    ...group('role', 'Your control'), ...group('partner', 'Your partner'), ...group('net', 'Connection'),
    h('div.play-actions', start, more), howto,
    h('p.play-note', 'A practice run, not the game: no server, no other players, nothing saved but these choices on this phone. Your partner is a bot.'));
  root.append(page);
  mark();
  page.addEventListener('click', e => {
    const c = e.target.closest('[data-choose]');
    if (c) { const [k, v] = c.dataset.choose.split(':'); settings[k] = v; store.set(k, v); mark(); return; }
    if (e.target.closest('[data-start]')) play();
    else if (e.target.closest('[data-howto]')) howto.hidden = !howto.hidden;
  });
}

// ── The Task, live ──────────────────────────────────────────────────────
const NAMES = { lock: 'LOCK', release: 'RELEASE', raise: 'Raise', lower: 'Lower', key: 'key' };
const WHY = { stale: 'The crane had moved on.', busy: 'The crate was still moving.', ended: 'The Task was over.', briefing: 'The briefing was still on.' };
const KEYS = { ' ': ['release', 'lock'], ArrowUp: ['raise'], ArrowDown: ['lower'], Enter: ['key'] };

function play() {
  leave();
  const persona = settings.partner === 'surprise' ? surprise(Math.random) : settings.partner;
  const run = createPractice({ role: settings.role, persona, net: settings.net });
  const role = run.role, seat = run.seats[role];
  const you = person(role), them = person(other(role));
  const root = phone('food-play');

  let bar = topBar({ kind: 'pair', pair: [you, them], sub: `Food Supply · you run the ${ROLES[role].name}`, seconds: 30, urgentAt: 10, menu: false });
  root.append(bar);
  const top = bar.offsetHeight;
  const art = h('div.fs-art.play-live');
  const viewEl = h('div.fs-view', { role: 'img' }, art);
  const scene = new LiveScene(art);
  const tags = {};
  for (const r of ['winch', 'panel']) {
    const [tx, ty] = TAGS[r];
    const x = r === 'winch' ? BOXES.cab[0] + BOXES.cab[2] - 6 : tx;
    tags[r] = h('span.tag', { 'data-self': r === role ? '' : null, 'data-anchor': r === 'winch' ? 'end' : null, style: { left: `${((x - VIEW[0]) / VIEW[2]) * 100}%`, top: `min(${((ty - 14 - VIEW[1]) / VIEW[3]) * 100}%, calc(100% - 30px))` } });
    art.append(tags[r]);
  }
  const who = h('span.fs-who');
  const hintEl = h('p.fs-hint', { role: 'status', 'aria-live': 'polite' });
  const controls = h('div.fs-controls', { 'data-role': role, role: 'group', 'aria-label': `${ROLES[role].name} controls` });
  const dock = h('div.fs-dock', controls);
  const panel = h('section.fs-panel', { 'aria-label': 'Your controls' },
    h('div.fs-role', pill(`${ROLES[role].name} · ${ROLES[role].axis === 'vertical' ? 'up and down' : 'left and right'}`, { icon: role === 'panel' ? 'lock' : 'move', tone: 'accent' }), who),
    hintEl, dock);
  root.append(h('div.fs-screen', { style: { top: `${top}px` } }, viewEl, panel));
  const fit = () => { viewEl.style.flexBasis = `${Math.round(root.clientWidth * VIEW[3] / VIEW[2])}px`; };
  fit();
  addEventListener('resize', fit);

  let gauge = null, card = null, note = null;
  const last = {};
  const t0 = performance.now();
  const clock = () => performance.now() - t0;
  const stats = { frames: 0, total: 0, max: 0 };
  window.__play = { settings: { ...settings }, persona, run, stats };
  // autoplay: a careful bot in the player's place too, pressing through the same delay.
  const auto = params.autoplay ? { scheduled: null, readyAt: 0, memory: {} } : null;

  const send = act => {
    const b = [...controls.querySelectorAll('.fs-ctl')].find(x => x.dataset.act === act);
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    run.press(act, clock());
  };
  root.addEventListener('pointerdown', e => {
    const b = e.target.closest('.fs-ctl');
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    e.preventDefault();
    run.press(b.dataset.act, clock());
  });
  onKey = e => {
    const acts = KEYS[e.key];
    if (!acts || e.repeat) return;
    e.preventDefault();
    const b = [...controls.querySelectorAll('.fs-ctl')].find(x => acts.includes(x.dataset.act) && x.getAttribute('aria-disabled') !== 'true');
    if (b) send(b.dataset.act);
  };
  addEventListener('keydown', onKey);

  function frame() {
    const began = performance.now();
    const t = clock();
    const { state, frames } = run.advance(t);
    if (t >= run.returnsAt) { removeEventListener('resize', fit); result(run, persona); return; }
    if (auto && state.phase === 'running' && state.alive[role] && !run.inFlight) {
      if (auto.scheduled && t >= auto.scheduled.at) { run.press(auto.scheduled.act, t); auto.scheduled = null; auto.readyAt = t + run.delay + 120; }
      else if (!auto.scheduled && t >= auto.readyAt) { const d = decide({ state, seat, t, persona: 'careful', delay: run.delay, memory: auto.memory }); if (d) auto.scheduled = { act: d.act, at: t + d.reaction }; }
    }
    const v = { ...view(state, seat, t), offline: false };
    const recent = frames.filter(f => f.at <= t && t - f.at < 1500).flatMap(f => f.events);
    const pose = poseAt(frames, t, { reduced });
    scene.draw(pose);
    if (pose.dim > 0.5) viewEl.dataset.dim = ''; else delete viewEl.dataset.dim;

    // The top bar: the time, and the partner's state.
    const sub = v.partner === 'down' ? `${them.name} is out` : `Food Supply · you run the ${ROLES[role].name}`;
    const seconds = v.phase === 'ended' ? null : v.secondsLeft;
    if (`${sub}|${seconds}` !== last.bar) {
      last.bar = `${sub}|${seconds}`;
      const next = topBar({ kind: 'pair', pair: [you, them], sub, seconds, urgentAt: 10, menu: false });
      if (v.partner !== 'alive') next.dataset.partner = v.partner;
      bar.replaceWith(next);
      bar = next;
    }
    // The name tags and the partner's line.
    if (`${state.alive.winch}|${state.alive.panel}` !== last.alive) {
      last.alive = `${state.alive.winch}|${state.alive.panel}`;
      for (const r of ['winch', 'panel']) {
        const p = person(r);
        tags[r].replaceChildren(...[h('b.num', String(p.seat)), h('span', r === role ? 'You' : p.name), state.alive[r] ? null : h('span.status', '· Out')].filter(Boolean));
      }
      who.dataset.state = v.partner;
      who.replaceChildren(h('b', `${them.seat} ${them.name}`), ` · ${ROLES[other(role)].name}${v.partner === 'down' ? ' · Out' : ''}`);
    }
    const label = describe(v);
    if (label !== last.label) { last.label = label; viewEl.setAttribute('aria-label', label); }
    // The hint.
    const hint = hintFor(v, recent);
    if (`${hint.tone}|${hint.icon}|${hint.text}` !== last.hint) {
      last.hint = `${hint.tone}|${hint.icon}|${hint.text}`;
      if (hint.tone) hintEl.dataset.tone = hint.tone; else delete hintEl.dataset.tone;
      hintEl.replaceChildren(ic(hint.icon, { filled: true }), h('span', hint.text));
    }
    // The strip or the meter, drawn each frame; the controls, drawn again only when they change.
    const g = v.crate.state === 'landed' || v.phase === 'ended' ? null : role === 'panel' ? sweepStrip(v) : swingMeter(v);
    if (gauge) gauge.remove();
    if (g) dock.insertBefore(g, controls);
    gauge = g;
    const p = run.inFlight ? { press: 'sending', act: run.inFlight.act } : {};
    const sig = JSON.stringify([p.press ?? '', p.act ?? '', v.crate.state === 'landed', v.buttons.map(b => [b.act, b.label, b.enabled, b.next, b.hazard, b.zone, b.turned, subOf(b, v, p)])]);
    if (sig !== last.controls) {
      last.controls = sig;
      if (v.crate.state === 'landed') controls.dataset.landed = ''; else delete controls.dataset.landed;
      controls.replaceChildren(...v.buttons.map(b => control(b, v, p)));
    }
    // A short buzz when your own press would now kill (where the phone can vibrate).
    const danger = v.buttons.some(b => b.hazard && b.enabled);
    if (danger && !last.danger) try { navigator.vibrate?.(40); } catch { /* no vibration here */ }
    last.danger = danger;
    // Cards: the briefing, your end, the outcome; after a kill, the card waits for the impact to play.
    const kill = frames.find(f => f.at <= t && f.events.some(e => e.type === 'KILLED'));
    const settled = !kill || t - kill.at >= CUES.impact.ms;
    const cardKey = v.phase === 'briefing' ? `brief|${v.briefingLeft}` : v.you === 'down' && settled ? 'out' : v.phase === 'ended' && settled ? `end|${v.outcome?.result}` : '';
    if (cardKey !== last.card) {
      last.card = cardKey;
      card?.remove();
      card = null;
      if (cardKey.startsWith('brief')) card = briefingCard(role, v, top);
      else if (cardKey === 'out') {
        const how = kill?.events.find(e => e.type === 'KILLED')?.kind === 'cut' ? "The panel's blade came down into your cab." : 'The crate fell on you.';
        card = outcomeCard({ title: 'You are out', stamp: 'Eliminated', body: [h('p', `${how} Not the Hospital: you are out of the match.`), h('p', `You return to ${ROOM_NAMES[CAST[role].from.room]} as you fell.`)] }, top + 24);
      } else if (cardKey.startsWith('end')) card = endCard(v, role, top);
      if (card) root.append(card);
    }
    // A stop, or your own press that was not done.
    const stop = recent.find(e => e.type === 'STOPPED');
    const ans = run.answer;
    const refused = ans?.refused && t - ans.at < 1600 ? ans : null;
    const noteKey = `${stop && v.phase === 'running' ? stop.kind : ''}|${refused ? `${refused.act}${refused.at}` : ''}`;
    if (noteKey !== last.note) {
      last.note = noteKey;
      note?.remove();
      note = null;
      if (refused) note = h('div.fs-banner', { style: { top: `${top + 12}px` } }, banner({ icon: 'info', title: `Your ${NAMES[refused.act] ?? 'press'} was not done`, sub: WHY[refused.refused] ?? 'It could not be done just then.' }));
      else if (stop && v.phase === 'running') note = h('div.fs-banner', { style: { top: `${top + 12}px` } }, toast(stop.kind === 'cut' ? "Stopped · the cab's buffer held" : 'Stopped · the winch brake held', 'block'));
      if (note) root.append(note);
    }
    const spent = performance.now() - began;
    stats.frames += 1; stats.total += spent; stats.max = Math.max(stats.max, spent);
    loop = requestAnimationFrame(frame);
  }
  loop = requestAnimationFrame(frame);
}

// ── The result ──────────────────────────────────────────────────────────
function result(run, persona) {
  leave();
  const s = run.summary();
  const role = run.role;
  const nameOf = (r, capital = false) => (r === role ? (capital ? 'You' : 'you') : person(r).name);
  const o = s.outcome;
  const title = o?.result === 'delivered' ? `Delivered: +${o.packages} packages` : o?.result === 'cancelled' ? 'Cancelled' : 'Lost';
  const lines = [];
  for (const k of s.kills) lines.push(k.kind === 'cut' ? `${nameOf(k.by, true)} locked the panel over the cab: the blade cut ${nameOf(k.victim)}.` : `${nameOf(k.by, true)} lowered the crate over the console: it fell on ${nameOf(k.victim)}.`);
  if (s.stops.length) lines.push(`The safety catch held ${s.stops.length === 1 ? 'once' : `${s.stops.length} times`} (CLANK!). Luck or Protection: nobody can tell.`);
  if (o?.result === 'delivered') lines.push(`${o.alone ? 'Delivered alone' : 'Delivered by both'}, the crate down at ${(s.sentAt / 1000).toFixed(1)} s.`);
  else if (o?.why === 'time') lines.push('The time ran out before the crate went down.');
  else if (o?.why === 'not-in-position') lines.push('A death away from the platform: the Task was lost at once.');
  lines.push(`Your presses: ${s.presses}${s.refused ? `, ${s.refused} not done` : ''}.`);
  lines.push(`Your partner was ${PERSONAS[persona].name.toLowerCase()}${settings.partner === 'surprise' ? ' (the surprise)' : ''}. Connection: ${NETS[settings.net].name.toLowerCase()}.`);
  const root = phone('food-play-result');
  const again = button('Play again', { icon: 'supply', block: true });
  again.dataset.again = '';
  const change = button('Change the settings', { kind: 'secondary', block: true });
  change.dataset.change = '';
  const page = h('div.play-page',
    still(poseAt(run.frames, run.returnsAt), 'Back in Room B'),
    h('section.play-result', h('h2', title), h('ul', ...lines.map(l => h('li', l)))),
    h('div.play-actions', again, change),
    h('p.play-note', 'Other players would learn only the food count. A practice run with a bot partner: not the game.'));
  root.append(page);
  window.__play = { ...(window.__play ?? {}), summary: s, persona };
  page.addEventListener('click', e => {
    if (e.target.closest('[data-again]')) play();
    else if (e.target.closest('[data-change]')) setup();
  });
}

if (params.auto) play();
else setup();
document.fonts?.ready.then(() => { window.__playReady = true; });
