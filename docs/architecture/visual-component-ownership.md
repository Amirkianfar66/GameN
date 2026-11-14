# One visual source: Designer and Frontend ownership

**Owner-approved workflow, 14 November 2026.** See the [decision record](../design/owner-decisions.md#14-november-2026-one-visual-source-and-clear-ownership). This governs new visual work and focused subsequent changes. It does not authorize a renderer migration, a gameplay change, or a rewrite of the frozen Food test release.

## Responsibilities

| Responsibility | Accountable owner | Boundary |
| --- | --- | --- |
| Visual design and its canonical implementation | Visual and Motion Designer | Layout, artwork, visual component markup/styles, responsive composition, visual states, motion timelines, tokens and reduced-motion treatment. The same visual source serves the preview and the game. |
| Playable integration | Frontend | Map authorized views to component inputs; handle user intent, requests and receipts; own navigation, mounting, disposal, focus, input accessibility, recovery and runtime performance. |
| Gameplay authority | Backend | Rules, eligibility, resources, results, deadlines, persistence and audience projections. No visual component determines these. |
| Shared interfaces and adoption | Integration | Coordinate component contracts before production work; review technical boundaries, reproducible exports, version pins and release checks. |
| Rule and playtest evidence | Game Design and Balance | Audit scenarios and propose changes; visual work does not approve a rule or establish human balance. |

Designer makes routine creative choices within the approved specification. Frontend reviews whether the component works in the app before Designer builds a large set of screens. Neither role silently changes an approved sheet or a gameplay rule to accommodate implementation.

## One source, two consumers

The preview and playable app consume one canonical visual component. A preview supplies labeled fixture inputs; the app supplies authorized data and real intent handlers. They must not maintain two independent copies of the same layout, styles or animation.

Designer owns canonical visual sources in its existing `design/` and `packages/design-tokens/` paths. Frontend owns adapters and screen controllers in `apps/game/` and `packages/presentation/`. Each handoff names the exact files and their owner. If a canonical component needs a different location, Integration records that specific ownership exception before work begins; a shared folder is not permission for concurrent edits.

Existing source fences remain in force. A historical dev-only prototype, fixture transport, simulator, review video or synthetic outcome must not be imported into production. Extract the runtime-safe visual component once, then make both consumers use it. This policy does not automatically approve historical prototype modules for shipping.

Where the build requires copied files, use a reproducible export from the canonical source. Record the source version/hashes, output paths and exact permitted transformations, such as import rewrites or removal of a dev-only header. Check that the output matches that recipe. Generated ports are not separately maintained artwork or layout implementations; corrections go to their canonical source and regenerate the outputs. Frontend may propose a source correction, with Designer reviewing it.

No new package, framework, dependency or build-system change is implied. Integration reviews any such change separately. Retain existing art and component versions for matches that still select them; adopting a new source does not overwrite historical release assets.

## Agree the small interface first

Before a substantial visual implementation, Designer, Frontend and Integration record a concise component handoff:

- **Identity and files:** component name, canonical source owner and paths, preview and runtime consumers, any generated outputs and export recipe, version pins.
- **Inputs and audience:** visible states, authorized fields and assets, loading/unavailable/error states, and whether the surface is public, private or room-visible. Use the minimum data needed; a public component never receives a private role packet.
- **User intent:** named callbacks such as select, cancel or confirm. Frontend validates current offers and constructs/sends commands; Backend authorizes them. A component emits intent, not a fabricated result.
- **Playback:** visual duration/easing, an elapsed-time or progress input, reduced-motion behavior, skip and recovery behavior. Frontend connects the authoritative phase clock and controls playback lifecycle. Local completion cannot advance the game or spend resources.
- **Layout and access:** required viewports/text sizes, labels and accessible names, focus/keyboard requirements and fallback composition. Designer owns their visual treatment; Frontend owns working browser behavior and measures performance.
- **Acceptance:** affected sheet/state IDs, one representative integration slice, measurable performance constraints where relevant, and the evidence needed for visual and technical review.

Use approved contracts. A missing gameplay field, disclosure rule or timing stage goes to Backend/Integration before production wiring; labeled fixtures may support independent visual work without inventing authority.

## One screen controller

Frontend owns which screen or overlay is active, which controls receive input, and when navigation resumes. Reuse the common visual shell, bars and controls instead of creating a competing implementation for every feature. A feature may take over the shell only for its current authoritative phase/state; retained history is not active-screen authority.

On exit, foregrounding and reconnect, restore the current authorized interface and dispose of stale listeners, inert states, overlays and animation work. Visual components expose their documented lifecycle and never retain hidden control of the surrounding app. This is Frontend integration work, not a reason for Designer to rebuild the game controller.

## Delivery and review

1. Agree the interface and exact ownership while the feature is small.
2. Integrate one representative component in the real app early, including an unavailable/recovery state and reduced motion where relevant. Designer previews that same source.
3. Finish the remaining approved states using the established component. Keep fixture/scenario code separate.
4. Frontend supplies native comparison evidence; Designer checks the implemented visual result; Integration checks behavior, privacy, packaging and release eligibility.

The [phone visual merge gate](../../AGENTS.md#phone-interface-specification-and-merge-gate) remains mandatory. Changed phone visuals or their rendered dependencies need Designer's explicit acceptance in the PR. Reuse valid evidence for demonstrably unchanged rendered inputs; document why unrelated edits do not invalidate it. Do not repeat source-art approval as a substitute for the first native review, and do not request an entirely new design for an unchanged implementation.

A departure from an approved sheet still needs Designer's agreement and the owner's approval recorded in the owner-decision document. This workflow approval is not a blanket approval of visual exceptions. Each role reports what it actually checked, including any untested physical devices.

## Transition without delaying Food test 1

Finish the frozen Food candidate and its existing acceptance checks. Do not replace its exporter, redraw its UI, change gameplay, or add an architectural migration to its release PR solely to apply this policy. The existing generated visual exports can remain; a focused integration fix is not duplicate artwork.

Apply this workflow to the next new visual component or separately scoped change. When an existing duplicated component needs work, consolidate that component through a focused PR with the usual evidence. The documentation/coordination change is independent of Food deployment and does not satisfy its outstanding visual or connected-play checks.
