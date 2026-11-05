# Pure planet successor engine

Backend ownership is limited to `packages/engine/` and this handoff. Actual starting SHA: `29e6ea82a31085df12ddee62758a55646eecbd3a`, from design `26947b1fbf001275b5f1979f5732824fe08af783` and historical gameplay `db65bb87f05983ff6861d27689ba1b7bab55d051`. Branch: `codex/backend-planet-engine`; isolated worktree `/Users/amirkianfar/.codex/worktrees/backend-planet-engine/GameN`. Root and Integration checkouts are preserved.

The [six successor specifications](../specifications/planet-successor/README.md), especially the final 26 decisions, are authority. The earlier open recommendations are superseded. This engine does not reinterpret protocol-2 saves or mutate historical overlays. Integration's refined contract commit `79418e72dba99ba99afe047ecb97467fb5e73b62` was explicitly adopted as dependency cherry-pick `920b89e7`; engine work does not independently edit shared schemas.

## Agreement and API

Exact gameplay pins: protocol `3`, engine `planet-game-1.0.0`, ruleset `in-person-planet-2026-11-05`, source hash `32cde63d777ed93744637f911c134247272dc862524bd5aa9d0c3cd405dbe8ea`. `assetManifestVersion` is required from the reviewed service setup. This engine does not allocate a production artwork identity or activate a creation profile.

Exports from `@mothership/engine`:

- `createPlanetGame(setup, context)`; setup has matchId, supported playerCount, complete roleOrder, independent capacity-valid initialRooms, complete initialTurnOrder and assetManifestVersion. It begins Round 1's fixed pre-turn window; the adapter owns preceding character selection/role-reading/Ready.
- `applyPlanetCommand(state, actorSeatId, request, context)` returns immutable next state and a strict `PlanetReceipt`. Acceptance means registration. Transactional actor-scoped command-ID receipts and conflicting-input detection remain service authority; retries must recover original receipts before re-evaluating phases or costs.
- `advancePlanetDeadline(state, context)` returns state/advanced. Context is trusted recorded `{now,nextPhaseId,nextDeadlineToken,random}`, with optional expected phaseId/deadlineToken for stale-task refusal. Samples are finite unit-interval values `[0,1)`, consumed once per whole transition; missing needed randomness fails. No wall clock, network or client randomness is read.
- `planetDeadlineAt(state)` returns the next authoritative scheduling timestamp, or null. Schedule this value rather than assuming phase.endsAt is always the next boundary.
- `projectPlanetPublic(state)` and `projectPlanetPlayer(state, seatId)` return strict audience schemas and independent copies.
- `assertPlanetGameState`, `encodePlanetGameState`, `decodePlanetGameState` validate complete JSON authority. `abortPlanetGame` produces the existing no-winner host-abort result; only an authenticated authorized adapter may expose it.

### Blackout scheduling

The shared phase remains exactly 15 seconds: five light, ten dark. At `startedAt+5000`, `advancePlanetDeadline` records the dark boundary, keeps phase.id/endsAt unchanged and rotates deadlineToken. The next `planetDeadlineAt` is the original 15-second end. The adapter must persist the updated views and distinct-token outbox task atomically. Replayed old-token tasks do not advance the dark state. A late delivery at/after the original end resolves directly without extending the window. Selection offers and window concealment follow this recorded boundary; clients also gate already-delivered content by the authoritative Blackout clock.

## Authority and resolution

The immutable roster, Code, lazy round-order map and global ledgers are separate from complete per-world physical state. A/B crossing copies the entire current world before movement and assigns only that actor to the new world. Same-room repositioning uses the movement allowance without branching. Sync samples uniformly across worlds, including Original and empty-population copies, before the Jail vote and all attack/healing resolution. No origin-tag refund/filter exists.

Global state keeps final Code/Scan progression, Blackhole lifetime use, movement/block history, patient attempts, Standard Hack allowances, accepted Promise quotas/results and shown window images. World state keeps health/placement, injuries/detention, queued actions, weapons, physical action counters, Protection, Clone, suppression, Captain command counters, spaceship activation/override and the shared two-injection pool. Branches inherit reservations and spent resources. The selected full state keeps its costs, including activations inherited from another world's earlier state.

Actual ballots remain authoritative when a full Jail denies transfer. The five-place count includes physical bodies and living Hospital detainees awaiting return. RELEASE/EJECT touch physical Jail occupants only. Resolution keeps actor turn order and Main before Shot, then Rescue, Round-3 Supply, due deaths, healed departures, numeric Hospital admission and numeric ordinary/Jail returns. Existing bodies retain places. Denied Hospital candidates are permanently offboard with their identities/history intact and receive a nonclinical overflow occurrence. No survivor check or Promise meeting result is taken from a discarded world.

Every round retains full ordinary/Hack windows, complete rescue opportunities and following-round Clone expiry. Round orders are generated/saved only when that round begins. Navigation is one Y move per round; weight margins cannot add steps. Engineer captures opposite-room identities privately. Only eligible A/B occupants contribute; suppression removes the whole Captain multiplier. Ship Hack overrides the final direction before tie/disclosure. Sequential timed confirmations have no veto. Planet arrival or finalized no-survivors ends the game; no Round-5/Showdown/team-elimination ending remains.

## Projections and presentation records

The shared board stays at the last finalized checkpoint throughout ordinary turns; live phase/turn/talk remain current. Player boards use the actor's assigned world without reality labels. Offices receive the private route/final direction without weights. No Engineer identity/targets, private claims, foreign-world physical effects or alternate worlds are spread into public views.

Audience revisions compare allowlisted view contents, not secret command counts. Events have per-audience first-publication metadata, original phase binding, stable authorized-fact identity and exact 30-second expiry. A globally finalized occurrence first shown after Sync receives its publication time then; earlier authorized publication to a player is not restarted. Room defense uses frozen recipients and contains no attacker/donor/Clone cause. Publication metadata and private storage sequence are excluded from occurrence identity. Expired metadata may remain in a current snapshot; consumers filter expiry from trusted server clock without using a later secret command to cause a public revision change.

Clinical anchors remain roster-sized, distinct from physical H1-H4. Admission/deadline metadata travels on seats. Admitted INJURED/RESCUED/medical ELIMINATED occurrences have valid unique-subject anchors; retained starting Hospital slots reserve anchors including bodies. A healed-first replacement may use HV5 while physically entering H1-H4. INJURED entry uses authoritative current slot after strict anchor validation; HEALED/DEATH retain words-only/held-bed safeguards. Overflow has no clinical anchor or fabricated bed. These are authoritative data contracts, not a claim that a film was rendered.

Promise offers have explicit offered/accepted/declined/expired states; records/results stay pair-private. Accepted quotas survive Sync. Meeting results use the synced board at voting start; Jail promises use actual ballots; future election promises track every relevant runoff and do not succeed vacuously. Only future-election kinds can remain pending past their round. Windows have exact endpoint/station permission, window-local author chronology, immutable bounded drawings and same-round expiry; global persistence grants no broader audience.

## Verification and limits

Pinned Node `22.21.1` and npm `10.9.4`; dependency install, workspace build and both pure/browser typechecks passed. A pre-final successor run passed 254 cases, including native command/deadline histories and deterministic replay; constructed module/restore controls are explicitly labeled. A subsequent numeric combined Jail-return correction adds three targeted regressions; final successor plus historical engine results will be recorded in the follow-up verification checkpoint.

No unresolved game-owner choice was invented. The refined contracts are sufficient for these engine APIs. Integration owns protocol-3 sessions/auth, atomic persistence, receipts, deadline dispatch, setup/Ready, bots, release profiles and emulator/API acceptance. Frontend/Designer own audience-safe consumer/film implementation. No service, infra, shared-contract rewrite, historical engine rewrite, cloud/IAM/billing action, deployment or human balance claim is part of this engine deliverable.
