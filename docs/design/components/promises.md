# Promises: Designer's runtime component

**Version:** `promises-0.1.0`. **Status (16 November 2026):** built to the interface the Lead Designer approved on #297, with the Lead's eight answers below, on kit 0.6.1 and the phone shell 0.2.7. Built without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280). It does not activate a native interface: that is Frontend's PR, under the phone merge gate. **Since 18 November** it is on the phone shell 0.2.12 and kit 0.8.2 (#265 at `5616928e`, merged at `fb35f381`), and it looks and reads as before; it belongs to the Designer's Gameplay UI builder, and the game's connection is release 3's step 2 (#310).

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
| **Promises** (`list`) | "Promises", ✕, large | The quota row ("Your quota · Given 0/1 · Received 0/1"). An offer this player made that the other hasn't answered, under "Waiting for Ava" ("Offered to Ava · not counted yet", the "Offered" badge). In a talk, "With Ava · talking now": "Offer a Promise" ("Six kinds · exact terms") and, when Ava has offered one, "Ava offered you one" (its kind). Then "Received" and "Given", each with its result or "No Promise received." / "No Promise given.", and "“Not fulfilled” is a fact about ballots or rooms. It is not proof of lying." |
| **Offer to Ava** (`kinds`) | "Offer to Ava", Back, ✕, large; footer: Next | "Only during your private talk. It counts once Ava accepts." Then the six kinds as the kit's tiles, two across: icon, name and line. The chosen tile is the kit's selected tile (amber), `aria-pressed` |
| **Who will you vote to jail?** (`target`, Jail Vote only) | "Who will you vote to jail?", Back, ✕, large; footer: Next | **An undrawn state of sheet 33, approved by the Lead (answer 4):** a kit row per player Frontend gives (exactly the offer's `promiseTargetSeatIds`), with portrait and "Seat · Name"; the chosen one with the amber check at its end, `aria-pressed` |
| **Check the terms** (`confirm`) | "Check the terms", Back, ✕, large; footer: Back, Offer | The kit's paper card: the kind's icon on ink and its name in capitals, then Frontend's exact terms. Then the kit's facts: "Uses your one given Promise only if Ava accepts" and, with the lock, "Only you and Ava see it" |
| **Offer from Ava** (`incoming`) | "Offer from Ava", ✕, large; footer: Decline, Accept | The paper card with Ava's portrait, the kind and Frontend's exact terms. Then the facts: Frontend's condition line when given, "Accepting uses your one received Promise", "A Promise is never forced: it is checked against real ballots" |

**A result** (sheet 33.1) is a row in "Received" or "Given":
- the other player's portrait;
- the kind;
- "From Ava · next Captain election" or "To Ava · Round 3 voting" (Frontend's `when`);
- its status as a badge: Pending, Fulfilled (amber, with the check), Not fulfilled, or Condition not met;
- under the row, Frontend's `why`, only when given.

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
- **The sheet's frame:** its title, Back, ✕, glass and footer are the shell's. The module gives Frontend each view's frame and footer (`promisesSheet`), so the words stay in Designer's source.
- **The facts and the rules' words:** whether an offer can be made now and to whom, which players can be named, the quota, each Promise, its status, its exact terms, its condition, when and why are Frontend's, from the projection. The component never works one out, and never composes, trims or reorders those words.

## The Lead's answers (#297)

1. **The kit (0.6.0, then 0.6.1):** the tile, "who" and the facts moved from the Gameplay builder's play-parts into the kit, with the same props and states, and the kit added the pack's paper card (`kit.comic()`). Promises is built on those, with no local copies. In 0.6.1 a row's `value` takes a node, so a result's badge sits in the row's value as the pack's `promiseRow` puts it, and the kit's larger-text rule moves it under the title (found by this build's probe; the Lead's kit change, not a copy of the rule here).
2. **The split:** the body is the component's; the frame and footer are the shell's, through `promisesSheet(input)`; the view and the draft are Frontend's. Next and the footer's Back are this phone's own (`local`). Offer, Accept and Decline are commands: busy and refused in the footer, as Host controls' Abort match.
3. **Words:**
   - The component holds the fixed words: the kinds' names and lines, the headings, the quota, and the facts' wording.
   - Frontend gives what states a rule for one Promise: the exact terms, the condition line, `when` and `why`. The component draws them as given and never composes, trims or reorders them.
   - The contract's details stay ("including runoffs", "after Sync", "admission is not required"): a Promise's exact terms are what the two players agree to.
   - Names in place of player numbers in the terms are a projection question, raised by the Lead on #222. Until then the component draws what's given.
4. **Jail Vote's player:** approved as an undrawn state of sheet 33, not a departure. The contract needs a named player, and sheet 33's example already names one, so the sheet implies the choice without drawing it. "Who will you vote to jail?", the kit's rows with portraits, the chosen one amber, then Next. The rows are exactly the projection's `promiseTargetSeatIds`: never more, never worked out. Its captures are the check's `target` state.
5. **The lists:** as 33.1. In a talk, the talk's group first, then Received or Given only for an accepted Promise. Outside a talk, Received and Given always, with "No Promise received." and "No Promise given.". A declined or expired offer leaves the list; the toast's words are Frontend's.
6. **Privacy:** a given or received Promise that doesn't name the viewer as its giver or recipient is refused. The Promises, the draft, the talk and Jail Vote's players leave the DOM on a viewer change (unless the same update gives the new viewer's) and when concealed. Each is a probe check.
7. **Why:** drawn only when given. The Lead raises the missing field on #222, with the names in the terms.
8. **Reconnecting:** viewing and choosing are local (the list's rows, the tiles, the players, Next and Back). Offer, Decline and Accept wait with the banner's words.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/promises/`:

| Path | What |
| --- | --- |
| `promises.mjs` | `mountPromises()`, `promisesSheet()`, `nextPromisesInput()`, `PROMISES_DEFAULTS`, `PROMISES_VERSION`, `PROMISES_SHEET_ID`, `PROMISE_WORDS`, `PROMISE_KINDS` (the six kinds' icons, names and lines, by the contract's names), `PROMISE_STATUSES` |
| `promises.css` | Every style, under `.ms-promises`; starts with the kit's stylesheet. Its own: what sheet 33 sets inline on this screen (the kinds two across at 118 px, the 10 px before them, the paper card's 14 px, its head and its terms), and Jail Vote's chosen player's mark |
| `preview/` | Development only: the preview (the body in the phone shell's sheet over Room A, with Promises open in the top bar, as sheets 33 and 33.1 draw it), `probe.mjs`, and `agree.mjs` (beside the frozen pack's `promises` in each of its states) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/promises-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/promises.test.mjs`.

**Uses unchanged:**
- **The kit (0.6.1):** `list`, `row` (the icon tile, the portrait as the lead, the chevron, the value: words, or the badge as a node, 0.6.1), `pill` (the badges), `portrait`, `groupLabel` and `groupNote`, `tile` and `tiles` (the kinds), `facts` (with the lock), `comic` (the paper card), and the control policy.
- **The phone shell (0.2.7):** its sheet, with footer actions (`local` for Next and Back) and its toast, opened by Frontend; the component does not import the shell.

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

- **One sheet id (`promises`) for every view,** so the shell keeps its body as the view changes. The view is Frontend's, from the taps, Back and the projection: for example, once Ava answers, the offer leaves "Waiting for Ava".
- **On update,** each row, tile and player keeps its element and the focus. A row that leaves while it has the focus, or a view that ends, returns the focus once (`onFocusReturn`).

## Inputs

| Input | Audience | What |
| --- | --- | --- |
| `view` | This phone | `list`, `kinds`, `target`, `confirm` or `incoming`: Frontend's |
| `status`, `interactive`, `viewer`, `versions` | This phone | `live`, `stale` or `concealed`, as the shell's; `viewer` is this phone's seat; `versions` for the portraits |
| `quota` | The player's | `{ given, received }`: whether this player has given and has received their one Promise (the projection's `promiseQuota`) |
| `talk` | The pair | `null`, or the partner while they talk: `{ seat, name, character }` |
| `offer` | The player's | `null` (no row), or `{ enabled, reason, busy }`: whether a Promise can be offered now (the projection's `OFFER_PROMISE` offer) |
| `draft` | This phone | The offer being made: `{ kind, target, terms }`. `kind` is one of the six or `null`; `target` is one of `targets` (Jail Vote only); `terms` is Frontend's exact terms, for `confirm` |
| `targets` | The player's | Jail Vote's players: `[{ seat, name, character }]`, exactly the offer's `promiseTargetSeatIds` |
| `given`, `received` | The pair | `null`, or this player's Promise: `{ id, kind, giver, recipient, state, status, terms, when, why, condition }`. `giver` and `recipient` are `{ seat, name, character }`; a given Promise's giver, and a received one's recipient, must be the viewer, or it is refused. `state` is `offered` or `accepted`; `status` is the projection's (`Pending`, `Fulfilled`, `Not fulfilled`, `Condition not met`). `terms`, `when`, `why` and `condition` are Frontend's words, drawn as given |
| `answer` | The player's | `{ accept: { enabled, reason, busy }, decline: { enabled, reason, busy } }`, for `incoming` |

## Callbacks

| Callback | When |
| --- | --- |
| `onOffer()` | "Offer a Promise": Frontend shows `kinds` |
| `onIncoming()` | "Ava offered you one": Frontend shows `incoming` |
| `onKind(kind)` | A kind's tile: Frontend sets `draft.kind` |
| `onTarget(seat)` | A player, for Jail Vote: Frontend sets `draft.target` |
| The shell's `onSheetAction(id)` | `next` (from `kinds`: `confirm`, or `target` for Jail Vote; from `target`: `confirm`), `back` (the terms' Back), `offer` (Frontend sends `OFFER_PROMISE`), `decline` and `accept` (Frontend sends `DECLINE_PROMISE` or `ACCEPT_PROMISE`) |
| `onFocusReturn({ intent, value })` | As the other components' |

Each callback reports a tap, and only that. The shell's Back and ✕ are Frontend's, as for every sheet.

## Drawn

| Part | Drawn |
| --- | --- |
| Quota | A row, not a button: the promise icon on amber, "Your quota", and at its end "Given 0/1 · Received 1/1" |
| The talk | "With Ava · talking now", then "Offer a Promise" (the plus icon on paper, "Six kinds · exact terms", the chevron; dimmed and refused with Frontend's reason when the offer isn't offered) and "Ava offered you one" (the inbox icon on amber, its kind, the chevron) |
| Waiting | "Waiting for Ava", then a row: Ava's portrait, the kind, "Offered to Ava · not counted yet", and the "Offered" badge |
| Received, Given | The group label, then the result row and its why, or "No Promise received." / "No Promise given."; then the note |
| The six kinds | The kit's tiles, two across, each at least 118 px tall: **Captain Support**, **Officer Selection**, **Jail Vote**, **No Jail Vote**, **Meet in Room A**, **Meet in Room B**, each with its icon on paper and its line |
| The paper card | The kit's paper card, 14 px in: the kind's icon on a 42 px ink tile (or the giver's portrait, at the kit's 44 px, as sheet 33 draws it: the pack asks pt() for 42, and its `.pt` rule's 44 px wins), the name in capitals, and the exact terms |
| The facts | The kit's facts: a line each, with the amber "i", or the lock |
| A command | **In flight:** Offer, Accept or Decline busy in the footer. **Refused:** dimmed, with Frontend's reason as its description. Receipts in the shell's toast, in Frontend's words |
| Larger text | The rows', tiles' and card's words wrap; at the Largest text the sheet scrolls |

**Motion:** none of its own. The chosen tile's amber is the kit's selected state, at once. The sheet's arrival and the toast are the shell's.

## Frontend's connection

1. Open the shell's sheet with `promisesSheet(input)` from the top bar's Promises and from the talk's "Promises", and mount `mountPromises` in `shell.sheetBody`. Dispose it when the sheet closes.
2. Give `quota`, `talk`, `offer`, `targets`, `given`, `received` and `answer` from the projection. Map today's `promises[]` to this player's `given` and `received` (giver and recipient with their names and characters), leaving out declined and expired offers. Give each Promise's exact terms, condition, `when` and `why` in Frontend's words, from the contract (today's `planetPromiseTerms`).
3. Route the taps: set `view` and `draft` as the player chooses (Jail Vote goes through `target`). Send `OFFER_PROMISE { recipientSeatId, kind, targetSeatId }`, `ACCEPT_PROMISE` or `DECLINE_PROMISE { promiseId }`, and show each receipt in the shell's toast.
4. Today's Promises sheet and its partner step leave the screen.

## Against the pack

The agreement draws the frozen pack's `promises` screen beside the sheet in each of its states (the list in a talk, Dev's offer waiting, the six kinds, the terms and the incoming offer at both sizes; the four results; the incoming offer at the Largest text) and compares, to within half a pixel: the sheet, its title, body, footer and buttons; the group labels and notes; the lists, rows, icon tiles and drawings, portraits (by file), titles, lines, values and chevrons; the badges and their icons; the tiles, their icons, drawings, names and lines; the paper card, its icon and drawing, its portrait, its name and terms; and the facts, their lines and icons. It compares their boxes, words, looks and states. A result's badge sits in the row's value, in the pack as in the kit (0.6.1), so at the Larger text the kit's row rule puts it under the title.

Not compared: the room, the top bar and the tabs (their own components'), and what the pack does not draw: Jail Vote's player, a command in flight or refused, and reconnecting (the probe and the captures').

## Check

`node design/tools/promises-check.mjs` bundles the preview with Vite and serves it with the production headers. It captures 13 states at 390 × 844 and 430 × 932, each with Promises open in the top bar: the list in a talk, Dev's offer waiting, the six kinds, Jail Vote's player, the terms, the offer in flight, the incoming offer, the four results, reconnecting, and the incoming offer at the Largest text. Then it runs the probe (as the page comes and with the device's Reduce motion) and the agreement.

**Recorded against `fb35f381` (clean, with the shell 0.2.12, kit 0.8.2 and room scene 0.5.1, #265 at `5616928e`):** 26 of 26 captures, the probe 20 of 20 checks (19 as the page comes, the motion check with the device's Reduce motion), and the agreement 14 of 14, with no unexpected policy report and no page problem. The headers' SHA-256 is `424e5dec…`. The record is `review/check.json`.
- **Against the record on `faa78ea9`** (kit 0.6.1, shell 0.2.7): every recorded field of the 26 captures, the probe's 20 checks and the agreement's 14 is the same, but for the bundle's file name in the known Zod report. 4 captures are byte for byte the same, and 19 differ only below the noise of the pictures' compression. The other 3 differ in two places outside the sheet: the busy Offer button's spinner, at another frame (`offering`, both sizes), and the room behind the sheet's glass, where a crew member's name tag sits as room scene 0.5.1 places it (`430x932-largest`). The sheet itself is unchanged.
