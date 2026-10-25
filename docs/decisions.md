# Integration decision register

This register separates implementation choices from game-rule approval. The game owner decides canon. Backend, Frontend, Designer and Game Balance provide proposals and evidence within their responsibilities.

| ID | Topic | Status | Resolution needed from |
| --- | --- | --- | --- |
| INT-001 | GitHub destination | Confirmed: `Amirkianfar66/GameN`; imported on `main`; `Amirkianfar66/planet-a` excluded | Continue with the Codex bootstrap task |
| INT-002 | Three.js/R3F board | Candidate direction for evaluation; not benchmarked | Frontend measurements and Designer/user review |
| INT-003 | Shared command/view contract | Backend draft in `docs/backend/first-slice.md` | Integrator with Frontend and Game Balance |
| INT-004 | Design tokens | Proposal in `docs/design/design-tokens.json` | Designer/Frontend visual review |
| INT-005 | Comic motion graphics | User-requested direction; detailed cue library and timings proposed in `docs/design/motion-direction.md` | Designer/Frontend implementation and visual/device evaluation |
| RULE-001 | Location checks after registration | Unresolved | Game owner with balance scenarios |
| RULE-002 | Ordering of competing effects within a normal-round stage | Unresolved | Game owner with engine examples |
| RULE-003 | Protection/private result recipients and reveal timing | Incomplete disclosure contract | Game owner; Backend enforces, Designer/Frontend consume |
| RULE-004 | Hospital rescue and Jail release placement/move consumption | Prototype defaults are provisional | Game owner |
| RULE-005 | Captain routes and no-eligible-candidate fallback | Routing provisional; fallback explicitly deferred | Game owner when revisited |
| RULE-006 | Cracker Hospital access | Needs precise same-location and disclosure semantics | Game owner |
| RULE-007 | Code victory evaluation checkpoint | Submission window confirmed; checkpoint unresolved | Game owner |
| RULE-008 | Vote/showdown response deadlines and missing input | Unresolved | Game owner |
| RULE-009 | Disconnect, pause and abort policy | Proposed operating policy not confirmed | Game owner |
| RULE-010 | Original Power distribution across 7/8/9 modes and special-shot interactions | Requires audit; initial comparative baseline uses powers off | Game owner with Game Balance |
| RULE-011 | Officer is a public office only | Confirmed 25 October 2026: remove the old Blue Officer secret role and its starting/early shot; do not offer it as an alternative. [Owner decision](../rules/overlays/officer-public-office-owner-decision-2026-10-25.json) | Integration implements a successor ruleset; the ninth secret role is resolved by RULE-012 |
| RULE-012 | Ninth secret role: Soldier Blue | Updated 25 October 2026: once-per-match Vote Disruption replaces the starting weapon and shot. Fix the players in the opposite A/B room at activation; they cannot vote for the rest of that round even if they move. Blue faction and the 5 Blue / 3 Red / 1 Alien setup stay unchanged. [Current owner decision](../rules/overlays/soldier-blue-vote-disruption-owner-decision-2026-10-25.json) | Integration implements the gameplay successor; notification audience/timing remains a design detail. Officer stays a separate public office |
| RULE-013 | Hospital panel and shared Rescue pool | Confirmed 25 October 2026: each patient gets one lifetime code attempt using Cracker's player number; wrong code spends only the attempt, correct code reserves one of the two shared heals for that round's Rescue stage. [Owner decision](../rules/overlays/hospital-panel-owner-decision-2026-10-25.json) | [Blackhole healing inventory](../rules/overlays/hospital-panel-blackhole-owner-decision-2026-10-25.json) is confirmed per reality; Sync retains only the chosen healing state/costs. [The lifetime panel attempt](../rules/overlays/hospital-panel-attempt-owner-decision-2026-10-25.json) remains spent globally even when its reality is discarded. Gameplay integration remains pending |

Confirmed ordinary turns and Standard Hack conversations each last 60 seconds. Neither this register nor a UI countdown invents durations for the unresolved phases.

The expanded source audit and scenario expectations live in `docs/balance/`. Link decisions there when resolved and release a new immutable ruleset version when behavior changes.
