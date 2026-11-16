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
| `boarding-film.mjs` | `createBoardingScene()`, `prepareBoardingScene()`, `boardingFrame()`, `shotOf()`, `BOARDING_FILM_VERSION`, `BOARDING_MS`, `BOARDING_TEXT`, `SHOTS`, `DOOR_BEATS`, `HULL_WAKE`, `INSIDE`, `TITLE`, `STILLS`, `STILL_FADE_MS`, `STILL_OUT`, `COAST_MS`, `MEMORY_BUDGET`, `QUALITY`, `SLOW_FRAME_MS`, `SLOW_FRAMES`, `VARIANTS`. The clock, the six shots and the scene |
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

It is a drop-in for the boarding kind of the pre-game player's scene (`createPregameScene(picture, { kind: 'boarding', options })` in `apps/game/hosted/planet/pregame-scene.mjs`): the same `paint`, `dispose` and `stats`. It mounts in the boarding stage's film element ([#272](https://github.com/Amirkianfar66/GameN/pull/272), `stage.film`) unchanged.

```js
import { createBoardingScene, prepareBoardingScene } from '…/boarding-film/boarding-film.mjs';
// and link …/boarding-film/boarding-film.css

const scene = createBoardingScene(holder, { options: { roster } });
scene.paint(t, { width, height, variant });   // each time the player paints, as today
scene.dispose();                              // on every exit, as today
```

| Part | What it is |
| --- | --- |
| `holder` | The element the film fills. The film appends one element, `.ms-boarding-film` (`aria-hidden="true"`, `pointer-events: none`), sized by `paint`'s `width` and `height` |
| `options.roster` | The public roster: 7, 8 or 9 members, each `{ seat, character }` (`c1`–`c9`). It goes through the hosted game's own `publicRoster()`; nothing else of a member is read, and nothing private can reach a picture |
| `paint(t, { width, height, variant })` | Draws the film at `t` ms after the boarding interval's `startsAt` (server now − `startsAt`), clamped to 0–10,000. `variant` is `'full'` or `'reduced'`. The device's Reduce motion gives the held pictures whatever is asked |
| Between paints | The scene keeps the picture moving from the last time it was given, at the screen's rate: the player may go on painting 30 times a second. It stops by itself 500 ms after the last paint (`COAST_MS`) and at the film's end |
| `suspend()`, `resume()` | `suspend()` stops the scene's own frames (the page is hidden, the stage is covered); a paint still draws its frame. After `resume()` the next paint restarts them. A page that stops painting needs neither: the scene stops by itself |
| `dispose()` | Removes the film and gives back every picture's memory |
| `stats` | `version`, `paints`, `frames`, `ownFrames`, `drawMs`, `worstMs`, `pictures`, `bytes`, `peakBytes`, `plannedBytes`, `bakeMs`, `longestBakeMs`, `scale`, `quality`, `sharp` |
| `ready()` | Resolves when every picture asked for so far is drawn. A recording waits for it; the film does not |
| `createBoardingScene(holder, { options, live: false })` | Draws only when painted (a recording, a test): the scene then never asks for a frame |

**The film never advances the game.** It takes no callback, listens for nothing and tells no one; its end means nothing. Skip stays the stage's and the player's, local.

**Its words stay the player's.** The picture is hidden from a screen reader. The player keeps the dialog's name ("The crew boards the ship") and the status line ("The crew boards the ship."); `BOARDING_TEXT` is the same text.

**Preparing early (recommended).** `prepareBoardingScene(document, { roster, width, height })` draws the film's pictures ahead of it and returns what `createBoardingScene` takes as `options.prepared` (the same roster and size), with `ready` and `dispose()`. Call it once the roster is public and the page is quiet, for example when the player's own role film has ended. Drawing took 3.6 s on this desktop and 16.4 s with its CPU slowed 4x, in short pieces that leave the page its turns; a phone's time is not known. Without it the film draws its pictures as it opens: it comes up from the night as version 1's held pictures do, each shot's place and one pose of each figure come first, and a figure whose picture is not ready yet holds its nearest pose.

**What Frontend and Integration decide:** admitting the film's files to the hosted build; linking its stylesheet; when to prepare; and that a match pinned to `1.0.0` keeps `1.0.0`.

## How it plays

- **Pictures are drawn once.** The ship, the hull's wall, and each crew member's body for each pose and head for each look (open, shut, bowed, from behind) are drawn from the approved drawing into pictures in memory, already lit: the film kit's own light recipe (the dark a figure stands in, a light landing on it, an edge of light) is put on as a picture is drawn. A figure whose light changes is two pictures, one over the other. In the dark corridor the edge of light is a backlight: only the outline takes it, where it faces up or to a side with nothing of the figure beyond, never where it faces down or another part of the figure.
- **A frame places pictures.** The sky, the giant, the ranges, the ground, the ramp and the corridor are laid on the canvas from shapes; pictures are placed on planes of depth. Soft light (glows, beams, the glare) is drawn on a second canvas a quarter of the size each way and stretched over the first, added to it (`mix-blend-mode: screen`). The vignette, the grade and the grain are CSS layers. No SVG is written, parsed or filtered while the film runs, and no canvas filter is used.
- **The crew moves on twos:** twelve drawings a second, as drawn animation does. The camera, the light and the air move at the screen's rate.
- **A slow phone gets a softer frame, not a slower one.** When frames run long, the frame is drawn a step less sharp (`QUALITY`: 1, 0.8, 0.64, 0.5 of the screen's pixels), and the page remembers the step for the next film.
- **A frame is a function of the time it is given.** The same time gives the same picture; seeking back gives what a film just begun draws there; a phone that joins late draws only what is left.
- **Within the hosted game's Content Security Policy:** nothing external, no evaluated code, no worker. A picture is made from the film's own SVG text through a `blob:` image; the grain's tile is a `data:` image.

## Measured

From [`review/check.json`](../../../design/phone-ui/components/boarding-film/review/check.json), made against `0842ff6c`. Desktop Chromium, headless, drawing in software; 390 × 844 at 2 pixels a point. The slowdown is Chromium's throttle of the page's main thread, a rough stand-in for a slower phone. **No phone was measured: not its frame rate, and not its memory.**

Both films were played in real time and driven as the live player drives a film (a paint at most thirty times a second):

| Film | Pictures a second | With the CPU slowed 4x |
| --- | --- | --- |
| Today, `1.0.0` | 18.4 | 6.3 |
| The pilot, its pictures drawn first | **56.4** | **20.2** |
| The pilot, its pictures drawn as it plays | 36.1 | 8.3 |

Its pictures drawn first, the pilot keeps the screen's rate at this desktop's own speed: the page's frames came 16.7 ms apart at the middle, and 2 of the ten seconds' gaps were longer than 34 ms. Under today's film the page's frames came 33.4 ms apart at the middle and 137 gaps were longer than 34 ms: each of its paints rebuilds the picture's SVG (4,665 elements), and with the player painting at most thirty times a second it reached 18.4 pictures a second. To hold its rate the pilot drew its frame a step less sharp than the screen's pixels: 0.8 of them at this desktop's speed (624 × 1350 of 780 × 1688), and 0.5 slowed four times (390 × 844). This machine draws a canvas in software, so how far a phone steps down is not known from this. Today's film draws at the screen's full pixels at both speeds.

Its pictures drawn as it plays, the pilot shares the page's time with that drawing (6.0 s of it here, 5.1 s slowed four times, where it also goes without the drawings it can spare) and stays at full sharpness while it does so. Slowed four times it reaches 8.3 pictures a second: more than today's film, and not what the pilot is for. **Prepare it.** Drawing the pictures first took 3.6 s here and 16.4 s slowed four times.

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
- `compare-as-drawn.mp4`: today's film beside the pilot, both at every sixtieth of a second: what each film is.
- `compare-as-played.mp4`: the same two, each showing only the pictures it reached when it was played in real time with the CPU slowed 4x: what each film does. It is a reconstruction of measured timing (the times are in `renders.json`), not a screen recording, and not a phone.
- `pilot-sheet.jpg`: twelve moments side by side.
- 52 captures (twenty moments at both sizes in full motion, six again with the device's Reduce motion) and `check.json`, under the production headers.

## Limits

- **No phone was measured.** Every number above is desktop Chromium drawing in software. A phone draws a canvas on its graphics chip, which this machine does not have; that should help, and it is not evidence.
- **The display** (a wide screen) draws from the same source with wider framing. It was looked at, not captured or reviewed here.
- **Sound** is a separate owner decision; the film has none.
- **The light's layer** needs `mix-blend-mode: screen` (Safari 8 and later, every current browser). Without it the light would lie over the picture as haze.
- **A first film on a slow phone** starts sharp and steps down over its first second or two; later films on the same page start at the step it settled on.
- **A film that was not prepared, on a slow phone,** is the weak case: while its pictures are still being drawn it does not step its sharpness down, and with the CPU slowed 4x it reached 8.3 pictures a second against today's 6.3. Preparing avoids it. Letting it step down while it draws is the first thing to harden if the pilot goes forward.
- **Only the boarding is restaged.** The role films, the brand intro and the films behind the board are as they were.

## Checks

```
node design/tools/boarding-film-check.mjs      # captures, probe, memory, both films measured; writes review/check.json
node design/tools/boarding-film-render.mjs     # the review videos; writes review/renders.json
npm run test:design                            # packages/design-tokens/test/boarding-film.test.mjs among them
```

Both tools need a Chromium-based browser (`CHROME_PATH`); the renderer needs ffmpeg. A record is made against a committed, clean source.
