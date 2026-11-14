# Recover setup receipts after Food initialization

Issue [#248](https://github.com/Amirkianfar66/GameN/issues/248). Actual starting
SHA: `1524e5d173c5dc06ff44222c8fd566ca0a04d21d`, Integration's merge of reviewed
#243/#245/#247. Isolated branch: `codex/backend-food-setup-receipts`. The original
Backend checkout and all prior candidates and failed evidence remain preserved.

A final Ready could commit during reading and lose its acknowledgement. Once
boarding initialized the Food state, the coordinator rejected the exact retry
with NOT_ALLOWED before reaching the saved operation receipt. The same routing
affected accepted beginSetup, setBots, chooseCharacter and approveAdmission
operations, and hid REQUEST_ID_CONFLICT for changed payloads under an old ID.
This is distinct from #240/8818's simultaneous historical Ready failure; that
fixture has no Food state and its assertions are unchanged.

## Correction and authorization

Only these five setup operations gain a receipt recovery route after Food
initialization. One read-only snapshot reloads the current Session, authorizes
the current UID, then reads the existing UID/request-ID-scoped receipt. An exact
fingerprint returns the original response unchanged, including its original
server time. A changed fingerprint conflicts; a missing original is denied.
The operations are not added to live Food admission or application.

Current participant authorization precedes receipt lookup and fingerprint
comparison. Revoked UIDs cannot recover an old receipt; a replacement UID does
not inherit another UID's receipt namespace. The participant check retains the
generic path's existing replay semantics; original host/member requirements
still apply when a setup effect is first performed.

Already initialized Food retries draw no new context and change no game, budget,
journal, input, lease or wake. A stale boarding observation may already have
sampled one discarded generic context and charged one generic rate unit before
FoodHandoff. That existing boundary remains unchanged. In particular, an already
exhausted generic budget on that stale path can still reject before handoff;
this correction does not redesign historical rate processing.

## Evidence

The initial new fixture used an overlong display label and failed validation
before reaching the defect. That local log was retained, the label was corrected
to the existing twelve-character limit, and production source remained unchanged.
The corrected original eight cases then all failed on the untouched starting
SHA: exact replay returned NOT_ALLOWED instead of the committed success, and
revoked-UID paths returned NOT_ALLOWED before authorization. After the twelve-line
production change, those same eight passed. Three normal-abort cases and an
additional revoked-UID conflict assertion were subsequently added; their final
results are reported separately from that original before/after comparison.

Service fixtures use injected time and an acknowledgement-loss fault after an
actual committed receipt. They build normal 7/8/9-player matches with two human
members, setup flow 3 and Food 1.4; no game state or receipt is seeded. Only the
explicit negative transport-budget fixture constructs rate counters. Tests cover
all five original operations, restart, missing originals, payload conflict,
exhausted budgets, normal recovery/revocation, normal abort, a stale boarding
handoff and authorization after a stale initialized-state observation. Detached
read snapshots allow the real setup/recovery transition to complete before the
old observation resumes. The handoff retains its original one context/rate charge.

New genuine Firestore cases separately exercise 7/8/9 normal setup, an actually
acknowledged Ready commit, normal boarding initialization, fresh service receipt
replay, conflicts, new IDs and UID recovery. They compare relevant authority
hashes/counts without printing private synthetic game state. These tests use
controlled service time; they are not real-time native-client acceptance.

Independent source review accepted the narrow recovery/authentication change and
the causal tests. It requested the revoked-UID conflict and normal-abort cases,
which were added. Natural finished-state and cross-match receipt lookup are not
executed in these new cases; the shared guarded route was source-inspected.
Final verification counts, exact PR head and compiled identity are recorded in
the PR after execution.

## Version and release boundary

Food remains protocol 3 / `planet-game-1.4.0` /
`in-person-planet-food-task-2026-11-12`, authority SHA256
`7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333`.
This restores technical receipt semantics and does not change rules, pure engine
transitions, stored contexts, replay order, historical tuples, shared contracts,
phone fields, artwork, geometry or timers. No new gameplay decision is required.
No dependency, cloud/IAM, deployment or default activation change is included.

The #246 pre-admission latency investigation remains separate. Prior native
seven-player evidence failed and eight/nine were unrun; none qualifies this
source. Frontend's pending-input recovery correction, its new source registration,
Designer recheck, fresh connected 7/8/9-player evidence and final combined checks
remain Integration release work. A passing controlled service or SDK suite does
not establish those outcomes.
