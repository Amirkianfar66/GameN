# Private Supply acknowledgments, schema 1

Issue #62. Base: `c8856242caea349b620345349f6b59c7a87b6d7f` (#53), whose runtime source matches deployed `89f4a881733096a320b8365973e4540b82392ae4`. Canon: confirmed V1-16 in `rules/overlays/in-person-v1-owner-decisions-2026-10-06.json`. Ruleset/hash and wire protocol 2 remain unchanged. This implements G17; it introduces no new Supply eligibility or failure-reason disclosure.

## Proposed consumer contract

Exported runtime contracts and parsers are in `packages/contracts/src/own-acknowledgments.ts`. Their publication is a concrete proposal for Frontend and Balance review, not a claim that affected-role review is complete.

Listen to the caller's own `matches/{matchId}/ownAcknowledgments/{uid}` document. Its schema is:

```ts
{
  schemaVersion: 1;
  protocolVersion: 2;
  matchId: string;
  seatId: SeatId;
  bindingRevision: number;
  revision: number;
  historyAvailable: boolean;
  supplierResults: Array<{
    round: 3;
    commandId: string;
    successfulRecipientSeatIds: SeatId[];
  }>;
  receivedSupply: Array<{ round: 3; ordinaryWeaponsGranted: 1 }>;
}
```

A Supplier result exists even when its successful set is empty. The Supplier receives only actual successful seat IDs; there are no failure reasons, timestamps, requested-target echoes or global journal counters. Each successful recipient sees only their own received weapon, without the Supplier's seat or command ID. Other seats see empty arrays. Existing strict views, receipts and audience events are unchanged.

`revision` is `(bindingRevision - 1) + (historyAvailable ? 1 : 0) + supplierResults.length + receivedSupply.length`. It changes only for that seat's recorded acknowledgment facts or binding. Unchanged acknowledgment documents are not rewritten, so their Firestore update time does not disclose another seat's private registration or result.

`parseOwnAcknowledgments(payload, {matchId, seatId, bindingRevision?})` accepts a missing/null document as `null` (legacy history unavailable). A malformed document or mismatched audience/binding throws. `OwnAcknowledgmentsSchema` and the nullable `OwnAcknowledgmentsReadSchema` are exported. No missing result may be inferred from ammunition or an erased queue.

## Authorization and client freshness

The service resolves the authenticated UID through current membership and its reverse seat binding. Rules permit only the matching active player to get their own schema-1 document, with matching match, seat and binding revision. Host-only capability, table display, another seat, old UID and unauthenticated callers receive no private access. Collection listing and every client write are denied. A host who also plays may read their own seat.

A private metadata mirror at `matches/{matchId}/seatSessions/{uid}` exposes only `{schemaVersion:1, protocolVersion:2, matchId, seatId, bindingRevision}`. `SeatSessionSchema` and legacy-safe `parseSeatSession` are exported. General membership/binding documents remain server-only. The mirror is created at admission and replaced atomically during recovery.

Consumers bind each subscription to the current Auth UID and a subscription generation. Require a fresh validated own view with the same match/seat, a server-authorized session mirror, and an acknowledgment with that mirror's binding revision before displaying results. Clear held acknowledgments on view quarantine, Auth/UID change, permission denial, malformed/mismatched/stale sidecars or recovery; reattach fresh listeners on reconnect. Do not treat an offline cached sidecar as a fresh authorization check. No SDK diagnostic or private-payload logging is required.

Recovery deletes the old UID's acknowledgment and metadata documents and writes the replacement from authoritative engine state, with the new binding revision, in the same transaction that rotates membership and seat ownership. The recovery token never enters either document.

## Engine and rollout boundary

New matches pin `full-game-1.0.1`. The engine retains a durable server-only successful-grant ledger, including empty outcomes. It survives normal serialization and the Firestore storage codec; replay and duplicate stale deadlines cannot grant twice. Recorded actions still survive later actor injury/Jail/elimination. Officer may receive the approved unusable extra weapon and never gains a second ordinary shot.

Saved version pins are never rewritten. The service's existing exact-engine guard refuses new engine transitions and binding recovery on old active `full-game-1.0.0` states. Cached command receipt replay, lookup/server-time reads and version-independent recovery-grant issuance remain supported; a grant cannot be redeemed against an unsupported saved engine. Finish those matches with the prior pinned artifact, or establish that no old active matches remain before adopting this runtime. No implicit upgrade, forced abort or multi-version routing is supplied. Existing saved views remain compatible, and missing sidecars are a supported fallback. The pure projector reports unavailable history for pre-ledger state rather than fabricating earlier outcomes.

## Balance binding and adoption

Pinned committed Balance source: `7d63089497ec4b7cb84881ea3a8cd58febdb2fdf`; active uncommitted Balance work is excluded. BAL-REQ-8's real binding must call exported `projectOwnAcknowledgments(state, seatId, bindingRevision = 1)`, derive Supplier `armedBySupply` from actual `supplierResults[].successfulRecipientSeatIds`, and include the complete acknowledgment in each seat's `raw.also.players` read. Do not derive a pretend acknowledgment from private truth or run the disclosure stand-in as fix evidence.

The new catalogue and updated #47/#51 hashes/counts require a focused dependent Integration adoption with the fix. The old 470-case gate is not acceptance of the committed 522-case catalogue. D11/D12 remain separate unresolved cases and do not block successful nonself two-target disclosure. Frontend rendering remains the coordinator's consumer adoption; these Backend tests alone do not accept a Supplier UI or complete hosted V1.

## Verification

Pinned Node 22.21.1 and npm 10.9.4; offline `npm ci` completed (887 packages). `npm run verify` passed 674/674 tests (30 bootstrap/contracts, 97 engine, 46 Backend, 16 tooling, 140 presentation, 345 game), with zero failures/skips/todos. Workspace/source integrity, both typechecks and build passed. The engine suite includes 18 new regressions. Offline `npm run package:backend -- --verify-install` passed standalone install/import and fixture/forbidden-source exclusion, including the new runtime projector/contracts. The persisted service/Rules suite passed 26/26 tests (19 existing and seven focused acknowledgment/legacy regressions), zero failures/skips/todos. It used only synthetic identities and an isolated `demo-mothership` Auth/Firestore instance on loopback 29199/28180, hub 24500/logging 24600 and a private temporary hub directory. It shut itself down after exit 0. A first startup attempt stopped before tests because the system Java launcher had no runtime; the passing run used JDK 21.0.12.1. No active emulator was reused or stopped. This did not start the Functions emulator; the complete fixed-port lane remains a CI/integration gate.

That suite proved durable Supply outcomes through retry/stale deadlines/service restart, unchanged uninvolved acknowledgment bytes/update times, own-only Rules access and list/write denial, absent legacy snapshots, tampered binding refusal, same-seat recovery with old-document deletion/new revision and old-UID denial. A legacy `full-game-1.0.0` regression proved fresh submit/advance/deadline/abort/redeem refusal without rewriting engine, bindings, views, journal, outbox or sidecars; compatible reads and grant issuance stayed supported. Recovery readback proves the completed atomic transaction; it does not claim a concurrent-observer race test.

The actual committed Balance run bound the real projector against clean engine/source commit `36525afeb39adb154f11d72731126bdca82f99d7` and clean adapter-only tooling `725a5a82978a18c9b9c7f0e7d2ff5b4da4faa9bc` (parent `7d63089497ec4b7cb84881ea3a8cd58febdb2fdf`). Its report gate passed: all 483 ready scenarios from the 522-case catalogue, 475 mode baselines, all 4,388 negative controls, and 10 deterministic playouts per mode; no invariant/hint/replay mismatch. The 33 blocked/six manual cases remain unexecuted. No stand-in/trial flag supplied fix evidence. The original Balance static suite was 66 passed/three explicit overlay-not-run. The adapter-only snapshot exposed three old refusing-API stub failures; the separately tested fixture correction adds the required export/missing-export regression and passes 67 tests with three explicit overlay-not-run. The focused dependent adoption must include that correction, the committed catalogue and updated #47/#51 gates; the temporary adapter run is not acceptance of a root CI adoption.

Standalone artifact SHA-256: `383c803aed5c10eb56ab1b867c02104c39d0e483c1efbec0138ca8cabdd2119f`; compiled/source SHA-256: `03e68dff09fa5b5df57179c5824c73e3a9a16067fe0163222aa6212ff3bba9b4`. The artifact has 15 production V1 exports; it adds no new HTTP operation. Evidence logs are retained locally as `gamen-g17-verify.log`, `gamen-g17-emulator.log` and `gamen-g17-package.log`; they are not committed private runtime payloads.

Frontend/Balance contract review, dependent catalogue/gate adoption, combined consumer review and current-head CI remain integration requirements. No consumer/device/hosted acceptance is claimed. No cloud deployment or merge was performed.
