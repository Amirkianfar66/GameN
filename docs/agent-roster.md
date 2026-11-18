# Agreed development team

## Current allocation

On 18 November 2026 the owner transferred the pre-game to Codex end to end, including its canonical components, their game connections and the films. Backend, Integration and Frontend also run in Codex. Claude Code runs the Designer team below and the separate Game Design and Balance workstream. [Owner decision and handover, issue #311](https://github.com/Amirkianfar66/GameN/issues/311)

| Pre-game responsibility | Implementation owner and handoff |
| --- | --- |
| Screens and global interface | Codex continues the main menu, Host setup and lobby, Join and waiting, Recover, character selection, private role stage and shared role card, Boarding, Display Settings and Host controls. Settings and Host controls belong here wherever they open. |
| Game connection | Codex continues Release 4 in [#308](https://github.com/Amirkianfar66/GameN/pull/308), including the Round 1 stamp's mount. The in-game Card sheet consumes the pre-game role card. The shell and stamp artwork come from Designer. Frontend reviews session data, commands, navigation, recovery and accessibility. Backend supplies permissions and timing. Integration owns source admission and compatibility. |
| Films | Codex owns the brand intro, all nine private role films and crew boarding, including their sources and playback. The released films draw SVG frames. The boarding canvas pilot sets the direction for the next films. The brand follow-up is parked, and the Doctor mixed-media study awaits the owner's choices. Draw each private role film on its player's phone. Use shared or uniformly loaded assets so a download cannot identify the dealt role. [Film handoff](https://github.com/Amirkianfar66/GameN/issues/311#issuecomment-6978411308) · [Canvas pilot](https://github.com/Amirkianfar66/GameN/pull/285) · [Brand follow-up](https://github.com/Amirkianfar66/GameN/pull/305) |

| Claude Designer responsibility | Owned work |
| --- | --- |
| Lead Designer | Briefs, look decisions, the owner's record and visual reviews. Any proposed change to a released character, room or style goes to the Lead first. The owner approves the look. |
| Bars & Icons | Top and bottom bars, the shared kit and shell, their game connection, toasts, banners and every icon. |
| Rooms | Room artwork, the canonical room scene and its assigned game connection. |
| In-game animation | Crew acting during the match, lighting and shadows, and the eating visit. |
| Gameplay UI | In-game components including panels, Promises, Windows, office decisions and the Captain console. |

Codex builds from the approved phone pack and uses the characters, rooms and style exactly as Designer releases them. Keep shared kit, shell, icons, tokens, `component-check.mjs`, frozen prototypes, `design/releases/**` and `design/tools/lib/reviewed-drawing-ports.json` with their existing owners. Limit shared host-file edits to the blocks named in the handover. Follow the entry stack's merge-commit order in #311 and preserve its branch history.

Each pre-game screen PR needs the Lead Designer's visual acceptance in the PR before merge. The existing phone gate covers the integrated screen at 390 × 844 and 430 × 932 under production headers. The component's preview and playable consumer share its runtime-safe source. [Phone merge gate](../AGENTS.md#phone-interface-specification-and-merge-gate) · [Single-source workflow](architecture/visual-component-ownership.md)

The launch plan below is retained as historical evidence. Its bootstrap status, initial runner allocation and proposed handoff no longer describe current delivery. Read the current PR and pinned task baseline rather than restarting these assignments.

## Original allocation — 26 September 2026

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
