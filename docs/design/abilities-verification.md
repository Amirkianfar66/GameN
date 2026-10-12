# Verification of the ability art

Ability art · slice 1 (the Insider's file and the hidden card, branch `claude/designer-ability-art`, `abilities-0.1.0`), slice 2 (the Hacker's file and Scan, the Code attempt, the Alien's Code, branch `claude/designer-ability-art-2`, `abilities-0.2.0`) slice 3 (the Rescue, the Disable, the Supply and its slips, branch `claude/designer-ability-art-3`, `abilities-0.3.0`) slice 4 (the shot and Protection, branch `claude/designer-ability-art-4`, `abilities-0.4.0`) slice 5 (the ballots, the release request, a Hack and Pass, branch `claude/designer-ability-art-5`, `abilities-0.5.0`) slice 6 (the showdown and the match's end, branch `claude/designer-ability-art-6`, `abilities-0.6.0`), slice 7 (the tray's marks, the failure states, movement and health, branch `claude/designer-ability-art-7`, `abilities-0.7.0`) and slice 8 (choosing a character and the role card's reveal, branch `claude/designer-ability-art-8`, `abilities-0.8.0`) · built on the board-motion prototype at `08409392d1040f20d559a9f36a2a1d9bb23468c4` (branch `codex/designer-board-motion`, [PR #88](https://github.com/Amirkianfar66/GameN/pull/88), **not merged**) · ruleset `in-person-v1-pass-2026-10-08` · 11 October 2026

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

## 11 October 2026: slice 5

The ballots (a Captain election and its runoff, a Jail vote, a release vote), the Captain's release request, a Hack and Pass (`abilities-0.5.0`), on `1a52f56` (slice 4). Checks ran on the slice's commit in a Linux container, with the pinned Node 22.21.1 and npm 10.9.4, and headless Chromium 141.

| Command | Result |
| --- | --- |
| `node design/tools/abilities-assets.mjs --check` | Passed: the kit is what its recipes make (**38 assets**) |
| `node design/tools/abilities-capture.mjs` | Passed: **187 pictures and 5 contact sheets, 0 with problems**: slices 1 to 4's 145, and 42 new (ballots, release votes, the release request, a Hack's request and its note, Pass, at both sizes; an abstention, the runoff, No, the receipts; the Hack's note on the asked partner's phone, compared with the asking one's; two at twice the text size; two in reduced motion; five without art; nine beat frames) |
| `node design/tools/abilities-check.mjs` | Passed: **10 of 10 checks**, over 38 assets and 24 treatments (16 delivered) |
| `node design/tools/board-motion-capture.mjs` | Passed: **255 captures and 5 contact sheets, 0 with problems** (109 scenarios; 11 new: a ballot confirmed, an abstention and its receipt, the release request and its receipt, a release vote's Yes, No and receipt, a Hack's request and its receipt, the Hack's note on the asked partner's phone) |
| `node design/tools/board-motion-check.mjs` | Passed: **13 of 13 checks**, over 14 actions, 21 cues and 109 scenarios |
| `node design/tools/board-motion-flows.mjs` | Passed: **297 of 297** (23 new: a ballot picked, posted once on its receipt, with no count and nothing on the other screens; an abstention's blank slip; a release vote's Yes and No; the Captain's release request; a Hack's request, accepted and unseen by the other screens; the Hack's note, its cord run once and never again on a duplicate snapshot or a second opening, the same on the asked partner's phone; Pass handed on once, and with no beat in reduced motion) |
| `npm run test --workspace @mothership/design-tokens` | **178 tests: 177 passed, 1 failed**: the same pre-existing issue #76 quote mismatch (PR #93). The **55 ability-check tests pass**, 8 new for slice 5 |
| `node design/tools/check-assets.mjs` | Passed: **15 of 15 checks** |
| `git diff --check` | Clean |
| `npm run verify` | Run on `f287351e9a4d9ed6e16b39066d5d097f94660cde`, the commit that adds slice 5, with the working tree clean before and after (the commit after it changes only this page): **exit 0 in 675 s**; its balance stage reported 475 baselines and 4388 controls detected with zero misses, 10 completed playouts in each of modes 7, 8 and 9, and the Git provenance gate checked at that clean commit |

**What this run caught, and what was changed.**

- **The release request squeezed its question.** Beside the long label "Release request", the key ring left the words a narrow column, and the chip's seat badge covered the key. The key ring now sits small at the start of the detail line, without its badge (the words name the player).
- **A Hack phase showed a Hacker without the Hacker's file**, an impossible view (a Hacker always knows the Undercover); the capture's measure refused it. A Hack is open to every role, so that scenario's asking partner is now the Supplier.
- **An abstention's slip names nobody**, so the slice 3 measure that compares a strip's target with the pick would have thrown on it; it now leaves ballots to slice 5's own measure.
- **The board check needs the release's built words** (`packages/presentation/dist`), which a fresh worktree lacks: `npm run build` first. It changed no tracked file.

**Not run, and what the checks do not prove.** Every picture is a desktop Chromium simulation: no real phone, screen reader, touch input, production integration or match. The prototype's server is a stand-in: a Hack phase and its partner come from the fixtures, not from a closing turn. The strip's detail line and buttons keep their pixel size at twice the text size (the board-motion proposal, unchanged here); the slice 5 box and microphone in them keep their size too.

## 11 October 2026: slice 6

The showdown's special shot and the match's end (`abilities-0.6.0`), on `a3379d1` (slice 5). Checks ran on the slice's commit in a Linux container, with the pinned Node 22.21.1 and npm 10.9.4, and headless Chromium 141.

| Command | Result |
| --- | --- |
| `node design/tools/abilities-assets.mjs --check` | Passed: the kit is what its recipes make (**39 assets**) |
| `node design/tools/abilities-capture.mjs` | Passed: **214 pictures and 6 contact sheets, 0 with problems**: slices 1 to 5's 187, and 27 new (the showdown choosing, confirming and registered, and the end with Blue the winner and ended by the host, at both sizes; the end's other four outcomes; two at twice the text size; two in reduced motion; two without art; seven beat frames, the special shot spent and the end revealed) |
| `node design/tools/abilities-check.mjs` | Passed: **11 of 11 checks**, over 39 assets and 24 treatments (18 delivered) |
| `node design/tools/board-motion-capture.mjs` | Passed: **280 captures and 5 contact sheets, 0 with problems** (117 scenarios; 25 new: the showdown confirmed and registered and the end's six outcomes; five sizes in the matrix, the end at 320 x 568 with and without the co-win and ended by the host, at twice the text size and in reduced motion; two storyboards of `cue-end-reveal`, finished and ended, each with its reduced frame; two secrecy pairs, the showdown registered and the end) |
| `node design/tools/board-motion-check.mjs` | Passed: **13 of 13 checks**, over 14 actions, 22 cues and 117 scenarios |
| `node design/tools/board-motion-flows.mjs` | Passed: **332 of 332** (35 new: the showdown picked, still full while sending, spent once on its receipt, unseen by the other screens, and with no beat in reduced motion; the end with its winner, roles and Code in seat order, the same on the other screens but for "(you)", one reveal cue on each, the timer's words, Card and Actions closed with nothing private in the page; a choice, a receipt and an open card leaving with the match; nothing played again on a duplicate, a reconnect, a load at the end or the menu closing; the host's ending with nothing revealed; reduced motion, also switched on mid-reveal; the Alien's co-win) |
| `npm run test --workspace @mothership/design-tokens` | **183 tests: 182 passed, 1 failed**: the same pre-existing issue #76 quote mismatch (PR #93). The **59 ability-check tests pass**, 4 new for slice 6, and a new board-check test proves the end's rules refuse a role before a finished match, an end hook on the board and an end reveal at the wrong phase |
| `node design/tools/check-assets.mjs` | Passed: **15 of 15 checks** |
| `git diff --check` | Clean |
| `npm run verify` | Run on `4a6542fff759f9704d83297ffbd251e5aae69c99`, the commit that adds slice 6, with the working tree clean before and after (the commit after it changes only this page): **exit 0 in 659 s**; its balance stage reported 475 baselines and 4388 controls detected with zero misses, 10 completed playouts in each of modes 7, 8 and 9, and the Git provenance gate checked at that clean commit |

**What this run caught, and what was changed.**

- **The other screens' frame styled the result's heading as its own.** The prototype's chrome rule for the observer's title (`.bm-observer h2`) reached every heading inside it, so "Result" was drawn in the chrome's grey on the caption yellow. It now reaches only the frame's own title (`.bm-observer > h2`).
- **Role names overflowed their cards in the other screens' frame** (300 px, narrower than any phone): "UNDERCOVER" crossed its card's edge. A container query takes the character and the role down a step in a sheet whose content is under 300 px wide, which includes the 320 px phone's (there "RED DISABLER" now keeps to one line); the capture now measures that nothing in a cast card leaves it. The stylesheet's comment on that query still says "narrower than any phone's"; slice 7 corrects it.
- **A narrow-sheet rule lost to the rule it meant to override**: placed before it in the stylesheet, with the same specificity. Moved after it.
- **The capture's measure took the ribbon's tails for cut-off words** (they lie outside the band by design, and an element's scroll width counts them). It now measures the outcome's text against its band.
- **The Code's pins tilted and snapped straight**: they borrowed the stamp's keyframes, which rotate it. They now have their own, which settle exactly as they rest.
- **The status bar cut "Match ended by the host" short at 320 x 568.** At a match that is over the phase's words take both lines (the round is in its chip), and the timer's box narrows to its dash.
- **The board check let an ended match carry an end reveal.** The new test that gives the panel's "host ends the match" fact an end reveal found the rule on the end's facts firing only when a fact carried both the result and the end reveal. It now refuses either one outside a finished match, and a finished match without both.
- **A new test could not fail its first half**: it named a role as `officerRound`, which holds no word boundary, so the role rule never saw a role. It now names one as a word.
- **A stray import of the capture tool ran it**, which deleted the board's review folder before the browser was found; restored from Git at once, and every picture was then made again by full runs.

**Not run, and what the checks do not prove.** Every picture is a desktop Chromium simulation: no real phone, screen reader, touch input, production integration or match. The prototype's server is a stand-in: the showdown, its shots and the match's end come from the fixtures and the panel's public facts, not from an engine's round. The other screens' frame (300 x 560) stands for every other phone and the shared display; a real table display is wider. The strip's detail line and buttons keep their pixel size at twice the text size (the board-motion proposal, unchanged here).

## 12 October 2026: slice 7

The tray's marks, the failure states (the connection banner, Reconnect now, the card on an out-of-date view), movement and health (`abilities-0.7.0`), on `1e2f491` (slice 6). Checks ran on the slice's commit in a Linux container, with the pinned Node 22.21.1 and npm 10.9.4, and headless Chromium 141.

| Command | Result |
| --- | --- |
| `node design/tools/abilities-assets.mjs --check` | Passed: the kit is what its recipes make (**49 assets**, 10 new: the tray's marks) |
| `node design/tools/abilities-capture.mjs` | Passed: **235 pictures and 7 contact sheets, 0 with problems**: slices 1 to 6's 214, and 21 new (the tray of eight roles and phases at 390 x 844, and the Undercover's at 320 x 568, at twice the text size and without the art; the banner over the board and the card kept, at both sizes; the menu below the banner; the Undercover's notes kept; an unreadable update; PR #88's folder; the card kept at twice the text size and without the art). The first run refused three of them (below); the second, with the measure corrected, none |
| `node design/tools/abilities-check.mjs` | Passed: **12 of 12 checks**, over 49 assets and 24 treatments (22 delivered) |
| `node design/tools/board-motion-capture.mjs` | Passed: **299 captures and 5 contact sheets, 0 with problems** (129 scenarios; 19 new: the tray of the Undercover, the Cracker, a Disabler, the Supplier, the showdown, a vote, the release request and the release vote, an unreadable update, the card kept on an out-of-date view with and without notes, and a resolved showdown; six in the matrix at 320 x 568: the banner, the menu and the paused tray below it, the card kept, an unreadable update, and the card kept at twice the text size; one secrecy pair, the card kept). The end's storyboard now starts from a resolved showdown |
| `node design/tools/board-motion-check.mjs` | Passed: **13 of 13 checks**, over 14 actions, 22 cues and 129 scenarios |
| `node design/tools/board-motion-flows.mjs` | Passed: **366 of 366** (34 new: each tray's marks, every ballot's one mark, eleven marks for eleven actions; the banner's words, Reconnect now waiting, the fresh view said once with no cue played; an unreadable update and its own words; the menu and the paused tray below the banner at 320 x 568, and still below it when the reader's text doubles with a sheet open; the card kept: marked, at rest, not pressable, the mark gone when the view is current, an inspected snapshot put back on going out of date with focus going to it, focus on Close staying there, no mark when only the time is up, concealed by the background, and PR #88's folder by default) |
| `npm run test --workspace @mothership/design-tokens` | **187 tests: 186 passed, 1 failed**: the same pre-existing issue #76 quote mismatch (PR #93). The **63 ability-check tests pass**, 4 new for slice 7: they prove the check refuses a tray action without its mark or a mark drawn before its art, a card marked out of date when only its time is up, a kept file that can still be inspected or keeps its inspected snapshot, and a card kept on an out-of-date view by default. The tests' scratch copy now also holds stand-ins for the board pictures the inventory cites, which the first run lacked |
| `node design/tools/check-assets.mjs` | Passed: **15 of 15 checks** |
| `git diff --check` | Clean |
| `npm run verify` | Run on `647a15985ad12cd623f97e8ed9fcadea1ba2f7fd`, the commit that adds slice 7, with the working tree clean before and after (the commit after it changes only this page): **exit 0 in 687 s**; its balance stage reported 475 baselines and 4388 controls detected with zero misses, 10 completed playouts in each of modes 7, 8 and 9, and the Git provenance gate checked at that clean commit |

**What this run caught, and what was changed.**

- **The tray's marks were blank.** A shorthand `background` in a rule of higher specificity reset the marks' images to none; the slice uses the longhands.
- **A kept card at 320 x 568 went under the banner.** The ability kit's full-height card rule overrode the sheets' new room; it now subtracts the banner's height too.
- **A kept card cannot fit under the banner without scrolling** (57 px at 390 x 844, 161 px at 320 x 568, at the default text size): the capture's rule that a file fits its card without scrolling refused three pictures. The banner takes about 100 px of the card's room, and shrinking the file for a passing state would change its layout. The kept card may scroll to its file; the capture now measures instead that its first view holds its heading, Close, the mark and the role card (a probe proves the rule fails on a card cut to 160 px and on a mark pushed out of view).
- **The banner's words kept 13 px at twice the text size, and its clearance was measured only when the board was drawn.** Found re-reading the diff before committing: a text-size change or a rotation with a sheet open would leave the sheet over a grown banner (a probe, with the words in `rem`, left the menu's heading covered by the grown banner, 140 px above its new lower edge). The words and the button now grow with the reader's text, as the release's banner does, and the clearance is measured again whenever the banner's height changes; a new flow doubles the text with a sheet open. The kept card's first view asks for the role card only at the default text size (at 320 x 568 and twice the text size it is below the first view).
- **Going out of date drew the kept card again**, so focus inside it fell to the page. The flow that said focus stayed clicked by script, which moves no focus, and so compared the page with itself. The card is now kept in place (the mark put in or taken out, the file paused); focus in the inspect card goes back to its snapshot, as Back does; and two flows put focus there first, on Back and on Close. Run against the previous code, both fail: focus fell to the page.
- **Two flows were fragile, not wrong.** The end's reduced-motion flow read the fade after the click in a second step, and could miss the 80 ms fade on a slow run; it now reads it in the same step. The kept card's flow counted every running animation, the sheet's own rise included; it now counts only its file's.
- **Older ability-check rules** matched lines this slice rewrote (the strip's beats now ask whether the card is still or paused, and loading asks whether the card can be shown); updated to the new lines, with the same meaning.
- **A stale comment**, flagged in slice 6: `board.css`'s narrow-sheet container query also reaches the 320 px phone's sheet; the comment says so now.

**A fix after the pull request went up.** On a view that went out of date with the card kept, an inspected snapshot was put back with its 200 ms slide home, so the held file still moved for a moment. Slice 8's run of these board flows caught it on a slower run; this branch had passed by timing. `pauseFile()` now finishes everything still moving in the file once it is held, and the flow that puts focus on Back asserts that nothing is left moving at the put-back itself (it fails on the previous code: the slide is still running). Run again on the fix:

| Command | Result |
| --- | --- |
| `node design/tools/board-motion-capture.mjs` | Passed: **299 captures and 5 contact sheets, 0 with problems** |
| `node design/tools/abilities-capture.mjs` | Passed: **235 pictures and 7 contact sheets, 0 with problems** |
| `node design/tools/board-motion-flows.mjs` | Passed: **366 of 366** |
| `node design/tools/abilities-check.mjs`, `board-motion-check.mjs` | Passed: **12 of 12** and **13 of 13** |
| `npm run test --workspace @mothership/design-tokens` | **187 tests: 186 passed, 1 failed**: the same pre-existing issue #76 quote mismatch (PR #93) |
| `npm run verify` | Run on `f60a0dd8b081d5e6a8b360dda2b1be3381357685`, the commit that makes the fix, with the working tree clean before and after (the commit after it changes only this page): **exit 0 in 701 s**; its balance stage reported 475 baselines and 4388 controls detected with zero misses, 10 completed playouts in each of modes 7, 8 and 9, and the Git provenance gate checked at that clean commit |

**Not run, and what the checks do not prove.** Every picture is a desktop Chromium simulation: no real phone, screen reader, touch input, production integration or match. The connection state is the prototype's panel, not a lost socket: the banner, Reconnect now and the fresh view are drawn from the fixtures, and Reconnect now's wait is a timer. Which behaviour the card keeps on an out-of-date view is Integration's (DSN-REQ-16); both are drawn.

## 12 October 2026: slice 8

Choosing a character and the role card's reveal (`abilities-0.8.0`), on `8f1f356` (slice 7 with its fix), drawn on a new prototype of the release's setup steps (`design/abilities/setup.html`). Checks ran on the slice's commit in a Linux container, with the pinned Node 22.21.1 and npm 10.9.4, and headless Chromium 141.

| Command | Result |
| --- | --- |
| `node design/tools/abilities-assets.mjs --check` | Passed: the kit is what its recipes make (**50 assets**, 1 new: `setup-back`) |
| `node design/tools/abilities-capture.mjs` | Passed: **273 pictures and 8 contact sheets, 0 with problems**: slices 1 to 7's 235, and 38 new, each measured in the page (`SETUP_MEASURE`): choosing at both sizes and crowded at both, on its way, confirmed, taken first, the answer lost, time up, at twice the text size and without the art; the role card face down, turned up and Ready at both sizes, the Red Disabler and the Alien turned up, hidden again, confirming, Retry Ready, assigned, face down and turned up at twice the text size, face down without the art; seven frames of the turn and its reduced form, the rise, the pop, a stamp landing and READY landing |
| `node design/tools/abilities-check.mjs` | Passed: **13 of 13 checks**, over 50 assets and 24 treatments (**24 delivered**) |
| `node design/tools/abilities-flows.mjs` (new) | Passed: **40 of 40**: the stamps as each card's name says, a taken card held, nothing of a role while choosing, nothing on a load; the pick on its way, confirmed, popped once and checked; another seat's stamp landing once; nothing on a fresh view or a duplicate; taken first, the answer lost and Retry selection; the timer's end; reduced motion; the deal (the card up once, face down, nothing of a role, the release's words); the turn's four animations, the face's role, side and device; Hide at once, Hide mid-turn, reduced motion switched on mid-turn, the background; reduced motion's fade; the same back for two roles; Ready (put away at once, READY once, focus on the note, nothing on a fresh view), the answer lost and refused |
| `node design/tools/board-motion-capture.mjs` | Passed: **299 captures and 5 contact sheets, 0 with problems**. The kit's stylesheet and `abilities.css` are inputs of the board's pictures, so they were taken again; the board draws nothing new |
| `node design/tools/board-motion-check.mjs` | Passed: **13 of 13 checks**, over 14 actions, 22 cues and 129 scenarios |
| `node design/tools/board-motion-flows.mjs` | Passed: **366 of 366** |
| `npm run test --workspace @mothership/design-tokens` | **191 tests: 190 passed, 1 failed**: the same pre-existing issue #76 quote mismatch (PR #93). The **67 ability-check tests pass**, 4 new for slice 8: they prove the check refuses a release word misquoted on the setup page; a role card built while face down; a card back drawn by role; and a setup beat played on a load, with a turn off the reviewed cue's beats. The tests' scratch copy now also holds `design/contract`, where the reviewed cue is |
| `node design/tools/check-assets.mjs` | Passed: **15 of 15 checks** |
| `git diff --check` | Clean |
| `npm run verify` | Run on `e23fefcf3f52784f74dca8e3b5b98b2245d97bb6`, the commit that adds slice 8, with the working tree clean before and after (the commit after it changes only this page): **exit 0 in 687 s**; its balance stage reported 475 baselines and 4388 controls detected with zero misses, 10 completed playouts in each of modes 7, 8 and 9, and the Git provenance gate checked at that clean commit |

**What this run caught, and what was changed.**

- **Slice 7's held file still moved for a moment.** This slice's first run of the board flows found an inspected snapshot still sliding home after the view went out of date with the card kept. The defect is slice 7's, so it was fixed on slice 7's branch (PR #111, `f60a0dd`, with its own pictures, flows and `npm run verify`), and this slice was rebuilt on it.
- **The page had no height without its frame** (`?chrome=0`, how the captures are made): `html`, `body` and `#app` now fill the viewport.
- **The back's words sat low on their band**: a padding in per cent of the card's width against a band placed in per cent of its height. Both are in `rem` now.
- **At twice the text size the taken stamps grew wider than their cards, and the back's words wrapped out of a band of fixed height.** A card too narrow for the word keeps the number (a container query on the card), and the words carry their own band (`span.ab-back-words`), which grows with them.
- **The deal landed six stamps on cards no longer shown** (the server's assignments of the characters not confirmed). A flow caught it: a stamp now lands only while the cards are on screen.
- **The capture's role-word rule could not fail.** The page's whole text runs one element's words into the next ("InsiderReady"), so a word boundary never matched. It now tests each text and each accessible name on its own, as the flows do. A probe proves seven of the measure's rules fail on broken pages: a role word on the face-down card, a role hook on the back, a stamp naming another seat, a stamp on a free card, a stamp out of its card, READY off its card, two cards checked.
- **Three rules of the new measure and check were wrong before they passed**: ARIA's `role="status"` on the Ready note matched the role-hook rule (only `data-` hooks count now); "role" in `phone-role-back` matched a case-insensitive role pattern; and the page's constants cannot be imported in Node (the check reads them from its text).
- **Found in the release, not changed**: at twice the text size the release's setup header, a 52 px grid row, cuts "Choose your character" on a 390 px phone (handoff, section 20.5).

**A fix after the pull request went up.** Integration's issue #112 found that on slice 7's board the system's reduced motion, switched on mid-walk, left the motion running, and asked that a page put away stop listening; its correction (PR #113) is on slice 7 frozen at `49f0db4`, and is not in this stack. The setup page had the same gap: the panel's switch settled it, the system's did not (a probe: two frames after the switch, the turn's four animations and the pop's three were still running), and a page put away for good still counted down (24 s, then 22). The page now settles at once on the media query's `change`; on `pagehide` it conceals the card and settles, and, put away for good, stops its countdown and the stand-in server's answers and removes the listener. Run again on the fix:

| Command | Result |
| --- | --- |
| `node design/tools/abilities-flows.mjs` | Passed: **49 of 49**, 9 new: the system's reduced motion switched on mid-turn (the turn finished, face up) and mid-pop (the pop, its burst and its check finished), and off again with nothing replayed; the page listening once; put in the back-forward cache mid-turn (concealed, face down, nothing moving; still counting down and listening); put away for good (the countdown stopped, an answer on its way never landing, the listener removed); no page error, twice. Run on the previous code, 7 of the 9 fail |
| `node design/tools/abilities-capture.mjs` | Passed: **273 pictures and 8 contact sheets, 0 with problems**, taken again (`setup.js` is an input) |
| `node design/tools/board-motion-capture.mjs` | Passed: **299 captures and 5 contact sheets, 0 with problems**, taken again (every file in `design/abilities/js` is an input of the board's pictures) |
| `node design/tools/abilities-check.mjs`, `board-motion-check.mjs` | Passed: **13 of 13** and **13 of 13** |
| `node design/tools/board-motion-flows.mjs` | Not run again: the board does not load `setup.js` (366 of 366 on `e23fefc`) |
| `npm run test --workspace @mothership/design-tokens` | **192 tests: 191 passed, 1 failed**: the same pre-existing issue #76 quote mismatch (PR #93). The **68 ability-check tests pass**, 1 new: it proves the check refuses a setup page deaf to the system's reduced motion, or still listening once put away |
| `node design/tools/check-assets.mjs`; `node design/tools/abilities-assets.mjs --check` | Passed: **15 of 15**; current |
| `git diff --check` | Clean |

**Not run, and what the checks do not prove.** Every picture is a desktop Chromium simulation: no real phone, screen reader, touch input, production integration or match. The setup prototype is a replica of the release's setup, not the release: its stand-in server answers as its panel says, and its timers are the page's own. The release's setup at the base draws no turn at all (`animation: none` on the compact phone); the turn here is the reviewed cue, proposed for it. The system's reduced motion is Chromium's emulated media, and the page put away is a dispatched `pagehide`: no real system setting, back-forward cache or closed tab was tested.

## What the checks assert, and what they do not

- `check:abilities` (no browser): the kit is exactly what its recipes make from `source/dossier.svg`, in the drawing vocabulary and the neutral palette (no team, room or crew color), versioned, anchored and with its rights; the inventory names a treatment for every V1 role and every shared moment, each with five motion forms, and reads only view fields the approved contracts carry; the Insider's file sorts the candidates by seat before drawing them, draws each candidate with nothing of a role, keeps the role names one picture with one accessible name and never a list, swings the query tags together, colors only with tokens, draws art only behind loaded bundles, styles no candidate apart and draws its board cue on the own board only; the prototype loads the kit whatever the role, its hidden card holds nothing private, no production file refers to the prototype, every file carries the development-only mark; the review pictures were taken from the current art, pages and fixtures and measured clean; the inventory page is generated from the contract. Statically: it reads source text, so it proves what the code says, not what a browser draws.
- `capture:abilities` (browser): in every picture, in the page, the three snapshots are in seat order, built and sized alike, each shows its seat number, none names a role or points at the role names, the role names are one group below the three, nothing scrolls sideways, nothing scrolls at the default text size (the inspect card included), every control is at least 44 px, a name is cut only with an ellipsis and said whole by its button, and never cut at large text; while the card is hidden, the page holds neither the file nor a private word; after the background, reopening shows the file at rest with no animation running. It does not measure readability, contrast in compositing, touch accuracy or motion comfort.
- Since slice 2, `check:abilities` also holds: a wrong Scan's printout carries nothing of the Code; a Scan result is said in the release's words; the Hacker's file neither reorders nor filters the results; the Alien's Code is sorted by seat before it is drawn and is never an ordered list; the Code card is filled in seat order; no pick of a set is numbered on the board; the strip names a set's picks in seat order. `capture:abilities` measures the same in the page, and that the scanner sweeps only while a Scan is on its way, never in reduced motion.
- The board flows press the file's own controls: inspect, Escape, the background, an explicit reopen, a stale view and Card while stale; and, since slice 2, a live Scan whose result is printed once in the Hacker's file and not again when the card is opened again.
- Since slice 3, `check:abilities` also holds: the Rescues, the slips and their heading in the release's words, found in `en.ts` and `comic-shell.ts`; Supply's tags and a Supplier's slip in seat order; a recipient's slip saying no more than the release; nothing in `tools.js` named for a role or a team, or speaking of a recovery or a hit; the Disable's strip independent of the role; a vial emptied only by a fall of the view's count; no role's device drawn by the ability styles. `capture:abilities` measures the vials against the count, a Rescue's receipt free of any recovery, the cell spent exactly on the receipt, the tags in seat order and tied exactly on the receipt, every slip's words and tags, the Blue and the Red strips identical, a card with notes unscrolled at the default size and its words grown at large text. The flows add the journeys above.
- Since slice 4, `check:abilities` also holds: the weapons and every Protection in the release's words, found in `en.ts`, the seat's own as "yourself"; the notes in the view's order, never reordered or filtered; nothing in `guard.js` named for a role or a team, working out whether a Protection is active, or speaking of an attack, a hit or a block; the notes drawn from `knowledge.protections`, never the role; the weapons note for every count the view says; the shot's strip drawn from its target and the view's count alone, its target in the reticle; a round spent only by a fall of the view's count and drawn spent only on an accepted shot; a Protection's grant and use changing nothing public. `capture:abilities` measures the rounds against the count, a spent round only on a shot's receipt, the reticle and the shield only for their actions, a shot's strip that says nothing of who shoots and the Officer's, the Undercover's and an Alien's strips identical, every Protection note's words and shield, the weapons note's words and rounds, a card with notes unscrolled at the default size and its words grown at large text. The flows add the journeys above.
- Since slice 5, `check:abilities` also holds: a Hack's note in the release's words, found in `en.ts`, saying nothing of who asked; nothing in `ballot.js` named for a role or a team, speaking of truth or lies, or drawing a count or another ballot; a ballot drawn from the seat's own choice and the vote's subject alone, posted only once accepted; the microphone handed on only once Pass is accepted; the beats only on their receipts; a Hack's note from the view's partner alone, its cord run once a Hack. `capture:abilities` measures a slip against the pick, the subject or nobody, its pencil against the answer, the box posted exactly on the receipt, no count in a ballot's strip, the key and comms rings only on their actions, the microphone handed on exactly on its receipt, a Hack's note's words and chips, and the two partners' notes identical. The flows add the journeys above.
- Since slice 6, `check:abilities` also holds: nothing in `finale.js` named for a role or a team, or speaking of a hit or of the end; the showdown's strip independent of who shoots, its target in the shot's reticle; the special shot drawn spent only on its receipt and spent by its beat only then; the result sheet drawn from the public view alone, with nothing private and nothing of the ability kit. `capture:abilities` measures the special shot only in the showdown's strip and spent exactly on its receipt, a showdown strip that says nothing of who shoots, no ability art in the result sheet and no role before a finished match. The board's check and capture keep the result and the end reveal to a finished match, an end hook to the result sheet, and a role word or an end hook off every other surface. The flows add the journeys above.
- Since slice 7, `check:abilities` also holds: every tray kind has its mark, drawn only behind its art, the Shot the reviewed icon, and nothing of a role in any mark; the chips carry their kind; the card is shown on an out-of-date view only where asked; a held card is still and its file paused, its snapshots put back. `capture:abilities` measures each chip's mark against the art loaded, a glyph hidden under a drawn mark, the out-of-date mark only with the banner shown, a marked file that cannot be pressed, and the kept card's first view. The board's capture measures that the banner covers no open sheet's heading. The flows add the journeys above.
- Since slice 8, `check:abilities` also holds: the setup page's words are the release's, verbatim in `setup-controls.js` and `role-confirmation.js`; the turn's beats are the reviewed `cue-role-card-turn`'s; the role card is built only while turned up and emptied when hidden; the card back carries no role hook and is the kit's `setup-back`; a device is drawn only in the seat's own panel; a taken card's stamp is its taker's seat, from the public holders; a beat plays only for a change the page saw; the card turns only for the player's tap, and not in reduced motion; the system's reduced motion, switched on, settles the page at once; the page put away conceals the card and settles, and, put away for good, stops counting down and listening. `capture:abilities` measures every setup picture (`SETUP_MEASURE`), and `abilities-flows.mjs` walks the setup's journeys.
- None of it is a test of the production runtime, a real phone, a screen reader, or a match.

## Not run

- Any real phone, tablet or shared display; any screen reader or switch access; any touch input.
- The production game (`apps/game/`): nothing there draws the file yet.
- An owner review of the look and motion (DSN-D37).
- A match where the Rescue's count, the Disable or Supply's acknowledgments come from the engine: the prototype's server is a labeled stand-in that answers as its fixtures say.
