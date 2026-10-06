# Backend follow-up integration readiness

This is the coordinating review handoff for issues #19, #21 and #23 on 6 October 2026. Work continues the exact committed Backend base `230cc39bdced7f54dbd44eabeef6aa91e9462ce0`; it does not restart bootstrap or rewrite the completed engine/service. PR #11 → #12 → #16 → #17 remain unmerged dependencies. Focused follow-ups are reliability PR #20, protocol handoff PR #22, and the shared-tooling draft linked from issue #23.

| Focused deliverable | Actual base | Committed implementation |
| --- | --- | --- |
| Recovery/reliability (#19 / PR #20) | `230cc39bdced7f54dbd44eabeef6aa91e9462ce0` | `c4a37d6782011456e4fbf29af7739212caf6a8de` |
| Protocol-2 handoff (#21 / PR #22) | `c4a37d6782011456e4fbf29af7739212caf6a8de` | `3757ffe76d0cea75c58d20858959f8d42b74ca5a` |
| Shared verification/dependency proposals (#23) | `3757ffe76d0cea75c58d20858959f8d42b74ca5a` | `a899ffb475de4446e5133385b24d5d1f5b21a86f` (this final evidence file is added afterwards) |

The final tooling PR identifies its exact final head. Its implementation changes only root scripts/config/CI, tooling regressions and `docs/backend/` review artifacts. Frontend source and manifests are not adopted into that focused PR. Renderer/motion/browser journey dependencies remain separate. Shared contract schemas, runtime logic, historical Canvas/source locks and canon are unchanged; no payload/version tightening is silently applied.

Active wire protocol is 2; ruleset `in-person-v1-2026-10-06` hashes to `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`. All V1-01–V1-21 are approved, Original Powers off. Frontend and Balance still review shared tooling, handoff and refinement adoption; the coordinating reviewer owns integration and merge oversight.

## Exact consumer and combined candidates

Frontend is read-only pinned to `ba716d71b3c5a2e15acf3cd80c4bb458e657fc9f`; its HEAD still matches that pin. The checkout was clean at initial inspection. A final read-only status check shows newer uncommitted event-director/shot/session work in progress; none of those drafts is included, reviewed or adopted in these candidates. Published PR #15 remains `e64016e6e54cf7fe63c6dab34a0b6de8bcadebcf`; earlier shot-flow context is `b97441c0ed559282c4d8948e2f1396e2a27df5b2`. Source inspection and fixture checks do not independently approve those Frontend fixes or establish protocol-2 transport acceptance.

The overlay script copied exactly 112 Git-tracked Frontend-owned files with aggregate SHA-256 `f0e19b4b9a5e681db20b59794697deba10a9110860bd6f7a18a7c3f9c96ad66a`; active Frontend checkout untouched. Two **local-only** immutable candidate commits are retained for review in this repository's Git object database:

- Consumer candidate `66980bf38da8596dfb8b5d8b7498d95a6d06bf5c` at `/private/tmp/gamen-final-consumer-candidate`, parent `a899ffb475de4446e5133385b24d5d1f5b21a86f`. It overlays only committed `apps/game/`, `packages/presentation/`, `docs/frontend/` from the consumer pin.
- Dependency candidate `61c2af5d64405e1ed163a87f52a3c10902abada8` at `/private/tmp/gamen-final-dependency-candidate`, parent consumer candidate above. It applies only the two concrete proposal patches (app manifest/config + root lockfile); no Frontend runtime source is rewritten.

These candidates are not pushed or presented as adopted changes. Reproduction from the final reviewed tooling head is in [browser-verification.md](browser-verification.md); the overlay checks the exact consumer content hash and refuses dirty/active non-scratch targets. Apply staged patches only in the separately reviewed dependency candidate described in [browser-dependencies.md](browser-dependencies.md).

## Actual final checks

Commands used Node `22.21.1`, npm `10.9.4`; reliability emulators used Java `21.0.12.1`. Every count below is an executed result, not historical evidence substituted for a run.

| Source/candidate | Command/result |
| --- | --- |
| Reliability PR #20 | `npm ci` passed (826 packages); `npm run verify` passed 145; `npm run test:emulator` passed 35 with clean shutdown; `npm run package:backend -- --verify-install` passed |
| Integrated protocol handoff PR #22 | `npm run verify` passed 150: 25 bootstrap/contracts + 79 engine + 46 backend (five new schema/example checks) |
| Final committed consumer candidate | `npm ci` passed (826); `npm run verify` passed **466**: 25 bootstrap/contracts + 79 engine + 46 backend + 11 tooling + 95 presentation + 210 game; zero failures/skips/todos/cancellations |
| Final consumer production exclusion | Passed: 31 reachable modules, 91 shipped/source files, 17 labeled development files; no fixture/test/development code or markers |
| Final staged dependency candidate | `npm ci` passed (886); `npm run verify` passed **466**, zero failures/skips/todos/cancellations, plus production exclusion |
| Final staged dependency candidate | `npm run check:browser-dependencies` passed strict real JSX and modular Auth/Firestore/App Check declarations, React/Vite bundle and exclusion; exported synthetic functions were not invoked |
| Final staged dependency candidate | `npm run package:backend -- --verify-install` passed clean isolated production installation/import and source/fixture scans |
| Backend-only tooling branch | `npm run verify` **fails**, as required, at missing Frontend suite after its 161 non-Frontend checks. This is not a passing integrated/CI result; adopt the reviewed pinned consumer before merging tooling |
| Published PR #20 and #22 CI | GitHub `Bootstrap checks / bootstrap` both SUCCESS when read at their exact committed heads |

The final dependency candidate package recorded artifact SHA-256 `ddce0f22c7b9c9dbd620f384a7e9ebd6cddb3b19c364f86c9d84fea16a4da4ba` and staged compiled-file SHA-256 `d24c051049a212376239603a4286c360c176125475c3927239e65b6b4553592c`. These byte fingerprints differ from the earlier reliability package: comparison found lockfile and emitted declaration ordering differences; all staged/packed runtime JavaScript bytes were identical. Use the actual candidate fingerprint for that package rather than reusing historical hashes. Generated outputs remain ignored.

Requested Firebase 12.19.0 exists but real modular Firestore declarations fail the pinned TypeScript 5.9.3 compiler with missing `Temporal` namespace. Independently tested Firebase 12.18.0 is supplied as a concrete alternative patch with registry/peer/integrity evidence. Shared compiler, `skipLibCheck` and vendor declarations are not weakened. The dependency candidate is package/bundle compatibility evidence, not a connected client. Current Frontend exclusion specifier changes and a real production Vite build/output remain Frontend-owned adoption work.

Independent scoped engineering review found no needed runtime/canon change. Review corrected unqualified decision-existence wording, match namespace and closed-phase reconciliation guidance, missing forwarding in the synthetic lost-ack harness, unsafe replacement of unresolved recovery issuance, and triple-slash ambient-library injection. The fixes preserve strict assertions and add meaningful permanent coverage. See [reliability evidence](v1-reliability-verification.md), [client handoff](protocol2-client-handoff.md), [refinement proposals](contract-refinements-proposal.md) and [tooling evidence](browser-verification.md).

## Remaining gates and boundaries

The shared-tooling draft cannot have green Backend-shell CI until the pinned Frontend consumer is integrated into its actual base. Missing/skipped suites are never counted as passing. Required integration and Frontend/Balance adoption reviews remain pending; do not merge this draft or the dependency stack without them. Proposed changes to legal target keys, shot availability, own pending kinds and lifecycle conflict labels need explicit version/compatibility decisions, not new game canon.

Not run: connected browser/phone gameplay; production App Check, IAM, Tasks/Eventarc/Scheduler delivery or backup restoration; physical-device acceptance, completed human games, load/cost guarantees or human social-deduction balance. No cloud resource was provisioned/deployed, public asset published, repository access changed or PR merged. Local emulator reconstruction uses a fresh match ID and does not claim production restoration.
