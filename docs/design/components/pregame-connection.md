# Pre-game connection: the screens before the match drawn by Designer's components

**Status (17 November 2026):** a draft, in progress, for the Lead Designer's review, then Frontend's. It is not in the game yet.
- Integration first approves the source fence's marked hunk and the pins that refuse the changed files (see [The gates](#the-gates)).
- This is not a release. It is release 4 of the owner's plan of 16 November 2026 (#222; `docs/design/owner-decisions.md` at `d54c15bd`).
- It is stacked on the [shell connection](shell-connection.md) (#307), merged at `4892423e` (#307 at `d1068424`: shell 0.2.11, kit 0.8.1, the phase bars). The parts come in by merge commits: the entry chain (#295 at `87960b65`), character selection (#292 at `a5590266`), the role stage (#268 at `c20cac9f`), boarding (#272 at `3efbd4e7`), and join and waiting again for the game's gaps (#289 at `98b67ef4`, with #287's `147a66d6`).

**What it is:** before the match, the Planet app mounts Designer's pre-game components as they are, one at a time in its root, instead of its own forms. The look and the motion come from `design/`; the app keeps the data, the commands and the lifecycle.

| Screen | Component | Sheet |
| --- | --- | --- |
| Main menu, with the brand film's still as its hero | `main-menu-0.1.0` (#278) | 10 |
| Display settings, before a match | `display-settings-0.1.0` (#294) | 32 |
| Host setup | `host-setup-0.1.1` (#287) | 11 |
| The host's lobby | `host-lobby-0.1.2` (#287) | 11 |
| Join, then waiting and admitted | `join-form-0.1.0`, `join-wait-0.1.1` (#289) | 12, 13 |
| Recover, through "Seat n is yours again" | `recover-0.1.0` (#291) | 14 |
| Character selection | `character-select-0.1.0` (#292) | 16 |
| The role stage | `role-stage-0.1.0`, `role-card-0.1.0` (#268) | 17, 18 |
| Boarding | `boarding-stage-0.1.0` (#272) | 19 |
| "ROUND 1" over the room as Round 1 begins (part 9) | `round-stamp-0.1.0` (#288), on the shell's cover | 19 |

**Still to come:** Settings and Host controls in the match (part 8, waiting on the Lead's sheet hook).

## Files

| Path | What |
| --- | --- |
| `apps/game/hosted/planet/pregame-input.mjs` | Pure: which screen a session state shows (`pregameScreen`), what a withheld screen is told (`withheldStatus`), and each component's input from the session's model and this phone's drafts |
| `apps/game/hosted/planet/pregame-screens.mjs` | The manager: mounts one screen at a time, updates it only when its input changes, routes each intent to the session's existing operations or to local navigation, and draws the hero's still |
| `apps/game/hosted/planet/pregame-connection.css` | Gives the root the phone's height and canvas, and sizes the hero's still. Nothing of a component's |
| `apps/game/hosted/planet/app.mjs` | One marked block asks the manager first; the old entry tabs and forms, the waiting branch, the choosing grid, the role card and the lobby's host controls leave `lobbyView()` |
| `apps/game/hosted/planet/preferences.mjs` | `state()`, `setReducedMotion()`, `setTextScale()` and `subscribe()` for Display settings (G9); `get()` and `controls()` unchanged |
| `apps/game/hosted/planet/render.mjs` | One marked block (`round stamp`): mounts the round stamp on the shell's cover as Round 1's Before turns shows the room, and disposes it (part 9) |
| `apps/game/hosted/vite.config.mjs` | Two marked fences: `pre-game connection`, exactly the components' 22 runtime files, and `round stamp`, its 2 |
| `apps/game/test/planet-pregame-screens.test.mjs` | The adapter's test |
| `apps/game/dev/planet-emulator/capture.mjs` | The emulator run's pre-game steps, moved to the new screens (below) |
| `design/tools/pregame-connection-check.mjs` | The check, and its record in `design/phone-ui/review/pregame-connection/` |

## Routing

`pregameScreen(model, ui)` gives the screen, or `null` for the app's own view:
- **No match:** the menu, or the screen its choice opened (Display settings, host setup, Join, Recover), while the session is live. Not live, or uncertain: today's Reconnect and Retry (G14).
- **A pending request:** waiting, until it settles.
- **The lobby:** the host's lobby for the host; waiting, admitted, for a seated phone; an admitted shared display keeps its own screens.
- **Choosing, reading, boarding:** character selection, the role stage and boarding for a seated phone; a display boards with the crew. A seatless host device keeps today's screens (G15).
- **Recover's answer** holds the screen until Continue, even once the match runs.
- An authorization error, and every status after boarding, are the app's own.

## As last seen, and hidden (G11, as the Lead refined it)

- While the session withholds a matched screen's data, the mounted screen stays. Reconnecting, the stages get `status: 'stale'` only; hidden, `'concealed'` only. The lobby and waiting have no status input, so they get `interactive: false` only.
- The manager keeps no copy of the session's data.
- An authorization error drops the screen.

## The game's gaps (#222)

Where the game gives nothing, the input says nothing; no screen works out a rule.

| Gap | What the connection does |
| --- | --- |
| G1 | **The team mix (the Lead, 17 November: (a)).** Host setup opens with each count's `mix: null`, and no line is drawn under 7/8/9 (`host-setup-0.1.1`). The mix stays the engine's to give |
| G2 | The bot range and "n more seats to fill" are today's arithmetic, moved into the adapter unchanged |
| G3 | Refusals are the session's own words, shown on the screen that sent the command |
| G4 | No recovery code length, and no seat for an issued code |
| G5 | Character selection is never drawn closed or assigned |
| G6 | **No command to leave or withdraw (the Lead, 17 November).** The host's Leave, and waiting's Cancel, Leave and Back to menu, are passed `{ enabled: false, reason: 'Not available in this test' }` (`NO_COMMAND_REASON`): dimmed and refused by the kit's control policy, with the words as their description, and no handler. Not a button that does nothing, nor a local leave the session's resume would undo (`host-lobby-0.1.2`, `join-wait-0.1.1`) |
| G7 | The role card's facts are null until there is accepted copy |
| G9 | Display settings' Reduce motion is the stored choice; the phone's own is its lock |
| G10 | One busy flag becomes one busy control: the command this phone last sent |
| G11 | Above |
| G12 | The waiting name after a reload is the draft's, which a reload empties |
| G13 | The menu and Display are local entry modes (Frontend's navigation) |
| G14 | No offline note: the session can't tell it apart on the entry screen |
| G15 | A seatless host device keeps today's screens while players choose, read and board |
| G16, G17 | The pack's role card: no knowledge lines (they stay on the Card tab), no manual conceal; Show role calls `revealRole(true)` |
| G18 | The round stamp waits on the trusted clock and Round 1 detection |

## The round stamp (part 9)

Designer's round stamp (#288, "ROUND 1" over the room as Round 1 begins, accepted by the Lead at `8be96ef7`) is mounted by the renderer, as the shell connection's page asks, with its moment and clock (G18, #307 at `a58e8b64`).
- **When:** while `roundStart(model)` gives a window (Round 1's Before turns, public facts only) and the room view shows. It is disposed when the window ends, the room view leaves, or the renderer is disposed.
- **Its input** (`roundStampInput` in `pregame-input.mjs`): the round and the window from `roundStart`, the shell connection's `serverClock.current()` (or none, so nothing is drawn), the shell's own status (`live`, `stale`, `concealed`), and the game's Reduce motion. One stamp at most, updated only when what it draws changes; it is suspended and resumed with the shell.
- **The stamp keeps its own time:** a late phone finds its window past and draws nothing; it never advances the game, takes no taps and is hidden from assistive technology.
- **Under the Food rules,** a match opens in Food Supply (the engine opens it at the match's creation), and Food's surface covers the shell. `roundStart()` gives nothing during Food Supply, so the stamp lands at Round 1's first Before turns, when the room first shows: about 30 s into the match, not at its start. A phone that comes back from Food's surface after the stamp's length sees no stamp. Without the Food rules, it lands at the match's start. Frontend's phone harness offers no Food rules, so the check shows the stamp at Round 1's Before turns and the late phone; the test holds that Round 1's Food Supply gives no stamp.

## The boundary

The `BEGIN pre-game connection` / `END pre-game connection` hunk in `apps/game/hosted/vite.config.mjs` adds exactly the components' 22 runtime files to `allowedSources`: `main-menu`, `entry-parts`, `display-settings`, `host-room`, `join-room`, `recover`, `character-select`, `role-stage` and `boarding-stage`, each component's `.mjs` and `.css` and never a `preview/` or `review/`. A separate `BEGIN round stamp` / `END round stamp` hunk adds the stamp's two (part 9), as the Lead asked: a release's own mount in its own marked block. The kit, the shell and the icon family are admitted by the shell's and the room's hunks.

## The gates

These refuse the changed files until Integration approves. The gates themselves are untouched.
- `npm run check:sources` refuses `app.mjs` first (the Food release's pin), as on #284 and #307, so `verify` fails there. The pins behind it have not been walked yet on this branch.
- The fence hunk in `vite.config.mjs`.

## Evidence

### The adapter's test

`apps/game/test/planet-pregame-screens.test.mjs`: 15 of 15. Routing and the withheld states; every input against its component's own checker (`next…Input`); busy per command (G10) and the lobby's arithmetic (G2); host setup with no mix (G1) and the three missing commands unavailable with the words (G6); the gaps left empty; the role card without knowledge; the preferences API; the round stamp's input (Round 1's Before turns over the room only, with the shell's clock and status, taken by the stamp's own checker).

### The check

`GAMEN_PHONE_ART_BASE=<clean worktree of origin/main> node design/tools/pregame-connection-check.mjs` builds Frontend's phone harness (`apps/game/dev/phone`: the real Planet app and its session over a synthetic connection) from this tree, with art from origin/main, serves it with the hosted game's production headers (`createHostedPreviewHeaders`, SHA-256 `424e5dec…`), and drives it in desktop Chromium at 390 × 844 and 430 × 932 at 2×. Each capture also checks that no unexpected policy report, failed request or page error occurred, and that none of the old pre-game view is left.

The states: the menu (after today's brand intro); Display settings, where Largest sets the root's size and stores it; host setup, with no line under 7/8/9, 8 chosen and Open room sending `create` with 8, then the lobby; Join, with Ask to join unavailable on the empty form (sheet 12's Empty state) and available once the code and the name make a request; waiting, with Cancel unavailable and Check again reading at once; admitted, with Leave unavailable; Recover, through "Seat 6 is yours again" and Continue, with the code box emptied and nothing stored naming the code; the host's lobby, with a request, Admit, Copy's toast, Start unavailable with "4 more seats to fill" and Leave unavailable; character selection, choosing Nova; reconnecting, kept as last seen, and Retry; the role stage, hidden and back, then Ready; boarding, today's film skipped, holding, then "Waiting for the ship". **The round stamp:** from the role stage, the match starts at Round 1's Before turns, begun 150 ms before; the stamp is caught running on the server's window (at about 180 ms), held at 600 ms for the capture, standing over the room ("Round 1", hidden from assistive technology, taking no taps); let go, it fades and goes by itself; at Round 2's Before turns it is disposed. **A late phone:** a fresh match whose Round 1 Before turns began 5 s before: the stamp is mounted for the window and draws nothing. The controller refuses a round that goes back, so the state starts a fresh match at Round 1, as a phone meets it after boarding.

### The emulator run

`apps/game/dev/planet-emulator/capture.mjs` (CI's `backend-emulator` job, against the real Auth, Firestore and Functions emulators) drove today's pre-game controls by their ids. Its pre-game steps now drive the new screens: each screen by the name the connection gives it, each control by its intent, used only once available.
- Host: the menu's Host, then Open room (7 players, as before).
- Join: the menu's Join, the code and the name typed, Shared display chosen for the display, Ask to join.
- Admit: each request's Admit, found by its name, with its kind checked from the session.
- Bots: + six times, each waiting for the server; then Start character selection; then c4.
- The role stage: the run taps Show role, as the old run tapped Reveal, where the session hasn't shown the role (the setup flows before 3; flow 3 shows it by itself). The pack has no conceal toggle (G17), so the non-phone run's case `human-reading-concealed` becomes `human-reading-card`, and the phone run's `explicit-conceal-after-foreground` goes: it checks instead that a fresh foreground shows the role again.
- Ready on the role stage; Recover by its two boxes, Recover seat, then Continue.

Its in-match steps are the shell connection's: the Lead doubled them with the shell's controls (#307 at `03119bd7`), merged here at `60053bb7`, where the two sides' lines met in one conflict, each keeping its own.

**Run here** (17 November), with CI's step (`firebase emulators:exec --only auth,firestore,functions`, `MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION=design-0.6.0`), after `npm run build` and the emulator preview's Vite build:
- **On `60053bb7`: 9 of 9 passed**, end to end: `host-created`, `display-pending`, `display-admitted`, `human-character-selected`, `human-reading-card`, `human-running`, `public-running`, `recovered-member-running` and `old-identity-revoked`. No manual advance or bot call, no runtime error, and the storage check on all four identities passed.
- Before the Lead's in-match steps, on `4892423e`, the first seven passed and the run stopped at today's `#planet-top-settings`; Recover was then checked with a local copy that issued the code by `session.operate` (not committed).
- The emulators log "Planet deadline has not elapsed" from the deadline task while a stage runs; the run doesn't depend on it.

### The merge gate's comparison

`design/tools/phone-ui-native-compare.mjs --only menu,host-lobby,characters,role-card,role-film,role-ready --stage-sheets`, on the check's own bundle (`--keep`; Frontend's harness config refuses an asset-tooling import here), built from `42337251`, clean, with art from `64e55516`. Its `compare.json` is in `design/phone-ui/review/pregame-connection/`; its pictures stay outside the repository.
- **Six parts, no problem met:** the parts whose build steps need no control of today's pre-game. Every step reached its screen.
- **What differs, all known:** the harness's sample names, rooms, roles and seats (Crew 1–9, PLANET, the Hacker); the pack's frames carry safe areas, so its bars sit lower; on the role card, no fact lines (G7); in the host's lobby, Leave dimmed (G6) and no host row for a seatless host device (G15); the role film is today's player, as decided.
- **The other five** (`host-setup`, `join`, `join-wait`, `recover` and `settings-entry`): their build steps tapped today's pre-game ids. With the Lead's agreement, `design/tools/lib/phone-ui-native-parts.mjs` doubles them as #307 doubled the match's: today's id first, then the new screen's control, in one selector list (the menu's Host, Join, Recover and Display settings choices; Join's code and name boxes and Ask to join). Nothing changes on the pack's side, and `phone-ui-native-compare.test.mjs` passes 7 of 7. `boarding` has no build side (today's film).

### Not run

- Physical phones, Safari, screen readers and a live match.

## Open

- **For the Lead:** part 8's sheet hook; G18's clock; the renewed acceptances of `host-setup-0.1.1`, `host-lobby-0.1.2` and `join-wait-0.1.1` (#287, #289).
- **For Integration:** the fence hunk and the pins.
- **For Frontend:** the review of `app.mjs`, `preferences.mjs` and the emulator run's steps.
