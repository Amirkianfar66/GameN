# Lobby identity service handoff

Base `c8856242caea349b620345349f6b59c7a87b6d7f`; branch `codex/v1-lobby-identities`. The [decision record](../decisions/2026-10-07-crew-identity.md) pins the owner approval, Designer catalog and unchanged rules. Frontend/Balance contract review remains pending. This is Backend implementation, with no consumer UI, hosted adoption or deployed acceptance claimed.

## Public document

Listen to `matches/{matchId}/identities/public` with `FullLobbyIdentityDocumentSchema`. It is a separate schema-1/protocol-2 document:

```json
{"schemaVersion":1,"protocolVersion":2,"catalogVersion":"crew-0.1.0","matchId":"synthetic-match","revision":1,"locked":false,"seats":[{"seatId":"seat-1","displayName":null,"characterId":null}]}
```

New lobbies start with an empty roster at revision 0; each approved seat appears with both values null. The pair is either fully selected or fully null. Character IDs are unique within a match; display names may duplicate. A missing historical document is an authorized absent snapshot (`null` fallback), rather than a new authorization failure. Missing/unselected identities and a known ID without a usable picture render as the existing numbered token and “Player N”. Never copy the exploration into a runtime dependency.

Reads require an admitted display or active player binding. Host display membership grants the public document, not another player's private view. Outsiders, revoked/stale bindings, collection listings and all client writes are denied. No UID, role, private device, room, resource or command content is in this document. “Public” means the admitted match audience; it is not internet-readable.

The identity revision is independent of game-view revisions. Increment it on seat admission, changed selection and first locking. A new request for an unchanged pair keeps the revision. Gameplay, secret commands, health/Jail/Captain changes and recovery never update identity bytes or revision. Selection/start/abort transactions serialize over the document. Existing protocol-2 game/lobby shapes and events remain untouched.

## Authenticated setter

JSON POST `v1SetLobbyIdentity` in `us-central1`, using current Firebase Auth and production App Check headers through the same exact-origin, 4 KiB, no-store/private adapter as other V1 operations. The new operation has its own versioned response; it does not extend `FullOperationResponseSchema`.

```json
{"schemaVersion":1,"protocolVersion":2,"requestId":"synthetic-request","matchId":"synthetic-match","displayName":"Supplier","characterId":"c1"}
```

The server obtains the seat from the verified UID's membership and reverse binding. There is no client seat/UID field and no host override. Names accept 1–12 Unicode code points, nonblank text, no control characters or lone surrogates. A role-like name is allowed plain text. Render with text content, never markup; do not select styling, role art, faction or authority from it.

Success is `{schemaVersion:1,protocolVersion:2,ok:true,serverTimeMs,revision}`. Parse with `FullSetLobbyIdentityResponseSchema`, including HTTP gateway failures. An acknowledgment's revision identifies the original durable outcome; concurrent later selections may have a newer document. Render the fresh listened document and reject regressing/conflicting revisions within that identity document.

| Code | HTTP | Meaning |
| --- | --- | --- |
| `UNAUTHENTICATED` | 401 | Missing/invalid current Auth |
| `FORBIDDEN` | 403 | Origin/App Check failure or no active seat binding |
| `INVALID_REQUEST` | 400, or transport 405/413/415 | Invalid exact request/name/character |
| `UNSUPPORTED_PROTOCOL`, `UNSUPPORTED_SCHEMA` | 400 | Use the pinned protocol/schema; do not coerce |
| `REQUEST_ID_CONFLICT` | 409 | Same UID/request ID with different identity request |
| `CHARACTER_TAKEN` | 409 | Another seat owns that character |
| `IDENTITY_LOCKED` | 409 | Start/abort fixed the seat identities |
| `RATE_LIMITED` | 429 | Wait at least `retryAfterMs` and retry the original operation |
| `UNAVAILABLE` | 503 | Outcome unresolved; retry identical operation/ID |

Successful, taken and locked outcomes use separate server-only `lobbyIdentityOperations` receipts keyed by verified UID/request ID. Identical replay returns the original decision with current response time, even after start/abort; a changed payload or match conflicts. Authorization precedes replay, so an old UID cannot recover its acknowledgment after a seat transfer. Receipts are independent of existing lifecycle/gameplay namespaces. After a durable refusal, a changed selection is a new intent with a new ID. Transient/preflight failures do not persist an identity decision. A later preflight failure cannot settle an earlier unanswered request. Per-UID identity operations share the existing 120/minute cap, with a minimum rate delay; replays precede new rate accounting.

The setter can initialize a missing old lobby document from bound seats. It cannot edit/materialize identity for an old running match. Start permits unselected seats for compatible fallback; it atomically locks an existing identity document before publishing roles. An absent old document remains absent at start. Abort locks an existing unlocked record. Recovery rotates authority and retains all seat identity facts.

## Review and validation

Frontend adopts selection/listeners, text rendering, same-seat recovery and the explicit fallback through its own focused change. Designer coordinates versioned catalog/pictures and whole-bundle loading independent of roles. Balance verifies role-independent setup and unchanged gameplay. No matching art is published here, and no production runtime project/origin/emulator guard is broadened.

With Node 22.21.1/npm 10.9.4, offline `npm ci` installed 887 packages. `npm run verify` passed **658 tests** (25 bootstrap/contracts, 79 engine, 53 Backend, 16 tooling, 140 presentation, 345 game), with zero failures/skips/todos; source/workspace checks, both typechecks, build and production exclusion passed.

The focused persisted suite passed **11 tests**, zero failures/skips/todos, in a fresh `demo-mothership-identities` Auth/Firestore instance on loopback ports 19199/18180, with isolated hub/logging ports 14500/14600; it shut itself down afterward. It covered concurrent character claims and selection/start races, durable replay/conflict/refusal, own-binding authorization, Rules read/write/list denial, missing-document fallback, start/abort freezing with null choices, service restart, UID recovery, rate delay, unchanged role setup/gameplay and real emulator Auth through the normal HTTP adapter.

This run used only Auth/Firestore plus the in-process HTTP adapter; it did not start the Functions emulator or change its fixed runtime guard. The existing complete Functions emulator lane and current-head CI remain coordinator integration gates. Standalone package/export verification is reported in the commit handoff. Physical devices, an actual deployed new Function, and consumer acceptance remain unrun.
