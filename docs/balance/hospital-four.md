# The four-bed Hospital: the owner's rule, saved and verified

This records the owner's approved decision `HOSPITAL-4-2026-10-18` and Balance's verification of Backend's implementation of it, separately for seven, eight and nine players. On 19 October the owner replaced the separate Balance acceptance of this rule by two things: save the decision, and verify that the implementation follows it ([owner direction](https://github.com/Amirkianfar66/GameN/issues/155#issuecomment-6258573661), [instruction to Balance](https://github.com/Amirkianfar66/GameN/pull/133#issuecomment-6258574092)). That is all this is. It is not a design approval, a balance review or a human playtest, it proposes no other capacity, and it reopens nothing the owner decided.

## 1. The rule

Hospital has exactly four physical beds, H1 to H4, with seven, eight and nine players, and every physical occupant counts, bodies included. A player who becomes Injured when all four beds are occupied is permanently Eliminated and removed from the board, and cannot later be Rescued. At the end of a stage, patients healed by a Rescue leave their beds first; the new patients, and the bodies of players hit twice in the stage, are then admitted in order of player number, whatever the order of the attacks; then the ordinary returns follow. A player hit and Rescued in the same stage is Healthy and needs no bed. The owner's words: "Yes—eliminate the incoming player", and, on the order, "Free healed Hospital places first, then use existing seat order".

The canonical text is the overlay below. This record restates none of its rules and changes none of them: where this summary and the overlay differ, the overlay holds.

<!-- generated:sources -->
| File | SHA-256 | What it is |
| --- | --- | --- |
| [rules/overlays/hospital-four-owner-decision-2026-10-19.json](../../rules/overlays/hospital-four-owner-decision-2026-10-19.json) | `7d9d3519df8813feb1213f1ad4439cae90895af6850c223264c28907824aeb9c` | The canonical rule, decisions H4-CAPACITY, H4-CHECKPOINT, H4-OVERFLOW, H4-PROVENANCE, H4-CLINICAL, H4-PAIRING |
| [docs/backend/evidence/hospital-four-owner-decision-2026-10-18.json](../../docs/backend/evidence/hospital-four-owner-decision-2026-10-18.json) | `e8200252806d5e468805b6e00cc9ea85eb37651d72522293b533ee31f3d27c5d` | The owner's decision of 18 October and the clarification, as recorded |
| [docs/backend/hospital-four-runtime-contract.md](../../docs/backend/hospital-four-runtime-contract.md) | `a6fe4db68117b2e9c048584519ac3afc83458d0211cc38f3467fb544bf2494db` | Backend's runtime contract: the checkpoint, the four constructed regression expectations, the consumer boundary |
| [docs/backend/hospital-four-verification.md](../../docs/backend/hospital-four-verification.md) | `0fe42c8260839132954db541420e6a0d64ea65e07739f0e9b842ba25b6cee605` | Backend's own verification and its limits. Backend's evidence, not this record's |
| [rules/overlays/board-medical-owner-decision-2026-10-14.json](../../rules/overlays/board-medical-owner-decision-2026-10-14.json) |  | The rules the tuple keeps that the checks also cite: BOARD-MEDICAL-01, BOARD-MEDICAL-03, BOARD-MEDICAL-04, BOARD-MEDICAL-05 |
<!-- /generated:sources -->

The exact tuple:

<!-- generated:pins -->
| Pin | Value |
| --- | --- |
| Protocol | 2 |
| Engine | `full-game-1.11.0` |
| Ruleset | `in-person-v1-hospital-four-2026-10-19` |
| Rules hash, the SHA-256 of the overlay | `7d9d3519df8813feb1213f1ad4439cae90895af6850c223264c28907824aeb9c` |
| Logical layout | `board-v2-four-0.1.0` |
| Art | `design-0.5.0` |
| Parent ruleset | `in-person-v1-clone-2026-10-14` |
<!-- /generated:pins -->

**What it replaces.** For this tuple only, the Hospital as large as the roster of the owner specification of 13 October and of rulesets 1.7 to 1.10. Every earlier tuple, saved match and record is unchanged. The 143, 151 and 152 cases of [PR #133](https://github.com/Amirkianfar66/GameN/pull/133) stay what they were, specified for the specification of 13 October and not run. Those that expect every injured player of a stage to find a bed, among them HSP-04 and SLOT-03, are not relabelled as four-bed results; the cases of this record replace them for the new tuple.

## 2. Implementation status

<!-- generated:implementation -->
|  |  |
| --- | --- |
| Pull request | [#163](https://github.com/Amirkianfar66/GameN/pull/163), branch `codex/backend-hospital-four-runtime` |
| Final head | `1d16da3b5b642f590810d1106714fde230a45c48` |
| Tested source | `afac7173f25a82138d231e7b1906896f9919562c` |
| Base | `6ca4b51d5acd1454daec68c5108c8f12ee2286bf` |
| Status | Implemented in Backend's PR #163. Not merged, not activated as a profile or default, not deployed. |
<!-- /generated:implementation -->

Backend's own verification is [docs/backend/hospital-four-verification.md](../backend/hospital-four-verification.md), and Integration reviewed the tested source independently ([review](https://github.com/Amirkianfar66/GameN/pull/163#issuecomment-6256333119)). Both are their evidence, not this record's, and nothing below relies on them. Frontend's consumer and the Designer's four-bed adaptation, including the words-only treatment of a clinical anchor beyond the fourth bed, are separate work with their own acceptance.

## 3. What was verified, and how

Each line below is a short match played through the engine's public API (`createFullGame`, `executeFullGame`, `advanceFullGame`, `projectFullGame`) with the four-bed tuple, followed by checks of what the public view, the outcome history and the player views then show. The clinical anchors are checked with the game service's own assignment, `clinicalPresentationAnchors`, and the contracts' validator. Every expected value is written from the overlay, Backend's runtime contract or a rule the tuple keeps, and each claim names its source; none is read from the engine. The Balance scenario runner was not used: its adapter and command language predate stored positions, the Blackout window and Hospital episodes. The driver here plays legal commands and deadlines and nothing else.

- **Native** lines use only legal commands and deadlines from the start of a match.
- **Constructed** lines play a legal prefix, then place bodies or patients in Hospital by hand, and continue with legal commands. The engine's own guards accept each constructed state. The four constructed lines, C1 to C4, are the four rows of Backend's table of constructed regression expectations, built independently, with the same victim numbers where the roles allow.
- **Contract** checks read the tuple, the contracts and the art pairing without playing a match.

After every command and deadline the driver records who holds which bed and that every seat is still listed; at the end the whole record is replayed from the same start, and each receipt and each state is compared with the first run. Each step is also executed twice on a copy to show that it is deterministic, and each deadline is given a second time to show that it advances once.

With seven players no legal play reaches a full ward and a fifth arrival before the showdown: seven players have four attacks before it, one Blackout and three ordinary weapons, and the showdown has no Rescue stage. So with seven players the overflow is played in the showdown (N5, N6), and a bed freed by a Rescue before an arrival is shown only by a constructed control (C2). Eight players have five attacks and nine have six, and there native lines reach both in Rounds 4 and 5.

What each requirement of the instruction is verified by:

<!-- generated:coverage -->
| What is verified | 7 players | 8 players | 9 players |
| --- | --- | --- | --- |
| Exactly four physical Hospital positions, H1 to H4 | native: N5, N6; constructed: C1, C2, C3, C4; contract: P0 | native: N1, N2, N3; constructed: C1, C2, C3, C4; contract: P0 | native: N1, N2, N3, N4; constructed: C1, C2, C3, C4; contract: P0 |
| A fourth admission succeeds | native: N5, N6; constructed: C1, C2 | native: N1; constructed: C1, C2 | native: N1, N4; constructed: C1, C2 |
| A player denied admission is permanently Eliminated and off the board, and cannot later be Rescued | native: N5, N6; constructed: C1, C4 | native: N1; constructed: C1, C4 | native: N1, N4; constructed: C1, C4 |
| Existing bodies still occupy beds | native: N5, N6; constructed: C1, C2, C3, C4 | native: N1, N2, N3; constructed: C1, C2, C3, C4 | native: N1, N2, N3, N4; constructed: C1, C2, C3, C4 |
| Healed beds are freed before admission by player number | constructed: C2 | native: N2; constructed: C2 | native: N2; constructed: C2 |
| Simultaneous arrivals and a Rescue in the same stage follow the published order | native: N6; constructed: C1, C3, C4 | native: N1, N3; constructed: C1, C3, C4 | native: N1, N3, N4; constructed: C1, C3, C4 |
| Identity, Code and history remain after removal from the board | native: N5; constructed: C1 | native: N1; constructed: C1 | native: N1; constructed: C1 |
| Committed outcomes are the same on replay | native: N5, N6; constructed: C1, C2, C3, C4 | native: N1, N2, N3; constructed: C1, C2, C3, C4 | native: N1, N2, N3, N4; constructed: C1, C2, C3, C4 |
| Clinical anchors stay roster-sized: HV5 and above can be valid without a fifth bed | constructed: C3, C4; contract: P0 | native: N1, N3; constructed: C3, C4; contract: P0 | native: N1, N3, N4; constructed: C3, C4; contract: P0 |
<!-- /generated:coverage -->

The sources the claims name:

<!-- generated:source-ids -->
| Source | Where |
| --- | --- |
| H4-CAPACITY | rules/overlays/hospital-four-owner-decision-2026-10-19.json, decision H4-CAPACITY |
| H4-CHECKPOINT | rules/overlays/hospital-four-owner-decision-2026-10-19.json, decision H4-CHECKPOINT |
| H4-OVERFLOW | rules/overlays/hospital-four-owner-decision-2026-10-19.json, decision H4-OVERFLOW |
| H4-CLINICAL | rules/overlays/hospital-four-owner-decision-2026-10-19.json, decision H4-CLINICAL |
| H4-PAIRING | rules/overlays/hospital-four-owner-decision-2026-10-19.json, decision H4-PAIRING |
| CONTRACT-CHECKPOINT | docs/backend/hospital-four-runtime-contract.md, "Atomic checkpoint" |
| CONTRACT-ROWS | docs/backend/hospital-four-runtime-contract.md, the four constructed regression expectations |
| CONTRACT-BOUNDARY | docs/backend/hospital-four-runtime-contract.md, "Consumer boundary" |
| BOARD-MEDICAL-01 | rules/overlays/board-medical-owner-decision-2026-10-14.json, decision BOARD-MEDICAL-01 |
| BOARD-MEDICAL-03 | rules/overlays/board-medical-owner-decision-2026-10-14.json, decision BOARD-MEDICAL-03 |
| BOARD-MEDICAL-04 | rules/overlays/board-medical-owner-decision-2026-10-14.json, decision BOARD-MEDICAL-04 |
| BOARD-MEDICAL-05 | rules/overlays/board-medical-owner-decision-2026-10-14.json, decision BOARD-MEDICAL-05 |
| R-WIN-05 | docs/balance/game-rules.md, R-WIN-05 |
| R-WIN-06 | docs/balance/game-rules.md, R-WIN-06 |
<!-- /generated:source-ids -->

### Result

<!-- generated:verdict -->
Run on 2026-10-19 from a clean clone at `943fa9b01e03f0e96165311853945fb172b2d93b`, against the engine, contracts and service of that commit, which are byte for byte those of the tested source `afac7173f25a82138d231e7b1906896f9919562c`. 24 line runs (7 with 7 players, 8 with 8 players, 9 with 9 players), 201 claims: all passed. No line failed or stopped with an error. The report is [docs/balance/evidence/2026-10-19-hospital-four.json](../../docs/balance/evidence/2026-10-19-hospital-four.json).
<!-- /generated:verdict -->

<!-- generated:results -->
| Players | Line | Kind | Claims passed | Result |
| --- | --- | --- | --- | --- |
| 7 | P0 | Contract | 6 of 6 | passed |
| 7 | N5 | Native | 10 of 10 | passed |
| 7 | N6 | Native | 8 of 8 | passed |
| 7 | C1 | Constructed | 10 of 10 | passed |
| 7 | C2 | Constructed | 6 of 6 | passed |
| 7 | C3 | Constructed | 6 of 6 | passed |
| 7 | C4 | Constructed | 7 of 7 | passed |
| 8 | P0 | Contract | 6 of 6 | passed |
| 8 | N1 | Native | 18 of 18 | passed |
| 8 | N2 | Native | 9 of 9 | passed |
| 8 | N3 | Native | 7 of 7 | passed |
| 8 | C1 | Constructed | 10 of 10 | passed |
| 8 | C2 | Constructed | 6 of 6 | passed |
| 8 | C3 | Constructed | 6 of 6 | passed |
| 8 | C4 | Constructed | 7 of 7 | passed |
| 9 | P0 | Contract | 6 of 6 | passed |
| 9 | N1 | Native | 18 of 18 | passed |
| 9 | N2 | Native | 9 of 9 | passed |
| 9 | N3 | Native | 7 of 7 | passed |
| 9 | N4 | Native | 10 of 10 | passed |
| 9 | C1 | Constructed | 10 of 10 | passed |
| 9 | C2 | Constructed | 6 of 6 | passed |
| 9 | C3 | Constructed | 6 of 6 | passed |
| 9 | C4 | Constructed | 7 of 7 | passed |
<!-- /generated:results -->

### Every claim

<!-- generated:claims -->
#### P0: The tuple has four physical beds, the reserved art and roster-sized clinical anchors

Contract; seven, eight and nine players. Constructed state: one body placed in H1 to obtain a view of the tuple.

| Claim | Sources | 7 | 8 | 9 |
| --- | --- | --- | --- | --- |
| The engine gives the tuple four Hospital positions | H4-CAPACITY | passed | passed | passed |
| The Clone tuple keeps a Hospital of the roster | H4-PAIRING | passed | passed | passed |
| The contracts give a Blackout map of the tuple four Hospital positions, and the old reader keeps its count | CONTRACT-BOUNDARY | passed | passed | passed |
| A match of the tuple is refused with any art but design-0.5.0 | H4-PAIRING | passed | passed | passed |
| The public view of the tuple is valid with a body in H1 and refused with it in H5 | H4-CAPACITY, CONTRACT-BOUNDARY | passed | passed | passed |
| A clinical anchor is valid from HV1 up to the number of players, HV5 included, and not beyond it | H4-CLINICAL | passed | passed | passed |

#### N1: Round 4: three arrivals for two free beds; the highest number is refused although it was hit first; no later Rescue; the Code keeps the refused player

Native; 8 and 9 players only.

| Claim | Sources | 7 | 8 | 9 |
| --- | --- | --- | --- | --- |
| The Insider and the Alien die at the end of Round 2 and keep H1 and H2 | BOARD-MEDICAL-01, BOARD-MEDICAL-03 |  | passed | passed |
| Players 3 and 4 take H3 and H4 in order of number: the fourth admission succeeds | H4-CHECKPOINT, BOARD-MEDICAL-01 |  | passed | passed |
| Player 8, hit first, finds no bed and is Eliminated off the board | H4-OVERFLOW, CONTRACT-BOUNDARY |  | passed | passed |
| The two bodies keep H1 and H2 | H4-CHECKPOINT |  | passed | passed |
| One public removal outcome names player 8, the round and the resolving phase | H4-OVERFLOW, CONTRACT-BOUNDARY |  | passed | passed |
| The removal fact is valid under the contracts | CONTRACT-BOUNDARY |  | passed | passed |
| The batch has clinical facts for players 3 and 4 and none for player 8 | H4-OVERFLOW, CONTRACT-BOUNDARY |  | passed | passed |
| Players 3 and 4 get anchors HV3 and HV4 after the bodies' HV1 and HV2; player 8 gets none | H4-CLINICAL, CONTRACT-BOUNDARY |  | passed | passed |
| The Cracker is not offered player 8 as a Rescue target | H4-OVERFLOW |  | passed | passed |
| A Rescue of player 8 is refused | H4-OVERFLOW |  | passed | passed |
| Player 8 is still off the board after Round 5 | H4-OVERFLOW |  | passed | passed |
| Player 3, Rescued, returns to Room A at its lowest free position | BOARD-MEDICAL-04, BOARD-MEDICAL-01 |  | passed | passed |
| Player 8 is still listed with its faction, its role is revealed at the end, and the Code still holds it | H4-OVERFLOW |  | passed | passed |
| The Code naming player 8 is correct, and Red wins on it at the end of Round 5 | R-WIN-06, H4-OVERFLOW |  | passed | passed |
| Every outcome recorded before Round 5 is still recorded after it | H4-OVERFLOW |  | passed | passed |
| After every command and deadline Hospital holds at most four players, all in H1 to H4 | H4-CAPACITY |  | passed | passed |
| After every command and deadline the public view lists every seat of the match | H4-OVERFLOW |  | passed | passed |
| Replaying every recorded command and deadline gives the same receipts, states, views and outcomes; every step is deterministic, and a deadline given twice advances once | H4-CHECKPOINT |  | passed | passed |

#### N2: Round 5: the ward is full; a Rescued patient leaves first, and the new patient takes the freed bed

Native; 8 and 9 players only.

| Claim | Sources | 7 | 8 | 9 |
| --- | --- | --- | --- | --- |
| After Round 4 the ward is full: two bodies and two patients | H4-CAPACITY, BOARD-MEDICAL-01 |  | passed | passed |
| Player 8 takes H3, the bed player 3 left; player 6 dies in H4 | H4-CHECKPOINT, BOARD-MEDICAL-03, BOARD-MEDICAL-04 |  | passed | passed |
| Player 3 returns to Room A at its lowest free position | BOARD-MEDICAL-04, BOARD-MEDICAL-01 |  | passed | passed |
| A patient of Round 5 has no Rescue deadline | BOARD-MEDICAL-05 |  | passed | passed |
| Nobody is removed from the board | H4-CHECKPOINT |  | passed | passed |
| The batch has an injury for player 8, a recovery for player 3 and a death for player 6 | BOARD-MEDICAL-03 |  | passed | passed |
| After every command and deadline Hospital holds at most four players, all in H1 to H4 | H4-CAPACITY |  | passed | passed |
| After every command and deadline the public view lists every seat of the match | H4-OVERFLOW |  | passed | passed |
| Replaying every recorded command and deadline gives the same receipts, states, views and outcomes; every step is deterministic, and a deadline given twice advances once | H4-CHECKPOINT |  | passed | passed |

#### N3: Round 5: the ward is full; a new patient Rescued in the same stage needs no bed and gets an anchor beyond the fourth

Native; 8 and 9 players only.

| Claim | Sources | 7 | 8 | 9 |
| --- | --- | --- | --- | --- |
| Player 4 is Healthy and returns to Room A at its lowest free position, without taking a bed | H4-CHECKPOINT, CONTRACT-CHECKPOINT, BOARD-MEDICAL-01 |  | passed | passed |
| The ward holds four bodies: the two of Round 2 and the two patients of Round 4, dead at the end of Round 5 | BOARD-MEDICAL-03, H4-CHECKPOINT |  | passed | passed |
| Nobody is removed from the board | H4-CHECKPOINT, CONTRACT-ROWS |  | passed | passed |
| Player 4, a fifth clinical subject, gets HV5 while the occupants keep HV1 to HV4; all are valid | H4-CLINICAL, CONTRACT-BOUNDARY |  | passed | passed |
| After every command and deadline Hospital holds at most four players, all in H1 to H4 | H4-CAPACITY |  | passed | passed |
| After every command and deadline the public view lists every seat of the match | H4-OVERFLOW |  | passed | passed |
| Replaying every recorded command and deadline gives the same receipts, states, views and outcomes; every step is deterministic, and a deadline given twice advances once | H4-CHECKPOINT |  | passed | passed |

#### N4: Round 4: one bed left; a body of two hits with the lower number takes it, the Rescue on it heals nothing, and the higher number is refused

Native; 9 players only.

| Claim | Sources | 7 | 8 | 9 |
| --- | --- | --- | --- | --- |
| Before Round 4 three bodies hold H1 to H3 | BOARD-MEDICAL-01, BOARD-MEDICAL-03 |  |  | passed |
| Player 4, Eliminated by the second hit, takes the last bed as a body | H4-CHECKPOINT, CONTRACT-CHECKPOINT |  |  | passed |
| Player 6, hit first, finds no bed and is Eliminated off the board | H4-OVERFLOW, CONTRACT-BOUNDARY |  |  | passed |
| One public removal outcome names player 6 | H4-OVERFLOW |  |  | passed |
| The Rescue is spent and heals nothing; the batch has player 4's injury and death and nothing of player 6 | CONTRACT-CHECKPOINT, BOARD-MEDICAL-03, H4-OVERFLOW |  |  | passed |
| The three bodies keep H1 to H3 | H4-CHECKPOINT |  |  | passed |
| Player 4 gets HV4 after the bodies' HV1 to HV3; player 6 gets none | H4-CLINICAL |  |  | passed |
| After every command and deadline Hospital holds at most four players, all in H1 to H4 | H4-CAPACITY |  |  | passed |
| After every command and deadline the public view lists every seat of the match | H4-OVERFLOW |  |  | passed |
| Replaying every recorded command and deadline gives the same receipts, states, views and outcomes; every step is deterministic, and a deadline given twice advances once | H4-CHECKPOINT |  |  | passed |

#### N5: Round 4 fills the fourth bed; in the showdown a ward of four bodies refuses both arrivals, who keep their identity and Code

Native; 7 players only.

| Claim | Sources | 7 | 8 | 9 |
| --- | --- | --- | --- | --- |
| Three patients join the Alien's body in order of number; the fourth admission succeeds | H4-CHECKPOINT, BOARD-MEDICAL-01 | passed |  |  |
| Round 5 ends without a winner; the three patients die in their beds and the showdown opens | BOARD-MEDICAL-03, BOARD-MEDICAL-05 | passed |  |  |
| Players 3 and 6 find no bed and are Eliminated off the board | H4-OVERFLOW, CONTRACT-BOUNDARY | passed |  |  |
| Two public removal outcomes, in order of number, and no clinical fact for either | H4-OVERFLOW, CONTRACT-BOUNDARY | passed |  |  |
| The four bodies keep H1 to H4 | H4-CHECKPOINT | passed |  |  |
| Both are still listed, their roles are revealed at the end, and the Code still holds player 3 | H4-OVERFLOW | passed |  |  |
| With every Blue player Eliminated and Undercover Healthy, Red wins | R-WIN-05 | passed |  |  |
| After every command and deadline Hospital holds at most four players, all in H1 to H4 | H4-CAPACITY | passed |  |  |
| After every command and deadline the public view lists every seat of the match | H4-OVERFLOW | passed |  |  |
| Replaying every recorded command and deadline gives the same receipts, states, views and outcomes; every step is deterministic, and a deadline given twice advances once | H4-CHECKPOINT | passed |  |  |

#### N6: Showdown: one bed left for two arrivals; the lower number takes it although it was hit second

Native; 7 players only.

| Claim | Sources | 7 | 8 | 9 |
| --- | --- | --- | --- | --- |
| The showdown opens with three bodies in H1 to H3 | BOARD-MEDICAL-03, BOARD-MEDICAL-05 | passed |  |  |
| Player 3 takes H4 | H4-CHECKPOINT, BOARD-MEDICAL-01 | passed |  |  |
| Player 6, hit first, finds no bed and is Eliminated off the board | H4-OVERFLOW, CONTRACT-BOUNDARY | passed |  |  |
| One public removal outcome names player 6; the only clinical fact of the stage is player 3's injury | H4-OVERFLOW, CONTRACT-BOUNDARY | passed |  |  |
| The three bodies keep H1 to H3 | H4-CHECKPOINT | passed |  |  |
| After every command and deadline Hospital holds at most four players, all in H1 to H4 | H4-CAPACITY | passed |  |  |
| After every command and deadline the public view lists every seat of the match | H4-OVERFLOW | passed |  |  |
| Replaying every recorded command and deadline gives the same receipts, states, views and outcomes; every step is deterministic, and a deadline given twice advances once | H4-CHECKPOINT | passed |  |  |

#### C1: Contract row 1: three occupants; player 6 is hit before player 1; player 1 takes the fourth bed, player 6 leaves the board, and no later Rescue reaches it

Constructed; seven, eight and nine players. Constructed state: at the first turn of Round 4, the bodies of the Blue Disabler, the Supplier and the Alien placed in H1 to H3.

| Claim | Sources | 7 | 8 | 9 |
| --- | --- | --- | --- | --- |
| Player 1 takes H4 | CONTRACT-ROWS, H4-CHECKPOINT | passed | passed | passed |
| Player 6 is Eliminated off the board | CONTRACT-ROWS, H4-OVERFLOW, CONTRACT-BOUNDARY | passed | passed | passed |
| One public removal outcome names player 6, and the batch has no clinical fact for it | H4-OVERFLOW, CONTRACT-BOUNDARY | passed | passed | passed |
| The three bodies keep H1 to H3 | H4-CHECKPOINT | passed | passed | passed |
| In Round 5 the Cracker is not offered player 6 as a Rescue target | H4-OVERFLOW | passed | passed | passed |
| A Rescue of player 6 is refused | H4-OVERFLOW | passed | passed | passed |
| Player 6 is still listed with its faction and still reads the Scan it made in Round 1 | H4-OVERFLOW | passed | passed | passed |
| After every command and deadline Hospital holds at most four players, all in H1 to H4 | H4-CAPACITY | passed | passed | passed |
| After every command and deadline the public view lists every seat of the match | H4-OVERFLOW | passed | passed | passed |
| Replaying every recorded command and deadline gives the same receipts, states, views and outcomes; every step is deterministic, and a deadline given twice advances once | H4-CHECKPOINT | passed | passed | passed |

#### C2: Contract row 2: four occupants, one of them a patient; player 1 is hit and the patient, player 7, is Rescued; player 7 leaves and player 1 takes its bed

Constructed; seven, eight and nine players. Constructed state: at the first turn of Round 4, three bodies placed in H1 to H3 and the Alien, a patient of Round 3, in H4.

| Claim | Sources | 7 | 8 | 9 |
| --- | --- | --- | --- | --- |
| Player 7 returns to Room B and player 1 takes H4 | CONTRACT-ROWS, H4-CHECKPOINT, BOARD-MEDICAL-04 | passed | passed | passed |
| The three bodies keep H1 to H3 | H4-CHECKPOINT | passed | passed | passed |
| Nobody is removed from the board | CONTRACT-ROWS | passed | passed | passed |
| After every command and deadline Hospital holds at most four players, all in H1 to H4 | H4-CAPACITY | passed | passed | passed |
| After every command and deadline the public view lists every seat of the match | H4-OVERFLOW | passed | passed | passed |
| Replaying every recorded command and deadline gives the same receipts, states, views and outcomes; every step is deterministic, and a deadline given twice advances once | H4-CHECKPOINT | passed | passed | passed |

#### C3: Contract row 3: four bodies; player 1 is hit and Rescued in the same stage, needs no bed, and gets a clinical anchor beyond the fourth

Constructed; seven, eight and nine players. Constructed state: at the first turn of Round 4, four bodies placed in H1 to H4.

| Claim | Sources | 7 | 8 | 9 |
| --- | --- | --- | --- | --- |
| Player 1 is Healthy in Room A, at its own position | CONTRACT-ROWS, H4-CHECKPOINT, BOARD-MEDICAL-01 | passed | passed | passed |
| The four bodies keep H1 to H4 and nobody is removed | H4-CHECKPOINT, CONTRACT-ROWS | passed | passed | passed |
| Player 1 gets HV5, after HV1 to HV4 of the four occupants, and it is valid | H4-CLINICAL, CONTRACT-BOUNDARY | passed | passed | passed |
| After every command and deadline Hospital holds at most four players, all in H1 to H4 | H4-CAPACITY | passed | passed | passed |
| After every command and deadline the public view lists every seat of the match | H4-OVERFLOW | passed | passed | passed |
| Replaying every recorded command and deadline gives the same receipts, states, views and outcomes; every step is deterministic, and a deadline given twice advances once | H4-CHECKPOINT | passed | passed | passed |

#### C4: Contract row 4: four bodies; player 1 is hit twice and then Rescued; player 1 is Eliminated, cannot heal, and leaves the board

Constructed; seven, eight and nine players. Constructed state: at the first turn of Round 4, four bodies placed in H1 to H4.

| Claim | Sources | 7 | 8 | 9 |
| --- | --- | --- | --- | --- |
| Player 1 is Eliminated off the board: no fifth body, no fifth bed | CONTRACT-ROWS, H4-OVERFLOW, CONTRACT-BOUNDARY | passed | passed | passed |
| One public removal outcome names player 1, and the batch has no clinical fact for it | H4-OVERFLOW, CONTRACT-BOUNDARY | passed | passed | passed |
| The four bodies keep H1 to H4 | H4-CHECKPOINT | passed | passed | passed |
| The Rescue is spent and heals nothing; no anchor is assigned | CONTRACT-ROWS, H4-CLINICAL | passed | passed | passed |
| After every command and deadline Hospital holds at most four players, all in H1 to H4 | H4-CAPACITY | passed | passed | passed |
| After every command and deadline the public view lists every seat of the match | H4-OVERFLOW | passed | passed | passed |
| Replaying every recorded command and deadline gives the same receipts, states, views and outcomes; every step is deterministic, and a deadline given twice advances once | H4-CHECKPOINT | passed | passed | passed |
<!-- /generated:claims -->

## 4. Commands

Run from the repository root with Node 22.21.1 and npm 10.9.4, after `npm ci` and `npm run build`:

```sh
npm run hospital-four --workspace @mothership/balance -- --require-engine --out <report.json>
npm run check --workspace @mothership/balance
```

The first plays every line with 7, 8 and 9 players against the engine of the checkout, prints the result of each, and writes the report. Add `--engine-root <checkout>` for a built copy of another commit. It exits 1 if a claim fails or a line stops with an error, and 2 if `--require-engine` was given and the checkout cannot be run. The second holds this document, the record and the committed report to each other.

## 5. Not run

- The game service and its emulators: receipts of real commands, retries, deadline Tasks, HTTP, Firestore rules and reconnection. Backend reports its own service cases; this record does not run them.
- Anything on a phone, in a browser or on the shared display: the four-bed ward, the removal outcome and the words-only anchor beyond the fourth bed. These are Frontend's and the Designer's.
- Human play. Whether four beds make a better game is not a question this record asks or answers.
- The Balance scenario catalogue, the capacity suite and their playouts, which concern earlier rulesets and are unrelated to this rule.
