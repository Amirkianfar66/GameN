# Planet motion review follow-up

This Frontend correction follows `64a94536d0b0db9ff18c9c12c849c7ee273ebb3e` and Integration's supplied review of Designer PR #174 at `db49cea2cbafa0c11743555ff9111d93a0827e91`. It uses the already reviewed runtime drawing ports. No PR #174 artwork, video, fullscreen treatment or timing proposal is adopted by this change.

## Corrected live behavior

**Sync:** the cue now stays inside the existing status header. It does not cover the board, names, room labels, player targets or controls. The authoritative Jail vote begins immediately with its existing full 60-second deadline. Ballots can be selected and submitted while the cue is visible. Cancel and the selection count replace the bottom navigation during on-board selection, with complete 44px controls.

The proposed separate six-second post-Sync presentation stage remains pending owner approval. No phase, duration, contract, ruleset or engine change implements that proposal here. The shared-display cue also remains in the header, without a fullscreen takeover.

**Capsule:** the reviewed board-only return remains the ordinary exit. A current Sync/outcome or terminal result settles optional return motion immediately so the next authoritative phase has priority. The full talk deadline remains supplied by the server. No fullscreen exit is introduced.

**Rescue:** successful healing now uses a Planet-only machinery vignette: the existing drone, monitor, lamp, scan and pulse at the validated clinical anchor. The healthy current token, its nameplate and its action target stay visible at the snapshot's A/B or Jail slot throughout the effect. The new painter never hides, copies or relocates a participant. It does not assign a destination or mark the current token away.

The director and painter use `fourFilmBerth`, validated clinical anchors, the four-bed limit and current occupancy. HV5+ and reused beds retain words-only/no-film behavior. A subsequent bed reuse cancels the optional machinery. Historical protocol-2 drawing behavior and every existing Designer/drawing-port byte are unchanged.

The reported black ward in the PR #174 MP4 still needs the Designer's corrective export; this change does not repair or adopt that video. The native ward remains present under this separate runtime effect, including checks at 3.1 and 3.3 seconds.

## Other review constraints

- Reconnect without a prior live snapshot still snaps to the current state; no historical movie is replayed.
- Current navigation remains office-private text. No route animation or retained cross-seat office history is introduced.
- Promise results remain the server's statuses at their actual opportunities. Only meeting terms refer to voting start after Sync; other Promise types are not locally evaluated there.
- Existing window drawings remain static on initial view, opening and reconnect. No decorative drawing stamp is introduced.

## Verification

All 810 Frontend tests pass: 208 presentation and 602 game, including 69 Planet tests. All 15 successor contract tests pass. Build, both typecheck programs, workspace/source checks, production build and production-bundle exclusion pass. The original 100-case/12-flow phone run was refreshed with the corrected treatments; it retains 46 selected screenshots and zero runtime errors/page overflow.

An additional [focused safety run](evidence/planet-pr174-safety/facts.json) passes 16 checks with 16 screenshots across 320×568 and 390×844, normal and reduced motion. It verifies immediately usable Jail-vote targets during Sync, an unobstructed shared-display checkpoint, free and detained Rescue destinations, unchanged current target/nameplate geometry, visible healthy figures, no patient copy, a present ward at 3.1/3.3 seconds and cancellation when the clinical bed is reused. Rescued current tokens are tapped through the real browser input path.

Reproduce after the normal workspace build:

```sh
./node_modules/.bin/vite build --config apps/game/dev/planet/vite.config.mjs
node apps/game/dev/planet/capture-review-safety.mjs
node apps/game/dev/planet/capture.mjs docs/frontend/evidence/planet-successor
```

This is synthetic desktop Chromium phone emulation. Hosted/Firebase multiplayer, physical phones and assistive-technology acceptance remain unrun in this worktree. Integration's release/adoption gate and the Designer's corrective handoff remain pending. Nothing was merged or deployed by this follow-up.
