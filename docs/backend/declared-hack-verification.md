# Declared-Hack Backend checkpoint (#120)

Review checkpoint, 14 October 2026. This implements the previously approved #120 flow; the later Blackout, Clone, direct Captain commands and Hospital timing specification remains on implementation hold.

## Exact inputs and dependencies

- Original integration baseline: `abb6839524b6dc3e5225e600f2f067c3fa3f9501`.
- Required parent: vote-result [PR #125](https://github.com/Amirkianfar66/GameN/pull/125), `bd4d77ccc1c46d90c5beafb770252fdae6f086ae`, branch `codex/backend-vote-results`.
- Actual starting Hack snapshot: `ba1842ff991dfb53207cbef110940016cc8d533d`, preserved unchanged in the detached review checkout and original `codex/backend-declared-hack` ref.
- Follow-up branch: `codex/backend-declared-hack-review`, isolated worktree `/private/tmp/gamen-backend-hack-followup`.
- Reviewed test/HTTP correction commit: `a7a3e44caa8fde8b7a20601d3f395d9eaa784875`.
- Frontend [PR #126](https://github.com/Amirkianfar66/GameN/pull/126) was rechecked at `bc92e581063cd2c4123a740755579fdfd1522b95`. It supports vote-result 1.4 and historical tuples, but not declared-Hack 1.5.

The stacked PR diff starts at the unchanged vote head. Consume the final published Hack PR head together with its parent, rather than selecting only a contract or engine commit. The initial implementation is `7b17b8b`; later commits add strict contract/phase-binding, bot and engine regression coverage. This follow-up adds service acceptance, the HTTP Ready fixture correction and this handoff. No Frontend/Designer source, source-fence exemption or runtime-art manifest is changed.

## Immutable behavior and asset agreement

| Pin | Required value |
| --- | --- |
| Protocol | `2` |
| Engine | `full-game-1.5.0` |
| Ruleset | `in-person-v1-declared-hack-2026-10-12` |
| Ruleset SHA-256 | `1d8a5e509372ea816af8d6782bf1d73720532ed672ee2f77e2938805976d8d6c` |
| Asset manifest | Exact prepared pin; compatible immutable production manifest still requires Integration approval |

The overlay inherits vote-result 1.4 with hash `617173762d5a1589d0adce55d4742a3aa70f6d5af03a968b6ab9f90d5392b010`. Exact historical 1.4, 1.3, 1.2, 1.1 and 1.0.1 behavior remains supported. Existing matches, deals, room assignments, receipts, replay and asset pins are not upgraded.

For a new prepared deal, Ready must include all five exact prepared pins only after that client explicitly supports the tuple and its immutable art manifest. A strict parse alone is insufficient client adoption. Hosted Frontend #126 currently permits only vote-result 1.4 with `design-0.2.0`; its emulator helper also permits `0.0.0-no-assets`. Neither is approval to activate 1.5 with an old manifest. Integration owns the reviewed Claude source selection, source-fence changes and new compatible runtime/art tuple.

The HTTP fixture now explicitly permits the named 1.4/1.5 tuples and only `0.0.0-no-assets` or `design-0.2.0` for local smoke testing. This is fixture compatibility, not production asset adoption. Historical Ready bodies still omit `acceptedVersions`. The fixture builds one request body and replays the same intent/pins. Server validation is unchanged: missing/mismatched acknowledgment is `UNSUPPORTED_PROTOCOL` without Ready mutation or a durable receipt; malformed input is `INVALID_REQUEST`. An accepted changed payload conflicts. Unknown-outcome requests must be recovered or retried unchanged before replacement.

## Phase, command and receipt handoff

After ordinary expiry or accepted Pass with a pending Standard Hack:

1. `HACK_DECLARE`: at most 15,000 ms for the fixed target. All three side choices are uniform. Only the fixed target has `legalTargets.DECLARE_HACK_SIDE = [selfSeatId]`. A first valid declaration ends the phase early. Normal roles must declare their own side; Undercover and Alien retain permitted bluffing. Bots declare their own authorized side.
2. `HACK_RESULT`: a full 5,000 ms beginning at the committed server transition. Missing input becomes `NO_DECLARATION` with null side and copy “No side declared”. Never infer an actual faction or fabricate a claim.
3. `HACK`: a full separate 60,000 ms conversation beginning at its committed transition. A late first delivery starts the next full window then; retries do not restart it.

`activeSeatId` remains the initiator. Existing before-voting movement remains available during the prelude; it adds no Code-entry time. Existing range, no-self-target, initiation limits, embargoes and full-talk behavior remain intact. Scan is separate and unchanged.

Synthetic declaration request, with identity supplied by authenticated binding rather than the body:

```json
{
  "protocolVersion": 2,
  "matchId": "fixture-match",
  "phaseId": "fixture-declare-phase",
  "commandId": "fixture-intent",
  "command": { "type": "DECLARE_HACK_SIDE", "declaredSide": "Alien" }
}
```

The ordinary neutral receipt retains the request's original declaration phase even when acceptance opens the result phase:

```json
{
  "protocolVersion": 2,
  "matchId": "fixture-match",
  "phaseId": "fixture-declare-phase",
  "commandId": "fixture-intent",
  "status": "accepted",
  "code": "REGISTERED"
}
```

Participant-only current `hackFeedback` then has this shape:

```json
{
  "hackId": "fixture-declare-phase",
  "phaseId": "fixture-result-phase",
  "round": 1,
  "status": "DECLARED",
  "declaredSide": "Alien"
}
```

`hackId` is stable across declaration/result/talk; `phaseId` must match the current authoritative phase. The claim is never verified truth. Only the initiator and fixed target receive feedback and partner association. It is null for uninvolved players and absent from public/display/host-only projections and public events. Conversation completion/abort clears live feedback. Server-only journal evidence and neutral receipts retain deterministic replay/recovery; reconnect restores current state without reopening an expired result or publishing claim history.

## Actual verification

Node `22.21.1`, npm `10.9.4`; pinned `npm ci` installed 887 packages. Owned compile passed with `tsc --build packages/contracts packages/engine services/game-api infra/firebase`. Source integrity passed with all historical source and overlay pins preserved.

- Owned engine, contract, service and infra regressions: **678/678 passed**, no skips. The command includes engine/service/infra test globs plus bootstrap contracts, fixtures, full-game, vote-result and declared-Hack contract files.
- Focused real Auth/Firestore acceptance: **63/63 passed** in one run: 21 declared-Hack, 21 Ready compatibility and 21 vote-result cases, covering 7/8/9 players.
- Complete discovered Auth/Firestore data group: **269/269 passed**, no skips, in one fresh isolated emulator run over all 18 data-suite files (391 seconds of test execution). The focused 63 cases above are a subset, not 63 additional unique cases. This is one all-green data run at test commit `a7a3e44caa8fde8b7a20601d3f395d9eaa784875`; it is not a combined root/Functions/browser run.
- Standalone Backend package installation, runtime imports and forbidden fixture/credential source scans: **passed** using `node scripts/package-backend.mjs --out /private/tmp/gamen-oct14-backend-package --verify-install`.
- `npm run verify`: toolchain/workspace/source checks passed, then pure typecheck failed at Frontend's missing `VOTE_RESULT`, `HACK_DECLARE` and `HACK_RESULT` mappings in `packages/presentation/src/copy/en.ts` and `model/common.ts`. Downstream root build/browser/Balance/capacity gates were not reached. Those checks were not loosened or replaced.

The initial overbroad unit invocation also included cross-workspace bootstrap build/presentation tests before their generated packages existed: 703 passed and two failed for missing generated game/design modules. The correctly scoped 678-case command above then passed. This is not a claim that all bootstrap or Frontend tests passed.

The new service suite seeds only a labeled synthetic initial SETUP through Admin, then exercises actual service transactions, Auth identities, Firestore Rules reads, stored projections, receipts, outbox decisions, seat recovery and journal replay. Its trusted clock and scoped repair candidate query are explicit. Concurrent calls exercise real transactions without forcing a particular contention interleaving. It covers early/no declaration, exact 14999/15000 and 4999/5000 boundaries, full talk, duplicate/conflicting/stale commands, late/repaired deadlines, fixed-target privacy, Undercover claims, paired-claim noninterference, binding recovery and abort. Alien bluffing, bot policy and prelude movement/Code expectations additionally have engine/contract evidence; do not relabel those as direct coverage in the new service file.

Auth/Firestore ran on isolated loopback ports 29199/28280 with Functions disabled. The pre-existing Frontend Functions emulator occupies standard 9199/8180/5101 and was preserved. The corrected HTTP fixture has not yet been run against a newly built Functions runtime. No combined all-green root/Functions/browser/device run is claimed. Local logs are under `/private/tmp/gamen-oct14-*` and contain synthetic fixtures only.

Independent subagent source reviews found no blocking issue in the existing Hack implementation, new service suite, Ready patch or handoff. They did not run the emulator suite or substitute for the affected Frontend/Integration and Balance reviews.

## Remaining integration gates

Frontend must integrate this final Hack stack, add the two phase mappings and private declaration/result consumer, enforce exact current exchange/phase binding, preserve unresolved request identity, and explicitly adopt the agreed five-pin Ready tuple. It must not infer a true faction, add role-dependent controls, or derive private results from public snapshot changes. Integration must allocate/pin compatible immutable art and retain the strict source fence, then run one exact combined head through root, Functions/HTTP, browser and historical Balance/capacity checks. The capacity gate currently explicitly expects the 1.3 runtime default; any version-aware extension belongs to Integration and must preserve its historical controls.

For the later owner specification, the Backend technical proposal remains: store authoritative stable logical slots with lowest-free arrival allocation; bind accepted selections and receipts to one frozen lighting snapshot/window; publish authorized final placement and sanitized outcome checkpoints; freeze room recipients at effect time; and settle historical delivery on reconnect without replaying old effects. This requires a separately reviewed new tuple and affected-role contract approval. No shared fields for those later mechanics, Blackout, Clone, direct Captain actions or Hospital deadline behavior are implemented by this checkpoint.

No unresolved #120 gameplay decision was introduced. Frontend adoption, art/version agreement, independent Balance review and combined acceptance remain dependencies. No merge, deployment, cloud configuration or IAM change occurred.
