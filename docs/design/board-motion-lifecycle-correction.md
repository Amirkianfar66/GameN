# Designer motion lifecycle correction, 12 October 2026

Focused issue [#112](https://github.com/Amirkianfar66/GameN/issues/112). Worktree `/Users/amirkianfar/.codex/worktrees/c739/GameN`, branch `codex/designer-motion-cancellation`. Frozen base: `49f0db4d34d2a2a418f669a13bed660fc665b1b6`, cumulative Designer [PR #111](https://github.com/Amirkianfar66/GameN/pull/111), slice 7. The task began at art6 `1e2f4916ea341af98c19078bc218ba74d9602640`; fixes were first committed at `125c426c1d2629b512d7cb4dd31a7e1bd46a0587`, then restacked on the exact slice-7 base without conflicts. The trial stops at slice 7; slice 8 is not a dependency.

## Reproduced problems and corrections

1. On `board.idle`, Player 6 moving to Room B followed immediately by Healthy left both boards with health `Healthy`, gesture `tablet`, but drawing `c6|tablet+injured`, still wrong after 1100 ms. Cancellation now restores from the current piece's public character/gesture rather than the old choreography's captured destination.
2. In-app or native OS reduction during that walk left moving flags, flyer/echo/clock/trail/puff nodes and a running JavaScript choreography. Both directors now cancel their work immediately, including before replay/duplicate early returns. Each director owns an OS preference listener; the app also settles its private art without requiring a new public view. Explicit full motion still respects the OS preference. Returning to full replays nothing; the next fresh public move still plays. Disposal removes all listeners and cancels animation, timer and frame work.
3. Actual 320 × 568 screens exposed board overflow with the selection strip open: Shot confirmation, complete Code confirmation and Release choice. Short-screen spacing now lets detail use the space beside the existing target portrait, keeps wrapped controls at least 44 px, and trims Code confirmation padding. The own board reserves press space for the offered controls rather than treating every decorative figure as an active button. Room/character/gesture sources and assignments are unchanged. Sixteen strip states pass full-board/navigation fit, 44 px controls, unobstructed target centers and non-overlapping targets.
4. The independent slice-7 review reproduced `moving: 1` after the optional kept-card illustration returned from inspect/stale/fresh to expiry. The same sequence here identified an untracked `CSSTransition` on `.ab-photo` (`transform`, identity transform to `none`). Paused photos now suppress that transition. The original immediate zero-motion assertion is unchanged; all 366 existing flows now pass.

Default stale/expired private-card concealment remains enforced and tested. Integration declined adopting the kept-card option for this trial. Its original illustration remains source evidence; correcting its transition does not enable it by default or request adoption.

## Source preservation and scope

No change to any Claude SVG source, generated art asset, figure rig, gesture, scene, palette/token, recipe, manifest or painted exploration. The only behavior inputs changed are `design/board-motion/js/app.js`, `director.js`, `css/board.css` and `design/abilities/css/abilities.css`. A new development-only browser regression tool and regenerated synthetic evidence accompany them. Runtime, shared contracts, root manifests/CI, rules and `reference/design-canvas/` are unchanged.

PR #93's phone-copy correction is already present in release `1a92f3790e45622196014cc008544fc33c359c0a` (read back from Git). It is not lost or duplicated here: no V1 phone source, evidence or documentation is edited. The older art branch still has its pre-existing strict phone-check failure; Integration retains the already integrated correction when combining this Designer stack with the release.

Pins remain the slice-7 proposal: `abilities-0.7.0`, `board-motion-0.2.0`, reviewed assets `design-0.2.0`, tokens `0.4.0`; protocol 2, `full-game-1.1.0` / `in-person-v1-pass-2026-10-08`, Original Powers off. No rule change or rule-version impact. Backend's capacity version and production adoption remain Integration's work.

## Actual verification

Node `22.21.1`, npm `10.9.4`, macOS, headless Chrome `155.0.8059.39`; local synthetic fixture server. No Firebase, private match, account data or production operation is used.

| Command | Result |
| --- | --- |
| `npm ci`, `npm run build` | Passed; 887 packages, unchanged dependencies/lockfile |
| `npm run typecheck`, `npm run test:contracts` | Passed; 24 contract tests, no skips/todo |
| `npm run check:sources`, `npm run check:workspace`, `git diff --check` | Passed; historical/approved source integrity and workspace boundaries retained |
| `node design/tools/board-motion-lifecycle-flows.mjs --evidence` | 52/52 assertions passed: latest-pose restoration, in-app/native reduction, no delayed/replayed work, listener disposal, default concealment, optional reference transition, and 16 strip states at actual 320 × 568 |
| `npm run flows:board-motion --workspace @mothership/design-tokens` | 366/366 passed on frozen slice 7; before the photo-transition correction it reproduced exactly 365 passes and the one reported expiry failure |
| `npm run check:board-motion --workspace @mothership/design-tokens` | 13/13 passed; 14 actions, 22 cues, 129 scenarios |
| `npm run capture:board-motion --workspace @mothership/design-tokens` | 299 captures + 5 contact sheets, zero problems; inputs SHA-256 `7ab30422ce4bc75401e51d294cce4946b468390c58e98558f5950607dc4422ed` |
| `npm run check:abilities --workspace @mothership/design-tokens` | 12/12 passed; 49 assets, 24 treatments, 22 delivered |
| `npm run capture:abilities --workspace @mothership/design-tokens` | 235 pictures + 7 contact sheets, zero problems; inputs SHA-256 `3ddda09979a560b5edde7430d6fa4204fa6500b9ba4e75f38bda13e58baee6cc` |
| `npm run check:assets --workspace @mothership/design-tokens`, `node design/tools/abilities-assets.mjs --check` | 15/15 passed; ability assets current, 51 generated files |
| `npm run test --workspace @mothership/design-tokens` | 186/187 passed, zero cancelled/skipped/todo. Sole failure: the unchanged historical phone checker, 13 source-quote mismatches, already corrected by PR #93 in the release |

Fresh screenshots and facts: [evidence/board-motion-lifecycle-2026-10-12/](evidence/board-motion-lifecycle-2026-10-12/). Before-state facts and the Shot overflow picture are retained alongside current evidence. The native preference test uses Chromium media emulation and checks cancellation without a new public revision; page disposal is a dispatched event. Desktop simulations are not physical-device, screen-reader, real background/process-death, multiplayer, human-balance, emulator or hosted acceptance.

Full clean-commit repository verification is recorded after that run. Root verification/CI do not run the Designer checks, so the separate results above remain necessary. No merge, deployment, IAM/billing action, access change or new art publication is performed by this worker.

## Integration handoff

Apply the focused correction after the frozen slice-7 art stack. Frontend separately owns runtime ports and runtime motion corrections; this prototype fix does not substitute for their acceptance. Preserve all cumulative art and the release's existing PR #93 phone fix. Keep concealment as the trial default. DSN-D34/D37 visual review and D36 adoption, along with remaining shared integration requests, retain their separate gates. This work adds no kept-card approval and requires no slice-8 work.
