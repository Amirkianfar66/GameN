// mothership:dev-only
//
// H–N: the room views, the whole board, the top bar and the tabs, Actions, Card and Panels.

import { h, ic, pt, button, iconButton, topBar, tabs, sheet, row, list, groupLabel, groupNote, stamp, pill, toast, banner } from './ui.mjs';
import { ROOM_NAMES } from './art.mjs';
import { SELF, ROSTER, ROLE_FIXTURES, ROOM_FIXTURES, seatOf } from './fixtures.mjs';
import { game, turnBar, seatsFor } from './screens.mjs';
import { roleCard } from './screens-pregame.mjs';

// ── Shared pieces ───────────────────────────────────────────────────────
/** A floating chip above the tabs: a room's own interaction, or the way to targets in other rooms (kit.css `.offroom`). */
export const floating = (label, { icon = 'chevronRight', go = null, tone = 'paper' } = {}) =>
  h('div.offroom', h('button.btn.btn-sm', { type: 'button', 'data-go': go, 'data-tone': tone === 'paper' ? null : 'surface' }, ic(icon, { filled: true }), h('span', label)));

/** The target bar that replaces the sheet while a player picks on the scene. */
export const targetBar = (icon, title, sub, { cancel = 's=actions&role=Doctor&active=4' } = {}) =>
  h('div.target-bar', { role: 'status' }, h('span.tile-icon', ic(icon, { filled: true })), h('div.banner-text', h('b', title), h('span', sub)), button('Cancel', { kind: 'secondary', small: true, go: cancel }));

/** An action tile. state: available | selected | submitting | registered | unavailable | spent. */
export function tile(icon, label, { state = 'available', note = null, badge = null, go = null } = {}) {
  const interactive = ['available', 'selected'].includes(state);
  return h(interactive ? 'button.tile' : 'div.tile', { type: interactive ? 'button' : null, 'data-state': state, 'data-go': interactive ? go : null, 'aria-disabled': interactive ? null : 'true',
    'aria-label': `${label}${note ? `, ${note}` : ''}${state === 'registered' ? ', registered' : ''}` },
  h('span.tile-icon', ic(icon, { filled: state !== 'unavailable' && state !== 'spent' })),
  h('b', label), note ? h('small', note) : null,
  badge ? h('span.tile-badge', badge) : null,
  state === 'registered' ? h('span.mini-stamp', 'REGISTERED') : null);
}

const roleQuery = (p, extra = '') => `role=${encodeURIComponent(p.role ?? 'Doctor')}&active=${p.active ?? SELF}${extra}`;

/** What each role's phone offers in an ordinary turn (Round 3, Room A, synthetic). */
function roleTiles(role, p, overrides = {}) {
  const q = extra => `s=actions&${roleQuery(p, extra)}`;
  const t = (key, icon, label, opts) => tile(icon, label, { ...opts, ...(overrides[key] ?? {}) });
  const common = [
    t('move', 'move', 'Move', { note: 'Once a round', go: `s=room&room=room-a&state=move${Number(p.active ?? SELF) === SELF ? '' : `&active=${p.active}`}` }),
    t('talk', 'talk', 'Private talk', { note: 'Once a match', go: q('&state=targeting&act=talk') }),
    t('shoot', 'shoot', 'Shoot', { state: 'unavailable', note: 'From Round 4' }),
  ];
  const own = {
    Doctor: [t('rescue', 'rescue', 'Rescue', { badge: '2', note: '2 injections', go: q('&state=targeting&act=rescue') })],
    Insider: [],
    'Blue Disabler': [t('blackout', 'blackout', 'Blackout', { note: 'Once a match', go: q('&state=confirm&act=blackout') })],
    'Red Disabler': [t('blackout', 'blackout', 'Blackout', { note: 'Once a match', go: q('&state=confirm&act=blackout') })],
    Supplier: [t('supply', 'supply', 'Supply', { note: 'Round 3 only', go: q('&state=targeting&act=supply') })],
    Engineer: [t('suppress', 'suppress', 'Suppress', { note: 'Once a match', go: q('&state=confirm&act=suppress') })],
    Undercover: [t('protect', 'protect', 'Protect', { note: 'Your room', go: q('&state=targeting&act=protect') })],
    Hacker: [t('scan', 'scan', 'Scan', { note: 'Your room', go: 's=scan&state=target' }), t('code', 'code', 'Final Code', { note: 'One attempt', go: 's=code&state=pick' }), t('ship', 'shipHack', 'Hack Ship', { state: 'unavailable', note: 'Needs the Code' })],
    Alien: [t('clone', 'clone', 'Clone', { note: 'Once a match', go: q('&state=confirm&act=clone') }), t('blackhole', 'blackhole', 'Blackhole', { state: 'unavailable', note: 'Before turns, in office' })],
  }[role] ?? [];
  return [...own, ...common];
}

// ── After Register ──────────────────────────────────────────────────────
// What the server's acceptance did, action by action, in Frontend's words where it has them
// (packages/presentation/src/copy/en.ts: acceptedTarget, acceptedDetail, supplyAccepted). A registered
// action waits for the end of the round and is never drawn as an outcome; a Clone is active at once
// (CLONE-01, P17); the Engineer's capture is fixed at once (P14); a private talk starts after the turn.
export function afterRegister(act, target, room) {
  const who = target ? (target.seat === SELF ? 'yourself' : target.name) : '';
  const them = target ? (target.seat === SELF ? 'you' : target.name) : '';
  const waits = 'This is not a result. Registered actions are resolved at the end of the round.';
  const inB = seatsFor(ROOM_FIXTURES[room]).filter(x => x.location === 'Room B').map(x => seatOf(x.seat));
  return {
    rescue: { kind: 'waits', stamp: 'REGISTERED', tone: 'pending', title: `Rescue of ${who} registered.`, detail: waits,
      steps: [['done', 'Registered', 'Round 3 · your turn'], ['next', 'End of Round 3', 'Rescue is resolved, after the attacks']] },
    protect: { kind: 'waits', stamp: 'REGISTERED', tone: 'pending', title: `Protection for ${who} registered.`, detail: 'This is not a result. It is resolved at the end of this round and is active from Round 4.',
      steps: [['done', 'Registered', 'Round 3 · your turn'], ['next', 'End of Round 3', 'Resolved with the round’s actions'], ['later', 'Round 4', `Protection for ${them}: active`]] },
    supply: { kind: 'waits', stamp: 'REGISTERED', tone: 'pending', title: 'Supply for Ava and Gus registered.', detail: waits,
      steps: [['done', 'Registered', 'Round 3 · your turn'], ['next', 'End of Round 3', 'Each gets one weapon']] },
    shoot: { kind: 'waits', stamp: 'REGISTERED', tone: 'pending', title: `Shot at ${who} registered.`, detail: 'This is not a result. Registered shots are resolved at the end of the round.',
      steps: [['done', 'Registered', 'Round 4 · your turn'], ['next', 'End of Round 4', 'Resolved; Protection and Clone are checked then']] },
    blackout: { kind: 'waits', stamp: 'REGISTERED', tone: 'pending', title: 'Blackout registered.', detail: 'This is not a result. Nothing changes until the lights go out later this round.',
      steps: [['done', 'Registered', 'Round 3 · your turn'], ['next', 'Later this round', '5 s lit, then 10 s dark'], ['later', 'While it is dark', 'You choose a frozen position']] },
    talk: { kind: 'waits', stamp: 'ACCEPTED', tone: 'pending', title: `Private talk with ${who} accepted.`, detail: 'It starts after this turn. The top bar shows each step.',
      steps: [['done', 'Accepted', 'Round 3 · your turn'], ['next', 'After this turn', `Up to 15 s for ${them} to declare a side`], ['later', 'Then', '5 s for the claim, then 60 s to talk']] },
    clone: { kind: 'now', stamp: 'ACTIVE', tone: 'amber', title: 'Clone active.', detail: 'Active from now, through the attacks at the end of Round 4. It used your main action for this round.',
      steps: [['done', 'Active now', 'Round 3 · when the server accepted it'], ['next', 'End of Round 4', 'Ends after that round’s attacks']] },
    suppress: { kind: 'now', stamp: 'CAPTURED', tone: 'steel', title: 'Navigation suppressed.', detail: `Captured now: the ${inB.length} players in Room B. Their navigation weight is removed this round. Only you are told.`, people: inB,
      steps: [['done', 'Captured', 'Round 3 · when the server accepted it'], ['next', 'This round’s navigation', 'Their weight is removed']] },
  }[act];
}

/** A short time line: what has happened (done) and what is still to come (next, later). */
const steps = items => h('ol.steps', items.map(([state, title, sub]) => h('li', { 'data-step': state },
  h('span.step-dot', ic(state === 'done' ? 'check' : 'hourglass', { filled: state === 'done' })), h('div', h('b', title), h('span', sub)))));

// ── H. Room views ───────────────────────────────────────────────────────
function roomInteraction(room) {
  return {
    'room-a': floating('Window · Hospital', { icon: 'window', go: 's=windows&state=draw' }),
    'room-b': floating('Windows · 2', { icon: 'window', go: 's=windows&state=view' }),
    'command-room': floating('Captain console', { icon: 'captain', go: 's=captain&state=console' }),
    hospital: floating('Hospital panel', { icon: 'panel', go: 's=panel&state=enter' }),
    jail: null,
  }[room];
}

// ── I. The board ────────────────────────────────────────────────────────
const MOVE_SLOTS = { 'room-a': { ids: ['A5'] }, 'room-b': { ids: ['B4', 'B5'] } };
/** Whose turn follows the player's in the synthetic turn order. */
const NEXT_SEAT = 5;

export const GAME_SCREENS = {
  /**
   * H. The player's own room, full screen. state: turn | own | move | pass (Pass asks once) | passed (the
   * turn has moved on) | reconnecting; stamp: round1.
   */
  room(root, p) {
    const room = p.room ?? 'room-a';
    const fixture = ROOM_FIXTURES[room];
    const state = p.state ?? 'turn';
    const next = seatOf(NEXT_SEAT);
    // Moving works on anyone's turn (p.active names whose); Pass and the rest are the player's own turn.
    const active = p.active ? Number(p.active) : ['own', 'move', 'pass'].includes(state) ? SELF : state === 'passed' ? NEXT_SEAT : fixture.active;
    const top = state === 'reconnecting' ? topBar({ kind: 'phase', icon: 'retry', title: 'Reconnecting…', sub: 'Showing Round 3 as last seen', round: 3, seconds: null })
      : turnBar({ active, round: p.stamp ? 1 : 3, seconds: p.stamp || state === 'passed' ? 60 : 42 });
    const occupied = new Set(seatsFor(fixture).filter(x => x.location === ROOM_NAMES[room]).map(x => x.slot));
    const empty = { 'room-a': ['A1', 'A2', 'A3', 'A4', 'A5'], 'room-b': ['B1', 'B2', 'B3', 'B4', 'B5'] }[room]?.filter(id => !occupied.has(id)) ?? [];
    // Pass asks once: the turn cannot be taken back. Moving is not lost by passing.
    const passSheet = state === 'pass' ? sheet({ title: 'Pass your turn?', sub: `The turn goes to ${next.name} · Player ${next.seat}`,
      body: [groupNote('Your move stays open on the other turns this round.')], close: false,
      foot: [button('Cancel', { kind: 'secondary', go: `s=room&room=${room}&state=own` }), button('Pass', { icon: 'pass', go: `s=room&room=${room}&state=passed` })] }) : null;
    game(root, {
      top,
      scene: { kind: 'room', room, active, veil: state === 'reconnecting' ? 'rgba(10,13,19,0.45)' : null, slots: state === 'move' ? { ids: empty, picked: p.slot ?? null, icon: 'move' } : null },
      tabs: { hero: active === SELF ? 'pass' : 'pass-off', go: { switch: 's=board', actions: `s=actions&role=Doctor&active=${active}`, card: 's=card&role=Doctor', panels: 's=panels', hero: active === SELF && state !== 'pass' ? `s=room&room=${room}&state=pass` : null } },
      sheet: passSheet,
      toast: state === 'passed' ? toast('Turn passed', 'info') : null,
      overlay: [
        state === 'reconnecting' ? banner({ icon: 'offline', title: 'Connection lost', sub: 'Controls return when the match is current', action: button('Retry', { kind: 'secondary', small: true }) }) : null,
        p.stamp ? h('div', { style: { position: 'absolute', inset: '0', display: 'grid', placeItems: 'center', zIndex: 3500, pointerEvents: 'none' } }, h('span.stamp', { 'data-tone': 'gold', style: { fontSize: '2.25rem', padding: '10px 20px 8px', pointerEvents: 'auto' } }, 'ROUND 1')) : null,
        state === 'move' ? targetBar('move', p.slot ? `Move to ${p.slot}` : 'Move within Room A', p.slot ? 'Uses this round’s move · register to confirm' : 'Choose an empty position · or another room on the Board', { cancel: active === SELF ? 's=room&room=room-a&state=own' : 's=room&room=room-a' }) : null,
        state === 'move' && !p.slot ? floating('Other rooms on the Board', { icon: 'board', go: 's=board&state=move' }) : null,
        !['reconnecting', 'move', 'pass'].includes(state) && !p.stamp ? roomInteraction(room) : null,
        room === 'jail' && state !== 'reconnecting' ? h('div.offroom', pill('Detained · you can still vote', { icon: 'jail', tone: 'paper' })) : null,
      ],
    });
  },

  /** I. The whole board. state: overview | move | moved | targets. Switching views never moves anyone. */
  board(root, p) {
    const state = p.state ?? 'overview';
    const s = { kind: 'board', room: 'room-a', active: 7 };
    if (state === 'move') s.slotsByRoom = MOVE_SLOTS;
    // Choosing a person in another room (from an action's Other rooms): everyone the action can reach is
    // pressable where they stand, the rest dimmed; List is the same choice as text.
    // The fixture's one cross-room action is the Doctor's Rescue: Room A's people and, in Hospital, Eli.
    const act = 'rescue';
    const here = seatsFor(ROOM_FIXTURES['room-a']).filter(x => x.location === 'Room A').map(x => x.seat);
    const reach = { icon: 'rescue', label: 'Rescue', targets: [...here, 5] };
    const q = extra => `role=${encodeURIComponent(p.role ?? 'Doctor')}&active=${p.active ?? SELF}${extra}`;
    if (state === 'targets') { s.targets = reach.targets; s.dimOthers = true; s.targetGo = n => `s=actions&${q(`&state=confirm&act=${act}&target=${n}`)}`; }
    game(root, {
      top: state === 'move' || state === 'targets' ? turnBar({ active: SELF, seconds: 38 }) : turnBar(),
      scene: s,
      tabs: { hero: state === 'move' || state === 'targets' ? 'pass' : 'pass-off', go: { switch: 's=room&room=room-a', actions: 's=actions&role=Doctor&active=4', card: 's=card&role=Doctor', panels: 's=panels' } },
      overlay: [
        state === 'move' ? targetBar('move', 'Move', 'Choose an empty position · uses this round’s move', { cancel: 's=room&room=room-a&state=own' }) : null,
        state === 'targets' ? targetBar(reach.icon, reach.label, 'Choose a player · every room', { cancel: `s=actions&${q(`&state=targeting&act=${act}`)}` }) : null,
        state === 'targets' ? floating('List', { icon: 'players', go: `s=actions&${q(`&state=offroom&act=${act}`)}` }) : null,
      ],
    });
  },

  // ── J. Top bar specimens ──────────────────────────────────────────────
  /** part: 1 (turns and phases) | 2 (votes, talk, Blackout and recovery) | none (all, scrolling). */
  topbars(root, p = {}) {
    root.style.overflow = 'auto';
    const items = [
      ['Another player’s turn', turnBar({ active: 7, seconds: 42 })],
      ['Your turn', turnBar({ active: SELF, seconds: 51 })],
      ['Last 10 seconds', turnBar({ active: 2, seconds: 8 })],
      ['Promises · one new offer', turnBar({ active: 7, seconds: 42, promises: { badge: 1 } })],
      ['Before turns (no active player)', topBar({ kind: 'phase', icon: 'hourglass', title: 'Before turns', sub: 'Officer block · Blackhole', round: 3, seconds: 12 })],
      ['Captain election', topBar({ kind: 'phase', icon: 'captain', title: 'Captain election', sub: 'Your ballot is private', round: 2, seconds: 47 })],
      ['Officer appointment', topBar({ kind: 'phase', icon: 'officer', title: 'New Officer', sub: 'Ben chooses', round: 2, seconds: 24 })],
      ['Jail vote', topBar({ kind: 'phase', icon: 'vote', title: 'Jail vote', sub: 'Your ballot is private', round: 3, seconds: 37 })],
      ['Vote result (5 s)', topBar({ kind: 'phase', icon: 'jail', title: 'Jail vote · result', round: 3, seconds: 4, ring: 0.2, urgentAt: -1 })],
      ['Private talk', topBar({ kind: 'pair', pair: [seatOf(1), seatOf(2)], sub: 'Private talk', round: 3, seconds: 54 })],
      ['Blackout, lit', topBar({ kind: 'phase', icon: 'lit', title: 'Blackout', sub: 'Lights out in 0:03', round: 3, seconds: 13 })],
      ['Blackout, dark', topBar({ kind: 'phase', icon: 'dark', title: 'Blackout', sub: 'Dark · positions fixed', round: 3, seconds: 8, tone: 'dark' })],
      ['Ship synchronized (6 s)', topBar({ kind: 'phase', icon: 'blackhole', title: 'Ship synchronized', round: 4, seconds: 5, ring: 0.17, urgentAt: -1 })],
      ['Navigation', topBar({ kind: 'phase', icon: 'course', title: 'Setting course', sub: 'Round 3 complete', round: 3, seconds: 11 })],
      ['Reconnecting', topBar({ kind: 'phase', icon: 'retry', title: 'Reconnecting…', sub: 'Showing Round 3 as last seen', round: 3, seconds: null })],
    ];
    const part = Number(p.part ?? 0);
    const shown = part === 1 ? items.slice(0, 8) : part === 2 ? items.slice(8) : items;
    // Each bar at its own height, without the phone's top safe area, with its name under it.
    root.append(h('div', { style: { position: 'absolute', inset: 0, overflow: 'auto', background: '#05070B', paddingTop: 'var(--safe-t)' } }, shown.map(([label, bar]) => {
      const box = h('div.specimen', { style: { '--h': 'calc(var(--bar-h) + 26px)', '--safe-t': '0px' } }, bar, h('span.specimen-label', label));
      bar.style.setProperty('--safe-t', '0px');
      bar.style.setProperty('--top', 'var(--bar-h)');
      return box;
    })));
  },

  // ── K. Bottom tab specimens ───────────────────────────────────────────
  /** part: 1 (views and tabs) | 2 (votes and elimination) | none (all, scrolling). */
  navbars(root, p = {}) {
    const items = [
      ['Room view · another player’s turn', { view: 'room', hero: 'pass-off' }],
      ['Room view · your turn', { view: 'room', hero: 'pass' }],
      ['Board view (first tab says Room)', { view: 'board', hero: 'pass-off' }],
      ['Actions open', { view: 'room', hero: 'pass', open: 'actions' }],
      ['Card open', { view: 'room', hero: 'pass-off', open: 'card' }],
      ['Panels open', { view: 'room', hero: 'pass-off', open: 'panels' }],
      ['Voting · Vote replaces Pass', { view: 'room', hero: 'vote' }],
      ['Ballot registered', { view: 'room', hero: 'voted' }],
      ['Eliminated · Actions unavailable', { view: 'room', hero: 'pass-off', disabled: { actions: true } }],
    ];
    const part = Number(p.part ?? 0);
    const shown = part === 1 ? items.slice(0, 5) : part === 2 ? items.slice(5) : items;
    // Each bar at its own height, without the home-indicator area: its name above, then room for the raised hero.
    root.append(h('div', { style: { position: 'absolute', inset: 0, overflow: 'auto', background: '#05070B', paddingTop: 'var(--safe-t)' } }, shown.map(([label, cfg]) => {
      const bar = tabs(cfg);
      bar.style.setProperty('--safe-b', '0px');
      bar.style.setProperty('--bottom', 'var(--tab-h)');
      return h('div.specimen', { style: { '--h': 'calc(var(--tab-h) + 44px)', '--safe-b': '0px' } }, bar, h('span.specimen-label', { style: { top: '4px', bottom: 'auto' } }, label));
    })));
  },

  // ── L. Actions ────────────────────────────────────────────────────────
  /** state: list | targeting | offroom | confirm | submitting | registered | spent; act: the action. */
  actions(root, p) {
    const role = p.role ?? 'Doctor';
    const state = p.state ?? 'list';
    const act = p.act ?? 'rescue';
    const own = Number(p.active ?? SELF) === SELF;
    const room = p.room ?? 'room-a';
    const tabsCfg = { hero: own ? 'pass' : 'pass-off', open: state === 'list' ? 'actions' : null, go: { switch: 's=board', card: `s=card&role=${encodeURIComponent(role)}`, panels: 's=panels' } };
    const scene = { kind: 'room', room, active: own ? SELF : ROOM_FIXTURES[room].active };
    const ACT = {
      rescue: { icon: 'rescue', label: 'Rescue', targets: [1, 4, 7, 9], off: [5], verb: 'Rescue', confirm: 'Register Rescue', facts: ['Uses 1 of 2 shared injections', 'Resolved at the end of the round, after the attacks', 'Does not revive an eliminated player'] },
      protect: { icon: 'protect', label: 'Grant Protection', targets: [1, 4, 7, 9], off: [], verb: 'Protect', confirm: 'Register Protection', facts: ['Resolved at the end of the round, active from the next', 'A player can be protected once a match'] },
      talk: { icon: 'talk', label: 'Private talk', targets: [1, 7, 9], off: [], verb: 'Talk with', confirm: 'Request private talk', busy: 'Requesting…', facts: ['Once a match', 'Starts after this turn: up to 15 s to declare, 5 s result, then 60 s'] },
      supply: { icon: 'supply', label: 'Supply', targets: [1, 4, 7, 9], off: [], verb: 'Supply', confirm: 'Register Supply', facts: ['Choose two players', 'Each gets one weapon at the end of the round'] },
      shoot: { icon: 'shoot', label: 'Shoot', targets: [1, 4, 7, 9], off: [], verb: 'Shoot', confirm: 'Register shot', facts: ['Uses 1 weapon', 'Resolved at the end of the round', 'Protection and Clone are checked then'] },
      blackout: { icon: 'blackout', label: 'Blackout', targets: null, verb: 'Request Blackout', confirm: 'Request Blackout', facts: ['Once a match', 'Registered now · the lights go out later this round', 'You will choose a position while it is dark'] },
      suppress: { icon: 'suppress', label: 'Suppress navigation', targets: null, verb: 'Suppress navigation', confirm: 'Suppress navigation', facts: ['Once a match', 'Captures who is in Room B right now', 'Only their navigation weight, this round'] },
      clone: { icon: 'clone', label: 'Clone', targets: null, verb: 'Activate Clone', confirm: 'Activate Clone', busy: 'Activating…', facts: ['Once a match', 'Active as soon as the server accepts it', 'Lasts through next round’s attacks'] },
    }[act];
    const here = seatsFor(ROOM_FIXTURES[room]).filter(x => x.location === ROOM_NAMES[room]).map(x => x.seat);
    if (ACT && ACT.targets) ACT.targets = act === 'talk' ? here.filter(n => n !== SELF) : here;
    if (ACT && ACT.off && !['room-a', 'room-b'].includes(room)) ACT.off = [];
    if (state === 'list' || state === 'spent') {
      const overrides = state === 'spent' ? { talk: { state: 'spent', note: 'Used' }, rescue: { state: 'registered', note: 'Eli · end of round' } } : {};
      // Off your turn, Move (any turn, once a round) and the Hacker's Final Code (any phase from Round 2) stay
      // open, as the engine allows; every other action waits for your turn.
      const body = [
        h('div.section-head', h('h3', own ? 'Your turn' : 'Not your turn'), h('span', 'Round 3')),
        h('div.tiles', roleTiles(role, p, own ? overrides : Object.fromEntries(['rescue', 'protect', 'supply', 'blackout', 'suppress', 'clone', 'scan', 'talk'].map(k => [k, { state: 'unavailable', note: 'On your turn' }])))),
        own ? null : groupNote(role === 'Hacker' ? 'Move and the Final Code work on any turn. The rest wait for your turn.' : 'Move works on any turn, once a round. The rest wait for your turn.'),
      ];
      game(root, { top: turnBar({ active: own ? SELF : 7, seconds: 42 }), scene, tabs: tabsCfg, sheet: sheet({ title: 'Actions', sub: `${role} · Room A`, body, close: 's=room&room=room-a' }) });
      return;
    }
    if (state === 'targeting') {
      // Tapping a person picks them (one-target actions): the check opens with that person.
      const pick = ['rescue', 'protect', 'talk'].includes(act) ? n => `s=actions&${roleQuery(p, `&state=confirm&act=${act}&target=${n}`)}` : null;
      game(root, {
        top: turnBar({ active: SELF, seconds: 36 }),
        scene: { ...scene, targets: ACT.targets, targetGo: pick, picked: [] },
        tabs: { ...tabsCfg, open: null },
        overlay: [targetBar(ACT.icon, ACT.label, act === 'supply' ? 'Choose two players' : 'Choose a player'), ACT.off.length ? floating(`Other rooms · ${ACT.off.length}`, { icon: 'board', go: `s=board&state=targets&${roleQuery(p, `&act=${act}`)}` }) : null],
      });
      return;
    }
    if (state === 'offroom') {
      // The text alternative to choosing on the board (the board's List button): everyone the action can
      // reach, room by room, each row going to the same check as a tap on the person.
      const seats = seatsFor(ROOM_FIXTURES[room]);
      const rowFor = n => { const x = seats.find(q => q.seat === n); const who = seatOf(n); return row({ lead: pt(who.character, 40), title: who.seat === SELF ? `${who.name} (you)` : who.name, sub: `Player ${n}${x?.health && x.health !== 'Healthy' ? ` · ${x.health}` : ''}`, chevron: true, go: `s=actions&${roleQuery(p, `&state=confirm&act=${act}&target=${n}`)}` }); };
      const groups = [[ROOM_NAMES[room], ACT.targets], ['Hospital', ACT.off]].filter(([, seatsIn]) => seatsIn.length);
      const body = [h('div.offroom-list', groups.map(([name, seatsIn]) => [groupLabel(name), list(seatsIn.map(rowFor))]))];
      game(root, { top: turnBar({ active: SELF, seconds: 33 }), scene: { ...scene, targets: ACT.targets }, tabs: { ...tabsCfg, open: null }, sheet: sheet({ title: 'Choose from a list', sub: `${ACT.label} · everyone you can reach`, body, back: `s=board&state=targets&${roleQuery(p, `&act=${act}`)}`, close: false }) });
      return;
    }
    const target = p.target ? seatOf(Number(p.target)) : act === 'rescue' ? seatOf(5) : act === 'talk' ? seatOf(1) : act === 'protect' ? seatOf(7) : null;
    const targetRoom = target ? seatsFor(ROOM_FIXTURES[room]).find(x => x.seat === target.seat)?.location ?? ROOM_NAMES[room] : null;
    const confirmBody = [
      h('div.confirm-who', target ? pt(target.character, 64) : h('span.tile-icon', ic(ACT.icon, { filled: true })),
        h('div', h('b', target ? `${ACT.verb} ${target.seat === SELF ? 'yourself' : target.name}` : ACT.verb), h('span', target ? `Player ${target.seat} · ${targetRoom}` : 'Only you see this'))),
      h('ul.facts', ACT.facts.map(f => h('li', ic('info', { filled: true }), h('span', f)))),
    ];
    if (state === 'registered') {
      const A = afterRegister(act, target, room);
      const body = [h('div.after', { 'data-kind': A.kind },
        h('div.after-head', { role: 'status' }, stamp(A.stamp, A.tone), h('h3', A.title)),
        h('p.after-detail', A.detail),
        A.people ? list(A.people.map(x => row({ tag: 'div', lead: pt(x.character, 36), title: x.name, sub: `Player ${x.seat} · in Room B when accepted` }))) : null,
        steps(A.steps))];
      game(root, { top: turnBar({ active: SELF, seconds: 29, round: act === 'shoot' ? 4 : 3 }), scene, tabs: { ...tabsCfg, open: null }, sheet: sheet({ title: ACT.label, body, foot: [button('Done', { kind: 'secondary', go: 's=room&room=room-a&state=own' })], close: false }) });
      return;
    }
    const picked = p.target ? `&target=${p.target}` : '';
    game(root, {
      top: turnBar({ active: SELF, seconds: 31 }),
      scene: target && targetRoom === ROOM_NAMES[room] ? { ...scene, targets: [target.seat], picked: [target.seat] } : scene,
      tabs: { ...tabsCfg, open: null },
      sheet: sheet({ title: 'Check and register', body: confirmBody, close: false,
        foot: [button('Cancel', { kind: 'secondary', go: `s=actions&${roleQuery(p)}` }), button(state === 'submitting' ? (ACT.busy ?? 'Registering…') : ACT.confirm, { busy: state === 'submitting', go: `s=actions&${roleQuery(p, `&state=registered&act=${act}${picked}`)}` })] }),
    });
  },

  // ── M. Card ────────────────────────────────────────────────────────────
  /** state: card | knows | holds | hidden */
  card(root, p) {
    const role = p.role ?? 'Doctor';
    const state = p.state ?? 'card';
    const fx = ROLE_FIXTURES[role];
    // data-stack: with the largest text the three words no longer fit side by side, so they stack (kit.css).
    const seg = h('div.seg', { role: 'tablist', 'data-stack': '', style: { margin: '10px 0 2px', flex: 'none' } },
      [['card', 'Card'], ['knows', 'Knowledge'], ['holds', 'Resources']].map(([k, l]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(state === k), 'aria-pressed': String(state === k), 'data-go': `s=card&role=${encodeURIComponent(role)}&state=${k}` }, l)));
    let body;
    if (state === 'hidden') body = [h('div.cardback', { style: { maxWidth: '240px' } }, ic('hide'), h('p', 'Hidden'), button('Show', { kind: 'secondary', small: true, icon: 'show', go: `s=card&role=${encodeURIComponent(role)}` }))];
    else if (state === 'knows') body = [seg, fx.knows.length ? list(fx.knows.map(k => row({ tag: 'div', icon: 'info', tint: 'paper', title: k.label, value: k.value }))) : groupNote('Your role starts with no knowledge of other players.'),
      role === 'Hacker' ? [groupLabel('Scans'), list(row({ tag: 'div', icon: 'scan', tint: 'paper', title: 'Round 2 · Player 7', sub: 'Guess Blue · matched · in the Code' }))] : null];
    else if (state === 'holds') body = [seg, list(
      row({ tag: 'div', icon: 'shoot', tint: 'steel', title: 'Weapons', value: String(fx.resources.weapons) }),
      row({ tag: 'div', icon: 'actions', tint: 'steel', title: 'Role Action', value: 'Available' }),
      row({ tag: 'div', icon: 'move', tint: 'steel', title: 'Move', value: 'Used this round' }),
      role === 'Doctor' ? row({ tag: 'div', icon: 'rescue', tint: 'teal', title: 'Shared injections', value: '2 of 2' }) : null,
      row({ tag: 'div', icon: 'promise', tint: 'steel', title: 'Promises', value: 'Given 0/1 · Received 1/1' }))];
    else body = [h('div.card-fit', roleCard(role)), seg];
    game(root, {
      top: turnBar(),
      scene: { kind: 'room', room: 'room-a' },
      tabs: { open: 'card', go: { switch: 's=board', actions: 's=actions&role=Doctor&active=7', panels: 's=panels' } },
      sheet: sheet({ title: 'Your role', sub: 'Only on this phone', body, detent: 'large', close: 's=room&room=room-a',
        actions: state === 'hidden' ? [] : [iconButton('hide', 'Hide card', { go: `s=card&role=${encodeURIComponent(role)}&state=hidden` })] }),
    });
  },

  // ── N. Panels ──────────────────────────────────────────────────────────
  // The fifth tab (was More; the owner, 9 November). Promises moved to the top bar, after the name, and
  // Display and Host controls to the settings menu (⋮) beside the clock: Panels holds the match's panels.
  panels(root) {
    const body = [
      list(
        row({ icon: 'window', tint: 'paper', title: 'Windows', sub: 'Room A ↔ Room B · Room A ↔ Hospital', chevron: true, go: 's=windows&state=view' }),
        row({ icon: 'course', tint: 'slate', title: 'Navigation', sub: 'Captain and Officer only', chevron: true, disabled: true }),
        row({ icon: 'panel', tint: 'teal', title: 'Hospital panel', sub: 'Patients only', chevron: true, disabled: true })),
      h('div', { style: { height: '14px' } }),
      list(
        row({ icon: 'players', tint: 'steel', title: 'Players', sub: 'Seats, rooms and public status', chevron: true, go: 's=players' }),
        row({ icon: 'rules', tint: 'steel', title: 'Round order', sub: 'Phases and timings', chevron: true, go: 's=rules' })),
    ];
    game(root, { top: turnBar(), scene: { kind: 'room', room: 'room-a' }, tabs: { open: 'panels', go: { switch: 's=board', actions: 's=actions&role=Doctor&active=7', card: 's=card&role=Doctor' } }, sheet: sheet({ title: 'Panels', body, close: 's=room&room=room-a' }) });
  },
};
