# Shared project context

Mothership is a premium comic-book card/board social-deduction game. The user prefers Firebase, wants English game/Canvas content, and has requested four coordinated workstreams: Backend, Frontend, Designer and Game Balance, collaborating through GitHub.

## Current artifacts

- Existing Design Canvas: https://mothership-design-canvas.amirkianfar.chatgpt.site
- Existing `/playtest` is a facilitator prototype, not the server-authoritative production runtime.
- `docs/architecture/production-v1.0.md` is the detailed previous architecture design.
- `docs/architecture/rendering-direction.md` records the later Three.js discussion and its evaluation status.
- Rule source and current overlays are bundled under `rules/`.
- The existing Canvas/facilitator source is copied under `reference/design-canvas/`; export provenance and live-data limitations are in `reference/README.md`.
- `CODEX_START_HERE.md` carries the project into Codex with bootstrap and four role prompts.

The production game is a separate runtime from the Design Canvas. Canvas publishing eventually exports validated immutable rulesets. Nothing in this handoff migrates or republishes the existing Site.

## Motion direction

On 26 September 2026, the user requested expressive motion graphics with a comic-book atmosphere. Treat motion as part of the game's art and interaction direction. Proposed cues and implementation ownership are in `docs/design/motion-direction.md`; exact timings/treatments remain proposals and do not alter canon or deadlines.

## Current product and rules

- Hybrid tabletop: face-to-face conversation, a public board and private player phones. Remote voice is a separate possible feature.
- 7 players: 4 Blue, 2 Red, 1 Alien. 8: 4 Blue, 3 Red, 1 Alien. 9: 5 Blue, 3 Red, 1 Alien. Six-player mode removed. None is balance-validated.
- Officer belongs to the nine-player mode only: one ordinary shot total from Round 1; no extra ordinary shot from Supplier.
- All ordinary shooting uses direct target selection. Third-player faction identification is archived.
- Ordinary turn is 60 seconds. Hack is requested within it and adds a separate 60-second conversation after it.
- Voluntary movement occurs once per round before voting, from Room A/B/Command only. Hospital/Jail do not have free voluntary exit.
- Only Captain enters Command. Leaving does not itself remove the title. Immunity requires being inside.
- End-round order: Jail vote, registered attacks/actions and defenses, Rescue, Round 3 Supplier distribution, elimination/permitted reveals, victory, next-Captain flag.
- A validly registered action survives later injury/Jail/elimination of its actor.
- Undercover may grant Protection to self; a player can receive it only once per match. Activation is at the next normal round.
- Hacker has one Code attempt anytime during Round 5.
- Conditional final showdown follows normal Round 5 if no winner. All non-eliminated participants, including Injured/Jailed, receive a separate special shot. Targets are registered before resolution; shots resolve in Round 5 turn order even if the shooter is eliminated in between. Recheck victory, else draw.
- Original Powers are optional. Base-game validity does not depend on them.

Read the bundled source files for full role eligibility, information, defenses and victory rules. Do not reinterpret this summary as a complete executable rulebook.

## Cross-cutting technical contract

- Firebase Auth + second-generation Functions + Firestore + Cloud Tasks.
- Pure TypeScript engine independent of cloud and renderer; server is authoritative.
- Commands carry match ID, command ID, phase ID and version, with identity obtained from Auth.
- Transactions, deduplication receipts, deterministic replay and durable scheduling outbox.
- Separate full private engine state from composed per-player views and the public view.
- Public tokens are neutral; secret actions cannot update unrelated public views or expose internal sequence gaps.
- Timers are validated by the server. Animations and presence are not game authority.
- Reconnection restores the same seat/state; never re-deal roles on refresh.
- Pin ruleset/engine/protocol/asset versions per match. Editor changes do not mutate an active match.

## Decisions that remain open

Hospital/release destination and move consumption; Captain routing and the deferred no-candidate case; Cracker Hospital access; target location checks at resolution; order within shared normal-round resolution stages; exact Code victory checkpoint; timing/abstention for votes and showdown; disconnect/pause policy; exact recipients of private effect disclosures.

Spoken Hack truthfulness cannot be automatically verified for arbitrary questions. The app can control eligibility and timing, while the social disclosure rule remains a player responsibility.

## First integrated milestone

A production-path vertical slice: two real player phones and a table display, a seeded non-production Officer/Protection fixture, an authoritative accepted command and resolution, timers, retry/reconnect, and one finished visual direction. The fixture is not a new two-player game mode.

Required early collaboration: Backend proposes minimal command/view types; Frontend builds against approved fixtures; Designer supplies card/board states and tokens; Game Balance supplies scenarios and explicitly unresolved cases. The coordinator integrates shared contracts and release checks.

## GitHub destination

The user supplied https://github.com/Amirkianfar66/GameN.git as the separate Mothership destination. The repository was empty and public when inspected on 26 September 2026, with write access available. The handoff is imported on `main`; `Amirkianfar66/planet-a` is excluded. Continue in Codex using the actual remote and commit. Establish a shared bootstrap baseline before four independent role tasks.
