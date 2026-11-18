# Room B sheets PV6-B to PV6-E

The kit that made the four one-view picture sheets of Room B, and everything it drew in code for them. Each sheet asks the image tool to paint one player's view: PV6-B is Juno's, PV6-C Lyra's, PV6-D Atlas's and PV6-E Vega's. These are the same method and camera as PV6-A, Mira's view. The kit's output includes the guides, masks, split maps, camera reports, staging, visits, manifests and prompts. Development only: none of it is an asset or contract, and the game never loads it.

These are the sheets as published to the Designer team on 18 November 2026:

| Sheet | Version | Published | Its tool |
| --- | --- | --- | --- |
| PV6-B | 4 (the food capsule painted in its own step 3) | 1795009181-bcdd | `pv8_tools.py` |
| PV6-C | 7 (step 2 done, PV6-C-3; step 3 paints the food capsule, Juno's stool and the two vent strips, four separate shapes, the stool's seat trimmed by the glass jars step 2 painted on the cart) | 1795017006-7490 | `pv8_tools.py` |
| PV6-D | 2 (the visitor's eating spot moved out of frame) | 1795006672-1dbd | `pv7_tools.py` |
| PV6-E | 3 (Juno's stool painted alone in step 3) | 1795013666-8d7e | `pv8_tools.py` |

## What is here

The folders keep the layout the kit was built in, so every relative import and path works unchanged.

| Path | What it is |
| --- | --- |
| `pv8/make8.sh` | The whole build: the steps below, in order. Calls no service and generates no picture |
| `pv8/` | The steps:<br>• `guide8.mjs`: the guides as SVG (the empty room, the stations, the colour regions, the furniture outlines, and step 2's guide without the pieces step 3 paints), rendered by `render8.cjs`<br>• `pieces8.mjs` and `kit8.py`: the PLACE masks (the furniture's outlines grown 6 px), step 3's masks (the food capsule's outline grown 2 px; Juno's stool's grown 2 px, less every other piece's outline and, in C, less the cart's lift from the accepted step 2 grown 1 px; C's two vent strips' plaques grown 1 px) and the split maps<br>• `strips8.py` and `trim8.py`: C's vent strips, cut from its step-1 picture (`strips-C.json`), and the seat's trim, from its step-2 cart's lift (`trim-C.json`). They keep boxes, row runs and the pictures' sha256 only<br>• `prompts8.mjs`: the prompts<br>• `report8.mjs`: the camera reports and staging<br>• `visits8.mjs`: the walks to the capsule and back<br>• `plan8.mjs`: the plan and walks figures<br>• `build8.py`: the manifests and publishing folders<br>• `dryrun8.sh`: each sheet's tool run on its own files<br>• `dry3on8.py`: C's s3 run on its accepted step-2 picture and checked (`s3check-C.json`: hashes and counts only)<br>• `sheet8.mjs`: the pages<br>• `lens8.py`: the food capsule's painted glass, measured from its layer's pixels<br>The folder also holds the modules these import (`units8.mjs`, `views8.mjs`, `stage8.mjs` and others), the marks, and the crew stand-ins |
| `pv8/pub-B/` to `pv8/pub-E/` | Each sheet's published files, apart from the pictures listed below:<br>• its page (`sheet-pv6x.html`)<br>• its manifest (`room-b-pv6x.json`: kit, prompts, expected hashes, staging, visits)<br>• its prompts (`room-b-pv6x-prompts.txt`)<br>• its camera report, `visits-A1.json`, its marks<br>• its tool, `lift5.py` and `colour-check-v4.py`<br>• in `img/`: the code-drawn guides, masks, split maps and figures |
| `pv8/people-B/`, `pv8/people-D/`, `pv8/people-E/` | Views B's, D's and E's people data for the In-game animation builder: where the people in view stand on both phones, and the furniture's depth order around them.<br>• View B also has the food capsule as PV6-B-4 paints it: the hatch's four corners and the lens, on both phones.<br>• View E has Juno's stool in its own bands. It stays behind Juno, as Juno's seat, and is never drawn under the furniture pixel that step 3 painted it over. `stripcheck8e.py` checks those pixels against every frame of the people, at rest and walking (`strip-check.json`).<br>• the scripts `export8b.mjs`, `occlude8b.py` and `page8b.mjs`, and their D and E counterparts<br>• their JSON: `scene.json`, `occlusion.json`, `picture.json`, `geo-B.json` (with `_geo-B.json`, the same bytes, which the occlusion scripts read) and `guide-openings.json`, and the same for D and E<br>• in `_in/`, the image session's lift records; for B, its record of the painted hatch and the glass measured by `lens8.py` (`glass-B.json`)<br>The depth bands are not here, because they are cut from the image tool's lifted layers. A run needs the plate, the furnished pictures and their layers from the records page, by the names and hashes that `picture.json` gives, and copies of the crew stand-ins that `scene.json` names (from `pv8/`).<br>`picture.json` names each picture by its records-page path and sha256, with no links (the Lead, 18 November). The first committed `people-B/picture.json` and `people-D/picture.json` also held two private links each, the records page's and the sheet's. This version drops them. Those files' sha256 were people-B `b17bef45dc7c534b59b484c9b4cbf5d8fd6f47aaef58b15f74c4ec41cce64fed` (9857a899) and people-D `fb06ba16b1750a451888e9abaf4be799e521f93df8de82cd6b26f2414ead0128` (c82dc861) |
| `pv8/verify-published8.sh`, `pv8/_publist-B.txt` to `_publist-E.txt` | The published-copy check, with each sheet's list of published files. It runs on every file read back from a publish:<br>• each file byte for byte against `pub-<view>/`<br>• the page against its skeleton<br>• no model name or identifier<br>• none of the owner's pictures<br>• then the dry run on the copy |
| `pv7/`, `pv6/`, `pv5/` | Earlier steps the kit still imports:<br>• PV6-A's manifest, staging, report and prompt code<br>• the search and cover checks<br>• the lift (`pv5/lift5.py`) |
| `ring/`, `vis/`, `vis-design-v1.json` | The room's geometry, the crew stand-ins' masks, and the owner's layout design v1 as it was read (the same bytes as `docs/design/room-visibility/gamen-room-visibility-design-v1.json` in c4577485).<br>`ring/room-b-pv1p.json` is sheet PV1-P's manifest without its two page links and its record template's terms line. The kit reads only its `blocks` |
| `pv6b/skeleton.html` | The page skeleton that the published-copy check wraps a sheet in |
| `pv6/refsrc-sha256.txt` | The sha256 of the owner's four reference pictures, so the check can refuse them. The pictures themselves are not kept here |

The crew stand-ins (`pv8/B1.png` and `pv8/B?-shape.png`, and the masks in `ring/alpha.json` and `vis/alpha-B3s.json`) are renders of the approved crew drawing, made by the earlier layout test.

## Not here, on purpose

- **Every picture the image tool made.** This includes PV6-A-2, PV6-A-3, PV6-B-1, PV6-B-2, PV6-D-1 to PV6-D-4, the PV6-E pictures and the rest. They are on the team's records page, by name and sha256. A run needs two of them in `pv6b/`:
  - `PV6-A-2.png` (`738061ae21931cabf70ba7e82ebb916c1dabcc5c2b16ac3bf6c65663d13783a5`)
  - `PV6-A-3.png` (`731ec58d6773dc0ae6fd17ec4e12bf7cecec92a8b66ff25f99408a1e6b76e4dc`)

  The kit copies them into each sheet as the second picture, and the same-room check reads PV6-A-2.
- **Each sheet's `img/pv6-X-cast.png` and its dry-run outputs (`_dry/`).** The cast is PV6-A-2 projected onto the room's planes, so it holds that picture.
- **Views B's, D's and E's depth bands, the capsule's and the stool's bands, E's strip-check crop and their pages,** which are cut from the image tool's lifted layers or drawn over them.
- **Inputs from the records page and checks on real pictures** (`pv8/_in-*/`, `pv8/real-*/`, and the strips' zoom crops in `pv8/strips-*/`), which hold the image tool's pictures or pieces of them.
- **The owner's reference pictures.**

`.gitignore` keeps all of these, and the files the build writes again on every run, out of git.

## Run it

It needs Node 22, Python 3 with NumPy and Pillow, and Playwright's Chromium (`render8.cjs` renders the guides). It was last run with Node 22.23.4, NumPy 2.5.3, Pillow 12.3.0 and Playwright 1.63.0.

The kit draws the people with the room scene's modules from PR #284's head, `5f1b1c83`, imported as `../../pr284/`. Two of them, `design/phone-ui/components/tag-layout.mjs` and `room-scene/figure-extents.mjs`, are not on `main` yet. So build it beside that commit:

```sh
mkdir -p "$WORK" && cp -R design/room-b-sheets "$WORK/roomb"
git worktree add --detach "$WORK/pr284" 5f1b1c83
# put PV6-A-2.png and PV6-A-3.png from the records page into "$WORK/roomb/pv6b/", checked against the sha256 above
bash "$WORK/roomb/pv8/make8.sh"          # about three minutes; rewrites pub-B to pub-E and prints each sheet's dry run
```

`PV8_LAYOUT` chooses the capsule's layout. It defaults to `A1`, the owner's choice: one counter unit on Atlas's bench. The build is deterministic: a run in a fresh copy of this folder rewrote every file here byte for byte. After a publish, read every file back into a folder and run `bash pv8/verify-published8.sh <folder> <view>`.

C's s3 check (`dry3on8.py`) needs PV6-C-3 and its cart's lift (`img/PV6-C-3-B-laptop-cart.png`) from the records page. To run it again, set `PV8_C3` and `PV8_C3_LIFT` to their paths. Without them, `sheet8.mjs` uses the kept `s3check-C.json`, and stops if it is not this manifest's.

The model-name scan takes its words from `pv8/_scan-words.txt`, one pattern a line. That file is kept out of git so that no committed file names a model, and without it the check stops. The Designer team has the list.

Every picture made from these sheets is AI-generated. Its record on the records page says so, with its tool, prompt, date and settings.
