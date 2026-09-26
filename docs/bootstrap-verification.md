# Bootstrap #1 verification

Repository: `Amirkianfar66/GameN`. Branch: `chore/mothership-bootstrap`.
Clean starting commit: `0a4ff9a772eda25ea27922a331ff406a3ffc9000`.
Date: 26 September 2026. Local environment: macOS (Darwin 25.0.0, arm64), Node `22.21.1`, npm `10.9.4`.
The requested runner is Codex Astra in its Backend/Integration role; this report does not independently attest the desktop model selector. No Claude session was launched.

## Executed checks

| Command/check | Actual result |
| --- | --- |
| Repository inspection / source import ancestry | Clean `main` base above; imported `7e28c2cd100642667fb0021be0b85fa8cade1869` is an ancestor |
| Exact npm metadata queries | TypeScript `5.9.3`, Zod `4.1.12`, `@types/node` `22.19.19` versions/integrities confirmed |
| `npm install` with a writable temporary cache | Passed; generated root lockfile, installed 12 packages including 8 workspace links; toolchain hook passed |
| `npm run check:workspace` | Passed: 8 explicit workspaces; exact direct pins; bounded build/typecheck inputs and imports |
| `npm run check:sources` | Passed: 119 unchanged Canvas files + 1 unbound example; 7 rule sources; 24 pinned source files; unchanged token proposal |
| `npm run typecheck` | Passed with no diagnostics |
| `npm run test:bootstrap` | Build passed; 15 tests passed, 0 failed, 0 skipped, 0 todo |
| `npm ci --cache /private/tmp/mothership-npm-cache --offline` | Passed from the populated cache: 12 packages reinstalled from the lockfile; toolchain hook passed |
| `npm run clean && npm run verify` | Passed after reinstall: removed all 8 workspace build outputs; integrity, typecheck, clean build and 15 tests passed |
| `npm run test:contracts` | Passed: 11 targeted tests, 0 failures/skips/todo |
| `git diff --check` | Passed |
| Diff against starting commit for Canvas, rules, motion direction and decision register | Empty; preserved source bytes unchanged |

GitHub CI results are attached to the PR checks for its exact head commit. At the time this local report was written, a GitHub-hosted run had not yet executed; see the PR evidence for its actual result rather than inferring remote success from the local run.

The initial unprivileged registry request failed with sandbox DNS `ENOTFOUND`; the subsequent permitted request/install succeeded. This was an environment limitation, not an alternate dependency version or a silently skipped install.

The tests exercise strict wire shapes, direct targeting without client authority, safe receipt/error/unknown separation, nine canonical fixture seats and provenance, audience separation of authored snapshots/events, event disclosure omissions, preserved token policy and all eight built ESM entrypoints. They do not execute a game engine transition. In particular, unchanged public fixture objects are not evidence of Firestore noninterference, and schema validation is not authentication or server authorization.

## Not run / not implemented in this bootstrap

- Engine damage, Protection consumption, deterministic gameplay replay, resource races or actor-status survival: Backend #2.
- Firebase Auth/App Check, transaction/receipt deduplication, Security Rules/cross-player denial, emulator execution, Cloud Tasks/outbox delivery/repair: Backend #2. No emulator runtime, Firebase project, secrets or deployment configured.
- Browser journeys, runtime event deduplication/reconnect, DOM accessibility, Three.js performance, memory/load budgets, actual phones/table display, reduced-motion behavior and audio: Frontend #3 with Designer #4.
- Finished assets/storyboards, actual composited contrast or visual approval: Designer #4.
- All 35 declarative balance scenarios (25 ready for implementation, 10 blocked), simulated games, human playtests and win-rate analysis: Game Design/Balance #5. None counted as passing by these bootstrap tests.
- Production/staging provisioning, deployments, load, recovery and paid service measurements: not performed.
- Affected-role contract approval, branch-protection configuration, PR merge and resulting reviewed `BASE_SHA`: pending review/merge; no future SHA invented.

Source rules, Canvas and motion direction remain intact. [integration-baseline.md](integration-baseline.md) lists every unresolved rule/disclosure decision and the four separate launch handoffs. Stop after this bootstrap PR.
