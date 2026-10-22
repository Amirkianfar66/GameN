# Analysis plan for playtest records

**Status:** written before any data exists, so that nothing here is shaped by a result. No match has been played. This page contains no finding.

The unit is one match. Records come from [the template](match-record.template.json) and are checked by `validateMatchRecord`. The summaries below are computed by `summarizeOutcomes` and `wilson` in `tools/balance/src/stats.ts`.

## Rules that hold for every report

1. **One report per mode.** Seven-, eight- and nine-player matches are never added together, and no rate is computed across modes.
2. **One ruleset per report.** Matches under different rulebook versions, different builds or the archived identification rule are different cohorts.
3. **Every rate shows its numerator and its denominator.** "3 of 8", never "38%" alone.
4. **Every match played is counted.** A report states how many matches were recorded, how many finished, how many are excluded and why. An excluded match disappears from a rate, never from the count.
5. **Exclusions come from the closed list in the record, and are decided before the outcome is looked at.** Who won is never a reason.
6. **The number of distinct groups is stated beside every rate,** with the share of matches that came from the largest group.
7. **Scripted and random playouts are reported elsewhere and never beside human rates.** They say nothing about how people play.

## Sample sizes

The pilot is 6 to 10 finished matches in each mode. That is enough to find rule problems and far too little to compare sides. The table shows why: it is the 95% Wilson interval when exactly half of the matches go one way.

| Finished matches | Observed | 95% interval |
| --- | --- | --- |
| 6 | 3 of 6 | 19% to 81% |
| 8 | 4 of 8 | 22% to 78% |
| 10 | 5 of 10 | 24% to 76% |
| 20 | 10 of 20 | 30% to 70% |
| 30 | 15 of 30 | 33% to 67% |
| 50 | 25 of 50 | 37% to 63% |
| 100 | 50 of 100 | 40% to 60% |

Even these intervals are too narrow when matches share players. Ten matches at one table are closer to one observation of that table than to ten of the game. Until there are enough groups to estimate the effect, treat the interval as a lower bound on the uncertainty and say so.

**Before the pilot's outcomes are looked at,** write down the size of the next batch and the date of the next review. Stop early only for an integrity defect: a leak of hidden information, a wrong deal, corrupt state, or the app enforcing something the rulebook does not say. Never stop, extend or re-run because a rate looks good or bad.

## What is reported for each mode

### Sessions and completeness

Matches recorded; finished, aborted and abandoned; excluded, by reason; records complete and incomplete; distinct groups and distinct players; largest group's share; learning matches.

### Outcomes

`Blue`, `Red`, `Alien` alone and `Draw` are mutually exclusive and sum to the finished, included matches. The Alien co-win is a separate flag on Blue wins and is reported on its own line. For each: count, denominator and Wilson 95% interval.

Also by cause: Blue by elimination, Blue by Power, Red by elimination, Red by Code, Draw. The audit expects elimination causes to be rare before the showdown and the Alien alone to be impossible; a recorded counter-example is an integrity question to investigate first.

How often the showdown was reached, and what it changed.

**No target is assumed.** Mothership is asymmetric, and equal wins are not automatically right. The owner states the intended advantage and the acceptable share of draws before any report calls a mode balanced or unbalanced. Until then a report describes and does not judge.

### Duration

Median, shortest and longest wall-clock minutes, and the same for window minutes. The difference is time spent outside any window. Compare with the clock arithmetic in the audit; a match shorter than the arithmetic minimum means eliminations or a recording error.

### Agency

By role, never by person: turns Healthy and free, Injured, Jailed; opportunities available and accepted for each action; resources left unused; Hack requests lost to the round limit. Beside them, the median questionnaire scores for agency and for knowing what to do. A role's figures are shown only when at least five matches contribute, so that an answer cannot be traced to one player.

### Clarity

Median and range of the clarity, own-role and fairness scores. The count of "too little", "about right" and "too much" time. Every distinct confusing moment, grouped by rule.

### Rule problems

Count by category and by rule or decision number, with the number of matches each appeared in. Every problem that affected an outcome is listed individually. A decision number that keeps appearing is the evidence the owner needs to decide it.

### Roles the owner asked about

Nine players: the round of Officer's shot, the target's faction, whether it was blocked, and the match result, as a table of matches. Not a rate until there are enough.

All modes: whether Supplier distributed, and to which factions; whether the Code was submitted and right; how many players were Jailed at the Round 5 check.

## Comparing modes

The pilot compares modes in words only: which problems appear in which mode, and how long each takes. It makes no claim that a side does better in one mode than another. A difference between seven and eight players includes Red Disabler; between eight and nine it includes Officer.

A later, larger study may compare rates. It needs its own plan, fixed in advance: the measure, the size, the groups, and how repeated tables are handled.

## What a report must say about itself

- The rulebook version, the build pins and the dates covered.
- That the sample is a pilot, with the number of groups.
- Which open decisions the build answered in code, and that the pilot played them that way.
- Which fields were unavailable because the server export does not exist yet.
- That nothing in it certifies balance.
