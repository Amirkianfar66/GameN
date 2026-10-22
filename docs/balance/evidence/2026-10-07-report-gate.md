# Evidence report: the report gate, 7 October 2026

> **A record, not the current evidence.** This report describes runs against the catalogue of commit `e0239bf`: 470 fixtures. The catalogue has since grown, so the static check no longer holds these three reports to the gate against the committed fixtures, and the command in section 3 now reports that the scenario files have changed. The check still verifies that this prose repeats its artifacts. The current evidence is the newest report in this directory.

**Author:** Game Design and Balance (issue [#5](https://github.com/Amirkianfar66/GameN/issues/5)), Claude Code desktop app, model `claude-opus-5-5`.
**Everything below was actually run on 7 October 2026, local time.** The reports carry their own times in UTC, which read 2026-10-06 23:26 to 2026-10-06 23:28. Nothing here is a human playtest, and nothing here is a balance result.

This report stands beside [the baseline of 6 October](2026-10-06-baseline.md) and does not replace it. No rule, rulebook row, scenario or expectation changed between the two: the four scenario files, the rulebook and the rule sources have the same hashes in both. Three things are new. The engine under test is the landing candidate. Every report now carries the full set of pins. And a gate holds the three reports against the catalogue, the reviewed exception list, the files on disk and each other.

## The short version

| What | Passed | Failed | Blocked | Not run |
| --- | --- | --- | --- | --- |
| Workspace verification on this branch (`npm run verify`) | 16 tests and 4 checks | 0 | 0 | 0 |
| Balance static checks on this branch (`npm run check`, with `--allow-missing-overlay`) | 59 | 0 | 0 | 3 |
| The same static checks in a scratch merge with the landing candidate, where all of them can run | 62 | 0 | 0 | 0 |
| Scenarios against the engine of the landing candidate `71dfd02` | 431 | 0 | 33 | 6 |
| The same scenarios in the scratch merge, on the merge's own engine | 431 | 0 | 33 | 6 |
| Human playtests | 0 | 0 | 0 | All |

| Gate | Result |
| --- | --- |
| The report gate on the three reports committed with this document | Passed. No problem named |
| Copies of those reports, each wrong in one respect, and the gate told to expect something else: sixteen cases | Refused in every case, with the problem named |
| The engine gate in the scratch merge, ten playouts per mode, as CI would run it | Passed |
| The engine gate there with its reports written inside the checkout | Refused, as its own description says it will be |
| Integration's own verification, draft PR #47, on a scratch merge with this branch | Passed unchanged. Section 6 |
| An independent attempt to make the gate pass when it should not | Ten defects found at its edges; all fixed, with regressions. Section 7 |

The 431 passes are against an unmerged candidate, once built in a throwaway checkout of it and once in a scratch merge. They are evidence about that candidate, not about anything that is merged. A pass of the gate says that the checks ran completely against the named engine and found nothing. It is not a statement about balance.

The three static tests that are not run on this branch read the owner-decision file, which arrives with the engine and is not here. Until this revision they returned early and were counted as passed. They now skip by name, the check fails on a skip, and the switch accepts exactly those three. In the scratch merge the file is present and all of them ran.

## Pins

| Item | Value |
| --- | --- |
| Repository and branch | `Amirkianfar66/GameN`, `agent/game-balance-ci-gate`, which continues `agent/game-balance-baseline` from the reviewed commit `a3898b83deaf19f25e83436b1b18856520b27876` |
| Base commit (`BASE_SHA`) | `333c9e820f362a211352bc689372663f29b73ac4` |
| Commit of the fixtures and tooling that produced the three reports | `fc42c4c8482334875c571c883badd29aeeca0654`, clean tree |
| Source manifest SHA-256 | `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc` |
| Owner-decision overlay SHA-256 | `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`, read beside the engine |
| Combined Version 1 manifest SHA-256 | `451fc57ec28355e022d7b2c0d588ae4d92bad876dd841bdf599467ff920eedf2`, read beside the engine. The three hashes are separate pins |
| Rulebook | `rulebook-v1-2026-10-06-r3`, SHA-256 `0b58e8b677b95dbc092b65f0e60b6b79802b60931849c5555da3a3dbdbffb190` |
| Engine under test | The consolidated landing candidate, draft PR [#37](https://github.com/Amirkianfar66/GameN/pull/37), commit `71dfd0277c6ccc4a5dd78b9702face98a46310b8`, unmerged. The commit was read from Git in a clean checkout of it, not only stated |
| Digest of the built engine and contracts modules | `6f235aff92dd4c0775e388e5436301e32a22441336b15e28b3514b60b3470826`, the same in all three reports. The build of commit `8d4a2e5` that the baseline report used has the same digest |
| Engine, ruleset and protocol as the engine reports them | `full-game-1.0.0`, `in-person-v1-2026-10-06`, protocol 2 |
| Toolchain | Node 22.21.1, npm 10.9.4, macOS |
| Seeds | Scenario setups as in the baseline report. Playouts `walk-1` to `walk-200` per mode in the committed reports, and `walk-1` to `walk-10` per mode in the rehearsal |

The hashes of the seven rule sources and of the four scenario files are in each of the three reports. `npm run check` fails if a scenario file, the rulebook or a rule source changes after this evidence was produced.

## 1. Checks on this branch

```sh
npm ci
npm run clean
npm run verify
npm run check --workspace @mothership/balance -- --allow-missing-overlay
```

`npm run verify` passed: toolchain, workspace boundaries, source integrity, typecheck, build, and 16 of 16 bootstrap tests. `tools/balance` keeps its two workspace dependencies, and its source imports nothing else.

The static check passed with the switch: the scenario files equal the catalogue, the traceability table is current, and of 62 tests in 5 files 59 passed and 3 were not run, with none failed, cancelled or marked todo. Without the switch the command exits 1 on this branch and names the three tests and the switch; that is intended. The same was run from an exported archive of the branch without Git, which is how the integration review runs it, with the same result.

These checks need no engine and execute no scenario.

## 2. The engine-backed run against the landing candidate

The candidate was checked out at `71dfd0277c6ccc4a5dd78b9702face98a46310b8` in a throwaway clone outside every worktree, installed with its own lockfile (`npm ci`, 886 packages) and built with `npm run build`. No branch or worktree of the project was changed. Then, from this branch at the clean commit named above:

```sh
npm run engine-gate --workspace @mothership/balance -- --engine-root <checkout> --engine-commit 71dfd0277c6ccc4a5dd78b9702face98a46310b8 --playouts-per-mode 200 --out-dir <directory outside the checkout>
```

That one command ran the three engine commands with `--require-engine` and then the gate. It took 5 minutes 7 seconds. The engine commit was read from that checkout, which was clean; the commit on the command line had to agree with it and did.

**Scenarios.**

| Mode | Total | Passed | Failed | Blocked | Not run |
| --- | --- | --- | --- | --- | --- |
| 7 players | 151 | 138 | 0 | 11 | 2 |
| 8 players | 153 | 140 | 0 | 11 | 2 |
| 9 players | 158 | 145 | 0 | 11 | 2 |
| Unsupported configurations | 8 | 8 | 0 | 0 | 0 |
| All | 470 | 431 | 0 | 33 | 6 |

Artifact: [2026-10-07-scenarios-engine-71dfd02.json](2026-10-07-scenarios-engine-71dfd02.json), one entry per scenario. The runs made 10,990 phase closures and 2,252 commands. What passed, blocked and not run mean is in the baseline report and has not changed.

Every one of the 470 results equals the result of 6 October against commit `8d4a2e5`: the same status, the same reason, the same observations in the blocked cases, and the same numbers of phase closures and commands. It was compared entry by entry, not assumed, and it is what one would expect of two builds with the same digest. The six probes of the open rule edges observed what they observed then; the table is in section 5 of the baseline report.

**Negative controls.**

| Mode | Ready scenarios | Controls | Detected | Undetected |
| --- | --- | --- | --- | --- |
| 7 players | 138 | 1316 | 1316 | 0 |
| 8 players | 140 | 1296 | 1296 | 0 |
| 9 players | 145 | 1518 | 1518 | 0 |

Artifact: [2026-10-07-controls-engine-71dfd02.json](2026-10-07-controls-engine-71dfd02.json). 4130 controls, all detected, and every ready scenario passed unmodified first. This is evidence about the fixtures and the runner, not about the engine.

**Seeded playouts.**

| Mode | Playouts | Finished | Phases | Commands accepted | Commands refused | Invariant violations | Hint mismatches | Replay mismatches |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 7 players | 200 | 200 | 10108 | 16974 | 17490 | 0 | 0 | 0 |
| 8 players | 200 | 200 | 11230 | 18899 | 21970 | 0 | 0 | 0 |
| 9 players | 200 | 200 | 12314 | 20752 | 27599 | 0 | 0 | 0 |

Artifact: [2026-10-07-playouts-engine-71dfd02.json](2026-10-07-playouts-engine-71dfd02.json). 600 playouts under a random policy, each run twice. How often a random policy reaches an outcome is still not recorded, on purpose: it would look like a win rate and would mean nothing.

## 3. The gate on these reports

```text
Balance report gate: PASSED.
  pinned to the candidate commit fc42c4c8482334875c571c883badd29aeeca0654: every report came from a clean tree at that commit
  engine full-game-1.0.0, ruleset in-person-v1-2026-10-06, protocol 2, commit 71dfd0277c6ccc4a5dd78b9702face98a46310b8
  engine commit: read from Git, head of the engine checkout; build digest 6f235aff92dd4c07
  working tree fc42c4c8482334875c571c883badd29aeeca0654
  scenarios: 470 in the catalogue, each reported once; 431 ready and passed; 33 blocked and 6 manual, as in tests/scenarios/v1/exceptions.json
  controls: 1316 + 1296 + 1518 = 4130 executed, all detected
  playouts: 200 per mode, all finished, no invariant violation, hint mismatch or replay mismatch
  combined Version 1 manifest: the same in the reports and beside the engine
  A pass says the checks ran completely and found nothing. It says nothing about balance or human play.
```

To check the committed reports again later, without the engine's checkout:

```sh
npm run gate --workspace @mothership/balance -- --scenarios docs/balance/evidence/2026-10-07-scenarios-engine-71dfd02.json --controls docs/balance/evidence/2026-10-07-controls-engine-71dfd02.json --playouts docs/balance/evidence/2026-10-07-playouts-engine-71dfd02.json --engine-commit 71dfd0277c6ccc4a5dd78b9702face98a46310b8 --playouts-per-mode 200
```

`npm run check` does the same on every run. Without the engine's checkout the gate cannot hash the combined manifest itself, and says so; the three reports must still carry it and agree.

## 4. What the gate refused

The static tests give the gate one wrong report at a time, written from the catalogue. The cases below were run as well, on copies of the three real reports, so that the refusals are shown on what the commands really write. Each copy differs from the real report in the one respect named, or the gate was told to expect something else.

| Case | Exit status | What the gate named |
| --- | --- | --- |
| The three reports as written | 0 | Nothing: passed |
| The gate told to expect the engine at commit `8d4a2e5` | 1 | scenarios: the engine commit is `71dfd02`, not `8d4a2e5`; controls: the engine commit is `71dfd02`, not `8d4a2e5`; and 1 more |
| The gate told to require ten playouts per mode | 1 | playouts: 200 playouts per mode were asked for, 10 are required; playouts: 7 players: 200 playouts executed, 10 required; and 2 more |
| The gate told to expect the working tree at `a3898b8` | 1 | scenarios: the working tree is `fc42c4c`, not the clean candidate `a3898b8`; controls: the working tree is `fc42c4c`, not the clean candidate `a3898b8`; and 1 more |
| One ready case changed to failed | 1 | scenarios: V1-M7-SETUP-01 is ready and was failed; scenarios: the totals do not match the runs |
| One ready case removed | 1 | scenarios: V1-M7-SETUP-01 is missing from the report; scenarios: the totals do not match the runs |
| One passed case given a failure, its status left as passed | 1 | scenarios: V1-M7-SETUP-01 is reported passed and carries a failure, a reason or an invariant violation |
| One blocked case changed to passed | 1 | scenarios: V1-M7-FLOW-07 is blocked and was reported passed; scenarios: the totals do not match the runs |
| One control fewer for nine players | 1 | controls: 9 players: 1517 controls executed, 1518 generated from the catalogue |
| One control changed to not detected | 1 | controls: the run's own verdict is failed; controls: the list of controls that were not detected has 1 entry; and 2 more |
| One replay mismatch for seven players | 1 | playouts: 7 players: replay mismatches: 1 |
| One playout unfinished for eight players | 1 | playouts: 8 players: 199 of 200 playouts finished; playouts: 8 players: unfinished playouts are reported |
| Every report said to come from a tree with uncommitted changes | 1 | scenarios: the working tree is `fc42c4c` plus uncommitted changes, not the clean candidate `fc42c4c`; controls: the working tree is `fc42c4c` plus uncommitted changes, not the clean candidate `fc42c4c`; and 1 more |
| Another hash for one scenario file | 1 | scenarios: the scenario files differ from the files on disk |
| The engine commit recorded as stated and not read from Git | 1 | scenarios: the engine commit was only stated on the command line: the engine was not in a Git checkout that it could be read from; controls: the engine commit was only stated on the command line: the engine was not in a Git checkout that it could be read from; and 1 more |
| No combined manifest in any of the three | 1 | scenarios: the combined Version 1 manifest was not found beside the engine; controls: the combined Version 1 manifest was not found beside the engine; and 1 more |
| The controls report of another run, made from a tree with uncommitted changes | 1 | controls: the working tree is `5c18377` plus uncommitted changes, not the clean candidate `fc42c4c`; controls: not the same working tree as the scenario report |

The committed reports of 6 October do not pass the gate either, and should not: they predate the pins.

## 5. Rehearsal of the CI sequence in a scratch merge

Backend's plan runs the Balance commands from a clean, committed, combined candidate. To rehearse that, this branch at `aef75fbd55d9637f73a599cb592fe365616fc0ae` was merged with the landing candidate in a throwaway clone outside every worktree, with a real merge commit, so that Git reports a clean tree there. Later commits on this branch change this report, its artifacts, tests and documents, and none of the commands rehearsed here; the last paragraph of this section is about the head of the branch. The merge has no conflict, and relative to the candidate it changes no file outside `tools/balance/`, `tests/scenarios/` and `docs/balance/`. The clone, its commits and its reports were not pushed and are not kept: its commit identifiers mean nothing outside it.

| In the scratch merge, from a clean tree | Result |
| --- | --- |
| `npm ci` | 886 packages from the candidate's lockfile |
| `npm run verify` | Passed. 558 tests, none failed, skipped, cancelled or marked todo: 25 bootstrap and contracts, 79 engine, 46 Backend, 11 tooling, 106 presentation and 291 game. These are the candidate's own suites; Balance changed none of them |
| `npm run check:browser-dependencies` | Passed |
| `npm run check --workspace @mothership/balance` | Passed: 60 tests in 6 files, all of them run, none skipped. The owner-decision file is present there, so the three tests that need it ran: every `v1#` citation was resolved against it, and its hash matched the pin |
| The same with `-- --allow-missing-overlay` | Exit status 1, as intended: the switch is refused where the file is present |
| `npm run engine-gate --workspace @mothership/balance -- --out-dir <outside>` | Passed in 1 minute 52 seconds: 470 fixtures, 431 passed, 0 failed, 33 blocked, 6 not run; 4130 controls, all detected; ten playouts per mode, all finished, with no invariant violation, hint mismatch or replay mismatch. The engine was the merge's own, its commit read from Git, and the gate required a clean tree at exactly that commit |

Five refusals were tried there as well, because they need a clean checkout to show:

| Tried in the clean scratch merge | Result |
| --- | --- |
| The engine gate with its reports written inside the checkout | Exit status 1. The scenario report was written first, into the checkout. The controls and playout reports then recorded a tree with uncommitted changes, and the gate named that for both, and that they disagree with the scenario report |
| A scenario run told `--engine-commit` with another commit than the checkout's | Exit status 2 before anything ran. The message names both commits |
| The engine gate told the same | Exit status 2, not run, with the same message |
| The engine gate pointed at an exported archive of the candidate, which has no Git | Exit status 2, not run: the commit of an engine outside a Git checkout can only be stated, and that is accepted only for a trial |
| The gate with `tests/scenarios/v1/exceptions.json` moved away | Exit status 1 with the problem named, and no stack trace |

An earlier draft of the request to Integration suggested root scripts for these two checks. They were added to the clone in a second local commit and worked: `npm run verify` passed with the static check in it, and the engine gate passed through the root script. The suggestion is withdrawn, because Integration has written the adoption itself; section 6 is about that.

Commits after the rehearsed one add two tests, which makes 62: one holds the three artifacts to the gate, and the other is the regression for defect 9 of section 7. They also move the gate tests into the five test files that Integration's guard names. At the head of the branch the static check and the engine gate were run once more in a scratch merge with the candidate: 62 tests in 5 files, all of them run and none skipped, and the engine gate passed.

The emulator suites (`npm run test:emulator`, `npm run test:frontend:emulator`) and the Backend package check were not run by Balance. They are Backend's and Frontend's gates in the plan and need Java 21 and fixed ports.

## 6. With Integration's CI adoption, PR #47

While this work was in progress Integration published its own adoption of the Balance checks: draft PR [#47](https://github.com/Amirkianfar66/GameN/pull/47), `codex/v1-balance-ci-adoption` at `40e47f060521276672c8ee6312e122ce37566d8a`. It imports the reviewed Balance commit `a3898b8` unchanged on the landing candidate and adds two steps to `npm run verify`: the Balance static check, whose TAP totals it reads, and the three engine commands, whose fresh reports it validates against pinned counts and hashes. Its guard is integration-owned and is the gate for a merge. BAL-REQ-1 is answered by it.

This branch changes the commands that guard calls, so it was tried against it. The head of this branch was merged with the head of PR #47 in a throwaway clone, with a real merge commit. There was no conflict, and no file outside `tools/balance/`, `tests/scenarios/` and `docs/balance/` differs from PR #47. Then Integration's own commands were run, unchanged:

| In the scratch merge with PR #47, from a clean tree | Result |
| --- | --- |
| `npm ci` | 886 packages |
| `npm run verify` | Passed. 636 tests in the root suites, none failed, skipped, cancelled or marked todo: 25 bootstrap and contracts, 79 engine, 46 Backend, 89 tooling, 106 presentation and 291 game. The 89 include Integration's 78 regressions for its Balance guard |
| Its static gate, `test:balance`, inside `verify` | "Balance static: 62 executed, 62 passed, zero failed/cancelled/skipped/todo; materialization and traceability checked" |
| Its engine gate, `test:scenarios`, inside `verify` | "470 catalogue IDs; 431 passed, 33 reviewed blocked, 6 explicit manual; zero errors", "423 baselines passed; 4130 controls executed and detected; zero misses", "10 completed in each of modes 7/8/9; zero unfinished/invariant/hint/replay mismatches" |
| `npm run check:browser-dependencies` | Passed |

Two things in this branch would have failed that verification, and were changed here and not there. The strict runner printed only the readable reporter; it now writes TAP when its output is captured, which is what `node --test` does and what Integration's guard reads. And the gate tests were in a sixth test file, where one of Integration's own tests counts five; they are now in the five.

The emulator suites and the Backend package check of PR #47 were not run here. Its GitHub run was not repeated either; this was a local run of its commands.

## 7. Independent review of the gate

A gate is worth what it refuses, so before any evidence was kept the gate was given to a separate Claude Code agent with one instruction: break it by experiment. It had the code at the first commit of this branch (`5c18377`), Backend's table of required assertions, real reports to tamper with and the author's tests, and it was told what those tests already covered and not what the author concluded. It worked in its own scratch directory and changed nothing in the checkout. It is not a human review.

What held: every realistic incomplete, failed or mismatched run it tried against the report logic was refused. That covered missing, duplicated and invented cases; wrong statuses, totals and counters, also as strings, nulls and negative numbers; modes keyed in odd ways; pins in the wrong case or shortened; reports from two trees; and a weakened exception list. It also ran the sequence of BAL-REQ-1 through real npm in a scratch merge of its own, including a shallow clone with a detached head, and found no false failure in it.

What it found, all at the edges, all fixed in commit `fc42c4c` with a regression for each:

| # | Defect | Now |
| --- | --- | --- |
| 1 | An option that was misspelt, or written as `--name=value`, was silently ignored. A mistyped `--candidate-commit` switched the check off, and the engine gate could report a pass for another engine and another number of playouts than the ones asked for | Every command refuses an argument it does not know, an option without its value and an option given twice. Both spellings of an option mean the same. The pass line says whether it was pinned or a trial |
| 2 | The engine commit was a label nobody checked. The engine gate passed with a commit of forty `f` | The commit is read from Git: from this checkout, or from the engine's own checkout. A stated commit that contradicts it stops the command. A commit that can only be stated, as for an archive, passes only as a trial. One digest of the built modules ties the three reports to one build |
| 3 | With the combined Version 1 manifest absent, three reports without it "agreed", the gate passed, and its summary said the manifest had been compared | Every report must carry the manifest's hash. Absent is a failure |
| 4 | A playout run that could not start wrote no report, so an older playout report in a reused directory was read as this run's | Every command writes its report even when it ran nothing, and the engine gate removes earlier reports first |
| 5 | The static check did not count a skipped suite: `node --test` counts it as a suite, not as a skip | Skips and todos are read from the runner's events, suites included |
| 6 | A test file that ended the process after its first result left its other tests unfinished, and passed | Each file's started and finished tests are compared. Test-runner options arriving through `NODE_OPTIONS`, and test files that the check would not run, are refused |
| 7 | Three tests returned early, and passed, where the owner-decision file is absent: the case on this branch | They skip by name; see the short version. Two of them were split so that what did run is counted apart from what did not |
| 8 | A report that contradicted itself was not read: a pass that carried a failure or an invariant violation, or something else where a list belonged. The runner cannot write such a report; a hand can | A pass must carry no failure, reason or violation, and both lists of the controls report must be there and empty |
| 9 | A relative `--engine-root` was resolved against the workspace directory under `npm run` | Resolved against the directory the command was started from, like the other paths |
| 10 | A checkout reached through a symbolic link was not recognized as this checkout | Recognized |

It also found statements in the request to Integration that the code did not do: that nothing was skipped (defects 5 and 7), that the reasons in the exception list were compared (the reason each run gives is; the list's explanation for reviewers is not), what "a clean tree" does and does not see, and a row of Backend's plan without a line. And it found a stack trace where a missing catalogue file should have been a named problem. All were corrected. The request has since been rewritten around PR #47, and what the corrected statements say is now in the [Balance README](../README.md) and in the commands' own descriptions.

**What it showed the gate cannot do, and what is left as it is.** The gate holds the reports against the catalogue and the exception list of the same commit. In a scratch copy the reviewer turned a ready case into a manual one, added its line to the list, regenerated the files and the evidence, and the gate passed with three ready cases fewer. Every change it tried to the list alone was refused; a change to the list and the fixtures together is not, and cannot be by a check that reads one commit. A ready case deleted or emptied of its expectations is the same. What the change cannot be is quiet: the scenario files, the list, the traceability table and the committed evidence all change, and the static check fails until the evidence is produced again. Review of that diff is one protection. Integration's guard is the other, and the stronger: it pins the counts and the hashes in a file that Balance does not own, so the same change fails there until Integration has reviewed it.

Two more limits are stated in the strict runner and not closed: a test that decides for itself to return before asserting anything, and a test that its file never registers because the file ends the process first. The runner is told of neither. A test that holds a timer open hangs without a time limit; CI's own limit ends it.

Not tested by the reviewer or by the author: the gate inside GitHub Actions, Linux, Windows line endings, and Git's `safe.directory` refusal. By the code, no commit can be read in that last case and the engine gate does not start.

The fixes were not given to an independent reader a second time.

## 8. Not run

- **Any human playtest.** No session has taken place.
- **Anything on a device or in a browser.**
- **The Firebase service, the emulator suites and the Backend package check.** Backend and Frontend own them.
- **Either gate inside real CI with this branch.** Both were run locally in clones. The root manifest and the workflow are Codex's, and nothing in them is changed by this branch.
- **On this branch, the three static tests that read the owner-decision file.** They ran in the scratch merge.
- **The six manual scenarios**, and every scenario for a rule that the traceability table lists as not exercised.
- **A review by a person**, and a second independent reading of the fixes of section 7.
- **Original Powers.** Off everywhere, and outside Version 1.

## Reproducing

```sh
git clone <this repository> <checkout> && git -C <checkout> checkout --detach 71dfd0277c6ccc4a5dd78b9702face98a46310b8
(cd <checkout> && npm ci && npm run build)
npm ci
npm run check --workspace @mothership/balance -- --allow-missing-overlay
npm run engine-gate --workspace @mothership/balance -- --engine-root <checkout> --engine-commit 71dfd0277c6ccc4a5dd78b9702face98a46310b8 --playouts-per-mode 200 --out-dir <directory outside both checkouts>
```

The engine gate needs both checkouts to be clean commits. When the engine is on the default branch, drop `--engine-root`, `--engine-commit` and the switch on the static check: the gate then runs against the engine of the checkout at its own commit. In CI the gate for a merge is Integration's guard, which runs the same three commands.
