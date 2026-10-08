# Current V1 integration decision register

This register separates implementation choices from game-rule approval. The game owner decides canon. Backend, Frontend, Designer and Game Balance provide proposals and evidence within their responsibilities.

| ID | Topic | Status | Resolution needed from |
| --- | --- | --- | --- |
| INT-001 | GitHub destination | Confirmed: `Amirkianfar66/GameN`; imported on `main`; `Amirkianfar66/planet-a` excluded | Continue with the Codex bootstrap task |
| INT-002 | Three.js/R3F board | Candidate direction for evaluation; not benchmarked | Frontend measurements and Designer/user review |
| INT-003 | Shared command/view contract | Backend draft in `docs/backend/first-slice.md` | Integrator with Frontend and Game Balance |
| INT-004 | Design tokens | Proposal in `docs/design/design-tokens.json` | Designer/Frontend visual review |
| INT-005 | Comic motion graphics | User-requested direction; detailed cue library and timings proposed in `docs/design/motion-direction.md` | Designer/Frontend implementation and visual/device evaluation |
| RULE-001 | Location checks after registration | Confirmed: V1-06 in the [owner-approved V1 sheet](v1-rule-decisions-proposal.md) | Implement; affected-role review of shared contracts remains required |
| RULE-002 | Ordering of competing effects within a normal-round stage | Confirmed: V1-07 in the [owner-approved V1 sheet](v1-rule-decisions-proposal.md) | Implement; affected-role review of shared contracts remains required |
| RULE-003 | Protection/private result recipients and reveal timing | Confirmed: V1-14–18 in the [owner-approved V1 sheet](v1-rule-decisions-proposal.md) | Implement; affected-role review of shared contracts remains required |
| RULE-004 | Hospital rescue and Jail release placement/move consumption | Confirmed: V1-02 in the [owner-approved V1 sheet](v1-rule-decisions-proposal.md) | Implement; affected-role review of shared contracts remains required |
| RULE-005 | Captain routes and no-eligible-candidate fallback | Confirmed: V1-03–04 in the [owner-approved V1 sheet](v1-rule-decisions-proposal.md) | Implement; affected-role review of shared contracts remains required |
| RULE-006 | Cracker Hospital access | Confirmed: V1-05 in the [owner-approved V1 sheet](v1-rule-decisions-proposal.md) | Implement; affected-role review of shared contracts remains required |
| RULE-007 | Code victory evaluation checkpoint | Confirmed: V1-08 in the [owner-approved V1 sheet](v1-rule-decisions-proposal.md) | Implement; affected-role review of shared contracts remains required |
| RULE-008 | Vote/showdown response deadlines and missing input | Confirmed: V1-09–11, V1-20 in the [owner-approved V1 sheet](v1-rule-decisions-proposal.md) | Implement; affected-role review of shared contracts remains required |
| RULE-009 | Disconnect, pause and abort policy | Confirmed: V1-12, V1-21 in the [owner-approved V1 sheet](v1-rule-decisions-proposal.md) | Implement; affected-role review of shared contracts remains required |
| TURN-001 | Explicit ordinary-turn Pass | Confirmed owner request on 8 October: active non-eliminated speaker can pass; preserve queued resolution and following Hack, exact new tuple and legacy compatibility; see [decision](../decisions/2026-10-08-pass-turn.md) | Implement issue #85; integrate Frontend and Balance pins |
| SETUP-001 | Initial Room A/B assignment | Confirmed owner override on 8 October: server assigns each new human admission/bot independently, preserving stored rooms and engine compatibility; see [decision](../decisions/2026-10-08-random-starting-rooms.md) | Implement issue #83; backend-first rollout and affected-role review |
| RULE-010 | Original Power distribution across 7/8/9 modes and special-shot interactions | Requires audit; initial comparative baseline uses powers off | Game owner with Game Balance |

Confirmed ordinary turns and Standard Hack conversations each last 60 seconds. The owner-approved V1 profile also gives votes, release choice and showdown registration 60-second windows; its full decision overlay is pinned separately from historical sources.

The expanded source audit and scenario expectations live in `docs/balance/`. Link decisions there when resolved and release a new immutable ruleset version when engine behavior changes. SETUP-001 is an explicit admission/setup policy override: its later owner decision and service commit identify the change while the engine retains its historical pins for active-game compatibility.

This current register supersedes the immutable bootstrap copy of `docs/decisions.md` for V1-01–V1-21. The bootstrap source lock and original rules manifest remain unchanged.
