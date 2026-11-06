# Planet lifecycle retry and terminal return corrections

Base: `0b9e505726f793ba73cb3733d030e95e1d3e3ea8`. This follow-up addresses Integration's final review of PR #186. It changes Frontend lifecycle response handling, a settled terminal return control, and one legacy emulator test's cleanup. Gameplay, rules, service implementation, shared contracts and approved artwork are unchanged.

## Exact retry after an ambiguous lifecycle response

`UNAVAILABLE` can follow a durable commit. A lost/unreadable response has the same ambiguity. The consumer now keeps the original request ID and complete body, marks the outcome unresolved, and blocks replacement lifecycle operations. A later `RATE_LIMITED`, `NOT_ALLOWED` or other rejection cannot erase that earlier unknown outcome. Only a verified success settles it. An initial definitive rejection with no earlier ambiguity can still end that attempt.

The retry feedback remains available in setup and in the running host panel. Rate-limited retries tell the user to wait and retry the same request; busy retries disable the control. Public setup request identifiers/bodies remain UID-bound across reload. Redeem recovery's secret remains only in the original controller's memory and is never serialized into resume, lifecycle-request or command storage.

An `issueRecovery` success must contain a recovery-code string of 16–128 characters. Missing, empty, short, long, non-string or null results remain unresolved and retryable; they no longer settle silently. Existing typed `{matchId, seatId}` redeem validation is preserved.

## Return after a settled terminal match

`Return to lobby` is available only with a fresh authenticated `finished` or `aborted` session, no sending/uncertain lifecycle operation, and no unresolved gameplay command. Finished views place the 44px control inside the existing result panel. Aborted sessions expose it in the terminal setup screen. The control clears only this app's settled resume/reconciliation stores, resets its local session, and keeps the authenticated connection for Join/Host. Reload then stays at entry. It sends no abort, deletion, migration or other match mutation and does not clear unrelated browser storage.

An abort with an unresolved game command retains its controller and exposes `Check original receipt`. After reload, the controller reconstructs the same UID/seat/match/phase/command identifiers and offers the same receipt lookup without a gameplay view. A missing receipt retains those identifiers. An unavailable read conceals the roster and retains the identifiers for reconstruction on the next fresh read. A verified original receipt settles them; only then is Return to lobby available. No replacement command is sent. Lifecycle requests continue to reconcile by exact retry, separately from gameplay-command receipts.

## Legacy emulator cleanup

The supplied CI log for run `42235183631`, job `127950826362`, confirms the client reported `no-response` while the final abort function was still executing; the function completed after 4.063 seconds of execution. The function-start log is not the request-send timestamp, so that duration does not measure the whole client wait. The client timeout remains eight seconds. All preceding declared-Hack gameplay/privacy/recovery assertions reached the cleanup line. The old one-shot assertion treated an ambiguous response as failure to abort.

The test now retries one frozen original abort body/ID at most three times, using the existing API's bounded timeout and waits no longer than two seconds. It accepts only a definitive `done` with `result:true`; persistent ambiguity, definitive refusal, malformed success or an excessive server wait fails the test. Gameplay/privacy assertions and legacy runtime bytes are unchanged. Five isolated regressions cover committed timeout/rate-limit/cached success, persistent timeout bounds, initial `UNAVAILABLE`, definitive refusal and malformed success/wait-budget rejection.

The affected legacy emulator test was syntax-checked locally. **Its actual emulator/CI rerun remains Integration's exact-head gate.** No local Firebase suite was restarted for this follow-up.

## Native smoke capture synchronization

The supplied Backend CI log reached the first seven native UI checkpoints, then read the issued Match ID before that field had rendered. The capture now waits for both issued-code DOM and the exact Match ID text, then keeps the original text assertion. It no longer uses model-only `recoveryCode` as proof of rendered fields. The 16 local retry-control cases also verify the actual Match ID and issued-code DOM after successful retry. No production code value is logged or persisted. The actual-service capture still requires Integration's exact-head CI rerun.

## Verification

- `npm run test:frontend`: **895 passed** — 216 presentation and 679 game; zero failed, cancelled or skipped.
- Focused session and cleanup regressions: **58 passed**, included in the full suite (53 session and five cleanup).
- `npm run typecheck`, package build, production Vite build, production exclusion, exact art provenance and `git diff --check`: passed.
- Native retry controls: [16 cases](evidence/planet-lifecycle-retry/facts.json) at 320×568 and 390×844, normal/reduced motion, covering setup/running hosts, `UNAVAILABLE` or malformed issue success, a rate-limited exact retry, verified success, competing-operation blocking and no secret persistence.
- Terminal return: [12 cases](evidence/planet-terminal-return/facts.json), including finished/aborted return and reload, stale/uncertain/unresolved gates, unrelated storage preservation, and four live/reloaded abort-with-command reconciliation cases. Missing receipts preserve the command; original verified receipts unblock return.
- Existing shell: [100 cases and 12 interaction flows](evidence/planet-lifecycle-shell/facts.json). All refreshed browser evidence uses explicit synthetic authority through the native consumer in desktop Chromium phone emulation, with zero runtime exceptions. These 128 cases produced 74 screenshots.

Reproduce from the repository root:

```sh
npm run test:frontend
npm run typecheck
node --test apps/game/test/planet-session.test.mjs apps/game/test/emulator-cleanup.test.mjs
node --check apps/game/test-emulator/connected-declared-hack.test.mjs
./node_modules/.bin/vite build --config apps/game/hosted/vite.config.mjs
node apps/game/scripts/check-production-exclusion.mjs --bundle dist/hosted-preview
node apps/game/scripts/check-planet-art-adoption.mjs dist/hosted-preview
./node_modules/.bin/vite build --config apps/game/dev/planet/vite.config.mjs
node apps/game/dev/planet/capture-session-retry.mjs docs/frontend/evidence/planet-lifecycle-retry
node apps/game/dev/planet/capture-terminal-return.mjs docs/frontend/evidence/planet-terminal-return
node apps/game/dev/planet/capture.mjs docs/frontend/evidence/planet-lifecycle-shell
```

The earlier nine real-service smoke checkpoints remain evidence for the [prior R14 checkpoint](planet-r14-consumer.md); they were not rerun against this follow-up. Hosted policy, production attestation, physical devices and human playtests are not claimed. Integration owns exact-head CI and release. No deployment or activation was performed.

## Unpublished consumer inventory

Integration must refresh these four consumer hashes in the still-unpublished `design-0.6.0` manifest. Frontend edited no shared release or approval manifest.

| Source | SHA-256 |
| --- | --- |
| `apps/game/src/planet/session.ts` | `8e2cb552b43c81746efccdc6dbf5e85b5effb6d1d42b47ad11f3b720209eeb67` |
| `apps/game/hosted/planet/app.mjs` | `5ec4dab00a8f959efab6d1e711e8fa0f304b0209e121df7109b6532e3a281261` |
| `apps/game/hosted/planet/planet.css` | `ac97c4a197723beee2f06be6fd14ff07880f77e54208f5200164614a1c96e465` |
| `apps/game/hosted/planet/render.mjs` | `d8f1d3e14278aed096c9a19e8e0c6b30e6d15bccdf38e6d31b4b81f8826f3beb` |

All 18 approved library outputs and all nine historical base bundles remain unchanged. Approval SHA remains `9493e29a8ce1b06c6848846b0c8932d65c42abcb24b2b43aaf35ed7239aaf228`; original Frontend proposal SHA remains `d8dbcc979067954051629f2a37ca66196a530ef61d8b1d366726366bc3b429dc`. No review video or withdrawn EJECT proposal is adopted. [The verification manifest](planet-session-lifecycle-verification.json) records the source, output and evidence hashes.
