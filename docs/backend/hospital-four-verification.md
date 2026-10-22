# Four-bed Hospital Backend verification

## Scope and provenance

This is the executable Backend candidate for [issue #155](https://github.com/Amirkianfar66/GameN/issues/155), following the [owner-authorized implementation dispatch](https://github.com/Amirkianfar66/GameN/issues/155#issuecomment-6256068599) and [Integration checkpoint review](https://github.com/Amirkianfar66/GameN/issues/155#issuecomment-6256117269). The later four-bed/incoming-elimination decision supersedes the earlier Hospital rule in #96 for the new tuple only. The exact original #96 question, answer and question-item identifier remain in the immutable successor overlay.

- Actual executable starting SHA: `6ca4b51d5acd1454daec68c5108c8f12ee2286bf`.
- Runtime and test source verified: `afac7173f25a82138d231e7b1906896f9919562c`.
- Branch/worktree: `codex/backend-hospital-four-runtime`, `/Users/amirkianfar/.codex/worktrees/backend-hospital-four-runtime/GameN`.
- Focused stacked [PR #163](https://github.com/Amirkianfar66/GameN/pull/163), base `codex/v1-board-v2-release` at the executable starting SHA. Final documentation is a subsequent documentation-only commit; read its exact SHA from the PR.
- Existing Backend planning work and the primary checkout were preserved. No Frontend/Designer/Balance source files, root dependencies, release selectors or CI gates were changed.

The candidate is protocol 2 / `full-game-1.11.0` / `in-person-v1-hospital-four-2026-10-19`, ruleset SHA-256 `7d9d3519df8813feb1213f1ad4439cae90895af6850c223264c28907824aeb9c`, logical layout `board-v2-four-0.1.0`, reserved art `design-0.5.0`. Historical tuples and art agreements remain supported without upgrading saved matches or prepared deals. See the [runtime contract](hospital-four-runtime-contract.md) for exact checkpoint, overflow occurrence and consumer requirements.

## Actual local checks

Node `22.21.1`, npm `10.9.4`; pinned `npm ci` completed. Local Auth/Firestore tests use only `demo-mothership`. The machine initially had no Java runtime; an official checksum-verified Adoptium JRE 21 was used from `/private/tmp/mothership-java/`, without a global installation. An initial sandbox-denied build was rerun with authorized access to this managed worktree and passed; it was not a source failure.

| Command / gate | Actual result |
| --- | --- |
| `npm run verify` at clean source `afac717` | Passed, exit 0; source/workspace integrity, both typechecks, build and all required test gates |
| Bootstrap / engine / Backend | 152 / 1001 / 253 passed, zero failed or skipped |
| Tooling / presentation / app / design | 180 / 208 / 500 / 252 passed, zero failed or skipped |
| Historical Balance static | 103 passed; this is not successor Balance approval |
| Historical Balance scenarios / controls / playouts | 516 scenarios passed, 33 reviewed blocked, 6 explicit manual; 508 baselines and 4,490 detected negative controls; 30 completed playouts, zero unfinished/invariant/hint/replay mismatches; clean-source report gate passed |
| Historical capacity-resolution gate | 107 scenarios passed, 15 explicit manual; all 600 playouts completed without invariant, hint or replay failures |
| `node scripts/test-emulator.mjs data` | Passed all 25 files: 523/523, zero failed/cancelled/skipped/todo; owned emulators shut down cleanly |
| `node scripts/test-emulator.mjs functions` | Not run locally as a separate group; exact-runtime-head CI declared-Hack and Board V2 Functions groups passed. Successor HTTP/Tasks activation remains unrun |
| `npm run check:browser-dependencies` | Passed strict TSX, modular SDK declarations, React/Vite dependency bundle and exclusion scan; no browser rendering or SDK connection |
| `node scripts/package-backend.mjs --verify-install` using the already built runtime | Passed clean standalone install/import and forbidden/legacy-fixture source scans; packaged `hospital-four.js` and declaration present |

No check timeout, test selection, fixture expectation or CI requirement was weakened. Logs for this local run are `/private/tmp/gamen-hospital-verify.log`, `/private/tmp/gamen-hospital-emulator-data.log`, `/private/tmp/gamen-hospital-package.log` and `/private/tmp/gamen-hospital-browser-dependencies.log`. They are local evidence, not committed private match exports.

The standalone artifact reports source SHA-256 `33b7b9c2d0450b020f0e407321f2e3e0d8443d6646e320a60b94d2dfc6881a4c`, artifact SHA-256 `45e4d4e642d094c995804ee843ec52408e86d407b31231e1e3406bf0a953cd46`, `verifiedStandaloneInstall:true`. This is packaging evidence, not a deployed release receipt.

## New acceptance and limits

The 20 successor contract tests cover exact overlay bytes/hash and owner answer, version/art/layout pairing, strict placement/Blackout readers, overflow audience/pins/stable occurrence identity binding/expiry and separation of four physical beds from roster-sized clinical anchors.

The three new engine modules contain 120 cases: native legal 7/8/9 histories, selected historical tuple/replay traces and explicitly labeled constructed checkpoint/restore/slot controls. They cover healed-first admission, victim-number competition including a lower-number new second-hit body, unchanged retained-body slots, same-batch Rescue versus committed irreversible overflow, Captain EJECT and provenance, repeated Protection/Clone, Code/identity retention, victory, effect-time frozen audiences, malformed saves and old H5/H6 behavior. The broader historical service regression separately covers RELEASE, injured Jail waiting, healed fallback and Captain-loss returns under their original tuples. Constructed cases remain constructed after execution. The R3 Supply-then-overflow checkpoint control uses synthetic queued shots that those roles cannot ordinarily register in R3; native histories instead preserve legitimate R3 grants through later R5/showdown overflow.

The 18 new Auth/Firestore service cases have all passed. Three perform actual service admission, staged preparation and Ready, including restart of the compatible current binary with historical creation/art defaults while retaining the prepared successor pins. Fifteen start once from a legal synthetic Healthy SETUP and then execute real service commands, trusted injected-clock deadlines, Firestore Rules and full journal replay, without midmatch Admin edits. They verify 7/8/9 overflow and body competition, three concurrent deadline attempts with one durable advance, duplicate/conflicting command IDs, lookup/lost-ack recovery, audience isolation, unchanged stale retries and paired 1.10 fifth/sixth-bed controls. They do not prove an old binary can load new saves, automatic Tasks, HTTP token validation, browser films or real-device behavior.

[Independent Integration reviewed `afac717`](https://github.com/Amirkianfar66/GameN/pull/163#issuecomment-6256333119), recompiled an isolated exact-source archive and reported all 123 groups passing: the 120 Backend engine cases plus three independently written groups spanning 432 constructed admission histories. No blocking finding was reported in the reviewed engine/contract scope. These are independent constructed controls, not Claude Balance approval or native multiplayer evidence. The original malformed offboard/EJECT shortcut found during local review was fixed: successor offboard placement now requires per-seat matching EJECT or overflow evidence; the global EJECT-used flag alone is insufficient. Guard/projection rejection and unchanged input were independently rechecked.

Physical Hospital positions are H1-H4 only. Clinical presentation remains HV1-HV7/8/9 with the original `slotCount`. Valid HV5+ words-only output and occupied-anchor imagery suppression are reviewed consumer requirements; Backend tests validate authoritative wire data and allocation, not rendering. Frontend/Designer acceptance is separate. Integration supplied candidate art registration #164 at `e7650bd850202d3a65ccd0144bfcf4b9b5f451e6`; it is not adopted or activated by this Backend branch.

## Redacted contract example

Fictional schema example, not a captured match or evidence of a particular move being allowed:

```json
{
  "request": {
    "protocolVersion": 2,
    "matchId": "example-match",
    "phaseId": "example-phase",
    "commandId": "example-command",
    "command": { "type": "MOVE", "destination": "Room A" }
  },
  "receipt": {
    "protocolVersion": 2,
    "matchId": "example-match",
    "phaseId": "example-phase",
    "commandId": "example-command",
    "status": "accepted",
    "code": "REGISTERED"
  }
}
```

Authentication determines the actor; the payload has no role or caller-selected seat. The same command ID and exact request recover the stored receipt. A changed payload using that ID returns `COMMAND_ID_CONFLICT`. An accepted registration is not proof of a later effect. Existing server movement eligibility and full-destination refusal remain authoritative.

## Remaining review and unrun acceptance

No additional owner decision is requested. The recorded healed-first/numeric checkpoint is implemented as the reviewed candidate, including second-hit body competition and stage-truthful Supply. Independent Claude Balance successor specification/execution is requested through #155 and #133 and remains pending; the 446 historical specified/unrun cases are not relabeled acceptance. Frontend/Designer runtime adoption, exact new art/Ready agreement in the combined build and final Integration review remain dependencies.

New-profile automatic HTTP/Tasks, combined consumer browser/reconnect/phone acceptance, real-device/screen-reader testing, load testing and human social-deduction playtesting are not established by this branch. Hosted CI status must be read at the final exact head. No merge, default/profile activation, cloud configuration, IAM change or deployment occurred.
