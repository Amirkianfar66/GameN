# Firestore read recovery before any possible commit

Issue [#242](https://github.com/Amirkianfar66/GameN/issues/242) is a focused
persistence correction for [Food test 1 / #237](https://github.com/Amirkianfar66/GameN/issues/237).
Actual starting SHA: `cbf38a95589db1a83867a48bc6fb2569ccabbd48`, Integration
branch `codex/integration-food-test-1`. The isolated implementation branch is
`codex/backend-precommit-read-recovery`. Its final committed SHA and exact-head
results belong in the focused PR. The original Backend checkout and frozen
Food candidate `6a2a78d7b8c750395f6d4cefb432b0b2fbbadf06` remain preserved.

The affected store was byte-identical at these two starting snapshots. A bounded
original-file diagnostic at6a passed15/16 and reproduced a duplicate-command
failure: the first-attempt RW UID-rate-counter metadata read succeeded, then its
chunk read failed with gRPC3, `Transaction is invalid or closed.`, before any SDK
write/Commit. Earlier CI and local failures occurred at historical Ready and
deadline sites. An initial lower-level abort hidden by transport retries remains
unproven. Later passing reruns are not a root-cause diagnosis.

The preserved gRPC message contains the exact server details string. Installed
`@grpc/grpc-js` constructs its message from `status.code` and `status.details`,
then copies that Status into the Error. This supports the exact details guard;
the original error/cause is retained for diagnosis.

The adapter now classifies only rejected RW SDK `get`/`getAll` promises whose
Error has numeric code3 and exact details `Transaction is invalid or closed.` as
ABORTED/code10. The stock SDK handles its existing bounded attempts; the adapter
never resubmits an operation or configures a new retry budget. This is a **new
narrow read-error classification**, not an unchanged retry policy.

A monotonic `sdkAttemptMayCommit` flag spans every SDK attempt in one logical
adapter invocation. It is set before any raw SDK set/delete and before every
successful callback return, including an empty commit. It never resets. After
any earlier write flush or possible commit, a later closed read propagates
unchanged. This deliberately remains conservative even after a known aborted
write flush. The new classification cannot add a retry after a possibly
committed write or empty commit.

Arguments and document references are evaluated before entering the helper.
Synchronous SDK/local errors, read-only mode, arbitrary INVALID_ARGUMENT,
callback/domain errors, envelope/fragment/digest/JSON validation, SDK writes and
Commit errors remain outside it. Metadata and all chunks still share one SDK
snapshot; per-attempt buffers are fresh. JSON encoding and publication remain
atomic and unchanged.

Independent reviews accepted the actual adapter and24 fault canaries. The
ambiguous-Commit14 canary really persists the first attempt before losing its
acknowledgement, then verifies that a closed read3 causes no added third attempt
and no duplicate counter increment. Empty-commit14, known-aborted10 and raw
set/delete10 paths test the same sticky boundary. Other cases cover eligible
metadata/chunk/old-metadata recovery, exact cause preservation, unchanged error
identity and one default five-attempt SDK invocation.

Measured checks before final source freeze: pinned `npm ci`, full workspace build
and typecheck passed; targeted24/24 passed; Backend/Firebase546/546 passed; original
boarding/service files16/16 passed with unchanged assertions; both classic and
Planet standalone clean installs and forbidden-source/export scans passed.
Full Auth/Firestore regression results and the new exact-commit normal HTTP
Food7/8/9 real-time matrix are recorded in the PR when they finish. They are not
claimed passed here in advance. No code changes are planned between this source
freeze and those measurements.

No engine/contract/rule source or saved tuple changes. Food remains protocol3 /
`planet-game-1.4.0` / `in-person-planet-food-task-2026-11-12`, ruleset SHA256
`7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333`.
Historical versions and replay semantics remain pinned; immutable admissions,
original receipts, canonical ordering and actual-time validation remain in their
existing service paths. No rule decision remains open for this correction.

This PR changes no phone render source, contract, control, words, layout, motion
or assets; the phone visual gate is not applicable to this private adapter diff.
The combined release still requires Designer acceptance, corrected native
connected evidence and exact-head Integration CI. The prior native703 attempt
stopped before boarding/Task and is not a passing Food journey. No physical-device,
hosted-network, load or human-balance acceptance follows from these local checks.
No cloud configuration, IAM, deployment or default activation is included.

Synthetic unchanged command/receipt, with identity supplied by authentication:

```json
{"operation":"command","request":{"protocolVersion":3,"matchId":"synthetic-match","phaseId":"synthetic-phase","commandId":"own-command","command":{"type":"PASS_TURN"}}}
```

```json
{"protocolVersion":3,"matchId":"synthetic-match","commandId":"own-command","phaseId":"synthetic-phase","status":"accepted","code":"REGISTERED"}
```
