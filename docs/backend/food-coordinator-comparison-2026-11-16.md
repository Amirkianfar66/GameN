# Food coordinator comparison

Status: completed bounded experiment; **no-go for production adoption**. No deployment.
Tracking: [Food responsiveness #274](https://github.com/Amirkianfar66/GameN/issues/274#issuecomment-6904292863).
Baseline: `64e55516d2f0026842c5c2a675f2eccda20e0a9e` (merge of #283,
reviewed source `f57fa11c05f05fa44ed87746759d84b35f53aba3`).

## Purpose and boundaries

Determine whether one active Food Task owner, authorized push delivery and
independent liveness reception remove the observed multi-second stalls without
weakening authority, durability, recovery or information visibility. This is not
a decision to replace Firebase or the rest of the game backend.

The owner approved the experiment on 16 November. Existing staging, production
creation profiles, rules, visual components and historical matches are unchanged.
The local first-lift and pending-prefix patches remain evidence, not the release
candidate. The new experiment starts from the deployed baseline, not those patches.

Backend owns the coordinator and persistence/failure comparison. Frontend owns a
development-only adapter and measurements using the actual current controls and
Designer renderer. Integration owns this protocol, contract review and the result.
No new visual design is requested. Production adoption remains a separate reviewed
change, including the existing Designer gate if the playable interface changes.

## Invariants

- Reuse the current pure engine and exact Food rules/profile. Do not duplicate its
  physics, targeting, bot eligibility or visibility rules in the prototype.
- Preserve the 30-second Task, 4-second briefing, 32.5-second common return,
  50/200/150 ms Panel parameters, 2-second presence lease and 8-second grace.
- A received message is not an accepted or committed outcome. An outcome announced
  as durable must survive owner/process failure and an acknowledgement loss.
- Retain the baseline's successful durable-admission timestamp semantics. Do not
  backdate a command to browser time, change receipt-time hit detection or retime
  an already admitted command during replay. Any proposed semantic change must be
  isolated and reported, not hidden as a performance optimization.
- One authoritative Task owner uses a monotonically fenced ownership generation.
  An old owner cannot persist or publish new authoritative outcomes after takeover.
- Exact command IDs, fingerprints, Task/control-session/binding/crate/gesture
  identities and causal Hold UP remain enforced. Duplicate delivery has one effect.
- An expired connection is not a fabricated release. Receiving liveness separately
  must not let a later renewal leapfrog an already due boundary or revive a closed
  grace period. Recovery must reproduce the last authoritative liveness decision.
- Routine state delivery does not create gameplay inputs. Backpressure may coalesce
  superseded state frames, never accepted inputs, required receipts or Hold closure.
- Public and per-player projections remain server-authorized; no private full-state
  subscription, global private sequence gaps, cross-seat receipts or stale identity
  access. Bot decisions use their own authorized projection.
- Return/results are committed to the match once. Host abort, seat recovery and
  other match-level writers cannot bypass the active owner's fence.

## Comparison protocol

Run both variants against the same real loopback Firestore version/configuration,
on the same machine, one variant at a time. Use paired script/seed IDs and record
source hashes, cold/warm status, clock origin and storage guarantees. Alternate run
order. A memory-only store is suitable for correctness tests, not latency evidence
against the durable baseline. Local trigger delivery is a model, not Cloud Tasks
or Eventarc validation.

Begin with one two-human Task and the existing seven-player audience before the
matrix. Then cover seven/nine total players with human-human, human-bot and bot-bot
Task pairs and a display. Include both human controls. The baseline uses the actual
client cadence: one in-flight READ, the next scheduled 500 ms after settlement,
and a one-second heartbeat check that sends only when no READ has published for
one second and no heartbeat is pending. Do not call unconditional high-rate traffic
the normal client. Report it separately if used as stress.

The first comparative sample is three paired runs per matrix cell. Report every
failure, each run's maximum and the sample count; small samples cannot establish a
reliable p99. Expand only if results are mixed or a specific question requires it.
Reuse existing evidence for unchanged visuals and rules. Do not run full workspace
or capacity suites as a substitute for this experiment.

Record independently:

| Boundary | Measurement |
| --- | --- |
| Input | Pointer/key event, local pending feedback, API/coordinator receive |
| Authority | Durable admission time, apply/commit completion, receipt delivery |
| Delivery | Authorized frame publication, receive, actual view update and next paint |
| Liveness | Contact received, contact durably recognized, expiry/transition applied |
| Scheduling | Intended deadline, owner wake, applied boundary and observed frame |
| Contention | Queue depth/wait, persistence time/retries, owner acquisition/fencing |
| Cost | Document operations and bytes per Task and per input; no cloud-cost estimate |

Use monotonic durations within each process and explicit clock synchronization
uncertainty across processes. Never subtract unrelated clocks. Server processing
is not touch-to-paint; a request acknowledgement is not a rendered frame. Do not
sum nested spans. Late telemetry and failures remain part of the result.

For browser confirmation use the existing Food renderer/controls at 390x844 and
430x932, with production-equivalent headers. Test both reduced/full motion for
lifecycle without recreating artwork. Physical phone performance is separately
reported; desktop viewports are not physical devices.

## Proposed experiment gates

These are engineering evaluation targets, not adopted gameplay changes or promises
of production performance:

- Normal-network probe: 100 ms round-trip delay with up to 25 ms jitter, no injected
  loss. Separately report loopback and adverse network conditions.
- Local pending feedback within 50 ms; it must not claim gameplay success.
- Server receive to durable applied result: p95 at most 150 ms, with no multi-second
  queue stalls during normal load. Report durable admission separately.
- Touch to authoritative painted result: p95 at most 300 ms, per input kind, plus
  maxima and missed/rejected inputs. Sparse command samples are per-run evidence,
  not a statistically established percentile.
- No healthy foreground client is marked absent because liveness waited behind
  gameplay persistence. Liveness must be durably recognized within its unchanged
  lease budget; a fast but lossy acknowledgement does not meet this gate.
- Current engine replay and the candidate agree for the same authoritative input
  times, including equal-time boundaries. A quick response alone does not establish
  fairness for a 250 ms Panel cycle; show timing-sensitive hits/misses separately.
- All durability, ordering, privacy and final-result invariants pass. Better speed
  with a weakened invariant is a failed comparison.

## Failure cases

1. Duplicate command and lost acknowledgement; recover the same original receipt.
2. UP delivered before/after an unacknowledged DOWN; no resurrected Hold, new crate
   release or lost closure, including browser hide and reconnect.
3. Owner dies after durable admission but before apply; takeover replays the exact
   context once. Kill after commit but before receipt, and before common return too.
4. Old owner resumes after takeover; its write and publication are fenced.
5. Slow/pause persistence while delivery/liveness continue; do not publish an
   uncommitted success, invent time or lose an acknowledged renewal on restart.
6. Deadline, liveness expiry and input at equal times; retain the approved order.
7. Slow consumer and reconnect with old epoch/revision; fresh authorized snapshot,
   no obsolete private frames, no historical animation replay or extra game time.
8. Seat-binding recovery, revoked caller, observer and other participant: no private
   receipt/projection access. Host abort is serialized and cancels future work.
9. Completion/retry/takeover race: one delivery, one resource change, one common
   return, no duplicate final result in the parent match.

## Results

### Initial shared-cursor prototype: no-go

Source `431443998dbde658c4bdd99005b2275b81d38b42` separates the apply owner and
read-only push delivery, but simultaneous input and heartbeat admissions still
share a transactional append cursor. Three corrected paired trials use all seven
player views plus a display and retain late in-flight completions. They show that
this split alone does not meet the unchanged liveness budget.

| Trial | Baseline DOWN to original receipt | Prototype DOWN to original receipt | Baseline maximum heartbeat | Prototype maximum heartbeat |
| --- | ---: | ---: | ---: | ---: |
| 1 | 5,389 ms | 3,548 ms | 6,124 ms | 5,036 ms |
| 2 | 162 ms | 93 ms | 3,569 ms | 5,029 ms |
| 3 | 156 ms | 88 ms | 9,874 ms | 5,033 ms |

DOWN durations are measured from the script observing an offered control through
the original result; they are not touch-to-paint. Prototype heartbeat durations
end at durable admission, whereas baseline heartbeat responses wait for ordered
processing too. That distinction prevents treating the columns as identical work;
the prototype admission delay alone is already too long. The baseline returned
one `UNAVAILABLE` READ in each of trials 2 and 3. All tracked requests settled
within the bounded completion tail. No failures were removed from the evidence.

The [synthetic reports and provenance](evidence/food-coordinator-2026-11-16/provenance.json)
are retained. These are small local service trials with modeled trigger delivery,
not cloud or device acceptance. Logical storage-call counts include SDK callback
attempts and are not billed Firestore operations. The initial exploratory pair
that omitted a viewer and dropped late observations is excluded from this table.

### Owner-routed admission FIFO: no-go

Measured source `0c9025b5faf48c18aaf354e2d17c90d8276f25b9` routes every
admission through the active owner, fences each durable append and serializes only
the small admissions independently of gameplay apply. The three subsequent runs
used the same emulator version and machine, in a fresh emulator session. They
were not interleaved with new baseline runs. See the [Backend report](food-coordinator-prototype-2026-11-16.md)
for the callable port, reproduction commands and complete table.

| Trial | DOWN to original receipt | Panel RELEASE to original receipt | Maximum heartbeat response | Result |
| --- | ---: | ---: | ---: | --- |
| 1 | 99 ms | 101 ms | 50 ms | Representative service path completed |
| 2 | 104 ms | 95 ms | 10,645 ms | Two heartbeats rejected as stale; owner stopped |
| 3 | 168 ms | 97 ms | 63 ms | Representative service path completed |

The failed trial received 20 heartbeats and durably admitted/applied 18. Its two
remaining heartbeats waited across the unchanged two-second presence budget and
then failed after the owner became stale. The longest admission FIFO wait was
10,633 ms. The aggregate storage trace contains an SDK read lasting 9,130 ms and a
1,482 ms retry gap. It does not correlate that read with a named admission or lease
operation, so **the operation that first blocked the FIFO is not established**.
The 14-second observation window retained late completions through a bounded
25-second tail. No tracked request was silently discarded or left unresolved.

This demonstrates an unresolved persistence/ownership liveness failure in this
candidate. It does not prove that Firestore is unsuitable for the game, nor that
an untested WebSocket replacement would fix the issue. Firestore documents that
contention can delay or retry operations; its exact contribution here remains
unproven ([official transaction documentation](https://firebase.google.com/docs/firestore/transaction-data-contention)).

### Correctness and browser status

The real-Firestore focused suite passed **3/3** on the measured owner-FIFO source:
shared-cursor recovery, owner-FIFO recovery, and same-authoritative-time replay.
Those cases cover committed admission after lost acknowledgement, retry
idempotency, earlier UP closing a delayed DOWN, stale-owner write rejection,
contact admission while apply is paused, audience-specific frames and original
receipt lookup after return. The matched replay covers DOWN, RELEASE, LOCK, UP and
both KEY inputs and records one ten-dose delivery in each runtime. This is a
narrow correctness result, not acceptance of all invariants listed above. The
service fixture defaulted to `design-0.6.0` in both measured arms. This is not the
native Food release tuple (`design-0.9.0`); it does not change the reused Food
engine, but prevents treating these runs as a playable native integration test.
The retained browser harness requests the supported art pin explicitly and
rejects a mismatched seed before opening the trial.

A subsequent unchanged-coordinator run passed **4/4**, adding a same-body
stale-to-fresh subscription regression with no public frame for private contact.
A separate fixture test confirmed the optional native art pin. Integration
re-ran the **83 focused Frontend checks** after combining the ports; all passed.
The combined checkout also passed the targeted package build, workspace boundary
and source-integrity checks. The first two integrity attempts lacked installed
dependencies; after a pinned offline `npm ci`, both checks passed. No full-suite
or capacity rerun was used as latency evidence.

Frontend prepared a development-only browser entry reusing the actual controller,
board and Designer renderer under production-equivalent headers. Its focused
adapter checks and build are reported separately in the [client handoff](../frontend/food-coordinator-client-trial-2026-11-16.md).
**The browser pilot was not launched** because the preceding service liveness gate
failed. Touch-to-paint, physical phones, 100 ms network/jitter, nine-player and
mixed-bot trials remain unrun. Browser Ask, Join and Decline are also unmeasured;
the fixture seeds the active Task through those ordinary service calls.

### Integration review and next bounded work package

The reusable part is the separation between an authenticated command admission,
a durable applied receipt, and an authorized pushed projection. Preserve that
boundary. The current admission/lease design is not accepted for runtime use.

1. **Backend:** identify the first blocking operation with per-operation ingress,
   lease-renewal, read, commit and retry spans. Do not log private payloads. The
   current aggregate spans cannot distinguish admission contention from owner
   renewal. Inspect the owner/head document conflicts and the generic chunked
   storage adapter before choosing another storage product.
2. **Backend + Integration:** propose a compact, fenced durable journal whose
   append and liveness path does not depend on a full match apply/checkpoint or an
   unbounded operation ahead of it. Explicitly specify ambiguous commit recovery,
   admission timestamps, causal Hold closure, overdue boundaries, and owner
   takeover. A timeout must not acknowledge success, discard a possibly committed
   input, backdate authority, or silently extend gameplay time. If the selected
   persistence system cannot provide the required latency/recovery trade-off,
   present that limitation before changing durability or rules.
3. **Frontend:** retain the current dev adapter and renderer. Add command-to-frame
   correlation only through an authorized application witness; never infer it
   from a revision change. Reuse the prepared harness after the service gate passes.
4. **Integration:** rerun the same small representative comparison on the next
   candidate before expanding to network/device/mixed-roster tests. Then verify
   hosted routing, recovery/abort, and one fenced parent-match result handoff.
   Current prototype fixtures have static bindings and an isolated return record;
   they do not implement those production integrations.

This next work package is a recommendation, not an approved runtime architecture
or a promise of a deployment date. No change to Task timing, hit detection,
presence lease, game rules, artwork or historical matches is proposed by the
experiment. Issue #274 remains open. Staging remains unchanged.
