# Verification of the V1 phone journey

Issue [#76](https://github.com/Amirkianfar66/GameN/issues/76) · branch `claude/brave-cannon-lmhd0i` · design base `87715a46dbd6a107e417bb6024d81c3fcb679049` (`codex/v1-start-sequence`, draft [PR #75](https://github.com/Amirkianfar66/GameN/pull/75), **not merged**) · 8 October 2026.

Environment: a Claude Code cloud container on Linux 6.18; Node `22.21.1` and npm `10.9.4`; for everything that needs a browser, headless **Chromium 141.0.7390.37**, the build that comes with the container. The container runs as root, so Chromium is started through a two-line wrapper given as `CHROME_PATH` that adds `--no-sandbox`; that changes how the browser's processes are isolated, not how a page is laid out or painted. The fonts are the container's: Arial Narrow and Helvetica Neue are not installed, so the heading and lettering stack (`Arial Narrow, Helvetica Neue, Arial, sans-serif`) most likely set in Liberation Sans, the stand-in with Arial's widths, and `system-ui` resolves to Inter. A phone has other fonts, so lines will break in other places than in these pictures.

This page says what was run for issue #76, what each check asserts, and what it does not. The reviewed design kit has its own record in [verification.md](verification.md). This work changes none of that kit's inputs, so that record still stands, and `check:assets` below shows its renders and reports are still current.

## Checks that need no browser

| Command | Actual result |
| --- | --- |
| `npm ci` | Passed: 888 packages, toolchain hook passed (Node 22.21.1, npm 10.9.4). No dependency was added, and the lockfile is unchanged |
| `npm run verify` | See [Repository verification](#repository-verification) |
| `npm run test --workspace @mothership/design-tokens` | Passed: **84 tests**, 0 failed, cancelled, skipped or todo, in 30 s. The 66 of the reviewed kit, unchanged, and 18 new ones for the V1 phone check: 1 that the journey as committed passes it, 17 that it refuses named mistakes ([below](#the-check-can-fail)) |
| `npm run check:v1-phone --workspace @mothership/design-tokens` | Passed: **7 of 7 checks**, over 109 states and 56 components |
| `npm run docs:v1-phone --workspace @mothership/design-tokens` | Wrote `docs/design/v1-phone-inventory.md`; the check above confirms it is exactly what the contract produces |
| `npm run check:assets --workspace @mothership/design-tokens` | Passed: **15 of 15 checks**, over 35 assets, 124 exported files, 3 bundle stylesheets, 35 components, 7 cues and 2 fenced studies. The same numbers as before this work: the reviewed kit's renders and browser reports are still current, because the prototype is outside its inputs |
| `git diff --check` against the design base, with every new file staged | Clean |

`verify` does not run the Designer tests or checks, and neither does CI ([DSN-REQ-1](integration-requests.md#dsn-req-1) is still open). Everything in this table was run by hand.

### What the seven checks assert

Each is a statement about files in the repository. None says anything about a phone, how the art looks, or whether people understand the screens.

| Check | It refuses | It does not tell |
| --- | --- | --- |
| The prototype is development-only and reaches nowhere it should not | A file under `design/v1-phone/` other than a picture, or one of the five V1 tools, without the `mothership:dev-only` mark; a file that reaches into `design/explorations/`; a script that imports or fetches from the network | Whether someone copies the prototype into the game on purpose. It is a fence against accident. Frontend's production-exclusion check in `verify` follows the game's own entries and never reaches `design/` |
| Every state names its data, its runtime level, its gap and known components | A state or component id used twice; anything but exactly the five priority screens, once each; a state without id, title, surface, audience, data, runtime level, release reference or components; a runtime level that is not *existing*, *partial* or *proposed*; a partial or proposed state that does not say what is missing; an unknown data source or component; private content on a host or display surface; a private state drawn from public data only; a host or display state drawn from a seat's private data (`setupPreview`, `playerView`, `acknowledgments`); a private component registered on a public surface; a component without a hook or description, or that no state draws | Whether the data source named is the right one, or whether the release does what the inventory says. That was read from the release by hand; each state's `runtimeRef` names the file and function it was read from |
| Every state has a fixture, and public fixtures carry nothing private | A state without a fixture, or a fixture without a state; a fixture on another surface than its state; a role name anywhere in the fixture of a public or host state, except the end reveal, where V1-18 makes the roles public; a public state whose fixture opens the private card; a synthetic Code that does not hold the Alien or does hold the Undercover | What a page does with its fixture. That is measured in the browser, [below](#what-each-capture-measures) |
| Quoted release words, role reminders, crew and role looks match the release | A word quoted from the release that is not found verbatim in the file it names; role reminders that differ from `apps/game/hosted/role-guide.js`; character ids or call signs that differ from `design/contract/crew-catalog.json`; a role's device or team that differs from `packages/presentation/src/markup/comic-shell.ts` | Whether a new word is good. New words are proposals, listed in the [handoff](v1-phone-handoff.md#8-copy) |
| The stylesheet takes colors from tokens, art from loaded bundles, keeps roles private and nothing repeats | In `journey.css`: a literal hex, functional or named color; an art property read without waiting for its bundle (`[data-art~="…"]`); a role's device outside `.j-private`, or without the role bundle; a role or team hook outside `.j-private` (the legend swatch aside); an animation that repeats; an entrance that stays in effect (`both`), which in Chromium can leave its largest bounds in the scrollable area; no reduced-motion rule that stops every animation; the device's reduced-motion setting not honored | It reads selectors as text: a rule written in a way it does not anticipate could pass. The captures ask the same questions of rendered pages |
| Screenshots, matrix and storyboards are current and measured clean | Captures or measurements made from other pages, fixtures, tokens, bundles or contract than the committed ones (one hash over every input); a capture report that records any problem; a state without its screenshot; a listed picture that is missing, or a picture that is not listed; a matrix without its 320, 360, 430, short-viewport, 200% text, long-name, keyboard or desktop captures | What is in a picture. That a picture is current does not mean anyone looked at it |
| The inventory page is generated from the contract and the handoff names every component | An inventory page that is not exactly what the contract produces; a component the handoff does not name; a priority state the journey map does not name | Whether the prose is right |

### The check can fail

A check that has only ever passed proves little. 17 tests in `packages/design-tokens/test/v1-phone-check.test.mjs` each copy what the check reads to a scratch directory, make one or more mistakes the way a person would, and expect the check to refuse each by name: 41 named refusals in all. The mistakes: a role word in a public fixture, and a public state that opens the private card; a state without a fixture, and a fixture without a state; a synthetic Code that holds the Undercover; a release word misquoted, a role reminder reworded, a call sign changed and a role put in another team; a hex, a functional and a named color; art drawn before its bundle, a device on the public layer, and a device without the role bundle; a team hook on the public board; a repeating animation, and an entrance that stays in effect; reduced motion that no longer stops motion, and the device setting ignored; a file without the development-only mark, one that loads from the network, and one that reaches into explorations; a state id used twice, a private state on the display, and a host state drawn from a seat's private data; a gap left unsaid, an unknown component, a component nobody draws, and a private component on a public surface; a priority screen dropped; an edit made after the captures; a stray picture, a listed picture missing, and a report that records a problem; a state without its screenshot, and a matrix without its 200% text captures; the generated inventory edited by hand, a component left out of the handoff, and a priority state left off the journey map. The repository is not touched: the copies are made in the system temporary directory and removed.

## Checks that need a browser

Run on the same tree, in the Chromium named above. None is part of `verify`.

| Command | Actual result |
| --- | --- |
| `npm run capture:v1-phone --workspace @mothership/design-tokens` | Passed: **193 captures, 0 with problems**, in 4 min 13 s: the 109 states at 390 × 844 CSS px, 27 captures of the viewport matrix, and 57 storyboard frames (12 storyboards: 45 frames of their timelines and 12 under reduced motion); then 4 contact sheets. Report: `design/v1-phone/review/report.json`; index: `design/v1-phone/review/index.json` |
| `npm run flows:v1-phone --workspace @mothership/design-tokens` | Passed: **20 of 20**, in 11 s ([below](#the-flows)) |
| `npm run check:layout --workspace @mothership/design-tokens`, run in a scratch copy | **Failed: 456 cases, 9 failures**, in 2 min 56 s, every one with the default text at 32 px: at 320 and 360 wide, the room name in a seat's location line runs past the side of the screen and the page scrolls sideways (seating D, seat 9); at 320, the status line of the Shot card runs past the side in four of its pictures (registered, registered and idle, was registered, and registered without art); on the table at 600 wide, seat 8's tag in Room B shortens its name and the roster does not show it whole. Least free screen height 54% (62% in the committed report). [Why, and why it is not fixed here](#the-reviewed-kit-on-a-machine-without-arial-narrow) |
| `npm run check:shell --workspace @mothership/design-tokens`, run in a scratch copy | Passed: **54 page loads, 468 redraws, 1,368 comparisons of the public layer, 1,460 drawn pictures placed, 26 private-only updates under 13 held public cue animations, 21 timed plays of the 7 cues, 0 failures**, in 2 min 7 s |
| `npm run prove:checks`, `npm run render:review` | **Not run.** Nothing they read was changed, and `check:assets` confirms that the committed review renders and reports were made from the current inputs |

The reviewed kit's two browser checks were run in a copy of `design/`, `rules/` and the token sources in the session's scratch directory, because each rewrites its report under `design/review/`: the committed reports record the run in desktop Chrome 155 on macOS for the comic adoption, and this work has no reason to replace them. They were run to see whether the reviewed kit still passes on this base in a second browser, on a machine with other fonts. The shell check does. The layout check does not.

### The reviewed kit on a machine without Arial Narrow

The nine layout failures are in the reviewed kit, not in this work: the kit's pages, stylesheets and contract are byte for byte those reviewed (`check:assets` confirms it), and its committed report, from desktop Chrome 155 on macOS, passed all 456 cases. What differs is the machine. This container has neither Arial Narrow nor Helvetica Neue, the first two fonts of the lettering stack, so headings and captions set in a wider face, and all nine failures are at 200% text, where a long word has the least room. That is the most likely cause; it was not isolated, because no second font set or browser was tried here.

It matters beyond this container: Arial Narrow is not a system font on iOS or Android, so a phone at large text is closer to this run than to the Mac's. No device was checked. It is **not fixed in this branch**: the fix is in the reviewed kit's reference stylesheet, and its review renders and both browser reports would have to be made again, which is a change of its own and not part of issue #76. It is recorded for Designer's next change to the kit. The V1 prototype was laid out and measured in this same environment and passed: there, a long word wraps, and at large text the layout changes rather than overflows.

### What each capture measures

On each of the 193, inside the page:

1. the page does not scroll sideways, and no visible element ends past the right edge. Pieces, room captions, slanted captions and crew-state stickers are left out of the element test, because a rotated box reaches past its drawn edge. As the screen clips sideways overflow, one of those four drawn past the edge would be cut off rather than reported: a known gap of the measurement;
2. every visible control (button, link, field, select, disclosure, choice label) is at least 44 × 44 CSS px;
3. on a public or host state (every state but the private ones and the end reveal), no role name in the page's text and no private container in the document;
4. on every state, no device or team hook outside `.j-private`, the legend swatch aside;
5. no slanted caption, sheet title or phase name cut off in its own box;
6. the art requested only as whole bundle stylesheets, the three of a phone on a player page and only the public one on a host, display or entry page, and never a single picture;
7. no page error, console error, failed request or refused request;
8. with the keyboard up (a 390 × 450 viewport with the field focused and filled), the focused field in view and the dock no longer fixed over the content.

### The viewport matrix

| Kind | Captures |
| --- | --- |
| 320 CSS px wide, 640 tall | Nine seats with seven in one room; character selection; host with two requests; role card face up |
| 360 × 740 | Someone else's turn; the full roster with Start setup |
| 430 × 932 | The private card open; a character picked |
| Short viewport, 390 × 600 | Your turn; the role card face down |
| 200% text (the browser's default font set to 32 px, not a zoom) | The game; character selection; the host lobby; the role card face up; the readable list, whole page |
| Twelve-character names | Nine seats on the board; the crew progress; the final reveal, whole page |
| Keyboard up, 390 × 450 left | The room code field focused; the name field focused |
| Reduced motion | The role card shown without the turn |
| Desktop 1280 × 800 | Host; character selection; the game with the private card as a drawer |
| Shared display 1280 × 800 | The public board; neutral setup progress; the result and the permitted reveal |

These are simulations in desktop Chromium. The keyboard is a smaller viewport, not a keyboard; 200% text is a browser setting, not a phone's text size; the desktop captures are one width. They are listed with their pictures in [v1-phone-journey.md](v1-phone-journey.md) and on the matrix contact sheet.

### The storyboards

Twelve storyboards of eleven cues. Each cue is held at moments of its own timeline in the state where it plays (`?t=<ms>&only=<selector>` pauses the real CSS animations of that part and nothing else), then the same state is captured under reduced motion. They are frames of the stylesheet as written, not drawings of what it should do. Six of the cues are proposals of this work and in no cue contract: the stage change, the role deal, the private card opening, a request arriving, a choice taken and the result cover ([DSN-D26](README.md#open-decisions), which also names the room pick on the board; that one is seen in the move flow and has no storyboard). The other five are cues of the reviewed kit, restaged in the journey: the role card turn, the registration stamp (twice: Ready, and a registered command), the public move, the phase change and the round transition.

### The flows

`design/tools/v1-phone-flows.mjs` presses the prototype's own buttons in Chromium at 390 × 844, and asserts: on selection, Confirm is unavailable at first, a pressed character is marked pressed, the name counter counts characters as a person does (`Zoë` is 3 of 12), Confirm becomes available, and confirming lands on the confirmed state; on the reveal, no role word is on the page while the card is face down, the turned-up card's device is inside `.j-private`, and Ready goes to sending; in the game, no private container exists while the card is closed, the card opens and **focus moves into it**, Hide removes the private container, choosing a target makes a confirming card (`Register a shot at Player 7`), confirming shows Submitting and then the registered state, pressing a room on the board picks it and makes `Move to Room A?`, confirming lands on the accepted move; on the host, ending a match asks first and puts focus on “No, keep the match”; a countdown ticks on the device's clock and never navigates.

It tests the prototype, not the game. That it works shows that the pictures are of working pages with real focus and real controls, nothing more.

## Repository verification

`npm run verify` was run with every change of this branch in place, before it was committed:

| Step | Actual result |
| --- | --- |
| Toolchain | Node 22.21.1, npm 10.9.4 |
| Workspace boundaries | 8 explicit packages; imports checked; fixture and reference imports excluded |
| Source integrity | 119 original Canvas files and 1 unbound example; 7 rule sources; 24 pinned source files; token proposal unchanged; 21 immutable owner decisions |
| Typecheck, pure and browser | Passed |
| Bootstrap, engine, backend, tooling | 50, 97, 118 and 99 tests; 0 failed, skipped or todo |
| Frontend | Presentation 151 and game 400 tests, 0 failed, skipped or todo; production exclusion: 53 modules from 2 production entries, 164 files scanned, 29 development files labeled, no fixture, test or development module found |
| Balance, static | 70 executed, 70 passed |
| Balance, engine (`test:scenarios`) | **Refused to run**: “engine verification requires a clean committed checkout”. That is the gate working, not a failure of the engine |

So on the uncommitted tree every step passed but the last, which does not run there. `npm run verify` was then run again from the start on the committed branch; the commit it ran at and its result are in the pull request's description.

This work adds no package, no dependency and no import into any workspace's source. Outside `design/` and `docs/design/` it changes only the list of scripts in `packages/design-tokens/package.json`, and adds one test file beside the token tests.

## What these checks found, and what was changed

The checks were written before the pictures were final, and they found real problems. Each is fixed in this branch:

- **Sideways scroll after an entrance.** A slanted caption's entrance (a small rotation and lift) kept, in Chromium, its largest bounds in the page's scrollable area after it had finished, so pages scrolled sideways by a few pixels at 390. Entrances now take effect only before they start (`backwards`), the screen root clips sideways overflow, and the stylesheet check refuses an entrance that stays in effect.
- **320 px.** Setup-progress chips did not fit three columns of seats; device tags would not shrink; the Ready stamp stretched across its row. Seats with chips now take two columns, tags shrink, the stamp keeps its size.
- **200% text.** The phase strip broke words in the middle; table cells split letters; the sticky header and dock left little of a short screen. At large text the head and dock are no longer sticky, pairs stack, and the reveal table becomes labeled rows.
- **Desktop.** A modal private card covered the board; it is now a drawer beside the board from 60 em. The wide display board had been applied at phone widths and shortened room captions; it now starts at 48 em.
- **Focus.** Opening the private card left focus on the button behind it. The first version of the flow asserted nothing (its condition was always true); written properly, it failed. The sheet's title now takes focus when the card opens.
- **The inventory check** found a component in the registry that no state listed: the data-source banner, for which the prototype's own “Synthetic fixture” strip stands in on every page. The contract now lists it on the entry screen. The check also refused a host fixture whose key for the host's own sheets was the private card's key; the key was renamed, so that the check can tell the two apart.
- **Counts in the handoff** (how many states the release already supports) were wrong in the first draft and were corrected against the contract: 101 existing, 7 partial, 1 proposed. That was found on re-reading, not by a check.

## Not run, not measured, not produced

- **Any device.** No phone, tablet or shared display. Thumb reach, touch accuracy, the real keyboard, readability at arm's length, glare, motion comfort, battery and frame time are all unmeasured. Every picture is desktop Chromium on Linux with that machine's fonts.
- **Any other browser.** Not iOS Safari, not Android Chrome, not Samsung Internet, not Firefox. The stylesheet uses `:has()`, container query units (`cqi`), `dvh`, `overflow-x: clip`, `env(safe-area-inset-*)`, `color-mix()`, `:is()` and `:where()`, unverified in any of them.
- **The release.** The prototype is not Frontend's code, and nothing was rendered by `apps/game`. The inventory's “what the release already does” is a reading of the release's source at the design base, not a run of it. No emulator, no hosted Firebase, no network, no server.
- **Multiplayer.** Nothing here shows that the server, the clocks, the windows of 30 seconds, everyone-Ready or the privacy of a real match work. The prototype's countdowns run on one device's clock and at zero only change their words.
- **Assistive technology.** No screen reader, switch or voice control. Forced colors has rules in the stylesheet and was not looked at.
- **Contrast in compositing.** The colors are tokens whose ratios are computed in the token tests; the composited screens were not measured.
- **Sound.** None exists.
- **A person's review.** Nobody but the author has looked at the prototype. The owner has not seen it, and none of its layouts is approved.

Nothing in this document, in a screenshot or in a storyboard shows that multiplayer behavior is correct or that the game is balanced.
