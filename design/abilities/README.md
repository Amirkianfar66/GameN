<!-- mothership:dev-only -->

# design/abilities/: ability art and motion

`mothership:dev-only` · `abilities-0.5.0` · **a proposal**

Original artwork and comic motion for every current V1 role ability and shared game action, delivered in focused slices on the board-motion phone prototype (`design/board-motion/`). The first slice is **the Insider's file**: a private investigation board for the Insider's starting knowledge. The inventory of all 24 treatments, delivered and planned, is generated into [docs/design/abilities-inventory.md](../../docs/design/abilities-inventory.md); Frontend's instructions are in [docs/design/abilities-handoff.md](../../docs/design/abilities-handoff.md).

Nothing here changes a rule, the protocol, a contract or the reviewed manifest `design-0.2.0`. The kit is art proposed for a later export revision, adopted only through Integration.

## The Insider's file

The Insider knows the unordered set of the three players who hold Undercover, Alien and Cracker (`knowledge.insiderCandidates`), and not who holds which. The file draws exactly that:

- **Three snapshots** of the players' own chosen crew cards, pinned on a string in **seat order** (a public order, whatever order the view lists them in), each with the same seat sticker, the name on the frame's margin and the same paper query tag.
- **The three role names as one set**: label tapes on one slip, in one envelope, stamped ONE EACH, below all three snapshots and beside none of them. The order of the names is fixed (Undercover, Alien, Cracker) and never changes with the candidates.
- **One string** pinned round the four corners of the whole set, and **Who is which: unknown.** under it.

Nothing ties a role name to a portrait: not a color, a position, a line, the order things move in, an accessible name or an asset. People are written by hand on paper; roles are label tapes. Pressing a snapshot lifts it from its pin and says that player's public facts (room, health, Captain, Jail), with Show on board and Back; it never adds evidence.

It is private: drawn only inside the seat's own open card, after gameplay starts, never on the board, the shared display or a host view, and not during the setup reading stage, whose preview carries no knowledge. Closed, there is no private word in the page. When the card cannot be shown (the view is out of date, the turn's time is up) pressing Card shows a closed folder, the same for every role.

## Slice 2: the Hacker and the Alien

- **The Hacker's file**: the known Undercover (`knowledge.undercoverSeatId`), one snapshot with the label UNDERCOVER on its frame, since that pairing is the Hacker's own knowledge, and the Code's mark struck out: not in the Code, which the rule gives the Hacker from the start (v2.1 `roles.Hacker.starting_knowledge`). Under it, every Scan result the view carries (`knowledge.scanResults`), in the view's order, as a torn printout: the player, the guess, and WRONG (nothing of the Code) or RIGHT with the Code's mark (in or not in the Code, never a position). A result that arrives later is printed once, the first time the card shows it.
- **The Scan in the strip**: the picked player's chip beside the question; a scanner line sweeps it only while the Scan is on its way; the receipt is the same neutral stamp as every action.
- **The Code attempt in the strip**: a punch card with four windows, the picks' chips filled in seat order whatever the picking order; on the board every pick wears the same check, never a number; registration punches the card once, and is not a result.
- **The Alien's file**: the Code's four players (`knowledge.code`) two by two, in seat order, one string round the four, the Code's tag on the string, the Alien's own snapshot marked YOU: "Four players, in no order."

## Slice 3: the Rescue, the Disable and the Supply

- **The Rescue**: in the Cracker's strip, the picked player's chip in a medical cross ring, and two vials, as many full as the view's count (`self.rescuesRemaining`). On the receipt a vial empties when the count falls (the use is reserved at acceptance, V1-15), never ahead of it, and the receipt says nothing of a recovery. A recovery is public: the board's health change at the end of the round, the same on every screen, naming no one. In the card, while one is left: the vials and "Rescues you have left: 1.", the release's sentence.
- **The Disable**: the picked player's chip in a charged reticle (sparks at its corners, never across the face) and the one charge cell, full while the Disable is offered and spent on its receipt. **The Blue and the Red Disabler see the same strip, part for part**: their identities stay in their own role cards, so a glance at a phone mid-Disable tells nobody which. The view keeps no lasting "spent" (DSN-REQ-15).
- **The Supply**: two shipping tags, each pick's chip in seat order, tied together on the receipt, which is not a delivery. After Round 3 the card shows **Supply results** (the release's heading): the Supplier's slip naming the players who received a weapon, and a recipient's slip that names no Supplier, each in the release's words, stamped DELIVERED when a weapon arrived. A slip drops in once, the first time the page shows it.

## Slice 4: the shot and Protection

- **The shot**: one strip for every seat that shoots, the Officer from Round 1 (nine players, one shot in the match), the Undercover, and anyone with a supplied weapon, an Alien included. The picked player's chip in a reticle; at the start of the detail line the rounds the seat holds (`self.ordinaryWeapons`). On the receipt the round used leaves the rack once the view's count falls, never ahead of it, and nothing says a hit: a hit is the public health change at the end of the round, from no direction. The strips of the Officer, the Undercover and an Alien are compared part for part. Every seat's card holds the release's sentence, "Ordinary weapons you hold: 1.", with its rounds.
- **Protection**: in the Undercover's strip the picked player's chip on a shield, the receipt not a grant. In the Undercover's card, once its view carries them (`knowledge.protections`, V1-17), a note per Protection in the release's words: the chip on a whole shield, "active from round 3."; or drawn whole before a shield split in two, "used up.", the shield shaking once as it splits. Whether that round has come is not worked out, as the release does not. Nobody else's phone shows any of it, and nothing public changes.
- **Open**: the view counts a weapon supplied after the Officer's one shot and says nothing of the shot being spent, so the card cannot show that weapon as one that cannot be used (DSN-REQ-15, extended).

## Slice 5: the ballots, the release request, a Hack and Pass

- **The ballots**: in the strip of a Captain election, its runoff or a Jail vote, a ballot box and the seat's own slip, the pick's chip ticked, or a blank slip for an abstention; a release vote's slip carries the jailed player, ticked for Yes or crossed for No. The receipt posts the slip into the box and is not a result. No count and nobody else's ballot is drawn on a phone: the count is the board's public tally (V1-10).
- **The Captain's release request**: the jailed player's chip in a key ring, small at the start of the detail line.
- **A Hack**: the request, the asked player's chip in a comms ring; while the server says two players are in one, each sees the same note, its own chip and the other's joined by a coiled cord, "Hack: you and Player 5." (the release's words). Nothing tells who asked, and nothing speaks of what either may say: that depends on a role.
- **Pass**: the speaking turn's microphone at the start of the strip, handed on once the server accepts Pass.

## What is here

| Path | What it is | Edit it? |
| --- | --- | --- |
| `source/dossier.svg` | The editable kit: cork, tape, pin, snapshot frame, query tag, lens, clip, stamp frame, envelope (back and front), closed folder. Each a layer, in the drawing vocabulary of `design/tools/lib/svg.mjs` and the neutral palette | **Yes. The editable source** |
| `source/intel.svg` | Slice 2's pieces: the printout, the portrait chip, the Code's mark (four holes, two by two) and the Code card | **Yes. The editable source** |
| `source/tools.svg` | Slice 3's pieces: a vial and an empty vial, the cross ring, a charge cell and a spent one, the sparks, a shipping tag, a slip (nine-sliced) | **Yes. The editable source** |
| `source/guard.svg` | Slice 4's pieces: the reticle, a shield and a shield used up (split), a round and a spent one | **Yes. The editable source** |
| `source/ballot.svg` | Slice 5's pieces: a ballot slip and its edge, a pencil tick and cross, a ballot box, the key ring, the comms ring, the coiled cord, a microphone and its outline | **Yes. The editable source** |
| `recipes.json` | How each asset is lifted out of its source: id, version, box, anchors, use; the neutral palette; the bundle's load policy; rights | Yes |
| `assets/` | One SVG per asset, `abilities.art.css` (every asset as a custom property `--ab-asset-<id>`) and `manifest.json` (ids, versions, boxes, anchors, sizes, hashes, colors) | No. Written by `design/tools/abilities-assets.mjs` |
| `js/dossier.js` | What every file shares (`snapshot()`, `fileShell()`, `makeInspectable()`, `assemble()`, `cancelMotion()`, `closedFolder()`) and the Insider's file (`insiderFile()`), the copy and the motion beats. Reference behaviour for Frontend | Yes |
| `js/intel.js` | Slice 2: `hackerFile()`, `printout()`, `printFresh()`, `alienFile()`, `codeCard()`, `scanTarget()`, and the strip's one-shot beats `clipIn()`, `punch()` | Yes |
| `js/tools.js` | Slice 3: `vials()`, `target()`, `cell()`, `supplyTags()`, `rescueKit()`, `deliveries()`, and the beats `drain()`, `discharge()`, `tie()`, `dropIn()` | Yes |
| `js/guard.js` | Slice 4: `rounds()`, `weaponsNote()`, `guardNotes()`, and the beats `spend()`, `crack()`; the shot's and Protection's targets use slice 3's `target()` | Yes |
| `js/ballot.js` | Slice 5: `ballotSlip()`, `ballotBox()`, `speakingTurn()`, `hackLink()`, and the beats `post()`, `connect()`, `handOn()`; the key and comms rings use slice 3's `target()` | Yes |
| `css/abilities.css` | The reference styles: tokens only; art drawn only behind `[data-art~="abilities"]` and the crew cards behind `[data-art~="public-board"]`; the short-phone and large-text layouts | Yes |
| `contract/abilities.json` | The inventory: every treatment's roles, audience, trigger, view fields, disclosure, concept, art, motion in five forms, states, copy, review and dependencies | Yes. `docs/design/abilities-inventory.md` follows |
| `contact.html` | The contact sheet of the review pictures | Yes |
| `review/` | Review pictures at 390 x 844 and 320 x 568, measured as they are taken, the assemblies frame by frame, `report.json`, `contact-insider.png` (slice 1), `contact-hacker-alien.png` (slice 2), `contact-rescue-disable-supply.png` (slice 3), `contact-shot-protection.png` (slice 4) and `contact-ballots-hack-pass.png` (slice 5) | No. Written by `design/tools/abilities-capture.mjs` |

## See it

```sh
npm run dev:review --workspace @mothership/design-tokens
# http://127.0.0.1:4320/board-motion/index.html?scenario=file.insider   the file (Card in the dock opens and closes it)
#   &names=long        twelve-character names
#   &motion=reduced    reduced motion
#   ?scenario=file.hidden, then Card: the closed folder while the view is out of date
#   ?scenario=file.hacker, file.hacker-start, scan.result      the Hacker's file
#   ?scenario=scan.faction, scan.sending, scan.fresh&scan=in   the Scan in the strip (scan.fresh: Actions, Scan, a player, a guess, then Card)
#   ?scenario=code.two, code.four, code.registered             the Code card
#   ?scenario=file.alien                                       the Alien's file
#   ?scenario=rescue.choose, rescue.confirm, rescue.registered, rescue.self, rescue.kit   the Rescue (then the panel's "Player 6 is now Healthy")
#   ?scenario=disable.confirm, disable.registered, disable.red-confirm, disable.red-registered   the Disable, Blue and Red
#   ?scenario=supply.first, supply.registered, supply.ack, supply.ack-one, supply.ack-none, supply.self, supply.received, supply.history   the Supply
```

Every name, seat and role in it is synthetic.

## Commands

```sh
npm run assets:abilities --workspace @mothership/design-tokens    # assets/ from the sources (--check to compare)
npm run capture:abilities --workspace @mothership/design-tokens   # review/; needs a browser (CHROME_PATH overrides the search)
npm run docs:abilities --workspace @mothership/design-tokens      # docs/design/abilities-inventory.md
npm run check:abilities --workspace @mothership/design-tokens     # no browser; refuses pictures and pages made before an edit
```

`npm run test --workspace @mothership/design-tokens` includes tests that show `check:abilities` refusing named mistakes.

## Rights

Original vector artwork made for this repository by the Visual and Motion Designer (Claude Code session) for Mothership. No third-party artwork, font, photograph or generated raster image is used. The portraits in a file are the approved crew cards (`design/source/crew/`, `design-0.2.0`), referenced, not copied.
