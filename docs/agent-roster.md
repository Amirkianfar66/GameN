# Agreed development team

**Confirmed by the game owner:** 26 September 2026.
**Repository:** [Amirkianfar66/GameN](https://github.com/Amirkianfar66/GameN).
**Status:** Assignment and launch instructions; implementation has not started.

| Role | Runner/model selection | Tasks | Owned deliverables |
| --- | --- | --- | --- |
| Backend and Integration | Codex with Astra selected | [Bootstrap #1](https://github.com/Amirkianfar66/GameN/issues/1), then [Backend #2](https://github.com/Amirkianfar66/GameN/issues/2) | Authoritative engine, Firebase adapter, security, deadlines, shared contracts, root tooling and integration |
| Frontend | Dedicated Claude Code session | [#3](https://github.com/Amirkianfar66/GameN/issues/3) | Player/table UI, candidate Three.js board, accessibility, runtime motion and connection handling |
| Visual and Motion Designer | Dedicated Claude Code session | [#4](https://github.com/Amirkianfar66/GameN/issues/4) | Comic art direction, card/board assets, tokens, storyboards, motion prototypes and asset handoff |
| Game Design and Balance | Dedicated Claude Code session | [#5](https://github.com/Amirkianfar66/GameN/issues/5) | Rule audit, proposed mechanics changes, scenarios, simulations and human playtest analysis |

There are four roles. Integration is an additional responsibility of the Backend
role, not a fifth agent. Select Astra in the actual Codex model control; prompt
text alone does not change a session's model. The owner has not specified a
particular Claude model. Record the actual model used instead of inventing one.
If the requested model is unavailable, report that limitation without silently
substituting another provider. No model or session is provisioned by this document.

## Start order

1. Start only bootstrap #1 in Codex Astra. Use the prompt in
   [CODEX_START_HERE.md](../CODEX_START_HERE.md).
2. Review its PR and checks, then merge the approved baseline. Record the actual
   resulting commit as `BASE_SHA` in the integration handoff; the baseline SHA is
   not known yet.
3. Start #2 in Codex Astra and #3, #4 and #5 in three independent Claude Code
   sessions, all checked out from `BASE_SHA`. Each session uses its own branch and
   isolated working directory. For local runs, use separate Git worktrees; cloud
   tasks use separate checkouts. Do not switch branches underneath another agent.
4. Each task delivers a focused PR with actual verification. Astra coordinates
   contract changes and integration; reviewers from affected roles check their
   boundaries. The game owner decides unresolved rules and proposed rule changes.

Prepare only the bootstrap environment initially. The imported Canvas is a
historical source snapshot, not the dependency setup for the production game.
The bootstrap must establish and document install/build/test commands for later
sessions. Initial setup needs no production Firebase credentials or deployment.

## Boundaries and handoffs

- **Shared code:** Astra owns `packages/contracts/`, workspace manifests and
  lockfiles, CI, and cross-cutting architecture. Backend still obtains Frontend
  and Balance review of shared contracts; integration ownership is not permission
  to invent unresolved gameplay or disclosure behavior.
- **Designer to Frontend:** versioned tokens, source assets, dimensions/anchors,
  interaction states, timing/easing, storyboards and reduced-motion variants.
  Isolated motion prototypes belong in Designer's paths. Frontend implements and
  measures React/GSAP/Three.js runtime behavior in its paths.
- **Balance to Backend:** independently specified scenarios, source references,
  ambiguity reports and proposed rule changes. The owner approves changes before
  production implementation. Scripted simulations do not establish human social
  balance; keep 7-, 8- and 9-player evidence separate.
- **Backend to consumers:** versioned commands, receipts, authorized public/private
  views, deadline semantics and labeled fixtures. Presentation never adjudicates
  gameplay or reveals extra information.

Keep decisions in issues, PRs and repository documents. Each session has separate
context; do not rely on another agent remembering a chat. Runtime ownership and
source precedence remain in [AGENTS.md](../AGENTS.md); detailed scope remains in
the four role briefs. Writing these assignments does not create GitHub assignees,
launch agents, install cross-provider orchestration or change game rules.

## Launch references

Checked on 26 September 2026; these describe product behavior, not project scope.

- [Codex cloud](https://learn.chatgpt.com/docs/cloud)
- [Codex cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environment)
- [Codex models](https://learn.chatgpt.com/docs/models)
- [Claude Code parallel sessions](https://support.claude.com/en/articles/14554000-claude-code-power-user-tips)
- [Claude project instructions](https://code.claude.com/docs/en/memory)
