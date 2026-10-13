# The Designer's C-notes against the owner's motion specification

**13 October 2026.** The Designer's review of the owner's motion specification (its section 3) listed eleven conflicts and discrepancies, C-1 to C-11, found while only the coordinator's creative brief was readable. The complete specification packet has since been read:

| | |
| --- | --- |
| Packet | `GameN-owner-specification-agent-handoff-2026-10-13-v2.txt`, SHA-256 `b5b4ba2dea6063e20f559894183d0c675a3f754b2789db2e38c5b33e1590b743` |
| Its documents | README `d434066f…`, game-design `002c5d9b…`, rules-contracts `6090fc00…`, motion-requirements `976eeee0…`, decision-register `ecbe6dd4…`, motion-storyboards `1642ed84…` |
| Their source | `docs/specifications/owner-motion-2026-10-13/` on `codex/owner-motion-spec-2026-10-13`, from `abb6839`; not in this repository's history |

This page maps each C-note to the packet's game-design sections (G-01 to G-09) and decision-register answers (Q-…), says whether the Designer's recommendation stands, and says where the work changed. The packet controls; a C-note is only the Designer's earlier reading. Nothing here is a rule.

## The crosswalk

| C | The Designer's note | Packet | Status |
| --- | --- | --- | --- |
| C-1 | Stable, reconnect-safe slot identity: Backend stores one `slotId` per seat, never reflowed. The note recommended a seat-preference rule for entry | G-01, G-09; Q-B03f, Q-B02d; rules-contracts, Command and state authority (Positions) and Blackout validation and resolution; motion-requirements, Stable phone board | **Stored slots stand. The recommended entry rule is superseded**: the packet's rule is the lowest free slot, departures leaving holes. Corrected in PR #128 (`entrySlot()` removed; [board-v2-slots.md](board-v2-slots.md) section 2) |
| C-2 | The Hospital holds the whole roster and every Injured character | G-05, G-07; Q-H01, Q-H04; rules-contracts, normal-round schedule step 9 and Hospital, detention and forced placement | Stands. PR #128 draws the 7, 8 and 9-berth ward. PR #129's settled hit now shows the patient in the Hospital (review finding 5) |
| C-3 | Medical detention: an Injured prisoner stays detained in the Hospital, in the gown, with a neutral marker; healing returns them to Jail; RELEASE and EJECT leave them | G-05, G-06; Q-H02, Q-P02; rules-contracts, Hospital, detention and forced placement and Captain commands; motion-requirements, Hospital critical state | Stands. The note's open question (does `jailed` stay true after a RELEASE?) is answered: RELEASE affects only prisoners physically in Jail, so a Hospital detainee keeps it |
| C-4 | No playable Final Zone: the showdown keeps everyone in their rooms, under a shared overlay | G-07; Q-H03; rules-contracts, Hack timing and final showdown; motion-requirements, Showdown | Stands |
| C-5 | Captain RELEASE becomes a direct command, with no vote | G-06; Q-P01a, Q-P01, Q-P02; game-design, Preserved sources and superseded behavior | Stands. Vote-result art keeps its release variants for the historical tuple only |
| C-6 | EJECT clears the Jail, bodies included, into an off-board elimination record | G-06; Q-P02; rules-contracts, Captain commands | Stands. The record's form is Backend's |
| C-7 | A block is room-visible: the room's occupants at the checkpoint, no one else | G-04; Q-D01, Q-D02, Q-C02a; rules-contracts, Audiences and delivery | Stands. The affected player is one of the observers, and retained Eliminated occupants keep their room's boundary (G-04) |
| C-8 | The Hack pair, entrance and exit are public; claims and talk are the pair's | G-02; Q-HK01 to Q-HK03; rules-contracts, Audiences and delivery and Hack timing | Stands |
| C-9 | The Blackout replaces the turn-time Disable: a shared lighting window, a remembered position, consuming misses | G-01; Q-B01, Q-B02a to Q-B02d, Q-B03, Q-B03a to Q-B03f; rules-contracts, normal-round schedule steps 5 and 6 and Blackout validation and resolution; motion-storyboards section 1 | Stands. PR #129 now holds the packet's exact boundaries (review findings 1, 2 and 6, below) |
| C-10 | Clone duration: the note followed the brief (the activation round and the whole following round) over older notes (the activation round only) | G-03; Q-C02c, Q-C02d (individually confirmed), Q-H03 (Integration default), Q-C01b; rules-contracts, Clone and Protection | **Settled.** The Clone lasts the rest of its activation round and the whole following normal round, including that round's attack resolution: activate in Round 2, expire after Round 3's resolution. Round 5 is the terminal exception: the rest of normal Round 5 only, expiring after its resolution, with no Round 6 and no showdown protection (special showdown shots bypass the Clone). The art is duration-agnostic: expiry plays when the Alien's own view says the effect ended. No owner question |
| C-11 | After the Chamber, the pair returns to their latest authoritative slots, not their old places | G-02; Q-HK02 | Stands |

## The Integration review's findings against the packet

The Integration review of PRs #127 to #129 (13 October 2026) found six defects against the packet. Each is corrected in the stacked PR it names:

| Finding | Packet | Corrected in |
| --- | --- | --- |
| 1. Occupants stayed visible after dark targeting opened | Q-B03a; rules-contracts, Blackout validation and resolution (selection only in `[dark start, window end)`); motion-requirements, Stable phone board | PR #129: people and names leave the page exactly at the preview's end, in both motion modes |
| 2. The strip covered C1 | Q-B03d (the own position stays selectable and neutral); motion-requirements | PR #129: the strip no longer covers any position |
| 3. Seat-preference slot entry | rules-contracts, Blackout validation and resolution (lowest free slot) | PR #128: the drawing module allocates nothing |
| 4. The 601 px shell left the rooms short | motion-requirements (targets stable, no page scrolling) and the owner's 13 October shell decision | PR #128: the shell is chosen by what fits |
| 5. A settled hit left the patient outside the Hospital | G-05, G-07; Q-H04; rules-contracts, normal-round schedule step 9 | PR #129: the outcome fixture says where the patient settles; the page draws it |
| 6. A pending selection reported as unregistered at the deadline | G-01 (an accepted choice with a lost acknowledgement stays accepted); rules-contracts, Command and state authority | PR #129: a pending send stays pending after the deadline |

## Packet decisions the work follows without a C-note

- **The window's timing and audience** (G-01, Q-B02a, Q-B03a, Q-D02): every normal round, after the Jail vote's five-second result, five seconds lit and ten dark, whether or not anyone asked for a strike.
- **Two attacks on one position** (Q-B03c; rules-contracts, Blackout validation and resolution): both are kept and resolved separately. The prototype draws one impact per position; a consumer must not merge the attacks.
- **Same treatment for both defenses** (G-04, Q-C02a): PR #130's ATTACK BLOCKED has no input for the cause.
