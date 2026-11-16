# End scene: Designer's runtime component

**Version:** `end-scene-0.1.1`. **Status (16 November 2026):** `0.1.0` was built to the interface agreed on #271 and accepted there by the Lead Designer. `0.1.1` adds what larger text needs, as the Lead decided on 16 November, and the Lead accepted it on #271 at `2f833cd8`. It is not in the game yet. Integration first admits its module graph to the hosted build, including `arrival-art.mjs`, a new runtime derivative of approved drawing (see Art). It is not a release.

## What changed in 0.1.1

Two things, both for larger text. Neither changes the scene at the Standard text: the 52 captures and the 16 comparison and beats pictures are the same files as `0.1.0`'s, byte for byte.

- **The title block stops growing at a 20 px root** (125 % of the Standard 16 px). Up to there it grows as the pack's does; from there on the stamp, the title and the line hold at 27.5, 40 and 18.75 px. See Larger text.
- **`scene.layout()`** says where the title block ends, so the screen can start the Roles list under it.

**What it is:** the top of sheet 44, the end of a match (#222 item 8). It shows the planet, the ship on its landing beam and the "RED WINS" stamp, then the title and the round. When no one wins, it shows "NO WINNER" on the dark field. Today the game shows a text list on glass, and "Match aborted · No winner" as text.

The game imports the component as it is, and the preview mounts the same files. It follows the owner's decisions of 14 and 15 November 2026 ([ownership](../../architecture/visual-component-ownership.md)): Designer builds the visual component once; Frontend connects the phase, the clock, the result and the lifecycle, and does not rebuild, restyle or copy it.

**The split with sheet 44's screen:**

| Part | Whose |
| --- | --- |
| The hero picture (the pack's `.end-hero`) | This scene |
| The stamp, the title and the line under it (the pack's `.end-title`) | This scene |
| The Roles list, with portraits and role chips (`.end-list`, from `endReveal`) | The Gameplay UI builder, who places this scene in the screen |
| "Return to lobby" | The Gameplay UI builder |

Each places nothing of the other's. The preview marks the list's place with a labelled stand-in.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/`:

| Path | What |
| --- | --- |
| `end-scene/end-scene.mjs` | `mountEndScene()`, `nextEndSceneInput()`, `endSceneFrame()` (the scene as a pure function of time), `endSceneFraming()`, `endWords()`, `arrivalTime()`, `arrivalLayers()`, `END_SCENE_DEFAULTS`, `END_SCENE_VERSION`, `END_BEATS`, `END_WORDS`, `REDUCED_FADE_MS` |
| `end-scene/end-scene.css` | Starts with `@import url("../kit/kit.css");`; every rule of its own is under `.ms-end-scene` |
| `end-scene/arrival-art.mjs` | The approved arrival's drawing, ported unchanged (see Art). It uses `../ship-travel/ship-art.mjs` for the ship, stars and effects; that file stays planet-free |
| `kit/kit.mjs`, `kit/kit.css`, `icons.mjs` | Used unchanged: the kit's stamp |
| `end-scene/preview/` | Development only. `index.html` and `preview.mjs`: the scene in the phone shell's stage (no bar, no tabs, edge to edge), on a synthetic end phase and clock, with the stand-in in the cover. `probe.mjs`: the lifecycle probe. `compare.mjs`: the comparisons with the approved posters and the pack's end screen |
| `end-scene/review/` | The check's captures, comparisons, beats strips and `check.json` |

It loads no picture or video: the scene is drawn from code, so it has no art-loading failure state. It imports nothing from `prototype/`, `preview/` or fixtures. Its one package import is the game's `@mothership/contracts`, through the kit's `crew-runtime.mjs`. It depends on neither the room scene nor the shell, and from the ship travel only on its drawing.

## Mount, update and dispose

```js
import { mountEndScene } from '…/design/phone-ui/components/end-scene/end-scene.mjs';
import '…/design/phone-ui/components/end-scene/end-scene.css';

// The shell: no top bar, no tabs, and the stage edge to edge, as the pack draws sheet 44.
shell.update({ bar: null, tabs: null, edge: true });
const layout = shell.layout();
const scene = mountEndScene(shell.stage, {
  window: { id: phase.id, startedAt: phase.startedAt }, // the published FINISHED or ABORTED phase
  clock,                                               // { now() }: the match's trusted server time
  result: view.result,                                 // { winner, reason, alienCoWinner }: public, as the contract has it
  round: view.round,
  size: layout.stage,                                  // edge to edge: the whole phone
  safe: { top: layout.safe.top },                      // the title block sits at safe.top + 34 %
});
// Sheet 44's Roles list and "Return to lobby" go in shell.slot('cover'), over the scene.
// On the shell's onLayout(layout): scene.update({ size: layout.stage, safe: { top: layout.safe.top } }).
scene.update({ ...changes });  // each key given replaces that key; the rest stay
scene.suspend();               // backgrounded: stands still, asks for no frames
scene.resume();                // foregrounded: seeks to the clock; nothing is replayed
scene.frame();                 // a plain snapshot (below); null after dispose()
scene.layout();                // { titleBottom }: where the title block ends (below); null after dispose()
scene.dispose();               // removes the element and stops its frames; safe to call twice
```

- **The host is the shell's stage, edge to edge,** with `bar: null`, `tabs: null` and `edge: true`: the stage fills the whole phone. The scene's `size` is the whole phone.
- **The component** appends one child, `.ms-end-scene.ms-kit`, of exactly `size`. Its hero is the top half; below it, the scene is the plain canvas, where the cover lays the list from 58 %, or under the title block where larger text makes the block end lower (see Larger text).
- **It takes no taps** and has no controls. It reports nothing, so it has no callbacks and needs no control policy: `layout()` is read, never called back. "Return to lobby" is the screen's.
- **`layout()`** returns `{ titleBottom }`: where the title block ends, in CSS px from the scene's top, which is the stage's.
  - It is measured when it is asked for. Read it again after you change the size, the safe area or the game's text size.
  - It is the block at rest. The stamp's punch and the words' rise are transforms, so the answer is the same before the stamp lands, while the words rise and in the still.
  - `titleBottom` is `null` while no title block is drawn: concealed, or no result yet.
  - Under a scaled ancestor (a phone drawn smaller on a page) the answer is still in the scene's own CSS px.
- **To assistive technology** it is one image (`role="img"`) whose text alternative is its words, for example "Red wins. Red reached Red Planet. Round 6." The screen's own heading, if it has one, is the screen's.
- **`frame()`** returns:

  ```js
  { window, t, kind, side, beat, tau, still, running, status, reduced, shown }
  ```

  - `t`: the scene time drawn, in ms.
  - `kind`: `'arrival'`, `'none'` (no winner) or `'empty'` (no result yet).
  - `side`: the arrival's planet, `'Blue'` or `'Red'`; `null` otherwise.
  - `beat`: `'film'`, `'settle'` or `'still'` for an arrival; `'field'` or `'still'` for no winner.
  - `tau`: the arrival film's own time drawn, in ms; `null` without an arrival.
  - `still`: whether the still is showing. `running`: whether a frame loop runs. `reduced`: the game's or the device's Reduce motion. `shown`: false while concealed.

## Inputs

**Every input is public, or this phone's own setting.** The scene receives only what the server publishes to everyone at the end: the public view's `result`, the `round`, and the end phase's id and start. It receives no seat, name, role, team, code or `endReveal`: those are the Roles list's. `nextEndSceneInput()` refuses any key it does not know, inside `window`, `result`, `size` and `safe` too, and refuses a result the contract refuses (`PlanetResultSchema`: a winner only on a planet arrival, and the Alien only beside a winner). It keeps frozen copies of what it is given.

| Input | Audience | Default | What |
| --- | --- | --- | --- |
| `window` | Public | `null` | `{ id, startedAt }`: the published `FINISHED` or `ABORTED` phase, in server milliseconds. A new `id` is a new scene |
| `clock` | Public | `null` | `{ now() }`: the match's trusted server time. `null`: the still |
| `result` | Public | `null` | `{ winner, reason, alienCoWinner }`: the view's `result`. `null`: the dark field with no words |
| `round` | Public | `null` | The match's round, for "Round 6". `null`: no line where the line is the round |
| `size` | Phone | 390 × 844 | `{ width, height }`: the whole phone, the shell's stage edge to edge |
| `safe` | Phone | `{ top: 0 }` | `{ top }`: the phone's top safe area in CSS px, the shell's `layout().safe.top`. The scene reads no `env()` of its own |
| `status` | Phone | `'live'` | `'live'`, `'stale'` (reconnecting) or `'concealed'` |
| `reducedMotion` | Phone | `false` | The game's Reduce motion, shown as `data-motion="reduced"` on the root. The device's `prefers-reduced-motion` is honoured as well |

## The words (the pack's `end` screen)

| `result` | Stamp (the kit's) | Title | Line |
| --- | --- | --- | --- |
| `winner: 'Blue'`, `reason: 'ARRIVAL'` | "BLUE WINS", gold | "Blue reached Blue Planet" | "Round n" |
| `winner: 'Red'`, `reason: 'ARRIVAL'` | "RED WINS", gold | "Red reached Red Planet" | "Round n" |
| … and `alienCoWinner: true` | "BLUE WINS · ALIEN TOO" ("RED WINS · ALIEN TOO"), gold | as above | "The Alien survived and used Blackhole" |
| `reason: 'NO_SURVIVORS'` | "NO WINNER", plain | "No survivors" | "Round n" |
| `reason: 'ABORTED'` | "NO WINNER", plain | "Match aborted" | "The host ended the match" |

The title is set in capitals, as sheet 44 draws it. The pack draws Blue with the Alien; **Red with the Alien is composed** from the same words and the Red arrival, and recorded as composed.

## Time: the scene seeks inside the server's time

- **Scene time:** `t = max(0, clock.now() − window.startedAt)`, read on every animation frame. Past the scene's length, it holds its still.
- **Late phones:** a phone that opens or reconnects late sees the moment the clock gives, with nothing replayed. A phone that opens after the end sees the still and asks for no frames.
- **The scene never advances the game.** It has no "ended" callback and no skip.

**The beats** (approved by the Lead on #271):

| t | Arrival (`reason: 'ARRIVAL'`) | No winner |
| --- | --- | --- |
| 0–3.7 s | `film`: the approved arrival film at its own pace. The space opens, the planet comes close and turns, the ship glides in, descends, and its landing beam opens | `field`: the dark field (the pack's) |
| 0.3 s | — | The stamp lands: an ink stamp's punch, 240 ms |
| 3.6 s | The stamp lands: an ink stamp's punch, 240 ms (from 1.8 times its size to 0.94 at 160 ms, at rest at 240 ms) | — |
| 3.7–4.5 s | `settle`: the film's clock slows evenly to a stop on the approved poster's frame (the film's 4.1 s) | — |
| 3.9–4.3 s | The title and the line rise 8 px and fade in | 0.6–1.0 s |
| From 4.5 s / 1.0 s | `still`: the poster's frame, the stamp and the words | `still` |

- **The film's clock** (`tau`) is the arrival's own time, 1:1 to 3.7 s; then `τ = 3700 + 800 (u − u²/2)` with `u = (t − 3.7 s) / 0.8 s`, which reads the poster's 4100 ms exactly at 4.5 s. The approved film's last 100 ms are never shown.
- **The punch is on a wrapper** (`.ms-es-stamp`), never on the kit's stamp, which keeps its own `rotate(-4deg)`. At rest nothing is set inline: the title block lies exactly as the pack lays it.

Reduce motion, the game's or the device's: the still, with one 80 ms fade.

## States

| State | What shows |
| --- | --- |
| Arrival, Blue or Red | The approved arrival film, then the still: the poster's frame, as a cover over the top half, fading to the canvas; the gold stamp and the words |
| No survivors, aborted | The dark field (the pack's radial gradient), the plain stamp and the words. No planet is drawn or kept, even hidden |
| Reduce motion (the game's or the device's) | The still, with one 80 ms fade when it first shows for a phase and result. No frames run |
| No clock, or no phase | The still, the same on every phone |
| No result | The dark field, with no words. Its text alternative is "Match over." A result that arrives later shows the clock's moment |
| Stale (reconnecting) | Stands still where it was. The reconnecting banner is the shell's. Live again, it seeks to the clock |
| Concealed | A plain cover: nothing drawn or named (the name is "Hidden"), and no frames run. Shown again, it seeks to the clock |
| Suspended | Stands still and asks for no frames until `resume()` |

## Larger text

The game's text size is its root's size: Standard (100 %), Large (150 %) and Largest (200 %). The pack writes the title block in rem, so on the pack's own end screen the block grows with it and runs down over the Roles list: at 200 % on 390 × 844 the pack's Red block ends at 718.7 px, and its list starts at 489.5 px (58 %). The larger-text sheet (56) draws no sheet 44 frame, so no sheet draws this state. The Lead Designer decided it on 16 November 2026, as a fix for larger text and not a departure from a sheet.

- **The rule:** the block's words grow with the root as the pack's do, up to a 20 px root, and hold there.

  | Part | The pack's size | Holds at |
  | --- | --- | --- |
  | The stamp | 1.375 rem | 27.5 px |
  | The title | 2 rem | 40 px |
  | The line | 0.9375 rem | 18.75 px |

  - So at the Standard text the block is the pack's, and at Large and at 200 % it is the pack's block at a 20 px root. The capture at 200 % is the capture at 150 %, pixel for pixel.
  - The cap is a size, not a share of the browser's own default: on a browser whose default is not 16 px, the block still stops at these sizes.
  - A browser without `min()` keeps the pack's sizes, uncapped: each rule gives the pack's size first.
- **Where the block ends** (`layout().titleBottom`, CSS px from the stage's top, with the pack's review frames' 47 px top safe area):

  | Result | 390 × 844, Standard | 390 × 844, Large and 200 % | 430 × 932, Standard | 430 × 932, Large and 200 % |
  | --- | --- | --- | --- | --- |
  | Blue, Red | 475.64 | 502.83 | 505.56 | 532.75 |
  | Blue or Red with the Alien | 475.64 | 530.33 | 505.56 | 532.75 |
  | No survivors | 442.05 | 460.83 | 471.97 | 490.75 |
  | Aborted | 442.05 | 502.83 | 471.97 | 490.75 |

  The height moves in steps, as lines wrap. The tallest is the Alien result on 390 × 844, where the stamp takes two lines.
- **The list's rule, which is the screen's:** the Roles list starts at `max(58 %, titleBottom + 13 px)`. At the Standard text that is the pack's 58 % on both phones (the pack's own gap is 13.88 px at its tightest). The preview's stand-in follows the same rule.
- **Why 20 px, and not the Large size itself:** the list must keep room for its label and two rows at 200 %. With the Gameplay UI builder's measures (a row 51 px, a wrapped row 87 px, the label 38 px, the list ending at 728 px on 390 × 844):

  | The block holds at | The Alien result ends at | The list starts at | Room for the list | Needed: the label and two rows; one row wrapped |
  | --- | --- | --- | --- | --- |
  | A 20 px root (125 %) | 530.33 | 543.33 | 184.7 px | 140 px; 176 px |
  | A 22 px root (137.5 %) | 573.45 | 586.45 | 141.6 px | 140 px; 176 px |
  | A 24 px root (150 %, Large) | 642.63 | 655.63 | 72.4 px | 140 px; 176 px |

  Every other case at a 20 px root leaves 212 px or more. So "the pack's own sizes" holds up to 125 %, not up to Large: at Large the block is smaller than the pack would draw it, and the list has its room.

## Lifecycle guarantees

- `dispose()` is safe to call twice. After it, `update()`, `suspend()` and `resume()` do nothing, and `frame()` and `layout()` return `null`.
- At most one animation-frame loop runs per mount. It runs only while the scene is live, in motion, with a clock and a phase, not suspended, not concealed, and before the still.
- Each mount is independent, with its own SVG ids. A new match is a new mount.

## Art

The arrival is the approved arrival's drawing, ported unchanged into `arrival-art.mjs` (the Lead's review of #271):

- **Approved:** Integration approved `arrival-blue.mp4`, `arrival-red.mp4` and their posters on 6 November 2026 ([`docs/integration/planet-library-art-approval-2026-11-06.json`](../../integration/planet-library-art-approval-2026-11-06.json), "Blue/Red arrival"). The runtime preparation allows them "only after the matching authoritative terminal arrival", which `result.reason: 'ARRIVAL'` is.
- **Ported from:** `claude/designer-library-navigation` at `6b63560d990c50dd1d16e44e6f40f5b7b77b6b68`, whose files are the same git blobs as PR #184's approved head `0fb17a35c4b2fdd3418c9ffb575dbd4a7d0d9878`:
  - from `design/library/navigation/films.mjs`: `PLANETS`, `planetSvg`, `arrivalFrame` and `arrivalSvg`;
  - from `design/cinematic/lib/comic.mjs`: `lightCone`;
  - from `design/cinematic/lib/ease.mjs`: `easeInOutCubic`.
- **The rest** (the ship, stars, vignette, grain, letterbox and `FILM`) is `ship-art.mjs`'s, ported from the same commit for the ship travel.

Each function is its source's text, character for character. **At every moment the scene draws `arrivalSvg()`'s own frame:** `arrivalLayers()` splits that frame into its moving body (the space, and the stars, planet, beam and ship as they fade in) and its front (the filters, vignette, grain and letterbox, which never change), and gives each mount its own ids. Joined in `arrivalSvg()`'s order, the two are its frame. The still is the frame of the approved posters, `arrival-red.poster.webp` (`32f9127d…`) and `arrival-blue.poster.webp` (`4ca9e339…`): `arrivalSvg()` at 4100 ms of its 4200 ms, on its display surface, full variant, 1920 × 1080.

**For Integration:** the planets' hues appear only here, at an arrival, when the destination is public (`navigation.arrivedAt`, `result.winner`). `arrival-art.mjs` is a second new runtime drawing derivative of development sources, after the ship travel's `ship-art.mjs`. The drawing-port fence scans only `apps/` and `packages/presentation`, so Integration reviews it when it admits the component's graph. The approved videos are not used.

**Not used:** the library's `end.css` banners and emblems. They belong with the Roles list, if adopted.

## Not in this version yet

Listed, not omitted:

| What | Waiting on |
| --- | --- |
| The small phone (320 × 568) at the Large and Largest text: the arrival results' block reaches the Roles list's region | The screen's rule there, which is decided with end-roles (the Gameplay UI builder's Roles list) once it draws over the real scene. The scene is not changed for it until then |

**The small phone, measured.** 320 × 568 with a 20 px top safe area. The block starts at 213.11 px. On this phone 58 % is 329.4 px, and the list's region ends at 486 px (the Lead Designer's figures). The lines are the stamp's, the title's and the line's.

| Result | `titleBottom` at Standard (lines) | At Large and Largest (lines) | The list would start at: Standard; Large and Largest | Room to 486 px: Standard; Large and Largest |
| --- | --- | --- | --- | --- |
| Blue | 354.8 (1 + 2 + 1) | 465.98 (1 + 4 + 1) | 367.8; 478.98 | 118.2; 7.02 |
| Red | 354.8 (1 + 2 + 1) | 423.98 (1 + 3 + 1) | 367.8; 436.98 | 118.2; 49.02 |
| Blue with the Alien | 376.8 (2 + 2 + 1) | 517.86 (2 + 4 + 2) | 389.8; 530.86 | 96.2; none (44.86 px past) |
| Red with the Alien | 376.8 (2 + 2 + 1) | 475.86 (2 + 3 + 2) | 389.8; 488.86 | 96.2; none (2.86 px past) |
| No survivors | 321.2 (1 + 1 + 1) | 381.98 (1 + 2 + 1) | 334.2; 394.98 | 151.8; 91.02 |
| Aborted | 354.8 (1 + 2 + 1) | 381.98 (1 + 2 + 1) | 367.8; 394.98 | 118.2; 91.02 |

- **At the Large and Largest text an arrival leaves the list 7 px (Blue), 49 px (Red) or none (with the Alien).** "BLUE REACHED BLUE PLANET" takes four lines at 40 px on this phone's 288 px.
- **Even at the Standard text the block ends below this phone's 58 %** for every result but no survivors, so the list starts under the block there too.
- **No word is cut:** every line lies inside the phone, at each text size.
- **How it was measured:** with the scene's own preview at this size, at each text size. It is not one of the check's captures: the check runs at the two development sizes.

## Checks run on this version

- **`packages/design-tokens/test/end-scene.test.mjs`:** 10 of 10.
  - **The graph:** runtime-safe, with no development marker, no picture or video loaded, one package import, and from the ship travel only `ship-art.mjs`.
  - **The styles' scope:** every rule under `.ms-end-scene`, one keyframes of its own, no `--ms-k-` property, and the pack's `.end-hero` and `.end-title` values, rule for rule. Each of the title block's sizes is the pack's, followed by its cap at a 20 px root, and nothing else in the scene's styles is in rem.
  - **The port:**
    - each of the 5 functions has the SHA-256 of its source's text, and `PLANETS` its values;
    - `arrivalSvg()` at 4100 ms writes the source's poster frames byte for byte (Red `a1250b9f…`, Blue `dfb6446d…`);
    - the poster files are the ones Integration approved.
  - **The layers:** at ten moments for each side, the body and front joined in `arrivalSvg()`'s order are its frame; the front never changes; a mount's ids replace only ids and references.
  - **The beats:** the film's clock 1:1 to 3.7 s, then slowing to a stop on 4100 ms at 4.5 s; the stamp and the words on their beats; no winner's beats; pure.
  - **The framing:** the poster covers the hero, the top half, as the pack's `.end-hero` draws it.
  - **The words:** the pack's, for each result, and Red with the Alien composed from them.
  - **The inputs:** every unknown or private key is refused, at every level, and every result the contract refuses. The handle has `layout`, and the scene takes no handlers.
  - **The check's record**, last, with its larger-text part.
- **`node design/tools/end-scene-check.mjs`**, under the production headers (Content Security Policy and six others). The record is `end-scene/review/check.json`, against `f8b6a960`.
  - **Captures:** 52 of 52, thirteen states at 390 × 844 and 430 × 932, in full motion and with the device's Reduce motion: Blue, Red, Blue with the Alien, Red with the Alien (composed), no survivors, aborted, the film (1.5 s), the stamp landed (4.0 s), the game's Reduce motion, stale (2.6 s), concealed, no clock and no result. Each in the shell's stage edge to edge: the scene covers the whole phone, the hero is its top half, and the title block sits at the top safe area + 34 % (333.96 px at 390 × 844).
  - **Probe:** 46 of 46 checks.
    - **Full (42):** each moment as `arrivalSvg()` draws it, a late phone, a phone at 2 s, two phones on one clock, frame-by-frame following onto the poster's 4.1 s, the still held with nothing inline, a new end phase, no winner's beats, the still with no clock or no phase, Blue's still, no result and a late result, each result's words, the round, the game's Reduce motion and its fade, suspend and resume, stale and live, concealed and shown, one loop, dispose twice, the layout, and the privacy of inputs, results and words.
    - **Eight of them are new in 0.1.1:**
      - `layout()` is where the block ends: the same before the stamp lands, while the words rise and in the still;
      - it follows the size and the safe area;
      - it is unchanged under a scaled ancestor;
      - it is `null` with no title block, and `layout()` is `null` after `dispose()`;
      - at 100 %, 150 % and 200 %, at both sizes and for all six results, `titleBottom` is where the block ends, read with no `update()` after the text size changes;
      - no word is cut: every line lies inside the phone, and none is wider than its box;
      - up to the cap every size is the pack's own, and past it each holds;
      - at 200 % the block has the same sizes, boxes and foot as at 150 %.
    - **Device Reduce motion:** its four checks.
  - **Larger text:** 12 of 12, the six stills at both sizes, each at 100 %, 150 % and 200 %.
    - **In each capture's own pixels,** the title's last ink lies 3.6 to 6.3 px above `titleBottom` (the last line's own space under its letters), and nothing is painted from there down to the stand-in.
    - **Held at the cap, the block is the pack's own at that root size:** beside the pack's end screen at `?text=1.25`, every box of the five cases it draws is the pack's (40 boxes, none more than 0.01 px apart).
    - **At 200 % the capture is the capture at 150 %,** pixel for pixel, while the pack's own block has grown on: its Red block ends at 718.7 px on 390 × 844.
    - **The stand-in** starts at the pack's 58 % at the Standard text, and 13 px under the block where that is lower.
    - **Pictures:** `<size>-red-larger-text.jpg` and `<size>-alien-larger-text.jpg`, at both sizes.
  - **The still against the approved posters** (lossy WebP), at 1920 × 1080, in 0–255 levels per channel. The limit is 3, and each control must be beyond it and at least twice the still's difference.

    | Poster | The ship's box | The whole frame | Controls (ship 3 px off; 2 % larger) |
    | --- | --- | --- | --- |
    | Red | 1.80 | 0.85 | 5.56; 5.27 |
    | Blue | 1.76 | 0.87 | 5.60; 5.31 |

  - **Beside the pinned pack's own end screen** (`design/phone-ui/prototype/index.html?s=end&winner=…&safe=47,34&chrome=0`, served unchanged), for each case it draws, at both sizes: the words exactly the same; the hero, the title block, the stamp, the title and the line where the pack lays them (every box 0 px apart); and the pixels:

    | Case | Hero (without the title block) | The ship's box | The title block | Controls, 3 px off (ship; title) |
    | --- | --- | --- | --- | --- |
    | Blue, 390 × 844 | 0.90 | 1.95 | 0.19 | 7.81; 22.05 |
    | Blue, 430 × 932 | 0.92 | 2.03 | 0.25 | 7.53; 19.45 |
    | Red, 390 × 844 | 0.90 | 1.95 | 0.19 | 7.71; 20.44 |
    | Red, 430 × 932 | 0.91 | 2.02 | 0.24 | 7.44; 18.19 |
    | Blue with the Alien, 390 × 844 | 0.90 | 1.95 | 0.13 | 7.81; 28.34 |
    | Blue with the Alien, 430 × 932 | 0.91 | 2.03 | 0.20 | 7.53; 25.12 |
    | No survivors, 390 × 844 | 0 | — | 0 | —; 23.23 |
    | No survivors, 430 × 932 | 0 | — | 0 | —; 21.02 |
    | Aborted, 390 × 844 | 0 | — | 0 | —; 26.44 |
    | Aborted, 430 × 932 | 0 | — | 0 | —; 23.91 |

    The dark field is a smooth gradient with no ship, so there only the words are controlled. Red with the Alien is not on the pack's screens: it is captured and recorded as composed.
  - **The beats strips:** ten moments side by side, for the arrival and for no winner, for review.
- **Not run:** physical phones, Safari, screen readers, and performance on a phone. Frontend measures runtime performance in the app. During the 4.5 s arrival the scene redraws the film's body each frame (the stars, planet, beam and ship); the filters, vignette, grain and letterbox are a static layer that never repaints. From the still on, it asks for no frames.

## For Frontend

- Mount it in the shell's stage when the public view's phase is `FINISHED` or `ABORTED`, on every phone and on the shared display. The shell takes `bar: null`, `tabs: null` and `edge: true`. Pass the phase as `window` (`{ id, startedAt }`), the trusted clock, `view.result`, `view.round`, the stage's size and `{ top: layout().safe.top }` as `safe`.
- Sheet 44's Roles list and "Return to lobby" are the Gameplay UI builder's, in `shell.slot('cover')`. Give the list `scene.layout().titleBottom` as its `clear.top`, so it starts at `max(58 %, titleBottom + 13 px)`. Read `layout()` after mounting and again whenever you change the size, the safe area or the game's text size; while it is `null` (concealed, no result) there is no block to clear.
- `suspend()` when the app goes to the background and `resume()` when it returns. Pass `status: 'stale'` while reconnecting and `'concealed'` when the app conceals the match. Use `dispose()` on leaving the screen.
- Missing an input, or the scene doesn't fit: tell the Designer team on #4. The source is changed here, not in the app.
