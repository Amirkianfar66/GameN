# Room views: Rooms A and B

Rooms A and B are painted from each player's place, five views a room. One picture paints each view. Code draws the people and everything they use over it. The pictures, their layers and data, the tools that made them, and the image records are saved in [`design/room-views/`](../../design/room-views/README.md).

**Development material.** The game loads none of it, and nothing the game draws changes. How the game takes the painted rooms is a later step for Integration and Frontend.

## What the owner decided

These are recorded in [owner-decisions.md](owner-decisions.md) on PR #280, which is not on `main` yet:

- **17 November 2026:** Room B's colour, its purple, approved.
- **18 November 2026:** Room B accepted, all five views: "I am really happy with the result of Room B".
- **19 November 2026:** Room A's plan approved, with a cap under $5. Rooms A and B are to be saved together when Room A is done.
- **27 November 2026:** Room A's view A approved.
- **28 November 2026:** Room A approved, all five views: "Approved lets move forward". That page asks for this save.

## The views

| Room | View | From | Plate |
| --- | --- | --- | --- |
| A | A | Vega | RA-A-4, framed in code |
| A | B | Mira | RA-B-3c |
| A | C | Echo | RA-C-2c |
| A | D | Atlas | RA-D-4c |
| A | E | Lyra | RA-E-2c |
| B | A | Mira | PV6-A-2, the empty room |
| B | B | Juno | PV6-B-1, the empty room |
| B | C | Lyra | PV6-C-2, the empty room |
| B | D | Atlas | PV6-D-3, the empty room |
| B | E | Vega | PV6-E-1, the empty room |

Room A's plates are the furnished rooms. Where the painting stopped short, the furniture is finished in code, and the layers are lifted from the plate.

Room B's plates are the empty rooms. Its furniture is lifted from the later step pictures as layers and drawn by depth.

## AI-generated, and how it is labelled

Every room picture here is AI-generated: the plates, layers, bands and front parts. The labels are:

- **Records.** Each kept picture's record copy says so, with its tool, prompt, date, settings and terms.
- **Content credentials.** Room B's five plates keep the image tool's own embedded content credentials, byte for byte.
- **`plates.json`.** It lists every plate's file and pixel sha256.

The record copies leave out the model field and give the names of linked pages instead of their links.

## What is not saved

The image tool's step pictures and raw edits are not saved. That is 31 pictures, 86.2 MB. One step picture is kept, PV6-A-3, because every Room B sheet pins it as its reference picture. `plates.json` names each by sha256, size and records page. So the repository holds the final plates, layers and data, but it cannot rebuild them alone.

Rejected pictures, review crops, page captures and the review pages themselves stay on their published pages. Kit pictures that the kits draw again, and that no manifest pins, are left out.

## Still open

These come from the 28 November entry:

- **Lyra's press area.** In Vega's view at 402 × 742 with 200% text, Lyra's press area runs under the Board chip. The room scene's next version (0.6.0) fixes this by keeping offered places clear of the shell's overlays.
- **The people's motion and the visits to the food capsule.** These come with the Motion & Cinematics builder's work. That builder's Room A and Room B files join this save when its session is back.
- **The game's use of the painted rooms.** This is Integration's and Frontend's step, later.
