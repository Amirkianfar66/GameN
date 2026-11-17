// mothership:dev-only
//
// How the kit's comparison reads its two measurements (page.mjs, once in pack.html and once in kit.html) of
// one case: part by part, the same box to within half a pixel, the same computed type, colours, spacing and
// shape, the same ::before and ::after, the same icon drawing and the same words. A difference passes only
// when ACCEPTED names it, with why; everything else is reported.

export const TOLERANCE = 0.5;

/**
 * The differences the kit has on purpose. Each names its cases, its part, the keys it covers (a box side, a
 * style property) and why. A difference it does not cover fails the case.
 */
export const ACCEPTED = Object.freeze([
  { cases: /^field/, part: 'text', keys: ['w', 'cursor', 'overflow-x', 'overflow-y'],
    why: 'The words are typed into a real input, which runs to the count, shows the text cursor and keeps its words inside its box; the pack draws them in a span as wide as the words' },
  { cases: /^field/, part: 'count', keys: ['margin-left'],
    why: 'The count\'s automatic left margin resolves to nothing beside the input that fills the box; the count sits where the pack\'s does, which its box shows' },
  { texts: [200], cases: /^field invalid$/, parts: ['field', 'box', 'text', 'count'], keys: ['h', 'y'],
    why: 'At 200 % text the pack\'s span wraps the long name onto a second line and its box grows; a real input keeps one line and scrolls its words, as a phone\'s own fields do' },
  { sections: ['glass'], cases: /^field/, part: 'count', keys: ['text-shadow'],
    why: 'On glass, the pack\'s reset for the cell\'s vote count (.sheet .count, a dark badge) also takes the halo from the field\'s light count, which its class shares; the kit keeps the halo on light words on glass, as the pack\'s glass rule intends' },
  // Kit 0.5.0: the larger-text rule for rows. The glass cases sit in the shell, whose root is the kit's phone container.
  { texts: [200], sections: ['glass'], cases: /^list$/, partMatch: /^row (2|6)( (title|value|icon))?$/, keys: ['display', 'column-gap', 'row-gap', 'h', '::before bottom', 'w', 'x', 'y', 'margin-right'],
    why: 'At 200 % text in a phone root (the shell\'s, which the glass cases sit in), a row with a value puts the value under its title, the pack\'s own large-text rule for rows (#228): in the pinned pack the title and the value run into each other there. The row is a grid, and its icon keeps its 12 px as a margin' },
  { texts: [200], sections: ['glass'], cases: /^(list|group)$/, partMatch: /^(note|row [3-7]( .+)?)$/, keys: ['y'],
    why: 'What follows a row whose value went under its title moves down by that line' },
  { texts: [200], sections: ['glass'], cases: /^(list|group)$/, part: 'list', keys: ['h'],
    why: 'The list grows by the line its rows\' values took under their titles' },
  // Kit 0.6.1: a row's value may be a node. The Promise rows (sheets 33 and 33.1) give a pill there.
  { texts: [200], sections: ['glass'], cases: /^row pill value$/, partMatch: /^(list|row [1-3]( .+)?)$/, keys: ['display', 'column-gap', 'row-gap', 'h', 'w', 'x', 'y', '::before bottom', 'margin-right'],
    why: 'At 200 % text in a phone root (the shell\'s, which the glass cases sit in), a row puts its value under its title, the kit 0.5.0 rule (#228), now also when the value is a pill, as the Promise rows give it: in the pinned pack the pill keeps its place and squeezes the title onto narrow lines, where a longer title is cut' },
  // Kit 0.7.0: the notice (sheet 42's Scan result holds a row inside it).
  { texts: [200], sections: ['glass'], cases: /^notice extra$/, partMatch: /^(notice|list|row( .+)?)$/, keys: ['display', 'column-gap', 'row-gap', 'h', 'w', 'x', 'y', 'margin-right'],
    why: 'At 200 % text in a phone root (the shell\'s, which the glass cases sit in), the row a notice holds puts its value under its title, the kit 0.5.0 row rule (#228), so the notice centres a narrower list and grows by the line; the pinned pack keeps the value beside the title' },
  // Kit 0.7.0: sheet 25's side cards, the tile with a card's art.
  { cases: /^tiles art$/, partMatch: /^card [23]( .+)?$/, keys: ['cursor', 'text-shadow'],
    why: 'Sheet 25 draws its unavailable sides as disabled buttons, with a button\'s hand cursor and, on glass, no halo; the kit draws every tile that takes no tap as sheet 28 does (kit 0.6.0): no hand cursor, and on glass the halo under its words, so an unavailable tile looks the same on both sheets' },
  // Kit 0.8.0: the toast, the shell's and the entry screens' one part. Its glass cases draw it inside a sheet, as the
  // pack's comparison does; in the game the toast lies over the sheet, never inside it, so the halo there is only the comparison's.
  { cases: /^toast/, part: 'toast words', keys: ['overflow-x', 'overflow-y', 'text-overflow'],
    why: 'The kit cuts a toast\'s words with an ellipsis where they would run past the phone (its max-width, the phone less 16 px a side), as the shell\'s and the entry screens\' toasts did; the pack\'s words run on past the edge. Words that fit are drawn the same' },
  // Kit 0.5.1: the device choice (sheet 12), with its chosen option's icon filled.
  { texts: [200], sections: ['plain'], cases: /^segmented icons$/, partMatch: /^option \d icon$/, keys: ['w'],
    why: 'At 200 % text the pack\'s two long options squeeze their icons below the 18 px they are drawn at (to 12.8 and 11.4 px); the kit\'s icons keep their 18 px, as at 100 %' },
  { texts: [200], sections: ['glass'], cases: /^segmented icons$/, partMatch: /^(control|option \d( icon)?)$/, keys: ['h', 'w', 'x', 'y'],
    why: 'At 200 % in a phone root (the shell\'s, which the glass cases sit in), a stacking segmented control puts one option per row, the kit 0.5.0 rule (#228\'s .seg[data-stack]); the pinned pack keeps the two options side by side, squeezed' },
]);

const accepted = ({ section, text }, caseId, part, key) => ACCEPTED.find(a => (!a.sections || a.sections.includes(section)) && (!a.texts || a.texts.includes(text))
  && a.cases.test(caseId) && (a.partMatch ? a.partMatch.test(part) : (a.parts ?? [a.part]).includes(part)) && a.keys.includes(key));

/** The differences between the pack's and the kit's measurement of one case, on one surface ({ section, text }). */
export function compareCase(where, caseDef, pack, kit) {
  const differences = [], kept = [];
  const note = (part, key, packValue, kitValue) => {
    const entry = { part, key, pack: packValue ?? null, kit: kitValue ?? null };
    const reason = accepted(where, caseDef.id, part, key);
    if (reason) kept.push({ ...entry, why: reason.why }); else differences.push(entry);
  };
  for (const [part, , , options = {}] of caseDef.parts) {
    const a = pack?.[part] ?? null, b = kit?.[part] ?? null;
    if ((a === null) !== (b === null)) { note(part, 'drawn', a !== null, b !== null); continue; }
    if (a === null) continue;
    const sides = options.box === 'none' ? [] : options.box === 'xyh' ? ['x', 'y', 'h'] : ['x', 'y', 'w', 'h'];
    for (const k of sides) if (Math.abs(a.box[k] - b.box[k]) > TOLERANCE) note(part, k, a.box[k], b.box[k]);
    // A placeholder is compared by its colour alone: the pack draws it as a span, the kit as the input's own.
    if (options.placeholder) { if (a.placeholder !== b.placeholder) note(part, 'placeholder colour', a.placeholder, b.placeholder); continue; }
    for (const [key, value] of Object.entries(a.style)) if (b.style[key] !== value) note(part, key, value, b.style[key]);
    for (const key of ['words', 'drawing', 'viewBox']) if (key in a || key in b) if (a[key] !== b[key]) note(part, key, a[key], b[key]);
    for (const pseudo of options.pseudo ?? []) {
      const pa = a[pseudo] ?? {}, pb = b[pseudo] ?? {};
      for (const key of new Set([...Object.keys(pa), ...Object.keys(pb)])) if (pa[key] !== pb[key]) note(part, `${pseudo} ${key}`, pa[key], pb[key]);
    }
  }
  return { ok: differences.length === 0, differences, accepted: kept };
}
