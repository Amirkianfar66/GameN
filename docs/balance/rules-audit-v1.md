# Rules audit for in-person Version 1

**Date:** 6 October 2026. **Author:** Game Design and Balance, issue [#5](https://github.com/Amirkianfar66/GameN/issues/5).
**Runner:** Claude Code desktop app, model `claude-opus-5-5`.
**Status:** source audit, decision register and derived consequences. It supports the rulebook in [game-rules.md](game-rules.md). It is not evidence that the game is implemented or that any mode is balanced.

The earlier audit, [rules-audit.md](rules-audit.md) of 26 September 2026, is pinned by the bootstrap source lock and is unchanged. It remains the record of what was open before the owner's decision of 6 October. This document supersedes it for Version 1 without editing it.

## Provenance

| Item | Value | How it was checked |
| --- | --- | --- |
| Repository | `Amirkianfar66/GameN` | `git remote -v` |
| Branch and worktree | `agent/game-balance-baseline` in `GameN-worktrees/balance` | `git status` showed a clean tree before any change |
| Base commit (`BASE_SHA`) | `333c9e820f362a211352bc689372663f29b73ac4` | `git rev-parse HEAD` at start; equal to the merge of PR #7 |
| Source import | `7e28c2cd100642667fb0021be0b85fa8cade1869` | Ancestor of the base commit |
| Source manifest SHA-256 | `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc` | Recomputed from `rules/source-manifest.json`; equals the value in issue #5 |
| Seven rule sources | Hashes below | Each recomputed and equal to the manifest |
| Owner decision overlay (V1-01 to V1-21) | SHA-256 `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90` | Recomputed from the file at commit `8d4a2e5dc47eb827dbcbfd8382755db2fa3b0bde`. **Not present at the base commit** |
| Toolchain | Node 22.21.1, npm 10.9.4 | `npm run check:toolchain` |

| Key | File | SHA-256 |
| --- | --- | --- |
| `baseline` | `rules/sources/v2.1-decisions.json` | `5cb9fe866697c3e3af33cd97672b56d1abcca3d8ea1164ded5cd4eee998aa564` |
| `consolidated` | `rules/overlays/consolidated-decisions-2026-09-26.json` | `57dda3cc4b6f421254d2e54f9743d5dccd5d1fd2e006972d7eebc63a3c9729d5` |
| `direct_shot` | `rules/overlays/direct-shot-decision.json` | `58aa22d4bc3bc2493dc0c223c8b4e283a406b5a170d491136263dd3c794f73be` |
| `showdown` | `rules/overlays/final-showdown-decision.json` | `f30e50eea88a1ec60e43a568c4ca2afc8190d7790a72bcd18cc690eca7606de1` |
| `board` | `rules/overlays/location-board-layout-v1.json` | `a417d0b304480d9bbdc4fde2bdc406fcb4f8f236af21c9e972e97a801bb46691` |
| `movement` | `rules/overlays/movement-decision.json` | `7e41d15e45d167f53dfa4dddb1a9cdf79b10ce9094c3afe54b01b8eaa5d1ea8d` |
| `modes` | `rules/overlays/player-modes-officer.json` | `8afa1aa34e350453e1804b59d631f0982f8cb5b1f0d1dac51e7e9ed442331b19` |

### The owner decision of 6 October is recorded outside the base commit

Issue #9 confirms the release order: a complete in-person game first, remote play second. It changes no rule. Later the same day issue [#13](https://github.com/Amirkianfar66/GameN/issues/13) records that the owner approved a 21-point decision sheet with the answer "Use the proposed V1 decisions". The sheet is committed as `rules/overlays/in-person-v1-owner-decisions-2026-10-06.json` on the draft branch `codex/backend-v1-core`, PR [#16](https://github.com/Amirkianfar66/GameN/pull/16). That branch is not merged.

Source precedence puts the latest recorded owner decision first, so this audit applies V1-01 to V1-21. Three limits follow and are kept visible everywhere:

1. The approval is taken from the repository record. This audit did not witness it. **The owner is asked to confirm it on the pull request.**
2. Citations of the form `v1#V1-nn` cannot be verified against a file at the base commit. The check verifies them when the overlay file is present and reports them as unverifiable otherwise.
3. If the overlay changes before it is merged, the OWNER-V1 rows and the scenarios that cite them must be reviewed again.

The roadmap text in PR #10 still says the gameplay choices are unresolved. It was written before issue #13 and is out of date on that point only.

## How precedence was applied

The baseline is not merged mechanically. Each baseline statement below is replaced, narrowed or kept for a stated reason.

| Baseline statement | Outcome | Decided by |
| --- | --- | --- |
| Eight players only (`baseline#/player_setup/player_count`) | Replaced by three configurations | `modes#/modes` |
| Turn formula "Talk, then Hack immediately, then Action"; Hack cannot be postponed (`baseline#/round_structure/player_turn`) | Replaced. One shared 60-second turn; the Hack is requested inside it and held after it | `consolidated#/turn_timing` |
| Turn duration not final; movement timing and frequency open | Resolved | `consolidated#/turn_timing`, `movement#/rule` |
| Captain "occupies Command Room" (`baseline#/captain/location`) | Narrowed. The Captain may leave and keeps the title | `movement#/captain_after_leaving` |
| Shooter must identify a third player; a wrong identification fails (`baseline#/ordinary_shot/identification_rule`, `/validation_order`) | Archived | `direct_shot#/current` |
| Undercover "uses ordinary shot identification rules"; Alien "must correctly identify one Red player" | Archived with the identification rule. The weapon itself remains | `direct_shot#/current/applies_to` |
| Code deadline "End of Round 5", attempts unstated | Resolved: one attempt, any time in Round 5; checked after Round 5's effects | `consolidated#/hacker_round_5_code`, `v1#V1-08` |
| End-of-round order open | Resolved | `consolidated#/end_of_round_order` |
| Registered action after the actor's status changes open | Resolved: it still resolves | `consolidated#/registered_action` |
| Protection stacking and self-targeting open | Resolved: self allowed, one receipt per player for life | `consolidated#/undercover_protection` |
| No winner after Round 5 open | Resolved by the conditional showdown, option 1 | `showdown#/trigger`, `showdown#/current_option` |
| No eligible Captain candidate open, then set aside | Resolved for Version 1 | `v1#V1-04` |
| Round 5 Hack embargo open | Resolved: undisclosed until the match ends | `consolidated#/round_5_standard_hack` |
| Protection applies to Heavy Shot and Final Collision; Emergency Override exceptions; "all 8 players receive a power" | Out of scope. Original Powers are off | `baseline#/optional_original_power_pack/optional` |

Three files need care because their name suggests more authority than their content has.

- `location-board-layout-v1.json` has the status `physical_layout_prototype`. Its `confirmed_topology` and `physical_information` restate confirmed facts and are cited only beside a baseline or movement source. Its `layout_proposal` and `open_board_decisions` were never canon; V1-02 and V1-03 now decide them.
- `final-showdown-decision.json` still contains option 2, which mentions identification. Option 1 is the current choice. Option 2 must never reach a runtime.
- `rules/sources/archived/Mothership_Rulebook_v2.1_Playtest.pdf` (SHA-256 `bda496ec5d288aff49d2e7f8b446caf197ee5bc09e48f012259538d0c32cbc33`) is archived and is not listed in the manifest. It is in Persian. No PDF renderer is installed in this environment, so its text was read through a lossy extraction and is used only as background. One passage appears to say that Alien shoots "if it obtains a weapon", which agrees with reading D22. Nothing in the rulebook rests on it.

## Decision register

This register continues the D numbers of the earlier audit. RESOLVED means an owner decision now covers it. OPEN means no rule exists: the rulebook states no behaviour and the scenario is blocked. CONFIRM means the rulebook carries a working reading that follows from the sources, scenarios run against it, and the owner is asked to confirm it.

| ID | Question | Status | Resolution or what is needed |
| --- | --- | --- | --- |
| D01 | Starting rooms; where healed and released players go; whether that spends movement | RESOLVED | V1-01, V1-02. Rules R-SETUP-07, R-STATE-07, R-STATE-08, R-VOTE-07, R-MOVE-06 |
| D02 | Captain's routes into Command Room; no eligible candidate | RESOLVED | V1-03, V1-04. Rules R-MOVE-04, R-CAPT-05, R-CAPT-06, R-CAPT-14 |
| D03 | Cracker's access to Hospital | RESOLVED | V1-05. Rule R-ROLE-04 |
| D04 | Location after registration | RESOLVED | V1-06. Rule R-ACT-06 |
| D05 | Order inside the action and attack stage | RESOLVED | V1-07. Rules R-RES-02, R-RES-04 |
| D06 | When a correct Code wins | RESOLVED | V1-08. Rules R-ROLE-15, R-WIN-06 |
| D07 | Vote and showdown windows, missing input, targets already eliminated | RESOLVED | V1-09, V1-10, V1-11, V1-20. Rules R-FLOW-07, R-FLOW-08, R-VOTE-02, R-VOTE-05, R-SHOW-04, R-SHOW-07 |
| D08 | Deadline boundary, disconnects, pauses and aborts | RESOLVED | V1-09, V1-12, V1-21. Rules R-FLOW-08, R-OPS-01, R-OPS-02, R-OPS-03 |
| D09 | Who learns private results | RESOLVED | V1-14, V1-16, V1-17, V1-18. Rules R-ROLE-08, R-ROLE-14, R-PROT-06, R-VIEW-06, R-RES-05 |
| D10 | How Original Powers are dealt with seven or nine players, and how they meet the showdown's special shots | OPEN | Owner, with a separate versioned suite. The base comparison keeps powers off |
| D11 | May Supplier name themself as one of the two recipients? | OPEN | Owner. V1-13 lists who may target themself and does not mention Supplier; V1-16 does not exclude it |
| D12 | What may Supplier do with fewer than two eligible recipients in the same location? | OPEN | Owner. The sources require two different recipients and say nothing about one |
| D13 | Is there a limit on repeated Captain runoffs, or a tie-break? | OPEN | Owner. V1-04 says a runoff repeats; nothing ends a tie that never breaks |
| D14 | Does a Healthy but Jailed player satisfy "at least one Healthy member"? | OPEN | Owner. Health and Jail are separate, and Jailed players count zero Power; the texts do not say which governs the requirement |
| D15 | What ends a match in which no victory condition can still be met, or in which nobody is left? | OPEN | Owner. No source ends such a match before Round 5 |
| D16 | May a player move while a Captain election is being voted? | OPEN | Owner. Movement is allowed "before voting begins"; the election is a vote at the start of the round |
| D17 | May a player end their ordinary turn or a Hack conversation early? | OPEN | Owner. V1-09 keeps vote windows open to the deadline and is silent about turns |
| D18 | Format of a Standard Hack conversation: who asks, how many questions, what if a player declines | OPEN | Owner. Only "Yes / No" and the truth rule are stated |
| D19 | What may an Eliminated player say or show at the table? | OPEN | Owner. No source covers table conduct after elimination |
| D20 | Is a round's turn order announced in advance or revealed one turn at a time? | OPEN | Owner. The order is drawn each round; its visibility is not stated |
| D21 | The three other Code numbers are drawn with equal chance from the eligible players | CONFIRM | Owner confirms or states another method. Rule R-SETUP-16 |
| D22 | Only Undercover, and Officer with nine players, start with an ordinary weapon | CONFIRM | Owner confirms. Rule R-SETUP-14 |
| D23 | Red players do not know each other, except that Hacker knows Undercover | CONFIRM | Owner confirms. Rule R-SETUP-12 |
| D24 | Disablers may be used from Round 1 | CONFIRM | Owner confirms. Rule R-ROLE-17 |
| D25 | Undercover may grant Protection every round | CONFIRM | Owner confirms. Rule R-PROT-08 |
| D26 | A Protection granted in Round 5 never becomes active | CONFIRM | Owner confirms. Rule R-PROT-07 |
| D27 | Jail has no time limit and continues in the Final Zone | CONFIRM | Owner confirms. Rules R-VOTE-08, R-SHOW-10 |
| D28 | A correct Code with no Healthy Red player wins nothing, and removes Blue's Power victory | CONFIRM | Owner confirms. Rule R-WIN-13 |
| D29 | A cast ballot cannot be replaced | CONFIRM | Owner confirms the reading of "one final ballot". Rule R-VOTE-09 |

### Crosswalk to the integration register

| Integration ID (`docs/decisions.md`) | This register | Owner decisions | State |
| --- | --- | --- | --- |
| RULE-001 | D04 | V1-06 | Resolved |
| RULE-002 | D05 | V1-07 | Resolved |
| RULE-003 | D09 | V1-14, V1-16, V1-17, V1-18 | Resolved |
| RULE-004 | D01 | V1-01, V1-02 | Resolved |
| RULE-005 | D02 | V1-03, V1-04 | Resolved |
| RULE-006 | D03 | V1-05 | Resolved |
| RULE-007 | D06 | V1-08 | Resolved |
| RULE-008 | D07 | V1-09, V1-10, V1-11, V1-20 | Resolved |
| RULE-009 | D08 | V1-12, V1-21 | Resolved |
| RULE-010 | D10 | None | Open |
| None | D11 to D20 | None | Open, found by this audit |
| None | D21 to D29 | None | Working readings to confirm |

`docs/decisions.md` is pinned by the bootstrap lock and still lists RULE-001 to RULE-009 as unresolved. Request BAL-REQ-3 in [integration-requests.md](integration-requests.md) asks Codex Integration to add D11 to D29 to the current register.

### Every owner decision and where the rulebook carries it

| Decision | Rulebook rules |
| --- | --- |
| V1-01 | R-SETUP-05, R-SETUP-07 |
| V1-02 | R-STATE-07, R-STATE-08, R-VOTE-07, R-MOVE-06 |
| V1-03 | R-MOVE-04, R-CAPT-05, R-CAPT-14, R-MOVE-06 |
| V1-04 | R-CAPT-06 |
| V1-05 | R-ROLE-04 |
| V1-06 | R-ACT-06 |
| V1-07 | R-RES-02 |
| V1-08 | R-ROLE-15, R-WIN-06 |
| V1-09 | R-FLOW-07, R-FLOW-08, R-VOTE-02, R-SHOW-04 |
| V1-10 | R-CAPT-04, R-VOTE-02, R-VIEW-01, R-FLOW-11 |
| V1-11 | R-FLOW-07, R-VOTE-05 |
| V1-12 | R-OPS-01, R-OPS-02 |
| V1-13 | R-ACT-01, R-ACT-04, R-SHOT-04, R-HACK-02 |
| V1-14 | R-ROLE-14 |
| V1-15 | R-ACT-07, R-SHOT-05, R-PROT-05 |
| V1-16 | R-ROLE-07, R-ROLE-08 |
| V1-17 | R-PROT-06, R-VIEW-06 |
| V1-18 | R-RES-05, R-VIEW-08 |
| V1-19 | R-RES-03, R-WIN-08 |
| V1-20 | R-SHOW-07 |
| V1-21 | R-OPS-03 |

## Points where two sources pull apart

These are settled by precedence. They are listed because a table of players is likely to be surprised by them.

1. **Command Room protection and the location lock.** `movement#/command_room_immunity` says the room protects a player "while inside". V1-06 says protection is checked at registration and not again. Under V1-06 a Captain who is targeted outside the room and then walks in is still hit. V1-06 is later and governs. Scenario `LOCK-03` pins this.
2. **Movement and the same-location rule.** A target who changes rooms after being targeted is still hit, and so is a target who was voted into Jail first. Players cannot dodge an attack by moving. `LOCK-01` and `LOCK-02` pin both.
3. **"One final ballot."** V1-09 says "accept final inputs until the deadline" and V1-10 says "one final ballot per player per phase". The gap being answered was whether a ballot can be replaced, and the reading here is that it cannot (D29).
4. **The first election.** The baseline places it at the "end of Round 1". Every later election is "at the start of the next round". They are the same boundary. A table display may label it either way; D16 asks whether movement is open during it.
5. **Rescue and Jail.** The baseline says healing does not release from Jail, which suggests a Jailed player can be healed. Under the same-location rule and V1-05 Cracker can reach Hospital but not Jail. A Jailed and Injured player is therefore healed only by a Rescue that was registered before they were jailed in that same round. Scenario `RESC-08` shows the one path.

## Structural consequences

Everything in this section follows from the audited rules by counting. Nothing here was observed in play, and none of it is a balance finding. Each item is something a human playtest should watch for. The arithmetic is reproducible with `npm run facts --workspace @mothership/balance`.

### Attacks, eliminations and what can end a match

Each attack deals one damage and elimination needs two. With powers off the attack sources are Undercover's weapon, Supplier's two weapons, Blue Disabler, Red Disabler and Officer's shot. The counts below rest on the working reading D22, that no other role starts armed. One more starting weapon would raise every attack count by one and would make S-05 a matter of exact play instead of impossibility.

| Quantity | 7 players | 8 players | 9 players |
| --- | --- | --- | --- |
| Attacks before the showdown | 4 | 5 | 6 |
| Most eliminations possible before the showdown | 2 | 2 | 3 |
| Attacks Red needs to eliminate every Blue player | 8 | 8 | 10 |
| Attacks needed to eliminate every Red player | 4 | 6 | 6 |
| Damage needed to eliminate every player except Alien | 12 | 14 | 16 |
| Most damage a whole match can deal, showdown included | 11 | 13 | 15 |

- **S-01. Hospital and Jail are safe from attack in normal rounds.** An attacker must share the target's location (R-ACT-02). Nobody can choose to enter Hospital or Jail (R-MOVE-02, R-MOVE-04), an Injured player cannot attack (R-STATE-03) and a Jailed player cannot attack (R-STATE-04). An Injured player is moved to Hospital in the same resolution that injured them (R-STATE-06). So an attack can never be registered against a player who is already Injured.
- **S-02. Before the showdown, a player is eliminated only by two attacks registered against them in the same round.** This follows from S-01. The attack counts cap this at 2, 2 and 3 eliminations.
- **S-03. Red cannot win by elimination before the showdown in any mode. Blue cannot with eight players, and with seven or nine only if Red's own attacks are used on Red players.** With seven players all four attacks would be needed, and one of them is Undercover's weapon. With nine all six would be needed, including Undercover's weapon and Red Disabler.
- **S-04. In normal play a match is decided at the end of Round 5, by the Code or by Power, or it goes to the showdown.** This follows from S-03.
- **S-05. Alien cannot win alone in any mode.** Winning alone needs every other player eliminated in one stage (R-WIN-08). The whole match can deal at most the attacks above plus one special shot per participant: 11, 13 and 15 damage against the 12, 14 and 16 needed. The condition is always one damage short. Alien's only way to win is with Blue.

### Other consequences

- **S-06. A Captain inside Command Room can neither be attacked nor act on anyone.** They can still be voted into Jail (R-CAPT-08, R-CAPT-11, R-CAPT-12).
- **S-07. Supplier is a single point of failure for Blue's weapons.** If Supplier is Injured or Jailed on their Round 3 turn, or (pending D11 and D12) has too few players in the room, no weapon is distributed in that match. Red Disabler can injure Supplier from Round 1 with eight or nine players.
- **S-08. Up to five players can be in Jail by the Round 5 check.** There is one Jail vote per round and it resolves before that round's victory check (R-RES-01). The Round 5 vote therefore changes Power at the last moment.
- **S-09. Turn order changes opportunities, not outcomes.** With powers off the order inside the attack stage cannot change anyone's health (R-RES-04), and the same holds for the showdown order. Turn order still matters before resolution: only the first two Hack requests of a round are granted (R-HACK-01), and later players act knowing earlier public moves.
- **S-10. Undercover can protect at most four players usefully.** One grant per round, and a Round 5 grant never activates (R-PROT-07, R-PROT-08).
- **S-11. The Insider and the Alien have no role action.** Their agency is speech, votes, movement, one Hack and any weapon Supplier gives them.

### How much the Hacker can learn from Scans alone

The table gives the best probability of submitting the exact Code that any choice of Scan targets can reach, as a function of how many Scans succeeded. A Scan succeeds only when the target is reachable and the faction guess is right, and Hacker has at most five Scans, one per round.

| Successful Scans | 7 players | 8 players | 9 players |
| --- | --- | --- | --- |
| 0 | 4 in 50 (8.0%) | 4 in 120 (3.3%) | 4 in 245 (1.6%) |
| 1 | 8 in 50 (16.0%) | 8 in 120 (6.7%) | 8 in 245 (3.3%) |
| 2 | 15 in 50 (30.0%) | 16 in 120 (13.3%) | 16 in 245 (6.5%) |
| 3 | 25 in 50 (50.0%) | 31 in 120 (25.8%) | 32 in 245 (13.1%) |
| 4 | 38 in 50 (76.0%) | 56 in 120 (46.7%) | 63 in 245 (25.7%) |
| 5 | 50 in 50 (100%) | 90 in 120 (75.0%) | 115 in 245 (46.9%) |

- **S-12. From Scans alone, Hacker can be certain of the Code only with seven players, and only if all five Scans succeed.** With eight or nine players certainty is out of reach by Scans.

This is exact counting under four assumptions: Hacker knows only their role and the Undercover; roles are dealt uniformly; the three other Code numbers are drawn with equal chance (D21); and only successful Scans carry information. It ignores everything people say and do. It is not a Red win rate and not a claim that any mode favours a side.

### How long a match lasts by the clock alone

Every window is 60 seconds and none closes early (R-FLOW-05 to R-FLOW-07).

| Quantity | 7 players | 8 players | 9 players |
| --- | --- | --- | --- |
| Shortest match with nobody eliminated and one election | 41 min | 46 min | 51 min |
| With a Hack per player, an election before each of Rounds 2 to 5, four release choices, one release vote and a showdown | 57 min | 63 min | 69 min |

- **S-13. A match with nobody eliminated cannot be shorter than 41, 46 or 51 minutes, however quickly people act.** D17 asks whether a turn may end early. Teaching, setup and discussion between phases are extra. This is arithmetic, not a measured duration.

## What this audit does not establish

- It does not show that any engine implements these rules. Execution evidence, with its limits, is in [evidence/](evidence/).
- It does not show that any configuration is balanced, fair or fun. Only human playtests can, under [playtest/protocol.md](playtest/protocol.md).
- It does not approve D10 to D20, and it does not treat D21 to D29 as settled.
- It did not review the archived PDF beyond the background use stated above.

## Test handoff

Scenarios are in `tests/scenarios/v1/`, one file per mode, generated from one catalogue and checked against this register and the rulebook. A scenario is `ready` only when every rule it cites is CONFIRMED, OWNER-V1, DERIVED or CONDUCT. A scenario that depends on D10 to D20 is `blocked`: it carries no expected result, and at most a probe that records what an engine currently does. The 35 specifications of the pinned [scenario-matrix.json](scenario-matrix.json) are traced one by one in [scenario-traceability.md](scenario-traceability.md).
