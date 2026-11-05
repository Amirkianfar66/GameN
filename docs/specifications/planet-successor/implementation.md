# Planet successor delivery and review plan

Approved implementation request: 5 November 2026. Source worktree: isolated integration branch from `26947b1fbf001275b5f1979f5732824fe08af783`; runtime baseline `db65bb87f05983ff6861d27689ba1b7bab55d051`. Root checkout, historical worktrees, private Studio data and existing matches must remain intact.

1. Integration: commit this approved specification and a new immutable source manifest; add separate successor command/view schemas with an explicit exact tuple. Do not modify historical protocol behavior.
2. Backend: implement the pure successor engine with global/per-world state ownership from the start, uncapped saved round orders, renamed roster/Code, offices, movement/slot selection, navigation, Hacker, Blackhole, shared healing/panel, Promises and windows. Preserve ordinary mechanics, fixed-target validation, Captain scope, Blackout, Clone, four-bed placement and exact action order.
3. Backend/Integration: authoritative service persistence, auth/seat recovery, idempotent command receipts, global knowledge vs per-world effects, audience projections, durable server deadlines and new-match-only profile. Existing lifecycle remains selected for old matches.
4. Frontend: review shared contract, then implement connected player/host/display consumers and permitted motion using existing approved comic assets. Preserve setup, bots, Pass, card layout and retry/reconnect. Synthetic local mode is explicit and cannot masquerade as hosted multiplayer.
5. Designer: use the motion requirements with exact source/hash handoff. Any needed new art should be separately reviewed; do not hide missing presentation behind a claimed finished release.
6. Balance: encode independently derived scenario expectations for 7/8/9 and prepare human playtests. Do not amend approved rules or claim balance from bots.

## Required acceptance coverage

- Y route Blue, Blue, Red, Red from Junction reaches Red Planet in four movements; no extra movement from weight margins or hacking; no Round 5 ending.
- Officer tie selection, absent/timeout fallback and non-veto sequential acknowledgements; Round 1 fixed move before election.
- Engineer captures opposite-room identities; movement/late arrivals and Captain multiplier follow P12.
- Wrong Scan locks next whole round; one final Code attempt; correct unlock is separate from one retained Hack Spaceship activation; failed final Code leaves Scan.
- Alien alive plus personally used Blackhole co-wins on either planet; no-survivor check only after selected final resolution.
- Original hack followed by Beta fork then Beta selection retains the spent activation. Selecting a pre-activation state restores availability; prior consumed resources never refill on branch.
- Whole-world selection retains pending actions and costs, not mixed successes; actor-world targeting and foreign-target feedback isolation.
- Actual Blackhole Sync opens one fixed 6000ms presentation, with no early ballot acceptance; non-Blackhole rounds skip it. The deadline opens a fresh full 60000ms vote, including delayed dispatch. Meet A/B settles at vote start. Reconnect, reduced motion, missing assets, stale/duplicate tasks and animation completion cannot resample Sync or restart/shorten either interval.
- Two shared healing injections, immediate reservations, global patient attempt, no empty-pool code oracle, attacks before Rescue and no revival.
- Current-round meeting Promise evaluated after Sync; actual Jail ballot fulfills even when admission fails; previous Promise results unchanged; acceptance quotas and election runoff/absent opportunity handled.
- Window endpoint and station permission, free draw/show, same-room movement cost, append-only author ordering and round expiry; no global exposure from global persistence.
- Full Jail still votes, denies excess admission and preserves Hospital reservations after physical-Jail RELEASE/EJECT.
- Shared finalized board vs player current view, stale-command/reconnect behavior, private roles/route/branch state absent from public payloads.
- Saved historical matches remain valid and unchanged through new deployment/profile selection.

Report actual typecheck/build, meaningful targeted/regression tests, emulator/API checks and browser evidence separately. Record unrun device/voice/human-playtest limits. Full release needs reviewed combined code and passing relevant checks; never publish just the Studio as the gameplay update.

