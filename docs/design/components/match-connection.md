# Match connection: Designer's components in the match (release 3)

**Status (17 November 2026):** a draft for the Lead Designer's review, then Frontend's. It is not in the game yet, and it is not a release.
- Release 3 of the owner's plan of 16 November 2026. Its first step is Actions (#273), as the plan's order says; the other parts follow on this branch, each in its own commit.
- It is stacked on the [shell connection](shell-connection.md): begun on #307's `8c64f77c`, with [Actions](actions.md) 0.2.2 (#273 at `80f6aa5a`) merged at `6c6b71d5`. #307's heads are merged: `03119bd7` at `9ba0858e`, `c19be75a` at `978a04a2`, `48e55eba` at `6ffcd610`, `aa46726c` at `e97df11a` and `aabb4417` at `5d3e4734`: `phone-shell-0.2.12` with the phase bars and the final target bar, `component-kit-0.8.2`, `room-scene-0.5.1`, the phase-closed toast and the host sheet hook. Actions 0.2.3 (#273 at `b1aac9d2`), with the Lead's changes and answers of 17 November, is merged at `1e723308`.
- Integration first approves the source fence's new marked hunk. The changed files meet the pins the base already meets: `app.mjs` and `render.mjs`, and, through the drawing-port fence, `vite.config.mjs` (see [The gates](#the-gates)).

**What it is:**
- On a player's phone, Actions is Designer's Actions component (`actions-0.2.3`, with `play-parts-0.1.2` on `component-kit-0.8.2`), used as it is:
  - its parts in the shell's sheet body: the tiles, the List, the check, After Register, "Outcome unknown" and Pass's line;
  - its frames, target bars, chips and toasts in the shell.
- It replaces the game's Actions sheet, the generic check of Actions' commands, the "Outcome unknown" body and its two buttons, the Pass sheet's frame, the target bar's words for Actions' commands, and the pass toast's words.
- The look and the motion come from `design/`. The game keeps the data, the commands and the lifecycle.

## Files

| Path | What |
| --- | --- |
| `apps/game/hosted/planet/actions-input.mjs` | New, pure. It maps the presentation model to Actions' parts (`actionsPart`, `actionsTiles`, `actionsListGroups`), and to the shell's frames, bars, chips and toasts for Actions' steps (`actionsFrame`, `actionsTarget`, `actionsChip`, `actionsToast`), from the component's own helpers. It also holds this phone's own pick (`actionsFlow`, `holdActionsPick`), maps the taps to the controller's calls (`actionsHandlers`), decides what Cancel does (`actionsCancel`), and what the screen-reader step says at After Register (`actionsHeard`, A16) |
| `apps/game/hosted/planet/shell-input.mjs` | `shellSheet`, `shellTarget`, `shellChip` and `shellToast` hand Actions' steps to it. `shellHandlers` routes Actions' footer ids (Register, Pass, Done, Retry the same, Check receipt, Cancel), its chips and the List's Back. The bar is untouched: the phase bars are the in-game animation builder's, merged from #307. So are the phase-closed toast, which `shellToast` gives before Actions' toasts, and the host sheet, whose footer, Back and Close come first |
| `apps/game/hosted/planet/render.mjs` | Mounts the part for Actions' sheet first in the shell's sheet body, with the game's remaining content after it. It updates the part on its input, and suspends, resumes and disposes it with the page and the sheet. Every choosing tap goes through Actions' handlers. At After Register the unseen step and checkpoint say the part's headline (A16) |
| `apps/game/hosted/planet/room-scene-input.mjs` | The scene's targets mark this phone's pick at the check and while it sends, and the Disabler's fixed position |
| `apps/game/hosted/planet/app.mjs` | Imports `actions.css` |
| `apps/game/hosted/vite.config.mjs` | One marked hunk: Actions' two runtime files and the gameplay parts' two join `allowedSources` |
| `apps/game/test/planet-actions.test.mjs` | New: the steps, the frames and bars, this phone's pick, the parts' inputs, the taps, Cancel, privacy and the scene's marks |
| `apps/game/test/planet-phone-shell.test.mjs` | Follows the pass sheet, the check and the bars that are Actions' now |
| `design/tools/match-connection-check.mjs` | Release 3's check: the real app, under the production headers, at both phone sizes |
| `design/tools/shell-connection-check.mjs` | #307's check. Its `pass`, `actions` and `closed` states take #307's selector first, then release 3's (the Pass footer's `pass`; Actions' part and its Scan tile) |
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
| Passed | `PASS_TURN` at `accepted` | no sheet; `passedToast()`: "Turn passed" | |
| Move | `MOVE` at `slots` (the tile chose the viewer's room) | no sheet; `moveBar()`: "Move within Room B" with "Choose an empty position · or another room on the Board"; `moveChip()`; on the board, "Move · uses this round’s move" | none; the scene's positions |
| Move's check | `MOVE` at `confirm` | `checkSheet({ type: 'MOVE' })`: "Register move" | the check: "Move to B5", "Room B", the fact |
| Moved | `MOVE` at `accepted` | no sheet; `movedToast()`: "Moved to B5" | |
| The Disabler's position | `SELECT_BLACKOUT_SLOT` at `slots`, then `sending` and `accepted` | no sheet; `blackoutBar()`: "Choose a position · Room A · any position, even empty", under the phase bar's "Blackout · Dark · positions fixed" | none; the scene's positions in the dark, the tapped one marked once sent |
| Fixed | no action, `blackoutTargeting.selectedSlotId` | no sheet; `blackoutBar({ fixed })`: "Position A3 fixed · Resolves after the window · no effect shown now" | none; the position marked |

- **The tiles** come from the model's offers under Actions. A role's own tile shows while the server offers it, then Move, Private talk and Shoot, which every role has (sheet 28's order). The three are unavailable unless offered, saying "Not available now" (T3). The role, the tiles' lines and Rescue's badge are not in the model under Actions (A7, B3).
- **The facts** are the game's own words after its confirmation's question (`planetConfirmation`), until Frontend's copy (B7): "Entering or repositioning spends this round’s movement.", "This spends its global lifetime use and this round’s Role Action." Rescue's confirmation is a question alone, so its check has none.
- **After Register's words** are the model's registration words (`planetRegistrationText`), the head's line, which the head reads out when it opens. There is no time line and no captured players: the model has neither.
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

It is this phone's own tap, not data from the server. A model that carries the command (A2, A4) would replace it.

An "Outcome unknown" this phone did not see sent has nothing to name, so its body is empty (A4). That happens after a reload, after a hidden page, or when Actions was closed while it sent. The title and the two buttons still show.

## After Register

The Lead's change of 17 November: the handoff's [After Register](../phone-ui-handoff.md#after-register) table, never the model's generic "Registered. Resolution is pending." (#222 item 12).
- **Frontend's copy where it has the line,** from `en` in `@mothership/presentation`, which the fence already admits: `acceptedTarget` and `acceptedDetail` for Rescue, Protection and a shot, `compound.supplyAccepted` and `supplyDetail` for Supply, and `acceptedDetail.hack` for the private talk's detail (the Lead's answer, 17 November). For example "Rescue of Crew 3 registered." and "This is not a result. Registered actions are resolved at the end of the round."; the private talk's "The phase shown at the top of this screen says what happens next."
- **The component's `afterWords()`** (`actions-0.2.3`) for the rest: Blackout, the private talk's headline (in the pack's name), the Clone and the Engineer. It also gives every time line, from the round the server reports: "Registered · Round 6 · your turn", then "End of Round 6 · Rescue is resolved, after the attacks".
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
| Cancel on the bar | back to the tiles: `openPanel('actions')`. Once the Disabler's position is fixed, only hidden: `dismiss()` (T2), until shell 0.2.12's bar without Cancel (the Lead's decision, [Open](#open)) |
| Cancel in the check | back to the tiles; a move back to choosing, with nothing picked (Q1). While it sends, back to the tiles: it recalls nothing (L5) |
| The chips | "Other rooms · n" and "Other rooms on the Board": the board view. "List": the List; its Back closes it |

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

## The boundary

- **The hunk.** Marked `BEGIN Actions connection` / `END Actions connection` in `apps/game/hosted/vite.config.mjs`. It adds four entries to `allowedSources`: `actions/actions.mjs`, `actions/actions.css`, `play-parts/play-parts.mjs` and `play-parts/play-parts.css`. The kit is admitted by the shell's hunk. Nothing else; their `preview/` and `review/` are never imported.
- **How it was checked.** The hosted Planet entry was built with the config's own fence and Firebase registry plugins, and without the release plugins, which refuse first:
  - with the hunk, it builds;
  - without the `actions.mjs` entry, the fence refuses `actions.mjs`; without `actions.css`'s, that file; without `play-parts.mjs`'s, that file;
  - **without `play-parts.css`'s, it still builds.** `actions.css` imports it with `@import`, which the fence does not see, as the shell connection's page found for `kit.css`. The entry is there.

## The gates

- **`npm run check:sources`** refuses `app.mjs` first ("Food consumer source: content differs"), as on the base.
  - It was also run on throwaway copies of `4367f7e0` and of `9ba0858e` with `app.mjs`, `render.mjs`, `phone.css` and `planet.css` back at `origin/main`, the four files the base's pins name. There it passes.
  - So this change pins no new file: `check:sources` accepts the new hunk, `actions-input.mjs`, the changed mappers, the tests and the check.
- **The other pins** the shell connection's page names fall on the same files: the hosted build's `reviewed-crew-drawing-release` on `app.mjs`, and the drawing-port fence on `vite.config.mjs`, which the room and shell connections' hunks already changed. They were not re-run here.
- **These pass:** `typecheck`, `build`, and the game's tests, 875 of 875 on `1483ed86` (the shell connection's 864 and this one's 11), as 871 of 871 on `1e723308`.

## Evidence

### Tests

`apps/game/test/planet-actions.test.mjs` passes 11 of 11. The component's own checkers (`checkActions`, `checkTargetList`, `checkActionCheck`, `checkAfterRegister`, `checkOutcomeUnknown`, `checkPassNote`) and the shell's (`nextPhoneShellInput`) accept every input built there. It covers:
- the tiles: the role's own while offered, the three every role has, the order, and the states;
- every sheet: the List, the check (and while it sends), After Register, Pass, "Outcome unknown" and its Retry busy;
- the bars and chips: a person, Supply's second, a move's position, here and elsewhere, off the board, the Disabler's position and its fixed bar;
- the toasts;
- this phone's pick, through "Outcome unknown", and dropped when it should be;
- the parts' inputs: After Register's lines and time line for every action of the handoff's table, through this phone's taps, the viewer as "yourself", and none without the pick; Pass's and the Disabler's position's "Outcome unknown";
- the taps: Move's replay, the Disabler's one tap, and nothing after dispose;
- Cancel, and the shell's routing of every new id;
- the screen-reader step at After Register (A16): the part's headline, with and without the pick and for the Engineer, and none at the check, with no frame, on a display or for Blackhole's toast;
- privacy: concealed and on a display, none of it;
- the scene's marks.

**A mutation run** made 33 changes to the connection's source, each restored from its saved bytes. Every one is caught by the three connection test files (this one, the shell's and the room scene's), on `04500fd0`.
- It adds A16's two (the headline's source, and the frame it is limited to), and four on the lines new in the merge of #307's `aabb4417`: the closed phase passed to the toast, the closed toast first, and the host sheet's footer and Back first.
- The run of 27, on `aef40283`, added the Lead's changes: After Register's words and time line (Frontend's headline and detail, the private talk's detail, the round, the pick, the viewer as "yourself", Supply's order), the flags `canRetry`, `canCheck` and `canPass`, and the positions of Pass's and the Disabler's "Outcome unknown".
- Two of the earlier 20 fell with the code they changed (the connection's own `usable()`, which `actions-0.2.3`'s flags replace).
- The earlier runs, of 20, were on `4367f7e0` and again on `9ba0858e`. The first run missed one, Retry's busy "Outcome unknown"; its test is `4367f7e0`.

### The check

`GAMEN_PHONE_ART_BASE=<clean worktree of origin/main> node design/tools/match-connection-check.mjs`:
- It builds Frontend's phone harness from this tree, with art from origin/main.
- It serves it with the hosted game's production headers (`createHostedPreviewHeaders`, headers SHA-256 `424e5dec…`, the shell's and the room scene's).
- It drives the real app at 390 × 844 and 430 × 932.

**Result:** 36 of 36 captures pass: eighteen states at both sizes, recorded on `7d1e51cc` (#307's `aabb4417` merged in, and A16) with the source clean and the art from `64e55516`, in one run.
- **Against the record on `1e723308`:** 2 captures are byte for byte the same, and every recorded field of the 36 is the same, but for the bundle's file name in the known Zod report and these:
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
| `moved` | Register sends `MOVE { destination: 'Room B', slotId: 'B5' }`; "Moved to B5", no sheet |
| `move-board` | On the board: "Move · Choose an empty position · uses this round’s move", B5 and the Command Room's caption. Then that caption and C1 open "Move to C1" |
| `pass` | "Pass your turn?" with Cancel and Pass; then `PASS_TURN` once and "Turn passed" |
| `blackout` | The dark Room A: "Choose a position · Room A · any position, even empty" under the phase bar's "Blackout · Dark · positions fixed", and five positions. Then one tap of A3 sends `SELECT_BLACKOUT_SLOT` for A3, the bar kept, no sheet |
| `blackout-fixed` | Once the view has it: "Position A3 fixed · Resolves after the window · no effect shown now", A3 marked |
| `reconnecting` | Actions open, then the reading fails: the banner, the sheet closed, no tile left |
| `concealed` | The page hidden at Rescue's check: no part, name or check words left, no target |

Each capture also passes with:
- the shell mounted and the stage in it;
- none of the old chrome or recovery buttons;
- no unexpected policy report (only Zod's known, caught eval probe);
- no failed request and no page error.

The harness answers a command at once, so "Registering…" is not drawn here; the component's own check draws it.

### The merge gate's comparison

`design/tools/phone-ui-native-compare.mjs --only pass,actions,targeting,target-check,registered,clone,blackout,reconnecting`:
- The build is the check's own bundle (`--keep`): it names `7d1e51cc`, clean, with art from `64e55516`. The pack is read at `04500fd0`, the record's commit, clean.
- Every part was drawn with no problem met, the steps reaching Actions' tiles, the scene's person and the footer's Register.
- Its `compare.json` is in `design/phone-ui/review/match-connection/`; its pictures stay outside the repository.
- **In the pairs:** the tiles, the bar, the check, After Register and "Pass your turn?" take the pack's form in the pack's places. After Register now has the pack's headline, detail and time line: "Rescue of Crew 3 registered.", then "Registered · Round 6 · your turn" and "End of Round 6 · Rescue is resolved, after the attacks". The differences are listed next.
- **`clone` (29.2)** is the tool's own steps, which open the Card: it shows no Clone. The connection's Clone words are in the test (the shorter line, A15), and Actions' own check draws the Clone's After Register.

### Differences from the pack

- **The tiles:**
  - no role in the sheet's line, and no line under an available tile ("2 injections", "Once a round") or badge (A7, B3);
  - a role's own tile the server does not offer is not shown, where T3 shows it unavailable (A7: the role is not under Actions);
  - unavailable tiles say "Not available now" (B1).
- **The check:** the facts are the game's confirmation words where it has any (B7); Rescue's has none.
- **After Register:** the handoff's words. What the Actions panel's model lacks stays out (A15): the Clone's end, Protection's start, and the Engineer's capture and its players.
- **Pass:** no "The turn goes to Eli · Player 5" (B5), and no "Your move stays open…" line (B6).
- **The Disabler** starts from the dark Actions sheet's "Choose fixed slot". In sheet 30 the positions are offered as the dark begins, with no tap; the controller offers them only after `begin('SELECT_BLACKOUT_SLOT')`.
- The harness's sample names, rooms and rounds; the pack's 47 and 34 px safe areas.

## Gaps, for #222 through the Lead

The connection works around none of these by inventing data. Where it holds this phone's own pick instead, it says so above.

| | Gap | Who |
| --- | --- | --- |
| A1, B1 | No unavailable reasons in the offers: "Not available now" | Backend, Frontend |
| A2 | The check's person, and a move's position, are not in the model once chosen. Held from this phone's tap here | Frontend |
| A3 | No rejected step: the controller drops the draft, so the check cannot stay open with its error (L6). The status line says it | Frontend |
| A4 | The recovery names no command, person, position or id. Named here from this phone's own send only; otherwise "Outcome unknown" has an empty body | Frontend |
| A5 | Accepted lasts one revision, so After Register closes itself at the next view | Frontend |
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

## Behaviour changes, for Frontend's review

- **The Actions sheet** is the tiles, then what stays the game's. "No action is currently offered." and "Your fixed selection: A3." are gone: the tiles and the Disabler's bar say them.
- **A move:**
  - the tile closes Actions and opens the viewer's room's positions in the room view; until now a move went to the board;
  - a board caption begins the move again on its room, so a second room can be chosen;
  - its check's Cancel returns to choosing.
- **The target bar's Cancel, and the check's,** return to the tiles; until now they closed everything.
- **The Disabler's position** is fixed with one tap; until now it had a confirmation and Register.
- **"Outcome unknown"** is the component's notice, with Retry the same and Check receipt in the footer; until now it was a line and two buttons in the body.
- **After a pass,** the toast says "Turn passed"; until now it gave the model's words.

## Open

- **For the Lead:**
  - the gaps above, for #222;
  - change 3, the fixed Disabler bar's Cancel: the engine offers no `SELECT_BLACKOUT_SLOT` once a position is fixed (`packages/engine/src/planet-game/offers.ts:22`, `commands.ts:73`), so Cancel cannot go back to choosing. The Lead decided on a fixed bar with no Cancel, through shell 0.2.12's `target.cancel: false` (merged here with #307's `aabb4417`), and takes the departure from sheet 30 to the owner and #222; it is built once the owner's approval is recorded. Until then Cancel only hides the bar;
  - the `closed` state of #307's check, which this branch doubles like `pass` and `actions` (for #307 to take);
  - the empty "Outcome unknown" when this phone did not see the send (A4): a model change, or a type-less specimen ("Your action was sent, …"), which would be new words for the Lead and the owner;
- **For Integration:**
  - the fence hunk;
  - the fence not seeing `play-parts.css`'s `@import`;
  - the pins on `app.mjs` and `render.mjs`, and the drawing-port fence on `vite.config.mjs`, which the base already meets.
- **For Frontend:** the review, chiefly the behaviour changes, A2's held pick and the gaps.
