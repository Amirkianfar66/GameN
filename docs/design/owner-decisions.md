# Owner decisions recorded by Designer

What the game owner decided about look, feel and presentation while working with the Visual and Motion Designer, in the owner's own words, with what each decision covers and what it leaves open.

`AGENTS.md` puts the owner's latest explicit decisions recorded in the repository first among the rule sources. This page is where Designer records the ones it was given. It does not replace the decision register, [docs/decisions.md](../decisions.md), which is Codex's: [DSN-REQ-7](integration-requests.md#dsn-req-7) asks for these to be entered there.

The owner's messages are quoted as written.

## 7 October 2026: the comic-board direction

**Approved by the game owner.** After looking at the working page in the session, the owner wrote: "then lets share what you achieve with reviewer, but also ,add note this design is approve by the owner (me)".

What was looked at and approved is [design/explorations/comic-board/](../../design/explorations/comic-board/README.md), as it is in the commit that adds this page: the board as a page of a comic book, rooms printed in color, nine crew characters as the playing pieces with the seat number and the player's name, a move played as a short piece of motion, and the role as a private card on which a device is added to the player's own character.

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
- **Adoption.** The page is an exploration. Tokens, sources, recipes, the manifest, the contract files and the reference stylesheets still describe the design of PR #45; [the list of what adopting it takes](../../design/explorations/comic-board/README.md#what-adopting-it-takes) is work to come, each part reviewed on its own.
- **Room names.** The owner's reference names the rooms Medical Room, Lockdown Room, Laboratory and Crew Meeting Room. The approved page uses the rules' names, and the owner said nothing about renaming. They stay Hospital, Jail, Room A and Room B unless the owner decides otherwise.
- **Wording.** The call signs of the nine characters, the words the page adds, and the copy the eight other role cards still lack are proposals.
- **Devices and people.** Whether a phone, a shared display, or people at a table read any of it as intended has not been tried.

### Cautions the Designer keeps on record

The first was put to the owner twice before the approval, and the look was approved as shown. The second is the Designer's own. They are recorded so that a reviewer and Game Balance can weigh them; neither reopens the decision.

- The approved room colors include a red, a blue and a violet room. Those are also the Red team's, the Blue team's and the Alien's colors, and [art-direction.md](art-direction.md) rules faction-coded location lighting out of the public board. A second set of room colors that avoids those three hues is in the page.
- A private card is still seen over a shoulder. The role device is large and carries the team color; it is behind a deliberate turn of the card.

## Earlier decisions this page relies on

Recorded elsewhere, not by Designer: the in-person V1 priority ([#9](https://github.com/Amirkianfar66/GameN/issues/9)); the request for expressive comic motion graphics of 26 September 2026 ([motion-direction.md](motion-direction.md)); the confirmed movement decision and the approved V1 decisions V1-01 to V1-21, which are on `codex/v1-connected-merge-candidate` and not yet in this branch's base.
