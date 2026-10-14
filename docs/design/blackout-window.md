# Board v2: the Blackout's lighting window (storyboard S1)

**A proposal from the Visual and Motion Designer, 13 October 2026, corrected the same day after the Integration review.** It is the second production step of the owner's motion specification of 13 October 2026 (motion storyboards, section 1, Blue Disabler / Red Disabler: Blackout Strike). It follows the Designer's review's storyboard S1 and its production plan. The owner approved that order the same day ("go as your recommendations", [owner-decisions.md](owner-decisions.md#13-october-2026-the-fixed-slots-the-ward-and-the-smallest-phone)).

Nothing here is a rule, a server contract or an adopted asset:

- **Rules:** the window's timing, eligibility, binding, every validation and every receipt are Backend's. The film draws them; it decides none of them.
- **Adoption:** each new file needs Integration's approval by name and hash. The corrected `films/blackout.mjs` is new bytes and needs a renewed review.
- **Checked against the specification packet** (`GameN-owner-specification-agent-handoff-2026-10-13-v2.txt`, SHA-256 `b5b4ba2d…1b590743`): G-01, Q-B02a to Q-B03f, the rules contracts' Blackout validation and resolution and normal-round schedule, the motion requirements, and storyboard section 1. [motion-spec-crosswalk.md](motion-spec-crosswalk.md) maps the Designer's earlier notes to it.

| | |
| --- | --- |
| Branch | `claude/designer-blackout-window`, stacked on PR #128 (`claude/designer-board-slots-ward`, corrected at `a864f1f`), itself on PR #127 and the integration baseline `abb6839` |
| Why stacked | The window draws on #128's fixed slots, ward and layout |
| Toolchain | Node 22.21.1, npm 10.9.4, headless Chromium 141 |
| New files | `design/board-v2/films/blackout.mjs`, `design/board-v2/scenes/lighting.mjs`, `design/board-v2/js/blackout-view.mjs`, 17 files under `design/board-v2/assets/lighting/`, `design/board-v2/contract/films.json`, one test file, this page |
| Changed | #128's review page, fixtures, asset tool, capture tool, check and manifest. Nothing outside `design/board-v2/`, `design/tools/board-v2-*`, `packages/design-tokens/test/` and `docs/design/` |

## Corrections after the Integration review (13 October 2026)

The review requested four changes to this PR. The accepted drawing candidates, `lighting.mjs` and its 17 files, are byte for byte as reviewed.

| Finding | What was wrong | What changed |
| --- | --- | --- |
| 1. Occupants after dark targeting opened | The selection opened at 5 000 ms but the people faded out over 200 ms, so at 5 100 ms a player could choose while names were still on the page. Reduced motion started its fade at 4 920 | **At `previewEndsAt` exactly, in both motion modes**, the lights cut out and every figure, name tag and name leaves the page and its accessibility tree, in the same instant the selection opens. The lit preview keeps its full five seconds; the dark keeps its full ten. Boundary tests at 4 999, 5 000, 5 100, 14 999 and 15 000 ms, in the film and with real presses in Chrome |
| 2. The strip covered C1 | The strip over the Command band covered the Command Room's one position, which a Disabler bound there must be able to choose (Q-B03d) | **The strip is withdrawn.** The window's clock and its line are in the top bar, which is above the board on every phone and covers no position. Its box is the same on every screen, and the board never moves. Real-pointer tests press every position of every room, C1 included |
| 5. The settled hit outside the Hospital | The film announced "Orion is Injured" but drew Orion at B2 | **The impact stays at the frozen position; the patient settles in the Hospital.** The outcome fixture names each hit seat's final room, slot and health, per roster, and the page draws them there in the gown, allocating nothing. Single and double hits, 7, 8 and 9 players |
| 6. A pending send reported as unregistered | At 15 001 ms, a position still being sent read "Time is up: no position was registered." | **A sent position waits for its answer, before and after the deadline:** "Position 2 sent. Waiting for the answer." Only the server's answer, or a receipt recovered with the same command id, says registered or not. Examples of a late answer, a lost one and a rejection; one command, one id, never sent again |

## 1. What every phone shows

It is the same on every phone and the display, every normal round, whether or not anyone asked for a strike. Times are from the window's opening; the review pictures are in `design/board-v2/review/blackout-*.png`, and `contact-blackout.png` has them all.

| Time | What happens |
| --- | --- |
| 0–300 ms | A numbered marker fades in at **every fixed slot of every room, empty ones included**. The top bar shows the clock and, in a second row, the line "Remember who is where." |
| 300–4 200 ms | Lights on: people, name tags and markers. The top bar counts down to the lights going out |
| 4 200–5 000 ms | The power fails. Every room's light dips to about 60%, twice (4 300–4 420 and 4 650–4 770), and at 4 700 each room's own light throws sparks. The same in every room. Everyone stays on the page to the preview's last millisecond |
| **5 000 ms** | **The lights cut out.** Each room is its dark drawing, in which its line work stays faint so the room still reads as itself. Every figure, name tag and name is off the page. Markers are dark; captions drop to 70%. The line reads "Wait for the lights." The selection opens in this instant |
| 5 000–15 000 ms | Static dark, the full ten seconds; the selection is open in `[5 000, 15 000)` |
| From 15 000 ms | Dark until the round's outcome is published, at most 1.5 s more (a presentation proposal: see section 8) |
| R to R+320 ms | At each **authorized hit**, at its frozen position: a white flash, a comic star, its rays breaking. The hit room's art shakes 3 px for 160 ms; its markers, captions and press areas never move. **At a miss, nothing anywhere** |
| R+120 to R+520 ms | Every room's lights come back together, on the resolved board: everyone where the authoritative state puts them, a hit patient in the Hospital at the slot it names, in the gown. The top bar's clock and line go as the lights start back. **A blocked strike is a miss here too.** Only its room's occupants then see ATTACK BLOCKED, from R+520 ms ([attack-blocked.md](attack-blocked.md)) |
| R+520 to R+900 ms | The markers fade out; the board is normal |

The cut at 5 000 ms is one change of light, not a flash: the lights stay off for at least ten seconds.

**On the eligible Disabler's own screen** (bound to their room by the server), the line is theirs, in the same box:

1. In the preview: "Remember Room B: you choose there."
2. From 5 000 ms: "Tap a position in Room B." Each slot's whole press area in that room is live, the Disabler's own position included and drawn like any other (Q-B03d). Nothing is pressable anywhere else, on any screen.
3. A tap chooses: the marker turns gold on their screen only, and the line reads "Position 2: tap it again to strike." A tap on another position chooses that one instead. Nothing is sent yet.
4. A second tap on the chosen position sends it, as one command with one id. The press areas go: the first valid selection is final. The line reads "Sending position 2…"
5. The answer: "Registered: position 2." Nothing says whether anyone is there.
6. After the deadline with no answer yet: "Position 2 sent. Waiting for the answer." An accepted choice whose acknowledgement is late or lost stays accepted (G-01). Only the server's answer says "Position 2 was not registered."
7. Chosen and never sent by the deadline: "Time is up: no position was sent." The chosen marker and the press areas go.

**On every other player's screen and the shared display**, the line is the same box with the same type, and reads "Remember who is where." in the preview and "Wait for the lights." in the dark. The display's page is the same as any player's.

**Reduced motion:**

- No flicker, sparks, shake or travel.
- The markers come in with an 80 ms fade.
- At 5 000 ms, the same cut as full motion, to the static dark with a still bolt in each room's caption.
- At R, one 80 ms fade back, on the resolved board.
- A still burst beside each hit position for 600 ms.

## 2. Choices this step made

The storyboard left these open, or this step found they needed changing. Each is a proposal.

| Choice | Why |
| --- | --- |
| **The window's clock and line are in the top bar**, a second row of it for the window's length | The motion requirements put timers in the top bar, and the top bar is above the board on every phone, so the line covers no position. The bar keeps its height, so the board never moves. It changes shape at the window's opening and again as the lights return, when its phase changes anyway. Replaces the strip over the Command band, which covered C1 |
| **The lights cut out at `previewEndsAt`, in both motion modes** | The selection opens then. A fade would leave occupants on the page after a choice is possible, and a fade started early would shorten the lit preview |
| **People leave the page in the dark**, not just the picture | A name left in the page, even hidden, would let a phone, a screen reader or a look at the page answer the memory test. In the dark the page holds only numbers: markers are named "Position 3", and the positions summary with names is removed |
| **A second tap on the same position strikes** | Nothing is drawn over the board, and nothing is sent until the second tap, so a slip can be corrected before the first valid selection becomes final. Replaces the strip's Strike and Choose again buttons |
| **A sent position's line waits for the answer** | A late or lost acknowledgement does not mean the server refused the position. The deadline alone never turns "sent" into "not registered" |
| **The settled board comes from the outcome's after-state** | The page draws each seat where it is told: it never allocates a slot or infers a Hospital berth. The impact stays at the frozen position it hit |
| **Position markers are not the seat-number token** | The numeral token's source says it is the seat number, never anything else. Positions are a different number, so the marker is a disc with its number as text, and its shape and place differ from the tags' seat boxes |
| **The Disabler presses the slot's whole press area**, not the 22 px number | The 44 px rule. The number is drawn in the area's upper right corner, as #128 places it |
| **Each room's sparks come from its right-hand light** | A panel shows the middle of its scene with its caption over the upper left. The right-hand light is clear of the caption on every phone; where it is above the panel, the sparks hang from the top edge. The window's id picks where along the light, which way the sparks fall and their tilt |
| **The dark drawing is the lit scene recolored** (the night rule), not a separate painting | Every room stays exactly itself in the dark. One rule covers every room and roster: fills go nearly to ink with a trace of the room's hue, every line goes to faint steel, and the view through a window stays, dimmed |
| **The impact's bright part is a disc of 30 / 160 of its size** | So that every position of the smallest Hospital hit at once still flashes under a quarter of the panel (20% at 320 × 568) |

## 3. The film as data

`design/board-v2/films/blackout.mjs` (`board-v2-films-0.2.0`) holds the beats (`BLACKOUT`) and `blackoutFrame(t, { outcomeAt, hits, reduced, windowId })`. That function says what the board shows at any moment, from that moment alone:

- the darkness, every room alike;
- whether the people are shown, fading back or gone (gone for all of `[5 000, R+120)`, or `[5 000, R)` with reduced motion);
- the markers' opacity and style, and the captions' opacity;
- the spark and impact frames, and the shake;
- whether the top bar carries the window's line, the top bar's clock, and whether the selection is open (exactly `[5 000, 15 000)`).

`contract/films.json` is the same as JSON, from `blackoutContract()`.

**Its inputs are public:**

- `t`: from the trusted `previewEndsAt` and `endsAt`.
- `outcomeAt`: when the round's outcome is published.
- `hits`: the authorized hits' slot ids, at the frozen snapshot.
- `reduced`: the device setting.
- `windowId`.

**Not an input:** a request or its absence, a side, a selection, a viewer, a role, a cause or a defense. So a Blue strike, a Red strike, a miss and a round with no strike draw the same window. The check feeds it a side and a request and gets the same film. Where the people settle is not the film's either: it is the authoritative state, which the review page takes from its fixture.

**Flashes**, counted from the film:

- At most three in any second: the two dips and the sparks, between 4 300 and 5 300 ms. The impact is its own second.
- A spark's or an impact's bright part never covers more than a quarter of its panel, at eight phone sizes and 7, 8 and 9 players, even with every position of a room hit at once.
- Nothing is red.

## 4. The art

All of it is generated by `design/tools/board-v2-assets.mjs` from `design/board-v2/scenes/lighting.mjs` (version `board-v2-lighting-0.1.0`, unchanged by the corrections) into `design/board-v2/assets/lighting/`. It is listed with sizes and hashes in the manifest's `lighting` section.

| Files | What they are |
| --- | --- |
| `room-a.dark.svg`, `room-b.dark.svg`, `jail.dark.svg`, `command-room.dark.svg`, `hospital-ward-{7,8,9}.dark.svg` | Each room with its lights out, 1024 × 768, drawn empty: its lit back and front layers together, by the night rule (`NIGHT`: low `#0C1018`, high `#1F2737`, line `#4B5A77`; a window's view at 42%). Drawn over the room's art at the darkness's opacity, which is also what dims the room in the flicker |
| `fx-spark-{1,2,3}.svg` | A light's sparks, 120 × 120, its lower edge at (60, 18): it shorts, it bursts, the embers fall |
| `fx-impact-{1,2,3}.svg` | An authorized hit, 160 × 160, centred on the position's press point, drawn at 1.6 × the press side: the flash, the star, its rays. Symmetric: no muzzle, beam, trail or direction |
| `fx-bolt.svg` | Reduced motion: the still bolt in each caption, 24 × 24 |
| `marker-{preview,dark,chosen}.svg` | A marker's disc, 44 × 44, drawn at 22 px; its number is the page's text. `chosen` is drawn on the eligible Disabler's screen only. Every file ships to every phone |

**The lights** (`FIXTURES`, scene units): the lower edge of each ceiling light, where the scenes' cones of light start. Room A and Room B have two, the Hospital two (the sick bay's, kept by the ward), the Command Room three, and the Jail its caged lamp. `SPARK_LIGHT` names the right-hand one.

## 5. For Frontend

Frontend has reviewed none of this, and nothing has been adopted.

**Drawing a frame.** Call `blackoutFrame()` with `t` from the trusted deadlines and the published outcome, then draw what it returns:

| Layer | What |
| --- | --- |
| L0–L2 | The room's art and people as today, in one container per room: the only thing the shake moves |
| L3 | The room's dark drawing over them at `darkness`; then the sparks, the impacts and the markers, all clipped to the panel |
| L5 | The chosen marker: the Disabler's own screen only |
| L6 | Press areas: in the dark, only the eligible Disabler's, in the bound room, while `selection` is true and nothing is sent; each a slot's whole press area from `slotRects()`; never moved |
| L7 | Captions at `captions` (70% in the dark); the still bolt under reduced motion |
| L10 | The top bar: the clock, and while `line` is true its second row, the same box on every screen. It and the navigation are never dimmed. Nothing is drawn over the board |

**The rules the review page keeps, which a client must keep too:**

1. While `people` is `gone`, no figure, name tag, portrait or name is in the page or its accessibility tree. It is `gone` from `previewEndsAt` exactly, in both motion modes.
2. A reconnect, a return to the foreground or a late join draws the current moment from the deadlines: dark with the true time left, with no flicker and no impact replayed.
3. The line's Disabler words, the chosen marker and the press areas mount only after Frontend's checks: the current window id, the own audience, a fresh view and the foreground. They unmount when any of those fails, leaving the public words, and come back only with an explicit tap.
4. Nothing reacts early to a selection. The impact comes only from the published batch.
5. **The selection takes two taps.** The first chooses on the phone and sends nothing; the second, on the same position, sends one command with one stable id. The press areas then unmount. A retry carries the same id; nothing mints a second command for the window.
6. **After the deadline, a sent position's state is its receipt's.** It stays "waiting" until the server's answer, or a receipt recovered with the same id, says registered or not registered. The deadline alone never says either. If the receipt is still unknown when the lights return, the Disabler's private action panel carries it: the top bar's line goes on every screen at the same moment.
7. **The settled board is the authoritative projection.** Draw each seat at its stored `slotId`: a hit patient appears in the Hospital, in the gown, when the lights return. The impact is drawn at the frozen slot. No animation callback moves anyone.
8. Outcomes are announced politely after the lights return, for example "The lights are back. Orion is Injured, in the Hospital." For a miss or no strike, only "The lights are back."
9. In the preview, each room exposes a one-line positions summary from public facts, for example "Room B: 1 empty, 2 Orion, 3 empty, 4 Nova, 5 empty". It is removed at the cut.
10. The top bar never changes height during a match. If enlarged text needs a taller bar, choose it once, before the match starts, so that no position ever moves; the line never wraps over the board.
11. Two attacks on one position stay two attacks. The prototype draws one impact per position; a consumer must not merge the attacks or their results.

**Not to port:** `design/board-v2/js/blackout-view.mjs`, `page.js` and `fixtures.mjs`. They are a review page and synthetic fixtures. Its `&play=1` runs the film from a local clock for review only, and its "sends" are a counter: no command leaves the page.

**Review page options** (`design/board-v2/index.html?roster=9&fixture=mixed&film=blackout`):

| Option | What it shows |
| --- | --- |
| `&t=` | The moment, in ms |
| `&play=1` | Plays the film |
| `&outcome=hit\|double\|miss\|none\|blocked` | The outcome. `blocked` publishes nothing: it is a miss but for its room's occupants |
| `&in=` | The viewer's room, for its room-visible facts: with `outcome=blocked`, `&in=room-b` is an occupant's screen |
| `&r=` | When the outcome is published |
| `&window=` | The window's id |
| `&motion=reduced` | The reduced-motion variant |
| `&viewer=observer\|disabler\|display` | Whose screen it is |
| `&side=blue\|red` | Changes nothing |
| `&bound=`, `&step=choose\|confirm\|sent`, `&pick=` | The Disabler's own selection |
| `&sentAt=`, `&reply=accepted\|rejected`, `&replyAt=` | When a sent position was sent, and the server's answer and when it arrives |
| `&lost=1`, `&recoverAt=` | The answer lost, and when the receipt is recovered with the same id |

## 6. For Backend and Integration (proposals; nothing accepted)

1. **A public lighting window every normal round:** `{windowId, previewEndsAt, endsAt}`. It runs whether or not anyone asked for a strike.
2. **`seats[].slotId`**, frozen from the window's opening to its end (#128's dependency), and the resolved board's seats at their stored slots, a hit patient's Hospital `slotId` included.
3. **The eligible Disabler's own binding**, in their private view only: `{windowId, boundRoom, selectable, selectedSlotId}`, the selection command with a stable id, its receipt, and receipt recovery by that id.
4. **The round's published batch**, with each authorized hit's `slotId` and the publication's checkpoint. Two accepted attacks stay two records. Nothing about a request, a side, a miss or a defense is public. A block goes only to its room's occupants, as a room fact ([attack-blocked.md](attack-blocked.md), section 6).
5. **Integration:** the named-file approval of `films/blackout.mjs` (new bytes after the corrections) and of the unchanged `lighting.mjs` and its 17 files, already accepted as drawing candidates.

## 7. Verification

These were run on this branch in this container. Desktop Chromium laid out a review page from synthetic fixtures: this is not a phone, a match or a measurement of players.

| Check | Result |
| --- | --- |
| `node design/tools/board-v2-check.mjs` | **8 / 8.** #128's seven and the window's own: five seconds lit and ten dark. At every millisecond either side of 5 000 and 15 000 ms and every 10 ms of the rest, in both motion modes: everyone on the page to 4 999 ms and nobody from 5 000 ms until the outcome; the selection open exactly in `[5 000, 15 000)` and never with anyone on the page; the line with the clock. Reduced motion without motion, the dark capped without an outcome, only public inputs, sparks from each room's right-hand light by the window's id, three flashes a second at most, no bright part over a quarter of a panel at eight phone sizes and three rosters, and `films.json` current with no role named |
| `node design/tools/board-v2-capture.mjs` | **70 pictures and two contact sheets, 0 with problems** (37 of them the window's). On every frame of the window: the page at the film's stage; every marker where fit.mjs puts it, shake or not; the board and every room at fit.mjs's boxes; press areas only on the eligible Disabler's screen, in the bound room, while the selection is open and nothing is sent; the top bar at its shell's height, its line exactly while the window lasts, inside the bar, above the board, never cut and in the view's words; no name in the page or a label in the dark; every seat's figure and tag in its room at its slot, the frozen snapshot until the outcome settles and the after-state from then (single and double hits, 7 and 9 players) |
| The same run: **23 real-pointer press tests, 129 presses, 0 with problems** | Every position of every room a Disabler can be bound to, C1 included, at 320 × 568 and 390 × 844: the centre and four inner corners of each press area are its own button, a press chooses it, a second press sends one command, later presses do nothing (10). The selection's ends in Room B and the Command Room, both phones, both motion modes: people and names on the page at 4 999 ms only; a press chooses at 5 000, 5 100 and 14 999 ms and nothing at 4 999 and 15 000 (8). A sent position's answers, late, lost and recovered, lost, and rejected: waiting until an answer, one command and one id throughout (4). Chosen and never sent (1) |
| The same run: **186 pointer probes, 0 with problems** | #128's, unchanged |
| The same run: **62 whole-page comparisons, 0 differing** | A missed strike against no strike at ten moments, both motion settings and two phones (40). A Blue Disabler's screen against a Red one's (8). The shared display's page against a player's (6). The top bar's box, rows and type on a player's screen, two Disablers' and the display, at four moments (8) |
| `node design/tools/board-v2-assets.mjs --check` | 32 files current |
| `npm test --workspace @mothership/design-tokens` | **240 / 240**, 11 of them in `blackout.test.mjs` (three new: the top bar's line; a sent position's answers; the settled Hospital placement) |
| The review's inventory | The 31 accepted drawing candidates (`lighting.mjs` and its 17 files, `hospital-ward.mjs` and its 12) byte for byte. Changed against it: `slots.mjs` and `fit.mjs` (#128), `films/blackout.mjs`, and the evidence files `contract/slots.json`, `contract/films.json` and `assets/manifest.json` |
| Existing checks, re-run unchanged | board-motion 13 / 13; phone kit 7 / 7; phone-kit flows 109 / 109; ability art 12 / 12; design assets 15 / 15; shell 0 failures; board-motion (11) and phone-kit (18) assets current; `npm run typecheck` and `npm run build`; workspace, source and toolchain checks; tooling 130 / 130; `git diff --check` clean |

**Not run:**

- Real phones, a screen reader, enlarged text.
- A photosensitivity analyser: the flash budget is computed from the film, not measured from video.
- A match, a server or a real command: the review page's sends are a counter.
- `npm run verify` as a whole: see the PR.

Whether people can remember five positions in five seconds, and whether the dark is tense or merely dark, is for a table of players, not a capture.

## 8. Unresolved

- **Backend's window, binding, receipts and batch** (section 6). Until they exist, nothing here reaches players.
- **The 1.5 s hold for a late outcome** needs Backend and Frontend to agree on an authoritative publication checkpoint and on stale events. It is not a new game phase, and it never extends the selection. If the outcome comes after the cap, the lights return without it and its impact plays on the lit board.
- **Same-position double hits** are drawn as one impact here. The specification does not ask for two bursts in turn; consumers must keep both attacks and their results whatever is drawn.
- **Enlarged text** in the top bar's two rows (section 5, rule 10).
- **The display's own layout**: a larger board, not drawn here.
- **The copy:** "Lights out", "Remember who is where.", "Wait for the lights.", "Tap a position in Room B.", "Position 2: tap it again to strike.", "Sending position 2…", "Registered: position 2.", "Position 2 sent. Waiting for the answer.", "Position 2 was not registered." and "Time is up: no position was sent."
- **The owner has not seen this window.**
