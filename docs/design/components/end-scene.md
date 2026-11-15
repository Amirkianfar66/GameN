# End scene: Designer's runtime component

**Version:** `end-scene-0.1.0` (proposed). **Status (15 November 2026):** interface proposal only, for the Lead Designer's review and then Frontend's on #4. Nothing is built yet. It is not in the game and it is not a release.

**What it is:** the top of sheet 44, the end of a match (#222 item 8). It shows the planet, the ship on its landing beam and the "RED WINS" stamp, then the title and the round. When no one wins, it shows "NO WINNER" on the dark field.

Today the game shows a text list on glass, and "Match aborted · No winner" as text.

The game imports the component as it is, and the preview mounts the same files. It follows the owner's decisions of 14 and 15 November 2026 ([ownership](../../architecture/visual-component-ownership.md)).

**The split with sheet 44's screen:**

| Part | Whose |
| --- | --- |
| The hero picture (the pack's `.end-hero`) | This scene |
| The stamp, the title and the line under it (the pack's `.end-title`) | This scene |
| The Roles list, with portraits and role chips (`.end-list`, from `endReveal`) | The Gameplay UI builder, who places this scene in the screen |
| "Return to lobby" | The Gameplay UI builder |

Each places nothing of the other's.

## The host (proposed)

As the pack draws it, with no top bar and no tabs, at `inset: 0`:
- **The shell:** `bar: null`, `tabs: null`, `edge: true`.
- **This scene:** in `shell.stage`, the whole phone.
- **Sheet 44's Roles list and button:** in `shell.slot('cover')`, over the scene.
- **The scene's layout:**
  - the hero fills the top 50 % of the phone and fades to the canvas;
  - the title block sits at `safe.top + 34 %`, 16 px from each side, centred;
  - below the hero, the scene is the plain canvas, where the cover lays the list from 58 %.

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/end-scene/`:

| Path | What |
| --- | --- |
| `end-scene.mjs` | `mountEndScene()`, `nextEndSceneInput()`, `endSceneFrame()` (the scene as a pure function of time), `END_SCENE_DEFAULTS`, `END_SCENE_VERSION`, `END_WORDS` |
| `end-scene.css` | Starts with `@import url("../kit/kit.css");`; every rule of its own under `.ms-end-scene` |
| `arrival-art.mjs` | The approved arrival's drawing, ported unchanged (see Art). It uses `../ship-travel/ship-art.mjs` for the ship, stars and effects, which stays planet-free |
| `preview/` | Development only: the scene in the shell's stage edge to edge, sheet 44's list as a labelled stand-in in the cover, the probe, and the comparison with the approved posters |
| `review/` | The check's captures and `check.json` |

Also proposed:
- `design/tools/end-scene-check.mjs`, built on `design/tools/lib/component-check.mjs`. It captures at 390 × 844 and 430 × 932 under the production headers, in full motion and reduced.
- `packages/design-tokens/test/end-scene.test.mjs`.
- This document.

It loads no picture or video: like the ship travel, it is drawn from code.

## Mount, update and dispose

```js
shell.update({ bar: null, tabs: null, edge: true });
const layout = shell.layout();
const scene = mountEndScene(shell.stage, {
  window: { id: phase.id, startedAt: phase.startedAt }, // the published FINISHED or ABORTED phase
  clock,                                               // { now() }: the match's trusted server time
  result: view.result,                                 // { winner, reason, alienCoWinner }: public, as the contract has it
  round: view.round,
  size: layout.stage,                                  // edge to edge: the whole phone
  safe: { top: layout.safe.top },                      // the title sits at safe.top + 34 %
});
scene.update({ ...changes }); scene.suspend(); scene.resume(); scene.frame(); scene.dispose();
```

It takes no taps and reports nothing; "Return to lobby" is the screen's. To assistive technology it is one image whose text alternative is its words, for example "Red wins. Red reached Red Planet. Round 6."

## Inputs (proposed)

**Every input is public, or this phone's own setting.** The scene receives only what the server publishes to everyone at the end:
- the public view's `result` (`PlanetResultSchema`: `winner` `'Blue' | 'Red' | null`, `reason` `'ARRIVAL' | 'NO_SURVIVORS' | 'ABORTED'`, `alienCoWinner`);
- the `round`;
- the end phase's id and start.

It receives no seat, name, role, team, code or `endReveal`: those are the Roles list's. `nextEndSceneInput()` refuses any key it does not know, at every level, and refuses a result the contract would refuse (a winner without an arrival, or the Alien without a winner).

| Input | Audience | Default | What |
| --- | --- | --- | --- |
| `window` | Public | `null` | `{ id, startedAt }`: the published `FINISHED` or `ABORTED` phase. A new `id` is a new scene |
| `clock` | Public | `null` | `{ now() }`: the match's trusted server time. `null`: the still |
| `result` | Public | `null` | `{ winner, reason, alienCoWinner }`: the view's `result`. `null`: the dark field with no words |
| `round` | Public | `null` | The match's round, for "Round 6" |
| `size` | Phone | 390 × 844 | `{ width, height }`: the whole phone (the shell's stage edge to edge) |
| `safe` | Phone | `{ top: 0 }` | `{ top }`: the phone's top safe area, the shell's `layout().safe.top` |
| `status` | Phone | `'live'` | `'live'`, `'stale'` or `'concealed'` |
| `reducedMotion` | Phone | `false` | The game's Reduce motion (`data-motion="reduced"` on the root); the device's setting is honoured as well |

## The words (the pack's `end` screen)

| `result` | Stamp (the kit's) | Title | Line |
| --- | --- | --- | --- |
| `winner: 'Blue'`, `reason: 'ARRIVAL'` | "BLUE WINS", gold | "Blue reached Blue Planet" | "Round n" |
| `winner: 'Red'`, `reason: 'ARRIVAL'` | "RED WINS", gold | "Red reached Red Planet" | "Round n" |
| … and `alienCoWinner: true` | "BLUE WINS · ALIEN TOO" ("RED WINS · ALIEN TOO"), gold | as above | "The Alien survived and used Blackhole" |
| `reason: 'NO_SURVIVORS'` | "NO WINNER", plain | "No survivors" | "Round n" |
| `reason: 'ABORTED'` | "NO WINNER", plain | "Match aborted" | "The host ended the match" |

The title is set in capitals, as sheet 44 draws it.

## Time: the scene seeks inside the server's time

- **Scene time:** `t = max(0, clock.now() − window.startedAt)`, read on every animation frame. Once `t` passes the scene's length, the scene holds its still.
- **Late phones:** a phone that opens or reconnects late sees the moment the clock gives. A phone that opens after the end sees the still.
- **The scene never advances the game.** It has no "ended" callback and no skip.

**Beats (proposed):**

| t | Arrival (`reason: 'ARRIVAL'`) | No winner |
| --- | --- | --- |
| 0–3.7 s | The approved arrival film, at its own pace: the space opens, the planet comes close and turns, the ship glides in, descends, and its landing beam opens | The dark field (the pack's) |
| 0.3 s | — | The stamp lands |
| 3.6 s | The stamp lands: an ink stamp's punch, 240 ms | — |
| 3.7–4.5 s | The film's clock slows to a stop on the approved poster's frame (the film's 4.1 s) | — |
| 3.9–4.3 s | The title and the line rise 8 px and fade in | 0.6–1.0 s |
| From 4.5 s / 1.0 s | **The still:** the poster's frame, the stamp and the words | **The still** |

Reduce motion, the game's or the device's: the still, with one 80 ms fade.

## States

| State | What shows |
| --- | --- |
| Arrival, Blue or Red | The approved arrival film, then the still: the poster's frame, as a cover over the top half, fading to the canvas; the stamp and the words |
| No survivors, aborted | The dark field (the pack's radial gradient), the plain stamp and the words |
| Reduce motion, or no clock | The still |
| Stale | Stands still where it was |
| Concealed | A plain cover: nothing drawn or named |
| No result | The dark field, with no words |

## Art (proposed)

The arrival is the approved arrival's drawing. Integration approved `arrival-blue.mp4`, `arrival-red.mp4` and their posters on 6 November 2026 (`docs/integration/planet-library-art-approval-2026-11-06.json`, "Blue/Red arrival"). The runtime preparation allows them "only after the matching authoritative terminal arrival", which `result.reason: 'ARRIVAL'` is.

As for the ship travel, the drawing would be ported unchanged into `arrival-art.mjs`, from `claude/designer-library-navigation` at `6b63560d` (the same blobs as #184's approved head `0fb17a35`):
- from `design/library/navigation/films.mjs`: `PLANETS`, `planetSvg`, `arrivalFrame` and `arrivalSvg`;
- from `design/cinematic/lib/comic.mjs`: `lightCone`;
- from `design/cinematic/lib/ease.mjs`: `easeInOutCubic`.

The rest (the ship, stars, vignette, grain, letterbox) comes from `ship-art.mjs`.

**Proposed proof:** the posters are the insert's frame at 4100 ms of its 4200 ms. The test would prove `arrivalSvg()` writes those frames byte for byte, and the check would compare the still with `arrival-red.poster.webp` and `arrival-blue.poster.webp`.

**For Integration:** the planets' hues appear only here, at an arrival, when the destination is public (`navigation.arrivedAt`, `result.winner`). `arrival-art.mjs` would be a second new runtime drawing derivative, reviewed when the graph is admitted.

**Not used:** the library's `end.css` banners and emblems. They belong with the Roles list, if adopted.

## Acceptance (proposed)

- **Sheet 44:** "Blue wins", "Red wins" and "No survivors", plus the pack's aborted and Alien screens, at 390 × 844 and 430 × 932, full motion and reduced, under the production headers.
- **The still against the posters:** at their own size, and in the hero beside the pack's `end` screen.
- **The probe:** seeking, a late phone, the still, Reduce motion, stale, concealed, suspend and resume, dispose twice, and refused inputs, including a result the contract refuses.
