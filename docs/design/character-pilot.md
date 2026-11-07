# Character pilot and crew: the owner's redesign in the new style

**Status: the pilot of three was approved by the owner on 7 November 2026 ("i am happy with results"), and the owner asked for the other six ("Go a head with all of them"). The whole crew of nine is drawn here for the owner's check. Nothing is adopted yet: the game, the board, the films and the approved rig are unchanged until the change described in [What adoption would take](#what-adoption-would-take).**

The owner drew a redesign of the nine crew members: portraits in app-icon frames and full figures in a two-tone suit. The owner then asked whether it was better and possible. The answer was yes, as a restyle of the code-drawn rig, starting with a pilot of three characters. The owner's decisions of 7 November 2026 set the pilot (recorded in [owner-decisions.md](owner-decisions.md)).

| # | The owner's words | What the pilot does |
| --- | --- | --- |
| 1 | "I am Agree with Pilot first … starting with Pilot with 3 of them" | Three characters first: Mira, Nova and Atlas |
| 2 | "do not keep hejab it is not hood for rigging" | Mira has long wavy hair, parted on the far side, as the redesign sheet draws her |
| 3 | "Colors as recommend and the icon border like IOS style" | Nova's pink and Echo's purple move away from the team colours (below); the portraits are framed as iOS app icons |
| 4 | "You can change them 1 fat or thinner" | Atlas and Juno are told apart by build: Atlas is heavy, Juno slim |
| 5 | "I created the images I wanted to inspire by the dont starve together style … the main Goal is give the design of game style and more like AAA animation but with a specific style Noir, Comic book Style" | A noir, comic-book look with a hand-drawn line, in the redesign's spirit, and animation with the follow-through of a polished production |

**The owner's reviews, the same day.**
- Of the first renders: "You did a good job on rigging and the body and dress, but the face is not good! I created an example as a better face", with a repainted Mira.
- Of the faces redrawn after the example: "Still the faces are not good enough". The owner asked whether projects such as Faces.js, Bean Heads or the Cubism Web Samples could help. Designer recommended tracing the owner's own art instead, and the owner answered: "yes go as you recommended".
- Of the traced faces on the rig: "i am happy with results". The pilot is approved as drawn.
- Asked whether to carry it to the other six: "Go a head with all of them". Vega, Rigel, Lyra, Orion, Juno and Echo are traced and rigged the same way (below).

So every face is the owner's own drawing, traced and rigged (below). The rig, the body and the suit are kept.

## What to look at

- **Renders:**
  - The crew: [`design/character-pilot/review/crew-sheet.png`](../../design/character-pilot/review/crew-sheet.png) and [`crew-motion.mp4`](../../design/character-pilot/review/crew-motion.mp4). The sheet shows:
    - the nine portraits;
    - the faces open, blinking and looking down;
    - each character from the front and from behind;
    - three of the rig's gestures each;
    - the sizes they are seen at;
    - the colours.

    The film has the nine idling, walking and waving on a noir stage, 9.6 s, silent.
  - The pilot, as approved: [`sheet.png`](../../design/character-pilot/review/sheet.png) and [`motion.mp4`](../../design/character-pilot/review/motion.mp4), unchanged.
- **Live:** `node design/tools/serve.mjs`, then `/character-pilot/review.html?view=crew` or `?view=crew-motion` (it plays); `?view=sheet` and `?view=motion` for the pilot.
- **Render again:** `node design/tools/character-pilot-render.mjs`, or `--only sheet|motion|crew|crew-motion` (needs `CHROME_PATH` and ffmpeg).

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
| Vega (`c1`) | Full curly hair in a headband, round glasses, an earring | Regular | Orange ground and accent |
| Rigel (`c2`) | A knitted beanie, ginger hair and a full beard | Regular | Yellow ground, ochre accent |
| Lyra (`c3`) | Hair up in a bun with a lime tie, loose strands, an earring | Slim | Lime ground, olive accent |
| Atlas (`c4`) | A swept-up crop with tufts, a mustache, stubble on the chin | Heavy: broad shoulders, thicker limbs and neck, a belly | Green ground, deep green accent |
| Orion (`c5`) | Bald, with wild white hair at the sides and a full white beard | Regular | Teal ground and accent |
| Nova (`c6`) | A blunt bob with straight bangs; headphones, their ring in her colour | Slim | Magenta-pink (`#C2408F`), wine accent (`#8F2E6A`) |
| Juno (`c7`) | Messy hair with goggles pushed up, stubble | Slim, so never mistaken for Atlas | Brown ground and accent |
| Mira (`c8`) | Long, wavy, side-parted hair falling to the shoulders; no hijab | Regular | Tan accent and ground |
| Echo (`c9`) | Long locs and a visor over the eyes | Regular | Dusty violet (`#5A4F7E`), deep violet accent (`#3F3A5E`) |

The skin and hair colours are the traced art's, so the neck and hands match the face.

### Faces traced from the owner's art

- **The sources.**
  - Mira's head is traced from the owner's example of 7 November 2026.
  - The other eight heads are traced from the portraits on the owner's redesign sheet, mirrored to face left as the rig's figures do.
  - The crops are kept in `design/character-pilot/faces/source/`. They are the owner's own art; the owner did not say which tool made the images.
- **The tracing.** `design/tools/character-pilot-trace.py`, for each head:
  - removes the ground and cuts the neck and shoulders away under the jaw;
  - also removes the ground where the drawing encloses it, from points given by hand: inside Vega's glasses beside the face, between strands of Lyra's hair;
  - takes the icon's white rim and page first and the ground after them, for Orion, so the fill cannot run on into the white hair;
  - traces the head into filled shapes (vtracer, MIT-licensed);
  - smooths the pixels' steps out of every outline and simplifies it to within a third of a source pixel;
  - fits the head to the rig's head frame by the eyes' midpoint and the chin. Rigel's and Orion's chins are under their beards and Echo's eyes behind the visor, so those landmarks are set where the other faces have them.

  The tool needs Python with vtracer and Pillow. Only someone re-tracing needs them: its outputs, `faces/*.mjs`, are committed.
- **Colours.**
  - A traced colour within 31 (CIE76) of a team colour is moved just far enough away, by taking a little red out at the same lightness. This touched 25 of Mira's warm shading tones, each slightly.
  - Nova's pinks take her proposed magenta, as her accent does.
  - No other head needed a change.
  - Every colour drawn stays at least 30 from each team colour, as the game requires.
- **What the rig adds:**
  - **Blinks.** A lid in the head's skin comes down over each drawn eye, its edge inked as a lash line. Shut, it lies along the lower lid. Looking down shuts the eyes the same way. Vega's lids close inside the glasses. Echo's eyes are behind the visor, so Echo does not blink.
  - **Hair.** Mira's hair and Echo's locs, below the jaw, swing and lift with the follow-through, a beat behind the head; above the jaw the drawing holds still. The other heads' hair does not hang, so it moves with the head.
  - **The neck** leaves the jaw where each drawing has it, behind the chin, and runs down into the collar.
  - **From behind**, the head is drawn by code, since the owner's art has no back views: in the traced colours, sized to the traced head, with what each wears (Vega's headband, Rigel's beanie, Lyra's bun and tie, Juno's goggle strap, Echo's visor strap and locs).
- **Why tracing and not a face library.** Faces.js and Bean Heads generate faces in their own styles, and the Cubism Web Samples animate models made in Live2D's editor. Tracing keeps the owner's line, shapes and colours.

## Colours

The redesign sheet's pink and purple came too close to the team colours, which no character may suggest. The game keeps every colour at least 30 (CIE76) from each faction's accent (blue `#70AFFF`, red `#FF8C8C`, Alien `#C4A4FF`).

| Character | Use | Today | The sheet | Proposed | Nearest team colour, proposed |
| --- | --- | --- | --- | --- | --- |
| Nova | field | `#EE7FAE` (25.8 from red) | `#D9507F` (27.7 from red) | `#C2408F` | 44.7 (red) |
| Nova | accent | `#B5447A` | `#C74F66` | `#8F2E6A` | 48.2 (red) |
| Echo | field | `#39404E` | `#6E60A8` (29.4 from the Alien) | `#5A4F7E` | 41.9 (blue) |
| Echo | accent | `#1C212B` | `#4E4478` | `#3F3A5E` | 51.4 (blue) |

Vega, Rigel, Lyra, Orion and Juno keep today's crew colours, which match the hues of their icons on the owner's sheet and already keep clear of the team colours. The crew sheet lists every character's field and accent with its nearest team colour. A test checks every colour each character draws, from the front and from behind.

## The portraits

Each portrait is a character's head and shoulders in the continuous-corner rounded square of an iOS app icon (a superellipse, n = 5), not a plain rounded rectangle. As on the owner's sheet:
- it has a white rim and a soft shadow;
- inside are the character's colour under a noir vignette, painted brush strokes, and the shoulders with their pads;
- the face sits a little left of the middle, so the hair, headphones and hats fit.

On the motion stage the portraits blink with their figures. They read at 64 and 44 px.

## Animation

The crew plays on the rig's own skeletons and easing curves. It adds the overlapping action that makes a figure feel alive:
- **Idle:**
  - breathing lifts the chest, then the shoulders;
  - the weight shifts slowly;
  - the head drifts and tilts;
  - the blinks are irregular (every 2.4 to 4.6 s), each 170 ms: quick to close, slower to open;
  - Mira's hair and Echo's locs answer the head half a second late.
- **Walk:** the rig's walk with a longer stride and a counter-tilt of the head. Mira's hair and Echo's locs stream behind and bounce a beat after the body.
- **Wave:**
  - an anticipation dip, a snapped raise;
  - three swings of the forearm about the elbow, easing in and out;
  - an eased settle back to standing.

Every frame is a pure function of time and a character's seed, so a frame looks the same every time and on every screen. Each character has its own seed, so the nine do not blink together.

## How it is built

The restyle is a new skin over the approved rig, kept beside it in `design/character-pilot/`:
- `ink.mjs`: the brush ribbon, waver, noir cel shadow, hatching, rim light, texture, and the squircle.
- `cast.mjs`: the nine characters, the suit, the builds and the colour proposals.
- `faces/`: the traced heads (one module per character, generated by `design/tools/character-pilot-trace.py`) and the crops they were traced from (`faces/source/`).
- `head.mjs`: the heads, front, looking down and from behind: the traced art with its lids and swinging hair, and the back views.
- `figure.mjs`: the suit drawn on any skeleton, with the neck where each drawing has it.
- `portrait.mjs`: the portraits.
- `anim.mjs`: idle, walk and wave.
- `review.html` and `review.mjs`: the review page, for the pilot and for the crew.

It reads the rig's frame, joints, gestures, walk and easing (`design/board-motion/figures/`), and changes none of them. Those files are frozen drawing sources, pinned by hash for Frontend's reviewed ports. Every gesture of the rig draws in the new style, so the board's places, the moves and the films' poses carry over.

One fix in the pilot's own ink: the ends of its limbs were drawn curving inward. That left gaps at the hips of seated figures and in the neck under the traced heads. The ends are round now. The rig is not affected.

## What adoption would take

The owner approved the crew of nine on 7 November 2026, and the adoption release is [crew-drawing-release.md](crew-drawing-release.md) (DSN-REQ-17).
- It is a drop-in for the rig's crew and wardrobe: consumers swap two imports, and the frozen rig's files stay as they are.
- It includes baked cards, standees, held devices and app icons, a tokens 0.5.0 candidate, and interfaces for shared heads, pose caching and live blinks and hair.
- The pages here stay review pages. The runtime never imports `design/character-pilot/`.

## Checks

- **Renders** (desktop Chromium through the repository's own DevTools driver; ffmpeg):
  - `motion.mp4` and `crew-motion.mp4`: each exactly 288 frames at 30 fps (9.600 s), 1920 × 1080, H.264, no audio stream.
  - `sheet.png`, `crew-sheet.png` and the two posters: stills.
  - `renders.json` records every file's SHA-256, and a test checks them.
- **Watched:**
  - every render;
  - each traced head beside the drawing it came from, large;
  - the lids half and fully closed, and looking down;
  - the necks and the swinging hair, close up;
  - each character standing, in the rig's gestures, from the front and from behind, and seated;
  - the pilot's three at the size of the owner's example beside it;
  - the walk at four phases and the wave at its beats;
  - the portraits beside the owner's icons, and at 230, 150, 64 and 44 px.
- **Tests:** `packages/design-tokens/test/character-pilot.test.mjs` checks, for all nine:
  - the owner's decisions;
  - the colour distances, of every colour drawn;
  - the traced faces: each kept source, the fit to the head frame, and the skin shared with the neck and hands;
  - what the rig moves on them: the lids, looking down, and Mira's hair and Echo's locs only;
  - that all 27 gestures, the walk and the three actions draw well-formed SVG for each character;
  - determinism;
  - blink timing, the walk's loop and the wave's settle;
  - the squircle;
  - the render record.
- **Not tested:**
  - No phone, tablet or display was tried; every frame is desktop Chromium. The drawing cost on a phone is unmeasured.
  - The tests do not run the trace tool; they check its committed outputs.
