# Office decisions: Designer's runtime component

**Version:** `office-decisions-0.1.0`. **Status (16 November 2026):** the interface, proposed for the Lead Designer's review. Nothing is built. The build starts when the Lead approves it, without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280).

**What it is:** the Captain's and the Officer's own decisions, which open by themselves, as sheets 40 and 41 draw them. It covers #222 item 17 (P2):
- "Choose your Officer" for its 30 s and "Block movement" for its 15 s, as portraits with reasons, with Skip and Block.
- The Navigation tie is shown to the offices directly.

The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**When it opens:** by itself, at its phase; the moment it opens and closes is Frontend's, from the phase. The component draws what it is given. The sheets have no ✕ (the pack's `close: false`): each lasts its phase.

**Covers:**

| View | Audience | Sheet (the shell's frame) | Body (this component) |
| --- | --- | --- | --- |
| **Choose your Officer** (`appoint`) | The Captain's phone | "Choose your Officer", large, no ✕; footer: "Appoint Cleo" | The 3 × 3 of every seat (the kit's `grid9` and cells): the ones Frontend says can be chosen are available, the chosen one is selected; the others are dimmed, each with Frontend's note ("In Hospital", "Injured", "In Jail", "Out"). The Captain's own cell says "You" and "You are Captain" |
| **Officer appointment** (`appointing`) | Everyone else | "Officer appointment", large, no ✕ | The kit's waiting block with the Captain's 76 px portrait: "Ben is choosing an Officer", "Chosen at random if time runs out" |
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
- **Navigation for everyone** (sheet 41's "Setting course" and "The ship moved", item 18): the ship travel film, the Gameplay builder's (#269). Question 1.
- **The room's blocked figure** that everyone sees: the room scene's.
- **The top bar's phase** ("Appoint Officer · Random if time runs out", "Block a move", "Setting course"): the shell's, in Frontend's words.
- **The facts:** who can be appointed or blocked (the offers' `targetSeatIds`), the route position, the direction, the tie and the confirmation (the projection's `privateNavigation`), and the moment each sheet opens and closes are Frontend's. The component never works one out.

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/office-decisions/`:

| Path | What |
| --- | --- |
| `office-decisions.mjs` | `mountOfficeDecisions()`, `officeDecisionsSheet()`, `nextOfficeDecisionsInput()`, `OFFICE_DECISIONS_DEFAULTS`, `OFFICE_DECISIONS_VERSION`, `OFFICE_SHEET_ID`, `OFFICE_WORDS`, `routeSvg()` (the route map, from the position, the direction and the tie) |
| `office-decisions.css` | Every style, under `.ms-office-decisions`; starts with the kit's stylesheet. Its own: the route map's box, and the tie's two buttons side by side |
| `preview/` | Development only: the preview (in the phone shell's sheet over the Command Room or Room B, as sheets 40 and 41 draw it), `probe.mjs`, and `agree.mjs` (beside the frozen pack's `captain` appoint and waiting, `officer` pick and done, and `nav` route, tie and confirm) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/office-decisions-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/office-decisions.test.mjs`.

**Uses unchanged:**
- **The kit (0.6.1):** `grid9` and `cell`/`setCell` (the 3 × 3, with "You", the selected and the dimmed cells and their notes), `wait` (the Captain's portrait in the waiting block), `stamp` ("BLOCKED"), `list` and `row` (Position, Next move, Acknowledge, with values), `groupNote`, `button` (Blue and Red), and the control policy.
- **The notice** (the pack's `.registered`: a stamp over its lines): question 2.
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
| `seats` | Public | Every seat in order, for the 3 × 3: `[{ seat, name, character, note }]`. `note` is Frontend's words under a cell that can't be chosen ("In Hospital", "Blocked last round"), or none (question 3) |
| `choices` | The office's | The seats that can be chosen: exactly the offer's `targetSeatIds` (`APPOINT_OFFICER` or `BLOCK_MOVE`). Every other cell is dimmed |
| `chosen` | This phone | The seat chosen so far, one of `choices`, or `null`: Frontend's |
| `command` | The office's | `{ enabled, busy, reason }` for the footer's command (Appoint, Block, Acknowledge) or the tie's direction |
| `captain` | Public | `{ seat, name, character }`, for "Ben is choosing an Officer" |
| `blocked` | Public | `{ seat, name }`, for the Officer's "BLOCKED" notice (the projection's `offices.blockedSeatId`) |
| `offices` | Public | `{ captain, officer }`: their seats. The Navigation view is refused unless the viewer is one of them |
| `navigation` | The offices' only | `{ position, direction, tie, confirmation, next }`, from the projection's `privateNavigation`: `position` is the contract's route position; `direction` `Blue`, `Red` or `null`; `tie` whether this Officer chooses; `confirmation` whether this office acknowledges; `next` the position the move goes to (Frontend's, question 5) |

## Callbacks

| Callback | When |
| --- | --- |
| `onChoose(seat)` | A cell that can be chosen: Frontend sets `chosen` |
| `onDirection('Blue' \| 'Red')` | The tie's Blue or Red: Frontend sends `CHOOSE_NAV_DIRECTION` |
| The shell's `onSheetAction(id)` | `appoint` (Frontend sends `APPOINT_OFFICER { targetSeatId }`), `block` (`BLOCK_MOVE { targetSeatId }`), `skip` (question 4), `acknowledge` (`CONFIRM_NAVIGATION`) |
| `onFocusReturn({ intent, value })` | As the other components' |

Each reports a tap, and only that.

## Drawn

| Part | Drawn |
| --- | --- |
| The 3 × 3 | The kit's grid of nine cells, in seat order: the portrait, the number and name; available, selected ("Selected" under it, amber ring) or dimmed with its note; "You" on this player's cell. At the Largest text, the kit's list form |
| The footer's command | "Appoint Cleo" (the officer icon) or "Block Gus" (the block icon), naming the chosen one; off until a cell is chosen. Skip beside Block |
| The waiting block | The Captain's 76 px portrait, "Ben is choosing an Officer", "Chosen at random if time runs out" |
| The notice | The amber "BLOCKED" stamp, then "Gus can't move this round" and "Everyone sees the block", centred |
| The route map | The pack's drawing: Start, Junction, the Blue arm (B1, B2, Blue Planet) and the Red arm (R1, R2, Red Planet); the ship's place in amber; on a confirmation, the next step dashed in amber; on a tie, "Genuine tie · the Officer chooses" under it. Named for what it shows ("Route: the ship is at B1 on the Blue arm") |
| Position, Next move, Acknowledge | The kit's rows with values: "Position · B1", "Next move · Being set"; at a confirmation, "Next move · Blue · to B2" on amber and "Acknowledge · You can't change or veto it" |
| The tie | Its note, then Blue and Red side by side (the kit's secondary buttons, the planet icon) |

**Motion:** none of its own. The sheet's arrival is the shell's.

## Frontend's connection

1. At each phase, open the shell's sheet with `officeDecisionsSheet(input)` on the phones it is for, and mount the component in `shell.sheetBody`:
   - the Captain's `appoint` and everyone else's `appointing` (`OFFICER_APPOINTMENT`);
   - the Officer's `block`, then `blocked` (`PRE_TURN`);
   - the offices' `navigation` (`NAV_SETTING`).

   Dispose it when the phase ends.
2. Give `seats`, `choices` (the offer's `targetSeatIds`), `captain`, `blocked`, `offices` and `navigation` from the projection, and `chosen` as the player taps.
3. Send `APPOINT_OFFICER`, `BLOCK_MOVE`, `CHOOSE_NAV_DIRECTION` and `CONFIRM_NAVIGATION` on the callbacks.
4. Today's rows in Actions and Panels for these decisions leave the screen.

## Questions for the Lead

1. **The split with ship travel:** sheet 41's public frames ("Setting course · The offices are setting it" and "The ship moved") are the ship travel film's (#269, item 18). I take only the offices' Navigation sheet: route, tie and acknowledge. Is that right?
2. **The notice:**
   - The Officer's "BLOCKED" notice is the pack's `.registered`, which play-parts draws as its notice.
   - Its header says the notice stays there until another builder needs it, and this would be the second user.
   - Into the kit, or scoped here?
3. **The notes under dimmed cells:**
   - The offers give who can be chosen (`targetSeatIds`), not why the others can't.
   - The pack's notes ("In Hospital", "Injured", "In Jail", "Out", "Blocked last round", "You are Captain") are facts or rules.
   - I propose each cell's note is Frontend's and drawn only when given, as T3 decided for the actions' reasons: the component never works out a reason.
4. **Skip:**
   - The contract has no skip command for the block: `BLOCK_MOVE` only.
   - I propose Skip is this phone's own (`local`): Frontend closes the sheet, and the block's time runs out with no block.
   - Or should Skip wait for a command from Backend?
5. **"to B2":** the next position depends on the route and the direction. I propose Frontend gives `next`, as the move is the server's, and the component only draws it. The map's layout (the two arms and their places) is the component's drawing.
6. **Privacy:**
   - The Navigation view is the offices' only. The component refuses it unless the viewer is the Captain or the Officer (the contract's own audience check, kept on the phone).
   - The direction and the tie leave the DOM when the view changes, the viewer changes, or the sheet is concealed.
7. **Words that state a rule:** "Chosen at random if time runs out", "Optional · once a round", "You can't change or veto it" and "A genuine tie. Choose the direction; no choice means a random draw." are sheet 40's and 41's fixed words. I propose they're the component's, as the Promise kinds' lines are. Or Frontend's?
8. **Reconnecting:** choosing a cell is this phone's own and keeps working. Appoint, Block, Acknowledge and the tie's Blue and Red are commands, and they wait with the banner's words. Skip (if local) works.

## Not in this version

Everything: this is the interface. Next, once the Lead approves it:
- the module and its styles;
- the preview's states:
  - the Captain choosing, with a choice;
  - the others waiting;
  - the Officer choosing;
  - blocked;
  - the route, the tie and the acknowledgement;
  - a command in flight;
  - reconnecting;
  - the Largest text;
- the probe;
- the check at 390 × 844 and 430 × 932 under the production headers;
- the agreement with the pack;
- the test;
- the owner's test page.
