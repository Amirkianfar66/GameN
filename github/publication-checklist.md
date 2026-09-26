# Publication and launch checklist

## Current state

- Destination: [Amirkianfar66/GameN](https://github.com/Amirkianfar66/GameN), created by the user.
- Empty repository inspected on 26 September 2026; `main` is its default branch. Visibility observed: public.
- Source import: shared context, four briefs, first work packages, source rules, historical PDF, Canvas/facilitator source, comic-motion direction and Codex guide.
- The user supplied initial-push instructions, so the initial import uses `main`; a comparison PR is not needed for this empty repository.
- Subsequent implementation work uses isolated branches and reviewable PRs.
- [Bootstrap #1 and workstream issues #2–#5](work-items.md) are published as the launch queue. Creating an issue does not start a Codex task or create a GitHub user account.
- `Amirkianfar66/planet-a` is excluded.

## Codex launch

1. Connect the new repository in Codex and select `main`.
2. Run the bootstrap task from `CODEX_START_HERE.md`.
3. Review and commit its tooling/contracts baseline.
4. Start the four role tasks from that same commit in separate cloud tasks or local worktrees.
5. Integrate shared contracts first; rebase dependent work after changes.
6. Keep unresolved canon decisions blocked and record actual validation results.
7. Configure intended merge checks when the bootstrap provides executable checks. No branch protection or deploy pipeline has been configured merely by importing these documents.

## Branch map

| Role | Branch | First proposed issue |
| --- | --- | --- |
| Backend | `agent/backend-foundation` | Server-authoritative match slice and command contract |
| Frontend | `agent/frontend-tabletop` | Player UI and Three.js board evaluation slice |
| Designer | `agent/designer-art-direction` | Comic visual system and interaction handoff |
| Game Balance | `agent/game-balance-baseline` | Canon audit and comparative 7/8/9 test baseline |

## Dependency agreement

- Backend drafts command/projection types; Frontend and Game Balance review them before the integration owner merges shared contracts.
- Designer owns token definitions and visual assets; Frontend owns their runtime consumption.
- Game Balance owns evidence, scenario expectations and proposed rule changes; Backend owns the authoritative implementation.
- Performance values are measured on named devices. No implementation PR may convert a target into an achieved result without evidence.
- Contradictory source rules become an explicit decision record. A blocked case must stay blocked in the acceptance matrix until the game owner resolves it.
