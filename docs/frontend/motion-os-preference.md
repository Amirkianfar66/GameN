# OS reduction after an explicit full-motion choice

Bounded follow-up for issue #87 and existing draft [PR #92](https://github.com/Amirkianfar66/GameN/pull/92), starting at `8e213d7dae2b44b58d227ae4e0f014e8a85b50da` on local branch `codex/frontend-board-recovery`, worktree `/Users/amirkianfar/.codex/worktrees/fc13/GameN`.

## Finding and correction

The earlier cancellation fix runs in the motion director's `after()`. If the player explicitly chooses full motion, an OS preference change leaves the screen's effective model unchanged, so the screen emits no frame and `after()` is not called. The native flight, trail and reflow therefore keep running. The earlier 77-record capture followed the device setting or forced unchanged-fact redraws; it did not cover this explicit override. Its broader immediate-cancellation claim was incomplete.

The director now owns one `MediaQueryList` and a change listener. When OS reduction becomes active, the listener calls the existing owned-effect cleanup directly, without a frame, public snapshot or model change. `after()` still treats either preference as reduced. Turning OS reduction off queues/replays nothing and retains the previous public facts; a later public move still works. Disposal removes this listener, clears owned effects and makes the director inert, idempotently.

The only production file changed is `apps/game/hosted/comic-motion.mjs`. Command handling, views, gameplay, privacy, shared contracts, dependencies, Designer content and cloud state are unchanged. Protocol 2; `full-game-1.1.0` / `in-person-v1-pass-2026-10-08`; legacy `full-game-1.0.1` / `in-person-v1-2026-10-06`; assets `design-0.2.0`, tokens `0.4.0`, Original Powers off. Full rule hashes remain those in [board-recovery.md](board-recovery.md).

## Reproduction and evidence

- Before the production fix, the new no-redraw unit regression failed with all three flight effects still present; the other 9 motion tests passed. The real browser also failed at `native event settles travel without a redraw`, after confirming that its screen frame count had not changed.
- After the fix, the five focused board/controller/motion/scenario files pass **31/31**, including the new no-redraw OS event, native flight/reflow cancellation, no replay, a later move, disposal and unsubscription. No `after()` call accompanies that test's preference event.
- A bounded current-runtime browser run passes at **320×568, 390×844 and 1280×720**: **6 records, 3 measured settled views and 3 lifecycle summaries**. The real checkbox selects reduced and then explicitly full; Chromium then changes its native preference. No snapshot/redelivery is forced. Equal before/after screen-frame counts prove no frame was emitted. Native `Animation.cancel()` is observed, the authoritative Room B piece is visible, old facts do not replay, later travel works, and mounted media-query listeners drop from 2 to 0 on disposal. OS changes after disposal revive nothing.

Node 22.21.1/npm 10.9.4, macOS, headless Google Chrome 155.0.8059.39. Facts, source fingerprints, log and a selected screenshot are under [evidence/motion-os-explicit-full-2026-10-09/](evidence/motion-os-explicit-full-2026-10-09/README.md).

```sh
node --test --test-concurrency=1 \
  packages/presentation/test/board-play.test.mjs \
  apps/game/test/board-hidden-page.test.mjs \
  apps/game/test/board-recovery.test.mjs \
  apps/game/test/comic-motion.test.mjs \
  apps/game/test/board-scenarios.test.mjs

# Existing synthetic board Vite configuration on 127.0.0.1:5178:
node apps/game/dev/capture-board-recovery.mjs <output-directory> --explicit-full
```

The development-only desk exposes a screen-emission count, unsubscribed on unmount. Browser instrumentation forwards native media-query listener and animation operations unchanged. It adds no production hook or private data. The complete updated recovery capture also passed: **83 records, 72 measured steps and 11 lifecycle/reload summaries**, including all earlier stale/deadline and identifier-only receipt cases. Its [full log](evidence/motion-os-explicit-full-2026-10-09/full-recovery-log.txt) is retained. The clean-commit `npm run verify` result and exact publication SHA are recorded in PR #92; Integration must still retest its exact adopted candidate.

No physical device, deployed service or fresh emulator flow was tested for this browser-only correction. Earlier emulator evidence remains historical. Integration owns adoption into the release candidate and its exact-candidate checks. This worker does not edit the coordinator checkout, merge or deploy.
