# Game Balance requests to Codex Integration

**From:** Game Design and Balance (issue [#5](https://github.com/Amirkianfar66/GameN/issues/5)). **For:** Codex Astra, Backend and Integration.
**Base:** `BASE_SHA` `333c9e820f362a211352bc689372663f29b73ac4`. **Date:** 6 October 2026. BAL-REQ-1 was rewritten on 7 October 2026, after the follow-up review, Backend's reconciliation and Integration's draft adoption in PR #47, and [where each request stands](#where-each-request-stands) was added. BAL-REQ-8 and BAL-REQ-9 were added the same day, after the integration review of 7 October.

Codex owns the engine, the shared contracts, the files under `rules/`, the root manifests, the lockfile and CI. Balance has changed none of them. This document lists the exact changes Balance asks for. Contract findings are in [contract-review.md](contract-review.md). Rule questions go to the game owner, not to Codex; they are in the decision register in [rules-audit-v1.md](rules-audit-v1.md#decision-register).

| ID | Request | Blocks | New dependencies |
| --- | --- | --- | --- |
| [BAL-REQ-1](#bal-req-1) | Require the Balance checks in CI. Answered by Integration's draft PR #47 | Nothing further | None |
| [BAL-REQ-2](#bal-req-2) | A private post-match research export | Complete playtest records | None |
| [BAL-REQ-3](#bal-req-3) | Point every agent at the rulebook, and carry the nine open rule edges in the current register | One rule text for all four workstreams | None |
| [BAL-REQ-4](#bal-req-4) | A supported test surface on the engine | Scenario runs that survive engine refactoring | None |
| [BAL-REQ-5](#bal-req-5) | Withdrawn: a ruleset pin that covers the baseline sources | Nothing | None |
| [BAL-REQ-6](#bal-req-6) | A decision on the three pinned Balance documents | Keeping the brief and the earlier audit current | None |
| [BAL-REQ-7](#bal-req-7) | One contract request from the review | Projection tests | None |
| [BAL-REQ-8](#bal-req-8) | For the fix of G17: tell Balance the read that carries Supplier's result, and adopt the new catalogue together with the fix | Seventeen fixtures that fail until Supplier is told | None |
| [BAL-REQ-9](#bal-req-9) | For names and characters: a decision record the rulebook can cite, and the read that carries them | One rulebook row; watching the new facts | None |

Nothing here adds a package. `tools/balance` keeps its two workspace dependencies and its source imports nothing else, so the workspace guard passes unchanged.

## BAL-REQ-1

**Require the Balance checks in CI. Answered by Integration's draft adoption, PR #47. Nothing further is asked.**

Backend's reconciliation (PR [#39](https://github.com/Amirkianfar66/GameN/pull/39), `docs/backend/v1-request-reconciliation.md` at `e6923b3ffd6f47beb3b7a5963ce5f423c7b08e8e`) accepted this request once the corrections for R1 and R2 were reviewed, and listed what a report gate must enforce beyond the exit status of each command. The follow-up review of 6 October recorded R1 and R2 as resolved at `a3898b83deaf19f25e83436b1b18856520b27876`.

Integration has since written the adoption itself: draft PR [#47](https://github.com/Amirkianfar66/GameN/pull/47), `codex/v1-balance-ci-adoption` at `40e47f060521276672c8ee6312e122ce37566d8a`, on the landing candidate. It imports the reviewed Balance commit unchanged and makes `npm run verify` run two more steps: `test:balance`, the static check, and `test:scenarios`, which runs the scenarios, the negative controls and ten playouts per mode with `--require-engine` at the checkout's own commit and then validates the fresh reports. That is what this request asked for, and it is Integration's to review and merge. The root scripts an earlier draft of this request suggested are withdrawn in its favour.

Integration's guard and Balance's commands are two layers, and they check differently.

| Backend's plan asks for | Integration's guard, PR #47 | Balance's own commands, this branch |
| --- | --- | --- |
| The corrections for R1 and R2 and their regressions | Runs the Balance static check, which contains them | The regressions: every kept participant needs consent and a pseudonym, and the controls command fails when a baseline does not pass |
| Static check: a positive test count; no failure, skip, todo or cancellation; materialization and traceability match | Requires the five test files and the two checkers to exist, the command to exit 0, and reads the TAP totals of its output | `npm run check` itself now fails on a skip, a todo, a cancellation, a file that ran no test, a test that was started and never finished, and a test file it would not run. It reads the runner's events, because the totals of `node --test` do not show a skipped suite, a file without tests or a file that ends the process early |
| Scenarios: an available engine at the exact commit; every ready scenario executed; passes in each mode; every catalogue identifier exactly once | One result for every identifier of the pinned catalogue, with its group, mode, status, decisions, seed and reason; no failure, no invariant violation; the exact totals of each group; execution in every mode | `gate`: the same, read from the catalogue and the exception list of the checkout, with no number pinned |
| Blocked and manual exceptions against a reviewed list | Its own list of the eleven blocked and two manual cases per mode, with their decisions and reasons | `tests/scenarios/v1/exceptions.json`, held against the catalogue by the static check and by `gate` |
| Controls: every baseline accounted for, every control executed, none undetected | The exact reviewed counts for each mode, the verdict and two empty lists | `gate`: baselines counted and controls generated from the catalogue, compared with the report |
| Playouts: exactly ten per mode, all finished, no mismatch | Exactly ten, with the reviewed policy and seed labels | `gate`: exactly the number it is told; the playout command refuses to run none |
| Reports that identify the engine commit and the source and fixture hashes; fail on mismatched pins and on an unexpected tree | A clean checkout at its own commit, the pinned Node version, and the scenario files, catalogue source, rulebook, owner-decision file, both manifests and rule sources by hash | The same pins in all three reports, with the combined manifest and one digest of the built engine modules. The engine commit is read from Git, and a commit on the command line that contradicts the checkout stops the command. Every command refuses an option it does not know |

**Integration's guard is the gate for a merge.** It pins the numbers and the hashes in a file that Balance does not own, so a change to the catalogue cannot pass until Integration has reviewed it and moved the pins. That is a protection the Balance side cannot give itself: its own gate reads the catalogue and the exception list of the same commit, and cannot tell a reviewed change to them from an unreviewed one. A ready case that is deleted, emptied of its expectations, or moved to manual together with its line in the list leaves nothing for it to find.

**Balance's gate is the instrument for everything outside that.** It checks a run against an engine in another checkout, which is how evidence about a candidate is produced before the candidate is merged. It is run on the committed evidence by every static check, so that evidence cannot outlive the fixtures, the exception list, the rulebook or the rule sources it was produced from. And it carries no number that has to be moved by hand.

**This branch fits PR #47 as it is.** Merged with the head of PR #47 in a scratch clone, without conflict and with no file outside the Balance directories changed, Integration's own `npm run verify` passed unchanged: its static gate read 62 tests, all passed and none skipped, and its engine gate accepted the three reports. Two things were adapted here so that it would: the strict runner writes TAP when its output is captured, as `node --test` does, and the gate tests live in the five test files that Integration's guard names. The [evidence report of 7 October](evidence/2026-10-07-report-gate.md) has the run.

Three notes for Integration, none of them a request:

1. On a branch without the engine, three static tests cannot run, because the owner-decision file they read arrives with the engine. They skip by name, the check fails on a skip, and `-- --allow-missing-overlay` accepts exactly those three as not run. In the landing candidate the file is present, all of them run, and the switch is refused. PR #47 needs neither the switch nor a change.
2. The exception list here and the list in `scripts/test-balance-reports.mjs` say the same thing today: 33 blocked and 6 manual fixtures. When the owner decides a rule edge, Balance changes its catalogue and its list, and Integration's pins then fail until they are reviewed and moved. That is the intended order.
3. A pass of either gate is not a statement about balance. It says the checks ran completely against the named engine and found nothing.

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

Requested addition to the current decision register (`docs/backend/v1-decision-register.md` on PR #16, or wherever the register lives after integration): the nine open rule edges D11, D12, D16 to D20, D34 and D35, or one row linking to their consolidated sheet in the Balance audit. V1-01 to V1-21 are approved and nothing here reopens them. The edges lie outside those decisions: no approved source answers them, and for seven of them the build already behaves one way. Recording them where implementation choices are tracked keeps a build's behaviour from being mistaken for canon. The seventeen readings in the Balance register ask for nothing and need no row.

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

## BAL-REQ-8

**For the fix of G17: tell Balance the read that carries Supplier's result, and adopt the new catalogue together with the fix.**

The integration review of 7 October asks Balance to cover Supplier's result and the adoption of the contract that will carry it. The coverage is written: [contract-review.md](contract-review.md#part-d-the-two-contracts-now-being-prepared) lists what the rules require, and the catalogue has the cases. Seventeen of them fail against every current engine, because the engine tells Supplier nothing. That is the finding, shown by the catalogue. They will pass when the fix is in and the binding reads it.

Two things are asked, and neither is a contract design.

1. **The name and shape of the read, when Backend has chosen them.** Backend proposes a read of a seat's own acknowledgments beside the protocol-2 view. Balance's binding to the engine, `tests/scenarios/adapters/full-game-v1.mjs`, is where it is taken up, in two places that are marked there: the list of players Supplier is shown as armed, and the whole of what a seat can read beside its view, which every comparison of audiences then covers. Until then the binding reports, truthfully, that the engine tells the player nothing. If the result is put into the view itself under a new wire version, the paired cases need no binding at all.
2. **Adopt this catalogue in the change that fixes G17, not before.** The catalogue has 47 more fixtures and the rulebook two more rows, so every hash and count that PR #47 pins has to move: the four scenario files, the catalogue source, the rulebook, the totals of each group and the numbers of baselines and controls. That is the intended order, and the pins are Integration's to move after review. The evidence report gives the new values. Adopted before the fix, the guard would be red for a defect that is already known; adopted with it, a green guard means Supplier is told.

Until the fix exists, the cases were validated another way, so that Backend is not handed tests that cannot pass. A stand-in adds the missing disclosure on top of the real engine, from the engine's own truth, and through it every ready case passes and every control is detected; made to leak in twelve ways, it is caught each time, with every number of players for which the leak tells anybody anything. It is described in [tests/scenarios/README.md](../../tests/scenarios/README.md#paired-cases-and-the-stand-in), its runs are labelled, and the report gate refuses them as evidence about an engine.

## BAL-REQ-9

**For names and characters in the lobby: a decision record the rulebook can cite, and the read that carries them.**

The owner approved the comic-board direction on 7 October, with nine characters as the playing pieces, shown with the seat number and the player's name. Designer recorded the decisions in `docs/design/owner-decisions.md` (PR #57) and asks Integration to enter them in the decision register (DSN-REQ-7). The integration review says how: the original register is locked, so a newer decision record is added, or a reviewed lock update is made.

1. **When that record exists, tell Balance its path.** The rulebook says each player has a public number "shown by a numbered seat card and a neutral numbered token" (R-SETUP-06). The approved direction replaces the token with a character and a name. Balance will add the row then, citing the record, and not before: the rulebook cites sources and does not make them.
2. **When the contract exists, tell Balance where a seat's name and character are read.** The conditions the rules put on them are in [contract-review.md](contract-review.md#names-and-characters-in-the-lobby). The cases that watch them, `VIEW-04` to `VIEW-07`, compare everything the binding reads for the table and for every player, so they need the binding to carry any new read.
3. **Keep the typed name out of every research record.** It is free text from a person. The record validator now refuses it under three likely field names; the export of BAL-REQ-2 should not carry it under any.

## Where each request stands

Backend answered every request in its reconciliation (PR [#39](https://github.com/Amirkianfar66/GameN/pull/39) at `e6923b3ffd6f47beb3b7a5963ce5f423c7b08e8e`, a draft, unmerged). The middle column is that document's disposition in short; its own wording is the authority.

| Request | Backend's disposition | Balance's position now |
| --- | --- | --- |
| BAL-REQ-1 | Accepted as an additive integration change after review of R1 and R2, with a plan and the assertions a report gate must make. Integration then wrote the adoption itself: draft PR [#47](https://github.com/Amirkianfar66/GameN/pull/47) | Answered by PR #47, which is Integration's to review and merge. This branch hardens the Balance commands beneath it and passes its verification unchanged |
| BAL-REQ-2, BAL-C13 | A separate Backend and privacy design. Only after a match has finished or been aborted, for an authorized facilitator or researcher, with no identifier, free text or Hack content. Consent, access and retention need the owner's approval first. Incomplete records stay possible | Agreed. Nothing further is asked now. The playtest protocol already waits for the same approval |
| BAL-REQ-3 | A reviewed pointer is supported while source precedence is kept. The reconciliation triages the open edges itself and asks no blanket approval of readings | Its table of open edges lists the same nine, D11, D12, D16 to D20, D34 and D35, and describes the build's present behaviour as the Balance probes recorded it. Once it is merged, the second half of this request is met. The pointer in `AGENTS.md` stays a proposal for a focused integration change |
| BAL-REQ-4 | Five engine functions are the surface in use. A test-only observation contract, or stated field stability, is to be reviewed before the mapping is promised to survive refactoring | Open. Until then the binding keeps its mapping, and the engine gate shows at once when a refactoring breaks it |
| BAL-REQ-5, BAL-C03 | The three hashes stay separate; a future composite pin would be versioned | Withdrawn, as before. Balance reports now record all three, separately |
| BAL-REQ-6 | The earlier audit, matrix and brief stay frozen, with the Version 1 documents beside them | Answered. Balance keeps them byte-identical and checks that it does |
| BAL-REQ-7, BAL-C01 | Answered by the protocol-2 clarification; Balance's current re-review required | Done: Part C of the contract review, in the reviewed commit. Closed |
| BAL-REQ-7, BAL-C02 | A proposal for focused schema and projection hardening. No defect in a connected projection was demonstrated | Agreed that none was demonstrated. It stays a proposal |
| BAL-C12 | The Hack partner is private to the two participants on the wire. A public field would need an approved disclosure and a protocol review | Answered: private on purpose. No change is asked |
| BAL-C15, BAL-C16, BAL-C17 | Advisory follow-ups. No new canon follows from them | Agreed |
| BAL-REQ-8, BAL-REQ-9 | Not yet answered: added on 7 October, after the integration review of that day | Open |

## What Balance does next, and what it waits for

| Next | Waits for |
| --- | --- |
| Bind the read that carries Supplier's result, and run the catalogue against the fix | Backend's fix for G17 and BAL-REQ-8 |
| Add the rulebook row for names and characters, and bind their read | The decision record and the contract of BAL-REQ-9 |
| Re-run the engine gate against the engine as merged, and commit the report | The landing candidate on the default branch |
| Turn a blocked scenario into a ready one, with a new rulebook version | An owner decision on that D number |
| First in-person pilot sessions under [playtest/protocol.md](playtest/protocol.md) | A playable build, the owner's approval of consent, access and retention, and people |
| Complete playtest records | BAL-REQ-2 |
| A separate powers-on suite | D10 |
