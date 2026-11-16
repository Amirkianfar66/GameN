// mothership:dev-only
//
// The kit beside the pack, case by case, for design/tools/kit-check.mjs. Each case draws one of the pinned
// pack's builders (design/phone-ui/prototype/ui.mjs: the frozen Food release pins it and its kit.css, so they
// stay as they are) and the kit's (../kit.mjs) from the same inputs. The two halves are drawn in two pages,
// each with only its own styles (pack.html, kit.html), so neither page's rules can stand in for the other's.
//
// A case draws on a plain surface and, where it says 'both', on glass as well: inside the pack's sheet and
// inside the phone shell's docked sheet, where the game draws a component's content. A part is
// [name, the pack's selector, the kit's selector, options], from the case's own box; the check compares each
// part's box, its type and colours, its ::before and ::after, and an icon's drawing.

import { seatOf as seat } from '../../../prototype/fixtures.mjs';
import { HACK_ART } from '../../../../../apps/game/hosted/scene-drawing/phone-kit-art.mjs';

const BUTTON = (p, k) => [
  ['button', p, k, { pseudo: ['::before', '::after'] }],
  ['icon', `${p} > svg`, `${k} > .ms-k-btn-icon > svg`, { svg: true }],
  ['label', `${p} > span`, `${k} > .ms-k-btn-label`, { words: true }],
];
const KINDS = [['primary', 'Ready', 'check'], ['secondary', 'Promises', 'promise'], ['tinted', 'Copy code', 'copy'], ['plain', 'Skip', null], ['outline', 'Leave', 'leave'], ['warn', 'Accuse', 'warning']];

/** A row's parts, the n-th in a list. */
const ROW = n => {
  const p = `:scope > .list > li:nth-child(${n}) > .row`, k = `:scope > .ms-k-list > li:nth-child(${n}) > .ms-k-row`;
  return [
    [`row ${n}`, p, k, { pseudo: ['::before'] }],
    [`row ${n} icon`, `${p} > .row-icon`, `${k} > .ms-k-row-icon`],
    [`row ${n} icon drawing`, `${p} > .row-icon > svg`, `${k} > .ms-k-row-icon > svg`, { svg: true }],
    [`row ${n} portrait`, `${p} > .pt`, `${k} > .ms-k-row-lead > .ms-k-pt`, { portrait: true }],
    [`row ${n} title`, `${p} .row-title`, `${k} .ms-k-row-title`, { words: true }],
    [`row ${n} sub`, `${p} .row-sub`, `${k} .ms-k-row-sub`, { words: true }],
    [`row ${n} value`, `${p} > .row-value`, `${k} > .ms-k-row-value`, { words: true }],
    [`row ${n} switch`, `${p} > .switch`, `${k} > .ms-k-row-trail > .ms-k-switch`, { pseudo: ['::before', '::after'] }],
    [`row ${n} chevron`, `${p} > .row-chev`, `${k} > .ms-k-row-chev`],
    [`row ${n} chevron drawing`, `${p} > .row-chev > svg`, `${k} > .ms-k-row-chev > svg`, { svg: true }],
  ];
};

/** The pill a row holds as its value (0.6.1), as the pack's Promise rows put it (screens-more.mjs promiseRow). */
const ROW_PILL = n => {
  const p = `:scope > .list > li:nth-child(${n}) > .row > .row-value > .pill`, k = `:scope > .ms-k-list > li:nth-child(${n}) > .ms-k-row > .ms-k-row-value > .ms-k-pill`;
  return [
    [`row ${n} pill`, p, k],
    [`row ${n} pill drawing`, `${p} > svg`, `${k} > .ms-k-pill-icon > svg`, { svg: true }],
    [`row ${n} pill words`, `${p} > span`, `${k} > .ms-k-pill-label`, { words: true }],
  ];
};

/** A side card's parts (sheet 25's .declare-sides; 0.7.0): the tile, its art, its name, and its note with the lock. */
const CARD = n => {
  const p = `:scope > .declare-sides > :nth-child(${n})`, k = `:scope > .ms-k-tiles > :nth-child(${n})`;
  return [
    [`card ${n}`, p, k],
    [`card ${n} art`, `${p} > .hack-card`, `${k} > .ms-k-tile-art`],
    [`card ${n} art drawing`, `${p} > .hack-card > svg`, `${k} > .ms-k-tile-art > svg`],
    [`card ${n} name`, `${p} > b`, `${k} > .ms-k-tile-name`, { words: true }],
    [`card ${n} note`, `${p} > small`, `${k} > .ms-k-tile-note:not([hidden])`, { words: true }],
    [`card ${n} lock`, `${p} > small > svg`, `${k} > .ms-k-tile-note > svg`, { svg: true }],
  ];
};

/** A notice's parts (screens.css .registered; 0.7.0): the box, its stamp or its icon, and its lines. */
const NOTICE = ({ stamp = false, icon = false, lines = 1 } = {}) => [
  ['notice', ':scope > .registered', ':scope > .ms-k-notice'],
  ...(stamp ? [['stamp', ':scope > .registered > .stamp', ':scope > .ms-k-notice > .ms-k-stamp', { words: true }]] : []),
  ...(icon ? [['icon', ':scope > .registered > .big-icon', ':scope > .ms-k-notice > .ms-k-notice-icon'],
    ['icon drawing', ':scope > .registered > .big-icon > svg', ':scope > .ms-k-notice > .ms-k-notice-icon > svg', { svg: true }]] : []),
  ...Array.from({ length: lines }, (_, i) => [`line ${i + 1}`, `:scope > .registered > p:nth-of-type(${i + 1})`, `:scope > .ms-k-notice > p:nth-of-type(${i + 1})`, { words: true }]),
];

/** A waiting block's parts (screens.css .wait): the tile and its drawing, or a portrait; the title; the line and its spinner. */
const WAIT = ({ lead = false, spinner = false } = {}) => [
  ['wait', ':scope > .wait', ':scope > .ms-k-wait'],
  ...(lead ? [['portrait', ':scope > .wait > .pt', ':scope > .ms-k-wait > .ms-k-pt', { portrait: true }]]
    : [['tile', ':scope > .wait > .big-icon', ':scope > .ms-k-wait > .ms-k-wait-tile'], ['tile drawing', ':scope > .wait > .big-icon > svg', ':scope > .ms-k-wait > .ms-k-wait-tile > svg', { svg: true }]]),
  ['title', ':scope > .wait > h2', ':scope > .ms-k-wait > .ms-k-wait-title', { words: true }],
  ['line', ':scope > .wait > p', ':scope > .ms-k-wait > .ms-k-wait-line', { words: true }],
  ...(spinner ? [['spinner', ':scope > .wait > p > .spinner', ':scope > .ms-k-wait > .ms-k-wait-line > .ms-k-spinner']] : []),
];

/** A tile's parts, the n-th in the grid (screens.css .tile; the kit's from 0.6.0). */
const TILE = n => {
  const p = `:scope > .tiles > :nth-child(${n})`, k = `:scope > .ms-k-tiles > :nth-child(${n})`;
  return [
    [`tile ${n}`, p, k],
    [`tile ${n} icon`, `${p} > .tile-icon`, `${k} > .ms-k-tile-icon`, { pseudo: ['::after'] }],
    [`tile ${n} drawing`, `${p} > .tile-icon > svg`, `${k} > .ms-k-tile-icon > svg`, { svg: true }],
    [`tile ${n} name`, `${p} > b`, `${k} > .ms-k-tile-name`, { words: true }],
    [`tile ${n} note`, `${p} > small`, `${k} > .ms-k-tile-note:not([hidden])`, { words: true }],
    [`tile ${n} badge`, `${p} > .tile-badge`, `${k} > .ms-k-tile-badge:not([hidden])`, { words: true }],
    [`tile ${n} stamp`, `${p} > .mini-stamp`, `${k} > .ms-k-tile-stamp:not([hidden])`, { words: true }],
  ];
};
/** The pack's tile, as screens-game.mjs tile() builds it: a button while it can be chosen, else a div. */
const packTile = (ui, icon, label, { state = 'available', note = null, badge = null } = {}) => {
  const interactive = ['available', 'selected'].includes(state);
  return ui.h(interactive ? 'button.tile' : 'div.tile', { type: interactive ? 'button' : null, 'data-state': state, 'aria-disabled': interactive ? null : 'true' },
    ui.h('span.tile-icon', ui.ic(icon, { filled: state !== 'unavailable' && state !== 'spent' })),
    ui.h('b', label), note ? ui.h('small', note) : null,
    badge ? ui.h('span.tile-badge', badge) : null,
    state === 'registered' ? ui.h('span.mini-stamp', 'REGISTERED') : null);
};
/** Who's parts (screens.css .confirm-who): the person or the action's tile, the title and the line. */
const WHO = icon => [
  ['who', ':scope > .confirm-who', ':scope > .ms-k-who'],
  ...(icon ? [['lead', ':scope > .confirm-who > .tile-icon', ':scope > .ms-k-who > .ms-k-who-lead'],
    ['lead drawing', ':scope > .confirm-who > .tile-icon > svg', ':scope > .ms-k-who > .ms-k-who-lead > svg', { svg: true }]]
    : [['portrait', ':scope > .confirm-who > .pt', ':scope > .ms-k-who > .ms-k-who-lead > .ms-k-pt', { portrait: true }]]),
  ['title', ':scope > .confirm-who > div > b', ':scope > .ms-k-who > .ms-k-who-words > .ms-k-who-title', { words: true }],
  ['sub', ':scope > .confirm-who > div > span', ':scope > .ms-k-who > .ms-k-who-words > .ms-k-who-sub', { words: true }],
];
/** The facts' parts (screens.css .facts): the list, and each line's icon and words. */
const FACTS = n => [['facts', ':scope > .facts', ':scope > .ms-k-facts'], ...Array.from({ length: n }, (_, i) => {
  const p = `:scope > .facts > li:nth-child(${i + 1})`, k = `:scope > .ms-k-facts > .ms-k-fact:nth-child(${i + 1})`;
  return [[`fact ${i + 1}`, p, k], [`fact ${i + 1} icon`, `${p} > svg`, `${k} > svg`, { svg: true }], [`fact ${i + 1} words`, `${p} > span`, `${k} > .ms-k-fact-text`, { words: true }]];
}).flat()];

/** A cell's parts, the n-th of the 3 × 3. */
const CELL = n => {
  const p = `.grid9 > :nth-child(${n})`, k = `.ms-k-grid9 > :nth-child(${n})`;
  return [
    [`cell ${n}`, p, k],
    [`cell ${n} portrait`, `${p} > .pt`, `${k} > .ms-k-pt`, { portrait: true }],
    [`cell ${n} name`, `${p} > .cell-name`, `${k} > .ms-k-cell-name`],
    [`cell ${n} number`, `${p} > .cell-name > .num`, `${k} > .ms-k-cell-name > .ms-k-num`, { words: true }],
    [`cell ${n} label`, `${p} > .cell-name > span:last-child`, `${k} > .ms-k-cell-name > .ms-k-cell-label`, { words: true }],
    [`cell ${n} note`, `${p} > .cell-note`, `${k} > .ms-k-cell-note`, { words: true }],
    [`cell ${n} count`, `${p} > .count`, `${k} > .ms-k-count`, { words: true }],
    [`cell ${n} you`, `${p} > .you`, `${k} > .ms-k-you`, { words: true }],
    [`cell ${n} mark`, `${p} > .cell-mark`, `${k} > .ms-k-cell-mark`],
    [`cell ${n} mark drawing`, `${p} > .cell-mark > svg`, `${k} > .ms-k-cell-mark > svg`, { svg: true }],
  ];
};

export const CASES = Object.freeze([
  // ── Buttons ──
  ...KINDS.map(([kind, label, icon]) => ({
    id: `button ${kind}`, where: 'both',
    pack: ({ ui }) => ui.button(label, { kind, icon }),
    kit: ({ kit }) => kit.button({ label, kind, icon }),
    parts: BUTTON(':scope > .btn', ':scope > .ms-k-btn'),
  })),
  { id: 'button block', where: 'plain', pack: ({ ui }) => ui.button('Join the match', { icon: 'join', block: true }), kit: ({ kit }) => kit.button({ label: 'Join the match', icon: 'join', block: true }), parts: BUTTON(':scope > .btn', ':scope > .ms-k-btn') },
  { id: 'button small', where: 'both', pack: ({ ui }) => ui.button('Retry', { kind: 'secondary', small: true }), kit: ({ kit }) => kit.button({ label: 'Retry', kind: 'secondary', small: true }), parts: BUTTON(':scope > .btn', ':scope > .ms-k-btn') },
  { id: 'button unavailable', where: 'both', pack: ({ ui }) => ui.button('Pass', { icon: 'pass', disabled: true }), kit: ({ kit, control }) => control(kit.button({ label: 'Pass', icon: 'pass' }), { off: true }), parts: BUTTON(':scope > .btn', ':scope > .ms-k-btn') },
  { id: 'button busy', where: 'both', pack: ({ ui }) => ui.button('Send', { busy: true }), kit: ({ kit, control }) => control(kit.button({ label: 'Send' }), { busy: true }), parts: BUTTON(':scope > .btn', ':scope > .ms-k-btn') },
  { id: 'button busy secondary', where: 'both', pack: ({ ui }) => ui.button('Retry', { kind: 'secondary', small: true, busy: true }), kit: ({ kit, control }) => control(kit.button({ label: 'Retry', kind: 'secondary', small: true }), { busy: true }), parts: BUTTON(':scope > .btn', ':scope > .ms-k-btn') },
  { id: 'icon button', where: 'both', pack: ({ ui }) => ui.iconButton('close', 'Close'), kit: ({ kit }) => kit.iconButton({ icon: 'close', label: 'Close' }),
    parts: [['button', ':scope > .icon-btn', ':scope > .ms-k-icon-btn', { pseudo: ['::before'] }], ['drawing', ':scope > .icon-btn > svg', ':scope > .ms-k-icon-btn svg', { svg: true }]] },

  // ── Grouped lists and rows ──
  { id: 'list', where: 'both',
    pack: ({ ui }) => ui.list(
      ui.row({ icon: 'host', tint: 'amber', title: 'Host a match', sub: 'Up to 9 players', chevron: true }),
      ui.row({ title: 'Players', value: '7' }),
      ui.row({ lead: ui.pt('c4', 36), title: 'Ben', sub: 'Player 2', chevron: true }),
      ui.row({ tag: 'div', icon: 'motion', tint: 'steel', title: 'Reduce motion', sub: 'Films become stills', trail: ui.h('button.switch', { type: 'button', role: 'switch', 'aria-checked': 'true', 'aria-label': 'Reduce motion' }) }),
      ui.row({ icon: 'rules', tint: 'teal', title: 'Rules', chevron: true }),
      ui.row({ icon: 'history', tint: 'slate', title: 'History', value: '3' }),
      ui.row({ icon: 'jail', tint: 'paper', title: 'Jail', sub: 'Paper' })),
    kit: ({ kit, versions }) => kit.list(
      kit.row({ icon: 'host', tint: 'amber', title: 'Host a match', sub: 'Up to 9 players', chevron: true }),
      kit.row({ title: 'Players', value: '7' }),
      kit.row({ lead: kit.portrait(seat(2), versions), title: 'Ben', sub: 'Player 2', chevron: true }),
      kit.row({ tag: 'div', icon: 'motion', tint: 'steel', title: 'Reduce motion', sub: 'Films become stills', trail: kit.switchControl({ checked: true, label: 'Reduce motion' }) }),
      kit.row({ icon: 'rules', tint: 'teal', title: 'Rules', chevron: true }),
      kit.row({ icon: 'history', tint: 'slate', title: 'History', value: '3' }),
      kit.row({ icon: 'jail', tint: 'paper', title: 'Jail', sub: 'Paper' })),
    parts: [['list', ':scope > .list', ':scope > .ms-k-list'], ...[1, 2, 3, 4, 5, 6, 7].flatMap(ROW)] },
  { id: 'row unavailable', where: 'both',
    pack: ({ ui }) => ui.list(ui.row({ icon: 'jail', tint: 'paper', title: 'Jail', sub: 'Not this round', disabled: true })),
    kit: ({ kit, control }) => kit.list(control(kit.row({ icon: 'jail', tint: 'paper', title: 'Jail', sub: 'Not this round' }), { off: true })),
    parts: [...ROW(1), ['row 1 main', ':scope > .list > li > .row > .row-main', ':scope > .ms-k-list > li > .ms-k-row > .ms-k-row-main']] },
  // Kit 0.6.1: a row's value may be a node. Sheets 33 and 33.1 put a Promise's status there as a pill.
  { id: 'row pill value', where: 'both',
    pack: ({ ui }) => ui.list(
      ui.row({ tag: 'div', lead: ui.pt(seat(1).character, 36), title: 'Meet in Room A', sub: 'Offered to Ava · not counted yet', value: ui.pill('Offered') }),
      ui.row({ tag: 'div', lead: ui.pt(seat(2).character, 36), title: 'Vote with me', sub: 'From Ben · Round 2', value: ui.pill('Fulfilled', { icon: 'check', tone: 'amber' }) }),
      ui.row({ tag: 'div', lead: ui.pt(seat(3).character, 36), title: 'Captain Support', sub: 'To Cleo · Round 2', value: ui.pill('Not fulfilled') })),
    kit: ({ kit, versions }) => kit.list(
      kit.row({ tag: 'div', lead: kit.portrait(seat(1), versions), title: 'Meet in Room A', sub: 'Offered to Ava · not counted yet', value: kit.pill({ text: 'Offered' }) }),
      kit.row({ tag: 'div', lead: kit.portrait(seat(2), versions), title: 'Vote with me', sub: 'From Ben · Round 2', value: kit.pill({ text: 'Fulfilled', icon: 'check', tone: 'amber' }) }),
      kit.row({ tag: 'div', lead: kit.portrait(seat(3), versions), title: 'Captain Support', sub: 'To Cleo · Round 2', value: kit.pill({ text: 'Not fulfilled' }) })),
    parts: [['list', ':scope > .list', ':scope > .ms-k-list'], ...[1, 2, 3].flatMap(n => [...ROW(n), ...ROW_PILL(n)])] },
  // Kit 0.7.0: the section head (screens.css .section-head), as sheet 34 heads a window and sheet 28 the turn.
  { id: 'section head', where: 'both',
    pack: ({ ui }) => [ui.h('div.section-head', ui.h('h3', 'Room A ↔ Hospital'), ui.h('span', 'Your station · A2')), ui.h('div.section-head', ui.h('h3', 'Your turn'), ui.h('span', 'Round 3'))],
    kit: ({ kit }) => [kit.sectionHead({ title: 'Room A ↔ Hospital', aside: 'Your station · A2' }), kit.sectionHead({ title: 'Your turn', aside: 'Round 3' })],
    parts: [1, 2].flatMap(n => [
      [`head ${n}`, `:scope > .section-head:nth-child(${n})`, `:scope > .ms-k-section-head:nth-child(${n})`],
      [`head ${n} title`, `:scope > .section-head:nth-child(${n}) > h3`, `:scope > .ms-k-section-head:nth-child(${n}) > .ms-k-section-title`, { words: true }],
      [`head ${n} aside`, `:scope > .section-head:nth-child(${n}) > span`, `:scope > .ms-k-section-head:nth-child(${n}) > .ms-k-section-aside`, { words: true }]]) },
  { id: 'group', where: 'both',
    pack: ({ ui }) => [ui.groupLabel('In the match'), ui.list(ui.row({ title: 'Seats', value: '9' })), ui.groupNote('The host can change this before the match starts.')],
    kit: ({ kit }) => [kit.groupLabel('In the match'), kit.list(kit.row({ title: 'Seats', value: '9' })), kit.groupNote('The host can change this before the match starts.')],
    parts: [['label', ':scope > .group-label', ':scope > .ms-k-group-label', { words: true }], ['list', ':scope > .list', ':scope > .ms-k-list'], ['note', ':scope > .group-note', ':scope > .ms-k-group-note', { words: true }]] },

  // ── Fields, code boxes and the inline error ──
  ...[
    ['field', { value: 'Dev', count: '3/12' }],
    ['field empty', { value: '', placeholder: '1–12 characters', count: '0/12' }],
    ['field invalid', { value: 'Devendra Kumar', count: '14/12', invalid: true }],
    ['field mono', { label: 'Match ID', value: 'mtch-8f2c4e', mono: true }],
  ].map(([id, o]) => ({
    id, where: 'both',
    pack: ({ ui }) => ui.field(o.label ?? 'Your name', o),
    kit: ({ kit }) => kit.field({ label: o.label ?? 'Your name', ...o }).field,
    parts: [
      ['field', ':scope > .field', ':scope > .ms-k-field'],
      ['label', ':scope > .field > span', ':scope > .ms-k-field > .ms-k-field-label', { words: true }],
      ['box', ':scope > .field > .input', ':scope > .ms-k-field > .ms-k-input'],
      // The words typed: the pack draws them in a span, the kit in the real input, which runs to the count.
      ['text', ':scope > .field > .input > span:first-child:not(.ph-text)', ':scope > .ms-k-field > .ms-k-input > .ms-k-input-text:not(:placeholder-shown)', { box: 'xyh' }],
      ['placeholder', ':scope > .field > .input > .ph-text', ':scope > .ms-k-field > .ms-k-input > .ms-k-input-text:placeholder-shown', { box: 'none', placeholder: true }],
      ['count', ':scope > .field > .input > .count', ':scope > .ms-k-field > .ms-k-input > .ms-k-input-count', { words: true }],
    ],
  })),
  { id: 'code boxes', where: 'both', pack: ({ ui }) => ui.codeBoxes('K7Q', { focusAt: 3 }), kit: ({ kit }) => kit.codeBoxes({ code: 'K7Q', focusAt: 3 }),
    parts: [['group', ':scope > .code-boxes', ':scope > .ms-k-code'], ...[1, 3, 4, 6].map(n => [`box ${n}`, `:scope > .code-boxes > b:nth-child(${n})`, `:scope > .ms-k-code > b:nth-child(${n})`, { words: true }])] },
  { id: 'code boxes invalid', where: 'both', pack: ({ ui }) => ui.codeBoxes('K7Q2XZ', { invalid: true }), kit: ({ kit }) => kit.codeBoxes({ code: 'K7Q2XZ', invalid: true }),
    parts: [['group', ':scope > .code-boxes', ':scope > .ms-k-code'], ['box 1', ':scope > .code-boxes > b:nth-child(1)', ':scope > .ms-k-code > b:nth-child(1)', { words: true }]] },
  { id: 'error', where: 'both', pack: ({ ui }) => ui.errorNote('That code is not a match in progress.'), kit: ({ kit }) => kit.errorNote('That code is not a match in progress.'),
    parts: [['note', ':scope > .error', ':scope > .ms-k-error'], ['drawing', ':scope > .error > svg', ':scope > .ms-k-error > svg', { svg: true }], ['words', ':scope > .error > span', ':scope > .ms-k-error > span', { words: true }]] },
  // The menu's offline note (screens-entry.mjs, sheet 10): the same note with the plain offline icon.
  { id: 'error offline', where: 'plain',
    pack: ({ ui }) => ui.h('p.error', { role: 'alert' }, ui.ic('offline'), ui.h('span', 'No connection. Join, Host and Recover return when you are back online.')),
    kit: ({ kit }) => kit.errorNote('No connection. Join, Host and Recover return when you are back online.', { icon: 'offline', filled: false }),
    parts: [['note', ':scope > .error', ':scope > .ms-k-error'], ['drawing', ':scope > .error > svg', ':scope > .ms-k-error > svg', { svg: true }], ['words', ':scope > .error > span', ':scope > .ms-k-error > span', { words: true }]] },

  // ── The segmented control, the stepper, the switch ──
  { id: 'segmented', where: 'both',
    pack: ({ ui }) => ui.h('div.seg', { role: 'radiogroup', 'aria-label': 'Players' }, [7, 8, 9].map(n => ui.h('button', { type: 'button', role: 'radio', 'aria-checked': String(n === 8) }, String(n)))),
    kit: ({ kit }) => kit.seg({ options: [7, 8, 9].map(n => ({ id: n, label: String(n) })), value: 8, label: 'Players' }),
    parts: [['control', ':scope > .seg', ':scope > .ms-k-seg'], ...[1, 2].map(n => [`option ${n}`, `:scope > .seg > button:nth-child(${n})`, `:scope > .ms-k-seg > button:nth-child(${n})`, { words: true }])] },
  // Kit 0.5.1: the chosen option's icon filled, the other plain, as Join's device choice (screens-entry.mjs, sheet 12).
  { id: 'segmented icons', where: 'both',
    pack: ({ ui }) => ui.h('div.seg', { role: 'radiogroup', 'aria-label': 'This device' },
      ui.h('button', { type: 'button', role: 'radio', 'aria-checked': 'true' }, ui.ic('phone', { filled: true }), 'Player phone'),
      ui.h('button', { type: 'button', role: 'radio', 'aria-checked': 'false' }, ui.ic('display'), 'Shared display')),
    kit: ({ kit }) => kit.seg({ options: [{ id: 'phone', label: 'Player phone', icon: 'phone' }, { id: 'display', label: 'Shared display', icon: 'display' }], value: 'phone', label: 'This device', stack: true }),
    parts: [['control', ':scope > .seg', ':scope > .ms-k-seg'],
      ...[1, 2].flatMap(n => [[`option ${n}`, `:scope > .seg > button:nth-child(${n})`, `:scope > .ms-k-seg > button:nth-child(${n})`, { words: true }],
        [`option ${n} icon`, `:scope > .seg > button:nth-child(${n}) > svg`, `:scope > .ms-k-seg > button:nth-child(${n}) svg`, { svg: true }]])] },
  { id: 'stepper', where: 'both',
    pack: ({ ui }) => ui.h('span.stepper', ui.h('button', { type: 'button', 'aria-label': 'Fewer', 'aria-disabled': 'true' }, ui.ic('minus')), ui.h('output', '0'), ui.h('button', { type: 'button', 'aria-label': 'More' }, ui.ic('plus'))),
    kit: ({ kit, control }) => { const s = kit.stepper({ value: 0, label: 'Bots' }); control(s.children[0], { off: true }); return s; },
    parts: [['stepper', ':scope > .stepper', ':scope > .ms-k-stepper'], ['fewer', ':scope > .stepper > button:first-child', ':scope > .ms-k-stepper > button:first-child'],
      ['fewer drawing', ':scope > .stepper > button:first-child > svg', ':scope > .ms-k-stepper > button:first-child > svg', { svg: true }], ['value', ':scope > .stepper > output', ':scope > .ms-k-stepper > output', { words: true }],
      ['more', ':scope > .stepper > button:last-child', ':scope > .ms-k-stepper > button:last-child'], ['more drawing', ':scope > .stepper > button:last-child > svg', ':scope > .ms-k-stepper > button:last-child > svg', { svg: true }]] },
  ...[true, false].map(on => ({
    id: `switch ${on ? 'on' : 'off'}`, where: 'both',
    pack: ({ ui }) => ui.h('button.switch', { type: 'button', role: 'switch', 'aria-checked': String(on), 'aria-label': 'Sound' }),
    kit: ({ kit }) => kit.switchControl({ checked: on, label: 'Sound' }),
    parts: [['switch', ':scope > .switch', ':scope > .ms-k-switch', { pseudo: ['::before', '::after'] }]],
  })),

  // ── Accents ──
  { id: 'pills', where: 'both',
    pack: ({ ui }) => [ui.pill('Waiting'), ui.pill('Your turn', { icon: 'turn', tone: 'amber' }), ui.pill('You', { tone: 'paper' }), ui.pill('Captain', { icon: 'captain', tone: 'accent' })],
    kit: ({ kit }) => [kit.pill({ text: 'Waiting' }), kit.pill({ text: 'Your turn', icon: 'turn', tone: 'amber' }), kit.pill({ text: 'You', tone: 'paper' }), kit.pill({ text: 'Captain', icon: 'captain', tone: 'accent' })],
    parts: [1, 2, 3, 4].flatMap(n => [[`pill ${n}`, `:scope > .pill:nth-child(${n})`, `:scope > .ms-k-pill:nth-child(${n})`],
      [`pill ${n} drawing`, `:scope > .pill:nth-child(${n}) > svg`, `:scope > .ms-k-pill:nth-child(${n}) > .ms-k-pill-icon > svg`, { svg: true }],
      [`pill ${n} words`, `:scope > .pill:nth-child(${n}) > span`, `:scope > .ms-k-pill:nth-child(${n}) > .ms-k-pill-label`, { words: true }]]) },
  // Kit 0.7.0: the notice (screens.css .registered), moved in from play-parts: sheet 40's BLOCKED, sheet 43's
  // spent attempt, and sheet 42's MATCHED with its row inside.
  { id: 'notice stamp', where: 'both',
    pack: ({ ui }) => ui.h('div.registered', ui.stamp('BLOCKED', 'amber'), ui.h('p', 'Gus can’t move this round'), ui.h('p', 'Everyone sees the block')),
    kit: ({ kit }) => kit.notice({ stamp: { text: 'BLOCKED', tone: 'amber' }, lines: ['Gus can’t move this round', 'Everyone sees the block'] }),
    parts: NOTICE({ stamp: true, lines: 2 }) },
  { id: 'notice icon', where: 'both',
    pack: ({ ui }) => ui.h('div.registered', ui.h('span.big-icon', ui.ic('lock', { filled: true })), ui.h('p', 'Your attempt is used')),
    kit: ({ kit }) => kit.notice({ icon: 'lock', lines: ['Your attempt is used'] }),
    parts: NOTICE({ icon: true, lines: 1 }) },
  { id: 'notice extra', where: 'both',
    pack: ({ ui }) => ui.h('div.registered', ui.stamp('MATCHED', 'amber'), ui.h('p', 'Gus · Blue guess'), ui.list(ui.row({ tag: 'div', icon: 'code', tint: 'paper', title: 'In the Code', value: 'Yes' }))),
    kit: ({ kit }) => kit.notice({ stamp: { text: 'MATCHED', tone: 'amber' }, lines: ['Gus · Blue guess'], extra: kit.list(kit.row({ tag: 'div', icon: 'code', tint: 'paper', title: 'In the Code', value: 'Yes' })) }),
    parts: [...NOTICE({ stamp: true, lines: 1 }),
      ['list', ':scope > .registered > .list', ':scope > .ms-k-notice > .ms-k-list'],
      ['row', ':scope > .registered > .list > li > .row', ':scope > .ms-k-notice > .ms-k-list > li > .ms-k-row', { pseudo: ['::before'] }],
      ['row icon', ':scope > .registered > .list > li > .row > .row-icon', ':scope > .ms-k-notice > .ms-k-list > li > .ms-k-row > .ms-k-row-icon'],
      ['row icon drawing', ':scope > .registered > .list > li > .row > .row-icon > svg', ':scope > .ms-k-notice > .ms-k-list > li > .ms-k-row > .ms-k-row-icon > svg', { svg: true }],
      ['row title', ':scope > .registered .row-title', ':scope > .ms-k-notice .ms-k-row-title', { words: true }],
      ['row value', ':scope > .registered .row-value', ':scope > .ms-k-notice .ms-k-row-value', { words: true }]] },
  { id: 'stamps', where: 'both',
    pack: ({ ui }) => [ui.stamp('Jailed'), ui.stamp('Saved', 'amber'), ui.stamp('Sent', 'pending'), ui.stamp('Winner', 'gold'), ui.stamp('Out', 'steel')],
    kit: ({ kit }) => [kit.stamp({ text: 'Jailed' }), kit.stamp({ text: 'Saved', tone: 'amber' }), kit.stamp({ text: 'Sent', tone: 'pending' }), kit.stamp({ text: 'Winner', tone: 'gold' }), kit.stamp({ text: 'Out', tone: 'steel' })],
    parts: [1, 2, 3, 4, 5].map(n => [`stamp ${n}`, `:scope > .stamp:nth-child(${n})`, `:scope > .ms-k-stamp:nth-child(${n})`, { words: true }]) },
  { id: 'caption', where: 'both', pack: ({ ui }) => ui.caption('Round 3'), kit: ({ kit }) => kit.caption('Round 3'),
    parts: [['tag', ':scope > .caption-tag', ':scope > .ms-k-caption'], ['words', ':scope > .caption-tag > span', ':scope > .ms-k-caption > .ms-k-caption-text', { words: true }]] },
  { id: 'seat number', where: 'both', pack: ({ ui }) => ui.h('b.num', '4'), kit: ({ kit }) => kit.num(4), parts: [['number', ':scope > .num', ':scope > .ms-k-num', { words: true }]] },
  { id: 'portraits', where: 'both',
    pack: ({ ui }) => [ui.pt('c4', 44), ui.h('span.pt.pt-empty', ui.ic('players'))],
    kit: ({ kit, versions }) => [kit.portrait(seat(2), versions), kit.portrait(null)],
    parts: [['portrait', ':scope > .pt:not(.pt-empty)', ':scope > .ms-k-pt:not(.ms-k-pt-empty)', { portrait: true }], ['empty', ':scope > .pt-empty', ':scope > .ms-k-pt-empty'],
      ['empty drawing', ':scope > .pt-empty > svg', ':scope > .ms-k-pt-empty > svg', { svg: true }]] },

  // ── The waiting block (screens.css .wait): boarding's (sheet 19), the Windows panel's and the offices' in a sheet ──
  { id: 'wait', where: 'plain',
    pack: ({ ui }) => ui.h('div.wait', ui.h('span.big-icon', ui.ic('hourglass', { filled: true })), ui.h('h2', 'Starting Round 1'), ui.h('p', ui.h('span.spinner', { 'aria-hidden': 'true' }), ' Waiting for the ship')),
    kit: ({ kit }) => kit.wait({ icon: 'hourglass', filled: true, title: 'Starting Round 1', line: 'Waiting for the ship', busy: true }),
    parts: WAIT({ spinner: true }) },
  { id: 'wait small', where: 'both',
    pack: ({ ui }) => ui.h('div.wait', ui.h('span.big-icon', ui.ic('window')), ui.h('h2', { style: { fontSize: '1.25rem' } }, 'No window here'), ui.h('p', 'The Command Room has no window')),
    kit: ({ kit }) => kit.wait({ icon: 'window', title: 'No window here', line: 'The Command Room has no window', size: 'small' }),
    parts: WAIT() },
  { id: 'wait portrait', where: 'both',
    pack: ({ ui }) => ui.h('div.wait', ui.pt(seat(2).character, 76), ui.h('h2', { style: { fontSize: '1.25rem' } }, 'Ben is choosing an Officer'), ui.h('p', 'Chosen at random if time runs out')),
    kit: ({ kit, versions }) => kit.wait({ lead: kit.portrait(seat(2), versions), title: 'Ben is choosing an Officer', line: 'Chosen at random if time runs out', size: 'small' }),
    parts: WAIT({ lead: true }) },

  // ── The tile, who, the facts and the paper card (0.6.0: moved from play-parts; screens.css and kit.css .comic) ──
  // Every tile state the kit has (sending is the pack's submitting), with a note, a badge and the registered mark.
  { id: 'tiles', where: 'both',
    pack: ({ ui }) => ui.h('div.tiles',
      packTile(ui, 'rescue', 'Rescue', { note: '2 injections', badge: '2' }), packTile(ui, 'protect', 'Protect', { state: 'selected' }),
      packTile(ui, 'scan', 'Scan', { state: 'submitting' }), packTile(ui, 'talk', 'Talk', { state: 'registered' }),
      packTile(ui, 'clone', 'Clone', { state: 'unavailable', note: 'From Round 4' })),
    kit: ({ kit }) => kit.tiles(
      kit.tile({ icon: 'rescue', name: 'Rescue', note: '2 injections', badge: 2 }), kit.tile({ icon: 'protect', name: 'Protect', state: 'selected' }),
      kit.tile({ icon: 'scan', name: 'Scan', state: 'sending' }), kit.tile({ icon: 'talk', name: 'Talk', state: 'registered' }),
      kit.tile({ icon: 'clone', name: 'Clone', state: 'unavailable', note: 'From Round 4' })),
    parts: [['tiles', ':scope > .tiles', ':scope > .ms-k-tiles'], ...[1, 2, 3, 4, 5].flatMap(TILE)] },
  // Who: the check before Register's person (sheet 29), and an office's action on its own tile (sheet 40).
  { id: 'who', where: 'both',
    pack: ({ ui }) => ui.h('div.confirm-who', ui.pt(seat(5).character, 64), ui.h('div', ui.h('b', 'Rescue Eli'), ui.h('span', 'Player 5 · Hospital'))),
    kit: ({ kit, versions }) => kit.who({ people: [seat(5)], title: 'Rescue Eli', sub: 'Player 5 · Hospital', versions }),
    parts: WHO(false) },
  { id: 'who icon', where: 'both',
    pack: ({ ui }) => ui.h('div.confirm-who', ui.h('span.tile-icon', ui.ic('release', { filled: true })), ui.h('div', ui.h('b', 'Release the Jail'), ui.h('span', 'Fay and Ike are in Jail'))),
    kit: ({ kit }) => kit.who({ icon: 'release', title: 'Release the Jail', sub: 'Fay and Ike are in Jail' }),
    parts: WHO(true) },
  // The facts, with the pack's amber "i" and Promises' lock (sheet 33).
  { id: 'facts', where: 'both',
    pack: ({ ui }) => ui.h('ul.facts', ui.h('li', ui.ic('info', { filled: true }), ui.h('span', 'Uses your one given Promise only if Ava accepts')),
      ui.h('li', ui.ic('lock', { filled: true }), ui.h('span', 'Only you and Ava see it'))),
    kit: ({ kit }) => kit.facts(['Uses your one given Promise only if Ava accepts', { icon: 'lock', text: 'Only you and Ava see it' }]),
    parts: FACTS(2) },
  // The paper card (kit.css .comic), padded by its screen as sheet 33's offer card is.
  // Kit 0.7.0: sheet 25's side cards, the tile with the card's art, its lock before the note, and no label of its own.
  // The grid and the cards' height and colour are the private talk's own rules, given here as its own styles.
  { id: 'tiles art', where: 'both',
    pack: ({ ui }) => {
      const sides = ui.h('div.declare-sides', ['blue', 'red', 'alien'].map((s, i) => ui.h('button.tile', { type: 'button', 'data-state': i === 0 ? 'selected' : 'unavailable', 'aria-disabled': i === 0 ? null : 'true' },
        ui.h('span.hack-card', { html: HACK_ART[`hack-side-${s}`]() }), ui.h('b', ['Blue', 'Red', 'Alien'][i]), i === 0 ? null : ui.h('small', ui.ic('lock', { filled: true }), 'Not for your role'))));
      // As screens-more.mjs talk() does once it has drawn: each card's art at the tile's width.
      sides.querySelectorAll('.hack-card svg').forEach(svg => { svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.display = 'block'; });
      return sides;
    },
    kit: ({ kit }) => {
      const grid = kit.tiles(['blue', 'red', 'alien'].map((s, i) => kit.tile({ art: HACK_ART[`hack-side-${s}`](), name: ['Blue', 'Red', 'Alien'][i], label: false,
        ...(i === 0 ? { state: 'selected' } : { state: 'unavailable', note: 'Not for your role', noteIcon: 'lock' }) })));
      grid.style.marginTop = '6px';
      for (const card of grid.children) { card.style.minHeight = '150px'; card.style.background = '#0A1530'; }
      return grid;
    },
    parts: [1, 2, 3].flatMap(CARD) },
  // Kit 0.7.1: the spent tile (the pack's .tile[data-state="spent"]: Actions' used Talk, the Captain console's used plate).
  { id: 'tile spent', where: 'both',
    pack: ({ ui }) => ui.h('div.tiles', packTile(ui, 'talk', 'Talk', { state: 'spent', note: 'Used' })),
    kit: ({ kit }) => kit.tiles(kit.tile({ icon: 'talk', name: 'Talk', state: 'spent', note: 'Used' })),
    parts: TILE(1) },
  // Kit 0.7.1: a tile's art given as a node the component draws, here a side card's art, as sheet 25 draws it.
  { id: 'tile art node', where: 'both',
    pack: ({ ui }) => {
      const sides = ui.h('div.declare-sides', ui.h('button.tile', { type: 'button', 'data-state': 'selected' }, ui.h('span.hack-card', { html: HACK_ART['hack-side-blue']() }), ui.h('b', 'Blue')));
      sides.querySelectorAll('.hack-card svg').forEach(svg => { svg.style.width = '100%'; svg.style.height = 'auto'; svg.style.display = 'block'; });
      return sides;
    },
    kit: ({ kit }) => {
      const t = document.createElement('template');
      t.innerHTML = HACK_ART['hack-side-blue']().trim();
      const grid = kit.tiles(kit.tile({ art: t.content.firstElementChild, name: 'Blue', state: 'selected', label: false }));
      grid.style.marginTop = '6px';
      for (const card of grid.children) { card.style.minHeight = '150px'; card.style.background = '#0A1530'; }
      return grid;
    },
    parts: CARD(1).filter(([name]) => !/note|lock/.test(name)) },
  { id: 'paper card', where: 'plain',
    pack: ({ ui }) => ui.h('article.comic', { style: { padding: '14px' } }, ui.h('div', { style: { height: '60px' } })),
    kit: ({ kit }) => { const card = kit.comic(kit.h('div', null, { style: 'height: 60px' })); card.style.padding = '14px'; return card; },
    parts: [['card', ':scope > .comic', ':scope > .ms-k-comic']] },

  // ── The 3 × 3: every state, a count, You and a mark (in a list in seat order when it is narrow) ──
  { id: 'cells', where: 'both',
    pack: ({ ui }) => ui.h('div.grid-wrap', ui.h('div.grid9', [
      ui.cell(seat(1)), ui.cell(seat(2), { state: 'selected', note: 'Selected', mark: 'check' }), ui.cell(seat(3), { state: 'confirmed', note: 'Your vote' }),
      ui.cell(seat(4), { state: 'taken', note: 'Taken', you: true }), ui.cell(seat(5), { state: 'ineligible', note: 'In Jail' }), ui.cell(null),
      ui.cell(seat(7), { state: 'winner', count: 4 }), ui.cell(seat(8), { state: 'faded', count: 1 }), ui.cell(seat(9), { count: 0 })])),
    kit: ({ kit, versions }) => {
      const { wrap, grid } = kit.grid9();
      grid.append(
        kit.cell({ person: seat(1), versions }), kit.cell({ person: seat(2), state: 'selected', note: 'Selected', mark: 'check', versions }),
        kit.cell({ person: seat(3), state: 'confirmed', note: 'Your vote', tag: 'div', versions }), kit.cell({ person: seat(4), state: 'taken', note: 'Taken', you: true, tag: 'div', versions }),
        kit.cell({ person: seat(5), state: 'ineligible', note: 'In Jail', tag: 'div', versions }), kit.cell({ person: { seat: 6 }, state: 'empty', tag: 'div' }),
        kit.cell({ person: seat(7), state: 'winner', count: 4, tag: 'div', versions }), kit.cell({ person: seat(8), state: 'faded', count: 1, tag: 'div', versions }),
        kit.cell({ person: seat(9), count: 0, versions }));
      return wrap;
    },
    parts: [['grid', ':scope > .grid-wrap > .grid9', ':scope > .ms-k-grid-wrap > .ms-k-grid9'], ...[1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap(CELL)] },
  // On a result's paper card (the pack's screens.css .result-body; the kit's data-ms-surface="paper"): every cell
  // restyled, the chosen one gold, "You" top-right beside a count, a seat that was not a candidate faded.
  { id: 'cells on paper', where: 'plain',
    pack: ({ ui }) => ui.h('div.result-body', { style: { background: '#F4EBDD' } }, ui.h('div.grid9', [
      ui.cell(seat(1), { count: 0 }), ui.cell(seat(2), { state: 'winner', count: 4, you: true }), ui.cell(seat(3), { count: 2 }),
      ui.cell(seat(4), { state: 'ineligible' }), ui.cell(seat(5), { count: 1 }), ui.cell(null),
      ui.cell(seat(7), { state: 'faded', count: 0 }), ui.cell(seat(8), { state: 'ineligible' }), ui.cell(seat(9), { count: 1 })])),
    kit: ({ kit, versions }) => {
      // The result body's own box (its padding and its paper) is the component's; the paper surface is the kit's.
      const body = kit.h('div', null, { 'data-ms-surface': 'paper', style: 'padding: 12px; background: #F4EBDD' });
      const { wrap, grid } = kit.grid9();
      grid.append(
        kit.cell({ person: seat(1), count: 0, versions }), kit.cell({ person: seat(2), state: 'winner', count: 4, you: true, tag: 'div', versions }),
        kit.cell({ person: seat(3), count: 2, versions }), kit.cell({ person: seat(4), state: 'ineligible', tag: 'div', versions }),
        kit.cell({ person: seat(5), count: 1, versions }), kit.cell({ person: { seat: 6 }, state: 'empty', tag: 'div' }),
        kit.cell({ person: seat(7), state: 'faded', count: 0, tag: 'div', versions }), kit.cell({ person: seat(8), state: 'ineligible', tag: 'div', versions }),
        kit.cell({ person: seat(9), count: 1, versions }));
      body.append(wrap);
      return body;
    },
    parts: [['grid', ':scope > .result-body > .grid9', ':scope > [data-ms-surface="paper"] > .ms-k-grid-wrap > .ms-k-grid9'],
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap(n => CELL(n).map(([name, p, k, o]) => [name, p.replace('.grid9', '.result-body > .grid9'), k.replace('.ms-k-grid9', '[data-ms-surface="paper"] .ms-k-grid9'), o]))] },
]);
