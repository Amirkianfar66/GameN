# Verification of the ability art

Ability art `abilities-0.1.0`, slice 1: the Insider's file and the hidden card · branch `claude/designer-ability-art` · built on the board-motion prototype at `08409392d1040f20d559a9f36a2a1d9bb23468c4` (branch `codex/designer-board-motion`, [PR #88](https://github.com/Amirkianfar66/GameN/pull/88), **not merged**) · ruleset `in-person-v1-pass-2026-10-08` · 11 October 2026

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

## What the checks assert, and what they do not

- `check:abilities` (no browser): the kit is exactly what its recipes make from `source/dossier.svg`, in the drawing vocabulary and the neutral palette (no team, room or crew color), versioned, anchored and with its rights; the inventory names a treatment for every V1 role and every shared moment, each with five motion forms, and reads only view fields the approved contracts carry; the Insider's file sorts the candidates by seat before drawing them, draws each candidate with nothing of a role, keeps the role names one picture with one accessible name and never a list, swings the query tags together, colors only with tokens, draws art only behind loaded bundles, styles no candidate apart and draws its board cue on the own board only; the prototype loads the kit whatever the role, its hidden card holds nothing private, no production file refers to the prototype, every file carries the development-only mark; the review pictures were taken from the current art, pages and fixtures and measured clean; the inventory page is generated from the contract. Statically: it reads source text, so it proves what the code says, not what a browser draws.
- `capture:abilities` (browser): in every picture, in the page, the three snapshots are in seat order, built and sized alike, each shows its seat number, none names a role or points at the role names, the role names are one group below the three, nothing scrolls sideways, nothing scrolls at the default text size (the inspect card included), every control is at least 44 px, a name is cut only with an ellipsis and said whole by its button, and never cut at large text; while the card is hidden, the page holds neither the file nor a private word; after the background, reopening shows the file at rest with no animation running. It does not measure readability, contrast in compositing, touch accuracy or motion comfort.
- The board flows press the file's own controls: inspect, Escape, the background, an explicit reopen, a stale view and Card while stale.
- None of it is a test of the production runtime, a real phone, a screen reader, or a match.

## Not run

- Any real phone, tablet or shared display; any screen reader or switch access; any touch input.
- The production game (`apps/game/`): nothing there draws the file yet.
- An owner review of the look and motion (DSN-D37).
