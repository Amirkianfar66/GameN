# Board recovery and mid-flight motion follow-up

Issue [#87](https://github.com/Amirkianfar66/GameN/issues/87) · existing draft [PR #92](https://github.com/Amirkianfar66/GameN/pull/92) · 9 October 2026.

The Codex Frontend worker fixes the two reproduced consumer findings in Backend's [PR #90](https://github.com/Amirkianfar66/GameN/pull/90), reviewed at `7f921f4ee05958834532a36d37b72541237fd9e0`. It continues the actual committed Frontend head; it does not restart the implementation. Integration retains coordination, shared files, merge and release ownership.

## Baseline and rule references

| Reference | Pinned value |
| --- | --- |
| Worktree | `/Users/amirkianfar/.codex/worktrees/fc13/GameN` |
| Local worker branch | `codex/frontend-board-recovery` |
| Existing remote branch / PR | `codex/frontend-board-motion` / #92 |
| Starting Frontend commit | `aa007890c5bf8f4801bfb545c0f6da0426f7d6cd` |
| Designer base of #92 | `ef4c2ee449f6b0a5991814e18acf7ab42e73ef02` on `codex/designer-board-motion` |
| Runtime parent | `94a49ce0c5220b814ec56333b028fbe6180b257e` |
| Protocol / assets / tokens | `2` / `design-0.2.0` / `0.4.0` |
| Current gameplay | `full-game-1.1.0` / `in-person-v1-pass-2026-10-08` / `a25cec290370a3140829292b3cb8bdda3fb4402e0b529b56c6ef9692f7870183` |
| Legacy gameplay | `full-game-1.0.1` / `in-person-v1-2026-10-06` / `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90` |

The current workstream allocation comes from the owner's request to use persistent Codex Frontend and Designer workers, superseding the historical Claude runner allocation. Ownership boundaries remain those in `AGENTS.md`.

The applicable sources were read directly: the role brief and project/rendering context, production V1 rules and the V1 decision register, current overlays, the staged-start, compact-phone, random-starting-room and Pass decisions, the Frontend phone/board handoffs, and Designer's owner decisions and motion handoff. In particular, [the compact-phone decision](../decisions/2026-10-08-compact-phone-ui.md) approves board interaction. It does not approve every proposed artwork or motion treatment.

## Changed behavior

1. **A paused board conceals a sent command's marks.** `buildCard()` supplies board marks only with a current view and a trusted running deadline. Stale, expired and unsynchronized states suppress target rings, picks, pending marks and the tentative Move, including an accepted Move awaiting its own view. The strip and controller state remain available for receipt recovery. An accepted Move may restore its tentative place under a current running view until authoritative arrival; an accepted seat-target receipt never marks a resolved effect.
2. **Either reduced-motion preference settles an active flight immediately.** The actual motion director cancels its owned animations, timers, flyers, trails, puffs and reflow before its unchanged-public-facts return. Its current authoritative piece becomes visible. Turning motion back on does not replay the move, and later public moves and disposal still work.
3. **Expired status words fit the phone frame.** The new deadline capture exposed a waiting note wrapping underneath the labels in the fixed 44 px bar. At normal text the note sits beside the digits; at enlarged default text it sits below them and the bar grows, leaving width for the labels. The existing board can scroll internally at enlarged text.

The production changes are confined to `packages/presentation/src/model/connected-player.ts`, `apps/game/hosted/comic-motion.mjs` and `apps/game/hosted/board-play.css`. Existing controller IDs, retry/reconciliation behavior, transport and command lifecycle are unchanged. Development-only additions arrange lost answers and delayed public arrival for browser evidence; their receipt lookup now uses the actual `status: 'found'` contract shape.

## Preserved behavior and privacy

- Phones remain the V1 priority: board targets in their rooms, room-tag movement only, middle Pass for server-offered ordinary turns, and no normal page scroll. Supply uses two distinct picks and Code four; Scan answers, ballots, release decisions and recovery stay inline.
- Staged setup retains 30-second character selection/autofill, at least 30 seconds of private reading plus every human Ready, automatic bots, server-random Room A/B placement and a fresh first turn. Pending Hack is not shortened by Pass.
- Public cues still derive only from differences in authoritative public facts. Receipts and registration are neutral; roles, private acknowledgments, targets, Protection and Hack partner facts do not drive public assets, audio or motion. Protection remains Undercover-only.
- Recovery persists only `(matchId, seatId, phaseId, commandId)`. The browser reload exercise holds a synthetic receipt in the driver's memory outside the browser, then restores it into the development desk's memory. It does not persist a private command choice in client storage.
- The shared display has no private target hooks or role words in the recorded checkpoints. No contracts, rules, tokens, manifests, CI, root dependencies, Backend or Designer files changed.

## Fresh verification

Node `22.21.1`, npm `10.9.4`. Fresh captures use the hosted screens, controller, renderer, host, styles and motion from this follow-up. They are separate from [the original evidence](evidence/board-play/README.md). Final results and selected images are in [the new evidence directory](evidence/board-recovery-2026-10-09/README.md).

| Check | Actual result |
| --- | --- |
| `npm ci --no-audit --no-fund` | Passed; lockfile unchanged |
| Five focused board/controller/motion/scenario test files | 30/30 passed. Before the production fixes the 19 original tests passed and all 11 additions failed, reproducing the findings |
| Root build | Passed |
| Workspace test phase of `npm run verify` | 1,032 passed: 53 bootstrap, 148 engine, 130 Backend/Firebase, 102 tooling, 173 presentation, 426 game |
| Production exclusion | Passed: 54 reachable modules, 2 entries, 167 scanned files, 38 labeled development files; fixture/development code absent from production |
| Balance static checks | 71/71 passed |
| Full clean-commit `npm run verify` | Final clean-commit result will be recorded after the evidence commit |
| Existing board browser journey | Passed: 130 records, 124 measured steps, 287 target hit areas; 320×568, 390×844 and 1280×720; no journey failures |
| Added recovery/motion browser journey | Passed: 77 records, 69 measured steps, 20 in-flight paused combinations at both phone sizes, both mid-flight preferences at all three viewports |
| Local Auth/Firestore flow | Passed: 22 records, 15 measured steps, 8 target hit areas, 5 display-privacy checkpoints; staged start, Hack picking, keyboard Move, public flights, Pass, Jail vote and host abort |
| Designer `check:board-motion` | 13/13 passed on the pinned base; this is a prototype check, not Frontend acceptance |
| Designer `check:v1-phone` | Pre-existing failure retained: 6 checks passed, 13 quoted-text mismatches. Designer owns its repair |

The presentation matrix covers all 11 seat-target kinds and Move in submitting, checking, unknown and accepted states under stale, expired and unsynchronized conditions. Real-controller regressions cover submitting Move and receipt-checking Rescue under stale/expired conditions, delayed acceptance, view arrival, one original send and matching receipt IDs. Existing hidden-page tests are retained; foregrounding now waits for the actual server-time response before expecting a pending mark again.

The native-motion tests run the actual director with observable DOM/animation ports. Browser evidence switches both the in-app and system preference during a native 900 ms flight at 320×568, 390×844 and 1280×720. It checks cancellation, authoritative location and visibility, unchanged-facts redelivery, later motion and idempotent disposal. The phone recovery matrix covers every reproduced combination of Rescue submitting/checking and Move submitting/checking/accepted, under both stale and expired conditions, plus unknown results, reload recovery, synthetic visibility events and foreground clock resynchronization.

The initial sandbox verification failed eight existing loopback HTTP tests with `EPERM`; rerunning with loopback access passed the workspace tests. The final Balance scenario gate then refused an uncommitted checkout, as designed. Those runs are not reported as a successful complete `verify`; the required clean-commit run follows the evidence commit. Preliminary browser captures found status-bar clipping, which was corrected without weakening the geometry checks. A diagnostic that changed only CSS root font size did not match the established reader-default-text method; final enlarged-text evidence uses Chromium `Page.setFontSizes` before page load.

For emulator isolation, occupied sibling-workstream ports were left untouched. Temporary copies of the existing practice configuration/provider/server/capture use Auth `9731`, Firestore `8731`, Firestore websocket `9171`, hub `4531`, logging `4631`, loopback service `5231` and Vite `5181`, with project `demo-mothership`. Only literal loopback ports/origins and local import paths were changed. Production client/service/rules code is unchanged; temporary configuration and emulator/debug data remain outside the repository. This local runner is the existing stand-in for deadline and bot triggers, not a Cloud Tasks delivery test.

No physical phone/tablet, deployed App Check, production multiplayer or cloud acceptance was performed. The full nine-human outcomes/Code/draw journeys were not rerun. A browser layout capture does not establish human social-deduction balance.

## Earlier Frontend work checked and preserved

The worker inspected `3a36fddad16073e5df72285a2c1cbb3fe88b02c5` and `11c21557693895a9473558b187b35f3e67f7ac53`, including the older `connected-outcomes.md` and journey changes. The outcomes work and `6a5164e` are not ancestors of `aa007890`. Its outcomes, `match-code` and `match-draw` journeys are absent from the current script. The old gallery/director architecture is also absent.

Those artifacts remain historical evidence. Their results are not fresh acceptance of the staged compact-phone runtime. Useful future work is a focused port of outcome convergence, Code victory and draw coverage onto the current setup hooks and board controls, preserving registration-versus-resolution assertions. That needs its own issue, reviewable adaptation and fresh emulator run; it is not an automatic cherry-pick of the old architecture. The old branches/worktrees were not reset, deleted or overwritten.

## Adoption dependencies

Integration retains the PR stack and review/merge gate. This worker updates the existing #92 remote by a normal fast-forward push; it does not create another PR or change its base. It does not integrate Backend deadline PR #91 or contract-review PR #90.

Designer owns its pending prototype fixes, including the quoted V1 words. DSN-D30 props and DSN-D32 full-body figures stay outside the runtime manifest. DSN-D31 cue/word proposals and DSN-D33 pose semantics retain their existing owner/Integration review boundaries. The approved standees and tokens stay in use. These two consumer fixes require no new public facts or audience and change no rule version.

Merge, deployment, Firebase/IAM/queue changes, billing and access changes were not performed.
