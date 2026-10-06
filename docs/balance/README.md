# Game Design and Balance

Work for issue [#5](https://github.com/Amirkianfar66/GameN/issues/5): the rules of the in-person Version 1 base game in one place, an audit of where each rule comes from, scenarios that say what an engine must do, and a protocol for testing the game with people.

**What this establishes:** a first rules, scenario and playtest baseline for Version 1.
**What it does not establish:** that the complete game is implemented, or that any mode is balanced. No human playtest has been run.

## Start here

| If you want | Read |
| --- | --- |
| How the game plays, rule by rule | [game-rules.md](game-rules.md) |
| Where each rule comes from, what is undecided, and what follows by counting | [rules-audit-v1.md](rules-audit-v1.md) |
| What has actually been run, and against what | [evidence/2026-10-06-baseline.md](evidence/2026-10-06-baseline.md) |
| What Balance asks of Codex Integration | [integration-requests.md](integration-requests.md), [contract-review.md](contract-review.md) |
| To run a playtest | [playtest/protocol.md](playtest/protocol.md) |

## Every document

| Document | What it is |
| --- | --- |
| [game-rules.md](game-rules.md) | The consolidated rulebook. One row per rule, each with a status and its sources. The single text all four workstreams follow |
| [rules-audit-v1.md](rules-audit-v1.md) | Pins and provenance, how precedence was applied, the decision register D01 to D38, and consequences derived from the rules |
| [invariants.md](invariants.md) | Statements that must hold in every match, with the rule behind each |
| [scenario-traceability.md](scenario-traceability.md) | Generated. Maps the earlier 35 specifications to the Version 1 scenarios, and lists the blocked cases, the scenarios that touch each reading, and the rules without a scenario |
| [contract-review.md](contract-review.md) | Independent review of the shared contracts, the Officer and Protection fixture and Backend's draft engine |
| [integration-requests.md](integration-requests.md) | The exact shared changes requested |
| [telemetry-spec.md](telemetry-spec.md), [telemetry-export.schema.json](telemetry-export.schema.json) | The restricted post-match research record |
| [playtest/](playtest/) | Protocol, facilitator form, participant questionnaire, rule problem log, analysis plan and a blank record |
| [evidence/](evidence/) | Reports of actual runs, with their pins |
| [rules-audit.md](rules-audit.md), [scenario-matrix.json](scenario-matrix.json) | The audit and matrix of 26 September 2026. Pinned by the bootstrap source lock and unchanged. Superseded for Version 1 by the files above |

Code and fixtures:

| Path | What it is |
| --- | --- |
| `tests/scenarios/v1/mode-7.scenarios.json`, `mode-8…`, `mode-9…` | The scenario fixtures, one file per mode |
| `tests/scenarios/v1/unsupported.scenarios.json` | Configurations the rules do not allow |
| `tests/scenarios/v1/catalog.mjs` | The authoring source of those files |
| `tests/scenarios/v1/exceptions.json` | The reviewed list of the fixtures that are blocked or manual, each with its decision and its reason |
| `tests/scenarios/*.test.mjs` | Static checks of sources, rulebook, scenarios, tooling and the report gate |
| `tests/scenarios/adapters/full-game-v1.mjs` | The binding to Backend's engine API |
| `tools/balance/src/` | Runner, invariants, report gate, rulebook parser, statistics and record validator |

## Commands

Run from the repository root with Node 22.21.1 and npm 10.9.4, after `npm ci`.

| Command | What it does |
| --- | --- |
| `npm run check --workspace @mothership/balance` | Static checks. Needs no engine. Verifies hashes, every rule citation, the decision register, the scenario files, the exception list and the numbers quoted in the documents. Fails unless every test file ran a test, every started test finished, and nothing failed, was cancelled, was skipped or was marked todo. **On a branch without the engine add `-- --allow-missing-overlay`**: see below |
| `npm run scenarios --workspace @mothership/balance` | Executes the scenarios against the engine of this checkout. Add `-- --engine-root <dir>` for a built copy of another commit, and `-- --out <file>` to write a report |
| `npm run walk --workspace @mothership/balance -- --engine-root <dir>` | Seeded random playouts with the invariants checked after every transition |
| `npm run controls --workspace @mothership/balance -- --engine-root <dir>` | Negative controls: changes one expectation at a time and requires the run to fail. The command itself fails if any ready scenario does not pass unmodified, if a control is missed, or if no control ran |
| `npm run gate --workspace @mothership/balance -- --scenarios <file> --controls <file> --playouts <file> --engine-commit <sha> --playouts-per-mode <n>` | The report gate. Executes nothing. Decides whether three reports are a complete and clean run against that engine: every fixture once, every ready case passed, the exceptions exactly the reviewed ones, every control and playout run, and the same engine, fixtures and rule sources in all three |
| `npm run engine-gate --workspace @mothership/balance` | The three engine commands and then the gate, as one command for a merge gate. Needs the engine in the checkout and a clean commit |
| `npm run facts --workspace @mothership/balance` | Prints the arithmetic quoted in the audit |
| `npm run materialize --workspace @mothership/balance` | Rewrites the scenario files from the catalogue |
| `npm run traceability --workspace @mothership/balance` | Rewrites the traceability table |

At the bootstrap baseline the engine package has no rules in it, so `npm run scenarios` executes nothing and reports every ready scenario as **not run**. That is the correct result at this commit and is not a pass. These commands are not yet part of `npm run verify`; see request BAL-REQ-1.

**The static check on a branch without the engine.** Three tests compare the rulebook with the owner-decision file, `rules/overlays/in-person-v1-owner-decisions-2026-10-06.json`. That file arrives with the engine and is not on this branch. The tests skip, and a skipped test is a failure of the check: it has shown nothing. So here the command is

```sh
npm run check --workspace @mothership/balance -- --allow-missing-overlay
```

which accepts exactly those three as **not run**, names them, and still fails on any other skip. In a checkout that contains the engine the plain command runs all of them, and the switch is refused.

**Exit status, for use as a gate.** `scenarios`, `controls` and `walk` exit 1 when something they executed went wrong: a failed scenario, a ready scenario that does not pass before its controls are tried, a missed control, an invariant violation, an unfinished playout. When no engine is available they print NOT RUN and exit 0, which suits a commit that has no engine. Add `-- --require-engine` wherever the command is a gate: then a run that executed nothing exits 2 and cannot be mistaken for a pass.

**The report gate.** An exit status of 0 says that a command found nothing wrong in what it did. It does not say that it did everything, or against which engine. `gate` reads the reports the three commands write with `-- --out <file>` and exits 0 only when together they are complete, clean and about one engine at one commit; otherwise it exits 1 and names every problem. A fixture counts as an exception only if [`tests/scenarios/v1/exceptions.json`](../../tests/scenarios/v1/exceptions.json) lists it with the same status and decision.

The gate wants commits it can trust. The working tree must be a clean commit, and the engine commit must have been read from Git: from this checkout, or from the engine's own checkout when `--engine-root` names one. An engine in an exported archive has no Git to read, and its commit can only be stated; that, like uncommitted changes, is accepted only with `--allow-unpinned-tree`, and the result is then called a trial and never a pass for a merge. Every command refuses an option it does not know, an option without its value and an option given twice, so that a typing mistake cannot switch a check off.

The gate holds the reports against the catalogue of the same commit. It cannot tell a reviewed change to the catalogue or the exception list from an unreviewed one; the diff shows that, and request BAL-REQ-1 says how. A pass says the checks ran completely and found nothing; it says nothing about balance or human play.

## How to read a status

A scenario is **ready** when its expected result follows from decided rules. It is **blocked** when it waits for an owner decision; a blocked scenario asserts nothing. It is **manual** when the evidence has to come from the service, the screen or people.

A rule is decided when an approved source states it or when it follows from the approved sources. Seventeen rules rest on one of sixteen readings: what the sources say when read closely, although no one sentence says it. No approval is asked for a reading. A ready scenario may rest on one, and then says so: its `ruleRefs` or `dependsOn` name the rule, and the traceability page lists every scenario that touches each reading.

A run reports four separate numbers: **passed**, **failed**, **blocked** and **not run**. Only an executed scenario whose every expectation held is passed. Blocked and not-run are never added to it.

## Changing the rules

The owner decides rules. Codex Integration owns the files under `rules/`. Balance maintains the rulebook and the scenarios, and changes them only after a decision is recorded. See section 22 of the rulebook.
