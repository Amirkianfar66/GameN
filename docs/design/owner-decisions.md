# Owner decisions recorded by Designer

What the game owner decided about look, feel and presentation while working with the Visual and Motion Designer, in the owner's own words, with what each decision covers and what it leaves open.

`AGENTS.md` puts the owner's latest explicit decisions recorded in the repository first among the rule sources. This page is where Designer records the ones it was given. It does not replace the decision register, [docs/decisions.md](../decisions.md), which is Codex's and is source-locked. Designer has not edited it: [DSN-REQ-7](integration-requests.md#dsn-req-7) asks for a newer decision record that points here.

The owner's messages are quoted as written.

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
