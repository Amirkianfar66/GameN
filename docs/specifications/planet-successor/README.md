# Planet successor — owner-approved implementation specification

Status: approved design; implementation authorized on 5 November 2026 in the integration conversation. This is not a deployed gameplay release or evidence of human balance.

Gameplay baseline: `db65bb87f05983ff6861d27689ba1b7bab55d051` (protocol 2, `full-game-1.11.0`, `in-person-v1-hospital-four-2026-10-19`). Design baseline: `26947b1fbf001275b5f1979f5732824fe08af783`. The integration branch starts from the design baseline, whose gameplay engine is unchanged from the gameplay baseline.

## Authority and scope

Latest addition: [P28, fixed private navigation timing](../../../rules/overlays/navigation-window-owner-decision-2026-11-06.json), approved on 6 November 2026, closes Designer R10. From Round 2 every navigation opportunity has the same full 15-second route-setting window; only the eligible Officer receives genuine-tie controls. This supersedes the tie-only stage timing in the hash-pinned P10 decision record. It is implemented in the current release candidate below; publication is a separate release step.

The owner approved the 26-question decision batch, with explicit corrections to 3, 4, 6, 15, 16, 23, 24 and 26, then answered Yes to all remaining recommendations. The owner separately approved Sync before Jail voting and retained-action resolution afterward, with attacks before Rescue. The later P27 approval adds a fixed six-second presentation after actual Blackhole Sync and before a full 60-second Jail vote. The subsequent instruction to update the game authorizes implementation. Do not reopen these decisions or implement the superseded draft alternatives.

Read [the final decision record](owner-decisions.md), [game design](game-design.md), [rules and state contracts](rules-contracts.md), [motion requirements](motion-requirements.md), and [delivery plan](implementation.md) together. The dated October owner records and overlays remain authoritative for unsuperseded decisions. Preserve `reference/design-canvas/`, historical overlays, historical manifest hashes, and active matches.

The reviewed release candidate is protocol 3 / engine `planet-game-1.1.0` / ruleset `in-person-planet-private-feedback-2026-11-06`, authority hash `4a1fc0e0dc21255253e31ae46e6042f9bd71e3fdec0f82f8a79b3ce213d01bfa`. It implements P27 and P28 for new matches and uses the separately reviewed `design-0.6.0` artwork candidate. See [the staging release procedure](../../backend/planet-staging-release.md) for integration checks and publication gates; a candidate is not a deployment claim.

Preserve the earlier protocol-3 1.0.0 and 1.0.1 manifests, source snapshots and saved-match behavior. In particular, `planet-game-1.0.1` / `in-person-planet-sync-six-2026-11-05` binds `rules/planet-successor-sync-authority-2026-11-05.json` and implements P27 without P28. Legacy protocol-2 games also retain their saved tuples. Studio editing or publishing never activates a gameplay tuple or changes an existing match.

Optional Original Powers remain off in this implementation; their optional design is not removed. No online voice service is added to in-person V1. Preserve the reviewed comic art and phone board, room targets, Pass, private role card, fixed logical positions, 30-second character selection and 30-second minimum role reading with human Ready confirmation.

## Approval versus delivery

All gameplay choices in the approved batch are settled. Contract validation, implementation, regressions, emulator integration, mobile checks and affected-role review remain required before release. Do not describe a stub, fixture, Studio page or passing simulation as a playable successor or proof of balance.
