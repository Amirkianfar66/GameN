# Mothership rulebook: in-person Version 1 base game

**Rulebook version:** `rulebook-v1-2026-10-06-r3`. **Scope:** people playing together in person, 7, 8 or 9 players, optional Original Powers off.
**Maintainer:** Game Design and Balance (issue [#5](https://github.com/Amirkianfar66/GameN/issues/5)). **Canon is decided by the game owner.**

This is the one document every agent reads to learn how the game plays. It consolidates the rule sources into a single ordered text so that Backend, Frontend, Designer and Balance implement, draw, test and explain the same game. It does not create rules. Each row cites the source that makes it true, and `npm run check --workspace @mothership/balance` verifies that every citation resolves in the pinned source files.

If this document and a rule source disagree, the source wins and this document has a defect: report it on issue #5. Do not edit a rule here to make a test pass or a screen simpler.

This is revision 3. Revision 2 followed independent checks of revision 1 against the sources. Revision 3 follows the integration review of 6 October 2026: the decision register was triaged against the approved decisions, so that nothing already approved is asked again, and three rows changed status. No source changed and no rule that a source states changed. Both lists of changes are in [rules-audit-v1.md](rules-audit-v1.md#revisions-of-the-rulebook).

## 1. Authority, pins and how to read a rule

| Layer | Source | Pin |
| --- | --- | --- |
| Owner decision of 6 October 2026 | `rules/overlays/in-person-v1-owner-decisions-2026-10-06.json`, decisions V1-01 to V1-21 | SHA-256 `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`; ruleset `in-person-v1-2026-10-06` |
| Confirmed overlays of 26 September 2026 | Six files in `rules/overlays/` | Listed in `rules/source-manifest.json` |
| Baseline, where not superseded | `rules/sources/v2.1-decisions.json` | Listed in `rules/source-manifest.json` |
| Source manifest | `rules/source-manifest.json` | SHA-256 `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc` |

The table is in order of precedence: where two rows differ, the upper row applies. Architecture documents, the Canvas, the board drawing and prototype defaults are not rules.

**V1-01 to V1-21 are approved. The file that records them is not yet on `main`.** The owner approved all 21 decisions on 6 October 2026 with the answer "Use the proposed V1 decisions": issue [#13](https://github.com/Amirkianfar66/GameN/issues/13) and the approved sheet on PR [#16](https://github.com/Amirkianfar66/GameN/pull/16) record it, and the integration review of 6 October restates it. At the reviewed baseline `333c9e820f362a211352bc689372663f29b73ac4` the overlay file does not exist; it is on the draft branch `codex/backend-v1-core` (commit `8d4a2e5dc47eb827dbcbfd8382755db2fa3b0bde`). Rows marked OWNER-V1 cite that file. The delivery priority itself, in-person Version 1 before remote Version 2, is issue [#9](https://github.com/Amirkianfar66/GameN/issues/9); it changes no rule.

Every rule has a status:

| Status | Meaning | What an implementer does |
| --- | --- | --- |
| CONFIRMED | Stated by a pinned rule source | Implement exactly |
| OWNER-V1 | Stated by an owner decision V1-01 to V1-21 | Implement exactly; cite the V1 ruleset pin |
| DERIVED | Follows from the cited rules; adds no behaviour. A DERIVED row that cites a decision number is a reading: what the approved sources say when read closely, although no one sentence says it. No approval is asked for a reading. Changing one would be a rule change | Implement; raise it if you read the sources differently |
| CONDUCT | Binding on players; software cannot verify it | Show it as instruction; never claim to enforce it |
| OPEN | An open rule edge: no approved source answers it | Do not present any behaviour as approved. What a build does today is an implementation choice, not canon. The scenario stays blocked |

Source references read `key#/json/pointer`. The keys are `baseline`, `consolidated`, `direct_shot`, `showdown`, `board`, `movement` and `modes` for the seven pinned files. `v1#V1-nn` names an owner decision, and `v1#/pointer` a field of the owner-decision file. The decision register with every D number is in [rules-audit-v1.md](rules-audit-v1.md).

## 2. The game in one page

Mothership is a hidden-role game played face to face around a public board, with each player's phone holding their secrets. Blue wins by ending Round 5 stronger than Red, or by eliminating every Red player. Red wins by submitting the secret Code, or by eliminating every Blue player. One Alien belongs to neither side and wins when Blue wins.

A match is five rounds. In each round every player takes a 60-second turn to speak and, if their role allows, secretly register an action or a shot. Once per match a player may also take one other player aside for a private yes-or-no exchange. Players may change rooms once per round. After the turns everyone votes on sending one player to Jail. Then the phone app resolves the round: the vote first, then every registered attack and action, then healing.

Damage is slow. One hit injures; a second hit eliminates. Injured and jailed players stop counting toward their side's strength but still talk and vote. At the end of Round 5 Red wins if its Hacker submitted the right Code, and Blue wins if it is stronger. If neither is true, everyone left gets one last shot in a final showdown, and the result is a win or a draw.

This page is a summary and leaves conditions out. The numbered rows below are the rules; where the summary is shorter than a row, the row governs.

## 3. Setup

Three configurations exist. They are different games for balance purposes and their evidence is never pooled.

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-SETUP-01 | A match has exactly 7, 8 or 9 players. There is no six-player mode and no other count. | CONFIRMED | `modes#/supported_player_counts_for_testing`, `modes#/six_player_mode` |
| R-SETUP-02 | Seven players: Blue has Insider, Cracker, Blue Disabler and Supplier. Red has Undercover and Hacker. One Alien. | CONFIRMED | `modes#/modes/7` |
| R-SETUP-03 | Eight players: the seven-player roles plus Red Disabler on Red. | CONFIRMED | `modes#/modes/8` |
| R-SETUP-04 | Nine players: the eight-player roles plus Officer on Blue. Officer exists only in the nine-player game. | CONFIRMED | `modes#/modes/9`, `modes#/officer/availability`, `modes#/officer/team` |
| R-SETUP-05 | Each player holds exactly one role, each role is held by exactly one player, and roles are secret. Roles are dealt at random and do not depend on the room a player chose. | OWNER-V1 | `v1#V1-01`, `modes#/modes`, `baseline#/player_setup/physical_components` |
| R-SETUP-06 | Each player has a public player number, shown by a numbered seat card and a neutral numbered token. | CONFIRMED | `baseline#/player_setup/physical_components`, `board#/physical_information` |
| R-SETUP-07 | Before roles are dealt, each player chooses to start in Room A or Room B. | OWNER-V1 | `v1#V1-01` |
| R-SETUP-08 | The Code is a set of four different player numbers with no order. It always contains the Alien's number and never the Undercover's. The other three numbers come from the remaining players. | CONFIRMED | `baseline#/code` |
| R-SETUP-09 | Insider starts knowing the three players who are Undercover, Alien and Cracker, as a set, without knowing which is which. | CONFIRMED | `baseline#/roles/Insider/ability` |
| R-SETUP-10 | Hacker starts knowing who Undercover is, and therefore that Undercover's number is not in the Code. Hacker knows nothing else about the Code, including whether their own number is in it. | CONFIRMED | `baseline#/roles/Hacker/starting_knowledge` |
| R-SETUP-11 | Alien starts knowing the full Code. | CONFIRMED | `baseline#/roles/Alien/knows_full_code_from_start`, `baseline#/code/known_by_alien_from_start` |
| R-SETUP-12 | No other player starts with knowledge about another player. Red players do not know each other, except that Hacker knows Undercover. Blue players do not know each other. | DERIVED | `R-SETUP-09`, `R-SETUP-10`, `R-SETUP-11`, `D23` |
| R-SETUP-13 | Starting resources: Undercover holds one ordinary weapon. Officer holds one usable shot. Cracker has two Rescues. Blue Disabler and Red Disabler each have one use. Every player has one Standard Hack to initiate. Hacker has one Scan per round and one Code attempt. | CONFIRMED | `baseline#/roles/Undercover/weapon/ordinary_weapon_count`, `modes#/officer/starting_weapon`, `baseline#/roles/Cracker/rescues_per_match`, `baseline#/roles/Blue_Disabler`, `baseline#/roles/Red_Disabler`, `baseline#/standard_hack/personal_initiations_per_match`, `baseline#/roles/Hacker/scan`, `consolidated#/hacker_round_5_code` |
| R-SETUP-14 | No other role starts with an ordinary weapon. Insider, Cracker, Blue Disabler, Supplier, Hacker, Red Disabler and Alien can fire an ordinary shot only with a weapon received from Supplier. | DERIVED | `R-SETUP-13`, `baseline#/roles/Red_Disabler/ordinary_weapon`, `D22` |
| R-SETUP-15 | Original Powers are not dealt in Version 1's base game. The base game is complete without them. | OWNER-V1 | `v1#/optional_powers`, `baseline#/optional_original_power_pack/optional`, `baseline#/optional_original_power_pack/base_game_requires_it`, `baseline#/design_vision/core_principles/5` |
| R-SETUP-16 | The server chooses the three other Code numbers at random and records them with the match. No source fixes the method; drawing each eligible set with equal chance is the reading used here. | DERIVED | `baseline#/code/remaining_three_numbers`, `D21` |

## 4. Rounds, turns and clocks

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-FLOW-01 | A match has five normal rounds. Round 5 is the last. There is no Round 6 and no clock for the whole match. | CONFIRMED | `baseline#/round_structure/normal_rounds`, `baseline#/round_structure/round_6`, `baseline#/design_vision/core_principles/6` |
| R-FLOW-02 | The order in which players take turns is drawn at random at the start of each normal round. | CONFIRMED | `baseline#/round_structure/turn_order` |
| R-FLOW-03 | A round runs in this order: one turn per player, each followed by its Hack conversation if one was requested; the Captain's release choice when the Captain can ask for a release (R-FLOW-13), then the release vote if the Captain asks; the Jail vote; end-of-round resolution. A Captain election, when one is due, is held between two rounds: after Round 1 has resolved for the first Captain, and before the next round's turns for a replacement. | DERIVED | `R-FLOW-05`, `R-FLOW-06`, `R-FLOW-13`, `R-VOTE-05`, `R-VOTE-06`, `R-RES-01`, `R-CAPT-01`, `R-CAPT-07`, `consolidated#/end_of_round_order` |
| R-FLOW-04 | Every player who is not Eliminated takes one turn in every round, in the drawn order. Injured and Jailed players keep their turn to speak. | DERIVED | `baseline#/health_and_status/injury/permissions`, `baseline#/health_and_status/jail/permissions_while_jailed`, `R-FLOW-02` |
| R-FLOW-05 | An ordinary turn is one 60-second window. The player decides how to split it between speaking in public and any action or shot they are allowed. | CONFIRMED | `consolidated#/turn_timing/ordinary_turn_seconds`, `consolidated#/turn_timing/ordinary_turn_use` |
| R-FLOW-06 | A Standard Hack must be requested inside the player's own 60-second turn. It adds a separate 60-second conversation that starts after that minute. The next player's turn follows the conversation. | CONFIRMED | `consolidated#/turn_timing/standard_hack_request`, `consolidated#/turn_timing/standard_hack_conversation_seconds`, `consolidated#/turn_timing/standard_hack_conversation_start` |
| R-FLOW-07 | A Captain election, each runoff, a release vote, a Jail vote and the showdown target registration are each one 60-second window on the server clock, and each closes at its deadline even if everyone has already answered. The Captain's release choice is also one 60-second window. | OWNER-V1 | `v1#V1-09`, `v1#V1-11` |
| R-FLOW-08 | Input is accepted until the deadline; at the deadline the window is closed. Only the server clock counts. A missing ballot is an abstention and a missing showdown target is no shot. The app never invents a vote or a target. | OWNER-V1 | `v1#V1-09` |
| R-FLOW-09 | Whether a player may end their turn or a Hack conversation before the 60 seconds are over, and whether the release-choice window closes as soon as the Captain has chosen, is not decided. | OPEN | `D17` |
| R-FLOW-10 | Whether a round's whole turn order is announced when the round starts, or revealed one turn at a time, is not decided. | OPEN | `D20` |
| R-FLOW-11 | An Eliminated player takes no turn, registers nothing, casts no vote and receives no special shot. | DERIVED | `v1#V1-10`, `showdown#/options/1/participants`, `baseline#/health_and_status/damage_rules` |
| R-FLOW-12 | What an Eliminated player may say or show at the table is not decided. | OPEN | `D19` |
| R-FLOW-13 | A window opens only when someone can use it. No election is held while nobody is an eligible candidate. The Captain's release choice is offered only when there is a Captain, the match's one request is unused and at least one player is in Jail. | DERIVED | `R-CAPT-06`, `R-CAPT-10`, `R-VOTE-05`, `D37` |

## 5. Player state: health, Jail and location

Health, Jail and location are three separate things. A player can be Injured and Jailed at once.

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-STATE-01 | Health is Healthy, Injured or Eliminated. One damage turns Healthy into Injured and Injured into Eliminated. | CONFIRMED | `baseline#/health_and_status/health_states`, `baseline#/health_and_status/damage_rules` |
| R-STATE-02 | Elimination is permanent. Injury does not worsen with time and does not heal by itself. | CONFIRMED | `baseline#/health_and_status/damage_rules/Eliminated`, `baseline#/health_and_status/injury/persistent`, `baseline#/health_and_status/injury/automatic_degradation_over_time` |
| R-STATE-03 | An Injured player may speak, vote, take part in a Standard Hack and, if Hacker, submit the Code in Round 5. An Injured player may not use a Main Action or fire an ordinary shot, and adds nothing to team Power. The exceptions are Cracker's own Rescue (R-ROLE-03) and the showdown's special shot (R-SHOW-02). | CONFIRMED | `baseline#/health_and_status/injury/permissions`, `baseline#/health_and_status/injury/exceptions/0`, `showdown#/options/1/participants` |
| R-STATE-04 | Jail is separate from health: going to Jail does not change a player's health. A Jailed player may speak, vote, take part in a Standard Hack where the other rules allow and, if Hacker, submit the Code. A Jailed player may not use a Main Action or fire an ordinary shot, and adds nothing to team Power. The showdown's special shot is the exception (R-SHOW-02). Being Jailed is public. | CONFIRMED | `baseline#/health_and_status/jail`, `showdown#/options/1/participants` |
| R-STATE-05 | The locations are Room A, Room B, Command Room, Hospital and Jail, plus the Final Zone that exists only for the showdown. | CONFIRMED | `baseline#/locations/locations`, `board#/confirmed_topology/final_zone` |
| R-STATE-06 | A Healthy, free player is in Room A or Room B, or in Command Room if Captain. An Injured player moves to Hospital at the end of the round. A Jailed player is in Jail. In the showdown everyone who is not Eliminated is in the Final Zone instead (R-SHOW-02). | CONFIRMED | `baseline#/locations/assignment_rules`, `movement#/captain_after_leaving` |
| R-STATE-07 | A player who is both Jailed and Injured is in Jail. When released while Injured they go to Hospital. | OWNER-V1 | `v1#V1-02`, `baseline#/locations/assignment_rules` |
| R-STATE-08 | A healed player who is not Jailed returns to the last of Room A or Room B they occupied, at the end of that round's resolution. This uses none of their movement. A healed player who is Jailed stays in Jail (R-VOTE-08). | OWNER-V1 | `v1#V1-02`, `baseline#/health_and_status/jail/rescue_or_heal_does_not_release_jail` |
| R-STATE-09 | No rule limits how many players Room A, Room B, Hospital, Jail or the Final Zone may hold. Command Room is limited by who may enter it (R-MOVE-04), not by a number. | DERIVED | `R-STATE-05`, `R-MOVE-04`, `board#/capacity_note` |

## 6. Movement

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-MOVE-01 | Each eligible player may move once per round, at any moment before voting begins. | CONFIRMED | `movement#/rule` |
| R-MOVE-02 | A voluntary move starts only from Room A, Room B or Command Room. Nobody leaves Hospital or Jail by choice. | CONFIRMED | `movement#/eligible_origin_locations`, `movement#/hospital_and_jail` |
| R-MOVE-03 | A Healthy, free player may move between Room A and Room B. | CONFIRMED | `movement#/room_a_b`, `baseline#/locations/movement/room_a_room_b` |
| R-MOVE-04 | Only the current Captain may enter Command Room. The Captain may enter from Room A or from Room B, using the one move of that round. | OWNER-V1 | `v1#V1-03`, `movement#/command_room_access` |
| R-MOVE-05 | Leaving Command Room does not end the Captaincy. Having left, the Captain cannot return in the same round, because the one move is spent. | CONFIRMED | `movement#/captain_after_leaving`, `movement#/one_move_implication` |
| R-MOVE-06 | Being placed by the game is not a voluntary move and spends nothing: the elected Captain into Command Room, a healed or released player back to a room or to Hospital, and everyone into the Final Zone. | OWNER-V1 | `v1#V1-02`, `v1#V1-03`, `showdown#/shared_location` |
| R-MOVE-07 | Movement is public and is not tied to the mover's own turn. | DERIVED | `R-MOVE-01`, `board#/physical_information` |
| R-MOVE-08 | Whether a player may move while a Captain election is being voted is not decided. | OPEN | `D16` |
| R-MOVE-09 | A Captain who leaves Command Room may go to Room A or to Room B, the two rooms it can be entered from. | DERIVED | `R-MOVE-04`, `movement#/captain_after_leaving`, `D33` |

## 7. Captain and Command Room

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-CAPT-01 | The first Captain is elected at the end of Round 1. | CONFIRMED | `baseline#/captain/first_election` |
| R-CAPT-02 | The candidate with the most votes wins; a majority is not needed. If candidates tie for the most votes, a runoff is held at once among the tied candidates only, and repeats until one has the most votes. | CONFIRMED | `baseline#/captain/election_method` |
| R-CAPT-03 | A candidate must be Healthy, free and not Eliminated. | CONFIRMED | `baseline#/captain/candidate_eligibility` |
| R-CAPT-04 | Every player who is not Eliminated votes, including Injured and Jailed players. A player may vote for themself. Each player casts one final ballot per vote. Ballots stay private; only the totals are published when the window closes. | OWNER-V1 | `v1#V1-10` |
| R-CAPT-05 | The winner becomes Captain and is placed in Command Room. This does not spend their move for the round. | OWNER-V1 | `v1#V1-03` |
| R-CAPT-06 | If nobody is an eligible candidate, or every ballot abstains, nobody becomes Captain. Play continues without a Captain and the election is tried again at the next round boundary. A Captain is never assigned at random. | OWNER-V1 | `v1#V1-04` |
| R-CAPT-07 | The Captain loses the title at once on becoming Injured, Jailed or Eliminated. There is no replacement during the round; one election is held at the start of the next round, however many times the title was lost. | CONFIRMED | `baseline#/captain/loss_of_role`, `baseline#/captain/replacement_timing`, `baseline#/captain/multiple_events_same_round` |
| R-CAPT-08 | A player inside Command Room cannot be targeted by any action or shot. The protection belongs to the room and lasts only while the player is inside. | CONFIRMED | `baseline#/locations/special_access/Command Room`, `movement#/command_room_immunity` |
| R-CAPT-09 | A Captain outside Command Room keeps the title and has no protection from the room. | CONFIRMED | `movement#/captain_after_leaving`, `movement#/command_room_immunity` |
| R-CAPT-10 | Only the current Captain may ask for a prisoner's release, so no prisoner can ask for their own. | CONFIRMED | `baseline#/captain/jail_release_authority`, `baseline#/jail_voting/release_request/jailed_player_cannot_initiate_own_release` |
| R-CAPT-11 | A Captain inside Command Room cannot target another player, because nobody else can be in that room. | DERIVED | `R-ACT-02`, `R-MOVE-04` |
| R-CAPT-12 | Votes do not depend on location. A Captain inside Command Room can be voted into Jail. | DERIVED | `baseline#/locations/same_location_target_rule/not_location_gated`, `R-CAPT-07` |
| R-CAPT-13 | A tied election repeats for as long as it ties. No limit and no tie-break exists, and adding one would be a new rule. A runoff in which every ballot abstains elects nobody (R-CAPT-06). | OWNER-V1 | `v1#V1-04`, `baseline#/captain/election_method/tie_rule` |
| R-CAPT-14 | A player who stops being Captain while Healthy returns to their last room. Jail and injury send them to Jail or Hospital as usual. | OWNER-V1 | `v1#V1-03` |
| R-CAPT-15 | The protection of Command Room covers every action, including one a player inside would aim at themself: a Captain inside cannot Scan, protect or Rescue themself. | DERIVED | `R-CAPT-08`, `R-ROLE-14`, `D32` |

## 8. What a player may do on their turn

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-ACT-01 | On their own ordinary turn a player has three separate opportunities: one role Main Action, one ordinary Shot and one Standard Hack request. Each needs its own resource and eligibility. Using one does not use up another. | OWNER-V1 | `v1#V1-13`, `baseline#/round_structure/player_turn/notes/0` |
| R-ACT-02 | An action aimed directly at another player needs the actor and the target to be in the same location, unless a rule states an exception. This covers Standard Hack, Scan, both Disablers, Rescue, Protection, Supplier's weapons and ordinary shots. | CONFIRMED | `baseline#/locations/same_location_target_rule/rule`, `baseline#/locations/same_location_target_rule/confirmed_for` |
| R-ACT-03 | Location does not matter for Code submission, the Captain election, the Jail vote, the release vote or movement. | CONFIRMED | `baseline#/locations/same_location_target_rule/not_location_gated` |
| R-ACT-04 | Ordinary shots, Disabler attacks and Standard Hack must target another player. Scan, Protection and Rescue may target the actor. | OWNER-V1 | `v1#V1-13` |
| R-ACT-05 | An action that was valid when registered resolves at its stage even if the actor is later Injured, Jailed or Eliminated in that round. | CONFIRMED | `consolidated#/registered_action` |
| R-ACT-06 | Same location and Command Room protection are checked when an action is registered and are not checked again. Where the actor or target is at resolution does not matter. The target's health and defences are checked at resolution. A target that is already Eliminated receives no effect. A registered target is never changed. | OWNER-V1 | `v1#V1-06` |
| R-ACT-07 | A Rescue, a Disabler use and a Protection receipt are spent when the action is accepted. An action that has no effect at resolution gives nothing back. | OWNER-V1 | `v1#V1-15` |
| R-ACT-08 | Main Actions and shots are registered in secret on the player's phone. The table sees only the resulting changes of health and location, without a cause. | OWNER-V1 | `v1#V1-17`, `baseline#/implementation_notes/app_should_handle/2`, `baseline#/roles/Blue_Disabler/hidden_main_action`, `baseline#/design_vision/core_principles/2` |
| R-ACT-09 | A command that is refused has no effect: nothing is spent and nothing changes for anyone. | DERIVED | `R-ACT-07`, `R-VIEW-07` |

## 9. Roles

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-ROLE-01 | Insider (Blue) has starting knowledge and no Main Action. | DERIVED | `baseline#/roles/Insider/ability`, `R-SETUP-09` |
| R-ROLE-02 | Cracker (Blue) has two Rescues per match. A Rescue is a Main Action that names one player. At the Rescue stage of that round, if the target is Injured they become Healthy. A Rescue never brings back an Eliminated player. | CONFIRMED | `baseline#/roles/Cracker/rescues_per_match`, `baseline#/roles/Cracker/main_action`, `baseline#/roles/Cracker/cannot_revive_eliminated` |
| R-ROLE-03 | An Injured Cracker may Rescue themself. An Injured Cracker may not Rescue anyone else. | CONFIRMED | `baseline#/roles/Cracker/injured_self_rescue_exception`, `baseline#/roles/Cracker/injured_rescue_others`, `baseline#/health_and_status/injury/exceptions/0` |
| R-ROLE-04 | A Cracker in Room A or Room B may Rescue a player who is in Hospital. This is a stated exception to the same-location rule: Cracker does not move and is not revealed. Every other Rescue follows the same-location rule. | OWNER-V1 | `v1#V1-05`, `baseline#/locations/special_access/Cracker` |
| R-ROLE-05 | Blue Disabler (Blue) has one use per match. It is a secret Main Action against a player in the same location and deals one damage. | CONFIRMED | `baseline#/roles/Blue_Disabler` |
| R-ROLE-06 | Red Disabler (Red, eight and nine players) has one use per match with the same effect as Blue Disabler, and has no ordinary weapon. | CONFIRMED | `baseline#/roles/Red_Disabler`, `modes#/modes/8` |
| R-ROLE-07 | Supplier (Blue) acts in Round 3 only. As a Main Action Supplier names two different recipients in the same location who are not Eliminated. At the Supplier stage of Round 3 each recipient gains one ordinary weapon, usable in Round 4 or 5. No recipient is refused because of their role. | OWNER-V1 | `v1#V1-16`, `baseline#/roles/Supplier`, `consolidated#/end_of_round_order/3` |
| R-ROLE-08 | A weapon from Supplier is known only to that recipient and to Supplier. There is no public weapon marker. | OWNER-V1 | `v1#V1-16` |
| R-ROLE-09 | Whether Supplier may name themself as one of the two recipients is not decided. | OPEN | `D11` |
| R-ROLE-10 | What Supplier may do when fewer than two eligible recipients share their location is not decided. | OPEN | `D12` |
| R-ROLE-11 | Officer (Blue, nine players) starts with one usable shot and has one shot in the whole match. Officer may fire it from Round 1 on, on their own ordinary turn. It is an ordinary one-damage shot in every other respect. A weapon received from Supplier does not give Officer a second shot. | CONFIRMED | `modes#/officer` |
| R-ROLE-12 | Undercover (Red) may lie in a Standard Hack, is never in the Code, holds one ordinary weapon and grants Protection as a Main Action. | CONFIRMED | `baseline#/roles/Undercover/can_lie_in_standard_hack`, `baseline#/roles/Undercover/excluded_from_code`, `baseline#/roles/Undercover/weapon/ordinary_weapon_count`, `baseline#/roles/Undercover/protection/main_action` |
| R-ROLE-13 | Hacker (Red) has one Scan per round. A Scan names a target and a guessed faction: Blue, Red or Alien. Hacker may Scan themself. Any other target, Undercover included, must be in the same location. A wrong guess reveals no Code information and still uses the round's Scan. A correct guess reveals only whether the target's number is in the Code. | CONFIRMED | `baseline#/roles/Hacker/scan` |
| R-ROLE-14 | A Scan is used up when it is accepted and its result is shown to Hacker at once, privately. A Scan cannot reach a player in Command Room. | OWNER-V1 | `v1#V1-14` |
| R-ROLE-15 | Only Hacker submits the Code. Hacker has one attempt, at any time during Round 5 before that round's resolution closes, whether Healthy, Injured or Jailed. The four numbers may be entered in any order. If Hacker is Eliminated nobody inherits the attempt. | OWNER-V1 | `v1#V1-08`, `consolidated#/hacker_round_5_code`, `baseline#/code/submission` |
| R-ROLE-16 | Alien (Independent) may lie in a Standard Hack, and adds one to Blue Power while Healthy. | CONFIRMED | `baseline#/roles/Alien/team`, `baseline#/roles/Alien/can_lie_in_standard_hack`, `baseline#/roles/Alien/blue_power_bonus_if_healthy` |
| R-ROLE-17 | A Disabler may be used in any round, from Round 1. Only ordinary weapons wait for Round 4. | DERIVED | `R-ROLE-05`, `R-SHOT-03`, `D24` |
| R-ROLE-18 | A Scan is Hacker's role Main Action: it is used on Hacker's own turn, and an Injured or Jailed Hacker cannot Scan. | DERIVED | `R-ACT-01`, `R-STATE-03`, `R-STATE-04`, `D30` |
| R-ROLE-19 | Alien has starting knowledge and no Main Action. | DERIVED | `R-SETUP-11`, `baseline#/roles/Alien/knows_full_code_from_start` |

## 10. Shooting

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-SHOT-01 | A shooter chooses one target directly. Nobody names or guesses the faction or role of a third player. This applies to every ordinary shot by Blue, Red, Alien and Officer. | CONFIRMED | `direct_shot#/current/targeting`, `direct_shot#/current/third_player_requirement`, `direct_shot#/current/applies_to` |
| R-SHOT-02 | An ordinary shot needs a usable weapon, a shooter who is Healthy and free, and a target in the same location who is not inside Command Room. It deals one damage. | CONFIRMED | `direct_shot#/current/unchanged_requirements`, `direct_shot#/current/ordinary_damage` |
| R-SHOT-03 | Ordinary weapons may be fired only in Round 4 and Round 5. Officer's own shot is the exception (R-ROLE-11). | CONFIRMED | `baseline#/ordinary_shot/combat_rounds`, `direct_shot#/current/unchanged_requirements` |
| R-SHOT-04 | A shot is registered on the shooter's own ordinary turn, at most one per turn. | OWNER-V1 | `v1#V1-13`, `modes#/officer/timing` |
| R-SHOT-05 | The weapon is spent when the shot is registered, as other resources are (R-ACT-07). It stays spent if the shot is blocked or its target is already Eliminated. | DERIVED | `R-ACT-07`, `baseline#/protection/on_block`, `D31` |
| R-SHOT-06 | No shot fails because of an identification. A legal registered shot resolves against the target's defences and health. | CONFIRMED | `direct_shot#/current/validation` |

## 11. Protection

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-PROT-01 | Protection comes only from Undercover's Main Action. Undercover names a Healthy or Injured player in the same location, and may name themself. | CONFIRMED | `baseline#/protection/sources`, `baseline#/roles/Undercover/protection`, `consolidated#/undercover_protection/may_target_self` |
| R-PROT-02 | A Protection becomes active by itself at the start of the next normal round. It does not block anything in the round it was granted. | CONFIRMED | `baseline#/protection/activation` |
| R-PROT-03 | An active Protection blocks the first valid attack that applies to its holder: an ordinary shot, a Disabler or a showdown special shot. The attack has no effect, and both the Protection and the attack's resource are used up. | CONFIRMED | `baseline#/protection/blocks_first_valid_applicable_attack`, `baseline#/protection/applicable_to`, `baseline#/protection/on_block`, `showdown#/shot_resolution/protection` |
| R-PROT-04 | Protection does nothing against a Jail vote, a release vote, a Captain election, a Standard Hack or a Scan, and none of them uses it up. | CONFIRMED | `baseline#/protection/does_not_block`, `baseline#/jail_voting/protection_does_not_affect_vote` |
| R-PROT-05 | A player can receive Protection once in a match, even after it has been used up. That one receipt is reserved when the grant is registered. | OWNER-V1 | `v1#V1-15`, `consolidated#/undercover_protection` |
| R-PROT-06 | Only Undercover knows that a Protection was granted, that it became active and that it was used up. The recipient is never told and nothing is shown in public. | OWNER-V1 | `v1#V1-17`, `baseline#/protection/hidden` |
| R-PROT-07 | A Protection granted in Round 5 never becomes active, because no normal round follows. The showdown is not a normal round. | DERIVED | `R-PROT-02`, `showdown#/shot_resolution/protection`, `D26` |
| R-PROT-08 | Undercover may grant Protection every round, limited only by one Main Action per turn and one receipt per player. | DERIVED | `R-ACT-01`, `R-PROT-05`, `D25` |

## 12. Standard Hack

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-HACK-01 | Each player may initiate one Standard Hack per match. At most two Hack conversations take place in a round. | CONFIRMED | `baseline#/standard_hack/personal_initiations_per_match`, `baseline#/standard_hack/maximum_conversations_per_round` |
| R-HACK-02 | A Hack is requested on the player's own turn and names another player in the same location. | OWNER-V1 | `v1#V1-13`, `baseline#/standard_hack/same_location_required` |
| R-HACK-03 | An Injured player may take part in a Hack. A Jailed player may take part where the other rules allow it. | CONFIRMED | `baseline#/health_and_status/injury/permissions`, `baseline#/health_and_status/jail/permissions_while_jailed` |
| R-HACK-04 | The question is answered Yes or No. Every player must answer truthfully except Undercover and Alien, who may lie. | CONDUCT | `baseline#/standard_hack/question_format`, `baseline#/standard_hack/truth_rule` |
| R-HACK-05 | The two players may not reveal or discuss what was said in that Hack during the same round. They may from the next round. What is said in a Round 5 Hack stays undisclosed until the match ends. A player may always act on what they learned. | CONDUCT | `baseline#/standard_hack/content_embargo`, `consolidated#/round_5_standard_hack` |
| R-HACK-06 | There is no other private messaging between players. | CONFIRMED | `baseline#/standard_hack/ordinary_private_messaging` |
| R-HACK-07 | How many questions a Hack conversation contains, whether the target may ask too, and what happens if a player declines to answer are not decided. | OPEN | `D18` |

## 13. Voting, Jail and release

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-VOTE-01 | Every round ends its turns with a Jail vote. A successful vote sends one player to Jail. It deals no damage and eliminates nobody. | CONFIRMED | `baseline#/jail_voting/normal_vote_effect`, `consolidated#/end_of_round_order/0` |
| R-VOTE-02 | Every player who is not Eliminated votes. A player who is not Eliminated and not already Jailed can be voted for, including the voter. Each player casts one final ballot. A missing ballot is an abstention. Ballots stay private; only the totals are published when the window closes. | OWNER-V1 | `v1#V1-10`, `v1#V1-09` |
| R-VOTE-03 | The vote succeeds only if one player alone has the most votes and those votes are at least half of all players eligible to vote when voting started. Exactly half is enough. A tie for the most votes jails nobody. The count is of eligible voters, not of ballots cast. | CONFIRMED | `baseline#/jail_voting/success_conditions`, `baseline#/jail_voting/denominator` |
| R-VOTE-04 | Protection has no effect on a Jail vote. | CONFIRMED | `baseline#/jail_voting/protection_does_not_affect_vote` |
| R-VOTE-05 | Once per match, at the start of voting, the Captain may ask for the release of one chosen prisoner. The Captain has a 60-second window to choose. Declining or not choosing uses nothing. | OWNER-V1 | `v1#V1-11`, `baseline#/jail_voting/release_request` |
| R-VOTE-06 | A release vote is held before the Jail vote. Every player who is not Eliminated votes, under the ballot rules of R-VOTE-02. The prisoner is released if at least half of all eligible voters approve; exactly half is enough. A failed release vote still uses up the match's one request. | OWNER-V1 | `baseline#/jail_voting/release_request`, `v1#V1-10`, `v1#V1-09` |
| R-VOTE-07 | A released Healthy player returns to the last of Room A or Room B they occupied. A released Injured player goes to Hospital. Neither spends movement. | OWNER-V1 | `v1#V1-02` |
| R-VOTE-08 | Jail has no time limit. Only a successful release vote ends it. Healing does not. | DERIVED | `baseline#/health_and_status/jail/rescue_or_heal_does_not_release_jail`, `R-VOTE-06`, `D27` |
| R-VOTE-09 | A ballot cannot be changed after it is cast. | OWNER-V1 | `v1#V1-10` |
| R-VOTE-10 | A release takes effect when the release vote closes. The freed player is placed at once (R-VOTE-07) and may be voted for in the Jail vote that follows. | DERIVED | `R-VOTE-06`, `R-RES-01`, `baseline#/jail_voting/release_request/sequence_if_used`, `D38` |

## 14. End-of-round resolution

The phone app resolves a round in a fixed order. Nothing in it depends on which message reached the server first.

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-RES-01 | Resolution order: 1. the Jail vote result; 2. registered actions and attacks, with Protection and damage; 3. Rescue; 4. Supplier's weapons, in Round 3 only; 5. eliminations and the faction reveal; 6. the victory check; 7. whether the next round needs a Captain election. | CONFIRMED | `consolidated#/end_of_round_order` |
| R-RES-02 | Inside step 2, effects resolve in that round's turn order. For one player, the Main Action resolves before the Shot. The order in which commands reached the server never matters. | OWNER-V1 | `v1#V1-07` |
| R-RES-03 | Victory is checked only after a whole stage has resolved, never between two effects of the same stage. This includes the showdown. | OWNER-V1 | `v1#V1-19` |
| R-RES-04 | With Original Powers off, the order inside step 2 cannot change anyone's health. Each attack does one damage to its fixed target unless that target's Protection blocks its first attack, whatever the order. | DERIVED | `R-RES-02`, `R-ACT-05`, `R-ACT-06`, `R-PROT-03` |
| R-RES-05 | An Eliminated player's faction is revealed at the next public phase after the attack stage, before the next vote, turn or showdown. A final result counts as that public phase. | OWNER-V1 | `v1#V1-18`, `baseline#/player_setup/elimination_reveal` |

## 15. Victory

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-WIN-01 | Blue Power is the number of Healthy Blue players, plus one if Alien is Healthy. Red Power is the number of Healthy Red players. Injured players and Jailed players count zero; a Jailed Alien adds nothing. | CONFIRMED | `baseline#/victory/power_formula`, `baseline#/health_and_status/jail/permissions_while_jailed/power_contribution` |
| R-WIN-02 | A team can win only if at least one actual member of that team is Healthy. Alien is not a Blue member for this purpose. | CONFIRMED | `baseline#/victory/minimum_health_requirement` |
| R-WIN-03 | Blue wins when every Red player is Eliminated and at least one Blue player is Healthy. | CONFIRMED | `baseline#/victory/Blue/0` |
| R-WIN-04 | Blue wins at the end of Round 5 when Hacker has not submitted the correct Code, at least one Blue player is Healthy, and Blue Power is greater than Red Power. | CONFIRMED | `baseline#/victory/Blue/1` |
| R-WIN-05 | Red wins when every Blue player is Eliminated and at least one Red player is Healthy. | CONFIRMED | `baseline#/victory/Red/0` |
| R-WIN-06 | Red wins when Hacker has submitted the correct Code and at least one Red player is Healthy. Power is not compared. This is checked with the other conditions after Round 5's effects have resolved, not at the moment of submission. | OWNER-V1 | `v1#V1-08`, `baseline#/victory/Red/1` |
| R-WIN-07 | If Blue wins and Alien is not Eliminated, Alien wins too. If Red wins, Alien does not win. | CONFIRMED | `baseline#/victory/Alien/0`, `baseline#/victory/Alien/2` |
| R-WIN-08 | Alien wins alone when Blue and Red are eliminated at the same time and Alien is not Eliminated. At the same time means that both teams had a surviving member before one complete resolution stage and neither has one after it. | OWNER-V1 | `v1#V1-19`, `baseline#/victory/Alien/1` |
| R-WIN-09 | The elimination conditions are checked at every end-of-round victory check. The Code and Power conditions are not checked before the end of Round 5: they are checked at the Round 5 victory check and again after the showdown (R-SHOW-08). | DERIVED | `R-RES-01`, `R-WIN-03`, `R-WIN-04`, `R-WIN-05`, `R-WIN-06`, `R-SHOW-08` |
| R-WIN-10 | If no condition is met after Round 5 has resolved, the final showdown begins. | CONFIRMED | `showdown#/trigger` |
| R-WIN-11 | A player who is Healthy but Jailed is a Healthy member for R-WIN-02, because Jail is separate from health. Such a player still adds nothing to Power. | DERIVED | `R-WIN-02`, `R-STATE-04`, `R-WIN-01`, `D14` |
| R-WIN-12 | Nothing ends a match early except a victory or a host abort. A match that neither side can still win is played to the Round 5 check and, with no winner there, to the showdown like any other. A rule that ended such a match early would be a new rule. | DERIVED | `R-FLOW-01`, `R-WIN-09`, `R-WIN-10`, `R-SHOW-08`, `R-OPS-02` |
| R-WIN-13 | If the correct Code was submitted but no Red player is Healthy at the Round 5 check, Red does not win on the Code, and Blue cannot win on Power in that match because the Code was correct. | DERIVED | `R-WIN-04`, `R-WIN-06`, `D28` |

## 16. Final showdown

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-SHOW-01 | The showdown happens once, only after Round 5 has resolved and the victory check found no winner. | CONFIRMED | `showdown#/trigger` |
| R-SHOW-02 | Every player who is not Eliminated, including Injured and Jailed players, is moved to the Final Zone and receives one special shot that deals one damage. No earlier weapon is needed. | CONFIRMED | `showdown#/options/1/participants`, `showdown#/options/1/shot`, `showdown#/current_option` |
| R-SHOW-03 | A Captain in the Final Zone has no Command Room protection and keeps the title. | CONFIRMED | `showdown#/options/1/captain` |
| R-SHOW-04 | All participants register a target in secret during one 60-second window, before any special shot resolves. A participant who registers no target does not shoot. | OWNER-V1 | `v1#V1-09`, `showdown#/shot_resolution/registration` |
| R-SHOW-05 | Special shots resolve in the Round 5 turn order. A registered shot still resolves if its shooter was Eliminated earlier in that order. | CONFIRMED | `showdown#/shot_resolution/order`, `showdown#/shot_resolution/actor_status_change` |
| R-SHOW-06 | An existing Protection blocks the first special shot against its holder and is used up. | CONFIRMED | `showdown#/shot_resolution/protection` |
| R-SHOW-07 | A special shot is spent when it is registered. If its target was already Eliminated it does nothing. The target is never changed and nothing is given back. | OWNER-V1 | `v1#V1-20` |
| R-SHOW-08 | After every special shot has resolved, all victory conditions are checked again. If none is met, the match is a Draw. There is no second showdown. | CONFIRMED | `showdown#/terminal_result` |
| R-SHOW-09 | Officer receives the special shot even after firing the one ordinary shot. | DERIVED | `R-SHOW-02`, `R-ROLE-11` |
| R-SHOW-10 | Injury and Jail continue in the Final Zone. A Jailed participant still counts zero Power in the final check. | DERIVED | `R-VOTE-08`, `R-WIN-01`, `D27` |
| R-SHOW-11 | Whether a showdown participant may name themself as the target of their special shot is not decided. | OPEN | `D34` |

## 17. Who may see what

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-VIEW-01 | Public to everyone at the table: each player's number, location, health, Jail status and Captain marker; who may vote and who may be voted for; and each vote's totals when it closes. | OWNER-V1 | `v1#V1-10`, `v1#V1-17`, `board#/physical_information`, `baseline#/health_and_status/jail/public_status` |
| R-VIEW-02 | Never public before its authorized reveal: a role, the faction of a player who is not Eliminated, a weapon, the Code, a Protection, a registered target and an individual ballot. Nothing on the board or the shared display may encode them. | OWNER-V1 | `v1#V1-10`, `v1#V1-16`, `v1#V1-17`, `baseline#/player_setup/elimination_reveal`, `baseline#/protection/hidden`, `baseline#/implementation_notes/app_should_handle/1`, `showdown#/shot_resolution/registration`, `board#/physical_information` |
| R-VIEW-03 | When a player is Eliminated their faction becomes public, at the time in R-RES-05. Their exact role stays secret until the match ends. The Alien faction necessarily identifies the Alien. | CONFIRMED | `baseline#/player_setup/elimination_reveal` |
| R-VIEW-04 | A player sees their own role, their own resources, their own registered actions and their own ballot. | DERIVED | `baseline#/implementation_notes/app_should_handle/1`, `R-VIEW-02` |
| R-VIEW-05 | Role knowledge is shown only to its role: Insider's three candidates, the Undercover's identity to Hacker, the Code to Alien, Scan results to Hacker, and Protection status to Undercover. | DERIVED | `R-SETUP-09`, `R-SETUP-10`, `R-SETUP-11`, `R-ROLE-14`, `R-PROT-06` |
| R-VIEW-06 | An attacker sees that the attack was registered and later that it was completed. The attacker is never told that it was blocked or why it had no effect. Public health and location changes carry no cause. | OWNER-V1 | `v1#V1-17` |
| R-VIEW-07 | What a player enters on their phone changes nothing that any other player or the public display can see until the rules reveal it. This covers an action, a shot, a ballot, a special shot, a Code submission, a Hack request before its conversation opens, and the Captain's release choice before the release vote opens. | DERIVED | `R-VIEW-02`, `R-ACT-08`, `R-VOTE-02`, `R-SHOW-04`, `D36` |
| R-VIEW-08 | Exact roles and the Code become public when the match ends. | OWNER-V1 | `v1#V1-18`, `baseline#/player_setup/elimination_reveal` |
| R-VIEW-09 | The round, the current phase and whose turn it is are public: turns are taken by speaking at the table. | DERIVED | `R-FLOW-05`, `baseline#/round_structure/player_turn/sequence` |
| R-VIEW-10 | Whether a match that the host aborts reveals roles and the Code is not decided. | OPEN | `D35` |

The same rules as a table, for whoever builds or draws a screen. "Not stated" means no source says the fact is ever revealed, so it stays hidden.

| Fact | On the public board or display | In the player's own view | In another player's view | When the match ends with a result |
| --- | --- | --- | --- | --- |
| Player number, location, health, Jail, Captain marker | Yes | Yes | Yes | Yes |
| Round, phase, whose turn it is | Yes | Yes | Yes | Yes |
| A player's role | No | Their own | No | Yes, everyone's |
| The faction of a player who is not Eliminated | No | Their own | No | Yes, through the roles |
| The faction of an Eliminated player | Yes, from the next public phase | Yes | Yes | Yes |
| A weapon held | No | The holder. Supplier knows whom they armed | No | Not stated |
| A Protection | No | Undercover only. Never the recipient | No | Not stated |
| The Code | No | Alien | No | Yes |
| Insider's three candidates | No | Insider | No | Not stated |
| Who Undercover is | No | Undercover and Hacker | No | Yes, through the roles |
| A Scan and its result | No | Hacker | No | Not stated |
| A registered action or shot and its target | No | The actor | No | Not stated |
| Why an attack had no effect | No | Never the attacker. Undercover sees when a Protection was used up | No | Not stated |
| An individual ballot | No | The voter | No | Not stated |
| Who may vote, who may be voted for, and the totals | Yes; totals when the vote closes | Yes | Yes | Yes |
| What was said in a Hack | No | The two players, under R-HACK-05 | No | Free to discuss |

## 18. Operating policy for an in-person session

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-OPS-01 | A disconnected player is not paused for and does not forfeit. Every window keeps running on the server clock. Reconnecting restores the same identity and seat. | OWNER-V1 | `v1#V1-12` |
| R-OPS-02 | The host may abort a session that cannot continue. An aborted match has no winner. The host cannot skip, extend or force a phase. | OWNER-V1 | `v1#V1-12` |
| R-OPS-03 | Version 1 needs a live connection; there is no offline play. A seat may be moved to a new authenticated identity with a one-time code that the owner or host explicitly authorizes. The old identity loses access at the same moment. Recovery never deals roles again and never resets resources. | OWNER-V1 | `v1#V1-21` |

## 19. Original Powers

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-POW-01 | Original Powers are an optional pack. Version 1's base game, its scenarios and its first playtest comparison run with the pack off. | OWNER-V1 | `v1#/optional_powers`, `baseline#/optional_original_power_pack/optional`, `baseline#/optional_original_power_pack/base_game_requires_it` |
| R-POW-02 | How powers are dealt in seven- and nine-player games, and how they interact with the showdown's special shots, is not decided. It is outside Version 1, in which powers are off. | OPEN | `D10` |

## 20. Mode sheets

The three sheets below restate setup facts and add arithmetic that follows from them. Two rows rest on readings and say so. Keep results, playtests and conclusions for each mode apart.

| Fact | 7 players | 8 players | 9 players |
| --- | --- | --- | --- |
| Blue roles | Insider, Cracker, Blue Disabler, Supplier | Insider, Cracker, Blue Disabler, Supplier | Insider, Cracker, Blue Disabler, Supplier, Officer |
| Red roles | Undercover, Hacker | Undercover, Hacker, Red Disabler | Undercover, Hacker, Red Disabler |
| Independent | Alien | Alien | Alien |
| Blue, Red, Alien | 4, 2, 1 | 4, 3, 1 | 5, 3, 1 |
| Starting Blue Power and Red Power | 5 and 2 | 5 and 3 | 6 and 3 |
| Votes needed to jail with everyone voting | 4 of 7 | 4 of 8 | 5 of 9 |
| Exact tie at the threshold possible with everyone voting | No | Yes, 4 against 4 | No |
| Attacks available before the showdown, under reading D22 | 4 | 5 | 6 |
| Attacks usable from Round 1, under reading D24 | Blue Disabler | Both Disablers | Both Disablers and Officer's shot |
| Players Hacker cannot rule out of the Code at the start | 6 | 7 | 8 |

Votes needed to jail when fewer players may vote: 1 of 1 or 2, 2 of 3 or 4, 3 of 5 or 6, 4 of 7 or 8, 5 of 9.

The attack count is Undercover's weapon, Supplier's two weapons and Blue Disabler, plus Red Disabler with eight or nine players and Officer's shot with nine. The consequences of these numbers are in [rules-audit-v1.md](rules-audit-v1.md#structural-consequences).

## 21. Mechanics that must never appear

These were removed or replaced. They stay in the historical files as evidence. No current fixture, screen, command or test may use them.

| Archived mechanic | Replaced by |
| --- | --- |
| Naming or guessing a third player's faction in order to shoot, and any shot that fails on a wrong identification | R-SHOT-01, R-SHOT-06 |
| The showdown variant in which only ordinary eligible shooters fire | R-SHOW-02 |
| Round 6 and Final Escape | R-FLOW-01 |
| An ordered Code, Code positions and the Position Test | R-SETUP-08 |
| Blue submitting the Code | R-ROLE-15 |
| The Captain protecting themself automatically | R-CAPT-08 |
| Injury that worsens over rounds | R-STATE-02 |
| An ordinary weapon for Red Disabler | R-ROLE-06 |
| Surrender | None |
| Votes that damage or eliminate | R-VOTE-01 |
| Ordinary private messaging | R-HACK-06 |
| Hacker's bonus Scan, steal Hack, Scan transfer and knowledge of own Code status | R-ROLE-13, R-SETUP-10 |
| A six-player mode | R-SETUP-01 |
| Ending the match with no winner straight after Round 5, the default of the archived rulebook and an open question in the baseline | R-WIN-10, R-SHOW-08 |
| A block that the table may be told about | R-PROT-06, R-VIEW-06 |
| Ballots shown openly at the table | R-VOTE-02 |
| The older Active, Disabled, Critical and Destroyed health model | R-STATE-01 |

## 22. Changing this document

1. The game owner decides a rule. The decision is recorded in the repository as an overlay with a new pinned hash. Codex Integration owns the files under `rules/`.
2. Game Balance updates this rulebook and the scenarios in the same change, gives the rulebook a new version and moves the decision out of OPEN.
3. Nothing else changes a rule. A balance proposal, an engine behaviour, a screen design or a passing test is not a decision.

Each OPEN rule cites the open rule edge it waits on. A DERIVED rule that cites a decision number is a reading of the approved sources, for which no approval is asked. The register of both, and one consolidated sheet of the open edges, are in [rules-audit-v1.md](rules-audit-v1.md#decision-register).
