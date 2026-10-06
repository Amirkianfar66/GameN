# Protocol-2 client integration handoff

This is the transport contract at Backend base `230cc39bdced7f54dbd44eabeef6aa91e9462ce0`. It prepares adoption review; it does not establish a connected Frontend or a deployed release. Dependency order remains PR #11 → #12 → #16 → #17. This follow-up depends on that complete stack.

| Pin | Value |
| --- | --- |
| Wire protocol | `2` |
| Ruleset | `in-person-v1-2026-10-06` |
| Ruleset SHA-256 | `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90` |
| Engine | `full-game-1.0.0` |
| Frontend consumer inspected, read-only | `ba716d71b3c5a2e15acf3cd80c4bb458e657fc9f` |
| Earlier published PR #15 context | `e64016e6e54cf7fe63c6dab34a0b6de8bcadebcf` |
| Earlier local shot-flow context | `b97441c0ed559282c4d8948e2f1396e2a27df5b2` |

The two earlier Frontend commits resolve locally; use the current verified consumer pin above for new integration. Frontend's `integration-requests.md` and `contract-re-review.md` were read without editing that worktree. Any uncommitted request is a proposal, and its first-slice acceptance refers to protocol 1. Protocol 2 still needs Frontend and Balance adoption review. All V1-01–V1-21 owner decisions remain approved, Original Powers remain off, and full remote play remains V2.

## Permanent synthetic examples

[`services/game-api/test/examples/protocol2.synthetic.json`](../../services/game-api/test/examples/protocol2.synthetic.json) contains every endpoint request, every gameplay command type, each successful operation result, accepted and both rejected receipts, both lookup outcomes, every declared failure code, public/player/lobby views and audience events. All names, timestamps and the recovery-token placeholder are invented. Do not load this file from a production entrypoint or use it as a real token.

[`protocol2-handoff.test.mjs`](../../services/game-api/test/protocol2-handoff.test.mjs) parses those examples with the actual exported strict schemas and checks completeness, version pins and disclosure rejection. `npm run test:backend` includes it through the existing test glob. Production manifests/exports and compiler inputs are unchanged; examples stay outside `src/` and `dist/`.

## JSON HTTP operations

Use JSON `POST`, not Firebase callable envelopes. Production function URLs must come from the selected deployment; do not infer them from a match ID. Emulator URL shape is `http://127.0.0.1:5101/demo-mothership/us-central1/<export>`.

Send `Content-Type: application/json`, `Authorization: Bearer <current Firebase Auth ID token>`, and in production `X-Firebase-AppCheck: <verified attestation token>`. The validated local demo runtime skips App Check only. It still verifies Auth. The actor and host capability come from that verified identity; do not add UID, seat, clock, damage or outcome fields to command bodies. Refresh the SDK token as needed; never log these headers.

| Function export | Request schema | Successful response schema | Authority |
| --- | --- | --- | --- |
| `v1CreateMatch` | `FullCreateMatchRequestSchema` | `FullOperationResponseSchema` | Authenticated caller creates host capability and initial display membership |
| `v1RequestAdmission` | `FullAdmissionRequestSchema` | `FullOperationResponseSchema` | Authenticated requester with room code; lobby only |
| `v1ApproveAdmission` | `FullApproveAdmissionRequestSchema` | `FullOperationResponseSchema` | Host, vacant seat within configured player count |
| `v1AdmitDisplay` | `FullAdmitDisplayRequestSchema` | `FullOperationResponseSchema` | Host admits the display's actual Auth UID |
| `v1StartMatch` | `FullStartMatchRequestSchema` | `FullOperationResponseSchema` | Host, complete uniquely bound roster |
| `v1Command` | `FullCommandRequestSchema` | `FullCommandResponseSchema` | Current seat binding only |
| `v1Receipt` | `FullLookupRequestSchema` | `FullLookupResponseSchema` | Current seat binding, own receipts only |
| `v1Advance` | `FullAdvanceRequestSchema` | `FullAdvanceResponseSchema` | Admitted display or current player |
| `v1ServerTime` | `FullServerTimeRequestSchema` | `FullServerTimeResponseSchema` | Admitted display or current player |
| `v1AbortMatch` | `FullAbortMatchRequestSchema` | `FullOperationResponseSchema` | Host, nonterminal match |
| `v1IssueSeatRecovery` | `FullIssueSeatRecoveryRequestSchema` | `FullOperationResponseSchema` | Host, existing seat, match not aborted |
| `v1RedeemSeatRecovery` | `FullRedeemSeatRecoveryRequestSchema` | `FullOperationResponseSchema` | Replacement Auth identity with valid one-time token |

Schemas are exported from `@mothership/contracts` in `full-game.ts` and `v1-service.ts`; protocol 1 must not parse these responses. Required envelope fields differ: operations have `ok`; lookup has `status` on success; advance has `result`; server time has neither. Do not add `ok: true` to lookup/advance/time. Failures always use `{ok:false,serverTimeMs,error:{code,...}}`. Parse even an HTTP 200 body before changing UI state. A readable rejection receipt is a final game decision; HTTP success does not mean registration was accepted.

Requests are at most 4,096 UTF-8 bytes; token headers at most 8,192 characters. Only exact configured browser origins are accepted. Production's default origin list is empty. Local defaults are `http://localhost:5173` and `http://127.0.0.1:5173`; configure another loopback origin before emulator start if needed. Preflight `OPTIONS` allows only POST and `authorization`, `content-type`, `x-firebase-appcheck` headers. These endpoints set `Cache-Control: no-store, private` and `Pragma: no-cache`. Never route them through an offline replay/service-worker cache.

## Admission and identity recovery

1. Create the lobby as the host and retain its server-returned match ID and room code. A room code invites an admission request; it does not grant a seat or read access.
2. Each player authenticates, requests admission with Room A/B, and receives `matchId`, `admissionId`, `status:"pending"`. Listen to that admission document or query admissions with `where('uid', '==', currentUid)`. A requester cannot list other players' admissions.
3. The host assigns each pending admission to a vacant `seat-N`. A successful approval atomically creates seat binding and player membership and publishes the roster. The approved admission includes `seatId`; that is the client's seat context. The client cannot read server-only membership/binding documents to discover it.
4. Admit the physical display by its Auth UID. A created host has display membership, but host capability and player authority are independent. The host uses admission to occupy a player seat. Host administration does not expose engine state, other private views, receipts or role/Code assignments.
5. Start only after all 7/8/9 seats are bound. Roles, Code and recorded turn orders are generated server-side. Reload never starts a new deal.

Recovery transfers the same seat, resources and receipt namespace. Host issuance returns a 43-character token once, with a ten-minute expiry. Its identical operation replay returns `recoveryToken:null` and the original expiry. Serialize issuance attempts for each seat. After a lost, unreadable or `UNAVAILABLE` response, retain the original operation ID and retry/reconcile the identical issuance request until a parsed successful response settles it, respecting `retryAfterMs`. A later preflight failure cannot settle the earlier unanswered issuance. If that successful response contains the token, use it; if it is a successful replay with null token, the original issuance is settled and a fresh request ID can obtain a replacement token. Do not mint a new issuance ID while the original operation is unresolved: issuance replaces the seat's outstanding grant, and an older in-flight issuance could otherwise overwrite the newer token. Keep tokens in memory only. Redemption requires a different verified UID, an unconsumed/unexpired grant and the expected binding revision. A replacement already holding a player seat cannot redeem another.

Redemption atomically advances both binding sides, removes the old membership/private view and creates the replacement view. Old identity listeners lose server read access; client memory may still contain previously delivered secrets and must be cleared. Seat events remain under `p-seat-N` and are readable only by the active binding. A host who transfers their own player seat also transfers host control to the replacement UID at this base. Do not share recovery tokens through public displays, URLs, logs or durable browser storage.

## Listener paths and validation

All paths below are relative to the Firestore root and require Auth. Client writes are denied everywhere. Use document listeners for views; collection-list queries for views are denied.

| Path | Reader | Validation / constraint |
| --- | --- | --- |
| `matches/{matchId}/control/session` | Host only | Admin document; no exported protocol-2 schema yet; no engine secrets |
| `matches/{matchId}/admissions/{admissionId}` | Host or that requester | Admin document; requester list query must constrain `uid` |
| `matches/{matchId}/lobby/public` | Admitted display/current player | `FullLobbyViewSchema`; no running game view before start |
| `matches/{matchId}/views/public` | Admitted display/current player | `FullPublicViewSchema` |
| `matches/{matchId}/playerViews/{currentUid}` | Current player, own UID only | `FullPlayerViewSchema`, audience/self seat must equal approved seat |
| `matches/{matchId}/audienceEvents/public/items` | Admitted display/current player | `FullPublicEventSchema`; query `audience.kind == 'public'` |
| `matches/{matchId}/audienceEvents/p-seat-N/items` | Current binding for seat N | `FullPlayerEventSchema`; query `audience.kind == 'player'` and `audience.seatId == approvedSeatId` |

Private event keys are literal `p-seat-1` … `p-seat-9`, never the UID. A UID named `public` gains no special access. Do not subscribe to the internal `events` journal, `receipts`, `engine`, `outbox`, `seats`, `members`, `recovery` or `identityAudit` collections. Their reads are denied, including for host.

Reject a snapshot/event for a different match, version pin or private seat before presentation. Public and player revisions are separate audience counters; they cannot be compared across audiences. Secret registration may leave public and other players' view bytes and Firestore update metadata unchanged. Public events contain neutral phase/health/location facts; private `COMMAND_REGISTERED` contains only command ID. No event gives private target, Protection, role, Code, cause or global journal sequence. Finished views alone reveal exact roles and Code under the approved rule; Aborted views do not.

## Freshness, revision ordering and reconnect

Configure Firestore with `initializeFirestore(app, {localCache: memoryLocalCache()})`; do not enable IndexedDB persistence or persistent local cache. Memory cache can still be stale. SDK metadata and a fresh server read determine transport freshness, never elapsed client time. The official [Firestore cache documentation](https://firebase.google.com/docs/firestore/manage-data/enable-offline) describes memory cache and `includeMetadataChanges`.

On initial subscribe, resume, identity change or reconnect, mark the session stale and disable replacement gameplay intent. Obtain [`getDocFromServer(viewRef)`](https://firebase.google.com/docs/reference/js/firestore#getdocfromserver) or await a listener snapshot with `metadata.fromCache === false` and `metadata.hasPendingWrites === false`, using `{includeMetadataChanges:true}`. A metadata-only change can deliver the first server confirmation even when bytes are identical. Cached snapshots may render a labeled stale state, but cannot mark the session fresh, authorize submission or advance the phase. A missing/denied document, failed server read or listener error clears freshness. See the official [listener metadata instructions](https://firebase.google.com/docs/firestore/query-data/listen).

Within one match/audience, accept increasing `viewRevision`; equal revision must mean identical composed contents. A lower fresh revision, or equal revision with different contents, is an integrity/restoration error: stop commands and escalate instead of silently resetting the counter. Rollback/reseed uses a fresh match ID unless a reviewed mechanism preserves monotonic revisions for that same identity. Do not transplant old-match raw receipts into that new identity. Production restoration has not been tested.

Views and events commit atomically but independent listeners have no delivery ordering guarantee. Buffer an event until its authorized view revision is present. Sort by numeric `viewRevision`, then numeric ordinal from the document ID `{revision}-{ordinal}`; lexicographic document-name order puts `10-*` before `2-*`. Event IDs are opaque; do not decode their numeric-looking suffix as a global sequence. Dedupe by match/audience/event ID. Dedupe command confirmation by command ID so receipt plus event is one registration.

For initial/reconnect hydration, establish a replay cutoff at the first fresh view revision; retained events at or below it are history. If a newer view overtakes a buffered event, update facts and skip its obsolete animation. If equal-revision event and view arrive in either order during a live session, present that event at most once. There is no event-pruning job at this base; production retention and bounded query/index design remain review gates. Use the constrained audience query above without adding unreviewed composite-index assumptions; a runtime query/index error is not a healthy subscription.

## Durable receipts and uncertain delivery

Persist only reconciliation identifiers: match ID, approved seat ID, phase ID and command ID. Keep the original private command payload and target in memory. Names of storage keys and values must not encode role, target, Protection, Code or command type. Clear unsent selection on phase/match/audience changes. Before sending, establish the identifier record so reload can recover the original identity. No command-kind recovery field is present in protocol 2; see [the explicit proposal](contract-refinements-proposal.md).

Any interleaving of concurrent identical submissions produces at most one stored receipt and journal decision. Once gameplay evaluation commits, exactly one durable decision exists and its accepted resource/effect application occurs at most once. If no invocation commits, lookup may remain unknown; individual invocations can still return `UNAVAILABLE` and require reconciliation. Both accepted and rejected gameplay receipts survive retries. A same-ID identical request recovers the original receipt before new phase/time validation. Within `(matchId, seatId, commandId)`, changing payload or phase conflicts; a different match ID uses a separate receipt namespace and does not recover or conflict with the old match's receipt. Accepted `REGISTERED` reserves the permitted resource/action once; it does not confirm a hit, disclose defense or promise a visible effect. `PHASE_CLOSED` and `NOT_ALLOWED` are durable rejections, not reasons to generate a replacement ID for the same attempt. The timestamp of a replay response may be refreshed; the stored receipt remains the original decision.

After a network loss, timeout, unreadable body, schema failure or `UNAVAILABLE`, outcome is unresolved. Use `v1Receipt` with the persisted IDs. A `found` receipt settles it. `unknown` means no committed receipt at that lookup transaction, not proof an earlier in-flight invocation cannot still commit. A private pending ID or registration event confirms acceptance but does not recover the private target or command kind. While the original phase remains open, keep an unresolved reloaded command pending: its discarded private payload cannot be safely reconstructed.

When original payload is still in memory, retry that identical ID/payload after reconciliation; the server will recover a receipt or durably evaluate that original intent, including after its phase closed. After reload, do not reconstruct a target, resend an invented payload under the old ID or clear pending acceptance from an unknown lookup made while the old phase could still accept it.

After a fresh server view proves the saved phase has closed, request lookup **after** observing that view. A found receipt is final. If unknown, no later first acceptance is possible for that old phase: a delayed delivery can still create a durable `PHASE_CLOSED` rejection. Clear the unresolved acceptance and offer a new intent valid for the current fresh phase using a new command ID. Never reuse the old ID; this sequence does not promise that no rejected receipt can appear later. Cached snapshots, local countdowns and preflight failures cannot substitute for the server-view-then-lookup order. Protocol 2 offers no cancel/finalize-unknown endpoint and no lookup for lifecycle operations.

A safe preflight failure settles only the invocation it answered. It cannot clear an earlier unanswered attempt. `COMMAND_ID_CONFLICT` also leaves the original receipt/effect untouched. Recovery changes UID but preserves seat-scoped command receipts; authenticate with the active seat binding before lookup. Lifecycle operation IDs are scoped to UID across operations: retry identical operation/body/ID, and use different IDs for different intents.

## Failure and retry matrix

| Failure code | HTTP status at this base | Client action |
| --- | --- | --- |
| `UNAUTHENTICATED` | 401 | Reauthenticate/refresh token; reconcile any earlier unanswered command |
| `FORBIDDEN` | 403 | Check origin/App Check/admission/current binding; disable unauthorized actions; reconcile earlier attempts with authorized identity |
| `INVALID_REQUEST` | 400; also 405/413/415 HTTP preflight | Fix schema/method/size/content type; this invocation made no gameplay decision |
| `UNSUPPORTED_PROTOCOL` | 400 | Stop and require the correct pinned consumer/runtime; do not coerce another protocol |
| `COMMAND_ID_CONFLICT` | 409 | Recover original receipt; never replace original payload under that ID |
| `REQUEST_ID_CONFLICT` | 409 in HTTP mapper | Declared schema code; not currently emitted for lifecycle conflicts at this base (they return `COMMAND_ID_CONFLICT`); handle both pending review |
| `UNAVAILABLE` | 503 | Unknown outcome; retain identifiers and reconcile with bounded retry |
| `RATE_LIMITED` | 429 | Wait at least returned `retryAfterMs`, then retry same operation/ID; reconcile earlier uncertainty |

Only rate-limit responses emitted by the current service include a numeric retry delay; other failures omit it. The strict schema permits missing or null delay. If delay is absent/null, use bounded backoff rather than a tight loop; never treat it as proof of settlement. A numeric delay is a minimum, not permission to ignore Auth/freshness/deadline gates. Apply delay to a monotonic elapsed clock, with bounded positive jitter, and do not poll every frame. Current durable buckets are per UID/operation across matches: creation 5 per ten minutes, admission 20 per minute, other operations 120 per minute. Existing submission/lifecycle receipts are returned before new-operation rate limiting; lookup itself is rate limited. These caps are implementation details, not load guarantees.

## Trusted time and deadline catch-up

Calibrate the countdown from a parsed authenticated `serverTimeMs` response and the fresh authorized phase's `endsAt`, measuring round-trip uncertainty with a monotonic client clock. Recalibrate after reconnect/resume and when uncertainty grows. The displayed countdown is advisory; the successful server transaction attempt decides whether submission was before `endsAt`. Client time, presence, receipt arrival and animation completion cannot extend or close a phase. Live phases have fixed 60-second windows; Finished/Aborted have `endsAt:null`.

When the trusted estimate reaches a fresh phase's deadline, an admitted display/player may POST `v1Advance` with its current phase ID. The response echoes the requested phase ID; it is not a new snapshot. `advanced` means that request advanced once; `unchanged` includes early, stale/already advanced and terminal cases. Read/wait for the fresh authorized view and recalibrate. Duplicate/stale deadline jobs and catches are safe; calling advance cannot skip an unexpired window. One evaluation opens the next 60-second window at trusted evaluation time; it does not fast-forward every elapsed historical window. Do not repeatedly call advance in a frame loop or call private task/repair handlers from the client.

## Private storage and emulator connection

Private composed views, legal target sets, role/Code knowledge, Protection, ballots, command payloads and recovery secrets stay in memory. Exclude them from local/session storage, IndexedDB, Cache Storage, service workers, URLs, telemetry, console logs and crash breadcrumbs. Sign-out, match change and binding change detach listeners and clear private memory, event buffers, selection and stale flags. Reauthentication uses the established identity or explicit host recovery; do not create a fresh anonymous player on every reload. Auth SDK credential persistence is a separate identity decision from game-data caching and must be chosen deliberately for shared versus personal devices; it never authorizes storing private match data.

For the repository's local suite, use Node `22.21.1`, npm `10.9.4` and Java 21:

```sh
npm ci
npm run verify
npm run test:emulator
```

For an interactive local client session after building, start the configured suite from the same repository with `npx --no-install firebase emulators:start --config infra/firebase/firebase.json --project demo-mothership --only auth,firestore,functions`. Keep the project ID exactly `demo-mothership`. Initialize the web client with demo-only configuration, connect Auth to `http://127.0.0.1:9199` and Firestore to host `127.0.0.1`, port `8180`, before any SDK operations, then sign in with synthetic identities. Send HTTP directly to Functions port 5101 with `currentUser.getIdToken()`. No Functions callable SDK is needed. See Firebase's official [Auth emulator instructions](https://firebase.google.com/docs/emulator-suite/connect_auth) and [Firestore emulator instructions](https://firebase.google.com/docs/emulator-suite/connect_firestore).

The web-client dependency and implementation belong to the coordinated Frontend/tooling deliverable; this backend-base worktree does not install it or claim to compile a browser transport. The emulator's Auth tokens must never be sent to a live Firebase project. Local tests do not validate production App Check, target-project IAM, Tasks/Eventarc/Scheduler reliability, real-device acceptance, human balance or restoration.

## Verification and adoption gates

Executed on 6 October 2026 in the isolated `codex/v1-protocol2-handoff` worktree from the exact Backend base above, with Node `22.21.1` and npm `10.9.4`:

| Command | Actual result |
| --- | --- |
| `npm ci` | Passed; 826 packages installed with committed lockfile |
| `npm run verify` | Passed: source/workspace integrity, typecheck/build, 25 bootstrap/contracts + 79 engine + 46 backend tests = 150; no failures, skips or todos |
| `npm --cache /private/tmp/gamen-handoff-npm-cache pack --workspace @mothership/game-api --dry-run --json --ignore-scripts` | Passed; six package entries, all in `dist/` or `package.json`; handoff examples/tests absent |
| `git diff --check` | Passed |

The five new backend tests permanently cover the synthetic handoff catalog. Emulator execution is assigned to the coordinating reliability worktree to avoid competing for the fixed loopback ports; it was not run in this handoff worktree. Runtime/dependencies/artifact packaging logic are unchanged, so standalone install is not rerun here; the combined follow-up must record its own emulator/artifact results. Actual Frontend suites also belong to the pinned combined tooling candidate; this workspace base still contains Frontend shells and cannot establish consumer acceptance.

This change keeps protocol-2 wire shapes, game rules, exports, root tooling and production entrypoints unchanged. Adoption requires Frontend and Balance review of the handoff/refinement proposals, integration review of the complete dependency stack, a pinned combined consumer candidate with actual Frontend suites and production-exclusion checks, then authenticated connected device acceptance. Nothing in this handoff approves or merges those dependencies.
