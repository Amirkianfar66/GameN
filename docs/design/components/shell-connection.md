# Shell connection: the match's frame on the phone shell

**Status (18 November 2026):** a draft for the Lead Designer's review, then Frontend's. It is not in the game yet.
- Integration first approves the source fence's marked hunk and the pins that refuse the changed files: `app.mjs`, `render.mjs`, `phone.css` and `planet.css`, and, through the drawing-port fence, `vite.config.mjs`, which the room connection's hunk already meets (see [The gates](#the-gates)).
- This is not a release.
- It is stacked on the room connection (`5f1b1c83`, [its page](room-connection.md)) and the phone shell (#265), merged at `9e296ccc` (#265 at `0e5a0b8a`) again at `5347df3f` (#265 at `bb567d7e`, shell 0.2.9), at `8c64f77c` (#265 at `60afd967`, shell 0.2.10, with the phase bars' words), at `4a109dc5` (#265 at `e86ca86b`, shell 0.2.11 with kit 0.8.1: a part opened after the text size changes takes the new size's rules), at `48e55eba` (#265 at `a0900240`, kit 0.8.2: the toast's words wrap at larger text), at `4601ac6c` and `aa46726c` (room scene 0.5.1, through #265 at `562723d8` and the room connection at `e2640346`), at `a95dfc39` (#265 at `8e969200`, shell 0.2.12: a final target bar, with no Cancel), at `99c20a18` (the room connection at `0595c51b`, its record), at `3f604614` (#321 at `1370773a`, shell 0.3.0: Card is the last tab and draws the player's own character), and at `ceba03db` (#321 at `bf95c1a0`, shell 0.3.1: the Card tab's portrait in the top bar's shape and size).

**What it is:**
- On a phone, the Planet app's match is framed by Designer's [phone shell](phone-shell.md) (`phone-shell-0.3.4`, with `component-kit-0.8.2` and the icon family `phone-ui-icons-1.1.0`), used as it is:
  - the top bar, with the shell's own words for each game step that has no active player (0.2.10), the tabs with the round button (Pass, Vote, Voted), Card last with the player's own character, drawn as the top bar draws it (0.3.0 and 0.3.1, the owner's 18 November decisions, [the shell's page](phone-shell.md#the-card-tab)), each tab's icon as a painted tile and the round button's icon painted (0.3.2, the owner's decision of the same day, [the shell's page](phone-shell.md#the-painted-tiles)), and the private talk's two buttons;
  - the target bar with Cancel, the floating chip, both banners and the toast;
  - the docked sheet's frame: its title, line, Back, Close and footer actions.
- The shell replaces the app's own header, tab bar, Pass button, sheet frame and target bar. None of them is left in the page.
- This is release 2 of the owner's plan of 16 November 2026, recorded in `docs/design/owner-decisions.md` on #280 (`d54c15bd`), not yet on this branch.
- The look and the motion come from `design/`. The app keeps the data, the commands and the lifecycle, and, until their components come (release 3), each sheet's content and the result window.

## Files

| Path | What |
| --- | --- |
| `apps/game/hosted/planet/shell-input.mjs` | New, pure. It maps the presentation model to the shell's input (`shellInput`), with the facts for a phase's words (`shellPhaseFacts`), the round stamp's moment and clock (`roundStart`, `createServerClock`), a phase that closed under an open choice (`phaseClosed`), a host sheet in Settings' place (`shellHostSheet`), the shell's intents to the calls the game already makes (`shellHandlers`), where the focus goes back (`shellFocusOrder`), and adds and removes the renderer's page listeners together (`connectShellLifecycle`) |
| `apps/game/hosted/planet/render.mjs` | Mounts the shell once, mounts the stage in `shell.stage`, the game's sheet content in `shell.sheetBody`, Food's gauge in `shell.slot('clock')`, and the result window and the status line in `shell.slot('cover')`. It updates, suspends, resumes and disposes the shell. It takes a `hostSheet` for the pre-game connection's Host controls ([below](#the-host-sheet-for-the-pre-game-connections-part-8)). It no longer draws the header, the tab bar, the Pass button, the sheet's frame or the target bar |
| `apps/game/hosted/planet/app.mjs` | Imports `phone-shell.css`, and gives the renderer Retry's reconnect: the session's `refresh()` |
| `apps/game/hosted/planet/phone.css`, `planet.css` | The old chrome's rules are removed. The game's two generic button rules keep off the shell's and the kit's controls, and its sheet rules for `p` and `button` keep off a Designer component mounted in the sheet body (its own `.ms-kit` root: release 3's parts, the match's Settings and Host controls; the Pre-game builder's find). The stage fills the shell's stage; the result window and the status line sit in the cover |
| `apps/game/hosted/vite.config.mjs` | One marked hunk: the shell's three files (`phase-bars.mjs` with shell 0.2.10) and the kit's two join the hosted build's `allowedSources` |
| `apps/game/test/planet-phone-shell.test.mjs` | The mapping, privacy, the intents, the focus and the lifecycle; the phase-closed toast on models and on the game's own controller; the host sheet |
| `design/tools/shell-connection-check.mjs` | The check: the real app, under the production headers, at both phone sizes |
| `design/tools/lib/phone-ui-native-parts.mjs` | The merge gate's comparison: each step that taps a match control names the shell's control beside today's, so the same steps drive a build from before and after this |
| `design/phone-ui/review/shell-connection/` | The check's captures and `check.json`, and the comparison's `compare.json` |

The shell's and the kit's own files are used as they are.

## The frame

- **Mount:** once per renderer, filling the app (`.planet-shell-host`). The stage (`main.planet-stage`: the room scene, the board and today's films) goes in `shell.stage`.
- **Sizes:** the room scene's size is `layout().stage`, kept current through `onLayout`. The board's layout takes the shell's bar heights; during the private talk it keeps clear of the two buttons by `covered.bottom`, as the handoff says. The old bars' `ResizeObserver` is gone: the shell reports its own sizes.
- **Suspend and resume:** the shell runs while the page is shown and the window has the focus, as the room scene does.
- **Dispose:** the renderer's `dispose()` disposes the shell after the scene. The page listeners (click, keys, visibility, art, preferences, Reduce motion, resize, blur, focus) are added together and removed together.
- **What stays the game's, unseen:** the offices, the shared checkpoint, the current step (`#ms-action-step`, which the board's position targets name as their description), the roster text and the live words.
- **The frozen Food port's display:** `food-app.mjs` `mountFoodPublic` places its banner under `.planet-header`, which no longer exists. An empty, unseen box of that class, the height of the shell's top bar, keeps that place.

### Inputs

As the handoff's "Frontend's connection" maps them, with what it leaves open.

| Input | From |
| --- | --- |
| `status` | `concealed` when the model is concealed or Food's surface owns the screen (active, or its Task over the whole screen); `live` when the connection is live; otherwise `stale` |
| `interactive`, `viewer` | `true`; `viewer` is `ownSeatId`, `null` on a shared display. A display has no tabs, Promises, target bar or chip, so its only controls are ⋮, the Settings sheet's Close and Retry. The handoff's input table gives a display `interactive: false`, which would refuse ⋮ too (below) |
| `bar` | A turn when lit, in an ordinary turn with an active seat. The pair on the two talking phones. Otherwise the phase. **Before turns, the Officer's appointment, the Blackout, Ship synchronized and Setting course take Designer's words,** from the shell's `phaseBar()` (shell 0.2.10, [below](#the-phase-bars-words)). The votes, Food Supply and a talk seen by others keep today's names (`render.mjs` `phaseNames` before this) with the pack's icons, and the board's label as their line, as today's header said |
| `bar` while not live | The shell's `reconnectingBar()`: "Reconnecting…" with "Showing Round n as last seen", the round this phone last saw live (sheet 45). On the first connect, before it has seen a round, the shell's `loadingBar()`: "Loading the ship", with no round, Promises or ⋮, in place of "Connecting…" |
| `bar.timer` | The phase's time while trusted, amber from 10 s. A ring for the 5 s result and the 6 s presentation, with no amber (sheet 07). For the phases `phaseBar()` draws, the amber and the ring are the function's: never amber on everyone else's New Officer and Setting course |
| `bar.promises` | As the handoff: on a player's phone, none during the two fixed presentations and none on a display |
| `bar.menu` | ⋮ on every phone, **a shared display's included.** Settings is the one panel the controller opens on a display (`openPanel`), with the display's preferences and, when the display hosts, the host's controls; today's header offered it there. The handoff says a display uses the bar "without Promises or ⋮ today"; following it would leave a hosting display without its controls during the match |
| `tabs` | As the handoff. **An eliminated player:** Actions unavailable, described by "You’re out. You can still watch." (sheet 44); the Board, Card and Panels stay. The presentation offers an eliminated seat nothing to act on (`packages/presentation/src/planet/model.ts`) |
| `tabs.me` | Shell 0.3.0. The viewer's own public person, `{ seat: ownSeatId, name, character }` from `identities`, built as `bar.who` is for the active seat: the Card tab draws their crew portrait. Before a character is chosen the person has none, and the shell keeps the card icon. With no seat, `null`. **In the Blackout's dark** the model gives no one's identity (`controller.ts`), so the tab shows the card icon until the lights are back. **While the connection isn't live** the model has no identities either: the renderer keeps the viewer's own person as last given (`ownPersonSeen`), for the same seat only, and the tab draws it, as the bar keeps the round last seen. What was last given in the dark has no character, so no portrait from before the dark comes back |
| `versions`, and the crew's picture surface | While the connection isn't live the model has no versions. The renderer keeps the versions last given, gives them to the shell, and sets the app root's `data-crew-art` from them, so the kept portrait stays the same picture. Without that the crew's picture properties, which are defined only under that attribute, are gone, and the portrait draws nothing. Live, both follow the model's own versions, as before |
| `tabs.hero` | As the handoff, and **Vote, unavailable, through the 5 s result**, as the pack draws it (sheet 38) and the shell's own agreement case `phase-result` compares it. The handoff's table says Pass there |
| `target` | While this viewer chooses on the scene or the board (today's rule: the action's seat choices except a ballot or a code, a move's room or position, the Blackout's fixed position): the action's name and prompt, with its icon |
| `chip` | "Other rooms · n" in the room view when people the action offers stand in other rooms (counted on the public board), or "Other rooms on the Board" for a move; "List" in the board view (sheet 29) |
| `banner` | As the handoff, but none on the first connect, before this phone has seen a round: the pack's Loading frame (sheet 45) has none, since nothing was lost yet. A first connect that fails is an error, and gets the reconnecting banner with Retry |
| `toast` | A phase that closed under this phone's open choice: the pack's "That phase closed · choices cleared", from the shell's `phaseClosedToast()` ([below](#a-phase-that-closed-under-an-open-choice)). Otherwise a pass the server accepted: the model's registration words. Each once |
| `sheet` | The open panel's frame (below) |

**The sheets:**
- Actions, Card ("Your role · Only on this phone", large), Panels, Promises, Settings, and Panels' own pages, with Back to Panels (sheet 27.5): Windows (large, "Unverified claims · Expires after Round n"), Navigation, Hospital panel, Players and Round order.
- An action: its name, the ballot by its vote ("Jail vote", large), with the controller's own Register, Vote or Pass as the footer's action when it can confirm.
- "Pass your turn?" (27.3) with Cancel, this phone's own, and Pass, which sends `PASS_TURN` through the controller's confirmation.
- "Outcome unknown", "Blackout" in the dark, "Waiting for the server" when the phase has run out, and the board's List.
- On a shared display, Settings only.
- The headings the game's content drew are now the sheets' titles.

### Intents

| Intent | Call |
| --- | --- |
| `onTab` | `switch`: the local Board/Room switch, never a `MOVE`. Actions, Card, Panels: `openPanel`. In the talk: Promises, and My card (`card`) |
| `onHero` | Pass: `begin('PASS_TURN')`, which opens "Pass your turn?". Vote: `begin('VOTE')`, the ballot. Voted: Actions, where the registered ballot is |
| `onPromises`, `onMenu` | `openPanel('promises')`, `openPanel('settings')` |
| `onCancelTarget`, `onSheetClose` | `dismiss()`; closing the List only closes it |
| `onSheetAction` | `confirm`: `controller.confirm()`, which checks the current offer before it sends. `cancel`: `dismiss()` |
| `onSheetBack` | Panels |
| `onChip` | "Other rooms": the board view. "List": the List |
| `onRetry` | The session's `refresh()`, at once |
| `onLayout` | The room scene's size and the board's layout |
| `onFocusReturn` | With a sheet open after the change, the focus goes into that sheet (`shellSheetFocus()`, the Lead Designer, 18 November 2026). Another sheet than the one before: its title (shell 0.3.4), never one of its controls. The same sheet, and one of its own controls ended: its first available footer action, then its Close, then its Back. Otherwise it goes back to Cancel while choosing on the scene; else to the shell control that opened what closed; else to the first tab, where today's Escape put it |

Nothing in the connection works out who may act: every enabled state comes from the model, from its offers and, for an eliminated player's Actions, from the public board.

### What stays the game's

- **Each sheet's content:** the Actions tiles, the Card, Panels and its pages, Promises, Settings, the ballot's roster and the List, until their components (release 3).
- **The result window and the status line,** in the shell's cover: between the bars, under the shell's sheet, banners and toast, as the pack layers them. At the app's root they lay over everything of the shell, which is its own stacking context. The handoff names the cover for the result window's component (#267).
- **The board view and the private-talk capsule** in the stage, as before.

## The phase bars' words

For a phase with no active player the bar's words are Designer's, held once in `design/phone-ui/components/phone-shell/phase-bars.mjs` ([the words and the amber rule](phone-shell.md#the-phase-bars-words)). `shellBar()` calls `phaseBar()` with the phase's kind, the round, the trusted time left and the phase's length, and with `shellPhaseFacts(model)`:

| Input | From the presentation model |
| --- | --- |
| `hasOfficer` | `offices.officerSeatId` is set |
| `chooser` | `offices.captainSeatId`, named from `identities` as the turn bar's `who` is: the display name, or "Player n" |
| `blocked` | `offices.blockedSeatId` is set |
| `dark` | `dark`, the same fact that darkens the room |
| `lightsOutMs` | While lit: `presentation.blackout.previewEndsAt` less `presentation.nowMs`, the trusted time. The presentation holds both only while the time is trusted; without it the model is dark already |
| `own` | This phone has the deciding player's own choice open: the controller's draft of `APPOINT_OFFICER` in the appointment, or of `BLOCK_MOVE` before turns. Today that choice is begun from Actions and shown as the target bar; the Officer's and the Captain's own sheets come with their component |
| `office` | The office this viewer holds, from the public `offices` and `ownSeatId`, while its Navigation is open: the Navigation page from Panels, or the draft of `CHOOSE_NAV_DIRECTION` or `CONFIRM_NAVIGATION` |
| `promises`, `menu` | As for every bar. `phaseBar()` drops Promises on Ship synchronized |

- **Nothing is worked out.** No offer, role or private fact is read: a test gives the model every private field at once and the bar does not change. A Disabler's position and the Alien's Blackhole change nothing of the public bar.
- **The bar follows what is open.** Until the Captain opens the appointment, the Captain's phone shows everyone's bar, "New Officer · Name chooses"; with it open, "Appoint Officer · Random if time runs out". The Officer's block and the offices' Navigation go the same way.
- **The board's label is no longer these phases' line.** It still is for the votes, Food Supply and a talk seen by others.

**What the model doesn't hold:**

- **A count for "Loading the ship".** The pack draws "Room 3 of 5"; the model holds no count of pictures, so the bar is the title alone.
- **A moment for "The ship moved".** The model holds `navigation.lastMovedRound`, but nothing in the app shows the move yet: ship travel (#269) is not connected. So `movedBar()` has no caller here; it comes with ship travel's connection.
- **Why an office can't act.** With nothing open, that phone shows everyone's bar.

## The host sheet (for the pre-game connection's part 8)

`mountPlanetRenderer(root, controller, { …, hostSheet })` takes one more option, `hostSheet: { frame(), mount(body), action(id), back(), close(), toast() }`, for a sheet that opens from Settings and goes Back to it (the pre-game connection's Host controls, #295). While `frame()` gives a frame and Settings is the open sheet, that frame takes Settings' place (`shellHostSheet()` in `shell-input.mjs`, with `kind: 'host'`); the renderer mounts its body with `mount(body)`, and `shellHandlers` route that sheet's footer actions to `action(id)`, Back to `back()` and Close to `close()` and then the controller's dismiss, which closes Settings too. `toast()` gives the sheet's own toast once (Copied, a receipt), when the game gives none. Otherwise nothing changes. The test holds both.

## The round stamp's moment and clock (G18)

The round stamp (#288, "ROUND 1" over the room as Round 1 begins) is mounted on the shell's cover by the Pre-game builder's connection (release 4). This connection gives it the two things it reads from the game:

- **`roundStart(model)`** in `shell-input.mjs`: `{ round: 1, window: { id, startedAt } }` for Round 1's first phase, Before turns, which shows the room; otherwise `null`.
  - Without the Food rules the engine opens a match there. With them it opens Food Supply at once (`packages/engine/src/planet-game/lifecycle.ts`), whose surface covers the shell, and Before turns follows; so the stamp lands when the room first shows, after Food Supply, about 30 s into the match. Either way Round 1 has one Before turns. The in-game animation builder found it.
  - Public facts only: the round and the phase's kind, id and start. A phone that arrives late gets the same window; the stamp's own clock finds it past and draws nothing.
- **The match's trusted server time**, `createServerClock({ monotonic })`, which `render.mjs` keeps as `serverClock` and observes on each model.
  - `current()` is `{ now() }`: the phase's `nowMs`, the server's time when the model was made, plus the time since it arrived, by the phone's monotonic clock. A model shown again keeps its first arrival.
  - It is `null` while the phone isn't live or the phase's time isn't trusted or has run out. The stamp, given no clock, draws nothing.
- **The mount** is the Pre-game builder's: on each model, `mountRoundStamp(shell.slot('cover'), { ...roundStart(model), clock: serverClock.current(), status, reducedMotion })` while there is a window, then `update()`, and `dispose()` when the room view leaves.

## A phase that closed under an open choice

When a phase's time is up, the game's controller clears this phone's open choice and closes its sheet, without a word (`apps/game/src/planet/controller.ts`: `tick()` at the clock, `receive()` at a new phase). The pack says what happened: sheet 45's stale frame is the player's own bar at 0:00, Pass off, and the toast "That phase closed · choices cleared". The shell has had those words since 0.2.10 (`phaseClosedToast()`). The in-game animation builder connected them, to the interface the Lead Designer agreed on 17 November 2026.

- **`phaseClosed(before, model, { drafting })`** in `shell-input.mjs` tells the moment from two models painted one after the other. `render.mjs` keeps the model painted before.
  - **Before:** a choice in progress. Its `action.step` is one of `SHELL_CHOOSING`: `targets`, `slots`, `faction`, `direction`, `number`, `promise`, `confirm`.
  - **Now:** that phase's time is up (`phase.expired` with trusted time, the same phase id), or another phase is on.
  - Both models are live and this player's, in one match.
  - **`drafting`** (the Lead Designer, 18 November 2026): `true` when this phone had a choice open at the paint before that the model doesn't hold, such as a Promise being drafted in its sheet. It then counts as a choice in progress, by the same rule and with the same words. Anything but `true` is no draft. Nothing passes it in this PR; release 3's Promises (#310) will, in one line of `render.mjs`.
  - It returns `{ id }`, the closed phase's id. The toast's id is `closed:<id>`, so it shows once: at 0:00 under the old bar, as the sheet draws it, and not again when the next phase arrives.
- **`shellToast(model, { closed })`** gives the closed toast when there is one, else the pass's. The two never meet: a closed phase has no accepted action left.
- **It reads nothing private:** the connection, the match, the seat, the phase and whether this phone had a choice open (in the model, or a draft in this phone's own sheet). A model with every private field filled gives the same answer.

| Case | Toast |
| --- | --- |
| The time runs out under an open choice | Once, at 0:00 |
| Another phase arrives before 0:00 | Once |
| "Pass your turn?" still open at the end | Once |
| A Promise being drafted when its phase ends (`drafting`, release 3) | Once, the same words |
| The draft closed or sent by the player before the end | None |
| The player cancelled the choice, or sent it | None |
| The connection went stale, then a new phase | None: the reconnecting banner says it |
| The phone was put away and came back | None |
| Only a sheet open (Card, Panels), no choice | None |
| A shared display; another match or seat; time that is not trusted | None |

**The Lead Designer's decisions (17 November 2026, and one of 18 November):**

- **One rule for every phase, the Blackout too.** The toast goes to the same phone and audience as the target bar it replaces, and only the deciding player's phone had that bar. Telling them their position wasn't fixed is useful, and it shows nothing the bar didn't. Concealed, the shell drops it.
- **Food Supply next.** After the Captain's appointment, or an office's confirmation at the move, the next phase can be Food Supply. Food's surface then takes the bars and the toast goes with the shell, so it can show for less than its 2.4 s. The phone can't know at 0:00 what comes next.
- **A draft, 18 November 2026.** A Promise being drafted when its phase ends closes with its sheet. One rule and no new words: the same toast covers it, on this phone only, told by `drafting`. That this phone was drafting is shown to no one else.
- **The vote, in release 3.** Today the controller closes the game's own ballot, and this toast explains it. #267's ballot keeps "Voting closed" itself (sheet 35). The change that connects it names the two votes in `SHELL_CLOSES_ITSELF` (`shell-input.mjs`), and `phaseClosed()` then stays silent for them. That change is the Gameplay UI builder's.

**Not covered:**

- **A sheet with no choice in it.** The controller closes Card and Panels at every phase's end too, and nothing says so.
- **A choice dropped inside a running phase** because its offer went away: the lights go out, or another player takes the position. The phase did not close, and the pack has no words for it.

## The boundary

- **The hunk.** Marked `BEGIN shell connection` / `END shell connection` in `apps/game/hosted/vite.config.mjs`. It adds four entries to `allowedSources`: `phone-shell/phone-shell.mjs`, `phone-shell/phone-shell.css`, `kit/kit.mjs` and `kit/kit.css` (`icons.mjs` is in the room connection's hunk). With shell 0.3.2 it adds one more, `design/phone-ui/components/icon-paint.mjs`: the icons' painted form, which the shell imports for the bottom bar's tiles and which imports `icons.mjs` only. For Integration's approval with the rest of the hunk. Nothing else; the shell's and the kit's `preview/` and `review/` are never imported.
- **How it was checked.** The hosted config was built with its own fence and Firebase registry plugins, and without the release plugins, which refuse first:
  - with the hunk, the build passes;
  - without it, the fence refuses `phone-shell.mjs` and `phone-shell.css`;
  - without the `kit.mjs` entry, it refuses `kit/kit.mjs`; without `phone-shell.css`'s, that file.
- **Found: the fence does not see a stylesheet's own `@import`.** Without the `kit.css` entry the build still passes. `phone-shell.css` imports `kit.css` with `@import`, which Vite's CSS pipeline inlines without the module hook the fence uses (`transform`). A trace of that hook lists `phone-shell.css` and never `kit.css`, and `kit.css`'s rules are in the bundle's CSS. The entry is there, as the handoff asks. Any admitted stylesheet's `@import` passes the fence unseen the same way: for Integration.
- **What the production exclusion covers.** `test:frontend`'s check walks the module graphs of `@mothership/game` and `@mothership/presentation` and scans their `dist/`. It does not reach the hosted Planet app, so it says nothing about the shell, nor about the room scene (the room connection's page says it does). The fence is what keeps `design/` files out of the hosted bundle.

## The gates

These refuse the changed files until Integration approves. Each was found by reverting the changed files one at a time on this tree, and the drawing-port fence's on a clean worktree of origin/main. The gates themselves are untouched.

| Gate | Refuses |
| --- | --- |
| `npm run check:sources` | In order: `app.mjs`, then `render.mjs` ("Food consumer source: content differs", `scripts/food-consumer-source.mjs`, the frozen Food release; as on the base, where the room connection changed both); then, new here, `phone.css` ("Phone UI production consumer: current content differs") and `planet.css` ("Runtime art release: content differs"). With all four reverted it passes, so `check:sources` accepts the `vite.config.mjs` hunk and the new files |
| The hosted Vite build, plugin `reviewed-crew-drawing-release` | `app.mjs` first, as on the base |
| `npm run test:design` | 25 of 410 fail on shell 0.3.3, as on shell 0.3.2 (410 with the icons' six tests and the painted form's five, which pass); it was 25 of 399 on shell 0.3.0. Every one is on the Food release's refusal of `app.mjs`, which the room connection already meets (its page records 25 of 370). Before shell 0.2.10's eleven tests of the phase bars, which pass, it was 25 of 386 |
| `npm run test:tooling` | 68 of 356 fail, every one on that same refusal (the room connection's page: 68 of 356); the same on shell 0.3.2 and 0.3.3 |
| The same suites with `app.mjs` and `render.mjs` reverted | Every failure moves to the next pin: 25 of 386 design tests and 65 of 356 tooling tests, all on "Phone UI production consumer: current content differs: `phone.css`" |
| The same suites with all four reverted | 4 of 386 design tests and 6 of 356 tooling tests fail, every one on the drawing-port fence's three findings on `vite.config.mjs` (next row) |
| The drawing-port fence (`design/tools/lib/drawing-port-fence.mjs`, through the board-motion and pregame-films checks and six tooling tests) | `vite.config.mjs`: "required candidate drawing input differs" and "reviewed build adapter content hash differs"; and, as the reviewed hash carried the permitted literals, "production code refers to the board-motion prototype". **Already on the base:** run on a clean worktree of origin/main, main's config raises nothing, and the base's config (the room connection's hunk alone) raises the same three as this one's. The room connection's page, which checked `check:sources` only, did not name this pin |

**Also pinned:** `app.mjs` and `render.mjs` by `phone-ui-production-consumer-approval.json`, `crew-consumer-approval-2026-11-07.json` and `pregame-production-consumer-approval-2026-11-08.json`; the Food record also pins `vite.config.mjs` (from the room connection's page).

**These pass:**
- `test:frontend`: 226 of 226 and 864 of 864 (the room connection's 845 and this one's 19, on `aabb4417`), and the production exclusion (see [The boundary](#the-boundary) for what it covers);
- `typecheck`, `build`, `check:toolchain`, `check:workspace`, and `node design/tools/check-assets.mjs` (15 passed);
- `packages/design-tokens/test/phone-ui-native-compare.test.mjs`: 7 of 7, with the doubled selectors.

**The disk.** This machine's root filesystem reserves nearly all its space (`resv_strict`); about 0.5 GB was free when the suites first ran. `test:design` and `test:tooling` copy the repository into the temporary folder, and with it on that disk 83 more design tests failed with `ENOSPC`. The results above ran with `TMPDIR` on `/dev/shm` and two test files at a time.

## Evidence

### Tests

`apps/game/test/planet-phone-shell.test.mjs` passes 21 of 21. Every input it builds is accepted by the shell's own `checkBar`, `checkTabs` and `nextPhoneShellInput`. It covers:
- the bar: another player's turn, your turn, each of the game's own phase names, the pair, reconnecting with the round last seen, and "Loading the ship" on the first connect;
- the phase bars' words: before turns with an Officer, with a block shown, with no Officer and with the Officer's block open; the appointment for everyone else, never amber, and for the Captain with it open; the Blackout lit, with the time to lights-out, and dark; Ship synchronized's ring; Setting course in all four navigation phases, for everyone and for an office with its Navigation open; a shared display;
- the facts for those words: each read from the model, unchanged by any offer, role or private field, and every phase either `phaseBar()`'s or one of the game's own;
- the round stamp's moment and clock (G18): Round 1's Before turns and no other phase or round, the same window for a late phone; the server time plus the time since the model arrived, kept when a model is shown again, and none while untrusted, run out or not live; nothing private read;
- a phase that closed under an open choice: the moment from two models (the time up, another phase, every step of a choice; never one sent, registered or refused, a cancel, a sheet alone, untrusted time, or a model that isn't live or isn't this player's); the toast's words, icon and id; given once through the whole input, kept by the shell's checks, dropped under Food's surface; nothing private read;
- a phase that closed under a draft this phone alone holds: the same toast by the same rule, only for `true`, never for a draft closed or sent before the end, a lost connection, a phone put away, a display, another match or seat, or untrusted time; a choice and a draft together are one closed phase; nothing private read;
- the same on the game's own controller, with its test rig (`planet-support.mjs`): it clears an open choice at 0:00 without a word, and its models give the toast once; never for a cancel, a pass accepted, a lost connection, a phone put away or a sheet alone;
- the clock: the time as given, amber from 10 s, the ring without amber for the two fixed presentations, no clock while untrusted;
- Promises and ⋮;
- the tabs: the view, the open tab, the round button's modes and the result's Vote unavailable, the talk's buttons, an eliminated player's Actions, and the viewer's own person for the Card tab (theirs and never the active player's; no character; no seat; kept as last given while the connection isn't live, for the same seat only, with the versions last given; nothing kept from before the dark);
- the target bar and the chip, from this viewer's own action only;
- both banners, the pass's sheet and toast, and every sheet's frame;
- privacy: concealed and under Food's surface, the shell drops this viewer's inputs and keeps its shape; a display gets no tabs and no viewer, only ⋮ and Settings, and nothing private;
- the host sheet (the pre-game connection's Host controls): in Settings' place only, its footer, Back and Close routed to it, and its Close dismissing Settings too;
- each intent's call, and none after dispose;
- where the focus goes back, and that it goes into an open sheet: to the title of a sheet that was not the open one before, whatever ended; in a sheet that stays, for one of its own controls, by the footer's order; only while a sheet is open after the shell's change, never when the sheet closed with nothing in its place, and never without the shell's report;
- the lifecycle: the listeners added and removed together, and the shell running only while shown and focused.

### The check

`GAMEN_PHONE_ART_BASE=<clean worktree of origin/main> node design/tools/shell-connection-check.mjs`:
- It builds Frontend's two harnesses from this tree: the phone harness (`apps/game/dev/phone`: the real Planet app, controller and renderer over its synthetic connection) and the Food harness (the same app on the frozen Food release's packets), with art from origin/main.
- It serves them with the hosted game's production headers (`createHostedPreviewHeaders`, headers SHA-256 `424e5dec…`, the same as the shell's and the room scene's checks).
- It drives the app at 390 × 844 and 430 × 932, and two sheets at 320 × 568 with the Largest text, in one browser, one page at a time. `--only` draws some states and adds them to the record when it names the same candidate, art and headers. This record was made in one run.

**Result:** 44 of 44 captures pass: twenty-one states at both sizes, and two sheets at 320 × 568 with the Largest text. Recorded on `aec6264a` (shell 0.3.3 with icons 1.1.0, kit 0.8.2 and room scene 0.5.1; the focus going into an open sheet, from its own controls and from another sheet's content) with the source clean and the art from `64e55516`, in one run. `64e55516` was `origin/main` in this clone at the run; `main` has since moved to `7d18ac0f` by two documentation files (`AGENTS.md` and `docs/agent-roster.md`), so the art and the harnesses are the same.

**Against `09ea99be`'s record,** the same 44 captures before a row's rule: every recorded box is the same (419 boxes), and every check and every sheet's measure has the same answer. `course` gains one fact at both sizes, held: the Navigation row focused and pressed, the focus is on the Navigation sheet's Back. The tab bar has no changed pixel; the top bar differs only at the result's ring (3 and 17 pixels) and one digit of the clock (`blackout` at both sizes and `appointment` at 390 wide, 151 pixels each), the harness's time. `concealed` is the same byte for byte.

**Before it, `09ea99be`'s record** (the focus into any open sheet) **against `0fe15dc2`'s,** the same 44 captures before the rule was widened: every recorded box is the same (419 boxes), and every check and every sheet's measure has the same answer. `course` gains one fact at both sizes, held: after Back from Navigation the focus is on the Panels sheet's Close. The tab bar has no changed pixel; the top bar differs only at the result's ring (8 and 4 pixels) and one digit of `voted`'s clock at 430 wide (270 pixels), the harness's time. `concealed` is the same byte for byte.

**Before it, `0fe15dc2`'s record** (the focus kept in the same sheet) **against `92849b6b`'s,** the same 44 captures before the focus rule: every recorded box is the same (419 boxes), and every check and every sheet's measure has the same answer. `largest-ballot` gains three facts, all held: the focus on Vote once a name is chosen; Vote sent once; and the focus on the sheet's Close while the sheet is still open with its footer action gone. The tab bar has no changed pixel. The top bar differs only at the result's ring (25 and 3 pixels) and one digit of the clock (`blackout` at both sizes, 151 pixels each, and `voted` at 430 wide, 270): the harness's time. `concealed` is the same byte for byte. Nothing drawn changes, as it must: the rule moves the focus and nothing else.

**Before it, `92849b6b`'s record** (the phase-closed rule's `drafting`, which nothing passes in this PR) **against `637079f2`'s,** the same 44 captures before `drafting`: every recorded box is the same (419 boxes), every check and every sheet's measure has the same answer, and the tab bar has no changed pixel. The top bar differs only at the result's ring (20 and 14 pixels) and at one digit of the Blackout's clock at 430 wide (151 pixels): the harness's time. `concealed` is the same byte for byte. The game behaves as before, as it must: nothing passes `drafting` here.

**Shell 0.3.3 changes nothing the connection gives or hears,** and nothing in these states' frame. `637079f2`'s record (shell 0.3.3 merged) against `97e28d09`'s (shell 0.3.2), in the 42 captures both have:
- **Every recorded box is the same:** 394 boxes (the bars, the tabs, the round button, each sheet, the target bar, the banners, the stage), to a tenth of a pixel. Every check has the same answer.
- **The tab bar has no changed pixel** in any capture, a pixel counted when it is more than 32 of 255 apart. **The top bar** differs only at the result's ring (5 and 4 pixels): the harness's time.
- **The Pass sheet** has no changed pixel at either size. The Actions sheet and the ballot differ only where the room moves behind their glass (at most 3,248 pixels, none of them in the ballot's head).
- **`closed`,** the one state with a toast, keeps it in its own place: no banner and no sheet is in its way.
- The rest differs inside the stage, where the room moves. `concealed` is the same byte for byte at both sizes.

**The two new captures, and what they do not show.** The Lead Designer asked for a squeezed sheet in the real app at 320 × 568 and 200 %, so the game itself would show both sheet rules. No sheet of this build is squeezed at that size. Tried there, with the Largest text chosen in the game's own Settings: Settings, Actions, Panels, Card, "Pass your turn?", "Submit final Code" and the ballot with a name chosen. None has a title of more than two lines, and none leaves its content under a third of the sheet. So the record holds the two that leave the least room, and that the rules leave them whole:

| Capture | Title | Head | Content | Footer | Sheet | What it holds |
| --- | --- | --- | --- | --- | --- | --- |
| `320x568/largest-pass` | "Pass your turn?", two lines | 114 px, a row | 16 px, all of it shown | 149 px: Cancel and Pass, a row each | 292 px | The head is not stacked, the footer stays at the sheet's foot, the sheet is inside the screen |
| `320x568/largest-ballot` | "Jail vote", one line, with ✕ | 66 px, a row | 153 px, all of it shown | 89 px: Vote | 321 px | The same; the content keeps more than a third of the sheet |

The first sheet in the game that would be squeezed is an offer's, with release 3's Promises (#310): a long title with Back and ✕, and two buttons a row each. The shell's own record draws that sheet (`offer-large`, in [the shell's page](phone-shell.md#the-toasts-place-a-squeezed-sheet-and-a-long-title-033)).

Before it, `97e28d09` (shell 0.3.2 with icons 1.1.0: the bottom bar's icons as painted tiles) passed 42 of 42. Against `c3016fa8`'s record (shell 0.3.1), with the tab bar cut in fifths, one per tab, and a pixel counted when it is more than 32 of 255 apart:
- **In the 17 states that draw the game's tabs,** at both sizes: Board's, Actions' and Panels' places change by the tile (about 2,600 to 3,500 pixels each at 2×), and the round button's by its painted icon (about 1,100 to 2,700).
- **The Card tab's place has no changed pixel** in 16 of them: the portrait is as it was. That holds in `reconnecting` too, where the portrait is kept as last seen.
- **`blackout`** is the seventeenth: the Card place changes (2,902 pixels at 390 wide, 2,914 at 430), from the card's line icon to its tile.
- **`talk`, `display` and `food-surface`,** which draw no game tabs, have no changed pixel in the bar's place. `concealed` is the same byte for byte at both sizes.
- The check holds, per state: three tiles at 32 × 32 px on a turn with none ringed at rest, `pass:painted` on the round button, the portrait apart from a tile on the viewer's own turn, and no portrait with four tiles in the Blackout's dark.

Before it, `c3016fa8` (shell 0.3.1 with kit 0.8.2 and room scene 0.5.1: the Card tab's portrait at the top bar's 32 px, kept as last seen while reconnecting) passed 42 of 42. Before it, `fab43d8d` (shell 0.3.0: Card the last tab, with the viewer's own person given for its portrait) also passed 42 of 42. Before it, `211b5b58` (shell 0.2.12, the phase-closed toast, the host sheet hook, the doubled selectors, and the game's sheet rules kept off Designer components in the sheet body) also passed 42 of 42. Before it, `8ad0ff44`, the same less the sheet rules, also passed 42 of 42. The in-game animation builder's run of the phase-closed toast's patch, on its own commit on `c19be75a`, also passed 42 of 42. Before them, `883473be` (shell 0.2.11 with kit 0.8.1, the phase bars' words, and no banner on the first connect) passed 40 of 40, as did the in-game animation builder's run of its patch on its own commit before the 0.2.11 merge. Before those, `00e679e9` (shell 0.2.9) and the helper's first record, `45afe011` (shell 0.2.8), each passed 34 of 34.

Against `fab43d8d`'s record (shell 0.3.0):
- **The Card tab's place only,** in 32 captures: the portrait's own box, from 336.5 to 365.5 px across at 390 wide and from 372.5 to 401.5 at 430, between 2,472 and 2,521 pixels each. The Card label, Panels and every other tab did not move.
- **`reconnecting`,** at both sizes, is among them: 2,514 and 2,521 pixels, all in that box. Before, the card icon; now Player 6's portrait, the same picture as on their turn. Nothing else in the frame differs there, and its top bar has no difference at all.
- **`blackout`** has no difference in the tab bar: the card icon, as before. Nor have `talk`, `display` and `food-surface`, which draw no game tabs. `concealed` is the same byte for byte at both sizes.
- **The top bar** differs only at the result's ring (at most 5 pixels): the harness's time.
- The rest differs inside the stage, where the room moves.
- **Two runs before this record failed or misled, and are why it is as it is.** On `73d5c1a0` the kept person drew the older crew card art, because the model has no versions without a current state; the check's fact then matched either picture and passed. On the next commit, with the fact naming the crew portrait's own property, `reconnecting` failed at both sizes: the right property, and nothing drawn, because the crew's picture surface had gone with the versions. `c3016fa8` keeps the surface.

Before, `fab43d8d` against `211b5b58`'s record (shell 0.2.12):
- **The tab bar changed in its fourth and fifth places only,** in the 34 captures that draw the game's tabs: Panels and Card changed places, and Card draws Player 6's own portrait. Between 3,588 and 4,296 pixels each, from 254 to 370 px across at 390 wide and from 282 to 406 at 430. Board/Room, Actions and the round button did not move.
- **The six captures with no game tabs** (`talk`, `display` and `food-surface` at both sizes) have no difference in the tab bar's place. `concealed` is the same byte for byte at both sizes.
- **The top bar** differs only at one digit of the clock (`ballot`, `blackout` and `voted`, at most 270 pixels) and at the result's ring (at most 111 pixels): the harness's time at the capture.
- The rest differs inside the stage, where the room moves, also behind the glass of a docked sheet.
- In `own`, at both sizes, the record holds the Card tab's facts: the last tab, its portrait drawn from `--ms-asset-crew-portrait-c6` in a 26 × 26 px box, no icon, the word "Card" and no other name.

Before, `211b5b58` against `8ad0ff44`'s record:
- Nothing in the frame moved. The tab bar is the same in all 42 captures. The top bar differs only at the result's ring (26 pixels), the harness's time.
- The sheet rules change nothing here: nothing in this connection mounts a kit root in the sheet body, so the game's own sheets keep their rules. Inside the docked sheets, which are glass, only the room moving behind them differs (at most 850 pixels); the ballot's sheet doesn't differ at all.
- The rest differs inside the stage, where the room moves. `concealed` is the same byte for byte at both sizes.

Before, `8ad0ff44` against `883473be`'s record:
- `closed` is new, at both sizes: the toast "That phase closed · choices cleared" under the bar at 0:00, the clock amber, Pass unavailable.
- No bar, tab or sheet frame moved. The tab bar is the same in all 38 captures that both records have. The top bar differs only at the clock's digits (`turn`, `voted` and `ballot` on 390 × 844, at most 270 pixels) and the result's ring (at most 63 pixels): the harness's time at the capture.
- Everything else that differs is inside the stage, in at most 48,216 pixels: the room's picture, which moves (the window's voyage and the figures' idle motion), also through a sheet's glass. `concealed` is the same byte for byte at both sizes.

Against `00e679e9`'s record (for `883473be`):
- `before`, `appointment` and `course` are new, at both sizes.
- `blackout` and `target` changed in the top bar, by its words: "Dark · positions fixed", and "Block a move · Before turns · Officer".
- `result` changed in the round button: an unavailable Vote is paper with dimmed words, as shell 0.2.10 draws it.
- `result` also changed in its clock's ring, and `turn` and `voted` in the clock's digits: the harness's time at the capture.
- In every other capture the bars and the tabs are the same, no pixel more than 32 of 255 apart. What differs is inside the stage: the room's picture, which moves, also behind the glass of an eliminated player's banner. Two captures are the same byte for byte.

| State | What it shows and checks |
| --- | --- |
| `turn` | Another player's turn: "Crew 1 · Player 1 · Turn" with the portrait, R6, the clock, Promises and ⋮; the tabs Board, Actions, Pass (unavailable), Panels, Card. From shell 0.3.2, Board, Actions and Panels are painted tiles at 32 px with no ring at rest, and Pass's icon is painted |
| `own` | Your turn: "Your turn" and, in amber, "Player 6 · Crew 6"; Pass usable; the room scene in the stage. Card is the last tab and draws Player 6's own portrait at the top bar's 32 px, with its word "Card" (shell 0.3.0 and 0.3.1) |
| `pass` | "Pass your turn?" with Cancel and Pass, and nothing sent. Then Pass sends `PASS_TURN`, once, and the sheet closes |
| `actions` | The Actions sheet: the game's tiles in the shell's frame, the Actions tab open. Then Escape from inside the sheet closes it, and the focus goes back to the Actions tab |
| `target` | The Officer's block from Actions: the top bar "Block a move · Before turns · Officer", the target bar "Block movement" with Cancel, no sheet, three people offered in the scene, the round button kept (T2). Then Cancel ends the choosing, and the top bar is everyone's again |
| `closed` | A phase that closed under an open choice: Scan opened from Actions, then the harness's own turn moved so that it ends 1.2 s later. At 0:00 the game clears the choice: the bar stays "Your turn" at 0:00, Pass is unavailable, nothing was sent, and the toast says "That phase closed · choices cleared". Then the next turn arrives, with no second toast |
| `reconnecting` | The reading fails: the bar "Reconnecting… · Showing Round 6 as last seen", the banner with Retry, every tab and the round button refused, the room dimmed. The Card tab keeps Player 6's portrait as last seen, the same picture, though the model holds no identities now. Then Retry reads the session again |
| `eliminated` | This viewer's seat Eliminated: "You’re out · You can watch. Your role stays private.", no Retry, the figure down in its place; Actions and Pass unavailable, the Board, Card and Panels usable |
| `vote`, `ballot`, `voted` | A Jail vote: the round button as Vote. Then the ballot, "Jail vote", large, with the game's roster and Abstain, which Close leaves. Then the registered ballot: Voted |
| `result` | The 5 s result: "Vote result" with the ring, no Promises, the round button Vote and unavailable, and the game's result window in the cover, between the bars. Then ⋮ opens Settings over it |
| `talk` | A private talk on a talking phone: the pair bar "Crew 6 + Crew 1 · Private talk", Promises and My card in place of the tabs, the capsule's tags above them |
| `food-gauge` | The Food release: its gauge beside the shell's clock, the shell live under the Food match |
| `food-surface` | Food's own surface over the screen: the shell concealed (its bars empty, no control), Food's bar and tabs exactly over the shell's, and a tap on either reaching Food |
| `blackout` | The Blackout's dark bar and the moon, "Dark · positions fixed", the clock amber. The Card tab shows no portrait, and the card's own icon in its place (its painted tile from shell 0.3.2, so the bar has four tiles): in the dark the game gives no one's identity, the viewer's own among them, and the portrait returns with the lights |
| `before` | Before turns, on the Officer's phone with nothing open: "Before turns · Officer block · Blackhole", the hourglass, the clock, Promises and ⋮ |
| `appointment` | The Officer's appointment, on the Captain's phone with nothing open: "New Officer · Crew 6 chooses". Then the appointment from Actions: "Appoint Officer · Random if time runs out" |
| `course` | Setting course, on the Officer's phone with nothing open: "Setting course · The offices are setting it". Then Navigation from Panels: "Setting course · Officer · private", the focus on the Navigation sheet's title (the row that opened it had the focus). Then Back: Panels opens in its place, and the focus is on the Panels sheet's title, not on the Panels tab behind it |
| `display` | A shared display: no tabs, no Promises, ⋮ the only control, the whole board. Then ⋮ opens Settings with the display's preferences |
| `concealed` | The page hidden: the bars' empty material only, the tab bar's shape kept |
| `focus` | Where the focus goes when a sheet opens, each control focused and then pressed as a keyboard does. The Actions tab: on the Actions sheet's title. Submit final Code's tile: on that sheet's title. Its Close: back on the Actions tab. Scan, then Player 2 on the board: on the Scan sheet's title (the capture). Then Room B's heading and position B5 on the board: on the Move sheet's title, with Register in its footer. Then another player's name changes and the sheet is drawn again: the focus is still on the title. No ring is drawn on a title, and no command is sent |
| `largest-pass` | At 320 × 568 only, the Largest text chosen in the game's Settings: "Pass your turn?" with Cancel and Pass. The head a row, the footer at the sheet's foot, nothing cut |
| `largest-ballot` | At 320 × 568 only, the Largest text: the ballot with Player 2 chosen, and Vote. The head a row, the footer at the sheet's foot, nothing cut. Then Vote is sent: the sheet stays open while it registers, its footer action gone, and the focus is on the sheet's Close, not on the round button behind it |

Each capture also passes with: the shell mounted and the stage in it; none of the old header, tab bar, Pass button, sheet or target bar; no unexpected policy report (only Zod's known, caught eval probe); no failed request and no page error.

### Differences from the pack

- **"Pass your turn?"** has no "The turn goes to Name · Player n": the projection carries no turn order, and the phone never works one out. Nor the pack's note "Your move stays open on the other turns this round", a rule's words, which belong with the sheet's content.
- **After Pass** the toast says the model's words, "Registered. Waiting for the authoritative view.", where the pack says "Turn passed" (`planetRegistrationText`, Frontend's copy).
- **The sheets' contents, the result window and the end of the match** are the game's own until their components.
- **The ballot's footer:** the pack's is Abstain · "Vote for Name". The game's Abstain is in the sheet's body, and its Vote is the footer's action at the check.
- **The 6 s Ship synchronized presentation** keeps the tabs. The pack draws it edge to edge without them, which comes with the film's component.
- **A phase's line** is the pack's for the phases `phaseBar()` draws (shell 0.2.10). For the votes, Food Supply and a talk seen by others it is still the board's label (as "Current board · shared: …"), where the pack's specimens have other lines: their words come with #267's `ballotBar()` and `resultBar()` and the private talk's `talkBar()`.
- **The deciding player's own bar** shows once their choice is open, not from the phase's start: the pack opens the Captain's and the Officer's sheets by itself (sheet 40), which comes with their component.
- **"Loading the ship"** has no "Room n of 5": the model holds no count.
- **"The ship moved"** is not shown: ship travel (#269) is not connected.
- **A display** uses the player's bar without Promises, with ⋮ (above): its own bar is a later sheet.
- **The bars and the bands:** with no safe areas (desktop Chromium's `env()` is 0) the shell's bars are 52 and 58 px, so the stage is 390 × 734 and 430 × 822. The shell's preview emulates 47 and 34 px safe areas, so its bars are 99 and 92 px and its stage 390 × 653. Today's bars left the room connection 390 × 716, so the bands it describes with today's art stay, a little taller, until `room-drawing-1.0.0`. On a phone the shell adds the real safe areas itself (`insets: null`).

### The merge gate's comparison

`design/tools/phone-ui-native-compare.mjs --only room-b,capsule,pass,actions,targeting,card,panels,settings,promise-incoming,jail-ballot,jail-result,blackout,reconnecting`:
- The build is the check's own bundle (`--keep`); both sides name `45afe011` (before the 0.2.9 merge, which changed only the target bar under a banner and at the Largest text), clean, with art from `64e55516`. Its `compare.json` is in `design/phone-ui/review/shell-connection/`; its pictures stay outside the repository.
- Every step reached the shell's own controls through the doubled selectors ("tap: Pass your turn", "tap: Open the ballot", "tap: Promises, 1 new"), and neither side met a problem.
- **The frame:** in the pairs looked at (the pass, the targeting, the Card and the result), the build's top bar, tabs, round button, target bar and sheet frame take the pack's form, in the pack's places.
- **The differences are elsewhere:**
  - the sheets' and the result window's contents, the game's own;
  - the pass sheet's missing line and note (above);
  - the harness's sample names, rooms and rounds;
  - the pack's frames carry 47 and 34 px safe areas, so its bars are taller;
  - **in the shell itself:** an unavailable Vote (the result) is steel, where the pack's is paper with dimmed words, because the pack's `.hero[data-mode="vote"]` rule follows its unavailable rule (`prototype/kit.css` lines 196–197). The shell's agreement compares the round button's mode and state, not its fill. For the Lead. **Since then:** shell 0.2.10 draws it paper and its agreement compares the fill; the check's `result` capture above shows it. This comparison has not been run again.

### Not run

- Physical phones, Safari, screen readers, the frame rate and a live match.
- The Largest text in the real app: the shell's own check covers it in its preview.

## Open

- **For the Lead:**
  - the differences above, chiefly the pass sheet's missing line;
  - the words of an eliminated player's Actions reason;
  - ⋮ on a shared display, which the handoff leaves out and the connection keeps for the display's Settings;
- **The Lead's calls on the phase bars (17 November):**
  - **The first connect has no ⋮,** as the pack's Loading bar has none. Loading the ship takes seconds; if it fails, the reconnecting bar brings ⋮ back with the banner's Retry.
  - **The first connect has no banner** (above): "Connection lost" under "Loading the ship" said something had been lost before anything was seen.
  - **The deciding player's own bar follows what is open,** as the shell's contract has it: until the Captain opens the appointment, their phone shows everyone's "New Officer · Name chooses". The office decisions' own sheets (sheet 40), which open by themselves, come with release 3.
  - **The three new states stay in the check** (`before`, `appointment`, `course`).
- **For Integration:**
  - the fence hunk;
  - the pins on `app.mjs`, `render.mjs`, `phone.css` and `planet.css`, and the drawing-port fence's on `vite.config.mjs`, which the room connection's hunk already meets;
  - the fence not seeing a stylesheet's `@import`;
  - the production exclusion not reaching the hosted app;
  - the harness's `openJailVote()` keeps the board's checkpoint, which the Blackout release's contract refuses ("Shared checkpoint publication round and phase must agree"); the check opens its vote with `AFTER_BLACKOUT`, as the scenario builder does.
- **For Frontend:** seventeen development scripts, which no suite runs, drive the old header, tab bar, Pass button and sheet by their ids (`#planet-nav-*`, `#planet-pass`, `#planet-top-*`, the old sheet's `#planet-confirm` and `#planet-close`) or classes (`.planet-header`, `.planet-nav`, `.planet-sheet`, `.planet-target-bar`). No suite runs them, and they were not changed or run here. They need the shell's controls, named beside today's as the comparison's steps now are:
  - `apps/game/dev/phone/`: `capture.mjs`, `presentation-capture.mjs`, `blackout-capture.mjs`, `blackout-connected.mjs`, `food-connected.mjs`, `food-app-smoke.mjs`, `food-chrome-regression.mjs`, `round-order-capture.mjs`, `art-checks.mjs`, and `food/app-main.mjs`, whose Tasks fallback goes through `#planet-nav-actions`;
  - `apps/game/dev/planet/`: `capture.mjs`, `capture-library.mjs`, `capture-stage.mjs`, `capture-terminal-return.mjs`, `capture-review-safety.mjs`, `capture-private-feedback.mjs`;
  - `apps/game/dev/host-abort/capture.mjs`.
  - **One of them runs in CI, so the connection changes it:** `apps/game/dev/planet-emulator/capture.mjs`, step 9 of the `backend-emulator` job. Its three in-match steps (the host's ⋮, then the recovered player's Card tab and the sheet's ✕) now take doubled selectors, the old id or the shell's control, as `design/tools/lib/phone-ui-native-parts.mjs` does. Its pre-game steps are the Pre-game builder's to move with release 4. The Pre-game builder found it.
- **For Frontend:** the review. These change behaviour:
  - Actions is unavailable to an eliminated player;
  - the 5 s result's round button is Vote, unavailable;
  - closing a sheet hands the focus back to the control that opened it (today's Escape went to the Board button);
  - **with a sheet open after a change, the focus is in that sheet** (the Lead Designer, 18 November 2026). Before, the focus went to the control behind the sheet, or stayed on it. A keyboard or screen-reader player was put behind a sheet they were looking at.
    - **Another sheet opens, or takes the place of the one before, whatever was pressed** (a tab, the round button, a Panels row, an Actions tile, Back, a person, a position on the board; with release 3, a Promises row): the focus goes to the new sheet's **title**, which shell 0.3.4 lets take it. A screen reader says where the player is. No control has the focus, so a key held on what was pressed presses nothing in the new sheet: Enter held on the round button opens "Pass your turn?" and does not pass. The title keeps the focus when the sheet is drawn again while it waits.
    - **The same sheet stays open and one of its own controls ended** (a drawing's Show gives way to Done in release 3; Vote goes while the ballot registers): its first available footer action, then its Close, then its Back.
    - **A choice made inside a sheet that stays** (a name in the ballot) moves on to the sheet's confirm action, as before, also when the focus was still on the title.
    - `render.mjs` compares the open sheet's id before and after each change of the shell (`shellSheetEntered()`). This replaces the earlier entry by Back and Close, and the jump to Register after a choice on the scene (`focusNext`).
    - **Closed:** release 3's "Check before doing anything else" sheet has neither Back nor Close; its title now takes the focus, not "Retry the same".
    - **Open:** the better landing after Back is the row that opened the page (the Lead Designer's note from Panels). Not done here.
    - **A held Enter** can still press an action that takes the place of the one just pressed in the same sheet. Today that is Done after Show, which is harmless. If a sheet ever puts a weightier action there, that sheet's action is guarded against key repeat then;
  - the old target bar's "Target list" is the board's List chip, and in the room view "Other rooms · n" opens the board;
  - under Food's surface the shell is concealed, and the board keeps the shell's bars (Food's measured the same at both sizes);
  - the result window and the status line lie under the shell's sheet, banners and toast; the status line hides while concealed and while the reconnecting banner shows;
  - Retry reads the session at once;
  - an open sheet hides Room B's "Windows" control, as the handoff says;
  - the renderer reaches the shell's `element`, which the shell returns but its page does not list, to focus the sheet's footer action and the controls the focus goes back to.
