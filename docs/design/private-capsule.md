# Board v2: the private-talk capsule (storyboard S2)

**A proposal from the Visual and Motion Designer, 14 October 2026.** It answers Integration's handoff of 14 October 2026, which recorded the owner's request:

> We need a private room or capsule next to the command room left or right it, but with width of 1/2 of that room. For private talk for 2 player to move there and talk. With animation of both walking there and stay there for 1 minute.

The request supplements the Private Chamber decision (G-02; Q-HK01 to Q-HK03): the Hack's pair, their entrance and their exit are public; the declared side and the conversation are the pair's ([motion-spec-crosswalk.md](motion-spec-crosswalk.md), C-8 and C-11). This step draws the capsule, its film and its review pictures. It is the Designer's storyboard S2, "Private Hack: Private Chamber", turned from a pop-up inset into the permanent capsule the owner asked for.

Nothing here is a rule, a server contract or an adopted asset:

- **Rules and authority:** who may hack whom, the pair, the stages and their deadlines are Backend's. The capsule is not a sixth location: it spends no movement and changes no capacity, room membership, targeting eligibility, health, detention or slot.
- **Adoption:** every new file needs Integration's approval by name and hash (section 9). Frontend owns the connected animation and the responsive layout; nothing here takes either over.
- **The owner has not seen it.**

| | |
| --- | --- |
| Branch | `claude/designer-private-capsule`, stacked on PR #130 (`claude/designer-attack-blocked` at `15e61f0`), itself on #129, #128, #127 and the integration baseline `abb6839` |
| Why stacked | The capsule sits in #128's layout, beside the Command Room, and the review page is #130's |
| Toolchain | Node 22.21.1, npm 10.9.4, headless Chromium 141 |
| New | `design/board-v2/scenes/capsule.mjs`, `figures/capsule.mjs`, `films/capsule.mjs`, `js/capsule-view.mjs`, 8 SVGs under `assets/capsule/`, one test file, this page, and the capsule's review pictures |
| Changed | `js/fit.mjs` (the capsule is an option; without it every layout is byte for byte #130's), the review page, its stylesheet and contact sheet, the asset, capture and check tools, `contract/films.json` and the manifest (now `board-v2-0.4.0`). Nothing outside `design/board-v2/`, `design/tools/board-v2-*`, `packages/design-tokens/test/` and `docs/design/` |

The review pictures are `design/board-v2/review/capsule-*.png`. **`contact-capsule.png` is the phone preview:** synthetic participants (Vega and Orion unless a picture says otherwise) on the review page's mixed fixture. `capsule-sheet.png` is the art on one sheet.

## 1. Where it is

**Command on the left, the capsule on its right**, in the top band, as Integration recommended (the owner allows either side). After the gap between them and their four borders, the band's width is shared 2:1, so the capsule's panel is half the Command Room's, to the pixel the rounding leaves. It is as tall as the Command Room.

**The capsule takes part of the Command Room's width and nothing else.** On every phone width up to 430 px, with and without safe-area insets, every other room is exactly where it is without the capsule. The shell, the bands, the Pass and the navigation are unchanged too, and the Command Room keeps its place and height (checked at 23 265 layouts). C1 stays a whole 44 px press area, clear of the Pass. On a wide window, where C1 needs less height in the narrower panel, the bands may be shared differently.

| Phone | Shell | Command panel (px, inside) without → with | Capsule panel | Capsule box (left, top, width, height) | C1 | Cabin scale |
| --- | --- | --- | --- | --- | --- | --- |
| 320 × 568 | compact | 306 → 198 | 99 × 96 | 212, 38, 103, 100 | 44 | 0.193 |
| 360 × 640 | short | 346 → 225 | 112 × 110.8 | 239, 49, 116, 114.8 | 44 | 0.219 |
| 360 × 740 | tall | 346 → 225 | 112 × 143.6 | 239, 57, 116, 147.6 | 44 | 0.250 |
| 375 × 667 | tall | 361 → 235 | 117 × 112.8 | 249, 57, 121, 116.8 | 44 | 0.229 |
| 390 × 844 | tall | 376 → 245 | 122 × 189.7 | 259, 57, 126, 193.7 | 44 | 0.272 |
| 393 × 852 | tall | 379 → 247 | 123 × 192.9 | 261, 57, 127, 196.9 | 44 | 0.275 |
| 414 × 896 | tall | 400 → 261 | 130 × 217.8 | 275, 57, 134, 221.8 | 44 | 0.290 |
| 430 × 932 | tall | 416 → 271 | 136 × 239.3 | 285, 57, 140, 243.3 | 44 | 0.312 |

Nine players; seven and eight are the same in the top band.

- **It is always there and empty when idle**: door shut, light off, nobody in it. Nothing shifts or grows when a conversation begins or ends: the layout does not know whether one is on.
- **Its label is the board's caption: PRIVATE TALK**, the fixed kind (as the Hospital's and the Jail's). Where one line would not fit (320 × 568), its two words stack. Nothing else is written in it.
- **Nothing in it can be pressed.** It has no slots, no press areas and no tag of its own. The participants keep their slots, press areas and name tags at their real places throughout.
- **The top bar and the navigation never move.** The review page puts the stage's words and the server's countdown in the top bar (section 3).

**The cabin in its panel** (`frameCapsule()`): the cabin always covers the panel. Its scale is the larger of covering the panel and fitting `CAPSULE_VIEW`, from above the status light to the chairs' feet. Across, it centres on that view. Up and down, **the pair comes first**:

1. Where the whole view fits, it is centred.
2. Where it does not, the band from the status light to the pair's chins (`CAPSULE_KEEP`) is centred above the 15 px strip where their name tags go (`TAG_STRIP`). The floor is cropped.
3. Where even that band does not fit, the pair's heads sit just above the strip, and the light is cropped.

At every phone size checked (15 675 framings, widths 320 to 430 px, heights 480 to 1 000 px, five inset cases, three rosters) the pair's heads are whole and above their name tags. At the eight phones in the table the status light is whole too.

**The light is what gives way.** On short screens, 360 px wide and more, the band can be too tall for the panel above the tags. There the light's top is cropped, by up to 22 px at 430 × 600: in 6 171 of 34 128 layouts scanned in this session. On tall, narrow panels the light's right end can lose up to 3.5 px.

The cabin is framed at about the Command Room's scale: 0.95 to 1.0 of it on the taller phones (from 360 × 740 up), 0.87 on the short ones (320 × 568, 360 × 640, 375 × 667). Its seated people are drawn a little smaller than the Captain at C1 (0.87 of the Captain's size at 390 × 844).

## 2. The art

All of it is generated by `design/tools/board-v2-assets.mjs` from `design/board-v2/scenes/capsule.mjs` (version `board-v2-capsule-0.1.0`) into `design/board-v2/assets/capsule/`. Each file is listed in the manifest's `capsule` section with its size, hash and audience: every one public.

| File | What it is |
| --- | --- |
| `back.svg` | The empty cabin, 512 × 768 scene units (half a room, in the rooms' camera): dark metal walls, a vent, a small control panel, the doorway in the back wall (shut by `door-0`), one lamp over a small round table, two chairs facing each other. The status light over the door is unlit |
| `door-0.svg` to `door-3.svg` | The sliding door's two leaves: 0 shut, 1 and 2 opening, 3 open (no leaf) |
| `busy.svg` | The status light over the door, lit while the two are inside |
| `badge.svg` | The pair's badge (48 units, drawn 22 px): a small capsule with two heads in it, in an ink disc ringed in caption yellow. No microphone, no sound waves, no speech balloon, no side |
| `dark.svg` | The cabin with its lights out, shut and empty, for the Blackout's dark: `back` and `door-0` by the same night rule as the rooms ([blackout-window.md](blackout-window.md)) |

- **Its look is the board's:** drawn in the scenes' steel family, ink and paper, in the comic-noir line and halftone of the approved rooms, then printed in its own colors. **The figures are the board's own**: the approved rig, wardrobe and walk, unchanged.
- **Colors** (`CAPSULE_RECOLOR`, a proposal: no reviewed recipe has a capsule): a deep navy turning violet in the light, `#0D1733`, `#1B2A57`, `#303F80`, `#5763A9`, `#9C9CD9`. It sits apart from the Command Room's gold beside it and Room B's purple below it. Its ambient tones are as near the faction accents as the approved rooms' own (Room A's to Blue, Room B's to Alien, the Jail's to Red).
- **Every color an exchange adds is far from every faction accent:** the status light, the badge's ring and the pair's outline are all caption yellow (`color.caption`, `#F7C52B`) with its pale glow (`color.room.commandRoom.pale`, `#F9E48C`). That is 70 and 58 (CIE76) from the nearest accent, Red, against a minimum of 30. **The status light is not red**, as the review's S2 had it: it comes on for every exchange alike, but a red light during a side declaration could be read as one side's.

**The seats and the paths** (scene units of the 512 × 768 capsule; normalized in the manifest):

| | Where | Scale | Faces |
| --- | --- | --- | --- |
| P1 seat (the lower player number) | 134.4, 650 (0.2625, 0.8464) | 1.05 | right |
| P2 seat | 377.6, 650 (0.7375, 0.8464) | 1.05 | left |
| Doorway | 368, 374, on the sill of the opening x 318–418, y 164–372 | 0.9 | as it walks |
| P1's path in | doorway → 164, 480 (behind the table) → 164, 650, beside its chair | doorway's to seat's, by depth | left |
| P2's path in | doorway → 348, 650, beside its chair | doorway's to seat's, by depth | left |

- The way out is the same path backward.
- **Neither path crosses the table or the other's chair:** the feet keep at least 10 units clear of the table's span at its depth, and stay on the deck (checked).
- P1, who goes furthest, enters first. Seat order says nothing but the two player numbers.

**Poses** (`design/board-v2/figures/capsule.mjs`): sitting at the table, and five quiet variations on it: leaning in, sitting back, an open hand at the chest, a hand at the chin (listening), a nod. Plus the approved walk. They are drawn from the public status the board already shows:

| Status | In the capsule |
| --- | --- |
| Healthy | The crew suit |
| Injured, a patient | The gown (the board dresses every patient in it), the bandage and a slight hunch; walking with the approved stagger |
| Jailed, a prisoner | The prison suit, the hands held together in front, so never an open hand or a hand at the chin |
| Injured and detained | The gown, the bandage, the hunch and the hands together |

**Nothing heals, frees or changes clothes on the way**, and a figure wears what its latest authoritative place dresses it in. No pose follows a side, a claim, a role, who asked, who is speaking or any sound.

## 3. The film

`design/board-v2/films/capsule.mjs` holds the beats (`CAPSULE_FILM`) and `capsuleFrame(stage, t, { known, reduced })`. That function says what every screen draws at a moment, from that moment alone:

| Field | Meaning |
| --- | --- |
| `door` | 0 shut to 3 open |
| `busy` | The status light lit |
| `highlight` | The pair's outline at their places, 0 to 1 |
| `people.P1`, `people.P2` | For each seat the projection names: `home` (`present`, `standing`, `stepping`, `away`, `returning` or `settling`, its progress, its figure's opacity and its away marker's) and `capsule` (`empty`, `entering`, `sitting`, `seated`, `standing` or `leaving`, its progress and opacity) |

`capsulePerson()` and `homePerson()` turn a person's part into where and how its figure is drawn: anchor, scale, facing and skeleton. `seatedPose()` gives the seated variations. `capsuleContract()` is the film as data: the third entry of `design/board-v2/contract/films.json`.

**The server's deadlines are the only clock.** `t` counts from the stage's authoritative start: the result stage (5 s), the conversation (60 s), the conversation's end. Nothing waits for the film, and no film time is subtracted from anything.

| Stage | Time (ms) | What every screen draws |
| --- | --- | --- |
| Declare | — | Once the projection names the pair: both outlined in caption yellow at their places, with the badge |
| Result | 0–700 | The outline (in by 300) and the badge. On the two participants' own phones, the claim card is theirs, outside the board (section 5) |
| | 700–1 420 | Each stands (120), steps toward the capsule's side and fades out of its room. Its **away marker** comes up at its slot: its own figure, gray and faint, with the badge and its name tag. The slot keeps its press area |
| | 1 250–1 550 | The door slides open |
| | 1 550–2 930 | P1 comes in at the doorway and walks behind the table to its chair (1 050), turns and sits (330) |
| | 2 000–3 230 | P2 comes in and walks straight to its chair (900), sits (330) |
| | 3 300–3 600 | The door slides shut; the status light comes on at 3 600 |
| | 3 600–5 000 | Settled and still: **1 400 ms to spare** before the conversation |
| Talk | 0–60 000 | Both seated behind the shut door, the light on. Their quiet variations follow a schedule seeded from the exchange's public id: a pose held 3.8 to 6.8 s, eased over 700 ms, a blink every 3 to 6 s. The two are never in step, and the schedule is the same on every screen. **The top bar counts the server's conversation time down from 1:00** |
| Exit | 0 | The light goes out; the door opens (0–300) |
| | 300–1 300 | Both stand (300–420) and walk their paths back to the doorway, fading in it: P2 gone at 1 120, P1 at 1 300. The door shuts (1 300–1 600) |
| | 1 120–2 230 | **As each leaves the capsule**, it steps back in at its latest authoritative place, where the board has it now (600), and settles into that place's gesture (330); its away marker fades. P2 is done at 2 050 and P1 at 2 230 |

- **Nobody is ever in two places.** A participant is drawn in its room or in the capsule, never both, and its place shows its away marker whenever it is in the capsule. The one exception is reduced motion's 80 ms cross-fade.
- **The walk:** at the approved public move's cadence (1.5 two-step cycles per 450 ms).

**Reduced motion:** no walking, no steps, no turning and no variations.

- Result: the outline and the badge until 700 ms. Then an 80 ms fade takes the people from their places to their away markers and seats them in the capsule. Its door shows open until 1 100, then shut, with the light on.
- Talk: both seated and still.
- Exit: the light goes out, the door shows open for 400 ms, and the people fade back to their places over 80 ms.

**Reconnect.** A screen that joins mid-stage draws the stage's settled state at the current server time, never any of the film it missed:

- In the result stage and the conversation: both seated, the door shut, the light on, the away markers at their places.
- After the conversation: everyone at their places and the capsule empty.

The entrance and the exit are never replayed, and the minute is never restarted.

**Loading.** The film draws only the seats the public projection has named, never a guessed partner:

| Named | What is drawn |
| --- | --- |
| None | The capsule as when idle (door shut, light off) under the stage's top bar |
| One | That one's film alone; the other stays untouched at its place |
| A seat named late | Drawn settled |

**Inputs:** the stage, `t` from its authoritative start, the public pair (two seat ids, ordered by player number), each participant's latest public place, health and detention, the exchange's public id, and the device's reduced-motion setting.

**Not inputs:** the declared side or the claim, which participant asked, who is speaking, a microphone or any sound, a role, a faction or a defense, an animation's completion.

## 4. Audiences

- **Public, and the same on every phone and the shared display:** the capsule, the pair, their entrance, the conversation scene and their exit. The capture finds the display's page byte for byte a player's at nine moments across the stages (section 8).
- **The pair's alone, and not part of this film:** the declared side, its card and the conversation. They stay in the participants' own Hack panel ([phone-kit-handoff.md](phone-kit-handoff.md), with #127's privacy lifecycle). The film never reads them and never covers that panel.
- **No voice service.** The conversation stays in person and out of the others' hearing. This adds no online voice, text chat, recording or microphone service.

## 5. For Frontend

Frontend has reviewed none of this. Please review the 2:1 fit, the framing and the rig before anything is ported.

**Layout.** Call `fitBoardV2(viewport, roster, { insets, capsule: true })`. It returns `panels.capsule`, `boxes.capsule` and `capsule: true`; the Command Room's panel is its 2:1 share. Without the option every result is byte for byte #130's (49 680 layouts compared). Draw the capsule as scenery: no press areas, no slots, no tag.

**Layers in the capsule's panel**, bottom to top:

1. `back.svg`
2. `door-<n>.svg`
3. The participants, by depth
4. `busy.svg`
5. The participants' compact name tags in the panel's foot strip (`TAG_STRIP`, 15 px), under their chairs, kept whole inside the panel and apart
6. The caption

Frame them with `frameCapsule(panel)`. Clip everything to the panel.

**The participants' places:**

- At its slot, a participant's own figure becomes its away marker (grayscale, 0.35 opacity) with the badge at the slot's badge anchor, while the film says so.
- Its name tag and press area never change.
- Its walking figure (`homePerson()`) is clipped to its own room's panel and drawn on the room's figure layer.

**Rules the review page keeps, which a client must keep too:**

1. Start nothing from a local clock: `t` is from the stage's authoritative start, from the server's deadlines (section 6).
2. Draw only the seats the public projection names (`hackSession`, section 6). Never infer the partner from hidden data, a claim, a pending request or a private panel. Order the pair by player number, never by who asked.
3. On a reconnect, a late name or a stale stage, draw the settled state (`known: 'settled'`). Never replay.
4. Draw each participant at its latest authoritative place, health and detention, live. The exit returns it to wherever the board has it then, never to where it left.
5. The film never covers the participants' own claim panel. On the review page a stand-in marks where the phone puts it (`&viewer=participant`), and the capture checks the two never overlap.
6. Ship the eight SVGs in the common bundle, never fetched on demand.
7. In the Blackout's dark, draw `dark.svg` for the capsule, as the rooms are drawn dark. The review page does not combine the two films.
8. The top bar's words on the review page ("Hack: declaring", "Hack: result", "Private talk") are stand-ins. The countdown is the server's.
9. The 2:1 band is measured with the review page's bars only. #141 notes that Frontend still has to measure its own action, claim and receipt rows, and the 320 × 568 safe-area case, against this band.

**Not to port:** `design/board-v2/js/capsule-view.mjs`, `page.js` and `fixtures.mjs`. They are a review page's controllers and synthetic fixtures. Its `&play=1` runs the film from a local clock for review only.

**Review page options** (`design/board-v2/index.html?roster=9&fixture=mixed&film=capsule`, or `?capsule=1` for the empty capsule on any board):

| Option | What it shows |
| --- | --- |
| `&stage=declare\|result\|talk\|exit\|idle` | The stage |
| `&t=` | ms from the stage's authoritative start |
| `&play=1` | Plays the result, the conversation's first 12 s and the exit, from a local clock (review only) |
| `&pair=1,5` | The two participants' seat numbers on the fixture (2,4: a patient and a prisoner; 7,8: the Captain and a detained patient) |
| `&known=0\|1\|2` | How many of the pair the projection names |
| `&late=1` | The second named after its part began |
| `&settled=1` | A reconnect |
| `&moved=5:B5` | A participant's latest place changed meanwhile |
| `&viewer=player\|display\|participant` | The screen; `participant` adds the claim panel's stand-in |
| `&exchange=<id>` | The exchange's public id (the variations' seed) |
| `&motion=reduced` | The reduced-motion variant |
| `?sheet=capsule` | The art on one sheet |

## 6. For Backend: the public pair the film reads

**No new field is needed.** Backend's draft [Amirkianfar66/GameN#140](https://github.com/Amirkianfar66/GameN/pull/140) (`codex/backend-private-capsule`, head `9d23adb`, not merged) projects `hackSession: { hackId, actorSeatId, targetSeatId } | null` on public and player snapshots. It is bound to the existing phase and its timers, with no capsule location, occupant, acknowledgment, return address or exit phase. Frontend's [Amirkianfar66/GameN#141](https://github.com/Amirkianfar66/GameN/pull/141) accepted that boundary. The film's inputs map onto it:

| The film's input | From #140 |
| --- | --- |
| The pair, P1 and P2 | The two seat ids, `actorSeatId` and `targetSeatId`, **ordered by player number**: P1 the lower. The drawing never shows who asked |
| The seed of the seated variations | `hackId` |
| `declare`, `result`, `talk` | The existing phase while `hackSession` names the pair |
| `t` | From the phase's authoritative start: its deadline less its server duration (15 s at most, 5 s, 60 s) |
| `exit` | From the conversation's authoritative deadline, when the session clears; it draws over whatever comes next and holds nothing back |
| Places, health, detention | The board's own projection, latest |

A pending request stays private and names nobody, so nothing is drawn for it. #140 also lets accepted movement change a participant's place during the exchange. The exit returns each participant to wherever the board has it then. Nothing here asks Backend for a capsule location, an occupant, a return address or an exit phase.

## 7. For Integration

1. **Approval by name and hash** of the four modules (`scenes/capsule.mjs`, `figures/capsule.mjs`, `films/capsule.mjs`, and the changed `js/fit.mjs`) and the 8 SVGs (section 9). Also of the capsule's recolor map, which has no reviewed recipe.
2. **The layout option.** `fit.mjs` gains `CAPSULE`, `capsuleSplit()` and the `capsule` option; its other exports and every default result are unchanged.
3. **No playable build** until #140's projection is adopted and Frontend has implemented the film against it. This page is not evidence that a capsule is implemented or deployed.

## 8. Verification

These were run on this branch in this container. Desktop Chromium laid out a review page from synthetic fixtures: this is not a phone, a match or a measurement of players.

| Check | Result |
| --- | --- |
| `node design/tools/board-v2-check.mjs` | **10 / 10.** #130's nine, and the capsule's own: (1) the layout at 23 265 phone layouts (11 widths, 5 inset cases, heights 540 to 960 px, 3 rosters): every other room where it is without the capsule, the capsule beside the Command Room and as tall, 2:1 within a pixel, C1 44 px and clear of the Pass. (2) The framing at 15 675 more: the pair's heads whole and above their name tags; at the eight phones the status light whole. (3) The film at every 10 ms of the declaration, the result stage and the exit, and every 250 ms of the conversation, in both motion modes. It checks only public inputs, nobody in two places, the door open whenever someone walks through it, the light only with both seated, settled by 3 600 ms, back by 2 230 ms, nothing played in the reduced variant, nobody drawn with none named, nobody invented with one, and nothing replayed on a reconnect. (4) Both paths clear of the table and on the deck. (5) The bandage and a prisoner's hands together at every pose and walk phase, and no bandage on anyone not Injured (the stagger is in the unit tests). (6) The variations' schedule the same on every screen, the two never in step. (7) The status light, badge and outline 30 or more from every faction accent, and tokens'. (8) `films.json` current, its contract public, naming no role. It also checks that the captures are current and that every probe, press and comparison passed |
| `node design/tools/board-v2-capture.mjs` | **136 pictures and four contact sheets, 0 with problems**, 39 of them the capsule's. On every capsule picture it checks no scroll; every room and the capsule at `fit.mjs`'s boxes, 2:1; the bars in their places; the top bar's timer the server's; every caption on one line inside its panel. It checks the door, the light and the people in the capsule as the film says, each dressed as the board dresses it, with their tags inside the panel, apart and off the caption, and nothing pressable. It checks every seat's tag at its slot, the participants' included; the away markers, outlines, badges and moving figures as the film says; nobody else touched. It checks the claim panel's stand-in never under the film, and no side or role word on the page |
| The same run: **284 whole-page comparisons, 0 differing** | #130's 222, and 62 for the capsule, each at 390 × 844 and 320 × 568, with and without reduced motion: the display's page and a player's at nine moments of every stage (36); a reconnect's board and the film's settled board at five moments (20); the page after the exit and the idle page (4); and the top bar's box at five stages (2) |
| The same run: **206 pointer probes** | #130's 186, and 20 with the capsule: every slot of every roster at four phones with the capsule empty (12 pages), and while the film plays at 320 × 568 and 390 × 844 (8 pages). Every slot's press area is its own button at its centre and four corners, C1 included, and nothing in the capsule can be pressed. 0 problems |
| The same run: #130's **23 real-pointer press tests** (129 presses) and **12 label placements** | 0 problems, with the capsule's code on the page |
| Pictures byte for byte the same | `capsule-390x844-idle.png`, `capsule-390x844-reconnect-exit-0800.png` and `capsule-390x844-reduced-exit-0400.png` (`5119dbf7…`): after the exit, a reconnect during it and the reduced exit leave exactly the idle board. Every review picture made before this step re-rendered byte for byte the same |
| `fitBoardV2()` without the capsule | **49 680 layouts byte for byte #130's** (`ebf0263`), boards and slot rects: 16 widths from 280 to 1 024 px, heights 380 to 1 000 px, five inset cases, three rosters. A comparison run in this session, not a committed check |
| `node design/tools/board-v2-assets.mjs --check` | 47 files current |
| `npm test --workspace @mothership/design-tokens` | **260 / 260**, 12 of them in `capsule.test.mjs` |
| Existing checks, re-run unchanged | board-motion 13 / 13; phone kit 7 / 7 and its flows 109 / 109; ability art 12 / 12; design assets 15 / 15; shell 0 failures; board-motion, phone-kit and ability assets current; `typecheck`, `build`; `check:toolchain`, `check:workspace`, `check:sources`; tooling 130 / 130; `git diff --check` clean |

The captures' inputs hash is `1601a2cb497f7f7938a93a0a406ccc50663b9623bccc7b4f113dcd3f3f81ce0e`.

**Not run:**

- Real phones, a screen reader, or enlarged text.
- A match, or any server: the stages, deadlines and pair come from the review page's query, not from #140.
- `npm run verify` as a whole: see the PR's CI.
- The owner's review.

Whether people read the capsule as the pair's private talk, and the away markers as the participants still at their places, is for a table of players, not a capture.

## 9. The exact files

Read every file at this page's commit. Every file carries the `mothership:dev-only` mark and stays fenced until Integration ports it in a separate, versioned review; the Designer changes no fence and no pin.

**Proposed for import:** three new pure modules, the changed layout and the eight SVGs. They import two approved board-motion sources, `scenes/kit.mjs` and `figures/motion.mjs`, byte for byte as at the integration baseline `abb6839`, and nothing else outside the capsule's modules: no controller, fixture or tool.

| Module | What it is | Exports |
| --- | --- | --- |
| `design/board-v2/scenes/capsule.mjs` | The capsule's art and geometry, `board-v2-capsule-0.1.0` | `CAPSULE_VERSION`, `CAPSULE_SIZE`, `CAPSULE_RECOLOR`, `CAPSULE_ACCENTS`, `DECK`, `DOOR`, `DOOR_FRAMES`, `TABLE`, `CAPSULE_SEATS`, `DOORWAY`, `BESIDE`, `PATHS`, `recolorCapsule`, `capsuleLayers`, `CAPSULE_VIEW`, `CAPSULE_KEEP`, `TAG_STRIP`, `frameCapsule`, `BADGE_SIZE`, `capsuleBadgeSvg` |
| `design/board-v2/figures/capsule.mjs` | The poses by public status and the variations' schedule | `CAPSULE_POSES`, `POSE_NAMES`, `statusOf`, `sittingPose`, `walkingPose`, `LOOP`, `capsuleLoop` |
| `design/board-v2/films/capsule.mjs` | The film | `CAPSULE_STAGES`, `CAPSULE_FILM`, `CADENCE`, `capsuleFrame`, `capsuleEnd`, `seatedPose`, `capsulePerson`, `homePerson`, `capsuleContract` |
| `design/board-v2/js/fit.mjs` | **Changed:** the layout gains `CAPSULE`, `capsuleSplit()` and the `capsule` option. Every other export and every result without the option are #130's | as at `ebf0263`, plus `CAPSULE` and `capsuleSplit` |

To check every file, run `sha256sum -c` on this block from the repository root:

```
609cae048ea24c777803fda9488880b649dbf653b229c7d2d81bb25996da2553  design/board-v2/scenes/capsule.mjs
a90ae47382d5ec2bc152c1e915bc5a34c258821228bd769b9b76c7472975adc2  design/board-v2/figures/capsule.mjs
d664e3d447f076ab0bd1b8d91fce9437ccd39354496941cf8e2a0472657d780a  design/board-v2/films/capsule.mjs
b959106a7b78c4fe493209ef1c1dc471c6835b9807330eb2193ef86a6f31f2b6  design/board-v2/js/fit.mjs
1bcfd91e11e73d5c6a6205abf0c12b9b111ee4887c872975fca1dc8b41e87cc5  design/board-v2/assets/capsule/back.svg
63026f9971904a750fed9b6caa04e061f74d0b39b42e40165dea8f812314491e  design/board-v2/assets/capsule/door-0.svg
ddb0d2d2855c352366db5ca4a9e2470440fa134f613cf92cd8e0a1a47aedc24f  design/board-v2/assets/capsule/door-1.svg
9b7d9fdd9f6f02fcfc190a03fcd3d19b6a2d2123a78ce4187c27c5294dc784c9  design/board-v2/assets/capsule/door-2.svg
55cc7717d8f733ce38e6ac5c7c14ac19e8b0296ce44ba0d95ad98415fb8b31e7  design/board-v2/assets/capsule/door-3.svg
d5e45edd0af0115e0e87b64f0da8985d04d1166ee27ebbf8df2b687f6871dca9  design/board-v2/assets/capsule/busy.svg
f624378a91c11f67f7ffc7c4fd15e65eccc5287f57f0b50a75b5332988761dc7  design/board-v2/assets/capsule/badge.svg
bae4c518d7732b2ccbf8179351ed3d7d815d0204dd4a1666b190148cee237185  design/board-v2/assets/capsule/dark.svg
```

**Of the 57 files** in [board-v2-frontend-handoff.md](board-v2-frontend-handoff.md) (pinned at `ebf0263`), one changes: `design/board-v2/js/fit.mjs`, `637d9895…7d0be6` → `b959106a7b78c4fe493209ef1c1dc471c6835b9807330eb2193ef86a6f31f2b6`. The other 56 are byte for byte as listed there. `contract/slots.json` is unchanged too.

**Evidence, not for import:** the generated contract and manifest (records for review, not a runtime manifest), the review page's controller and stylesheets (not to port), the tools and the tests.

```
79e475cad13c7376d17bb1b63be47211881fb6cf4b4da4e116cbd85ec456f909  design/board-v2/contract/films.json
560d9648c483eda68d93fb3fb64d7871eb07a708e35368ee1b41d28520d34cb5  design/board-v2/assets/manifest.json
ab687508df829b33e13e5b98243615794e14e0ff3b57e793ce6e6f335f1f4785  design/board-v2/contract/slots.json
1095caf321781fa614b19391a6258f0ed86181c5eb7b095701a82198c5a80c98  design/board-v2/js/capsule-view.mjs
bd2219cb9cbacba0087061019f5da7fac70fa77753af76ba3c2ef6c6096949b8  design/board-v2/js/page.js
c1cd497a889ca66c37189334b53d381a26ab296c4abce01ac4a372a09297265b  design/board-v2/css/page.css
740a5e24074991cc9ea097d201ee35c1bcb49cfe773a77bc3348c72650bb8f62  design/board-v2/contact.html
e8f54f3c915c32499397a8d457352bb8e5103082c79a94242a9b5c0d50998b8c  design/tools/board-v2-assets.mjs
57a58ca80a9afc213d243149b7657d10834fb706b7c3b86b43993271f26bec5f  design/tools/board-v2-capture.mjs
baf233ce91612b724024420e1c9fba9fa9a80e0972fb0f791d88ae0dc49838c2  design/tools/board-v2-check.mjs
51225d1e037ce36e53d4b11300b6228770862ef660b1c62c642b1c41eb711533  packages/design-tokens/test/capsule.test.mjs
```

**The phone preview and its records:**

```
e88085633e0e106eb3525d4aa6784889a27c47ec22ded8be5b15c88e30d50da4  design/board-v2/review/contact-capsule.png
ea1f292a9e913e10566422368bd42485c953c5920a4615eea63bd60d9a0bece2  design/board-v2/review/capsule-sheet.png
4a421aefb851bd98aee69b12d32d0bbc12718b9d72538110d81b2d950d01d0c4  design/board-v2/review/index.json
ffd84087235021b6aed261d08b721585a21ca1554005efca8b51a9a3b8fdcabc  design/board-v2/review/report.json
```

**Every capsule picture:**

```
4ba728c3ec3463372e9de04d38a4e19bc87b62e090192446220ecb2d3de22cc7  design/board-v2/review/capsule-320x568-exit-0800.png
37a71d1c13482aa9e30ef836760721761672a85b85a20bf72de673013fdeca85  design/board-v2/review/capsule-320x568-idle.png
50f26b15828b35a95b16ec8048f8e19758cd31b5977ac7be57d996885729c970  design/board-v2/review/capsule-320x568-participant-result-2400.png
c48777e94458f791a2f92d1a7a76449867818399720959eafe2840964ac8a3df  design/board-v2/review/capsule-320x568-result-2400.png
c5a7e008a1036a8fc97e860986ca1640b53d1d877747a5d6e43dc98acf025dea  design/board-v2/review/capsule-320x568-talk-30000.png
1afe46b11e84d5fbf106da3812b5a3edd8591b82f14e579d8195d8564c08fb98  design/board-v2/review/capsule-360x740-idle.png
d885c1457b7f8e2564d4b8b5beb19c7f32c1481be329b0d263f24503629aba62  design/board-v2/review/capsule-390x844-declare-4000.png
7ec61f1d95db96c3eb2864e3bce44e3aaed12189bdfde635e248ef48b92709cb  design/board-v2/review/capsule-390x844-exit-0360.png
a424560f7465afd08ee8d47bffa0b8b9f500c2ebe04257bf8e38f80de8918d45  design/board-v2/review/capsule-390x844-exit-0800.png
b4da5ad235c9ccb5e31c55a94bc6d7a7db9b53680c830a650cce6075c2632e02  design/board-v2/review/capsule-390x844-exit-1250.png
5119dbf71b35750c2be6d29a1a1eff31f5b54feb256ebf90622345d71066638d  design/board-v2/review/capsule-390x844-idle.png
127ce7bbfd4ed99c719ea52b9fd4fa5e179ca6c52897945aa8349f04c8c3573d  design/board-v2/review/capsule-390x844-late.png
f87483bc6dd6d740278d6805e28e8f09d0886ecf554ae33299356dddd11e1cf0  design/board-v2/review/capsule-390x844-loading-0.png
075a6a4f8b30bae7c2631c2b399f6c70fe1cfd4823e89ce1331481dcb035b107  design/board-v2/review/capsule-390x844-loading-1.png
8eb5b27bdd5c95ea39d5351b1ae5b6e05c131f18d87b9af5a5ca046038d026ad  design/board-v2/review/capsule-390x844-moved-exit-1250.png
248170fe166116f099c22d376f2ff8c417f734dc62aa0c35353595a08a78c542  design/board-v2/review/capsule-390x844-participant-result-2400.png
5119dbf71b35750c2be6d29a1a1eff31f5b54feb256ebf90622345d71066638d  design/board-v2/review/capsule-390x844-reconnect-exit-0800.png
7f08dfb86ff4476fd5e16cf3e02137e0062b43b3ace965bb088f5feadb0c2d69  design/board-v2/review/capsule-390x844-reconnect-result-2400.png
04786f8c9d606feadd9667c4295e319db8442bd0f42d5d43ba121f9171ea597a  design/board-v2/review/capsule-390x844-reduced-exit-0040.png
5119dbf71b35750c2be6d29a1a1eff31f5b54feb256ebf90622345d71066638d  design/board-v2/review/capsule-390x844-reduced-exit-0400.png
a806cf300e0bcb0d13d9a59e377aa3c47e59b29fdad3362edcbe5d9d14e235f9  design/board-v2/review/capsule-390x844-reduced-result-0760.png
4a629e389904717555f7027607af5f060032b9e27537719a60cabf6cd887c2d5  design/board-v2/review/capsule-390x844-reduced-result-1100.png
d50bf13eb2fecb68f8a2a88bae5accb6e4088e834721cb96e1af319f259af551  design/board-v2/review/capsule-390x844-reduced-talk-30000.png
dedd167cfb3907cac5e874aba07c16ca82a56888d30cd1615a40b590a4ecb352  design/board-v2/review/capsule-390x844-result-0400.png
0cd048b04cf3576f3a06153cc01e3282d003f69d14302dd11743f8a13b2305c6  design/board-v2/review/capsule-390x844-result-1200-captain-detainee.png
73aa6eda443e364babb3b981ffbd498d28659e6f90017d04e73762153e20afe2  design/board-v2/review/capsule-390x844-result-1200.png
5f11b2535792ba6b399f1b901bf917e9bff0622531448ccbd60c763039de02c1  design/board-v2/review/capsule-390x844-result-2000.png
72117ab2e8fd8acbf4a59383ecdc6e0f9d32f6a7d6bdc45b5e0e682561e08f24  design/board-v2/review/capsule-390x844-result-2400-patient-prisoner.png
1a2e3b698bae873b9f4935f1e24cd1349739af46d167d744693191227f1b556e  design/board-v2/review/capsule-390x844-result-2400.png
ea97b83f2e31928d19c550eb39efd6f40aca9b4222687af7b85f09b43ee1704c  design/board-v2/review/capsule-390x844-result-2750.png
93d282c535bebd9ecea08d93562797f67c708e13f712d425c817f6ce99558c8c  design/board-v2/review/capsule-390x844-result-3600.png
c90117e0ee4af352f2b19c6e0f9959b16193bd7db112198e2a504204e0188106  design/board-v2/review/capsule-390x844-talk-0000.png
bea66a23177eeee8766a6318d0e2030a69eb0861b09752caa61f6e9ceccfb267  design/board-v2/review/capsule-390x844-talk-20000-captain-detainee.png
fe83d2aef304bb8b43675adb1fbac4d7e3d385cab596400f3396c75f55967f4e  design/board-v2/review/capsule-390x844-talk-20000-patient-prisoner.png
879429bf28132cbe6eb641d2453a6a550708b1a551828010f0fa352649745121  design/board-v2/review/capsule-390x844-talk-30000-r7.png
2042501bdbe5d06d817c982e0e0474f068b56963e94ba0e1ad655e35cffc37df  design/board-v2/review/capsule-390x844-talk-30000-r8.png
dc703cffb11538da1117a2b465836e2f3d5aeb359094e912b8fe891bd156e299  design/board-v2/review/capsule-390x844-talk-30000.png
17f8b6fa2c30bec0a5ce65ed57f726b052f463330b71f72aaa739d8793833ee4  design/board-v2/review/capsule-430x932-idle.png
```

## 10. Changes from the review's S2

| S2 (13 October) | Now | Why |
| --- | --- | --- |
| A Chamber inset opened over the board for the exchange, collapsing to a chip when the viewer's own panel opened | A permanent capsule beside the Command Room, empty when idle | The owner's request. It never covers anything, so nothing collapses |
| A subtle red door-status light | Caption yellow | Red could be read as a side (section 2) |
| The result stage: out at 0, door at 1 000, in by 2 400, seated by 2 900 | The outline first (0–700), out by 1 420, door at 1 250, seated by 3 230, settled at 3 600 | The pair is identified before it moves. The far chair's path goes behind the table. 1 400 ms still spare |
| Loops by part (head tilt, a hand every 5–7 s, lean, a posture shift) | Whole poses on a seeded schedule, plus blinks | One rig, readable at 40 px; still never speech |
| A "comms" badge above the head; a dashed ghost | The capsule's badge at the slot; the figure gray and faint | The badge means the capsule; a faint gray figure reads as away without a new drawing |

## 11. Unresolved

- **Backend's projection** (section 6): #140 is a draft. Until it is adopted and Frontend draws from it, nothing here reaches players.
- **The side.** Right, as Integration recommended. The owner allows either; mirroring to the left is a layout change only.
- **The away marker's look** (gray at 0.35 opacity) and whether players read it as "still here".
- **Short screens**, where the status light is cropped to keep the pair in view (section 1).
- **The top bar's words** during the stages, and the copy "Private talk".
- **Sound:** none here.
- **The owner has not seen the capsule.**
