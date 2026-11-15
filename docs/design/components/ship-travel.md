# Ship travel: Designer's runtime component

**Version:** `ship-travel-0.1.0`. **Status (15 November 2026):** built to the interface agreed on #269, with the Lead Designer's four review changes, mounted in the phone shell's stage edge to edge (the shell's `edge: true`, `28f7d219`), and ready for the Lead's review before Frontend's. It is not in the game yet. Integration first admits its module graph to the hosted build, including `ship-art.mjs`, a new runtime derivative of approved drawing (see Art). It is not a release.

**What it is:** the public film of sheet 41 (#222 item 18). For the whole navigation window, every phone sees the ship travel through space, the same picture at the same moment. Then it sees "The ship moved". Today the game shows only a line of text in Panels.

The game imports the component as it is, and the preview mounts the same files. It follows the owner's decisions of 14 and 15 November 2026 ([ownership](../../architecture/visual-component-ownership.md)): Designer builds the visual component once; Frontend connects the window, the clock and the lifecycle, and does not rebuild, restyle or copy it.

**Covers:** sheet 41's "Everyone · setting course" (`nav&state=public`) and "Everyone · moved" (`nav&state=moved`), with their captions.

**Not covered:** the offices' private Navigation sheet. Sheet 41's route, tie and acknowledge states (the pack's `routeSvg`) are a private surface over the Command Room, with tabs. That sheet is the Gameplay UI builder's work.

**Who sees it:** every phone and the shared display, except the Captain's and the Officer's, which show their sheet. Frontend's screen controller chooses the surface.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/`:

| Path | What |
| --- | --- |
| `ship-travel/ship-travel.mjs` | `mountShipTravel()`, `nextShipTravelInput()`, `shipTravelFrame()`, `shipTravelFraming()`, `travelBeats()`, `STILL`, `SHIP_TRAVEL_DEFAULTS`, `SHIP_TRAVEL_VERSION`, `TRAVEL_BEATS`, `CAPTIONS`, `LABELS`, `REDUCED_FADE_MS`, and the layers' markup functions the test compares |
| `ship-travel/ship-travel.css` | Starts with `@import url("../kit/kit.css");`; every rule of its own is under `.ms-ship-travel` |
| `ship-travel/ship-art.mjs` | The approved transit's drawing, ported unchanged: the ship, the stars, the streaks, the vignette, grain and letterbox, and the insert's composition |
| `kit/kit.mjs`, `kit/kit.css`, `icons.mjs` | Used unchanged: the kit's paper pill with the `course` icon, for the caption |
| `ship-travel/preview/` | Development only. `index.html` and `preview.mjs`: the film in the phone shell's stage (a phase bar, no tabs, edge to edge), on a synthetic window and clock. `probe.mjs`: the lifecycle probe. `compare.mjs`: the comparison with the approved poster |
| `ship-travel/review/` | The check's captures, comparisons, beats strip and `check.json` |

It loads no picture or video: the film is drawn from code, so it has no art-loading failure state. It imports nothing from `prototype/`, `preview/` or fixtures. Its one package import is the game's `@mothership/contracts`, through the kit's `crew-runtime.mjs`. It depends on neither the room scene nor the shell.

## Mount, update and dispose

```js
import { mountShipTravel } from '…/design/phone-ui/components/ship-travel/ship-travel.mjs';
import '…/design/phone-ui/components/ship-travel/ship-travel.css';

// The shell: a phase bar, no tabs, and the stage edge to edge, under the bar's glass (sheet 41).
const shell = mountPhoneShell(host, { bar, tabs: null, edge: true, … }, { onLayout: layout => film.update({ size: layout.stage, safe: layout.safe }) });
const film = mountShipTravel(shell.stage, {
  window: { id: phase.id, startedAt: phase.startedAt, endsAt: phase.endsAt }, // the published NAV_SETTING phase
  clock,                                     // { now() }: the match's trusted server time
  size: shell.layout().stage,                // edge to edge: the whole phone
  safe: shell.layout().safe,                 // the caption keeps 24 px above the bottom safe area
});
film.update({ ...changes });  // each key given replaces that key; the rest stay
film.suspend();               // backgrounded: stands still, asks for no frames
film.resume();                // foregrounded: seeks to the clock; nothing is replayed
film.frame();                 // a plain snapshot (below); null after dispose()
film.dispose();               // removes the element and stops its frames; safe to call twice
```

- **The host:** the phone shell's stage with a phase bar, no tabs (`tabs: null`) and `edge: true`. The stage then fills the whole phone and the bar's glass lies over the film, as the pack's `nav` screen lays the bar over the poster (`inset: 0`, `background-size: cover`). The component appends one child, `.ms-ship-travel.ms-kit`, of exactly `size`.
- **On the shell's `onLayout(layout)`:** pass `{ size: layout.stage, safe: layout.safe }`. Edge to edge, `layout().bars` is `{ top: 0, bottom: 0 }`, so `insets` stays at its default.
- **It takes no taps** and has no controls. It reports nothing, so it has no callbacks and needs no control policy. To assistive technology it is one image with a text alternative.
- **`frame()`** returns:

  ```js
  { window, t, beat, still, running, state, status, reduced, shown }
  ```

  - `t`: the film time drawn, in ms.
  - `beat`: `'enter'`, `'cruise'`, `'settle'` or `'still'`.
  - `still`: whether the still is showing.
  - `running`: whether a frame loop runs.
  - `reduced`: the game's or the device's Reduce motion.
  - `shown`: false while concealed.

## Inputs

**Every input is public, or this phone's own setting. None is private.** The film receives no position, direction, arm, tie, office, weight, choice, choice timing or destination. `nextShipTravelInput()` refuses any key it does not know, inside `window`, `size` and `insets` too, so a private navigation field cannot be passed by mistake.

| Input | Audience | Default | What |
| --- | --- | --- | --- |
| `window` | Public | `null` | `{ id, startedAt, endsAt }`: the published `NAV_SETTING` phase, in server milliseconds (15 000 ms long on 1.1.0, P28). A new `id` is a new film |
| `clock` | Public | `null` | `{ now() }`: the match's trusted server time, as the room scene takes it. `null` means no trusted clock |
| `state` | Public | `'setting'` | `'setting'` while the window runs. `'moved'` once the public projection says the ship moved this round (`navigation.lastMovedRound`). The film never infers `'moved'` from its own time |
| `size` | Phone | 390 × 711 | `{ width, height }`: the host's size in CSS px |
| `insets` | Phone | `{ top: 0, bottom: 0 }` | How far the phone's screen reaches above and below the host: 0 when the host is the whole phone (the shell's `edge: true`). For a host between bars, the shell's `layout().bars`. Either way the poster is framed for the whole screen, as the pack draws it, so the ship sits where sheet 41 shows it |
| `safe` | Phone | `null` | `{ top, bottom }`: the phone's safe areas, the shell's `layout().safe`. The caption sits 24 px above the bottom one, as sheet 41 draws it. `null`: the device's `env(safe-area-inset-bottom)` |
| `caption` | Phone | `true` | Show sheet 41's caption: the kit's `pill({ text, icon: 'course', tone: 'paper' })` |
| `status` | Phone | `'live'` | `'live'`, `'stale'` (reconnecting) or `'concealed'` |
| `reducedMotion` | Phone | `false` | The game's Reduce motion, shown as `data-motion="reduced"` on the root, as every Designer component does. The device's `prefers-reduced-motion` is honoured as well |

## Time: the film seeks inside the server's window

- **Film time:** `t = clamp(clock.now() − window.startedAt, 0, window.endsAt − window.startedAt)`, read on every animation frame. The film keeps no clock of its own and never counts down.
- **Late, reconnecting or foregrounded phones** seek to `t`. A phone that opens at 9 s shows the 9 s picture, with no entry replayed. Every phone shows the same moment.
- **A film never advances the game.** At the end of the window it holds its last picture, the still, and asks for no more frames. `'moved'` comes only from Frontend's public projection. There is no "ended" callback.
- **The same for every outcome:** the length, beats and picture are identical however the ship moves (it advances, switches arm or leaves Start) and however the direction is decided (a tie broken, a random draw, an early choice by the offices). Nothing starts, stops or changes when a choice is made (P28).
- **No skip:** the Lead's review dropped `skip()` from 0.1.0. Sheet 41 draws no Skip, the film is the same 15 s for everyone, and Reduce motion already gives the still. Skip is added only if the owner asks.

**The beats** (approved by the Lead on #269), for a 15 s window:

| t | `beat` | What |
| --- | --- | --- |
| 0–0.2 s | `enter` | The space opens from black (the insert's own fade) |
| 0–1.2 s | `enter` | The ship glides in from beyond the left edge (the insert's own entry point) to its place on the approved poster, easing out |
| 1.2–13.8 s | `cruise` | The ship rests there with a slight bob, its two engines flickering a little. The stars drift right to left in three depths per field; the streaks run right to left at a third of the insert's pace. It never turns and is never tinted |
| 13.8–15 s | `settle` | The world's clock slows to a stop, so the stars, streaks, bob and flicker come to rest on the poster's frame |
| 15 s, and `'moved'` | `still` | The still: the approved poster's frame, which is also the Reduce motion picture |

- **The world's clock** (`tau`) is the insert's own time. It runs at the film's pace and reads the poster's 1200 ms exactly at the end of the window, so the last frame is the poster.
- **A window shorter than 2.4 s:** enter and settle each take half of it.
- **A longer window:** enter and settle keep 1.2 s each, and the cruise fills the rest.

**Never drawn:** a planet, the route, an arm's colour, a junction or the destination. The planets' hues are not even in the port.

## States

| State | What shows |
| --- | --- |
| Setting course | The film at `t`, with "Same 15 seconds every round" |
| Moved | The still, with "One step on the route · destination hidden" |
| Reduce motion (the game's or the device's) | The still, with one 80 ms fade when it first shows for a window and state, and the current caption. No frames run |
| No clock, or no window | The still, the same on every phone |
| Stale (reconnecting) | Stands still at the moment it had. The reconnecting banner is the shell's. Live again, it seeks to the clock |
| Concealed | A plain cover. Nothing of the film is drawn or named (the name is "Hidden"), and no frames run. Shown again, it seeks to the clock |
| Suspended | Stands still and asks for no frames until `resume()` |

**Text alternative:** `role="img"`, named "The ship is travelling. Destination hidden." while setting course, and "The ship moved one step. Destination hidden." once moved.

## Lifecycle guarantees

- `dispose()` is safe to call twice. After it, `update()`, `suspend()` and `resume()` do nothing, and `frame()` returns `null`.
- At most one animation-frame loop runs per mount. It runs only while the film is live, in motion, setting course, with a clock and a window, not suspended, not concealed, and before the end.
- Each mount is independent, with its own SVG ids. A new match is a new mount.

## Art

The film is the approved transit's drawing, ported unchanged into `ship-art.mjs` (the Lead's review of #269):

- **Ported from:** `claude/designer-library-navigation` at `6b63560d990c50dd1d16e44e6f40f5b7b77b6b68`. Its files are the same git blobs as PR #184's head `0fb17a35c4b2fdd3418c9ffb575dbd4a7d0d9878`, the head whose named assets Integration approved: [`docs/integration/planet-library-art-approval-2026-11-06.json`](../../integration/planet-library-art-approval-2026-11-06.json), "neutral transit".
- **The ship:** `shipSvg`, `SHIP` and `VOID`, from `design/cinematic/pilots/blackhole/art.mjs`.
- **The transit's composition:** `FILM`, `filmEnd`, `ship`, `transitX`, `transitContent` and `transitInsert`, from `design/library/navigation/films.mjs`. Its planets and the arrival are not ported.
- **The effects:** `stars`, `streaks`, `vignette`, `letterbox` and `fxDefs`, from `design/cinematic/lib/comic.mjs`; `hash`, `rand`, `clamp01`, `lerp` and `easeOutCubic`, from `design/cinematic/lib/ease.mjs`.
- **The four colours `shipSvg` reads:** with the same values as `design/board-v2/fx/captain.mjs` and `medical.mjs`.

Each function is its source's text, character for character; only `export` is added to the module-private ones. The film's still is the frame of the approved poster, `apps/game/candidates/planet-library/transit.poster.webp` (`cd2ee842…`): `transitInsert()` at 1200 ms of its 2400 ms, full variant, 1920 × 1080.

**For Integration:** `ship-art.mjs` is a new runtime drawing derivative of development sources. The drawing-port fence scans only `apps/` and `packages/presentation`, so Integration reviews this file when it admits the component's graph. The approved 2.4 s insert video is not stretched or looped.

## Checks run on this version

- **`packages/design-tokens/test/ship-travel.test.mjs`:** 9 of 9.
  - **The graph:** runtime-safe, with no development marker, no picture or video loaded, and one package import.
  - **The styles' scope:** every rule under `.ms-ship-travel`, one keyframes of its own, and no `--ms-k-` property.
  - **The port:**
    - each of 17 functions has the SHA-256 of its source's text;
    - `transitInsert(1200)` writes the source's poster frame byte for byte (`87c3de08…`);
    - the poster file is the one Integration approved.
  - **The still, layer by layer:** every star, streak, the ship and the front are exactly `transitContent()`'s at 1200 ms.
  - **The beats:** continuous for windows of 2, 15 and 20 s, with the world's clock ending on 1200 ms.
  - **The framing:** the poster covers the whole phone, as the pack draws it.
  - **The inputs:** every unknown or private key is refused.
  - **The words:** sheet 41's, and no planet or route hue in anything drawn.
  - **The check's record**, last.
- **`node design/tools/ship-travel-check.mjs`**, under the production headers (Content Security Policy and six others). The record is `ship-travel/review/check.json`, against the commit it names.
  - **Captures:** 32 of 32, eight states at 390 × 844 and 430 × 932, in full motion and with the device's Reduce motion: setting (4 s), enter (0.6 s), settle (14.4 s), moved, the game's Reduce motion, stale (9 s), concealed and no clock. Each in the shell's stage edge to edge: the film covers the whole phone, and the caption sits 24 px above the bottom safe area (58 px from the foot at a 34 px safe area).
  - **Probe:** 28 of 28 checks.
    - **Full:** time and seeking, a late phone, two phones on one clock, frame-by-frame following, the end held, a new window, a short window, the still, the game's Reduce motion and its fade, suspend and resume, stale and live, concealed and shown, one loop, dispose twice, the caption's place (edge to edge, or above the safe area), and the privacy of inputs and words.
    - **Device Reduce motion:** its four checks.
  - **The still against the approved poster** (lossy WebP), in 0–255 levels per channel. The limit is 3, and each control must be beyond it and at least twice the still's difference.

    | Comparison | Difference | Controls (ship 3 px off; 2 % larger) |
    | --- | --- | --- |
    | At 1920 × 1080: the ship's box | 1.48 | 4.14; 7.41 |
    | At 1920 × 1080: the whole frame | 0.76 | — |
    | At 390 × 844, beside the poster as the pack's nav screen draws it: the film below the bar | 1.11 | — |
    | At 390 × 844: the ship's box | 1.52 | 4.73 (3 px only) |
    | At 430 × 932: the film below the bar | 1.16 | — |
    | At 430 × 932: the ship's box | 1.65 | 4.64 (3 px only) |

  - **The beats strip:** ten moments of the window side by side, for review.
- **Not run:** physical phones, Safari, screen readers, and performance on a phone. Frontend measures runtime performance in the app. The film keeps a frame's work small: the stars move in six depth groups, two streak paths are redrawn, the ship moves as one composited layer, and the vignette and grain never repaint.

## For Frontend

- Mount it in the shell's stage for the public `NAV_SETTING` window, on every phone except the offices', and on the shared display. The shell takes a phase bar, `tabs: null` and `edge: true`. Pass the phase as `window`, the trusted clock, the stage's size and the shell's `layout().safe`.
- When the projection shows the move (`navigation.lastMovedRound` reaches the round), pass `state: 'moved'` and keep the film until the next screen. The shell's top bar shows "The ship moved · Round n complete" with no clock.
- `suspend()` when the app goes to the background and `resume()` when it returns. Pass `status: 'stale'` while reconnecting and `'concealed'` when the app conceals the match. Use `dispose()` on leaving the screen.
- Missing an input, or the film doesn't fit: tell the Designer team on #4. The source is changed here, not in the app.
