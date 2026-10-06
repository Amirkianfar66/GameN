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

Source precedence puts the latest recorded owner decision first, so this audit applies V1-01 to V1-21. The approval is on record in three places: issue #13; the approved sheet `docs/backend/v1-rule-decisions-proposal.md` on PR #16, headed "CONFIRMED on 6 October 2026"; and the integration review of 6 October, which states that V1-01 to V1-21 remain approved. The first revisions of this audit asked the owner to confirm the approval once more. That request is withdrawn: the approval stands and is not asked again.

Two limits remain, and both are about the file and not about the approval:

1. Citations of the form `v1#V1-nn` cannot be verified against a file at the base commit. The check verifies them when the overlay file is present and reports them as unverifiable otherwise. They were verified in full on a scratch merge with the current integration candidate; the evidence report records it.
2. If the overlay changes before it is merged, the OWNER-V1 rows and the scenarios that cite them must be reviewed again.

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

This register continues the D numbers of the earlier audit. After the integration review of 6 October it was triaged against the approved decisions V1-01 to V1-21: nothing here asks the owner to approve again what is already approved, and nothing here is adopted as a rule because Balance prefers it.

| Status | Meaning | Asked of the owner |
| --- | --- | --- |
| RESOLVED | An approved decision or a confirmed source states the answer | Nothing |
| READING | The approved sources give the answer when read closely, although no one sentence says it. The rulebook states it as a DERIVED rule, scenarios run against it, and the current engine does the same | Nothing. A reading is listed so that anyone who reads the sources differently can say so. Deciding one differently would be a rule change |
| OPEN | An open rule edge: no approved source answers it. The rulebook states no behaviour and the scenarios that touch it are blocked. What the current build does is recorded as an observation and is not canon | A decision, whenever the owner chooses to make one. The nine open edges are consolidated in one sheet below |
| DEFERRED | Outside Version 1 | Nothing for Version 1 |

| ID | Topic | Status | What settles it, or what is known |
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
| D10 | How Original Powers are dealt with seven or nine players, and how they meet the showdown's special shots | DEFERRED | Outside Version 1: Original Powers are off, and their detailed behaviour is not part of Version 1 acceptance. To be audited with a separate versioned suite before any powers-on mode. Rule R-POW-02 |
| D11 | May Supplier name themself as one of the two recipients? | OPEN | V1-13 lists who may target themself and does not mention Supplier; V1-16 does not exclude it. The current build accepts it |
| D12 | What may Supplier do with fewer than two eligible recipients in the same location? | OPEN | The sources require two different recipients and say nothing about one. The current build accepts the one neighbour together with Supplier, which is D11 again |
| D13 | A tied Captain election repeats without limit | RESOLVED | V1-04 and the baseline say so: a required runoff "repeats among tied candidates", "until one candidate has the highest vote", and "an all-abstain ballot elects nobody". A limit or a tie-break would be a new rule, and none is proposed. Rule R-CAPT-13. What it can mean at a table is noted under S-16 |
| D14 | A Healthy but Jailed player counts as a Healthy member for winning | READING | The requirement says "at least one Healthy member"; Jail "is separate from health" in the baseline and in V1-02; only the Power formula sets Jailed players to zero. The current engine does the same, deliberately. It decides matches, so it is spelled out as consequence S-14. Rule R-WIN-11 |
| D15 | What ends a match in which no victory condition can still be met | RESOLVED | The existing structure answers it: five rounds, then the showdown, then a result or a Draw. Nothing ends a match early except a victory or a host abort. A rule that ended such a match early would be a new rule, and none is proposed. Rule R-WIN-12, and consequence S-15 |
| D16 | May a player move while a Captain election is being voted? | OPEN | Movement is allowed "before voting begins"; the election is a vote held between two rounds. The current build accepts the move |
| D17 | Windows that might be shorter: may a player end their turn or a Hack conversation early, and does the release-choice window close when the Captain has chosen? | OPEN | V1-09 keeps vote windows open to the deadline and is silent about the rest. In the current build no window closes before its deadline |
| D18 | Format of a Standard Hack conversation: who asks, how many questions, what if a player declines | OPEN | Only "Yes / No" and the truth rule are stated. A conduct rule for the table; software has no part in it |
| D19 | What may an Eliminated player say or show at the table? | OPEN | No source covers table conduct after elimination. A conduct rule for the table; software has no part in it |
| D20 | Is a round's turn order announced in advance or revealed one turn at a time? | OPEN | The order is drawn each round; its visibility is not stated. The current public view names only the player whose turn it is |
| D21 | The three other Code numbers are drawn with equal chance from the eligible players | READING | The baseline says they are "selected from the remaining players" and names no method; the server draws them. Equal chance is the plain meaning of a draw. No scenario depends on it. Rule R-SETUP-16 |
| D22 | Only Undercover, and Officer with nine players, start with an ordinary weapon | READING | The sources give a starting weapon to those two roles and to no other. Backend's handoff says the same: "only explicitly sourced starting ammunition is initialized". Rule R-SETUP-14 |
| D23 | Red players do not know each other, except that Hacker knows Undercover | READING | The sources list what each role knows at the start. None gives a Red player another Red player's identity except Hacker's knowledge of Undercover. Rule R-SETUP-12 |
| D24 | Disablers may be used from Round 1 | READING | The round limit in the sources is on ordinary weapons. The Disabler entries carry none. Rule R-ROLE-17 |
| D25 | Undercover may grant Protection every round | READING | V1-13 allows one Main Action in each own turn and V1-15 one receipt for each recipient. Nothing else limits it. Rule R-PROT-08 |
| D26 | A Protection granted in Round 5 never becomes active | READING | A Protection becomes active "at the start of the next normal round", and the showdown is not a normal round. Rule R-PROT-07 |
| D27 | Jail has no time limit and continues in the Final Zone | READING | The sources end Jail only through the release vote and say that healing does not release. Rules R-VOTE-08, R-SHOW-10 |
| D28 | A correct Code with no Healthy Red player wins nothing, and removes Blue's Power victory | READING | Red's Code victory needs a Healthy Red player, and Blue's Power victory needs that the correct Code was not submitted. Rule R-WIN-13 |
| D29 | A cast ballot cannot be replaced | RESOLVED | V1-10: "One final ballot per player per phase". Rule R-VOTE-09 |
| D30 | A Scan is Hacker's Main Action, so an Injured or Jailed Hacker cannot Scan | READING | V1-13 gives each own turn one role Main Action. The baseline labels every other role action a Main Action and gives Scan no other category. Rule R-ROLE-18 |
| D31 | An ordinary weapon is spent when its shot is registered | READING | V1-15 says so for Rescue, Disabler and Protection, V1-20 for special shots, and the baseline says a blocked attack's resource is used up. Rule R-SHOT-05 |
| D32 | Command Room stops a player inside from targeting themself too | READING | The baseline says players inside "cannot be targeted" by actions, without an exception for their own, and V1-14 gives a Scan no access to Command targets. Rule R-CAPT-15 |
| D33 | A Captain may leave Command Room to either room | READING | V1-03 names both rooms for entering, and the movement decision lets the Captain leave. No source names a room for leaving. Rule R-MOVE-09 |
| D34 | May a showdown participant target themself? | OPEN | V1-13 excludes self-targeting for ordinary shots and does not mention special shots. The current build refuses it |
| D35 | Does a match that the host aborts reveal roles and the Code? | OPEN | V1-18 reveals them "only at match end"; V1-12 calls an abort a recorded result without a winner. The current build reveals neither |
| D36 | Nothing a player enters on their phone is shown to anyone else before the rules reveal it | READING | V1-17 and the baseline keep registrations secret. Three cases are not named in so many words: a Code submission, a Hack request before its conversation opens, and the Captain's release choice before the release vote opens. Rule R-VIEW-07 |
| D37 | A window opens only when someone can use it: no election without an eligible candidate, and no release choice without a Captain, an unused request and a prisoner | READING | V1-04 says to "continue without Captain" when no eligible candidate exists, and V1-11 gives the choice window to a Captain who "may use" the request. Backend's handoff describes the same: "a Captain with an unused release opportunity can select one prisoner". Rule R-FLOW-13 |
| D38 | A release takes effect when the release vote closes | READING | The release vote comes before the Jail vote and the end-of-round order has no release step; V1-02 gives the freed player's destination but no moment. The freed player can then be voted back into Jail in the same round. Rule R-VOTE-10 |

### Open rule edges, consolidated

These are the nine questions the integration review named as open. They are gathered here so that the owner can take them in one sitting, grouped where two belong together. The sources are quoted, and what the current build does is what the draft engine did at commit `8d4a2e5`, which is unchanged in the candidates the integration review ran.

| Edge | Decisions | What the approved sources say | What the current build does | Kind |
| --- | --- | --- | --- | --- |
| Whom Supplier may arm | D11, D12 | V1-16: two different recipients in Supplier's location, not Eliminated, with no role refused. V1-13 lists who may and may not target themself and does not mention Supplier | Accepts Supplier as one of the two. With one other player in the room it accepts that player together with Supplier, and refuses a recipient in another room | Clarification of current behaviour. It matters: naming themself guarantees Blue one weapon, and a Supplier without two recipients arms nobody (S-07) |
| Moving during a Captain election | D16 | Movement is allowed once a round "at any time before voting begins". The election is a vote held between two rounds | Accepts the move | Clarification of current behaviour |
| Windows that close early | D17 | V1-09: vote and showdown windows close at the deadline even if everyone has answered. Turns and Hack conversations last 60 seconds. Nothing says a player may end one early, or that the Captain's choice closes its window | No window closes before its deadline. After the Captain has chosen, the choice window stays open until it expires | Clarification of current behaviour. It sets the pace: 41, 46 and 51 minutes of windows at the least (S-13) |
| Conduct at the table | D18, D19 | A Hack question is answered Yes or No under the truth rule. Who asks, how many questions, and a refusal to answer are not covered. Nothing covers what an Eliminated player may say or show | Nothing: the Hack is a 60-second phase for the two players, and an Eliminated player has no turn, vote or shot | A rule for the table still to be written. There is no software behaviour to confirm |
| Announcing the turn order | D20 | The order is drawn at random at the start of each round. Whether it is announced is not stated | The public view names only the player whose turn it is. Backend has deferred a public turn-order field to a later contract | Clarification of current behaviour |
| A special shot at oneself | D34 | V1-13 excludes self-targeting for ordinary shots, Disabler attacks and Hack. The showdown rule has every participant register "a target" | Refuses it | Clarification of current behaviour |
| What an aborted match shows | D35 | V1-18: exact roles and the Code are disclosed "only at match end". V1-12: an abort produces a recorded result "without a winner" | Shows neither roles nor the Code. Backend's handoff says so | Clarification of current behaviour |

None of these is an engine defect. Until the owner decides one, it is not a rule: the rulebook states no behaviour for it, the scenarios that touch it are blocked, and the build's present behaviour is an implementation choice that this audit records and does not adopt. If the owner is content with what the build does, saying so turns the edge into a rule without changing any code.

A first table will meet D17 (pace), D18 and D19 (what people may say), D20 (who plays next) and, in Round 3, D11 and D12 (whether Blue gets its weapons). D16, D34 and D35 are corners.

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
| RULE-010 | D10 | None | Deferred: outside Version 1 |
| None | D13, D29 | V1-04, V1-10 | Resolved |
| None | D15 | None | Resolved by the existing five-round and showdown structure |
| None | D11, D12, D16 to D20, D34, D35 | None | Open rule edges |
| None | D14, D21 to D28, D30 to D33, D36 to D38 | None | Readings of approved sources; no decision asked |

`docs/decisions.md` is pinned by the bootstrap lock and still lists RULE-001 to RULE-009 as unresolved. Backend's current register, `docs/backend/v1-decision-register.md` on PR #16, supersedes it for V1-01 to V1-21 and points here for the audit. Request BAL-REQ-3 in [integration-requests.md](integration-requests.md) asks Codex Integration to carry the nine open rule edges in that register, or to link this one.

### Every owner decision and where the rulebook carries it

| Decision | Rulebook rules |
| --- | --- |
| V1-01 | R-SETUP-05, R-SETUP-07 |
| V1-02 | R-STATE-07, R-STATE-08, R-MOVE-06, R-VOTE-07 |
| V1-03 | R-MOVE-04, R-MOVE-06, R-CAPT-05, R-CAPT-14 |
| V1-04 | R-CAPT-06, R-CAPT-13 |
| V1-05 | R-ROLE-04 |
| V1-06 | R-ACT-06 |
| V1-07 | R-RES-02 |
| V1-08 | R-ROLE-15, R-WIN-06 |
| V1-09 | R-FLOW-07, R-FLOW-08, R-VOTE-02, R-VOTE-06, R-SHOW-04 |
| V1-10 | R-FLOW-11, R-CAPT-04, R-VOTE-02, R-VOTE-06, R-VOTE-09, R-VIEW-01, R-VIEW-02 |
| V1-11 | R-FLOW-07, R-VOTE-05 |
| V1-12 | R-OPS-01, R-OPS-02 |
| V1-13 | R-ACT-01, R-ACT-04, R-SHOT-04, R-HACK-02 |
| V1-14 | R-ROLE-14 |
| V1-15 | R-ACT-07, R-PROT-05 |
| V1-16 | R-ROLE-07, R-ROLE-08, R-VIEW-02 |
| V1-17 | R-ACT-08, R-PROT-06, R-VIEW-01, R-VIEW-02, R-VIEW-06 |
| V1-18 | R-RES-05, R-VIEW-08 |
| V1-19 | R-RES-03, R-WIN-08 |
| V1-20 | R-SHOW-07 |
| V1-21 | R-OPS-03 |

## Points where two sources pull apart

These are settled by precedence. They are listed because a table of players is likely to be surprised by them.

1. **Command Room protection and the location lock.** `movement#/command_room_immunity` says the room protects a player "while inside". V1-06 says protection is checked at registration and not again. Under V1-06 a Captain who is targeted outside the room and then walks in is still hit. V1-06 is later and governs. Scenario `LOCK-03` pins this.
2. **Movement and the same-location rule.** A target who changes rooms after being targeted is still hit, and so is a target who was voted into Jail first. Players cannot dodge an attack by moving. `LOCK-01` and `LOCK-02` pin both.
3. **"One final ballot."** V1-09 says "accept final inputs until the deadline" and V1-10 says "one final ballot per player per phase". The gap being answered was whether a ballot can be replaced, and V1-10 settles that it cannot (D29).
4. **The first election.** The baseline places it at the "end of Round 1". Every later election is "at the start of the next round". They are the same boundary. A table display may label it either way; D16 asks whether movement is open during it.
5. **Open voting and private ballots.** The baseline's notes on the physical table list "public voting" among the things to emphasize. V1-10 makes each ballot private and publishes only the totals. V1-10 governs. A table used to a show of hands will notice.
6. **A block the table may know about.** The baseline's Protection entry says a public block event "may be known". V1-17 gives no block cue to anyone but Undercover. V1-17 governs.
7. **Rescue and Jail.** The baseline says healing does not release from Jail, which suggests a Jailed player can be healed. Under the same-location rule and V1-05 Cracker can reach Hospital but not Jail. A Jailed and Injured player is therefore healed only by a Rescue that was registered before they were jailed in that same round. Scenario `RESC-08` shows the one path.

## Structural consequences

Everything in this section follows from the audited rules by counting. Nothing here was observed in play, and none of it is a balance finding. Each item is something a human playtest should watch for. The arithmetic is reproducible with `npm run facts --workspace @mothership/balance`.

### Attacks, eliminations and what can end a match

Each attack deals one damage and elimination needs two. With powers off the attack sources are Undercover's weapon, Supplier's two weapons, Blue Disabler, Red Disabler and Officer's shot. The counts below rest on reading D22, that no other role starts armed. One more starting weapon would raise every attack count by one and would make S-05 a matter of exact play instead of impossibility.

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
- **S-14. A side can win while every one of its Healthy players is in Jail.** A Jailed player adds nothing to Power but is still a Healthy member (R-WIN-11, reading D14). With every Healthy Blue player in Jail, Blue still wins on Power if a free and Healthy Alien outweighs Red, and still wins by elimination. Scenarios `WIN-06` and `SHOW-16` pin both. The rule is the same for Red: a Jailed but Healthy Red player satisfies the requirement for a Code win. No scenario pins that side. It follows from the approved text; it is listed because a table may not expect it.
- **S-15. Before the showdown, at least one Blue or Red player is always Healthy.** To leave both sides without a Healthy player, every Blue and Red player must be hit at least once: 6, 7 and 8 attacks, against the 4, 5 and 6 that exist before the showdown. A match that neither side can still win therefore cannot arise before the Round 5 check, and the showdown ends the match with a result or a Draw. Nothing is needed to end such a match early (R-WIN-12).
- **S-16. A tied Captain election has no end but the table's own.** Each runoff is one more 60-second window, and the approved rule repeats it for as long as the tie lasts (R-CAPT-13). A runoff in which nobody votes ends it without a Captain. A playtest should record how often this happens and how long it takes.

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

## Revisions of the rulebook

### Revision 2

Revision 1 of the rulebook and of the scenarios was pushed to this branch earlier on 6 October, as commit `61e47a3`. Before any review was requested, three independent checks were made. One read every rulebook row against the sources it cites. One derived every ready eight-player scenario again by hand, from the rulebook alone. One then did the same, in all three modes, for the scenarios that the first two had caused to be added or changed. Revision 2, `rulebook-v1-2026-10-06-r2`, is the result. No source changed, and no rule that a source states changed. The rulebook went from 155 rows to 165.

| What changed | Rows |
| --- | --- |
| Reworded, because the first wording contradicted another row or a source | R-WIN-09: the Code and Power conditions are checked at the Round 5 check and again after the showdown. R-STATE-03, R-STATE-04 and R-SETUP-14: "may not shoot" means an ordinary shot; the showdown's special shot is the exception. R-STATE-08: a healed player who is Jailed stays in Jail |
| Moved from OPEN to a reading, because the sources answer when read closely | R-CAPT-13 with D13, R-WIN-11 with D14 |
| Lowered to DERIVED, because no source says it in those words | R-FLOW-03, and R-SHOT-05 with D31 |
| Marked OWNER-V1 instead of CONFIRMED, because the stated rule comes from the owner decision | R-SETUP-15, R-ACT-08, R-VOTE-06, R-VIEW-02, R-POW-01 |
| Added as readings | R-ROLE-18 with D30, R-CAPT-15 with D32, R-MOVE-09 with D33, R-FLOW-13 with D37 and R-VOTE-10 with D38. R-VIEW-07 now names what it covers and cites D36 |
| Added as derived statements | R-ACT-09, R-ROLE-19, R-VIEW-09 |
| Added as open questions | R-SHOW-11 with D34 and R-VIEW-10 with D35. R-FLOW-09 with D17 now also asks whether the release-choice window closes when the Captain has chosen |
| Said less, or said the way the source says it, because the first wording claimed more | R-SETUP-07, R-FLOW-07, R-MOVE-06, R-ROLE-13, R-SHOW-06, R-VIEW-01, R-VIEW-08, R-OPS-01 |
| Completed from the cited source, or cross-referenced | R-FLOW-08, R-STATE-06, R-STATE-09, R-CAPT-10, R-HACK-05, R-RES-02, R-WIN-01, R-OPS-03 |
| Citations made more exact, text unchanged | R-SETUP-05, R-STATE-02, R-STATE-07, R-ROLE-02, R-ROLE-12, R-ROLE-16 |

The scenarios changed with revision 2. Neither hand derivation found a wrong expected result or wrong arithmetic. They found expectations that no rule implies, cases that did not exercise the rule they named, working readings used without being named, and titles that claimed more than the steps show; the corrections are listed in the [evidence report](evidence/2026-10-06-baseline.md#9-corrections).

### Revision 3

The integration review of 6 October read revision 2 at commit `dedfe69` and asked that Balance's requests be triaged against the approved decisions instead of asking the owner to approve the same rules again, and that Balance's hypotheses not be adopted silently. Revision 3, `rulebook-v1-2026-10-06-r3`, does that. No source changed, and no rule that a source states changed. The rulebook still has 165 rows.

| What changed | Rows and decisions |
| --- | --- |
| Resolved by an approved decision; no longer a reading | R-CAPT-13 is OWNER-V1 under V1-04 (D13). R-VOTE-09 is OWNER-V1 under V1-10 (D29) |
| Answered by the existing structure; no longer open | R-WIN-12 states that nothing ends a match early (D15). The blocked case that waited on it is withdrawn |
| Outside Version 1 | D10, Original Powers. R-POW-02 says so |
| Readings no longer ask for approval | D14, D21 to D28, D30 to D33 and D36 to D38 are READING. The sixteen readings carry seventeen rules, whose text is unchanged |
| The approval of V1-01 to V1-21 is no longer asked again | Section 1 of the rulebook and the provenance section of this audit |
| Open rule edges consolidated | D11, D12, D16 to D20, D34 and D35, in one sheet under the register |

## What this audit does not establish

- It does not show that any engine implements these rules. Execution evidence, with its limits, is in [evidence/](evidence/).
- It does not show that any configuration is balanced, fair or fun. Only human playtests can, under [playtest/protocol.md](playtest/protocol.md).
- It does not answer any open rule edge, and it adopts none of the build's present answers as canon. Its readings are readings: the approved sources and the owner's decisions govern, not this audit.
- It did not review the archived PDF beyond the background use stated above.

## Test handoff

Scenarios are in `tests/scenarios/v1/`, one file per mode, generated from one catalogue and checked against this register and the rulebook. A scenario is `ready` only when every rule it cites is CONFIRMED, OWNER-V1, DERIVED or CONDUCT. A scenario that depends on an OPEN decision is `blocked`: it carries no expected result, and at most a probe that records what an engine currently does. A scenario that depends on a reading is ready and names the rule that carries the reading, so that every such scenario can be found if the reading is ever decided differently. The 35 specifications of the pinned [scenario-matrix.json](scenario-matrix.json) are traced one by one in [scenario-traceability.md](scenario-traceability.md).
