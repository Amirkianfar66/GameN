# Gameplay deadline repair — issue #89

This correction starts at `94a49ce0c5220b814ec56333b028fbe6180b257e` on `codex/backend-deadline-repair`. It changes the private gameplay outbox and its repair service. Contracts, game rules, both supported gameplay version tuples, phase durations, and public/private projection facts remain unchanged.

## Failure and recovery

Previously, enqueue acknowledgment changed a gameplay intent to `dispatched`, but repair selected only `pending` and `leased`. If a task subsequently disappeared or exhausted delivery retries, no repair path evaluated that due intent. Every client could remain closed while the phase stayed stuck. Enqueue acknowledgment proves neither delivery nor a canonical transition.

Repair now includes `dispatched` in the existing indexed, bounded query. New enqueue acknowledgments store `nextAttemptAt = endsAt`. When an old acknowledgment has an earlier lease timestamp, repair moves it to its deadline without advancing gameplay or processing bots early.

For an eligible dispatched intent, repair validates the stable match/phase/token/task identity, stored timestamp and lease metadata. If its phase/token are current, its `endsAt` must equal the authoritative phase deadline. Repair then invokes `runDeadline` using that exact stored identity. The canonical engine decides whether the deadline advances or is stale. It retains the normal next phase, queued effects and a fresh full 60-second Hack window when one is pending.

After a successful deadline evaluation, repair explicitly invokes the actual bot service. It performs at most two batches of 18 commands and stops once a batch is not full. This covers a nine-bot Round 5 election with nine movement slots, nine ballot slots and one Code slot. Bot storage failure or two full batches retain the dispatched intent with bounded backoff; a later stale deadline evaluation can finish bot receipts in the current phase. This continuation does not depend on an engine-write trigger being delivered.

Only after successful deadline and bot evaluation can a no-longer-current intent become private `completed` history. Concurrent repair, task delivery and Pass still use canonical transactions and durable command receipts. A still-current phase/token is never retired. Malformed intent metadata or an unsupported gameplay tuple becomes `blocked`; transient storage failures remain retryable. Completed/blocked records leave candidate pages, and failed/future records move to their later retry/deadline timestamps. Cursor boundaries use the original page snapshots, so updates within a page do not move its cursor.

Pending enqueue, expired lease reclamation, live lease exclusion and stable task IDs keep their existing semantics. The existing collection-group index shape is sufficient; this change adds no index, queue, scheduler, HTTP route or Function export. Setup deadlines are unchanged.

`repairOutbox` retains exactly `{dispatched, failed, unchanged, blocked, nextCursor}`. `dispatched` counts queue acknowledgments. Successful direct evaluation and retirement count under `unchanged` because no enqueue was attempted; that counter does not mean engine state stayed unchanged. A Scheduler HTTP 200 alone does not prove every candidate succeeded: the existing scheduler wrapper discards these aggregate counts. Release verification must still establish effective queue enqueue and private task invocation permissions and observe authoritative phase/journal progress.

## Verification

Use Node `22.21.1`, npm `10.9.4`, and Java 21 for emulator execution. The production graph was built with `tsc --build services/game-api infra/firebase`; unrelated Frontend/Balance suites were not run for this focused Backend correction.

The permanent regression is `services/game-api/test-emulator/deadline-repair.test.mjs`. Before runtime edits, its two undelivered-dispatched cases failed at the expected phase-advance assertion against the unchanged baseline: **0 passed, 2 failed**, with no skipped/cancelled/todo tests. The corrected focused suite passed **13/13**, with no failures/skips/cancellations/todo. It covers both supported tuples; early acknowledgments; live/expired leases; bounded stale-history cursor pages; malformed task/timestamp and unsupported pins; duplicate/task/Pass races; preserved queued effects and full Hack timing; the actual 19-command bot election; and persisted retry after bot storage fails following a committed deadline.

All test storage operations, transactions and queries use the real Auth/Firestore emulators. The new focused repair harness restricts its collection-group candidate query to that match's actual outbox collection, preventing other suites' retained histories from entering its injected clock. It does not exercise the cross-match collection-group index or real Cloud Tasks. Fake enqueue acknowledgment deliberately models successful enqueue with no subsequent delivery; no Functions, Tasks, Eventarc or browser listeners are started. The Round 5 capacity case prepares an explicit late-round fixture through pure canonical deadline transitions, then runs the actual stored service deadline and bot commands; it uses no stand-in or inferred private role information.

The fresh complete Backend/Firebase Auth/Firestore data group passed **131/131** (118 existing cases plus 13 new cases), with no failures/skips/cancellations/todo. Existing lease, acknowledgment-loss, expiry, cursor, receipt, privacy and setup assertions were retained. Each red/focused/full run started a fresh demo-only database on Auth `29199`, Firestore `28180`, hub `24500` and logging `24600`; the temporary config contained no Functions/Tasks/Eventarc entry. Firebase started its auxiliary Firestore websocket automatically, and all owned emulators shut down after each run.

Other actual checks:

| Check | Result |
| --- | --- |
| Pinned `npm ci` | Passed, 887 packages installed |
| `tsc --build services/game-api infra/firebase` | Passed before red and after correction |
| `node --test services/game-api/test/*.test.mjs infra/firebase/test/*.test.mjs` | 130/130 passed; zero failures/skips/cancellations/todo |
| `npm run typecheck` | Pure and browser typechecks passed |
| `npm run package:backend -- --verify-install` | Root build, production source exclusion, export checks and standalone install passed |
| `git diff --check` | Passed |

The verified package has artifact SHA-256 `e8922dcc8276be43883a7070cd4dd1947eda68655b26b232724e70803bd20c00` and compiled source SHA-256 `cbc2fbcd132227409753e0388a33e1b9561211171886defc00a5dab04b8cf957`. Local logs were saved under `/private/tmp/gamen-deadline-repair-{npm-ci,baseline-build,red,build,green,data,units,typecheck,package-command}.log`; these logs and the alternate-port harness are local evidence, not committed runtime assets.

This verification does not claim cloud deployment, hosted acceptance, live IAM validation or real task retry exhaustion. No Frontend/Balance tests or Functions/Tasks smoke were run for this correction. The repository emulator runner discovers the new file automatically; CI's independent Functions/Tasks gates remain required.
