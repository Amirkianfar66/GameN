# Browser verification integration proposal

Issue/deliverable: close root verification/tooling gaps for the committed Frontend consumer. Branch `codex/v1-browser-verification` starts exactly at `230cc39bdced7f54dbd44eabeef6aa91e9462ce0`. Backend dependency PRs #11 → #12 → #16 → #17 remain unmerged. This proposal changes no game rule or protocol shape; the approved ruleset is `in-person-v1-2026-10-06`, SHA256 `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`.

Frontend's integration requests and re-review were read from clean committed consumer `ba716d71b3c5a2e15acf3cd80c4bb458e657fc9f`, including its recovery fixes. Earlier references to uncommitted drafts describe historical state. This work pins the actual committed source; fixture checks do not approve protocol-2 transport adoption or the Frontend changes themselves. Frontend and Balance review shared tooling/dependency adoption separately.

## Verification behavior

Root `test` preserves bootstrap/contracts, engine and service/infrastructure suites, then runs permanent tooling regressions and both real Frontend suites. `verify` invokes this complete command; CI invokes `verify` before the existing emulator and standalone-backend packaging checks. No pre-existing suite was removed by REQ-1's obsolete manifest example.

`test:frontend` builds the explicit eight workspaces, requires nonempty test trees in presentation and game, runs the actual Node suites, requires every test to pass with zero skipped/todo/cancelled tests, then runs Frontend's production-exclusion checker. Missing consumers or exclusion scripts fail. Backend's standalone base still contains Frontend shells, so it cannot pass this proposed `verify`: the pinned consumer must be integrated into a separate candidate first. This failure is a dependency gate, never reported as passing Frontend coverage.

The typecheck now runs two programs. `tsconfig.check.json` keeps ES2022 without DOM for engine, service, contracts, presentation, design tokens, infrastructure and balance. `tsconfig.check.browser.json` gives only `apps/game` DOM, DOM.Iterable and React JSX options. Presentation is checked independently without browser globals. Frontend must adopt matching build options in its own app config before adding browser source; those exact config changes are included in the Stage A proposal patch.

The guard scans `.ts` and `.tsx` from source discovery, even if a build include accidentally omits a file. It checks static imports/re-exports, dynamic imports, CommonJS/import assignments and type imports. Build/typecheck omissions fail. Active triple-slash library/type/path/no-default-lib/AMD reference directives are rejected in all runtime source; they can inject ambient libraries or bypass import boundaries. Future Vite environment declarations must use reviewed browser-only `compilerOptions.types` (for example `vite/client`) and matching app build configuration, never source reference directives. Runtime package dependencies, development dependencies and exact runtime specifiers have separate permissions. Vite/plugins/React declaration packages cannot be runtime imports. Permitted browser runtime paths are the three shared main exports, `react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom/client`, `firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/app-check`. Bare Firebase, compat, analytics, arbitrary subpaths, fixtures, cloud SDKs in the pure engine and deferred renderer/motion packages remain refused.

Eleven permanent tooling tests exercise TSX fixtures and subpaths, type imports, development/runtime separation, traversal/dynamic import refusal, actual compiler rejection of `document` in pure programs, configured-source discovery, directive-based ambient injection and its actual compiler bypass, missing/empty consumers, and real skipped/todo Node results. No test skip is counted as a passing verification.

## Pinned integration evidence

The clean combined candidate overlays only Git-tracked `apps/game/`, `packages/presentation/` and `docs/frontend/` from the pinned Frontend commit. Its 112 copied files match byte-for-byte; aggregate SHA256 is `f0e19b4b9a5e681db20b59794697deba10a9110860bd6f7a18a7c3f9c96ad66a` using the algorithm in `frontend-consumer-pin.json`. Frontend deliverables are not committed in this tooling proposal and its active checkout is untouched.

Recreate a candidate after checking out the reviewed tooling proposal or the later reviewed stack:

```sh
# Run at the reviewed repository/worktree head; use an unused scratch directory.
CANDIDATE_PATH=/private/tmp/mothership-browser-review
TOOLING_SHA=$(git rev-parse HEAD)
git worktree add --detach "$CANDIDATE_PATH" "$TOOLING_SHA"
node scripts/overlay-frontend-candidate.mjs --target "$CANDIDATE_PATH"
cd "$CANDIDATE_PATH"
export PATH=/Users/amirkianfar/.nvm/versions/node/v22.21.1/bin:$PATH
npm ci
npm run verify
```

The overlay script refuses non-scratch targets, unrelated repositories and dirty targets; it copies only the pinned committed consumer and verifies the content hash. It does not create branches or rewrite active agent worktrees. A clean Linux CI checkout must integrate the same reviewed consumer changes before this root verification becomes green. Scripts must not substitute fixtures or skip suites when the consumer dependency is absent.

Actual local commands on 6 October 2026 used Node `22.21.1`, npm `10.9.4`; loopback Frontend HTTP tests needed an authorized sandbox override after the first restricted run failed eight listener tests with `EPERM`. That failure was corrected by allowing loopback execution; no tests were disabled. Results below are from the subsequent complete run.

| Candidate/check | Actual result |
| --- | --- |
| Root-tooling worktree `npm ci` | Passed; 826 packages installed |
| Backend-shell `npm run verify` | Correctly failed at missing presentation suite; its 145 existing tests plus initial 9 tooling tests ran, not a passing integrated result |
| Exact pinned combined candidate `npm ci` | Passed; 826 packages installed |
| Exact pinned combined `npm run verify` | 25 bootstrap/contracts + 79 engine + 41 backend + 11 tooling + 95 presentation + 210 game = 461 passed; zero failures/skips/todos/cancellations |
| Exact pinned combined production exclusion | Passed: 31 reachable modules, 91 shipped/source files scanned, 17 labeled development files |
| Dependency proposal candidate | See the separately bounded results in `browser-dependencies.md` |

Emulator regressions are owned by the reliability deliverable and were not rerun here to avoid simultaneous use of its fixed ports. Browser journeys, physical devices, connected Firebase client transport, cloud reliability, restoration, deployment and human playtesting were not run. Root `build` still produces package ESM/declarations; the synthetic dependency bundle is a compatibility probe, not a playable production client.

REQ-6's locked Frontend brief/first-slice files remain frozen in this proposal. Keep progress in the existing Frontend status documents; a future wording update needs a separately reviewed source-lock change. No historical source or source lock is regenerated here.
