# Issue #96 — versioned room capacity

This is the original 1.2 implementation and verification record. See [the later independent audit follow-up](capacity-resolution.md) for the reachable CAP-28 defect and subsequent owner decisions implemented as 1.3.

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

The implementation and test sources were committed and verified at `b0ab7796b1157e3acc33d4dcee93ba5fdad6da66`. The final PR head also includes this verification record. Toolchain: Node `22.21.1`, npm `10.9.4`; local Firestore uses Java 21.

| Check | Actual local result |
| --- | --- |
| `npm ci` | Passed; 887 packages installed |
| `npm run verify` | Passed at the clean implementation commit: source/workspace/toolchain checks, both typechecks, builds, 53 bootstrap, 212 engine, 145 Backend, 105 tooling, 173 presentation and 427 Frontend tests; no failures or skips |
| Independent capacity engine audit | 64/64 passed at the same commit; includes all three player counts and exact previous tuples |
| Balance static | 71/71 passed; frozen source/traceability checked |
| Historical Pass catalogue | 483 passed / 33 reviewed blocked / 6 explicit manual out of 522; zero errors; 475 control baselines and 4,388 detected controls; 30 completed playouts, ten per player count |
| Isolated Auth/Firestore service group | 167/167 passed, including 36 new capacity cases; no failures or skips |
| `npm run check:browser-dependencies` | Passed; strict browser typecheck, production bundle and fixture exclusion |
| Standalone Backend package with clean install/import verification | Passed; forbidden-source scan passed; `verifiedStandaloneInstall=true` |
| Local real Functions and connected Frontend group | Full acceptance not completed locally: standard emulator ports are occupied by another workstream. An isolated-port attempt was rejected by the unchanged pre-initialization runtime guard (legacy HTTP group: 12 passed / 2 failed before runtime initialization). The guarded ports and the other session were preserved. These groups remain required in the PR's isolated CI runner. |

The actual `verify` Balance reports are under the temporary directories `mothership-balance-static-XXMPnw` and `mothership-balance-engine-ULymZ7`. Gameplay provenance is the previous Pass tuple; binary provenance is the new capacity tuple. The separate capacity tests exercise current behavior.

The forced-transfer emulator cases label their injected predecessor states explicitly. They prove canonical stored-deadline effects, projection/acknowledgment persistence, single-record replay and duplicate-delivery behavior; they do not claim that every injected predecessor has a complete reachable match history. Initial placement and concurrent MOVE cases additionally replay their stored command journals.

A synthetic `{"type":"MOVE","destination":"Room A"}` into five occupied places returns a durable receipt with `status="rejected"` and `code="NOT_ALLOWED"`, leaves movement available, and is omitted from own movement offers. The existing client message remains “You cannot move to that room right now.”

There are no unresolved capacity gameplay decisions. The independent Balance review found no rule or compatibility findings. The stacked PR depends on #95 and requests affected Frontend review of the test-only movement-selection adaptation; no shared field or Frontend runtime change is adopted. Designer's retained-station versus fresh-snapshot behavior remains the separate presentation decision described above.

Tests use synthetic matches and local emulators only. No cloud configuration, IAM, deployment, public asset publication or production match access occurred. CI results are reported on the PR for its exact final head; local emulator results do not establish deployed multiplayer or human social balance.
