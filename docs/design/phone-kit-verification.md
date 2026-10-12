# Verification of the phone kit (issue #121)

Phone kit `phone-kit-0.1.0` (art `phone-kit-art-0.1.0`, room clothes `wardrobe-0.1.0`) · branch `claude/designer-phone-polish` ·
on the integration baseline `abb6839524b6dc3e5225e600f2f067c3fa3f9501` (`codex/v1-ability-art-release`) · ruleset
`in-person-v1-capacity-resolution-2026-10-12` · 12 October 2026 · handoff: [phone-kit-handoff.md](phone-kit-handoff.md)

Environment: a Claude Code cloud container on Linux 6.18; Node `22.21.1` and npm `10.9.4` (the pinned toolchain); for everything
that needs a browser, headless **Chromium 141.0.7390.37**, started through a wrapper given as `CHROME_PATH` that adds
`--no-sandbox` (the container runs as root). Dependencies installed with `npm ci` (888 packages) and the workspace built with
`npm run build` (exit 0).

**Every size, text size, safe area and motion setting below is a simulation in desktop Chromium** (device metrics override; a
default font size of 24 px and 32 px for 150 % and 200 % text; reduced motion from the prototype's switch and from the emulated
`prefers-reduced-motion`). **No phone, screen reader, touch screen or physical display was used; no measurement here is a device
measurement; and nothing here shows that a match works across phones** (the stand-in server and the observer pane are one page).

## Review correction (PR #127): what was run on `3784057ceb52c00ddc27e201b631f2769796525a`

The two review findings on `ca78625` (the Hack not concealed on a window blur; Hack feedback from an obsolete phase still
drawn) are corrected in `3784057ceb52c00ddc27e201b631f2769796525a`; [phone-kit-handoff.md](phone-kit-handoff.md) section 11 has the requirements.
Same environment and simulation limits as below. The record of the first run, on the content of `ca78625`, follows unchanged.

| Command | Actual result |
| --- | --- |
| The review's blur reproduction (`hack.claim-red`, `window.dispatchEvent(new FocusEvent('blur'))`, the document still `visible`), a scratch script on a clean checkout of each commit | **`ca78625`: reproduced**: after the blur the `#pk-hack` panel, "Player 5 claims Red" and its private live line were all still in the page. **`3784057`: fixed**: none of them is left |
| The review's phase reproduction (`HACK_RESULT` `phase-current`, feedback `phase-obsolete`) and three invalid feedbacks, through each commit's `hackModel` | **`ca78625`: reproduced**: all four drawn (the obsolete phase's claim of Red; another exchange's claim of Blue; `DECLARED` with `Purple` and with no side drawn as "No side declared"). **`3784057`: fixed**: all four refused |
| `npm test --workspace @mothership/design-tokens` | Passed: **219 of 219** (eight new in `phone-kit-hack.test.mjs`: current-phase binding for both participants and all three stages, the review's reproduction, an earlier phase of the same exchange, another exchange, missing ids, twelve invalid status/side or stage/status combinations never drawn as "No side declared", the participant checks, every Hack fixture bound and its out-of-order variants refused) |
| `node design/tools/phone-kit-check.mjs` | Passed: **7 of 7** (the Hack check now also refuses feedback from another phase, the exchange's earlier phase, without phase ids, a side that is not one of the three, `DECLARED` without a side, a side without `DECLARED`) |
| `node design/tools/phone-kit-assets.mjs --check` | Passed: `18 files match their sources`; the 17 pictures are byte for byte as at `ca78625`; the manifest changes only `hack.js`'s source hash |
| `node design/tools/phone-kit-flows.mjs` | Passed: **109 of 109**, three runs in a row on the committed code (52 new: window blur with the document visible, focus return, nothing scheduled bringing it back, mid-play blur through the server's next phase, an out-of-date view refusing the tap, feedback refused while concealed, an unsent side dropped, sending and unknown outcomes kept and never resent, reduced motion, disposal, the public board playing on and the background still settling it; and the phase binding: another exchange's feedback, the exchange's earlier phase's, the declaration window's in the claim's phase, an unsent side dropped on refused feedback, a sent declaration kept). All runs during the work, 14 in all: 12 passed whole. One, run while the design-token suite ran in parallel, failed two timing-based checks that predate this change (a duplicate snapshot's animation start times; a figure caught mid-walk). The first run failed one check whose name was not kept (its output was not saved; every check from the 40th on passed); of the 13 runs after it, only the loaded run above failed anything. A scratch probe showed this harness delivers a window blur only together with the page going hidden, so the new blur handling adds no concealment to its runs |
| `node design/tools/phone-kit-capture.mjs` | Passed: **124 pictures and 4 contact sheets, 0 with problems** (six new: the claim concealed by a blur at 320 x 568 and 390 x 844, a blur while the declaration is sent, reopened by the player's tap at both sizes and in reduced motion; each new one is also checked for any trace of the Hack after the blur, or for a settled claim after reopening) |
| `node design/tools/board-motion-capture.mjs`, `-check.mjs`, `-flows.mjs`, `-lifecycle-flows.mjs` | Passed: **333 captures and 5 contact sheets, 0 with problems**; **13 of 13 checks** (now also refusing Hack fixtures not bound to their phase); **366 of 366**; **52 of 52** |
| `node design/tools/board-motion-assets.mjs --check`, `board-motion-docs.mjs` | Passed: `11 files current`; the coverage page regenerated for the private cues' cancellation words (a window blur added) |
| `node design/tools/abilities-capture.mjs`, `abilities-check.mjs`, `abilities-assets.mjs --check`, `abilities-docs.mjs` | Passed: **235 pictures and 7 contact sheets, 0 with problems**; **12 of 12**; `51 files`; the inventory page unchanged |
| `node design/tools/check-assets.mjs`, `check-shell.mjs`, `v1-phone-check.mjs` | Passed: **15 of 15**; **0 failures** (54 page loads, 468 redraws; its rewritten report restored, as before); **7 of 7** |
| `git diff --check` | Clean |
| `npm run verify` (a clean worktree of `3784057`, `npm ci`, `npm run build`) | **exit 1 in 1790 s, at its last stage only**: `test:capacity` stopped at the balance runner's 600 000 ms child limit in its playouts, as on the untouched baseline in this container (below). Every stage before it passed: toolchain (Node 22.21.1, npm 10.9.4), workspace boundaries, source integrity, both typechecks, bootstrap 55/55, engine 253/253, backend 187/187, tooling 130/130, frontend 194/194 and 448/448, design 219/219, balance static 103/103, balance scenarios (516 passed, 33 reviewed blocked, 6 manual, zero errors), 508 baselines and 4490 controls with zero misses, 10 playouts in each of modes 7, 8 and 9 with zero mismatches, and the report gate at this clean candidate. CI on `3784057` ([run 38320619803](https://github.com/Amirkianfar66/GameN/actions/runs/38320619803)) stopped at the same limit after the same stages passed: its runner was slower than `ca78625`'s, where the same gate finished in 502 s. The gate reads nothing this branch changes (`rules/`, `tests/scenarios/capacity/`, `tools/balance/`, the built engine, `scripts/`); its limit is Integration's (`scripts/test-capacity.mjs` line 124 calls `runBalanceProcess` without one); the proposed patch is in the pull request |

Re-captured pictures that differ from `ca78625`'s (36, and the 7 contact sheets that show them; 6 pictures are new) are frames taken while an animation runs (the storyboards, 40 ms reduced-motion fades, the ability files' assemble and inspect sweeps and the pinned photos' settle): their content is the same and only the sampled moment differs; every picture taken at rest is byte for byte as before. Not re-run for the correction: `check-layout.mjs` and `v1-phone-flows.mjs` (pages this branch does not touch; their earlier results, the same as on the baseline in this container, are below).

## What was run

Run in this branch's worktree on the content of the commits that add the kit (base `abb6839`), with the tools run directly with
`node`; each has an `npm run … --workspace @mothership/design-tokens` script ([design/phone-kit/README.md](../../design/phone-kit/README.md)).
The board-motion page and the ability-art captures draw the kit now, so their own checks and captures were run again too.

| Command | Actual result |
| --- | --- |
| `node design/tools/phone-kit-assets.mjs --check` (`assets:phone-kit`) | Passed: `18 files match their sources` (17 pictures and the manifest) |
| `node design/tools/phone-kit-capture.mjs` (`capture:phone-kit`) | Passed: **118 pictures and 4 contact sheets, 0 with problems**: the shell before (`?kit=0`) and after at 320 x 568 and 390 x 844, targeting, confirmation, a room-tag move, long names, seven in a room, the tray, simulated safe areas at both sizes, 150 % and 200 % text; every vote outcome at both sizes, a late join, long names, 200 % text, 12 storyboard frames and 3 reduced-motion frames; five in the Hospital, five in the Jail, the waiting released player, the three wardrobe sheets; all 21 Hack states at 320 x 568, 12 at 390 x 844, a move open beside the panel at both sizes, 200 % text, 6 claim frames, 2 reduced-motion frames; three pairs of a phone beside the other screens. Every phone requested the same files. Notes, not failures: the board's name plates are shortened with twelve-character names (as at the baseline), and at 200 % text on 320 x 568 the Hack panel scrolls inside itself (331 > 257 px) |
| `node design/tools/phone-kit-check.mjs` (`check:phone-kit`) | Passed: **7 of 7 checks** (exports; clothes by location only and the crew suit byte for byte for 9 characters in every gesture and both layers; the Hack's privacy and uniformity; the result's aggregate and release words; styles and motion; the frozen drawing ports; captures) |
| `node design/tools/phone-kit-flows.mjs` (`flows:phone-kit`) | Passed: **57 of 57** |
| `node design/tools/board-motion-capture.mjs` (`capture:board-motion`) | Passed: **333 captures and 5 contact sheets, 0 with problems** (163 scenarios) |
| `node design/tools/board-motion-check.mjs` (`check:board-motion`) | Passed: **13 of 13 checks**, over 14 actions, 22 cues and 163 scenarios |
| `node design/tools/board-motion-flows.mjs` (`flows:board-motion`) | Passed: **366 of 366** |
| `node design/tools/board-motion-lifecycle-flows.mjs` | Passed: **52 of 52** |
| `node design/tools/board-motion-assets.mjs --check`, `board-motion-docs.mjs` | Passed: `11 files current`; the coverage page is unchanged |
| `node design/tools/abilities-capture.mjs` (`capture:abilities`) | Passed: **235 pictures and 7 contact sheets, 0 with problems** |
| `node design/tools/abilities-check.mjs` (`check:abilities`) | Passed: **12 of 12 checks**, over 49 assets and 24 treatments (22 delivered) |
| `node design/tools/abilities-assets.mjs --check`, `abilities-docs.mjs` | Passed: `51 files`; the inventory page is unchanged |
| `node design/tools/check-assets.mjs` (`check:assets`) | Passed: **15 of 15 checks** |
| `node design/tools/check-shell.mjs` (`check:shell`) | Passed: **0 failures** (54 page loads, 468 redraws). Its report file was rewritten by the run in this environment and was restored to the committed one (it records another browser) |
| `node design/tools/v1-phone-check.mjs` (`check:v1-phone`) | Passed: **7 of 7 checks** |
| `npm test --workspace @mothership/design-tokens` | Passed: **211 of 211** (five new offer-guard tests for the declaration and the prelude's move; the "as committed" check tests copy the kit into their scratch trees) |
| `git diff --check` | Clean |

**Failing in this environment, and the same on the baseline.** These pages are not changed by this branch:

- `node design/tools/check-layout.mjs` (`check:layout`, the hand-built shell copy of `design/prototypes/`): **9 failures** at 320, 360 and 600 px wide with 32 px default text (text drawn past the side). Its inputs hash is the committed report's; the committed report (0 failures) was made in Chrome 155, this run in Chromium 141. The same 9 failures on a clean worktree of `abb6839` in this container. The report file it rewrote was restored.
- `node design/tools/v1-phone-flows.mjs` (`flows:v1-phone`, the issue #76 prototype): stops on a timeout ("revealed again") after 22 passing steps; the same three times out of three on a clean worktree of `abb6839` in this container.

## What this run caught, and what was changed

- **The claim and the vote result never faded in.** The exit animation of each panel was filled backwards, so for the whole
  five seconds it held the panel at its exit's first frame over the entrance. Caught by the 0 ms storyboard frame; exits now take
  effect only once they start (`fill: 'forwards'`), in the full and the reduced-motion forms.
- **Two panels on a 320 x 568 phone did not fit.** The claim with a move confirmation open pushed the Hospital and the Jail off the
  board. The Hack panel now keeps one line while another command is open (one command at a time), and a declaration in progress
  blocks a room-tag move and the other way round.
- **At 150 % and 200 % text the kit's words stayed in pixels** (the timer, the room tags, the Hack panel, the result), and the tag's
  arrow came back where the board hides it. Under the board's own large-text query they now follow the reader's text size; the
  Hack panel and the result may scroll inside themselves there, never clip.
- **The vote result was drawn only on the acting phone.** It is public: the other screens now draw the same panel at the same
  moment.
- **The other screens were hidden in the pair captures** (the page hides them below 900 px); the pairs are now taken at 1440 px and
  cropped, and the capture refuses a pair without them.
- **The outfit was written into the figure's drawn key**, which the board's lifecycle checks read as a different pose; the key keeps
  `board.js`'s meaning and the outfit is tracked apart.
- **"Alien" was cut on a 320 px phone's side button** and **the claim balloon's art did not fit its words**; the side buttons
  tighten on a narrow panel, and the balloon is now the page's box with a drawn tail.
- **The release's word check would have failed** on the new phase names; they are listed as proposed words (`PROPOSED.phaseKind`).
- **The existing checks did not know the new facts**: the board-motion check now refuses `hackFeedback` or a declared side in a
  public state, and a public event carrying a side, a claim or a partner; the offer guard checks the self-only declaration offer
  and keeps the prelude's move (five new tests); the board-motion flows count the Hack panel as private; and the captures' freshness
  hashes now include the kit and the clothes.

## What was not run, and limits

- No device, screen reader or touch input. Focus moves were checked by the flows (the declaration's heading, the tray chip), not
  with assistive technology.
- Nothing ran against Backend's code: the Hack and vote-result inputs are labeled fixtures in the shape of the proposal at
  `bd4d77c`. Frontend's review cites a Hack schema at `ba1842f`, which is not on the remote and was not read.
- The owner's reference picture was not available in this environment, so nothing was compared with it.
- `npm run verify` on `2a447e1f9de3f325ccd0ffc775f9c9e4741198d3` with the working tree clean before and after: **exit 1 in 1795 s, on
  one stage only.** Every stage before it passed: toolchain (Node 22.21.1, npm 10.9.4), workspace boundaries, source integrity,
  both typechecks, bootstrap 55/55, engine 253/253, backend 187/187, tooling 130/130, frontend 194/194 and 448/448, design 211/211,
  balance static 103/103, balance scenarios (516 passed, 33 reviewed blocked, 6 manual, zero errors), 508 baselines and 4490
  controls with zero misses, 10 playouts in each of modes 7, 8 and 9 with zero mismatches, and the report gate at this clean
  candidate. The last stage, `test:capacity`, stopped at the balance runner's 600 000 ms child limit (`scripts/test-balance.mjs`)
  in its 600 capacity playouts, after modes 7 and 8 had finished with zero invariant, hint and replay mismatches.
  - **The same on the baseline:** `npm run test:capacity` alone on a clean worktree of `abb6839` in this container: exit 1 in 617 s,
    the same 600 000 ms limit. The gate reads only the rules overlays, the capacity scenarios, the balance audit, the built engine
    and the balance tools, none of which this branch changes.
  - **The gate itself passes on this branch given time:** the same steps, pins, commands and assertions run from a scratch script
    outside the repository with the runner's own maximum child limit (1 200 000 ms, the limit it gives its controls stage): 107
    capacity scenarios passed, 15 explicit manual; 600 playouts completed without invariant, hint or replay failures; the
    playouts took 755 s. Nothing in the repository's gate or its limit was changed.
