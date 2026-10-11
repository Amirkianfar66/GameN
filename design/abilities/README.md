<!-- mothership:dev-only -->

# design/abilities/: ability art and motion

`mothership:dev-only` · `abilities-0.1.0` · **a proposal**

Original artwork and comic motion for every current V1 role ability and shared game action, delivered in focused slices on the board-motion phone prototype (`design/board-motion/`). The first slice is **the Insider's file**: a private investigation board for the Insider's starting knowledge. The inventory of all 24 treatments, delivered and planned, is generated into [docs/design/abilities-inventory.md](../../docs/design/abilities-inventory.md); Frontend's instructions are in [docs/design/abilities-handoff.md](../../docs/design/abilities-handoff.md).

Nothing here changes a rule, the protocol, a contract or the reviewed manifest `design-0.2.0`. The kit is art proposed for a later export revision, adopted only through Integration.

## The Insider's file

The Insider knows the unordered set of the three players who hold Undercover, Alien and Cracker (`knowledge.insiderCandidates`), and not who holds which. The file draws exactly that:

- **Three snapshots** of the players' own chosen crew cards, pinned on a string in **seat order** (a public order, whatever order the view lists them in), each with the same seat sticker, the name on the frame's margin and the same paper query tag.
- **The three role names as one set**: label tapes on one slip, in one envelope, stamped ONE EACH, below all three snapshots and beside none of them. The order of the names is fixed (Undercover, Alien, Cracker) and never changes with the candidates.
- **One string** pinned round the four corners of the whole set, and **Who is which: unknown.** under it.

Nothing ties a role name to a portrait: not a color, a position, a line, the order things move in, an accessible name or an asset. People are written by hand on paper; roles are label tapes. Pressing a snapshot lifts it from its pin and says that player's public facts (room, health, Captain, Jail), with Show on board and Back; it never adds evidence.

It is private: drawn only inside the seat's own open card, after gameplay starts, never on the board, the shared display or a host view, and not during the setup reading stage, whose preview carries no knowledge. Closed, there is no private word in the page. When the card cannot be shown (the view is out of date, the turn's time is up) pressing Card shows a closed folder, the same for every role.

## What is here

| Path | What it is | Edit it? |
| --- | --- | --- |
| `source/dossier.svg` | The editable kit: cork, tape, pin, snapshot frame, query tag, lens, clip, stamp frame, envelope (back and front), closed folder. Each a layer, in the drawing vocabulary of `design/tools/lib/svg.mjs` and the neutral palette | **Yes. The editable source** |
| `recipes.json` | How each asset is lifted out of its source: id, version, box, anchors, use; the neutral palette; the bundle's load policy; rights | Yes |
| `assets/` | One SVG per asset, `abilities.art.css` (every asset as a custom property `--ab-asset-<id>`) and `manifest.json` (ids, versions, boxes, anchors, sizes, hashes, colors) | No. Written by `design/tools/abilities-assets.mjs` |
| `js/dossier.js` | The file: `insiderFile()`, `assemble()`, `cancelMotion()`, `closedFolder()`, the copy and the motion beats. Reference behaviour for Frontend | Yes |
| `css/abilities.css` | The reference styles: tokens only; art drawn only behind `[data-art~="abilities"]` and the crew cards behind `[data-art~="public-board"]`; the short-phone and large-text layouts | Yes |
| `contract/abilities.json` | The inventory: every treatment's roles, audience, trigger, view fields, disclosure, concept, art, motion in five forms, states, copy, review and dependencies | Yes. `docs/design/abilities-inventory.md` follows |
| `contact.html` | The contact sheet of the review pictures | Yes |
| `review/` | Review pictures at 390 x 844 and 320 x 568, measured as they are taken, the assembly frame by frame, `report.json` and `contact-insider.png` | No. Written by `design/tools/abilities-capture.mjs` |

## See it

```sh
npm run dev:review --workspace @mothership/design-tokens
# http://127.0.0.1:4320/board-motion/index.html?scenario=file.insider   the file (Card in the dock opens and closes it)
#   &names=long        twelve-character names
#   &motion=reduced    reduced motion
#   ?scenario=file.hidden, then Card: the closed folder while the view is out of date
```

Every name, seat and role in it is synthetic.

## Commands

```sh
npm run assets:abilities --workspace @mothership/design-tokens    # assets/ from the sources (--check to compare)
npm run capture:abilities --workspace @mothership/design-tokens   # review/; needs a browser (CHROME_PATH overrides the search)
npm run docs:abilities --workspace @mothership/design-tokens      # docs/design/abilities-inventory.md
npm run check:abilities --workspace @mothership/design-tokens     # no browser; refuses pictures and pages made before an edit
```

`npm run test --workspace @mothership/design-tokens` includes tests that show `check:abilities` refusing named mistakes.

## Rights

Original vector artwork made for this repository by the Visual and Motion Designer (Claude Code session) for Mothership. No third-party artwork, font, photograph or generated raster image is used. The portraits in a file are the approved crew cards (`design/source/crew/`, `design-0.2.0`), referenced, not copied.
