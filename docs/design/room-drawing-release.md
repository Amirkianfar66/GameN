# Room drawing release: the five rooms, redrawn to match the crew

**Status: a Designer candidate for Integration ([DSN-REQ-18](integration-requests.md#dsn-req-18)). Nothing is registered or active: every surface keeps drawing today's rooms until Integration builds and registers this release and Frontend dispatches it by exact release.**

**The approval.**
- On 7 November 2026 the owner asked for the rooms to match the restyled crew, one room first as a test.
- On 8 November 2026 the owner approved:
  - Room A: "I am really happy with rooms let do it for all";
  - then all five: "yes I am happy".
- The owner's words and what they decide are in [owner-decisions.md](owner-decisions.md). The review, with each room today and redrawn, is [PR #197](https://github.com/Amirkianfar66/GameN/pull/197) and [room-pilot.md](room-pilot.md).
- The owner then asked about the animations that would need updating. The films that draw parts of a room again are redrawn with the rooms, below.

This release, **`room-drawing-1.0.0`**, packages the approved rooms for the board:
- each room's back picture;
- each layer drawn in front of its places;
- each room's lights-out picture for the Blackout, drawn from the redrawn room;
- the private-talk capsule beside the Command Room;
- the films' pieces of the rooms: the Jail's door and airlock for the Captain's films, and the Hospital's drone, berth monitors and lamps.

All the pictures are trimmed for size.

## What is in it

| Path | What it is |
| --- | --- |
| `design/room-drawing/assets/` | The 25 exports: the rooms' 18 pictures and the capsule's 7. Each is an SVG in the scene units of the picture it replaces. `manifest.json` gives each export's SHA-256, size, kind, depth, and the bundle, CSS property and shipped picture it replaces, with that picture's SHA-256 |
| `design/room-drawing/source/` | The films' code: `captain.mjs` and `medical.mjs`, drop-ins for two of the board's film art modules, and `jail-door-art.mjs` and `medical-art.mjs`, the art they draw (generated). Each starts with `// mothership:dev-only`; a port drops that line and rewrites the import specifiers the record gives, nothing else |
| `design/room-drawing/release-candidate.json` | The record: the approval; every source, dependency and input with its SHA-256; the ports with their runtime paths, import rewrites and hashes; the trim; the consumers and their dispatch; what is not replaced; the sizes |
| `design/room-drawing/review/` | Review media: `night.png` (each room released, lit and with the lights out, beside today's lights-out picture), `films.png` (the films' pieces, today and redrawn) and `renders.json` (the trim's evidence and the Jail door at rest against the room, from desktop Chrome) |
| `design/room-pilot/` | The drawing the exports come from: `rooms.mjs` (the five rooms), `room-a.mjs` (Room A, by hand), `ink-room.mjs` (the other four and the capsule, shape for shape from today's pictures), `ward-four.mjs` (the ward's places), `night.mjs` (the lights-out pictures), `films.mjs` (the films' pieces) and `trim.mjs` (the trim) |

Write and check:

```sh
node design/tools/room-drawing-export.mjs           # assets/, source/*-art.mjs and release-candidate.json
node design/tools/room-drawing-export.mjs --check   # the same, compared with the files; writes nothing
node design/tools/room-drawing-render.mjs           # review/ (needs CHROME_PATH)
node --test packages/design-tokens/test/room-drawing.test.mjs
```

## The exports and what each replaces

Each export replaces exactly one picture the board reads today, under the same CSS property:
- **`scene-art`** comes from `design/board-motion/assets/board-motion.scenes.css` and the pictures in `design/board-motion/assets/scenes/`.
- **`board-v2-motion-art`** comes from the catalog `design/releases/board-v2-motion-art.json`.
- **`board-v2-films-art`** comes from the catalog `apps/game/hosted/board-v2-film-art/catalog.json`: the four-berth ward and its lights-out picture.
- **`board-v2-art`** comes from the catalog `design/releases/board-v2-art-candidate.json`: the capsule.

| Export | Kind | Depth | Size (gzipped) | Replaces | Bundle |
| --- | --- | --- | --- | --- | --- |
| `command-room.back.svg` | back | - | 81 KB (23.5 KB) | `--bm-scene-command-room-back` | `scene-art` |
| `command-room.table.svg` | layer | 470 | 11 KB (3.6 KB) | `--bm-scene-command-room-table` | `scene-art` |
| `command-room.dark.svg` | dark | - | 85 KB (24.4 KB) | `--board-v2-motion-command-room-dark` | `board-v2-motion-art` |
| `room-a.back.svg` | back | - | 123 KB (31.5 KB) | `--bm-scene-room-a-back` | `scene-art` |
| `room-a.dark.svg` | dark | - | 114 KB (29.3 KB) | `--board-v2-motion-room-a-dark` | `board-v2-motion-art` |
| `room-b.back.svg` | back | - | 107 KB (26.9 KB) | `--bm-scene-room-b-back` | `scene-art` |
| `room-b.bench.svg` | layer | 470 | 26 KB (6.7 KB) | `--bm-scene-room-b-bench` | `scene-art` |
| `room-b.dark.svg` | dark | - | 124 KB (30.2 KB) | `--board-v2-motion-room-b-dark` | `board-v2-motion-art` |
| `hospital.back.svg` | back | - | 69 KB (18.7 KB) | `--board-v2-film-scenes-hospital-ward-four-back` | `board-v2-films-art` |
| `hospital.berth-four-h3.svg` | layer | 560 | 5 KB (1.6 KB) | `--board-v2-film-scenes-hospital-ward-four-berth-four-h3` | `board-v2-films-art` |
| `hospital.berth-four-h4.svg` | layer | 560 | 5 KB (1.6 KB) | `--board-v2-film-scenes-hospital-ward-four-berth-four-h4` | `board-v2-films-art` |
| `hospital.berth-four-h1-head.svg` | layer | 600 | 10 KB (3.0 KB) | `--board-v2-film-scenes-hospital-ward-four-berth-four-h1-head` | `board-v2-films-art` |
| `hospital.berth-four-h2-head.svg` | layer | 600 | 10 KB (3.0 KB) | `--board-v2-film-scenes-hospital-ward-four-berth-four-h2-head` | `board-v2-films-art` |
| `hospital.berth-four-h1.svg` | layer | 770 | 4 KB (1.4 KB) | `--board-v2-film-scenes-hospital-ward-four-berth-four-h1` | `board-v2-films-art` |
| `hospital.berth-four-h2.svg` | layer | 770 | 4 KB (1.4 KB) | `--board-v2-film-scenes-hospital-ward-four-berth-four-h2` | `board-v2-films-art` |
| `hospital.dark.svg` | dark | - | 97 KB (25.2 KB) | `--board-v2-film-lighting-hospital-ward-four-dark` | `board-v2-films-art` |
| `jail.back.svg` | back | - | 73 KB (19.0 KB) | `--bm-scene-jail-back` | `scene-art` |
| `jail.dark.svg` | dark | - | 68 KB (17.7 KB) | `--board-v2-motion-jail-dark` | `board-v2-motion-art` |
| `capsule.back.svg` | back | - | 45 KB (12.2 KB) | `--board-v2-art-capsule-back` | `board-v2-art` |
| `capsule.door-0.svg` | layer | - | 7 KB (2.0 KB) | `--board-v2-art-capsule-door-0` | `board-v2-art` |
| `capsule.door-1.svg` | layer | - | 7 KB (2.0 KB) | `--board-v2-art-capsule-door-1` | `board-v2-art` |
| `capsule.door-2.svg` | layer | - | 7 KB (2.1 KB) | `--board-v2-art-capsule-door-2` | `board-v2-art` |
| `capsule.door-3.svg` | layer | - | 1 KB (0.5 KB) | `--board-v2-art-capsule-door-3` | `board-v2-art` |
| `capsule.busy.svg` | layer | - | 2 KB (0.8 KB) | `--board-v2-art-capsule-busy` | `board-v2-art` |
| `capsule.dark.svg` | dark | - | 51 KB (13.4 KB) | `--board-v2-art-capsule-dark` | `board-v2-art` |

**The conventions.**
- **The box and camera.** Every export has the box and camera of the picture it replaces (a room's 1024 × 768, the capsule's 512 × 768), so every place, slot, focus, frame and press area is unchanged. The scenes and the ward's places are tested unchanged in `room-pilot.test.mjs`.
- **Layering.** A back picture is drawn behind every place. A layer is drawn at its depth: the board paints it at z 2 × depth + 1, over the places behind it. The capsule's door frames and busy light stack as today's do. A lights-out picture is the back and its layers together, like the picture it replaces.
- **Static files.** Each export is an SVG element with no XML declaration or comment. It is static: no script, style, foreign object, image or external reference, and every `url()` and `href` points inside the file.
- **Public art**, the same on every screen. Nothing drawn depends on a role, team, ability, private choice or seat. Every berth of the ward is drawn alike, as today.

**Not replaced.**
- The scene art's two-bed sick bay (`--bm-scene-hospital-back`, `-bed-left`, `-bed-right`), which the board no longer draws.
- The roster-sized ward of the earlier ruleset (`--board-v2-art-ward-*` and `--board-v2-motion-hospital-ward-<n>-dark`). The board's Hospital now is the four-berth ward (`HOSPITAL-4-2026-10-18`), redrawn here.
- The capsule's badge (`--board-v2-art-capsule-badge`): a tag, not the room.
- The films' other art, which has no room behind it:
  - the Captain's console inset, plates, cover, glove, click, suction, debris, emergency light, exterior view and plaque;
  - the medical vitals inset, tags, scan line, hologram and pulse;
  - the clone card;
  - the Blackout's sparks, impact and markers;
  - the shield.

  These are insets, tags and effects drawn over any room, in the board's comic hand. The crew in every film are the crew release's, drawn live.

## The films' pieces of the rooms

Some films draw parts of a room again, over the room, so that they can move them. With the rooms redrawn, those parts would show today's drawing on top of the new room. So they are redrawn with the rooms, in two drop-ins for the board's film art modules.

The drop-ins are `design/room-drawing/source/captain.mjs` for `design/board-v2/fx/captain.mjs`, and `medical.mjs` for `fx/medical.mjs`, whose sources are kept in the release snapshot `cb9386bd`. Each has the same exports, constants, boxes, beats, signals and colours as the module it replaces. Every other piece of art draws byte for byte as today's (tested).

1. **The Captain's RELEASE and EJECT films: the Jail.**
   - **`jailDoorSvg()`.** The film draws the Jail's blast door, its lamp and its keypad's screen over the room, "so that at rest the overlay is the room itself", then slides the door open. These pieces are now drawn exactly as the redrawn Jail draws them: the same shapes, seeds, tones and trim, generated into `jail-door-art.mjs`. Every outline and fill at rest is one the room draws (tested).
     - **The room's light** that falls on the door (the lamp's shaft, the dark at the panel's edges) is drawn over the pieces and stays where it is while the door slides.
     - **At rest**, over the release's Jail in desktop Chrome at twice its pixels, the overlay differs from the room in 0.08% of pixels, along the door's edge (`review/renders.json`).
     - **The corridor** behind the door is redrawn in the same hand. The lamp and screen signals (RELEASE's green, EJECT's red, the lockdown's amber) are the film's colours, drawn in the same hand.
   - **`airlockSvg()`.** The EJECT hatch's rim, hazard band, inner rim and clamps are drawn in the crew's ink. Its stripes, iris and space are the film's.
2. **The Hospital's films: the four-berth ward.**
   - **`droneSvg()`.** The medical drone in its four poses: each shape of today's drone drawn again in the crew's ink, in the same 160 × 132 box, so it still hangs by its lens.
   - **`berthScreenSvg()` and `lampSvg()`.** A berth monitor's frame and a status lamp's core are drawn in the crew's ink. The traces, glows, halos and colours are the film's.
3. **The private-talk capsule** (`design/board-v2/scenes/capsule.mjs`, the cabin drawn beside the Command Room for a Hack).
   - The cabin, its door frames and its busy light are redrawn shape for shape from today's pictures, the cabin darkening toward the panel's edges as the rooms do.
   - Its lights-out picture is drawn from them by the night rule.

**The ports.** A port drops the first line and rewrites the import specifiers listed in `release-candidate.json`, into a runtime directory of the release's own, so that a board dispatches by exact release.

| Source | Port | Imports rewritten |
| --- | --- | --- |
| `design/room-drawing/source/captain.mjs` | `apps/game/hosted/room-drawing/captain-fx.mjs` | `kit.mjs`, `blocked.mjs` and `label-box.mjs`, to `../board-v2-drawing/` |
| `design/room-drawing/source/jail-door-art.mjs` | `apps/game/hosted/room-drawing/jail-door-art.mjs` | none |
| `design/room-drawing/source/medical.mjs` | `apps/game/hosted/room-drawing/medical-fx.mjs` | the same, and `hospital-ward.mjs`, to `../board-v2-drawing/` |
| `design/room-drawing/source/medical-art.mjs` | `apps/game/hosted/room-drawing/medical-art.mjs` | none |

The port's imports all resolve to files that exist, and none reaches into `design/` (tested). Under this release, `board-v2-films.mjs` takes `jailDoorSvg()`, `airlockSvg()`, `droneSvg()`, `berthScreenSvg()` and `lampSvg()` from these ports. Every earlier release keeps `board-v2-drawing/captain-fx.mjs` and `medical-fx.mjs`.

## How the pictures are made

1. **The drawing** ([room-pilot.md](room-pilot.md)):
   - Room A is drawn by hand. The other four and the capsule are redrawn shape for shape from today's pictures.
   - All use the crew's ink canvas, imported unchanged, in each room's colour family (tokens 0.5.0), as dark as Room A.
   - Every shape of today's pictures is drawn again (tested).
2. **The lights-out picture** (`design/room-pilot/night.mjs`) is drawn from the redrawn pictures, back and layers together, by the reviewed night rule (`design/board-v2/scenes/lighting.mjs`, read and not changed):
   - the room's light is taken away (the drawing marks it: shafts, pools, glows, the side walls' and panel's dark);
   - every fill goes almost to ink, with a trace of the room's hue;
   - the ink's outlines and hand-drawn lines go faint steel, so the room still reads as a room, while the hatching, grain and rim light go dark with the fills;
   - the view through a window is dimmed more gently.

   It has every outline of the lit room (tested), and no colour outside the night rule (tested).
3. **The trim** (`design/room-pilot/trim.mjs`). The ink samples every outline every few units, far finer than a phone or display shows.
   - Each subpath the ink wrote keeps the fewest of its own points that stay within 0.25 units of every point it had (Ramer-Douglas-Peucker, by the distance to each segment).
   - Points are written in whole units, or in tenths for a subpath under 24 units across.
   - Everything else is kept byte for byte: today's shapes copied as they are, every pattern tile and every attribute.
   - **Tested:** only path data differs, and no outline moves more than 0.25 units plus the rounding.
   - **In desktop Chrome at twice their pixels:** at most 1.8% of a picture's pixels differ by 32 or more of 255 (`review/renders.json`), along outline edges. No difference is visible side by side.

## Size

| | Raw | Gzipped |
| --- | --- | --- |
| Today's 25 pictures, as files | 261 KB | 54 KB |
| The release's 25 exports | 1.17 MB | 309 KB |
| The same, untrimmed | 3.99 MB | 1.24 MB |

The rooms' 18 pictures are 275 KB gzipped and the capsule's 7 are 34 KB, about six times today's for the crew's hand-drawn line.

The films' code ports are 44 KB (`captain-fx.mjs`), 51 KB (`jail-door-art.mjs`), 26 KB (`medical-fx.mjs`) and 63 KB (`medical-art.mjs`), raw.

A film writes each of its pieces again whenever a frame changes it. Against today's `board-v2-drawing/` modules:
- the Jail door overlay is about 20 KB at rest and 25 KB while sliding, against 3 KB and 5 KB;
- the EJECT airlock is about 12 KB, against 5 KB;
- the drone is 13 KB, against 3.5 KB; a berth's monitor is at most 1.2 KB and its lamp 1.7 KB, against 0.9 KB and 0.5 KB.

- **The bundles:** Integration builds them as data URIs and reports their sizes.
- **On phones:** Frontend measures decode time, frame time and memory on a physical low-end Android phone and an iPhone, by the agreed protocol. That includes the door's frames.
- Until then, every performance figure here is desktop-only or unmeasured.

## Consumers and dispatch

- **`apps/game/hosted/board-v2-host.mjs`**:
  - reads `--bm-scene-<room>-back` and its layers for the Command Room, Room A, Room B and the Jail;
  - reads the four-berth ward's `--board-v2-film-scenes-hospital-ward-four-*`;
  - in a Blackout, reads `--board-v2-motion-<room>-dark` or `--board-v2-film-lighting-hospital-ward-four-dark`.
- **`apps/game/hosted/scene-board.mjs`** (the comic board's scene mode) reads `--bm-scene-<zone>-back` and its layers.
- **`apps/game/hosted/board-v2-scene.mjs`** reads the capsule's `--board-v2-art-capsule-*`.
- **`apps/game/hosted/board-v2-films.mjs`** takes the films' drawing functions; under this release, from the ports.
- **Dispatch by exact release.** These pictures and ports belong to the art release that registers them, after `design-0.7.0`. Every earlier release keeps its bundles and drawing modules byte for byte. A board draws the new rooms only under that release, together with the new crew, as the crew's exact-release dispatch does.

## What is unverified, and what comes next

- **Unverified:**
  - no phone has drawn these pictures or the films' frames;
  - the bundles' sizes after registration;
  - the owner has not seen the lights-out pictures or the films' pieces separately.
- **Integration:** register the release ([DSN-REQ-18](integration-requests.md#dsn-req-18)), build the four bundles' new versions, and pin the ports.
- **Frontend:** port the films' code, check the consumers and the exact-release dispatch, then measure on devices.
- **Designer:** review the board's captures of the new rooms (lit, in a Blackout, and the Captain's and the Hospital's films) before Integration merges the adoption.
