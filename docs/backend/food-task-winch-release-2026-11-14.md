# Food Task bot Winch release scheduling

Issue [#244](https://github.com/Amirkianfar66/GameN/issues/244) is a focused
service correction for [Food test 1 / #237](https://github.com/Amirkianfar66/GameN/issues/237).
Actual starting SHA: `1ee85abd253ad1490737edb274ef99b2050971dc`, the frozen
Firestore recovery candidate in [PR #243](https://github.com/Amirkianfar66/GameN/pull/243).
Branch `codex/backend-winch-release` is stacked on
`codex/backend-precommit-read-recovery`; the original Backend and runtime
worktrees remain preserved. The focused PR records the final frozen SHA and
measurements made after this document's commit.

## Observed failure and bounded diagnosis

The unchanged starting SHA passed all nine CI checks and 570 genuine
Auth/Firestore cases. Its subsequent normal authenticated, real-time Food matrix
was **7 FAIL / 8 PASS / 9 PASS**, all human Panel / bot Winch. Seven accepted the
human release and lock at platform 6, but recorded no bot UP after the initial
HOLD: the crate remained held until TIME. Eight and nine delivered at Task
+16,289ms and +26,763ms. The first nine-player invocation never started because
the disposable JRE was incomplete; restoring the same checksum-verified
Temurin 21.0.13+9 allowed the unchanged nine-player rerun to pass. All original
outputs remain separate. Later passes do not waive the seven-player failure.

A separate native controlled-clock diagnostic reproduces one scheduling hazard:
the bot chooses a policy-safe UP, then a redundant CLOCK admission and its 200ms
acknowledgment delay consume that opportunity before UP is proposed again. No UP
intent is created. Independently delaying UP's final admission by 200ms correctly
rejects the now-unsafe release. These causal fixtures do not establish the sole
cause of the real-time seven-player failure and are not connected acceptance.

## Narrow service change

Only the first actionable bot in the existing stored member order may propose
its actual-holder Winch UP before the preliminary CLOCK. The current holder's
gesture sequence, crate binding and current crate must agree. The committed
prefix and effective-presence gates remain in place; **every due engine boundary,
including a warning**, keeps the existing CLOCK route. Closing a newer pending
contact is not this actual-holder optimization.

An owned fresh probe precedes request ID allocation. The proposal uses the
existing submit/admit/drain path with no retained UP or timing bound. Final
admission still checks the actual clock, current safe-release policy, worker
ownership, actor, Task, session, gesture, crate, presence and pending prefix.
A rejected uncommitted UP is discarded. No input is backdated, retimed, forced
or kept for a later release window. Existing Panel LOCK behavior is unchanged.
The optional proposal is local coordinator state, not a shared or durable field.

## Verification and release gates

Before source freeze: pinned Node 22.21.1 / npm 10.9.4 install, full workspace
typecheck and build passed. Fourteen new native service cases passed across
7/8/9 players, covering safe admission, avoided CLOCK delay, late actual-time
rejection, exact replay/restart, original pending-prefix recovery, due warnings,
effective human presence, physical motion and newer pending-contact closure.
The prefix case checks the public UNAVAILABLE envelope and a durable pending
entry/wake before recovery. Its first fixture incorrectly expected an exception;
only this new fixture was corrected. Existing assertions were preserved.

All 560 Backend/Firebase cases passed (zero failures or skips). The genuine
Auth/Firestore Food, boarding and service group passed 23/23 (zero failures or
skips), including the original historical assertions. Both classic and Planet
standalone packages passed clean installation and forbidden-source/export scans.
Toolchain, workspace and source-integrity checks passed. Independent source and
test reviews accepted the exact patch. No claim of a new full 570-case database
run follows from the predecessor's result.

The final frozen-head, normal HTTP 7/8/9 real-time matrix and new CI results are
recorded in the PR after execution. These journeys use normal authenticated
setup, one scripted human with bots, random controls, the real clock and the
official local Auth/Firestore/Functions emulators. No fixture state, injected
clock, manual advance/runBots or direct Task callback is connected acceptance.
Every invocation and control assignment must be reported; no source changes
occur between freeze and the matrix. The matching API is handed to Frontend
only after that gate passes. Corrected native connected evidence, Designer
acceptance and combined Integration CI remain separate release gates.

## Version and scope

Food remains protocol 3 / `planet-game-1.4.0` /
`in-person-planet-food-task-2026-11-12`, authority SHA256
`7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333`.
No additional behavior version is needed for removing a technical round trip
while retaining the existing policy and admission guards. Engine, rule sources,
contracts, saved tuples, original receipts and replay semantics are unchanged.
No gameplay ordering decision remains unresolved in this correction.

No phone render source, words, controls, layout, motion or assets change here;
the phone visual gate does not apply to this private service diff. The combined
release still requires its visual review. No physical-device, hosted-network,
load or human-balance claim follows from these local checks. No cloud
configuration, IAM, deployment, dependency, default activation, geometry, policy
preference, timer or gameplay change is included.

Unchanged synthetic command/receipt shape (actor supplied by authentication):

```json
{"operation":"foodCommand","request":{"schemaVersion":1,"protocolVersion":3,"matchId":"synthetic-match","phaseId":"synthetic-phase","foodStepId":"synthetic-step","round":1,"commandId":"own-command","command":{"type":"TASK_PRESS","taskId":"synthetic-task","controlSessionId":"own-session","expectedControlRevision":1,"input":{"kind":"HOLD","edge":"UP","gestureSequence":1,"crateId":"current-crate"}}}}
```

```json
{"schemaVersion":1,"protocolVersion":3,"matchId":"synthetic-match","phaseId":"synthetic-phase","foodStepId":"synthetic-step","round":1,"commandId":"own-command","receivedAt":1800000000000,"status":"accepted","result":{"kind":"INPUT","taskId":"synthetic-task","controlSessionId":"own-session","effect":"APPLIED","gestureSequence":1,"crateId":"current-crate"}}
```
