# Planet successor — owner-approved implementation specification

Status: approved design; implementation authorized on 5 November 2026 in the integration conversation. This is not a deployed gameplay release or evidence of human balance.

Gameplay baseline: `db65bb87f05983ff6861d27689ba1b7bab55d051` (protocol 2, `full-game-1.11.0`, `in-person-v1-hospital-four-2026-10-19`). Design baseline: `26947b1fbf001275b5f1979f5732824fe08af783`. The integration branch starts from the design baseline, whose gameplay engine is unchanged from the gameplay baseline.

## Authority and scope

Latest addition: [P28, fixed private navigation timing](../../../rules/overlays/navigation-window-owner-decision-2026-11-06.json), approved on 6 November 2026, closes Designer R10. From Round 2 every navigation opportunity has the same full 15-second route-setting window; only the eligible Officer receives genuine-tie controls. This supersedes the tie-only stage timing in the hash-pinned P10 decision record. It is a confirmed rule awaiting the next versioned runtime change, not a deployed feature.

The owner approved the 26-question decision batch, with explicit corrections to 3, 4, 6, 15, 16, 23, 24 and 26, then answered Yes to all remaining recommendations. The owner separately approved Sync before Jail voting and retained-action resolution afterward, with attacks before Rescue. The later P27 approval adds a fixed six-second presentation after actual Blackhole Sync and before a full 60-second Jail vote. The subsequent instruction to update the game authorizes implementation. Do not reopen these decisions or implement the superseded draft alternatives.

Read [the final decision record](owner-decisions.md), [game design](game-design.md), [rules and state contracts](rules-contracts.md), [motion requirements](motion-requirements.md), and [delivery plan](implementation.md) together. The dated October owner records and overlays remain authoritative for unsuperseded decisions. Preserve `reference/design-canvas/`, historical overlays, historical manifest hashes, and active matches.

Use a new immutable gameplay tuple for new matches. Current candidate protocol 3 / engine `planet-game-1.0.1` / ruleset `in-person-planet-sync-six-2026-11-05` is intentionally separate from legacy protocol 2. Its source hash binds `rules/planet-successor-sync-authority-2026-11-05.json`, including P27 and inherited authority. P28 is not implemented by this tuple. Add it under a new immutable tuple; preserve the current manifest and its hash-bound decision/game-design/contract files as the 1.0.1 source snapshot. The preceding unshipped 1.0.0 candidate manifest is preserved, with its source snapshot identified in the new manifest; do not silently reinterpret its tuple. Studio editing or publishing must never activate this tuple or change an existing match.

Optional Original Powers remain off in this implementation; their optional design is not removed. No online voice service is added to in-person V1. Preserve the reviewed comic art and phone board, room targets, Pass, private role card, fixed logical positions, 30-second character selection and 30-second minimum role reading with human Ready confirmation.

## Approval versus delivery

All gameplay choices in the approved batch are settled. Contract validation, implementation, regressions, emulator integration, mobile checks and affected-role review remain required before release. Do not describe a stub, fixture, Studio page or passing simulation as a playable successor or proof of balance.
