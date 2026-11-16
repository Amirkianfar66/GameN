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
// The first four are the kit's (component-kit-0.6.0 and 0.7.0; play-parts-0.1.1 and 0.1.2 hand them on); only
// the time line is drawn here, until another builder needs it. Each is the pack's own drawing
// (design/phone-ui/prototype/screens-game.mjs, screens-more.mjs and screens.css), on the kit's values (../kit).
// Builders with setters, as the kit's: a setter updates its node in place and keeps it, so a focused tile keeps
// its element and its focus. The parts hold no state of their own and decide nothing: what a tile says, what a
// fact says and which step is done are the caller's.
// If another builder ever needs the time line, the Lead moves it into the kit.

import { TILE_STATES as KIT_TILE_STATES, TILE_WORDS, createKit } from '../kit/kit.mjs';

export const PLAY_PARTS_VERSION = 'play-parts-0.1.2';
/** A tile's states, the kit's: offered, being chosen or checked, with the server, accepted and waiting, or not offered. */
export const TILE_STATES = KIT_TILE_STATES;
/** A time line's steps: done (a filled amber check), next and later (a dashed hourglass). */
export const STEP_STATES = Object.freeze(['done', 'next', 'later']);
/** The words a part draws itself: only the tile's registered mark, the kit's. Everything else is the caller's. */
export const PLAY_PARTS_WORDS = TILE_WORDS;

const isText = value => typeof value === 'string' && value.length > 0;

/** The parts' builders, for one document. */
export function createPlayParts(doc) {
  if (!doc?.createElement) throw new TypeError('The play parts need a document');
  const kit = createKit(doc);
  const { h, text, setIcon } = kit;

  // ── The tile, who, the facts and the notice: the kit's (component-kit-0.6.0 and 0.7.0) ──
  // The kit took them from here when another builder needed them too (the Lead's L2: a part another builder
  // needs goes into the kit), with the same props, states and behaviour, and the tile's art, note icon and
  // label: false, and the notice's extra (0.7.0). They are handed on as they are, so a caller's calls stay the
  // same; their elements carry the kit's classes (ms-k-tile, ms-k-who, ms-k-facts, ms-k-notice).
  const { tile, setTile, who, setWho, facts, setFacts, notice, setNotice } = kit;

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
