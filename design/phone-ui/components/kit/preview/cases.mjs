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

  // ── The segmented control, the stepper, the switch ──
  { id: 'segmented', where: 'both',
    pack: ({ ui }) => ui.h('div.seg', { role: 'radiogroup', 'aria-label': 'Players' }, [7, 8, 9].map(n => ui.h('button', { type: 'button', role: 'radio', 'aria-checked': String(n === 8) }, String(n)))),
    kit: ({ kit }) => kit.seg({ options: [7, 8, 9].map(n => ({ id: n, label: String(n) })), value: 8, label: 'Players' }),
    parts: [['control', ':scope > .seg', ':scope > .ms-k-seg'], ...[1, 2].map(n => [`option ${n}`, `:scope > .seg > button:nth-child(${n})`, `:scope > .ms-k-seg > button:nth-child(${n})`, { words: true }])] },
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
