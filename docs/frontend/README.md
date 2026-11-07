# Frontend workstream

Issue [#3](https://github.com/Amirkianfar66/GameN/issues/3) · brief [agents/frontend.md](../../agents/frontend.md) · specification [first-slice.md](first-slice.md)

Frontend owns `apps/game/`, `packages/presentation/` and this directory. Shared contracts, rules, root manifests, the lockfile, CI and the workspace guard belong to Codex Integration and are changed only through the requests below.

## For Codex Integration

| Document | What it asks |
| --- | --- |
| [contract-review.md](contract-review.md) | Frontend's review of the bootstrap contracts: seven items to answer before connected work, and eleven more. Reviewed with required changes; not an adoption approval |
| [contract-re-review.md](contract-re-review.md) | Frontend's reading of the backend's response: the command guarantees accepted and now relied on, four follow-up requests, and a first read of draft protocol 2 for the command flow |
| [integration-requests.md](integration-requests.md) | Wire the Frontend checks into `verify` now; then the typecheck, guard and dependency changes that React, R3F, GSAP, browser tests and a backend transport need, with exact versions |

## Connected work (protocol 2)

The first Firebase-connected prototype is built on its own branch, `agent/frontend-connected-v1`, from the integration candidate ([#26](https://github.com/Amirkianfar66/GameN/pull/26)) and the browser dependency proposal ([#28](https://github.com/Amirkianfar66/GameN/pull/28)). Its handoff is [connected-v1.md](connected-v1.md): the first connected flow running in a browser against the local emulators, how to run the preview, what was actually run, and what is not done or not decided. It starts with [protocol2-adoption-assessment.md](protocol2-adoption-assessment.md): what Frontend consumes from wire protocol 2 as it stands, its position on the proposed refinements, eleven gaps and findings that need an answer, and its review of the dependency proposal. What the browser journeys wrote is under [evidence/connected-v1/](evidence/connected-v1/). The next slice on top of it, the role actions that name one seat, is [connected-role-actions.md](connected-role-actions.md), on its own branch `agent/frontend-connected-actions`. Voting is [connected-voting.md](connected-voting.md), on `agent/frontend-connected-votes`. Scan, Supply, the Code attempt and what a seat is told are [connected-knowledge-actions.md](connected-knowledge-actions.md), on `agent/frontend-connected-knowledge-actions`. The end of a match and the host ending one are [connected-match-end.md](connected-match-end.md), on `agent/frontend-connected-match-end`. Moving a seat to another device, and what a device the server refuses shows, are [connected-seat-recovery.md](connected-seat-recovery.md), on `agent/frontend-connected-seat-recovery`. One whole match played in browsers from its lobby to its result is [connected-full-match.md](connected-full-match.md), on `agent/frontend-connected-full-match`. What the hosted client says when a device cannot read the match, and how often it renews its credentials, is [hosted-client-feedback.md](hosted-client-feedback.md), on `agent/frontend-hosted-feedback`, which is built on Integration's hosted branch and not on this stack. **The fixture acceptance of the slices below is protocol 1 and does not carry over.**

## Phone-first V1

[phone-first-v1-handoff.md](phone-first-v1-handoff.md) reviews the staged start of [#75](https://github.com/Amirkianfar66/GameN/pull/75) for the Designer's phone-first journey ([#76](https://github.com/Amirkianfar66/GameN/issues/76)): existing components, screen states, accessibility and privacy rules, implementation constraints and the missing states found early. The current phone journey is captured under [evidence/phone-first-v1-current/](evidence/phone-first-v1-current/README.md) with `apps/game/dev/capture-setup-flow.mjs`.

[board-play.md](board-play.md) is the runtime of the Designer's board-as-game proposal ([#87](https://github.com/Amirkianfar66/GameN/issues/87), [PR #88](https://github.com/Amirkianfar66/GameN/pull/88)):

- every action played by tapping characters in their rooms;
- the strip above navigation;
- room-tag movement and the centred Pass;
- the characters' public motion.

It also records what differs from the proposal, and why. Its browser-simulation and emulator evidence is under [evidence/board-play/](evidence/board-play/README.md).

[board-recovery.md](board-recovery.md) is the Codex Frontend follow-up to draft PR #92: stale/deadline concealment of sent-command board marks, immediate mid-flight reduced-motion cancellation, and fresh current-runtime evidence. The historical screenshots and earlier outcomes work remain separate from that verification.

[phone-polish.md](phone-polish.md) fixes three defects of that release, with new capture checks for each:

- on the phone, the connection banner's icon lay over its words;
- at doubled text, the navigation labels ran into each other;
- a public move flew over the open card.

It also records the confirmation-stability measurements, and the large-text trade-off they show.

[motion-os-preference.md](motion-os-preference.md) fixes the remaining explicit-full → OS-reduced wiring case without a screen frame, with native cancellation and owned-listener teardown evidence.

## Role abilities

Issue [#99](https://github.com/Amirkianfar66/GameN/issues/99) integrates the Designer's role-ability treatments on the phone. [insider-board.md](insider-board.md) covers the first piece, the Insider's investigation board. It is an interim treatment, pending the Designer's, and it covers:

- the privacy lifecycle;
- what was never drawn, so no player is paired with a role;
- the missing Designer assets;
- the actual checks.

Its browser-simulation evidence is under [evidence/insider-board-2026-10-11/](evidence/insider-board-2026-10-11/README.md).

[insider-file.md](insider-file.md) replaces that interim board with the Designer's Insider file (`abilities-0.1.0`, [#102](https://github.com/Amirkianfar66/GameN/pull/102) at `1453500`), played in the release's phone so the owner can judge it. It covers:

- where to see it;
- what differs from the Designer's handoff, and why;
- a view out of date, which keeps the release's card (the Designer's DSN-REQ-16 recommendation);
- what the kit's adoption needs.

Its evidence is under [evidence/insider-file-2026-10-11/](evidence/insider-file-2026-10-11/README.md).

[role-abilities.md](role-abilities.md) prepares every other role ability for the Designer's treatments. It covers:

- the states each role's own view gives, including Protection queued, active and used up, and a Cracker with no Rescues left;
- hooks a treatment can style, which say no more than their words;
- a role-by-role coverage table;
- the Designer assets still missing;
- the view gaps proposed on #99.

Its evidence is under [evidence/role-abilities-2026-10-11/](evidence/role-abilities-2026-10-11/README.md).

## Slices

Each stage is labeled as the brief requires: **proposed**, **fixture-tested**, **integrated** or **measured**. Nothing is integrated or measured yet.

| Slice | Stage | Notes |
| --- | --- | --- |
| 1. Player and table shells, snapshot and transport adapter | **Fixture-tested** | [slice-1-shells.md](slice-1-shells.md), [verification.md](verification.md), [evidence](evidence/slice-1/README.md) |
| 2. Shot target and confirm flow in semantic DOM; receipt, unknown-result and retry handling | **Fixture-tested** | [slice-2-shot-flow.md](slice-2-shot-flow.md), [verification-slice-2.md](verification-slice-2.md), [evidence](evidence/slice-2/README.md). Depends on slice 1 |
| 3. Event director and comic motion gallery | Not started | Director core needs nothing; timelines need the GSAP decision |
| 4. React shells and a production bundle | Blocked | Needs REQ-2, REQ-3 and dependency stage A |
| 5. R3F/Three.js board evaluation with device evidence | Blocked | Needs dependency stage B and named devices |
| 6. Connected command, deadline and reconnect behavior | Blocked | Needs REQ-7 and the backend's emulator branch as a base. The contract questions are answered |

## Run it

```sh
npm ci
npm run verify
npm run test --workspace @mothership/presentation
npm run test --workspace @mothership/game
npm run check:exclusion --workspace @mothership/game
npm run dev:fixture --workspace @mothership/game   # then open http://127.0.0.1:4310/
```

Each slice is a separate pull request, and a later one is stacked on the one before it. Slice 2's request targets slice 1's branch.

The development harness is described in [`apps/game/dev/README.md`](../../apps/game/dev/README.md). It shows synthetic fixture data only and is not emulator integration.
