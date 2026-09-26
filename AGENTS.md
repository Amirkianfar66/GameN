# Mothership agent collaboration

All new code, documentation, game strings and GitHub work items are in English. Preserve historical source artifacts as evidence.

Start with `CODEX_START_HERE.md`. The user selected `Amirkianfar66/GameN` for Mothership and will continue in Codex. `Amirkianfar66/planet-a` is excluded. Use this repository and the actual committed baseline. The destination is settled; do not ask the user to select or create a repository again.

Read `docs/project-context.md`, `docs/architecture/rendering-direction.md`, and your role brief in `agents/` before implementation. Read the applicable rule sources rather than relying on a historical summary.

## Source precedence

1. Latest explicit game-owner decisions recorded in the repository.
2. Confirmed current overlays in `rules/overlays/`.
3. `rules/sources/v2.1-decisions.json` for behavior not superseded by overlays.
4. Architecture recommendations and prototype defaults, which are not game rules.

Do not blindly merge the source JSON files. Superseded mechanics remain present for history, and a layout proposal may contain provisional behavior. A conflict or missing rule belongs in the decision register with evidence.

## Four workstreams

| Agent | Proposed implementation ownership | First branch |
| --- | --- | --- |
| Backend | `services/game-api/`, `packages/engine/`, `infra/firebase/`, `docs/backend/` | `agent/backend-foundation` |
| Frontend | `apps/game/`, `packages/presentation/`, `docs/frontend/` | `agent/frontend-tabletop` |
| Designer | `design/`, `packages/design-tokens/`, `docs/design/` | `agent/designer-art-direction` |
| Game Balance | `tools/balance/`, `tests/scenarios/`, `docs/balance/` | `agent/game-balance-baseline` |

Shared files (`packages/contracts/`, canonical rule definitions, root manifests/lockfiles, CI and architecture decisions) have an integration owner. Propose cross-boundary changes explicitly and integrate them through a focused PR; do not let several agents rewrite the same files concurrently.

## Collaboration protocol

- Use one issue per concrete deliverable and one branch/PR per independently reviewable change.
- Use separate worktrees when agents work concurrently. Never switch a shared checkout's branch underneath another agent.
- Pin the base commit and ruleset reference in each task. Rebase after shared contract changes.
- Define a minimal command/projection contract first. Frontend and Designer can use clearly labeled fixtures while Backend builds it.
- Backend implements rules; Game Balance audits them and proposes changes. A balance hypothesis is not permission to change canon.
- Every PR states the problem, behavior changed, tests/evidence, dependencies, unresolved decisions, and rule-version impact.
- Gate merge on required checks and integration review. Protected-branch configuration is a repository setting; this file does not enforce it by itself.
- Do not deploy cloud resources, spend money, publish assets publicly, or expand repository access solely because a task brief exists. Follow the user's actual authorization.
- Never commit credentials, service-account files, session cookies, private match payloads, or production exports.
- Do not claim that screenshots, performance targets or a simulation prove multiplayer correctness or human social-deduction balance.

Agents are task roles, not GitHub user accounts. Use real GitHub assignees only when their identities are known and assignment is authorized.

## Current delivery status

The source/context transfer is imported into `Amirkianfar66/GameN` on `main`. GitHub Issues track the bootstrap and four implementation workstreams. Implementation branches, PRs and task execution start in Codex from the agreed baseline; this import does not create permanent background agents. It contains documentation, source decisions and the existing Canvas/facilitator source under `reference/design-canvas/`. Production-game paths above are proposed, not implemented.

Preserve `reference/design-canvas/` as a source snapshot. Keep its platform-specific code, dependencies and configuration outside the new workspace and CI globs. It is not the production Firebase runtime. The live Canvas database is not included; see `reference/README.md`.

Run the bootstrap task once before the four implementation tasks. Shared files are changed by the integration owner. Record actual verified install/build/test commands here when the new workspace exists; there is no root production build command to run yet. Reuse completed work and do not ask the user to choose the destination type again.
