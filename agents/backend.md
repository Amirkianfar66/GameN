# Backend agent brief

**Mission:** Build the authoritative Mothership match service and deterministic rules engine. Firebase is the selected infrastructure. Presentation, including the Three.js evaluation, consumes authorized results and never determines gameplay.

**Status:** Assignment for `Amirkianfar66/GameN`; no production implementation, deployment, test pass or GitHub PR is claimed. `Amirkianfar66/planet-a` is excluded. Read `CODEX_START_HERE.md` and start implementation from the reviewed shared bootstrap baseline.

## Read before work

1. Root `AGENTS.md` and `docs/project-context.md`.
2. `docs/architecture/rendering-direction.md`, then sections 4–7 and 10–13 of `docs/architecture/production-v1.0.md`.
3. `rules/sources/v2.1-decisions.json`, followed by every confirmed overlay. Give particular attention to `consolidated-decisions-2026-09-26.json`, `direct-shot-decision.json`, `player-modes-officer.json`, `movement-decision.json`, and `final-showdown-decision.json`.
4. `docs/backend/first-slice.md`, the approved shared contracts and the integration decision register when available.

Later confirmed decisions supersede baseline mechanics. Neither architecture recommendations nor board-layout defaults settle game rules. Record the repository base commit and exact source hashes in the issue before implementation.

## Ownership and collaboration

Own `packages/engine/`, `services/game-api/`, `infra/firebase/` and `docs/backend/`. Keep engine tests within the engine package; Game Balance owns shared scenario assets in `tests/scenarios/` and simulation tooling. Coordinate the adapter that consumes those scenarios.

The integration owner owns `packages/contracts/`, canonical rule definitions, workspace manifests, lockfiles, CI and cross-cutting architecture decisions. Submit proposed shared types for review rather than editing these concurrently. Do not edit Frontend or Designer files to make your API appear integrated.

Frontend needs approved command examples, projection fixtures, public error categories and retry semantics. Game Balance provides independently specified expected outcomes and ambiguity reports. Designer needs the allowed public event vocabulary; private effects cannot become public sounds or animations without an approved disclosure rule.

Use an isolated worktree on `agent/backend-foundation`. Proposed first issue/PR: **“Add authoritative Officer shot vertical slice with private projections and retry-safe deadlines.”** The destination is confirmed. Implement against the shared contract after integration review. Keep the engine and Firebase adapters independently reviewable; if the change becomes large, split engine and adapter PRs with explicit dependency links.

## First assignment

Implement the narrow specification in `docs/backend/first-slice.md`: a pure engine transition, authenticated command adapter, transactional receipts, audience projections, phase deadlines and an outbox. Use a development-only nine-seat fixture with two controlled clients. Supply both protected and unprotected target variants.

The fixture is an integration harness, not a new player mode. It does not establish complete elections, votes, all roles, final showdown or a deployable full match. No cloud provisioning, paid deployment or public release is authorized solely by this brief.

## Definition of done

- Integrator approves shared request/view schemas before consumers depend on them.
- Engine imports no Firebase, UI or renderer packages; explicit time and recorded inputs make transitions replayable.
- Accepted commands survive retries without duplicate resource spending or damage.
- Auth, membership and seat ownership are checked server-side; clients cannot write authority or generated views.
- Security tests prove cross-player denial and public-view noninterference for secret registration.
- Deadline, stale-task and reconnect scenarios have executable evidence, with emulator limitations identified.
- Frontend can run the approved fixtures against the emulator using documented commands and reconcile pending receipts after reconnect.
- PR records actual checks and results. Any unrun device, cloud, load or recovery test is marked **not run**.

## Rule decisions requiring escalation

Request a game-owner decision with source evidence for: target movement between registration/resolution; normal-round effect ordering within a stage; exact Protection/result recipients; Hospital and Jail exit placement; Cracker access; Captain routing/no-candidate behavior; Code victory checkpoint; voting/showdown windows; and disconnect/pause policy. The visual Designer does not independently approve canon changes. Do not stop unrelated implementation: isolate the affected handler or test case and label it unresolved.

Preserve confirmed behavior: registered attacks survive actor status changes; Officer has one ordinary shot from Round 1 in nine-player mode; Protection activates next normal round and cannot be granted twice to one recipient; showdown ammunition is separate. Arbitrary spoken Hack truthfulness is not an enforceable backend guarantee.

## Report back

Use: **issue/branch/base commit → changed paths → contract/version impact → checks with actual output → unresolved rules → dependencies → next reviewable step**. Include one redacted command/receipt example. Never include production roles, Code, tokens or credentials.
