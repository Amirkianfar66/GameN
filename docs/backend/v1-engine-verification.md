# In-person V1 pure engine verification

Verified on 6 October 2026 with Node `22.21.1` and npm `10.9.4`, from checkpoint `ad976db57a1e2c5cf29142fc097bc462913e718b`. The implementation is delivered by issue #13, on `codex/backend-v1-core`; the PR pins its actual head commit. Bootstrap baseline remains `333c9e820f362a211352bc689372663f29b73ac4`.

## Actual local evidence

- Clean `npm ci`: 826 packages installed using the committed lockfile.
- `npm run verify`: toolchain, explicit workspace boundaries, historical source integrity, owner-overlay pin, typecheck and build passed in the combined V1 worktree.
- All 25 bootstrap/contract checks passed, including 9 new full-game contract tests.
- All 79 engine checks passed: 18 retained Officer/Protection checks, 23 roster/vote/victory checks and 38 full-lifecycle/schema checks. No failures, skips or todos.
- Independent review found a terminal contract validation gap. The corrected schemas require a canonical role permutation, Alien-in/Undercover-out Code, consistent revealed faction and terminal self-role agreement. Regressions passed. The trusted abort clock also rejects a timestamp before the current phase start.

The tests exercise 7/8/9-player complete paths, fixed windows and missing input, movement, Hack/Code timing, Captain runoffs, release/Jail arithmetic, ordered Main/Shot/Rescue/Supplier effects, defenses and resource reservation, final showdown, victory predicates, deterministic replay and private/public noninterference. These are synthetic automated scenarios, not measured win rates or completed human games.

The historical source manifest and 119 imported Canvas files remain unchanged. The new owner-approved ruleset is `in-person-v1-2026-10-06`, content hash `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`; Original Powers remain off.

## Review and remaining acceptance

Protocol 2 is additive. Protocol-1 fixtures are preserved. Frontend and Game Balance must review the new contracts and rules before adoption. Designer must supply the reviewed asset manifest. Firebase emulator/artifact results belong to the separately reviewable issue #14 follow-up; they are not proof of device, production IAM, load, cloud delivery or social-deduction balance. No cloud deployment was run. V1-01–V1-21 are approved; no remaining full-game rule decision is inferred from an old open register.
