// mothership:dev-only
//
// The phone kit's pictures (issue #121): pure functions that return SVG markup, so that the same
// source draws the prototype, the review sheets and the exported files (design/tools/phone-kit-
// assets.mjs). Original vector drawing made for this repository by the Visual and Motion Designer
// (Claude Code), in the drawing vocabulary of the board's figures (paths, patterns, clip paths)
// and the kit's palette: ink, paper, navy and gold, and steel for what is neither. No picture
// holds a word: every word is the page's own text. No picture is of a role or a ballot. The only
// pictures of a side are the Hack's three side cards: drawn alike, built into every phone's page
// alike, and shown only in a Hack participant's own private view, for a claim (never a verified side).

export const ART_VERSION = 'phone-kit-art-0.1.0';
export const INK = '#151923';
export const PAPER = '#F4EBDD';
export const PAPER_SHADE = '#E3D6C2';
export const NAVY = '#0A1530';
export const NAVY_MID = '#1B3058';
export const GOLD = '#E9B64E';
export const GOLD_LIGHT = '#F7D886';
export const GOLD_DEEP = '#A7771E';
export const STEEL = '#55657E';
export const STEEL_PALE = '#B9C4D3';

const f = n => Number(n.toFixed(2));
const svg = (viewBox, body, { title = '', fill = false } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${fill ? ' preserveAspectRatio="xMidYMid slice"' : ''} aria-hidden="true" focusable="false">${title ? `<!-- ${title} -->` : ''}${body}</svg>`;
const star = (cx, cy, r, inner = 0.45, points = 5, turn = -90) => {
  const p = [];
  for (let i = 0; i < points * 2; i += 1) {
    const a = ((turn + (i * 180) / points) * Math.PI) / 180, rr = i % 2 ? r * inner : r;
    p.push(`${f(cx + rr * Math.cos(a))} ${f(cy + rr * Math.sin(a))}`);
  }
  return `M${p.join(' L')} Z`;
};
const burstPath = (cx, cy, r1, r2, spikes, turn = 0) => {
  const p = [];
  for (let i = 0; i < spikes * 2; i += 1) {
    const a = ((turn + (i * 180) / spikes) * Math.PI) / 180, r = i % 2 ? r2 : r1;
    p.push(`${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`);
  }
  return `M${p.join(' L')} Z`;
};

/**
 * The result's ground: a burst of rays behind its subject, from the lower middle, over halftone. tone:
 * 'gold' (a Captain, a release), 'steel' (the Jail, a denied release) or 'paper' (a tie, nobody).
 */
export function resultGround(tone = 'gold') {
  const [ray, field] = tone === 'gold' ? [GOLD, GOLD_LIGHT] : tone === 'steel' ? [STEEL, STEEL_PALE] : [PAPER_SHADE, PAPER];
  const rays = [];
  for (let i = 0; i < 18; i += 1) {
    const a0 = (-180 + i * 10) * (Math.PI / 180), a1 = a0 + 5 * (Math.PI / 180);
    rays.push(`M160 170 L${f(160 + 420 * Math.cos(a0))} ${f(170 + 420 * Math.sin(a0))} L${f(160 + 420 * Math.cos(a1))} ${f(170 + 420 * Math.sin(a1))} Z`);
  }
  return svg('0 0 320 180', `<defs><pattern id="pk-ht-${tone}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="1.25" fill="${INK}" opacity="0.18"/></pattern></defs>`
    + `<rect width="320" height="180" fill="${field}"/><path d="${rays.join(' ')}" fill="${ray}" opacity="0.55"/><rect width="320" height="180" fill="url(#pk-ht-${tone})"/>`
    + `<ellipse cx="160" cy="168" rx="92" ry="12" fill="${INK}" opacity="0.18"/>`, { title: `result ground, ${tone}`, fill: true });
}

/** The Captain's star: a gold star on a navy medal with a gold rim (the board's Captain badge, larger). */
export function captainStar() {
  return svg('0 0 64 64', `<circle cx="32" cy="32" r="29" fill="${NAVY}" stroke="${INK}" stroke-width="3"/><circle cx="32" cy="32" r="24.5" fill="none" stroke="${GOLD}" stroke-width="2.5"/>`
    + `<path d="${star(32, 33.5, 17)}" fill="${GOLD}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="${star(32, 33.5, 8, 0.45)}" fill="${GOLD_LIGHT}" opacity="0.7"/>`, { title: 'captain star' });
}

/** A cell's bars in front of its subject: ink bars with a gold glint, a crossbar and its rivets. open: bent apart (a release). */
export function cellBars({ open = false } = {}) {
  const bars = [];
  for (let i = 0; i < 6; i += 1) {
    const x = 18 + i * 25.5;
    if (open && (i === 2 || i === 3)) {
      const dir = i === 2 ? -1 : 1;
      bars.push(`<path d="M${x} 4 C${x} 60 ${x + dir * 22} 70 ${x + dir * 22} 104 C${x + dir * 22} 138 ${x} 148 ${x} 196" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>`
        + `<path d="M${x - 1.5} 8 C${x - 1.5} 60 ${x + dir * 20.5} 70 ${x + dir * 20.5} 104 C${x + dir * 20.5} 138 ${x - 1.5} 148 ${x - 1.5} 192" fill="none" stroke="${GOLD_LIGHT}" stroke-width="2" opacity="0.8"/>`);
    } else {
      bars.push(`<path d="M${x} 4 V196" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M${x - 1.5} 8 V192" stroke="${GOLD_LIGHT}" stroke-width="2" opacity="0.8"/>`);
    }
  }
  const cross = open ? '' : `<rect x="6" y="98" width="148" height="12" rx="3" fill="${NAVY_MID}" stroke="${INK}" stroke-width="3"/>${[22, 58, 102, 138].map(x => `<circle cx="${x}" cy="104" r="2.4" fill="${GOLD}"/>`).join('')}`;
  return svg('0 0 160 200', `${bars.join('')}${cross}`, { title: open ? 'cell bars, bent open' : 'cell bars' });
}

/** A stamp's frame: a ruled rectangle with notched corners, tilted by the page. Its word is the page's. */
export function stampFrame(tone = 'ink') {
  const color = tone === 'gold' ? GOLD_DEEP : INK;
  return svg('0 0 200 64', `<path d="M10 4 H190 L196 10 V54 L190 60 H10 L4 54 V10 Z" fill="none" stroke="${color}" stroke-width="5"/><path d="M15 11 H185 V53 H15 Z" fill="none" stroke="${color}" stroke-width="2"/>`, { title: `stamp frame, ${tone}` });
}

/** A tie: a jagged burst between two subjects, for its word (VS, TIE). */
export function tieBurst() {
  return svg('0 0 100 100', `<path d="${burstPath(50, 50, 48, 30, 12, 8)}" fill="${GOLD}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="${burstPath(50, 50, 36, 24, 12, 8)}" fill="${GOLD_LIGHT}" opacity="0.6"/>`, { title: 'tie burst' });
}

/** Nobody in the Captain's chair: the Command Room's chair, empty, with a question's burst over it. */
export function emptyChair() {
  return svg('0 0 160 180', `<ellipse cx="80" cy="168" rx="56" ry="8" fill="${INK}" opacity="0.22"/>`
    + `<path d="M54 24 Q80 14 106 24 L112 104 H48 Z" fill="${GOLD}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
    + `<path d="M58 34 Q80 27 102 34 L106 96 H54 Z" fill="${GOLD_LIGHT}" opacity="0.55"/>`
    + `<path d="M38 100 H122 L128 122 H32 Z" fill="${GOLD_DEEP}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
    + `<path d="M78 122 V150 M58 162 L80 150 L102 162" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="M78 122 V150" stroke="${STEEL_PALE}" stroke-width="2.5"/>`, { title: 'empty captain chair' });
}

/** Nobody in the cell: the Jail's bench behind its bars, empty. */
export function emptyCell() {
  return svg('0 0 160 180', `<rect x="10" y="14" width="140" height="150" rx="6" fill="${STEEL_PALE}" stroke="${INK}" stroke-width="4"/>`
    + `<rect x="22" y="112" width="116" height="14" rx="3" fill="${STEEL}" stroke="${INK}" stroke-width="3"/><path d="M34 126 V146 M126 126 V146" stroke="${INK}" stroke-width="5"/>`
    + [0, 1, 2, 3, 4].map(i => `<path d="M${30 + i * 25} 14 V164" stroke="${INK}" stroke-width="7"/><path d="M${28.8 + i * 25} 18 V160" stroke="${GOLD_LIGHT}" stroke-width="1.6" opacity="0.7"/>`).join(''), { title: 'empty cell' });
}

/** The pieces the vote result composes, by name, for the exports and the manifest. */
export const RESULT_ART = Object.freeze({
  'vote-ground-gold': () => resultGround('gold'),
  'vote-ground-steel': () => resultGround('steel'),
  'vote-ground-paper': () => resultGround('paper'),
  'vote-captain-star': captainStar,
  'vote-cell-bars': () => cellBars(),
  'vote-cell-bars-open': () => cellBars({ open: true }),
  'vote-stamp-frame': () => stampFrame('ink'),
  'vote-stamp-frame-gold': () => stampFrame('gold'),
  'vote-tie-burst': tieBurst,
  'vote-empty-chair': emptyChair,
  'vote-empty-cell': emptyCell,
});

// ---------- the private Hack (issue #120): a claim, never a verified side ----------

const SIDE_FILL = { Blue: '#70AFFF', Red: '#FF8C8C', Alien: '#C4A4FF' };
/**
 * A side's card: the same card for all three, its side's colour (allowed only in a private view, as the board's
 * tokens say) and its own mark, so that a side is told by shape and word as well as colour: Blue a shield, Red a
 * diamond, Alien an eye. 'none': no side declared, a blank card with an ellipsis. The word is the page's.
 */
export function sideCard(side) {
  const fill = SIDE_FILL[side] ?? PAPER_SHADE;
  const mark = side === 'Blue' ? `<path d="M40 22 L60 30 V48 C60 62 50 70 40 74 C30 70 20 62 20 48 V30 Z" fill="${PAPER}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M40 30 V66" stroke="${INK}" stroke-width="3" opacity="0.5"/>`
    : side === 'Red' ? `<path d="M40 20 L62 48 L40 76 L18 48 Z" fill="${PAPER}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M40 32 L52 48 L40 64 L28 48 Z" fill="${INK}" opacity="0.18"/>`
      : side === 'Alien' ? `<path d="M14 48 Q40 18 66 48 Q40 78 14 48 Z" fill="${PAPER}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><ellipse cx="40" cy="48" rx="9" ry="13" fill="${INK}"/><circle cx="37" cy="43" r="3" fill="${PAPER}"/>`
        : [24, 40, 56].map(x => `<circle cx="${x}" cy="48" r="5.5" fill="${INK}" opacity="0.55"/>`).join('');
  return svg('0 0 80 104', `<rect x="4" y="4" width="72" height="96" rx="10" fill="${fill}" stroke="${INK}" stroke-width="4"/>`
    + `<rect x="10" y="10" width="60" height="84" rx="6" fill="none" stroke="${INK}" stroke-width="1.5" opacity="0.35"/>${mark}`
    + `<path d="M12 86 H68" stroke="${INK}" stroke-width="2" opacity="0.25"/>`, { title: `side card, ${side ?? 'none'}` });
}

/**
 * The tail of the balloon a claim is said in, pointing left to whoever declared. The balloon itself is the page's
 * box (paper, an ink edge, round corners), so it takes any word at any width; the tail covers its edge where it joins.
 */
export function claimTail() {
  return svg('0 0 18 26', `<path d="M17 1.5 L1.5 13 L17 24.5 Z" fill="${PAPER}"/><path d="M17 1.5 L1.5 13 L17 24.5" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`
    + `<path d="M17 3.5 V22.5" stroke="${PAPER}" stroke-width="3"/>`, { title: 'claim balloon tail' });
}

/** Waiting on a declaration: three dots in a balloon (the same for every target). */
export function waitingDots() {
  return svg('0 0 72 40', `<path d="M10 4 H62 Q68 4 68 10 V28 Q68 34 62 34 H22 L10 40 L14 34 H10 Q4 34 4 28 V10 Q4 4 10 4 Z" fill="${PAPER}" stroke="${INK}" stroke-width="3"/>`
    + [22, 36, 50].map((x, i) => `<circle class="pk-dot pk-dot--${i + 1}" cx="${x}" cy="19" r="4.6" fill="${INK}"/>`).join(''), { title: 'waiting dots' });
}

export const HACK_ART = Object.freeze({
  'hack-side-blue': () => sideCard('Blue'),
  'hack-side-red': () => sideCard('Red'),
  'hack-side-alien': () => sideCard('Alien'),
  'hack-side-none': () => sideCard(null),
  'hack-claim-tail': claimTail,
  'hack-waiting-dots': waitingDots,
});
