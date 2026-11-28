# Room views: Rooms A and B

Rooms A and B as painted room pictures, one from each player's place, five views a room. Each view keeps:

- its plate, the painted room;
- the layers lifted from it for furniture that people pass behind;
- its data;
- copies of its image records.

Beside the views are the tools that made them: the sheets with their prompts and manifests, and the composite, lift and data scripts.

The owner approved Room A on 28 November 2026 ("Approved lets move forward"). On 19 November the owner asked for Rooms A and B to be saved together once Room A was done. Both are recorded in [owner-decisions.md](../../docs/design/owner-decisions.md) on PR #280, which is not on `main` yet. The page for the whole team is [docs/design/room-views.md](../../docs/design/room-views.md).

**Development material.** The game loads none of this. It changes no game rule and nothing the game draws today. How the game takes the painted rooms is a later step for Integration and Frontend.

**Every room picture here is AI-generated.** That covers the plates, the lifted layers, the front parts, the bands and the masks cut from them. Each kept picture's record copy says so (`generated: true`, "AI-generated image"). The people, their name tags, the screens' pictures, the room's controls and the voyage in the windows are drawn by code at run time and are not in these files. None of the owner's reference pictures are here.

## What is where

| Path | What it is |
| --- | --- |
| `plates.json` | Every plate: file, bytes, sha256, the sha256 of its decoded RGB pixels, how it was made, whether it carries the image tool's content credentials, and its records. Also the image tool's pictures the plates and layers were made from, which are not here, each with its sha256, size and records page |
| `room-a/view-a/` … `view-e/` | Room A's views: the plate, `layers/`, `front/` (parts drawn over people standing behind them), `data/` and `records/` |
| `room-a/kit/` | Room A's tools in their working layout (below) |
| `room-b/view-a/` … `view-e/` | Room B's views: the plate (the empty room), `layers/` (the furniture lifted from each step's picture), `bands/` (the layers grouped by depth), `masks/` (the openings), `data/` and `records/` |
| `room-b/kit/` | Room B's sheet kit and view A's page tools ([its README](room-b/kit/README.md)) |

### Room A

The camera is the PV6 camera for every view: straight lines, 1024 × 1536, the horizon at 714 px. Each view has its own camera report in `room-a/kit/camera-report-<X>.json`.

| View | From | Plate | How it was made |
| --- | --- | --- | --- |
| A | Vega | `ra-A-4-frame.png` | RA-A-4, with the electrical cabinet's right frame drawn in code (`kit/sheet/frameA.py`) |
| B | Mira | `ra-B-3c.png` | RA-B-3, its cut pieces completed and the screens fitted in code (`kit/sheetB/compositeB3.py`) |
| C | Echo | `ra-C-2c.png` | RA-C-2, completed in code, its screen filled black and fitted (`kit/sheetC/compositeC2.py`) |
| D | Atlas | `ra-D-4c.png` | RA-D-4, the food capsule closed on its own ink and the toolbox's shadow added in code (`kit/sheetD/compositeD4c.py`). It sits over RA-D-3hc and RA-D-3x, two earlier code composites (`compositeD3hc.py`, `compositeD3x.py`) |
| E | Lyra | `ra-E-2c.png` | RA-E-2, the crates' left ends and the cabinet's right frame completed in code (`kit/sheetE/compositeE2.py`) |

Each view's `data/`:
- **`geo-<X>.json`:** the room's geometry in the picture.
- **`scene-<X>.json`:** the plate and where each person stands on each phone.
- **`occlusion-<X>.json`:** which pieces are drawn in front of whom.
- **`lift-<X>.json`:** how the layers were lifted from the plate.
- **Where in view:**
  - `screens-<X>.json`: the screens' corners (B, C, D);
  - `window-<X>.json`: the round window's fitted ellipse and its traced opening (B, D);
  - `painted-D.json`: the food capsule's painted box.
- **View A only:** `plate-A.json` and `marks-A.json`. View A has no `layers/`: no piece stands nearer than a person it overlaps, so the plate is drawn first and the people over it. Its `occlusion.json` names the two cases left to the Motion builder: Lyra's hands inside the hatch's opening, and a visitor behind the hatch's lid.

### Room B

| View | From | Plate | Layers lifted from |
| --- | --- | --- | --- |
| A | Mira | `PV6-A-2.png` | PV6-A-3 (the furniture) |
| B | Juno | `PV6-B-1.png` | PV6-B-3 (the furniture), PV6-B-4 (the food capsule) |
| C | Lyra | `PV6-C-2.png` | PV6-C-3 (the furniture); PV6-C-4 (the capsule, Juno's stool and the vent strips); PV6-C-5 (the jars' tops) |
| D | Atlas | `PV6-D-3.png` | PV6-D-4 (the furniture) |
| E | Vega | `PV6-E-1.png` | PV6-E-3 (the furniture), PV6-E-4 (Juno's stool) |

Each view's `data/`:
- **Always:** `scene.json`, `occlusion.json`, `picture.json` (every picture by name and sha256), `geo-<X>.json`, `guide-openings.json` and `masks.json`.
- **Where needed:**
  - `glass-<X>.json` and `hatch-C.json`: the capsule's painted glass and hatch;
  - `bench-<X>.json`: the painted back edge of Atlas's bench;
  - `edge4-C.json`: the dispenser edge drawn in code;
  - `strip-check.json`: E's stool strip, checked against every frame of the people;
  - `cover.json`: view A's tag cover.

The capsule, the stools, C's wall strip and C's step-4 fixes have their own bands (`capsule-*`, `stool-*`, `wall-*`, `fix-*`).

## The records

`records/` in each view holds the image builder's records of every picture in the plate's and layers' lineage, with their colour and lift records:
- **Room A:** 30, from the page "Room A Records", version `1795828303-eac0`.
- **Room B:** 35, from the page "Room B Four Views", version `1795044447-5e2a`.

Each is a copy, not the page's bytes:
- **Removed:** the model field. No model identifiers go in what we push.
- **Replaced:** each claude.ai page link, by the page's name.
- **Unchanged:** everything else, including the tool, the terms (the record of ownership), the request ids, the prompts, the settings, the checks and the reviews.

Each copy ends with `copy`: the records page and version it came from, and the original record's sha256.

## Room B's plates keep the tool's content credentials

Room B's five plates are the image tool's own files, byte for byte. Each carries the tool's embedded content credentials (a `caBX` chunk): its own disclosure that the picture is AI-generated, which also names the tool's model. They are kept as they are, so that disclosure stays.

Room A's plates are code composites and carry none.

`plates.json` gives each plate's file sha256 and its pixel sha256, so a copy whose metadata is stripped can still be matched.

## What is not here

- **The pictures the plates and layers were made from:**
  - Room A: 12 step pictures and 6 raw edits.
  - Room B: 9 step pictures and 5 raw edits.

  That is 32 pictures, 88.8 MB. `plates.json` names each by sha256, size and records page. **The repository holds the final plates, layers and data, but it cannot rebuild them alone.**
- **Pictures not kept:** rejected attempts, review crops and overlays, the pages' captures, and the check, owner and data pages themselves. They stay on their published pages.
- **Kit pictures that a kit writes again and no manifest pins by sha256.** These are Room A's:
  - the phone previews;
  - the guides' SVG sources and annotated SVGs;
  - the furniture, station, capsule and own-place drawings, the capsule labels and the seam previews;
  - the crew stand-in renders (`vis/`, `checkV/<X>/standin-*`, `owner/standin-*`).

  That is 144 files. Room B's kit keeps every picture its manifests pin, and its crew stand-ins, which it reads as inputs.
- **`tag-layout.mjs` from PR #284's head.** View A's page in Room B imports it; the component keeps its one source.

## The kits

The scripts are as they last ran in the working folders. They were not run again from this folder.

**Folder names.** Room A's kit reads a few of Room B's files by relative path (`../roomb/`, `../../roomb/`). To run either kit, copy both into one folder as `rooma` and `roomb`:

```sh
mkdir -p "$WORK" && cp -R design/room-views/room-a/kit "$WORK/rooma" && cp -R design/room-views/room-b/kit "$WORK/roomb"
```

**Missing inputs.** A run then needs the pictures it starts from:
- the plates and layers, from the view folders;
- the step pictures and raw edits, from the records pages, by the hashes in `plates.json`;
- the room scene's modules from PR #284's head, as Room B's README says.

**Model-name scan.** The publishing checks take their scan words from `roomb/pv8/_scan-words.txt`. That file is kept out of git, and the Designer team has the list.

**Tools.** Node 22, Python 3 with NumPy and Pillow, and Playwright's Chromium.

| Room A kit | What it is |
| --- | --- |
| `sheet/`, `sheetB/`, `sheetB-v2fit/`, `sheetC/`, `sheetD/`, `sheetE/` | Sheets RA-A to RA-E. Each builds its guides, masks, split and region maps, prompts and manifest into `pub/` (`make*.sh`). Each also has its tool and colour check, the composites that finish the plate, and the lifts that cut its layers. `sheetB-v2fit/` is sheet RA-B's version 2 build, which measures RA-B-1 before it writes the manifest |
| `sheetV/` | The templates sheets B to E were made from |
| `checkV/` | Views B to E's data and check pages: `exportV.mjs`, `occludeV.py`, `standinsV.cjs`, `buildCheckV.mjs`, `captureCheckV.cjs`, `labelCheckV.py` |
| `data/`, `owner/` | View A's data and its owner page. The cabinet's frame is drawn by `sheet/frameA.py` |
| `ownerRA/` | The five-view owner page. `windowB.py` fits view B's round window |
| `*.mjs`, `*.json` at the top | Room A's plan: the staging, the places, the camera reports, the plan page and its stand-ins |

## Approvals and pages

The pages are named by title and version. They are private to the owner and the team.

- **Room A, all five views:** the owner's approval of 28 November 2026, on "Room A, five views" at version `1795827906-1fb0`. The page now carries the approval as version `1795828624-e1e7`.
- **Room A's views:**
  - view A, the owner's go of 27 November on "Room A from Vega's place", version `1795100576-d45f`;
  - views B to E, accepted by the Lead on their check pages: B `1795819897-b736`, C `1795822912-6084`, D `1795826435-303c`, E `1795823204-ad13`.
- **Room A's plan:** approved on 19 November, with a cap under $5. Room A used 20 pictures, about $1.16.
- **Room B:** the owner approved Room B's five pictures, in its purple, on 17 November. The 19 November entry keeps Room B's work for this save. Its data pages:
  - "Room B Skylight Test" (view A), `1795015265-a726`;
  - "Room B View B Data", `1795025861-974e`;
  - "Room B View C Data", `1795028820-fd4e`;
  - "Room B View D Data", `1795025863-4d9b`;
  - "Room B View E Data", `1795024756-ff77`.
