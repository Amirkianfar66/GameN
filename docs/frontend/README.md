# Frontend workstream

Issue [#3](https://github.com/Amirkianfar66/GameN/issues/3) · brief [agents/frontend.md](../../agents/frontend.md) · specification [first-slice.md](first-slice.md)

Frontend owns `apps/game/`, `packages/presentation/` and this directory. Shared contracts, rules, root manifests, the lockfile, CI and the workspace guard belong to Codex Integration and are changed only through the requests below.

## For Codex Integration

| Document | What it asks |
| --- | --- |
| [contract-review.md](contract-review.md) | Frontend's review of the bootstrap contracts: seven items to answer before connected work, and eleven more. Reviewed with required changes; not an adoption approval |
| [contract-re-review.md](contract-re-review.md) | Frontend's reading of the backend's response: the command guarantees accepted and now relied on; the event-stream proposal confirmed by building the director against it; seven follow-up requests; and a first read of draft protocol 2 for the command flow |
| [integration-requests.md](integration-requests.md) | Wire the Frontend checks into `verify` now; then the typecheck, guard and dependency changes that React, R3F, GSAP, browser tests and a backend transport need, with exact versions |

## Slices

Each stage is labeled as the brief requires: **proposed**, **fixture-tested**, **integrated** or **measured**. Nothing is integrated or measured yet.

| Slice | Stage | Notes |
| --- | --- | --- |
| 1. Player and table shells, snapshot and transport adapter | **Fixture-tested** | [slice-1-shells.md](slice-1-shells.md), [verification.md](verification.md), [evidence](evidence/slice-1/README.md) |
| 2. Shot target and confirm flow in semantic DOM; receipt, unknown-result and retry handling | **Fixture-tested** | [slice-2-shot-flow.md](slice-2-shot-flow.md), [verification-slice-2.md](verification-slice-2.md), [evidence](evidence/slice-2/README.md). Depends on slice 1 |
| 3a. Event director: which authorized events become a cue, and when | **Fixture-tested; review findings open** | [slice-3-event-director.md](slice-3-event-director.md), [verification-slice-3.md](verification-slice-3.md). Depends on slice 2. Draws nothing yet. Parked as a draft |
| 3b. Drawing the cues in the DOM, and the development-only comic motion gallery | Work in progress, parked | On `agent/frontend-motion-gallery`, stacked on 3a. Needs nothing new for CSS cues; coordinated timelines need the GSAP decision |
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

Each slice is a separate pull request, and a later one is stacked on the one before it: slice 2's request targets slice 1's branch, and slice 3a's targets slice 2's.

The development harness is described in [`apps/game/dev/README.md`](../../apps/game/dev/README.md). It shows synthetic fixture data only and is not emulator integration.
