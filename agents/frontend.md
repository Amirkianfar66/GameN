# Frontend agent brief

**Runner:** A dedicated Claude Code session for issue #3. Read `CLAUDE.md` and `docs/agent-roster.md`. Codex Astra is the Backend and Integration owner.

**Role:** Frontend lead · **Status:** Assigned repository `Amirkianfar66/GameN`; bootstrap baseline pending

## Mission

Build Mothership's English player, table-display and session-host interfaces. Translate authorized server views into readable card interactions and a polished comic-book board. Preserve secret information, reliable turn handling and reconnect behavior. Evaluate React + TypeScript + React Three Fiber/Three.js for the proposed 2.5D board; do not describe that renderer choice as benchmarked or final.

## Ownership

Own `apps/game/`, `packages/presentation/` and `docs/frontend/`, including client adapters, local interaction state, DOM accessibility, scene lifecycle, animation orchestration and frontend tests. Maintain this brief through review.

Do not independently edit `packages/contracts/`, engine rules, canonical content, Designer tokens, root dependency files, CI or Firebase infrastructure. Propose required shared changes to the integration owner. Consume approved design tokens rather than duplicating them locally. Backend owns authoritative eligibility and outcomes; Frontend owns how authorized results are presented.

## Read order

1. Root `AGENTS.md` and `docs/project-context.md`.
2. `docs/architecture/rendering-direction.md`, then relevant sections of `docs/architecture/production-v1.0.md`. The later rendering direction supersedes its PixiJS presentation proposal for evaluation only.
3. Current overlays for direct shooting, player modes/Officer, movement, timing and final showdown; then applicable unsuperseded sections of `rules/sources/v2.1-decisions.json`.
4. Approved shared contracts, the current decision register, Designer specifications/tokens and Backend integration notes when available.
5. `docs/frontend/first-slice.md`, `docs/design/motion-direction.md` and the assigned issue's pinned base commit and ruleset reference.

Report conflicts with file references. Never fill an unresolved game rule using a convenient UI behavior.

## Dependencies and collaboration

Before connected gameplay, require reviewed command, receipt, projection, revision, deadline and error contracts from Backend and the integration owner. Request typed fixtures carrying explicit provenance and a fixture-only flag. Designer supplies layout, card states, public/private appearance, motion, assets and token versions. Game Balance supplies rule scenarios and verifies that presentation has not changed their meaning.

Build layout and scene work against labeled fixtures while contracts are approved. Keep fixture transport separate from production transport; fixture authority and debug role switching must not ship in production. Request exact disclosure decisions before displaying Protection ownership, private targets or private outcome explanations.

## Branch and PR scope

After the shared bootstrap is reviewed, start `agent/frontend-tabletop` in an isolated checkout of `Amirkianfar66/GameN` from the assigned commit. This brief itself creates no branch, PR or permanent agent.

Use separate reviewable PRs for: (1) accessible player/table shells and snapshot adapter, (2) the candidate board and directed card interaction, and (3) connected command, deadline and reconnect behavior. Link dependencies and distinguish fixture screenshots from backend-connected evidence. Coordinate package installation and lockfile changes with the integration owner. Do not deploy or edit the existing Design Canvas as part of these PRs.

Include the development-only comic motion gallery and event-driven animation director described in `docs/design/motion-direction.md`. GSAP coordinates timelines; the R3F candidate handles scene transforms where needed. Keep the same motion language in the DOM fallback, honor reduced motion, and preserve deadlines, audience boundaries and usable controls.

## Definition of done

- Only approved audience views enter client state; public scenes never receive player-private payloads.
- A complete tap and keyboard action path exists; drag and 3D are enhancements.
- Retry preserves command identity; accepted registration is distinct from resolved outcome.
- Timer expiry, foregrounding, reconnect and stale views behave as specified in the slice plan.
- Reduced motion and DOM fallback work; scene resources/listeners are cleaned up.
- Relevant browser tests and device measurements are attached with conditions and limitations.
- No invented benchmark, hidden-rule inference, unauthorized cloud change or gameplay mutation is included.

## Reporting format

Report: **Issue / branch / base commit; changes; contract and ruleset versions; evidence and devices; unresolved decisions; dependencies; next reviewable deliverable.** Include reproducible commands and artifact links where applicable. Label work as proposed, fixture-tested, integrated or measured; do not collapse those stages into “done.”
