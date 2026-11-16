// The pack's gameplay parts that several of the Gameplay UI builder's components draw, each built once (the
// Lead's L2, 15 November 2026): runtime source, Designer's (the owner, 14 and 15 November 2026: Designer builds
// each visual component once, in design/; the game and the previews use it as it is).
//   - the tile: an action's icon, short name and state line (Actions, sheet 28; the private talk's
//     declaration, 25);
//   - who: the person, both people, or the action's icon, with its words (the check before Register, 27.2 and
//     29; Promises, 33; the Captain's Release and Eject, 40; a private talk, 25; Scan, 42);
//   - facts: the lines with an amber "i" (the same screens);
//   - the notice: a large icon or a stamp, centred over its lines (45's "Outcome unknown"; Scan and the Code's
//     results, 42; the Hospital panel, 32; the office's block, 40);
//   - the time line: what has happened and what is still to come (After Register, 29.1 and 29.2).
// Each is the pack's own drawing (design/phone-ui/prototype/screens-game.mjs, screens-more.mjs and screens.css),
// on the kit's values (../kit). Builders with setters, as the kit's: a setter updates its node in place and
// keeps it, so a focused tile keeps its element and its focus. The parts hold no state of their own and decide
// nothing: what a tile says, what a fact says and which step is done are the caller's.
// If another builder ever needs one of them, the Lead moves that part into the kit.

import { createKit } from '../kit/kit.mjs';

export const PLAY_PARTS_VERSION = 'play-parts-0.2.0';
/** A tile's states: offered, being chosen or checked, with the server, accepted and waiting, or not offered. */
export const TILE_STATES = Object.freeze(['available', 'selected', 'sending', 'registered', 'unavailable']);
/** A time line's steps: done (a filled amber check), next and later (a dashed hourglass). */
export const STEP_STATES = Object.freeze(['done', 'next', 'later']);
/** The words a part draws itself: only the registered mark. Everything else is the caller's. */
export const PLAY_PARTS_WORDS = Object.freeze({ registered: 'REGISTERED', registeredSaid: 'registered' });

const isText = value => typeof value === 'string' && value.length > 0;
const optionalText = (value, what) => {
  if (value !== null && value !== undefined && typeof value !== 'string') throw new TypeError(`${what} is text, or null`);
  return value === '' ? null : value ?? null;
};

/** The parts' builders, for one document. */
export function createPlayParts(doc) {
  if (!doc?.createElement) throw new TypeError('The play parts need a document');
  const kit = createKit(doc);
  const { h, text, attr, setIcon } = kit;

  // ── The tile (screens-game.mjs tile(); screens.css .tile) ────────────
  /**
   * { icon | art, name, note, noteIcon, state, badge, label, intent, value }. A tile is always a button, so a
   * focused tile keeps its element and its focus through every state: the caller's control policy refuses the
   * taps of one that is not available or being chosen. `note` is the state line under the name (the reason of an
   * unavailable tile), with `noteIcon` before it (the private talk's lock); `badge` the count on the icon's corner;
   * `label` its accessible name, by default the name, the note and "registered", as the pack writes it, or
   * `false` for none, so the name comes from the tile's own words. `art` (0.2.0): a card's SVG markup, from the
   * game's own art, drawn in place of the icon at the tile's width (the private talk's side cards, 25).
   */
  const artOf = new WeakMap();
  function setTile(node, props) {
    if (!isText(props?.name)) throw new TypeError('A tile needs its name');
    if (!isText(props.icon) && !isText(props.art)) throw new TypeError('A tile needs its icon or its art');
    const state = props.state ?? 'available';
    if (!TILE_STATES.includes(state)) throw new TypeError(`A tile's state is ${TILE_STATES.join(', ')}, not ${JSON.stringify(state)}`);
    const note = optionalText(props.note, 'A tile\'s note');
    const badge = props.badge === null || props.badge === undefined ? null : String(props.badge);
    if (badge !== null && !/^\d+$/.test(badge)) throw new TypeError('A tile\'s badge is a whole number, or null');
    node.classList.add('ms-pp-tile');
    if (!node.querySelector(':scope > .ms-pp-tile-name')) {
      node.append(h('span', 'ms-pp-tile-icon'), h('b', 'ms-pp-tile-name'), h('small', 'ms-pp-tile-note'),
        h('span', 'ms-pp-tile-badge'), h('span', 'ms-pp-tile-stamp', { 'aria-hidden': 'true' }));
    }
    const [lead, name, small, count, stamp] = node.children;
    node.dataset.state = state;
    if (isText(props.art)) {
      // The card's art at the tile's width, kept while it is the same markup.
      lead.className = 'ms-pp-tile-art';
      lead.setAttribute('aria-hidden', 'true');
      if (artOf.get(lead) !== props.art) { lead.innerHTML = props.art; artOf.set(lead, props.art); }
    } else {
      // The pack fills the icon, but not on an unavailable tile.
      if (lead.className !== 'ms-pp-tile-icon') { lead.className = 'ms-pp-tile-icon'; lead.removeAttribute('aria-hidden'); artOf.delete(lead); lead.replaceChildren(); }
      setIcon(lead, props.icon, state !== 'unavailable');
    }
    text(name, props.name);
    if (note !== null && isText(props.noteIcon)) {
      small.replaceChildren(kit.icon(props.noteIcon, true), doc.createTextNode(note));
      small.dataset.hasIcon = '';
    } else {
      text(small, note ?? '');
      delete small.dataset.hasIcon;
    }
    small.hidden = note === null;
    text(count, badge ?? '');
    count.hidden = badge === null;
    // The badge repeats the note's count: a screen reader hears it once, in the note.
    attr(count, 'aria-hidden', note !== null ? 'true' : null);
    text(stamp, state === 'registered' ? PLAY_PARTS_WORDS.registered : '');
    stamp.hidden = state !== 'registered';
    attr(node, 'aria-label', props.label === false ? null : props.label ?? `${props.name}${note ? `, ${note}` : ''}${state === 'registered' ? `, ${PLAY_PARTS_WORDS.registeredSaid}` : ''}`);
    if (props.intent) node.dataset.intent = props.intent;
    if (props.value !== undefined && props.value !== null) node.dataset.value = String(props.value);
    return node;
  }
  const tile = props => setTile(h('button', null, { type: 'button' }), props);

  // ── Who: the check's person, people or icon (screens.css .confirm-who) ─
  /**
   * { people: [{ seat, character }] (none, one or two), icon (with none), title, sub, versions }: one person's
   * 64 px portrait, two people's portraits side by side, or the action's icon on its 64 px paper tile; then the
   * title ("Rescue Eli") and the sub ("Player 5 · Hospital", "Only you see this").
   */
  function setWho(node, props) {
    if (!isText(props?.title)) throw new TypeError('Who needs its title');
    const people = props.people ?? [];
    if (!Array.isArray(people) || people.length > 2) throw new TypeError('Who draws none, one or two people');
    if (!people.length && !isText(props.icon)) throw new TypeError('Who without a person needs the action\'s icon');
    node.className = 'ms-pp-who';
    if (!node.querySelector(':scope > .ms-pp-who-words')) {
      const words = h('div', 'ms-pp-who-words');
      words.append(h('b', 'ms-pp-who-title'), h('span', 'ms-pp-who-sub'));
      node.append(h('span', 'ms-pp-who-lead'), words);
    }
    const [lead, words] = node.children;
    const form = people.length === 2 ? 'pair' : people.length === 1 ? 'person' : 'icon';
    if (lead.dataset.form !== form) { lead.replaceChildren(); lead.dataset.form = form; lead.dataset.icon = ''; }
    if (form === 'icon') setIcon(lead, props.icon, true);
    else {
      while (lead.children.length < people.length) lead.append(h('span'));
      people.forEach((p, i) => kit.setPortrait(lead.children[i], p, props.versions ?? null));
    }
    text(words.firstChild, props.title);
    text(words.lastChild, props.sub ?? '');
    words.lastChild.hidden = !props.sub;
    return node;
  }
  const who = props => setWho(h('div'), props);

  // ── Facts: lines with an amber "i" (screens.css .facts) ──────────────
  /** [line, …]: each kept by its place. */
  function setFacts(node, lines) {
    if (!Array.isArray(lines) || !lines.every(isText)) throw new TypeError('Facts are lines of text');
    node.className = 'ms-pp-facts';
    while (node.children.length > lines.length) node.lastChild.remove();
    while (node.children.length < lines.length) {
      const li = h('li');
      li.append(kit.icon('info', true), h('span'));
      node.append(li);
    }
    lines.forEach((line, i) => text(node.children[i].lastChild, line));
    node.hidden = lines.length === 0;
    return node;
  }
  const facts = lines => setFacts(h('ul'), lines);

  // ── The notice: an icon or a stamp over its lines (screens.css .registered) ─
  /**
   * { icon, filled, stamp: { text, tone }, lines: [text, …], status }: centred, as sheet 45's "Outcome unknown".
   * The pack's icon there is its own size: the 76 px .big-icon tile applies only inside a waiting block (.wait),
   * and the notice has none, so the icon is drawn as the pack draws it. `status` reads it as it opens.
   */
  function setNotice(node, props) {
    const lines = props?.lines ?? [];
    if (!Array.isArray(lines) || !lines.length || !lines.every(isText)) throw new TypeError('A notice needs its lines');
    if (!isText(props.icon) && !isText(props.stamp?.text)) throw new TypeError('A notice has an icon or a stamp');
    node.className = 'ms-pp-notice';
    attr(node, 'role', props.status === false ? null : 'status');
    if (!node.firstChild) node.append(h('span', 'ms-pp-notice-icon'));
    let mark = node.firstChild;
    if (isText(props.stamp?.text)) {
      if (!mark.classList.contains('ms-k-stamp')) { const s = h('span'); mark.replaceWith(s); mark = s; }
      kit.setStamp(mark, { text: props.stamp.text, tone: props.stamp.tone ?? null });
    } else {
      if (!mark.classList.contains('ms-pp-notice-icon')) { const s = h('span', 'ms-pp-notice-icon'); mark.replaceWith(s); mark = s; }
      setIcon(mark, props.icon, props.filled !== false);
    }
    const paras = [...node.querySelectorAll(':scope > p')];
    while (paras.length > lines.length) paras.pop().remove();
    while (paras.length < lines.length) { const p = h('p'); node.append(p); paras.push(p); }
    lines.forEach((line, i) => text(paras[i], line));
    return node;
  }
  const notice = props => setNotice(h('div'), props);

  // ── The time line (screens-game.mjs steps(); screens.css .steps) ─────
  /** [{ state: 'done' | 'next' | 'later', title, sub }, …]: each kept by its place. */
  function setTimeline(node, steps) {
    if (!Array.isArray(steps)) throw new TypeError('A time line is a list of steps');
    steps.forEach((s, i) => {
      if (!s || !STEP_STATES.includes(s.state) || !isText(s.title)) throw new TypeError(`steps[${i}] is { state: ${STEP_STATES.join(' | ')}, title, sub }`);
    });
    node.className = 'ms-pp-steps';
    while (node.children.length > steps.length) node.lastChild.remove();
    while (node.children.length < steps.length) {
      const li = h('li');
      const words = h('div');
      words.append(h('b'), h('span'));
      li.append(h('span', 'ms-pp-step-dot'), words);
      node.append(li);
    }
    steps.forEach((s, i) => {
      const li = node.children[i];
      li.dataset.step = s.state;
      setIcon(li.firstChild, s.state === 'done' ? 'check' : 'hourglass', s.state === 'done');
      text(li.lastChild.firstChild, s.title);
      text(li.lastChild.lastChild, s.sub ?? '');
      li.lastChild.lastChild.hidden = !s.sub;
    });
    node.hidden = steps.length === 0;
    return node;
  }
  const timeline = steps => setTimeline(h('ol'), steps);

  return Object.freeze({ tile, setTile, who, setWho, facts, setFacts, notice, setNotice, timeline, setTimeline });
}
