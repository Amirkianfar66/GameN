# Pinned Frontend and Backend integration candidate

Issue [#25](https://github.com/Amirkianfar66/GameN/issues/25) publishes one draft candidate that contains the committed Frontend consumer and the complete Backend verification proposal. This closes the missing-Frontend-suite CI gate from [#24](https://github.com/Amirkianfar66/GameN/pull/24) while preserving both histories and their review dependencies.

## Named candidate base and source pins

The integration branch is `codex/v1-pinned-frontend-integration`. It is the named candidate base for the next Frontend/Backend integration work after affected-role review; its existence and green checks do not adopt or merge the outstanding PRs. Pin the published head reported by the integration PR before starting a follow-up, and use a separate worktree. Do not switch or modify an active Claude checkout.

| Input | Exact committed reference |
| --- | --- |
| PR base branch | `codex/v1-integration-readiness` |
| Backend input / first merge parent | `8ae6d6c772182245d7dab12c61c4a76c42fa7191` (#24) |
| Frontend input / second merge parent | `ba716d71b3c5a2e15acf3cd80c4bb458e657fc9f` (#18) |
| History-preserving source merge | `ddf8bc7472c6937b3224743ed34dc6a3da706c49` |
| Isolated managed worktree | `/Users/amirkianfar/.codex/worktrees/v1-frontend-integration/GameN` |

The source merge has exactly those two parents. The Frontend history changes only `apps/game/`, `packages/presentation/`, and `docs/frontend/`. The 112 tracked files under these prefixes are byte-for-byte identical to the Frontend pin. Their SHA-256 aggregate is `f0e19b4b9a5e681db20b59794697deba10a9110860bd6f7a18a7c3f9c96ad66a`, using sorted `path TAB SHA256(file bytes) LF`, as recorded in [frontend-consumer-pin.json](frontend-consumer-pin.json). The merge introduces 109 changed files relative to the Backend parent; three existing files already had identical bytes.

All other tracked files in the source merge are identical to the Backend input. This handoff document is the only additional integration-specific source change. No Frontend source is rewritten, and newer uncommitted Claude event-director/shot/session work is excluded. Historical Frontend reports and screenshots remain evidence from their original commits.

## Review dependencies

Preserve these unmerged review stacks:

- Backend: [#11](https://github.com/Amirkianfar66/GameN/pull/11) → [#12](https://github.com/Amirkianfar66/GameN/pull/12) → [#16](https://github.com/Amirkianfar66/GameN/pull/16) → [#17](https://github.com/Amirkianfar66/GameN/pull/17) → [#20](https://github.com/Amirkianfar66/GameN/pull/20) → [#22](https://github.com/Amirkianfar66/GameN/pull/22) → [#24](https://github.com/Amirkianfar66/GameN/pull/24).
- Frontend: [#15](https://github.com/Amirkianfar66/GameN/pull/15) → [#18](https://github.com/Amirkianfar66/GameN/pull/18).

The integration draft targets #24's branch and additionally depends on #18 and its base #15. Its local merge preserves commit history for review; it does not merge any GitHub PR. The coordinating reviewer retains merge oversight, and Frontend/Balance review remains required for shared tooling, contracts and handoff adoption. Preserve or update stack bases under that review when dependencies are merged; do not bypass them by treating this candidate as an approved mainline.

## Verification evidence

The source merge was verified on 6 October 2026 with Node `22.21.1`, npm `10.9.4` and Java `21.0.12.1`:

| Executed command/check | Result |
| --- | --- |
| `npm ci` | Passed clean installation, 826 packages |
| `npm run verify` | Passed 466 tests: 25 bootstrap/contracts + 79 engine + 46 backend + 11 tooling + 95 presentation + 210 game; zero failures/skips/todos/cancellations |
| Frontend production exclusion | Passed: 31 reachable modules, 91 scanned files, 17 labeled development files; no fixture/test/development module or marker |
| `npm run test:emulator` | Passed 35 tests; zero failures/skips/todos/cancellations; emulators shut down cleanly |
| `npm run package:backend -- --verify-install` | Passed standalone production installation/import and forbidden-source scan |
| Frontend pin and merge scope | Passed exact 112-file hash, both parents, and unchanged files outside Frontend ownership |

The unchanged `Workspace, frontend and backend checks` GitHub workflow runs the real install, complete verification, Java-21 emulator suite and standalone package verification against the published candidate. Its `bootstrap` job is the required CI evidence; the PR records the exact published head, run URL and outcome after completion. Missing suites, skipped/todo/cancelled Frontend tests, forbidden imports and production fixture leaks still fail. No workflow step or test gate is weakened.

## Remaining adoption gates and version impact

The active Backend wire protocol remains 2. Ruleset `in-person-v1-2026-10-06` remains SHA-256 `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`, with approved V1-01–V1-21 decisions and Original Powers off. Canon, contracts, source locks, authority, receipts, projections and runtime code are unchanged by this integration.

The pinned Frontend still consumes protocol-1 fixture/transport schemas. Its 305 executed presentation/game tests establish those committed behaviors and source coexistence with Backend checks. Connected protocol-2 transport adoption, authenticated phone recovery/reconciliation and the full in-person V1 browser journey remain Frontend integration work against [protocol2-client-handoff.md](protocol2-client-handoff.md). Shared refinement proposals remain in [contract-refinements-proposal.md](contract-refinements-proposal.md) and require affected-role review.

The React/Vite and modular Firebase client patches in [browser-dependencies.md](browser-dependencies.md) remain separate, unapplied proposals. Root lockfile and app manifests/config match the merge inputs; this candidate does not install those dependencies or make their synthetic dependency probe part of acceptance. Any adoption must use its own reviewed dependency change and source-bound browser verification.

No cloud resources were provisioned or deployed, repository settings/access changed, public assets published, GitHub PRs merged, or human social-deduction balance established. The candidate is a verified source integration base, with connected gameplay and affected-role adoption still pending.
