# Food 6a3: first normal 7/8/9 matrix

**All three first generated journeys passed the unchanged functional assertions. Responsiveness remains unresolved.** This is a new matrix on Backend `6a3bee398be7b433c0cce634fdfd4e2449243069`; it does not relabel the [earlier d5 failures](food-supply-final-matrix-2026-11-14.md) or the separate instrumented diagnostic. Each first assignment and outcome was retained, with no reroll or additional run.

| Roster / profile | First human assignment | Full journey | Explicit WINCH coverage |
| --- | --- | --- | --- |
| 7 · 390 × 844 / 100%, normal | WINCH | Delivery, common return, physical own Pass/confirmation, ATE / 1 dose, privacy, assets and cleanup passed | Verified: `networkDropWithoutRelease=true`, original DOWN and UP accepted/APPLIED |
| 8 · 320 × 568 / 200%, normal | WINCH | Same complete assertions passed | Verified: same flag and original DOWN/UP receipts |
| 9 · 390 × 844 / 100%, reduced | PANEL | Same complete assertions passed | Not assigned; no WINCH coverage inferred from this case |

Every Ready sent exactly one original successful request. Each Task retained the fixed 32,500 ms start-to-common-return interval, returned no earlier than its authoritative time, and showed stock 20 / FOOD_RETURNED / own return-placement presence. Each phone/display loaded the same 37 uniform Food asset URLs. Each physical Pass and confirmation sent one ordinary command and produced the authorized ATE / 1-dose meal. All complete public/privacy guards, normal abort cleanup and finally-path exception checks passed: zero captured exceptions and zero dropped phone/display observations.

Both WINCH cases used the existing real touch contact. After an admitted Hold, the unchanged harness placed only that phone offline for 650 ms, asserted no additional `foodCommand` and `physicalHolding=true`, restored the network, then completed the causal physical release and offered KEY. The flag is conditional in the existing driver; it was evaluated explicitly from each result together with the original accepted/APPLIED DOWN/UP replies. These checks establish this short-outage path, not long-outage, heartbeat-expiry, reload or all recovery behavior. No new runtime assertion was added.

| Case | Own offer after observed return | ATE observed after return |
| --- | --- | --- |
| 7 |16,570 ms|17,196 ms|
| 8 |164,243 ms|164,813 ms|
| 9 |182,347 ms|183,050 ms|

These waits follow the actual public phase/own-turn observations, including normal Hack conversations. They subtract observations in the same case-relative driver clock. No future turn order was read or phase advanced, extended or shortened.

## Measured responsiveness and receipt semantics

The following are actual same-document fetch-to-JSON intervals, using the retained fractional clock values. Join replies were 163.0 / 166.1 / 146.0 ms for 7/8/9. All listed Task-control responses were 200 / ok:true with their original accepted/APPLIED receipts. The two PANEL Release/Lock sequences are distinct recorded inputs, with no rewritten outcome or automatic reroll.

| Case | Physical Task replies, ms | Successful phone reads: p95 / maximum | Successful display reads: p95 / maximum |
| --- | --- | --- | --- |
| 7 | DOWN 189.4; UP 159.8; KEY 3,565.5 |226.0 / 1,833.4|274.6 / 3,675.6|
| 8 | DOWN 3,731.6; UP 156.4; KEY 141.7 |346.1 / 8,312.4|480.5 / 11,362.5|
| 9 | RELEASE 165.0; LOCK 7,452.6; RELEASE 7,213.5; LOCK 2,272.8; KEY 134.0 |508.8 / 7,372.1|506.8 / 7,506.7|

Seven had one incomplete/unsuccessful phone read excluded from successful-read statistics; the derived record retains that count. Long input/read tails are not cleared by delivery or the functional pass. They remain measured, unattributed responsiveness limitations; no HTTP arrival, admission, transaction, Firestore/RPC or paint cause is inferred by subtracting clocks from different domains.

Heartbeat semantics are retained separately. Seven's later 226.8 ms HTTP 200 / ok:false /NOT_ALLOWED heartbeat is **not** a successful renewal; Backend's read-only assessment places it after the ended Task. Eight also records a 6,651.1 ms /NOT_ALLOWED reply, which is not counted as success. Nine includes a 12,443.9 ms heartbeat reply with API `ok:true`; that observation is not independent proof of a winning durable-renewal timestamp. [All heartbeat statuses and intervals](evidence/food-supply-6a3-first-matrix-2026-11-14/summary.json) are published as allowlisted derived facts. The earlier conditional saved-clock split does not establish a server/storage cause and is not promoted to one here.

## Exact unchanged inputs

Before this documentation-only publication, the Frontend worktree was clean at **`9561784a10a564d5d57ace7d1e56d3ac6983fc95`**. Native remains Designer-accepted **`8ffce95a0cfe92facc75d8cf0a86f3686608f176`**, corrected development build **`99c585157f4ccd99846785149fd5f7da4fe5e3ca`**. The exact unchanged driver SHA-256 is **`3cbf1d86ce5b20ff55a34929d00512019d729e56b76a0348a46d2774bd57fe85`**. The connected bundle records 197 source modules / 69 accurate asset rows / 70 final served files, provenance **`9d31955c6e669c9af6a9411efe5a630befb59aeb7d7dc240a2943a3f27a27fc1`**. No client/server rebuild, native/visual edit, observer, injected state/clock, direct gameplay bypass or changed assertion occurred.

Preflight, between-count and postflight checks independently matched all 71 Backend source and 71 compiled files, the named 26 cross-checks and launcher `6eecab39502dd2be2481be742da014ddbf131a1913c476403ed52a28d97990da`. They also matched all 30 native inputs, 14 Designer pins, 37 SVGs, five driver modules and every captured build/source/final-file hash. Auth 9199 and preserved Firestore 8180 returned 200; supported unauthenticated API POST returned expected 401. The [checked service handoff](evidence/food-supply-6a3-first-matrix-2026-11-14/checked-service-handoff.md) identifies the normal `demo-mothership` service and its lifetime/registration limits. Normal automatic bot/Task/phase continuation was observed through the journeys; unique trigger delivery is not established.

Protocol 3 / planet-game-1.4.0 / in-person-planet-food-task-2026-11-12 / ruleset `7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333` / setup 3 / design 0.9.0 / tokens 0.5.0 are unchanged. Scheduled `planetRepairDeadlines` remains absent locally without Pub/Sub; these journeys do not validate scheduled repair. Returned placement presence was recorded true, but the two exact returned board positions were not compared. Desktop Chromium only; physical devices, Safari, VoiceOver and production networks remain untested.

The hash-pinned closure metadata is **unchanged**, SHA-256 `76a9b84c2c141c174375561f9e7f6121208a7f9b681cabd4838d1464131975c1`. Old d5 failed 7 result SHA-256 `755ad4d9e7aeb2a8c7a8be37ee8817c8db0cb59bdb708fe46fac91c2a38c32bd` is also unchanged. For precision, that old failure occurred at the DELIVERED assertion after common-return presence/time had been observed; downstream stock/checkpoint/assets/Pass/meal checks were unrun. No historical packet, outcome or pinned closure status is rewritten by this new result.

## Immutable evidence and handoff

[Sanitized full facts/requests/read statistics](evidence/food-supply-6a3-first-matrix-2026-11-14/summary.json), [public phase observations without identifiers/absolute clocks](evidence/food-supply-6a3-first-matrix-2026-11-14/phase-checkpoints.json), [preflight](evidence/food-supply-6a3-first-matrix-2026-11-14/preflight.json), [after7/before8](evidence/food-supply-6a3-first-matrix-2026-11-14/after7-before8.json), [after8/before9](evidence/food-supply-6a3-first-matrix-2026-11-14/after8-before9.json), [postflight](evidence/food-supply-6a3-first-matrix-2026-11-14/postflight.json), [private-original file identities/permissions](evidence/food-supply-6a3-first-matrix-2026-11-14/private-record-identities.json), [published artifact hashes](evidence/food-supply-6a3-first-matrix-2026-11-14/manifest.json).

The original connected packets, logs and screenshots remain unedited/private 0600 under `/private/tmp/gamen-food-native-6a3-first-20261114-01`. Only sanitized derived records and identities are published. The unchanged driver retains hashed match traces/local sequence rather than full match/command ids; authorized correlation uses the private originals and Backend's existing records. All generated matches and owned browser workers completed normal cleanup. This functional matrix and explicit WINCH coverage do not grant production/performance approval, merge, deployment or activation; Integration owns the remaining release decisions. No extra run or new Designer batch is requested.
