# Frontend workstream

Issue [#3](https://github.com/Amirkianfar66/GameN/issues/3) · brief [agents/frontend.md](../../agents/frontend.md) · specification [first-slice.md](first-slice.md)

Frontend owns `apps/game/`, `packages/presentation/` and this directory. Shared contracts, rules, root manifests, the lockfile, CI and the workspace guard belong to Codex Integration and are changed only through the requests below.

## For Codex Integration

| Document | What it asks |
| --- | --- |
| [contract-review.md](contract-review.md) | Frontend's review of the bootstrap contracts: seven items to answer before connected work, and eleven more. Reviewed with required changes; not an adoption approval |
| [integration-requests.md](integration-requests.md) | Wire the Frontend checks into `verify` now; then the typecheck, guard and dependency changes that React, R3F, GSAP and browser tests need, with exact versions |

## Slices

Each stage is labeled as the brief requires: **proposed**, **fixture-tested**, **integrated** or **measured**. Nothing is integrated or measured yet.

| Slice | Stage | Notes |
| --- | --- | --- |
| 1. Player and table shells, snapshot and transport adapter | **Fixture-tested** | [slice-1-shells.md](slice-1-shells.md), [verification.md](verification.md), [evidence](evidence/slice-1/README.md) |
| 2. Shot target and confirm flow in semantic DOM; receipt, unknown-result and retry handling | Not started | Can start on the current dependency set, against the scripted fixture |
| 3. Event director and comic motion gallery | Not started | Director core needs nothing; timelines need the GSAP decision |
| 4. React shells and a production bundle | Blocked | Needs REQ-2, REQ-3 and dependency stage A |
| 5. R3F/Three.js board evaluation with device evidence | Blocked | Needs dependency stage B and named devices |
| 6. Connected command, deadline and reconnect behavior | Blocked | Needs Backend #2's emulator and answers to FE-C01 to FE-C07 |

## Run it

```sh
npm ci
npm run verify
npm run test --workspace @mothership/presentation
npm run test --workspace @mothership/game
npm run check:exclusion --workspace @mothership/game
npm run dev:fixture --workspace @mothership/game   # then open http://127.0.0.1:4310/
```

The development harness is described in [`apps/game/dev/README.md`](../../apps/game/dev/README.md). It shows synthetic fixture data only and is not emulator integration.
