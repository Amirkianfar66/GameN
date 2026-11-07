# Evidence report: the fix for Supplier's disclosure, 7 October 2026

**Author:** Game Design and Balance (issue [#5](https://github.com/Amirkianfar66/GameN/issues/5)), Claude Code desktop app, model `claude-opus-5-5`.
**Everything below was actually run on 7 October 2026.** The reports carry their own times in UTC, from 2026-10-07 16:58 to 2026-10-07 17:03. Nothing here is a human playtest, and nothing here is a balance result.

This is the current evidence: it describes the fixtures and the tooling that are committed now. Three earlier reports are records: [the defect before the fix](2026-10-07-supplier-disclosure.md), [the report gate](2026-10-07-report-gate.md) and [the baseline of 6 October](2026-10-06-baseline.md).

## The short version

The integration review of 7 October found that the engine never told Supplier which of their weapons were given, which the approved decision V1-16 requires (its finding G17). Backend's fix, draft PR [#65](https://github.com/Amirkianfar66/GameN/pull/65), adds a read of a seat's own acknowledgments. **Against the engine of that PR, through that read and nothing else, the whole catalogue passes and the report gate passes.** The seventeen fixtures that failed before the fix pass, and so does every comparison of what each player may learn, with the real read and the receipts of commands in it. No stand-in is involved.

| What | Passed | Failed | Blocked | Not run |
| --- | --- | --- | --- | --- |
| Workspace verification on this branch (`npm run verify`) | 16 tests and 4 checks | 0 | 0 | 0 |
| Balance static checks on this branch (`npm run check`, with `--allow-missing-overlay`) | 71 | 0 | 0 | 3 |
| Scenarios against the engine with the fix, `096bfa0` | 516 | 0 | 33 | 6 |
| For comparison, the same catalogue against the engine before the fix, `c885624` (the record) | 499 | 17 | 33 | 6 |
| Human playtests | 0 | 0 | 0 | All |

| Check | Result |
| --- | --- |
| The report gate on the three reports | **Passed** |
| Negative controls | 4490 controls, all detected |
| Twenty-seven deliberate leaks, each laid beside the real read | Each caught by a comparison of two runs, with every number of players for which it tells anybody anything. Each of the 63 paired fixtures that say two runs look the same failed for at least one of them |
| Seeded playouts, 200 per mode | 600 finished, no invariant violation, hint mismatch or replay mismatch |

What this does not cover is what the service adds to the read: who may fetch the document, and its survival of reload, retry and seat recovery. Those are Backend's tests, reported in PR #65, and were not run here.

## Pins

| Item | Value |
| --- | --- |
| Repository and branch | `Amirkianfar66/GameN`, `agent/game-balance-supplier-disclosure`, which continues `agent/game-balance-ci-gate` from `e0239bfc80da7645eef5994160a3184132179919` |
| Base commit (`BASE_SHA`) | `333c9e820f362a211352bc689372663f29b73ac4` |
| Commit of the fixtures and tooling that produced the reports | `939d9f8221abf3f7683fcfbd814717198377765d`, clean tree |
| Source manifest SHA-256 | `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc` |
| Owner-decision overlay SHA-256 | `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`, read beside the engine |
| Combined Version 1 manifest SHA-256 | `451fc57ec28355e022d7b2c0d588ae4d92bad876dd841bdf599467ff920eedf2`, read beside the engine. The three hashes are separate pins |
| Rulebook | `rulebook-v1-2026-10-07-r4`, SHA-256 `bb47ff66fed5a07631f5df8b9bd6467e557f35aec019662242325fd9bdc14bd0` |
| Engine under test | Backend's fix for G17: draft PR [#65](https://github.com/Amirkianfar66/GameN/pull/65), commit `096bfa08ea6808977639e21fbdb93353c8b3d6cf`, unmerged. The commit was read from Git in a clean checkout of it. It is the head of that PR; the commit before it, `36525afeb39adb154f11d72731126bdca82f99d7`, has the implementation, and the head adds a document |
| Digest of the built engine and contracts modules | `2117d3b8ed352cb898c78b193fd67f32fd693fe4919e518ed1968f87b8ccc283` |
| Engine, ruleset and protocol as the engine reports them | `full-game-1.0.1`, `in-person-v1-2026-10-06`, protocol 2 |
| Toolchain | Node 22.21.1, npm 10.9.4, macOS |
| Seeds | Scenario setups as in the baseline report. Playouts `walk-1` to `walk-200` per mode |

## 1. Checks on this branch

```sh
npm ci
npm run clean
npm run verify
npm run check --workspace @mothership/balance -- --allow-missing-overlay
```

`npm run verify` passed: toolchain, workspace boundaries, source integrity, typecheck, build, and 16 of 16 bootstrap tests.

The static check passed with the switch: of 74 tests in 5 files 71 passed and 3 were not run, with none failed, cancelled or marked todo. The three are the tests that read the owner-decision file, which is not on a branch without the engine; in a scratch merge with Integration's adoption branch they ran (section 6). Without the switch the command exits 1 on this branch and says why.

## 2. The catalogue against the engine with the fix

The branch of PR #65 was checked out at `096bfa08ea6808977639e21fbdb93353c8b3d6cf` in a throwaway clone outside every worktree, installed with its own lockfile and built. No branch or worktree of the project was changed. Then, from this branch at the clean commit named above:

```sh
npm run engine-gate --workspace @mothership/balance -- --engine-root <checkout> --engine-commit 096bfa08ea6808977639e21fbdb93353c8b3d6cf --playouts-per-mode 200 --out-dir <directory outside both checkouts>
```

**Scenarios.**

| Mode | Total | Passed | Failed | Blocked | Not run |
| --- | --- | --- | --- | --- | --- |
| 7 players | 176 | 163 | 0 | 11 | 2 |
| 8 players | 182 | 169 | 0 | 11 | 2 |
| 9 players | 189 | 176 | 0 | 11 | 2 |
| Unsupported configurations | 8 | 8 | 0 | 0 | 0 |
| All | 555 | 516 | 0 | 33 | 6 |

Artifact: [2026-10-07-fix-scenarios-engine-096bfa0.json](2026-10-07-fix-scenarios-engine-096bfa0.json).

The fixtures that failed before the fix and pass with it:

| Case | Players | What it asks |
| --- | --- | --- |
| `SUP-11` | 7, 8, 9 | When the Supplier stage has resolved, Supplier is shown whom they armed, and nobody before it |
| `SUP-12` | 8, 9 | A recipient eliminated in Round 3 was given nothing, and Supplier is not shown them as armed |
| `SUP-13` | 7, 8, 9 | A Supplier injured in Round 3 after registering is still shown whom they armed |
| `SUP-14` | 9 | An Officer who has fired is still given a weapon, and Supplier is shown the Officer as armed |
| `SUP-16` | 7, 8, 9 | What Supplier is shown after the Supplier stage depends on whom they armed |
| `SUP-24` | 8, 9 | A Supplier eliminated in Round 3 after registering is still shown whom they armed |
| `SUP-25` | 7, 8, 9 | A Supplier voted into Jail in Round 3 after registering is still shown whom they armed |

Every other fixture has the result it had against the engine before the fix. The binding takes whom Supplier armed from `supplierResults` of the seat's own acknowledgments and from nowhere else: nothing is made up from server truth, the action queue or a count of weapons.

Of the fixtures, 66 are paired cases, under 23 case codes: each is run twice with one declared difference, and says to whom the two runs must look the same and to whom they must differ. All but `SUP-16` compare in every phase of a span, and each comparison covers a player's view, the whole of that player's own acknowledgments, and the receipts of that player's own commands. They all pass. So the read tells Supplier whom they armed and nothing about those players; it tells a recipient that they hold a weapon and not who armed them or who else was armed; and it tells nobody else anything, in any phase from Supplier's registration to the last vote of Round 5.

**Negative controls.**

| Mode | Ready scenarios | Controls | Detected | Undetected |
| --- | --- | --- | --- | --- |
| 7 players | 163 | 1419 | 1419 | 0 |
| 8 players | 169 | 1418 | 1418 | 0 |
| 9 players | 176 | 1653 | 1653 | 0 |

Artifact: [2026-10-07-fix-controls-engine-096bfa0.json](2026-10-07-fix-controls-engine-096bfa0.json). Every ready scenario passed unmodified, and every single-expectation change of every one was detected.

**Seeded playouts.**

| Mode | Playouts | Finished | Phases | Commands accepted | Commands refused | Invariant violations | Hint mismatches | Replay mismatches |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 7 players | 200 | 200 | 10108 | 16974 | 17490 | 0 | 0 | 0 |
| 8 players | 200 | 200 | 11230 | 18899 | 21970 | 0 | 0 | 0 |
| 9 players | 200 | 200 | 12314 | 20752 | 27599 | 0 | 0 | 0 |

Artifact: [2026-10-07-fix-playouts-engine-096bfa0.json](2026-10-07-fix-playouts-engine-096bfa0.json). The invariants on every state now look through the acknowledgments as they look through the views: nothing in them changed for another player at a command, and no revision moved without its content.

## 3. The gate on these reports

```text
Balance report gate: PASSED.
  pinned to the candidate commit 939d9f8221abf3f7683fcfbd814717198377765d: every report came from a clean tree at that commit
  engine full-game-1.0.1, ruleset in-person-v1-2026-10-06, protocol 2, commit 096bfa08ea6808977639e21fbdb93353c8b3d6cf
  engine commit: read from Git, head of the engine checkout; build digest 2117d3b8ed352cb8
  working tree 939d9f8221abf3f7683fcfbd814717198377765d
  scenarios: 555 in the catalogue, each reported once; 516 ready and passed; 33 blocked and 6 manual, as in tests/scenarios/v1/exceptions.json
  controls: 1419 + 1418 + 1653 = 4490 executed, all detected
  deliberate leaks: 27 tried, each caught by a comparison with every number of players it names; each of the paired scenarios that claim sameness failed for at least one
  playouts: 200 per mode, all finished, no invariant violation, hint mismatch or replay mismatch
  A pass says the checks ran completely and found nothing. It says nothing about balance or human play.
```

The line about the manifest read "the same in the reports and beside the engine" in the run itself, where the engine's checkout was at hand. A static test holds the three committed reports to the gate on every run and requires this pass.

## 4. The deliberate leaks

A case that says two runs look the same has shown little until it has also been seen to fail. The controls command therefore makes the binding leak, in twenty-seven ways that a private read beside the view, or a receipt, could be built wrongly. Each leak adds one fact to what an audience is given, beside what the engine itself lets it read. Three rules make the result mean something. A leak counts as caught only where a comparison of two runs fails and names who could tell them apart; a case that fails for any other reason counts as a fault of the control. A leak has to be caught with every number of players for which it tells anybody anything. And the other way round: every paired fixture that says two runs look the same has to have failed for at least one leak, or it has not been shown to watch anything. All 63 did. The report gate requires all of this of a controls report.

| The binding was made so that | Caught by | Who could tell the two runs apart |
| --- | --- | --- |
| each recipient is told which seat armed them, which is to say who Supplier is | `SUP-17` (7, 8, 9); `SUP-26` (7, 8, 9) | In `V1-M7-SUP-17`: Hacker, Insider |
| each recipient is told which seat armed them, but only from their own next turn | `SUP-17` (7, 8, 9); `SUP-26` (7, 8, 9) | In `V1-M7-SUP-17`: Hacker |
| each recipient is told who else was armed | `SUP-15` (7, 8, 9); `SUP-20` (7, 8, 9) | In `V1-M7-SUP-15`: Insider |
| the recipient who was named second is told who was named first | `SUP-20` (7, 8, 9) | In `V1-M7-SUP-20`: Insider |
| everyone can read the list of players Supplier armed | `SUP-15` (7, 8, 9); `SUP-20` (7, 8, 9); `SUP-21` (7, 8, 9); `SUP-28` (7, 8, 9) | In `V1-M7-SUP-15`: the table |
| everyone can read how many weapons were given, and nothing about to whom | `SUP-21` (7, 8, 9); `SUP-28` (7, 8, 9) | In `V1-M7-SUP-21`: the table |
| Supplier is told the team of each player they armed | `SUP-22` (7, 8, 9); `SUP-27` (7, 9) | In `V1-M7-SUP-22`: Supplier |
| Supplier is told whether each weapon they gave can be used | `SUP-23` (9) | In `V1-M9-SUP-23`: Supplier |
| everyone can read a mark on each seat that follows the player's team | `SUP-22` (7, 8, 9); `SUP-27` (7, 9); `VIEW-05` (7, 8, 9); `VIEW-06` (8, 9); `VIEW-08` (7, 8, 9); `VIEW-09` (7, 8, 9); `VIEW-10` (7, 8, 9) | In `V1-M7-SUP-22`: the table |
| each Red player is shown who the other Red players are | `SUP-22` (7, 8, 9); `SUP-27` (9); `VIEW-05` (7, 8, 9); `VIEW-06` (8, 9); `VIEW-09` (8, 9); `VIEW-10` (8, 9) | In `V1-M7-SUP-22`: Undercover |
| everyone can read a mark on each seat that follows whether its number is in the Code | `CODE-11` (7, 8, 9); `VIEW-07` (7, 8, 9); `VIEW-08` (7, 8, 9); `VIEW-10` (7, 8, 9) | In `V1-M7-CODE-11`: the table |
| Hacker is told at once whether the Code attempt was right | `CODE-11` (7, 8, 9) | In `V1-M7-CODE-11`: Hacker |
| Supplier is told how many weapons each player they armed then held | `SUP-27` (7, 8, 9) | In `V1-M7-SUP-27`: Supplier |
| from the phase after it happens, Supplier is told which of the players they armed has fired | `SUP-29` (7, 8, 9) | In `V1-M7-SUP-29`: Supplier |
| a recipient is told which seat armed them at the moment they register a shot | `SUP-17` (7, 8, 9) | In `V1-M7-SUP-17`: Insider |
| each recipient is told which seat armed them, from their own Round 5 turn | `SUP-17` (7, 8, 9); `SUP-26` (7, 8, 9) | In `V1-M7-SUP-17`: Insider |
| a recipient who is not Blue is told which seat armed them | `SUP-17` (7, 8, 9); `SUP-26` (7, 8, 9) | In `V1-M7-SUP-17`: Hacker |
| everyone can read a mark on each armed seat whose player is no longer Healthy and free | `SUP-28` (7, 8, 9) | In `V1-M7-SUP-28`: the table |
| during a Jail vote everyone can read how many actions were registered in the round | `SUP-21` (7, 8, 9); `SUP-28` (7, 8, 9) | In `V1-M7-SUP-21`: the table |
| everyone can read a mark on one seat, and it is always the seat of Alien | `VIEW-08` (7, 8, 9); `VIEW-10` (7, 8, 9) | In `V1-M7-VIEW-08`: the table |
| everyone can read a mark on one seat, and it is always the seat of Supplier | `SUP-17` (7, 8, 9); `SUP-26` (7, 8, 9); `VIEW-04` (7, 8, 9); `VIEW-05` (7, 8, 9); `VIEW-08` (8); `VIEW-09` (8) | In `V1-M7-SUP-17`: the table |
| from the phase after the attempt, Alien is told whether the Code attempt was right | `CODE-12` (7, 8, 9); `CODE-13` (7, 8, 9) | In `V1-M7-CODE-12`: Alien |
| from the phase after the attempt, everyone can read that the Code attempt was used | `CODE-13` (7, 8, 9) | In `V1-M7-CODE-13`: the table |
| the receipt of the Code attempt says whether it was right | `CODE-11` (7, 8, 9) | In `V1-M7-CODE-11`: Hacker |
| the receipt of Supplier's choice says which team each named player is on | `SUP-22` (7, 8, 9); `SUP-27` (7, 9) | In `V1-M7-SUP-22`: Supplier |
| from the phase after the grant, a player who was given a Protection is told so | `PROT-09` (7, 8, 9) | In `V1-M7-PROT-09`: Insider, Cracker |
| from the phase after the Scan, a player whom Hacker scanned is told so | `SCAN-08` (7, 8, 9) | In `V1-M7-SCAN-08`: Insider, Cracker |

The last column is from the first comparison that failed in the first fixture that caught the leak, with each seat given as the role that held it in the first run. "The table" is what everyone can read.

None of these runs is evidence about the engine: a run through a leaking binding names the leak in its pins, and the gate accepts no report that carries such a name. They are evidence about the fixtures: that these mistakes, had the real read made them, would have been noticed.

**How the cases came to this.** Run against the same twenty-seven leaks with the tooling of commit `b94a98a`, the paired cases as they first stood on this branch (commit `06e7c01`: `SUP-15`, `SUP-16`, `SUP-17` and `VIEW-04`) caught four, and the cases as they stood at commit `7d63089`, after a first independent reading, caught fifteen. That second state is the one PR #67 adopted. Two of its fifteen, the leaks in receipts, were caught only because the tooling by then compared receipts; at its own commit it did not. The present cases catch all twenty-seven. Those two runs were made once with a scratch script, through the stand-in that was then in use, and their output is not kept as an artifact.

## 5. The contract, against the conditions written before it existed

[Part D of the contract review](../contract-review.md#part-d-the-two-contracts-of-7-october) lists six things the rules require of Supplier's result. They were written before PR #65 was published. The draft holds all six: by its schema, which has no place for the arming seat in a recipient's entry and nothing about a recipient in Supplier's; and by the runs above. Balance asks for no change to it.

## 6. For Integration: what moves when this catalogue is adopted

Integration's PR [#67](https://github.com/Amirkianfar66/GameN/pull/67) adopted the Balance directories as they stood at commit `7d63089`, an intermediate state of this branch with 522 fixtures, and pins them by hash and by count. BAL-REQ-8 asks that the head of this branch be adopted in its place. The values at the commit named above:

| Pinned by PR #67 | Value now |
| --- | --- |
| `mode-7.scenarios.json` | `7362e623e97d85bcb32382cb94991149f28638ae62967db34bc1e9bccc3f7782` |
| `mode-8.scenarios.json` | `a31f78ad73aec5a3ffa1614031b2e4958da139dd7c327f59c183db590b460f71` |
| `mode-9.scenarios.json` | `a4a32ea4b39bf3bfe5c507027843ac976efa8eec999f2a0646c93b6357a9d1f4` |
| `unsupported.scenarios.json` | `f4c4a7c044c4596f4be251c0338aff23daa4f749dff90bb267022d83b706ee9c` |
| `tests/scenarios/v1/catalog.mjs` | `506338169a94d08f189086d59d8c7b984c1012ba4695ce0f09c8d550da3b7a7a` |
| `tests/scenarios/adapters/full-game-v1.mjs` | `9a93ab0a1cffc3c658e1b25d3b537c39407615c9d2baa4db2e23d7a563abc8be` |
| `docs/balance/game-rules.md` | `bb47ff66fed5a07631f5df8b9bd6467e557f35aec019662242325fd9bdc14bd0` |
| Fixtures | 555: 176, 182 and 189 for seven, eight and nine players, and 8 unsupported configurations |
| Ready and passed | 516: 163, 169, 176 and 8 |
| Blocked and manual | 33 and 6, unchanged, and the same cases |
| Control baselines and controls | 508 baselines: 163, 169 and 176. 4490 controls: 1419, 1418 and 1653 |
| Balance static tests | 74 in the five files the guard names, counting the one that binds this report; 73 at the commit named above |

**A rehearsal of that adoption** was made at `939d9f8221abf3f7683fcfbd814717198377765d`, the commit of the fixtures and tooling, in a throwaway clone outside every worktree: this branch merged with the head of PR #67, `f28d3e4`. This report and the test that binds it were committed afterwards and change nothing the rehearsal depends on, except that the static check has one test more.

- **One file conflicts**, the engine binding, which both sides changed. This branch's file contains Integration's patch and was taken. Integration's other change to a Balance-owned file, in `commands.test.mjs`, merged to this branch's file by itself. No file outside the Balance directories differs from the head of PR #67.
- **The static check ran plain**, without the switch: 73 tests, all passed, the three that read the owner-decision file among them. Integration's own static gate read "73 executed, 73 passed".
- **Integration's engine gate stopped at the first pin that has moved**, "Balance gate: reviewed rulebook changed". That is the guard doing its work: its pins are for the catalogue of `7d63089`, and Integration has not reviewed this one.
- **The Balance engine gate passed in the merged tree**, pinned to the merge commit as the candidate, with ten playouts per mode: engine `full-game-1.0.1` with the build digest PR #67 names (`2117d3b8ed352cb8…`), 555 fixtures each reported once, 516 ready and passed, 33 blocked and 6 manual, 4,490 controls detected, 27 leaks caught. So what is left for the adoption is the review and the pins.

## 7. Independent readings

Two readings were made by separate Claude Code agents. Each was given a commit, asked to find its faults and not to take the author's claims on trust, and had a copy of its own to experiment in. Neither is a review by a person.

**The first**, of commit `06e7c01`, found no wrong expected result. It found that a third new rulebook row, which said that what a player is told stays in their view, was a new requirement and not a reading; the row was withdrawn. It found that the first paired cases checked who was armed and not whether anybody was, only the recipient named first, nothing of what Supplier is told about a recipient, and role swaps between two Blue roles only; and that the binding's phase identifiers counted commands, so that two runs could differ for the harness's own reasons. All of it was changed in `ef39487`.

**The second**, of commit `ef39487`, again found no expectation that an engine correct under the approved rules would fail. It tried Backend's proposal as the stand-in models it, and a variant in which other seats have no read at all. It ran the catalogue itself and confirmed the counts of that commit. Its findings, and what was done about each in `b94a98a`:

| Finding | What was done |
| --- | --- |
| Four expectations rested on readings that were not registered: that a recipient is not told who else was armed; that a Supplier who has been Eliminated is still told; that Hacker is not told whether the attempt was right; and that one swap case holds only because Red players do not know each other | Reading D40 registered for the first. Reading D39 widened to say the second openly: it is an argument from V1-16 making no exception. Row R-ROLE-22 added for the third, which follows from V1-08 and V1-18 and which Backend reads the same way. The swap cases now cite R-SETUP-12 |
| Command receipts were never compared. A receipt that said whether the Code attempt was right, or which team Supplier's recipients are on, passed every case | The binding keeps the receipts of each player's commands, and a comparison of two runs includes them. Two leaks in receipts are among the twenty-seven |
| Ten disclosure faults passed every paired case, every other ready fixture and every invariant. Most told somebody a phase or a round later than the moments the cases sampled | A step that compares in every phase of a span, and further cases that vary what the first ones held still. All ten are among the twenty-seven and are caught |
| The check accepted comparisons that could not fail: one that names nobody, one that names a seat outside the match, a twin command equal to the command, a comparison before the two runs differ | Each is refused. None had occurred in a fixture |
| Command identifiers counted every command, so that after a twin run that sends nothing a bystander's later command would differ for the harness's sake. And a swap twin compared on a swapped player's turn compares two different moments | Identifiers count one player's commands. The runner refuses to compare two runs that are not in the same phase |
| Documents claimed more than the fixtures held: "nothing" left unasserted for a weapon and for the Code, swaps with Alien or Undercover called impossible, "at once or later", receipts not named among what is uncovered | Corrected. The audit's table says for each fact what is not asserted, and a section says what a comparison of two runs cannot show |

Both readings were of the cases as they ran through a stand-in, before the fix was known here. The second reading's own run found the same counts at `ef39487` as Integration later reported for `7d63089` against the real read.

**What has not been read independently:** the changes of `b94a98a` themselves, and the binding to the real read in `939d9f8`, apart from the part of it that is Integration's own patch. They are covered by the unit tests, by the negative controls, by the twenty-seven leaks and by the run against the engine of PR #65, and by nothing else.

## 8. Not run

- **Any human playtest.** No session has taken place.
- **Anything on a device or in a browser**, the hosted preview included. Balance did not create or join a hosted match. The preview as deployed predates the fix.
- **What the service adds to the read:** who may fetch the document, reload, retry, seat recovery and the refusal of another or an old identity. Backend reports its emulator tests for these in PR #65.
- **How long Supplier goes on being told.** No source says, so no case asserts it; it is among what Backend tested.
- **The event stream.** The binding reads views, a seat's own acknowledgments and receipts.
- **The lobby identities of PR #64.** They are a document the service writes and the engine does not project, so no scenario can reach them. They were reviewed by reading.
- **The Firebase service, the emulator suites and the Backend package check.**
- **On this branch, the three static tests that read the owner-decision file.** They ran in the scratch merge.
- **The six manual scenarios**, and every scenario for a rule that the traceability table lists as not exercised.
- **A review by a person.** Section 7 is the reading of separate Claude Code agents.
- **Original Powers.** Off everywhere, and outside Version 1.

## Reproducing

```sh
git clone <this repository> <checkout> && git -C <checkout> checkout --detach 096bfa08ea6808977639e21fbdb93353c8b3d6cf
(cd <checkout> && npm ci && npm run build)
npm ci
npm run check --workspace @mothership/balance -- --allow-missing-overlay
npm run engine-gate --workspace @mothership/balance -- --engine-root <checkout> --engine-commit 096bfa08ea6808977639e21fbdb93353c8b3d6cf --playouts-per-mode 200 --out-dir <directory outside both checkouts>
```

The last command exits 0. Against a checkout of the engine before the fix it runs nothing and says that `projectOwnAcknowledgments` is missing: the binding does not run an engine that cannot tell Supplier.
