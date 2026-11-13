# Frontend acceptance of the Food contract

13 November 2026. Consumer #235; Backend #234 / PR #236.

**Frontend accepts the contract-first packet and recovery interface at
`df52395c881bbe556797ec03fc0ed0e7fbe920ee`**, based on
`1f795366a27b17f46ac195debe491954a27d8ae0`. Native wiring also requires
Integration's acceptance. This review approves neither runtime implementation,
executable authority registration, new-match defaults, artwork admission,
native visuals nor deployment.

The seven preliminary consumer findings are addressed:

| Requirement | Committed resolution |
| --- | --- |
| Same-snapshot command context | Food views carry phase/step/round; the parser binds the same API response's clock and match versions. Clock-only changes are normalized separately from revision-protected body data. |
| Reconnect-complete motion | Bounded rail/height trajectories, blade/change anchors, old-crate fall and landing surfaces, explicit CUT/DROP cues and persistent brake/buffer state. Empty cosmetic event suffixes do not require replay. |
| Partner rows as drawn | Every other original seat has a server-authored availability/reason; enabled choices match the offer. No phone-derived eligibility reason. |
| Join/Cancel races | Pair-private original request closures persist after the current invitation clears; receipts correlate the original request and closure. |
| DTO consistency | Ended/dead Task offers, mismatched crate IDs, unbounded rendering coordinates and incomplete STOPPED cues reject. |
| Public control privacy | Away IDs are sorted by original seat number. Every Partner row stays uniformly unavailable during AWAY; early private deaths cannot change the outsider's labels. |
| Hold ownership and recovery | Causal DOWN/UP bind Task, server control session, gesture and crate. UP can precede its DOWN reply. Actual older holder and newer pending contact are projected independently. Fresh explicit finger-off recovery closes all pending/high-water contacts atomically before releasing only the actual held crate. |

I read the committed schemas, receipt correlation/release helpers, Hold ledger,
clock guards, specification, owner amendments and 23 synthetic wire examples.
I independently built `packages/contracts` and ran the four focused Food suites
on Node 22.21.1: **141 passed, zero failed/skipped**. Additional read-only probes
confirmed the former malformed DTOs now reject, an unrelated phase cannot bind
the view, clock-only polls retain the same revision body, and an actual outsider
cannot receive an early ELIMINATED Partner reason.

Evidence: `evidence/food-supply-preparation-2026-11-13/contract-236-review.json`
and `contract-236-tests.txt` in that directory. The separate review worktree
remained clean. No Backend source was edited.

The consumer will keep one visible Hold control. It will send a causal UP
without the ordinary single-pending gate, retain original receipt identity,
use explicit off-recovery for overlapping contacts, and never replay DOWN from
a snapshot or infer release merely from a disconnect. It will use server
anchors and approved drawing formulas, not the synthetic Task model.

The subsequent Backend runtime must still prove authenticated API integration,
ingress/transaction/deadline ordering, full-payload audience noninterference,
Protection/luck equivalence, selected-world meals/hunger, historical version
isolation and the legal one-human-plus-bot journey. Those are implementation
obligations, not claims established by these schema tests. Physical phones,
real networks and assistive usability were not tested here.

The planned runtime tuple remains protocol 3 / `planet-game-1.4.0` /
`in-person-planet-food-task-2026-11-12`; the candidate source digest is not an
executable authority hash. Food art `design-0.9.0` remains allocated but
unadmitted, and native merge requires Designer's PR-specific visual approval.
