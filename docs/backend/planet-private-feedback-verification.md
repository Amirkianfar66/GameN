# Planet private navigation and feedback implementation

Actual starting SHA: `b4825e0662859c4a8ba2690a447f034bc3b294f9`, clean branch `codex/backend-planet-engine` in `/Users/amirkianfar/.codex/worktrees/backend-planet-engine/GameN`. Integration explicitly delegated single-writer contract/authority preparation and pure engine implementation. Service/infra WIP, Frontend, presentation and Designer paths are not edited.

## Reviewed source and commits

P28 owner source: `8572fc0abb717ab07e09b4db3c25d6748ec8800b`, adopted as `86b1b311106c4271e46b29a82cced8af86cd4e11`. Existing owner decisions and the November6 cross-agent review settle the giver-only Meet meaning and the required private confirmation evidence. Optional R9 hack-round history and R11 acknowledgement history remain deferred; current generic fallbacks remain honest.

| Commit | Independently reviewable scope |
| --- | --- |
| `2b88a3676923efc41c0fab61b14b28ee609aec2f` | Exact three-tuple shared schema, new immutable authority, NAV_SETTING/private fields/error, contract tests and early handoff |
| `3d9f31c24227a9778123416932d669286695d25b` | P28 fixed-window navigation, version dispatch/scaffolding, historical shapes and golden replay fixtures |
| `2873651d119653f09dc17bd0392c5c22bfc90621` | R8 server capture and R12 actor-scoped reservation/outcome evidence |
| `efcd6c4c14a5c99541cd712bf08b731fc4ef5d54` | New-version giver-only Meet evaluator, corrected erroneous native assertion and positive/negative A/B histories |
| `903691e072f53944535c6a48b6e462f2420176e6` | Correct three historical fixture syntax expressions; no expected result changed |

The runtime commits form one candidate implementation stack; do not adopt a partially implemented intermediate revision. **Final implementation source: `903691e072f53944535c6a48b6e462f2420176e6`.** This subsequent verification checkpoint changes documentation only. No PR has been opened for this local slice; Integration review and combined adoption remain pending.

## Exact version and contract handoff

- Protocol: `3`.
- Engine: `planet-game-1.1.0`.
- Ruleset: `in-person-planet-private-feedback-2026-11-06`.
- Authority SHA-256: `4a1fc0e0dc21255253e31ae46e6042f9bd71e3fdec0f82f8a79b3ce213d01bfa`.
- Shared contract commit: `2b88a3676923efc41c0fab61b14b28ee609aec2f`.
- Exact `packages/contracts/src/planet-game.ts` SHA-256: `935cfc750e48429605cc352c67aec3f998ca75ccc11461f7a45ecc918f91b364`.

See [the early contract handoff](planet-private-feedback-contract.md) for strict shapes and consumer semantics. No existing source hash is rewritten. New authority binds preserved source files plus the P28 record and focused implementation clarifications.

Every round reaching navigation from Round2 receives one full15000ms NAV_SETTING interval, including majority, unresolved tie,0–0, retained ship-hack override and absent Officer. Only eligible Officer receives an unresolved tie offer. Its early accepted choice remains private, emits no event and changes no other audience packet/revision or phase timestamps/token. All office direction values stay null until the common deadline. At actual processing time the retained direction or existing uniform fallback leads to unchanged Captain-first/Officer-second non-veto confirmations. Round1 and P27 remain intact.

R8 captures the exact original identities on the server at Engineer registration, including an empty set. The record follows its per-world activation/cost and remains after round suppression expires. It is never inferred from current occupants or sent to targets/offices/public.

R12 attempt knowledge is global and patient-private. A correct accepted request reserves one injection once and creates its actor-scoped world reservation (`seatId:commandId`); different patients may use the same textual command ID. Copies inherit that identity/cost. At actual Sync, only a missing selected reservation becomes DISCARDED; inherited retained reservations stay QUEUED. WRONG never reserved an injection. At that request's actual Rescue step, changing Injured→Healthy means TREATED; otherwise NO_EFFECT, without refund or second deduction. Records survive queue clearing and departure from Hospital. No status is inferred from final health, another healer's event or missing historical data. Uniform NO_INJECTION is emitted before correctness only for an otherwise eligible unused patient; all guesses receive the same rejection without state/spending changes.

Meet A/B now checks only the giver at final voting start. Current-round meeting results still wait through P27; Jail/election/appointment opportunities and global quotas are unchanged. No Jail Vote remains against the recipient, quota true means used, and future round text is not invented from election IDs.

## Actual verification

Node `22.21.1` / npm `10.9.4`. The complete corrected run at exact implementation source `903691e072f53944535c6a48b6e462f2420176e6` passed:

| Check | Actual final result |
| --- | --- |
| `npm run test:engine` (includes workspace build) | **1,378/1,378 passed**, zero failures/cancellations/skips/todo;134,768.14625 ms |
| Historical `full-game`/first-slice cases within that run | **1,001 passed** |
| Planet cases within that run | **377 passed**, including both historical tuple suites and new candidate cases |
| `npm run test:contracts` | **26/26 passed**, zero failures/skips |
| Historical/new Planet contract files | **23/23 passed**, zero failures/skips; **49 total contract cases** |
| `npm run typecheck` | Pure and browser programs passed |
| Toolchain/workspace/source-integrity checks | Passed |
| Historical protocol2/runtime, predecessor authority manifests and hash-bound source comparison | Byte-unchanged |

TypeScript implementation and shared contracts did not change between the earlier successful typecheck/contract checks at `efcd6c4c` and the corrected test-only head. This documentation checkpoint does not alter any tested code or test input.

Already completed:

- Contracts build and first23 Planet contract cases passed at the early shared commit.
- Full pure/browser typecheck passed with the implementation.
- `npm run test:contracts`:26 historical contract tests passed, zero failures/skips.
- Planet historical/new contract files:23 tests passed, zero failures/skips;49 combined contract cases.
- Toolchain, workspace/import/fixture boundaries and historical source-integrity checks passed.
- A preliminary focused run passed69 cases before adding the three paired tie/non-tie controls.
- Initial complete engine attempt reported1160 passed and three file-level syntax failures in the historical fixture pin expressions. Those three files did not execute; this is not recorded as a complete pass. After correction, all218 affected fixture cases passed. No assertion, expected result, playout or gate was weakened.

New coverage has18 navigation cases,41 private-feedback cases,6 giver-only Meet cases and25 compatibility cases. Positive native histories use actual constructors, commands and deadline transitions with exact replay. Paired hidden-role twins,0–0 confinement, same-ID reservation collisions and corruption controls are explicitly labeled constructed; they do not claim native setup or multiplayer evidence.

Compatibility fixtures were captured from old verified builds before rebuilding the new code. Six original histories cover both old Planet tuples×7/8/9, totaling297 initial/transition checkpoints. Each compares full private authority, public view and every player view SHA-256 plus original receipts. The old Meet counterexample intentionally retains its historical Not fulfilled result. Encode/decode and packet shapes preserve omitted new fields. Exact tuple mixing, new phases/fields on old pins and historical generic empty-pool rejection are covered. This replaces the earlier P27 singleton-schema limitation with supported explicit dispatch; it does not migrate or retag saves.

Local evidence logs: `/private/tmp/gamen-p28-engine-corrected.log`, `/private/tmp/gamen-p28-engine-final.log` (initial incomplete run), `/private/tmp/gamen-p28-restored-fixtures.log`, `/private/tmp/gamen-p28-typecheck.log`, `/private/tmp/gamen-p28-legacy-contracts.log`, `/private/tmp/gamen-p28-planet-contracts.log`, `/private/tmp/gamen-p28-focused.log`.

## Integration requirements and limits

- New creation defaults to the new candidate only when the adapter selects/adopts it. Historical initial replay must pass `setup.versions` containing the saved full tuple/asset identity. Constructor rejects asset mismatch; decode never upgrades. Keep historical creation/receipt/asset pins and use existing version dispatch.
- Atomically persist NAV_SETTING authority and its deadline outbox intent. Use `planetDeadlineAt`; early Officer choice keeps the same phase/token/task. Skip public/bystander document/event writes when their revisions/payloads did not change, so transport metadata does not reintroduce the timing leak. Late tasks start the following full confirmation window at actual processing time.
- P27 still has its separate six-second presentation task and fresh full60-second Jail vote. No animation callback controls any phase.
- Service command receipts are actor-scoped and must recover accepted/rejected originals before phase/time revalidation. Engine replay/duplicate-deadline tests do not substitute for adapter transaction concurrency and lost-ack recovery tests.
- Frontend must review/adopt the strict new tuple and required nullable records, current-action offer meanings and static recovery baselines. Do not promise optional historical hack/ack data or infer patient/Engineer evidence from booleans or client previews. Integration owns R14 admission standing.

Full workspace verify, service/emulator concurrency, browser/device/film acceptance, packaging, independent Balance audit and human playtesting were not run for this slice. No deployment, merge, profile activation, cloud/IAM/billing change, new assets or cinematic adoption occurred. No unresolved game-owner rule is introduced; combined contract/consumer/service review remains an adoption gate.
