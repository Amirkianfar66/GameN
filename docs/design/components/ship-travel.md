# Ship travel: Designer's runtime component

**Version:** `ship-travel-0.1.0` (proposed). **Status (15 November 2026):** interface proposal only, for the Lead Designer's review and then Frontend's on #4. Nothing is built yet. It is not in the game and it is not a release.

**What it is:** the public "Setting course" film of sheet 41: for the whole navigation window, every phone sees the ship travel through space, the same picture at the same moment, and then "The ship moved". It replaces today's line of text in Panels (#222 item 18). The game imports it as it is, and the preview mounts the same files. It follows the owner's decisions of 14 and 15 November 2026 ([ownership](../../architecture/visual-component-ownership.md)): Designer builds the visual component once; Frontend connects data, the clock and lifecycle, and does not rebuild, restyle or copy it.

**Covers:** sheet 41, "Everyone · setting course" (`nav&state=public`) and "Everyone · moved" (`nav&state=moved`), with their captions. The offices' private Navigation sheet (sheet 41's route, tie and acknowledge states, with `routeSvg`) is **not** part of this component: it is the Gameplay UI builder's private surface.

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/ship-travel/`:

| Path | What |
| --- | --- |
| `ship-travel.mjs` | `mountShipTravel()`, `nextShipTravelInput()`, `shipTravelFrame()` (the film as a pure function of time, for tests), `SHIP_TRAVEL_DEFAULTS`, `SHIP_TRAVEL_VERSION`, `TRAVEL_BEATS`, `CAPTIONS` |
| `ship-travel.css` | Every style, scoped under `.ms-ship-travel` |
| `ship-art.mjs` | The ship in profile and the space field, drawn as SVG: the runtime port of the approved transit's ship (see Art) |
| `preview/` | Development only: the preview on labelled synthetic fixtures (a fake server clock with scrubbing), and the lifecycle probe `probe.mjs` |
| `review/` | The check's captures and `check.json` |

And: `design/tools/ship-travel-check.mjs` (captures at 390 × 844 and 430 × 932 under the production headers, full motion and reduced), `packages/design-tokens/test/ship-travel.test.mjs`, and this document.

**Used unchanged:** the shared component kit, `component-kit-0.1.0` (`../kit/kit.mjs` and `kit.css`, [its page](kit.md)), for the caption pill, and through it `../icons.mjs` for the pill's `course` icon. The root is `.ms-ship-travel.ms-kit`, and `ship-travel.css` starts with `@import url("../kit/kit.css");`. The film restyles none of the kit's colours, type or states and declares no `--ms-k-*` property; it places the pill through its own part's class.

It imports nothing from `prototype/`, `preview/`, fixtures or development code, and loads no picture or video: the film is drawn from code, so it has no art-loading failure state.

## Mount, update and dispose

```js
import { mountShipTravel } from '…/design/phone-ui/components/ship-travel/ship-travel.mjs';
import '…/design/phone-ui/components/ship-travel/ship-travel.css';

const film = mountShipTravel(host, input);
film.update({ ...changes });  // each key given replaces that key; the rest stay
film.skip();                  // this phone only: the film's still, at once
film.suspend();               // backgrounded: the film stands still, no animation frame is requested
film.resume();                // foregrounded: seeks to the trusted clock; nothing is replayed
film.frame();                 // { window, t, beat, still, state }: a plain snapshot; null after dispose()
film.dispose();               // removes the element and stops its frame loop; safe to call twice
```

- **The host:** an element Frontend places. Recommended: the phone shell's stage, with the shell's tabs hidden (`tabs: null`), as sheet 41 draws the public film under the top bar alone. The component appends one child, `.ms-ship-travel.ms-kit`, which fills `size`.
- **It takes no taps** and has no controls, so it emits no intent and needs no control policy. Its only kit part is the caption pill. It is one image to assistive technology, with a text alternative (below).

## Inputs

**Every input is public or this phone's own setting. None is private.** The film receives no position, direction, arm, tie, office, weight, choice, choice timing or destination. `nextShipTravelInput()` rejects any key it does not know, so a private navigation field cannot be passed by mistake.

| Input | Audience | Default | What |
| --- | --- | --- | --- |
| `window` | Public | `null` | `{ id, startedAt, endsAt }`: the public `NAV_SETTING` phase as published (`phase.id`, `phase.startedAt`, `phase.endsAt`, server milliseconds; 15 000 ms long on 1.1.0, P28). A new `id` is a new film |
| `clock` | Public | `null` | `{ now() }`: the match's trusted server time, as the room scene takes it. `null` means no trusted clock |
| `state` | Public | `'setting'` | `'setting'` while the window runs; `'moved'` once the public projection says the ship moved this round (`navigation.lastMovedRound`). The component never infers `'moved'` from its own time |
| `size` | Phone | 390 × 798 | `{ width, height }`: the host's size in CSS pixels |
| `insets` | Phone | `{ top: 0, bottom: 24 }` | Keeps the ship and the caption clear of bars and the home indicator |
| `caption` | Phone | `true` | Show sheet 41's caption pill: the kit's `pill({ text, icon: 'course', tone: 'paper' })`, as the pack's `nav` screen draws it |
| `status` | Phone | `'live'` | `'live'`, `'stale'` (reconnecting) or `'concealed'` |
| `reducedMotion` | Phone | `false` | The game's Reduce motion; the device's setting is honoured as well |

## Time: the film seeks inside the server's window

- **Film time** `t = clamp(clock.now() − window.startedAt, 0, window.endsAt − window.startedAt)`. Between animation frames the component reads `clock.now()`; it keeps no clock of its own and never counts down.
- **Late, reconnecting or foregrounded** phones seek to `t`: a phone that opens at 9 s shows the 9 s picture, with no entry replayed. Every phone shows the same moment.
- **A film never advances the game.** Reaching the end of the window does nothing but hold the last picture. `'moved'` comes only from Frontend's public projection. There is no "ended" callback.
- **The same for every outcome:** the film's length, beats and picture are identical whether the ship advances, switches arm, leaves Start, a tie is broken, a random draw decides or the offices chose early. Nothing in it starts, stops or changes when a choice is made (P28).

**Beats (proposed, for the 15 s window):**

| t | Beat (`frame().beat`) | What |
| --- | --- | --- |
| 0–1.2 s | `enter` | The space field opens (fade from the stage) and the ship glides in from the left to its cruise place: the composition of the approved transit poster, nose to the right, cropped at the left edge on a phone |
| 1.2–13.8 s | `cruise` | The ship cruises: a slight bob, the two engines' flicker, stars at three depths and speed streaks drifting right to left. It never turns and is never tinted |
| 13.8–15 s | `settle` | The streaks thin out and the ship eases to its still pose, which is the `'moved'` picture |
| `'moved'` | `still` | The still ship in space, with "One step on the route · destination hidden" |

If a window is longer or shorter than 15 s, `enter` and `settle` keep their lengths and `cruise` fills the rest.

**No planet, route, arm colour, junction or destination is ever drawn.** The space uses only the neutral sky colours (no blue, red or lavender world), as the rooms' ambient voyage does.

## Skip

`skip()` is local to this phone: it shows the film's still at once (the same still as Reduce motion), and nothing else changes. It sends nothing and does not end the window; the top bar's clock carries on. A new window `id` clears it. Sheet 41 draws no Skip control, so the component draws none: Frontend decides what calls `skip()` (for example a tap on the stage), or does not offer it. If a drawn Skip is wanted, it would be the kit's button with the kit's control policy, and a departure from sheet 41 that needs Designer's agreement and the owner's approval first.

## Reduce motion

The Designer components' one convention: the game's setting (`reducedMotion: true`) puts `data-motion="reduced"` on the `.ms-kit` root, and the device's `prefers-reduced-motion` is honoured as well, so Frontend has one switch for every film. With either: the still (the ship at its cruise place, stars fixed, no streaks), shown with an 80 ms fade, and the caption. Nothing moves, travels or flickers. A change of `state` swaps caption and label with the same 80 ms fade. Turning Reduce motion off mid-window seeks to `t`.

## States

| State | What shows |
| --- | --- |
| Setting course | The film at `t`, with "Same 15 seconds every round" |
| Moved | The still, with "One step on the route · destination hidden" |
| Reduce motion, or skipped | The still, with the current caption |
| No clock, or no window | The still, the same on every phone |
| Stale (reconnecting) | Stands still at the moment it had; the reconnecting banner is the shell's |
| Concealed | A plain cover: nothing of the film is drawn or named, and the frame loop stops |
| Suspended | Stands still; no animation frame is requested until `resume()` |

## Text alternative

`role="img"`, named "The ship is travelling. Destination hidden." while setting course, and "The ship moved one step. Destination hidden." once moved. The caption is real text. Concealed, it is named "Hidden".

## Lifecycle guarantees

- `dispose()` is safe to call twice. After it, `update()`, `skip()`, `suspend()` and `resume()` do nothing and `frame()` returns `null`.
- Only one animation-frame loop runs per mount, and only while live, in motion, with a clock and a window, not suspended, not skipped and not concealed.
- Each mount is independent; a new match is a new mount.

## Art

The ship is the approved transit's: the ship in profile of the Blackhole pilot (`shipSvg`, `design/cinematic/pilots/blackhole/art.mjs`), as drawn in `transit.mp4` and `transit.poster.webp` (approved for runtime by Integration on 6 November 2026, `docs/integration/planet-library-art-approval-2026-11-06.json`, from PR #184). That source is development code on `claude/designer-library-navigation` and is not on `main`. The component ports the ship's drawing once, unchanged, into its runtime-safe `ship-art.mjs`, and draws the 15 s film from it, so it can seek to any millisecond. The approved 2.4 s insert video is not stretched or looped.

## Acceptance (proposed)

- Sheet 41, `nav&state=public` and `nav&state=moved`, at 390 × 844 and 430 × 932, full motion and reduced, under the production headers.
- The probe: seeking at 0, 0.6, 1.2, 7.5, 13.8 and 15 s, and past the end; a late mount; a new window id; Reduce motion on and off mid-window; the device setting; skip; suspend and resume; stale; concealed; no clock; dispose twice; no frame requested while still; a private key rejected.
