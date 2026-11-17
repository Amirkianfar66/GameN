# Food command timing for #274

The starting revision is `9e377195233cc87314b88f53a37806f9a63f1ced`. Food keeps the protocol 3 / `planet-game-1.4.0` / `in-person-planet-food-task-2026-11-12` tuple and its saved setup, receipt and replay behavior.

The staging request sample had a 277 ms median, 6.71 s p95 and 14.67 s maximum across 233 POSTs. It did not identify operations or distinguish accepted Food receipts from other responses. The connected emulator matrix showed multi-second fetch-to-response tails but could not attribute them to individual server stages.

## Request timing

The authenticated HTTP adapter can opt in around one call to `service.handle` using `withPlanetRequestTiming(run, onSummary)` from `@mothership/game-api`. The exported `PlanetRequestTimingSummary` contains only monotonic elapsed milliseconds and fixed stage aggregates with count, total and maximum. The wrapper preserves the returned value or original exception even when the observer fails. Concurrent and nested calls use isolated scopes. Late work cannot change a published summary. The service never adds these measurements to its API response.

- `classification`, `admission` and `finalReceipt` cover the initial match lookup, Food admission and the currently authorized original receipt read. `admission` spans the outer transaction settlement, not its tentative server clock sample.
- `drain` includes the ordered processing and cleanup. `drainLeaseWait` includes probes and claims while this request has no owner, including an immediate receipt hit. `drainProbe` counts the underlying observation calls. `authority` measures each processing call, and `cleanup` measures release of the prefix lease.
- `sdkReadOnly` and `sdkReadWrite` cover outer SDK transaction promises. `sdkAttempt` counts and times callbacks entering the adapter. `sdkRead` counts and times SDK read calls, including each grouped read. SDK retries, authentication or transport retries within individual RPCs are not equivalent to callback entries.
- `sdkRetryGap` measures an attempt's callback exit up to the next callback entry, including rollback, network work and SDK waiting. `sdkCommitAck` and `sdkCommitFailure` measure the final successful callback's exit to the outer SDK promise's resolution or rejection. A read-write no-op can have a settlement interval without a Commit RPC. These stages are not wire-level RPC spans.

Stage totals overlap and cannot be added to compute request time. No request data, record names, participant or command identifiers, original responses or errors are part of the summary. The HTTP adapter owns operation labels and logging configuration. The platform still owns its ordinary service/revision log metadata.

## Metadata read batching

After the service callback returns, the store gathers prior metadata for buffered sets and deletes that did not read it already. Independent metadata lookups use transactional `getAll` batches of up to 64, with a single `get` for a lone key. The store associates results by reference, keeps the existing chunk cleanup and write budgets, and finishes reads before staging any SDK write. Atomic creates keep their preconditions and do not need old metadata. The same pre-write error classification and SDK retry budget apply.

The patch reduces the number of SDK read calls in this pass. It does not establish a staging wall-time improvement. Use operation-level traces to compare the same 7/8/9-player connected paths, including both station assignments, receipt recovery and Hold UP. Compare read counts and time against lease wait, retry gaps and the final receipt read before attributing the tail.

## HTTP integration and verification

The Planet HTTP adapter emits one `planet_request_timing` structured server log after each authenticated, schema-valid service request **only when `MOTHERSHIP_PLANET_REQUEST_TIMING=true`**. Omission or `false` disables it; other values fail configuration validation. It combines the service summary with the fixed operation name and monotonic `authMs`, `appCheckMs`, `serviceMs` and `totalMs`. Service timing stops before response serialization. `serviceOk` is the outer service result, or null for a thrown failure; it is not proof that a gameplay receipt was accepted. Rejected authentication and malformed requests do not enter this trace. Neither the JSON response nor response headers acquire timing fields. Auth revocation checks and App Check are unchanged.

The Firebase adapter writes an explicit JSON record to stdout without SDK logger enrichment from incoming trace headers; only the API service uses Node's request-local context. Standalone Planet packaging includes the timing module. Observer failure, including an asynchronous rejection, cannot replace the original response or error. No application log receives a request, token, player/match/command identifier, receipt or exception detail.

Integration's first revision locally passed the pinned install, build, pure/browser typechecks, workspace and frozen-source checks, 86 focused HTTP/task/timing/store checks, 11 workspace-boundary checks, and standalone Planet packaging with its isolated locked install/import. The first packaging attempt could not write the sandboxed npm cache; the unchanged command passed with cache access. The follow-up makes logging opt-in, removes logger trace enrichment and separates serialization time; refreshed results, Backend's separate regression results and required CI are recorded in the PR.

These checks establish behavior preservation and deployable packaging, not playable hosted latency. The staging trace and both live station controls still need verification on the reviewed deployment. Frontend's stale-read and proved-release recovery corrections are separate work under [#274](https://github.com/Amirkianfar66/GameN/issues/274). No rule, artwork, deadline, lease duration, retry budget, function sizing, region or permission is changed here.
