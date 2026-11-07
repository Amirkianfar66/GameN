# The board as the place the game is played (issue #87)

Issue [#87](https://github.com/Amirkianfar66/GameN/issues/87). This branch, `codex/frontend-board-motion`, was built from the Designer's head `e652bbf90f99b8aa616223c46f8ac8ff510cea03` (`codex/designer-board-motion`, [PR #88](https://github.com/Amirkianfar66/GameN/pull/88)) and rebased onto its newer head `ef4c2ee449f6b0a5991814e18acf7ab42e73ef02`, which adds the full-body figure proposal and changes only `design/`, `docs/design/` and a design-tokens test. Its runtime parent is `94a49ce0c5220b814ec56333b028fbe6180b257e` ([PR #86](https://github.com/Amirkianfar66/GameN/pull/86)). Protocol 2 is unchanged. New matches use engine `full-game-1.1.0` and ruleset `in-person-v1-pass-2026-10-08`. Legacy matches (`full-game-1.0.1`, `in-person-v1-2026-10-06`) keep working without Pass. Original Powers stay off. The board interaction follows the owner's phone-first decisions; the proposed treatments, cues and assets listed below still need their specific reviews. Merge and release remain Integration's decisions.

The Codex Frontend follow-up starts at the actual PR #92 head `aa007890c5bf8f4801bfb545c0f6da0426f7d6cd`. Its two consumer fixes and fresh evidence are in [board-recovery.md](board-recovery.md); the earlier evidence below remains a historical record.

## What changed for a player

| Requirement | Runtime behavior |
| --- | --- |
| The comic board stays visible | The phone's match screen has four rows: status bar, board, strip, navigation. **Actions** opens a compact tray over the lower edge of the board, at most 46% of the height, with the open actions as two columns of chips. Move is not listed there; room tags do it. Card and Menu stay sheets over the same board. |
| Selecting an action highlights its characters | The characters the server's view offers get a dashed ring and a **+** tab, plus a press area of at least 44 × 44 px inside their own room. Everyone else is drawn faint. The press areas are exactly `legalTargets[COMMAND]`, or every seat for a Code attempt. They are never taken from a picture, a role or a guess. |
| Every target is a character in its room | There is no separate player picker any more. Shot, Disable, Protect, Rescue, Hack, Showdown Shot, Scan, Supply, Code, Captain election and Jail votes, and the Captain's release request are all chosen by tapping characters. Hospital and Jail characters can be targets wherever the view offers them. |
| Several parts | Supply takes two distinct characters and a Code attempt four. Picks are numbered on the characters. The strip shows the same count in numbered dots, plus the release's "Chosen so far: …". **Take back Player N** removes the last pick. Scan picks a character first, then shows Blue, Red and Alien inline. |
| Inline answers | Scan factions, Abstain, No release request, and the release vote's Yes / No / Abstain are buttons in the strip. A single answer shares its row with Cancel. |
| The strip | One strip above navigation holds, in order: the action's name as a slanted caption, the release's question, then one detail line (the hint, the progress or the consequence), the answers, and Back/Cancel/Confirm. After sending it shows the release's receipt words. A stamp on the strip's top edge carries the release's own status word, which is the same for every action ("Submitting", "Checking", "Accepted", "Not accepted", "Result unknown"). Focus moves to the strip's question after every step. |
| Movement | Pressing a room's name tag (Command Room, Room A, Room B) opens the move through the existing `openRoomMovement()`. A dashed **You?** marks a tentative place in that room while the move is confirmed or on its way. The character moves only when the server's view puts it there, and the mark disappears once the view shows it. Hospital and Jail tags are captions, never buttons. |
| Pass | Pass is the middle of navigation. It is available only through the server's `PASS_TURN` capability and the existing gates, and its neutral receipt sits in the strip. In a legacy match, whose ruleset has no Pass, the middle slot is empty and the other four buttons do not move. |
| Motion | A public move is drawn on every screen, the shared display included. The character is carried as a copy of its own picture in a layer over the page, in an arc lifted by its public flourish, while the piece itself waits hidden. An ink trail and a landing puff follow. Co-occupants slide to their new stations. Status, turn, phase and round changes get the reviewed cues. Details are under [Motion](#motion). |

## How it is built

**Presentation (`packages/presentation/`)**

- `model/stations.ts` places each character at a station worked out from public occupancy and seat order only, so every screen draws the same board. The Designer's formations cover one to five occupants; six to nine stand in a 3 × 3 crowd; the Final Zone uses two rows. It has no capacity and no adjacency. The station functions are exported for tests.
- `model/connected-player.ts` adds three things:
  - `card.kind`.
  - `card.board`: the marks of the player's own command, which are eligible seats, picks, whether picks are numbered, pending seats, faint others and a tentative move. They come only from the command's own choice and the server's offer.
  - `passTurn.inRules`: false only for the legacy ruleset when the view offers no Pass.
- `markup/comic-shell.ts` changes the board, the strip and navigation:
  - `renderOwnBoard()` marks the board `data-board="own"`. It gives each seat its station as `data-*` attributes, gives each room its rows and a picture layer, and wraps each room tag's name in a face. In a showdown it hides every room except the Final Zone.
  - It adds the release's own `.phone-character-target` buttons (same ids, intent and `aria-describedby`), the pick marks and the tentative move.
  - `renderActionStrip()` keeps the release card's ids, nested regions (`action`, `action-controls`), statuses and words.
  - The strip, tray or Pass receipt now comes **before** the board in reading and focus order. From the strip's question, the next Tabs reach the answers and then the characters. The grid still draws the strip above navigation.

**Hosted client (`apps/game/hosted/`)**

- `board-play.css` holds the board page, stations, crop, tags, marks, tray, strip, navigation, motion, reduced motion, short phones and large text. Every private mark is scoped to `[data-board="own"]`.
- `compact-phone.css` loses the old board-grid and target rules that it replaces.
- `board-layout.mjs` (`fitBoard`) copies station data into custom properties through CSSOM, because the page's style policy forbids style attributes. It measures caption heights and shares the board's height between three bands, weighted 0.8 : 1.25 : 1. Each row is at least one 44 px press area tall while characters can be tapped.
- `comic-motion.mjs` reads public facts only. It adds the flights, reflow, status, turn and phase/round cues, with per-seat cancellation.
- `strip-cues.mjs` plays the strip's own cues: arrival, a pick landing, the registration stamp and "not accepted".
- `browser-host.js` gains the effects layer, `fitBoard` after every redraw and on resize, and **Escape** to step back while choosing or confirming.

**What is unchanged.** The command controller (`apps/game/src/connected/action-flow.ts`) is untouched: one command at a time, the double-tap guard, explicit confirmation, durable unresolved-command identifiers, retry, check-again, and dropping an unsent choice when the panel closes, the view goes stale or time ends. Room movement, the staged start (30 s character selection, at least 30 s of role reading, the everyone-Ready gate, a fresh first turn), random starting rooms, the top status/timer bar and the approved comic art bundles are unchanged. Every release word that the Designer's `check:board-motion` quotes is still found verbatim.

## Privacy

- **Marks exist only on the player's own open action.** Marks, press areas, picks and the tentative move live only in a card. A card exists only while the private panel is open in the foreground, or while the player's own Pass receipt is showing. Board marks also require a current view and a trusted running deadline. A closed panel, a backgrounded page, a stale view, an expired or unsynchronized deadline, or the Card or Menu view draws none. The paused-state presentation matrix checks 11 seat-target actions and Move during submitting, checking, unknown and accepted states. Real-controller tests exercise pending Move and receipt-checking Rescue. The shared display never receives these marks, and its board has no station attributes at all.
- **The stylesheet cannot draw a leaked mark.** Every rule that draws a private mark is scoped to `[data-board="own"]`, and `board-play-style.test.mjs` enforces it.
- **The receipt is neutral.** Every accepted command gets the same status word and the release's receipt words. No effect, color, sound or vibration differs by action. Nothing is drawn on a seat target after a receipt. An accepted Move may keep its tentative place only while the view is current, the deadline is running, and authoritative arrival is still awaited. A shot or a Disable is never shown as a result.
- **Public cues come only from public facts.** They come from differences between two drawn public views: location, health, Jail, Captain, a revealed faction, the active seat, the round and the phase. They never come from a role, a receipt or an acknowledgment. A role word never reaches a cue, and a test checks this.
- **A sent command is concealed too.** Backend's review of the handoff ([PR #90](https://github.com/Amirkianfar66/GameN/pull/90)) found that the prototype kept a sent command's pending marks on a hidden page. Here, hiding the page closes the private panel and removes every mark of the player's own command. The controller retains command recovery while the page is hidden or the board is paused. Returning to the foreground requires clock resynchronization before marks can return; reopening Actions can still show the retained command and receipt controls. The original hidden-page tests remain, with dedicated stale/deadline tests and browser evidence added in the follow-up.
- **Assets add nothing per action.** No sound or haptics are added. The flight copies the character's already-drawn picture, so no per-action asset is requested.
- **Simulation checks.** In the simulation, the display had no private hook or role word in any step. In the emulator run, the display was checked at each step of the player's turn and vote. See [Verification](#verification).

## Motion

Durations are the reviewed tokens of 0.4.0: `pieceMove` 900 ms, `cardTransition` 220 ms, `roundTransition` 700 ms, `selection` 120 ms, `registrationStamp` 120 ms and `reducedMotionFade` 80 ms. No token changed.

- **Reviewed cues used:** `cue-public-move` (the flight), `cue-status-change`, `cue-phase-change`, `cue-round-transition` and `cue-registration`. The registration cue is the status word stamped once, when a sent command is accepted.
- **Proposed cues implemented, awaiting review (DSN-D31):**
  - `cue-tray-open`: the tray rises.
  - `cue-strip-enter`.
  - `cue-target-pick`: a pick lifts.
  - `cue-not-accepted`: a short shake of the strip.
  - `cue-move-tentative`: the ghost fades in.
  - `cue-turn-accent`.
  - `layout-reflow`: not a cue; co-occupants slide 220 ms.
- **Proposed cues not implemented:**
  - `cue-target-eligible`, `cue-pending` and `cue-unknown` are static rings and stamps, without animation.
  - `cue-room-press` relies on the browser's own pressed state.
  - `cue-sheet-open` is the release's sheet.
  - `cue-tally` and `cue-ballot-subject` are not implemented (see the decisions table).

The release's rules are all kept:

- A cue starts only from a difference between two drawn public states. Nothing plays on a first or reconnected snapshot.
- Four or fewer moves in one update fly; more do not.
- Nothing plays when the page is hidden, more than a second late, or under reduced motion. Reduced motion is the device setting or the in-app one. With it, nothing flies, lifts or shakes, and arrivals, stamps and status changes use the 80 ms fade.
- Changing either reduced-motion preference during a flight immediately cancels the director's native animations and timers, removes trails and puffs, and reveals the authoritative piece. This happens before the unchanged-public-facts return. The same facts never replay when the preference returns to full motion; a later public move still works.
- An OS change also reaches an owned director listener when an explicitly selected full-motion setting causes no screen frame. The original 77-record follow-up did not cover that wiring case; the [explicit-full regression and correction](motion-os-preference.md) do.
- A newer change to a seat cancels that seat's cue in flight.
- Nothing is queued or repeats, and nothing waits for an animation.

## Words

The release's words are reused exactly. The only new on-screen word is **You?** on the tentative move. It is the Designer's proposal, `aria-hidden`, and the strip says the same thing in release words.

These proposed words are **not** used, pending review:

- the stamps Sending / Registered / Not accepted / Unknown (the stamp shows the release's status word instead);
- On the ballot;
- "This match has no Pass." and "Pass is available on your own turn." (an unavailable Pass stays disabled, as in the release);
- "Player N is no longer offered. Choose again.";
- the room subtitles Captain / Engineering / Laboratory (DSN-D29);
- "Your character moves when the board update arrives." and "Your character is shown where the server has it."

The choosing hint keeps the release's line "Shot · Tap a character". Its action name is visually hidden there, because the caption already shows it.

## Where this differs from the Designer's proposal, and why

| What | Implementation | Why |
| --- | --- | --- |
| Prop layers (GAP-5, DSN-D30) | Not loaded. The three stations drawn behind a prop stand in the back row instead. Room B's back-row standee is at x 0.5 rather than 0.533. | The props are outside the reviewed manifest (`design-0.2.0`), and adopting them is Integration's call. At 0.533 the three Room B back-row press areas would touch at 320 px. |
| Phone frame | The match screen's side padding and grid gaps are removed. The status bar has a fixed height (52 px, or 44 px when the screen is 640 px tall or less). At large text it grows with its words instead, and keeps the timer beside them. | The measurements found the release's 9.6 px padding and 8 px gaps squeezed half-width rooms to 131 px, so crowded rows touched and a Jail target fell below the board. The Designer's 141 px budget is now met. A fixed bar clipped its words at doubled text. |
| Row pitch | The back row keeps a whole 44 px press area under the room's caption (`max(piece height, 44px)` in the pitch). | Without it, a 3-row crowd's back row reached 3 px into the room-tag band at 320 × 568. |
| Reading order | The strip comes before the board in the DOM. | Focus lands on the strip's question. With the board first, a keyboard user had to tab through navigation and wrap around to reach a character. Now it takes 3 Tabs. |
| Ballot marks | "On the ballot" and the counts over heads are not drawn. The release-vote subject is named in the strip ("Release Player 9 from Jail?"), and the count stays in the vote panel. | They are proposed words and components (`cue-tally`, `cue-ballot-subject`); left for review. |
| Showdown | Only the Final Zone is drawn, as the Designer proposes. Eliminated players stay in the readable list (Menu). | The engine moves only the living to the Final Zone. |
| Rows for six in a room | 2 rows. | The handoff's prose says 3; the Designer's `rowsFor` code, which is followed here, gives 2. |

## Historical verification before the consumer follow-up

The following records describe the original PR #92 implementation through `aa007890`, before the stale/deadline and mid-flight preference fixes. They do not verify those fixes. Fresh checks are recorded in [board-recovery.md](board-recovery.md). Commands ran on Node 22.21.1 / npm 10.9.4. Three kinds of evidence are kept separate.

**Unit and package checks** (at the committed head; results in the PR):

- `npm run test --workspace @mothership/presentation`: 169 tests, all pass. That is 160 existing tests plus 9 in `board-play.test.mjs`:
  - stations for one to nine occupants in every room, with no touching press areas at 320 px;
  - for each of 11 seat-target actions, the press areas are exactly the offered seats and everyone else is faint;
  - Supply and Code numbering, a check on a single pick, pending marks, and nothing marked after a receipt;
  - inline answers;
  - the tentative move;
  - no marks outside the open action, and none on the table;
  - nothing private on a hidden page for a command on its way, being checked, unknown or accepted, and the same command shown again when the page returns;
  - strip order, ids and regions, and the same status word for every accepted action.
  - Three existing tests were updated: the strip's words, the pick's accessible text, and the legacy Pass slot.
- `npm run test --workspace @mothership/game`: 419 tests, all pass. That is 409 existing tests plus:
  - public-fact and change detection;
  - strip cues;
  - stylesheet scoping, tokens and 44 px minimums;
  - the real controller on a hidden page, with a command on its way and one whose answer is lost;
  - every simulation scenario against the engine's gates, and the mistakes that check refuses.
- `npm run check:exclusion --workspace @mothership/game`: passes. The five new development files carry the sentinel.
- `npm run check:board-motion --workspace @mothership/design-tokens`: 13 of 13 pass on this branch. The 13th, added at `ef4c2ee`, checks the figure proposal. The release words are still quoted exactly, and no runtime file mentions the prototype.
- `npm run check:v1-phone --workspace @mothership/design-tokens`: **fails, and this is pre-existing**. It passes 6 of 7 checks with 13 "not found verbatim" failures. The failures are identical on pristine exports of `ef4c2ee`, `e652bbf` and `94a49ce`. They start at runtime commit `983d3ec`; the check passes 7 of 7 at its parent `57174b9`. That commit reworded the setup words that the V1 phone prototype quotes. The fix belongs on the Designer side and is reported on [PR #88](https://github.com/Amirkianfar66/GameN/pull/88#issuecomment-6071845711). This branch does not touch `design/v1-phone/`.
- `npm run test --workspace @mothership/design-tokens`: 100 of 101 pass. The one failure is the same V1 phone check.

**Browser simulation** (`apps/game/dev/board/` and `apps/game/dev/capture-board-play.mjs`):

- **Setup.** The release's own player and display screens, controller, host, stylesheets and art run in headless Chromium. They are fed schema-checked synthetic views by a scripted in-page command desk. What each scenario offers follows the engine's gates for its state, and a test checks that. The first version of these scenarios had the same faults Backend found in the Designer's fixtures: an election in round 1 with an Injured and a Jailed candidate, Jail and release votes that left out eligible voters, and Rescue and Supply offers without the player. These were corrected before this run. Three crowd scenarios are states no real match reaches (nine in the Command Room, nine in Jail, eight in the Hospital); they stay because the board has no capacity. Every action is played through real touch input at 320 × 568, 360 × 740, 390 × 844 and 430 × 932.
- **Checks after each step:**
  - page scroll and sideways overflow;
  - every press area is at least 44 × 44, inside its room, on screen, hit at its centre, and overlaps no other press area or room tag (boxes that only touch, within half a pixel, do not count);
  - every visible control is at least 44 px;
  - the status bar does not clip its content.
  - Where the board scrolls inside itself, a character scrolled out of view is not counted as hidden. Instead, each one is scrolled into view and must then be hit at its centre.
- **Coverage.** Nine-in-one-room crowds in Room A, the Command Room and Jail, eight in the Hospital, nine in Room B, twelve-character names, seven players and a legacy match are included.
- **Safe areas and large text.** Chromium's safe-area override emulates a 47 px notch and a 34 px home indicator. The reader's default text size is doubled to 32 px. Both run at 390 × 844 and 320 × 568.
- **Results** ([evidence/board-play/](evidence/board-play/README.md)):
  - 240 steps measured, all clean, of which 238 were on phones.
  - 545 press areas measured, all clean.
  - Safe areas: at 390 × 844 the status bar starts at 49 px, below the notch, and the navigation buttons end at 810 px, above the home indicator. The same holds at 320 × 568, where the board scrolls inside itself. That case is synthetic: no phone that small has a notch.
  - Doubled text: at 390 × 844 the board still fits. At 320 × 568 it scrolls inside itself; 3 of 9 characters start out of view, and each is hit at its centre once scrolled to. The page never scrolls, and Pass's word stays inside its button.
  - Keyboard: 3 Tabs from the strip's question to the first character. Enter picks it; Escape steps back.
  - Reduced motion plays no flight.
  - Losing focus mid-choice drops the choice and its marks, and a stale view pauses actions and removes the marks.
  - The display held no private hook or role word, and the public move flew there too.
- This is simulation: it says nothing about real devices or multiplayer behavior.

**Emulator flow** (`apps/game/dev/capture-board-emulator.mjs`): the real hosted client on the local practice harness. It uses isolated Auth/Firestore emulators and the loopback service with its local deadline and bot tick. A host, one player among bots and an admitted shared display take part, and the player plays a turn and the Jail vote on the board. In the run kept (7 seats, 6 bots), every step was clean:

- The staged start ran unchanged.
- Hack choosing ringed exactly the offered characters.
- A move made by keyboard alone flew on the phone and the display at the same time and got the neutral receipt.
- Pass advanced the turn.
- In the Jail vote, the player tapped a character on the board and got "Your vote for Player 1 is recorded. This is not a result."
- The display held no private hook or role word at any of five checkpoints.

This is local emulator evidence, not a deployment. It was captured on the runtime of this branch's first commit, `cbb7304`; rebasing it onto `ef4c2ee` changed no runtime file. The only later runtime change applies at large text (the status bar and the Pass word), which this run, at the default text size, does not reach.

**Physical devices:** none were used. No phone or tablet was tested.

## Dependencies and open decisions

| Item | Owner |
| --- | --- |
| PR #86 (runtime parent) and PR #88 (design) are unmerged; this PR targets `codex/designer-board-motion` | Integration |
| Board interaction follows the owner's compact-phone and room-tag decisions. Adoption of the remaining proposed design treatments remains gated by their own entries below. | Integration |
| DSN-D27: at most five per room is drawing only, with no capacity (the crowd formation handles six to nine) | Game owner with Balance |
| DSN-D28: no corridor arrows or adjacency; the spine has lamps only | Game owner |
| DSN-D29: room subtitles (not implemented) | Game owner |
| DSN-D30: the prop layers and a manifest revision (not loaded here) | Integration |
| DSN-D31: the proposed cues listed above, and the "You?" word | Game owner / Designer |
| Fact-to-cue mapping review: [PR #90](https://github.com/Amirkianfar66/GameN/pull/90), reviewed at `7f921f4ee05958834532a36d37b72541237fd9e0`. It needs no new server fact or audience. The consumer follow-up addresses its stale/deadline marks and mid-flight reduced-motion findings; Designer fixture findings remain Designer's work. | Backend review / Integration adoption |
| `check:v1-phone` quotes that commit `983d3ec` reworded | Designer |
| DSN-D32: the full-body figures (`board-motion-0.2.0`, added at `ef4c2ee`) are outside the reviewed manifest. The runtime still draws the approved standees. Adopting them needs an export revision first; drawing them is then Frontend's work. | Integration, then Frontend |
| DSN-D33: a figure's pose changes with public facts, while the crew catalog says a character never changes | Game owner with Integration |
