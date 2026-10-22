# Backend issue #2: Officer/Protection checkpoint

Base: `333c9e820f362a211352bc689372663f29b73ac4`, branch `agent/backend-foundation`. Source manifest SHA-256: `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc`. Engine pin: `0.1.0-officer-slice`; wire protocol 1. Canon and historical Canvas bytes are unchanged.

The owner has selected co-located physical play for V1 and full remote play for V2 (#9 / PR #10). This narrow checkpoint is part of that V1 path; it is not complete V1 or a deployed backend.

## Implemented boundary

`packages/engine` implements pure, explicit-time registration, deadline advancement, audience projection and single attack/defense resolution. `services/game-api` serializes match operations in Firestore, checks verified identity membership, persists caller-scoped terminal receipts and ordered private replay records, and writes only changed audience documents. `infra/firebase` supplies second-generation HTTP functions, Auth/App Check guards and deny-by-default Firestore Rules.

The fixture starts at the Officer's Round 2 turn. Its recorded order places the eight scripted turns after the Officer; each opens for a full 60 seconds when actually advanced. No Hack is requested; powers and movement are absent. The final expiry closes command eligibility privately while the public document remains an expired ordinary phase. An **internal harness** then supplies the explicitly completed no-jail vote and opens untimed resolution. There is no voting duration, public skip-vote endpoint or automatic vote result. A future voting phase requires approved rules and contracts.

Registration reserves the one ordinary shot and publishes only the Officer's own neutral registration. Protection was granted in Round 1 and is active in Round 2. It blocks the applicable shot and is consumed; otherwise the target is injured. No defense explanation is sent even to the recipient. Registration survives later actor injury, Jail or elimination. Resolution stops after this attack stage: Hospital relocation, Rescue, reveals, victory and next-round setup are not implemented here.

Production source exports no seed or vote-bypass HTTP operation and imports no bootstrap fixture module. Internal helpers and tests contain synthetic fixtures only; never use them with a real Firebase project. The shell's complete production build is not a deployed Functions package or playable frontend.

## Transaction and scheduling contract

Every successful attempt samples trusted server time after transactional reads. Acceptance uses `now < endsAt`; it does not promise client-send or eventual-commit time. Random opaque operation identities are generated once outside retries. The engine generates no randomness. Seeded order/roles and empty action random facts are explicit recorded harness inputs.

Membership, receipt and state are read within the command transaction. Same caller/ID/digest recovers the terminal receipt before checking phase or time; conflicting payloads preserve the original. New accepted or rejected receipts, ordered private journal and relevant state are atomic. Public/player views and presentation events are physically separate from private state. Internal journal sequence never appears in an audience payload.

Opening a timed phase creates its durable outbox intent in that transaction. The initial seed creates its own intent atomically. The Cloud Tasks enqueuer and private-invoker task handler are declared; reviewed staging IAM and unattended repair execution remain pending. A dispatcher performs external enqueue **after** the transaction, using a stable hashed task ID. Enqueue failure leaves intent pending; enqueue-success/ack-failure retries must treat the same task ID as already enqueued. Jobs validate phase ID and private deadline token, not the private sequence. Expired commands remain closed even if dispatch is delayed. Member-authorized `advance` supplies catch-up; presence and animations do not advance authority.

Receipt lookup and refreshed Auth identity recover the same seat/resources. This does not implement losing/replacing an Auth account, secure transfer to a new identity, an offline command queue or a disconnect/pause policy.

## Run locally

Use Node 22.21.1, npm 10.9.4 and Java 21. From the repository root:

```sh
npm ci
npm run verify
npm run test:emulator
```

The emulator command uses only `demo-mothership`, loopback Auth 9199, Firestore 8180 and Functions 5101; it starts/stops the suite and uses no production Firebase credentials. It intentionally fails if emulator environment variables are missing or point outside loopback. Do not run through the historical Canvas stack.

The API uses POST JSON with `Authorization: Bearer <Firebase ID token>` and, outside the exact local demo suite, `X-Firebase-AppCheck`. Responses have `Cache-Control: no-store, private`. Endpoint paths are `http://127.0.0.1:5101/demo-mothership/us-central1/{command,receipt,advance,serverTime}`. Server time takes `{protocolVersion:1,matchId}`; other envelopes use existing shared schemas. See [actual verification](verification.md) and [contract review response](contract-review-response.md) for recovery and event semantics.

Redacted synthetic example:

```json
{"protocolVersion":1,"matchId":"match-a","phaseId":"phase-a","commandId":"command-a","command":{"type":"REGISTER_SHOT","targetSeatId":"seat-2"}}
```

```json
{"ok":true,"serverTimeMs":1800000000001,"receipt":{"protocolVersion":1,"matchId":"match-a","phaseId":"phase-a","commandId":"command-a","status":"accepted","code":"REGISTERED"}}
```

## Decisions and limits

Affected-role contract adoption is pending, especially legal-target projections and event-stream delivery. Self-shooting, target movement/rechecks, competing normal-round effects and Protection/result recipients remain unresolved. Fixed positions, one attack, no-jail completed vote and neutral health facts isolate them. Other recorded blockers (Hospital/Jail exits, Captain routing, Cracker access, Code checkpoint, voting/showdown windows, disconnect/pause) are outside this slice.

Before production: reviewed contracts, full game lifecycle, durable request limiting, version registry/upgrade strategy, recovery/retention policy, deployable workspace packaging, least-privilege task/IAM configuration and measured staging delivery are required. Cloud resource provisioning, deployment, real device/browser journeys, load/performance/cost, backup restoration and human balance sessions are **not run** by local checks. No credentials, real private match data or game canon changes are included.
