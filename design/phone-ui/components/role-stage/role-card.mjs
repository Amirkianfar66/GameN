// The role card: the player's own role, as the phone pack draws it (sheets 17 and 18 on the role stage,
// 31 in the Card sheet). Runtime source, Designer's (the owner, 14 and 15 November 2026: Designer builds
// each visual component once, in design/; the game and the preview use it as it is). The role stage
// (role-stage.mjs) mounts it, and so can the Card sheet's content.
//
// What it draws: face up, the person (their own character, card-cN) with the role's held device, the
// role's name, its team and one to three short lines; with the picture missing, the text card with
// "Picture unavailable · Your role is below"; face down, the card back ("Role hidden", Show role); the
// Ready stamp. It scales to its space with container units, as the pack's .rolecard does.
//
// What it never does: work out a role's team, device or words from the rules. Frontend gives them, from
// the viewer's own private view; face down, it needs none, and drops what it had.

import { iconSvg } from '../icons.mjs';

export const ROLE_CARD_VERSION = 'role-card-0.1.0';
const TEAMS = Object.freeze(['Blue', 'Red', 'Alien']);
const DEVICES = Object.freeze(['cracker', 'insider', 'blue-disabler', 'red-disabler', 'supplier', 'undercover', 'hacker', 'alien', 'engineer']);

/** The pack's words on the card (screens-pregame.mjs roleCard(), the role screen; sheet 31's Hidden). */
export const CARD_WORDS = Object.freeze({
  missing: 'Picture unavailable',
  missingSub: 'Your role is below',
  hidden: 'Role hidden',
  show: 'Show role',
  hiddenShort: 'Hidden',
  showShort: 'Show',
  ready: 'Ready',
});

/** Every input, with its default: face down, which needs nothing private. */
export const ROLE_CARD_DEFAULTS = Object.freeze({
  face: 'down', role: null, team: null, facts: Object.freeze([]), character: null, device: null, art: 'ok', stamp: null,
  // The card back's words: 'stage' ("Role hidden", "Show role", sheet 18) or 'sheet' ("Hidden", "Show", sheet 31).
  back: 'stage', show: Object.freeze({ enabled: true, reason: null }),
});

const isText = value => typeof value === 'string' && value.length > 0;

/**
 * The card's input, checked. Face up needs the role, its team and its lines; face down keeps none of
 * them, so nothing private stays in the page.
 */
export function checkRoleCard(input = {}) {
  const next = { ...ROLE_CARD_DEFAULTS, ...input };
  if (!['up', 'down'].includes(next.face)) throw new TypeError(`A card's face is up or down, not ${JSON.stringify(next.face)}`);
  if (!['stage', 'sheet'].includes(next.back)) throw new TypeError(`A card back's words are stage or sheet, not ${JSON.stringify(next.back)}`);
  const show = { enabled: next.show?.enabled !== false, reason: isText(next.show?.reason) ? next.show.reason : null };
  if (next.face === 'down') return { ...ROLE_CARD_DEFAULTS, back: next.back, show };
  if (!isText(next.role)) throw new TypeError('A card face up needs its role');
  if (!TEAMS.includes(next.team)) throw new TypeError(`A card's team is ${TEAMS.join(', ')}, not ${JSON.stringify(next.team)}`);
  const facts = next.facts ?? [];
  if (!Array.isArray(facts) || facts.length > 3 || !facts.every(isText)) throw new TypeError('A card\'s facts are up to three lines of text');
  if (next.character !== null && !/^c[1-9]$/.test(next.character)) throw new TypeError('A card\'s character is c1–c9, or null');
  if (next.device !== null && !DEVICES.includes(next.device)) throw new TypeError(`A card's device is one of ${DEVICES.join(', ')}, or null`);
  if (!['ok', 'missing'].includes(next.art)) throw new TypeError('A card\'s art is ok or missing');
  if (next.stamp !== null && next.stamp !== 'ready') throw new TypeError('A card\'s stamp is ready, or null');
  // Without a character there is no person to draw: the text card, as with the picture missing.
  const art = next.character === null ? 'missing' : next.art;
  return { face: 'up', role: next.role, team: next.team, facts: [...facts], character: next.character, device: next.device, art, stamp: next.stamp, back: next.back, show };
}

/** The art bundles' properties: the person (card-cN) and the held device; the Engineer's from the successor art. */
export const personVariable = character => (character ? `var(--ms-asset-piece-crew-card-${character}, none)` : 'none');
export const deviceVariable = device => (!device ? 'none' : device === 'engineer' ? 'var(--sw-asset-sw-device-engineer, none)' : `var(--ms-asset-device-${device}-held, none)`);

/**
 * Mounts the card in `host`, which it fills, fitted to the host's box. Returns { update, dispose, element }.
 * `handlers.onShow()` reports a tap on the card back's Show.
 */
export function mountRoleCard(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('A role card needs a host element');
  const doc = host.ownerDocument;
  const el = (tag, className, attrs = {}) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) node.setAttribute(k, v);
    return node;
  };
  const icon = name => {
    const t = doc.createElement('template');
    t.innerHTML = iconSvg(name, { className: 'ms-rc-ic' }).trim();
    return t.content.firstChild;
  };
  const attr = (node, name, value) => {
    if (value === null || value === undefined || value === false) { if (node.hasAttribute(name)) node.removeAttribute(name); }
    else if (node.getAttribute(name) !== String(value)) node.setAttribute(name, String(value));
  };

  const root = el('div', 'ms-own-card');
  const reasons = el('div', 'ms-rc-vh');
  host.append(root);
  let state = checkRoleCard(input), disposed = false, faceKey = null, show = null, reason = null;
  const uid = `ms-rc-${(mountRoleCard.count = (mountRoleCard.count ?? 0) + 1)}`;
  let refuse = () => false;

  const onClick = event => {
    const target = event.target.closest?.('button[data-intent="show-role"]');
    if (!target || !root.contains(target) || disposed) return;
    if (target.getAttribute('aria-disabled') === 'true' || refuse()) return;
    handlers.onShow?.();
  };
  root.addEventListener('click', onClick);

  function face(s) {
    const card = el('article', 'ms-rc-card', { 'data-team': s.team.toLowerCase(), 'aria-label': `Your role: ${s.role}, ${s.team} team` });
    const art = el('div', 'ms-rc-art', { 'aria-hidden': s.art === 'missing' ? null : 'true' });
    if (s.art === 'missing') {
      card.dataset.art = 'missing';
      const box = el('div', 'ms-rc-missing');
      const b = el('span'), sub = el('span', 'ms-rc-missing-sub');
      b.textContent = CARD_WORDS.missing; sub.textContent = CARD_WORDS.missingSub;
      box.append(icon('card'), b, sub);
      art.append(box);
    } else {
      const person = el('span', 'ms-rc-person');
      person.style.setProperty('--ms-rc-person', personVariable(s.character));
      art.append(person);
      if (s.device) {
        const device = el('span', 'ms-rc-device');
        device.dataset.device = s.device;
        device.style.setProperty('--ms-rc-device', deviceVariable(s.device));
        art.append(device);
      }
    }
    const name = el('h2', 'ms-rc-name');
    name.textContent = s.role;
    const team = el('p', 'ms-rc-team');
    team.append(el('i', null, { 'aria-hidden': 'true' }), doc.createTextNode(`${s.team} team`));
    card.append(art, name, team);
    if (s.facts.length) {
      const list = el('ul', 'ms-rc-facts');
      for (const fact of s.facts) { const li = el('li'); li.textContent = fact; list.append(li); }
      card.append(list);
    }
    return card;
  }
  function back(s) {
    const card = el('div', 'ms-rc-back', { role: 'group', 'aria-label': s.back === 'sheet' ? CARD_WORDS.hiddenShort : CARD_WORDS.hidden });
    const words = el('p');
    words.textContent = s.back === 'sheet' ? CARD_WORDS.hiddenShort : CARD_WORDS.hidden;
    show = el('button', 'ms-rc-show', { type: 'button' });
    show.dataset.intent = 'show-role';
    const glyph = el('span', 'ms-rc-show-icon'), label = el('span', 'ms-rc-show-label');
    glyph.append(icon('show'));
    label.textContent = s.back === 'sheet' ? CARD_WORDS.showShort : CARD_WORDS.show;
    show.append(glyph, label);
    card.append(icon('hide'), words, show);
    return card;
  }

  function render() {
    if (disposed) return;
    const s = state;
    // The face is rebuilt only when what it shows changes, so the card holds still through clock ticks.
    const key = JSON.stringify([s.face, s.role, s.team, s.facts, s.character, s.device, s.art, s.back]);
    if (key !== faceKey) {
      const had = show && doc.activeElement === show;
      show = null;
      if (reason) { reason.remove(); reason = null; }
      root.replaceChildren(s.face === 'up' ? face(s) : back(s), reasons);
      faceKey = key;
      if (had && show) show.focus({ preventScroll: true });
    }
    root.dataset.face = s.face;
    // The stamp sits across the card's top edge, beside the card (the card clips what it holds).
    let stamp = root.querySelector(':scope > .ms-rc-stamp');
    if (s.face === 'up' && s.stamp === 'ready') {
      if (!stamp) {
        stamp = el('span', 'ms-rc-stamp');
        stamp.append(icon('check'), doc.createTextNode(CARD_WORDS.ready));
        root.insertBefore(stamp, reasons);
      }
    } else if (stamp) stamp.remove();
    if (show) {
      const refused = !s.show.enabled || refuse();
      attr(show, 'aria-disabled', refused ? 'true' : null);
      attr(show, 'data-off', s.show.enabled ? null : '');
      if (s.show.reason) {
        if (!reason) { reason = el('span', null, { id: `${uid}-r` }); reasons.append(reason); }
        if (reason.textContent !== s.show.reason) reason.textContent = s.show.reason;
        attr(show, 'aria-describedby', reason.id);
      } else if (reason) { reason.remove(); reason = null; attr(show, 'aria-describedby', null); }
    }
  }
  function update(next = {}) {
    if (disposed) return;
    state = checkRoleCard({ ...state, ...next });
    render();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeEventListener('click', onClick);
    root.remove();
  }
  render();
  return Object.freeze({
    update, dispose, element: root,
    /** For the role stage: whether its Show takes taps now (not while the stage refuses every tap). */
    refuseWhen(fn) { refuse = typeof fn === 'function' ? fn : () => false; render(); },
  });
}
