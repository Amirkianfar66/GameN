# Promises: Designer's runtime component

**Version:** `promises-0.1.0`. **Status (16 November 2026):** the interface, proposed for the Lead Designer's review. Nothing is built. The build starts when the Lead approves it, without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280).

**What it is:** this player's Promises, as sheets 33 and 33.1 draw them. It covers #222 item 19 (P2) and the Promise half of item 32 (P3):
- **Item 19:**
  - "Offer goes straight to 'Offer to Ava' and the six kinds."
  - "An incoming offer is a card with its exact terms, then Decline and Accept."
  - "The results show names and portraits."
- **Item 32:** "names and portraits instead of player numbers".

It is global UI: it opens from the top bar's Promises button and from the private talk's own "Promises" (sheets 25, 27.6). The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Audience: the pair.** A Promise is seen only by its giver and its recipient, on their own phones. It never reaches the shared display.

**Covers:**

| View | Sheet (the shell's frame) | Body (this component) |
| --- | --- | --- |
| **Promises** (`list`) | "Promises", ✕, large | The quota row ("Your quota · Given 0/1 · Received 0/1"). Then, during a talk, "With Ava · talking now": "Offer a Promise" ("Six kinds · exact terms") and "Ava offered you one" (its kind). Then "Received" and "Given", each with its Promise or "No Promise received." / "No Promise given.", and the note. A Promise this player offered and Ava hasn't answered shows under "Waiting for Ava" |
| **Offer to Ava** (`kinds`) | "Offer to Ava", Back, ✕, large; footer: Next | "Only during your private talk. It counts once Ava accepts." Then the six kinds as tiles, two across: icon, name and line. The chosen kind is amber |
| **Who?** (`target`, Jail Vote only) | Not drawn by the pack (question 4) | A row per player who can be named, with their portrait and name |
| **Check the terms** (`confirm`) | "Check the terms", Back, ✕, large; footer: Back, Offer | The paper card: the kind's icon and name, and the exact terms ("Dev will be in Room A when Round 3's voting begins."). Then "Uses your one given Promise only if Ava accepts" and "Only you and Ava see it" |
| **Offer from Ava** (`incoming`) | "Offer from Ava", ✕, large; footer: Decline, Accept | The paper card with Ava's portrait, the kind and the exact terms. Then the facts: the kind's condition when Frontend gives one, "Accepting uses your one received Promise", "A Promise is never forced: it is checked against real ballots" |

**A result** (sheet 33.1) is a row in "Received" or "Given":
- the other player's portrait;
- the kind;
- "From Ava · next Captain election" or "To Ava · Round 3 voting";
- its status as a badge: Pending, Fulfilled (amber, with the check), Not fulfilled, or Condition not met;
- under the row, why, when Frontend gives it ("Dev was in Room A when Round 3's voting began.").

**What changes from today:**
- **Today:**
  - "Offer a Promise" first asks for the talk's partner, who is already known.
  - An incoming offer is a line of counts and Accept / Decline rows.
  - Results are cards that name "Player 1".
- **Drawn:**
  - The offer goes straight to "Offer to Ava" and the six kinds.
  - An incoming offer is the paper card with its exact terms, then Decline and Accept.
  - Results show names and portraits.

**Comparison parts:** `promise-offer`, `promise-incoming` and `promise-results` (sheets 33 and 33.1) in `design/tools/lib/phone-ui-native-parts.mjs`. They apply when Frontend's PR mounts this component; until then, the component's own captures are its evidence.

**Not in it:**
- **The buttons that open it:** the top bar's Promises (with its count) and the private talk's "Promises" are the phone shell's (#265).
- **The sheet's frame:** its title, Back, ✕, glass and footer are the shell's. As with Host controls (#295), the module gives Frontend each view's frame and footer (`promisesSheet`), so the words stay in Designer's source.
- **The facts:** these are Frontend's, from the projection:
  - whether an offer can be made now, and to whom;
  - which players can be named;
  - the quota;
  - each Promise and its status;
  - why a result came out as it did.

  The component never works one out from the rules.

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/promises/`:

| Path | What |
| --- | --- |
| `promises.mjs` | `mountPromises()`, `promisesSheet()`, `nextPromisesInput()`, `PROMISES_DEFAULTS`, `PROMISES_VERSION`, `PROMISES_SHEET_ID`, `PROMISE_WORDS`, `PROMISE_KINDS` (the six kinds' icons, names and lines) |
| `promises.css` | Every style, under `.ms-promises`; starts with the kit's stylesheet |
| `preview/` | Development only: the preview (the body in the phone shell's sheet over Room A, with the talk's bar where drawn), `probe.mjs`, and `agree.mjs` (beside the frozen pack's `promises`: `list`, `kinds`, `confirm`, `incoming`, and `results` with each case) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/promises-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/promises.test.mjs`.

**Uses:**
- **The kit (0.5.1):**
  - `list`, `row` (the icon tile, the portrait as the lead, the chevron, the value);
  - `pill` (the status badges);
  - `portrait`;
  - `groupLabel` and `groupNote`;
  - the control policy.
- **Three parts the kit doesn't have yet** (question 1):
  - the kind **tile** (sheet 33, the same tile as sheet 28's actions);
  - the **paper card** (the pack's `.comic`);
  - the **facts** list (an icon and a line each).
- **The phone shell (0.2.6):** its sheet, with footer actions (`local` for Next and Back) and its toast, opened by Frontend; the component does not import the shell.

## Mount, update and dispose

```js
import { mountPromises, promisesSheet } from '…/design/phone-ui/components/promises/promises.mjs';
import '…/design/phone-ui/components/promises/promises.css';

shell.update({ sheet: promisesSheet(input) });          // the frame and footer for the view
const promises = mountPromises(shell.sheetBody, input, handlers);
promises.update({ ...changes });                        // each key given replaces that key; the rest stay
shell.update({ sheet: promisesSheet(nextInput) });      // as the view, the choice or a command's state change
promises.dispose();                                     // safe twice; afterwards nothing fires
```

- **One sheet id (`promises`) for every view,** so the shell keeps its body as the view changes. The view is Frontend's, from the taps, Back and the projection. For example, once Ava answers, the offer leaves "Waiting for Ava".
- **On update,** each row and tile keeps its element and the focus. A row that leaves while it has the focus returns the focus once (`onFocusReturn`).

## Inputs

| Input | Audience | What |
| --- | --- | --- |
| `view` | This phone | `list`, `kinds`, `target`, `confirm` or `incoming`: Frontend's |
| `status`, `interactive`, `viewer`, `versions` | This phone | `live`, `stale` or `concealed`, as the shell's; `versions` for the portraits |
| `quota` | The player's | `{ given, received }`: whether this player has given and has received their one Promise (the projection's `promiseQuota`) |
| `talk` | The pair | `null`, or the partner while they talk: `{ seat, name, character }` |
| `offer` | The player's | `null` (no row), or `{ enabled, reason, busy }`: whether a Promise can be offered now (the projection's `OFFER_PROMISE` offer) |
| `draft` | This phone | The offer being made: `{ kind, target, terms }`. `kind` is one of the six or `null`; `target` is a seat (Jail Vote only); `terms` is the exact terms, for `confirm` (question 3) |
| `targets` | The player's | Jail Vote's choices: `[{ seat, name, character }]` (the offer's `promiseTargetSeatIds`) |
| `given`, `received` | The pair | `null`, or this player's Promise: `{ id, kind, other: { seat, name, character }, state, status, terms, when, why, condition }`. `state` is `offered` or `accepted`; `status` is the projection's (`Pending`, `Fulfilled`, `Not fulfilled`, `Condition not met`). Each must name the viewer as its giver or recipient, or it is refused (question 6) |
| `answer` | The player's | `{ accept: { enabled, reason, busy }, decline: { enabled, reason, busy } }`, for `incoming` |

## Callbacks

| Callback | When |
| --- | --- |
| `onOffer()` | "Offer a Promise": Frontend shows `kinds` |
| `onIncoming()` | "Ava offered you one": Frontend shows `incoming` |
| `onKind(kind)` | A kind's tile: Frontend sets `draft.kind` |
| `onTarget(seat)` | A player, for Jail Vote: Frontend sets `draft.target` |
| The shell's `onSheetAction(id)` | `next` (from `kinds`: `confirm`, or `target` for Jail Vote), `back` (the footer's Back), `offer` (Frontend sends `OFFER_PROMISE`), `decline` and `accept` (Frontend sends `DECLINE_PROMISE` or `ACCEPT_PROMISE`) |
| `onFocusReturn({ intent, value })` | As the other components' |

Each callback reports a tap, and only that. The shell's Back and ✕ are Frontend's, as for every sheet.

## Drawn

| Part | Drawn |
| --- | --- |
| Quota | A row, not a button: the promise icon on amber, "Your quota", and at its end "Given 0/1 · Received 1/1" |
| The talk | "With Ava · talking now", then "Offer a Promise" (the plus icon on paper, "Six kinds · exact terms", the chevron) and, when Ava has offered one, "Ava offered you one" (the inbox icon on amber, its kind, the chevron) |
| Waiting | "Waiting for Ava", then a row: Ava's portrait, the kind, "Offered to Ava · not counted yet", and the "Offered" badge |
| Received, Given | The group label, then the result row and its why, or "No Promise received." / "No Promise given."; then "“Not fulfilled” is a fact about ballots or rooms. It is not proof of lying." |
| The six kinds | Tiles, two across. Each tile has an icon on paper, the name and the line: **Captain Support** ("Next election: every ballot in which they are a candidate"), **Officer Selection**, **Jail Vote**, **No Jail Vote**, **Meet in Room A**, **Meet in Room B**. The chosen tile is amber (`aria-pressed`) |
| The paper card | Ink on paper with an ink border: the kind's icon on ink (or the giver's 42 px portrait, for an incoming offer), the name in capitals, and the exact terms |
| The facts | A line each, with the info or lock icon in amber |
| A command | **In flight:** Offer, Accept or Decline is busy in the footer. **Refused:** dimmed, with Frontend's reason as its description. Receipts go in the shell's toast, in Frontend's words |
| Larger text | The rows' and tiles' words wrap. At the Largest text the tiles go one across and the sheet scrolls |

**Motion:** the chosen tile's amber comes in at once. The sheet's arrival and the toast are the shell's.

## Frontend's connection

1. Open the shell's sheet with `promisesSheet(input)` from the top bar's Promises and from the talk's "Promises", and mount `mountPromises` in `shell.sheetBody`. Dispose it when the sheet closes.
2. Give `quota`, `talk`, `offer`, `targets`, `given`, `received` and `answer` from the projection. Map today's `promises[]` to this player's `given` and `received`, leaving out declined and expired offers (question 5).
3. Route the taps: set `view` and `draft` as the player chooses. Send `OFFER_PROMISE { recipientSeatId, kind, targetSeatId }`, `ACCEPT_PROMISE` or `DECLINE_PROMISE { promiseId }`, and show each receipt in the shell's toast.
4. Today's Promises sheet and its partner step leave the screen.

## Questions for the Lead

1. **The tile, the paper card and the facts list:**
   - Sheet 33 uses three parts the kit doesn't have: the kind tile (sheet 28's action tile, which the Gameplay builder needs too), the paper card (`.comic`), and the facts list.
   - Should they go into the kit (yours to add) so both of us use them?
   - Or should Promises draw its own, scoped under `.ms-promises`, until the kit has them?
2. **The split:** as Host controls, the body is the component's; the frame and footer are the shell's, through `promisesSheet(input)`; the view and the draft are Frontend's. Next and the footer's Back are local; Offer, Accept and Decline are commands. Is that the split you want?
3. **Whose words:**
   - I propose the component holds the fixed words: the kinds' names and lines, the headings, the quota, and the facts about the quota, privacy and checking.
   - I propose Frontend gives the words that restate a rule for one Promise: the exact terms, the condition line, `when` and `why`.
   - Today's terms (`planetPromiseTerms`) use player numbers and carry details the pack's sentences leave out: "including runoffs", "after Sync", "admission is not required".
   - Or should the component compose the terms from the kind, the names and the round, in the pack's sentences? If so, should those details stay?
4. **Jail Vote's player:**
   - `OFFER_PROMISE` needs a named player for Jail Vote (`promiseTargetSeatIds`), and the pack draws no step for it.
   - I propose a `target` view between the kinds and the terms: "Who will you vote to jail?", a row per player with portrait and name, the chosen one amber, then Next.
   - This adds a state to sheet 33, so it needs your agreement, and the owner's if you count it as a departure.
5. **The lists:**
   - During a talk, the list shows the talk's group first, then Received and Given only for accepted Promises (sheet 33's list has neither).
   - Outside a talk, it shows Received and Given always, with "No Promise received." and "No Promise given." (sheet 33.1).
   - A declined or expired offer leaves the list, and Frontend says so in the toast ("Ava declined").
6. **Privacy:**
   - `given` and `received` must name the viewer as giver or recipient, or they are refused. This is the contract's own pair rule, kept on the phone.
   - Everything leaves the DOM when the viewer changes or the sheet is concealed.
   - It never mounts on the shared display.
7. **Why:** the projection carries a Promise's status but not why ("Dev was in Room A when Round 3's voting began."). I draw why only when Frontend gives it, and nothing otherwise, as T3 does for reasons. Should I raise the missing field on #222 through you?
8. **Reconnecting:**
   - Viewing and choosing are local (the list, the tiles, Next, Back).
   - Offer, Accept and Decline wait, with the banner's words, as Host controls' commands do.
   - `interactive: false` refuses everything, and concealed draws no sheet.

## Not in this version

Everything: this is the interface. Next, once the Lead approves it:
- the module and its styles;
- the preview's states:
  - the list in a talk, with an offer waiting;
  - the kinds;
  - Jail Vote's player, if approved;
  - the terms;
  - the incoming offer;
  - the four results;
  - a command in flight and refused;
  - reconnecting;
  - the Largest text;
- the probe;
- the check at 390 × 844 and 430 × 932 under the production headers;
- the agreement with the pack;
- the test;
- the owner's test page.
