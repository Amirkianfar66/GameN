# Visual and Motion Designer workstream

**Runner:** A dedicated Claude Code session for issue #4. Read `CLAUDE.md` and `docs/agent-roster.md`. Frontend integrates the delivered assets and motion; Codex Astra owns technical integration.

**Role:** Product, art and interaction direction for Mothership.  
**Status:** Assignment for `Amirkianfar66/GameN`; implementation branch/PR starts after the shared bootstrap.  
**Language:** English throughout the game and handoff.

## Mission and boundaries

Produce a coherent comic-book board and card experience that preserves hidden information and works on private phones and a shared table display. Own visual specifications, component states, source art, export manifests and design tokens. The Three.js/React Three Fiber board is a candidate for evaluation; do not describe its performance or acceptance as established.

Proposed implementation ownership: `design/`, `packages/design-tokens/`, `docs/design/`. Frontend owns React components, scene integration and motion execution. Backend owns authoritative eligibility and disclosure. Game Balance owns balance evidence and rule-change proposals. Shared schemas, rule definitions and root configuration require the integration owner's review.

Do not change game rules to make a layout simpler. Do not infer secret facts, introduce general private chat, or use unrelated Planet A content. Preserve editable art sources; record provenance and reuse rights for delivered assets. Never include real player secrets in examples or screenshots.

## Read order

1. `AGENTS.md` and `docs/project-context.md`.
2. `docs/architecture/rendering-direction.md`, then relevant sections of `production-v1.0.md`.
3. `rules/overlays/location-board-layout-v1.json`, `movement-decision.json`, `direct-shot-decision.json`, `player-modes-officer.json` and `consolidated-decisions-2026-09-26.json`.
4. Relevant baseline rules and `final-showdown-decision.json`, applying documented precedence.
5. `docs/design/art-direction.md`, `docs/design/design-tokens.json` and `docs/design/motion-direction.md`; the detailed treatments are proposals, not canon.

## Dependencies and working contract

Before implementation, obtain the pinned base commit/ruleset reference, approved public/player projection schema, event disclosure matrix and target device matrix. An unresolved item may use a clearly labeled fixture; it must not silently become production behavior.

Agree with Frontend on component IDs, DOM/scene ownership, asset coordinates, interaction states, fallback behavior and token version. Backend supplies safe eligibility reasons and event audiences. Game Balance reviews whether player feedback changes information availability or creates accidental incentives.

## First branch and PR

After the shared bootstrap is reviewed, create a dedicated worktree in `Amirkianfar66/GameN` and branch `agent/designer-art-direction`. Link one issue: **Define the board/card visual and interaction contract**. The first PR should include this specification, token definitions, annotated layouts and the planned asset inventory. Mark unproduced artwork explicitly. Subsequent source-art PRs should be separately reviewable.

Initial production deliverables: one finished Room A/B vignette, one neutral numbered token, Captain and health/Jail markers, one private Officer card, one audience-approved effect fixture, and reduced-motion equivalents. Cover idle, selection, targeting, pending, accepted, unavailable, spent and reconnect states. A two-phone fixture demonstrates presentation; it is not a new player mode.

Deliver the motion storyboards and assets specified in `docs/design/motion-direction.md`: interaction, game-event and phase treatments, with normal/reduced-motion equivalents. Pair with Frontend on the development-only motion gallery. The user requested comic motion as part of the game's character; no motion has been implemented merely by writing this brief.

## Definition of done

- All game strings are English and separate from illustrations.
- Each visible state has an authorized data source and a text/shape alternative to color.
- Layouts cover narrow phones, larger text and shared displays without required drag gestures.
- Frontend can implement from component/state/asset specifications without guessing rules.
- Export manifests include sizes, anchors, licenses, variants and version IDs.
- Review includes secrecy, readability, motion and sound; device findings are labeled measured or pending.
- PR records dependencies, open decisions and whether gameplay information changes. No rule change is hidden in a visual update.
