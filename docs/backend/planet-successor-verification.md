# Planet successor engine verification

Executed on 5 November 2026 in the isolated Backend worktree. This is engine evidence, not a deployment or combined multiplayer acceptance report.

## Exact source

- Actual starting SHA: `29e6ea82a31085df12ddee62758a55646eecbd3a`.
- Approved design parent: `26947b1fbf001275b5f1979f5732824fe08af783`; historical gameplay: `db65bb87f05983ff6861d27689ba1b7bab55d051`.
- Branch/worktree: `codex/backend-planet-engine`, `/Users/amirkianfar/.codex/worktrees/backend-planet-engine/GameN`.
- Integration dependency: `79418e72dba99ba99afe047ecb97467fb5e73b62`, adopted by requested cherry-pick `920b89e702f92b6b17e759e93b0b01227832dca0`. It contains the reviewed successor game/service schemas and contract tests.
- Owned implementation: `92e12a6e6c4a6080e84ea9a82327375e0c316263`, followed by Promise eligibility correction `d12689d3a9bc975552aafbf628688bfe6d993f4f`.
- **Final clean implementation SHA actually built and tested: `d12689d3a9bc975552aafbf628688bfe6d993f4f`.** This verification checkpoint changes documentation only.

Protocol `3`; engine `planet-game-1.0.0`; ruleset `in-person-planet-2026-11-05`; immutable source SHA-256 `32cde63d777ed93744637f911c134247272dc862524bd5aa9d0c3cd405dbe8ea`. The adapter supplies the reviewed asset-manifest version. No creation default/profile was changed.

## Actual final checks

Commands used Node `22.21.1` and npm `10.9.4` from `/Users/amirkianfar/.nvm/versions/node/v22.21.1/bin`.

| Check | Actual result |
| --- | --- |
| `npm ci` in the isolated worktree | Passed; no dependency or lockfile change |
| `npm run test:engine` (includes workspace build) | **1,264 passed**, zero failed/cancelled/skipped/todo; 179,296.994167 ms |
| `npm run typecheck` | Both pure and browser programs passed |
| `node --test tests/bootstrap/planet-contract.test.mjs` | **15 passed**, zero failed/cancelled/skipped/todo |
| `npm run check:toolchain` | Exact pinned versions passed |
| `npm run check:workspace` | Eight-package/import/runtime/fixture boundaries passed |
| `npm run check:sources` | Historical reference, rule and art/source integrity passed |
| Historical scope comparison | `packages/engine/src/full-game`, `rules/overlays`, `apps/game`, `services/game-api` and `infra/firebase` byte-unchanged from the starting commit |

The final engine total contains **1,001 historical tests** and **263 successor tests**:

| Successor test file | Cases | Evidence type |
| --- | ---: | --- |
| `planet-lifecycle.test.mjs` | 35 | Native lifecycle histories plus explicitly constructed boundary/restore controls |
| `planet-opportunities.test.mjs` | 7 | Six native Promise histories with exact replay; one constructed random-cursor control |
| `planet-physical.test.mjs` | 93 | Constructed pure physical-module controls for 7/8/9 players |
| `planet-projection.test.mjs` | 72 | Native setup plus constructed disclosure/publication/clinical controls |
| `planet-social.test.mjs` | 41 | Constructed Promise/window helper controls |
| `planet-worlds.test.mjs` | 15 | Twelve native full-world histories with exact replay; three constructed all-dead-world controls |

Coverage includes complete copied-world selection, global ledgers, inherited activation/costs and discarded preactivation states; medical deadlines, four beds, retained bodies, numeric combined Jail returns and roster-sized clinical anchors; full-Jail ballots/reservations and physical-Jail commands; Hacker progression, office timeouts/blocks, uncapped Round 6+, Y routing and non-veto confirmations; Promise opportunities/runoffs/quotas and window privacy/expiry; finalized public versus current private boards, stable audience occurrences/revisions and the recorded five-second Blackout boundary. Constructed controls do not claim native setup or multiplayer execution.

## Review correction and negative evidence

The first complete run at `92e12a6e6c4a6080e84ea9a82327375e0c316263` passed 1,258 tests. Subsequent source review found that a missing vote could incorrectly fulfill No Jail Vote after Captain EJECT eliminated the giver. Approved P24 requires Not fulfilled when a power prevents an occurring opportunity; eligible abstention remains valid.

Six new regressions were executed against that previously built engine: all six failed for the expected Fulfilled versus Not fulfilled difference. Three are native 7/8/9 histories: successive rounds detain two players, they accept opposite-direction Jail Promises during legal private talk, Captain EJECT removes both, and actual Jail voting excludes them. Three constructed cases also check selected-world eligibility, actual-ballot precedence, unchanged quotas/results and valid omitted/null abstention. The correction uses the authoritative ballot voter set, then all 1,264 tests passed at the final clean implementation SHA. No gameplay expectation was weakened to obtain a pass.

Raw local logs:

- `/private/tmp/gamen-planet-engine-npm-ci.log`
- `/private/tmp/gamen-planet-engine-final-corrected.log`
- `/private/tmp/gamen-planet-engine-corrected-typecheck.log`
- `/private/tmp/gamen-planet-engine-corrected-contract.log`
- `/private/tmp/gamen-planet-promise-before-fix.log` (expected negative run against the earlier build)

## Integration handoff and limits

Integration already owns the shared dependency above; the owned runtime commits to integrate are `92e12a6e6c4a6080e84ea9a82327375e0c316263` and `d12689d3a9bc975552aafbf628688bfe6d993f4f`, followed by this documentation checkpoint. See [the engine handoff](planet-successor-engine.md) for exact API and deadline requirements. In particular, use `planetDeadlineAt(state)` for the recorded Blackout dark boundary and atomically persist the rotated-token outbox task. Engine acceptance is registration; the authenticated adapter must recover durable command receipts before phase/time revalidation.

Synthetic accepted Pass request/receipt shape (actor identity is resolved by the service):

```json
{"protocolVersion":3,"matchId":"example-match","phaseId":"example-ordinary-phase","commandId":"example-pass","command":{"type":"PASS_TURN"}}
```

```json
{"protocolVersion":3,"matchId":"example-match","phaseId":"example-ordinary-phase","commandId":"example-pass","status":"accepted","code":"REGISTERED"}
```

No unresolved owner rule or specific contract gap remains identified in this engine scope. Service sessions/auth, receipt concurrency, atomic persistence, actual deadline dispatch, setup/Ready, bots and emulator/API checks are Integration work and **not run here**. Frontend/browser/device/voice/film acceptance and an independent successor Balance audit/human playtest are **not run here**. Full workspace `npm run verify`, packaging and cloud reliability are not claimed by these engine checks. Historical source comparison and historical regression success do not alone prove a production save migration; no migration was performed.

The root checkout's branch/HEAD and pre-existing untracked image/review directory were preserved. No service/infra edits, deployment, activation, merge, public asset publication, IAM/billing change, production access or credentials were involved.
