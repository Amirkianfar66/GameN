# Mothership agent collaboration

All new code, documentation, game strings and GitHub work items are in English. Preserve historical source artifacts as evidence.

Start with `CODEX_START_HERE.md`. The user selected `Amirkianfar66/GameN` for Mothership and will continue with Codex Astra and three Claude Code sessions. `Amirkianfar66/planet-a` is excluded. Use this repository and the actual committed baseline. The destination is settled; do not ask the user to select or create a repository again.

Read `docs/project-context.md`, `docs/architecture/rendering-direction.md`, and your role brief in `agents/` before implementation. Read the applicable rule sources rather than relying on a historical summary.

## Source precedence

1. Latest explicit game-owner decisions recorded in the repository.
2. Confirmed current overlays in `rules/overlays/`.
3. `rules/sources/v2.1-decisions.json` for behavior not superseded by overlays.
4. Architecture recommendations and prototype defaults, which are not game rules.

Do not blindly merge the source JSON files. Superseded mechanics remain present for history, and a layout proposal may contain provisional behavior. A conflict or missing rule belongs in the decision register with evidence.

## Four workstreams

The agreed runner allocation is recorded in [docs/agent-roster.md](docs/agent-roster.md). Codex Astra handles Backend and Integration; Claude handles Frontend, Visual and Motion Design, and Game Design and Balance in three independent sessions. Claude starts with `CLAUDE.md`, which imports this shared instruction file.

| Agent | Runner | Proposed implementation ownership | First branch |
| --- | --- | --- | --- |
| Backend and Integration | Codex Astra | `services/game-api/`, `packages/engine/`, `infra/firebase/`, `docs/backend/` | `agent/backend-foundation` |
| Frontend | Claude Code | `apps/game/`, `packages/presentation/`, `docs/frontend/` | `agent/frontend-tabletop` |
| Visual and Motion Designer | Claude Code | `design/`, `packages/design-tokens/`, `docs/design/` | `agent/designer-art-direction` |
| Game Design and Balance | Claude Code | `tools/balance/`, `tests/scenarios/`, `docs/balance/` | `agent/game-balance-baseline` |

Shared files (`packages/contracts/`, canonical rule definitions, root manifests/lockfiles, CI and architecture decisions) are owned by Codex Astra in its integration role. Shared contracts still require review by affected roles. Propose cross-boundary changes explicitly and integrate them through a focused PR; do not let several agents rewrite the same files concurrently.

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

## Phone interface specification and merge gate

The owner's **11 November 2026** decision in [docs/design/owner-decisions.md](docs/design/owner-decisions.md#11-november-2026-the-build-follows-the-pack) makes the phone design pack the specification, not an optional reference. Follow [the sheets](design/phone-ui/review/sheets/), [phone-ui.md](docs/design/phone-ui.md), and [the handoff](docs/design/phone-ui-handoff.md) for layout, controls, words and behavior. [Issue #222](https://github.com/Amirkianfar66/GameN/issues/222) is the prioritized native-interface fix list. Different fixture names, player counts and device data do not require pixel-identical screenshots.

**Integration must not merge a PR that changes the phone interface without Designer's explicit visual approval in that PR.** This includes phone layout, controls, wording, interaction states, motion and adopted artwork, whether the change is in Frontend or a shared dependency. CI passing, owner approval of the source artwork, an old review, or Integration's technical review does not substitute for Designer's review of the implemented interface.

Before merge:

1. List the affected part IDs from `node design/tools/phone-ui-native-compare.mjs --list`, and the corresponding sheet/state. Use [the comparison tool](docs/design/phone-ui-native-compare.md) from PR #223 to put the pack beside the PR's native build. Include `compare.json` and harness provenance identifying the design, candidate and artwork commits. The candidate must represent the PR being merged; disclose dirty or mismatched inputs rather than calling them approval evidence.
2. Attach the changed states at **390 × 844**, plus **320 × 568 at 200% text** wherever text is involved. Supply an explicitly identified, reproducible supplemental comparison for a state or size the tool cannot yet capture. A missing state, capture error, historical `same`/`close` finding, or a tool run alone is not visual acceptance. Include motion evidence and reduced-motion states when motion changes.
3. Obtain a PR comment or review from the Visual and Motion Designer that explicitly accepts the affected parts and identifies the reviewed candidate commit and comparison evidence. If later changes affect those parts or their rendered dependencies, refresh the evidence and obtain renewed approval. For unrelated later edits, Integration records why the approved rendered inputs remain unchanged.
4. A departure from a sheet needs **both Designer's agreement and the owner's explicit approval before implementation**. Record the exact sheet/state, proposed departure, reason, both approval references, scope and date in [docs/design/owner-decisions.md](docs/design/owner-decisions.md). A rule, privacy, contract, accessibility or platform conflict is raised with Designer in #222; it is not permission to silently substitute another interface or alter gameplay. Existing authoritative rules and disclosure limits remain in force until an owner-approved specification change resolves the conflict.
5. Integration verifies the approval and any exception record, then the existing required checks and technical review. Source-only design proposals, review tooling and documentation that do not change the playable phone interface may be marked not applicable with a concrete explanation; their merge does not approve or activate a native interface.

The PR template records this gate. It is a required human merge review, not a claim that CI or GitHub branch protection can identify the Designer's agent role. Do not infer a Designer approval from a GitHub username shared by several agents.

The already-approved T1–T3 are not open questions: fill the room between the bars and zoom out only enough for the visible crowd, freezing framing and targets from lights-out to lights-on; keep Cancel in the targeting bar; show all of the viewer's role-action tiles, enable only server offers, and use the server's unavailable reason or **Not available now**. Never derive an unavailable reason from gameplay rules on the phone. T1 supersedes #208's geometry-only framing.

## Current delivery status

The source/context transfer is imported into `Amirkianfar66/GameN` on `main`. GitHub Issues track the bootstrap and four implementation workstreams. The bootstrap adds the eight workspace shells and draft shared contracts; it does not implement the production game or create background agents. Its contract and review/merge gate are in `docs/integration-baseline.md`. The existing Canvas/facilitator source remains under `reference/design-canvas/`.

Preserve `reference/design-canvas/` as a source snapshot. Keep its platform-specific code, dependencies and configuration outside the new workspace and CI globs. It is not the production Firebase runtime. The live Canvas database is not included; see `reference/README.md`.

Run bootstrap #1 once in Codex Astra before the four implementation tasks. After review and merge, record the actual resulting baseline commit, then run Backend #2 in Codex Astra and #3/#4/#5 in separate Claude Code sessions from it. Shared files are changed by the integration owner. Reuse completed work and do not ask the user to choose the destination type again.

## Workspace checks established by bootstrap #1

Use Node `22.21.1` and npm `10.9.4` at the repository root. Run `npm ci`, `npm run typecheck`, `npm run test:contracts`, and `npm run build`; `npm run verify` combines toolchain, workspace/source integrity, typecheck, build and all bootstrap tests. `npm run clean` removes only generated workspace outputs. Actual results and limits are in `docs/bootstrap-verification.md`; setup/maintenance instructions are in `docs/development.md`.

The root build produces package JavaScript/declarations, not a playable game or deployed backend. Keep all production tool globs on the explicit workspace list. Reference integrity checks may read Canvas bytes without installing/running its historical stack. `@mothership/contracts/fixtures` is test/development-only, excluded from the normal package export and runtime import allowlist. Any future development harness must verify fixture code is absent from production bundles.
