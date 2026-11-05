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

Confirmed ordinary turns and Standard Hack conversations each last 60 seconds. Neither this register nor a UI countdown invents durations for the unresolved phases.

The expanded source audit and scenario expectations live in `docs/balance/`. Link decisions there when resolved and release a new immutable ruleset version when behavior changes.
