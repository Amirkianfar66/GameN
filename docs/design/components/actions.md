# Actions: Designer's runtime component

**Version:** `actions-0.2.3`, with its parts module `play-parts-0.1.2`. **0.2.3, as the Lead decided on 17 November in reviewing the game's connection (#310):** sheet 45 for Pass and the Disabler's position (A13: "Pass was sent, …", "Position A3 was sent, …"); the projection's own allowance on "Outcome unknown"'s and Pass's buttons (A14: `canRetry`, `canCheck`, `canPass`); and After Register's words where Frontend's copy has none, with every time line (`afterWords()`). **Status (17 November 2026):** built to the interface the Lead Designer approved with the decisions below (L1–L7) and posted on #4 for Frontend on 15 November. **0.2.0 adds Move** (sheets 20, 26 and 27.1), to the interface the Lead approved on 16 November with the answers below (Q1–Q4), and Pass's "Turn passed" (27.3). **0.2.1 adds the Hospital panel's "Outcome unknown"** (sheet 45), as the Lead answered Q3 on 16 November: "Panel request was sent, but no answer came back.", which names no number, while every other part refuses the Hospital panel's request and names its component (below). **0.2.2 adds the Disabler's position bar during a Blackout** (sheet 30), which the owner's decision of 16 November gives to Actions, beside Move (#280 at `d7ab5220`; the Lead, 17 November): "Choose a position", then "Position A3 fixed". Built without waiting for Frontend, as the owner decided on 16 November (Designer builds each part once the Lead approves its interface; recorded on #280). The Lead asks Backend and Integration B1–B8 on #4. Frontend has not connected it: it is not in the game yet, and Integration first admits its files to the hosted build. It is not a release. It is stacked on the phone shell (#265) at `a0900240`: `phone-shell-0.2.11`, which keeps the sheet below the reconnecting banner, wraps a sheet's footer at the Larger text, takes a footer's local actions while reconnecting (0.2.4), starts a title with Back at the pack's 72 px (0.2.5), takes the target bar's Cancel while reconnecting (0.2.7), draws an eliminated player's banner (0.2.8), puts the target bar below the reconnecting banner and, at the Largest text, Cancel under the bar's words, with the chip's label wrapping (0.2.9), draws the phase bars (0.2.10), and gives a bar or sheet opened after the text size changes the new size's rules (0.2.11), with the shared kit `component-kit-0.8.2`, which holds the tile, who and the facts since 0.6.0, the notice and the section head since 0.7.0, the tile's spent state since 0.7.1, the toast and the teams' colours since 0.8.0 (Actions uses neither), follows the text size since 0.8.1, and wraps the toast's words inside the phone since 0.8.2.

**What it is:** the phone's Actions during a match, as the phone pack draws them: sheets 27.2, 27.3, 28, 29, 29.1 and 29.2, the Actions frames of 50 (320 × 568) and 53 (Large text), 45's "Outcome unknown", and Move's words on 20, 26 and 27.1. It is #222 items 9–13, with the owner's T2 and T3. The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Covers:**
- **The tiles** (28, 50, 53; item 10):
  - "Your turn" or "Not your turn", and the round;
  - every action of the viewer's role as a tile: its icon, its short name and one state line;
  - a count badge, such as Rescue's injections;
  - the tile's state: available, chosen, sending, registered (the REGISTERED mark), unavailable, or spent (used up: Private talk once used, the Final Code after its attempt; kit 0.7.1), each of the last two with the server's reason, or "Not available now" (T3).
- **Choosing a target** (29; item 13, T2): the words of the shell's target bar ("Rescue · Choose a player", with the shell's Cancel) and of the floating chip ("Other rooms · 1", "List").
- **Move** (20, 26, 27.1; 0.2.0, the Lead's Q1–Q4): the words of the shell's target bar while choosing a position ("Move within Room A · Choose an empty position · or another room on the Board"; on the board "Move · Choose an empty position · uses this round’s move"), the chip "Other rooms on the Board", the check for the position picked ("Move to A3", "Register move"), and once accepted this phone's toast, "Moved to A3".
- **The Disabler's position during a Blackout** (30; 0.2.2): the words of the shell's target bar while the dark room's positions are offered: "Choose a position · Room A · any position, even empty", then "Position A3 fixed · Resolves after the window · no effect shown now", with the pack's position mark.
- **The list** (29): "Choose from a list · Rescue · everyone you can reach", room by room, each row going to the check.
- **The check before Register** (29, 27.2; item 11): the person, both people for Supply, or the action when it has no person; what it costs and when it resolves; Cancel and "Register Rescue" in the shell's footer, the Register button busy while it sends.
- **After Register** (29, 29.1, 29.2; item 12): the action's own state once the server accepts it. Its stamp (REGISTERED, ACCEPTED, ACTIVE, CAPTURED), headline, detail, the Engineer's captured players, a time line, and Done.
- **When the answer does not come** (45; L6): the pack's "Outcome unknown" sheet, with "Retry the same" and "Check receipt"; for Pass and the Disabler's position too (0.2.3, A13).
- **Not accepted, and accepted after a reload** (not drawn; L6): the check's inline error, and After Register without a time line.
- **Pass** (27.3; item 9): the "Pass your turn?" sheet, "The turn goes to Eli · Player 5", and the line "Your move stays open on the other turns this round."; once passed, this phone's toast "Turn passed" (0.2.0).

**Built on, not redrawn:**
- **The phone shell** (#265): the docked sheet's frame (title, sub, back, close, footer actions with their busy state), the target bar with Cancel, the floating chip, the toast, the raised Pass. This component fills the sheet's body and gives the frame's words.
- **The room scene** (#261): the rings on the offered people, the picked one, the dimming (`targets: { seats, picked }`); and Move's offered positions, the picked one filled (`targets: { slots, picked, icon: 'move' }`), as #284 already passes them.
- **The board** (sheet 26): the same `targets` for people in other rooms, and Move's positions in every room, under its name tags and zoom (#298).
- **The kit** (`component-kit-0.8.0`): the tile, who and the facts (0.6.0), the notice (0.7.0) and the tile's spent state (0.7.1), all from my parts module (below); the section head for the turn (0.7.0); rows, lists, group labels and notes for the list; the stamp; portraits; the inline error; the control policy. The shell draws the buttons.
- **My parts module** (`play-parts/`, L2): the pack's gameplay parts that several of my components draw, each built once:
  - the time line (After Register), the one part still drawn there;
  - the tile (Actions; the private talk's declaration, 25), the check's person and facts (Actions; Promises, 33; the Captain's Release and Eject, 40; a private talk, 25; Scan, 42), and the notice: a stamp or a large icon, centred over its lines (45's "Outcome unknown"; Scan and the Code's results, 42; the Hospital panel, 32; the office's block, 40). The kit took the first three in 0.6.0, when Promises needed them too, and the notice in 0.7.0. The module hands the kit's builders on with the same calls (`play-parts-0.1.1` and `0.1.2`), so Actions' calls did not change.

  If another builder ever needs the time line, the Lead moves it into the kit.

**Not in this component:**
- Move's positions themselves: the room scene's and the board's (above). This component gives Move's words: the bar, the chip, the check and the toast (0.2.0).
- Scan and the final Code (42; #222 items 14 and 15): the Hacker component (#301). The Hacker's tiles start them: `targetBar({ type: 'SCAN' })` refuses and names its `scanBar()`, and the final Code, which has no target bar, is its `codeSheet()` and `mountFinalCode()` (the Lead's note 2, 16 November). Their words exist once, there, and neither component imports the other.
- The Hospital panel (23 and 43): the Hospital panel component (#306). The Hospital's own control and the Panels row open it, not a tile. Only its sheet 45 is Actions' (0.2.1, the Lead's Q3): `unknownSheet({ type: 'PANEL_CODE' })` and `mountOutcomeUnknown({ type: 'PANEL_CODE' })` say "Panel request was sent, but no answer came back." and take no one, so they never name the number the patient entered. A tile, the list, the check, After Register, the target bar and the toast each refuse `PANEL_CODE`, naming the Hospital panel component.
- A private talk after it is accepted (25; item 20), Promises (33; item 19) and the office decisions (40–41; item 17).

## Files

Designer's, runtime-safe, in `design/phone-ui/components/`:

| Path | What |
| --- | --- |
| `actions/actions.mjs` | `ACTIONS_VERSION`, `ACTION_WORDS`, `ACTION_LOOKS`; each part's defaults and check: `ACTIONS_DEFAULTS`, `checkActions()` and `nextActionsInput()`, `TARGET_LIST_DEFAULTS` and `checkTargetList()`, `ACTION_CHECK_DEFAULTS` and `checkActionCheck()`, `AFTER_REGISTER_DEFAULTS` and `checkAfterRegister()`, `OUTCOME_UNKNOWN_DEFAULTS` and `checkOutcomeUnknown()`, `PASS_NOTE_DEFAULTS` and `checkPassNote()`; the words from the inputs `actionWords()` and `tileLine()`; the parts' frames `actionsSheet()`, `targetListSheet()`, `checkSheet()`, `afterSheet()`, `unknownSheet()`, `passSheet()`; the shell's words `targetBar()`, `targetChip()`, `registeredToast()`, and Move's and Pass's `moveBar()`, `moveChip()`, `movedToast()`, `passedToast()` (0.2.0); the mounts `mountActions()`, `mountTargetList()`, `mountActionCheck()`, `mountAfterRegister()`, `mountOutcomeUnknown()`, `mountPassNote()` |
| `actions/actions.css` | The Actions sheets' own layout, scoped under `.ms-actions`. It imports the kit's and the parts' styles |
| `play-parts/play-parts.mjs` | `PLAY_PARTS_VERSION` (`play-parts-0.1.2`), `TILE_STATES` and `PLAY_PARTS_WORDS` (the REGISTERED mark), both the kit's, `STEP_STATES`, and `createPlayParts(document)`, whose builders have setters, as the kit's: `tile`/`setTile`, `who`/`setWho` (the check's person, people or icon), `facts`/`setFacts` and `notice`/`setNotice`, the kit's own, handed on; and `timeline`/`setTimeline` |
| `play-parts/play-parts.css` | The time line's style, scoped so that it weighs one class, as the kit's. The tile's, who's, the facts' and the notice's are in the kit's `kit.css` |
| `actions/preview/` | Development only: the preview on the pack's synthetic fixtures (`states.mjs`: 59 states), in the shell over the room scene (the Board's Move states draw the bar or the check alone: the board is #298's); the lifecycle probe (`probe.mjs`); the agreement with the pack (`agree.mjs`) |
| `actions/review/` | The check's captures (JPEG at 2× pixels) and `check.json` |

Also `design/tools/actions-check.mjs` (on the shared `component-check.mjs`), `packages/design-tokens/test/actions.test.mjs` and `play-parts.test.mjs`, and this page. Integration admits the parts module once, with the first component that uses it.

**Used unchanged:** `icons.mjs`, `kit/kit.mjs` and `kit.css`, and the crew portraits through the kit. Nothing imports a prototype, preview, fixture or development module.

## The steps, and who draws what

Frontend's model already has the steps (`PlanetActionModel.step` in `packages/presentation/src/planet/model.ts`). Each row says what Frontend gives the shell, the scene and this component.

| Step | The shell | The room scene or the board | This component | Frontend's `action.step` |
| --- | --- | --- | --- | --- |
| The tiles | `sheet: actionsSheet(…)` (id `actions`); `tabs.open: 'actions'` | the scene's `control: null`, as under any sheet | `mountActions()` in `shell.sheetBody` | no action |
| A tile is tapped | | | `onTile(type)` | Frontend starts the action |
| Choosing in the room | `sheet: null`; `target: targetBar({ type, where: 'room', picked })`; `chip: targetChip({ kind: 'other-rooms', count })` when people it can reach are elsewhere. The round button stays (T2) | `targets: { seats, picked }`: the offered people in this room | | `targets` |
| Other rooms | the board view; `target: targetBar({ type, where: 'board', picked })`; `chip: targetChip({ kind: 'list' })` | the board's `targets`: every offered person, where they stand; the rest dimmed | | `targets` |
| The list | `sheet: targetListSheet(…)` (id `action-list`; back to the board, no close) | unchanged | `mountTargetList()`; a row calls `onPick(seat)` | `targets` |
| The check | `sheet: checkSheet({ type, phase: 'ready' })` (id `action-check`): Cancel and Register | the picked people ringed, when in this room | `mountActionCheck()` | `confirm` |
| Registering | `checkSheet({ type, phase: 'sending' })`: Register busy, named "Registering…" | unchanged | the check, unchanged | `sending` |
| The server accepted | `sheet: afterSheet({ type })` (id `action-after`): Done | `targets: null`. Nothing is drawn on the target (29.1) | `mountAfterRegister()` | `accepted` |
| Not accepted | the check stays: `checkSheet({ type, phase: 'ready', canRegister })`, Register again only while the server still offers the action | unchanged | the check's `error` | `rejected` |
| No answer came | `sheet: unknownSheet({ type })` (id `action-unknown`): "Retry the same" and "Check receipt" | unchanged | `mountOutcomeUnknown()` | `unknown` |
| Pass | `onHero('pass')`, then `sheet: passSheet({ next })` (id `pass`): Cancel and Pass, busy while sending | the scene's `control: null` | `mountPassNote()` | |
| Passed | `sheet: null`; `toast: passedToast({ id })`: "Turn passed" (27.3) | the next player's turn | | |

**Move** (sheets 20, 26 and 27.1; the Lead's Q1–Q4, 16 November). `here` and `elsewhere` say whether the MOVE offer's `slotIds` include an empty position in the viewer's room and in another room; Frontend splits them by room as the board does.

| Step | The shell | The room scene or the board | This component | Frontend's `action.step` |
| --- | --- | --- | --- | --- |
| The Move tile | as any tile: `onTile('MOVE')` | | `mountActions()` | Frontend starts Move |
| Choosing in the room | `sheet: null`; `target: moveBar({ where: 'room', room, here, elsewhere })`; `chip: moveChip({ elsewhere })` | `targets: { slots: this room's offered positions, picked: null, icon: 'move' }` | | `slots` |
| On the board | the board view; `target: moveBar({ where: 'board', here, elsewhere })`; no chip | the board's offered positions in every room | | `slots` |
| No position anywhere (Q3) | no bar: `moveBar()` returns `null`. The Move tile is `unavailable`, with the server's reason or "Not available now" | none | the tile | |
| A position picked (Q1, Q4) | `target: null` (the bar gives way); `sheet: checkSheet({ type: 'MOVE' })`: Cancel and "Register move" | the picked position marked, filled: `targets: { slots: [slot], picked: slot, icon: 'move' }` (in this room) | `mountActionCheck()` with `type: 'MOVE'`, `position: { slot, room }` and Frontend's facts | `confirm` |
| Registering | `checkSheet({ type: 'MOVE', phase: 'sending' })` | unchanged | the check | `sending` |
| The server accepted (Q2) | `sheet: null`; `toast: movedToast({ slot, id })`: "Moved to A3". No After Register: the move happens at once | `targets: null`; the person at their new position, from the board: the MOVE takes effect at once and emits no event (`MOVEMENT_COMPLETED` is the ship's move) | | done |
| Not accepted | the check stays, Register again while offered | unchanged | the check's `error` | `rejected` |
| No answer came | `sheet: unknownSheet({ type: 'MOVE' })` | unchanged | `mountOutcomeUnknown()` with the `position`: "Move to A3 was sent, but no answer came back." | `unknown` |

- **Cancel in the check** returns to choosing, with the bar back and nothing picked (Q1). Cancel on the bar returns to the tiles.
- **The chip** (`onChip('move-board')`) switches to the board view, whose own bar then shows. Reconnecting, the bar's Cancel still works (shell 0.2.7) and no position takes a tap; the chip, like every chip, waits.
- **The position** is named as the bar and the toast name it: its id ("A3"). Register sends `MOVE { destination, slotId }`, the destination being the position's room.
- **The facts** are Frontend's: "Uses this round’s move" (the prototype's picked words). The room is the check's own line under "Move to A3", as a person's room is under them, so the facts need not repeat it.

**The Disabler's position during a Blackout** (sheet 30; 0.2.2). The view's `self.blackoutTargeting` (`{ windowId, boundRoom, selectable, selectedSlotId, slotIds }`) and the SELECT_BLACKOUT_SLOT offer give everything; the bar only says it.

| Step | The shell | The room scene | Frontend's command |
| --- | --- | --- | --- |
| Dark, the positions offered | the Blackout's dark bar (the shell's phase bar); `target: blackoutBar({ room: boundRoom })`: "Choose a position · Room A · any position, even empty" | `lighting: 'dark'`, no one's turn; `targets: { slots: slotIds, picked: null }` (the pack's position mark): any position, even a taken one | |
| A position tapped | unchanged | `onSlot(id)` | `SELECT_BLACKOUT_SLOT { windowId, slotId }` |
| The server has it (`selectedSlotId`) | `target: blackoutBar({ room, fixed: selectedSlotId })`: "Position A3 fixed · Resolves after the window · no effect shown now" | `targets: { slots: slotIds, picked: selectedSlotId }`, the position marked | the offer ends: the position can't change |
| The window ends | `target: null` | `targets: null` | |

- **The bar's Cancel is the shell's** (T2): what it does is Frontend's. Once the position is fixed it can't recall it: it may only hide the bar on this phone.
- **Undrawn, and left as they are:** while the selection is sending, the bar keeps "Choose a position" and the tapped position takes no other tap; not accepted, the bar stays and no new words are drawn. A rejection's words would be new words, for the Lead and the owner.

- **A person tapped in the room or on the board** goes to the check with that person, as a row of the list does (27.2, 29).
- **Supply's two players** (L4): the first tap rings the first player as picked and the target bar's sub turns from "Choose two players" to "Choose the second player" (Frontend's `compound.supplySecond`). The second tap opens the check with both.
- **An action without a person** (Blackout, Suppress navigation, Clone, and, L7, Hack Ship and Blackhole) goes from its tile straight to the check. The check shows the action's icon, its verb ("Request Blackout") and "Only you see this".
- **Cancel** on the target bar or the check returns to the tiles. Done closes the sheet.
- **While reconnecting** (shell 0.2.4): Cancel on the check and on Pass, and Done, only close their sheet on this phone, so they are the footer's local actions (`local: true`) and still work. Register and Pass stand for commands, and the shell refuses them then, with the banner's words.
- **Cancel while registering** (L5): kept as drawn. It only closes the check: it can't recall a sent command, and nothing may read as a withdrawal. The outcome then says itself: the tile's sending and then REGISTERED state, and the shell's toast from `registeredToast()` ("Rescue registered").
- **"Retry the same"** resends the same command with the same identity (Food's receipt rule); **"Check receipt"** asks the server what became of it. Both are Frontend's; the sheet only draws them.

## Mount, update and dispose

Each part is mounted in the shell's `sheetBody` for its sheet, as the ballot and the Card are. A new sheet `id` is a new, empty body, so each step mounts its own part and disposes of the last.

```js
import { actionsSheet, mountActions } from '…/design/phone-ui/components/actions/actions.mjs';
import '…/design/phone-ui/components/actions/actions.css';

shell.update({ sheet: actionsSheet({ role: 'Doctor', room: 'Room A' }) });
const tiles = mountActions(shell.sheetBody, input, { onTile, onFocusReturn });
tiles.update(partialInput);  // only what changed; an unknown key is an error
tiles.dispose();
```

- Every part returns `{ element, update(partial), suspend(), resume(), dispose() }`. Nothing in it runs by itself; suspended, it takes no tap until resumed.
- **Kept in place:** each tile by its `type`, each row by its seat, each fact, step and captured person by its place. A focused control keeps its element and its focus through updates.
- **After `dispose()`:** the element is removed, nothing more is called, and `update()` does nothing.
- `checkActions(input)` checks a whole input and returns it normalized, so checking twice changes nothing. `nextActionsInput(current, partial)` merges as `update()` does. `checkTargetList()`, `checkActionCheck()`, `checkAfterRegister()`, `checkOutcomeUnknown()` and `checkPassNote()` check the other parts' inputs the same way, and each refuses another part's keys.

## Inputs

### Every part

| Field | Audience | Default | What |
| --- | --- | --- | --- |
| `viewer` | This viewer | `null` | The viewer's seat (`'seat-4'`). A new viewer drops this viewer's inputs |
| `status` | Public | `'live'` | `'live'`, `'stale'` (reconnecting: shown as last seen; no tile or row takes a tap) or `'concealed'` |
| `interactive` | This viewer | `true` | `false`: every control keeps its look and its focus, takes no tap, and says so (`aria-disabled`) |
| `reducedMotion` | This viewer | `false` | The game's Reduce motion: After Register's stamp is there at once, and the sending tile's spinner stands still. The device's setting does the same by itself |
| `versions` | Public | `null` | The crew bundle's versions, for the portraits |

### The tiles (`mountActions`, sheet 28)

| Field | Audience | What |
| --- | --- | --- |
| `turn` | Public | `'own'` or `'other'`: "Your turn" or "Not your turn" |
| `round` | Public | The round: "Round 3" |
| `tiles` | This viewer | In order: `[{ type, state, note, reason, badge }]` |
| `note` | This viewer | Text or `null`: the line under the tiles |

Each tile:

| Field | What |
| --- | --- |
| `type` | The command: `RESCUE`, `PROTECT`, `SUPPLY`, `REGISTER_SHOT`, `REQUEST_HACK`, `MOVE`, `SCAN`, `SUBMIT_CODE`, `ACTIVATE_SHIP_HACK`, `REQUEST_BLACKOUT`, `ENGINEER_SUPPRESS`, `ACTIVATE_CLONE` or `ACTIVATE_BLACKHOLE`. The component gives it its icon and short name (below). A type twice, or another type, is an error. `PANEL_CODE` is refused: the Hospital panel is not a tile (0.2.1) |
| `state` | `'available'` (offered: the tile is a button), `'selected'` (this action is being chosen or checked), `'sending'` (its command is with the server: a spinner in the icon), `'registered'` (accepted and waiting: the REGISTERED mark), `'unavailable'` (greyed) or `'spent'` (used up, as Private talk once used or the Final Code after its attempt: greyed as unavailable, its icon never filled; kit 0.7.1). Frontend passes `'spent'` only where the server says that action is used up, never inferred from an absent offer, the round or an unrelated flag (Integration's T3 answer on #222); without that, the tile is `'unavailable'` ("Not available now") |
| `note` | Text or `null`: the state line of an available, chosen, sending or registered tile ("2 injections", "Once a round", "Eli · end of round") |
| `reason` | Text or `null`: why an unavailable or spent tile can't be used, as the server gives it ("Private talk · Used"). Without one the tile says "Not available now" (T3) |
| `badge` | A whole number or `null`: the count on the icon's corner (Rescue's 2) |

The component works out none of these. It draws the state, note, reason and badge it is given.

**Each command's look and words** (`ACTION_LOOKS`: the pack's, and Frontend's labels where the pack draws none):

| Command | Icon | Tile | Title (target bar, After Register) | The check's verb | Register button | While sending |
| --- | --- | --- | --- | --- | --- | --- |
| `RESCUE` | `rescue` | Rescue | Rescue | Rescue *name* | Register Rescue | Registering… |
| `PROTECT` | `protect` | Protect | Grant Protection | Protect *name* | Register Protection | Registering… |
| `SUPPLY` | `supply` | Supply | Supply | Supply *name* and *name* (L4) | Register Supply | Registering… |
| `REGISTER_SHOT` | `shoot` | Shoot | Shoot | Shoot *name* | Register shot | Registering… |
| `REQUEST_HACK` | `talk` | Private talk | Private talk | Talk with *name* | Request private talk | Requesting… |
| `REQUEST_BLACKOUT` | `blackout` | Blackout | Blackout | Request Blackout | Request Blackout | Registering… |
| `ENGINEER_SUPPRESS` | `suppress` | Suppress | Suppress navigation | Suppress navigation | Suppress navigation | Registering… |
| `ACTIVATE_CLONE` | `clone` | Clone | Clone | Activate Clone | Activate Clone | Activating… |
| `ACTIVATE_SHIP_HACK` | `shipHack` | Hack Ship | Hack Spaceship | Hack Spaceship (L7) | Hack Spaceship | Registering… |
| `ACTIVATE_BLACKHOLE` | `blackhole` | Blackhole | Blackhole | Activate Blackhole (L7) | Activate Blackhole | Activating… |
| `MOVE` | `move` | Move | Move (on the board; in the room `moveBar()`'s "Move within Room A") | Move to *position* (Q1) | Register move (Q1) | Registering… |
| `SCAN` | `scan` | Scan | Scan | (sheet 42) | | |
| `SUBMIT_CODE` | `code` | Final Code | Final Code | (sheet 42) | | |

**The pack's tiles for each role** (28), for Frontend's list: the role's own first, then Move, Private talk and Shoot.

| Role | Its own tiles |
| --- | --- |
| Doctor | Rescue |
| Hacker | Scan, Final Code, Hack Ship |
| Undercover | Protect |
| Blue Disabler, Red Disabler | Blackout |
| Supplier | Supply |
| Engineer | Suppress |
| Alien | Clone, Blackhole |
| Insider | none |

### The list (`mountTargetList`, sheet 29)

| Field | Audience | What |
| --- | --- | --- |
| `type` | This viewer | The action: the sheet's sub, "Rescue · everyone you can reach" |
| `groups` | This viewer | `[{ room, people: [{ seat, name, character, health, you }] }]`: the people the offer reaches, by room as the public board has them, the viewer's room first |
| `picked` | This viewer | The seats chosen so far: Supply's first, its row marked "Picked" in the accent (L4) |

A row: the portrait, the name ("Dev (you)" for the viewer), "Player 4", and " · Injured" when not healthy, with a chevron. A tap reports the seat as Frontend gave it (`'seat-5'` or `5`).

### The check (`mountActionCheck`, sheets 27.2 and 29)

| Field | Audience | What |
| --- | --- | --- |
| `type` | This viewer | The action |
| `targets` | This viewer | `[]`, one person, or two for Supply: `{ seat, name, character, room }`. One: the portrait, "Rescue Eli" and "Player 5 · Hospital". Two (L4): both portraits, "Supply Ava and Gus" and "Players 1 and 7". None: the action's icon, its verb and "Only you see this" |
| `position` | This viewer | Move's alone, and required for it: `{ slot, room }`. The Move icon, "Move to A3" and "Room A" (0.2.0, Q1 and Q4). `null` for every other action |
| `facts` | This viewer | Text lines: what it costs and when it resolves ("Uses 1 of 2 shared injections", "Resolved at the end of the round, after the attacks", "Does not revive an eliminated player") |
| `error` | This viewer | `null` or `{ text, detail }`: why the server did not accept it, in Frontend's words, as the kit's inline note (paper and ink, the warning shape, never red; L6) |

### After Register (`mountAfterRegister`, sheets 29, 29.1 and 29.2)

| Field | Audience | What |
| --- | --- | --- |
| `type` | This viewer | The action: the sheet's title |
| `kind` | This viewer | `'registered'` (REGISTERED, an outline: waiting), `'accepted'` (ACCEPTED, an outline: a private talk set for after the turn), `'active'` (ACTIVE, amber: the Clone) or `'captured'` (CAPTURED, steel: the Engineer) |
| `title` | This viewer | The headline: "Rescue of Eli registered." After a reload, when the phone no longer knows the action: "The server accepted your action." (Frontend's `acceptedAfterReload`; L6) |
| `detail` | This viewer | "This is not a result. Registered actions are resolved at the end of the round." |
| `people` | This viewer | `null`, or the Engineer's captured players: `[{ seat, name, character, sub }]` |
| `steps` | This viewer | The time line: `[{ state: 'done' \| 'next' \| 'later', title, sub }]`. Done is a filled amber check; next and later are a dashed hourglass. `[]` after a reload: no time line (L6) |

The handoff's [After Register](../phone-ui-handoff.md#after-register) table gives each action's words, from Frontend's `en.ts` where it has them. Hack Ship and Blackhole have no After Register until the projection says what follows them (L7): until then, the shell's toast and the tile say it.

**`afterWords({ type, round, targets, viewer, expiresAfterRound, activeFromRound, capture })`** (0.2.3; the Lead, 17 November) gives `{ kind, title, detail, steps }` for these fields, as the pack's `afterRegister()` (`screens-game.mjs`) writes the table. The test holds it to that function, word for word, for every action, for another player and for the viewer.
- **`kind`:** the stamp: `'registered'`; `'accepted'` for a private talk, `'active'` for a Clone, `'captured'` for the Engineer.
- **`title` and `detail`:** the pack's, where Frontend's copy has no line: "Blackout registered.", "Private talk with Ava accepted." (the table: `acceptedTarget.hack`, in the pack's name), "Clone active." and "Navigation suppressed.", with their details. For Rescue, Protection, Supply and a shot both are `null`: Frontend's copy has them (`en.action.acceptedTarget` and `acceptedDetail`; `en.action.compound.supplyAccepted` and `supplyDetail`).
- **`steps`:** the time line, from `round`, the round the server reports: "Registered · Round 3 · your turn", then "End of Round 3 · Rescue is resolved, after the attacks", and so on for each action. With no `round`, none, as after a reload (L6).
- **The projection's own facts,** which a screen's model may not carry: `expiresAfterRound` (when the Clone ends, `abilities.clone`), `activeFromRound` (when Protection starts) and `capture` (`{ room, count }`, the Engineer's, `abilities.engineerCapture` with B8's room). Without one, the words that need it stay out (the Lead, 17 November):
  - the Clone: "Active from now. It used your main action for this round.", and no "End of Round 4" step;
  - the Engineer: "Captured now: the players in the other room. Their navigation weight is removed this round. Only you are told.";
  - Protection: no "Round 4 · Protection for Gus: active" step.
- **`targets`** are the people the action took, as the check has them: the viewer is "yourself" in a headline and "you" in a line. A private talk's time line names the other player, so it needs them.
- It refuses what has no After Register here, as `afterSheet()` does: a move (Q2), Hack Ship and Blackhole (L7), the Hacker's, the Hospital panel's, Pass and the Disabler's position.

### When no answer came (`mountOutcomeUnknown`, sheet 45)

| Field | Audience | What |
| --- | --- | --- |
| `type` | This viewer | The action |
| `targets` | This viewer | As the check's: the words name them |
| `position` | This viewer | Move's, as the check's |

It draws the pack's notice exactly: the warning icon, "Rescue Eli was sent, but no answer came back." and "Check before doing anything else." (for an action without a person, "Request Blackout was sent, …"; for a move, "Move to A3 was sent, …").

**The Hospital panel's request** (`type: 'PANEL_CODE'`, 0.2.1, the Lead's Q3): "Panel request was sent, but no answer came back." with the same second line, and the same warning icon. It takes no `targets`, so it never names the number the patient entered: given one, it is an error whose words name none. "Retry the same" and "Check receipt" stand for commands, as for every action.

**Pass and the Disabler's position** (`type: 'PASS_TURN'` and `'SELECT_BLACKOUT_SLOT'`, 0.2.3, A13; the Lead, 17 November): "Pass was sent, but no answer came back." and "Position A3 was sent, but no answer came back.", with the same second line. The position is given as Move's (`position: { slot, room }`); Pass takes no one. Their own sheet and bar are `passSheet()` and `blackoutBar()`, so a tile, the list, the check, After Register, `targetBar()` and `registeredToast()` each refuse them, naming those.

### Pass (`mountPassNote`, sheet 27.3)

| Field | Audience | What |
| --- | --- | --- |
| `note` | This viewer | Text or `null`: "Your move stays open on the other turns this round." |

### The frames and the shell's words

| Helper | Returns |
| --- | --- |
| `actionsSheet({ role, room })` | `{ id: 'actions', title: 'Actions', sub: 'Doctor · Room A', close: true }` |
| `targetListSheet({ type })` | `{ id: 'action-list', title: 'Choose from a list', sub: 'Rescue · everyone you can reach', back: true, close: false }` |
| `checkSheet({ type, phase, canRegister })` | `{ id: 'action-check', title: 'Check and register', close: false, actions: [Cancel, Register] }`. Cancel is `local`. `phase`: `'ready'` or `'sending'` (Register busy, named "Registering…") |
| `afterSheet({ type })` | `{ id: 'action-after', title: 'Rescue', close: false, actions: [Done] }`. Done is `local` |
| `unknownSheet({ type, busy, canRetry, canCheck })` | `{ id: 'action-unknown', title: 'Outcome unknown', close: false, actions: ["Retry the same" (secondary, `retry`), "Check receipt" (primary, `check`)] }`, as sheet 45 draws them. `canRetry` and `canCheck` (0.2.3, A14; default `true`) are the projection's: a button it does not allow now keeps its place, unusable. While one asks (`busy`), it stays itself and the other is off |
| `passSheet({ next, busy, canPass })` | `{ id: 'pass', title: 'Pass your turn?', sub: 'The turn goes to Eli · Player 5', close: false, actions: [Cancel, Pass] }`. Cancel is `local`, and off while Pass sends. Without `next`, no sub (B5). `canPass` (0.2.3, A14; default `true`) is the projection's: without it Pass keeps its place, unusable; while it sends, it is busy, not off |
| `afterWords({ type, round, … })` | After Register's `{ kind, title, detail, steps }` (0.2.3; above) |
| `targetBar({ type, where, picked })` | `{ icon, title, sub }`: "Rescue · Choose a player" in the room; "Choose a player · every room" on the board; Supply's "Choose two players", then "Choose the second player" (L4) |
| `targetChip({ kind, count })` | `{ id: 'other-rooms', label: 'Other rooms · 1', icon: 'board', tone: 'paper' }`, or `{ id: 'list', label: 'List', icon: 'players', tone: 'paper' }` |
| `registeredToast({ type, kind, id })` | The shell's toast, `{ id, text, icon: 'check' }`: "Rescue registered", "Private talk accepted", "Clone active", "Navigation suppressed" (L5). `id` is the command's, so it shows once. Move refuses: its toast is `movedToast()` |
| `moveBar({ where, room, here, elsewhere, picked })` | Move's target bar, `{ icon: 'move', title, sub }`, or `null`: in the room "Move within Room A" with "Choose an empty position · or another room on the Board", or "Choose an empty position" when no other room has one (Q3); this room full, "Move" with "No empty position in Room A · choose one on the Board" (Q3); on the board "Move" with "Choose an empty position · uses this round’s move". No position anywhere, or one `picked` (the check then, Q1): `null`. `targetBar({ type: 'MOVE' })` refuses and names it |
| `moveChip({ elsewhere })` | In the room, while another room has a position: `{ id: 'move-board', label: 'Other rooms on the Board', icon: 'board', tone: 'paper' }`; else `null` |
| `movedToast({ slot, id })` | Once the server accepts a move (Q2): `{ id, text: 'Moved to A3', icon: 'info' }`, the shell's info toast, on this phone only |
| `blackoutBar({ room, fixed })` | The Disabler's position bar during a Blackout (sheet 30; 0.2.2), `{ icon: 'position', title, sub }`: "Choose a position" with "Room A · any position, even empty" (`room`, the request's bound room); once the server has the position (`fixed`, such as `'A3'`), "Position A3 fixed" with "Resolves after the window · no effect shown now" |
| `passedToast({ id })` | Once the turn has passed (27.3): `{ id, text: 'Turn passed', icon: 'info' }` |

`actionsSheet()`'s sub names the role: it is this viewer's, and the shell drops its sheet when concealed.

## Callbacks

| Callback | When |
| --- | --- |
| `onTile(type)` | An available tile. An unavailable, sending or registered tile takes no tap |
| `onPick(seat)` | A row of the list: its seat, as Frontend gave it |
| `onFocusReturn({ intent, value })` | The focused tile or row ended (it left, or its sheet closed): the focus is on the part's root, for Frontend to move on |

The rest are the shell's and the scene's: `onSheetAction(id, sheetId)` for Cancel, Register, Done, Retry the same, Check receipt and Pass; `onSheetBack` for the list; `onCancelTarget()`; `onChip(id)`; the scene's `onSeat(seat)`.

## What each state draws

| State | Drawn |
| --- | --- |
| Your turn | "YOUR TURN · Round 3"; the tiles three to a row (28) |
| Not your turn | "NOT YOUR TURN"; the tiles the server still offers are open (Move; the Hacker's Final Code), the rest unavailable |
| Unavailable | The icon steel on slate, the name grey, the reason or "Not available now" |
| Sending | A spinner in place of the icon; the tile takes no tap |
| Registered | A paper outline, the icon ink on paper, the REGISTERED mark across the icon, the note under the name ("Eli · end of round") |
| The list | Group labels by room; rows with portraits; Supply's first pick marked |
| The check | The person at 64 px, both people for Supply, or the action's icon; the facts with an amber "i" each; an inline error when not accepted |
| Registering | The check unchanged; the shell's Register busy |
| After Register | The stamp, the headline, the detail, the captured players, the time line |
| Outcome unknown | Sheet 45's notice: the warning icon and its two lines; "Retry the same" and "Check receipt" |
| Stale | As last seen; no tile or row takes a tap, and the focus stays. The footer's Cancel and Done still close their sheet (local); Register, Pass, Retry the same and Check receipt are refused, with the banner's words |
| Concealed | Nothing: no tile, row, name, fact, stamp or step is left in the page |

**Motion:** the stamp snaps in over 120 ms when After Register opens; with Reduce motion it is there at once (the handoff's motion table). The sheet's slide and the toast are the shell's.

**Text size** (L3): at Large (150 %, sheet 53) and on 320 × 568 (sheet 50) the tiles stay three to a row and their words wrap. With less room they go two to a row (the tiles' box under 14.5 em wide), and under 13 em one per row as a list row, as the kit's 3 × 3 does: the icon on the left, then the name with its count, the state line and the REGISTERED mark. At Largest (200 %) on 320 × 568 the tiles are a list.

## Privacy and audiences

- **Everything here is this viewer's own:** the role, the offers, the reasons, the targets, the check and what the server accepted. A shared display never mounts it, and a target never learns of an action (the Engineer's capture: "Only you are told").
- **Concealed:** every part empties itself, removing its tiles, rows, words, stamps and steps rather than hiding them, and drops this viewer's inputs. Shown again, they come back only when given again.
- **A new viewer** drops the same.
- **Nothing is an outcome.** No heal, hit, injury or protection is drawn on anyone until the server reports it (29.1). REGISTERED and ACCEPTED are outlines; only Clone's ACTIVE and the Engineer's CAPTURED are filled, because they happen when the server accepts them (CLONE-01, P14).

## Accessibility

- **Tiles are buttons, and unavailable ones keep the focus.** An unavailable, sending or registered tile has `aria-disabled` and says why: "Shoot, Not available now", "Rescue, Eli · end of round, registered". A sending tile is `aria-busy`.
- **The badge** repeats the note's count, so it is hidden from screen readers when a note is given.
- **After Register's head** (the stamp and the headline) and the Outcome unknown notice are statuses, read when they open.
- **The check's error** is an alert.
- **Targets stay 44 px** at every size (sheet 50).

## Frontend's connection (proposed)

| Input | From `PlanetScreenModel` |
| --- | --- |
| `turn` | `activeSeatId === ownSeatId` |
| `tiles` | Every action of the role (B2). The state: `available` when `privateArea.offers` has the type; `selected` while `action.type` is it and `action.step` is `targets`, `slots` or `confirm`; `sending` at `sending`; `registered` after `accepted`, for an action that waits for the round's end; otherwise `unavailable` |
| `tiles[].badge` | Rescue: `abilities.injectionsRemaining` |
| `tiles[].note` | Available: B3. Registered: who, and "end of round" |
| `tiles[].reason` | The server's reason (B1); until then `null` |
| The list's `groups` | The offer's `targetSeatIds`, with `identities` and the public board's `location` and `health` |
| The check's `targets` | `action.selected`, with the same |
| The check's `facts` | Frontend's copy, in the pack's words (B7); "1 of 2" from `abilities.injectionsRemaining` |
| The check's `error` | `en.ts`'s `rejected` and `notAccepted` lines, with `tryAgainHint` when the server still offers the action |
| After Register | `acceptedTarget.*`, `acceptedDetail.*`, `compound.supplyAccepted`, and the handoff's drafts for Blackout, Clone and the Engineer; `abilities.clone`, `abilities.engineerCapture`; after a reload, `acceptedAfterReload` |
| Outcome unknown | `action.step === 'unknown'`, with the command it sent |
| `passSheet`'s `next` | B5 |
| `mountPassNote`'s `note` | The pack's line while `self.movementSpent` is false (B6) |

## Decisions and questions

### The Lead's decisions (15 November)

- **L1. The pack's words in the agreement.** The pack's reasons go in as `reason` text, as the projection would give them (B1), so no word is amended. T3's "Not available now", with no line under the tiles, is its own set of states.
- **L2. Shared parts.** The tile, the check's person and facts, the notice and the time line are my own module, `play-parts/`, with its own version, not the kit: the kit holds what both screen builders draw. It is checked beside the pack through the Actions agreement, and Integration admits it once.
  - **16 November:** Promises needed the tile, who and the facts too, so the Lead moved them into the kit (0.6.0). play-parts hands them on with the same calls (0.1.1). The Hacker's results and the office's block need the notice, so the kit took it too (0.7.0), and play-parts hands it on (0.1.2); only the time line stays in it.
- **L3. Largest text.** Three to a row, then two, then a list row under 13 em, as the kit's 3 × 3.
- **L4. Supply's two players.** As above: composed from the pack's own patterns, not a departure.
- **L5. Cancel while registering.** Kept as drawn, closing only. The outcome says itself, through the tile's REGISTERED state and the toast. Nothing may read as a withdrawal.
- **L6. When the answer goes wrong.**
  - **(a) Result unknown is drawn:** sheet 45's "Outcome unknown", used exactly, in place of a "Check again".
  - **(b) Not accepted, and accepted after a reload,** are not drawn: the kit's inline error with Frontend's words, and Register again while still offered; after a reload, "The server accepted your action." with REGISTERED and no time line.
- **L7. Hack Ship and Blackhole.** The check without a person. After Register only once the projection says what follows.

### The Lead's answers on Move (16 November)

The Lead approved Move's interface (`moveBar()`, `moveChip()`, its intents, states, lifecycle and audiences) after the coverage audit, and checked its words against the pack (`screens-game.mjs` room() and board()). No sheet draws a picked Move, its Register or a "moved" result, so these fill undrawn steps and depart from no approved sheet:

- **Q1. A position picked opens Actions' check,** as every action's does (27.2): the Move icon, "Move to A3", Frontend's facts, then Cancel and Register. The position stays marked under it; the bar gives way to it, as the pack's target bar gives way to the confirm. The prototype's picked words become the check's title and its fact. Cancel returns to choosing, with the bar back and nothing picked. The Register button carries the prototype's "register to confirm": I read that as the button itself, named in the form of the others' ("Register shot"), so it says "Register move".
- **Q2. Once accepted, a toast: "Moved to A3".** The shell's info toast, as "Turn passed" (27.3), on this phone only; the person walking in the scene is what everyone sees. It names the position as the bar does.
- **Q3. The undrawn cases:** positions only in this room, "Move within Room A" with "Choose an empty position", and no chip; this room full while others have positions, "Move" with "No empty position in Room A · choose one on the Board", and the chip; no position anywhere, no bar, and the tile unavailable with the server's reason or "Not available now".
- **Q4. The board opens the same check** ("Move to B4"), and keeps its own choosing words.

### The Lead's decisions on the game's connection (17 November)

In reviewing #310, the game's connection of this component (release 3), the Lead decided:
- **A13 and A14 belong here:** sheet 45 for Pass and the Disabler's position, and the buttons' allowance from the projection (`canRetry`, `canCheck`, `canPass`), so the connection no longer sets the footer's `enabled` itself.
- **After Register's words:** the handoff's table, with Frontend's copy where it has the line, and the pack's words here where it has none, with every time line (`afterWords()`). The generic "Registered. Resolution is pending." is not After Register's (#222 item 12 drops it by name). Only what the model truly lacks stays out: the Engineer's captured players, and, while the Actions panel's model carries no `abilities`, the Clone's end, Protection's start and the capture's room and count.
- **To confirm with the Lead** (asked on 17 November): the private talk's detail, the pack's "It starts after this turn. The top bar shows each step." (as built) or Frontend's "The phase shown at the top of this screen says what happens next."; and the two shorter lines above.

### For Backend and Integration (asked by the Lead on #4)

The contract's offers (`PlanetOfferSchema`) list only what the viewer may do now: `{ type, targetSeatIds, slotIds, windowIds, promiseTargetSeatIds, declaredSides }`. Nothing says why an action is not offered.

- **B1. Why an action is unavailable (T3).** The pack's tiles say "On your turn", "From Round 4", "Used", "Needs the Code" and "Before turns, in office". T3 left open whether the projection carries them. Could the private view add one entry per role action it does not offer, such as `unavailable: [{ type, reason: 'NOT_YOUR_TURN' | 'FROM_ROUND' | 'SPENT' | 'NEEDS_CODE' | 'NEEDS_OFFICE' | …, round? }]`, which Frontend's copy turns into words? Until then, every such tile says "Not available now".
- **B2. Which actions a role has.** T3 shows every action of the role. Is that list a presentation table (the pack's, above), or should the private view carry it (`roleActions: [type]`)? Does every living role have Move, Private talk and Shoot?
- **B3. The state line of an offered tile.** "2 injections" is `abilities.injectionsRemaining`. "Once a round", "Once a match", "Your room", "One attempt" and "Round 3 only" describe the action, not why it is unavailable. May Frontend show them as copy, or should they come from the projection?
- **B4. What is registered.** After a reload the phone cannot show the REGISTERED tile ("Eli · end of round") or the After Register state: the view says an action is spent (`self.roleActionSpent`, `shotSpent`), not what was registered for whom. Could it carry this viewer's registered, unresolved actions, such as `registered: [{ type, targetSeatIds, round }]`? Until then, after a reload the tile is unavailable, and After Register uses Frontend's `acceptedAfterReload` words.
- **B5. Who is next, for Pass.** "The turn goes to Eli · Player 5" needs the next active seat. The public view has only `activeSeatId`, and the phone does not work out the turn order. Could it carry `nextActiveSeatId`? Until then, "Pass your turn?" has no sub.
- **B6. The move after a pass.** "Your move stays open on the other turns this round." is true only while the move is unspent. Is `self.movementSpent === false` enough to show it?
- **B7. The check's facts** are rule statements in the pack's words (each action's three lines are in the pack's `screens-game.mjs`). Frontend's copy has different lines (`planetConfirmation()`, `consequence`). The pack is the specification for words (11 November), so I propose Frontend adds the pack's lines to `en.ts`, reviewed against the rules, and passes them as `facts`.
- **B8. Where the Engineer's capture was.** "Player 3 · in Room B when accepted" and "the 3 players in Room B" need the capture's room. `abilities.engineerCapture` has `round` and `seatIds` only. Could it add `room`? Until then, the rows say "Player 3" and the detail names no room.

## Not in this version yet

Listed, not omitted:

| What | Until then | Waiting on |
| --- | --- | --- |
| Why an action is not offered (B1) | Each such tile says "Not available now" (T3) | Backend and Integration, through the Lead on #4 |
| Which actions a role has (B2), and an offered tile's line (B3) | Frontend lists the pack's tiles for each role (above), with the pack's lines as copy | The same |
| What is registered, after a reload (B4) | The tile is unavailable; After Register says "The server accepted your action." with no time line | The same |
| Who is next, for Pass (B5) | "Pass your turn?" has no sub | The same |
| Where the Engineer's capture was (B8) | The rows say "Player 3" and the detail names no room | The same |
| After Register for Hack Ship and Blackhole (L7) | The shell's toast and the tile say it | The projection |
| The people in other rooms and Move's positions on the board (sheet 26) | The board's own drawing, with #298's name tags and zoom; the list reaches everyone. This preview draws the bar or the check over an empty stage on the Board's Move states | Frontend's board view, with #298 |
| A tall target bar at the Largest text | Shell 0.2.9 puts Cancel under the bar's words and wraps the chip's label, so the bar stays on the phone (`review/320x568-largest-move.jpg`). At 200 % the bar is still tall: on 390 × 844 it covers Room A's A5, as the Actions test page showed | The shell (the Lead's) |
| The game's connection | The preview and the owner's test page stand in for Frontend | Frontend |

## Found while building

For the Lead. Nothing here changes the agreed interface:

- **Move's target bar** (0.2.0, the coverage audit): `targetBar({ type: 'MOVE' })` gave Move a person's words ("Choose a player"), and no component held the pack's ("Move within Room A", "Other rooms on the Board"). Move now has its own `moveBar()` and `moveChip()`, and `targetBar()`, `targetListSheet()`, `afterSheet()` and `registeredToast()` refuse Move, naming them.
- **"Turn passed"** (0.2.0). Sheet 27.3's third frame, "The turn moves on", has the toast "Turn passed", which no component held; it is Pass's, so it is `passedToast()` here. The agreement compares it with the pack (the frame's room shows its own control, "Window · Hospital": the room scene's, named in the record, not compared here).
- **A target bar at the Largest text** (0.2.0; mostly fixed in shell 0.2.9). The first capture of a long bar at 200 % on 320 × 568 showed the shell's target bar running off the phone, its words in a narrow column beside Cancel. On 390 × 844 at 200 % the Actions test page showed the same bar covering the position at A5, and the chip's label cut off. The Lead's shell 0.2.9 puts Cancel under the bar's words and wraps the chip's label; merged in here, the bar stays on the phone (`review/320x568-largest-move.jpg`). The bar is still tall at 200 % (above, "Not in this version yet").
- **The target bar under the reconnecting banner** (0.2.0, seen on the Actions test page; fixed in shell 0.2.9). Choosing a position while reconnecting, the banner covered the bar, its Retry over the bar's Cancel. The Lead's shell 0.2.9 puts the bar below the banner, as the sheet already was; merged in here, the record's `move-stale` captures show Cancel in sight.
- **The Hospital panel's "Outcome unknown"** (0.2.1, the Lead's Q3). The Hospital panel component (#306) draws the keypad, Submit and the records; no answer is sheet 45, which is Actions'. `PANEL_CODE`'s look gives it "Panel request", and takes no one, so the line never names the number. Its icon is the panel's, but sheet 45 draws its own warning icon for every action, as the pack's does. The probe's `unknown` check gives it a target and sees it refused, with nothing changed.
- **The shell's footer at the Largest text** (fixed). On 320 × 568 at 200 %, "Register Rescue" ran past the sheet's right edge. The Lead fixed it in the shell, 0.2.1 (16 November): under 19 em a footer's buttons that don't fit side by side take a row each, and a long label wraps inside its button. Merged in here, the capture now fits (`review/320x568-largest-check.jpg`).
- **Cancel and Done while reconnecting** (16 November). They only close their sheet, so they are now the footer's local actions, which the shell takes while reconnecting (0.2.4); before, it refused them with the rest. Register, Pass, Retry the same and Check receipt stand for commands and stay refused. The probe's `footer` check taps each, live and reconnecting.
- **The list's title with Back** (shell 0.2.5): "Choose from a list" and its line start at the pack's 72 px, with Back at 18.
- **A used-up tile is spent** (kit 0.7.1, 16 November). The pack draws Private talk once used as `spent`; before, Actions drew it as unavailable with the server's reason (L1). It is now the kit's spent state, with the same look and its icon never filled, so the agreement compares the pack's spent as itself.
- **The notice and the turn head in the kit** (kit 0.7.0, 16 November). "Outcome unknown" draws the kit's notice (`ms-k-notice`), and the turn head ("Your turn · Round 3") is the kit's section head (`ms-k-section-head`), with the same values as Actions' own rules, which are gone. The probe, the agreement and the check name the kit's classes. Every recorded field, the probe and the agreement are unchanged.
- **The tile, who and the facts in the kit** (kit 0.6.0 and 0.6.1, 16 November). Their elements now carry the kit's classes (`ms-k-tile`, `ms-k-who`, `ms-k-facts`), so Actions' list-row tile rules, its probe, its agreement and its check name those. With 0.6.1, a registered, sending or unavailable tile's words take the sheet's halo, as the pack's do: the pack draws such a tile as a div, which keeps the sheet's halo, where a button drops it. Every recorded field, the probe and the agreement are unchanged.
- **Sheet 45's icon.** The pack draws "Outcome unknown"'s warning icon at its own 24 px, because its 76 px `.big-icon` tile is styled only inside a waiting block (`.wait`). The notice draws it as the pack does; a larger icon would be a change to the pack.
- **The pack's `.confirm-who span` rule** also reaches the action's own icon tile: a 2 px top margin and the sub's type. Who mirrors it, so the agreement holds.
- **Supply's first pick in the list** (L4) is marked "Picked", in the accent, as the kit's row value. The pack draws no such row: it is composed from the kit's row. In the room, the room scene marks the same person with its stronger ring.
- **`onPick(seat)`** reports the seat as Frontend gave it (`'seat-5'` or `5`), so Frontend need not convert it back.

## Checks run on this version

- **Tests:**

  | Check | Result |
  | --- | --- |
  | `packages/design-tokens/test/actions.test.mjs` | 9 of 9: the runtime-safe graph, every style scoped at two classes (the kit's and the parts' placed only inside the component's own), the pinned pack unchanged, the pack's words and the decisions' additions (Move's three: "No empty position in Room A · choose one on the Board", "Moved to A3" and "Register move", recorded here), the inputs' checks and privacy rules (Move's position, Move's alone), every preview state a valid input, the frames' and the shell's words (Cancel and Done local, the commands not; the Scan bar and the Code refused, as the Hacker's; the Hospital panel's request refused everywhere but sheet 45, naming its component (0.2.1); Move's bar in each Q3 case, its chip, its toasts, and every refusal), the check's and "Outcome unknown"'s words (a move's position; the Hospital panel's request, with no one, and its error naming no number) and T3's line, and the check's record (Move's captures as drawn, the Disabler's dark room and bars (0.2.2), and the room's own control named on 27.3); the Disabler's bar's words, the pack's, and its refusals (0.2.2) |
  | `packages/design-tokens/test/play-parts.test.mjs` | 6 of 6: the parts draw on the kit alone; the tile, who, the facts and the notice are the kit's (the same states, words and calls, and no styles of their own here); every rule at the kit's weight; the time line takes no taps; the pack's own colour; and no motion |
  | `npm run test:design` | 401 of 401 |
  | `npm run test:tooling` | 356 of 356 |
  | `npm run build`, `check:toolchain`, `check:workspace`, `check:sources`, `typecheck` | Pass |
  | `node design/tools/check-assets.mjs` | 15 passed |

- **`node design/tools/actions-check.mjs`:** recorded on `c19347fb` (0.2.2; the shell at `bb567d7e`, shell 0.2.9 and kit 0.8.0), with the source clean: 110 of 110 captures, probe 17 of 17 (16 as the page comes, and the motion check with the device's Reduce motion), agreement 31 of 31.
  - **New in 0.2.2:**
    - 5 captures of 3 new states: the Disabler choosing a position in the dark room (`blackout-pick`), the position fixed (`blackout-fixed`), both at both sizes, and the fixed bar at the Largest text on 320 × 568 (`largest-blackout`, where Cancel goes under the words). The record reads the room's lighting; the dark room hides its people, so no crew is expected there.
    - The agreement adds sheet 30's two frames (`blackout&state=pick` and `blackout&state=chosen`), each to within half a pixel.
    - The probe's `words` check adds the two bars and their refusals (no room; an empty position).
  - **Against `4da985e4`'s record** (0.2.1): every recorded field of the 105 earlier captures is the same, and so are the probe's 17 checks and the agreement's 29 frames. 8 captures are byte for byte the same, 30 have no pixel that differs by more than 40 levels, and the rest differ by at most 152 pixels, inside the room's picture and in the sending spinner's angle.
  - **Before:** `4da985e4` (0.2.1): 105 of 105 captures, probe 17 of 17, agreement 29 of 29.
  - **New in 0.2.1:**
    - 2 captures of the new state `unknown-panel`: sheet 45 for the Hospital panel's request, "Panel request was sent, but no answer came back.", at both phone sizes.
    - The probe's `unknown` check: the Hospital panel's two lines, and a target given to it refused, with words that name no number, and nothing changed.
  - **Against `56f6afb9`'s record** (0.2.0, shell 0.2.8): every recorded field of the 103 earlier captures is the same, and so are the probe's 17 checks and the agreement's 29 frames.
    - Shell 0.2.9 changes three captures, as the Lead said it would:
      - `move-stale` at both sizes (46,473 and 40,323 pixels): the target bar is now below the reconnecting banner, with its Cancel in sight;
      - `320x568-largest-move` (159,589 pixels): Cancel under the bar's words, and the chip's label wrapping, so the bar stays on the phone.
    - `largest-move-check` and the other text-size captures don't change.
    - 7 captures are byte for byte the same. The rest differ by at most 150 pixels, inside the room's picture (its ambient motion) and in the sending spinner's angle.
  - **Before:** `56f6afb9` (0.2.0, Move; the shell at `0e5a0b8a`, shell 0.2.8 and kit 0.8.0): 103 of 103 captures, probe 17 of 17, agreement 29 of 29.
  - **New in 0.2.0:**
    - 28 captures of 15 new states: Move in the room, on the Board (the bar alone over an empty stage: the board is #298's), with positions only here, this room full, no position anywhere (the tile, no bar), the check (the position marked), the Board's check ("Move to B4"), registering, not accepted, no answer, moved (the toast, the person at A5), "Turn passed", reconnecting while choosing, and the Largest text on 320 × 568 for the bar and the check. The record reads the offered positions (`slots`) and the toast.
    - The probe's `move` check: the bar in each Q3 case and on the board, none once picked or with no position; the chip; every refusal; in the real shell, the bar's Cancel and the chip's intents, and reconnecting only Cancel's; the toast's words and info icon; the check (the Move icon, "Move to A5" over "Room A", the fact, the Board's "Move to B4" in the same element, the inline note, "Register move", "Registering…"); "Outcome unknown" naming the position. The `inputs` and `private` checks gain Move's position.
    - The agreement adds sheet 20's bar and chip (`room&room=room-a&state=move`), the board's bar (`board&state=move`, sheets 26 and 27.1) and 27.3's toast (`room&room=room-a&state=passed`), each to within half a pixel. On 27.3's frame the pack's room shows its own control, "Window · Hospital", the room scene's (#261): the record names it as not compared here. The check's bundle now carries the board's Hospital pictures (`apps/game/hosted/board-v2-film-art/`) to where the pack's board looks for them, as `board-tags-check.mjs` does.
    - **The checks bite:** "Choose a spot" for the room bar's line, "Board" for the chip, "Pick one" for the board's line and "Passed" for the toast each fail the agreement (tried, then undone).
  - **Against `8f80c09e`'s record** (0.1.0): every recorded field of the 75 earlier captures is the same, and so are the probe's 16 earlier checks and the agreement's 26 earlier frames. 23 captures did not change; the rest differ by at most 271 pixels, inside the room's picture (its ambient motion) and in the sending spinner's angle.
  - **Seen in 0.2.0's captures, for the Lead:** `320x568-largest-move.jpg` showed the shell's target bar at the Largest text running off the phone; shell 0.2.9 fixed it (above).
  - **Before:** `8f80c09e` (the shell at `0e5a0b8a`, shell 0.2.8 and kit 0.8.0, merged in): 75 of 75 captures, probe 16 of 16, agreement 26 of 26. Against `8d835f27`'s record (kit 0.7.1): every recorded field of the 75 captures is the same, and so are the probe's 16 checks and the agreement's 26.
    - The merge also brings the room scene the preview draws behind the sheet from 0.3.0 to 0.5.0, which keeps the crew's name tags whole and apart at the larger text (#222 item 34). So five captures differ behind the glass sheet, where the tags moved: the four at the larger text by up to 18,910 pixels (`largest-tiles`, `largest-check` and `largest-after` at 320 × 568, and `large-tiles` at 390 × 844), and the small phone's `small-tiles` by 944. Captured twice on the same code, `largest-tiles` differs by 0 pixels.
    - 2 captures did not change; the rest differ by at most 194 pixels, inside the room's picture behind the sheet.
  - **Before:** `8d835f27` (kit 0.7.1, with the shell at `b3e5823e`, merged in as `bd6eab9e`). Against `81d7ae59`'s record (kit 0.7.0): the used-up Private talk is `spent` in the three captures that show it (`tiles-spent` at both sizes, `largest-tiles`), and the agreement now compares the pack's spent tile as spent; every other recorded field, the probe's 16 checks and the agreement's 26 are the same. 18 captures did not change; the rest differ by at most 219 pixels, inside the room's picture (its ambient motion) and in the sending spinner's angle.
  - **Before:** `81d7ae59` (play-parts 0.1.2 on kit 0.7.0, with the shell at `7900a7a7`, merged in as `3a0f30e7`).
  - **Against `27d38864`'s record** (kit 0.6.1): every recorded field of the 75 captures is the same, and so are the probe's 16 checks and the agreement's 26. 19 captures did not change; the rest differ by at most 169 pixels, inside the room's picture (its ambient motion) and in the sending spinner's angle.
  - **Before:** `27d38864` (play-parts 0.1.1 on kit 0.6.1, with the shell at `f04ab116`, merged in as `ebd2cea5`). Against `16c8acd1`'s record (shell 0.2.6, kit 0.5.1): every recorded field of the 75 captures is the same, and so are the probe's 16 checks and the agreement's 26. 19 captures did not change; the rest differ by at most 230 pixels, inside the room's picture (its ambient motion, seen through the sheet), in the sending spinner's angle, and in the words' halo on a registered, sending or unavailable tile (kit 0.6.1).
  - **Before:** `16c8acd1` (Cancel and Done local, with the shell at `98aca824`, 0.2.6, merged in as `e9fb5bd6`). Against `5ed5718e`'s record (shell 0.2.1):
    - the four list captures: Back and "Choose from a list" with its line start at the pack's 18 and 72 px (0.2.5);
    - both reconnecting captures: the bar's glyph at 24 px (0.2.2);
    - the rest differ only inside the room's picture, where the crew's idle motion was caught at another moment (seen through the sheet), and in the sending spinner's angle; 12 captures did not change.
    - No capture shows a footer while reconnecting; the probe's `footer` check measures it.
  - **Before:** `5ed5718e` (shell 0.2.1), with the same result as on `422e3f27` (shell 0.2.0) and `f902dc1a` (shell `e6b4a385`, kit 0.4.0); with 0.2.1 the check's footer at the Largest text on 320 × 568 takes a row per button.
  - **The setup:** the preview is bundled by Vite and served with the hosted game's production response headers, including the Content Security Policy, through the shared `design/tools/lib/component-check.mjs`. The headers' SHA-256 is `424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb`, the same as the other components'. The page keeps the browser's 16 px root, as the game does. Each part is mounted in the shell's sheet body, over the room scene, as Frontend would.
  - **Captures:** 75 of 75 pass, each drawing what its state asks: the part, the sheet, the tiles with their states and lines, the head and the note, the target bar and the chip, the rows and the picked one, who, the facts, the error, the stamp, the headline, the steps, the people, the notice, the footer, the banner, the refused taps, the tiles to a row and the list form's mark, and the room's crew behind.
    - 35 states at 390 × 844 and 430 × 932.
    - 320 × 568 (sheet 50); Large text, 150 %, at 390 × 844 (sheet 53); and the Largest, 200 %, at 320 × 568 for the tiles, the check and After Register (L3).
    - Concealed, no private word is in the page.
  - **The lifecycle probe** (`preview/probe.mjs`): 16 of 16 checks pass.
    - **As the page comes (15):** tiles, refused, t3, list, check, after, words, footer, unknown, inputs, private, focus, text, dispose and motion.
    - **With the device's Reduce motion emulated (1):** motion.
  - **The agreement with the pinned pack** (`preview/agree.mjs`): 26 of 26 frames agree, with no differing part.
    - **What is compared:** each frame drawn by the pack's own `screens-game.mjs` and `screens-more.mjs` beside the component, from the same fixtures:
      - the top bar, and the sheet's title, sub, place and footer;
      - the section head, and each tile's state, words, accessible name, boxes and look;
      - the line under the tiles, the target bar and the chip;
      - the list's group labels, rows and portraits;
      - who and the facts;
      - After Register's stamp, headline, detail, people and time line;
      - "Outcome unknown"'s notice.

      Every comparison is to within half a pixel, measured once the shell's sheet has finished sliding in.
    - **The frames:** 28 (the Doctor, the Hacker, the Undercover on another turn, registered and used); 27.2 (another player's turn, the check, registered); 29 (choosing in the room, the list, the check, registering, registered); 29.1 (Protection, Supply, the shot, Blackout); 29.2 (the private talk, Clone, the Engineer); the checks without a person (Blackout, Clone, Suppress navigation); 45 (Outcome unknown); 27.3 (Pass); and the Actions frames of 50 (320 × 568) and 53 (Large text). The pack's reasons go in as text, so no word is amended (L1).
  - **Page health:** no page errors and no failed requests. The one policy report is the known one, Zod's eval probe.
  - **Where the record is:** the captures and `check.json` are in `review/`.
- **Not run:** physical phones, Safari, screen readers, frame rate and the real app's connection.
