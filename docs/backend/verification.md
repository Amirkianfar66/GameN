# Backend checkpoint verification

Date: 6 October 2026. Base: `333c9e820f362a211352bc689372663f29b73ac4`. Pure engine dependency: PR #11, commit `e16baab123adcae62fe19947d1740d0a79f95f96`. The adapter PR's head and CI identify the final reviewed source. Rule-source manifest: `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc`.

## Actual local results

| Command/check | Actual result |
| --- | --- |
| Clean `npm ci` | Passed under Node 22.21.1 / npm 10.9.4; exact Firebase Admin 14.5.0, Functions 7.4.0 and CLI 15.0.0 locked |
| `npm run verify` | Passed toolchain, explicit 8-package boundary, source integrity, typecheck, build and **48 tests**: 16 bootstrap, 18 engine, 14 API/infra unit; zero failures/skips/todos |
| `npm run test:emulator` | Passed **15 tests**, zero failures/skips/todos, against real local Auth, Firestore, Functions and Rules emulators with synthetic data |
| `git diff --check` | Passed |
| Source integrity | 119 original Canvas files plus 1 unbound example, 7 rule sources and 24 pinned source files unchanged; token proposal unchanged |

The local emulator used official Temurin Java 21 runtime downloaded into a disposable directory, SHA-256 `dec50fc6f9fcd4fe3ae8cabf5a5fa68f6afc48841f7698e468e9aa5d54beed84`. CI pins Java setup and uses Java 21. The repository does not require this machine's temporary runtime path.

Setup repairs were made before the passing runs: the escalated login shell initially selected Node 25/npm 11 and failed the engine gate; explicitly selecting the pinned toolchain fixed it. The workspace guard initially rejected the newly used `node:buffer` import until its narrow infrastructure allowlist was reviewed. A security test initially fell into the plain unit glob; moving it to the explicit emulator suite fixed that failure. No failed check is counted as passing evidence.

## What the emulator establishes

- Same caller/ID/payload after expiry recovers the original receipt. Changed target conflicts without replacing it. Accepted and rejected receipts remain terminal.
- Racing different shot IDs accept at most one. A command racing at exact deadline is rejected; duplicate/stale/early jobs advance at most once. Delayed next turns start at actual trusted time with a full minute.
- Both protected/unprotected variants resolve once after all scripted turns and the internal completed-vote prerequisite. Registered shots survive later actor injury, Jail or elimination.
- Actual public, target and all seven unrelated player documents preserve data **and Firestore updateTime** during hidden registration. Only the Officer receives its neutral private event.
- Real Auth-issued tokens permit only admitted views/events. Cross-seat, outsider and direct-write/private-read attempts are denied, including a host. HTTP rejects missing/invalid Auth and unexpected schema/protocol; identity is derived from the token.
- Enqueue failure remains pending. A separately injected enqueue-success/ack-failure retry uses the same task ID, acknowledges the duplicate and repairs the intent. These queue failures are synthetic; the outbox persistence uses actual Firestore.
- Refreshing the actual Auth identity restores its authorized view and receipt through token-authenticated REST/HTTP, with the same seat, role and spent resource.
- Replay from the **stored, privately ordered journal**, including a rejected command, reproduces state and permitted projections under pinned versions. Unsupported engine/rule pins fail closed before new effects.

Fast deadline tests inject a trusted server clock into the core. They do not wait nine real minutes or measure scheduler latency. The HTTP acceptance scenario separately uses the actual server clock. App Check's production guard and the task declaration/private-invoker metadata use injected/unit tests, not live attestation or IAM enforcement.

## Not run and open gates

Actual Cloud Tasks delivery, production task IAM, unattended outbox repair execution, staging App Check/CORS, cloud provisioning/deployment, load/latency/cost, browser/real phones/table display, backup restoration, secure new-identity seat transfer and human social-deduction balance: **not run**.

Affected Frontend and Game Balance adoption reviews remain pending. See [contract review response](contract-review-response.md) and [implementation limits](implementation.md). No complete round, complete V1, remote V2 or rule-version change is claimed. Both backend PRs remain unmerged for review.
