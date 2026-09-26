# Comic motion direction

**Version:** 0.1 · **Date:** 26 September 2026.  
**User direction:** Give the game expressive motion graphics with a comic-book atmosphere.  
**Status:** Motion specification for implementation and evaluation. The cues, timings and copy below are proposals; no motion assets or runtime implementation are included yet.

## Creative intent

Make the board feel like an illustrated comic in motion: bold ink outlines, selective halftone, layered paper panels, short speed lines, impact lettering and decisive poses. Use a quick accent followed by a clean settle. Preserve readable cards and a calm table during conversation. Ambient light may breathe gently on the shared display; avoid continuous card wobble, camera drift, flashing or moving textures beneath text.

Motion has three levels:

1. **Interaction:** small, immediate feedback for selection and card handling.
2. **Game event:** a short visual accent for an authorized movement or resolved outcome.
3. **Phase or finale:** a composed panel transition for a round or match result.

Reserve the strongest treatment for meaningful moments. Public faction colors appear only when a reveal is explicitly permitted. Ink/paper/amber is the default motion palette; amber is focus, not an implied faction or danger signal.

## Proposed cue library

Durations are starting targets for evaluation, not game deadlines. A static label remains available after a cue finishes.

| Moment | Treatment | Target | Audience and limit |
| --- | --- | --- | --- |
| Select a card | Small lift, offset ink shadow and quick outline accent | 120 ms | Local interaction only; no eligibility or success claim |
| Open private card details | Layered panel reveal with stable readable text | 220 ms | Authorized private view; no companion public effect or audible cue |
| Command accepted | Small `REGISTERED` stamp in the existing private status area | 120 ms | After an accepted receipt; same neutral treatment across secret actions; no impact or damage cue |
| Public token move | Short slide with an ink trail that clears as the token settles | 450 ms | Only supplied public origin/destination; decorative path does not define adjacency or intermediate occupancy |
| Public resolved shot | Localized ink burst and brief impact lettering such as `BANG!` | 320 ms | Only if the attack type is public; never invent shooter identity, a trajectory or a target reveal |
| Disclosed blocked outcome | Brief ink shield shape and `BLOCKED` label | 320 ms | Disclosure remains unresolved; fixture-only until recipients and permitted facts are approved |
| Round transition | Comic panel sweep and a clear `ROUND 03` heading | 700 ms | Public phase update; timer and active controls remain readable and usable |
| Final Zone entry | Wider panel treatment, neutral token regroup and a restrained amber accent | Up to 900 ms | Only the authorized showdown phase; never triggers or delays it |
| Match result | Winner composition styled as a comic cover | Up to 900 ms entrance | Terminal authorized outcome; additional role reveals still require permission in the rules; composition can remain static afterward |

For reduced motion, use a direct state change or at most the existing 80 ms fade. Remove spatial travel, zoom, shake and moving trails. Keep the same facts and action access. Reduced-effects and reduced-motion settings are separate: lowering GPU cost must not override the player's comfort setting.

## Execution and ownership

Use React DOM for readable labels, timers and controls; CSS/SVG for panel masks, outlines and lettering; and the existing GSAP direction for coordinated timelines. Keep the candidate Three.js/R3F scene responsible for token transforms, board depth and selective lighting. Comic motion must remain possible with the DOM board fallback; it does not depend on accepting the 3D renderer.

One system owns each animated property. An animation director in `packages/presentation/` maps authorized events to visual cues. Small hover/tap feedback can run immediately; gameplay results require server-authorized facts. No completion callback changes health, resources, rules, turn ownership or phase deadlines.

GSAP's media-query support can choose/revert motion variants when reduced-motion preferences change [M1]. If using R3F demand rendering, explicitly schedule frames while a timeline mutates scene objects and stop when settled; mutating an object does not itself guarantee a rendered frame [M2]. Measure this integration on actual devices before claiming performance.

Designer supplies storyboards, editable artwork, timing/easing, anchors and reduced-motion alternatives. Frontend implements the director, scene/DOM integration, cleanup and quality settings. Backend supplies audience-safe event facts and revisions. Game Balance checks whether presentation reveals extra information or gives players unequal access to time or actions.

## Event handling

- Consume only the current audience's view and approved event facts. Use audience-scoped event IDs and revisions; do not expose the internal global event sequence.
- Distinguish registration from resolution. A secret submission must not light a public room, aim a token, play a sound, load a role-specific asset or reveal activity through timing.
- Present an event only when its corresponding authorized state is available. Deduplicate repeated deliveries. On reconnect, restore the latest state and skip obsolete cinematic playback.
- New authoritative state takes priority over an unfinished effect. Cancel or coalesce cosmetic cues as needed; never build a playback queue that prevents the player acting.
- Preserve server deadlines and a stable, unobscured action area. A separate cinematic phase would be a new rule decision and is not introduced here.
- Event overlays are noninteractive and cannot steal focus or intercept taps. Information persists in semantic DOM; animated lettering alone is not the only result message.
- Private phones use neutral confirmation visuals and no secret-specific sound or vibration. Public sound, if enabled, follows public facts only.

## First implementation deliverable

Add a development-only motion gallery with labeled synthetic fixtures, replay controls and normal/reduced-motion/reduced-effects variants. Include card selection, private registration, an authorized public move, a public resolution and a round transition. Mark the Protection example fixture-only while disclosure is unresolved. Do not ship fixture event injection into the production game.

For each cue, Designer delivers an opening frame, accent frame and settled frame, plus layered source/export assets. Frontend connects those cues to the shared presentation contract. Start with these reusable elements before commissioning long cinematics or adding another animation runtime.

Verification focuses on concrete risks: the registration fixture causes no public effect; duplicate events do not replay; reconnect skips stale effects; controls and the 60-second turn remain usable during motion; preference changes cancel spatial effects; fallback mode communicates the same authorized facts. Profile sustained frame times, cold asset load and memory on named phones and the shared display. Existing performance and asset-budget targets remain unmeasured until tested.

## References

Checked on 26 September 2026. These sources document implementation capabilities, not approval of the proposed creative treatment.

- **M1:** [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) — media queries, reduced-motion variants and cleanup.
- **M2:** [React Three Fiber: scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance) — demand rendering, explicit invalidation and synchronizing animations.
