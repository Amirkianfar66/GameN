# Issue #96 — versioned room capacity

## Source and compatibility

The existing Backend worktree was clean when inspected at `1051cca8274e126b9f66229db84390e337170f4a` on `codex/backend-deadline-repair`. That branch is preserved. The implementation branch `codex/backend-room-capacity` starts from the actual V1 integration candidate `1a92f3790e45622196014cc008544fc33c359c0a`; PR #95 is its dependency. The issue [records these pins](https://github.com/Amirkianfar66/GameN/issues/96#issuecomment-6110839699).

Read the [owner decision and confirmed ordering](../decisions/2026-10-11-room-capacity.md) before adopting this behavior.

| Behavior | Engine | Ruleset | Capacity / Pass |
| --- | --- | --- | --- |
| New matches | `full-game-1.2.0` | `in-person-v1-capacity-2026-10-11` | Hard capacity / Pass |
| Existing Pass matches | `full-game-1.1.0` | `in-person-v1-pass-2026-10-08` | Historical uncapped / Pass |
| Existing pre-Pass matches | `full-game-1.0.1` | `in-person-v1-2026-10-06` | Historical uncapped / no Pass |

Support requires an exact engine/ruleset/hash/protocol tuple. Asset pins remain match-specific. Missing historical lobby creation pins keep the existing pre-Pass fallback; unknown or mixed tuples fail closed. No stored creation pins, prepared deals, running states, assignments or receipts are upgraded.

The new ruleset hash is the SHA-256 of the separate confirmed overlay. The parent Pass and original V1 hashes are preserved. Source checks and policy tests bind all three. Protocol schemas and audience fields are unchanged.

## Placement and authoritative commands

Capacity counts every seat whose current location is the destination, including Eliminated occupants. A/B/Hospital/Jail have five places; Command has one; Final Zone has no capacity limit. Ordinary return selects the remembered room when possible, otherwise the other A/B room. With at most nine players, both ordinary rooms cannot already be full while another occupant needs to return. It does not overwrite the remembered voluntary room or consume movement.

MOVE checks the fresh authoritative occupancy before mutating the actor. Projection omits full destinations. A rejection leaves engine resources and movement unchanged. The service serializes accepted concurrent moves on the same engine document: the first transaction to commit occupies the last place, the retried competitor rejects. Stored accepted and rejected receipts replay before fresh phase/time/policy evaluation; changed payloads retain `COMMAND_ID_CONFLICT`. This is transaction serialization, not a new actor priority.

Injured Hospital entry is conditional on a place. Jailed players remain Jail; a released Injured player may wait physically in Jail with `jailed=false`. Eliminated Hospital occupants never vacate through healing. Captain injury still removes the title and returns from Command immediately; later Hospital finalization can leave the former Captain at that ordinary return location if Hospital is full.

All queued attacks and Main Actions retain recorded actor order, then Rescue, R3 Supplier, placement and victory. The owner resolved CAP-ORDER-01: return healed Healthy/free Hospital occupants first, in existing stored seat order, then process placements and Injured Hospital entrants in that order. Eliminated patients keep their beds. Only the new tuple uses this departure prepass; old tuples retain the original single pass. Tests cover competing entrants and earlier/later healed departures.

## Random starting placement

Each new human admission or bot binding epoch draws an independent cryptographic A/B preference through the separate room randomizer. The preference is cached across transaction retries; the actual room is recomputed against current approved occupants. A full preferred room falls back to the other ordinary room. This is capacity conditioning, not a seat-parity/equal-count quota or role/character rule. Nine players necessarily occupy 5/4.

Pending requests reserve no physical place. Approval rechecks current bindings atomically and persists any redirected room in both the admission and binding. Retained humans and bots keep their assignments. Removing and later adding a bot uses a new epoch/preference. Identical operation replay recovers its prior outcome without rerandomizing. Setup selection, prepared-deal validation and engine construction reject a corrupt overfull new-tuple roster rather than silently migrate it.

## Independent Balance and presentation reviews

The Balance-role auditor independently traced the canonical five-round Jail bound and created the engine acceptance matrix for 7/8/9 players. Only a successful Jail tally adds one occupant; releases add none and death retains existing occupancy. Actual canonical five-admission paths are regression-tested.

The frozen 522-case Balance catalogue retains its original bytes, rulebook and exception statuses. Its adapter explicitly creates the previously reviewed Pass tuple. Reports record the gameplay pins separately from required current binary pins, build digest and source commit; actual constructor versions are checked. These are **legacy compatibility results**, not new capacity or human social-balance acceptance. New capacity acceptance is in the engine and real Auth/Firestore service suites, including the separately confirmed Hospital ordering.

Reconnect placement was independently reviewed at Designer `e01bbd7daf873a514948021b89098c8459bae19d` and Frontend `af291c138ed4aafe470fbfa7377d35e075b4ae9e`.

- Designer `design/board-motion/js/layout.js:57` retains local previous assignments before collision resolution. Seat 6 alone receives A1; when seat 1 enters, continuing client gives seat 6 A1 / seat 1 A2. A fresh client at the identical [1,6] occupancy gives seat 1 A1 / seat 6 A2. Handoff reconnect claims at lines 77/155 and checks at 311–318 do not cover this differing-history case.
- Frontend `packages/presentation/src/model/stations.ts:134` sorts numeric seat IDs and derives stations from current public occupancy, producing consistent fresh-snapshot placement. Formations can change when occupants change.
- Recommend one stateless public allocator ordered by numeric seat ID across consumers. Stable exact stations throughout a room stay **and** fresh-client agreement would need separately reviewed authoritative state/history. No such shared field is added by #96.

The pure Designer probe was read-only. Capacity/FULL derive from existing public occupancy and versions; animation may use only confirmed public facts. Frontend/Designer implementation remains outside this PR.

## Verification record

Verification results and exact source commit will be recorded after the checks run. Tests use synthetic matches and local emulators only. No cloud configuration, IAM, deployment, public asset publication or production match access is authorized by this issue.
