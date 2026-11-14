# Atomic creation of missing Food worker leases

Issue [#246](https://github.com/Amirkianfar66/GameN/issues/246) follows
[PR #245](https://github.com/Amirkianfar66/GameN/pull/245). Actual starting SHA:
`6b7341fb95ef568616fda17b96da5fc905e6ab45`; isolated branch
`codex/backend-food-prefix-create`. All earlier candidates and their failed live
results remain preserved. The focused PR records the final SHA and subsequent
exact-head measurements without advancing that frozen source.

The starting SHA passed nine CI checks, but its normal HTTP matrix was
7 FAIL / 8 PASS / 9 FAIL. Seven and nine exceeded the existing ten-second read
limit. Separate diagnostic journeys exposed substantial Commit contention, not
a new rules failure or an invalid/closed read from #243. No previous result
qualifies the new source.

Two independently checked claim pairs read the same missing lease metadata,
sent competing commits 8–10ms apart, and both encountered about two seconds of
Commit lock waiting. Six of ten captured errors had this claim footprint.
Another human control admission took 9,051ms across two failed commits and its
winning commit. The evidence does not prove a reversed lock-order cycle or
that missing-lease claims explain every Control delay. Pinned emulator bytecode
also ruled out the proposed synchronous Functions-delivery wait under commit
locks: HTTP event delivery is asynchronous.

A separate, explicitly synthetic four-case Firestore probe compared normal and
controlled read-then-write claims with atomic creation. The normal pair took
3,512/3,572ms; the controlled pair 2,024/2,877ms. Stock transaction.create with
no prefix read took 5.9/6.5ms, with one winner and one ALREADY_EXISTS loser.
Every case verified atomic lease/wake envelopes, original bytes/digests and no
losing wake. This causal measurement is not game acceptance or a load guarantee.

## Private persistence and ownership change

The optional server persistence transaction.create buffers cloned JSON values
and applies exists:false to metadata and every emitted chunk. It skips old
metadata reads for these creates, retaining the same SDK transaction and atomic
pre-claim authorization, receipt, token and rate checks. Conflicting buffered
operations are rejected; null is encoded as JSON null rather than deletion.
Ordinary set/delete semantics and size/write budgets remain unchanged. The
preconditions cover emitted chunks, not unexamined higher orphan fragments.

Only a successful create-only callback/flush on an attempt with no earlier
possible Commit may translate numeric Error code 6 into the internal
PlanetAtomicCreateConflict. Original cause is retained. Callback/read/domain,
synchronous SDK-create and mixed-write errors remain raw. Any prior possible
write/Commit, including an empty callback or ambiguous applied Commit followed
by a retry, permanently prevents this classification. Raw creates cross the
existing sticky write-flush barrier before SDK mutation. The closed-read
classification from #243 and the SDK invocation/budget/options are unchanged;
there is no outer resubmission or new retry policy.

Existing read-only lease observations provide an advisory absence hint. When
supported, acquisition atomically creates the complete lease and expiry wake
without reading the missing lease in the RW transaction. A proven create
conflict loses only the technical claim; the usual read-only loop observes the
actual owner. Existing/expired leases and unsupported adapters retain their
old read/set path. Eight-second leases, twenty-second wait budgets, original
wakes, owner fences, contexts and canonical admitted-prefix ordering remain.
The safe Winch/Panel admission guards from #245 remain authoritative. The new
internal error module is included in the explicit Planet package closure.

## Verification and scope

Before source freeze: pinned install, full workspace build/typecheck and static
integrity checks passed. Focused recovery/service tests passed 82/82, including
the unchanged 24 closed-read canaries. Full Backend/Firebase passed 604/604,
zero failed/skipped. Classic and Planet standalone clean installs and source/
export scans passed. New cases cover atomic preconditions, complete envelopes,
ambiguity, callback/error identity, native 7/8/9 journeys, original receipts,
authorization/rate denial, lost acknowledgement, expiry and fallback. Existing
assertion files were preserved. Genuine Auth/Firestore passed 27/27, including
the four new atomic-create cases and unchanged Food/boarding/service files,
zero failed/skipped (187,254.202ms). Fresh real-time normal HTTP and CI results
are recorded in the PR after execution, not assumed here.

Food remains protocol 3 / planet-game-1.4.0 /
in-person-planet-food-task-2026-11-12, authority SHA256
`7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333`.
No new rule tuple, engine transition, shared/client field or phone presentation
is introduced. Saved matches, admitted contexts, original receipts and pure
engine replay remain pinned. This changes technical coordination before input
admission; it does not promise that every source of Control contention is fixed.
No gameplay ordering decision remains open for this correction. No cloud/IAM,
deployment, dependency, default activation, timer or geometry change is included.
Corrected native connected evidence, Designer acceptance and combined
Integration CI remain separate Food test 1 release gates.
