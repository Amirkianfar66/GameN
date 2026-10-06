# In-person V1 backend verification

Verified on 6 October 2026 with Node `22.21.1`, npm `10.9.4` and Java `21.0.12.1`. Source starts from the reviewed-source checkpoint `ad976db57a1e2c5cf29142fc097bc462913e718b`. The pure engine/contracts commit is `8d4a2e5`; the Firebase follow-up PR identifies its exact tested runtime head. Both depend on checkpoint PRs #11/#12, which remain unmerged. These local results do not approve their merge.

## Actual results

| Check | Result |
| --- | --- |
| Clean `npm ci` using the committed lockfile | Passed; 826 packages installed |
| Toolchain, workspace and source integrity | Passed; eight allowlisted workspaces, 119 original Canvas files and historical rule/source pins preserved |
| Typecheck and ESM/declaration build | Passed |
| `npm run verify` | Passed: 25 bootstrap/contracts + 79 engine + 41 service/infrastructure tests = 145; zero failures, skips or todos |
| `npm run test:emulator` | Passed: 30 tests with real loopback Auth, Firestore and Functions; zero failures, skips or todos; suite stopped cleanly |
| `npm run package:backend -- --verify-install` | Passed: clean isolated production dependency installation, package/Functions imports and forbidden-source/fixture scans |
| `git diff --check` | Passed |

The 30 emulator checks include a real HTTP seven-player lobby/admission/start/MOVE/receipt/abort flow; 7/8/9-player service lifecycles; old/new identity recovery and direct-write/private-query denial; private audience events; duplicate command/deadline races; durable throttling; enqueue/acknowledgement failure, lease expiry and bounded repair; and replay from recorded setup/command/deadline facts. Protocol-1 regression coverage remains intact. Endpoint responses and stored lobbies are parsed by the shared protocol-2 schemas.

Integration defects corrected before the final successful runs were Firestore's nested-array restriction (now a versioned turn-order storage codec), SDK discovery initialization (now lazy validated `onInit`), and legacy outbox routing (now skips protocol 2 and future protocols). Independent review also tightened terminal role/Code/self-role validation, abort clock monotonicity and shared dotted asset-pin validation.

## Artifact fingerprints

The final production-only artifact at ignored `dist/backend` recorded:

- Complete artifact SHA-256: `00f814d83370f142fb378be5f30d4b85dc4a76d60176c224e619a1d5e9272322`.
- Staged compiled runtime SHA-256: `99c0b8cc29fcda76e7bbb25b1b8037677218a5311988a7754caef1abf4694d34`.
- `verifiedStandaloneInstall: true`, `forbiddenSourceScan: passed`, `legacyFixtureHarnessScan: passed`.

The artifact uses `dist/production.js` and exports the 15 V1 SDK endpoints only. It contains explicit production engine/service indexes and local private tarballs; no legacy fixture completion handler, fixture export/data, Canvas, tests, credentials or private match data. The fingerprint combines the actual staged compiled files, tarballs, manifests/lockfile, Rules and indexes; generated output is not committed. Rebuild and verify from the reviewed source before any separately authorized deployment.

## Decisions and release gates

All V1-01–V1-21 are approved by the game owner. Active ruleset `in-person-v1-2026-10-06` hashes to `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`. Original Powers are off. V1 requires connectivity, has no automatic disconnect pause and uses explicit host-authorized one-time recovery. Full remote online play remains V2.

Not run: cloud deployment/provisioning; target-project IAM, real Tasks/Eventarc/Scheduler delivery, production App Check attestation or backup restoration; load/cost targets; real-device integration and completed human playtests. Frontend/Balance contract adoption and the reviewed Designer asset manifest remain pending. Spoken Hack truthfulness and social balance are not proven by these checks. See [runtime/client handoff](v1-deployment.md) and [engine handoff](v1-implementation.md).
