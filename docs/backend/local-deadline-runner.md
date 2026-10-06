# Unattended local deadline runner

Issue #34. Base `71dfd0277c6ccc4a5dd78b9702face98a46310b8`, including the pinned connected Frontend `8b97180038a37b798fbef345272a32e42c0d0853` and Backend dependency candidate `5adaf98f8412e2294f45e00f8fb7c4c515127226`. Branch `codex/v1-local-deadline-runner`. This is a development-only mechanism; it changes no protocol, game rule, production handler, client or dependency.

## Why the local runner is needed

The reviewed Firebase CLI 15.0.0 emulator dispatched future Cloud Tasks immediately. The private handler evaluated the unexpired phase and returned `unchanged`; enqueue was acknowledged and the outbox became `dispatched`. The pending/leased outbox repair cannot revisit that acknowledged task at its intended time. This behavior is recorded in the all-agent review and Frontend's G9, and is distinct from deployed Cloud Tasks delivery.

The separate Node process pages through protocol-2 `control/session` records whose status is `running`, reads their private `engine/current` state and calls the existing trusted service `runDeadline` only when its current phase is due. Root `matches` documents need not exist. It reads at most 50 controls per poll and wraps the document-name cursor after each sweep. Old outbox history and dispatch status cannot starve current phases. An unavailable page retries its cursor; a failed evaluation is eligible again on the next sweep. Concurrent polls coalesce; stopping drains the current evaluation and cancels future polls.

The process stores no queue, pending task or private payload. Restarting re-reads durable state. It neither changes outbox dispatch/lease records nor creates a new public endpoint. The existing service transaction validates the pinned state, phase ID, private token and server deadline. Runner, task and client races therefore advance once; stale tasks are no-ops. A delayed evaluation opens the next canonical 60-second window at evaluation time. It never compresses missed historical windows or adds pause/offline rules.

Frontend's admitted `v1Advance` remains a safety net. Closing all browser pages does not stop this runner. Closing the runner and the emulators does stop local execution; reopening catches up one expired phase and grants the next full window. Production remains the durable outbox, private Cloud Tasks handler and scheduled repair, subject to actual queue/IAM/index/delivery verification.

## Local operation

Use Node `22.21.1`, npm `10.9.4` and the already reviewed loopback demo Emulator Suite. Install and build this exact source first:

```sh
npm ci
npm run build
```

Start the emulators in their own terminal using the existing configuration:

```sh
MOTHERSHIP_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5101 npx firebase emulators:start --config infra/firebase/firebase.json --project demo-mothership --only auth,firestore,functions
```

Start the runner in a second terminal:

```sh
GCLOUD_PROJECT=demo-mothership FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 node infra/firebase/dev/run-deadlines.mjs
```

The CLI accepts no command-line overrides. Before loading or initializing Admin, it requires the exact demo project and Firestore loopback port 8180. Any supplied project identifiers must agree; file-based Firebase config, credentials, cloud-worker context, remote/unknown/mismatched emulator addresses are refused. Optional emulator addresses use the same named loopback ports as the existing suite. The standalone runner requires Firestore; it does not authenticate a player or call Auth/Cloud Tasks. SIGINT/SIGTERM drains its poll and closes the Admin connection. No port or listener is opened. Diagnostics contain six aggregate counters only, with no match IDs, deadline tokens, Code, roles, payloads or raw SDK errors.

After the local guard succeeds and before importing or initializing the SDK, the dedicated CLI process sets `METADATA_SERVER_DETECTION=none`. This is a [documented Google SDK setting](https://googleapis.dev/nodejs/gcp-metadata/latest/#environment-variables) that disables metadata availability probing and use. The installed `gcp-metadata` implementation returns `false` before attempting a metadata ping. This avoids unnecessary cloud metadata discovery in a loopback emulator process; it supplies no credentials and suppresses no warning. Production initialization and the emulator regression's strict empty-stderr assertion are unchanged.

Development files live under `infra/firebase/dev/`, outside source/build/production exports and the packaged Functions artifact. No shared manifest, workflow, runtime, Rules or Frontend file changes are needed. Existing root unit/emulator globs include the new tests.

## Verification and limits

Focused unit coverage checks configuration refusal before SDK loading, exact due-time behavior, malformed/legacy/terminal state exclusion, transient failures, bounded cursor wrap and retry, overlapping ticks, restart during drain, shutdown and sanitized diagnostics. The real-Firestore regressions exercise a separate CLI through a real 60-second phase with no browser or client advance loop, and the dispatched-early-delivery gap, restart, delayed full windows and runner/client races. Before spawning the standalone CLI, the real-time regression waits for the normal emulator trigger to mark that exact initial phase's outbox intent `dispatched`, then verifies the phase and journal are unchanged and its deadline is still unexpired. It does not manually dispatch or rewrite that intent; aggregate CLI counters alone are not the attribution evidence. The second regression uses a clearly injected service clock and an immediate-delivery queue adapter; it is not deployed Cloud Tasks evidence.

Local Node 22.21.1/npm 10.9.4 `npm ci` installed 886 packages without changing the lock; all ten focused runner unit tests passed, with zero failures/skips/todos/cancellations. Syntax checks and the workspace build also passed. The new emulator tests were authored but **not run locally**: another agent owns the fixed emulator ports. Those processes were not used or stopped, and no port guard was weakened. The shared-base CI already runs the complete Backend emulator trees, the four real Frontend emulator tests, the real browser dependency probe, root verification and standalone backend packaging. The first attributed regression CI run (`37514350331`, head `a3f1dbbbd640f24f840d56b9fcf8e5b042f64331`) performed the real phase transition and passed the full-window, journal and runner-advanced assertions, then failed its empty-stderr check on `MetadataLookupWarning` from SDK metadata discovery. The supported local-only detection setting addresses that initialization path; the new injected-loader unit proves invalid configuration changes no detection setting and loads no SDK, while valid configuration establishes `none` before loading. Fresh final-head emulator CI remains pending and must pass before approval.

No cloud deployment/provisioning, local-network exposure, phone acceptance, App Check attestation, production IAM delivery or human playtesting is established. Ruleset remains `in-person-v1-2026-10-06`, overlay SHA-256 `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`, protocol 2, Original Powers off.
