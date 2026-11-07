// mothership:dev-only
//
// The review page's &ui=: where the real controls go by the owner's decision of 14 October 2026,
// "controls take turns" (js/turns.mjs; docs/design/private-capsule.md, section 12), on one
// player's screen. Every block is a stand-in sized from Frontend's measurements of the released
// controls (MEASURED) and says so: a control's words, its rules and any private content are
// Frontend's and the server's, never this page's. A review page's controller: not to port.
//
//   &ui=choosing           a character choice is open: the board is the chooser. The choosing row
//                          takes the navigation's box (Cancel, the count, Done) and the Pass is
//                          hidden; every character the server offers is ringed at its slot and,
//                          seated in the capsule, at its capsule target; the chosen are marked.
//                          The top bar's line is the prompt.
//     &choose=<n>          how many to choose (default 4, the Code's)
//     &chosen=1,5          the seats chosen so far (default none)
//     &offered=1,2,5       the seats the server offers. Synthetic: the default, every living seat,
//                          is the review's stand-in and not the Code's rule. Production rings
//                          exactly the legal targets Backend offers, retained Eliminated
//                          identities included (name them here to see one ringed)
//     &prompt=<words>      the top bar's line (default "Code: choose <n>")
//     &tab=1               the sheet holds a claim or a recovery row: its tab at the row's start
//   &ui=sheet              no character choice is open: the sheet over the Hospital and the Jail
//     &claim=result|conversation|declare   the private claim's stand-in
//     &command=code-confirm|rescue-confirm|declare-offer|side-choice|side-confirm   a command's
//     &receipt=1           a sent command's recovery row: its Check again pinned at the sheet's foot, or,
//                          with a command open, a row in the sheet's body
//   &text=2                enlarged text (200%): the bars and the controls measured at that size,
//                          chosen before the board is laid out (ENLARGED); the board's own drawing
//                          and lettering are unchanged

import { SHEET, boardTargets, sheetPlan, turnsLayout } from './layout.mjs';

/**
 * Frontend's measurements of the released controls (docs/frontend/capsule-ui-layout-constraints.md
 * and evidence/capsule-ui-budget-2026-10-14/ui-budget.json at 2d4e852), in CSS pixels at 320 and
 * 390 px wide, [normal, 200% text]. A claim is its whole box. A command is its words: its prompt
 * and detail as measured, 6 px apart, its controls going to the sheet's pinned actions row; or, for
 * the side choice, whose Cancel sits beside its prompt above its choices, its whole strip as
 * measured, with no pinned row (inline). dock is the released dock's whole box, for comparison.
 */
export const MEASURED = Object.freeze({
  source: 'docs/frontend/evidence/capsule-ui-budget-2026-10-14/ui-budget.json at 2d4e852',
  claims: Object.freeze({
    result: Object.freeze({ 320: [70.28, 177.97], 390: [70.28, 116.58] }),
    conversation: Object.freeze({ 320: [70.28, 193.11], 390: [70.28, 116.58] }),
    declare: Object.freeze({ 320: [83.47, 177.97], 390: [70.28, 177.97] }),
  }),
  commands: Object.freeze({
    'code-confirm': Object.freeze({ title: 'Code confirmation', actions: ['Cancel', 'Confirm'], words: { 320: [31.19 + 6 + 27.5, 93.56 + 6 + 110], 390: [17.5 + 6 + 29.88, 105 + 6 + 89.67] }, dock: { 320: [120.28, 238.19], 390: [118.38, 323.45] } }),
    'rescue-confirm': Object.freeze({ title: 'Rescue confirmation', actions: ['Cancel', 'Confirm'], words: { 320: [15.59 + 6 + 34.75, 62.38 + 6 + 82.5], 390: [17.5 + 6 + 35.94, 70 + 6 + 59.78] }, dock: { 320: [121.75, 235.06], 390: [146.94, 229.97] } }),
    'declare-offer': Object.freeze({ title: 'Declaration offer', actions: [null, 'Declare'], words: { 320: [0, 0], 390: [0, 0] }, dock: { 320: [63, 63.59], 390: [75, 75.59] } }),
    'side-choice': Object.freeze({ title: 'Side choice', actions: null, inline: 'Cancel', choices: 3, words: { 320: [94, 161], 390: [96, 157] }, dock: { 320: [105, 171.97], 390: [115, 176] } }),
    'side-confirm': Object.freeze({ title: 'Declaration confirmation', actions: ['Back', 'Confirm'], words: { 320: [15.59 + 6 + 27.5, 62.38 + 6 + 82.5], 390: [17.5 + 6 + 29.88, 35 + 6 + 89.67] }, dock: { 320: [106.5, 213.44], 390: [122.06, 224.86] } }),
  }),
  /** The docks the choosing row replaces, [normal, 200% text]. */
  docks: Object.freeze({ 'code-choosing': { 320: [56.88, 116.67], 390: [69, 161.89] }, 'code-partial': { 320: [53, 232.19], 390: [69, 161.89] }, 'rescue-choosing': { 320: [59, 134.37], 390: [69.19, 161.89] } }),
  /** The status bar's largest box, [normal, 200% text]; the navigation does not grow with the text. */
  status: Object.freeze({ 320: [45.39, 112.59], 390: [52.59, 123.38] }),
  nav: Object.freeze({ 320: 56, 390: 64 }),
  /** The uncertain receipt's recovery row as released (normal text): under 44, so it is drawn 44 here. */
  receipt: 42.19,
});

/** A command's words drawn as a block: their measured height and its padding and border. */
export const WORDS_CHROME = 10;

/**
 * Enlarged text (200%): the top bar at Frontend's largest measured 200% status (123.38 px, so
 * 124), the navigation the tier's, the sheet's actions row and the claim's collapsed row 64 px (a
 * 44 px control with two-size words), the recovery row the same (assumed: not measured at 200%).
 * A recovery row with no command open is the sheet's pinned actions row: its words at the start,
 * Check again at the end.
 */
export const ENLARGED = Object.freeze({ bars: Object.freeze({ top: 124 }), actions: 64, collapsed: 64, receipt: 64 });

function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'style') Object.assign(node.style, value);
    else if (value !== null && value !== undefined) node.setAttribute(name, value);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined) node.append(kid);
  return node;
}
const px = value => `${value}px`;
const box = rect => ({ left: px(rect.left), top: px(rect.top), width: px(rect.width), height: px(rect.height) });

/** The bars and rows for this page's text size, as turnsLayout() takes them. */
export function turnsOptions(params) {
  const enlarged = params.get('text') === '2';
  return { enlarged, bars: enlarged ? ENLARGED.bars : null, actions: enlarged ? ENLARGED.actions : SHEET.actions };
}

/** The measured heights this page draws its stand-ins at: the 320 px column below 360 px wide, the 390 px one from there. */
export function measuredFor(width, enlarged) {
  const column = width < 360 ? 320 : 390;
  const pick = pair => pair[enlarged ? 1 : 0];
  return {
    column,
    claim: kind => (kind ? pick(MEASURED.claims[kind][column]) : 0),
    command: name => {
      if (!name) return null;
      const entry = MEASURED.commands[name];
      const words = pick(entry.words[column]);
      return { ...entry, words, block: words ? words + WORDS_CHROME : 0 };
    },
    receipt: enlarged ? ENLARGED.receipt : Math.max(44, MEASURED.receipt),
    collapsed: enlarged ? ENLARGED.collapsed : SHEET.collapsed,
  };
}

/** The review page's &ui=. */
export function mountTurns({ app, board, roster, seats, params }) {
  const ui = params.get('ui');
  if (!['choosing', 'sheet'].includes(ui)) throw new Error(`No ui ${ui}`);
  const viewport = { width: innerWidth, height: innerHeight };
  const options = turnsOptions(params);
  const layout = turnsLayout(viewport, roster, { insets: board.insets, bars: options.bars, actions: options.actions });
  if (!layout.fits || layout.board.navTop !== board.navTop || layout.board.boardTop !== board.boardTop) throw new Error('turns: the page and turns.mjs lay the board out differently');
  document.documentElement.dataset.ui = ui;
  const layer = el('div', { class: 'v2-turns', 'data-ui': ui });
  app.append(layer);
  if (ui === 'choosing') mountChoosing({ app, layer, layout, roster, seats, params, insets: board.insets });
  else mountSheet({ layer, layout, params, measured: measuredFor(viewport.width, options.enlarged) });
  return layout;
}

/** The top bar's line: the stage's words, or what is being chosen. */
function setLine(app, words) {
  const top = app.querySelector('.v2-top');
  let phase = top.querySelector('.v2-top__phase');
  if (!phase) {
    phase = el('span', { class: 'v2-top__phase' });
    top.querySelector('.v2-top__label').replaceWith(phase);
  }
  phase.textContent = words;
}

function mountChoosing({ app, layer, layout, roster, seats, params, insets }) {
  const { board, choosing } = layout;
  const n = Math.max(1, Number(params.get('choose') ?? 4));
  const list = name => (params.get(name) ? params.get(name).split(',').filter(Boolean).map(Number) : null);
  // Synthetic: with no &offered=, the review offers every living seat. That is a stand-in, not the
  // Code's rule: production rings exactly the legal targets Backend offers, retained Eliminated
  // identities included, and never works them out itself.
  const syntheticOffer = seats.filter(seat => seat.health !== 'Eliminated').map(seat => seat.seat);
  const offered = list('offered') ?? syntheticOffer;
  const chosen = list('chosen') ?? [];
  if (chosen.length > n || chosen.some(number => !offered.includes(number))) throw new Error(`chosen=${chosen}: more than ${n}, or not offered`);
  setLine(app, params.get('prompt') ?? `Code: choose ${n}`);
  // The board is the chooser: each offered seat's target ringed where it is, and, seated in the
  // capsule, at its capsule target too; a chosen seat's rings marked. Nothing on the board moves.
  const targets = boardTargets(board, roster);
  const seated = [...app.querySelectorAll('.v2-capsule .v2-fig[data-capsule][data-state="seated"]')].map(node => ({ id: node.dataset.capsule, seat: Number(node.dataset.seat) }));
  for (const number of offered) {
    const seat = seats.find(entry => entry.seat === number);
    if (!seat) throw new Error(`offered=${offered}: nobody is seat ${number}`);
    const mine = [targets.find(target => target.room === seat.room && target.id === seat.slot), ...seated.filter(entry => entry.seat === number).map(entry => targets.find(target => target.room === 'capsule' && target.id === entry.id))].filter(Boolean);
    for (const target of mine) {
      const isChosen = chosen.includes(number);
      const ring = el('span', { class: `v2-ring${isChosen ? ' v2-ring--chosen' : ''}`, 'data-seat': String(number), 'data-target': `${target.room}:${target.id}`, style: box({ left: target.left, top: target.top, width: target.side, height: target.side }) });
      if (isChosen) ring.append(el('span', { class: 'v2-ring__check', 'aria-hidden': 'true' }, '✓'));
      layer.append(ring);
    }
  }
  // The choosing row in the navigation's box, its bottom inset filled; the navigation and the Pass give way until the choice closes.
  app.querySelector('.v2-nav').hidden = true;
  app.querySelector('.v2-pass').hidden = true;
  const done = chosen.length === n;
  layer.append(el('div', { class: 'v2-choosing', role: 'group', 'aria-label': 'Choosing', style: { ...box(choosing), paddingBottom: px(insets.bottom), paddingLeft: px(insets.left + 10), paddingRight: px(insets.right + 10) } },
    params.get('tab') === '1' ? el('button', { class: 'v2-ui-button v2-ui-button--tab', type: 'button', 'aria-label': 'Show the sheet: your private result' }, '▴') : null,
    el('button', { class: 'v2-ui-button', type: 'button' }, 'Cancel'),
    el('span', { class: 'v2-choosing__count', 'aria-live': 'polite' }, `${chosen.length} of ${n}`),
    el('button', { class: 'v2-ui-button v2-ui-button--go', type: 'button', 'aria-disabled': String(!done) }, 'Done')));
}

function mountSheet({ layer, layout, params, measured }) {
  const { sheet } = layout;
  const claimKind = params.get('claim');
  if (claimKind && !MEASURED.claims[claimKind]) throw new Error(`No claim ${claimKind}`);
  const commandName = params.get('command');
  if (commandName && !MEASURED.commands[commandName]) throw new Error(`No command ${commandName}`);
  const claim = measured.claim(claimKind);
  const command = measured.command(commandName);
  const receipt = params.get('receipt') === '1' ? measured.receipt : 0;
  // A command's height in the sheet: its words' block, if any, then its pinned actions row after a gap (none where its
  // controls are inline). A recovery row with no command open is the pinned row itself; with one, a row in the body.
  const pinnedActions = command?.actions ?? null;
  const pinnedReceipt = Boolean(receipt) && !command;
  const commandHeight = command ? command.block + (pinnedActions ? (command.block ? SHEET.gap : 0) + sheet.actions.height : 0) : 0;
  const receiptHeight = receipt ? (pinnedReceipt ? sheet.actions.height : receipt) : 0;
  const plan = sheetPlan(sheet, { claim, command: commandHeight, receipt: receiptHeight }, { collapsed: measured.collapsed });
  const BORDER = 2;
  const node = el('section', { class: 'v2-sheet-ui', 'aria-label': 'Your controls', 'data-claim': plan.claim, 'data-scroll': plan.scroll.toFixed(2), style: box(sheet) });
  const bodyHeight = pinnedActions || pinnedReceipt ? sheet.body.height : sheet.capacity;
  const body = el('div', { class: 'v2-sheet-ui__body', style: { left: px(sheet.body.left - sheet.left - BORDER), top: px(sheet.body.top - sheet.top - BORDER), width: px(sheet.body.width), height: px(bodyHeight) } });
  node.append(body);
  if (plan.claim === 'full') body.append(el('div', { class: 'v2-standin-block v2-ui-claim', style: { height: px(claim) } }, el('b', {}, 'Private claim'), ` · stand-in, ${claim} px as measured: its content is the participants' own`));
  if (plan.claim === 'collapsed') body.append(el('div', { class: 'v2-ui-claimrow', style: { height: px(measured.collapsed) } }, el('span', {}, el('b', {}, 'Private claim'), ' (folded)'), el('button', { class: 'v2-ui-button', type: 'button', 'aria-expanded': 'false' }, 'Show')));
  // The pinned actions row: two parts either side of the raised Pass.
  const part = (name, ...kids) => el('div', { class: 'v2-sheet-ui__actions', 'data-part': name, style: { left: px(sheet.actions[name].left - sheet.left - BORDER), top: px(sheet.actions.top - sheet.top - BORDER), width: px(sheet.actions[name].width), height: px(sheet.actions.height), justifyContent: name === 'start' ? 'flex-start' : 'flex-end' } }, ...kids);
  if (command) {
    const label = el('span', { class: 'v2-ui-command__label' }, el('b', {}, command.title), ` · stand-in, ${command.words.toFixed(2)} px as measured`);
    if (command.block) body.append(el('div', { class: 'v2-standin-block v2-ui-command', style: { height: px(command.block) } },
      command.inline ? el('span', { class: 'v2-ui-command__head' }, label, el('button', { class: 'v2-ui-button', type: 'button' }, command.inline)) : label,
      command.choices ? el('span', { class: 'v2-ui-choices' }, ...Array.from({ length: command.choices }, (_, i) => el('button', { class: 'v2-ui-button', type: 'button' }, `Choice ${i + 1}`))) : null));
    if (pinnedActions) node.append(...['start', 'end'].map((name, index) => part(name, pinnedActions[index] ? el('button', { class: `v2-ui-button${name === 'end' ? ' v2-ui-button--go' : ''}`, type: 'button' }, pinnedActions[index]) : null)));
  }
  // The recovery row's words are a stand-in for Frontend's own.
  const receiptWords = () => el('span', { class: 'v2-ui-receipt__words' }, el('b', {}, 'Sent'), ' · no answer yet');
  if (pinnedReceipt) node.append(part('start', receiptWords()), el('div', { class: 'v2-ui-receipt' }, part('end', el('button', { class: 'v2-ui-button', type: 'button' }, 'Check again'))));
  else if (receipt) body.append(el('div', { class: 'v2-ui-receipt v2-ui-receipt--row', style: { height: px(receipt) } }, receiptWords(), el('button', { class: 'v2-ui-button', type: 'button' }, 'Check again')));
  layer.append(node);
}
