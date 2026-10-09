# V1 phone copy and state refresh, 9 October 2026

Focused issue [#76](https://github.com/Amirkianfar66/GameN/issues/76) follow-up, separated from [PR #88](https://github.com/Amirkianfar66/GameN/pull/88) per both recorded PR comments. Worktree `/Users/amirkianfar/.codex/worktrees/c739/GameN`, branch `codex/designer-phone-copy`, base `93a7e326a47d67b10ce61edbf8f247f859011f53` on the updated Designer board-motion branch. No other worktree was switched or edited.

## Source and resulting examples

The original V1 phone study base `87715a46dbd6a107e417bb6024d81c3fcb679049` remains historical provenance. This refresh reads the actual committed runtime at `ef4c2ee449f6b0a5991814e18acf7ab42e73ef02` and the later [compact-phone](../decisions/2026-10-08-compact-phone-ui.md) and [random-starting-rooms](../decisions/2026-10-08-random-starting-rooms.md) owner decisions. It updates Designer examples and their checks without modifying runtime, shared contracts or rules.

Six source quotes now match current copy: Waiting for players; Connection interrupted. Retry your selection.; Taken. Choose another character.; Ready. Waiting for the timer and other players.; Retry selection; Retry Ready. Seven obsolete keys are explicitly retired: `nameTaken`, `choosePrompt`, `characterConfirmed`, `selectionOverPlayer`, `botsAutomatic`, `revealWhere`, `confirmCharacter`. Required current quotes and exact source matching remain enforced, with negative mutation tests for resurrected/deleted quotes, retired states, registry drift and obsolete controls.

The 109-state inventory now has 53 active components. `select.name-taken` is retired in favor of the current generic `select.unavailable`. `select.picked` retains its historical URL but represents tap confirmation in flight. `name-field`, `room-choice` and `crew-preview` are retired from the active registry; original artifacts remain recoverable in Git.

One character tile tap preserves an existing name or uses the call sign. Submitting/retry states freeze the tiles; acknowledgment leaves the same tile pressed/read-only. Retrying uses the kept choice and requires an explicit press. A taken tile cannot send. The role card is the Reveal/Hide surface, with current accessible names and no separate steps/guide/progress paragraphs. Ready conceals the role; acceptance shows a public checkmark with the exact accessible waiting status. Join asks only for the code and shows the persisted server-assigned room as a result. Selection stays 30 seconds, reading stays at least 30 seconds plus every human Ready; only the server deals roles or advances windows.

The keyboard capture now exercises recovery input rather than a retired name field. All docs and active screenshots are regenerated from the revised inventory. The main-game portion of this older study retains its historical layout; current compact board direction, private-flow corrections and proposal gates are in [board-motion-handoff.md](board-motion-handoff.md) and [board-motion-corrections.md](board-motion-corrections.md).

## Verification

Node `22.21.1`, npm `10.9.4`, macOS, headless Google Chrome `155.0.8059.39`; local synthetic fixture server only. The browser commands require local loopback execution permission. No credentials, Firebase or production/private match data are used.

| Check | Actual result |
| --- | --- |
| `npm run check:v1-phone --workspace @mothership/design-tokens` | 7/7 check groups passed; 109 states, 53 active components; zero verbatim mismatches |
| `npm run capture:v1-phone --workspace @mothership/design-tokens` | 189 captures + 4 contact sheets, zero reported problems; inputs SHA-256 `db38dc00053e2a4b92b4f134ee676c33d377ef19345c6abbc063a4937c892eed` |
| `npm run test --workspace @mothership/design-tokens` | 125/125 tests passed; zero cancelled, skipped or todo, including the new retirement/required-copy/control negative tests |
| `npm run check:board-motion --workspace @mothership/design-tokens` | 13/13 passed; earlier board correction evidence remains current |
| `npm run check:assets --workspace @mothership/design-tokens` | 15/15 passed |
| `npm run build`, `npm run check:sources`, `npm run check:workspace`, `git diff --check` | Passed; reference and canonical inputs unchanged |
| `npm run flows:v1-phone --workspace @mothership/design-tokens` | 42/42 assertions passed: tap confirmation, kept-name/call-sign behavior, duplicate-tap prevention, explicit retry, taken/refused/expired/unsynced states, card Reveal/Hide, Ready, existing action/movement/host flows and countdown without navigation |

Visually inspected current selection, role, code-only join and Ready captures, including 320 px selection and 200% text role reflow. Enlarged text uses scrolling to keep the card and Ready reachable; it is not a claim that every control fits the first viewport. The first 193-capture pass passed measurements, but still included the obsolete Ready-stamp storyboard; the final 189-capture pass retires those four frames rather than treating them as motion evidence. The original [verification record](v1-phone-verification.md) remains evidence of its earlier source/environment. Full `npm run verify` passed (exit 0) at clean implementation/evidence commit `3d49b21b71d20edbbf9e72edfe1f6c1a6b61eb64`: 53 bootstrap/contracts, 148 engine, 130 backend/Firebase, 102 tooling, 160 presentation and 409 game tests, all passed with zero skips/todo. Balance static passed 71/71; 522 catalogue IDs produced 483 passes, 33 reviewed blocked and 6 explicit manual cases, zero errors; 475 baselines and all 4388 negative controls passed/detected; 10 playouts completed in each of 7/8/9 modes with zero unfinished/invariant/hint/replay mismatches. The common build/manifest/Git provenance gate passed. The subsequent documentation-only result commit changes no production or fixture input. CI additionally owns emulator/package checks; no local emulator or hosted acceptance is claimed.

## Integration limits and dependencies

Both protocol-2 gameplay tuples remain accepted: `full-game-1.1.0` / `in-person-v1-pass-2026-10-08` and legacy `full-game-1.0.1` / `in-person-v1-2026-10-06`. `staged-start-1`, Original Powers off, assets `design-0.2.0` and tokens `0.4.0` stay unchanged. Later owner decisions supersede historical room-choice and name-form examples without changing those gameplay pins.

Frontend [PR #92](https://github.com/Amirkianfar66/GameN/pull/92) was refreshed during this run: its latest read head is `8e213d7dae2b44b58d227ae4e0f014e8a85b50da`. A fetched ancestry check confirms it does not yet contain Designer head `93a7e326a47d67b10ce61edbf8f247f859011f53`. It remains a separate consumer; Integration owns synchronization, required checks, review and release. DSN-D30 props, DSN-D31 motion treatments and DSN-D32 production full-body figures remain proposals with their recorded gates; D33 poses/catalog, D27 capacity, D28 adjacency and D29 subtitles remain unresolved. These examples do not close any production-consumer review finding or add room capacity/adjacency.

Desktop viewport, enlarged-text and lifecycle simulations do not establish physical-phone, screen-reader, real background/process-death, multiplayer, human-balance, emulator or hosted acceptance. Root verification omits Designer phone checks, so their separate results matter. No merge, force push, deployment, IAM/billing operation, access expansion or public asset publication is part of this follow-up.
