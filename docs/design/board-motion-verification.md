# Verification of the board motion work

Issue [#87](https://github.com/Amirkianfar66/GameN/issues/87) · branch `codex/designer-board-motion` · design base `94a49ce0c5220b814ec56333b028fbe6180b257e` (`codex/v1-pass-board-targets`, draft [PR #86](https://github.com/Amirkianfar66/GameN/pull/86), **not merged**) · 8 October 2026.

Environment: a Claude Code cloud container on Linux 6.18; Node `22.21.1` and npm `10.9.4`; for everything that needs a browser, headless **Chromium 141.0.7390.37**, the build that comes with the container, started through a two-line wrapper given as `CHROME_PATH` that adds `--no-sandbox` (the container runs as root; that changes how the browser's processes are isolated, not how a page is laid out or painted). The fonts are the container's: Arial Narrow and Helvetica Neue are not installed, so the lettering stack most likely set in Liberation Sans, and `system-ui` resolves to Inter. A phone has other fonts, so lines will break in other places than in these pictures.

**Every size, text size and safe area below is a simulation in desktop Chromium** (device metrics override, a default font size of 24 or 32 px for enlarged text, safe-area insets set by the page). **No phone, tablet or physical display was used, and no measurement here is a device measurement.**

This page says what was run for issue #87, what each check asserts, and what it does not. The reviewed design kit has its own record in [verification.md](verification.md); this work changes none of its inputs, and `check:assets` below shows its renders and reports are still current.

## Checks that need no browser

| Command | Actual result |
| --- | --- |
| `npm ci` | See [Repository verification](#repository-verification) |
| `npm run build` | Passed (`tsc --build`, up to date) |
| `npm run verify` | See [Repository verification](#repository-verification) |
| `npm run check:board-motion --workspace @mothership/design-tokens` | Passed: **12 of 12 checks**, over 14 actions, 20 cues and 65 scenarios |
| `npm run docs:board-motion --workspace @mothership/design-tokens` | Wrote `docs/design/board-motion-coverage.md`; the check confirms it is exactly what the contracts and fixtures produce |
| `node design/tools/board-motion-assets.mjs --check` | Passed: `Board-motion assets: 5 files current` (three prop layers, their stylesheet, their manifest) |
| `npm run test --workspace @mothership/design-tokens` | **99 tests: 98 passed, 1 failed**, in 25 s. The reviewed kit's 66 pass; the **15 new board-motion tests pass** ([below](#the-check-can-fail)); of the V1 phone's 18, the one that says its prototype as committed passes `check:v1-phone` fails, for the pre-existing reason in the `check:v1-phone` row. It fails the same way on a pristine export of the base (17 of 18 there) |
| `npm run check:assets --workspace @mothership/design-tokens` | Passed: **15 of 15 checks**, over 35 assets, 124 exported files, 3 bundle stylesheets, 35 components, 7 cues and 2 fenced studies; recipes `design-0.2.0`. The reviewed kit's renders and browser reports are still current: the prototype is outside its inputs |
| `npm run check:v1-phone --workspace @mothership/design-tokens` | **Failed: 6 of 7 checks, 13 failures**, all "not found verbatim": 13 words the V1 phone prototype (issue #76) quotes from `apps/game/hosted/main.js`, `setup-controls.js` and `role-confirmation.js`, which later commits of the PR #86 stack reworded (`c778196`, `983d3ec`, `a61ec92`, `296b23f`, `80dea23`). **Pre-existing**: the same 13 failures on a pristine `git archive` of the base. Not caused or fixed here (this work does not touch `design/v1-phone/`); a follow-up was suggested |
| `git diff --check` against the design base, with every new file staged | Clean |

`verify` does not run the Designer tests or checks, and neither does CI ([DSN-REQ-1](integration-requests.md#dsn-req-1) is still open). Everything in this table was run by hand.

### What the eleven checks assert

Each is a statement about files in the repository. None says anything about a phone, how the art looks, or whether people understand the board.

| Check | It refuses | It does not tell |
| --- | --- | --- |
| The prototype is development-only and reaches nowhere it should not | A file under `design/board-motion/` (pictures and the three generated prop layers aside) or one of the six board-motion tools without the `mothership:dev-only` mark; a picture outside `review/`; a file that reaches into `design/explorations/`, loads from the network or imports from `apps/` or `packages/`; any file under `apps/game/src`, `apps/game/hosted` or `packages/presentation/src` that refers to `board-motion` | Whether someone copies the prototype into the game on purpose |
| The prop layers are made from the approved sources, and the reviewed kit is the one the runtime loads | A prop layer, its stylesheet or manifest that is not byte for byte what `board-motion-assets.mjs` makes from `design/source/board/` and the reviewed recipes; layers proposed against another manifest than `design/exports/asset-manifest.json`; a runtime that no longer requires that manifest; a layer not marked a proposal, not public, or already in the reviewed manifest | Whether the layers look right. The captures show them |
| Every action and command of the release is covered, with cues and scenarios | An action of `ACTION_KINDS` (`packages/presentation/src/model/actions.ts`) or a command of `FullCommandSchema` (`packages/contracts/src/full-game.ts`) missing from the coverage, or one covered that the release does not have; an action without its offer, board interaction, own-character, Hospital and Jail, or public notes; an unknown cue or scenario; an action that names players without the eligible cue; Scan answers that are not the contract's factions; Move in the tray | Whether an interaction is a good one |
| Every cue states its trigger, audience, facts, anchor, timing, end and reduced form | A cue without any of them; an unknown audience or level; a local or private cue that is not an interaction; a duration over the comic beat maximum, without a token, or not equal to its token in tokens 0.4.0; an "authorized" cue that differs from the reviewed one in `design/contract/motion-cues.json`; a public cue resting on a private fact (`legalTargets`, a receipt, knowledge, own ballot, Hack partner, the player's own choice); a cue with a sound or vibration; a cue drawn for no action, state or fact; a public fact drawn by a cue that is not public; a "not produced" list that no longer excludes a cause drawn on a health change | How a cue feels |
| Nine characters in eleven states, the release's crew and role looks | Characters or call signs that differ from `design/contract/crew-catalog.json`; a lift outside 2 to 12 px or a settle beyond 4 degrees; one of the issue's eleven states missing; a state cue that does not exist; a role's device or team that differs from `comic-shell.ts` | That a character's flourish is liked |
| Every room seats one to nine with no capacity, each at its own place | A room without a formation of one to five distinct stations; a station in no formation; a crowd formation of other than nine; for every room and every count from one to nine, two characters at one place, a 44 px press area that leaves the panel on a 320 px phone, two neighbours in a row less than 44 px apart there, or more than three rows | How the pieces look at a station. The captures measure the rendered press areas |
| The release's words are quoted exactly, and new words are listed as proposals | A phrase in `COPY` that differs from the built `@mothership/presentation` `en` (functions are compared on sample arguments); a `SHELL` phrase not found verbatim in the file `RELEASE_TEXT` names; a proposed word that names a role | Whether a new word is good. New words are proposals, listed in the [handoff](board-motion-handoff.md#11-words) |
| Public fixtures carry nothing private, offers are what the engine could offer, events are public facts | A role name, or a role, offers, legal targets, knowledge, Hack partner, own ballot or Protection field in any scenario's public state; a revealed faction on a seat that is not Eliminated; a roster other than 7, 8 or 9; an offer of a seat not in the match; a Shot, Disable or Hack offering the player's own seat; a same-room offer of a player in another room or in the Command Room (the engine's `localTarget`); a fixture event that is not a public fact or carries an attacker, source, cause, weapon, giver or actor; fixtures not labeled synthetic | What a page does with its fixture. That is measured in the browser, below |
| The stylesheet takes colors from tokens and art from loaded bundles, keeps private cues on the own board, and nothing repeats | In `board.css`: a literal hex, functional or named color; art read without waiting for its bundle, or a prop layer without waiting for it; a role's device outside the private card or without the role bundle; a role or team hook outside the private card; an animation that repeats; a literal duration in an animation or transition; **a rule that draws a private cue (`[data-target]`, a press area, a pick number, the tentative move) without `[data-board="own"]`**; **a rule keyed by a character that sets anything but its picture**; no reduced-motion rule that stops every animation; the device setting not honored; a cue layer that can take a tap | It reads selectors as text: a rule written in a way it does not anticipate could pass. The captures ask the same questions of rendered pages |
| Screenshots, the viewport matrix, storyboards and secrecy pairs are current and measured clean | Captures or measurements made from other pages, fixtures, contracts, tokens or bundles than the committed ones (one hash over every input); a capture report that records any problem; a scenario without its screenshot; a listed picture that is missing, or a picture that is not listed; a matrix without its 320 x 568, 360, 430, 150% and 200% text, long-name, reduced-motion, desktop, 7- and 8-player captures, or without all nine in one room at 320 x 568 and 390 x 844; a cue with a duration and no storyboard; no character sheet; fewer than six secrecy pairs | What is in a picture. That a picture is current does not mean anyone looked at it |
| The coverage page is generated from the contracts, and the handoff names every component and gap | A coverage page that is not exactly what the contracts and fixtures produce; a component or gap the handoff does not name; a cue neither page names; no verification page | Whether the prose is right |

### The check can fail

A check that has only ever passed proves little. 15 tests in `packages/design-tokens/test/board-motion-check.test.mjs` each copy what the check reads to a scratch directory, make one or more mistakes the way a person would, and expect the check to refuse each by name: **52 named refusals in all**, and all 15 pass. One shows the prototype as committed passes; one that a prototype module that no longer loads is refused by name instead of crashing the check. The mistakes: a private cue drawn on every board, a character with a rule of its own, a team hook on the public board and a role's device outside the card; a hex, a functional and a named color, art before its bundle and a prop layer before it loads; a repeating animation, a literal duration, reduced motion that no longer stops motion, the device setting ignored and a cue layer that takes taps; a cue whose time is not its token, a public cue resting on a private fact, a cue with a sound and an orphan cue; an authorized cue that differs from the reviewed one and a private cue drawn as a public game event; an action of the release left out (with its command), a scenario that does not exist, Move put in the tray and Scan answers that are not the factions; a role word in a public state, an offer of the player's own seat and of a player in the Command Room, an event carrying an attacker and an event that is not a public fact; a release word changed, a quote not in its file, a proposed word naming a role, a call sign changed and a role in another team; two stations too close for two press areas, a press area leaving the panel and a formation repeating a station; a file without the development-only mark, one loading from the network, one importing production code, and production code reaching the prototype; a prop layer edited by hand and layers proposed against another manifest; an edit after the captures, a stray picture, a listed picture missing and a report recording a problem; the coverage page edited by hand, and a handoff dropping a component and a gap. The repository is not touched: the copies are made in the system temporary directory and removed.

## Checks that need a browser

Run on the same tree, in the Chromium named above. None is part of `verify`.

| Command | Actual result |
| --- | --- |
| `npm run capture:board-motion --workspace @mothership/design-tokens` | Passed: **185 captures and 5 contact sheets, 0 with problems**, in 3 min 45 s: the 65 scenarios at 390 x 844 CSS px, 41 captures of the viewport matrix, 70 storyboard frames (19 rows: 51 frames of their timelines and 19 under reduced motion), 8 secrecy pairs and the character sheet; then the contact sheets, each refused if any of its pictures did not load and decode. Report: `design/board-motion/review/report.json`; index: `design/board-motion/review/index.json` |
| `npm run flows:board-motion --workspace @mothership/design-tokens` | Passed: **73 of 73**, in 20 s ([below](#the-flows)) |
| The reviewed kit's `check:layout`, `check:shell`, `prove:checks`, `render:review` | **Not run.** Nothing they read was changed, and `check:assets` confirms that the committed renders and reports were made from the current inputs |

### What each capture measures

On every phone capture (65 scenarios and 41 matrix captures), inside the page:

1. the page does not scroll sideways or down;
2. at the default text size the board fits its row (it scrolls inside itself only at enlarged text, and is never clipped there);
3. the status bar and navigation are whole on screen;
4. every character press area is at least 44 x 44 CSS px and on screen; inside its room and hit at its centre by itself, not by a tag, a cue layer or the strip (these two at the default text size, where the board does not scroll); and overlapping no other press area and no room tag's press area;
5. every room tag's press area is at least 44 x 44, and every control of the strip, tray, sheets and navigation is too;
6. no role or team hook outside the private card, and no role name in the page's text outside it;
7. art requested only as whole bundle stylesheets (the three of a phone, and the prop-layer stylesheet), never a single picture;
8. no page error, console error, failed or refused request.

On every secrecy pair, the second board (what every other screen draws) holds no private hook, press area, pick number, tentative move, stamp, private card, device or team hook, and no role name; and the two boards agree where every seat is.

The storyboards are frames of the real stylesheet and timelines, paused at a moment with `?play=&t=` (the Web Animations API's `currentTime`), not drawings; each row ends with its reduced-motion frame. They are not measured: a frame mid-flight is meant to show a piece between stations.

### The viewport matrix

41 captures, besides the 65 scenarios at 390 x 844:

| Kind | Captures |
| --- | --- |
| 320 x 568 | The board; a Shot; a Code attempt at two of four; a Captain election with nine candidates; seven in Room A; all nine in Room A; the tallest board with a Shot open; the tray; a release vote; a tentative move; the Final Zone; six in the Hospital; **all nine in Room A as candidates**; all nine in Room A with a Shot at any of eight; eight in the Hospital with a Rescue for any; all nine in Room A with a Supply under way; twelve-character names; a Shot at 200% text |
| 360 x 740 | The board; a Shot; seven in Room A; all nine candidates in Room A |
| 390 x 844 | All nine in Room A; seven and eight players; twelve-character names, on the board and as nine candidates; a Shot at 150% text; the board, a Shot, a release vote and all nine candidates at 200% text; simulated safe areas (47 px top, 34 px bottom) on the board and a Shot; reduced motion on a public move and a receipt |
| 430 x 932 | The board; a Code attempt to confirm; all nine candidates in Room A |
| 1280 x 800 | The board and a Shot: the same design, one centered column |

### The storyboards

19 rows: the tray rising; the strip rising; eligible characters; a pick (lift and check); a Supply's first numbered pick; sending; the Registered stamp; Not accepted; a room tag pressed and the tentative place; a public move; the player's own move when the public update arrives; Injured; Eliminated with the revealed faction; a new Captain; the next turn (status words and turn marker); a new round; the private card opening; the published count; the subject of a release vote. Every cue with a duration has one; `layout-reflow` (co-occupants sliding to their new stations) shows in the move rows.

### The secrecy pairs

Eight, each the acting phone beside the other screens at the same moment: a Shot being sent; a Supply with one of two picked; a Code attempt of four to confirm; a Scan's faction guess; Protection with the player's own character eligible; a recorded ballot; a tentative move; the Hack phase with the private card open.

### The flows

`design/tools/board-motion-flows.mjs` presses the prototype's own controls in Chromium, with the other screens' board beside the phone, and asserts after each step. 73 assertions, all passing:

- **A Shot, end to end:** Pass is the third of five in navigation and available on the own turn; the tray lists what the view opens and not Move, and the board stays visible above it; choosing Shot closes the tray and opens the strip; exactly the offered characters are eligible, each with its own press area; the other screens show no private mark while choosing or sending; a tap asks to confirm in the release's words; the chosen character is marked; Confirm sends and says so; the receipt is the neutral Registered stamp with "This is not a result."; no private mark stays after it; both boards agree where everyone stands; no public cue was played; Done returns to nothing open.
- **Keyboard:** Enter on a focused character picks it (a real key press through the browser's input pipeline); focus moves to the strip's question; Escape goes back; every press area is a named button.
- **Several parts and answers:** a Code attempt's picks numbered on the board, a picked character offering no second press, the fourth pick naming all four, Choose again and Take back removing one at a time; a Supply's progress and two distinct picks; Scan's factions as answers and the confirmation of target and guess; nine candidates in a Captain election and Abstain; a release vote's subject marked on both boards with nobody picked, Yes/No/Abstain, the confirmation naming the subject; the release request offering only the jailed character; all nine in one room eligible, each with its own press area.
- **Moving:** Hospital and Jail tags are not buttons; an unoffered room says the release's words and opens nothing; a legal tag shows the tentative place, the piece stays, the other screens see nothing; after Confirm the piece moves with the public update on every screen, the tentative place is gone, and each board played the move once; a tag pressed during an open action opens nothing.
- **Pass:** confirm, the neutral "Turn passed.", the next phase in the status bar and Pass unavailable after; unavailable on another player's turn; absent in a legacy match; the Hack phase's own full minute.
- **Public facts and motion:** a public move flies in the cue layer on both boards; the cue layer takes no tap; a replayed snapshot plays nothing; the flight ends and changed nothing; nothing advances when the animation ends; a newer move withdraws the flight in progress; a reconnect plays nothing and stops what was in flight; a health change is drawn on both boards without a cause; reduced motion flies nothing, keeps the fact and records the settled variant.
- **Private surfaces:** backgrounding mid-choice drops the choice with the release's words and removes every mark; a stale view pauses Actions; the card and its device exist in the document only while open; the timer counts down locally and changes nothing else; no page error throughout.

## What the measurements caught, and what was changed

Each of these was found by a capture, the check or the flows, fixed in the design, and measured again; the results above are of the fixed version.

- **Room tags.** The move tag's 44 px press area was a `::before` larger than the caption, and the caption's `overflow: hidden` clipped it: the real press area was the 28 px caption. The button is now the press area and the caption is drawn inside it.
- **The back row under a tag.** The board's band heights left out the panels' borders and the piece pad, so at the 44 px row minimum the back row's press areas reached 7 px under Room A's tag at 320 x 568. The bands now count both and measure each tag.
- **A tall strip at 320 x 568.** A release vote, a Code attempt's progress or a confirmation pushed the board past its row, under the strip. A short-phone mode (44 px status, 56 px navigation, 4 px gutters, tighter strip), one answer row with the side control, and a 30 px row minimum while nothing can be tapped fixed it; the board also scrolls inside itself rather than being covered, should it ever have to.
- **Behind a prop on a short panel.** A character behind the laboratory counter and one in front could overlap press areas by a few pixels. The prop line now rises on a short panel until the front rows fit below it.
- **A crowd at a large row unit.** With all nine in Room A at 320 x 568 and a roomy board, neighbouring press areas grew wider than their spacing and overlapped by 2 px. A press area is now no wider than the distance to its nearest neighbour in its row.
- **Room B's back corners.** The static check found that two back stations put a 44 px press area 2 px outside the panel at 320 px; they moved in.
- **The other screens' board** in the secrecy pairs had collapsed to a sliver: it was not in its own frame. It is now a full phone.
- **A contact sheet** was captured before one of its pictures had decoded. The sheets now wait for every picture and refuse one that does not load.
- **The check** crashed, instead of refusing by name, when a prototype module did not load. It now refuses it by name.

## Repository verification

`npm ci` and `npm run verify` need a clean committed checkout (the Balance gate refuses any other): they are run on the commit that adds this page, and their results are recorded by the commit after it.

## Not run, and untested

- **No real device.** No phone, tablet or shared display; no iOS Safari, Android Chrome or Firefox; no screen reader. Touch was not tested: presses are clicks and key events in desktop Chromium.
- **Not the runtime.** Nothing in `apps/game/` or `packages/presentation/` was rendered or changed; the hooks in the handoff were read from the release's source. Two-client privacy was tested on the prototype's own observer board, not between two real clients.
- **No emulator, hosted Firebase, network or multiplayer.** Screenshots, storyboards, flows and measurements do not show that multiplayer behavior is correct or that the game is balanced or fair to a table of people.
- **No video clips.** Motion is shown as storyboard frames of the real timelines.
