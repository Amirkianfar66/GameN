# The openings: the Game N brand intro and the crew boarding

**Status: proposal for review ([issue #188](https://github.com/Amirkianfar66/GameN/issues/188)). Nothing here is adopted, mounted or deployed.**

The owner asked for two opening previews with one visual identity: a two-second brand intro on the app's first entry, and a ten-second crew boarding after everyone is Ready and before Round 1. Designer makes the artwork; Codex coordinates Backend and Frontend timing. The boarding has no stage to play in yet ([R17](#r17-the-missing-stage)).

- **Branch.** `claude/designer-openings`, stacked on the role films (`claude/designer-role-films`, #189, itself stacked on #187). The work is in `design/cinematic/pilots/openings/`.
- **Base.** Main is `a343ca6`; the role films' stack carries `design/cinematic/`, which main does not have yet.
- **Review.** The stage plays both: `design/cinematic/stage.html?pilot=brand-intro&surface=phone&w=390&h=844&play=1`, and `?pilot=boarding&surface=display&roster=8&play=1`. The review gallery lists both openings.

## What is delivered

| Opening | Length | Plays | Variants | Class |
| --- | --- | --- | --- | --- |
| Brand intro | exactly 2,000 ms (60 frames at 30 fps) | the app's first entry, before login and the lobby | full; reduced | candidate runtime asset (identity-free) |
| Boarding | exactly 10,000 ms (300 frames at 30 fps) | after everyone is Ready, before Round 1 (R17) | full; reduced; the environment alone; the crew alone | review only (the renders show synthetic rosters; a client draws its own match) |

- **Editable sources.** The art is code-drawn SVG: one function per layer, with every time, place and colour named in the module.
  - `film.mjs` is both films' clocks: the beats, the camera's keyframes and the reduced stills.
  - `wordmark.mjs` is the wordmark and the ink cut both films end on. `brand.mjs` is the brand intro.
  - `world.mjs` is the boarding's environment: the planet, the ship, the entrance, the ramp and the corridor.
  - `crew.mjs` is the character layer. `roster.mjs` holds the boarding's one input. `boarding.mjs` composes the boarding. `stage.mjs` mounts both on the review stage.
- **Wordmark files.** `design/tools/cinematic-wordmark.mjs` writes the wordmark as standalone vectors: `wordmark.svg` (with "by Plan B") and `wordmark-name.svg` (the name alone).
- **Renders.** Rendered with `design/tools/cinematic-exports.mjs --only brand-intro` and `--only boarding`, each encoded to its exact length (`cinematic-render.mjs --exact`).

## One look

Both openings use the role films' world, so the player sees one comic from the app's first frame to Round 1:

- **Palette and texture.** The same night palette (ink `#151923`, paper, steel, and amber light that a room is lit by). The role films' starlight through a viewport's slats, their halftone dots, paper grain and bold ink contours.
- **Borrowed pieces.** Pilot 2's ship and its ink cut, which sweeps a torn-edged ink band across the frame. The crew are the approved rig's characters, in their own appearances.
- **No team colour.** No colour comes within the accent distance of a faction's colour, apart from the crew's own (a test holds it).
- **Lettering.** The Game N wordmark is drawn in the Ink Block strokes the role films' titles use, with a hand-drawn lower case.
- **Words in the picture.** The only words drawn are the brand's. They are drawn as strokes, never as text, and the page carries them for screen readers.

## The brand intro: 2,000 ms

No approved wordmark or logo existed in the repository, so the intro draws one. "Game N" is lettered in ink and amber on a paper plate, and "by Plan B" is stamped in paper on an ink tab under its right half.

| ms | What happens |
| --- | --- |
| 0-160 | The paper plate slams in from a little larger, throwing pale impact lines (to 420 ms) |
| 60-460 | "Game N" is written on it, stroke by stroke in ink, then filled amber (the brief's "0-0.4 s may reveal Game N") |
| 420-700 | "by Plan B" is stamped on under it |
| 700-1600 | The mark holds to be read; a sheen crosses it once (880-1380 ms) |
| 1600-1960 | Pilot 2's ink cut sweeps across and hands over to the app's night; its band has left the frame by 1,960 ms |
| 1960-2000 | The night (`#07090F`) the app opens on |

- **Compositions.** On a phone the plate spans 84% of the width at 47% of the height; on the display it is 37% of the height.
- **Reduced motion.** The finished mark fades in over 200 ms, holds, and fades out from 1,700 to 1,960 ms. Nothing slams, draws on or sweeps.
- **Sound.** None. The intro is silent and reads muted.

## The boarding: 10,000 ms

The whole story the brief asks for, in exactly ten seconds. The cut inside falls at 6.9 s, in the dark after the door closes.

| s | Phone (narrow camera) | Display (wide camera) |
| --- | --- | --- |
| 0-2 | The ringed giant over the ship; the camera tilts down to the open doorway, its warm light spilling down the ramp and over the ground | The whole field: the giant over the mesas, the ship low on its legs, the doorway lit; the crew already walking toward it in pairs |
| 2-6.1 | Cut to the crew walking in pairs (seat order), looking up at the ship as they reach the ramp; the camera follows them up it into the light | One continuous move in on the ramp as the pairs climb; each member, at the top, is seen against the doorway's light and goes in |
| 6.1-6.9 | The last aboard; the ramp slides up, the door comes down and seals amber, the portholes light along the hull and the engines glow; the camera pushes in on the door | The same, from wider |
| 6.9-8.7 | Inside, in the dark: the crew stands together in the spine corridor, rimmed by the shut entrance's amber seam; the ceiling lights wake far to near over them, then the wall consoles power up | The same, from wider: two rows instead of three |
| 9.0-9.96 | A brief Game N mark (the name alone) stamped over the corridor's ceiling, then the ink cut to the night; its band has left the frame by 9.96 s | The same |

- **The crew.**
  - Outside, members walk in pairs in seat order (seats 1 and 2 first); an odd last member walks alone. The near member of a pair is a step ahead, and each member arrives a little early or late by a fixed amount.
  - Everyone uses the same walk and looks up at the ship at the same place.
  - Inside, everyone stands in one of three neutral standing poses, by place. Each row stands between the places of the row in front, so every face shows, and every figure stands wholly in the frame to the end of the push-in, on phones down to 20:9 (360×800, 412×915).
- **Rows inside.** Places are by seat order from the back row's left.

  | Players | Phone rows (back to front) | Display rows (back, front) |
  | --- | --- | --- |
  | 7 | 2, 3, 2 | 4, 3 |
  | 8 | 3, 2, 3 | 4, 4 (staggered) |
  | 9 | 3, 4, 2 | 5, 4 |

- **Reduced motion.** Five held pictures, each fading in from the night over 160 ms, then a fade to the night from 9.7 to 9.96 s. Nothing moves within a picture.
  - The pictures: the ship waiting, its entrance open (0 s); the crew boarding (2.4 s); the door shut and the hull lit (5.2 s); the crew in the lit corridor (6.9 s); and the mark (8.9 s).
  - Nobody is half there in a held picture. A member stepping in at the door is held whole against its light until late in the step, then is gone inside, so nobody is held mid-fade. A member the frame would cut is left out of the picture, still arriving: on a tall phone the first picture is the waiting ship alone, and on the display and the 320 px phone the walkers wholly in the frame. Places alone decide it, never a character.
- **Layers.** `layer=environment` draws the world without a figure and `layer=crew` draws the crew alone, for editing or for compositing a roster over a reusable environment.

### What it never shows

- **Nothing private.** No role, faction, Code membership or ability reaches the order, pose, light, camera or sound. The boarding's only input is the public roster, and a test checks that a roster carrying private fields draws byte for byte the same.
- **Nobody singled out.** Places belong to seat order, never to a character; a test swaps two characters and finds every place unchanged.
- **No gameplay.** The corridor is the ship's spine, not Room A or B, so the film places nobody in a starting room. It shows no ability, movement cost or gameplay action.

## Changes from the suggested storyboards

- **Brand intro.** The suggested split is kept: Game N by 0.46 s, by Plan B from 0.42 s with the read to 1.6 s, and the hand-over from 1.6 s.
- **Boarding: boarding and door.** Boarding takes 2-6.1 s rather than 2-5 s, because 7 to 9 people climb one ramp at a walk. The last aboard and the door's closing fall in 6.1-6.72 s, inside the suggested 5-7 s.
- **Boarding: the way in.** "The camera accompanies them from the open landscape into the enclosed ship": the camera follows the crew to the doorway and pushes in on it as the door seals. A cut in the dark then takes it inside, rather than one continuous move through the door. This shows the door's closing whole, and the interior wakes from true dark.
- **Boarding: the phone's cut.** The phone's composition cuts at 2 s from the waiting ship to the crew; the display is one continuous move until the cut inside.
- **Boarding: the ending.** It ends on a brief Game N mark and the ink cut to the night the game's first view opens on, not on the start view itself, which is the Frontend's to draw.
- **Boarding: the group.** The crew walks in pairs rather than in single file or as one crowd. This reads as a natural group without anyone leading.

## Integration handoff

### Inputs

- **Brand intro.** None.
- **Boarding.** The admitted public roster: for each member, `{ seat, character }` (seat 1-9, character `c1`-`c9`), for 7, 8 or 9 members. `publicRoster()` (`roster.mjs`) keeps only those two fields and orders by seat, and refuses anything else. The synthetic review rosters (`REVIEW_ROSTERS`) are fixtures, never runtime input.

### Timing

- **Exact lengths.** 2,000 ms and 10,000 ms. Encoded at 30 fps, they are exactly 60 and 300 frames; the last frame (1,966.7 ms and 9,966.7 ms) already shows the night alone, on any surface.
- **Clock.** Pure functions of t: `brandFrame(t)` and `brandSvg(t, ...)`; `boardingFrame(t)` and `boardingSvg(t, { variant, roster, width, height })`.
  - Brand intro: t is local, from its first frame.
  - Boarding: t is `server now - startsAt` (R17), never a local start.

### Mounts

- **Brand intro.** Full screen on the app's first entry, before login. Play it once per entry, never on ordinary navigation, and never over an active or recovering match: such an entry goes straight to the match. Play a runtime candidate (MP4 or WebM, with the animated WebP and poster as alternatives), or draw `brandSvg` live.
- **Boarding.** Full screen on every phone and the display, during the boarding stage only.
  - Phones (taller than wide) take the narrow composition; the display takes the wide one.
  - The roster varies, so a client draws it live with `boardingSvg`, or composites the crew layer (`crewOutside`, `crewInside`, `memberSvg`) over the environment.
- **Frontend modules.** `design/cinematic/pilots/openings/{film,wordmark,brand,world,crew,roster,boarding}.mjs` and what they import:
  - `lib/{comic,ease,lettering,scene}.mjs`;
  - `pilots/blackhole/art.mjs` (the ship and the ink cut);
  - `pilots/role-reveal/{art,stagecraft}.mjs` (the night, slats, grain and breathing);
  - the approved rig (`design/board-motion/figures/`).

  The crew walks with a longer stride than the board's. `boardingWalk()` (`crew.mjs`) takes the rig's own walk (`walkPose`) and carries the feet out in proportion, then solves the knees again. The rig's sources are untouched.
- **Drawing cost.** Measured in headless Chromium on this machine's 2.1 GHz Xeon (four cores), not on a phone. Times are main-thread milliseconds per frame (median, p95), over every frame of the film.

  | Drawn per frame | Generate the SVG | Parse, style and layout | SVG a frame |
  | --- | --- | --- | --- |
  | Brand intro, phone / display | 0.4, 0.8 / 0.6, 0.9 | 2.3, 3.8 / 3.5, 4.0 | 32-36 KB |
  | Boarding, whole frame, phone / display (9 players) | 7.1, 14.8 / 9.0, 17.3 | 14.9, 29.9 / 21.8, 33.4 | 398 KB median, 438 KB max |
  | Boarding, environment alone | 0.6, 1.0 / 0.7, 1.6 | 3.4, 5.3 / 4.5, 7.1 | 44 KB |
  | Boarding, crew alone | 6.8, 14.0 / 8.4, 15.3 | 16.3, 28.8 / 18.0, 29.0 | 384 KB median |

  Raster runs on other threads and is not included.
  - **Brand intro.** It can be drawn live.
  - **Boarding.** Rebuilding the whole frame each frame takes 22 to 31 ms of main thread here, so a phone would not hold 30 fps that way. The crew is nearly all of it (384 of the frame's 398 KB): up to nine detailed figures, each drawn twice (its light and its rim).
  - **For Frontend's runtime.** Build each shot's picture once and move it:
    - the camera and the parallax layers move by transform;
    - the crew inside never changes pose (its breathing is a transform, its light a filter reference);
    - only the walkers outside change shape, on a 640 ms walk cycle, so their poses can be drawn once and reused.
  - **Fallback.** A device that cannot keep the frame rate shows the reduced variant's picture for the moment instead: five pictures, each drawn once.

### Audio

Both openings are silent and complete muted. The brief makes sound optional and none is supplied. If a sound pass follows, its cues are:

- **Boarding:**
  - footsteps (2-6.1 s);
  - the ramp (6.15-6.55 s);
  - the door sealing (6.38-6.72 s);
  - the engines (from 6.55 s);
  - the lights (7.05-8.15 s);
  - the systems (7.6-8.7 s).
- **Brand intro:** the stamp (0.42 s).

Any cue must respect the device's mute setting and autoplay limits; missing audio blocks nothing.

### Skip, reconnect and fallback

- **Skip** (a tap, local): dismisses the pictures only. It grants no early turn and advances nothing.
- **Reconnect:** seek to `now - startsAt`; past `endsAt`, draw nothing and go to the current game. Never restart an intro.
- **Slow or missing assets:** draw the reduced variant's picture for the current moment (a single SVG, no video), or, failing that, the night with the page text ("The crew boards the ship") and the time left. Nothing waits on a client.

### <a id="r17-the-missing-stage"></a>R17: the missing stage

`startIfReady` (`services/game-api/src/planet-game.ts:154`) starts Round 1 as soon as everyone is Ready, and the session status contract (`packages/contracts/src/planet-service.ts:39`) has no boarding stage. Backend and Integration are asked for a versioned pre-Round-1 presentation boundary:

- a stage (for example `BOARDING`, 10,000 ms) with stable identity and authoritative `startsAt` and `endsAt`;
- it carries the admitted public roster (seat and character only) and the player count;
- it keeps the prepared role deal and character selections;
- it consumes none of Round 1's time, so Round 1 receives its full timer after it;
- it is not the Blackhole's presentation phase (P27);
- saved match versions keep their behaviour.

Until it exists, the boarding is a review film that no client mounts, and Round 1 starts as it does today. The brand intro needs no contract: it is the device's own.

## Inventory

<!-- inventory -->
68 files under `design/cinematic/exports/` (brand-intro: 32, boarding: 36), from `manifest.json` (`cinematic-exports-0.1.0`; the manifest records each file's render: stage address, browser, encoder). Lengths are each file's encoded duration (ffprobe for MP4 and WebM; the WebP previews' frame timings, at 12 frames a second).

| File | Class | Kind | Pixels | Length | Frames | Bytes | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `boarding/review/display-7-full.mp4` | review | video | 1920 x 1080 | 10.000 s | 300 | 3865973 | `700c1414af943ed75cc80234719ce24a230e932bb6e312a396aa073cbd96dbf3` |
| `boarding/review/display-7-full.poster.webp` | review | poster | 1920 x 1080 |  |  | 68948 | `9bd889e1123ca50e4f44e51fabb0bf00e248b5083ec751962e56ec70a70f1231` |
| `boarding/review/display-7-full.preview.webp` | review | preview | 480 x 270 | 9.999 s | 120 | 689168 | `a2cea6c70d1d0baebae9dfd90d94bdea8f6fa77c049a16ec256424cd9bea53dd` |
| `boarding/review/display-7-full.render.json` | review | record |  |  |  | 2017 | `ee6f8e76e52b65b0c413e11bffa873872cc554f6a025a55a4a991f86c5a92553` |
| `boarding/review/display-8-reduced.mp4` | review | video | 1920 x 1080 | 10.000 s | 300 | 1284015 | `69a6ea2d5a30c1f325213c3b50319dd78d8339651b2be58729736c30aa1bf1cf` |
| `boarding/review/display-8-reduced.poster.webp` | review | poster | 1920 x 1080 |  |  | 76608 | `8716a20518c66a3d85606c4f72180dea2c3f5843963d60bdeffe2d76363d148e` |
| `boarding/review/display-8-reduced.preview.webp` | review | preview | 480 x 270 | 9.999 s | 18 | 90236 | `9b9fc00a0c750680ea7d27fda51c4c8f5a12db497ed0598108c7007a1170e28d` |
| `boarding/review/display-8-reduced.render.json` | review | record |  |  |  | 2093 | `086db140db2ee0db2521361f547b4a5071f68e68aba231e497d94da79886b5dc` |
| `boarding/review/display-9-full.mp4` | review | video | 1920 x 1080 | 10.000 s | 300 | 4128649 | `b4f30ee9fec4b7ee227ea2f237672bc60a5f2d1c59dea533fe4f591b5fb22fbe` |
| `boarding/review/display-9-full.poster.webp` | review | poster | 1920 x 1080 |  |  | 80176 | `cf20995fe96b8550425e2435625cb37787a25d536324eb65e0c92d4d6d46cfc3` |
| `boarding/review/display-9-full.preview.webp` | review | preview | 480 x 270 | 9.999 s | 120 | 723762 | `13cf5b3f85470385fa41f6e79da6fc11e548e9b0d05dc0107481bc3884f02c3f` |
| `boarding/review/display-9-full.render.json` | review | record |  |  |  | 2141 | `f6fbd2652b5fb459b868ab4042e3fa00e676d80c5fd62720bcf1619facd10054` |
| `boarding/review/display-environment-full.mp4` | review | video | 1920 x 1080 | 10.000 s | 300 | 2926539 | `b8fca5c2aff347c92cceb8b0fbcc2f3fa9b6428780f197bc58f1a703f0c593ea` |
| `boarding/review/display-environment-full.poster.webp` | review | poster | 1920 x 1080 |  |  | 63998 | `76354449db93850b5e5f01976068edfe70fd2a851a1fd2866e0c908c0bf2c8e3` |
| `boarding/review/display-environment-full.preview.webp` | review | preview | 480 x 270 | 9.999 s | 120 | 559088 | `f152e9351eebe2c4616a3d2168773ddd7473bc77356c3e4e6f7892af02ef63cb` |
| `boarding/review/display-environment-full.render.json` | review | record |  |  |  | 2189 | `5cbb0b2c8df5885ca63a9347cb9fe232301c5a6d23ed55145461a7a909edc55a` |
| `boarding/review/phone320-8-full.mp4` | review | video | 640 x 1136 | 10.000 s | 300 | 2003982 | `70da387f51b6934c74cf047939145386bc501404423b0edb26c783d0858f354d` |
| `boarding/review/phone320-8-full.poster.webp` | review | poster | 640 x 1136 |  |  | 40660 | `4692e833dc5f5a7f7e1cef4015148e0833296bf947981b12f1b36c922332109f` |
| `boarding/review/phone320-8-full.preview.webp` | review | preview | 240 x 426 | 9.999 s | 120 | 621792 | `c4960aefa08ae5dff833da4dab0bbd7bbe2b74f6ad879f8486cd539733469a35` |
| `boarding/review/phone320-8-full.render.json` | review | record |  |  |  | 2088 | `a6a8073bdfdc88fcebef431ccce1b36782c8e79e191533a474cc7f6ccb5d1008` |
| `boarding/review/phone390-7-full.mp4` | review | video | 780 x 1688 | 10.000 s | 300 | 3080413 | `0906d9bb5c4e64bc6e877211c20d73faac668344f2e199476fd1310d9c330043` |
| `boarding/review/phone390-7-full.poster.webp` | review | poster | 780 x 1688 |  |  | 62554 | `75f076103ba80087946458efd3968959302feb060aeab90965358fb7e0b306ec` |
| `boarding/review/phone390-7-full.preview.webp` | review | preview | 240 x 520 | 9.999 s | 120 | 726272 | `5f9a4aae121d4a652e08d11ea77c96831eaae326289b32474c9882780bfd4404` |
| `boarding/review/phone390-7-full.render.json` | review | record |  |  |  | 2026 | `096189fd7df2859bf8ab7f3f1b684bd12d4d850ed9e6aace751d69fd00e2d960` |
| `boarding/review/phone390-8-full.mp4` | review | video | 780 x 1688 | 10.000 s | 300 | 3121252 | `b81b2f908ce2bf76b818220715dd770aa2b5e5981757306a0584c03b413fe63d` |
| `boarding/review/phone390-8-full.poster.webp` | review | poster | 780 x 1688 |  |  | 65616 | `a54fb05efd1f26f38736040672d4e4645c522e37e2abba1749da2748a871e04a` |
| `boarding/review/phone390-8-full.preview.webp` | review | preview | 240 x 520 | 9.999 s | 120 | 734200 | `51c2493eb90aab09a99930ead54de7d2841f0b6169d60949493916c0467b4358` |
| `boarding/review/phone390-8-full.render.json` | review | record |  |  |  | 2088 | `ab41ed2a88d5395d40e5c49390b5c109d40ffd3901e5837b9bce2e65458301bd` |
| `boarding/review/phone390-9-full.mp4` | review | video | 780 x 1688 | 10.000 s | 300 | 3358726 | `70c592966a2639b8835514cba19bc5bf8e032ccbe6d5d468c8b274a0602a51d2` |
| `boarding/review/phone390-9-full.poster.webp` | review | poster | 780 x 1688 |  |  | 69074 | `70f0fb55a1776307a661bdb6d50d5dc9a3c0e54476b4a7a15d91bf7dc9bce89f` |
| `boarding/review/phone390-9-full.preview.webp` | review | preview | 240 x 520 | 9.999 s | 120 | 777196 | `b1897a5b95782f7ec60be663a95543af036ab8900cd3b4d3845482e15be33675` |
| `boarding/review/phone390-9-full.render.json` | review | record |  |  |  | 2150 | `56a3b376d5667da9efed3c5f962f7e87d968c5eeb801dc26431adefcc317b3c8` |
| `boarding/review/phone390-9-reduced.mp4` | review | video | 780 x 1688 | 10.000 s | 300 | 906771 | `1f31f67ecf344a0c0b9b07e07f96664acb1288849493a6f5014f020a1a48624f` |
| `boarding/review/phone390-9-reduced.poster.webp` | review | poster | 780 x 1688 |  |  | 69270 | `74088c3bab0c5e5bd26aa48fdff68e460c59cfedabf1f868c36a95e058baeb5b` |
| `boarding/review/phone390-9-reduced.preview.webp` | review | preview | 240 x 520 | 9.999 s | 18 | 98600 | `8b35ebd1a409fd1d5a004a22b80639d48116e9457a930522e91c47fe1423205b` |
| `boarding/review/phone390-9-reduced.render.json` | review | record |  |  |  | 2163 | `9d9495e70e34797a7db5cf57b96ade44def2ce134c9d003e8d10e8b7fcf5333e` |
| `brand-intro/runtime/display-full.mp4` | runtime | video | 1920 x 1080 | 2.000 s | 60 | 776702 | `94697810846fd89c2e81974b8ccd39956fd438e07475244e60930c614df58cd8` |
| `brand-intro/runtime/display-full.poster.png` | runtime | poster | 1920 x 1080 |  |  | 1329296 | `b866a0ce1cb7a7eaab0cfbbda349e5bfa4ac60b9a16143dfb5ae1baedd2b2312` |
| `brand-intro/runtime/display-full.poster.webp` | runtime | poster | 1920 x 1080 |  |  | 87426 | `a6c12f54df8d0839871e0a01a5edfc3dbc23d795da228d882150b4c109304cf4` |
| `brand-intro/runtime/display-full.preview.webp` | runtime | preview | 480 x 270 | 1.999 s | 20 | 51666 | `e5c5fbb9af4269335589c2ef194e8618df802f51b0dba13cab431dc87f7feae5` |
| `brand-intro/runtime/display-full.render.json` | runtime | record |  |  |  | 2215 | `faff63628ba0802a0ff443c5df5cd787942aec656bf8dd1f4f7497d991931511` |
| `brand-intro/runtime/display-full.webm` | runtime | video | 1920 x 1080 | 2.000 s | 60 | 283523 | `40233cb215574552830b7231c631d826b15ce9d517741c3ff064439c643bd284` |
| `brand-intro/runtime/display-reduced.mp4` | runtime | video | 1920 x 1080 | 2.000 s | 60 | 495542 | `fa9fba385076105cb37f165ac92b092ab91ff8acfc00b4eb268c7822a7cb67e5` |
| `brand-intro/runtime/display-reduced.poster.png` | runtime | poster | 1920 x 1080 |  |  | 1295234 | `3e6e9b73b3bf4ae155041065ea830e7588de1e39dc48aa98cab97db1494885f6` |
| `brand-intro/runtime/display-reduced.poster.webp` | runtime | poster | 1920 x 1080 |  |  | 88662 | `21518a16a71ece54974d7eead61e0b7062e6ccc3cc5c48ae117215742163ac24` |
| `brand-intro/runtime/display-reduced.preview.webp` | runtime | preview | 480 x 270 | 1.999 s | 6 | 34146 | `1a1f278e6a01eec29143e8ce50350d76181e7605ad22b7407239de881bf62402` |
| `brand-intro/runtime/display-reduced.render.json` | runtime | record |  |  |  | 2236 | `3b57c056385a1999fa280ab655bbecd8c03f570e539fd86f1513713d0bcc2988` |
| `brand-intro/runtime/display-reduced.webm` | runtime | video | 1920 x 1080 | 2.000 s | 60 | 280291 | `a85b490e2b52eb55394b9e11d63174d8bc28635d74924ae7affcc828c796f450` |
| `brand-intro/runtime/phone320-full.mp4` | runtime | video | 640 x 1136 | 2.000 s | 60 | 242014 | `c010e7a48341fe1a39be7d0425cab4114693139f292a534a7d31fb612e90ce1d` |
| `brand-intro/runtime/phone320-full.poster.png` | runtime | poster | 640 x 1136 |  |  | 394446 | `2a80780ba38a0a3d5fb9ac7718d3c7675f8917d16154deafd82dff311bb9cf4f` |
| `brand-intro/runtime/phone320-full.poster.webp` | runtime | poster | 640 x 1136 |  |  | 32346 | `c25505d99201b32f657d1b112de9d0d04492418f3e1810989abaeb30265c72d2` |
| `brand-intro/runtime/phone320-full.preview.webp` | runtime | preview | 480 x 852 | 1.999 s | 24 | 112318 | `89fad1c310a1ab60868fc69101e6f1ff30ac132813f6e360ef771ee2d4bf70df` |
| `brand-intro/runtime/phone320-full.render.json` | runtime | record |  |  |  | 2226 | `5b6b3708008b0486df3a75f2fc673e95907a205d7f35dbe8509928d3127bd09d` |
| `brand-intro/runtime/phone320-full.webm` | runtime | video | 640 x 1136 | 2.000 s | 60 | 128642 | `e525ac2ce1a3c488cd8b6410fc821bd892df10c7a1e3bf90991b3c0b4ebf6705` |
| `brand-intro/runtime/phone390-full.mp4` | runtime | video | 780 x 1688 | 2.000 s | 60 | 342806 | `0c37e146865614323b44bd52ba315294b080e27d14a89bdad1fc847771a1a95c` |
| `brand-intro/runtime/phone390-full.poster.png` | runtime | poster | 780 x 1688 |  |  | 676467 | `6f1bfa1387e6e2e678d898035e0202e9cd198e530f672022f731fd747e1c104d` |
| `brand-intro/runtime/phone390-full.poster.webp` | runtime | poster | 780 x 1688 |  |  | 47590 | `0c2ec787300d3c436be64c0f8c2296142de65f04337b6e63fea4e3b4b56465d5` |
| `brand-intro/runtime/phone390-full.preview.webp` | runtime | preview | 480 x 1038 | 1.999 s | 24 | 128186 | `d5236e6b2390d336184dada401a4003d499fb83004b9705cbcd184cfd5ee8e97` |
| `brand-intro/runtime/phone390-full.render.json` | runtime | record |  |  |  | 2226 | `802abd90d5908c0d85756fcb3bea3bc773d2cd924bc03457b573788b68632f69` |
| `brand-intro/runtime/phone390-full.webm` | runtime | video | 780 x 1688 | 2.000 s | 60 | 178200 | `8e175c4bed86eb0bce56b205fb534f766c6cb5ee887203950363dae2537d670c` |
| `brand-intro/runtime/phone390-reduced.mp4` | runtime | video | 780 x 1688 | 2.000 s | 60 | 267122 | `69700d5077227b85abd3076cde619bacb90a56eee6fe3305658b7e0e1b063112` |
| `brand-intro/runtime/phone390-reduced.poster.png` | runtime | poster | 780 x 1688 |  |  | 660286 | `ec80364f5bcb32f15375e8f2201a6b4c4048ad8706cba3cdf954a789b88c98b2` |
| `brand-intro/runtime/phone390-reduced.poster.webp` | runtime | poster | 780 x 1688 |  |  | 48430 | `81be3a2849ae18c47b7f5e382dd3ac74d3ba80567ffe6a128852fbfe65015a62` |
| `brand-intro/runtime/phone390-reduced.preview.webp` | runtime | preview | 480 x 1038 | 1.999 s | 6 | 54046 | `3496a1065110b938637616630ab68bdad9e95282764e1457536c6e76d9fa9136` |
| `brand-intro/runtime/phone390-reduced.render.json` | runtime | record |  |  |  | 2246 | `10dc5acad17ef11e13c0f6c15633dafe09ced4427da697e761d3465f1db335a0` |
| `brand-intro/runtime/phone390-reduced.webm` | runtime | video | 780 x 1688 | 2.000 s | 60 | 152001 | `151eedfee294518947af88eb914f5be142ea11e83c12240b3eaaa2e1c3615699` |
| `brand-intro/runtime/wordmark-name.svg` | runtime | wordmark |  |  |  | 7557 | `abbbcaec1a58f399b472c796e51f88a36c5f487b3558f5f66b028490688d2dc8` |
| `brand-intro/runtime/wordmark.svg` | runtime | wordmark |  |  |  | 13639 | `03c7f049572be5d17c29482a025c3b93fcc410f4785e437734c85308739a6339` |

The sources, at this delivery:

| Source | Bytes | SHA-256 |
| --- | --- | --- |
| `design/cinematic/pilots/openings/film.mjs` | 10212 | `80721f698319fc574c57639458b2c4db0014004a09e9f4c5992c73ae938611e5` |
| `design/cinematic/pilots/openings/wordmark.mjs` | 8837 | `fb2a748fee01366a20fb45dac447991fbb1f19b949b66a4d17a8d01da3bda65a` |
| `design/cinematic/pilots/openings/brand.mjs` | 3434 | `cdd2b84bd4cfff2787191c22137c642889fad8e86e9eac4beb2375e9c36a77e3` |
| `design/cinematic/pilots/openings/world.mjs` | 23259 | `8e16ec0df739fcbbe7304140fbdcc73ccdcf28fb1a5792737419d980800395df` |
| `design/cinematic/pilots/openings/crew.mjs` | 10437 | `5ade6634f9d287e6b33c92d1862bc89b62a5c1eec5398384e973481d8e428895` |
| `design/cinematic/pilots/openings/roster.mjs` | 2671 | `036454ef030ddc8e6d14469a6cf836f7e2659db93b55607a16c6666aa1d84311` |
| `design/cinematic/pilots/openings/boarding.mjs` | 8723 | `a233def18888adb393774f5204ed7e502ffc18a83beed8eb6061628a7bf4bc0c` |
| `design/cinematic/pilots/openings/stage.mjs` | 3219 | `6b79811b99369060c26ce98791e6fd44133c437b552148d6dcba3ac1b6d2b794` |
| `design/tools/cinematic-wordmark.mjs` | 1888 | `2c4cc40b78d107f10c5a058c11d8144c297a4f9e61f70e4285183b062ec8f91d` |
| `design/tools/cinematic-render.mjs` | 10919 | `563e195f782a14db2176daaba5556a052dc791c25f5e5e1015ed5b82ff9e6d7c` |
| `design/tools/cinematic-exports.mjs` | 17733 | `f85a9f1ee7184704f765efe36cd7e3afead400a70198a2b8226e16c319d1fce1` |
| `packages/design-tokens/test/cinematic-openings.test.mjs` | 18813 | `b746ff41256c15e351ed1281883b1a6ac8598992d298ff00ac81dfef823722ae` |
<!-- /inventory -->

## Provenance and reuse rights

- **How it is made.** Every picture is drawn by code in this repository: the openings' modules, the approved rig and its characters, and Pilot 2's ship. The lettering is drawn strokes; no font file is used.
- **Nothing outside.** No photograph, stock image, third-party asset or generated image is used.
- **Encoding.** The videos are frames captured in Chromium from the review stage and encoded with ffmpeg (libx264, libvpx-vp9, libwebp); each render's record names its stage address, browser and encoder.
- **Rights.** The work was made for this project; reuse is the owner's to grant, and no outside licence applies.

## Checks: what was watched and measured

<!-- checks -->
On this delivery, with Node 22.21.1 and npm 10.9.4. The renders were made in Chrome for Testing 153.0.8010.12 with ffmpeg 6.1.1.

- **Lengths and silence.** Every video was probed by decoding it (ffprobe, frames counted).
  - The brand intro's ten (five MP4, five WebM): exactly 60 frames at 30 fps, 2.000 s.
  - The boarding's nine MP4s: exactly 300 frames at 30 fps, 10.000 s.
  - None has an audio stream, and every render record's hash matches its file.
- **The last frame is the night.** Every full-motion MP4 ends on two frames of the night alone (luma 24 at every pixel), on the phones and the display; the WebM copies are within 3 levels of it (encoder noise). The reduced variants reach it on their last frame.
- **Watched.** Every render, as a contact sheet:
  - the boarding at 16 moments (0, 0.5, 1.4, 2.5, 3.5, 4.3, 5.5, 6.2, 6.5, 6.87, 7.5, 8.17, 8.8, 9.5, 9.8 and 9.97 s);
  - the brand intro at 16 frames from 0 to 1.97 s.

  Then at full size: the wordmark as the sheen crosses it, the doorway every third frame through 5-6.5 s, each reduced picture, and the nine-player corridor on 360×800 and 412×915 phones on the live stage.
- **Found by watching, and fixed in this delivery:**
  1. **The ink cut's band stayed on the display.** Pilot 2's wipe ends as its leading edge leaves the frame, so a band a third of a display wide still covered a wedge on the right of the last frame (on the 320 px phone, a sliver). `handoverWipe()` carries the band on until its tail has gone; Pilot 2's own wipe is unchanged. A test checks eight surfaces.
  2. **Two of reduced motion's pictures were half-drawn.** On the phone, the first held a member cut in half by the frame's edge, and the second froze two members mid-fade in the doorway. A held picture now shows nobody half there. A test checks every picture on eight surfaces with 7, 8 and 9 players.
  3. **With nine players, the phone's corridor group touched the frame.** The middle row's outer members came within 4 px of the edge on 375-430 px phones, and 20:9 phones (360×800, 412×915) cut them by up to 5 px.
     - That row now stands at 650-950 (was 635-965), still 40 units from every place in the rows behind and in front.
     - The phone's push-in ends at 960 (was 940).
     - Everyone keeps at least 9 px to the frame at the push-in's tightest. A test checks every figure whole from the cut inside to the end, on eight surfaces.
- **The walk's stride.** The renders were made while the longer stride was an option of the rig's `walkPose`, which is a frozen drawing source. The stride now lives in `crew.mjs` (`boardingWalk`), and the rig's source is byte-identical to its base.
  - The two walks' poses agree to within 2×10⁻¹³ at a thousand phases.
  - Every frame of every boarding render was regenerated: 576 frames differ, each only by numbers under 0.0001 units apart.
  - All 576 rasterise, at the render's own scale, to pixels identical to the old code's. The renders stand.
- **Drawing cost.** The table under Mounts. On this machine the brand intro costs under 5 ms a frame, and rebuilding a whole boarding frame 22 to 31 ms.
- **Tests.** `cinematic-openings.test.mjs` passes 12 of 12; two are new with these fixes (the held pictures, the ink cut), and the corridor test now checks whole figures. The design suite passes 459 of 459.
- **Hygiene.** `git diff --check` is clean. A scan of the added lines for credentials, local paths and model names found none.
- **Not tested.**
  - **Devices.** No phone, display hardware, screen reader or large-text setting was tried. Every frame is desktop Chromium, and the drawing cost on a phone is unmeasured.
  - **Runtime.** No client mounts either opening. The boarding has no stage (R17), so its timing against a server clock, reconnect, skip and the fallback are untested.
  - **Sound.** None was made.
<!-- /checks -->
