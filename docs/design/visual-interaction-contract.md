# Board and card visual and interaction contract

**Version:** 0.3 · **Status:** proposal for review by Frontend, Codex Integration and the game owner.
It applies [art-direction.md](art-direction.md) (0.2) and [motion-direction.md](motion-direction.md) (0.1), which stay as written, to the audience views of wire protocol 1 at the base commit. Where it refines the art direction, [section 9](#9-where-this-refines-the-art-direction) says so and why.

This is the first V1 milestone: the contract for an in-person game on private phones and a shared board, and one finished treatment of it. It is not a complete V1.

No picture, layout or default in this document is a rule. A state is drawn only from a fact the audience's own view carries; where the views carry no such fact, the state is specified and waits.

## 1. The room this is designed for

Seven to nine people sit together and talk. That conversation is the game. Each holds a phone; one screen, or a printed board, is shared.

Four things follow, and every layout decision below comes from one of them.

1. **A phone is held where others can see it.** So a phone has two layers. The public layer is identical on every phone, whatever its role and whoever's turn it is. Everything private, including whether a seat has anything to do at all, is inside one sheet that is closed until the player opens it.
2. **The shared screen is read from across a table by everyone at once.** So the board is pictures and the roster beside it is words. Nothing on it is small text over art, and nothing on it moves unless a public fact changed.
3. **A turn is sixty seconds of talking and acting.** So the private sheet is one tap away from anywhere, hiding it is one tap away from anywhere inside it, and no animation is ever waited for.
4. **The table must stay calm during conversation.** So motion is a short accent and then stillness. Nothing loops, breathes or drifts.

## 2. What may be shown where

These hold on every surface. [verification.md](verification.md) says which of them a check holds and which rest on review.

- **The public layer never varies by role or by private state.** No count, badge, dot, highlight, sound or vibration tells an onlooker that a seat has an action, a resource or a decision. Nothing outside the private sheet is styled by what is inside it.
- **What a device asks the network for never varies either.** Art is loaded as whole bundles, before the first match view, the same on every phone. Nothing is fetched because of something a view says ([section 8](#8-assets-and-how-they-are-loaded)).
- **A public token is one shape.** It differs only by its seat number and its public health. Never by role, faction, weapon, Code or Protection.
- **Faction color is private.** Blue, red and the Alien accent appear only inside a player's own private sheet, beside the word they stand for. No public asset contains one.
- **Amber means two things and only two:** interaction focus, and the public active turn. Never danger, never an attack, never a result, never a faction.
- **Public status is never red.** Injured and Eliminated are told apart by outline and by their word.
- **Health, Jail and Captain are three facts** with three markers. None implies another. The Captain marker is a rank star: it says nothing about immunity, and it is not a shield.
- **Registration is not an outcome.** A registered command gets a private stamp and the words “This is not a result.” Nothing public happens: no room lights, no token turns, no line is drawn, no sound plays.
- **A cue adds no fact.** It is emphasis for something the screen already says in words, on the audience that was already told.
- **No picture implies a route.** Every location is its own panel. No door, corridor or arrow is drawn; a moving token never travels between two rooms. Destinations come from the authorized action view.
- **No slot is a capacity.** The deck has no marked places. Token positions are a suggested reflow.
- **Words are never drawn.** Every word on screen is live English text, so wording changes repaint nothing.
- **Color is never the only difference.** Every state has words of its own, and most have an outline of their own as well.
- **Nothing waits for a picture.** The skin is complete without art; art is drawn over it once it has arrived.

## 3. Surfaces

Annotated boards, with every numbered part tied to its component and its source, are in [layouts.md](layouts.md).

### 3.1 Phone, public layer (320 to 599 CSS px)

![Phone, public layer](../../design/review/layout-phone-public.png)

Top to bottom: header; data-source and connection banners; seat identity; the phase caption with its countdown; the player's location with the room's vignette strip, their own public status and who else is there; every location with its seats; display settings. The private dock rests at the bottom edge.

The list of all locations is the board on a phone. It is the complete read and tap path; nothing needs a drag, a pinch or the 3D scene.

### 3.2 Phone, private sheet

![Phone, private sheet open](../../design/review/layout-phone-private.png)

Opening the dock raises the sheet from the bottom edge. Where the screen is tall enough for the reader's text it stops below the phase caption, so the round, whose turn it is and the countdown stay in view while the player acts. The control that opened it stays where it was, now hides it, and stays pinned at the top of the sheet however far the cards are scrolled.

Inside, in this order: the role card, compact, with the role name no larger than a heading so it cannot be read across a table; then the action cards. The role's summary and the full illustration are behind “About this role”, so the actions are within reach without scrolling. One card is expanded at a time.

Closed, nothing private is in the document at all. The page going to the background closes it. That is best-effort privacy, not screenshot protection.

### 3.3 Narrow phones, short phones and large text

![320 px wide at 200% text](../../design/review/layout-phone-narrow-large-text.png)

Breakpoints are written in em, so a layout answers to the reader's own text size as well as to the screen. At 320 CSS px with the browser's default text doubled: the header wraps, chips wrap, panels give their inner margins back to the words, and the dock is its control and nothing else. Body copy and instructions never shrink. Headings and the wordmark, which are labels, give way to the screen's width rather than run off it. Decorative pictures keep their size or step aside.

![320 by 568 at 200% text](../../design/review/layout-phone-short-large-text.png)

Where the screen is short for that text, under 30em tall, the phase caption scrolls with the page instead of holding the top edge: a caption that has wrapped to several lines would otherwise take the screen. An open sheet may then cover it. At 320 by 568 with doubled text the dock is 216 px tall in desktop Chrome, because the three words of its control wrap to three lines; the layout check holds that the page keeps at least half of the screen with the sheet closed, and measured 62% there. That is the tightest case in the matrix and it is tight.

### 3.4 Player on a wider screen (from 600 CSS px)

The same facts side by side: location and roster on the left, the private sheet as a column on the right, still closed by default. A wider screen grants no extra information.

### 3.5 Table display

![Table display](../../design/review/layout-table-wide.png)

The phase caption and countdown across the top. Under it the board, drawn as a comic page: a sheet of paper with one inked panel per location and paper gutters between them. Room A and Room B share the top row. The roster beside it says in words everything the board draws.

In a panel that has its vignette, tokens stand on the deck as standees in one or two even rows. A standee's body follows the seat's public health, and markers ride on it as badges. Names and status words are in the roster and, hidden from sight only, in the panel itself.

![Table display, every public health state](../../design/review/layout-table-varied.png)

A panel without a vignette is a plain inked panel with badge tokens, names and chips. Four of the five locations are drawn that way today, and so is Room A until its art has arrived. Seats share a row while their words fit side by side and take a row each when they do not; a status word is never squeezed or broken to keep a column.

The roster goes beside the board only from 1280 CSS px. Below that its four columns do not fit beside a board still worth looking at, so it sits under the board. Its cells wrap; it never scrolls sideways.

The table display has no private sheet, no control that sends a command, and no role-dependent asset.

### 3.6 Connection lost, and no art

![Connection lost](../../design/review/layout-reconnect.png)

A stale view is kept, not hidden. A strip of paper tape says what happened and offers “Reconnect now”; a hatched frame runs inside the edge of the page; the countdown's last estimate sits in a dashed outline. Inside an open sheet a notice says actions are paused, and the Shot card shows its status with no control under it. Nothing is greyed below the contrast targets: the last known state stays as readable as a live one.

![Without art](../../design/review/layout-missing-assets.png)

Without art, which is every device until its bundles have arrived and any device on which they never do, both shells are complete: disc tokens with live numerals, chips with their words, plain panels. Forced colors keeps this skin on purpose.

## 4. The comic language

Four devices carry the comic direction. Each has one job.

| Device | Where | What it says |
| --- | --- | --- |
| **Ink on paper** | Captions, cards, chips, controls | “This is something to read or to press.” Paper objects sit on an offset ink shadow; pressed, they go down onto it; lifted, they rise off it |
| **Caption boxes** | The phase caption, room names | Narration: where and when. Always live text |
| **Halftone** | Shading in illustrations; the far corner of a strip or of an empty panel | Depth and age. Never behind a name or a status word |
| **Hatch** | The pending band on a card; the frame of a stale view | “Waiting.” It does not move |

A status word is a small box whose outline changes with the status: solid ink, plain, double, dashed. Registered is the one that becomes a stamp, turned four degrees in a doubled outline. Two pairs of statuses share an outline, targeting with confirming and submitting with checking; their words and the card around them differ.

## 5. States

The brief asks for eight states. This is where each is drawn; every component and every state, with its source and its words, is in [component-states.md](component-states.md).

| State | Drawn as | From |
| --- | --- | --- |
| Idle | The card on its shadow, status in a solid ink box. With a control on the seat's own turn; with one line of reason and no control on another seat's | `self.shotAvailable`, a current view, `activeSeatId` |
| Selection | The card lifted, with the focus-colored outline | Local: the player picked it up |
| Targeting | Target rows: token, name, public status in words | Local, over the seats offered ([DSN-D03](README.md#open-decisions)) |
| Pending | A hatched band across the top of the lifted card | The command is on its way, or its receipt is being asked for |
| Registered | The status word as a stamp; the pip dotted; “This is not a result.” As a report with a Done control, and at rest without one | An accepted receipt, or the command in `ownPendingCommandIds` |
| Unavailable | Flat: duller paper, dashed edge, no shadow, and no reason | `self.shotAvailable` is false, or a rejection |
| Spent | **Not drawable from protocol 1.** The nearest authorized state is flat with a dashed stamp: “Was registered. It is no longer waiting to be resolved.” | This device saw its own registration leave the pending list; it lasts until Done ([DSN-D02](README.md#open-decisions)) |
| Reconnect | Tape banner, hatched frame, dashed countdown, paused notice, no control on the card | The client's own connection status |

![Shot action card, every status](../../design/review/states-shot-card.png)

![Token, markers and resource pips](../../design/review/states-token-markers.png)

The ten statuses in the first sheet are the ones Frontend's command flow produces, and the three pictures of “Available” are the three things its idle step can say. The design gives each a look; it adds none and removes none.

Three finished pictures are drawn by no state: a ring for a seat that may be chosen, a ring for a chosen seat, and a struck-out pip. Each would claim a fact the views do not carry.

## 6. Motion

Five cues are authorized by the contracts, one for each kind the event director issues, and one more is local feedback for picking a card up. Each is a short accent and a clean settle, lasts exactly its existing token duration, has a reduced-motion and a reduced-effects alternative, and works without art. Storyboards and timings are in [motion-storyboards.md](motion-storyboards.md).

The one that most needed designing is the public move. On a spatial board a slide from one room to another draws a route. Here the token drops into its new panel from straight above, and the place it left is simply drawn without it.

The motion direction also names a “public resolved shot” and a “disclosed blocked outcome”. No approved fact exists for either. They are drawn as synthetic studies, kept apart from every cue and every asset, and described at the end of the storyboards.

## 7. Design tokens 0.3.0

`packages/design-tokens/src/tokens-0.3.0.json`, exported as `nextDesignTokens` beside the unchanged `proposedDesignTokens`.

**It only adds.** Every 0.2.0 key keeps its name, shape and value, so the fields Frontend's shell reads are all still there and a consumer can switch exports without a change. A test and a check hold that. It is still a proposal for evaluation, and it does not replace the pinned 0.2.0 file: that needs a reviewed lock update ([integration-requests.md](integration-requests.md#dsn-req-2)).

| Added | For |
| --- | --- |
| `color.paperShade`, `color.paperDeep` | Target rows; flat and not-active surfaces |
| `color.steel.*` (five steps) | The one public palette of every location; plain panels; offset shadows on dark ground |
| `type.lettering*`, `type.privateRoleNameMaxPx`, `type.tableTimerPx`, `type.tableHeadingPx` | Comic lettering from the system stack; the cap on a role name; the table display's sizes |
| `radiusPx.card`, `strokePx.inkFine`, `inkBold`, `panelBorder`, `selection` | Card, panel and selection outlines; the heavier edge of a primary control |
| `motionEasing.*` | Named curves: `impact`, `settle`, `snap`, `sweep`, `standard`, `linear` |
| `motionBeatsMs.*` | Each duration a cue uses, split into opening, accent and settle. The totals are unchanged. `publicImpact` is deliberately not split: only the studies use it |
| `comic.*` | Shadow offsets, selection lift, gutter, stamp turn, halftone and hatch geometry |
| `component.*`, `layer.*` | Token, marker, dock, roster and pip sizes; stacking order |
| `interaction.breakpointsCssPx.tableRosterBesideBoard` | 1280: where the roster fits beside the board. `wideTableLayout` stays 960 |
| `privacyPolicy`, `audioPolicy`, more `motionPolicy` flags and `usageConstraints` | The rules of [section 2](#2-what-may-be-shown-where) as values a test can read |

Contrast is computed from these values for the pairs the design uses: every text pair reaches 4.5:1 and every essential mark 3:1. Amber and the focus ring do not reach 3:1 on paper, which is why a focused control on paper gets an ink ring with the focus color around it, and why a primary control has a heavier ink edge as well as amber. Those are computed numbers, not measurements of the final compositing.

## 8. Assets and how they are loaded

What exists, with sizes, anchors, hashes, surfaces and rights, is in [asset-inventory.md](asset-inventory.md) and `design/exports/asset-manifest.json`.

![Room A vignette, anchors and layers](../../design/review/asset-board-room-a.png)

- Editable sources are layered SVG, drawn by hand, under `design/source/`. The build accepts ten kinds of element and a short list of attributes and refuses everything else, so no text, title, raster image, filter, style, link or outside reference can be in one.
- Exports are lifted out by `design/tools/build-exports.mjs` and named `<id>.<variant>.<hash>.svg`. A changed file is a new name.
- Each variant lists the surfaces it may be drawn on: the table, a phone's public layer, the inside of an open private sheet.
- Proposed scene convention for the Three.js evaluation, unmeasured: +Y up, floor on X/Z, a token's origin at its floor contact. The Room A layers carry a stack order and a starting depth each.

**A bundle is one stylesheet.** `public-board`, `player-ui` and `roles` each export one stylesheet in which every picture of the bundle is a custom property holding the picture itself. A phone loads all three before its first match view; the table loads the first. After that nothing is fetched, whatever is drawn. This matters because the alternative leaks: a stylesheet that names a picture by address makes the browser fetch it the first time a rule needs it, so a phone would ask for the “shot available” pip only if that seat had a shot, and for the Officer's picture only if that player were the Officer. Anyone who can see requests could read both.

**Art is drawn only once it has arrived.** Every rule that draws a picture is behind `[data-art~="<bundle>"]`, which the client sets on an ancestor of the shell after that bundle's stylesheet has loaded. Until then, and for good if it fails, the shell is the complete skin of [section 3.6](#36-connection-lost-and-no-art).

**Private pictures are addressed only inside the private sheet.** The role picture and the team swatch are two custom properties the client sets on the role card. No selector names a role.

The two synthetic studies are not assets. They have their own drawings, their own output directory and manifest, and one review page. [motion-storyboards.md](motion-storyboards.md#synthetic-studies) says what fences them and what the fence is worth.

## 9. Where this refines the art direction

The art direction is a proposal at 0.2 and is left as written. This contract differs from it in these places, for these reasons.

| Art direction 0.2 | This contract | Why |
| --- | --- | --- |
| “Scrollable actions; bottom action dock; separate private role drawer” | One private sheet holds the role and the actions; the bottom dock is its handle | Frontend found that in early rounds merely having an available action identifies a role to anyone who glimpses the screen. An always-visible action dock would do exactly that |
| Wide table layout from 960 CSS px | Roster beside the board from 1280; under it below | Below 1280 the roster's four columns do not fit beside the board without breaking words or shrinking the board |
| Breakpoints in CSS px | The same numbers, written in em | So a layout answers to the reader's text size |
| Token “origin at its floor contact” on a 3D board | The same, drawn now as a standee: a readable badge on a stand | A badge that faces the viewer keeps its numeral undistorted, in the DOM board and in a scene |
| Card hierarchy with a resource count | A pip that is solid or dotted, and no number | Protocol 1 says whether a shot is available, not how many, and not whether one is spent |
| “Blue, Red and Alien accents appear only in an authorized private view” | The Officer card uses the Blue accent in two small places, beside the words “Blue team” | A private card is still seen over a shoulder. The accent is kept small and never alone |
| Assets named by file | Assets held in one stylesheet per bundle | A file asked for by name is a fact an observer can read |

## 10. Not in this contract

The lobby and seating; host controls; voting and release; Standard Hack; the Code; role actions other than the shot; the final showdown; elimination and its faction reveal; the match result. Protocol 1 carries none of them. They are listed, with what each would be drawn from, in [asset-inventory.md](asset-inventory.md#not-produced), and each needs its own issue.

Also not here: any device measurement, any sound, any font file, and any decision that belongs to the game owner ([README.md](README.md#open-decisions)).
