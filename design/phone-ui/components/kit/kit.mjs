// The phone interface's shared kit: runtime source, Designer's (the owner, 14 and 15 November 2026: one
// visual source, used by the game as it is). Every Designer component builds its controls from here, so
// they share one look (kit.css) and one behaviour (the control policy below). The builders return
// elements with the pack's structure and words (design/phone-ui/prototype/ui.mjs, which the frozen Food
// release pins, so it stays as it is; the kit's check draws both and compares them). Each set*()
// changes an element in place, so a component keeps its controls, and their focus, through updates.
//
// A component root adds the class ms-kit (kit.css applies inside it), and a glass surface marks itself
// data-ms-surface="glass". Nothing here decides what is offered: `off`, `busy` and `reason` are what the
// component is given, and a tap only reports intent.

import { crewPortraitVariable } from '../../../../apps/game/hosted/crew-runtime.mjs';
import { iconSvg } from '../icons.mjs';

export const COMPONENT_KIT_VERSION = 'component-kit-0.2.0';
export const BUTTON_KINDS = Object.freeze(['primary', 'secondary', 'tinted', 'plain', 'outline', 'warn']);
export const CELL_STATES = Object.freeze(['available', 'selected', 'confirmed', 'taken', 'ineligible', 'empty', 'winner', 'faded']);
export const STAMP_TONES = Object.freeze([null, 'amber', 'pending', 'gold', 'steel']);
export const PILL_TONES = Object.freeze([null, 'amber', 'paper', 'accent']);
export const ROW_TINTS = Object.freeze([null, 'amber', 'paper', 'steel', 'teal', 'slate']);

const oneOf = (value, allowed, what) => {
  if (!allowed.includes(value ?? null)) throw new TypeError(`${what} is one of ${allowed.map(v => JSON.stringify(v)).join(', ')}, not ${JSON.stringify(value)}`);
  return value ?? null;
};
/** The number on a seat: `number`, or the digits at the end of its id ("seat-4" → 4). */
export const seatNumber = person => person?.number ?? (typeof person?.seat === 'number' ? person.seat : Number(String(person?.seat ?? '').match(/\d+$/)?.[0] ?? NaN));

/** The kit's builders, for one document. */
export function createKit(doc) {
  if (!doc?.createElement) throw new TypeError('The kit needs a document');
  const h = (tag, className = null, attrs = {}) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : String(v));
    return node;
  };
  const text = (node, value) => { const v = value ?? ''; if (node.textContent !== v) node.textContent = v; return node; };
  const attr = (node, name, value) => {
    if (value === null || value === undefined || value === false) { if (node.hasAttribute(name)) node.removeAttribute(name); }
    else if (node.getAttribute(name) !== String(value)) node.setAttribute(name, String(value));
    return node;
  };
  const icon = (name, filled = false) => {
    const t = doc.createElement('template');
    t.innerHTML = iconSvg(name, { filled, className: 'ms-k-ic' }).trim();
    return t.content.firstChild;
  };
  /** Puts an icon in a holder, or clears it; redrawn only when the icon or its form changes. */
  const setIcon = (holder, name, filled = false) => {
    const key = name ? `${name}:${filled ? 'filled' : ''}` : '';
    if (holder.dataset.icon === key) return holder;
    holder.replaceChildren(...(name ? [icon(name, filled)] : []));
    holder.dataset.icon = key;
    holder.hidden = !name;
    return holder;
  };

  // ── Buttons (ui.mjs button) ───────────────────────────────────────
  /** { label, kind, icon, filled, block, small, aria, pressed, expanded, intent, value, extra }; off and busy are the policy's. */
  function setButton(node, props) {
    const kind = props.kind ?? 'primary';
    if (!BUTTON_KINDS.includes(kind)) throw new TypeError(`A button's kind is ${BUTTON_KINDS.join(', ')}`);
    const cls = ['ms-k-btn', `ms-k-btn-${kind}`, props.block ? 'ms-k-btn-block' : null, props.small ? 'ms-k-btn-sm' : null, ...(props.extra ?? [])].filter(Boolean).join(' ');
    if (node.className !== cls) node.className = cls;
    if (!node.firstChild) node.append(h('span', 'ms-k-btn-icon'), h('span', 'ms-k-btn-label'));
    // The pack fills a primary button's icon; a floating chip's (filled) too.
    setIcon(node.firstChild, props.icon ?? null, props.filled ?? kind === 'primary');
    text(node.lastChild, props.label);
    attr(node, 'aria-label', props.aria ?? null);
    attr(node, 'aria-pressed', props.pressed === undefined || props.pressed === null ? null : String(!!props.pressed));
    attr(node, 'aria-expanded', props.expanded === undefined || props.expanded === null ? null : String(!!props.expanded));
    if (props.intent) node.dataset.intent = props.intent;
    if (props.value !== undefined && props.value !== null) node.dataset.value = String(props.value);
    return node;
  }
  const button = props => setButton(h('button', null, { type: 'button' }), props);

  /** A 44 px round button with only an icon: `label` is its accessible name (ui.mjs iconButton). */
  function setIconButton(node, props) {
    if (!props.label) throw new TypeError('An icon button needs its accessible name');
    node.className = 'ms-k-icon-btn';
    setIcon(node.firstChild ?? node.appendChild(h('span', 'ms-k-icon-btn-icon')), props.icon, false);
    attr(node, 'aria-label', props.label);
    if (props.intent) node.dataset.intent = props.intent;
    if (props.value !== undefined && props.value !== null) node.dataset.value = String(props.value);
    return node;
  }
  const iconButton = props => setIconButton(h('button', null, { type: 'button' }), props);

  // ── Lists and rows (ui.mjs row, list, groupLabel, groupNote) ─────────
  /**
   * { title, sub, value (the words at the right), icon, tint, chevron, lead (a node: a portrait), trail (a node:
   * a switch, a stepper), tag: 'button' | 'div', intent, data (what a tap reports) }. A lead or trail node
   * sits in the row as the pack places it; the row keeps it, and its focus, while the same node is given.
   */
  function setRow(node, props) {
    oneOf(props.tint, ROW_TINTS, 'A row\'s tint');
    node.classList.add('ms-k-row');
    if (!node.querySelector(':scope > .ms-k-row-main')) {
      node.append(h('span', 'ms-k-row-lead'), h('span', 'ms-k-row-main'), h('span', 'ms-k-row-value'), h('span', 'ms-k-row-trail'), h('span', 'ms-k-row-chev'));
      node.children[1].append(h('span', 'ms-k-row-title'), h('span', 'ms-k-row-sub'));
    }
    const [lead, main, value, trail, chev] = node.children;
    if (props.lead) {
      if (lead.firstChild !== props.lead) lead.replaceChildren(props.lead);
      lead.className = 'ms-k-row-lead';
      lead.removeAttribute('data-tint');
      lead.dataset.icon = '';
      lead.hidden = false;
    } else if (props.icon) {
      if (lead.className !== 'ms-k-row-icon') { lead.replaceChildren(); lead.dataset.icon = ''; lead.className = 'ms-k-row-icon'; }
      attr(lead, 'data-tint', props.tint ?? null);
      setIcon(lead, props.icon, true);
    } else { lead.replaceChildren(); lead.dataset.icon = ''; lead.hidden = true; }
    text(main.firstChild, props.title);
    text(main.lastChild, props.sub ?? '');
    main.lastChild.hidden = !props.sub;
    text(value, props.value ?? '');
    value.hidden = props.value === undefined || props.value === null;
    if (props.trail) { if (trail.firstChild !== props.trail) trail.replaceChildren(props.trail); trail.hidden = false; }
    else { trail.replaceChildren(); trail.hidden = true; }
    setIcon(chev, props.chevron ? 'chevronRight' : null, false);
    if (props.intent) node.dataset.intent = props.intent;
    if (props.data !== undefined && props.data !== null) node.dataset.value = String(props.data);
    return node;
  }
  const row = props => setRow(props.tag === 'div' ? h('div') : h('button', null, { type: 'button' }), props);
  const list = (...rows) => {
    const ul = h('ul', 'ms-k-list');
    for (const r of rows.flat().filter(Boolean)) { const li = h('li', 'ms-k-list-item'); li.append(r); ul.append(li); }
    return ul;
  };
  const groupLabel = words => text(h('p', 'ms-k-group-label'), words);
  const groupNote = words => text(h('p', 'ms-k-group-note'), words);

  // ── Accents (ui.mjs pill, stamp, caption) ───────────────────────────
  function setPill(node, props) {
    node.className = 'ms-k-pill';
    attr(node, 'data-tone', oneOf(props.tone, PILL_TONES, 'A pill\'s tone'));
    if (!node.firstChild) node.append(h('span', 'ms-k-pill-icon'), h('span', 'ms-k-pill-label'));
    setIcon(node.firstChild, props.icon ?? null, true);
    text(node.lastChild, props.text);
    return node;
  }
  const pill = props => setPill(h('span'), props);
  function setStamp(node, props) {
    node.className = 'ms-k-stamp';
    attr(node, 'data-tone', oneOf(props.tone, STAMP_TONES, 'A stamp\'s tone'));
    return text(node, props.text);
  }
  const stamp = props => setStamp(h('span'), props);
  const caption = words => { const tag = h('span', 'ms-k-caption'); tag.append(text(h('span', 'ms-k-caption-text'), words)); return tag; };
  const num = n => text(h('span', 'ms-k-num', { 'aria-hidden': 'true' }), String(n));

  // ── Portraits, cells and the 3 × 3 (ui.mjs cell) ────────────────────
  /** A person's portrait from the match's crew bundle; without a character, the pack's empty tile with its players mark. */
  function setPortrait(node, person, versions) {
    const character = person?.character ?? null;
    node.className = character ? 'ms-k-pt' : 'ms-k-pt ms-k-pt-empty';
    node.setAttribute('aria-hidden', 'true');
    const image = character ? crewPortraitVariable(character, versions) : '';
    if (node.style.backgroundImage !== image) node.style.backgroundImage = image;
    const mark = character ? '' : 'players';
    if ((node.dataset.mark ?? '') !== mark) { node.replaceChildren(...(mark ? [icon(mark)] : [])); node.dataset.mark = mark; }
    return node;
  }
  const portrait = (person, versions) => setPortrait(h('span'), person, versions);
  /**
   * { person: { seat, name, character }, state, note, count, mark (an icon), you, label, intent, versions }.
   * Seat n is always cell n; an empty cell is aria-hidden. In results the count holds the top-left corner
   * and "You" the top-right; the accessible name says the seat, the name and the count.
   */
  function setCell(node, props) {
    const state = oneOf(props.state ?? 'available', CELL_STATES, 'A cell\'s state');
    node.classList.add('ms-k-cell');
    node.dataset.state = state;
    if (!node.querySelector(':scope > .ms-k-cell-name')) {
      const name = h('span', 'ms-k-cell-name');
      name.append(h('span', 'ms-k-num', { 'aria-hidden': 'true' }), h('span', 'ms-k-cell-label'));
      node.append(h('span'), name, h('span', 'ms-k-cell-note'));
    }
    const [face, name, note] = [node.children[0], node.querySelector(':scope > .ms-k-cell-name'), node.querySelector(':scope > .ms-k-cell-note')];
    // An empty seat (a 7- or 8-player match) is an empty frame, as the pack draws it: nothing inside.
    const empty = state === 'empty';
    face.hidden = name.hidden = empty;
    setPortrait(face, empty ? null : props.person, props.versions ?? null);
    const n = seatNumber(props.person);
    text(name.firstChild, Number.isFinite(n) ? String(n) : '');
    text(name.lastChild, empty ? '' : props.person?.name ?? '');
    text(note, empty ? '' : props.note ?? '');
    note.hidden = empty || !props.note;
    const keepBadge = (cls, wanted, make) => {
      let badge = node.querySelector(`:scope > .${cls}`);
      if (!wanted) { badge?.remove(); return null; }
      if (!badge) { badge = make(); node.append(badge); }
      return badge;
    };
    const count = keepBadge('ms-k-count', !empty && props.count !== undefined && props.count !== null, () => h('span', 'ms-k-count', { 'aria-hidden': 'true' }));
    if (count) text(count, String(props.count));
    keepBadge('ms-k-you', !empty && !!props.you, () => text(h('span', 'ms-k-you', { 'aria-hidden': 'true' }), 'You'));
    const mark = keepBadge('ms-k-cell-mark', !empty && !!props.mark, () => h('span', 'ms-k-cell-mark', { 'aria-hidden': 'true' }));
    if (mark) setIcon(mark, props.mark, true);
    attr(node, 'aria-hidden', empty ? 'true' : null);
    const words = props.label ?? (empty ? null : [Number.isFinite(n) ? `Player ${n}` : null, props.person?.name, props.count !== undefined && props.count !== null ? `${props.count} ${props.count === 1 ? 'vote' : 'votes'}` : null, props.note].filter(Boolean).join(', '));
    attr(node, 'aria-label', words);
    // A choice says whether it is the one picked; whether it can be picked is the policy's (aria-disabled).
    attr(node, 'aria-pressed', node.tagName === 'BUTTON' && !empty ? String(state === 'selected') : null);
    if (props.intent) node.dataset.intent = props.intent;
    if (props.person?.seat !== undefined) node.dataset.value = String(props.person.seat);
    return node;
  }
  const cell = props => setCell(props.tag === 'div' ? h('div') : h('button', null, { type: 'button' }), props);
  /** The 3 × 3 in its container (a list of whole names when it is narrow); returns { wrap, grid }. */
  const grid9 = () => { const wrap = h('div', 'ms-k-grid-wrap'), grid = h('div', 'ms-k-grid9'); wrap.append(grid); return { wrap, grid }; };

  // ── Fields, code boxes, the inline error (ui.mjs field, codeBoxes, errorNote) ──
  /**
   * A labelled text field: the pack's box (ms-k-input) around a real input, with an optional icon and a
   * count at its end ("3/12"). { label, value, placeholder, maxLength, autocomplete, secret, mono, invalid,
   * count, icon }. Returns { field, input }. setField() changes the label, the placeholder, the icon, the
   * count and the invalid state in place; the typing, and so the value, is the component's.
   */
  function field(props) {
    const wrap = h('label', 'ms-k-field'), box = h('span', 'ms-k-input');
    const input = h('input', 'ms-k-input-text', { type: props.secret ? 'password' : 'text', autocomplete: props.autocomplete ?? 'off', spellcheck: 'false',
      autocapitalize: props.secret || props.mono ? 'off' : null });
    box.append(h('span', 'ms-k-input-icon'), input, h('span', 'ms-k-input-count'));
    wrap.append(h('span', 'ms-k-field-label'), box);
    input.value = props.value ?? '';
    setField(wrap, props);
    return { field: wrap, input };
  }
  function setField(node, props) {
    const [label, box] = node.children, [glyph, input, count] = box.children;
    text(label, props.label);
    setIcon(glyph, props.icon ?? null, false);
    attr(input, 'placeholder', props.placeholder ?? null);
    attr(input, 'maxlength', props.maxLength ?? null);
    attr(input, 'aria-invalid', props.invalid ? 'true' : null);
    attr(box, 'data-invalid', props.invalid ? '' : null);
    attr(box, 'data-mono', props.mono ? '' : null);
    text(count, props.count ?? '');
    count.hidden = props.count === undefined || props.count === null;
    return node;
  }
  /** Six boxes showing a code as it is typed (the typing itself is the component's); `focusAt` marks the next box. */
  function setCodeBoxes(node, { code = '', focusAt = null, invalid = false, length = 6, label = 'Room code' } = {}) {
    node.className = 'ms-k-code';
    node.setAttribute('role', 'group');
    attr(node, 'aria-label', label);
    attr(node, 'data-invalid', invalid ? '' : null);
    while (node.children.length < length) node.append(h('b', 'ms-k-code-box', { 'aria-hidden': 'true' }));
    [...node.children].forEach((box, i) => { text(box, code[i] ?? ''); attr(box, 'data-focus', i === focusAt ? '' : null); });
    return node;
  }
  const codeBoxes = props => setCodeBoxes(h('div'), props);
  const errorNote = words => { const note = h('p', 'ms-k-error', { role: 'alert' }); note.append(icon('warning', true), text(h('span', 'ms-k-error-text'), words)); return note; };

  // ── The segmented control, the stepper, the switch ───────────────────
  /** options: [{ id, label, icon }]; one is `value`. A radio group: each option says whether it is chosen. */
  function setSeg(node, { options, value, label = null, intent = 'seg' }) {
    node.className = 'ms-k-seg';
    node.setAttribute('role', 'radiogroup');
    attr(node, 'aria-label', label);
    const ids = options.map(o => String(o.id));
    for (const b of [...node.children]) if (!ids.includes(b.dataset.value)) b.remove();
    options.forEach((o, i) => {
      let b = [...node.children].find(c => c.dataset.value === String(o.id));
      if (!b) { b = h('button', 'ms-k-seg-btn', { type: 'button', role: 'radio' }); b.append(h('span', 'ms-k-seg-icon'), h('span', 'ms-k-seg-label')); b.dataset.value = String(o.id); b.dataset.intent = intent; }
      if (node.children[i] !== b) node.insertBefore(b, node.children[i] ?? null);
      setIcon(b.firstChild, o.icon ?? null, false);
      text(b.lastChild, o.label);
      attr(b, 'aria-checked', String(String(o.id) === String(value)));
    });
    return node;
  }
  const seg = props => setSeg(h('div'), props);
  /** − value +; each side's availability is the component's. Returns the stepper; its parts by data-step. */
  function setStepper(node, { value, label, intent = 'step' }) {
    node.className = 'ms-k-stepper';
    node.setAttribute('role', 'group');
    attr(node, 'aria-label', label ?? null);
    if (!node.firstChild) {
      const less = h('button', 'ms-k-stepper-btn', { type: 'button', 'aria-label': 'Fewer' }), more = h('button', 'ms-k-stepper-btn', { type: 'button', 'aria-label': 'More' });
      less.append(icon('minus')); more.append(icon('plus'));
      less.dataset.intent = more.dataset.intent = intent;
      less.dataset.value = 'down'; more.dataset.value = 'up';
      node.append(less, h('output', 'ms-k-stepper-value', { 'aria-live': 'polite' }), more);
    }
    text(node.children[1], String(value));
    return node;
  }
  const stepper = props => setStepper(h('div'), props);
  function setSwitch(node, { checked, label, intent = 'switch' }) {
    node.className = 'ms-k-switch';
    node.setAttribute('role', 'switch');
    attr(node, 'aria-checked', String(!!checked));
    attr(node, 'aria-label', label ?? null);
    node.dataset.intent = intent;
    return node;
  }
  const switchControl = props => setSwitch(h('button', null, { type: 'button' }), props);

  return Object.freeze({ h, text, attr, icon, setIcon, button, setButton, iconButton, setIconButton, row, setRow, list, groupLabel, groupNote,
    pill, setPill, stamp, setStamp, caption, num, portrait, setPortrait, cell, setCell, grid9, field, setField, codeBoxes, setCodeBoxes, errorNote,
    seg, setSeg, stepper, setStepper, switchControl, setSwitch });
}

/**
 * The control policy every Designer component follows (Frontend's interface reviews of the room scene and
 * the shell, #4 and #261):
 *   - a control that is unavailable (`off`) is dimmed and refused, and keeps its focus (aria-disabled,
 *     never the disabled attribute, which would drop the focus);
 *   - a control the component is not taking now (`accepts(intent)` false: reconnecting, not interactive)
 *     is refused without dimming;
 *   - a busy control is refused, and says so (aria-busy);
 *   - a reason Frontend supplies is the control's accessible description;
 *   - when the focused control is removed, the focus moves to the component's root, and then
 *     onFocusReturn({ intent, value }) tells Frontend which one ended, once.
 * The component keeps its one delegated listener and asks `refused(target)` before it reports a tap.
 */
export function createControlPolicy({ root, accepts = () => true, defaultReason = () => null, onFocusReturn = null }) {
  if (!root?.ownerDocument) throw new TypeError('A control policy needs the component\'s root');
  const doc = root.ownerDocument;
  const reasons = doc.createElement('div');
  reasons.className = 'ms-k-vh';
  root.append(reasons);
  let seq = 0, disposed = false;
  const uid = `ms-k-${(createControlPolicy.count = (createControlPolicy.count ?? 0) + 1)}`;
  const notes = new WeakMap();
  const set = (node, name, value) => { if (value === null) { if (node.hasAttribute(name)) node.removeAttribute(name); } else if (node.getAttribute(name) !== value) node.setAttribute(name, value); };

  function control(node, { intent = node.dataset.intent, off = false, busy = false, reason = null } = {}) {
    const refused = off || !accepts(intent);
    set(node, 'aria-disabled', refused ? 'true' : null);
    set(node, 'aria-busy', busy ? 'true' : null);
    set(node, 'data-off', off ? '' : null);
    const why = reason ?? (refused && !off ? defaultReason(intent) : null);
    let note = notes.get(node);
    if (why) {
      if (!note) { note = doc.createElement('span'); note.id = `${uid}-r${(seq += 1)}`; reasons.append(note); notes.set(node, note); }
      if (note.textContent !== why) note.textContent = why;
      set(node, 'aria-describedby', note.id);
    } else if (note) { note.remove(); notes.delete(node); set(node, 'aria-describedby', null); }
    return node;
  }
  /** Whether a tap on this control is refused now. */
  const refused = target => target.getAttribute('aria-disabled') === 'true' || target.getAttribute('aria-busy') === 'true';
  /** Removes a node (and the reasons of the controls in it); the focus returns as the policy says. */
  function remove(node) {
    if (!node) return;
    for (const c of [node, ...node.querySelectorAll('[aria-describedby]')]) { const note = notes.get(c); if (note) { note.remove(); notes.delete(c); } }
    const active = doc.activeElement;
    const focused = !!active && node.contains(active);
    const ended = focused ? active.closest?.('[data-intent]') : null;
    node.remove();
    if (!focused || disposed) return;
    root.focus({ preventScroll: true });
    const detail = ended ? { intent: ended.dataset.intent, value: ended.dataset.value ?? null } : null;
    queueMicrotask(() => { if (!disposed && doc.activeElement === root) onFocusReturn?.(detail); });
  }
  function dispose() { disposed = true; reasons.remove(); }
  return Object.freeze({ control, refused, remove, dispose });
}
