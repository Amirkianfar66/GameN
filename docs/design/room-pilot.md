# Room pilot: the five rooms redrawn to match the crew

**Status: a proposal for the owner, in no release. Nothing is adopted: the game, the board, the films, the five scenes, their exports and the released crew (`design-0.7.0`) are unchanged.**

**The owner's request and approval:**
- On 7 November 2026, after approving the restyled crew, the owner asked: "can you also improve each room match with he quality of the new characters? lets start with 1 room image as a test? what do you think?"
- Designer redrew Room A first, by hand.
- On 8 November 2026 the owner answered: "I am really happy with rooms let do it for all".

The other four rooms are redrawn here in the same hand and as dark, for the owner's check:
- the Command Room;
- Room B;
- the Hospital, as the board shows it today: the ward of four berths;
- the Jail.

## What to look at

- **The five together:** [`design/room-pilot/review/board.png`](../../design/room-pilot/review/board.png), each room with the approved crew in its places.
- **Each room, today and redrawn:**
  - [`compare-command-room.png`](../../design/room-pilot/review/compare-command-room.png)
  - [`compare-room-a.png`](../../design/room-pilot/review/compare-room-a.png)
  - [`compare-room-b.png`](../../design/room-pilot/review/compare-room-b.png)
  - [`compare-hospital.png`](../../design/room-pilot/review/compare-hospital.png)
  - [`compare-jail.png`](../../design/room-pilot/review/compare-jail.png)
- **The pictures themselves:** `design/room-pilot/review/<room>.back.svg`, plus `<room>.<layer>.svg` for each layer drawn in front of the places behind it (Room B's bench, the Command Room's table, the ward's berths). They can be opened in a browser and zoomed into.
- **Live:** run `node design/tools/serve.mjs`, then open `/room-pilot/review.html?room=<room>`. Use `?view=board` for the five together, or `?view=room&room=<room>` for one room at 1024 × 768.
- **Write and render again:** `node design/tools/room-pilot-render.mjs` (needs `CHROME_PATH`). Add `--pictures` to write the pictures and the record only. `renders.json` records each file's SHA-256.

The crew are the release's own figures (`design/crew-drawing/source/`). They are dressed as the board dresses them: a gown in the Hospital, a prisoner's suit in the Jail. They are layered as the board layers them:
- each figure at its slot's own point, scale and facing;
- bodies and the room's layers by depth;
- every figure's front layer over them.

## What stays the same

| What | How it is kept |
| --- | --- |
| The scenes: places, slots, focus, frame, layers and press areas | **Command Room, Room A, Room B and the Jail** use the reviewed scenes in `design/board-motion/scenes/` as they are: the same objects, which is tested. **The Hospital** is the four-berth ward the board shows today (`HOSPITAL-4-2026-10-18`). Its places and layers are given by `design/room-pilot/ward-four.mjs` and tested equal to the runtime port's `wardFourScene()` for 7, 8 and 9 players |
| The camera and the pictures' size | The same oblique camera. Each picture is 1024 × 768, the back and each layer, like today's |
| Every shape, where it is | **Room A** is drawn by hand, with each prop at its own place and size. **The other four** are redrawn shape for shape from today's pictures by `design/room-pilot/ink-room.mjs`. Every shape of every picture is drawn again (tested): each pool of light as a pool, each cone as a shaft. Each pool's dotted rim is left out only because the pool is drawn whole |
| The colours | Each room's family (tokens 0.5.0 `color.room.*`), with the shared ink and paper. Every colour drawn is one of these, the crew's rim light, or one of them darkened toward ink (tested). A family's own tones are as near a team's accent as they are today, as the tokens record. Every other colour keeps at least 30 (CIE76) from each team's accent (tested) |
| What they say | Nothing: no words, no numbers, and nothing that says which rooms connect |

## What changes: the drawing

- **The crew's ink.** Everything is drawn with the crew's own canvas (`design/crew-drawing/source/ink.mjs`, imported unchanged):
  - a hand-drawn, wavering brush outline where today's shape has one;
  - a cel shadow on the side away from the light, which comes from the upper left as it does on the crew;
  - hatching and a rim light in that shadow, and a scratched grain.

  Lines are drawn by hand, wavering a little. Today's halftone dots become the crew's hatching.
- **Noir, as dark as Room A.**
  - Each room's back wall and deck are printed one step darker in its own family, as Room A's are; the side walls keep their step.
  - The gold and teal families are lighter than the blue at every step. So the Command Room and the Hospital go one step further, to whichever tone is nearer Room A's in lightness (`matchedTone`; tested within a factor of two of Room A's).
  - Fittings and props keep their tones, so they stand out against the darker room.
- **The light.**
  - Today's cones become shafts from the ceiling bars that fade toward the deck, with dust in them. The Command Room's one broad cone is fainter, so the great window stays dark.
  - The pools are one hard-edged step of light, with a soft heart and a dotted fringe.
  - The ceiling bars glow, the side walls fall into the dark toward us, and a vignette gathers the dark at the panel's edges.
- **Room A, as approved.** One correction: its heavy frame line is now drawn behind the props, as today's scenes draw it. Before, it crossed the crates and the canister in front of the back wall (tested).

## Measured

- **Size.**

  | Room | Today | Redrawn |
  | --- | --- | --- |
  | Command Room | 20 KB (4.4 KB gzipped) | 369 KB (123 KB gzipped) |
  | Room A | 26 KB (5.3 KB) | 330 KB (104 KB) |
  | Room B | 28 KB (5.6 KB) | 458 KB (138 KB) |
  | Hospital | 39 KB (10.1 KB) | 354 KB (114 KB) |
  | Jail | 14 KB (3.0 KB) | 271 KB (83 KB) |
  | **All five** | **127 KB (28 KB)** | **1.78 MB (562 KB)** |

  Most of it is outline path data. A release would bake and trim it (fewer points along straight edges, coarser numbers), or ship rasters at twice the size. The budget would be agreed with Frontend first.
- **Tests.** `packages/design-tokens/test/room-pilot.test.mjs` (7 tests) checks:
  - the scenes, including the ward against the runtime port;
  - that every shape is drawn again;
  - well-formed, deterministic pictures with no shared id;
  - Room A's frame order;
  - the colours and the darkness;
  - that the review files are what the tools write;
  - that nothing in the game or in a release refers to the pilot.

## Not covered, and what comes next

- **No phone has shown it.** The review is desktop Chrome.
- **The lights-out pictures** (`design/board-v2/assets/lighting/<room>.dark.svg`) are generated from each room's picture. They would be regenerated from the new ones at adoption, and are not drawn here.
- **Other Hospitals.** The roster-sized ward (7, 8 or 9 berths) of the earlier ruleset, and the two-bed sick bay that the board no longer shows, are not redrawn.
- **For the owner:**
  - Are the five right?
  - Should any room be darker or lighter?
  - More or less texture?
  - Any light that should be warmer or cooler?
- **Then a versioned release, as the crew had in DSN-REQ-17:**
  - the pictures baked as the scenes' layers within an agreed size budget;
  - the lights-out pictures regenerated;
  - Integration registers it, and Frontend adopts it.

  Until then the pilot is a design review only.
