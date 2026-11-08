# Room drawing release: the five rooms, redrawn to match the crew

**Status: a Designer candidate for Integration ([DSN-REQ-18](integration-requests.md#dsn-req-18)). Nothing is registered or active: every surface keeps drawing today's rooms until Integration builds and registers this release and Frontend dispatches it by exact release.**

**The approval.**
- On 7 November 2026 the owner asked for the rooms to match the restyled crew, one room first as a test.
- On 8 November 2026 the owner approved:
  - Room A: "I am really happy with rooms let do it for all";
  - then all five: "yes I am happy".
- The owner's words and what they decide are in [owner-decisions.md](owner-decisions.md). The review, with each room today and redrawn, is [PR #197](https://github.com/Amirkianfar66/GameN/pull/197) and [room-pilot.md](room-pilot.md).

This release, **`room-drawing-1.0.0`**, packages the approved rooms for the board:
- each room's back picture;
- each layer drawn in front of its places;
- each room's lights-out picture for the Blackout, drawn from the redrawn room.

All are trimmed for size.

## What is in it

| Path | What it is |
| --- | --- |
| `design/room-drawing/assets/` | The 18 exports, each an SVG of 1024 × 768 in the scene's own units, and `manifest.json`: each export's SHA-256, size, kind, depth, and the bundle, CSS property and shipped picture it replaces, with that picture's SHA-256 |
| `design/room-drawing/release-candidate.json` | The record: the approval, every source, dependency and input with its SHA-256, the trim, the consumers and their dispatch, what is not replaced, the sizes |
| `design/room-drawing/review/` | `night.png`: each room released, lit and with the lights out, beside today's lights-out picture. `renders.json`: the trim's evidence, each export and its untrimmed picture compared in desktop Chrome |
| `design/room-pilot/` | The drawing the exports come from: `rooms.mjs` (the five rooms), `room-a.mjs` (Room A, by hand), `ink-room.mjs` (the other four, shape for shape from today's pictures), `ward-four.mjs` (the ward's places), `night.mjs` (the lights-out pictures) and `trim.mjs` (the trim) |

Write and check:

```sh
node design/tools/room-drawing-export.mjs           # assets/ and release-candidate.json
node design/tools/room-drawing-export.mjs --check   # the same, compared with the files; writes nothing
node design/tools/room-drawing-render.mjs           # review/ (needs CHROME_PATH)
node --test packages/design-tokens/test/room-drawing.test.mjs
```

## The exports and what each replaces

Each export replaces exactly one picture the board reads today, under the same CSS property:
- **`scene-art`** comes from `design/board-motion/assets/board-motion.scenes.css` and the pictures in `design/board-motion/assets/scenes/`.
- **`board-v2-motion-art`** comes from the catalog `design/releases/board-v2-motion-art.json`.
- **`board-v2-films-art`** comes from the catalog `apps/game/hosted/board-v2-film-art/catalog.json`: the four-berth ward and its lights-out picture.

| Export | Kind | Depth | Size (gzipped) | Replaces | Bundle |
| --- | --- | --- | --- | --- | --- |
| `command-room.back.svg` | back | - | 81 KB (23.4 KB) | `--bm-scene-command-room-back` | `scene-art` |
| `command-room.table.svg` | layer | 470 | 11 KB (3.5 KB) | `--bm-scene-command-room-table` | `scene-art` |
| `command-room.dark.svg` | dark | - | 85 KB (24.2 KB) | `--board-v2-motion-command-room-dark` | `board-v2-motion-art` |
| `room-a.back.svg` | back | - | 123 KB (31.5 KB) | `--bm-scene-room-a-back` | `scene-art` |
| `room-a.dark.svg` | dark | - | 114 KB (29.3 KB) | `--board-v2-motion-room-a-dark` | `board-v2-motion-art` |
| `room-b.back.svg` | back | - | 107 KB (26.8 KB) | `--bm-scene-room-b-back` | `scene-art` |
| `room-b.bench.svg` | layer | 470 | 26 KB (6.7 KB) | `--bm-scene-room-b-bench` | `scene-art` |
| `room-b.dark.svg` | dark | - | 123 KB (30.1 KB) | `--board-v2-motion-room-b-dark` | `board-v2-motion-art` |
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

**The conventions.**
- **The box and camera.** Every export has the box and camera of the picture it replaces, so every place, slot, focus, frame and press area is unchanged. The scenes and the ward's places are tested unchanged in `room-pilot.test.mjs`.
- **Layering.** A back picture is drawn behind every place. A layer is drawn at its depth: the board paints it at z 2 × depth + 1, over the places behind it. A lights-out picture is the back and its layers together, like the picture it replaces.
- **Static files.** Each export is an SVG element with no XML declaration or comment. It is static: no script, style, foreign object, image or external reference, and every `url()` and `href` points inside the file.
- **Public art**, the same on every screen. Nothing drawn depends on a role, team, ability, private choice or seat. Every berth of the ward is drawn alike, as today.

**Not replaced.**
- The scene art's two-bed sick bay (`--bm-scene-hospital-back`, `-bed-left`, `-bed-right`), which the board no longer draws.
- The roster-sized ward of the earlier ruleset (`--board-v2-art-ward-*` and `--board-v2-motion-hospital-ward-<n>-dark`). The board's Hospital now is the four-berth ward (`HOSPITAL-4-2026-10-18`), redrawn here.

## How the pictures are made

1. **The drawing** ([room-pilot.md](room-pilot.md)):
   - Room A is drawn by hand. The other four are redrawn shape for shape from today's pictures.
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
| Today's 18 pictures, as files | 229 KB | 45 KB |
| The release's 18 exports | 1.04 MB | 274 KB |
| The same, untrimmed | 3.56 MB | 1.11 MB |

The rooms are about six times today's size gzipped, for the crew's hand-drawn line.
- **The bundles:** Integration builds them as data URIs and reports their sizes.
- **On phones:** Frontend measures decode time, frame time and memory on a physical low-end Android phone and an iPhone, by the agreed protocol.
- Until then, every performance figure here is desktop-only or unmeasured.

## Consumers and dispatch

- **`apps/game/hosted/board-v2-host.mjs`**:
  - reads `--bm-scene-<room>-back` and its layers for the Command Room, Room A, Room B and the Jail;
  - reads the four-berth ward's `--board-v2-film-scenes-hospital-ward-four-*`;
  - in a Blackout, reads `--board-v2-motion-<room>-dark` or `--board-v2-film-lighting-hospital-ward-four-dark`.
- **`apps/game/hosted/scene-board.mjs`** (the comic board's scene mode) reads `--bm-scene-<zone>-back` and its layers.
- **Dispatch by exact release.** These pictures belong to the art release that registers them, after `design-0.7.0`. Every earlier release keeps its bundles byte for byte. A board draws the new rooms only under that release, together with the new crew, as the crew's exact-release dispatch does.

## What is unverified, and what comes next

- **Unverified:** no phone has drawn these pictures; the bundles' sizes after registration; the owner has not seen the lights-out pictures separately.
- **Integration:** register the release ([DSN-REQ-18](integration-requests.md#dsn-req-18)) and build the three bundles' new versions.
- **Frontend:** check the consumers and the exact-release dispatch, then measure on devices.
- **Designer:** review the board's captures of the new rooms, lit and in a Blackout, before Integration merges the adoption.
