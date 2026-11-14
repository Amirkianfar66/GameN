# Prefer a verified original Food receipt after a technical error

Issue [#252](https://github.com/Amirkianfar66/GameN/issues/252). Actual starting
SHA: `d5a57af049c5ac8abb57754855099fa0468abd37`. Isolated branch:
`codex/backend-verified-original-receipt`. The running d5 checkout and its local
services are preserved.

Human Food command handling can encounter a technical error after its original
receipt commits. Before responding, it already reloads current membership,
checks the original seat binding and verifies the exact request fingerprint.
Previously, it rethrew the earlier error even when that final check found the
original response. This could expose UNAVAILABLE while a later receipt lookup
correctly recovered accepted or rejected authority.

The correction returns that verified original response before rethrowing an
earlier technical error. It changes no action admission or execution. A failed
final read, revoked identity, changed binding or conflicting fingerprint still
fails through the existing path. Without a durable original, the earlier error
remains an error; no receipt is fabricated. Accepted and rejected originals
retain their exact status, content and original server time.

This repairs response recovery only. The failed native seven-player packet
showed an accepted Lock whose original HTTP response was UNAVAILABLE and whose
receipt was later recovered. That packet does not identify which exception path
produced the HTTP error. Its human presence expiry and delayed heartbeat admission
remain the separate [#246](https://github.com/Amirkianfar66/GameN/issues/246)
investigation. This correction is not evidence that cancellation is fixed. The
historical invalid/closed Firestore transaction issue #206 remains separate too.

## Verification

After Integration's explicit local-slot handoff, the same thirteen new causal
service tests ran against the unchanged starting source: eight recovery cases
failed with UNAVAILABLE and all five negative controls passed. With the priority
correction, all thirteen passed. Normal service setup builds 7/8/9-player matches;
no original receipt, membership or engine state is seeded. The port injects
pre-commit, post-commit acknowledgement and lookup faults with a fixture clock.
Normal recovery exercises revoked identity and same-UID changed binding. These
are service/engine controls, not native latency or genuine Firestore fault proof.

The first backend regression run passed 627/628. Its one failure was the old
processing-acknowledgement test expecting an error despite a committed receipt.
That expectation now verifies the exact returned original, unchanged retry and
one effect. The final backend/Firebase run passed 628/628 in 28,183 ms. Full build,
typecheck, toolchain/workspace/source integrity and Classic/Planet standalone
package installation checks passed. All 54 genuine Planet SDK regressions passed
in 275,479 ms on separate Auth/Firestore ports; none was skipped. These include
the existing controlled-time Food, privacy, recovery, concurrent-command and
deadline tests. Exact CI head and results are recorded in the PR. Earlier failed
logs are preserved locally rather than rewritten as successes.

Independent source review accepted the production change, fault boundaries and
authorization controls. No connected match or observer was started. Separate
owned Auth/Firestore ports are used for SDK regression; the current d5 services
and data remain preserved.

## Version and review boundary

Protocol 3 / `planet-game-1.4.0` /
`in-person-planet-food-task-2026-11-12` remains unchanged, with authority SHA256
`7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333`.
Stored receipts, engine contexts, replay order, clocks, presence leases, rules,
historical tuples and shared contracts are unchanged. No dependency, creation
default, cloud/IAM or deployment change is included.

There is no phone rendering, wording, geometry, artwork, motion or control change.
The existing receipt contract returns the same original response through its
normal command path rather than requiring a subsequent lookup. Integration must
review this response-recovery change; this document claims no new native visual
acceptance or connected journey.
