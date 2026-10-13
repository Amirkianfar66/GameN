<!-- mothership:dev-only -->
# Board v2: fixed slots and the Hospital ward (proposal)

**What this is.** The first step of the owner's motion specification of 13 October 2026 for the board:

- Every room's fixed slots with stable ids. Rooms A and B and the Jail have five, the Command Room one, and the Hospital one per seat.
- A Hospital drawn as a ward of seven, eight or nine berths.
- A layout in which every slot is a whole 44 px press area whatever the room's occupancy.

**The handoff:** [docs/design/board-v2-slots.md](../../docs/design/board-v2-slots.md).

**Status.** A proposal. It is not a rule, a server contract or an adopted asset, and the owner has not seen it.

## Files

| Path | What it is |
| --- | --- |
| `scenes/hospital-ward.mjs` | The ward for a roster: the approved sick bay's shell, back wall and window around a new deck and the berths. Editable source |
| `scenes/slots.mjs` | Every room's slots and anchors for a roster, and the Designer's proposal for which slot a seat takes on entry |
| `js/fit.mjs` | How the board lays out from the phone and the roster alone, with every slot's press area |
| `js/fixtures.mjs` | Synthetic boards for review (test-only) |
| `js/page.js`, `index.html`, `css/page.css` | The review page: a phone-sized board, or one room's whole scene |
| `contact.html` | The contact sheet of the captures |
| `assets/` | Generated: the ward's back layer for each roster, each berth's front layer, the manifest |
| `contract/slots.json` | Generated: the slot table for each roster, as data |
| `review/` | Generated: the captures, `index.json` and `report.json` |

## Run

```sh
node design/tools/board-v2-assets.mjs     # rebuild assets/ and contract/slots.json
node design/tools/board-v2-capture.mjs    # captures and measurements (needs Chromium; CHROME_PATH)
node design/tools/board-v2-check.mjs      # the static checks
node design/tools/serve.mjs               # then open /board-v2/index.html
```

**Page options:**

| Option | What it shows |
| --- | --- |
| `?roster=7` (or 8, 9) | The roster |
| `&fixture=ward` (or mixed, stress, empty) | Who is where |
| `&markers=1` | Position numbers |
| `&press=1` | Press areas |
| `&ids=1` | Slot ids and badge anchors |
| `?scene=hospital` | The whole ward scene at 1024 × 768 |
