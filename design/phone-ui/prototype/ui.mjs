// mothership:dev-only
//
// The pack's shared components: one implementation of the top bar, bottom tabs, sheets, buttons,
// lists, fields, grids, cells, stamps, toasts and banners, reused by every screen. Each component's
// states are named in docs/design/phone-ui-handoff.md, which maps them to Frontend's components.

import { iconSvg } from './icons.mjs';
import { portrait } from './art.mjs';

/** Hyperscript: h('div.a.b', {attr}, ...children). */
export function h(tag, props, ...kids) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) { kids.unshift(props); props = null; }
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'style' && typeof v === 'object') for (const [prop, val] of Object.entries(v)) { if (prop.startsWith('--')) el.style.setProperty(prop, val); else el.style[prop] = val; }
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

/** An icon element. */
export function ic(name, opts = {}) {
  const t = document.createElement('template');
  t.innerHTML = iconSvg(name, opts).trim();
  return t.content.firstChild;
}

export const pt = (character, size = 36, alt = '') => portrait(character, { size, alt });

// ── Buttons ─────────────────────────────────────────────────────────────
export function button(label, { kind = 'primary', icon = null, disabled = false, busy = false, go = null, block = false, small = false, aria = null, pressed = null, expanded = null } = {}) {
  return h(`button.btn.btn-${kind}${block ? '.btn-block' : ''}${small ? '.btn-sm' : ''}`, {
    type: 'button', 'aria-disabled': disabled ? 'true' : null, 'aria-busy': busy ? 'true' : null, 'data-go': go,
    'aria-label': aria, 'aria-pressed': pressed, 'aria-expanded': expanded,
  }, icon ? ic(icon, { filled: kind === 'primary' }) : null, h('span', label));
}

export function iconButton(icon, label, { go = null } = {}) {
  return h('button.icon-btn', { type: 'button', 'aria-label': label, 'data-go': go }, ic(icon));
}

// ── Top bar ─────────────────────────────────────────────────────────────
function clock(seconds) { const s = Math.max(0, Math.ceil(seconds)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

export function timer(seconds, { urgentAt = 10, ring = null } = {}) {
  if (seconds === null || seconds === undefined) return null;
  return h('span.timer', { role: 'timer', 'aria-label': `${Math.ceil(seconds)} seconds left`, 'data-urgent': seconds <= urgentAt ? '' : null },
    ring === null ? ic('timer') : h('span.timer-ring', { style: { '--p': String(ring) }, 'aria-hidden': 'true' }), h('span', clock(seconds)));
}

/**
 * kind 'turn': who = {seat, name, character}, self flag; kind 'phase': icon + title; kind 'pair': two people.
 * round: number or null. seconds: the authoritative time left (or null).
 */
export function topBar({ kind = 'turn', who = null, self = false, pair = null, icon = 'hourglass', title = '', sub = '', round = null, seconds = null, tone = null, urgentAt = 10, ring = null }) {
  let left;
  if (kind === 'turn' && who) {
    left = h('div.tb-who', pt(who.character, 36, ''), h('div.tb-lines',
      h('span.tb-name', self ? 'Your turn' : who.name),
      h('span.tb-sub', self ? h('b', `Player ${who.seat} · ${who.name}`) : `Player ${who.seat} · Turn`)));
  } else if (kind === 'pair' && pair) {
    left = h('div.tb-who', h('span.pt-pair', pair.map(p => pt(p.character, 36, ''))), h('div.tb-lines',
      h('span.tb-name', pair.map(p => p.name).join(' + ')), h('span.tb-sub', sub || 'Private talk')));
  } else {
    left = h('div.tb-who', h('span.tb-glyph', { 'data-tone': tone }, ic(icon, { filled: true })), h('div.tb-lines',
      h('span.tb-name', title), sub ? h('span.tb-sub', sub) : null));
  }
  return h('header.tb', { 'data-tone': tone, 'aria-label': 'Match status' }, left,
    h('div.tb-right', round !== null ? h('span.tb-round', { 'aria-label': `Round ${round}` }, `R${round}`) : null, timer(seconds, { urgentAt, ring })));
}

// ── Bottom tabs ─────────────────────────────────────────────────────────
/**
 * view: 'room' | 'board' (the first tab names the other view); open: 'actions' | 'card' | 'more' | null;
 * hero: 'pass' | 'pass-off' | 'vote' | 'voted' | 'vote-off'; disabled: {actions, card, more}; badges: {more: n}.
 */
export function tabs({ view = 'room', open = null, hero = 'pass-off', disabled = {}, badges = {}, go = {} } = {}) {
  const tab = (key, icon, label, extra = {}) => h('button.tab', {
    type: 'button', 'aria-expanded': ['actions', 'card', 'more'].includes(key) ? String(open === key) : null,
    'aria-disabled': disabled[key] ? 'true' : null, 'data-go': go[key] ?? null, ...extra,
  }, ic(icon, { filled: open === key }), h('span', label), badges[key] ? h('b.badge-dot', { 'aria-label': `${badges[key]} new` }, String(badges[key])) : null);
  const heroMode = hero.startsWith('vote') ? (hero === 'voted' ? 'voted' : 'vote') : 'pass';
  const heroOff = hero.endsWith('-off');
  const heroLabel = heroMode === 'pass' ? 'Pass' : heroMode === 'voted' ? 'Voted' : 'Vote';
  return h('nav.tabs', { 'aria-label': 'Game' },
    view === 'room' ? tab('switch', 'board', 'Board', { 'aria-label': 'Show the whole board' }) : tab('switch', 'room', 'Room', { 'aria-label': 'Show my room' }),
    tab('actions', 'actions', 'Actions'),
    h('div.tab.tab-hero', h('button.hero', { type: 'button', 'data-mode': heroMode, 'aria-disabled': heroOff ? 'true' : null, 'data-go': go.hero ?? null, 'aria-label': heroMode === 'pass' ? 'Pass your turn' : heroMode === 'voted' ? 'Ballot registered' : 'Open the ballot' },
      ic(heroMode === 'pass' ? 'pass' : 'vote', { filled: true }), h('b', heroLabel)), h('span.hero-label', heroLabel)),
    tab('card', 'card', 'Card'),
    tab('more', 'more', 'More'));
}

// ── Sheets ──────────────────────────────────────────────────────────────
export function sheet({ title, sub = null, body = [], foot = null, detent = 'auto', close = true, overTabs = false, back = null, scrim = true, label = null, style = null, actions = [] }) {
  const head = h('div.sheet-head',
    back ? h('button.icon-btn', { type: 'button', 'aria-label': 'Back', 'data-go': back }, ic('chevronLeft')) : null,
    h('div.sheet-title', h('h2', title), sub ? h('p', sub) : null),
    actions,
    close ? h('button.icon-btn', { type: 'button', 'aria-label': 'Close', 'data-go': typeof close === 'string' ? close : null }, ic('close')) : null);
  const s = h('section.sheet', { 'data-detent': detent, 'data-over': overTabs ? 'tabs' : null, role: 'dialog', 'aria-label': label ?? title, style },
    h('div.sheet-grab', { 'aria-hidden': 'true' }), head, h('div.sheet-body', body), foot ? h('div.sheet-foot', foot) : null);
  return scrim ? [h('div.scrim', { 'aria-hidden': 'true' }), s] : [s];
}

// ── Lists and rows ──────────────────────────────────────────────────────
export function row({ icon = null, tint = null, title, sub = null, value = null, chevron = false, go = null, disabled = false, lead = null, trail = null, tag = 'button' }) {
  return h(`${tag}.row`, { type: tag === 'button' ? 'button' : null, 'data-go': go, 'aria-disabled': disabled ? 'true' : null },
    lead ?? (icon ? h('span.row-icon', { 'data-tint': tint }, ic(icon, { filled: true })) : null),
    h('span.row-main', h('span.row-title', title), sub ? h('span.row-sub', sub) : null),
    value !== null ? h('span.row-value', value) : null, trail,
    chevron ? h('span.row-chev', ic('chevronRight')) : null);
}
export const list = (...rows) => h('ul.list', rows.flat().filter(Boolean).map(r => h('li', r)));
export const groupLabel = text => h('p.group-label', text);
export const groupNote = text => h('p.group-note', text);

// ── Fields ──────────────────────────────────────────────────────────────
export function field(label, { value = '', placeholder = '', focus = false, invalid = false, count = null, icon = null, secret = false, mono = false } = {}) {
  const shown = secret && value ? '•'.repeat(Math.min(value.length, 24)) : value;
  return h('label.field', h('span', label), h('div.input', { 'data-focus': focus ? '' : null, 'data-invalid': invalid ? '' : null, style: mono ? { fontFamily: 'ui-monospace, "SF Mono", "JetBrains Mono", monospace', letterSpacing: '0.04em' } : null },
    icon ? ic(icon) : null, shown ? h('span', shown) : h('span.ph-text', placeholder), focus ? h('span.caret', { 'aria-hidden': 'true' }) : null, count !== null ? h('span.count', count) : null));
}
export function codeBoxes(code, { focusAt = null, invalid = false } = {}) {
  return h('div.code-boxes', { role: 'group', 'aria-label': 'Room code', 'data-invalid': invalid ? '' : null },
    Array.from({ length: 6 }, (_, i) => h('b', { 'data-focus': focusAt === i ? '' : null }, code[i] ?? '')));
}
export function errorNote(text) { return h('p.error', { role: 'alert' }, ic('warning', { filled: true }), h('span', text)); }

// ── Grid cells ──────────────────────────────────────────────────────────
/** A 3 × 3 roster cell. state: available | selected | confirmed | taken | ineligible | empty | winner | faded. */
export function cell(p, { state = 'available', note = '', count = null, mark = null, you = false, label = null, go = null } = {}) {
  if (!p) return h('div.cell', { 'data-state': 'empty', 'aria-hidden': 'true' });
  const interactive = ['available', 'selected'].includes(state);
  return h(interactive ? 'button.cell' : 'div.cell', {
    type: interactive ? 'button' : null, 'data-state': state, 'data-go': go,
    'aria-pressed': interactive ? String(state === 'selected') : null,
    'aria-label': label ?? `Player ${p.seat}, ${p.name}${note ? `, ${note}` : ''}`,
  }, pt(p.character, 92, ''),
  h('span.cell-name', h('b.num', String(p.seat)), h('span', p.name)),
  note ? h('span.cell-note', note) : null,
  count !== null ? h('b.count', { 'aria-hidden': 'true' }, String(count)) : null,
  you ? h('span.you', 'You') : null,
  mark ? h('span.cell-mark', ic(mark, { filled: true })) : null);
}

// ── Accents ─────────────────────────────────────────────────────────────
export const stamp = (text, tone = null) => h('span.stamp', { 'data-tone': tone }, text);
export const caption = text => h('span.caption-tag', h('span', text));
export const pill = (text, { icon = null, tone = null } = {}) => h('span.pill', { 'data-tone': tone }, icon ? ic(icon, { filled: true }) : null, h('span', text));
export const toast = (text, icon = 'check') => h('div.toast', { role: 'status' }, ic(icon, { filled: true }), h('span', text));
export function banner({ icon = 'info', title, sub = null, action = null }) {
  return h('div.banner', { role: 'status' }, ic(icon, { filled: true }), h('div.banner-text', h('b', title), sub ? h('span', sub) : null), action);
}

/** Device chrome for review frames: a status bar and the home indicator. Not part of the interface. */
export function deviceChrome(root) {
  root.append(h('div.ph-status', { 'aria-hidden': 'true' }, h('span', '9:41'), h('i')), h('div.ph-home', { 'aria-hidden': 'true' }));
}
