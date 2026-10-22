# Facilitator session form

One form per match. Print it, or type into a copy. Fields in `code` are the names used in [the match record](match-record.template.json). Write nothing that names a person and nothing that was said in a Hack.

## A. Session (fill in once, before the first match)

| Field | Entry |
| --- | --- |
| Date `provenance.playedOn` | |
| Facilitator pseudonym `provenance.facilitatorId` | |
| Group pseudonym `provenance.groupId` | |
| Session identifier `provenance.sessionId` | |
| Mode order planned for this group `session.modeOrderInSession` | |
| Venue `session.venue` | home / workplace / public venue / lab / other |
| Seating `session.seating` | |
| Public board `session.publicBoard` | physical board / shared display / both / none |
| Who moves the tokens | |
| Devices `session.devices` | |
| Connection `session.connectivity` | stable / interrupted / unusable |
| Noise `session.noise` | quiet / moderate / loud |
| Language at the table and in the app `session.language` | |
| Teaching method `session.teaching.method` | read aloud / facilitator explained / read alone / returning group |
| Teaching minutes `session.teaching.minutes` | |
| Rulebook version taught `session.teaching.rulebookVersion` | |
| Facilitator also played `session.facilitatorPlayed` | yes / no |
| Observers `session.observers` | |
| Consent recorded for every player | yes / no. If no, do not record this session |

## B. Build (copy from the app's about screen or the export)

| Field | Entry |
| --- | --- |
| Ruleset version and hash | |
| Source manifest hash | |
| Engine version and commit | |
| Protocol version | |
| Client build | |
| Optional powers | Off. If on, stop: this form does not apply |

## C. This match

| Field | Entry |
| --- | --- |
| Match identifier `provenance.matchId` | |
| Match number in this session `provenance.matchIndexInSession` | |
| Mode `provenance.mode` | 7 / 8 / 9 |
| Is this the group's first match? | yes / no |
| Practice match agreed beforehand? | yes / no |

Players. One line per seat. Roles and factions are filled in **after** the match from the final reveal, never during it.

| Seat | Pseudonym | Matches played before | Under this ruleset | Experience with similar games | Starting room | Role (after) | Faction (after) | Left early |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | none / some / frequent | A / B | | | |
| 2 | | | | | | | | |
| 3 | | | | | | | | |
| 4 | | | | | | | | |
| 5 | | | | | | | | |
| 6 | | | | | | | | |
| 7 | | | | | | | | |
| 8 | | | | | | | | |
| 9 | | | | | | | | |

## D. Clock

| Field | Entry |
| --- | --- |
| First turn opened (watch) | |
| Result shown (watch) | |
| Wall-clock minutes `pace.wallClockMinutes` | |
| Times the table stopped while a clock ran `pace.pauses` | |
| Minutes spent settling rule questions `pace.adjudicationMinutes` | |
| Reconnects seen `pace.reconnects` | |
| Seat recoveries `pace.seatRecoveries` | |

Round by round, as it happens. Tally marks are enough.

| Round | Captain election held | Runoffs | Hack conversations | Release asked | Player jailed (seat) | Players Injured at end (seats) | Players Eliminated at end (seats) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | | |
| 2 | | | | | | | | |
| 3 | | | | | | | | |
| 4 | | | | | | | | |
| 5 | | | | | | | | |
| Showdown | not held / held | | | | | | | |

## E. Outcome

| Field | Entry |
| --- | --- |
| How it ended `outcome.terminal` | finished / aborted by host / abandoned |
| Result `outcome.result` | Blue / Red / Alien alone / Draw / none |
| Alien also won `outcome.alienCoWin` | yes / no |
| Which rule ended it `outcome.victoryCause` | Blue by elimination / Blue by Power / Red by elimination / Red by Code / Alien alone / Draw |
| Round `outcome.round` and checkpoint `outcome.checkpoint` | Round __ ; end of round / showdown |
| Healthy Power at the end, Blue and Red | |
| Was the Code submitted? Was it right? | |
| Did Supplier distribute in Round 3? | |
| Nine players: round of Officer's shot, and whether the target was injured | |

## F. Deviations from the rulebook

Anything the table did differently, by mistake or by agreement. One line each.

| Round | Rule (R number if known) | What happened | Cosmetic / affected play / affected the outcome |
| --- | --- | --- | --- |
| | | | |

## G. Exclusion

Decide from this list only. The winner is never a reason.

- [ ] Not excluded
- [ ] Aborted by the host
- [ ] Abandoned by the players
- [ ] A rules deviation affected the outcome
- [ ] An app defect affected the outcome
- [ ] Wrong player count
- [ ] Optional powers were on
- [ ] The facilitator coached play
- [ ] The record is incomplete
- [ ] A different ruleset was played
- [ ] Consent was withdrawn
- [ ] Practice match, agreed before it started

Note: ______________________________________________

## H. Debrief notes (ten minutes, after the questionnaires are handed in)

What was unclear?

When did you have nothing to do?

What would you do differently next time?

Facilitator's own observations `facilitatorNotes`:
