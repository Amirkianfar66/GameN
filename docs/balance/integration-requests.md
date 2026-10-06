# Game Balance requests to Codex Integration

**From:** Game Design and Balance (issue [#5](https://github.com/Amirkianfar66/GameN/issues/5)). **For:** Codex Astra, Backend and Integration.
**Base:** `BASE_SHA` `333c9e820f362a211352bc689372663f29b73ac4`. **Date:** 6 October 2026. BAL-REQ-1 was rewritten on 7 October 2026, after the follow-up review and Backend's reconciliation, and [where each request stands](#where-each-request-stands) was added.

Codex owns the engine, the shared contracts, the files under `rules/`, the root manifests, the lockfile and CI. Balance has changed none of them. This document lists the exact changes Balance asks for. Contract findings are in [contract-review.md](contract-review.md). Rule questions go to the game owner, not to Codex; they are in the decision register in [rules-audit-v1.md](rules-audit-v1.md#decision-register).

| ID | Request | Blocks | New dependencies |
| --- | --- | --- | --- |
| [BAL-REQ-1](#bal-req-1) | Require the Balance checks in CI: the static check and the engine gate | CI coverage of the Balance work | None |
| [BAL-REQ-2](#bal-req-2) | A private post-match research export | Complete playtest records | None |
| [BAL-REQ-3](#bal-req-3) | Point every agent at the rulebook, and carry the nine open rule edges in the current register | One rule text for all four workstreams | None |
| [BAL-REQ-4](#bal-req-4) | A supported test surface on the engine | Scenario runs that survive engine refactoring | None |
| [BAL-REQ-5](#bal-req-5) | Withdrawn: a ruleset pin that covers the baseline sources | Nothing | None |
| [BAL-REQ-6](#bal-req-6) | A decision on the three pinned Balance documents | Keeping the brief and the earlier audit current | None |
| [BAL-REQ-7](#bal-req-7) | One contract request from the review | Projection tests | None |

Nothing here adds a package. `tools/balance` keeps its two workspace dependencies and its source imports nothing else, so the workspace guard passes unchanged.

## BAL-REQ-1

**Require the Balance checks in CI: the static check, and the engine gate.**

Backend's reconciliation (PR [#39](https://github.com/Amirkianfar66/GameN/pull/39), `docs/backend/v1-request-reconciliation.md` at `e6923b3ffd6f47beb3b7a5963ce5f423c7b08e8e`) accepts this request as an additive integration change once the corrections for R1 and R2 are reviewed, and lists what a permanent report gate must enforce beyond the exit status of each command. The follow-up review of 6 October records R1 and R2 as resolved at `a3898b83deaf19f25e83436b1b18856520b27876` and leaves CI adoption to integration. Balance has now written the gate and the reviewed exception list that the plan asks for. The root manifest and the CI workflow are Codex's; neither is changed here.

There are two checks. Both run from the repository root after `npm ci`.

```sh
npm run check --workspace @mothership/balance
npm run engine-gate --workspace @mothership/balance -- --out-dir "$RUNNER_TEMP/balance"
```

**The static check** needs no engine. It verifies that the scenario files equal the catalogue and that the traceability table is current, and runs the static tests. It fails unless every test file ran at least one test and nothing failed, was cancelled, was skipped or was marked todo. It validates documents and fixtures and executes no scenario.

**The engine gate** needs the full-game engine in the checkout, built, and a clean committed tree. It runs the scenarios, the negative controls and ten seeded playouts per mode against that engine at the checkout's own commit, each with `--require-engine`, writes three reports and holds them to the report gate. It is Backend's sequence with the gate as its last step. Written out:

```sh
CANDIDATE_PATH="$PWD"
CANDIDATE_SHA="$(git rev-parse HEAD)"
REPORTS="$(mktemp -d)"
npm run scenarios --workspace @mothership/balance -- --require-engine --engine-root "$CANDIDATE_PATH" --engine-commit "$CANDIDATE_SHA" --out "$REPORTS/scenarios.json"
npm run controls --workspace @mothership/balance -- --require-engine --engine-root "$CANDIDATE_PATH" --engine-commit "$CANDIDATE_SHA" --out "$REPORTS/controls.json"
npm run walk --workspace @mothership/balance -- --require-engine --engine-root "$CANDIDATE_PATH" --engine-commit "$CANDIDATE_SHA" --seeds 10 --out "$REPORTS/playouts.json"
npm run gate --workspace @mothership/balance -- --scenarios "$REPORTS/scenarios.json" --controls "$REPORTS/controls.json" --playouts "$REPORTS/playouts.json" --engine-root "$CANDIDATE_PATH" --engine-commit "$CANDIDATE_SHA" --candidate-commit "$CANDIDATE_SHA" --playouts-per-mode 10
```

The gate executes nothing. It reads the three reports and fails, naming every problem, unless all of the following hold. Each line is a row of Backend's plan.

| Backend's plan asks for | What enforces it |
| --- | --- |
| Static check: a positive test count; no failure, skip, todo or cancellation; materialization and traceability match the catalogue | `npm run check`, through `scripts/static-tests.mjs`. A test file that defines no test also fails it: `node --test` counts such a file as one passed test |
| Scenarios: an available engine with the exact candidate commit and pins; every ready scenario executed; passes in each of the three modes; none failed, invalid or not run; every catalogue identifier exactly once | The gate. Each report must name the engine commit given to the gate and an engine that reports the approved ruleset and owner-decision hash. Every ready fixture must be `passed`, each mode must have passes, and every fixture must be reported once and no other |
| Blocked and manual exceptions compared with a reviewed list of identifiers, statuses, decisions and reasons | `tests/scenarios/v1/exceptions.json`: eleven blocked cases and two manual cases in each mode, 39 fixtures. The gate and the static check both fail when the fixtures that are not ready differ from the list in any case, status, decision or kind. A blocked case with a probe must have run to its undecided point; one without must give the runner's reason for that |
| Controls: every ready baseline accounted for against the catalogue, every generated control executed, none undetected, no baseline failing | The gate counts the baselines and generates the controls from the catalogue itself and compares both numbers with the report, for each mode. The report's own verdict must be `passed` |
| Playouts: exactly ten asked for, executed and finished per mode; no invariant violation, hint mismatch or replay mismatch | The gate, with `--playouts-per-mode 10`. The playout command now refuses to run no playouts |
| Reports that identify the engine commit and the source and fixture hashes; fail on mismatched or unavailable pins and on an unexpected working tree | All three reports carry the same pins. The gate compares the scenario files, the rule sources and the rulebook with the files on disk, requires the pinned source manifest and the approved owner-decision file, requires the three reports to agree, and with `--candidate-commit` requires a clean tree at exactly that commit. A tree with uncommitted changes, or without Git, fails |

For adoption:

1. **Write the reports outside the checkout**, as Backend's plan does. A report file inside the checkout is itself an uncommitted change: the next report then records one, and the gate refuses it.
2. **The engine gate belongs in CI as its own step, not inside `npm run verify`.** It requires a clean commit, and people run `verify` on work in progress. The static check has no such requirement and can join `test`. Suggested, against the manifest of the landing candidate `71dfd0277c6ccc4a5dd78b9702face98a46310b8`:

```diff
+    "test:balance": "npm run check --workspace @mothership/balance",
+    "test:balance:engine": "npm run engine-gate --workspace @mothership/balance --",
-    "test": "npm run test:bootstrap && npm run test:engine && npm run test:backend && npm run test:tooling && npm run test:frontend",
+    "test": "npm run test:bootstrap && npm run test:engine && npm run test:backend && npm run test:tooling && npm run test:frontend && npm run test:balance",
```

   and one CI step after the build: `npm run test:balance:engine -- --out-dir "$RUNNER_TEMP/balance"`, with that directory kept as a build artifact.
3. **The exception list is three cases shorter than the one in Backend's plan.** The plan was written at `dedfe69` and names twelve blocked cases per mode. The twelfth waited on D15, and D15 is answered by the existing five-round and showdown structure: the case was withdrawn in the reviewed commit, and the reconciliation itself classes D15 as a proposal for a new rule. The list has 33 blocked and 6 manual fixtures.
4. **A pass of the gate is not a statement about balance.** It says the checks ran completely against the named engine and found nothing. It cannot show that the built engine was built from the named commit; CI builds from its own checkout, and that is what makes it so.

The evidence report of 7 October records the gate running on real reports against the landing candidate, the gate refusing reports that are wrong in one respect, and a rehearsal of the sequence above in a scratch merge.

## BAL-REQ-2

**A private post-match research export. Needed before the first recorded playtest can be complete.**

Issue #5 lists "sanitized post-match telemetry from Backend" as a dependency. The record layout is [telemetry-spec.md](telemetry-spec.md) and [telemetry-export.schema.json](telemetry-export.schema.json). The fields that only the server can supply are listed there under "From the server export". In short:

- the pins of the match: ruleset version and hash, source manifest hash, engine version and commit, protocol, client build;
- the result with its cause and checkpoint, and Healthy Power at the end;
- the count of each phase kind and the sum of window time;
- one row per registered attack: type, rounds, actor and target seat and faction, defence, damage, target health afterwards, actor status at resolution;
- per seat: turns by status, opportunities available, attempted and accepted for each action kind, resources unused, votes cast and missed;
- Scan attempts and failures, Hack conversations and requests refused by the round limit, Protection grants and consumptions, Supplier distribution and recipient factions, Code submission, correctness and phase;
- showdown participants, shots registered, shots with effect, eliminations.

Constraints, all from the role brief and the secrecy rules:

1. The export is produced only after the match has finished or been aborted, never during play.
2. It is available only to an authorized facilitator or researcher role. Host status alone must not grant it.
3. It contains no Auth identifier, device identifier, address or free text typed by players, and never the content of a Hack.
4. It is not written to routine logs or analytics.

"Opportunities available" needs the engine's own legal-target evaluation at each turn; it cannot be rebuilt from accepted commands alone. If that is expensive, the per-attack rows and the result cause are the first priority.

## BAL-REQ-3

**Point every agent at the rulebook, and carry the nine open rule edges in the current register.**

The owner asked for one rules document that all agents follow. It is [game-rules.md](game-rules.md). It consolidates the pinned sources and the owner decision of 6 October and creates no rule. Agents on other worktrees do not know it exists.

Requested addition to `AGENTS.md`, under "Source precedence", after the numbered list:

```diff
+The consolidated rulebook is `docs/balance/game-rules.md`. Read it for how the game plays: it
+cites the source of every rule and is checked against the pinned files. It does not replace the
+sources. Where it disagrees with one, the source wins and the rulebook has a defect: report it on
+issue #5. A rule marked OPEN there is undecided; do not ship a default for it as if it were canon.
```

`CLAUDE.md` imports `AGENTS.md`, so no second edit is needed. `CODEX_START_HERE.md` could gain the same pointer in its launch prompts.

Requested addition to the current decision register (`docs/backend/v1-decision-register.md` on PR #16, or wherever the register lives after integration): the nine open rule edges D11, D12, D16 to D20, D34 and D35, or one row linking to their consolidated sheet in the Balance audit. V1-01 to V1-21 are approved and nothing here reopens them. The edges lie outside those decisions: no approved source answers them, and for seven of them the build already behaves one way. Recording them where implementation choices are tracked keeps a build's behaviour from being mistaken for canon. The sixteen readings in the Balance register ask for nothing and need no row.

## BAL-REQ-4

**A supported test surface on the engine.**

The role brief says Balance converts scenarios into engine fixtures "after Backend publishes the engine test adapter". No adapter has been published. To run anything, Balance wrote its own binding, `tests/scenarios/adapters/full-game-v1.mjs`, against the five functions exported on PR #16: `createFullGame`, `executeFullGame`, `advanceFullGame`, `abortFullGame` and `projectFullGame`.

The binding forwards commands and clocks through those functions, which is stable. To assert on server truth it also reads the engine's state object directly: `seats[].protection`, `seats[].ordinaryWeapons`, `queued`, `viewRevisions`, `releaseUsed`, `codeSubmitted` and others. Those are internals and will change.

Requested, in order of preference:

1. Export a read-only test view of server truth from `@mothership/engine`, for test use only, with the fields of `TruthSeat` and `Observation.truth` in `tools/balance/src/observation.ts`. Balance will then delete its field mapping.
2. Or state which state fields are stable for tests, and Balance will keep the mapping.

Either way the five functions above are the surface that every scenario and the playout tool depend on. A change to their signatures needs a matching change to the binding in the same PR.

## BAL-REQ-5

**Withdrawn.** It asked for one pin that covers both the owner-decision overlay and the baseline source manifest. The integration review decided to keep the two hashes as separate pins. Balance reports already record both, and will keep doing so. See [BAL-C03](contract-review.md#bal-c03).

## BAL-REQ-6

**Three Balance documents are pinned by the bootstrap source lock.**

`docs/bootstrap-source-lock.json` pins `docs/balance/rules-audit.md`, `docs/balance/scenario-matrix.json` and `agents/game-balance.md`. All three are now out of date in places: the audit and the matrix list D01 to D09 as blocked, and the brief still says the task is unimplemented and the bootstrap commit is to be pinned.

Balance has left all three byte-identical. `tests/scenarios/sources.test.mjs` asserts it. The Version 1 audit, rulebook and scenarios are new files beside them, and the 35 specifications of the matrix are traced one by one in [scenario-traceability.md](scenario-traceability.md).

Requested: either state that the three files are frozen historical sources, or make a reviewed lock update that adds one line to each pointing at the Version 1 documents. Balance will not regenerate the lock. Frontend's REQ-6 asks the same for its two files.

## BAL-REQ-7

**One contract request from the review.**

- [BAL-C02](contract-review.md#bal-c02): enforce the cross-field statements about Captain, Command Room, Jail, Hospital and the Final Zone, in the schemas or in a required projection test.

The other item this request used to carry, [BAL-C01](contract-review.md#bal-c01) on `shotAvailable`, is closed. Backend's refinement proposal now documents the field's meaning in each protocol, Frontend gates on it together with a non-empty target list, and Balance's re-review found the engine doing what the document says. Balance asks for no versioned schema change.

## Where each request stands

Backend answered every request in its reconciliation (PR [#39](https://github.com/Amirkianfar66/GameN/pull/39) at `e6923b3ffd6f47beb3b7a5963ce5f423c7b08e8e`, a draft, unmerged). The middle column is that document's disposition in short; its own wording is the authority.

| Request | Backend's disposition | Balance's position now |
| --- | --- | --- |
| BAL-REQ-1 | Accepted as an additive integration change after review of R1 and R2, with a plan and the assertions a report gate must make | The gate and the exception list are written. Adoption in the root manifest and CI is Codex's |
| BAL-REQ-2, BAL-C13 | A separate Backend and privacy design. Only after a match has finished or been aborted, for an authorized facilitator or researcher, with no identifier, free text or Hack content. Consent, access and retention need the owner's approval first. Incomplete records stay possible | Agreed. Nothing further is asked now. The playtest protocol already waits for the same approval |
| BAL-REQ-3 | A reviewed pointer is supported while source precedence is kept. The reconciliation triages the open edges itself and asks no blanket approval of readings | Its table of open edges lists the same nine, D11, D12, D16 to D20, D34 and D35, and describes the build's present behaviour as the Balance probes recorded it. Once it is merged, the second half of this request is met. The pointer in `AGENTS.md` stays a proposal for a focused integration change |
| BAL-REQ-4 | Five engine functions are the surface in use. A test-only observation contract, or stated field stability, is to be reviewed before the mapping is promised to survive refactoring | Open. Until then the binding keeps its mapping, and the engine gate shows at once when a refactoring breaks it |
| BAL-REQ-5, BAL-C03 | The three hashes stay separate; a future composite pin would be versioned | Withdrawn, as before. Balance reports now record all three, separately |
| BAL-REQ-6 | The earlier audit, matrix and brief stay frozen, with the Version 1 documents beside them | Answered. Balance keeps them byte-identical and checks that it does |
| BAL-REQ-7, BAL-C01 | Answered by the protocol-2 clarification; Balance's current re-review required | Done: Part C of the contract review, in the reviewed commit. Closed |
| BAL-REQ-7, BAL-C02 | A proposal for focused schema and projection hardening. No defect in a connected projection was demonstrated | Agreed that none was demonstrated. It stays a proposal |
| BAL-C12 | The Hack partner is private to the two participants on the wire. A public field would need an approved disclosure and a protocol review | Answered: private on purpose. No change is asked |
| BAL-C15, BAL-C16, BAL-C17 | Advisory follow-ups. No new canon follows from them | Agreed |

## What Balance does next, and what it waits for

| Next | Waits for |
| --- | --- |
| Re-run the engine gate against the engine as merged, and commit the report | The landing candidate on the default branch |
| Turn a blocked scenario into a ready one, with a new rulebook version | An owner decision on that D number |
| First in-person pilot sessions under [playtest/protocol.md](playtest/protocol.md) | A playable build, the owner's approval of consent, access and retention, and people |
| Complete playtest records | BAL-REQ-2 |
| A separate powers-on suite | D10 |
