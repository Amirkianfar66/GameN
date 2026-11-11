# The pack beside the build

**A tool that sets the phone pack beside Frontend's native interface, part by part, for Designer's visual acceptance of a phone-interface pull request.** On 11 November 2026 the owner decided that the pack is the specification for the phone interface, and that such a pull request merges after Designer's visual acceptance ([owner-decisions.md](owner-decisions.md)). The gate itself is Integration's to add. This tool makes the side-by-side that acceptance is given from.

| | |
| --- | --- |
| The tool | [`design/tools/phone-ui-native-compare.mjs`](../../design/tools/phone-ui-native-compare.mjs) |
| The parts | [`design/tools/lib/phone-ui-native-parts.mjs`](../../design/tools/lib/phone-ui-native-parts.mjs): 49 parts of a match, from the menu to the end, in eight stages |
| Its test | [`packages/design-tokens/test/phone-ui-native-compare.test.mjs`](../../packages/design-tokens/test/phone-ui-native-compare.test.mjs), in `npm run test:design`. It checks the parts and the page without a browser |

## What it draws

Each part names a state twice:
- **The pack:** its address in the pack's prototype (`design/phone-ui/prototype/index.html?…`), as the sheets and the clickable export name it.
- **The build:** the scenario in Frontend's review harness (`apps/game/dev/phone`) and the taps that reach the state. The harness runs the native interface's own code with sample matches.

Both sides are drawn at the same phone size and text size: 390 × 844 unless the part says otherwise, or at the size `--view` gives for the whole run. The part for the smallest phone uses 320 × 568 with 200 % text. Everything is drawn at 1.5× pixels.

Each part also carries Designer's finding of 11 November 2026 (same, close or differs, and why). That is the baseline the next review is read against. It is a record, not a rule.

It writes into the output folder:

| File | What it is |
| --- | --- |
| `index.html` | The pairs, stage by stage, each with its finding and how both sides were drawn. One file, with its pictures beside it; nothing is loaded from elsewhere |
| `compare.json` | What was drawn, from which commits (the pack's, and the harness's own `review-provenance.json`), and every problem met: a page error, a failed request, a tap that found nothing |
| `img/<part>-pack.jpg`, `img/<part>-build.jpg` | The two pictures of each part |
| `stages/NN-<stage>.jpg` | With `--stage-sheets`: one picture per stage, for a pull request or `docs/design/evidence/` |

## How to run it

1. **Build Frontend's harness** from the commit under review, with its own Vite config. The harness serves its art from a clean worktree of the frozen `fb33cecb` release:

   ```
   git worktree add --detach <art folder> fb33cecbf4b0fc2bef5d107e79ae2aac0ed7be70
   npm ci && npm run build
   GAMEN_PHONE_ART_BASE=<art folder> node node_modules/vite/bin/vite.js build --config apps/game/dev/phone/vite.config.mjs
   ```

   It writes `/private/tmp/gamen-phone-preview`, the config's own output folder.
2. **Run the comparison** from this repository, with a Chromium-based browser:

   ```
   CHROME_PATH=<chromium> node design/tools/phone-ui-native-compare.mjs --build /private/tmp/gamen-phone-preview --out <folder outside the repository> --stage-sheets
   ```

   | Option | What it does |
   | --- | --- |
   | `--list` | Lists the parts: id, stage, sheet, the last finding, title |
   | `--only menu,room-b` | Draws only these parts |
   | `--stage votes` | Draws one stage |
   | `--view 320x568@2` | Draws every selected part at that phone size and text size, on both sides: `320x568`, `390x844`, `430x932` or `390x664`, then `@1`, `@1.5` or `@2`. The findings shown stay the ones made at each part's own size |
   | `--findings <file>` | Shows a later review's findings beside the 11 November ones |
   | `--count 7` | Seven, eight or nine players in the harness's matches (nine by default) |

3. **Open `index.html`** from the output folder.

It ends with an error when a part could not be drawn, and the page says which and why. For a tap that found nothing, `compare.json` lists the controls that were on the screen.

## On a pull request

1. Frontend's pull request says which parts it changes, by their ids from `--list`.
2. Designer builds the harness from the pull request's head and draws those parts with `--only`. For every part that carries text, Designer draws them again into another folder with `--view 320x568@2`, as the merge gate asks.
3. Designer answers in the pull request: accepted, or what still differs, part by part. The answer goes in a findings file, so the next run shows it:

   ```json
   { "date": "2026-11-20", "parts": { "room-b": { "verdict": "close", "note": "Fills the space; the Windows control is still missing." } } }
   ```

   A verdict is `same`, `close` or `differs`.
4. Pictures that belong in the repository go to `docs/design/evidence/` with the review they support.

## Limits

- **The harness build at `main`.** On 11 November 2026, at `main` (`d574d371`), it stops with "Asset review tooling differs from frozen release: scripts/pregame-consumer-approval.mjs". The harness checks that its asset tooling matches the frozen `fb33cecb` release, and one script has changed since. The harness is Frontend's to update. Until then it builds at `d1a03c87`, Frontend's last native commit before `main`.
- **What the harness can't reach:**
  - It has no boarding state. That part draws the pack's side only; the build's picture comes with the pull request.
  - It has no host in a match. That part makes the harness's viewer the host, through its own `replace` hook.
- **The data differ.** The harness's sample matches are not the pack's fixtures: "Crew 6" against "Ava", other rooms and other rounds. A pair compares layout, controls and words, not the data.
- **It does not judge.** Same, close and differs are Designer's findings, not measurements.
- **Desktop Chromium only.** No phone, Safari, VoiceOver, frame rate, motion or live match. The ambient motion (DSN-REQ-23) is drawn still on the pack's side, and the build has none yet.

## The run that checked it

On 11 November 2026 it ran as follows:
- The pack: `main` at `d574d371`.
- The harness: built at `d1a03c87` with the `fb33cecb` art.
- The browser: Chrome for Testing 153.

All 49 parts were drawn, with the stage sheets, in about four minutes.
- The first run found no host controls in the harness's match. The host-controls part now makes the viewer the host first.
- The run also showed that one of the 11 November findings came from an older capture. At `d1a03c87`, the top bar at the Largest text no longer has a three-line subtitle. The part's finding says what still differs.
