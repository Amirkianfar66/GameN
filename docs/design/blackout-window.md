# Board v2: the Blackout's lighting window (storyboard S1)

**A proposal from the Visual and Motion Designer, 13 October 2026.** It is the second production step of the owner's motion specification of 13 October 2026, as the creative brief relays it (section 1, Blue Disabler / Red Disabler: Blackout Strike). It follows the Designer's review's storyboard S1 and its production plan. The owner approved that order the same day ("go as your recommendations", [owner-decisions.md](owner-decisions.md#13-october-2026-the-fixed-slots-the-ward-and-the-smallest-phone)).

Nothing here is a rule, a server contract or an adopted asset:

- **Rules:** the window's timing, eligibility, binding and every validation are Backend's. The film draws them; it decides none of them.
- **Adoption:** each new file needs Integration's approval by name and hash.
- **Not readable here:** the specification packet itself, so this follows the brief and the review. Re-check it against the packet.

| | |
| --- | --- |
| Branch | `claude/designer-blackout-window`, stacked on PR #128 (`claude/designer-board-slots-ward` at `e970eaa`), itself on PR #127 and the integration baseline `abb6839` |
| Why stacked | The window draws on #128's fixed slots, ward and layout |
| Toolchain | Node 22.21.1, npm 10.9.4, headless Chromium 141 |
| New files | `design/board-v2/films/blackout.mjs`, `design/board-v2/scenes/lighting.mjs`, `design/board-v2/js/blackout-view.mjs`, 17 files under `design/board-v2/assets/lighting/`, `design/board-v2/contract/films.json`, one test file, this page |
| Changed | #128's review page, fixtures, asset tool, capture tool, check and manifest (now `board-v2-0.2.0`). Nothing outside `design/board-v2/`, `design/tools/board-v2-*`, `packages/design-tokens/test/` and `docs/design/` |

## 1. What every phone shows

It is the same on every phone and the display, every normal round, whether or not anyone asked for a strike. Times are from the window's opening; the review pictures are in `design/board-v2/review/blackout-*.png`, and `contact-blackout.png` has them all.

| Time | What happens |
| --- | --- |
| 0–300 ms | A numbered marker fades in at **every fixed slot of every room, empty ones included** |
| 300–4 200 ms | Lights on: people, name tags and markers. The top bar counts down to the lights going out |
| 4 200–5 000 ms | The power fails. Every room's light dips to about 60%, twice (4 300–4 420 and 4 650–4 770), and at 4 700 each room's own light throws sparks. The same in every room |
| 5 000–5 200 ms | Lights out. Each room goes to its dark drawing, in which its line work stays faint so the room still reads as itself. People and name tags fade and **leave the page**. Markers turn dark. Captions drop to 70%. The shared strip comes up over the Command band |
| 5 200–15 000 ms | Static dark, the full ten seconds. The strip says LIGHTS OUT with the time left |
| From 15 000 ms | Dark until the round's outcome is published, at most 1.5 s more |
| R to R+320 ms | At each **authorized hit**: a white flash, a comic star, its rays breaking. The hit room's art shakes 3 px for 160 ms; its markers, captions and press areas never move. **At a miss, nothing anywhere** |
| R+120 to R+520 ms | Every room's lights come back together; the people return in their published state. **A blocked strike is a miss here too.** Only its room's occupants then see ATTACK BLOCKED, from R+520 ms ([attack-blocked.md](attack-blocked.md)) |
| R+520 to R+900 ms | The markers fade out; the board is normal |

**On the eligible Disabler's own screen** (bound to their room by the server), the strip's second line is theirs:

1. "Tap a position in Room B." Each slot's whole press area in that room is live; nothing is pressable anywhere else, on any screen.
2. They tap position 2: its marker turns gold on their screen only, and the strip offers **Strike position 2** and **Choose again**.
3. Then "Sending…", then "Registered: position 2." Nothing says whether anyone is there.
4. If the window closes with nothing registered: "Time is up: no position was registered."

**On every other player's screen**, the strip is the same box, the same color and the same opacity, and reads "Wait for the lights." **On the shared display**, there is no strip: the Command Room is dark with its marker.

**Reduced motion:**

- No flicker, sparks, shake or travel.
- The markers come in with an 80 ms fade.
- At 4 920 ms, one 80 ms fade to the static dark, with a still bolt in each room's caption.
- At R, one 80 ms fade back.
- A still burst beside each hit position for 600 ms.

## 2. Choices this step made

The storyboard left these open, or this step found they needed changing. Each is a proposal.

| Choice | Why |
| --- | --- |
| **The strip covers the Command band** while it is dark, on every player's screen | On the smallest phone the board has no spare height (#128), and a strip anywhere else would cover press areas a Disabler may need. The Command Room has one position, so a Disabler bound there could only choose themselves, which the brief counts as a miss. Covering it costs nobody a target |
| **People leave the page in the dark**, not just the picture | A name left in the page, even hidden, would let a phone, a screen reader or a look at the page answer the memory test. In the dark the page holds only numbers: markers are named "Position 3", and the positions summary with names is removed |
| **Position markers are not the seat-number token** | The numeral token's source says it is the seat number, never anything else. Positions are a different number, so the marker is a disc with its number as text, and its shape and place differ from the tags' seat boxes |
| **The Disabler presses the slot's whole press area**, not the 22 px number | The 44 px rule. The number is drawn in the area's upper right corner, as #128 places it |
| **Each room's sparks come from its right-hand light** | A panel shows the middle of its scene with its caption over the upper left. The right-hand light is clear of the caption on every phone; where it is above the panel, the sparks hang from the top edge. The window's id picks where along the light, which way the sparks fall and their tilt |
| **The dark drawing is the lit scene recolored** (the night rule), not a separate painting | Every room stays exactly itself in the dark. One rule covers every room and roster: fills go nearly to ink with a trace of the room's hue, every line goes to faint steel, and the view through a window stays, dimmed |
| **The impact's bright part is a disc of 30 / 160 of its size** | So that every position of the smallest Hospital hit at once still flashes under a quarter of the panel (20% at 320 × 568) |
| **The strip comes in over the last 60 ms of the lights going out** and leaves over the first 60 ms of their return | Fading it with the room laid its words over a still-lit Command Room |

## 3. The film as data

`design/board-v2/films/blackout.mjs` holds the beats (`BLACKOUT`) and `blackoutFrame(t, { outcomeAt, hits, reduced, windowId })`. That function says what the board shows at any moment, from that moment alone:

- the darkness, every room alike;
- whether the people are shown, fading or gone;
- the markers' opacity and style, and the captions' opacity;
- the spark and impact frames, and the shake;
- the strip's opacity, the top bar's clock, and whether the selection is open.

`contract/films.json` is the same as JSON, from `blackoutContract()`.

**Its inputs are public:**

- `t`: from the trusted `previewEndsAt` and `endsAt`.
- `outcomeAt`: when the round's outcome is published.
- `hits`: the authorized hits' slot ids.
- `reduced`: the device setting.
- `windowId`.

**Not an input:** a request or its absence, a side, a selection, a viewer, a role, a cause or a defense. So a Blue strike, a Red strike, a miss and a round with no strike draw the same window. The check feeds it a side and a request and gets the same film.

**Flashes**, counted from the film:

- At most three in any second: the two dips and the sparks, between 4 300 and 5 300 ms. The impact is its own second.
- A spark's or an impact's bright part never covers more than a quarter of its panel, at eight phone sizes and 7, 8 and 9 players, even with every position of a room hit at once.
- Nothing is red.

## 4. The art

All of it is generated by `design/tools/board-v2-assets.mjs` from `design/board-v2/scenes/lighting.mjs` (version `board-v2-lighting-0.1.0`) into `design/board-v2/assets/lighting/`. It is listed with sizes and hashes in the manifest's `lighting` section.

| Files | What they are |
| --- | --- |
| `room-a.dark.svg`, `room-b.dark.svg`, `jail.dark.svg`, `command-room.dark.svg`, `hospital-ward-{7,8,9}.dark.svg` | Each room with its lights out, 1024 × 768, drawn empty: its lit back and front layers together, by the night rule (`NIGHT`: low `#0C1018`, high `#1F2737`, line `#4B5A77`; a window's view at 42%). Drawn over the room's art and people at the darkness's opacity, which is also what dims the room in the flicker |
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
| L6 | Press areas: in the dark, only the eligible Disabler's, in the bound room, while `selection` is true; each a slot's whole press area from `slotRects()`; never moved |
| L7 | Captions at `captions` (70% in the dark); the still bolt under reduced motion |
| L9 | The strip over the Command band's box (`fitBoardV2(...).boxes['command-room']`): the same on every player's screen, absent on the display |
| L10 | The top bar shows the clock; it and the navigation are never dimmed |

**The rules the review page keeps, which a client must keep too:**

1. While `people` is `gone`, no figure, name tag, portrait or name is in the page or its accessibility tree.
2. A reconnect, a return to the foreground or a late join draws the current moment from the deadlines: dark with the true time left, with no flicker and no impact replayed.
3. The strip's second line, the chosen marker and the press areas mount only after Frontend's checks: the current window id, the own audience, a fresh view and the foreground. They unmount when any of those fails, and come back only with an explicit tap.
4. Nothing reacts early to a selection. The impact comes only from the published batch.
5. Outcomes are announced politely after the lights return, for example "The lights are back. Orion is Injured." For a miss or no strike, only "The lights are back."
6. In the preview, each room exposes a one-line positions summary from public facts, for example "Room B: 1 empty, 2 Orion, 3 empty, 4 Nova, 5 empty". It is removed at the lights out.

**Not to port:** `design/board-v2/js/blackout-view.mjs`, `page.js` and `fixtures.mjs`. They are a review page and synthetic fixtures. Its `&play=1` runs the film from a local clock for review only.

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
| `&bound=`, `&step=`, `&pick=` | The Disabler's own selection |

## 6. For Backend and Integration (proposals; nothing accepted)

1. **A public lighting window every normal round:** `{windowId, previewEndsAt, endsAt}`. It runs whether or not anyone asked for a strike.
2. **`seats[].slotId`**, frozen from the window's opening to its end (#128's dependency).
3. **The eligible Disabler's own binding**, in their private view only: `{windowId, boundRoom, selectable, selectedSlotId}`, the selection command and its receipt.
4. **The round's published batch**, with each authorized hit's `slotId` and the publication's checkpoint. Nothing about a request, a side, a miss or a defense is public. A block goes only to its room's occupants, as a room fact ([attack-blocked.md](attack-blocked.md), section 6).
5. **Integration:** the named-file approval of `lighting.mjs`, `films/blackout.mjs` and the 17 lighting files, and a decision on the strip over the Command band.

## 7. Verification

These were run on this branch in this container. Desktop Chromium laid out a review page from synthetic fixtures: this is not a phone, a match or a measurement of players.

| Check | Result |
| --- | --- |
| `node design/tools/board-v2-check.mjs` | **7 / 7.** #128's six (the lighting art now checked with the ward) and the window's own: five seconds lit and ten dark, the selection open exactly then, reduced motion without motion, the dark capped without an outcome, only public inputs, sparks from each room's right-hand light by the window's id, three flashes a second at most, no bright part over a quarter of a panel at eight phone sizes and three rosters, and `films.json` current with no role named |
| `node design/tools/board-v2-capture.mjs` | **55 pictures and two contact sheets, 0 with problems** (27 of them the window's). On every frame of the window it checks the page against the film's stage and fit.mjs's markers, shake or not. It checks that press areas exist only on the eligible Disabler's screen, in the bound room, each a slot's whole press area, and that the strip is the Command band's box. It checks every room's spark is inside its panel and clear of its caption, and that no name is in the page or a label in the dark |
| The same run, **50 whole-page comparisons, 0 differing** | A missed strike against no strike at nine moments, both motion settings and two phones (36). A Blue Disabler's screen against a Red one's at four moments (8). The strip's box, color and opacity on a player's screen against the Disabler's while it is up (6) |
| `node design/tools/board-v2-assets.mjs --check` | 32 files current |
| `npm test --workspace @mothership/design-tokens` | **235 / 235**, 8 of them new (`blackout.test.mjs`); after `npm run build` |
| Existing checks, re-run unchanged | board-motion 13 / 13; phone kit 7 / 7; ability art 12 / 12; design assets 15 / 15; shell 0 failures; board-motion and phone-kit assets current; workspace and source integrity; tooling 130 / 130 |

**Not run:**

- Real phones, a screen reader, enlarged text.
- A photosensitivity analyser: the flash budget is computed from the film, not measured from video.
- A match.
- Reading the specification packet.
- `npm run verify` as a whole: see the PR.

Whether people can remember five positions in five seconds, and whether the dark is tense or merely dark, is for a table of players, not a capture.

## 8. Unresolved

- **Backend's window, binding and batch** (section 6). Until they exist, nothing here reaches players.
- **The strip over the Command band**, for the owner and Integration.
- **A late outcome.** If the outcome comes after the 1.5 s cap, the lights return without it, and its impact then plays on the lit board. To confirm with Backend's publication timing.
- **The display's own layout**: a larger board without a strip, not drawn here.
- **The copy:** "Lights out", "Wait for the lights.", "Strike position 2", "Choose again", "Registered" and "Time is up".
- **The owner has not seen this window.**
