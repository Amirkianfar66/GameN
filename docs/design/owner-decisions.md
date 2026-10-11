# Owner decisions recorded by Designer

What the game owner decided about look, feel and presentation while working with the Visual and Motion Designer, in the owner's own words, with what each decision covers and what it leaves open.

`AGENTS.md` puts the owner's latest explicit decisions recorded in the repository first among the rule sources. This page is where Designer records the ones it was given. It does not replace the decision register, [docs/decisions.md](../decisions.md), which is Codex's and is source-locked. Designer has not edited it: [DSN-REQ-7](integration-requests.md#dsn-req-7) asks for a newer decision record that points here.

The owner's messages are quoted as written.

## 11 October 2026: the current look, in the game, before any paint

**A direction, recorded: the look is to be judged in the game, and nothing is painted for now.** Shown the painted draft of Room B beside the comic look (below), with the Designer's suggestion of a mix (painted light on the rooms, inked figures), the owner answered on 11 October 2026:

> dont go with mix lets try whiteout paint the current  in game then i will judge , lets go with reviewer

The owner sent this after interrupting a first wording that read “lets try this in game”.

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | “dont go with mix” | No mix: the suggestion of painted light on the rooms with inked figures is not taken |
| 2 | “lets try whiteout paint the current in game” | Read as “without paint”: the current look is tried in the game. That is the board-motion prototype's scenes, full-body figures, gestures and animations, in the comic look, unpainted. The painted draft stays an exploration |
| 3 | “then i will judge” | The owner judges the look in the game. This is a trial, not the look's final approval: DSN-D34 stays open until then |
| 4 | “lets go with reviewer” | The Designer PR, #88, goes to review |

### What happens now

- **PR #88 is ready for review.**
- **Putting the look in the game is Integration's and Frontend's work** ([DSN-REQ-13](integration-requests.md#dsn-req-13), issue [#97](https://github.com/Amirkianfar66/GameN/issues/97)). It needs the scene layers and the figures brought into a build (DSN-D30, DSN-D32). The runtime then draws the 21 places, the move with its walk, the hit and FULL on a room's tag. The hit is a proposal against the reviewed motion contract (DSN-D35). Today's staging release (#95) draws the approved standees on the reviewed rooms. The Designer changes nothing in `apps/game/`, the contracts or the runtime manifest.
- **The painted draft** ([design/explorations/painted-room/](../../design/explorations/painted-room/README.md)) is kept as evidence and is not developed further.

### What it does not settle

- **The final look (DSN-D34).** It is decided after the owner has judged the current look in the game.
- **Whether the trial shows the hit (DSN-D35).** The owner asked for it on 9 October; the reviewed motion contract has no impact for a health change. Integration and Frontend decide with the owner how the trial carries it.
- **The capacity.** It is enforced only when Backend's issue [#96](https://github.com/Amirkianfar66/GameN/issues/96) lands. Until then the trial draws FULL from public occupancy.

## 11 October 2026: one room repainted, as a draft test

**A request, answered with a draft; nothing is decided by it.** After the scenes were drawn, the owner asked the Designer session on 11 October 2026:

> lets repaint just 1 art work as a draft test to compare. it can be just 1 room test

| # | What it says | What it asks for |
| --- | --- | --- |
| 1 | “repaint just 1 art work as a draft test to compare” | One scene drawn again in a painted look, beside the look the board draws today, so the owner can compare the two. It answers the question left open on 9 October (below): is the procedural vector look enough for “like AAA … animation art work”, or should the scenes be repainted (DSN-D34)? |
| 2 | “it can be just 1 room test” | One room only: Room B, the laboratory, with all five of its places taken |

### What was made

- **[design/explorations/painted-room/](../../design/explorations/painted-room/README.md)**: Room B from the same scene, the same five places and the same figures, twice: as the board-motion prototype draws it (flat color, ink outline, halftone), and repainted by code in a painted, lit look (gradients for flat color, thin soft edges for ink, lamplight and shadow, glow from the screen and a teal specimen tank, rim light on the figures, a reflection in the deck, brushwork and grain). Review pictures: side by side, the painted room alone, a detail, and both in a phone panel's framing.
- **It is a code stand-in, not a painting.** Nothing is painted by hand and no image is generated: the comic drawing is put through gradients, blend modes and filters in the browser. An illustrator's repaint would go further.
- **It cannot be an asset as it is.** The drawing vocabulary of design sources has no gradients, filters or blend modes. A painted look would need that vocabulary widened for scene art, with a drawing budget for phones (Integration), or painted raster art with its rights recorded (DSN-D06).

### What it does not settle

- **Which look.** The comic look stays the board's until the owner chooses (DSN-D34). In the phone framing, the painted draft's glow and rim light draw the eye; its figures are softer against the lit deck than the comic's inked ones. Nothing was measured, on a device or otherwise.
- **The owner answered the same day:** no mix and no paint for now; the current look is to be tried in the game first (above).

## 11 October 2026: five a room is a hard rule

**A rule decision, recorded, with its six cases; not yet a rule of the engine.** Asked by the Designer session whether the room capacity of five (9 October, below) should be a hard rule, the owner answered on 11 October 2026:

> yes enforce 5 as a hard rule

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | “yes enforce 5 as a hard rule” | At most five players are in Room A, Room B, the Hospital and the Jail at any time; the Command Room holds its one, the Captain. A move into a full room is refused, not drawn as a crowd. It supersedes the sentence of `rules/overlays/location-board-layout-v1.json` that keeps token areas unnumbered to avoid “an artificial room-capacity rule”, for the rooms (owner decisions come first among the rule sources, `AGENTS.md`). The Final Zone of the showdown is not one of the rooms and holds everyone left |

### The six cases, decided

The owner's first answer was the rule. Asked how it applies in six cases, with the Designer's recommendation for each, the owner answered the same day:

> yes go with your recommendations for all six

So the rule is, for Backend to implement ([DSN-REQ-12](integration-requests.md#dsn-req-12), issue [#96](https://github.com/Amirkianfar66/GameN/issues/96)) and Game Balance to audit:

| Case | Decided | Why it was recommended |
| --- | --- | --- |
| A move into a full room | Not offered, and refused by the server if sent. The room's tag says FULL on every screen | Occupancy is public, so every phone can show it before anyone presses |
| Do the Eliminated count? | Yes: an Eliminated character keeps its place | The board never draws more than five, and nine players never fill Room A and Room B together (ten places) |
| A sixth Injured player at the end of a round, the Hospital full | It stays Injured where it is and goes at the next end of round with a free place | Keeps the rule hard; it needs six Injured at once, which is rare |
| The Jail | Five, never exceeded: at most one player is jailed a round, and a match has five rounds | Balance confirms it from the vote rules |
| Starting rooms | Random, but at most five a room (nine players: five and four) | An independent coin flip for each of nine players puts six or more in one room about half the time |
| Returning to “the last room” (healed, released, a Captain who loses the title) when it is full | The other of Room A and Room B, which always has a place | Nine players hold at most eight others; the two rooms have ten places |

### What the design does now

- **The board.** A room's tag says FULL while five are there (the Eliminated among them), on every screen, from public occupancy only: Room A and Room B, where pressing a full room says the release's words, “You cannot move to that room right now.”; and the Hospital and the Jail, so that the table sees why an Injured character waits where it is. The prototype's fixtures never offer a full room, and its check refuses one that does.
- **Until the engine enforces it,** a view carrying six or more in one room is still drawn, as a crowd in which everyone can be pressed: the board must not break on a view the server sends. Those fixtures are labeled beyond the capacity rule.
- **Not changed by the Designer:** the engine, the rules overlays, the contracts and the server's starting rooms (issue #83) are Backend's; Game Balance audits the effect on play.

## 9 October 2026: five places a room, each a scene

**A direction, recorded; the scenes, places and animations drawn for it are a proposal. The capacity it states is not a rule until the rules say so.** Working with the Designer session on 9 October 2026, after the full-body figures below, the owner wrote, with the same reference page:

> I like the idea of gesture but lets say the maximum capacity of each room is 5 . each room should have 5 fix position  like 5 unique gesture, plus some extra gesture related to got shot or walking to other room. and each room should be like AAA game or animation art work similar to AAA Animation .like a scene.each gesture should also have 2 animation one for moving to the other room , and other is if got shot. so overall we have Control room with 1 gesture ,  2 other room a and b each 5 and hospital and jail also each 5 so 21 overall room and some additional for got shot , injured , Dead , moving

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | “I like the idea of gesture” | Characters keep the full-body figures of the pilot, each in a gesture of its own rather than a stance |
| 2 | “lets say the maximum capacity of each room is 5” | Each room is drawn for five. **Recorded as the owner's statement of a capacity; not enforced**: the rules have no room capacity, and only a rule change (Backend's engine, with Balance) can refuse a sixth player. Until then six to nine in one room still stand there, in the crowd (layout stress). What a capacity would decide is DSN-D27 |
| 3 | “each room should have 5 fix position like 5 unique gesture” and “Control room with 1 gesture” | Five fixed places a room, each with a gesture no other place has; the Command Room one, the Captain's at the chart table: C1; A1 to A5; B1 to B5; H1 to H5; J1 to J5. A character keeps its place while it stays |
| 4 | “21 overall room” | Read as 21 places (1 + 5 + 5 + 5 + 5), not 21 rooms: the rules' five locations are unchanged |
| 5 | “each room should be like AAA game or animation art work … like a scene” | Each room is a scene: the approved room around a new deck, the props of its five places and its light, a figure at every place drawn in front of or behind the room's furniture by depth |
| 6 | “each gesture should also have 2 animation one for moving to the other room, and other is if got shot” | Every gesture has both: getting up, a walk and settling into the new place (a public move), and a hit (a public health change) |
| 7 | “some additional for got shot, injured, Dead, moving” | Extra gestures and animations: the jolt of a hit and its burst; Injured, a flinch and a bandage (and a limp when it walks); Eliminated, the place's fall (slumped over the desk or the bench, still where it sits or lies, or down on the deck); the walk |

### What the board-motion prototype now draws

- **21 places** in five scenes (`design/board-motion/scenes/`), each place with its own gesture: in Room A at the workstation, thinking, crouched at the hatch with a wrench, leaning on the crates, at the junction box; in Room B with a tablet, a laptop on the knees, at the specimen tank, leaning on the bench, at the microscope; in the Hospital sitting up in a bed, lying in the other, in the wheelchair, at the IV pole, on the bench; in the Jail hunched on the bench, at the door, against the wall, on the deck, on the cot; the Captain at the chart table. They are listed with what each shows in [board-motion-coverage.md](board-motion-coverage.md#rooms-places-and-gestures).
- **Who takes which place** from public facts only, the same on every screen: the Captain the chart table; elsewhere a character keeps its place while it stays, and a newcomer takes the first free place in its own order by seat number.
- **The two animations** for every gesture, generated from the gesture by the rig, so a new gesture has them at once: a move (`cue-public-move`, 900 ms) and a hit (`cue-public-hit`, a proposal: a burst and a jolt, then a flinch and a bandage, or the place's fall).
- **Every press area** stays the place's, whole and apart, measured at 320 to 430 px; an Eliminated character keeps its place's press area.

### What it does not settle

- **The capacity.** Five is drawn, not enforced (DSN-D27). *On 11 October 2026 the owner made it a hard rule (above); enforcing it is Backend's.* Enforcing it would need the rules to say what a move into a full room does, whether the Eliminated count, where a sixth Injured player goes at the end of a round when the Hospital is full, whether the Jail has one, and how the server-random starting rooms respect it.
- **“If got shot.”** A public view says only that a health changed: never that a shot was fired, by whom, with what or from where, and a Disable and a showdown shot also deal damage. The prototype draws one hit for every cause, from no direction. The reviewed motion contract has “a health change is a status change with no impact” and allows a burst only when the attack type is public: drawing the hit is the owner's look against that rule, and drawing a shot as a shot would need a public shot fact (DSN-D35).
- **“Like AAA … animation art work.”** The scenes and figures are vector drawing made procedurally in this repository from the approved rooms and standees, with a cel shadow, halftone and ink: not painted illustration or keyframed animation. They fix the composition (places, depths, layers, gestures, timings) an illustrator or animator could repaint and re-time; a painted look would need raster art and the owner's decision on rights (DSN-D06, DSN-D34).
- **Motion while nothing happens.** No gesture idles or breathes: the pinned tokens say `loops: false` (DSN-D16). An idle loop for each place is possible as an option, if the owner decides it.
- **The reviewed kit and the runtime** are unchanged; adoption is Integration's and Frontend's (DSN-D30, DSN-D32).
- **The owner has not looked at the prototype with the scenes.**

## 9 October 2026: full-body comic characters

**A direction, recorded; the figures drawn for it are a proposal.** Working with the Designer session on 9 October 2026, the owner asked, with the same reference page as on 8 October:

> is it possible to make character in game like this image something more feel comicbook?

The Designer answered with a pilot, [design/explorations/comic-figures/](../../design/explorations/comic-figures/README.md) (its review pictures are kept there; its page and scripts are in git from commit `c005c35`): the nine characters as full-body comic figures posed in the rooms. It asked whether to roll them out on the board, or to look for a painted style instead. The owner answered:

> lets try full body comic

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | “make character in game like this image something more feel comicbook” | The characters are drawn as full-body comic figures, people in real positions in the rooms, instead of the bust standees on the board |
| 2 | “lets try full body comic” | The full-body vector route the Designer proposed, not a painted one. It is tried on the board-motion prototype: every piece there is now a posed figure, and the figures are a proposal asset set (`board-motion-0.2.0`) |

### What the board-motion prototype now draws

- The same nine people as the approved standees, full body, in their own colors (design tokens 0.4.0) and the same crew suit, with nothing of a role or a team on anyone. They are drawn by one rig in `design/board-motion/figures/`, so a pose is drawn once for everyone.
- A pose from public facts only. The Captain leans over the chart table. The first Injured character in the Hospital sits up in the bed, bandaged. A Jailed character alone or with one other sits on the bench. The first in Room B works at the counter. Everyone else stands in one of three stances, chosen by seat number, facing into the room. An Eliminated character sits on the floor, greyed. A move is a walk.
- The same press areas, rings, plates, markers and cues as before, measured again at 320 to 430 px.

### What it does not settle

- **The reviewed kit and the runtime.** The approved standees of 7 October stay in `design/source/crew/`, in the exports `design-0.2.0` and in the runtime, and the bust card stays the private role card's picture. Bringing the figures into an export revision is Integration's step, and drawing them in the game is Frontend's (DSN-D32).
- **The crew catalog's rule.** It says a character never changes with health, Jail, the Captain or anything private, and that those are markers on the piece. The figures never change the character (face, skin, hair, colors, suit); they change the pose, and only with public facts. Whether a pose may say what a marker says is DSN-D33.
- **Motion while nothing happens.** The pilot's breathing stays out of the prototype (DSN-D16).
- **A painted look** like the reference's is not chosen. It would need raster art and the owner's decision on rights (DSN-D06).
- **The owner has not looked at the prototype with the figures.**

## 8 October 2026: the board as the game

**A request, recorded; the design drawn for it is not approved.** Issue [#87](https://github.com/Amirkianfar66/GameN/issues/87), opened from the owner's account on 8 October 2026, records the owner's request:

> The game owner requested that every action targeting another player happen on the comic game board: select an action, then tap the player's character in its room. Separate player-picker tabs interrupt the feeling of playing a board game. The owner also requested interactive feedback and motion for all nine characters, all actions and all movement. Phones remain the V1 priority, with a clean screen, top status/timer bar, bottom navigation and no page scrolling in the normal game view.

The same day, starting this work, the owner wrote to the Designer session, with a reference image:

> I want the feeling characters like a comic book inside a room in different real position like a comic book each room maximum 5 player capacity but I want it like interactive .same as image ref i attached here

The reference is not committed. In words: one comic page; COMMAND ROOM across the top, subtitled CAPTAIN in yellow, a figure leaning over a round chart table; ROOM A (ENGINEERING, blue) and ROOM B (LABORATORY, violet) side by side; HOSPITAL (a cross) and JAIL (a padlock) at the bottom; a corridor between the columns drawn with lights and arrows; people standing, at consoles, in a bed, on a bench, with small tags A1, B1, H1, J1; a footer reading MOTHERSHIP PEOPLE · SECRETS · SURVIVAL / SAME SHIP DIFFERENT TRUTHS.

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | “every action targeting another player happen on the comic game board: select an action, then tap the player's character in its room” | The board is where a turn is played: Actions opens a compact tray, the eligible characters become pressable on the same board, the choice is confirmed in a strip above navigation. No separate picker |
| 2 | “interactive feedback and motion for all nine characters, all actions and all movement” | Every character has the same full set of interaction states, and its own public flourish when it moves |
| 3 | “Phones remain the V1 priority, with a clean screen, top status/timer bar, bottom navigation and no page scrolling” | Designed and measured at 320 x 568 to 430 x 932 with no page scroll |
| 4 | “characters like a comic book inside a room in different real position” | Characters stand at hand-placed places in each room, as figures in a comic panel: behind the chart table, at the laboratory counter, in the Hospital bed, on the floor; not in a row of tokens |
| 5 | “each room maximum 5 player capacity” | Each room is drawn for one to five. **Read as a drawing instruction, not a rule**: the rules have no room capacity, so six to nine in one room still stand there, in a crowd formation, everyone reachable. Whether five becomes a rule is DSN-D27 |
| 6 | “same as image ref i attached here” | The page of the reference: the five rooms in its order, its slanted captions, its subtitles (DSN-D29). Its corridor arrows are not drawn: the rules give no adjacency (DSN-D28) |

### What it does not settle

- **The design.** The prototype (`design/board-motion/`) and its handoff ([board-motion-handoff.md](board-motion-handoff.md)) are a Designer proposal. **The owner has not looked at it**, and nothing here marks it approved. Issue #87 says it plainly: new artwork and motion treatments still require review.
- **Rules and contracts.** None changed: the ruleset `in-person-v1-pass-2026-10-08`, the room-tag movement and the server-random starting rooms stay as they are. A room capacity would be a rule change (DSN-D27).
- **The questions it raises**, DSN-D27 to DSN-D31 in [README.md](README.md#open-decisions), are open.

## 8 October 2026: phones first for V1

**A priority, recorded; the layouts drawn for it are not approved.** Issue [#76](https://github.com/Amirkianfar66/GameN/issues/76), opened from the owner's account on 8 October 2026, records the owner's request:

> The owner requested, on 8 October 2026: host screen, player joining screen, character selection, role reveal and the main game screen, plus identification of missing screens. **Phones are the V1 priority; desktop follows the same responsive design for now.**

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | “host screen, player joining screen, character selection, role reveal and the main game screen” | Five priority screens, in that order. The fifth is read as gameplay after setup |
| 2 | “plus identification of missing screens” | The supporting states are part of the work: [v1-phone-inventory.md](v1-phone-inventory.md) lists every one with its data source |
| 3 | “Phones are the V1 priority” | Every screen is designed at a phone's width first (390 CSS px, checked at 320 to 430) |
| 4 | “desktop follows the same responsive design for now” | No separate desktop programme: the same hierarchy at comfortable widths |

### What it does not settle

- **The new layouts.** The journey drawn for it ([v1-phone-journey.md](v1-phone-journey.md), prototype `design/v1-phone/`) is a Designer proposal. **The owner has not looked at it**, and nothing here marks it approved.
- **Rules and contracts.** None changed. The 30-second selection, the 30-second minimum reading, every human's Ready and the fresh 60-second first turn are the owner's earlier decisions ([2026-10-07-staged-start.md](../decisions/2026-10-07-staged-start.md)), kept as they are.
- **The comic look.** Unchanged from 7 October; the journey uses the approved rooms, characters and devices as they are.
- **The questions the journey raises**, DSN-D20 to DSN-D26 in [README.md](README.md#open-decisions), are open.



**Approved by the game owner.** After looking at the working page in the session, the owner wrote: "then lets share what you achieve with reviewer, but also ,add note this design is approve by the owner (me)".

What was looked at and approved is [design/explorations/comic-board/](../../design/explorations/comic-board/README.md), as it is in the commit that adds this page (`4fa2ff3`, PR #57): the board as a page of a comic book, rooms printed in color, nine crew characters as the playing pieces with the seat number and the player's name, a move played as a short piece of motion, and the role as a private card on which a device is added to the player's own character.

### The decisions, in the order they were given

| # | The owner's words | What it decides |
| --- | --- | --- |
| 1 | "I want a motion graphic and fill user animation style even if it is more feeling like a card board game but to combine 2 feelings together and it is isnide a comic book ,user can select that room and move to that room , the image I send you is a reference" | The direction: animated, with the feel of a card and board game, inside a comic book. A player selects a room on the board and moves to it. The reference was a page of five rooms, each in one strong color, with slanted yellow captions |
| 2 | "I really like a animation and motion graphic of numbers but now instead of putting numbers as characters lets create characters , the character in rooms not reveal its role but the character and name of player . the character should match with room style and board game style , we can have 9 characters to choose, this not related to role," | The move animation is liked. The playing pieces are characters, not numbered tokens: nine to choose from, in the style of the rooms and of a board game, shown with the player's name. A character has nothing to do with a role and must not reveal one |
| 3 | "Name and number is correct" | A piece's tag carries both the seat number and the player's name |
| 4 | "for now I consider for V1 maximum 9 player" | Version 1 has at most nine players. Nine characters, one each, is enough for it |
| 5 | "after user select character the game , then the role card assigned randomly so user get a role card also . role card graphically is a device added to person animation but visible for that person alone" | The order: a player selects a character, then a role card is dealt at random. A role is shown as a device added to that player's own character, animated, and visible to that player alone |
| 6 | "The portrait of a separate officer in a cap no longer fits this direction .nobody should see other player devices , so it is fine, the device is your private card and board game environment" | The earlier idea of a separate person on each role card is dropped; the Officer portrait drawn for it was never committed and has been taken out. The device stays inside the player's own private card. Nobody sees another player's device |

### What the approval covers

- The look and the feel shown: the comic page, the rooms in the reference's colors, the captions, the character pieces and their tags, the hand of cards, the motion of a move and of the role card being turned up.
- Decisions 3 to 6 above, which the owner gave as answers to questions put to them.

### What it does not settle

The approval is of a design. It changes no rule, no contract and no adopted asset by itself.

- **Rules.** None was changed or reinterpreted. Movement in the page follows the confirmed movement decision and the server's own list of destinations.
- **Contracts.** A player's name and chosen character are not in any contract. Adding them, and the lobby step that sets them, is Codex's and Frontend's ([DSN-REQ-6](integration-requests.md#dsn-req-6)).
- **Adoption.** The page was an exploration when it was approved. What has been adopted since, and what has not, is [below](#adopted-since-and-what-the-owner-has-not-seen).
- **Room names.** The owner's reference names the rooms Medical Room, Lockdown Room, Laboratory and Crew Meeting Room. The approved page uses the rules' names, and the owner said nothing about renaming. They stay Hospital, Jail, Room A and Room B unless the owner decides otherwise.
- **Wording.** The call signs of the nine characters, the words the page adds, and the lines on the nine role cards are proposals.
- **Devices and people.** Whether a phone, a shared display, or people at a table read any of it as intended has not been tried.

### Cautions the Designer keeps on record

The first was put to the owner twice before the approval, and the look was approved as shown. The second is the Designer's own. They are recorded so that a reviewer and Game Balance can weigh them; neither reopens the decision.

- The approved room colors include a red, a blue and a violet room. Those are also the Red team's, the Blue team's and the Alien's colors, and [art-direction.md](art-direction.md) rules faction-coded location lighting out of the public board. A second set of room colors that avoids those three hues is in the page.
- A private card is still seen over a shoulder. The role device is large and carries the team color; it is behind a deliberate turn of the card.

### Adopted since, and what the owner has not seen

On 7 October 2026, after the review of that date, Designer brought the approved page into the design system: the drawings as sources, the colors as tokens, the exports, the contract and the reference stylesheets. **The owner has not looked at the result.** It is recorded here so that what was approved and what was built from it can be told apart.

Unchanged from what was approved:

- The four new room drawings, the nine characters and the nine devices. Each source is the approved drawing byte for byte, apart from its header comment and, in the Command Room, the names of its layers.
- The five color families of the rooms, the caption yellow and its slant, the characters' colors: the same values, now tokens.
- The tag under a piece: seat number, then name. Pieces in one row, every second tag a line lower where a room is crowded.
- The move: 900 ms, 450 ms in the air, started by the public fact.
- A role as a device on the player's own character, seen only by that player.

Designer's own choices in bringing it over, which the owner may want to see:

| Choice | Why | Open as |
| --- | --- | --- |
| On a phone the role card's picture is a thumbnail inside the private sheet, and large only when “About this role” is opened. The approved page showed a large card whenever the card was turned up | Today's private sheet holds the role and the actions together. A large card would push the actions off the screen, and would put a device in its team's color on screen every time the sheet is opened | [DSN-D19](README.md#open-decisions) |
| The comic page is on the shared display only. A phone keeps its list of rooms, with each room's strip, caption and color | A phone's page with rooms to press needs the movement markup of protocol 2, and a way to read it at large text | [DSN-D18](README.md#open-decisions) |
| Nothing moves while nothing happens | The pinned tokens say `loops: false` | [DSN-D16](README.md#open-decisions) |
| A dealt card landing in a hand, and a room coming up when it is picked, are not built | Today's markup has neither a hand nor a room that can be pressed | With DSN-D18 |
| The lines on the nine role cards | The approved page had lines for the Officer only | [DSN-D17](README.md#open-decisions) |

And two things Designer measured after the approval, which do not change it:

- The pink of one character is the nearest of the nine to the Red team's accent, and the Command Room's gold and the yellow of one character are near the amber that means “press this” and “active turn”. The numbers are in the tokens (`measuredColorDistances`) and in [visual-interaction-contract.md](visual-interaction-contract.md#7-design-tokens-040).
- An earlier note said the characters' colors are “kept away from blue, red and violet”. None of them is blue, red or violet. “Kept away” claimed more than was measured, and the sources now say what was measured instead.

## Earlier decisions this page relies on

Recorded elsewhere, not by Designer: the in-person V1 priority ([#9](https://github.com/Amirkianfar66/GameN/issues/9)); the request for expressive comic motion graphics of 26 September 2026 ([motion-direction.md](motion-direction.md)); the confirmed movement decision and the approved V1 decisions V1-01 to V1-21, which are on `codex/v1-connected-merge-candidate` and not yet in this branch's base.
