# Shared host and admission document schemas

Issue [#33](https://github.com/Amirkianfar66/GameN/issues/33) closes the exported-schema gap identified in the 6 October 2026 all-agent review. The backend already writes these administrative documents, and the connected Frontend already reads them through provisional strict readers. This change gives both roles one shared validator and inferred type for the existing bodies.

| Pin | Value |
| --- | --- |
| This implementation base | `71dfd0277c6ccc4a5dd78b9702face98a46310b8` |
| Backend source reviewed | `5adaf98f8412e2294f45e00f8fb7c4c515127226` |
| Connected Frontend reader reviewed | `8b97180038a37b798fbef345272a32e42c0d0853` |
| Balance review context | `dedfe6929e65b22289ea427caba0ae9527e71e24` |
| Ruleset | `in-person-v1-2026-10-06` |
| Approved owner overlay SHA-256 | `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90` |
| Historical source-manifest SHA-256 | `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc` |

The shared candidate preserves the Backend and connected Frontend histories. These pins identify the source reviewed; they do not approve merging its dependency PRs. V1-01–V1-21 remain approved, Original Powers remain off, and no game rule or disclosure decision changes.

## Exports and stored bodies

Both validators and inferred types are exported from `@mothership/contracts` through its existing `v1-service.ts` barrel export. No fixture, development subpath or package-export change is required.

| Export | Authorized Firestore path | Exact fields |
| --- | --- | --- |
| `FullHostSessionSchema` / `FullHostSession` | `matches/{matchId}/control/session` | `protocolVersion:2`, `hostUid`, `playerCount:7|8|9`, `status:'lobby'|'running'|'complete'|'aborted'`, `roomCode`, `createdAt` |
| `FullAdmissionDocumentSchema` / `FullAdmissionDocument`, pending variant | `matches/{matchId}/admissions/{admissionId}` | `uid`, `initialRoom:'Room A'|'Room B'`, `requestedAt`, `status:'pending'` |
| Same admission export, approved variant | Same admission document | Same identity/room/time fields, `status:'approved'`, required `seatId:'seat-1'` … `'seat-9'` |

All objects are strict. UID validation matches the existing backend and provisional readers: 1–128 ASCII letters, digits, underscores or hyphens. Room codes contain exactly 12 uppercase hexadecimal characters. Timestamps are nonnegative safe integers in milliseconds. An approved seat's membership in the particular match's 7/8/9-seat roster remains the service's contextual check; the standalone admission schema has no player-count field to perform it.

The document bodies do not contain their path IDs. Admission documents also have no protocol-version field. Adding match/admission IDs or a version to those existing bodies would break the pinned strict reader, so this change adds none. Consumers bind a document to the expected match/admission path and apply the established protocol and Auth context. The host's room code invites admission and is separate from the private four-seat game Code.

Schema validation grants no capability. Existing Security Rules remain unchanged: host session reads require the host UID; admission reads require that host or the requesting UID, and requester list queries constrain `uid`. Direct writes remain denied. Host administration does not grant roles, Protection, Code, targets, engine state or other players' private projections. The new strict schemas reject such additional fields rather than stripping them.

## Service boundary

`createMatch` parses the exact host session before persistence, and its local `Control` type now comes from `FullHostSession`. `requestAdmission` parses the pending document before persistence. `approveAdmission` validates the full retained document with its proposed approved status/seat ID before creating binding, membership or operation response; its persisted update remains the existing two-field status/seat update.

Valid documents retain their exact field names, values and lifecycle behavior. Lifecycle and host-recovery updates still change only the existing status/host fields. No HTTP envelope, admission workflow, authorization policy, endpoint or audience projection is added or changed.

A malformed retained admission (for example an invalid timestamp or an unexpected private field) now fails before that transaction writes a seat or durable operation response. The existing service error boundary reports `UNAVAILABLE`; this does not establish that an earlier invocation settled. It is an output-integrity failure for operational investigation and normal reconciliation, not a new game-rule rejection or a client repair permission.

## Compatibility and adoption

This is an additive schema/type export for existing protocol-2 administrative document bodies. Wire protocol remains 2, and the ruleset/engine pins remain unchanged. It does not apply the pending legal-target, shot-availability or pending-command refinements. Any future emitted-body change must follow the repository's strict-shape/version policy and affected-role review.

The pinned `apps/game/src/connected/readers.ts` currently validates all six host fields but returns a four-field `HostSession` presentation value, omitting protocol version and creation time. Frontend can use the shared parser and preserve that mapping; replacing the presentation type with the full stored-document type is a separate deliberate consumer choice. Its `Admission` reader already returns the complete matching pending/approved body. Preserve the current missing-document and incompatible-protocol handling around schema parsing rather than assuming a validator implements reader outcome states.

One JavaScript-only boundary is stricter: the provisional pending reader tolerates an own `seatId` property whose value is `undefined`; the shared strict pending object rejects that property. It is absent from actual persisted pending documents and is not a new wire field. Frontend test doubles must author the exact stored shape. No Frontend-owned file was edited, and running its unchanged tests establishes regression coverage rather than adoption of these new exports.

Frontend must review the exported names/shapes, replace its provisional readers in its own focused change, and rerun its reader/connected suites. Balance must confirm the change adds no game/disclosure semantics. Integration review and checks on the actual merge candidate remain required; no adoption, merge or deployment approval is claimed here.

## Verification

Executed with Node `22.21.1` and npm `10.9.4` in the isolated `codex/v1-host-document-schemas` worktree from the exact base above:

| Command | Actual result |
| --- | --- |
| `npm ci` | Passed; 886 packages installed from the committed lockfile |
| `npm run typecheck` | Passed; separate pure and browser programs |
| `npm run test:contracts` | Passed; 25 tests, including four new host/admission schema regressions |
| `npm run test:backend` | Passed; 46 service/infrastructure tests |
| `npm run test:frontend` | Passed; unchanged pinned presentation/game suites and production-exclusion check |
| `npm run check:workspace` / `npm run check:sources` | Passed; ownership/import boundaries, historical sources and approved owner overlay preserved |
| `git diff --check` | Passed |

The new contract regressions exercise all supported player counts and host lifecycle statuses, both admission variants, missing/unsafe fields, invalid timestamps and explicit private-field rejection. They are included in the existing contract/bootstrap test commands; root scripts and CI configuration are unchanged.

Permanent emulator coverage is added to the existing full-service suite: actual created/pending/approved documents are parsed, complete/aborted host status bodies are checked, host seat recovery preserves the body while transferring authorized access, and malformed retained admissions cannot create a binding or durable operation response. These assertions use real Firestore transactions and remain synthetic test data.

Local emulator execution was **not run** for this change: Auth 9199, Firestore 8180 and Functions 5101 belong to another active agent's demo suite. That suite was neither stopped nor used. The coordinating owner will obtain actual results through an isolated CI run before accepting these persisted-document regressions. Standalone artifact installation is also an integration check for the final compiled candidate; no historical package fingerprint is reused as new verification. Cloud delivery, deployment, real-device acceptance, production restoration and human balance remain outside this change's evidence.
