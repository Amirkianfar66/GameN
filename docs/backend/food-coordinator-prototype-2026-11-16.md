# Food Task coordinator prototype

Development experiment for [#274](https://github.com/Amirkianfar66/GameN/issues/274#issuecomment-6904292863). The worktree starts from `64e55516d2f0026842c5c2a675f2eccda20e0a9e`. It does not enter the production package graph. The shared-cursor sample uses `431443998dbde658c4bdd99005b2275b81d38b42`. The owner-routed variant uses `0c9025b5faf48c18aaf354e2d17c90d8276f25b9`.

## Callable port

`services/game-api/dev/food-task-coordinator/coordinator.d.mts` defines the interface. The demo creates a normal match through setup, Boarding, Ask and Join, then gives `openTask({session})` that Task's committed seed. The prototype controls the active Task through its common return. Ask, Join and Decline are outside the measured prototype button path. A complete integration would start the owner at the Food step, before a Task ID exists.

- `createLoopbackFoodStore()` requires an explicit IPv4 loopback Firestore emulator endpoint and uses `demo-mothership`. The adapter reuses the application's durable metadata/chunk storage and transactions.
- `openTask({session})` validates the current pinned engine and saves a separate dev Task. `startFoodTaskOwner({coordinator, taskId, clock, failed})` in `drive.mjs` acquires a fresh owner, subscribes to durable ingress, runs due work, monitors lease renewal and stops after outstanding work settles. `acquire`, `restore` and `runDue` are also callable separately for failure tests.
- `submit(taskId, uid, request)` takes the unchanged Food request and returns the successful durable admission. `receipt(taskId, uid, context)` authorizes the current recorded audience, checks named context fields including the command ID, and returns the original canonical receipt after commit. The attachment to this active Task remains queryable after return. The bridge must send Hold UP immediately and must never wait for DOWN's applied receipt to issue it.
- `heartbeat(taskId, uid)` can append while an apply is paused. The admitted time orders it alongside the earlier ingress and any due engine or presence boundary. Expiry wins an exact tie. The existing engine handles the eight-second grace and records a reconnect at its own admitted time when still eligible. `clockSample(taskId, uid)` provides an authenticated request/response sample for caller-side RTT measurement.
- `subscribe(taskId, uid, publish, failed)` reads only durable checkpoints, reauthorizes frames, sends authorized Food public/player projections, and supplies the corresponding ordinary player view. It suppresses unchanged audience bodies. `frameEpoch` is an opaque per-subscription generation and `frameSequence` counts only frames that generation emits. They carry no gameplay ingress cursor or ownership epoch. `snapshot` fetches the same authorized content without creating a gameplay input. The adapter must discard old generations on refocus/reconnect and respect input freshness and phase alignment.

The loopback bridge belongs to Frontend. Use the same coordinator instance for the routed owner and synthetic UID allowlist checks. The callable UID parameter represents an already authenticated caller. A deployed bridge would need trusted routing tied to owner acquisition and expiry, a safe retry path for unknown admission, identity recovery coordinated with the owner, and a fenced connection between the Task result and the parent match. This prototype has pinned fixture bindings and a private, atomic return checkpoint. It exercises no production host abort, UID replacement, or cross-service parent write.

## Compared storage paths

The coordinator commits a small admission cursor, immutable input and any deduplication record together. The actual successful callback's clock and entropy are saved before any receipt of durable admission. Engine work occurs outside the write transaction. The apply commit compares the prior checkpoint cursor and the current owner epoch, then persists the new checkpoint and receipt atomically. The return commit seals admission and records the full engine result once. A takeover can resume admitted work from Firestore after the earlier process disappears.

The `shared-cursor` variant lets incoming requests compete directly on the admission cursor. `owner-fifo` requires routing to the instance that acquired the current owner. It puts one append at a time through a per-Task FIFO and checks the owner epoch during every append, including contacts. The gameplay apply loop is separate from that FIFO. Durability still begins at the Firestore commit. A process failure can lose inputs that were only received. The prototype exercises an acknowledgment that fails after commit; a permanently unsettled append would require a transport recovery policy and a bounded failover test.

## Run the bounded experiment

Use the pinned Node and the loopback Firestore emulator. Build the existing packages first with `node node_modules/typescript/bin/tsc --build infra/firebase`. In the repository root, use:

```sh
node --test services/game-api/dev/food-task-coordinator/prototype.test.mjs
node services/game-api/dev/food-task-coordinator/compare.mjs baseline pair-01 14000 7
node services/game-api/dev/food-task-coordinator/compare.mjs coordinator pair-01 14000 7
node services/game-api/dev/food-task-coordinator/compare.mjs owner-fifo pair-01 14000 7
```

Each trial includes seven player views plus the display. It runs the same offer-driven two-human DOWN/RELEASE script. Actual press times differ when projections lag. A separate test uses common authoritative input times for mechanics equivalence. The baseline repeats one READ 500 ms after settlement and sends a fallback heartbeat at its one-second check only when stale and free. The push variants send independent liveness once per second. Both variants use the same Firebase Admin adapter and emulator. Old deployed worker delivery is modeled locally. The sample is server-side; browser paint and physical devices are measured elsewhere.

New traffic stops at 14 seconds. The harness retains completions for requests launched in that window through a bounded teardown. Counts labeled logical storage operations include attempted callbacks and do not represent billed Firestore RPCs. SDK span totals overlap. Prototype CPU includes its state copy and wrapper; baseline CPU times its individual engine calls. The two distributions are useful for locating cost within each run and have different units of work.

## Results on 16 November

The preliminary pair omitted one player and dropped post-window completions. The final evidence below corrects both. The baseline and shared-cursor variants alternated order in one emulator session. The three FIFO trials ran in a subsequent session on the same machine and emulator version. Node was 22.21.1 and Firestore Emulator was 1.20.2. Each row includes seven players plus the display. The source hashes are listed above. [Redacted per-trial results](evidence/food-coordinator-2026-11-16/).

| Variant and trial | DOWN to receipt | RELEASE to receipt | Heartbeats, max | Post-window completions | Errors |
| --- | ---: | ---: | ---: | ---: | --- |
| Baseline 01 | 5,389 ms | 252 ms | 4, 6,124 ms | 8 | 0 |
| Baseline 02 | 162 ms | 115 ms | 6, 3,569 ms | 14 | 1 READ unavailable |
| Baseline 03 | 156 ms | 102 ms | 6, 9,874 ms | 11 | 1 READ unavailable |
| Shared cursor 01 | 3,548 ms | 95 ms | 7, 5,036 ms | 1 | 0 transport errors |
| Shared cursor 02 | 92 ms | 98 ms | 8, 5,029 ms | 2 | 0 transport errors |
| Shared cursor 03 | 87 ms | 88 ms | 7, 5,033 ms | 1 | 0 transport errors |
| Owner FIFO 01 | 99 ms | 101 ms | 26, 50 ms | 0 | 0 |
| Owner FIFO 02 | 104 ms | 95 ms | 20, 10,645 ms | 2 | 2 stale heartbeat responses and owner stopped as stale |
| Owner FIFO 03 | 168 ms | 97 ms | 26, 63 ms | 0 | 0 |

For the baseline, a heartbeat response includes applied processing. For the prototype, the measured heartbeat response acknowledges durable admission. In FIFO 01 and 03 every received heartbeat was admitted and applied, and neither run observed a presence expiry. In FIFO 02, 18 of 20 heartbeats were admitted and applied. The two failures were received around 10 seconds and rejected after 20 seconds, after more than two seconds of waiting within the active window. The failure remained visible in the final tail. The longest measured FIFO wait before starting an append was 10,633 ms. The run recorded a 1,482 ms maximum SDK retry gap, which does not identify the operation that occupied the FIFO or establish the complete cause of the stall. No ordinary request remained unresolved beyond the bounded teardown.

The corresponding per-run maximum engine boundary drift was 3,123–8,569 ms for baseline, 2,671–3,181 ms for the shared cursor, and 87–102 ms for the committed FIFO boundary samples. FIFO 02 stopped producing authority after the owner became stale. Its completed boundary samples do not establish continued liveness for that run.

The real Firestore correctness suite passed 3/3. Both prototype modes recovered a committed admission after a lost reply, deduplicated retries, closed a delayed DOWN with an earlier UP, recorded contact during paused apply, and resumed under a new owner. The FIFO test rejects the former owner's new heartbeat as well as its abandoned apply. Tests cover fresh audience authorization, per-connection sequence, field-order-independent receipt identity, exact return and receipt recovery after closure. A separate same-authoritative-time replay sent DOWN, RELEASE, LOCK, UP and both KEY actions. The baseline and FIFO produced identical receipts, one ten-dose delivery and the same return time. [Test output](evidence/food-coordinator-2026-11-16/correctness.txt).

**Decision for this experiment:** the owner-routed prototype did not meet the two-second liveness budget in every trial. Stop before the wider roster/pair matrix and production consideration. This experiment leaves live touch-to-paint, hosted owner routing and failover, seat recovery and host abort during a Task, permanent append ACK failure, and parent-match integration unverified.
