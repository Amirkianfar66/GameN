# Room pilot: Room A redrawn to match the crew

**Status: a proposal for the owner, 7 November 2026. Nothing is adopted. The game, the board, the films, the five scenes, their exports and the released crew (`design-0.7.0`) are unchanged.**

The owner asked, after approving the restyled crew: "can you also improve each room match with he quality of the new characters? lets start with 1 room image as a test? what do you think?" Designer recommended one room first, Room A, the crew bay. The game plays most of its time there, and it has the most kinds of places. It is redrawn here in the crew's own hand so the owner can judge the direction before the other four rooms.

## What to look at

- **The comparison:** [`design/room-pilot/review/compare.png`](../../design/room-pilot/review/compare.png).
  - Today's Room A and the redrawn one, with the approved crew in its five places: A1 Vega at the workstation, A2 Mira thinking, A3 Lyra at the hatch, A4 Atlas at the crates, A5 Echo at the junction box.
  - Below: the part of each that every panel shows whole (the scene's focus), and the redrawn room empty.
- **The redrawn room, large:** [`room-a.png`](../../design/room-pilot/review/room-a.png), 1024 × 768 at twice the pixels.
- **The picture itself:** [`room-a.svg`](../../design/room-pilot/review/room-a.svg), to zoom into in a browser.
- **Live:** run `node design/tools/serve.mjs`, then open `/room-pilot/review.html`. Add `?view=room` for the room with the crew, or `?view=empty` for the room alone.
- **Render again:** `node design/tools/room-pilot-render.mjs` (needs `CHROME_PATH`). It writes `design/room-pilot/review/` and `renders.json`, which records each file's SHA-256.

The crew are the release's own figures (`design/crew-drawing/source/`), placed as the board places them:
- each at its slot's point, scale and facing;
- bodies from the farthest place to the nearest;
- every front layer over every body.

## What stays the same

| What | How it is kept |
| --- | --- |
| The places, slots, focus, frame and press areas | The pilot reuses the scene, `ROOM_A` from `design/board-motion/scenes/room-a.mjs`, as it is. It is the same object, and that is tested |
| The camera and the picture's size | The same oblique camera: back wall 120..904 × 70..372, deck from y 372 to 748. A 1024 × 768 back picture, like today's `room-a.back.svg` |
| The props, where they stand | Each prop is redrawn at its own place and size: A1's workstation, monitors, keyboard and mug; A2's open deck; A3's hatch, lid, hazard marks and toolbox; A4's crates; A5's junction box. The same goes for the viewport, wall console, pipes and valve, locker, crates, canister, cable coil, front toolbox, floor grate and cables |
| The colours | Room A's family (tokens 0.5.0 `color.room.roomA`), with the shared ink and paper. Every colour drawn is one of these, the crew's rim light, or one of them darkened toward ink (tested). The family's own light blue is as near the blue team's accent as it is today (CIE76 15.7, as the tokens record). Every other colour keeps at least 30 from each team's accent, as the crew's colours do (tested) |
| What it says | Nothing: no words, no numbers, and nothing that says which rooms connect |

## What changes: the drawing

- **The crew's ink.** Everything is drawn with the crew's own canvas (`design/crew-drawing/source/ink.mjs`, imported unchanged):
  - a hand-drawn, slightly wavering brush outline, heavier where a form turns away from the light;
  - a cel shadow on the side away from the light, which comes from the upper left as it does on the crew;
  - hatching and a rim light in that shadow;
  - a scratched grain.
- **Noir light.**
  - Two shafts fall from the ceiling bars, with dust in them.
  - Their pools on the deck are one hard-edged step of light, the way the crew are shaded, with a soft heart and a dotted fringe.
  - The side walls fall into the dark toward us, hatched low down, and a vignette gathers the dark at the panel's edges.
- **Wear and weight.** Worn and scratched paint, rivets, seams and scuffs. The planet in the viewport is a lit crescent with a hatched terminator.

## Measured

- **Size.** The picture is 338 KB of SVG, about 106 KB gzipped. Today's room is 27 KB, about 5.4 KB gzipped.
  - 82% of the new picture is outline path data.
  - A release would bake and trim it: fewer points along straight edges, and rounding. Or it would ship it as a raster at twice the size. The budget would be agreed with Frontend before any of that. Five rooms at today's size would be about 530 KB gzipped.
- **Drawing time.** About 50 ms to draw in Node on a desktop. That is not a phone, and a release would ship the picture baked rather than drawn.
- **Tests.** `packages/design-tokens/test/room-pilot.test.mjs` checks:
  - that the scene is unchanged;
  - that the picture is one well-formed, deterministic SVG, and that two copies on a page share no id;
  - the colour rule above;
  - that the review files are what the tools write;
  - that nothing in the game or in a release refers to the pilot.

## Not covered, and what comes next

- **No phone has shown it.** The review is desktop Chrome.
- **The lights-out picture.** Room A's lights-out picture (`design/board-v2/assets/lighting/`) is generated from the room's picture. It would be regenerated from the new one when the room is adopted. It is not drawn here.
- **For the owner:**
  - is this the direction?
  - Darker or lighter?
  - More or less texture?
  - Light that is warmer or cooler?
- **If the owner approves**, the other four rooms are redrawn the same way, each with its own places and colour family: Room B, the Command Room, the Hospital and the Jail.
- **Then a versioned release**, as the crew had in DSN-REQ-17. The new pictures would be baked as the scenes' layers within an agreed size budget, and Integration and Frontend would review and adopt them. Until then the pilot is a design review only.
