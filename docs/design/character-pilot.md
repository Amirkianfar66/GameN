# Character pilot: Mira, Nova and Atlas in the new style

**Status: a proposal for the owner's review. Nothing here is adopted: the game, the board, the films and the approved rig are unchanged.**

The owner drew a redesign of the nine crew members: portraits in app-icon frames and full figures in a two-tone suit. The owner then asked whether it was better and possible. The answer was yes, as a restyle of the code-drawn rig, starting with a pilot of three characters. The owner's decisions of 7 November 2026 set the pilot (recorded in [owner-decisions.md](owner-decisions.md)).

| # | The owner's words | What the pilot does |
| --- | --- | --- |
| 1 | "I am Agree with Pilot first … starting with Pilot with 3 of them" | Three characters: Mira, Nova and Atlas |
| 2 | "do not keep hejab it is not hood for rigging" | Mira has long wavy hair, parted on the far side, as the redesign sheet draws her |
| 3 | "Colors as recommend and the icon border like IOS style" | Nova's pink and Echo's purple move away from the team colours (below); the portraits are framed as iOS app icons |
| 4 | "You can change them 1 fat or thinner" | Atlas and Juno are told apart by build: Atlas is the heavy one |
| 5 | "I created the images I wanted to inspire by the dont starve together style … the main Goal is give the design of game style and more like AAA animation but with a specific style Noir, Comic book Style" | A noir, comic-book look with a hand-drawn line, in the redesign's spirit, and animation with the follow-through of a polished production |

**The owner's reviews, the same day.**
- Of the first renders: "You did a good job on rigging and the body and dress, but the face is not good! I created an example as a better face", with a repainted Mira.
- Of the faces redrawn after the example: "Still the faces are not good enough". The owner asked whether projects such as Faces.js, Bean Heads or the Cubism Web Samples could help. Designer recommended tracing the owner's own art instead, and the owner answered: "yes go as you recommended".

So the faces are now the owner's own drawings, traced and rigged (below). The rig, the body and the suit are kept.

## What to look at

- **Renders:**
  - [`design/character-pilot/review/sheet.png`](../../design/character-pilot/review/sheet.png): the portraits; the faces open, blinking and looking down; today's figure beside the pilot (front and back); the rig's gestures in the new style; the sizes they are seen at; and the colours.
  - [`motion.mp4`](../../design/character-pilot/review/motion.mp4): the three characters idling, walking and waving on a noir stage, 9.6 s, silent.
- **Live:** `node design/tools/serve.mjs`, then `/character-pilot/review.html?view=sheet` or `?view=motion` (it plays).
- **Render again:** `node design/tools/character-pilot-render.mjs` (needs `CHROME_PATH` and ffmpeg).

## The style

- **Noir light.** The key light comes from the upper left, as in the rig. Every form of the body falls into a hard cel shadow on its far side, hatched with ink, and a cool rim light catches its edge. On the dark stage the figures stand out by their rims. The heads keep the owner's own shading and line.
- **Comic-book ink.** Every form is inked with a brush ribbon, not a hairline. The line is heavy on the side away from the light and thin on the lit side, and details are drawn with tapered strokes.
- **A hand-drawn line.** Outlines waver slightly, and the waver belongs to the shape, so it does not crawl between frames. Fills carry a faint scratched texture, as if inked on paper. The aim is the owner's sheet's gothic, hand-made feel; nothing is taken from another game.
- **Proportions:**
  - the head is as large against the body as in the owner's example of Mira (the head frame at 1.2);
  - the trousers are cut loose;
  - the boots are chunky.

## The characters

Everyone wears the redesign's suit:
- warm canvas fronts with charcoal side panels;
- loose cargo trousers with dark knee pads and a thigh pocket;
- tall lace-up boots.

Each character's colour is on the shoulder pads, collar, cuffs, buckle and boot bands. Nothing on anyone says a role or a team.

| Character | Head | Build | Colours |
| --- | --- | --- | --- |
| Mira (`c8`) | Long, wavy, side-parted hair falling to the shoulders; no hijab | Regular | Tan accent and ground |
| Nova (`c6`) | A blunt bob with straight bangs; headphones, their ring in her colour | Slim | Magenta-pink (`#C2408F`), wine accent (`#8F2E6A`) |
| Atlas (`c4`) | A swept-up crop with tufts, a mustache, stubble on the chin | Heavy: broad shoulders, thicker limbs and neck, a belly | Green ground, deep green accent |

The skin and hair colours are the traced art's, so the neck and hands match the face.

### Faces traced from the owner's art

- **The sources.**
  - Mira's head is traced from the owner's example of 7 November 2026.
  - Nova's and Atlas's heads are traced from the portraits on the owner's redesign sheet, mirrored to face left as the rig's figures do.
  - The crops are kept in `design/character-pilot/faces/source/`. They are the owner's own art; the owner did not say which tool made the images.
- **The tracing.** `design/tools/character-pilot-trace.py`, for each head:
  - removes the ground and cuts the neck and shoulders away under the jaw;
  - traces the head into filled shapes (vtracer, MIT-licensed);
  - smooths the pixels' steps out of every outline and simplifies it to within a third of a source pixel;
  - fits the head to the rig's head frame by the eyes' midpoint and the chin.

  The tool needs Python with vtracer and Pillow. Only someone re-tracing needs them: its outputs, `faces/*.mjs`, are committed.
- **Colours.**
  - A traced colour within 31 (CIE76) of a team colour is moved just far enough away, by taking a little red out at the same lightness. This touched 25 of Mira's warm shading tones, each slightly.
  - Nova's pinks take her proposed magenta, as her accent does.
  - Atlas's colours are unchanged.
  - Every colour drawn stays at least 30 from each team colour, as the game requires.
- **What the rig adds:**
  - **Blinks.** A lid in the head's skin comes down over each drawn eye, its edge inked as a lash line. Shut, it lies along the lower lid. Looking down shuts the eyes the same way.
  - **Hair.** Mira's hair below the jaw swings and lifts with the follow-through, a beat behind the head; above the jaw the drawing holds still. Nova's bob and Atlas's crop do not hang, so they move with the head.
  - **The neck** leaves the jaw where each drawing has it, behind the chin, and runs down into the collar.
  - **From behind**, the head is drawn in the traced colours and sized to the traced head.
- **Why tracing and not a face library.** Faces.js and Bean Heads generate faces in their own styles, and the Cubism Web Samples animate models made in Live2D's editor. Tracing keeps the owner's line, shapes and colours.

## Colours

The redesign sheet's pink and purple came too close to the team colours, which no character may suggest. The game keeps every colour at least 30 (CIE76) from each faction's accent (blue `#70AFFF`, red `#FF8C8C`, Alien `#C4A4FF`).

| Character | Use | Today | The sheet | Proposed | Nearest team colour, proposed |
| --- | --- | --- | --- | --- | --- |
| Nova | field | `#EE7FAE` (25.8 from red) | `#D9507F` (27.7 from red) | `#C2408F` | 44.7 (red) |
| Nova | accent | `#B5447A` | `#C74F66` | `#8F2E6A` | 48.2 (red) |
| Echo | field | `#39404E` | `#6E60A8` (29.4 from the Alien) | `#5A4F7E` | 41.9 (blue) |
| Echo | accent | `#1C212B` | `#4E4478` | `#3F3A5E` | 51.4 (blue) |

Echo is not in the pilot; the proposal is recorded so the other six start from it. A test checks every colour the pilot draws.

## The portraits

Each portrait is a character's head and shoulders in the continuous-corner rounded square of an iOS app icon (a superellipse, n = 5), not a plain rounded rectangle. As on the owner's sheet:
- it has a white rim and a soft shadow;
- inside are the character's colour under a noir vignette, painted brush strokes, and the shoulders with their pads;
- the face sits a little left of the middle, so the hair and headphones fit.

On the motion stage the portraits blink with their figures. They read at 64 and 44 px.

## Animation

The pilot plays on the rig's own skeletons and easing curves. It adds the overlapping action that makes a figure feel alive:
- **Idle:**
  - breathing lifts the chest, then the shoulders;
  - the weight shifts slowly;
  - the head drifts and tilts;
  - the blinks are irregular (every 2.4 to 4.6 s), each 170 ms: quick to close, slower to open;
  - Mira's hair answers the head half a second late.
- **Walk:** the rig's walk with a longer stride and a counter-tilt of the head. Mira's hair streams behind and bounces a beat after the body.
- **Wave:**
  - an anticipation dip, a snapped raise;
  - three swings of the forearm about the elbow, easing in and out;
  - an eased settle back to standing.

Every frame is a pure function of time and a character's seed, so a frame looks the same every time and on every screen.

## How it is built

The pilot is a new skin over the approved rig, kept beside it in `design/character-pilot/`:
- `ink.mjs`: the brush ribbon, waver, noir cel shadow, hatching, rim light, texture, and the squircle.
- `cast.mjs`: the three characters, the suit, the builds and the colour proposals.
- `faces/`: the traced heads (`mira.mjs`, `nova.mjs` and `atlas.mjs`, generated by `design/tools/character-pilot-trace.py`) and the crops they were traced from (`faces/source/`).
- `head.mjs`: the heads, front, looking down and from behind: the traced art with its lids and Mira's swinging hair.
- `figure.mjs`: the suit drawn on any skeleton, with the neck where each drawing has it.
- `portrait.mjs`: the portraits.
- `anim.mjs`: idle, walk and wave.
- `review.html` and `review.mjs`: the review page.

It reads the rig's frame, joints, gestures, walk and easing (`design/board-motion/figures/`), and changes none of them. Those files are frozen drawing sources, pinned by hash for Frontend's reviewed ports. Every gesture of the rig draws in the new style, so the board's places, the moves and the films' poses carry over.

One fix in the pilot's own ink: the ends of its limbs were drawn curving inward. That left gaps at the hips of seated figures and in the neck under the traced heads. The ends are round now. The rig is not affected.

## What adoption would take

The pilot is not wired into anything. Adopting the style for the game would be its own decision and change:
- **The owner.** Approve the pilot, or ask for changes, then the other six characters (Vega, Rigel, Lyra, Orion, Juno slim, Echo with the violet above).
- **Designer.**
  - Trace the six from the owner's sheet, and rig them. The sheet's portraits are about 310 px across; larger drawings would trace finer.
  - Replace the frozen rig's drawing (`body.mjs`, `crew.mjs`, `parts.mjs`, `rig.mjs`) with the new skin, as a new reviewed version.
  - Update the crew colour tokens.
  - Re-render the board and every film that draws a character: the role films, the openings and the cinematic library.
- **Frontend.** Re-port the reviewed drawing and re-review it.
- **Integration.** Re-pin the drawing sources (`design/tools/lib/reviewed-drawing-ports.json`).
- **Cost.** The new look draws more than today's. A pilot figure is about 94 to 97 KB of SVG, standing or walking, against 20 to 22 KB today (about 4.5 times). The traced head is 30 to 35 KB of it, defined once and drawn by reference. A runtime should draw a pose once and move it rather than rebuild every frame.

## Checks

- **Renders** (desktop Chromium through the repository's own DevTools driver; ffmpeg):
  - `motion.mp4`: exactly 288 frames at 30 fps (9.600 s), 1920 × 1080, H.264, no audio stream.
  - `sheet.png` and `motion-poster.png`: stills.
  - `renders.json` records every file's SHA-256, and a test checks them.
- **Watched:**
  - every render;
  - each traced head beside the drawing it came from, large;
  - the lids half and fully closed, and looking down;
  - the necks and Mira's swinging hair, close up;
  - each character at the size of the owner's example beside it, standing, in four of the rig's gestures, from the front and from behind, and seated;
  - the walk at four phases and the wave at its beats;
  - the portraits beside the owner's icons, and at 230, 64 and 44 px.
- **Tests:** `packages/design-tokens/test/character-pilot.test.mjs` checks:
  - the owner's decisions;
  - the colour distances, of every colour drawn;
  - the traced faces: each kept source, the fit to the head frame, and the skin shared with the neck and hands;
  - what the rig moves on them: the lids, looking down, and Mira's hair only;
  - that all 27 gestures, the walk and the three actions draw well-formed SVG for each character;
  - determinism;
  - blink timing, the walk's loop and the wave's settle;
  - the squircle;
  - the render record.
- **Not tested:**
  - No phone, tablet or display was tried; every frame is desktop Chromium. The pilot's drawing cost on a phone is unmeasured.
  - The tests do not run the trace tool; they check its committed outputs.
  - The other six characters are not drawn.
