# Frontend workstream

Issue [#3](https://github.com/Amirkianfar66/GameN/issues/3) · brief [agents/frontend.md](../../agents/frontend.md) · specification [first-slice.md](first-slice.md)

Frontend owns `apps/game/`, `packages/presentation/` and this directory. Shared contracts, rules, root manifests, the lockfile, CI and the workspace guard belong to Codex Integration and are changed only through the requests below.

## For Codex Integration

| Document | What it asks |
| --- | --- |
| [contract-review.md](contract-review.md) | Frontend's review of the bootstrap contracts: seven items to answer before connected work, and eleven more. Reviewed with required changes; not an adoption approval |
| [contract-re-review.md](contract-re-review.md) | Frontend's reading of the backend's response: the command guarantees accepted and now relied on, four follow-up requests, and a first read of draft protocol 2 for the command flow |
| [integration-requests.md](integration-requests.md) | Wire the Frontend checks into `verify` now; then the typecheck, guard and dependency changes that React, R3F, GSAP, browser tests and a backend transport need, with exact versions |

## Connected work (protocol 2)

The first Firebase-connected prototype is built on its own branch, `agent/frontend-connected-v1`, from the integration candidate ([#26](https://github.com/Amirkianfar66/GameN/pull/26)) and the browser dependency proposal ([#28](https://github.com/Amirkianfar66/GameN/pull/28)). It starts with [protocol2-adoption-assessment.md](protocol2-adoption-assessment.md): what Frontend will consume from wire protocol 2 as it stands, its position on the proposed refinements, eight gaps that need an answer, and its review of the dependency proposal. **The fixture acceptance of the slices below is protocol 1 and does not carry over.**

## Slices

Each stage is labeled as the brief requires: **proposed**, **fixture-tested**, **integrated** or **measured**. Nothing is integrated or measured yet.

| Slice | Stage | Notes |
| --- | --- | --- |
| 1. Player and table shells, snapshot and transport adapter | **Fixture-tested** | [slice-1-shells.md](slice-1-shells.md), [verification.md](verification.md), [evidence](evidence/slice-1/README.md) |
| 2. Shot target and confirm flow in semantic DOM; receipt, unknown-result and retry handling | **Fixture-tested** | [slice-2-shot-flow.md](slice-2-shot-flow.md), [verification-slice-2.md](verification-slice-2.md), [evidence](evidence/slice-2/README.md). Depends on slice 1 |
| 3. Event director and comic motion gallery | Not started | Director core needs nothing; timelines need the GSAP decision |
| 4. React shells and a production bundle | Blocked | Needs REQ-2, REQ-3 and dependency stage A |
| 5. R3F/Three.js board evaluation with device evidence | Blocked | Needs dependency stage B and named devices |
| 6. Connected command, deadline and reconnect behavior | Blocked | Needs REQ-7 and the backend's emulator branch as a base. The contract questions are answered |

## Run it

```sh
npm ci
npm run verify
npm run test --workspace @mothership/presentation
npm run test --workspace @mothership/game
npm run check:exclusion --workspace @mothership/game
npm run dev:fixture --workspace @mothership/game   # then open http://127.0.0.1:4310/
```

Each slice is a separate pull request, and a later one is stacked on the one before it. Slice 2's request targets slice 1's branch.

The development harness is described in [`apps/game/dev/README.md`](../../apps/game/dev/README.md). It shows synthetic fixture data only and is not emulator integration.
