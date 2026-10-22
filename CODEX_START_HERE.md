# Continue Mothership with Codex Astra and Claude

Imported on 26 September 2026 into **[Amirkianfar66/GameN](https://github.com/Amirkianfar66/GameN)** on `main`. `Amirkianfar66/planet-a` is not this project's destination.

This repository carries the project context into Codex Astra and Claude Code tasks. See [the agreed four-agent roster](docs/agent-roster.md). It does not depend on access to the previous conversation. The four roles are new tasks launched with these files; no running agent session is embedded in this archive.

**Current owner priority, confirmed 6 October 2026:** complete in-person play is V1; full remote online play is V2. Read [docs/version-roadmap.md](docs/version-roadmap.md). The Officer/Protection work in issues #2–#5 is the first V1 checkpoint, followed by complete-game and in-person release-readiness work.

## 1. Connect this repository

1. The source import is already on `main` in `Amirkianfar66/GameN`. Do not create another repository, re-import the archive or run `git init` again in an existing checkout.
2. Open [Codex cloud](https://chatgpt.com/codex), connect GitHub and include `Amirkianfar66/GameN` in the allowed repository selection.
3. Create/select an environment for this repository and use its `main` branch. Select **Astra** in the actual model control; naming a model in a prompt does not switch it. If Astra is unavailable, report that before substituting. Initial context reading and emulator-first development do not require production Firebase credentials. The bootstrap task below establishes reproducible dependency setup.
   The bootstrap workspace now pins Node `22.21.1` and npm `10.9.4`. Use the setup/maintenance commands in [docs/development.md](docs/development.md), including `npm ci`, and allow `registry.npmjs.org` for dependency setup. If working from the historical pre-bootstrap source import, its root manifest did not exist yet. The workspace build is scaffolding, not a production game.
4. [Bootstrap issue #1](https://github.com/Amirkianfar66/GameN/issues/1) is complete and [PR #7](https://github.com/Amirkianfar66/GameN/pull/7) is merged. Use the recorded `BASE_SHA` below for later work. Backend runs in Codex Astra and the other three roles run in separate Claude Code sessions; none has started. Their work packages are in [GitHub Issues](https://github.com/Amirkianfar66/GameN/issues).

Record the actual base commit in every task report. The imported source is a Canvas/facilitator reference plus production specifications; it is not a completed Firebase game.

Published queue: [bootstrap and four workstream issues](github/work-items.md).

## 2. Completed bootstrap task (historical prompt)

This prompt is retained as the record of bootstrap #1. Do not rerun it.

```text
Continue Mothership from this repository. Read CODEX_START_HERE.md,
AGENTS.md, docs/agent-roster.md, docs/project-context.md, docs/decisions.md, and
docs/architecture/rendering-direction.md before editing.

Act as the Backend and Integration owner. Implement only bootstrap issue #1 on
chore/mothership-bootstrap:

1. Inspect the imported files and report the actual repository and base SHA.
   Preserve reference/design-canvas as a historical source snapshot.
2. Establish a TypeScript workspace for apps/game, services/game-api,
   packages/engine, packages/contracts, packages/presentation,
   packages/design-tokens, infra/firebase, and tools/balance.
   Pin the actual toolchain and dependency versions in manifests/lockfiles.
   Exclude reference/design-canvas from the new workspace and CI globs.
3. Define the smallest versioned command/receipt/public-view/private-view
   contract for the nine-seat Officer/Protection integration fixture.
   Read all four role briefs and the backend/frontend specifications.
   Treat pending gameplay and disclosure choices as explicit blockers,
   not invented rules. Fixture assumptions must be labeled test-only.
4. Add reproducible install, typecheck, targeted test and build commands,
   a minimal CI workflow, and documented Codex setup/maintenance commands.
   Keep the pure engine independent of Firebase and rendering.
5. Create docs/integration-baseline.md with the shared contract, ownership,
   source references, pending decisions and four concrete follow-up tasks.
   Include separate launch instructions for Codex Astra Backend and Claude
   Frontend, Visual/Motion Designer, and Game Design/Balance. Have the PR
   handoff identify the reviewed baseline after merge; never invent its SHA.

Keep new code, UI and documentation in English. Firebase is the chosen
backend direction; evaluate React Three Fiber/Three.js for the board,
with readable controls in React DOM. The Canvas uses a different stack.
Read docs/design/motion-direction.md and preserve the requested comic motion
language when planning the presentation contract and follow-up tasks.
Do not provision or deploy production services for this bootstrap.
Do not change game canon or claim unexecuted checks passed.

Run the checks relevant to your changes, report the actual results and
prepare a reviewable diff/PR. Stop at the completed bootstrap; the four
role tasks will start from its reviewed committed baseline.
```

`chore/mothership-bootstrap` is the intended branch name. If the Codex surface creates its own branch, record the actual branch; branch naming is not a dependency for producing the work.

The resulting bootstrap contract, ownership and adoption gates are in [docs/integration-baseline.md](docs/integration-baseline.md). The actual reviewed merge commit is **`BASE_SHA=333c9e820f362a211352bc689372663f29b73ac4`**. [Recorded verification](docs/bootstrap-verification.md) includes the completed review, GitHub merged-state readback, commit ancestry and passing CI. This documentation update does not redefine the baseline.

## 3. Launch four role tasks from one baseline

When the game owner launches the next tasks, use `333c9e820f362a211352bc689372663f29b73ac4` for each. Run Backend in Codex Astra. Run Frontend, Designer, and Game Balance in three independent Claude Code sessions. Each cloud task gets its own checkout; local sessions use separate Git worktrees. Do not have four tasks mutate the same working directory or root lockfile. Claude sessions read `CLAUDE.md`; all sessions follow `AGENTS.md` and `docs/agent-roster.md`.

Use the prompt for each role below. Replace `BASE_SHA` with the reviewed bootstrap commit. Prefer one reviewable PR per concrete deliverable. Root tooling and shared contracts remain the integration owner's responsibility.

The existing bootstrap worktrees predate `docs/version-roadmap.md`. Read the current owner decision in [issue #9](https://github.com/Amirkianfar66/GameN/issues/9) when that file is absent. Bring in documentation updates through the reviewed integration handoff; do not reset a worktree or substitute a new `BASE_SHA` merely to read the release priority.

### Backend — Codex Astra

```text
Act as Mothership Backend and Integration. Start from BASE_SHA.
Build toward complete in-person V1; full remote online play is V2. This issue
delivers only the first V1 checkpoint. Read docs/version-roadmap.md; if absent
at this bootstrap commit, read https://github.com/Amirkianfar66/GameN/issues/9.
Read AGENTS.md,
docs/agent-roster.md,
docs/integration-baseline.md, agents/backend.md and docs/backend/first-slice.md.
Implement the first server-authoritative Officer/Protection slice within
your owned paths on agent/backend-foundation. Use the approved contracts,
pure engine and Firebase emulators. Keep unresolved semantics isolated;
continue independent work. Report tests actually run, blockers and a
reviewable diff/PR. As integration owner, coordinate shared contract changes
with the affected Claude workstreams and obtain review before adoption.
```

### Frontend — Claude Code

```text
Act as Mothership Frontend in Claude Code. Start from BASE_SHA.
Build toward complete in-person V1; full remote online play is V2. This issue
delivers only the first V1 checkpoint. Read docs/version-roadmap.md; if absent
at this bootstrap commit, read https://github.com/Amirkianfar66/GameN/issues/9.
Read CLAUDE.md,
AGENTS.md, docs/agent-roster.md,
docs/integration-baseline.md, agents/frontend.md, docs/frontend/first-slice.md
and docs/architecture/rendering-direction.md. Build the English player/table
slice on agent/frontend-tabletop using the approved contracts and labeled
fixtures. Evaluate the R3F/Three.js board with readable React DOM controls.
Read docs/design/motion-direction.md; include its fixture motion gallery,
event-driven cues, reduced-motion variants and disclosure constraints.
Keep mock and emulator modes explicit. Report actual checks and measurements;
mark unavailable real-device measurements not run. Prepare a reviewable diff/PR.
```

### Visual and Motion Designer — Claude Code

```text
Act as Mothership Visual and Motion Designer in Claude Code. Start from BASE_SHA.
Build toward complete in-person V1; full remote online play is V2. This issue
delivers only the first V1 checkpoint. Read docs/version-roadmap.md; if absent
at this bootstrap commit, read https://github.com/Amirkianfar66/GameN/issues/9.
Read CLAUDE.md, AGENTS.md, docs/agent-roster.md,
docs/integration-baseline.md, agents/designer.md and docs/design/art-direction.md.
Deliver the first comic card/board visual system and interaction states on
agent/designer-art-direction, within your owned paths. Provide versioned
tokens, source assets and an integration handoff for Frontend. Read
docs/design/motion-direction.md and deliver its comic motion storyboards,
assets and normal/reduced-motion variants for the Frontend gallery. Keep private
information out of public tokens, effects and previews. Visual design does
not approve gameplay rules. Report actual deliverables and a reviewable diff/PR.
```

### Game Design and Balance — Claude Code

```text
Act as Mothership Game Design and Balance in Claude Code. Start from BASE_SHA.
Build toward complete in-person V1; full remote online play is V2. This issue
delivers only the first V1 checkpoint. Read docs/version-roadmap.md; if absent
at this bootstrap commit, read https://github.com/Amirkianfar66/GameN/issues/9.
Read CLAUDE.md, AGENTS.md, docs/agent-roster.md,
docs/integration-baseline.md, agents/game-balance.md, docs/balance/rules-audit.md
and docs/balance/scenario-matrix.json. Implement the first evidence-backed
scenario/playtest baseline on agent/game-balance-baseline. Cover 7, 8 and 9
players separately, with optional powers off. Preserve blocked expectations,
source hashes and canon; do not invent win rates or treat heuristic bots as
proof of social balance. Report actual runs, uncertainty and a reviewable diff/PR.
```

## 4. What has already been built

| Area | Included state |
| --- | --- |
| Design Canvas | Existing React/TypeScript/Vinext/React Flow source snapshot; Cloudflare D1 persistence adapter |
| Facilitator prototype | Existing `/playtest` source within the Canvas snapshot |
| Physical board | Printable SVG at `reference/design-canvas/public/mothership-location-board-v1.svg` |
| Rules | Historical v2.1 PDF/JSON plus later decision overlays and unresolved-rule register |
| Production game | Architecture and first-slice specifications; no production Firebase game implementation |
| Four roles | Codex Astra Backend/Integration and three Claude roles, shared instructions, published issues and launch prompts |
| Balance | 35 declarative scenarios: 25 ready for implementation, 10 blocked; none executed |

The live Canvas database is **not included**. The source seed and overlays are included. A database read returned a truncated payload; a direct read returned HTTP 403. To retain any additional manual node edits/positions, use **Export JSON** in the existing Canvas and provide that separate design-state file for review. A Canvas export can include drafts and archived choices; it does not automatically supersede confirmed rules. See [reference/README.md](reference/README.md).

## Official setup references

Checked on 26 September 2026. These explain the product workflow; the Mothership prompts above are project-specific recommendations.

- [Codex cloud setup](https://learn.chatgpt.com/docs/cloud): connect the repository, create an environment, start a task, review its diff or PR.
- [Cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environment): checkout, setup/maintenance and task execution. Dependency installation belongs in reproducible setup; default agent networking can be restricted.
- [Git worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees): local checkout isolation for concurrent work.
- [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md): repository instructions for future Codex tasks.
- [Codex models](https://learn.chatgpt.com/docs/models): select the actual model for the session.
- [Claude Code parallel sessions](https://support.claude.com/en/articles/14554000-claude-code-power-user-tips) and [project instructions](https://code.claude.com/docs/en/memory): isolated work and shared project guidance.
