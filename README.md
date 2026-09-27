# Mothership · GameN

**Imported:** 26 September 2026. This is the Mothership source and context handoff in [Amirkianfar66/GameN](https://github.com/Amirkianfar66/GameN). Development continues with Codex Astra and three Claude Code sessions. The repository name is GameN; the game remains Mothership. `Amirkianfar66/planet-a` is excluded.

Start with [CODEX_START_HERE.md](CODEX_START_HERE.md). [Bootstrap issue #1](https://github.com/Amirkianfar66/GameN/issues/1) is complete: [PR #7](https://github.com/Amirkianfar66/GameN/pull/7) was reviewed and merged, and the shared `BASE_SHA` is **`333c9e820f362a211352bc689372663f29b73ac4`**. Use that commit when launching Backend in Codex Astra and Frontend, Visual/Motion Designer and Game Design/Balance in three Claude Code sessions. These four workstreams have not started. See [the agreed roster](docs/agent-roster.md).

## Bootstrap workspace

The eight-package TypeScript workspace, draft runtime schemas and synthetic Officer/Protection fixtures are merged. Affected-role contract adoption review remains open. Use Node `22.21.1` and npm `10.9.4`:

```sh
npm ci
npm run verify
```

See [setup and maintenance commands](docs/development.md), [shared contracts and four launch handoffs](docs/integration-baseline.md), and [actual verification results](docs/bootstrap-verification.md). The build emits package code/declarations. Gameplay, Firebase services, React/Three.js rendering and runtime comic motion remain separate work in issues #2–#5; their implementation is not included here.

## Included

| Material | Location |
| --- | --- |
| Codex/Claude setup and five launch prompts | [CODEX_START_HERE.md](CODEX_START_HERE.md) |
| Shared instructions and ownership | [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), [agent roster](docs/agent-roster.md) |
| Context and decisions | [Project context](docs/project-context.md), [decision register](docs/decisions.md) |
| Existing Canvas and facilitator source | [Reference guide](reference/README.md), `reference/design-canvas/` |
| Rule sources and overlays | `rules/`, [source manifest](rules/source-manifest.json) |
| Production architecture and renderer evaluation | [Architecture](docs/architecture/production-v1.0.md), [rendering direction](docs/architecture/rendering-direction.md) |
| Comic motion proposal and implementation handoff | [Motion direction](docs/design/motion-direction.md) |
| Four role briefs | `agents/` |
| Work specifications | `docs/backend/`, `docs/frontend/`, `docs/design/`, `docs/balance/` |
| Published task queue and PR/issue templates | [Work items](github/work-items.md), `.github/` |
| Transfer file hashes | [transfer-manifest.json](transfer-manifest.json) |

## Workstreams

| Role | Runner | Launch brief | GitHub task | Intended branch |
| --- | --- | --- | --- | --- |
| Backend and Integration | Codex Astra | [Backend](agents/backend.md) | [#2](https://github.com/Amirkianfar66/GameN/issues/2) | `agent/backend-foundation` |
| Frontend | Claude Code | [Frontend](agents/frontend.md) | [#3](https://github.com/Amirkianfar66/GameN/issues/3) | `agent/frontend-tabletop` |
| Visual and Motion Designer | Claude Code | [Designer](agents/designer.md) | [#4](https://github.com/Amirkianfar66/GameN/issues/4) | `agent/designer-art-direction` |
| Game Design and Balance | Claude Code | [Game Balance](agents/game-balance.md) | [#5](https://github.com/Amirkianfar66/GameN/issues/5) | `agent/game-balance-baseline` |

Codex Astra, in its Backend and Integration role, owns root tooling, shared contracts and integration. This is a coordination responsibility rather than an additional requested workstream. The game owner approves canon; agents propose and test changes. All new game strings, code, documentation and GitHub work items use English; historical source artifacts remain intact.

## First milestone and current limits

The first integrated slice uses two real phones plus a table display with a **complete seeded nine-seat fixture**, exercising Officer/Protection, registration, a deadline, retries and reconnect. This is not a two-player mode. The supported 7/8/9 configurations still require balance testing.

The Canvas/facilitator source exists. The Firebase production game, renderer benchmark and scenario execution do not yet exist in this package. The live Canvas database was not exported; source seeds and rule overlays are included. See [data coverage](reference/README.md#data-coverage) before assuming manual Canvas edits are preserved.

Rule overlays can contain archives and unresolved choices. Read their status and precedence; do not merge JSON indiscriminately or use prototype defaults as canon. The later rendering direction is a Three.js/R3F evaluation, not a completed switch or benchmark.

This repository contains a source/context import on `main`. Agent work items are tracked in GitHub Issues; implementation branches start after the reviewed bootstrap baseline. No production Firebase deployment, runtime comic-motion implementation or permanent background agent is provided by this import.
