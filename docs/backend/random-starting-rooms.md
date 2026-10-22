# Server-assigned initial rooms

Issue [#83](https://github.com/Amirkianfar66/GameN/issues/83). Backend branch `codex/backend-random-rooms`, exact shared-contract base `ec069aee296381028739f87cb493a0d29cb5b443`; deployed/reviewed predecessor `2bcd23069505e8c93fac174fe2750346887a9d5e`. Authority: [8 October owner decision](../decisions/2026-10-08-random-starting-rooms.md).

## Behavior and compatibility

`v1RequestAdmission` draws an independent cryptographically secure `randomInt(2)` outcome for each new human admission. `v1SetPracticeBots` uses the same separate room randomizer for each newly created bot binding. Room A and Room B each have probability 1/2; there is no room quota, seat parity, character, faction or role input. The service accepts an injected `randomInitialRoom` only for deterministic tests; production uses the secure default. Invalid/throwing draws fail without partial writes.

Rooms are stored atomically with the new admission or bot binding and reused by approval, staged setup, launch, refresh and seat recovery. Retained humans, retained bots, already-created admissions and existing games are unchanged. Removing/re-adding a bot creates a new binding epoch with a new assignment.

Each invocation memoizes candidates across Firestore transaction callback retries. Concurrent duplicate invocations can sample speculative candidates, but one transaction wins and its room is durable. An identical request, including after lost acknowledgment or a service restart, replays the stored operation receipt before another draw.

The deprecated optional `initialRoom` request field is accepted only for Room A/B and is ignored for assignment. It remains in the exact parsed-body receipt fingerprint, preserving pre-upgrade requests. Changing, adding or omitting that field with an already-used request ID still returns `COMMAND_ID_CONFLICT`; clients must retry their original body. The new client sends `{ "protocolVersion": 2, "requestId": "admission-001", "roomCode": "0123456789AB" }`. The neutral response remains `{ "ok": true, "serverTimeMs": 1700000000000, "result": { "matchId": "example-match", "admissionId": "example-admission", "status": "pending" } }`; the assigned room stays in the admission and subsequent lobby/seat documents.

## Scope and rollout

Only `services/game-api/src/full-game.ts` changes runtime behavior. No new service module or packaging allowlist update is required. Only `v1RequestAdmission` and `v1SetPracticeBots` execute changed behavior; the other methods continue copying recorded rooms. Deploy the compatible backend before clients that omit the deprecated field. Backend code with the old required-field schema cannot accept the new client request; the exact shared-contract base is a dependency.

Protocol 2, lifecycle `staged-start-1`, engine `full-game-1.0.1`, ruleset `in-person-v1-2026-10-06` and hash `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90` remain unchanged. This is an admission/setup policy override, identified by the later decision and deployed service source; the historical pin alone no longer establishes player room choice. Role/Code/turn shuffling, deterministic engine replay, movement, 30-second character selection, minimum 30-second reading plus every human Ready, audience boundaries and Original Powers remain unchanged.

## Verification

Use Node 22.21.1 and npm 10.9.4. `npm run test:backend` includes request validation and seven focused service regressions for opposite/omitted legacy input, exact pre-upgrade receipt replay, retry callback reuse, post-commit lost acknowledgment, RNG failures and preflight. New Auth/Firestore cases cover concurrent duplicate admission, both server outcomes, approval, lobby/reading/running recovery, setup/launch persistence, bot retention/re-addition and new-bot callback retries. Existing lifecycle fixtures inject a separate room randomizer while retaining their assertions.

Run fake-clock Auth/Firestore tests separately from live-clock Functions/Tasks: `node scripts/test-emulator.mjs data`, then `node scripts/test-emulator.mjs functions` in fresh emulator processes/databases. The local verification uses a temporary equivalent configuration with loopback ports Auth 29199, Firestore 28180, hub 24500 and logging 24600 because standard ports are occupied. Only paths and ports differ; every repository data test file is retained, with Functions/Tasks absent from the fake-clock group. Emulator project is exclusively `demo-mothership`.

Actual checks on 8 October 2026:

- `npm ci` with explicit pinned toolchain: passed (887 installed packages). An initial unpinned invocation was refused by the engine gate; no toolchain requirement was relaxed.
- `npm run check:toolchain`: passed with Node 22.21.1 / npm 10.9.4.
- `npm run typecheck:pure`: passed.
- `npm run test:backend`: 126 passed, 0 failed, 0 skipped, including the seven new service cases and the updated protocol/examples checks.
- Fresh complete Auth/Firestore data group: 102 passed, 0 failed, 0 skipped (98 retained cases plus four initial random-room cases).
- Fresh focused random-room group after adding atomic bot rollback: all five passed, 0 failed, 0 skipped. This covers 103 distinct data cases across the complete and focused runs; it is not a claim that the final 103-case group ran in one process.
- `npm run package:backend`: passed; allowlist and forbidden-source scan passed. Standalone package installation was not run.
- `git diff --check`: passed.

Actual Functions/Tasks smokes were **not run**: the standard Auth 9199 / Firestore 8180 / Functions 5101 / Tasks 9499 ports belong to an existing Claude harness, and the unchanged runtime guard intentionally rejects alternate ports. No occupied process was stopped. The coordinator will obtain fresh actual-Functions and frontend-emulator evidence through integrated CI. Full root `npm run verify`, cloud deployment, hosted-browser acceptance and human balance were **not run** in this backend task; those belong to the integrated PR evidence.
