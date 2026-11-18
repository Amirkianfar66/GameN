# Boarding film, version 2: Designer's runtime component (a pilot)

**Version:** `pregame-boarding-2.0.0`. **Status (16 November 2026):** a pilot, built at the owner's word of 15 November 2026 ("improve the cinematics to make it more like AAA animation cinematic") as the Lead Designer assigned it. It is for the Lead's review, then the owner's. It is not in the game, and it is not a release. The released film, `pregame-boarding-1.0.0`, is untouched and stays live; a match keeps the version it is pinned to. The other films wait for the owner's yes on this one ([the audit](../cinematics-audit.md)).

**What it is:** the ten seconds every player sees before Round 1, restaged. The same place, crew, ink and story as the approved film, the same length and clock, and no sound. What is new is the staging (six shots, a camera moving through depth, light that lands on the crew, a build before each event) and the way it plays (pictures drawn once and placed each frame, so a phone can hold it).

## What changed, beat by beat

| Time | Today (`1.0.0`) | The pilot (`2.0.0`) |
| --- | --- | --- |
| 0–2 s, dusk | A side-on wide with a slow tilt; three planes at 0.92, 0.97 and 1 | A crane down from the ringed giant to the ship through six planes of depth, up from the night. The giant's bands turn. The first four of the crew are already walking in, small, their shadows long behind them |
| 2–3.6 s, the ramp's foot | One side-on shot; small figures (about 15 % of the frame's height) on one shared walk | Low at the ramp's foot, looking up it: the first four climb away into the doorway's light, dark shapes with the light on their edges, their shadows reaching back down the ramp at the lens. The nearer pair stands about 35–40 % of the frame's height |
| 3.6–5.4 s, faces | The same side-on shot | Beside the next two as they climb, waist up behind the ramp's rail: bodies bob and arms swing, each head rides a drawing late, a blink each. Their faces warm as the entrance nears, the sunset on their backs, the hull's running lights passing out of focus. Each looks up as the glare takes the frame |
| 5.4–6.55 s, the door | Ramp, door, seam, ports and engines in 0.75 s | The last aboard climbs the last steps, stops at the sill and looks back (a blink as the head comes round), then goes into the light. A held breath on the empty doorway. The ramp draws up with steam; the slab comes down and lands (dust along the sill, a 3 px jolt, one frame of light); the amber seam runs out along the sill and up both sides, and the jambs' trim lights with it |
| 6.55–6.9 s, the ship wakes | In the same shot, at once | The whole ship small under the giant: its ports light front to back, its engines wake, and the frame goes down to the dark for the cut |
| 6.9–9 s, inside | Rows standing frozen; the lamps switch on and everyone brightens together | From above the crew, pushing in, so each row's faces show over the row in front. Each is a dark shape, head bowed, lit only from the doorway behind (a thin edge of amber on the top of the head, the shoulders and the outer arms, fading down the body and gone by the knees), until the lamp over them catches with a flicker; then that row is lit and each head lifts to the light, past where it rests and back, and blinks. The consoles write themselves on along the walls |
| 9–9.6 s, the mark | A scale-down and a sheen | The Game N mark comes down out of the dark above the lens with a blur of itself, lands with a jolt of light, a streak, lines and sparks thrown out and ink off its feet, and settles; the sheen crosses its face. The corridor steps back for it |
| 9.6–9.96 s, the night | The ink tide | Kept, blot for blot |

**Reduce motion** (the game's or the device's) is five held pictures, each fading in from the night over 160 ms, changing when version 1's do (0, 2,400, 5,200, 6,900 and 8,900 ms), then a fade to the night from 9,700 ms: the ship at dusk; the four on the ramp; the last aboard looking back; the crew under the lights; the mark at rest. No jolt, flash or glare is ever a held picture, and the scene asks the page for no frame of its own.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/boarding-film/`:

| Path | What |
| --- | --- |
| `boarding-film.mjs` | `createBoardingScene()`, `prepareBoardingScene()`, `boardingFrame()`, `shotOf()`, `BOARDING_FILM_VERSION`, `BOARDING_MS`, `BOARDING_TEXT`, `SHOTS`, `DOOR_BEATS`, `HULL_WAKE`, `INSIDE`, `TITLE`, `STILLS`, `STILL_FADE_MS`, `STILL_OUT`, `COAST_MS`, `MEMORY_BUDGET`, `QUALITY`, `SLOW_FRAME_MS`, `SLOW_FRAMES`, `LATE_FRAME_MS`, `VARIANTS`. The clock, the six shots and the scene |
| `boarding-film.css` | Every style, scoped under `.ms-boarding-film`: the canvas, the light's layer, and the finish (a vignette and grade, the grain) |
| `engine.mjs` | What a canvas film needs: pictures drawn once (`sprite`, `createBakery`), planes of depth and a lens (`plane`, `lens`), light (`glow`, `beam`, `streak`, `createLight`), particles that are functions of time (`motes`, `sparks`, `puff`, `impact`), the grain's tile |
| `cast.mjs` | The crew: the film's poses (`stridePose`, `climbPose`, `backPose`, `HELD`), a body and a head as separate pictures (`bodySprite`, `partSprite`, `headSprite`), the light each is drawn in (`LOOKS`), and placing them (`createCaster`) |
| `exterior.mjs` | The world outside: version 1's place (`GROUND`, `DOOR`, `RAMP`), in planes of depth |
| `doorway.mjs` | The entrance seen from the ramp, a set in three dimensions |
| `corridor.mjs` | The corridor inside, a set in three dimensions |
| `mark.mjs` | The Game N mark's landing and the ink tide |
| `preview/` | Development only: the preview (the same files), the probe (`probe.mjs`), today's film for the same measurement (`baseline.*`) and the two films side by side (`compare.*`) |
| `review/` | The check's captures and `check.json`; the review videos and `renders.json` |

**Used unchanged, from the hosted game:** the approved crew drawing (`apps/game/hosted/crew-drawing/`: `figure.mjs`, `head.mjs`, `ink.mjs`, `crew.mjs`), the scene drawing's skeletons (`scene-drawing/gestures.mjs`, `body.mjs`), and the films' own kit and roster (`pregame-films/kit/math.mjs`, `fx.mjs`, `letters.mjs`; `pregame-films/boarding/roster.mjs`). No package is imported. The released film and the live player are not in its graph.

## How to connect it

Frontend's placement change moves the currently admitted `pregame-boarding-1.0.0` SVG into the canonical boarding stage's `stage.film` slot. The stage provides local Skip on player phones and uses `skip: null` on the shared display. The server owns the Round 1 start. [Integration handoff](https://github.com/Amirkianfar66/GameN/issues/311#issuecomment-6980975772) · [Stage placement contract](https://github.com/Amirkianfar66/GameN/issues/311#issuecomment-6980876366)

The independently versioned `pregame-boarding-2.0.0` canvas candidate targets that same slot in a later adoption. Its scene interface shares `paint`, `dispose` and `stats` with the released player. Integration admits the canvas runtime graph and selects it through the match's approved asset release. Existing pins continue to select the SVG.

```js
import { createBoardingScene, prepareBoardingScene } from '…/boarding-film/boarding-film.mjs';
// and link …/boarding-film/boarding-film.css

const scene = createBoardingScene(stage.film, { options: { roster, prepared } });
const size = stage.layout()?.film;
if (size?.width > 0 && size.height > 0) {
  scene.paint(elapsedMs, { ...size, variant });
}
```

| Part | What it is |
| --- | --- |
| `holder` | Pass `stage.film` in the playable stage. The film appends one noninteractive element, `.ms-boarding-film` (`aria-hidden="true"`, `pointer-events: none`), sized by the slot's measured CSS width and height. Frontend uses `stage.layout().film` and its `onLayout` updates |
| `options.roster` | The public roster: 7, 8 or 9 members, each `{ seat, character }` (`c1`–`c9`). It goes through the hosted game's own `publicRoster()`; nothing else of a member is read, and nothing private can reach a picture |
| `paint(t, { width, height, variant })` | Draws the film at `t` ms after the boarding interval's `startsAt` (server now − `startsAt`), clamped to 0–10,000. `variant` is `'full'` or `'reduced'`. The device's Reduce motion gives the held pictures whatever is asked |
| Between paints | The scene keeps the picture moving from the last time it was given, at the screen's rate: the player may go on painting 30 times a second. It stops by itself 500 ms after the last paint (`COAST_MS`) and at the film's end |
| `suspend()`, `resume()` | `suspend()` stops the scene's own frames (the page is hidden, the stage is covered); a paint still draws its frame. After `resume()` the next paint restarts them. A page that stops painting needs neither: the scene stops by itself |
| `dispose()` | Idempotent. Removes the film, cancels its animation frame and stops its adopted picture queue. An unadopted preparation remains the caller's to dispose |
| `stats` | `version`, `paints`, `frames`, `ownFrames`, `drawMs`, `worstMs`, `pictures`, `bytes`, `peakBytes`, `planned`, `bakeMs`, `longestBakeMs`, `scale`, `quality`, `sharp`, `lateSteps` |
| `ready()` | Resolves when every picture asked for so far is drawn. A recording waits for it; the film does not |
| `createBoardingScene(holder, { options, live: false })` | Draws only when painted (a recording, a test): the scene then never asks for a frame |

**The film never advances the game.** It takes no callback, listens for nothing and tells no one; its end means nothing. Skip stays the stage's and the player's, local.

**The stage owns accessible text and controls.** Its film group is named “The crew boards the ship.” The canvas is decorative for assistive technology. `BOARDING_TEXT` is available to other hosts that supply their own status line.

**Preparing early (recommended).** `prepareBoardingScene(document, { roster, width, height })` draws the film's pictures ahead of it and returns what `createBoardingScene` takes as `options.prepared` (the same roster and size), with `ready` and `dispose()`. The historical desktop preparation took 3.8 s at normal speed and 16.7 s with the CPU slowed 4x. Device preparation time remains unmeasured. When the scene prepares its own pictures, each shot's setting and one pose of each figure come first. A figure whose picture is pending holds its nearest pose. If preparation runs late, the scene lowers sharpness and draws the remaining pictures smaller.

**What Frontend and Integration decide:** admitting the film's files to the hosted build; linking its stylesheet; when to prepare; and that a match pinned to `1.0.0` keeps `1.0.0`.

### Pre-game Animator connection checkpoint — 18 November 2026

The Pre-game Animator owns the film source, full and reduced motion, and the scene's disposal. Frontend owns authorized playback, mounting and calling disposal. Screen Designer owns placement. Integration admits the version. [Shared adoption handoff](https://github.com/Amirkianfar66/GameN/issues/311#issuecomment-6980975772)

The canvas playback fix in #318 was based on #285 at `104a285d8250322e4f6f32552828586b44702401` and verified at runtime commit `602ac9693976e2b03a3b64121aa9b3d276aae729`. The released source was inspected on `origin/main` at `7574bfe5ce3d7acd12ed66eb8202187045817a24`. In the earlier #308 (`5f36e3f5`) and #314 (`a5a6cdff`) snapshots, the released SVG was in the `mountPregamePresentation()` overlay. Those snapshots predate the agreed placement change. [Playback fix](https://github.com/Amirkianfar66/GameN/issues/316)

From `apps/game/hosted/planet/pregame-scene.mjs`, the exact canonical imports for an admitted canvas boarding version are:

```js
import { createBoardingScene, prepareBoardingScene }
  from '../../../../design/phone-ui/components/boarding-film/boarding-film.mjs';
import '../../../../design/phone-ui/components/boarding-film/boarding-film.css';
```

The runtime graph has seven JavaScript modules and one stylesheet in this component. It imports the existing hosted crew, rig, film kit and public-roster validator. Never admit `preview/` or `review/`, and never copy the component into Frontend. The released `design/pregame-films/films.mjs` is a development catalog with review defaults, not the runtime factory.

**Preparation ownership:** `prepareBoardingScene(document, {roster, width, height})` returns a single-use handle. `ready` is a promise, whereas the scene's `ready()` is a method. The scene adopts a non-disposed handle on its **first matching paint**, not at creation; the sorted roster and physical pixel dimensions must match. Until then the caller owns it. A disposed, previously adopted or mismatched handle is ignored and the scene prepares fresh pictures. After adoption the scene owns the queue; calling the preparation handle's `dispose()` is harmless. On every exit call both `scene?.dispose()` and `prepared?.dispose()` and drop both references. This also covers a cancelled mount before its first paint, resizing, or a roster change. Do not reuse a handle for a second scene.

Preparing after the role film can be too late when everyone becomes Ready immediately. A candidate prewarm point is the initial twenty-second card interval once the final public roster is available, uniformly for every player and independent of their role. Frontend chooses this after measuring interference with the screen and device memory. Never delay or extend a server boundary to await preparation. `ready()` is for a check or recording, not a new game gate.

**Visibility and recovery:** `suspend()` cancels only the scene's own animation frame; it neither conceals its DOM nor stops picture preparation, and an explicit `paint()` still draws. For a hidden, blurred, stale or replaced surface, the existing player can dispose it immediately. On return, sample the authorized controller again and create a fresh scene at that elapsed time if the interval is still valid. Do not resume an old local clock or restart at zero. If retaining a scene is intentional, Frontend hides it, stops calling `paint`, calls `suspend()`, and resumes only with a fresh valid `paint(t, ...)`. The 500 ms coast is a fallback, not a privacy boundary. At the exact end, after local Skip, or after server exit, dispose. No scene callback advances the match.

**Timing and disclosure remain the existing contract:** the two-second brand intro is local; saved setup flow 3 uses the private role card for 0–20 seconds and that player's role film for 20–30 seconds; human Ready starts a separate public ten-second boarding interval only once everyone is ready. See [Backend's contract](../../backend/planet-phone-interface-contract.md#reading-and-manual-ready). The controller supplies elapsed server time and valid audiences. All nine roles remain available through uniform static imports (the Disablers share a film); no dealt-role file request, public role film, or role-dependent preparation is introduced. #305 remains parked, the Doctor study remains private, and the menu's brand still at 1,650 ms is unchanged.

**First test of the later canvas adoption.** Once Frontend has connected the SVG to `stage.film`, use that stage and controller in an isolated harness with the version selection above. On both 390 × 844 and 430 × 932, mount the canvas with eight public seats and check full and reduced motion, phone Skip, and playback on the shared display. For late entry and return from concealment, verify that an authorized elapsed time of 7,400 ms draws that moment. Verify cleanup on Skip, expiry, a changed roster or size, and unmount before preparation finishes. Extend to seven and nine seats and confirm a previously pinned match still selects the SVG. The later adoption requires the integrated sheet 19 comparison and Claude Lead Designer acceptance. The #318 browser record covers the film component by itself.

**Reproduced source faults and fix:** a controlled 30 Hz scheduler reduced a prepared scene to quality `0.5` even with zero simulated drawing cost. Prepared adaptive quality now uses the scene's own drawing duration rather than the gap between callbacks; sustained work over 22 ms still reduces quality. Unprepared lateness retains the 50 ms gap rule and does not poison the remembered prepared quality. This conservative measurement cannot diagnose GPU/compositor delay or establish a device's refresh rate. The same browser check reproduced adoption of a cancelled queue (`0` held pictures) and deletion of a mounted scene's pictures through its old preparation handle; explicit ownership now prevents both.

The focused check is `node design/tools/boarding-playback-check.mjs`. It writes a separate `review/playback-2026-11-18/` record and captures, preserving #285's historical measurements below. It uses actual canvas scenes with synthetic public rosters, controlled scheduler/drawing-cost regressions, and browser captures under the production response policy. Controlled cadence is not measured phone performance. Physical phones, Safari, VoiceOver, GPU pressure and the actual Frontend canvas mount remain unverified.

## Who is where: from the public roster alone

The film is given the public roster and nothing else: each member's seat and lobby character, 7, 8 or 9 of them, in seat order (the hosted game's own `publicRoster()`). It never receives a role, a team, a name or a status, so it cannot choose by one. Who plays which part is a fixed rule of seat order, the same on every phone and on the display:

| Part | Who |
| --- | --- |
| The four who walk in at dusk and climb the ramp first | The four lowest seats |
| The waist-up pair (the faces) | The fifth and sixth in seat order; the fifth is nearer the lens |
| Going in ahead, at the door | Whoever lies between the sixth and the last: nobody in a crew of 7, one in 8, two in 9 |
| The last aboard, who stops at the sill and looks back | The highest seat |
| Inside | Everyone, in rows filled from the back in seat order: the lowest seats stand at the back, the highest in front. Each holds one of three standing poses, by seat and row |

**Who looks back means nothing about the match.** It is the highest seat in every match, on every screen. If the owner would rather it were not tied to a seat, the rule can become any other function of the public roster, as long as every phone computes the same answer; that is a one-line change in `castOf()`.

## How it plays

- **Pictures are drawn once.** The ship, the hull's wall, and each crew member's body for each pose and head for each look (open, shut, bowed, from behind) are drawn from the approved drawing into pictures in memory, already lit: the film kit's own light recipe (the dark a figure stands in, a light landing on it, an edge of light) is put on as a picture is drawn. A figure whose light changes is two pictures, one over the other. In the dark corridor the edge of light is a backlight: only the outline takes it, where it faces up or to a side with nothing of the figure beyond, never where it faces down or another part of the figure.
- **A frame places pictures.** The sky, the giant, the ranges, the ground, the ramp and the corridor are laid on the canvas from shapes; pictures are placed on planes of depth. Soft light (glows, beams, the glare) is drawn on a second canvas a quarter of the size each way and stretched over the first, added to it (`mix-blend-mode: screen`). The vignette, the grade and the grain are CSS layers. No SVG is written, parsed or filtered while the film runs, and no canvas filter is used.
- **The crew moves on twos:** twelve drawings a second, as drawn animation does. The camera, the light and the air move at the screen's rate.
- **A slow phone gets a softer frame, not a slower one.** When frames run long, the frame is drawn a step less sharp (`QUALITY`: 1, 0.8, 0.64, 0.5 of the screen's pixels).
  - **With its pictures drawn,** the film's own drawing work slower than 22 ms counts (`SLOW_FRAME_MS`), eight samples with cheap samples reducing the count. Callback spacing alone is not drawing cost. The page remembers the step for the next film.
  - **While it is still drawing its pictures** (it was not prepared, or not in time), each gap between two frames holds a picture's drawing as well, so only a frame slower than 50 ms counts (`LATE_FRAME_MS`): the film as a whole is late. Its step down also re-plans the pictures it has not begun at the frame's own sharpness. A picture the frame cannot show in full is not worth its drawing time, and the smaller ones come sooner. The page does not remember such a step.
  - A film that draws its own pictures begins them at the step the page remembers.
- **A frame is a function of the time it is given.** The same time gives the same picture; seeking back gives what a film just begun draws there; a phone that joins late draws only what is left.
- **Within the hosted game's Content Security Policy:** nothing external, no evaluated code, no worker. A picture is made from the film's own SVG text through a `blob:` image; the grain's tile is a `data:` image.

## Measured

Historical measurements from [`review/check.json`](../../../design/phone-ui/components/boarding-film/review/check.json), made against `7470d62e`, before the 18 November playback fix. These numbers have not been remeasured for the changed adaptive-quality policy. Desktop Chromium, headless, drawing in software; 390 × 844 at 2 pixels a point. The slowdown is Chromium's throttle of the page's main thread, a rough stand-in for a slower phone. **No phone was measured: not its frame rate, and not its memory.**

Both films were played in real time and driven as the live player drives a film (a paint at most thirty times a second):

| Film | Pictures a second | With the CPU slowed 4x |
| --- | --- | --- |
| Today, `1.0.0` | 17.7 | 6.4 |
| The pilot, its pictures drawn first | **57.0** | **21.8** |
| The pilot, its pictures drawn as it plays | 33.6 | 13.3 |

One run each. The run before this one (`67fe6aa0`) gave 17.5 and 6.3, 53.7 and 21.0, 33.3 and 7.2, and the one before that (`0842ff6c`) 18.4 and 6.3, 56.4 and 20.2, 36.1 and 8.3: read each figure as good to a few per cent. The last figure is the exception, and the one the change since then was for: a film late with its pictures now steps its sharpness down (7.2, then 13.3).

Its pictures drawn first, the pilot keeps the screen's rate at this desktop's own speed: the page's frames came 16.8 ms apart at the middle, and none of the ten seconds' gaps was longer than 34 ms. Under today's film the page's frames came 37.7 ms apart at the middle and 141 gaps were longer than 34 ms: each of its paints rebuilds the picture's SVG (4,665 elements), and with the player painting at most thirty times a second it reached 17.7 pictures a second. To hold its rate the pilot drew its frame less sharp than the screen's pixels: 0.64 of them at this desktop's speed (499 × 1080 of 780 × 1688; 0.64 and 0.8 in the two runs before), and 0.5 slowed four times (390 × 844). This machine draws a canvas in software, so how far a phone steps down is not known from this. Today's film draws at the screen's full pixels at both speeds.

Its pictures drawn as it plays, the pilot shares the page's time with that drawing (5.9 s of it here, 5.5 s slowed four times). At this desktop's speed it is not late: it stays at full sharpness and reaches 33.6 pictures a second. Slowed four times it is late, so it steps down to 0.5 and draws the pictures still to come smaller (13.8 MB of them planned in place of 51.5 MB): 13.3 pictures a second, against 7.2 before that rule and today's 6.4. Its slowest shots ran at 8.5. **Prepare it** all the same: prepared, the same slowed page reaches 21.8. Drawing the pictures first took 3.8 s here and 16.7 s slowed four times.

What the pilot's pictures hold, all drawn at once (a crew of 8; a crew of 9 holds about the same):

| Frame | At 2 pixels a point | At 3 pixels a point |
| --- | --- | --- |
| 390 × 844 | 52.7 MB | 86.7 MB |
| 430 × 932 | 61.4 MB | 102.0 MB |

The budget is 112 MB (`MEMORY_BUDGET`): past it, the crew's pictures are drawn less sharp to fit. None of these four needed that. Pictures are given back as the film passes them, and all of them on `dispose()`. The two canvases themselves are about 15 MB more at 430 × 932 and 3 pixels a point.

## Evidence

In `design/phone-ui/components/boarding-film/review/`:

- `pilot-390x844.mp4`, `pilot-430x932.mp4`: the pilot, full motion, a crew of 8 (60 frames a second, exactly 10 s, no sound).
- `pilot-390x844-reduced.mp4`, `pilot-430x932-reduced.mp4`: Reduce motion.
- `pilot-display-1280x720.mp4`: the shared display's wide framing, a crew of 9.
- `compare-as-drawn.mp4`: today's film beside the pilot, both at every sixtieth of a second: what each film is.
- `compare-as-played.mp4`: the same two, each showing only the pictures it reached when it was played in real time with the CPU slowed 4x: what each film does. It is a reconstruction of measured timing (the times are in `renders.json`), not a screen recording, and not a phone.
- `pilot-sheet.jpg`: twelve moments side by side.
- 52 captures (twenty moments at both sizes in full motion, six again with the device's Reduce motion) and `check.json`, under the production headers.
- 15 captures of the display's wide framing at one pixel a point (`display-1280x720-…`: each shot, the corridor dark and lit, the mark, and the corridor with crews of 7 and 9; `display-1920x1080-…`: five of them).

## Limits

- **No phone was measured.** Every number above is desktop Chromium drawing in software. A phone draws a canvas on its graphics chip, which this machine does not have; that should help, and it is not evidence.
- **The display** (a wide screen) draws from the same source with wider framing: rows of four and five in the corridor. It is captured at 1280 × 720 and 1920 × 1080 at one pixel a point, and rendered whole at 1280 × 720. A larger or sharper screen (4K, or two pixels a point) was not run.
- **Sound** is a separate owner decision; the film has none.
- **The light's layer** needs `mix-blend-mode: screen` (Safari 8 and later, every current browser). Without it the light would lie over the picture as haze.
- **A first film on a slow phone** starts sharp and steps down over its first second or two; later films on the same page start at the step it settled on.
- **A film that was not prepared, on a slow phone,** is still the weak case, less than it was: it now steps its sharpness down while it draws its pictures, and with the CPU slowed 4x it reached 13.3 pictures a second against today's 6.4 and the prepared film's 21.8. Its first shot is its slowest (8.5 pictures a second), and its pictures stay softer for the whole film. Preparing avoids both.
- **Only the boarding is restaged.** The role films, the brand intro and the films behind the board are as they were.

## Checks

```
node design/tools/boarding-film-check.mjs      # captures, probe, memory, both films measured; writes review/check.json
node design/tools/boarding-film-render.mjs     # the review videos; writes review/renders.json
npm run test:design                            # packages/design-tokens/test/boarding-film.test.mjs among them
```

Both tools need a Chromium-based browser (`CHROME_PATH`); the renderer needs ffmpeg. A record is made against a committed, clean source.
