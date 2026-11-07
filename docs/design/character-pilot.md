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

**The owner's review of the first renders, the same day:** "You did a good job on rigging and the body and dress, but the face is not good! I created an example as a better face". The owner sent a repainted Mira. The faces are redrawn in its language (below); the rig, the body and the suit are kept as they were.

## What to look at

- **Renders:**
  - [`design/character-pilot/review/sheet.png`](../../design/character-pilot/review/sheet.png): the portraits, today's figure beside the pilot (front and back), the rig's gestures in the new style, the sizes they are seen at, and the colours.
  - [`motion.mp4`](../../design/character-pilot/review/motion.mp4): the three characters idling, walking and waving on a noir stage, 9.6 s, silent.
- **Live:** `node design/tools/serve.mjs`, then `/character-pilot/review.html?view=sheet` or `?view=motion` (it plays).
- **Render again:** `node design/tools/character-pilot-render.mjs` (needs `CHROME_PATH` and ffmpeg).

## The style

- **Noir light.** The key light comes from the upper left, as in the rig. Every form's far side falls into a hard cel shadow, hatched with ink, and a cool rim light catches its edge. On the dark stage the figures stand out by their rims.
- **Comic-book ink.** Every form is inked with a brush ribbon, not a hairline. The line is heavy on the side away from the light and thin on the lit side, and details are drawn with tapered strokes.
- **A hand-drawn line.** Outlines waver slightly, and the waver belongs to the shape, so it does not crawl between frames. Fills carry a faint scratched texture, as if inked on paper. The aim is the owner's sheet's gothic, hand-made feel; nothing is taken from another game.
- **Proportions.** The owner's sheet's proportions are followed:
  - the heads are a little larger than the rig's (1.5 against 1.32);
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
| Atlas (`c4`) | A swept-up crop with tufts, a mustache and a goatee, stubble | Heavy: broad shoulders, thicker limbs and neck, a belly | Green ground, deep green accent |

The skin tones and hair colours follow the owner's sheet. Mira's skin is lighter than her current token.

### Faces, from the owner's example

- **Eyes.** Big almond eyes:
  - the dark iris fills the eye's height, with a catch-light, and looks left;
  - the white shows beside it;
  - a heavy lash line lifts past the outer corner into a small wing, with a thin lower lid.
  - Atlas's eyes are hooded and narrower, without a wing.
- **Brows.** Full and dark, thick toward the nose and tapering out: arched for Mira, straighter for Nova, low and heavy for Atlas.
- **Nose and mouth.** A small nose by the far cheek and a small, slightly parted mouth with a hint of lower lip, both drawn inside the face.
- **Face shape.** A soft oval with a small chin; Atlas's broader and squarer.
- **Hair framing.** For Mira and Nova, the hair frames the face on both sides: a fall behind the far cheek as well as behind the ear.
- **Cheeks and skin.** The cheeks are modelled in a deeper skin tone, not pink: a pink blush comes within 16 to 26 (CIE76) of the red team's colour. The skin is clean, without the paper texture.
- **Blinks and looking down.** The upper lid closes onto the lower, and the iris goes with it.

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

Each portrait is a character's head and shoulders in the continuous-corner rounded square of an iOS app icon (a superellipse, n = 5), not a plain rounded rectangle. As on the owner's sheet it has a white rim and a soft shadow. Inside are the character's colour under a noir vignette, painted brush strokes and the shoulders with their pads. On the motion stage the portraits blink with their figures. They read at 64 and 44 px.

## Animation

The pilot plays on the rig's own skeletons and easing curves. It adds the overlapping action that makes a figure feel alive:
- **Idle:**
  - breathing lifts the chest, then the shoulders;
  - the weight shifts slowly;
  - the head drifts and tilts;
  - the blinks are irregular (every 2.4 to 4.6 s), each 170 ms: quick to close, slower to open;
  - the hair answers the head half a second late.
- **Walk:** the rig's walk with a longer stride and a counter-tilt of the head. The hair streams behind and bounces a beat after the body.
- **Wave:**
  - an anticipation dip, a snapped raise;
  - three swings of the forearm about the elbow, easing in and out;
  - an eased settle back to standing.

Every frame is a pure function of time and a character's seed, so a frame looks the same every time and on every screen.

## How it is built

The pilot is a new skin over the approved rig, kept beside it in `design/character-pilot/`:
- `ink.mjs`: the brush ribbon, waver, noir cel shadow, hatching, rim light, texture, and the squircle.
- `cast.mjs`: the three characters, the suit, the builds and the colour proposals.
- `head.mjs`: the heads, front, looking down and from behind, with blink and hair follow-through.
- `figure.mjs`: the suit drawn on any skeleton.
- `portrait.mjs`: the portraits.
- `anim.mjs`: idle, walk and wave.
- `review.html` and `review.mjs`: the review page.

It reads the rig's frame, joints, gestures, walk and easing (`design/board-motion/figures/`), and changes none of them. Those files are frozen drawing sources, pinned by hash for Frontend's reviewed ports. Every gesture of the rig draws in the new style, so the board's places, the moves and the films' poses carry over.

## What adoption would take

The pilot is not wired into anything. Adopting the style for the game would be its own decision and change:
- **The owner.** Approve the pilot, or ask for changes, then the other six characters (Vega, Rigel, Lyra, Orion, Juno slim, Echo with the violet above).
- **Designer.**
  - Draw the six.
  - Replace the frozen rig's drawing (`body.mjs`, `crew.mjs`, `parts.mjs`, `rig.mjs`) with the new skin, as a new reviewed version.
  - Update the crew colour tokens.
  - Re-render the board and every film that draws a character: the role films, the openings and the cinematic library.
- **Frontend.** Re-port the reviewed drawing and re-review it.
- **Integration.** Re-pin the drawing sources (`design/tools/lib/reviewed-drawing-ports.json`).
- **Cost.** The new ink draws more than today's: each form is drawn with its shadow, rim and texture. A pilot figure is about 73 to 75 KB of SVG, standing or walking, against 20 to 22 KB today (about 3.5 times). A runtime should draw a pose once and move it rather than rebuild every frame.

## Checks

- **Renders** (desktop Chromium through the repository's own DevTools driver; ffmpeg):
  - `motion.mp4`: exactly 288 frames at 30 fps (9.600 s), 1920 × 1080, H.264, no audio stream.
  - `sheet.png` and `motion-poster.png`: stills.
  - `renders.json` records every file's SHA-256, and a test checks them.
- **Watched:**
  - every render;
  - each character at full size, standing and in four of the rig's gestures, from the front and from behind;
  - the walk at four phases and the wave at its beats;
  - the portraits at 230, 64 and 44 px.
- **Tests:** `packages/design-tokens/test/character-pilot.test.mjs` checks:
  - the owner's decisions;
  - the colour distances;
  - that all 27 gestures, the walk and the three actions draw well-formed SVG for each character;
  - determinism;
  - blink timing, the walk's loop and the wave's settle;
  - the squircle;
  - the render record.
- **Not tested:** no phone, tablet or display was tried; every frame is desktop Chromium. The pilot's drawing cost on a phone is unmeasured. The other six characters are not drawn.
