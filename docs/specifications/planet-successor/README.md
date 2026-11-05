# Planet successor — owner-approved implementation specification

Status: approved design; implementation authorized on 5 November 2026 in the integration conversation. This is not a deployed gameplay release or evidence of human balance.

Gameplay baseline: `db65bb87f05983ff6861d27689ba1b7bab55d051` (protocol 2, `full-game-1.11.0`, `in-person-v1-hospital-four-2026-10-19`). Design baseline: `26947b1fbf001275b5f1979f5732824fe08af783`. The integration branch starts from the design baseline, whose gameplay engine is unchanged from the gameplay baseline.

## Authority and scope

The owner approved the 26-question decision batch, with explicit corrections to 3, 4, 6, 15, 16, 23, 24 and 26, then answered Yes to all remaining recommendations. The owner separately approved Sync before Jail voting and retained-action resolution afterward, with attacks before Rescue. The subsequent instruction to update the game authorizes implementation. Do not reopen these decisions or implement the superseded draft alternatives.

Read [the final decision record](owner-decisions.md), [game design](game-design.md), [rules and state contracts](rules-contracts.md), [motion requirements](motion-requirements.md), and [delivery plan](implementation.md) together. The dated October owner records and overlays remain authoritative for unsuperseded decisions. Preserve `reference/design-canvas/`, historical overlays, historical manifest hashes, and active matches.

Use a new immutable gameplay tuple for new matches. Candidate protocol 3 / engine `planet-game-1.0.0` / ruleset `in-person-planet-2026-11-05` is intentionally separate from legacy protocol 2. Its source hash must bind the final decision record and inherited authority. Studio editing or publishing must never activate this tuple or change an existing match.

Optional Original Powers remain off in this implementation; their optional design is not removed. No online voice service is added to in-person V1. Preserve the reviewed comic art and phone board, room targets, Pass, private role card, fixed logical positions, 30-second character selection and 30-second minimum role reading with human Ready confirmation.

## Approval versus delivery

All gameplay choices in the approved batch are settled. Contract validation, implementation, regressions, emulator integration, mobile checks and affected-role review remain required before release. Do not describe a stub, fixture, Studio page or passing simulation as a playable successor or proof of balance.
