# Current rules audit

Date: 2026-09-26. Status: source audit and test specification; no scenarios have been executed and no mode is balance-validated.

## Authority and current configurations

The v2.1 JSON is a baseline. Apply the confirmed current overlays and latest recorded game-owner decisions before it. `location-board-layout-v1.json` contains both confirmed facts and layout proposals; its filename does not make every field canon. Architecture defaults and visual prototypes are not rules. Preserve historical files rather than rewriting them into an apparently consistent original.

| Players | Blue roles | Red roles | Independent |
| --- | --- | --- | --- |
| 7 | Insider, Cracker, Blue Disabler, Supplier | Undercover, Hacker | Alien |
| 8 | Same four Blue | Undercover, Hacker, Red Disabler | Alien |
| 9 | Same four Blue plus Officer | Same three Red | Alien |

Six-player mode is removed. Every current comparison uses direct shooting. Base-game tests disable Original Powers; their interactions require a separate versioned suite.

## Confirmed current behavior

| Area | Audited expectation |
| --- | --- |
| Turn/Hack | Ordinary turn: 60 seconds shared by speaking and eligible action/shot. Hack is requested within that minute, then adds a separate 60-second conversation. One initiation per player per match; at most two conversations per round. |
| Movement | At most one voluntary move per round before voting, from A/B/Command. Hospital/Jail have no voluntary exit. Only Captain enters Command; leaving preserves the title. Immunity exists while inside. |
| Shooting | Direct same-location target; no third player or faction guess. Ordinary weapons work in R4/R5. Officer exists only in mode 9 and has one ordinary shot total from R1, including after a Supplier offer. |
| Protection | Undercover only; may self-target. One lifetime receipt per recipient, including after consumption. Activates at the next normal-round start; blocks the first applicable attack and is consumed. Jail voting bypasses it. |
| Hacker | Only Hacker submits Code, once, anytime during R5. No inheritance. Injury/Jail do not prohibit submission. Code is four distinct unordered numbers, includes Alien, excludes Undercover. |
| Resolution | Jail vote precedes registered attacks/actions; Rescue follows damage; Supplier distribution occurs in R3; then elimination/reveal handling, victory, and next-Captain flag. Valid registration survives later actor injury, Jail, or elimination. |
| Health | Healthy→Injured→Eliminated; no time-based decay or revival. Cracker may self-rescue while Injured. Healing does not release Jail. |
| Victory | Apply the baseline faction conditions and actual-team healthy-member requirement. Injured/Jailed players contribute zero power. Alien can co-win with Blue or win solo under its specified simultaneous-elimination condition. |
| Showdown | Conditional after normal R5 resolution and no winner. All survivors, including Injured/Jailed, transfer to Final Zone and receive a separate one-damage shot. Register all targets first; resolve in R5 turn order even if a shooter is eliminated. Protection applies. Recheck victory, otherwise Draw. |
| Disclosure | Faction reveal at the next public phase after elimination; exact role/power at game end. Public tokens never encode hidden resources/identity. R5 Hack content remains embargoed until game end. |

These are assertions to implement and verify, not evidence that the prototype already enforces them. Officer's ordinary-shot cap does not remove the separately granted showdown shot.

## Archived and provisional material

Archived: third-player shooting identification, wrong-identification failure/consumption branches, ordered Code, Blue Code submission, Round 6/Final Escape, automatic Captain Protection, automatic injury decay, Red Disabler ordinary weapon, and Surrender. The showdown's unselected option 2 still mentions identification; that text must never enter the current runtime. Historical records using identification are a different cohort.

Provisional: dotted Captain paths from both rooms, starting A/B assignment, exit destinations after healing/release, and any prototype choice that makes these transitions convenient. No room-capacity rule follows from token spacing. Optional powers remain optional; the baseline's “all 8 players” dealing text is not an approved 7/9-player distribution rule.

## Decision register

These detailed IDs supplement the integration register in `docs/decisions.md`.

| ID | Decision still needed | Consequence for testing |
| --- | --- | --- |
| D01 | Initial room assignment; healed/released destination and whether transfer consumes movement | Parameterize known positions in fixtures; block full lifecycle expectations. |
| D02 | Captain access from A and/or B; no eligible candidate case was deliberately deferred | Do not infer adjacency or invent a replacement/skip rule. |
| D03 | Cracker Hospital access while preserving same-location targeting and hidden role | Block cross-room Rescue expectations. |
| D04 | Location eligibility when target or actor moves after registration, including Jail relocation | Assert that status alone cannot discard an action; block final hit outcome where location semantics matter. |
| D05 | Ordering within the shared normal action/attack stage; competing effects and consumption | Do not use network arrival as a game rule. Single-effect cases can proceed. |
| D06 | Exact Code victory checkpoint and changing healthy-team eligibility during R5 | Accept/record legal Code submission; block timing-dependent terminal outcomes. |
| D07 | Vote/showdown deadlines, abstention/no submission, eligible target set when prior shots remove targets | No invented automatic target, abstention, or target-redirection rule. |
| D08 | Pause/disconnect policy and hard deadline acceptance boundary | Separate proposed server policy from approved game policy. Reconnect must preserve state. |
| D09 | Recipients/timing of private effects and block feedback | Test absence from public views; full positive visibility assertions await the disclosure contract. |
| D10 | Optional-power distribution in 7/9 modes and interactions with special showdown shots | Keep the base comparison powers-off. No automatic Heavy Shot/Silencer extension to special shots. |

The general stage order is settled; D05 concerns order inside a stage. Code's submission window is settled; D06 concerns when a correct submission produces a terminal result. Movement timing/frequency are settled despite stale baseline open questions.

Arbitrary spoken Hack answers cannot be automatically verified as truthful. The app can enforce eligibility, count, access, and timing; human conduct remains part of the rules. A structured question system would be a new designer decision.

## Test handoff

`scenario-matrix.json` separates decision-ready specifications from blocked scenarios. It is declarative and has no implemented engine bindings. Ready does not mean passed. A blocked case must retain its identifier and appear in the report with the linked decision; fixtures must not hide it by selecting a convenient default.

Backend owns deterministic implementation and transaction/security tests. Game Balance independently checks source-derived results and comparative records. Human tests should prioritize role agency, Blue/Red information asymmetry, Officer's early-shot impact, Code accessibility, and how often confinement removes meaningful choices. Report the outcome of each full configuration before suggesting a change.
