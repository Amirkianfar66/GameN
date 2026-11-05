# Approved post-Sync presentation — P27

Actual follow-up starting SHA: `603be00119329ae643cefeac51c12d3885039719`, clean `codex/backend-planet-engine` worktree. The owner explicitly approved the fixed six-second server presentation after a real Blackhole Sync, followed by a separate full 60-second Jail vote. This supersedes the earlier pending R1 design review. The [final decision P27](../specifications/planet-successor/owner-decisions.md#p27--blackhole-presentation-before-jail-voting), [state contract](../specifications/planet-successor/rules-contracts.md) and [motion packet](../specifications/planet-successor/motion-requirements.md) are authority.

Integration's shared commit `aa90fbd42283813116a41922337406139ff9905a` is adopted as `bdeba7457e846695a8b72f9b5bdd375e02aa06b4`. This branch lacked the earlier Designer production brief, so the modify/delete cherry-pick conflict was resolved by retaining the exact incoming file; no independent shared/spec edits were made. Owned engine implementation: `f3c91d62904edbc0ff885f0428047815c5ffe9f9`.

## Rule and version impact

New exact candidate: protocol `3`, engine `planet-game-1.0.1`, ruleset `in-person-planet-sync-six-2026-11-05`, authority hash `4f26343641fcff00480bb3c0ba852703418f772bb677117a272828ad229c8b1c`. Source manifest: `rules/planet-successor-sync-authority-2026-11-05.json`. This is a new-match behavior change, not a retagging of a saved state. Historical protocol-2 engine/contracts/overlays remain unchanged. No profile, asset version or deployment default was activated.

The ordinary stage closes panel registration, samples one complete world once, collapses player pointers and publishes the selected board plus the authorized Sync occurrence. Only an actual authorized Blackhole activation/Sync enters `BLACKHOLE_PRESENTATION`; an activated single-world/no-crossing round still qualifies. A round without Blackhole opens voting immediately.

Presentation has a new authoritative phase ID/deadline token and exactly 6000 ms from actual transition time. Ballot is null, active actor is null and panel remains closed. No attacks, Rescue, medical placement, navigation, no-survivor finish or current-round Promise opportunity is processed there. P18 Hacker Code and existing window permissions remain governed by their existing rules; presentation does not invent a new physical action or communication power.

At the presentation deadline, the engine opens `JAIL_VOTE` with new identities and `endsAt = actualOpenTime + 60000`. Late delivery never subtracts from that vote. Meeting cards finalize from the selected authoritative board at this actual opening; Jail cards await actual ballot closure, and election/appointment cards retain their own opportunities. The selected physical state, queued actions, spent resources and Sync publication metadata carry through unchanged. No second sampling, event publication or injection application occurs.

## Scheduling and consumers

Integration must atomically persist the Sync state, phase, audience views/events and deadline outbox intent for `planetDeadlineAt(state)`. During this stage it returns the presentation end. Delivery supplies the recorded expected phase ID/token. Early, stale and duplicate callbacks cannot advance it; a late valid callback opens a new full vote. The next task uses the new vote identities. The existing five-second Blackout boundary remains unchanged later in the round.

No command or animation-complete callback ends presentation. Missing art, reduced motion, a shorter phone cut, reconnect or browser visibility does not restart/shorten/extend authority. Consumers derive remaining time from the current phase timestamps, seek/snap within the remaining interval, and do not replay the film after the phase. They render the already-selected board; no branch identifiers/counts are published. The same Sync event keeps its original ID, source phase binding, first publication revision/time and expiry when the vote opens.

PR #174 assets are not adopted by this engine change. Frontend/Designer still own film corrections, actual mounting, fallback, clinical treatment and device/accessibility checks.

## Verification

Exact implementation built and tested: `f3c91d62904edbc0ff885f0428047815c5ffe9f9`. This subsequent checkpoint changes documentation only. Toolchain: Node `22.21.1`, npm `10.9.4`.

| Actual check | Result |
| --- | --- |
| `npm run test:engine` (includes workspace build) | **1,288 passed**: 287 successor cases + 1,001 historical cases; zero failures/cancellations/skips/todo; 127,544.184333 ms |
| `npm run typecheck` | Pure and browser programs passed |
| `node --test tests/bootstrap/contracts.test.mjs tests/bootstrap/full-game-contract.test.mjs tests/bootstrap/planet-contract.test.mjs` | **37 passed**, zero failures/cancellations/skips/todo (21 historical contract cases + 16 successor cases) |
| `npm run check:toolchain` | Exact pinned versions passed |
| `npm run check:workspace` | Eight-package, pure/browser and import/fixture boundaries passed |
| `npm run check:sources` | Historical source/art/overlay integrity passed |
| Historical scope comparison against the actual starting SHA | `packages/engine/src/full-game`, historical full-game contracts, service, infra, Frontend and rule overlays byte-unchanged |
| `git diff --check` | Passed |

A preliminary targeted run passed **16/16** cases before adding the malformed-restore assertions; the final complete engine run above includes those assertions. Local logs are `/private/tmp/gamen-p27-engine-final.log`, `/private/tmp/gamen-p27-typecheck.log`, `/private/tmp/gamen-p27-contracts.log` and `/private/tmp/gamen-p27-targeted.log`. Dependency install was not repeated because manifests/lockfile did not change; prior isolated-worktree install remains recorded in the earlier checkpoint. No full workspace verify, service emulator or browser run is claimed here.

The nine new native 7/8/9-player cases cover branched and single-world Sync, no-Blackhole skip, exact six-second boundary, delayed Sync and vote delivery, early/stale/duplicate callbacks, no early ballots/panel/movement, retained queued Rescue and shared injection costs, no early physical resolution/end, meeting versus Jail Promise opportunities, stable audience event metadata, P18 Code, reconnect codec equality and complete replay. Malformed authority controls are explicit clones of a real native presentation state. The three earlier native meeting histories now stop at presentation and assert Pending before the deadline, rather than silently skipping the stage.

## Predecessor candidate compatibility limit

The adopted shared schema intentionally replaces its singleton candidate tuple: `PlanetVersionsSchema` accepts only `planet-game-1.0.1`; its new contract regression explicitly rejects the predecessor `planet-game-1.0.0`. The manifest labels that predecessor an unshipped candidate and preserves its authority file. This preserves source history and fails closed; it does **not** provide current-package replay/decoding of an old protocol-3 candidate save.

Before rebuilding, Backend captured legal native 1.0.0 histories from the previously verified build for 7/8/9 players (45/48/51 transitions with state and every-audience digests). A probe confirms their exact initial-state digests and that the current schema rejects all three recorded tuples. Evidence is retained at `/private/tmp/gamen-planet-1.0-replay.json` and `/private/tmp/gamen-p27-legacy-candidate-probe.log`; it is synthetic, not production data. No fixture was re-dealt or upgraded to claim compatibility.

This limitation is flagged for Integration: if any predecessor candidate save must remain runnable in the current package, shared exact-tuple/schema support and recorded constructor pins/dispatch are required before adoption. Engine work has not silently widened those shared schemas. Actual protocol-2 source preservation and regression evidence are reported separately; no claim is made that the new singleton contract supports old candidate packets.

## Remaining boundaries

Integration owns service transactions/outbox concurrency, setup/Ready, reconnect listeners and combined emulator/API verification. Frontend owns real playback and browser/device acceptance. Those checks, production saved-game access, packaging, deployment and cloud reliability are not run here. No shared field, cloud/IAM/billing action, merge, asset publication or automatic PR #174 adoption occurred.
