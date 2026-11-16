# The board's name tags: Designer's runtime component

**Version:** `board-tags-0.1.0`. **Status (16 November 2026):** built to the interface the Lead Designer approved for the board's option B, with four changes and the answers to Q1–Q4 (below), and posted for Frontend on #4 ([6909300146](https://github.com/Amirkianfar66/GameN/issues/4#issuecomment-6909300146)). Built on the phone shell's branch at `f04ab116` (shell 0.2.7, kit 0.6.1). Frontend has not connected it: it is not in the game yet, and it is not a release.

**What it is:** one layer of name tags for one panel of the board (sheet 26), whole and apart at every text size. It is #222 item 34 on the board:

> 34. **Name tags at large text** (sheets 21, 26, 53): whole, and apart from each other. Today they are clipped to "Cr…" on the board (`838558bd`). In Room B at 320 × 568 with 200 % text, the tags of Players 6 and 8 and "You" run into each other (`d1a03c87`).

**Option B** (the Lead, 16 November): the board stays Frontend's Board V2 adapter, as the owner kept "the whole board" on 11 November: its panels, art, figures, films, Blackout markers, seat choices and targets. This component replaces only Board V2's name plates. A canonical board component (option A) would need the owner first, and is not proposed.

**Board V2's plates on `main` today** (read from `apps/game/hosted/board-v2-scene.mjs` and `board-v2.css`):
- a square plate with the seat number in a box, 10 px type at every text size ("Public drawing lettering stays at the reviewed size");
- at most 76 px wide (half the panel in the capsule), ending in "…", so a long name is cut at any text size;
- nothing keeps two plates apart.

Sheet 26 draws a different tag: the room scene's rounded tag at the board's 22 px height. The native review of 11 November rated the whole board as matching sheet 26 and did not call out the plate (Q4).

## The tag

Sheet 26's board tag (`design/phone-ui/prototype/kit.css`, `.tag` and `.board-panel .tag`):
- a rounded tag, 22 px tall, on the pack's dark glass, with the seat number in a paper disc;
- the office badge after the number: the Captain's or the Officer's;
- the name, or "You" for this phone's own seat, on paper;
- "· Injured" or "· Out" after the name, in the secondary colour;
- the turn's ring on the active player's tag;
- dimmed when this viewer's offer does not reach that person (sheet 29).

**At every text size, 11 px type** (Q1). Sheet 53 draws the larger text for the room, the lists and the sheets, but not the board, so the board at the larger text is an undrawn state. The board is a drawing at its panels' size. The board's List gives every name at the player's text size (R3), and the room view's tags grow with the text, as sheet 53 draws them. **The one difference from the pack:** the pack's CSS sizes the board tag in rem, so at 200 % it would set 22 px type inside a 22 px tag. This component keeps the Standard size instead.

Measured in Chromium with the pack's tag (fallback font):

| Tag | 11 px type | 13 px | 22 px (200 %) |
| --- | --- | --- | --- |
| "4 You" | 50 px | 57 px | 87 px |
| "5 Eli · Injured" | 88 px | 102 px | 164 px |
| "12 WWWWWWWWWWWW" | 173 px | 202 px | 333 px |

At 22 px a tag is 44 px tall, so the Hospital's four tags could not be apart in its 154 px below the caption.

## Interface

```js
import { mountBoardTags, layoutTags, BOARD_TAGS_VERSION } from 'design/phone-ui/components/board-tags/board-tags.mjs';
// with design/phone-ui/components/board-tags/board-tags.css
const tags = mountBoardTags(panelElement, input);
// → { element, update(partial), suspend(), resume(), dispose() }
```

One per board panel: the five rooms and the Talk capsule. It appends one layer to the panel and draws nothing else. There are no callbacks: the layer takes no taps.

| Input | Audience | Default | Meaning |
| --- | --- | --- | --- |
| `status` | The phone's | `'live'` | `'live'`; `'stale'`, drawn as last seen; or `'concealed'`, when it empties itself |
| `versions` | The phone's | — | The match's versions, as every component takes them |
| `size` | Public | — | The panel's `{ width, height }` in CSS px |
| `keepClear` | Public | `[]` | Boxes the tags stay clear of: the room's caption, and anything else Board V2 draws over the panel (`{ left, top, width, height }`) |
| `people` | Public | `[]` | `[{ seat, name, health, office, at: { x, bottom } }]`, the people in this panel. `at.x` is the press point and `at.bottom` the foot of the press area: Board V2's `slot.pressAt` and `rect.top + rect.side`. `health` is `'Healthy'`, `'Injured'` or `'Eliminated'`; `office` is `'captain'`, `'officer'` or `null` |
| `active` | Public | `null` | The seat whose turn it is: its tag has the turn's ring |
| `viewer` | This viewer's | `null` | This phone's seat: its tag says "You", on paper |
| `dim` | This viewer's | `[]` | Seats this viewer's offer does not reach (sheet 29): their tags are dimmed |

- `update(partial)` changes only what it is given; an unknown key is an error. Each tag is kept by its seat.
- `suspend()` stops laying out and keeps the tags as they are; `resume()` lays them out again from the current input. `dispose()` removes the layer; afterwards `update()` does nothing.
- It lays the tags out again when the input changes, when the panel's size changes, and when a font finishes loading.

### `layoutTags()`, the rules alone

```js
layoutTags({ panel: { width, height }, pad: 4, keepClear, tags: [{ seat, at: { x, bottom }, width, height, self }] })
// → { places: [{ seat, left, top }], whole: true | false, apart: true | false }
```

It is pure: measured boxes in, places out, with no DOM. Each component measures its own tags and calls it. When the room scene takes it for sheet 21's Room B case, the Lead moves it into the kit, since it will then have two users, and adopts it in the room scene.

## The rules

At every text size:

1. **Where sheet 26 puts it.** Centred on the press point; its top 6 px above the foot of the press area, and no lower than 30 px above the panel's foot (the pack's compact tag).
2. **Whole.** Never "…". A tag too wide for the panel's line puts "· Injured" or "· Out" on a second line. A name breaks only when it alone is wider than the line. This is the rule the Lead approved for the Food screen on 13 November.
3. **Inside.** 4 px inside the panel, and clear of `keepClear`.
4. **Apart.** Two tags stay at least 2 px apart. Where two would meet, one moves up, or else down, no further than it needs. The viewer's "You" gives way first; between two others, the one further back gives way (the one whose press area's foot is higher).

**Deterministic and still:**
- The same people, panel and `keepClear` always give the same places, whatever order the people come in.
- Tags never animate. A tag moves no further than rule 4 needs.

**The layer:**
- It draws above the target rings and takes no taps. Every tap reaches Board V2's target beneath.
- The handoff says the same for the room scene: the tags at z 3150, over the rings' 3100, so a ring never crosses a name.
- The layer's stacking is `z-index: var(--ms-board-tags-z, 3150)`. Frontend sets it above its own rings: Board V2's targets are at 4200, and its captions at 5000.
- It is `aria-hidden`: the board's text summary and the targets' labels carry the names.

## Privacy and audiences

- **The tags are public:** the seat, the name, the office and the health, as everyone's board shows them.
- **"You" and `dim` are this viewer's.** On a change of viewer they are dropped until given again.
- **Concealed,** the layer empties itself, so no name stays in the page. Shown again, the tags come back only when given again.

## States

| State | What it draws |
| --- | --- |
| Live | The panel's tags, whole and apart |
| A crowded room | The same, moved apart: four in the Hospital, three in the Jail, five in Room A |
| Long names | A twelve-character name whole, on two lines when it alone is wider than the line |
| Injured, Out | "· Injured" or "· Out", on a second line when the tag is too wide |
| Captain, Officer | The office badge after the number |
| The turn | The turn's ring on the active player's tag |
| Choosing (sheet 29) | The tags of those the offer does not reach, dimmed |
| Stale | As last seen |
| Concealed | Nothing |

## Checks run on this version

Under the hosted game's production headers, through the shared `design/tools/lib/component-check.mjs`. The captures and the probe draw the board in the game's own panels with the pack's painters (As built, 4); the agreement draws the pack's own sheet 26 frames. The record and its numbers are below the list.

- **Sizes** (Q2):
  - Standard, Large and Largest on 390 × 844 and 430 × 932;
  - 320 × 568 at Standard only, as the narrowest panels (141 px).
  - Board V2 keeps its "too short" message on 320 × 568 at the larger text, and nothing here asks Frontend's adapter to change. Since 15 November, #222's current presets are 390 × 844 and 430 × 932.
- **The worst rooms:** four in the Hospital, three in the Jail, five in Room A, twelve-character names, Injured and Out, the Captain and the Officer, and "You" in a crowd.
- **Probe checks:**
  - whole: every tag inside its panel and clear of `keepClear`, with no text cut;
  - apart: no two tags within 2 px;
  - deterministic: the same places with the people in another order;
  - still: no animation on a tag;
  - the layer: above the rings, and a tap at a tag's centre reaches the target beneath;
  - privacy: a viewer change drops "You" and `dim`, and concealed leaves no name in the page;
  - inputs: an unknown key, a person twice or a bad `at` is an error;
  - dispose.
- **Agreement with sheet 26** at Standard: each tag's box, words and look, to within half a pixel of the pack's own, on the board, the move and the targets frames.

**The record:** `node design/tools/board-tags-check.mjs`, recorded on `f9eab0f3` with the source clean, under the production headers (SHA-256 `424e5dec…`, as the other components'):
- **Captures:** 28 of 28 (`review/`):
  - the board, the two worst boards, and Move, the targets and the talk, at 390 × 844 and 430 × 932;
  - the board and the two worst boards at Large and Largest there, and at 320 × 568 Standard;
  - concealed, with no name in the page.
  - Every tag is drawn, inside its panel, apart, and whole: no word cut, no "…".
- **Probe:** 10 of 10: whole and apart over 247 tags on 27 boards (every live capture's board), deterministic, still, layer, privacy, inputs, kept, rules, dispose.
- **Agreement:** 6 of 6 frames: the board, Move and the targets at 390 × 844, the board at 320 × 568 and 430 × 932, and the talk.
  - The tags agree to within half a pixel in words, look, number, office and status.
  - The exceptions are where the pack's own tags meet (As built, 3): one tag at 390 × 844, and four at 320 × 568, each moved up and ending apart.
- **Tests:** `board-tags.test.mjs` 7 of 7: the graph, the styles' scope and 11 px type, the words, the inputs, `layoutTags()`'s rules, the states, the record.
- **Not run:** physical phones, Safari, screen readers, frame rate, and Board V2 itself: Frontend's adoption PR carries the native gate.

## The Lead's decisions (16 November)

- **Option B.** Board V2 stays as built. This piece and the Room ↔ Board zoom ([view-zoom.md](view-zoom.md)) are the board's two open items.
- **Q1:** 11 px at every text size, recorded above as filling an undrawn state, with the pack's CSS as the one difference.
- **Q2:** 320 × 568 keeps the "too short" message; measure the tags as above.
- **Q4:** sheet 26's tag replaces Board V2's plate within B, with no owner question. Sheet 26's tag is the approved look, and item 34 redraws the tags anyway.
- **The changes:** the tags draw above the rings and take no taps; `dim` is this viewer's; the layout is deterministic and still.
- **`layoutTags()`:** pure, as above.

## As built

For the Lead. Nothing here changes the approved interface:

1. **Rule 4's direction.** "Up, or else down" is built literally. A tag that would meet another takes the nearest place above that fits. Only when nothing above fits does it take the nearest place below. The probe's `rules` check and the unit test measure both.
2. **The Talk panel's tags.** Sheet 26 sets each capsule tag 2 px under its seat, not 6 px above it, so for the Talk panel Frontend gives `at.bottom` 8 px under the seat's foot (the capsule's `capsuleTargets()`). No input changes.
3. **Sheet 26's own tags meet.** The pack's board draws two tags overlapping:
   - in Room B at 390 × 844, "8 Hana" lies 5.7 px over "3 Cleo", as on the sheet;
   - on the 320 × 568 board, four tags overlap by up to 18.5 px.

   The component moves them apart, up. The agreement accepts only that: a tag moved up or down, its width and words unchanged, in a panel where the pack's own tags meet, and ending apart. Every other tag agrees to within half a pixel.
4. **Measured in the game's own panels.** The captures and the probe draw the board as Board V2 lays it out (`turnsLayout`, as `board-v2-host.mjs` calls it), each panel by the pack's own `paintRoom` and `paintCapsule`, and the bars' space left empty. The pack's own arrangement is different. At 320 × 568 its Hospital is about 151 × 140: four tags there, two of them twelve-character names, need 117 px and have about 104 below the caption. Board V2's 141 × 174 panel holds them.
5. **320 × 568 has no board with a status bar.** Board V2 fits the board there only without a top inset, as in a browser tab. With the pack's 20 px status bar it shows its too-short message at every text size, Standard included. The tags are measured there with no inset, in Board V2's 141 px panels.
6. **Two lines.** A tag is at least 22 px tall, with 2 px above and below its line, so a one-line tag is the pack's 22 px. The status's second line, and a name's, start under the name.

## Not covered

- Board V2's panels, art, figures, films, Blackout markers, seat choices and targets, and its "too short" message.
- The room view's tags: the room scene is the Lead's ([room-scene.md](room-scene.md)).
- The Room ↔ Board zoom: [view-zoom.md](view-zoom.md).
