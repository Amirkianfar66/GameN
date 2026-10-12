// mothership:dev-only
//
// Slice 6 of the ability art, its private part: the showdown's special shot. In the Final Zone every
// player still in the match holds one special shot (final-showdown-decision, option 1) and registers one
// target in secret. Private like every file: drawn only inside the seat's own action strip, never on the
// board, the shared display or a host view. Every player phone loads the whole kit, whatever its role,
// and nothing in it is named after or coloured for a role or a team.
//
// What it shows, and what it must never show:
// - The showdown strip. The target's chip in the same reticle as an ordinary shot, beside the question;
//   at the start of the detail line the special shot, full while the server offers it, spent on the
//   receipt: it is used when the server accepts it, with no refund and no redirect (V1-20). The receipt
//   is not a result: every target stays secret until the shots resolve, one at a time, as the public
//   health changes of the board (the same for every cause, from no direction). The view carries no
//   lasting "spent" (the offer simply ends), so nothing outside the receipt draws it.
//
// The match's end, its public part, is the board-motion prototype's result sheet (design/board-motion/).

import { el } from './dossier.js';

/** The special shot at the start of the showdown strip: full while offered, spent on its receipt. */
export function specialShot({ spent = false } = {}) {
  return el('span', { class: 'ab-special', 'data-spent': String(spent), 'aria-hidden': 'true' });
}
