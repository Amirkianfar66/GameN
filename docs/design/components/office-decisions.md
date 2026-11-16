# Office decisions: Designer's runtime component

**Version:** `office-decisions-0.1.0`. **Status (16 November 2026):** built to the interface the Lead Designer approved with the answers below (#300), without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280). Its check's record is at the end.

**What it is:** the Captain's and the Officer's own decisions, which open by themselves, as sheets 40 and 41 draw them. It covers #222 item 17 (P2):
- "Choose your Officer" for its 30 s and "Block movement" for its 15 s, as portraits with reasons, with Skip and Block.
- The Navigation tie is shown to the offices directly.

The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**When it opens:** by itself, at its phase; the moment it opens and closes is Frontend's, from the phase. The component draws what it is given. The sheets have no ✕ (the pack's `close: false`): each lasts its phase.

**Covers:**

| View | Audience | Sheet (the shell's frame) | Body (this component) |
| --- | --- | --- | --- |
| **Choose your Officer** (`appoint`) | The Captain's phone | "Choose your Officer", large, no ✕; footer: "Appoint Cleo" | The 3 × 3 of every seat (the kit's `grid9` and cells): the ones Frontend says can be chosen are available, the chosen one is selected; the others are dimmed, each with Frontend's note ("In Hospital", "Injured", "In Jail", "Out"). The Captain's own cell says "You" and "You are Captain" |
| **Officer appointment** (`appointing`) | Everyone else | "Officer appointment", large, no ✕ | The kit's waiting block with the Captain's portrait (44 px, as drawn): "Ben is choosing an Officer", "Chosen at random if time runs out" |
| **Block movement** (`block`) | The Officer's phone | "Block movement", "Optional · once a round", large, no ✕; footer: Skip, "Block Gus" | The 3 × 3: the ones that can be blocked are available, the chosen one is selected, the others dimmed with Frontend's note ("Blocked last round", "Out") |
| **Blocked** (`blocked`) | The Officer's phone | As above, no footer | The notice: the amber "BLOCKED" stamp, "Gus can't move this round", "Everyone sees the block" |
| **Navigation** (`navigation`) | The offices' phones only | "Navigation", "Only the Captain and Officer see this", large, no ✕ | The route map (the ship's place on the Blue and Red arms). Then by its state: **Captain · route:** "Position B1", "Next move · Being set". **Officer · genuine tie:** "Genuine tie · the Officer chooses" on the map, "A genuine tie. Choose the direction; no choice means a random draw.", and Blue and Red. **Acknowledge · no veto:** the next step dashed on the map, "Next move · Blue · to B2" (amber), "Acknowledge · You can't change or veto it", and the footer's Acknowledge |

**What changes from today:**
- **Today:** the choices are rows inside Actions, or in Panels, then Navigation, then "Choose tie direction".
- **Drawn:**
  - the office decisions open by themselves, as portraits with reasons, with Skip and Block;
  - the Navigation tie is shown to the offices directly.

**Comparison parts:** the Officer's and Navigation parts of sheets 40 and 41 in `design/tools/lib/phone-ui-native-parts.mjs` (`tie` among them). They apply when Frontend's PR mounts this component; until then, the component's own captures are its evidence.

**Not in it:**
- **The Captain console's Release and Eject** (sheet 40's console, in Actions): the Gameplay builder's, with their labels.
- **Navigation for everyone** (sheet 41's "Setting course" and "The ship moved", item 18): the ship travel film, the Gameplay builder's (#269). Decision 1.
- **The room's blocked figure** that everyone sees: the room scene's.
- **The top bar's phase** ("Appoint Officer · Random if time runs out", "Block a move", "Setting course"): the shell's, in Frontend's words.
- **The facts:** who can be appointed or blocked (the offers' `targetSeatIds`), the route position, the direction, the tie and the confirmation (the projection's `privateNavigation`), and the moment each sheet opens and closes are Frontend's. The component never works one out.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/office-decisions/`:

| Path | What |
| --- | --- |
| `office-decisions.mjs` | `mountOfficeDecisions()`, `officeDecisionsSheet()`, `nextOfficeDecisionsInput()`, `OFFICE_DECISIONS_DEFAULTS`, `OFFICE_DECISIONS_VERSION`, `OFFICE_SHEET_ID`, `OFFICE_WORDS`, `ROUTE_POSITIONS` and `DIRECTIONS` (the contract's), `routeSvg(document, { position, next, tie })` (the route map, made element by element) |
| `office-decisions.css` | Every style, under `.ms-office-decisions`; starts with the kit's stylesheet. Its own: the route map's box, and the tie's two buttons side by side |
| `preview/` | Development only: the preview (in the phone shell's sheet over the Command Room or Room B, as sheets 40 and 41 draw it), `probe.mjs`, and `agree.mjs` (beside the frozen pack's `captain` appoint and waiting, `officer` pick and done, and `nav` route, tie and confirm) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/office-decisions-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/office-decisions.test.mjs`.

**Uses unchanged:**
- **The kit (0.7.0):** `grid9` and `cell`/`setCell` (the 3 × 3, with "You", the selected and the dimmed cells and their notes), `wait` (the Captain's portrait in the waiting block), `stamp` ("BLOCKED"), `list` and `row` (Position, Next move, Acknowledge, with values), `groupNote`, `button` (Blue and Red), and the control policy.
- **The kit's notice (0.7.0):** `notice({ icon, filled, stamp: { text, tone }, lines, extra, status })`, `ms-k-notice`, the pack's `.registered`: a stamp over its lines. It moves into the kit because play-parts and the offices both draw it (decision 2).
- **The phone shell (0.2.7):** its sheet with footer actions and its banner, opened by Frontend; the component does not import the shell.

## Mount, update and dispose

```js
import { mountOfficeDecisions, officeDecisionsSheet } from '…/design/phone-ui/components/office-decisions/office-decisions.mjs';
import '…/design/phone-ui/components/office-decisions/office-decisions.css';

shell.update({ sheet: officeDecisionsSheet(input) });     // at the phase: the frame and footer
const offices = mountOfficeDecisions(shell.sheetBody, input, handlers);
offices.update({ ...changes });                           // each key given replaces that key; the rest stay
offices.dispose();                                        // when the phase ends; safe twice
```

- **One sheet id (`office`) for the views,** so the shell keeps its body while a view changes within a phase (`block` to `blocked`).
- **On update,** each cell keeps its element and the focus.

## Inputs

| Input | Audience | What |
| --- | --- | --- |
| `view` | This phone | `appoint`, `appointing`, `block`, `blocked` or `navigation`: Frontend's, from the phase and this player's office |
| `status`, `interactive`, `viewer`, `versions` | This phone | As the shell's |
| `seats` | Public | Every seat in order, for the 3 × 3: `[{ seat, name, character, note }]`. `note` is Frontend's words under a cell that can't be chosen ("In Hospital", "Blocked last round"), drawn only when given; the component works out no reason (decision 3, as T3) |
| `choices` | The office's | The seats that can be chosen: exactly the offer's `targetSeatIds` (`APPOINT_OFFICER` or `BLOCK_MOVE`). Every other cell is dimmed |
| `chosen` | This phone | The seat chosen so far, one of `choices`, or `null`: Frontend's |
| `command` | The office's | `{ enabled, busy, reason }` for the footer's command (Appoint, Block, Acknowledge) or the tie's direction |
| `captain` | Public | `{ seat, name, character }`, for "Ben is choosing an Officer" |
| `blocked` | Public | `{ seat, name }`, for the Officer's "BLOCKED" notice (the projection's `offices.blockedSeatId`) |
| `offices` | Public | `{ captain, officer }`: their seats. The Navigation view is refused unless the viewer is one of them |
| `navigation` | The offices' only | `{ position, direction, tie, confirmation, next }`, from the projection's `privateNavigation`: `position` is the contract's route position; `direction` `Blue`, `Red` or `null`; `tie` whether this Officer chooses; `confirmation` whether this office acknowledges; `next` the position the move goes to (Frontend's, decision 5) |

## Callbacks

| Callback | When |
| --- | --- |
| `onChoose(seat)` | A cell that can be chosen: Frontend sets `chosen` |
| `onDirection('Blue' \| 'Red')` | The tie's Blue or Red: Frontend sends `CHOOSE_NAV_DIRECTION` |
| The shell's `onSheetAction(id)` | `appoint` (Frontend sends `APPOINT_OFFICER { targetSeatId }`), `block` (`BLOCK_MOVE { targetSeatId }`), `skip` (this phone's own: it sends nothing, and Frontend closes the sheet; decision 4), `acknowledge` (`CONFIRM_NAVIGATION`) |
| `onFocusReturn({ intent, value })` | As the other components' |

Each reports a tap, and only that.

## Drawn

| Part | Drawn |
| --- | --- |
| The 3 × 3 | The kit's grid of nine cells, in seat order: the portrait, the number and name; available, selected ("Selected" under it, amber ring) or dimmed with its note; "You" on this player's cell. At the Largest text, the kit's list form |
| The footer's command | "Appoint Cleo" (the officer icon) or "Block Gus" (the block icon), naming the chosen one; off until a cell is chosen. Skip beside Block |
| The waiting block | The Captain's portrait at 44 px (the pack's `.pt` rule sizes every portrait at 44, and `kit.wait` records the same), "Ben is choosing an Officer", "Chosen at random if time runs out" |
| The notice | The kit's notice: the amber "BLOCKED" stamp, then "Gus can't move this round" and "Everyone sees the block", centred |
| The route map | The pack's drawing: Start, Junction, the Blue arm (B1, B2, Blue Planet) and the Red arm (R1, R2, Red Planet); the ship's place in amber; on a confirmation, the next step dashed in amber; on a tie, "Genuine tie · the Officer chooses" under it. Its accessible name is built from the given position ("Route: the ship is at B1 on the Blue arm") |
| Position, Next move, Acknowledge | The kit's rows with values: "Position · B1", "Next move · Being set"; at a confirmation, "Next move · Blue · to B2" on amber and "Acknowledge · You can't change or veto it" |
| The tie | Its note, then Blue and Red side by side (the kit's secondary buttons, the planet icon) |

**Motion:** none of its own. The sheet's arrival is the shell's.

**Words that state a rule** (decision 7). These fixed words are the component's, as Promises' facts are: the same every time, and the pack's. They must change with the rules:
- "Chosen at random if time runs out" (the Officer's appointment);
- "Optional · once a round" (the block);
- "You can't change or veto it" (the acknowledgement);
- "A genuine tie. Choose the direction; no choice means a random draw." and "Genuine tie · the Officer chooses" (the tie).

Anything that names one person or one move comes from Frontend: the Captain, the chosen seat, the blocked seat, the position, the direction and `next`. The component puts them in the pack's words and never works one out.

**Not drawn by the pack, and how they're drawn** (each the nearest the pack allows):
- **Appoint and Block before a choice:** "Appoint" and "Block", off, until a cell is chosen.
- **A command in flight:** the shell's busy footer button; the tie's Blue and Red busy in place.
- **Reconnecting:** Blue and Red are refused, not dimmed, and described by the banner's words, as the shell's footer refuses its commands.
- **The route map's name:** `role="img"` with the name built from the position. The pack names the box but gives it no role, so its name isn't read.
- **The Largest text:** the 3 × 3 takes the pack's own list form (`kit.css` `.grid-wrap`, as the pack's vote sheet draws it). The kit's `grid9()` always wraps its grid. The pack's appoint sheet leaves its grid unwrapped, so at that size it keeps three columns and cuts the names to a letter. The agreement compares that case with the pack's grid in its own `.grid-wrap`, and records it.

## Frontend's connection

1. At each phase, open the shell's sheet with `officeDecisionsSheet(input)` on the phones it is for, and mount the component in `shell.sheetBody`:
   - the Captain's `appoint` and everyone else's `appointing` (`OFFICER_APPOINTMENT`);
   - the Officer's `block`, then `blocked` (`PRE_TURN`);
   - the offices' `navigation` (`NAV_SETTING`).

   Dispose it when the phase ends.
2. Give `seats`, `choices` (the offer's `targetSeatIds`), `captain`, `blocked`, `offices` and `navigation` from the projection, and `chosen` as the player taps.
3. Send `APPOINT_OFFICER`, `BLOCK_MOVE`, `CHOOSE_NAV_DIRECTION` and `CONFIRM_NAVIGATION` on the callbacks. On `skip`, send nothing: close the sheet, let the block's window run out with no block, and don't reopen the sheet in the same window.
4. Today's rows in Actions and Panels for these decisions leave the screen.

## Decisions (the Lead Designer, 16 November 2026, #300)

1. **The split:** "Setting course" and "The ship moved" for everyone belong to ship travel (#269). This component takes only the offices' Navigation sheet: the route, the tie and the acknowledgement.
2. **The notice goes into the kit.** Play-parts and the offices both draw it, so it moves in under L2: kit 0.7.0's `notice({ icon, filled, stamp: { text, tone }, lines, extra, status })`, play-parts' props, as `ms-k-notice`. It adds `extra`, a node after the lines inside the notice, as the pack's Scan result holds its row. It is built last.
3. **The dimmed cells' notes are Frontend's,** drawn only when given (T3). The component works out no reason.
4. **Skip is this phone's own (`local`).**
   - It sends nothing. Frontend closes the sheet, and the window runs out with no block.
   - Frontend doesn't reopen the sheet in the same window.
   - It doesn't wait for a Backend command.
5. **"Blue · to B2":** `next` is Frontend's. The route map (the pack's `routeSvg`) is the component's drawing. Its accessible name, "Route: the ship is at B1 on the Blue arm", is built from the given position.
6. **Privacy:** the Navigation view is refused unless the viewer is the Captain or the Officer. The direction and the tie leave the page on a view or viewer change, or while concealed.
7. **The fixed words that state a rule are the component's,** as Promises' facts are. They are listed under "Drawn" as words that must change with the rules. Anything that names one person or one move is Frontend's.
8. **Reconnecting:** choosing a cell and Skip keep working. Appoint, Block, Acknowledge, Blue and Red wait with the banner's words.

**One measured detail:** the waiting block's Captain portrait is 44 px, not 76: the pack's `.pt` rule sizes every portrait at 44, and `kit.wait` records the same. The component follows what's drawn.

## The check

`node design/tools/office-decisions-check.mjs` bundles the preview as the game bundles the component, serves it with the hosted game's production headers, and writes `design/phone-ui/components/office-decisions/review/`:
- **20 captures:** the offices' states of sheets 40 and 41 (choosing an Officer, everyone else waiting, choosing a block, the block made, and Navigation's route, tie and acknowledgement), Appoint in flight, reconnecting and the Largest text, at 390 × 844 and 430 × 932;
- **the probe, 17 checks:** the choices and their notes, the footer's commands and Skip, the words, the tie, the route map, the offices' privacy, reconnecting, focus, the layout at both sizes and the Largest text, dispose, and motion (also with the device's Reduce motion);
- **the agreement, 15 cases:** the sheet beside the frozen pack's `captain`, `officer` and `nav` in each of their states at both sizes, and choosing an Officer at the Largest text: the same words, states, look and boxes to within half a pixel, and the route map shape by shape.

**Recorded against** (the check's `sourceCommit`): `594142c0`, clean: 20 of 20 captures, the probe 17 of 17, the agreement 15 of 15.

## Not in this version

- **Frontend's connection** (#284 is not started by Designer).
- **The owner's test page:** built from the preview, published once the owner gives the go-ahead.
