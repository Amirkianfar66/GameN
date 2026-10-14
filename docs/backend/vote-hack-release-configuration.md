# Vote/Hack release configuration

Continuation input: joined PR #132 at `3dbc3699c7589d1031f5e2ca6b163e5cf150a246`. Backend branch `codex/backend-release-15`, isolated checkout `/private/tmp/gamen-backend-release-15`. PR #131 remains unchanged at `a9b77a7bd535efc8bdb5041cee18fd6526c0e354`. This release includes approved vote-result 1.4 and declared-Hack 1.5 behavior; capsule and the later October 13 mechanics remain separate.

## Explicit server configuration

The historical global `FULL_GAME_VERSION_PINS` remains exactly 1.3. Independent immutable 1.4/1.5 constants and exact-version handlers remain supported. Runtime initialization enables new 1.5 creation only with this complete reviewed configuration:

```dotenv
MOTHERSHIP_NEW_MATCH_PROFILE=declared-hack-1.5
MOTHERSHIP_ASSET_MANIFEST_VERSION=design-0.3.0
MOTHERSHIP_LEGACY_ASSET_MANIFEST_VERSION=v1-preview-469bf64fe98cac5a
```

Root supplied the legacy manifest identity from its target preflight; no cloud preflight was performed in this Backend continuation. Missing, misspelled, partial or unreviewed profile/art combinations fail before Admin initialization. The local suite uses the same explicit profile. With the profile absent, service creation retains 1.3 and historical-art routing is absent, preserving prior behavior. These are server configuration options, never client request fields or host-selected rules overrides.

`createV1Service` receives a copied `creationVersions` four-pin tuple. Only a fresh `createMatch` writes it to `engine/gameplayPins`; existing lobby loads, admission/starting-room completion, preparation, commands and receipts continue using stored authority. A lobby without historical gameplay pins retains the existing legacy fallback. No shared wire schema or contract field changed.

## Prepare, Ready and historical art

The choosing worker uses the stored gameplay tuple to prepare one immutable deal. In release mode, unprepared lobbies route as follows:

| Stored executable tuple | Asset assigned at first preparation |
| --- | --- |
| 1.0.1, 1.1, 1.2, 1.3 | `v1-preview-469bf64fe98cac5a` from the explicit historical routing option |
| 1.4 | Reviewed `design-0.2.0` |
| 1.5 | Reviewed `design-0.3.0` |

Already-prepared deals bypass this routing and retain all five original pins, including old art. Ready validates current identity, binding and deal before accepted-request replay. New 1.4/1.5 acknowledgments must echo every exact prepared pin after client schema/art adoption; historical bodies remain unchanged. Missing/mismatched acknowledgment creates no Ready mutation or durable receipt; corrected same-ID submission is allowed only before acceptance. Accepted replay keeps its original payload and result; changed accepted input conflicts. Service recreation or a configuration update cannot reinterpret a prepared/running match.

Host flow is `v1BeginSetup` → full 30-second choosing deadline → prepared role deal → full 30-second reading minimum plus every human Ready → actual gameplay. Early Ready does not shorten reading. Stored setup tasks and repair own delivery. `v1StartMatch` accepts only replay of a historical accepted start intent; new direct starts are forbidden, so it cannot bypass this flow.

1.5 uses protocol 2, engine `full-game-1.5.0`, ruleset `in-person-v1-declared-hack-2026-10-12`, SHA-256 `1d8a5e509372ea816af8d6782bf1d73720532ed672ee2f77e2938805976d8d6c`. It inherits vote-result 1.4 (`617173762d5a1589d0adce55d4742a3aa70f6d5af03a968b6ab9f90d5392b010`). No tuple/hash, phase duration or receipt format is newly allocated by this configuration fix.

## Deployment and rollback sequence

Root owns the final combined commit, immutable manifest, source guard, all release gates and target deployment. Publish the compatible historical-capable client, update non-create handlers with the complete configuration, verify their configuration/deadline behavior, then update `v1CreateMatch` last. No separate hold on prepare handlers is needed: old lobbies keep their gameplay tuple and get the historical art route above. Existing prepared deals keep their saved art. Preserve Auth/App Check, exact HTTPS origins, private task invocation, queue enqueue identities, indexes, Eventarc and both scheduled repairs.

Rollback follows the same separation: revert/disable **creation first**, while new-version-capable prepare/deadline/command handlers remain deployed to drain already-created 1.5 lobbies and matches. Do not remove the release art/routing configuration from those workers while unprepared 1.5 lobbies remain. Removing the entire profile restores historical worker behavior; it is not a safe substitute for the creation-first drain sequence. Prepared/running pins and receipts remain permanent authority throughout.

The generated standalone artifact uses `dist/production.js`, not the fixture entrypoint. Record its Git head and artifact/source hashes; publish the exact verified artifact. Its configuration pin is `design-0.3.0`, while the Hosting bundle digest is separate release evidence. This continuation makes no deployment, IAM or Auth change.

## Verification boundaries

The release tests cover native creation/setup/Ready, all six tuples' art routing and pinned replay across 7/8/9 players, plus real transactional bot declarations. Their injected clock and stored-worker delivery are explicit; they do not prove cloud delivery or social balance. The independent constant/flag, stale/conflicting receipt, fixed-target privacy, five-second result and full-minute engine cases remain intact. Bootstrap vote/Hack contract fixtures now explicitly name their 1.4/1.5 tuple instead of following the historical default.

`infra/firebase/test-emulator/hack-http-helper.mjs` extends the existing real Functions smoke **only when the explicit 1.5 profile is selected**. It observes actual ordinary expiry, no declaration for 15 seconds, private result for 5 seconds, full 60-second talk and continuation, with no manual worker, Pass or advance supplying those transitions. It verifies original HTTP receipt replay, all participant/bystander views and durable journal/outbox decisions. Default-mode Functions acceptance still asserts 1.3.

To run that new-profile acceptance on an available local suite, supply the three configuration variables above and run `node scripts/test-emulator.mjs functions` after building. Final combined runs, target configuration/readback and deployed acceptance belong to Root. Actual local results and any unrun limits are reported with the checkpoint; no single all-green combined release run is implied here.

Scheduled gameplay repair now validates bounded result counters and surfaces failed repair to Scheduler instead of returning false health. Active leases and later pages retain their normal bounded subsequent retry behavior; no gameplay ordering changed.

Local checkpoint results (Node 22.21.1/npm 10.9.4): pinned install, full build/typecheck, workspace/source checks, 715 engine/service/infra/bootstrap tests, 72 focused Auth/Firestore tests (30 release profiles/routing + 21 Ready + 21 declared Hack; no skips), and standalone Backend install/import/forbidden-source checks passed. An initial 52-case failure exposed vote/Hack bootstrap fixtures following the restored default; explicitly pinning their existing 1.4/1.5 tuples repaired that test coupling without removing assertions. The isolated data emulator used 29199/28280 and shut down afterward. The new automatic Functions helper, full final historical Balance/capacity suite and combined browser/emulator release run were not executed here; Root owns them. No cloud, IAM, Auth or deployment mutation occurred.

Local package evidence: artifact SHA-256 `0daabfcf48d81582e4f01fe58875f90ed9f2431eec089eaf06cc041277b27f36`; compiled source SHA-256 `b8b460dd75cb1e1c5ec7248c71fcdc1be9896a04da5b4ab1e103720305abc36e`. These identify the local verified package, not a deployment receipt.
