# Capacity audit follow-up — BAL-REQ-12/13/14

This follow-up continues PR #98 from the actual clean starting SHA `dd04f68ee5af887b01761a03eca644f7a67e84dd`, preserving its existing commits and branch. It reads the complete independent Balance PR #104 at `c82863eff563ea7fd8f6ee33e7260d2dc1c4899c`, its evidence and integration requests. The six later owner decisions are independently corroborated by [issue #96](https://github.com/Amirkianfar66/GameN/issues/96#issuecomment-6113799029). Source precedence is latest owner decisions, confirmed overlays, then historical sources.

## Reproduction and correction

The independent reproduction of CAP-28 uses the audit's legal initial setup and seven accepted commands, with no mid-game state injection. At the original 1.2 binary, with each of 7/8/9 players, Room B has four occupants before resolution; the attacked Captain moves into Command Room; Captain loss briefly places them in Room B; the healed Insider is incorrectly diverted to Room A; then the Injured former Captain goes to Hospital, leaving Room B at four. Pass and pre-Pass controls return the Insider to Room B. Our earlier 64-case audit missed this interaction and was an internal Balance-role review, not the independent Claude Game Balance workstream's audit.

The new tuple plans placements after attacks, Rescue and Supplier resolve. It vacates healed Hospital places in a private working roster, admits Injured players in lower player-number order without expelling existing patients, and then seats ordinary returners in that order. Locations and remembered rooms are applied together. A former Captain reaches Hospital directly, or joins ordinary returners when Eliminated or denied a full Hospital. No transient/public location or extra gameplay state field is added. A released Injured player denied Hospital remains physically in Jail with `jailed=false`. Forced ordinary fallback now updates `lastRoom` to the room actually occupied.

## Exact version policy

| Engine | Ruleset | Behavior |
| --- | --- | --- |
| `full-game-1.3.0` | `in-person-v1-capacity-resolution-2026-10-12` | Latest six owner decisions, joint draw and staged returns |
| `full-game-1.2.0` | `in-person-v1-capacity-2026-10-11` | Exact original capacity behavior, including the audited CAP-28 outcome |
| `full-game-1.1.0` | `in-person-v1-pass-2026-10-08` | Exact historical Pass behavior |
| `full-game-1.0.1` | `in-person-v1-2026-10-06` | Exact pre-Pass behavior |

New overlay SHA-256: `aef288266055bfc6f9905b97ba3262400044af84c689dbcc4a979e544bdf2b1e`. The original overlay bytes/hash are immutable. Engine/ruleset/hash/protocol support is exact; unknown or mixed pins fail closed. Only new creation pins select 1.3. Existing creation, prepared-deal, running-state, receipt and asset pins are not upgraded; missing historical creation pins retain the original fallback. Changing the binary never rewrites an old journal's meaning.

## Joint starting assignment and contract proposal

The service selects one cryptographically uniform integer among all legal labelled assignments: 112 at seven players, 182 at eight and 252 at nine. Combinatorial unranking gives each legal vector equal probability; splits themselves are not sampled equally. Roles, characters, identities and approval order are not randomizer inputs. Pending requests consume no room draw. The completing human approval or bot configuration transaction assigns every bound seat, updates approved admission records and the lobby coherently, and persists the result. Competing optimistic transactions may generate an uncommitted candidate; only one assignment commits, and each invocation caches its candidate through retries. Receipts recover before phase/policy/pin revalidation.

Before the first complete roster, **nobody has a room**. The focused shared-contract proposal allows `null` on existing `initialRoom` values in incomplete lobbies/admission records; complete rosters require A/B values. It adds no public field. Frontend must review and adopt nullable private admission readers and truthful unassigned-room copy before release. Current consumers otherwise reject the admission or display a guessed room. Relevant paths: `apps/game/src/connected/readers.ts:93–104`, hosted `main.js:582/592/654/894–902`, `phone-ui.js:63`, `practice-controls.js:54–55`, and development `connected/main.js:489/499`. The connected SDK emulator's pending-room expectation also needs affected-role review. Backend does not edit those consumers to make the API appear integrated.

Roster editing after the first complete draw is a persistence edge the audit did not explicitly enumerate. An optional owner question was queued. The conservative implementation follows the recorded “a room once drawn is not drawn again”: preserve the first private canonical seat map and reuse it through later binding changes. This is an application of the written once rule, not a separately claimed owner answer about bot replacement. Historical admission/bot epoch policies remain exact under their prior tuples.

## Independent acceptance and integration ownership

The independent c828 suite is run with the new ruleset explicitly named, leaving all Balance expectations unchanged: 107 automated cases and 15 manual cases. The frozen historical records are compared separately: original capacity 1.2 retains 92 passing / 15 failing / 15 manual, and both earlier catalogues retain their baseline results. New 1.3 acceptance must not relabel the historical catalogue as current capacity acceptance.

No Balance-owned file is overwritten. Integration owns adopting PR #104's newer 555-case historical catalogue, its named-ruleset adapter and 122-case capacity suite, plus the strict 600-playout gate. The original 522-case root gate remains untouched here. Root/shared changes made by this Backend follow-up are limited to the existing nullable lobby schema proposal, the new immutable overlay/decision record, `scripts/check-sources.mjs` for source binding and `scripts/package-backend.mjs` to include the required sampler module. `scripts/test-balance-reports.mjs`, CI, manifests and lockfiles remain unchanged for coordinator-owned integration.

The standalone clean-install probe initially caught the sampler missing from the production allowlist; it is now explicitly included. Fixture code and legacy backend harnesses remain excluded.

## Verification record

Actual final source SHA and final verification results are recorded in the PR. Preliminary uncommitted evidence: 440/440 engine/Backend tests passed; independently 107/107 capacity cases and 600/600 capped playouts passed with zero invariant/hint/replay/unfinished errors; exact 1.2 audit records and Pass/pre-Pass catalogue digests matched their baselines. Clean-source reruns replace this preliminary provenance at handoff.

Real Auth/Firestore tests cover joint completion, concurrent approval/bot competition, recovery, receipt/pin ordering and old lobbies/deals. Fifteen focused CAP-25/27/28/45/46 service cases use only a labelled legal synthetic initial SETUP; subsequent commands and deadlines are actual service transactions. Stored projections/acknowledgments, receipt retries, deadline duplicates and full journals are replayed. These tests do not claim native setup task delivery, hosted UI or human balance.

The standard-port emulators at 9199/8180/5101 are owned by another workstream (PID 77098/77163 observed during this follow-up). Backend uses dedicated Auth/Firestore ports 29199/28280 only and does not stop that session. The unchanged Functions guard rejects alternate ports; combined real Functions/Frontend acceptance belongs to the coordinator's fresh standard-port release candidate after contract adoption.

No deployment, IAM change, merge, new art/UI or production match access is performed by Backend.
