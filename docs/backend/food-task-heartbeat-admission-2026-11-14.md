# Detach ordered Food heartbeat admission from writer ownership

Issue [#256](https://github.com/Amirkianfar66/GameN/issues/256), a focused source
correction under [#246](https://github.com/Amirkianfar66/GameN/issues/246).
Actual starting SHA: `e5025bcf7f049be8898aebcb071079b33302a467`, the reviewed
receipt correction #253 with Integration's corrected base and #255 CI budget
dependency. Branch: `codex/backend-detached-heartbeat` in a separate worktree.
The running official d5 checkout, service processes, data and first-run evidence
remain preserved.

## Problem and correction

Heartbeat admission previously waited for a shared Session writer before
sampling its recorded admission time. An owner awaiting acknowledgement before
cleanup could therefore delay an otherwise timely heartbeat beyond grace.
The controlled regression demonstrates this source path independently of the
still-unattributed native503 and delayed admission in the original failed run.

Only heartbeat admission is detached. One consistent read-only snapshot captures
the current human seat, binding and raw Control. The admission transaction checks
that Control is unchanged before spending rate budget, sampling a context or
writing anything. A clean mismatch permits another fresh snapshot, bounded to
eight attempts and the existing twenty-second technical wall budget checked
between attempts; an in-flight SDK call is not aborted by that loop. Storage or
acknowledgement errors do not enter that recapture loop. SDK callback retries
recheck the fence and use their own successful-attempt clock sample; no HTTP,
client or first-observation timestamp becomes authority.

The fence relies on initialized Food membership, binding, abort and gameplay
changes committing with Control. Scheduler-only Session publication and generic
pending-admission appends cannot change the captured own human binding. A pending
prefix is permitted: a previously queued recovery can still invalidate the
captured owner, and ordered processing retains its fresh seat/revision check.
The captured Session is never republished by detached admission.

Admission atomically records the ordered heartbeat, its rate charge and a private
ingress recovery wake. It changes no presence, contact watermark or game state.
The wake uses the captured server phase and a unique technical token, because a
heartbeat has no client phase or request ID. Its saved entry retains the original
Task ID. Recovery processes that exact sequence before checking ordinary
scheduler-phase relevance, so a later phase cannot strand the entry. Task,
health, membership, binding and grace eligibility remain in ordered application;
an obsolete Task cannot renew a new one. Distinct physical heartbeats remain
distinct requests; no request ID or deduplication rule is invented.

## Causal evidence and limits

The unchanged starting source failed all three new 7/8/9-player causal tests at
the specific missing-admission assertion, without a timeout. The same three pass
with the correction. Normal one-human Food setup, injected fixture time and an
outside-writer-queue post-commit acknowledgement gate produce this sequence:

- Last own renewal at Task start; presence expires at +2 seconds.
- At +4 seconds, a genuine CLOCK records offline +2 and briefing +4. Its positive
  prefix owner remains live through +12 while its acknowledgement is held.
- Heartbeat at +4.5 commits its entry and wake before that owner is released,
  without renewing presence or completing the service call.
- At fixture time +11, release permits ordered application using the committed
  +4.5 sample. The heartbeat renews only through +6.5; its response retains +4.5.
- Later processing at +11 legitimately records offline +6.5, with grace ending
  +14.5. It does not manufacture permanent online state or a Hold release.

No own service read is allowed to mask this actor's renewal path. These gates
model service-port causality, not Firestore lock latency or a native network.
Admission, eventual ordered application and response completion are separate
observations. A client with one outstanding heartbeat waiter can still lose
real-time liveness when processing/responses stall; no cadence, timeout or lease
change is included. The failed final7 and native503 remain unresolved evidence.

The seventeen guard cases cover normal UID recovery/revocation and same-UID
binding recapture, an earlier queued recovery, successful-attempt callback time,
closed grace, bounded fence mismatch, unmasked storage failure, distinct physical
heartbeats, invalid Task/member/rate/dead/ended controls, and lost admission ACK
recovery without the caller. The dead-participant case is explicitly a synthetic
projection-port guard, not a native death history. The callback retry is a storage
port simulation, not an observed SDK contention event. A separate controlled case
delivers a still-pending old-phase wake for the first time after an earlier queued
common return, then verifies rejection without renewal.

Three new genuine Firestore cases build normal 7/8/9-player matches with current
Food1.4/setup3/art0.9 pins. Their wrapper faults only after the real SDK admission
transaction resolves its commit. They verify unchanged Session on admission,
atomic entry/wake, original Task/phase/time, independent recovery after restart,
one heartbeat effect and repeated-wake safety after common return. Their
post-phase-change retry uses an already completed wake; the first pending-wake
phase-change scenario is the separate controlled-port case above. These prove
genuine persistence plus injected acknowledgement loss, not native latency or
continued liveness.

All 57 Planet SDK regressions passed, none skipped, in 258,617 ms on separate
Auth19199/Firestore18180 ports without Functions. The test emulators shut down
normally. Build, full typecheck, toolchain/workspace/source checks and both
Classic/Planet standalone package installation checks passed. The final
backend/Firebase service regression passed 648/648, none skipped, in 27,546 ms.
The earlier 647/647 run preceded the additional first-pending-phase-wake case.
Exact CI identity and pending required checks are reported in the PR.

The first guard draft passed15/16: a recovery fixture held a zero writer while
awaiting dependent processing. Replacing that gate with a committed lost ACK
preserved pending history while allowing normal cleanup. A later phase-test
draft referenced a removed helper; that fixture reference was corrected. Both
intermediate logs and the original three baseline failures remain preserved.
Independent source/test reviews found no blocker. No additional connected match
or observer is authorized or run; first-run native failures remain intact.

## Version and ownership boundary

Protocol3 / `planet-game-1.4.0` /
`in-person-planet-food-task-2026-11-12`, authority SHA256
`7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333`,
remain unchanged. The pure engine, recorded entry contexts and replay order are
unchanged; existing receipts and stored matches are not rewritten. No shared
contract, heartbeat ID, rule, timer,2-second lease,8-second grace, client flow,
visual input, dependency, cloud/IAM, deployment or default activation changes.
Integration owns adoption, required checks and separate native acceptance.
