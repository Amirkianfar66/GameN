// mothership:dev-only
//
// Where kit 0.9.0 departs from the pinned pack on purpose, for the parts' own comparisons with the pack (actions,
// panels, promises: preview/agree.mjs). The owner, 19 November 2026: "I like painted icons but I dont want them to
// have any  background"; "I want all size of Icons on these panels to be the same follow the size of action panel 3
// column matrix"; "Still they  have a background"; then, on draft 3, "No background now, go ahead".
//
// A difference passes only when it is one of these, by its part, what differs and, for a box, by how much; every
// other difference still fails its case. What the kit draws there instead is held by the kit's own tests and record.

const sameTo = (a, b) => Math.abs(a - b) <= 0.5;
const isBox = v => v && typeof v === 'object' && 'x' in v && 'w' in v;
/** A box that only moved up or down, or grew or shrank in height: what follows a shorter head does that. */
const movedVertically = (a, b) => isBox(a) && isBox(b) && sameTo(a.x, b.x) && sameTo(a.w, b.w);
/** A row's words, 6 px further right and 6 px narrower, on the same line. */
const sixRight = (a, b) => isBox(a) && isBox(b) && sameTo(b.x - a.x, 6) && sameTo(a.w - b.w, 6) && sameTo(a.y, b.y) && sameTo(a.h, b.h);

const RULES = [
  { part: /^tile \d+$/, what: ['background-color', 'box-shadow', 'look'], why: 'An Actions cell has no frame: its icon and words stand on the sheet' },
  { part: /^tile \d+ icon$|^tile icons \d+$/, what: ['background-color', 'border-radius', 'box-shadow', 'look'], why: 'The icon has no tile behind it' },
  { part: /^tile icon drawings \d+$|^row icon drawings \d+$/, what: ['box', 'drawing'], why: 'The icon is the painted line drawing, at the one panel size (46 px)' },
  { part: /^tile names \d+$/, what: ['look'], why: 'With no frame, a chosen cell says so in its name', when: (a, b) => a && b && a.fontSize === b.fontSize && a.fontWeight === b.fontWeight },
  { part: /^row icons \d+$/, what: ['box', 'look'], why: 'A row\'s icon is 46 px with no chip behind it' },
  { part: /^row (mains|titles|lines) \d+$/, what: ['box'], why: 'Beside the 46 px icon a row\'s words start 6 px further right; the row keeps its height', when: sixRight },
  { part: /^who icon$/, what: ['box', 'background-color', 'border-radius'], why: 'The head\'s icon is the painted line drawing at 46 px with nothing behind it, where the pack has a 64 px tile' },
  { part: /^who (title|sub)$/, what: ['box'], why: 'The head\'s words sit beside a 46 px icon', when: (a, b) => isBox(a) && isBox(b) && sameTo(a.w, b.w) && sameTo(a.h, b.h) },
  { part: /^(who|sheet|sheet body|footer \d+|fact \d+)$/, what: ['box'], why: 'The head is as tall as its 46 px icon, so what follows it sits higher and the sheet is shorter', when: movedVertically },
  { part: /^footer buttons \d+$/, what: ['look'], why: 'The dark button carries a light edge that stands 3 : 1 from the glass, over a darker fill', when: (a, b) => a && b && a.color === b.color && a.fontSize === b.fontSize && a.fontWeight === b.fontWeight && a.borderRadius === b.borderRadius },
];

/** Why this difference is the owner's 0.9.0 look, or null. */
export const lookOf090 = ({ part, what, pack, component, screen }) => {
  const mine = component ?? screen ?? null;
  const rule = RULES.find(r => r.part.test(part) && r.what.includes(what) && (!r.when || r.when(pack, mine)));
  return rule ? rule.why : null;
};
/** Splits a case's differences into the ones that still fail it and the ones that are the 0.9.0 look, counted by reason. */
export const splitLook090 = differences => {
  const kept = [], look = {};
  for (const d of differences) { const why = lookOf090(d); if (why) look[why] = (look[why] ?? 0) + 1; else kept.push(d); }
  return { kept, look };
};
