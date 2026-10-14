# Board v2: ATTACK BLOCKED (storyboard S4)

**A proposal from the Visual and Motion Designer, 13 October 2026.** It is the third production step of the owner's motion specification of 13 October 2026 (motion storyboards, section 4, Undercover Protection and Clone: shared defensive impact). It follows the Designer's review's storyboard S4 and its production plan, whose order the owner approved the same day ("go as your recommendations", [owner-decisions.md](owner-decisions.md#13-october-2026-the-fixed-slots-the-ward-and-the-smallest-phone)). The owner then asked for this step.

Nothing here is a rule, a server contract or an adopted asset:

- **Rules:** which defenses block which attacks, when a block happens and who is authorized to see it are Backend's. The film draws a block; it decides none of it.
- **Adoption:** each new file needs Integration's approval by name and hash.
- **Checked against the specification packet** (`GameN-owner-specification-agent-handoff-2026-10-13-v2.txt`, SHA-256 `b5b4ba2d…1b590743`): G-04, Q-C01, Q-C01b, Q-C02a, the rules contracts' Clone and Protection and Audiences and delivery, the motion requirements' shared-defense scene, and storyboard section 4. It agrees: one identical effect for both defenses, room-visible, the cause never shown. [motion-spec-crosswalk.md](motion-spec-crosswalk.md) maps the Designer's earlier notes to it.

| | |
| --- | --- |
| Branch | `claude/designer-attack-blocked`, stacked on PR #129 (`claude/designer-blackout-window`, corrected at `6154166`), itself on PR #128, PR #127 and the integration baseline `abb6839`. #129's corrections are merged in: the Blackout's line in the top bar instead of the strip, the cut at `previewEndsAt`, the Hospital placement after a hit and the pending receipts |
| Why stacked | The film draws on #128's fixed slots and layout, and on #129's impact star and Blackout |
| Toolchain | Node 22.21.1, npm 10.9.4, headless Chromium 141 |
| New files | `design/board-v2/fx/blocked.mjs`, `design/board-v2/films/blocked.mjs`, `design/board-v2/fx/label-box.mjs`, `design/board-v2/js/blocked-view.mjs`, 7 files under `design/board-v2/assets/fx/`, one test file, this page |
| Changed | #129's review page, fixtures, Blackout view, asset tool, capture tool, check, contact sheet, `contract/films.json` and manifest (now `board-v2-0.3.0`). The Blackout's film is unchanged; its contract gains one line on blocks. Nothing outside `design/board-v2/`, `design/tools/board-v2-*`, `packages/design-tokens/test/` and `docs/design/` |

## Correction after the Integration review of 14 October 2026

The review confirmed the six earlier findings corrected and found one new defect here (P3): the review page's already-Injured example (`&injured=1`) redrew Orion at B2 as Injured in Room B. Every Injured character is a Hospital patient (G-05, G-07), so that picture showed a state the game never has. It was the review page's fixture, not the film or its art.

| | Before | Now |
| --- | --- | --- |
| The example's target | Orion, Healthy at B2 in the fixture, redrawn Injured in Room B by the page | **Rigel, the fixture's Injured patient at H1 in the Hospital, in the gown**: the first Injured patient in the Hospital on the mixed board, at every roster |
| What the page changes | The target's health | **Nothing.** `blockedTargets()` reads the targets from the fixture; the page draws them where and as the fixture has them, and the film adds to the picture only. With `&injured=1`, a named target must already be an Injured patient in the Hospital, or the page refuses it |
| Checks | One picture | The capture checks on every frame that every target is in its room, at its slot, in its health, and in the gown when it is a patient. The example's picture is redrawn and five are new (full and reduced motion, after the film, outside the Hospital, the smallest phone). Outsiders and the display are identical with and without the block on the patient, and both defenses are identical on it. A unit test and the static check hold the example to an Injured patient in the Hospital at 7, 8 and 9 players |
| The label rule | `labelBox()` inside the review page's controller | **`design/board-v2/fx/label-box.mjs`**, a pure module, so that a client can port the placement without the controller. Its logic is unchanged |

The film, its art and its timing are unchanged: `films/blocked.mjs`, `fx/blocked.mjs` and the 7 effects files are byte for byte as reviewed. So are the six earlier corrections.

## 1. What the room's occupants see

**Who sees it.** Every seat occupying the target's room at the authoritative event checkpoint, **the target included** (G-04), as the server authorizes them: the room as it was immediately before the effect. A retained Eliminated occupant is within the same room boundary; a later entrant gets nothing. The display, a host without a seat in that room and everyone outside it get nothing: no node, class, word, banner, count or sound. Their pages are byte for byte the same with a block and without one (section 7).

**It is the same film whichever defense blocked the attack.** It has no input that could tell them apart. Times are from the checkpoint; the review pictures are `design/board-v2/review/blocked-*.png`, and `contact-blocked.png` has them all.

| Time | What happens |
| --- | --- |
| 0–120 ms | **Incoming.** A comic star at the target's chest (its press point), as a hit's. No direction or trail, and nothing yet says blocked |
| 120–200 ms | **The shield flashes on:** a white-hot core in a pale hexagon |
| 200–360 ms | **The bubble** blooms to 1.05 of its size: a translucent hexagon with an ink outline, an inner rim, halftone shading and a highlight. From 120 ms the figure braces, 2 px back, its art only |
| 360–620 ms | **Absorbed.** A ring grows from 0.7 to 1.5 and fades. Eight particles scatter symmetrically. The shield breaks up and fades |
| 620–900 ms | The figure is back in its own pose. **An Injured character stays Injured:** bandage kept, no healing glow |
| 620–2 420 ms | **ATTACK BLOCKED**, gold letters on an ink plate, held 1 600 ms, faded over 200. A screen reader hears "Attack blocked on Orion." It names the character only |
| From 2 420 ms | Nothing the film added is left on the page |

- **Several blocks at one checkpoint** each play on their own target, together.
- **Reduced motion:** a still ring and the label, in over 80 ms, held 1 600 ms, out over 80. No star, bloom, brace or particles.

**In the Blackout** (storyboard S1, [blackout-window.md](blackout-window.md)):

- A blocked strike is a miss on every screen: no flash, no star, no shake.
- The target's room's occupants see ATTACK BLOCKED **once the lights are fully back**: R + 520 ms, or R + 80 ms with reduced motion.
- Until then, their screens too are the same as a miss.

## 2. Choices this step made

The storyboard left these open, or this step found they needed changing. Each is a proposal.

| Choice | Why |
| --- | --- |
| **In the Blackout, the film waits for the lights** | A block played at R would put its star on a dark board, where nobody can see the shield. Waiting also keeps the first 520 ms after R the same for every room |
| **The incoming star is the hit's star without its flash** (`fx-impact-2.svg` of #129) | "As a hit's", in the storyboard's words: the first 120 ms must not say blocked. Leaving out the hit's white flash keeps the film to one flash, the shield's |
| **The shield's white core is 32 / 200 of its box** | With every slot of the fullest Hospital blocked at once, the flash stays under a quarter of the panel: 22% at 320 × 568 with nine berths. One block flashes 2.5% of a panel at most |
| **The shield is cyan-white**, at least 30 (CIE76) from every faction accent | No block may read as one side's. Its deepest color is 37 from the nearest accent, Blue |
| **The label is lettering in type**, not drawn letters | The tokens give the lettering as type (`letteringFamily`, weight 800, tracking 0.06 em), and the label is set in it. It is hidden from screen readers; the live region speaks |
| **Where the label goes** | Centred on the target, 2 px inside its panel, never over the room's caption. Above the press area where there is room; otherwise below the name tag. Where one line is wider than the panel, the two words stack: at 320 × 568 in every room but the Command Room, and from 360 px wide in none |
| **One live region for room facts on every screen** | Its existence says nothing; only its words do. It is filled on the occupants' screens while the label is up, then emptied |
| **The brace moves the figure's art only, by 2 px at most** | Its press area, name tag and slot never move |

## 3. The film as data

`design/board-v2/films/blocked.mjs` holds the beats (`BLOCKED`) and `blockedFrame(t, { reduced })`. That function says what the film draws at any moment, from that moment alone:

| Field | Meaning |
| --- | --- |
| `stage` | `incoming`, `shield`, `absorb`, `return`, `label`, or `in`, `hold`, `out` when reduced; `before` and `done` outside the film |
| `star` | Whether the incoming star is drawn, and its scale |
| `shield` | Its frame (0 for none, 1 the flash, 2 the bubble, 3 spent), scale and opacity |
| `ring` | The absorbing ring's scale and opacity |
| `particles` | Their frame (0 for none) and opacity |
| `brace` | The target's figure's offset in px: its art only |
| `label` | ATTACK BLOCKED's opacity and scale |
| `announce` | Whether the words are in the live region: exactly while the label is up |
| `done` | The film is over and has left nothing |

`blockedEnd(reduced)` is 2 420 ms, or 1 760 ms reduced. `blockedStartInBlackout(R, { reduced })` is when a block's film starts in the Blackout. `blockedContract()` is the film as data: it is the second entry of `design/board-v2/contract/films.json`.

**Inputs:** `t` from the room fact's checkpoint, the reduced-motion setting, and the target's slot, for where to draw it.

**Not inputs:** the defense that blocked the attack or its kind, the attacker or the kind of attack, a grantor, a count of blocks or of uses left, a direction.

## 4. The art

All of it is generated by `design/tools/board-v2-assets.mjs` from `design/board-v2/fx/blocked.mjs` (version `board-v2-blocked-0.1.0`) into `design/board-v2/assets/fx/`. It is listed with sizes and hashes in the manifest's `fx` section, every file marked room-visible.

| Files | What they are |
| --- | --- |
| `fx-shield-{1,2,3}.svg` | The shield, 200 × 200, centred on the target's press point and drawn at 2.1 × its press side: 1 the flash (a white core of radius 32 in a pale hexagon), 2 the bubble, 3 spent (the outline broken into six, a glint at each corner). A regular hexagon: it points at no one |
| `fx-block-ring.svg` | The energy ring, the same box: an ink circle with a pale cyan rim and a dashed inner glow |
| `fx-block-particles-{1,2,3}.svg` | Eight diamonds, one every 45°, at 58, 74 and 90 from the centre, smaller each frame |
| The star | #129's `assets/lighting/fx-impact-2.svg`, at 1.6 × the press side, as a hit's |

**Colors** (`SHIELD`): core `#FFFFFF`, glow `#E8FBFF`, rim `#A6E6F0`, deep `#3EA6BC`. Their distances to the nearest faction accent (`color.factionPrivateOrRevealed` of tokens 0.4.0, which the check holds the copy to) are 55, 50, 43 and 37, all to Blue. Every line is the board's ink.

## 5. For Frontend

Frontend has reviewed none of this, and nothing has been adopted.

**Drawing a frame.** Call `blockedFrame()` with `t` from the room fact's checkpoint, then draw what it returns on the room-visible effects layer:

| Layer | What |
| --- | --- |
| L1 | The target's figure, offset by `brace`: its art only |
| L3 | Below: the room's public effects and markers |
| L4 | The film, clipped to the room's panel, in this order from the bottom: the star, the ring, the shield, the particles, the label |
| L6 | Press areas: above the film, never moved |
| L7 | Captions: above the film; the label never goes under one |

**The rules the review page keeps, which a client must keep too:**

1. Mount the film only for the room fact's recipients, in the foreground, with a fresh view of the current checkpoint. Never start it from a send, a receipt, a health change or a difference between views.
2. Play it live only: never on a reconnect, a late join or a stale checkpoint.
3. It changes nothing else: not the target's health, name tag, slot or press area.
4. Keep one polite live region for room facts on every screen. Fill it only on the recipients' screens, with "Attack blocked on Orion." while the label is up, and empty it after. Hide the label itself from screen readers.
5. At the end, remove every node the film added. Leave no class or attribute behind.
6. Place the label by `labelBox()` (`design/board-v2/fx/label-box.mjs`) from its laid-out size, before any transform.
7. In the Blackout, start the film at `blockedStartInBlackout(R)`. The public batch never carries a block.
8. Ship the effects files in the common bundle, never fetched on demand: a block never waits on a request, and no request tells a block from none.

**Not to port:** the whole of `design/board-v2/js/blocked-view.mjs`, `blackout-view.mjs`, `page.js` and `fixtures.mjs`. They are a review page's controllers and synthetic fixtures. The page's `&play=1` runs the film from a local clock for review only, and its targets come from a fixture. A client draws its targets from the authoritative board and never changes a health or a place for the film: the target of a block is wherever the state says it is, an Injured target in the Hospital in the gown.

**Review page options** (`design/board-v2/index.html?roster=9&fixture=mixed&film=blocked`):

| Option | What it shows |
| --- | --- |
| `&t=` | The moment, in ms from the checkpoint |
| `&play=1` | Plays the film |
| `&targets=B2` (or `B2,B4`) | The blocked targets' slots |
| `&viewer=occupant\|outsider\|display\|art` | A player in the targets' room, a player elsewhere, the display, or the art review: every target's room at once, which no screen ever receives |
| `&cause=clone\|protection` | Changes nothing |
| `&injured=1` | The already-Injured example: without `&targets`, the fixture's first Injured patient in the Hospital (Rigel at H1, in the gown); with `&targets`, each must already be one. The page changes no one's health or place |
| `&motion=reduced` | The reduced-motion variant |

In the Blackout: `&film=blackout&outcome=blocked&in=room-b` is a Room B occupant's screen, and `&in=room-a` a Room A player's.

## 6. For Backend and Integration (proposals; nothing accepted)

1. **A room fact for each block:** for example `ATTACK_BLOCKED {checkpointId, seatId}`, delivered as a player-audience item to each occupant authorized at the checkpoint. This is the review's BE6 and C-7: no new audience class, and nothing on the public stream, to the host or to the display. It carries no defense, attacker, grantor or count. The name is a proposal.
2. **Who is an occupant at the checkpoint** is settled by the packet (G-04; rules contracts, Audiences and delivery): every seat occupying the affected target's room at its logical resolution checkpoint, the target included, frozen from the authoritative location immediately before the effect, retained Eliminated occupants within the same boundary, and no later entrant. Backend computes the recipients; the film needs only the recipient's own room fact. The film says a block happened, never why.
3. **In the Blackout:** the published batch carries hits only. A block goes to its room's occupants as above.
4. **Integration:** the named-file approval of `fx/blocked.mjs`, `films/blocked.mjs` and the 7 effects files, and of the label set in type.

## 7. Verification

These were run on this branch in this container. Desktop Chromium laid out a review page from synthetic fixtures: this is not a phone, a match or a measurement of players.

| Check | Result |
| --- | --- |
| `node design/tools/board-v2-check.mjs` | **9 / 9.** #129's eight and the film's own. It holds the review page's already-Injured example to an Injured patient in the Hospital at 7, 8 and 9 players, and no example target Injured outside it. It checks the storyboard's beats and end times, and that a defense, an attacker, a grantor, a count or a direction fed in changes nothing. It checks reduced motion without motion, the brace at 2 px at most and home by 900 ms, the words exactly while the label is up, and nothing drawn outside the film. In the Blackout, a block publishes no hit, draws a miss's public film and starts once the lights are back. The faction accents are the tokens', and every shield color is at least 30 from them. With a hit and a block in one Blackout there are at most three flashes a second. Every slot of a room blocked at once flashes under a quarter of the panel, at eight phone sizes and three rosters. `films.json` is current |
| `node design/tools/board-v2-capture.mjs` | **97 pictures and three contact sheets, 0 with problems**, 27 of them the film's. On every frame of the film it checks the page's stage, and that each part is on the page exactly while the film draws it, on the recipients' screens alone, with nothing left after the end. It checks that every target is drawn in its room, at its slot, in its health, and in the gown when it is a patient (from the figure's own ids), on every screen, during the film and once it is over. It checks every label is inside its panel and off its caption, only the target's figure is braced, by the film's offset, and the live region's words. The Blackout's own measurements also run on the film's four Blackout frames |
| The same run: **222 whole-page comparisons, 0 differing** | #129's 62, and 160 for this film. A block by either defense on an occupant's screen, at eight moments (32), and on the Hospital patient at three (12). An outsider's screen and the display, with a block and without, at four moments (32), and with the block on the Hospital patient at two (16). The Blackout's blocked strike against a miss on a Room A player's screen, on the display and on a screen with no room, at five moments (60). The same on a Room B occupant's screen before the lights are back (8). Each at 390 × 844 and 320 × 568, with and without reduced motion |
| The same run: **every slot's label** | Every slot of every room blocked at once, at four phones and three rosters: 12 pages of 23 to 25 labels, 0 problems. Every label is inside its panel and off its caption |
| The same run: #129's **23 real-pointer press tests** (129 presses) and **186 pointer probes** | 0 problems, with this film's code on the page |
| `node design/tools/board-v2-assets.mjs --check` | 39 files current |
| `npm test --workspace @mothership/design-tokens` | **248 / 248**, 8 of them in `blocked.test.mjs`: one new for the already-Injured example (an Injured patient in the Hospital at every roster, the fixture unchanged, a non-patient refused), one updated earlier for #129's per-roster after-state |
| Existing checks, re-run unchanged | board-motion 13 / 13; phone kit 7 / 7 and its flows 109 / 109; ability art 12 / 12; design assets 15 / 15; shell 0 failures; board-motion and phone-kit assets current; `typecheck`, `build`; `check:toolchain`, `check:workspace`, `check:sources`; tooling 130 / 130; `git diff --check` clean |

**Not run:**

- Real phones, a screen reader (the live region's words are read from the page, not heard) or enlarged text.
- A photosensitivity analyser: the flash budget is computed from the film, not measured from video.
- A match.
- `npm run verify` as a whole: see the PR.

Whether players read the shield as a block, and not as a hit, is for a table of players, not a capture.

## 8. Unresolved

- **Backend's room fact and its audience** (section 6). Until they exist, nothing here reaches players.
- **The showdown.** A special shot blocked by Protection uses this film for the authorized room viewers (motion requirements, Showdown); Clone never blocks a special shot (Q-C01b). The showdown is not drawn on board v2 yet.
- **The label in a full ward.** Above a front-row patient (Rigel at H1), the label covers the name tag of the patient in the berth behind for its 1.8 s; the press areas stay above it. The placement rule (`fx/label-box.mjs`) avoids the panel's edges and the caption, not other tags. Whether to move it off neighbouring tags is for review.
- **The copy:** "Attack blocked" and "Attack blocked on Orion."
- **Sound:** none here. Room-specific audio is silent by default for in-person play (G-04); any sound must be identical for both defenses and reach only the room's authorized recipients.
- **The owner has not seen this film.**
