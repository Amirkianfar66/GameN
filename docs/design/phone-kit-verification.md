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
- `npm run verify`: run on the committed tree after these commits; its result is recorded below once it has run.
