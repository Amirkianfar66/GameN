# Match connection: Designer's components in the match (release 3)

**Status (18 November 2026):** a draft for the Lead Designer's review, then Frontend's. It is not in the game yet, and it is not a release.
- Release 3 of the owner's plan of 16 November 2026. Its first step is Actions (#273), as the plan's order says; the other parts follow on this branch, each in its own commit.
- The Lead's order of 18 November begins with the Panels tab (#296), connected here: [The Panels tab](#the-panels-tab).
- It is stacked on the [shell connection](shell-connection.md): begun on #307's `8c64f77c`, with [Actions](actions.md) 0.2.2 (#273 at `80f6aa5a`) merged at `6c6b71d5`. #307's heads are merged: `03119bd7` at `9ba0858e`, `c19be75a` at `978a04a2`, `48e55eba` at `6ffcd610`, `aa46726c` at `e97df11a`, `aabb4417` at `5d3e4734` and `f81cd06a` at `6bcef045`: `phone-shell-0.2.12` with the phase bars and the final target bar, `component-kit-0.8.2`, `room-scene-0.5.1`, the phase-closed toast, the host sheet hook, and the game's sheet rules kept off Designer components in the sheet body. Actions 0.2.3 (#273 at `b1aac9d2`), with the Lead's changes and answers of 17 November, is merged at `1e723308`, and Actions 0.2.4 (#273 at `4b578961`), the Disabler's fixed bar without Cancel, at `a288f794`. #307's `99c20a18` is merged at `374e3b26`, and the panels component, `panels-0.1.0` (#296 at `61458f69`, recorded on shell 0.2.12 and kit 0.8.2), at `5fb2b94c`.
- Integration first approves the source fence's two new marked hunks. The changed files meet the pins the base already meets: `app.mjs` and `render.mjs`, and, through the drawing-port fence, `vite.config.mjs` (see [The gates](#the-gates)).

**What it is:**
- On a player's phone, Actions is Designer's Actions component (`actions-0.2.4`, with `play-parts-0.1.2` on `component-kit-0.8.2`), used as it is:
  - its parts in the shell's sheet body: the tiles, the List, the check, After Register, "Outcome unknown" and Pass's line;
  - its frames, target bars, chips and toasts in the shell.
- It replaces the game's Actions sheet, the generic check of Actions' commands, the "Outcome unknown" body and its two buttons, the Pass sheet's frame, the target bar's words for Actions' commands, and the pass toast's words.
- The Panels tab is Designer's panels component (`panels-0.1.0`, on `component-kit-0.8.2`), used as it is: its three views, Panels, Players and Round order, in the shell's one sheet. It replaces the tab's buttons, the Players lines and the Round order sentence.
- The look and the motion come from `design/`. The game keeps the data, the commands and the lifecycle.

## Files

| Path | What |
| --- | --- |
| `apps/game/hosted/planet/actions-input.mjs` | New, pure. It maps the presentation model to Actions' parts (`actionsPart`, `actionsTiles`, `actionsListGroups`), and to the shell's frames, bars, chips and toasts for Actions' steps (`actionsFrame`, `actionsTarget`, `actionsChip`, `actionsToast`), from the component's own helpers. It also holds this phone's own pick (`actionsFlow`, `holdActionsPick`), maps the taps to the controller's calls (`actionsHandlers`), decides what Cancel does (`actionsCancel`), and what the screen-reader step says at After Register (`actionsHeard`, A16) |
| `apps/game/hosted/planet/panels-input.mjs` | New, pure. It maps the presentation model to the panels component's frame (`panelsFrame`) and input (`panelsInput`): the view, this room's windows, every seat's public facts and the round's steps. It gives the part for the Panels tab's sheet (`panelsPart`) and maps the rows' taps to the game's panels (`panelsHandlers`) |
| `apps/game/hosted/planet/shell-input.mjs` | `shellSheet` gives the Panels tab's three views the component's one sheet (`panelsFrame`). `shellSheet`, `shellTarget`, `shellChip` and `shellToast` hand Actions' steps to it. `shellHandlers` routes Actions' footer ids (Register, Pass, Done, Retry the same, Check receipt, Cancel), its chips and the List's Back. The bar is untouched: the phase bars are the in-game animation builder's, merged from #307. So are the phase-closed toast, which `shellToast` gives before Actions' toasts, and the host sheet, whose footer, Back and Close come first |
| `apps/game/hosted/planet/render.mjs` | Mounts the sheet's Designer part, Actions' or the panels component, first in the shell's sheet body, with the game's remaining content after it (`syncSheetPart`). It updates the part on its input, and suspends, resumes and disposes it with the page and the sheet. Every choosing tap goes through Actions' handlers. At After Register the unseen step and checkpoint say the part's headline (A16). The Panels tab's buttons, the Players lines and the Round order sentence are gone |
| `apps/game/hosted/planet/room-scene-input.mjs` | The scene's targets mark this phone's pick at the check and while it sends, and the Disabler's fixed position |
| `apps/game/hosted/planet/app.mjs` | Imports `actions.css` and `panels.css` |
| `apps/game/hosted/vite.config.mjs` | Two marked hunks: Actions' two runtime files and the gameplay parts' two join `allowedSources`; then the panels component's two |
| `apps/game/test/planet-actions.test.mjs` | New: the steps, the frames and bars, this phone's pick, the parts' inputs, the taps, Cancel, privacy and the scene's marks |
| `apps/game/test/planet-panels.test.mjs` | New: the views and their sheet, this room's windows, every seat's public facts, the steps for each tuple, the part with the Food release's own words, and the taps |
| `apps/game/test/planet-phone-shell.test.mjs` | Follows the pass sheet, the check and the bars that are Actions' now, and the Panels tab's one sheet, `panels` |
| `design/tools/match-connection-check.mjs` | Release 3's check: the real app, under the production headers, at both phone sizes |
| `design/tools/shell-connection-check.mjs` | #307's check. Its `pass`, `actions`, `closed` and `course` states take #307's selector first, then release 3's (the Pass footer's `pass`; Actions' part and its Scan tile; the panels component's Navigation row) |
| `design/phone-ui/review/match-connection/` | The check's captures and `check.json`, and the merge gate comparison's `compare.json` |

The component's, the parts', the kit's and the shell's own files are used as they are.

## The steps

What each step gives the shell and the sheet's body. Every frame, bar, chip and toast is the component's own helper's.

| Step | The model | The shell | The sheet's body |
| --- | --- | --- | --- |
| The tiles | `panel: 'actions'`, no action | `actionsSheet()`: "Actions" and the viewer's room | `mountActions()`, then what stays the game's ([below](#what-stays-the-games)) |
| A person | the action at `targets` | no sheet; `targetBar()`: "Rescue · Choose a player", on the board "· every room", Supply's "Choose the second player"; `targetChip()`: "Other rooms · n" in the room, "List" on the board | none |
| The List | the same, with the board's List open | `targetListSheet()`: "Choose from a list", with Back | `mountTargetList()`: by room, the viewer's room first |
| The check | `confirm` | `checkSheet()`: Cancel and "Register Rescue", usable as `canConfirm` | `mountActionCheck()`: this phone's pick, with its room, and the facts |
| Registering | `sending` | `checkSheet({ phase: 'sending' })`: Register busy, "Registering…" | the check keeps what it showed: it is given its status only |
| Accepted | `accepted` (one revision) | `afterSheet()`: Done | `mountAfterRegister()`: REGISTERED, ACCEPTED (Private talk), ACTIVE (Clone) or CAPTURED (Suppress), and the handoff's words: Frontend's line where its copy has one, the component's `afterWords()` for the rest and for the time line, from the round, and the names from this phone's own pick ([After Register](#after-register)) |
| Hack Ship and Blackhole accepted | `accepted` | the toast `registeredToast()`: "Blackhole registered"; the tiles, if Actions is open (L7) | the tiles, the tile REGISTERED |
| No answer came | `recovery` | `unknownSheet()`: "Retry the same" and "Check receipt", usable as `canRetry` and `canCheck` (the component's own flags since 0.2.3), Check busy while it asks, Retry busy while it resends | `mountOutcomeUnknown()`: "Rescue Crew 3 was sent, but no answer came back." from this phone's own send; "Pass was sent, …" and "Position A3 was sent, …" too (0.2.3) |
| Pass | `PASS_TURN` at `confirm` or `sending` | `passSheet()`: Cancel and Pass, Pass usable as `canConfirm` (its `canPass`, 0.2.3) | `mountPassNote()`, with no line (B6) |
| Passed | the view shows the turn has moved past the viewer (the pass's phase has ended, or another seat is active), once this phone's `PASS_TURN` has settled, with its `accepted` step or without one | no sheet; `passedToast()`: "Turn passed", with or after the view that moves the turn on, never before it | |
| Move | `MOVE` at `slots` (the tile chose the viewer's room) | no sheet; `moveBar()`: "Move within Room B" with "Choose an empty position · or another room on the Board"; `moveChip()`; on the board, "Move · uses this round’s move" | none; the scene's positions |
| Move's check | `MOVE` at `confirm` | `checkSheet({ type: 'MOVE' })`: "Register move" | the check: "Move to B5", "Room B", the fact |
| Moved | the board has the viewer at the picked position, once this phone's `MOVE` has settled, with its `accepted` step or without one | no sheet; `movedToast()`: "Moved to B5", with or after the view that moves the viewer, never before it | |
| The Disabler's position | `SELECT_BLACKOUT_SLOT` at `slots`, then `sending` and `accepted` | no sheet; `blackoutBar()`: "Choose a position · Room A · any position, even empty", under the phase bar's "Blackout · Dark · positions fixed" | none; the scene's positions in the dark, the tapped one marked once sent |
| Fixed | no action, `blackoutTargeting.selectedSlotId` | no sheet; `blackoutBar({ fixed })`: "Position A3 fixed · Resolves after the window · no effect shown now", with no Cancel (`actions-0.2.4`, [below](#the-taps)) | none; the position marked |

- **The tiles** come from the model's offers under Actions. A role's own tile shows while the server offers it, then Move, Private talk and Shoot, which every role has (sheet 28's order). The three are unavailable unless offered, saying "Not available now" (T3). The role, the tiles' lines and Rescue's badge are not in the model under Actions (A7, B3).
- **The facts** are the game's own words after its confirmation's question (`planetConfirmation`), until Frontend's copy (B7): "Entering or repositioning spends this round’s movement.", "This spends its global lifetime use and this round’s Role Action." Rescue's confirmation is a question alone, so its check has none.
- **After Register's words** are the handoff's ([After Register](#after-register)), never the model's "Registered. Resolution is pending.".
- **Concealed, and while reconnecting:** the shell drops the sheet, so the part is disposed with it. While reconnecting the controller withholds the panel and the action, so the sheet closes. Actions opens again from its tab once the match is current. No input is kept for it (the Lead's answer b): the parts would take `{ status: 'stale' }` alone if their sheet stayed, and with this controller it does not.

## This phone's own pick

The model does not carry what this phone picked once the check opens (A2):
- `selected` is empty for a one-person action, and for any action while it sends;
- a move's position is only in the controller's draft;
- the recovery after a send names no command (A4).

So the connection holds this phone's own pick:
- The pick is the person or the position tapped, Supply's two people from the model's selection, and a move's room.
- It is held while the model's action is that command, in that phase, match and seat.
- It is held through the "Outcome unknown" that follows this phone's own send. The controller keeps one unsettled command until it settles, so that recovery is that command.
- It is dropped when the action ends, when the page is hidden, and for a new viewer or match.
- It names the person or position in the check, "Outcome unknown" and "Moved to B5", and marks them in the scene.
- A move is held a little longer, within its phase: "Moved to B5" waits until the public board has the viewer at the position (the Lead's question, 17 November). The controller gives the accepted step only when the receipt comes before the next view, for one revision (A5), so the view that moves the viewer can come after it or instead of it. A rejected move, or the phase ending, drops it with no toast.
- A pass is held the same way (the Lead, 17 November): "Turn passed" waits until the view shows the turn has moved past the viewer, that is, the pass's phase has ended or another seat is active. A pass ends its turn's phase, and the controller clears an in-flight send at a phase change, so that view can come after the accepted step or instead of it. It is said once (its id is the pass's phase) and kept through the phase it was said in. A rejected pass, still the viewer's turn, ends with no toast.

It is this phone's own tap, not data from the server. A model that carries the command (A2, A4) would replace it.

An "Outcome unknown" this phone did not see sent has nothing to name, so its body is empty (A4). That happens after a reload, after a hidden page, or when Actions was closed while it sent. The title and the two buttons still show.

## After Register

The Lead's change of 17 November: the handoff's [After Register](../phone-ui-handoff.md#after-register) table, never the model's generic "Registered. Resolution is pending." (#222 item 12).
- **Frontend's copy where it has the line,** from `en` in `@mothership/presentation`, which the fence already admits: `acceptedTarget` and `acceptedDetail` for Rescue, Protection and a shot, `compound.supplyAccepted` and `supplyDetail` for Supply, and `acceptedDetail.hack` for the private talk's detail (the Lead's answer, 17 November). For example "Rescue of Crew 3 registered." and "This is not a result. Registered actions are resolved at the end of the round."; the private talk's "The phase shown at the top of this screen says what happens next."
- **The component's `afterWords()`** (`actions-0.2.4`) for the rest: Blackout, the private talk's headline (in the pack's name), the Clone and the Engineer. It also gives every time line, from the round the server reports: "Registered · Round 6 · your turn", then "End of Round 6 · Rescue is resolved, after the attacks".
- **Who:** the accepted action names no one (A2), so the names are this phone's own pick, as at the check: the display name, or "yourself". Without the pick, the headline is Frontend's "The server accepted your action.", with no time line (L6).
- **What the model lacks stays out,** as the Lead accepted on 17 November. The Actions panel's private area carries no `abilities` (A15, which the Lead takes to #222), so there is:
  - no Clone end: "Active from now. It used your main action for this round.";
  - no Protection start: no "Round 7 · Protection for …: active" step;
  - no capture: "Captured now: the players in the other room. …", with no captured players.

## The taps

| Tap | Call |
| --- | --- |
| A tile | `begin(type)`. **Move:** `dismiss()`, `begin('MOVE')`, then the viewer's room, `choose(room)`, so its positions are offered in the room (sheet 20) and the move ends with no sheet (Q2). If Move is no longer offered: back to the tiles |
| A person in the scene, on the board or in the List | held, then `choose(seat)` |
| A move's position | held, then the room and the position: `choose(room)` and `choose(slot)` (the plan's answer a). A position in another room than the one chosen begins the move again from the rooms |
| A board room's caption | `begin('MOVE')` and `choose(room)`, so another room can be chosen after the first |
| The Disabler's position | held, `choose(slot)`, then `confirm()`: one tap, as sheet 30 draws it. The controller checks the offer before it sends |
| Register, Pass | `confirm()` |
| Done | `dismiss()` |
| Retry the same, Check receipt | `retry()`, `checkReceipt()` |
| Cancel on the bar | back to the tiles: `openPanel('actions')`, the Disabler's choosing bar too (T2). The fixed bar has no Cancel: the engine offers no second position once one is fixed (`packages/engine/src/planet-game/offers.ts:22`, `commands.ts:73`), so Cancel could not go back to choosing. `actions-0.2.4` gives that bar `cancel: false`, which shell 0.2.12 draws without Cancel: the owner approved this departure from sheet 30 on 17 November ("remove the Cancel in Blackout", recorded on #280 at `f0066a7c`) |
| Cancel in the check | back to the tiles; a move back to choosing, with nothing picked (Q1). While it sends, back to the tiles: it recalls nothing (L5) |
| The chips | "Other rooms · n" and "Other rooms on the Board": the board view. "List": the List; its Back closes it. The List has no ✕ (`close: false`, sheet 29), so the shell never sends its Close; Escape, the shell connection's, dismisses whatever is open, as Close does |

Nothing here works out who may act. Every usable control comes from the model's offers and its `canConfirm`, `canRetry` and `canCheck`.

## What stays the game's

- **In the Actions sheet, after the tiles,** until each one's component comes:
  - Food's Tasks;
  - the registered ballot (Vote);
  - the Captain's plates (the Captain console);
  - the private claim (the private talk);
  - the offers that are no tile of Actions': the Officer's Appoint and Block, the ballot and the declaration.
- **The Hacker's Scan and final Code:** their tiles are Actions'; their flows stay the game's until the Hacker's step.
- **The other commands' flows:** the ballot, the declaration, the Promises, the windows, the Officer's and the Captain's.
- **The dark Actions sheet:** "People and windows are hidden." and its "Choose fixed slot", from which the Disabler starts choosing.
- **The status line in the cover:** a rejection's words and the game's messages. While Actions' "Outcome unknown" is open it hides, so the notice says it once (the Lead, 17 November).
- **The screen-reader facts** the shell connection keeps unseen: the offices, the shared checkpoint and the current step (`#ms-action-step`). At Actions' After Register the step and the checkpoint say the part's headline, as drawn, not the model's "Registered. Resolution is pending." (A16, the Lead's option 1, 17 November). Elsewhere they keep the game's words.

## The Panels tab

Step 1 of the Lead's order of 18 November. The Panels tab is Designer's panels component (#296, `panels-0.1.0`, on `component-kit-0.8.2`), used as it is, with the Lead's seven answers on #296.

| The game's panel | The component's view | The shell's sheet (`panelsSheet`) |
| --- | --- | --- |
| `panels` | `list` | "Panels" with ✕, at the shell's own height |
| `players` | `players` | "Players" with Back and ✕, large |
| `round-order` | `round-order` | "Round order" with Back and ✕, large |

- **One sheet** for the three, id `panels` (answer 1), so the shell keeps its body and the part is updated with the view. Back from Players and Round order is the shell connection's: it opens Panels.
- **The part** is mounted in the shell's sheet body in Actions' slot (`syncSheetPart`), and disposed when the sheet closes: on ✕, for another panel, when concealed, and while reconnecting, when the controller withholds the panel, as for Actions. So the component's reconnecting state (answer 6) is not reached in the game; the shell's status reaches it all the same.
- **In the dark** the tab stays the game's "Blackout" sheet, as before.

### Its input

Everything comes from the model; the connection works nothing out.

| Input | From |
| --- | --- |
| `viewer` | This phone's seat number (`ownSeatId`), for "(you)" |
| `windows` | `{ enabled: true, reason: null, rooms }`: the pairs of the presentation's `PLANET_WINDOW_ENDPOINTS` that name the room the public board has the viewer in. Off the board, or in the Command Room, none, so the row says "No window here" (answer 3). Whether a window is open is the Windows panel's |
| `navigation`, `hospital` | `{ enabled: true, reason: null }`: every row opens, as today's buttons did, and the panel says who can use it. The model says nothing of who can open them outside those panels (P1) |
| `players` | Every seat on the public board, in seat order: the seat number, the identity's name and character (with no name, "Player 9"), the room, health and jail, and the Captain and Officer from `offices`. Nothing else: the component refuses any other key, so no role or revealed faction reaches it (answer 4) |
| `steps` | The game's own words for the round in this tuple's order (`planetRoundOrderText`), one step each, with its kind for the icon and no timing: the game has no words for one (P2) |
| `status`, `reducedMotion` | The shell's status, and the device's Reduce motion |

### The taps

Each row reports `onOpen(destination)`, and the connection opens the game's own panel (`openPanel`), as the buttons did. Windows, Navigation and the Hospital panel stay the game's panels until their own steps; Players and Round order are this sheet's views. Nothing is sent.

### What stays the game's

- **Food's Tasks button,** after the list, in the frozen Food release (answer 7).
- **Players while players are away** on the Food Supply Task: the game's own lines ("Away on the Food Supply Task"), which the component does not draw (answers 4 and 7). The list and Round order stay the component's then.

## The boundary

- **The hunk.** Marked `BEGIN Actions connection` / `END Actions connection` in `apps/game/hosted/vite.config.mjs`. It adds four entries to `allowedSources`: `actions/actions.mjs`, `actions/actions.css`, `play-parts/play-parts.mjs` and `play-parts/play-parts.css`. The kit is admitted by the shell's hunk. Nothing else; their `preview/` and `review/` are never imported.
- **How it was checked.** The hosted Planet entry was built with the config's own fence and Firebase registry plugins, and without the release plugins, which refuse first:
  - with the hunk, it builds;
  - without the `actions.mjs` entry, the fence refuses `actions.mjs`; without `actions.css`'s, that file; without `play-parts.mjs`'s, that file;
  - **without `play-parts.css`'s, it still builds.** `actions.css` imports it with `@import`, which the fence does not see, as the shell connection's page found for `kit.css`. The entry is there.
- **The Panels hunk.** Marked `BEGIN Panels connection` / `END Panels connection`, after Actions'. It adds two entries: `panels/panels.mjs` and `panels/panels.css`. The kit is admitted by the shell's hunk; the component's `preview/` and `review/` are never imported. Checked the same way, on `9c0e15bf`:
  - with the hunk, the hosted Planet entry builds;
  - without the `panels.mjs` entry, the fence refuses `panels.mjs`; without `panels.css`'s, it refuses `panels.css`, which `app.mjs` imports directly, so the fence sees it.

## The gates

- **`npm run check:sources`** refuses `app.mjs` first ("Food consumer source: content differs"), as on the base.
  - It was also run on throwaway copies of `4367f7e0` and of `9ba0858e` with `app.mjs`, `render.mjs`, `phone.css` and `planet.css` back at `origin/main`, the four files the base's pins name. There it passes.
  - So this change pins no new file: `check:sources` accepts the new hunk, `actions-input.mjs`, the changed mappers, the tests and the check.
- **The other pins** the shell connection's page names fall on the same files: the hosted build's `reviewed-crew-drawing-release` on `app.mjs`, and the drawing-port fence on `vite.config.mjs`, which the room and shell connections' hunks already changed. They were not re-run here.
- **These pass:** `typecheck`, `build`, `check:toolchain`, `check:workspace`, `node design/tools/check-assets.mjs` (15 of 15), and the game's tests, 881 of 881 on `9c0e15bf` (the shell connection's 864, Actions' 11 and the Panels tab's 6), with the production-exclusion scan. Before: 875 of 875 on `31430b8b` and on `e49cd1cd`, and 871 of 871 on `1e723308`.
- `check:sources` was run again on `7cdf0917`, with the base's four pinned files back at `origin/main`: it passes, so the Panels tab pins no new file. The design and tooling suites fail only on the pin the base already meets: every failure, 25 of 423 and 68 of 356, is "Food consumer source: content differs: apps/game/hosted/planet/app.mjs", as on `31430b8b`. The panels component's own test passes in the design suite.

## Evidence

### Tests

`apps/game/test/planet-actions.test.mjs` passes 11 of 11. The component's own checkers (`checkActions`, `checkTargetList`, `checkActionCheck`, `checkAfterRegister`, `checkOutcomeUnknown`, `checkPassNote`) and the shell's (`nextPhoneShellInput`) accept every input built there. It covers:
- the tiles: the role's own while offered, the three every role has, the order, and the states;
- every sheet: the List, the check (and while it sends), After Register, Pass, "Outcome unknown" and its Retry busy;
- the bars and chips: a person, Supply's second, a move's position, here and elsewhere, off the board, the Disabler's position and its fixed bar, with no Cancel;
- the toasts;
- "Turn passed" once the view has moved the turn on: with the receipt first (none at the receipt or over a view that is still the viewer's turn, then once), another seat active in the same phase, a later phase with the viewer active again, with the view first, not accepted, and a later phase dropping it; the shell's input with this phone's flow;
- this phone's pick, through "Outcome unknown", and dropped when it should be;
- the parts' inputs: After Register's lines and time line for every action of the handoff's table, through this phone's taps, the viewer as "yourself", and none without the pick; Pass's and the Disabler's position's "Outcome unknown";
- the taps: Move's replay, the Disabler's one tap, and nothing after dispose;
- Cancel, and the shell's routing of every new id;
- "Moved to B4" once the board has the viewer there: with the receipt first (no toast over the old board, none after a view that has not moved the viewer, then once), accepted with the view already moved, with the view first (nothing while it sends), not accepted, and the phase ending;
- the screen-reader step at After Register (A16): the part's headline, with and without the pick and for the Engineer, and none at the check, with no frame, on a display or for Blackhole's toast;
- privacy: concealed and on a display, none of it;
- the scene's marks.

`apps/game/test/planet-panels.test.mjs` passes 6 of 6. The component's own check (`nextPanelsInput`) and the shell's accept every input built there. It covers:
- the three views and their one sheet, the shell's sheet for them and for every other panel, and none on a display, concealed, in the dark or with a closed phase;
- the Windows row in each room, off the board and with no seat, and the other rows enabled with no reason;
- Players: every seat in seat order with exactly the eight keys, the offices, "Player 9" with no identity, the component's lines, "(you)", and no role, faction or offer in any view's input;
- Round order for the Blackout, Food, earlier and unknown tuples: the game's words and order, each step's kind with its icon, and no timing;
- the part: keyed once for the three views, only for the Panels tab's sheet, the status and Reduce motion, and the game's own Players words while players are away on the Food Supply Task;
- the taps: the five destinations opened, nothing else, and nothing after the page has gone.

**A mutation run** made 73 changes to the connection's source, each restored from its saved bytes. Every one is caught by the four connection test files (Actions', Panels', the shell's and the room scene's), on `7cdf0917`.
- It adds 27 on the Panels tab: the views, the frame, the windows' rooms and the viewer's seat, the offices, the seat order, the names, jail, health and character, the steps' kinds, words and timings, the status, Reduce motion and the viewer, every row enabled, the Food guard (dropped, and widened to every view), the sheet's guard, the taps' destinations and their two `live()` checks, and the shell's sheet.
- The earlier 46, on `31430b8b`, are below.
- It adds eight: seven on the pass's toast (each of the turn's two signs, the phase it is kept in, the view first, the wait after the accepted step, the toast at the receipt, and the toast's id) and the fixed bar's Cancel. The phase sign was missed until `31430b8b`'s case of a later phase with the viewer active again.
- The run of 38, on `e49cd1cd`, added six on the move's toast: the toast itself, the toast before the board shows it, the board's check, the wait after the accepted step, the accepted step already moved, and the position's match. The old toast mutation, and two whose lines moved, now point at the new lines.
- The run of 33, on `04500fd0` and again on `a890057a`, added A16's two (the headline's source, and the frame it is limited to), and four on the lines new in the merge of #307's `aabb4417`: the closed phase passed to the toast, the closed toast first, and the host sheet's footer and Back first.
- The run of 27, on `aef40283`, added the Lead's changes: After Register's words and time line (Frontend's headline and detail, the private talk's detail, the round, the pick, the viewer as "yourself", Supply's order), the flags `canRetry`, `canCheck` and `canPass`, and the positions of Pass's and the Disabler's "Outcome unknown".
- Two of the earlier 20 fell with the code they changed (the connection's own `usable()`, which `actions-0.2.3`'s flags replace).
- The earlier runs, of 20, were on `4367f7e0` and again on `9ba0858e`. The first run missed one, Retry's busy "Outcome unknown"; its test is `4367f7e0`.

### The check

`GAMEN_PHONE_ART_BASE=<clean worktree of origin/main> node design/tools/match-connection-check.mjs`:
- It builds Frontend's phone harness from this tree, with art from origin/main.
- It serves it with the hosted game's production headers (`createHostedPreviewHeaders`, headers SHA-256 `424e5dec…`, the shell's and the room scene's).
- It drives the real app at 390 × 844 and 430 × 932.

**Result:** 42 of 42 captures pass: twenty-one states at both sizes, recorded on `9c0e15bf` (the Panels tab) with the source clean and the art from `64e55516`, in one run. Origin/main is now `7574bfe5`, which changes only `AGENTS.md` and the roster; the art base is in its history.
- **Against the record on `31430b8b`:** every recorded field of the 36 earlier captures is the same, but for the bundle's file name in the known Zod report, the new `panels` field (null), and the clock in `390x844-blackout` and `390x844-moved` (0:08 and 0:55, where they read 0:09 and 0:56). `concealed` is byte for byte the same at both sizes. The other pictures differ in the room's ambient motion, which shows through the sheet's glass at its top edge, and in the clock.
- **The record on `31430b8b`, against the one on `e49cd1cd`:** every recorded field of the 36 captures is the same, but for the bundle's file name in the known Zod report, the clock in `430x932-blackout` and `430x932-moved` (0:08 and 0:55, where they read 0:09 and 0:56), and these:
  - `blackout-fixed`: no Cancel in the bar or on the page, and its new check (`noCancel`) passes;
  - `blackout`: its Cancel, now recorded (`cancel`);
  - `pass`: no toast at the receipt (`notBefore`), then "Turn passed" with the next turn, another seat's (`turnMoved`).
  `concealed` is byte for byte the same at both sizes. The other pictures differ in the room's ambient motion, and `blackout-fixed` also in its bar.
- **The record on `e49cd1cd`, against the one on `6bcef045`:** every recorded field of the 36 captures is the same, but for the bundle's file name in the known Zod report, the viewer's place (now recorded) and `moved` at both sizes. There the receipt over the old board gives no toast, with the viewer at Room B B1; the toast comes with the view that has the viewer at B5, Pass live again and the room's Windows control back, as once the accepted step has passed. 2 are byte for byte the same.
- **The record on `6bcef045`, against the one on `7d1e51cc`** (before `f81cd06a`): every recorded field of the 36 captures is the same, but for the bundle's file name in the known Zod report and `430x932-blackout`'s clock (0:09, where it read 0:08); 2 are byte for byte the same. Pixel by pixel, Actions' sheets are unchanged: the game's sheet rules had not reached its parts. What differs is the room's ambient motion (the windows' voyage, a blink).
- **The record on `7d1e51cc`, against the one on `1e723308`:** 2 captures are byte for byte the same, and every recorded field of the 36 is the same, but for the bundle's file name in the known Zod report and these:
  - the hidden checkpoint, now recorded;
  - `rescue-after` and `suppress`: the hidden step and checkpoint say the headline, and their new checks pass;
  - `430x932-blackout`: the phase bar's clock read 0:08, where it read 0:09.
- **Before:** the record on `1e723308`, against the one on `cf7e72d1` (the Lead's changes 1 and 2): every recorded field of the 36 captures the same, but for the bundle's file name in the known Zod report; 2 byte for byte the same.
- **Earlier records,** on `9ba0858e` (before the Lead's changes) and on `4367f7e0` (before #307's head was merged), also passed 36 of 36.

| State | What it shows and checks |
| --- | --- |
| `tiles` | The Hacker's tiles: Scan, Final Code and Move usable; Private talk and Shoot "Not available now", taking no tap; "Your turn · Round 6"; "Actions · Room B". The part first, no game body |
| `rescue` | The Doctor's Rescue: the bar "Rescue · Choose a player" with Cancel, Crew 3 offered in the Hospital, no sheet, Pass kept (T2) |
| `rescue-check` | "Check and register": "Rescue Crew 3", "Player 3 · Hospital", the portrait, Crew 3 marked in the scene, Cancel and "Register Rescue", nothing sent. Then Cancel returns to the tiles |
| `rescue-after` | Register sends `RESCUE` for seat-3; REGISTERED with "Rescue of Crew 3 registered.", "This is not a result. Registered actions are resolved at the end of the round.", and the time line "Registered · Round 6 · your turn" → "End of Round 6 · Rescue is resolved, after the attacks"; nothing drawn on the target, and no "Resolution is pending" on the phone. The unseen step and checkpoint say "Rescue of Crew 3 registered." (A16). Then Done closes it |
| `unknown` | No answer: "Outcome unknown", "Rescue Crew 3 was sent, but no answer came back." and "Check before doing anything else.", Retry the same and Check receipt, and no status line under the bar (one message). Then Retry resends the same command id, and it registers |
| `list` | Rescue offered in three rooms: on the board, "Choose from a list", "Rescue · everyone you can reach", Room A, Room B and the Hospital. Then a row opens its check |
| `other-rooms` | The same in the room: "Other rooms · 2"; then the chip goes to the board, its bar "every room" and the List chip |
| `suppress` | "Suppress navigation · Only you see this", no portrait; then CAPTURED, "Navigation suppressed.", "Captured now: the players in the other room. …" and its two steps; the unseen step and checkpoint say "Navigation suppressed." |
| `blackhole` | "Activate Blackhole" with its fact; then the toast "Blackhole registered" over the tiles, the tile REGISTERED, no After Register |
| `move` | The Move tile: Room B's position B5 in the room, "Move within Room B · Choose an empty position · or another room on the Board", "Other rooms on the Board" |
| `move-check` | "Move to B5", "Room B", "Entering or repositioning spends this round’s movement.", B5 marked, "Register move". Then Cancel returns to choosing with nothing picked |
| `moved` | Register sends `MOVE { destination: 'Room B', slotId: 'B5' }`. The harness answers with an accepted receipt and moves no one, so the check plays the server's part: over the old board (the viewer at B1) there is no toast; then the view with the viewer at B5 brings "Moved to B5", with no sheet |
| `move-board` | On the board: "Move · Choose an empty position · uses this round’s move", B5 and the Command Room's caption. Then that caption and C1 open "Move to C1" |
| `pass` | "Pass your turn?" with Cancel and Pass; then `PASS_TURN` once. The harness answers with an accepted receipt and keeps the turn, so the check plays the server's part: at the receipt there is no toast; then the next turn's view, another seat's, brings "Turn passed", with no sheet |
| `blackout` | The dark Room A: "Choose a position · Room A · any position, even empty" under the phase bar's "Blackout · Dark · positions fixed", and five positions, Cancel on the bar. Then one tap of A3 sends `SELECT_BLACKOUT_SLOT` for A3, the bar kept, no sheet |
| `blackout-fixed` | Once the view has it: "Position A3 fixed · Resolves after the window · no effect shown now", with no Cancel, A3 marked |
| `reconnecting` | Actions open, then the reading fails: the banner, the sheet closed, no tile left |
| `concealed` | The page hidden at Rescue's check: no part, name or check words left, no target |
| `panels` | The Hacker's Panels tab in Room B: "Panels" with ✕, the part alone in the body, its five rows with their lines, "Room A ↔ Room B · Room B ↔ Jail", "Captain and Officer only", "Patients only", "Seats, rooms and public status" and "Phases and timings", each with its icon and chevron, none dimmed; the tab open, nothing sent. Then Windows opens the game's Windows panel, and its Back returns to the list |
| `players` | With the Captain (Crew 1), the Officer (Crew 7), Crew 3 injured in the Hospital, Crew 8 in the Jail and Crew 9 eliminated: "Players" with Back and ✕, the nine seats in order with their portraits, "6 · Crew 6 (you)", the lines "Hospital · Injured", "In Jail" and "Eliminated", the two badges, and the note. No word of a role or faction, though this phone's is the Hacker, who knows the Undercover. Then Back returns to the list |
| `round-order` | "Round order" with Back and ✕: the Blackout rules' nine steps in the game's words, from "Player turns" to "Navigation", with their kinds and icons, no timing and no note. Then ✕ closes the sheet |

Each capture also passes with:
- the shell mounted and the stage in it;
- none of the old chrome or recovery buttons;
- no unexpected policy report (only Zod's known, caught eval probe);
- no failed request and no page error.

The harness answers a command at once, so "Registering…" is not drawn here; the component's own check draws it.

### The merge gate's comparison

`design/tools/phone-ui-native-compare.mjs --only pass,actions,targeting,target-check,registered,clone,blackout,reconnecting,panels,players,round-order`:
- The build is the check's own bundle (`--keep`): it names `9c0e15bf`, clean, with art from `64e55516`. The pack is read at `278215bc`, the record's commit, clean.
- **Panels, Players and Round order** (sheet 32) join the eight parts. The tool's steps reach the component's rows by their words ("Players", "Round order").
- Against the comparison on `31430b8b`, every field of the eight earlier parts is the same; only the build's folder and commit, the pack's commit and the time differ. Before that, against the comparison on `e49cd1cd`, the same held. None of its parts shows the fixed bar: the check's `blackout-fixed` does.
- Every part was drawn with no problem met, the steps reaching Actions' tiles, the scene's person, the footer's Register and the Panels tab's rows.
- Its `compare.json` is in `design/phone-ui/review/match-connection/`; its pictures stay outside the repository.
- **In the pairs:** the tiles, the bar, the check, After Register and "Pass your turn?" take the pack's form in the pack's places. After Register now has the pack's headline, detail and time line: "Rescue of Crew 3 registered.", then "Registered · Round 6 · your turn" and "End of Round 6 · Rescue is resolved, after the attacks". The differences are listed next.
- **In the Panels pairs:** the list, Players and Round order take the pack's form in the pack's places: the five rows with their icons, lines and chevrons, the gap between the two lists, the portraits and badges, the note under Players, and a row per step. The differences are listed next.
- **`clone` (29.2)** is the tool's own steps, which open the Card: it shows no Clone. The connection's Clone words are in the test (the shorter line, A15), and Actions' own check draws the Clone's After Register.

### Differences from the pack

- **The tiles:**
  - no role in the sheet's line, and no line under an available tile ("2 injections", "Once a round") or badge (A7, B3);
  - a role's own tile the server does not offer is not shown, where T3 shows it unavailable (A7: the role is not under Actions);
  - unavailable tiles say "Not available now" (B1).
- **The check:** the facts are the game's confirmation words where it has any (B7); Rescue's has none.
- **After Register:** the handoff's words. What the Actions panel's model lacks stays out (A15): the Clone's end, Protection's start, and the Engineer's capture and its players.
- **Pass:** no "The turn goes to Eli · Player 5" (B5), and no "Your move stays open…" line (B6).
- **The Disabler's fixed bar** has no Cancel, where sheet 30 draws one: the owner's approval of 17 November, recorded on #280 at `f0066a7c` ([The taps](#the-taps)).
- **The Disabler** starts from the dark Actions sheet's "Choose fixed slot". In sheet 30 the positions are offered as the dark begins, with no tap; the controller offers them only after `begin('SELECT_BLACKOUT_SLOT')`.
- **The Panels tab:**
  - Navigation and the Hospital panel are not dimmed for a passenger, where the pack dims them: every row opens, as today, until the model says who can open them (P1). The component dims a row whenever it is given `enabled: false` (answer 2).
  - Round order: the game's step words for the tuple, not the pack's ("Player turns", where the pack says "Turns"), no timings (P2), and no note (answer 5).
- The harness's sample names, rooms and rounds; the pack's 47 and 34 px safe areas.

## Gaps, for #222 through the Lead

The connection works around none of these by inventing data. Where it holds this phone's own pick instead, it says so above.

| | Gap | Who |
| --- | --- | --- |
| A1, B1 | No unavailable reasons in the offers: "Not available now" | Backend, Frontend |
| A2 | The check's person, and a move's position, are not in the model once chosen. Held from this phone's tap here | Frontend |
| A3 | No rejected step: the controller drops the draft, so the check cannot stay open with its error (L6). The status line says it | Frontend |
| A4 | The recovery names no command, person, position or id. Named here from this phone's own send only; otherwise "Outcome unknown" has an empty body | Frontend |
| A5 | Accepted lasts one revision, so After Register closes itself at the next view, and the controller gives it only when the receipt comes before the next view. Move's and Pass's toasts wait for the view instead: the board with the viewer there, the turn moved on. After Register's stamp, and Blackhole's and Hack Ship's toasts, cannot be read from the public view: they need the controller to keep the accepted step when a newer view arrives first. High priority for the human test: "a player who registers an action must see 'Registered', every time" (the Lead, 17 November) | Frontend |
| A6, B5, B6 | Pass: no next player; `movementSpent` only under Card | Backend, Frontend |
| A7, B2, B3 | Under Actions: no role, no injections count, no tiles' lines | Frontend |
| B7 | The check's facts are Frontend's copy | Frontend |
| A8 | A draft ends at every phase change, and each turn is a phase | Frontend's call |
| A11 | No back step: Move's Cancel begins it again | Frontend |
| A12 (new) | The Disabler's positions need `begin('SELECT_BLACKOUT_SLOT')`; sheet 30 offers them as the dark begins | Frontend |
| A13 | Done in `actions-0.2.3` (#273, merged here): "Outcome unknown" names Pass and the Disabler's position | Designer |
| A14 | Done in `actions-0.2.3`: `canRetry`, `canCheck` and `canPass` | Designer |
| A15 (new) | The Actions panel's private area carries no `abilities`: After Register has no Clone end, Protection start or capture | Frontend |
| A16 | Done here (the Lead's option 1): at Actions' After Register the screen-reader step and checkpoint say the part's headline. The model's generic prompt itself stays Frontend's `planetRegistrationText`, on #222 | Frontend, for the prompt |
| P1 (new) | The model says nothing of who can open Navigation and the Hospital panel outside those panels, so their rows are never dimmed (the Lead's answer 2 on #296: only Frontend's `enabled` decides). Every row opens, as today | Frontend |
| P2 (new) | The round's steps are one sentence (`planetRoundOrderText`), with no timing. Given as steps with their timings, in the ruleset's order, Round order would show them (answer 5) | Frontend |
| P3 (new) | Frontend's earlier development captures (`apps/game/dev/phone/capture.mjs`, `round-order-capture.mjs`, `food-ordinary-compare.mjs`) look for the old navigation and Panels buttons, which the shell connection had already removed. None runs in CI; they are not changed here | Frontend |

## Behaviour changes, for Frontend's review

- **The Actions sheet** is the tiles, then what stays the game's. "No action is currently offered." and "Your fixed selection: A3." are gone: the tiles and the Disabler's bar say them.
- **A move:**
  - the tile closes Actions and opens the viewer's room's positions in the room view; until now a move went to the board;
  - a board caption begins the move again on its room, so a second room can be chosen;
  - its check's Cancel returns to choosing.
- **The target bar's Cancel, and the check's,** return to the tiles; until now they closed everything.
- **The Disabler's position** is fixed with one tap, and its fixed bar has no Cancel; until now it had a confirmation and Register.
- **"Outcome unknown"** is the component's notice, with Retry the same and Check receipt in the footer; until now it was a line and two buttons in the body.
- **After a pass,** the toast says "Turn passed", with or after the view that moves the turn on; until now it gave the model's words at the accepted step, which a pass's own phase change can skip.
- **The Panels tab** is the panels component:
  - the list's rows say what each destination shows or who can use it, with the room's windows;
  - Players has portraits, "(you)" and the Captain and Officer badges. "In Jail" takes the room's place, where it read "Jail · … · Detained". An eliminated player with no room reads "Eliminated", where it read "Off board · Eliminated". Players opens large;
  - Round order is a row per step, with its icon; "Follow the current phase and the server clock." is gone (answer 5).

## Open

- **For the Lead:**
  - the gaps above, for #222;
  - P1 and P2, for #222;
  - the `closed` and `course` states of #307's check, which this branch doubles like `pass` and `actions` (for #307 to take: the Bars & Icons builder's since 18 November);
  - the empty "Outcome unknown" when this phone did not see the send (A4): a model change, or a type-less specimen ("Your action was sent, …"), which would be new words for the Lead and the owner;
- **For Integration:**
  - the two fence hunks, Actions' and the Panels tab's;
  - the fence not seeing `play-parts.css`'s `@import`;
  - the pins on `app.mjs` and `render.mjs`, and the drawing-port fence on `vite.config.mjs`, which the base already meets.
- **For Frontend:** the review, chiefly the behaviour changes, A2's held pick and the gaps.
