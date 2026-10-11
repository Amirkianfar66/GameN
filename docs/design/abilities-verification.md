# Verification of the ability art

Ability art · slice 1 (the Insider's file and the hidden card, branch `claude/designer-ability-art`, `abilities-0.1.0`), slice 2 (the Hacker's file and Scan, the Code attempt, the Alien's Code, branch `claude/designer-ability-art-2`, `abilities-0.2.0`) slice 3 (the Rescue, the Disable, the Supply and its slips, branch `claude/designer-ability-art-3`, `abilities-0.3.0`) and slice 4 (the shot and Protection, branch `claude/designer-ability-art-4`, `abilities-0.4.0`) · built on the board-motion prototype at `08409392d1040f20d559a9f36a2a1d9bb23468c4` (branch `codex/designer-board-motion`, [PR #88](https://github.com/Amirkianfar66/GameN/pull/88), **not merged**) · ruleset `in-person-v1-pass-2026-10-08` · 11 October 2026

Environment: a Claude Code cloud container on Linux 6.18; Node `22.21.1` and npm `10.9.4` (the pinned toolchain); for everything that needs a browser, headless **Chromium 141.0.7390.37**, started through a wrapper given as `CHROME_PATH` that adds `--no-sandbox` (the container runs as root).

**Every size, text size and motion setting below is a simulation in desktop Chromium** (device metrics override; a default font size of 32 px for twice the text size; reduced motion from the prototype's own switch). **No phone, screen reader, touch screen or physical display was used, and no measurement here is a device measurement.** The prototype is a design reference, not the production integration: Frontend owns that ([abilities-handoff.md](abilities-handoff.md)).

## 11 October 2026: slice 1

Run in this branch's worktree on the content of the commit that adds slice 1 (its parent is `0840939`), before committing, with dependencies installed by `npm ci` and the workspace built by `npm run build` (both passed: 888 packages; the toolchain hook reported Node 22.21.1, npm 10.9.4). The tools were run directly with `node`; each has an `npm run … --workspace @mothership/design-tokens` script of the same name ([README.md](README.md#run-it)). The board-motion prototype changed in this branch (two scenarios, `file.insider` and `file.hidden`; the card's file and closed folder; the ability art loaded with the other bundles; ten new flow steps; the ability files added to the inputs of its captures), so its own checks were run again too.

| Command | Actual result |
| --- | --- |
| `node design/tools/abilities-assets.mjs --check` (`assets:abilities`) | Passed: `Ability assets are current: 13 files` (11 assets, the stylesheet, the manifest `abilities-0.1.0`) |
| `node design/tools/abilities-capture.mjs` (`capture:abilities`) | Passed: **26 pictures and a contact sheet, 0 with problems**: the file at rest, inspecting, with twelve-character names and a long name inspected, at 390 x 844 and 320 x 568; twice the text size at both, resting and inspecting; Show on board; reduced motion; without the ability art or the crew cards; Card pressed while out of date (both sizes); back from the background; reopened at rest; seven frames of the assembly |
| `node design/tools/abilities-docs.mjs` (`docs:abilities`) | Wrote `docs/design/abilities-inventory.md`; the check confirms it is what the contract and manifest produce |
| `node design/tools/abilities-check.mjs` (`check:abilities`) | Passed: **6 of 6 checks**, over 11 assets and 24 treatments (2 delivered) |
| `node design/tools/board-motion-capture.mjs` (`capture:board-motion`) | Passed: **214 captures and 5 contact sheets, 0 with problems** (68 scenarios, the two file scenarios among them) |
| `node design/tools/board-motion-docs.mjs` (`docs:board-motion`) | The coverage page is unchanged |
| `node design/tools/board-motion-check.mjs` (`check:board-motion`) | Passed: **13 of 13 checks**, over 14 actions, 21 cues and 68 scenarios |
| `node design/tools/board-motion-flows.mjs` (`flows:board-motion`) | Passed: **201 of 201** (191 before, and 10 new: the file's seat order, its one group of role names, private to the own open card, inspect without a role word, Escape back with focus returned, gone in the background and not reopened by the foreground, an explicit reopen at rest, gone when the view goes out of date, the closed folder on Card while stale, no page error) |
| `npm run test --workspace @mothership/design-tokens` | **145 tests: 144 passed, 1 failed.** The **22 new ability-check tests pass** (the check as committed, and 21 named mistakes it refuses) and the board-motion tests pass. The one failure is the V1 phone's (issue #76) check of its prototype as committed: the same 13 quotes "not found verbatim" in `apps/game/hosted/`, pre-existing on this branch's base and fixed separately in draft [PR #93](https://github.com/Amirkianfar66/GameN/pull/93) |
| `node design/tools/check-assets.mjs` (`check:assets`) | Passed: **15 of 15 checks**; the reviewed kit's renders and reports are still current |
| `git diff --check` | Clean |
| `npm run verify` | Run on `458e1ae6ea94e4eb0d063abd631b0fa067da35e3`, the commit that adds slice 1, with the working tree clean before and after (the commit after it changes only this page, to record it): **exit 0 in 712 s**; its balance stage reported 475 baselines and 4388 controls detected with zero misses, 10 completed playouts in each of modes 7, 8 and 9, and the Git provenance gate checked at that clean commit |

**What this run caught, and what was changed.**

- **The file did not fit a 320 x 568 phone.** It scrolled 24 px inside the card. On a short phone the role card becomes a row and the file tightens, only at the default text size; it now fits without scrolling, the inspect card included.
- **Names broke in the middle and ran into the portrait.** A twelve-character name wrapped letter by letter across a small snapshot. The seat number became a sticker in the portrait's corner, giving the caption the snapshot's whole width; a name too long for it ends in an ellipsis, said whole by the button and the inspect card.
- **Twice the text size changed nothing.** The file's words were fixed in pixels. Under the board's own large-text query the words now grow with the reader's text size and the file reflows into one column; the card scrolls.
- **The inspect card was below the fold.** It now lies over the dimmed envelope, and the lifted snapshot grows down from its pin instead of over the file's tab.
- **The board's secrecy measurement did not know the file.** It reported the role names in the file as outside the private card. The file is now marked as private content of the open card, like the role card, so every board secrecy check covers it too: the flows prove it leaves the document with the card.
- **The board's captures did not depend on the ability art they draw.** Their freshness hash now includes `abilities.css`, `dossier.js` and the kit's stylesheet.
- **A planned entry checked against the rule.** The Hacker's planned file marks the known Undercover "Not in the Code". The release's sentence says only who the Undercover is, but the rule gives the Hacker exactly that from the start (v2.1 `roles.Hacker.starting_knowledge`: "therefore knows that player's number is excluded from Code"), so the mark stays in the plan, cited, as proposed words.

## 11 October 2026, later: the stamp frame

Found while building slice 2: the stamp frame (`dossier-stamp`) was drawn as a background sized `100% 100%`, but an SVG keeps its aspect ratio, so on a wide word the frame shrank to the stamp's height and the word ran past it ("CLASSIFIED"). The frame is now nine-sliced (`border-image`): its corners keep their shape and its sides stretch to the word. Run again on the fix with the same tools: `abilities-capture.mjs` **26 pictures and a contact sheet, 0 with problems**; `board-motion-capture.mjs` **214 captures and 5 contact sheets, 0 with problems**; `abilities-check.mjs` **6 of 6**; `board-motion-check.mjs` **13 of 13**.

## 11 October 2026: slice 2

Run in the worktree of `claude/designer-ability-art-2` on the content of the commit that adds slice 2 (its parent is `1453500`, slice 1's head), before committing, with `npm ci` and `npm run build` (both passed; Node 22.21.1, npm 10.9.4). The board prototype changed again (ten scenarios, the files and strip art wired in, a set's picks marked alike), so its checks were run again.

| Command | Actual result |
| --- | --- |
| `node design/tools/abilities-assets.mjs --check` | Passed: `Ability assets are current: 17 files` (15 assets, the stylesheet, the manifest `abilities-0.2.0`) |
| `node design/tools/abilities-capture.mjs` | Passed: **66 pictures and 2 contact sheets, 0 with problems** (slice 1's 26 and slice 2's 40: the Hacker's file and the Alien's at rest, inspecting, with long names, at twice the text size, without art; the Code card choosing, confirming and registered; the Scan's target, sending and reduced; ten assembly frames) |
| `node design/tools/abilities-check.mjs` | Passed: **7 of 7 checks**, over 15 assets and 24 treatments (6 delivered) |
| `node design/tools/board-motion-capture.mjs` | Passed: **220 captures and 5 contact sheets, 0 with problems** (74 scenarios) |
| `node design/tools/board-motion-check.mjs` | Passed: **13 of 13 checks**, over 14 actions, 21 cues and 74 scenarios |
| `node design/tools/board-motion-flows.mjs` | Passed: **212 of 212** (11 new: the Hacker's file, a live Scan whose result is printed once and not again on reopening, the Alien's file, the Code card) |
| `npm run test --workspace @mothership/design-tokens` | **153 tests: 152 passed, 1 failed.** The **30 ability-check tests pass** (8 new for slice 2). The one failure is the same pre-existing issue #76 quote mismatch (PR #93) |
| `node design/tools/check-assets.mjs` | Passed: **15 of 15 checks** |
| `git diff --check` | Clean |
| `npm run verify` | Run on `b056831e82728e4e2c49cf0ae3befabe082124e3`, the commit that adds slice 2, with the working tree clean before and after (the commit after it changes only this page): **exit 0 in 759 s**; its balance stage reported 475 baselines and 4388 controls detected with zero misses, 10 completed playouts in each of modes 7, 8 and 9, and the Git provenance gate checked at that clean commit |

**What this run caught, and what was changed.**

- **The printout's paper shrank in the middle of its row.** Like the stamp, an SVG keeps its aspect ratio; the printout is nine-sliced too, so its torn ends keep their teeth at any width.
- **The Code card pushed the board off a short phone.** At 320 x 568 the strip grew by the card and the board overflowed its row by 56 px (the board capture's `w320-code`). On a short phone the card now sits small at the start of the detail line, where progress dots were.
- **Large text.** The Undercover tape spanned the wrong box, chip seat numbers grew over their chips, and the Alien's names wrapped letter by letter under a width cap. At large text the tape's word now stands beside the snapshot, the chips grow, and the cap is lifted.
- **A stray file.** A scratch renderer wrote an HTML page next to `intel.svg`; the check refused it for its missing development-only mark, and it was removed.

## A fix before slice 3: an update plays nothing again, and moves no focus

Found while building slice 3, on `022ae5b`, with the board flows' own controls and a probe in the page:

- **A duplicate snapshot played the receipt again.** The strip was rebuilt on every update, so the same snapshot delivered twice (or any public fact about someone else) stamped **Registered** again (the board-motion proposal, PR #88), and punched the Code card and clipped its four chips again (slice 2). The board's check on each pick of a set was stamped again too.
- **An update dropped focus.** The card, the tray, the menu and the navigation were rebuilt on every update, so a public fact about another player moved focus from an inspected snapshot (or Close, or a navigation button) to the page; the inspect card kept the public facts it was opened with.

Now each part of the phone is drawn again only when what it shows changes; a stamp lands once per step; a set's check stays while its pick does; the Code card's clip (only the new pick's chip) and punch are one-shot beats played for the change that caused them, finished at once by reduced motion; an inspected player's facts follow the board in place. Recorded in the board-motion handoff (tests 5 and 9) and the Code attempt's motion entry.

| Command | Result |
| --- | --- |
| `node design/tools/board-motion-flows.mjs` | Passed: **228 of 228** (16 new: a duplicate snapshot and a public fact replay nothing in four strips; a new pick clips only its chip; the receipt punches once; a move's arrival redraws the receipt without stamping it again; focus kept on a snapshot, Close, the navigation and the Reduce motion box; an inspected player's facts follow the board) |
| `node design/tools/board-motion-capture.mjs` | Passed: **220 captures and 5 contact sheets, 0 with problems** |
| `node design/tools/abilities-capture.mjs` | Passed: **66 pictures and 2 contact sheets, 0 with problems** |
| `node design/tools/board-motion-check.mjs` | Passed: **13 of 13** |
| `node design/tools/abilities-check.mjs` | Passed: **7 of 7** |
| `npm run test --workspace @mothership/design-tokens` | **153 tests: 152 passed, 1 failed**: the same pre-existing issue #76 quote mismatch (PR #93). One test's edit followed the hidden card's new code |
| `node design/tools/check-assets.mjs` | Passed: **15 of 15** |
| `git diff --check` | Clean |

## 11 October 2026: slice 3

The Cracker's Rescue, the Blue and the Red Disabler's Disable, and the Supplier's Supply with its slips (`abilities-0.3.0`), on `b73cc9a` (the fix above). Checks ran on the slice's commit in a Linux container, with the pinned Node 22.21.1 and npm 10.9.4, and headless Chromium 141.

| Command | Result |
| --- | --- |
| `node design/tools/abilities-assets.mjs --check` | Passed: the kit is what its recipes make (**23 assets**) |
| `node design/tools/abilities-capture.mjs` | Passed: **114 pictures and 3 contact sheets, 0 with problems**: slices 1 and 2's 66, and 48 new (the Rescue, the Disable and the Supply at both sizes; the Red Disabler's strips, compared part for part with the Blue's; the Cracker's card and seven states of the slips; four at twice the text size; reduced motion; four without art; twelve beat frames) |
| `node design/tools/abilities-check.mjs` | Passed: **8 of 8 checks**, over 23 assets and 24 treatments (9 delivered) |
| `node design/tools/board-motion-capture.mjs` | Passed: **233 captures and 5 contact sheets, 0 with problems** (87 scenarios), with the new measure that no stamp covers the strip's words |
| `node design/tools/board-motion-check.mjs` | Passed: **13 of 13 checks**, over 14 actions, 21 cues and 87 scenarios |
| `node design/tools/board-motion-flows.mjs` | Passed: **249 of 249** (21 new: a Rescue from Room A of a player in the Hospital, its vial emptied once as the count falls, a receipt with nothing of a recovery, then the recovery as the same public cue on both boards and nothing private on this phone; the Blue and the Red Disabler's strips and receipts the same; Supply picked out of seat order, tied on the receipt; the Supplier's slip dropped in once and at rest when the card opens again; a recipient's slip naming no Supplier) |
| `npm run test --workspace @mothership/design-tokens` | **161 tests: 160 passed, 1 failed**: the same pre-existing issue #76 quote mismatch (PR #93). The **38 ability-check tests pass**, 8 new for slice 3 |
| `node design/tools/check-assets.mjs` | Passed: **15 of 15 checks** |
| `git diff --check` | Clean |
| `npm run verify` | Run on `678814c5679731ceca7d32b2b9431eda7134271c`, the commit that adds slice 3, with the working tree clean before and after (the commit after it changes only this page): **exit 0 in 701 s**; its balance stage reported 475 baselines and 4388 controls detected with zero misses, 10 completed playouts in each of modes 7, 8 and 9, and the Git provenance gate checked at that clean commit |

**What this run caught, and what was changed.**

- **The Disable's sparks crossed the target's face.** On a receipt that must not be a result, arcs over the portrait read as the hit itself. They are now a charged reticle: a dashed ring with sparks at its four corners, outside the chip.
- **The card's notes had no words.** The sheet's light text color was inherited onto the paper; the notes now set their ink.
- **The card with two slips scrolled on a 320 x 568 phone**, and at twice the text size the notes' words did not grow, and a strip chip's seat badge covered the question. The card now compacts as the files do on a short phone, the notes' words grow with the reader's text, and a strip chip drops its badge at large text (the strip's words name the seat). Two new measures hold it.
- **The strip's stamp covered words** (the board-motion proposal): on a long first line at 320 x 568 (Supply's receipt, a recorded vote, "Not accepted"), and on a sending action's line at both sizes. The first line now wraps short of the stamp's corner; the board capture measures that no stamp covers a word, in every scenario and size.
- **Two measures could not fail.** Inside the capture's template literal, `\b` became a backspace and `\d` a letter, so the checks that a Rescue's receipt speaks of no recovery and that the Disable's strip names no team matched nothing. Every backslash in the slice 3 measures is now doubled, and the page script was parsed and searched for a stray backspace.
- **The board-motion capture's input hash left out `intel.js`.** It now takes every ability script.

**Not run, and what the checks do not prove.** Every picture is a desktop Chromium simulation: no real phone, screen reader, touch input, production integration or match. The strip's detail line and buttons keep their pixel size at twice the text size (the board-motion proposal, unchanged here); the slice 3 art in them keeps its size too.

## A fix after slice 3: the slip's frames held the card

Found while reviewing slice 4's beat frames: the first frame of a slip dropping into the card, `beat-slip-0000ms.png`, showed the board and no slip. The capture held every animation at the frame's time, the card's own slide-in among them, so at 0 ms the card was still below the screen and the picture showed what lay under it. The slip's frames now hold only the slip's beat and let the card finish opening (the prototype's `only` parameter), so each frame shows the slip where it lands: hidden at 0 ms, landing at 130 ms, at rest at 260 ms. Only the capture's parameters changed; the slip, its motion and the prototype did not.

| Command | Result |
| --- | --- |
| `node design/tools/abilities-capture.mjs` | Passed: **114 pictures and 3 contact sheets, 0 with problems**. The two changed frames and the slice 3 contact sheet are committed; the other pictures differed from the committed ones only in rendering bytes and were kept as they were |
| `node design/tools/abilities-check.mjs` | Passed: **8 of 8 checks** |
| `node --test packages/design-tokens/test/abilities-check.test.mjs` | Passed: **38 of 38** |
| `git diff --check` | Clean |

## 11 October 2026: slice 4

The ordinary shot (every seat that shoots: the Officer's from Round 1, the Undercover's, a supplied weapon's, an Alien's included) and the Undercover's Protection (`abilities-0.4.0`), on `3ec88ea` (slice 3 and the fix above). Checks ran on the slice's commit in a Linux container, with the pinned Node 22.21.1 and npm 10.9.4, and headless Chromium 141.

| Command | Result |
| --- | --- |
| `node design/tools/abilities-assets.mjs --check` | Passed: the kit is what its recipes make (**28 assets**) |
| `node design/tools/abilities-capture.mjs` | Passed: **145 pictures and 4 contact sheets, 0 with problems**: slices 1 to 3's 114, and 31 new (the shot and Protection at both sizes; the Undercover's and an Alien's strips, compared part for part with the Officer's; the Officer's Round 1 shot, its card after the shot, and with a weapon supplied after it; the Undercover's notes, used up and for yourself; the Alien's card with a supplied weapon; two at twice the text size; reduced motion; three without art; six beat frames) |
| `node design/tools/abilities-check.mjs` | Passed: **9 of 9 checks**, over 28 assets and 24 treatments (13 delivered) |
| `node design/tools/board-motion-capture.mjs` | Passed: **244 captures and 5 contact sheets, 0 with problems** (98 scenarios; 11 new: the Officer's Round 1 shot, the Undercover's and an Alien's shots, Protection's confirmation and receipt, the Undercover's three cards, the Officer's two cards after the shot, the Alien's card with a supplied weapon) |
| `node design/tools/board-motion-check.mjs` | Passed: **13 of 13 checks**, over 14 actions, 21 cues and 98 scenarios |
| `node design/tools/board-motion-flows.mjs` | Passed: **274 of 274** (25 new: the Officer's shot in Round 1 from the pick to the card holding none, with nothing on the other screens and no public cue; the Officer's, the Undercover's and an Alien's strips and receipts the same; the round leaving the rack once as the count falls, and drawn spent with no beat in reduced motion; a Protection registered and not a grant, no note until the view carries one, then granted and used up with no cue on any screen and nothing public changed, its shield shaking once and never again on a duplicate snapshot or a second opening; the notes in the view's order with the own one as "yourself"; the Alien's card with its Code, a recipient's slip and the weapon) |
| `npm run test --workspace @mothership/design-tokens` | **170 tests: 169 passed, 1 failed**: the same pre-existing issue #76 quote mismatch (PR #93). The **47 ability-check tests pass**, 9 new for slice 4 |
| `node design/tools/check-assets.mjs` | Passed: **15 of 15 checks** |
| `git diff --check` | Clean |
| `npm run verify` | Run on `697a1e73a9d2e1ebcca5908042d2e0fc967ec27b`, the commit that adds slice 4, with the working tree clean before and after (the commit after it changes only this page and corrects a rule citation in the handoff): **exit 0 in 731 s**; its balance stage reported 475 baselines and 4388 controls detected with zero misses, 10 completed playouts in each of modes 7, 8 and 9, and the Git provenance gate checked at that clean commit |

**What this run caught, and what was changed.**

- **A used-up Protection hid its player.** The first split shield was drawn over the chip, so the note showed a cracked shield and a stray seat badge where Player 8 should be. The shield is now split in two and parted behind the chip, which is drawn whole: the shield was spent, not the player.
- **The crack's first frame showed the board**, as the slip's did (the fix above): the frames now hold only the note's beat.
- **Three measures broke the capture's page script.** Inside its template literal an escaped apostrophe (`\'`) became a bare quote and ended the string. They are double-quoted now, and the page script was parsed and searched for a stray backspace before any picture was taken.
- **A claim in the first draft of the handoff did not hold**: that the Officer's role card states its one-shot rule. It does not (the card names the role, its team and its device), and the handoff says so.
- **A rule was cited wrongly**, found after the commit: the handoff gave V1-15 for a weapon used when the shot is accepted. V1-15 covers the Rescue's and the Disable's uses and the Undercover's grant, once per recipient; the weapon is the engine's (it is spent at acceptance) and v2.1's (a shot's resources are consumed whatever its outcome, `protection.on_block`). The handoff now cites those.

**Not run, and what the checks do not prove.** Every picture is a desktop Chromium simulation: no real phone, screen reader, touch input, production integration or match. The prototype's server and its private facts are stand-ins: a Protection's grant and use come from the fixture panel, not from the engine's round. The strip's detail line and buttons keep their pixel size at twice the text size (the board-motion proposal, unchanged here); the slice 4 rounds in them keep their size too.

## What the checks assert, and what they do not

- `check:abilities` (no browser): the kit is exactly what its recipes make from `source/dossier.svg`, in the drawing vocabulary and the neutral palette (no team, room or crew color), versioned, anchored and with its rights; the inventory names a treatment for every V1 role and every shared moment, each with five motion forms, and reads only view fields the approved contracts carry; the Insider's file sorts the candidates by seat before drawing them, draws each candidate with nothing of a role, keeps the role names one picture with one accessible name and never a list, swings the query tags together, colors only with tokens, draws art only behind loaded bundles, styles no candidate apart and draws its board cue on the own board only; the prototype loads the kit whatever the role, its hidden card holds nothing private, no production file refers to the prototype, every file carries the development-only mark; the review pictures were taken from the current art, pages and fixtures and measured clean; the inventory page is generated from the contract. Statically: it reads source text, so it proves what the code says, not what a browser draws.
- `capture:abilities` (browser): in every picture, in the page, the three snapshots are in seat order, built and sized alike, each shows its seat number, none names a role or points at the role names, the role names are one group below the three, nothing scrolls sideways, nothing scrolls at the default text size (the inspect card included), every control is at least 44 px, a name is cut only with an ellipsis and said whole by its button, and never cut at large text; while the card is hidden, the page holds neither the file nor a private word; after the background, reopening shows the file at rest with no animation running. It does not measure readability, contrast in compositing, touch accuracy or motion comfort.
- Since slice 2, `check:abilities` also holds: a wrong Scan's printout carries nothing of the Code; a Scan result is said in the release's words; the Hacker's file neither reorders nor filters the results; the Alien's Code is sorted by seat before it is drawn and is never an ordered list; the Code card is filled in seat order; no pick of a set is numbered on the board; the strip names a set's picks in seat order. `capture:abilities` measures the same in the page, and that the scanner sweeps only while a Scan is on its way, never in reduced motion.
- The board flows press the file's own controls: inspect, Escape, the background, an explicit reopen, a stale view and Card while stale; and, since slice 2, a live Scan whose result is printed once in the Hacker's file and not again when the card is opened again.
- Since slice 3, `check:abilities` also holds: the Rescues, the slips and their heading in the release's words, found in `en.ts` and `comic-shell.ts`; Supply's tags and a Supplier's slip in seat order; a recipient's slip saying no more than the release; nothing in `tools.js` named for a role or a team, or speaking of a recovery or a hit; the Disable's strip independent of the role; a vial emptied only by a fall of the view's count; no role's device drawn by the ability styles. `capture:abilities` measures the vials against the count, a Rescue's receipt free of any recovery, the cell spent exactly on the receipt, the tags in seat order and tied exactly on the receipt, every slip's words and tags, the Blue and the Red strips identical, a card with notes unscrolled at the default size and its words grown at large text. The flows add the journeys above.
- Since slice 4, `check:abilities` also holds: the weapons and every Protection in the release's words, found in `en.ts`, the seat's own as "yourself"; the notes in the view's order, never reordered or filtered; nothing in `guard.js` named for a role or a team, working out whether a Protection is active, or speaking of an attack, a hit or a block; the notes drawn from `knowledge.protections`, never the role; the weapons note for every count the view says; the shot's strip drawn from its target and the view's count alone, its target in the reticle; a round spent only by a fall of the view's count and drawn spent only on an accepted shot; a Protection's grant and use changing nothing public. `capture:abilities` measures the rounds against the count, a spent round only on a shot's receipt, the reticle and the shield only for their actions, a shot's strip that says nothing of who shoots and the Officer's, the Undercover's and an Alien's strips identical, every Protection note's words and shield, the weapons note's words and rounds, a card with notes unscrolled at the default size and its words grown at large text. The flows add the journeys above.
- None of it is a test of the production runtime, a real phone, a screen reader, or a match.

## Not run

- Any real phone, tablet or shared display; any screen reader or switch access; any touch input.
- The production game (`apps/game/`): nothing there draws the file yet.
- An owner review of the look and motion (DSN-D37).
- A match where the Rescue's count, the Disable or Supply's acknowledgments come from the engine: the prototype's server is a labeled stand-in that answers as its fixtures say.
