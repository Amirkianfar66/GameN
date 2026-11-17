# Match connection: Designer's components in the match (release 3)

**Status (17 November 2026):** a draft for the Lead Designer's review, then Frontend's. It is not in the game yet, and it is not a release.
- Release 3 of the owner's plan of 16 November 2026. Its first step is Actions (#273), as the plan's order says; the other parts follow on this branch, each in its own commit.
- It is stacked on the [shell connection](shell-connection.md): begun on #307's `8c64f77c`, with [Actions](actions.md) 0.2.2 (#273 at `80f6aa5a`) merged at `6c6b71d5`. #307's head `03119bd7` is merged at `9ba0858e`: `phone-shell-0.2.11` with the phase bars, `component-kit-0.8.1`, `room-scene-0.5.0`.
- Integration first approves the source fence's new marked hunk. The changed files meet the pins the base already meets: `app.mjs` and `render.mjs`, and, through the drawing-port fence, `vite.config.mjs` (see [The gates](#the-gates)).

**What it is:**
- On a player's phone, Actions is Designer's Actions component (`actions-0.2.2`, with `play-parts-0.1.2` on `component-kit-0.8.1`), used as it is:
  - its parts in the shell's sheet body: the tiles, the List, the check, After Register, "Outcome unknown" and Pass's line;
  - its frames, target bars, chips and toasts in the shell.
- It replaces the game's Actions sheet, the generic check of Actions' commands, the "Outcome unknown" body and its two buttons, the Pass sheet's frame, the target bar's words for Actions' commands, and the pass toast's words.
- The look and the motion come from `design/`. The game keeps the data, the commands and the lifecycle.

## Files

| Path | What |
| --- | --- |
| `apps/game/hosted/planet/actions-input.mjs` | New, pure. It maps the presentation model to Actions' parts (`actionsPart`, `actionsTiles`, `actionsListGroups`), and to the shell's frames, bars, chips and toasts for Actions' steps (`actionsFrame`, `actionsTarget`, `actionsChip`, `actionsToast`), from the component's own helpers. It also holds this phone's own pick (`actionsFlow`, `holdActionsPick`), maps the taps to the controller's calls (`actionsHandlers`), and decides what Cancel does (`actionsCancel`) |
| `apps/game/hosted/planet/shell-input.mjs` | `shellSheet`, `shellTarget`, `shellChip` and `shellToast` hand Actions' steps to it. `shellHandlers` routes Actions' footer ids (Register, Pass, Done, Retry the same, Check receipt, Cancel), its chips and the List's Back. The bar is untouched: the phase bars are the in-game animation builder's, merged from #307 |
| `apps/game/hosted/planet/render.mjs` | Mounts the part for Actions' sheet first in the shell's sheet body, with the game's remaining content after it. It updates the part on its input, and suspends, resumes and disposes it with the page and the sheet. Every choosing tap goes through Actions' handlers |
| `apps/game/hosted/planet/room-scene-input.mjs` | The scene's targets mark this phone's pick at the check and while it sends, and the Disabler's fixed position |
| `apps/game/hosted/planet/app.mjs` | Imports `actions.css` |
| `apps/game/hosted/vite.config.mjs` | One marked hunk: Actions' two runtime files and the gameplay parts' two join `allowedSources` |
| `apps/game/test/planet-actions.test.mjs` | New: the steps, the frames and bars, this phone's pick, the parts' inputs, the taps, Cancel, privacy and the scene's marks |
| `apps/game/test/planet-phone-shell.test.mjs` | Follows the pass sheet, the check and the bars that are Actions' now |
| `design/tools/match-connection-check.mjs` | Release 3's check: the real app, under the production headers, at both phone sizes |
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
| Accepted | `accepted` (one revision) | `afterSheet()`: Done | `mountAfterRegister()`: REGISTERED, ACCEPTED (Private talk), ACTIVE (Clone) or CAPTURED (Suppress), and the model's registration words |
| Hack Ship and Blackhole accepted | `accepted` | the toast `registeredToast()`: "Blackhole registered"; the tiles, if Actions is open (L7) | the tiles, the tile REGISTERED |
| No answer came | `recovery` | `unknownSheet()`: "Retry the same" and "Check receipt", usable as `canRetry` and `canCheck`, Check busy while it asks, Retry busy while it resends | `mountOutcomeUnknown()`: "Rescue Crew 3 was sent, but no answer came back." from this phone's own send |
| Pass | `PASS_TURN` at `confirm` or `sending` | `passSheet()`: Cancel and Pass, Pass usable as `canConfirm` | `mountPassNote()`, with no line (B6) |
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
| Cancel on the bar | back to the tiles: `openPanel('actions')`. Once the Disabler's position is fixed, only hidden: `dismiss()` (T2) |
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
- **The status line in the cover:** for example "Outcome unknown. Check the original receipt before any new command." over "Outcome unknown", and a rejection's words.

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
- **These pass:** `typecheck`, `build`, and the game's tests, 871 of 871 on `9ba0858e` (the shell connection's 861 and this one's 10).

## Evidence

### Tests

`apps/game/test/planet-actions.test.mjs` passes 10 of 10. The component's own checkers (`checkActions`, `checkTargetList`, `checkActionCheck`, `checkAfterRegister`, `checkOutcomeUnknown`, `checkPassNote`) and the shell's (`nextPhoneShellInput`) accept every input built there. It covers:
- the tiles: the role's own while offered, the three every role has, the order, and the states;
- every sheet: the List, the check (and while it sends), After Register, Pass, "Outcome unknown" and its Retry busy;
- the bars and chips: a person, Supply's second, a move's position, here and elsewhere, off the board, the Disabler's position and its fixed bar;
- the toasts;
- this phone's pick, through "Outcome unknown", and dropped when it should be;
- the parts' inputs;
- the taps: Move's replay, the Disabler's one tap, and nothing after dispose;
- Cancel, and the shell's routing of every new id;
- privacy: concealed and on a display, none of it;
- the scene's marks.

**A mutation run** made 20 changes to the connection's source, each restored from its saved bytes. Every one is caught by the three connection test files (this one, the shell's and the room scene's), on `4367f7e0` and again on `9ba0858e`. The first run missed one, Retry's busy "Outcome unknown"; its test is `4367f7e0`.

### The check

`GAMEN_PHONE_ART_BASE=<clean worktree of origin/main> node design/tools/match-connection-check.mjs`:
- It builds Frontend's phone harness from this tree, with art from origin/main.
- It serves it with the hosted game's production headers (`createHostedPreviewHeaders`, headers SHA-256 `424e5dec…`, the shell's and the room scene's).
- It drives the real app at 390 × 844 and 430 × 932.

**Result:** 36 of 36 captures pass: eighteen states at both sizes, recorded on `9ba0858e` with the source clean and the art from `64e55516`, in one run. The first record, on `4367f7e0` before #307's head was merged, also passed 36 of 36.

| State | What it shows and checks |
| --- | --- |
| `tiles` | The Hacker's tiles: Scan, Final Code and Move usable; Private talk and Shoot "Not available now", taking no tap; "Your turn · Round 6"; "Actions · Room B". The part first, no game body |
| `rescue` | The Doctor's Rescue: the bar "Rescue · Choose a player" with Cancel, Crew 3 offered in the Hospital, no sheet, Pass kept (T2) |
| `rescue-check` | "Check and register": "Rescue Crew 3", "Player 3 · Hospital", the portrait, Crew 3 marked in the scene, Cancel and "Register Rescue", nothing sent. Then Cancel returns to the tiles |
| `rescue-after` | Register sends `RESCUE` for seat-3; REGISTERED with "Registered. Resolution is pending.", no time line, nothing drawn on the target. Then Done closes it |
| `unknown` | No answer: "Outcome unknown", "Rescue Crew 3 was sent, but no answer came back." and "Check before doing anything else.", Retry the same and Check receipt. Then Retry resends the same command id, and it registers |
| `list` | Rescue offered in three rooms: on the board, "Choose from a list", "Rescue · everyone you can reach", Room A, Room B and the Hospital. Then a row opens its check |
| `other-rooms` | The same in the room: "Other rooms · 2"; then the chip goes to the board, its bar "every room" and the List chip |
| `suppress` | "Suppress navigation · Only you see this", no portrait; then CAPTURED and the model's words |
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
- The build is the check's own bundle (`--keep`); it names `9ba0858e`, clean, with art from `64e55516`.
- Every part was drawn with no problem met, the steps reaching Actions' tiles, the scene's person and the footer's Register.
- Its `compare.json` is in `design/phone-ui/review/match-connection/`; its pictures stay outside the repository.
- **In the pairs:** the tiles, the bar, the check, After Register and "Pass your turn?" take the pack's form in the pack's places. The differences are listed next.

### Differences from the pack

- **The tiles:**
  - no role in the sheet's line, and no line under an available tile ("2 injections", "Once a round") or badge (A7, B3);
  - a role's own tile the server does not offer is not shown, where T3 shows it unavailable (A7: the role is not under Actions);
  - unavailable tiles say "Not available now" (B1).
- **The check:** the facts are the game's confirmation words where it has any (B7); Rescue's has none.
- **After Register:** the model's words ("Registered. Resolution is pending.") where the pack says "Rescue of Ava registered." and what follows; no time line (the model has none).
- **Pass:** no "The turn goes to Eli · Player 5" (B5), and no "Your move stays open…" line (B6).
- **The Disabler** starts from the dark Actions sheet's "Choose fixed slot". In sheet 30 the positions are offered as the dark begins, with no tap; the controller offers them only after `begin('SELECT_BLACKOUT_SLOT')`.
- **"Outcome unknown"** shows the game's status line too, in the cover.
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
| A13 (new) | `PASS_TURN` and `SELECT_BLACKOUT_SLOT` have no look in `ACTION_LOOKS`, so their "Outcome unknown" names nothing | Designer (Actions' next change) |
| A14 (new) | `unknownSheet()` and `passSheet()` take no `canRetry`, `canCheck` or `canPass`, so the connection sets their footer's `enabled` | Designer (Actions' next change) |

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
  - A13 and A14, which are Actions' next change (mine);
  - the empty "Outcome unknown" when this phone did not see the send (A4): a model change, or a type-less specimen ("Your action was sent, …"), which would be new words for the Lead and the owner;
  - on this branch, `shell-connection-check.mjs`'s `pass` and `actions` states expect the game's old Pass footer id and Actions body. This check covers those states now. I left your tool as it is.
- **For Integration:**
  - the fence hunk;
  - the fence not seeing `play-parts.css`'s `@import`;
  - the pins on `app.mjs` and `render.mjs`, and the drawing-port fence on `vite.config.mjs`, which the base already meets.
- **For Frontend:** the review, chiefly the behaviour changes, A2's held pick and the gaps.
