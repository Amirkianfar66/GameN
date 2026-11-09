// mothership:dev-only
//
// H–N: the room views, the whole board, the top bar and the tabs, Actions, Card and More.

import { h, ic, pt, button, iconButton, topBar, tabs, sheet, row, list, groupLabel, groupNote, stamp, pill, toast, banner } from './ui.mjs';
import { ROOM_NAMES } from './art.mjs';
import { SELF, ROSTER, ROLE_FIXTURES, ROOM_FIXTURES, seatOf } from './fixtures.mjs';
import { game, turnBar, seatsFor } from './screens.mjs';
import { roleCard } from './screens-pregame.mjs';

// ── Shared pieces ───────────────────────────────────────────────────────
/** A floating chip above the tabs: a room's own interaction, or the way to targets in other rooms. */
export const floating = (label, { icon = 'chevronRight', go = null, tone = 'paper' } = {}) =>
  h('div.offroom', h('button.btn.btn-sm', { type: 'button', 'data-go': go, style: { background: tone === 'paper' ? 'var(--paper)' : 'var(--surface-3)', color: tone === 'paper' ? 'var(--ink)' : 'var(--text-primary)', borderRadius: '999px', minHeight: '44px', padding: '0 16px', boxShadow: 'var(--shadow-soft)', '--ic-knock': 'var(--paper)' } }, ic(icon, { filled: true }), h('span', label)));

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
    t('move', 'move', 'Move', { note: 'Once a round', go: 's=room&room=room-a&state=move' }),
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

export const GAME_SCREENS = {
  /** H. The player's own room, full screen. state: turn | own | reconnecting | stale; stamp: round1. */
  room(root, p) {
    const room = p.room ?? 'room-a';
    const fixture = ROOM_FIXTURES[room];
    const state = p.state ?? 'turn';
    const active = ['own', 'move'].includes(state) ? SELF : fixture.active;
    const top = state === 'reconnecting' ? topBar({ kind: 'phase', icon: 'retry', title: 'Reconnecting…', sub: 'Showing Round 3 as last seen', round: 3, seconds: null })
      : turnBar({ active, round: p.stamp ? 1 : 3, seconds: p.stamp ? 60 : 42 });
    const occupied = new Set(seatsFor(fixture).filter(x => x.location === ROOM_NAMES[room]).map(x => x.slot));
    const empty = { 'room-a': ['A1', 'A2', 'A3', 'A4', 'A5'], 'room-b': ['B1', 'B2', 'B3', 'B4', 'B5'] }[room]?.filter(id => !occupied.has(id)) ?? [];
    game(root, {
      top,
      scene: { kind: 'room', room, active, veil: state === 'reconnecting' ? 'rgba(10,13,19,0.45)' : null, slots: state === 'move' ? { ids: empty, picked: p.slot ?? null, icon: 'move' } : null },
      tabs: { hero: active === SELF ? 'pass' : 'pass-off', go: { switch: 's=board', actions: `s=actions&role=Doctor&active=${active}`, card: 's=card&role=Doctor', more: 's=more', hero: 's=room&room=room-a' } },
      overlay: [
        state === 'reconnecting' ? banner({ icon: 'offline', title: 'Connection lost', sub: 'Controls return when the match is current', action: button('Retry', { kind: 'secondary', small: true }) }) : null,
        p.stamp ? h('div', { style: { position: 'absolute', inset: '0', display: 'grid', placeItems: 'center', zIndex: 3500, pointerEvents: 'none' } }, h('span.stamp', { 'data-tone': 'gold', style: { fontSize: '2.25rem', padding: '10px 20px 8px' } }, 'ROUND 1')) : null,
        state === 'move' ? targetBar('move', p.slot ? `Move to ${p.slot}` : 'Move within Room A', p.slot ? 'Uses this round’s move · register to confirm' : 'Choose an empty position · or another room on the Board', { cancel: 's=room&room=room-a&state=own' }) : null,
        state === 'move' && !p.slot ? floating('Other rooms on the Board', { icon: 'board', go: 's=board&state=move' }) : null,
        state !== 'reconnecting' && state !== 'move' && !p.stamp ? roomInteraction(room) : null,
        room === 'jail' && state !== 'reconnecting' ? h('div.offroom', pill('Detained · you can still vote', { icon: 'jail', tone: 'paper' })) : null,
      ],
    });
  },

  /** I. The whole board. state: overview | move | moved | targets. Switching views never moves anyone. */
  board(root, p) {
    const state = p.state ?? 'overview';
    const s = { kind: 'board', room: 'room-a', active: 7 };
    if (state === 'move') s.slotsByRoom = MOVE_SLOTS;
    if (state === 'targets') { s.targets = [5]; s.dimOthers = true; }
    game(root, {
      top: state === 'move' ? turnBar({ active: SELF, seconds: 38 }) : turnBar(),
      scene: s,
      tabs: { hero: state === 'move' ? 'pass' : 'pass-off', go: { switch: 's=room&room=room-a', actions: 's=actions&role=Doctor&active=4', card: 's=card&role=Doctor', more: 's=more' } },
      overlay: [
        state === 'move' ? targetBar('move', 'Move', 'Choose an empty position · uses this round’s move', { cancel: 's=room&room=room-a&state=own' }) : null,
        state === 'targets' ? targetBar('rescue', 'Rescue', 'Choose a player · Hospital shown', { cancel: 's=actions&role=Doctor&active=4' }) : null,
      ],
    });
  },

  // ── J. Top bar specimens ──────────────────────────────────────────────
  topbars(root) {
    root.style.overflow = 'auto';
    const items = [
      ['Another player’s turn', turnBar({ active: 7, seconds: 42 })],
      ['Your turn', turnBar({ active: SELF, seconds: 51 })],
      ['Last 10 seconds', turnBar({ active: 2, seconds: 8 })],
      ['Before turns (no active player)', topBar({ kind: 'phase', icon: 'hourglass', title: 'Before turns', sub: 'Officer block · Blackhole', round: 3, seconds: 12 })],
      ['Captain election', topBar({ kind: 'phase', icon: 'captain', title: 'Captain election', sub: 'Your ballot is private', round: 2, seconds: 47 })],
      ['Officer appointment', topBar({ kind: 'phase', icon: 'officer', title: 'Captain appoints an Officer', sub: 'Ben chooses', round: 2, seconds: 24 })],
      ['Jail vote', topBar({ kind: 'phase', icon: 'vote', title: 'Jail vote', sub: 'Your ballot is private', round: 3, seconds: 37 })],
      ['Vote result (5 s)', topBar({ kind: 'phase', icon: 'jail', title: 'Jail vote · result', round: 3, seconds: 4, ring: 0.2, urgentAt: -1 })],
      ['Private talk', topBar({ kind: 'pair', pair: [seatOf(1), seatOf(2)], sub: 'Private talk', round: 3, seconds: 54 })],
      ['Blackout, lit', topBar({ kind: 'phase', icon: 'lit', title: 'Blackout', sub: 'Lights out in 0:03', round: 3, seconds: 13 })],
      ['Blackout, dark', topBar({ kind: 'phase', icon: 'dark', title: 'Blackout', sub: 'Dark · positions fixed', round: 3, seconds: 8, tone: 'dark' })],
      ['Ship synchronized (6 s)', topBar({ kind: 'phase', icon: 'blackhole', title: 'Ship synchronized', round: 4, seconds: 5, ring: 0.17, urgentAt: -1 })],
      ['Navigation', topBar({ kind: 'phase', icon: 'course', title: 'Setting course', sub: 'Round 3 complete', round: 3, seconds: 11 })],
      ['Reconnecting', topBar({ kind: 'phase', icon: 'retry', title: 'Reconnecting…', sub: 'Showing Round 3 as last seen', round: 3, seconds: null })],
    ];
    root.append(h('div', { style: { position: 'absolute', inset: 0, overflow: 'auto', background: '#05070B' } }, items.map(([label, bar]) => {
      const box = h('div.specimen', { style: { '--h': '60px', '--safe-t': '0px' } }, bar, h('span.specimen-label', label));
      bar.style.setProperty('--safe-t', '0px');
      return box;
    })));
  },

  // ── K. Bottom tab specimens ───────────────────────────────────────────
  navbars(root) {
    const items = [
      ['Room view · another player’s turn', { view: 'room', hero: 'pass-off' }],
      ['Room view · your turn', { view: 'room', hero: 'pass' }],
      ['Board view (first tab says Room)', { view: 'board', hero: 'pass-off' }],
      ['Actions open', { view: 'room', hero: 'pass', open: 'actions' }],
      ['Card open', { view: 'room', hero: 'pass-off', open: 'card' }],
      ['More open · one new offer', { view: 'room', hero: 'pass-off', open: 'more', badges: { more: 1 } }],
      ['Voting · Vote replaces Pass', { view: 'room', hero: 'vote' }],
      ['Ballot registered', { view: 'room', hero: 'voted' }],
      ['Eliminated · Actions unavailable', { view: 'room', hero: 'pass-off', disabled: { actions: true } }],
    ];
    root.append(h('div', { style: { position: 'absolute', inset: 0, overflow: 'auto', background: '#05070B', paddingTop: '6px' } }, items.map(([label, cfg]) => {
      const bar = tabs(cfg);
      bar.style.setProperty('--safe-b', '0px');
      return h('div.specimen', { style: { '--h': '96px', '--safe-b': '0px' } }, bar, h('span.specimen-label', { style: { top: '6px', bottom: 'auto' } }, label));
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
    const tabsCfg = { hero: own ? 'pass' : 'pass-off', open: state === 'list' ? 'actions' : null, go: { switch: 's=board', card: `s=card&role=${encodeURIComponent(role)}`, more: 's=more' } };
    const scene = { kind: 'room', room, active: own ? SELF : ROOM_FIXTURES[room].active };
    const ACT = {
      rescue: { icon: 'rescue', label: 'Rescue', targets: [1, 4, 7, 9], off: [5], verb: 'Rescue', facts: ['Uses 1 of 2 shared injections', 'Registered now · resolves after the vote', 'Does not revive an eliminated player'] },
      protect: { icon: 'protect', label: 'Grant Protection', targets: [1, 4, 7, 9], off: [], verb: 'Protect', facts: ['Starts next round', 'A player can be protected once a match'] },
      talk: { icon: 'talk', label: 'Private talk', targets: [1, 7, 9], off: [], verb: 'Talk with', facts: ['Once a match', 'Starts after this turn: up to 15 s to declare, 5 s result, then 60 s'] },
      supply: { icon: 'supply', label: 'Supply', targets: [1, 4, 7, 9], off: [], verb: 'Supply', facts: ['Choose two players', 'Each gets one weapon after the vote'] },
      blackout: { icon: 'blackout', label: 'Blackout', targets: null, verb: 'Request Blackout', facts: ['Once a match', 'Registered now · the lights go out later this round', 'You will choose a position while it is dark'] },
      suppress: { icon: 'suppress', label: 'Suppress navigation', targets: null, verb: 'Suppress navigation', facts: ['Once a match', 'Captures who is in Room B right now', 'Only their navigation weight, this round'] },
      clone: { icon: 'clone', label: 'Clone', targets: null, verb: 'Activate Clone', facts: ['Once a match', 'Lasts through next round’s attacks'] },
    }[act];
    const here = seatsFor(ROOM_FIXTURES[room]).filter(x => x.location === ROOM_NAMES[room]).map(x => x.seat);
    if (ACT && ACT.targets) ACT.targets = act === 'talk' ? here.filter(n => n !== SELF) : here;
    if (ACT && ACT.off && !['room-a', 'room-b'].includes(room)) ACT.off = [];
    if (state === 'list' || state === 'spent') {
      const overrides = state === 'spent' ? { talk: { state: 'spent', note: 'Used' }, rescue: { state: 'registered', note: 'Eli · after the vote' } } : {};
      const body = [
        h('div.section-head', h('h3', own ? 'Your turn' : 'Not your turn'), h('span', 'Round 3')),
        h('div.tiles', roleTiles(role, p, own ? overrides : Object.fromEntries(['rescue', 'protect', 'supply', 'blackout', 'suppress', 'clone', 'scan', 'code', 'move', 'talk'].map(k => [k, { state: 'unavailable', note: 'On your turn' }])))),
        own ? null : groupNote('Movement is open on any turn while your round’s move is unused.'),
      ];
      game(root, { top: turnBar({ active: own ? SELF : 7, seconds: 42 }), scene, tabs: tabsCfg, sheet: sheet({ title: 'Actions', sub: `${role} · Room A`, body, close: 's=room&room=room-a' }) });
      return;
    }
    if (state === 'targeting') {
      game(root, {
        top: turnBar({ active: SELF, seconds: 36 }),
        scene: { ...scene, targets: ACT.targets, picked: [] },
        tabs: { ...tabsCfg, open: null },
        overlay: [targetBar(ACT.icon, ACT.label, act === 'supply' ? 'Choose two players' : 'Choose a player'), ACT.off.length ? floating(`Other rooms · ${ACT.off.length}`, { icon: 'board', go: `s=actions&${roleQuery(p, `&state=offroom&act=${act}`)}` }) : null],
      });
      return;
    }
    if (state === 'offroom') {
      const body = [
        h('div.offroom-list', groupLabel('Hospital'), list(row({ lead: pt(seatOf(5).character, 40), title: 'Eli', sub: 'Player 5 · Injured', chevron: true, go: `s=actions&${roleQuery(p, '&state=confirm&act=rescue')}` }))),
        h('div', { style: { marginTop: '14px' } }, button('Show on board', { kind: 'secondary', block: true, icon: 'board', go: 's=board&state=targets' })),
      ];
      game(root, { top: turnBar({ active: SELF, seconds: 33 }), scene: { ...scene, targets: ACT.targets }, tabs: { ...tabsCfg, open: null }, sheet: sheet({ title: 'Other rooms', sub: 'Rescue reaches Hospital from Room A or B', body, back: `s=actions&${roleQuery(p, '&state=targeting&act=rescue')}`, close: false }) });
      return;
    }
    const target = act === 'rescue' ? seatOf(5) : act === 'talk' ? seatOf(1) : act === 'protect' ? seatOf(7) : null;
    const confirmBody = [
      h('div.confirm-who', target ? pt(target.character, 64) : h('span.tile-icon', ic(ACT.icon, { filled: true })),
        h('div', h('b', target ? `${ACT.verb} ${target.name}` : ACT.verb), h('span', target ? `Player ${target.seat} · ${act === 'rescue' ? 'Hospital' : 'Room A'}` : 'Only you see this'))),
      h('ul.facts', ACT.facts.map(f => h('li', ic('info', { filled: true }), h('span', f)))),
    ];
    if (state === 'registered') {
      const body = [h('div.registered', stamp('REGISTERED', 'amber'), h('p', target ? `${ACT.verb} ${target.name}` : ACT.verb), h('p', act === 'blackout' ? 'Nothing changes until the lights go out.' : 'Nothing happens yet. It resolves after the vote.'))];
      game(root, { top: turnBar({ active: SELF, seconds: 29 }), scene, tabs: { ...tabsCfg, open: null }, sheet: sheet({ title: ACT.label, body, foot: [button('Done', { kind: 'secondary', go: 's=room&room=room-a&state=own' })], close: false }) });
      return;
    }
    game(root, {
      top: turnBar({ active: SELF, seconds: 31 }),
      scene: target && target.seat !== 5 ? { ...scene, targets: [target.seat], picked: [target.seat] } : scene,
      tabs: { ...tabsCfg, open: null },
      sheet: sheet({ title: 'Check and register', body: confirmBody, close: false,
        foot: [button('Cancel', { kind: 'secondary', go: `s=actions&${roleQuery(p)}` }), button(state === 'submitting' ? 'Registering…' : 'Register', { busy: state === 'submitting', go: `s=actions&${roleQuery(p, `&state=registered&act=${act}`)}` })] }),
    });
  },

  // ── M. Card ────────────────────────────────────────────────────────────
  /** state: card | knows | holds | hidden */
  card(root, p) {
    const role = p.role ?? 'Doctor';
    const state = p.state ?? 'card';
    const fx = ROLE_FIXTURES[role];
    const seg = h('div.seg', { role: 'tablist', style: { margin: '10px 0 2px', flex: 'none' } },
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
      tabs: { open: 'card', go: { switch: 's=board', actions: 's=actions&role=Doctor&active=7', more: 's=more' } },
      sheet: sheet({ title: 'Your role', sub: 'Only on this phone', body, detent: 'large', close: 's=room&room=room-a',
        actions: state === 'hidden' ? [] : [iconButton('hide', 'Hide card', { go: `s=card&role=${encodeURIComponent(role)}&state=hidden` })] }),
    });
  },

  // ── N. More ────────────────────────────────────────────────────────────
  more(root, p) {
    const host = p.host === '1';
    const body = [
      list(
        row({ icon: 'promise', tint: 'amber', title: 'Promises', sub: 'Given 0/1 · Received 1/1', value: h('span.pill', { 'data-tone': 'amber' }, '1 offer'), chevron: true, go: 's=promises&state=list' }),
        row({ icon: 'window', tint: 'paper', title: 'Windows', sub: 'Room A ↔ Room B · Room A ↔ Hospital', chevron: true, go: 's=windows&state=view' }),
        row({ icon: 'course', tint: 'slate', title: 'Navigation', sub: 'Captain and Officer only', chevron: true, disabled: true }),
        row({ icon: 'panel', tint: 'teal', title: 'Hospital panel', sub: 'Patients only', chevron: true, disabled: true })),
      h('div', { style: { height: '14px' } }),
      list(
        row({ icon: 'players', tint: 'steel', title: 'Players', sub: 'Seats, rooms and public status', chevron: true, go: 's=players' }),
        row({ icon: 'rules', tint: 'steel', title: 'Round order', sub: 'Phases and timings', chevron: true, go: 's=rules' })),
      h('div', { style: { height: '14px' } }),
      list(
        row({ icon: 'settings', tint: 'steel', title: 'Display', sub: 'Reduce motion · Text size', chevron: true, go: 's=settings' }),
        host ? row({ icon: 'host', tint: 'amber', title: 'Host controls', sub: 'Bots, deadlines, recovery, abort', chevron: true, go: 's=host-controls' }) : null),
    ];
    game(root, { top: turnBar(), scene: { kind: 'room', room: 'room-a' }, tabs: { open: 'more', badges: { more: 1 }, go: { switch: 's=board', actions: 's=actions&role=Doctor&active=7', card: 's=card&role=Doctor' } }, sheet: sheet({ title: 'More', body, close: 's=room&room=room-a' }) });
  },
};
