# Real playable UI budget for Claude's capsule fit

Measured on the released `37f573af` production markup/styles over strict authored fixtures, using `apps/game/dev/measure-capsule-ui-budget.mjs`. This is sizing evidence for the revised layout, not new Board-v2/capsule acceptance. [All 73 records](evidence/capsule-ui-budget-2026-10-14/ui-budget.json) include boxes, font sizes, margins, padding, scroll/client heights, original words and actual controls at 320×568 / 390×844, normal, 20/16 safe-area and actual 200% text.

| Visible state | 320 normal dock / private claim | 390 normal dock / private claim |
| --- | --- | --- |
| Code choosing | 56.88 / 0 px | 69 / 0 px |
| Code partial selection (1–3) | 53 / 0 px | 69 / 0 px |
| Code confirmation | 120.28 / 0 px | 118.38 / 0 px |
| Rescue choosing | 59 / 0 px | 69.19 / 0 px |
| Rescue confirmation | 121.75 / 0 px | 146.94 / 0 px |
| Declare offer | 63 / 83.47 px | 75 / 70.28 px |
| Three side choices | 105 / 83.47 px | 115 / 70.28 px |
| Declaration confirmation | 106.50 / 83.47 px | 122.06 / 70.28 px |
| Private result / conversation, no open command | 0 / 70.28 px | 0 / 70.28 px |

The dock box includes border/padding; external bottom margin is additional (currently 0 for short Code choosing, 2 px for other short docks and 6 px tall; claim margin is 6 px). Most actual buttons are at least 44 px high; Code confirmation is 44.59 px at 320. The private result can coexist with a sent declaration's receipt. The captured uncertain-receipt sample remained in a 42.19 px busy recovery row; the existing unknown result/Check again state needs a reachable ≥44 px control too. Source validation must include both, not assume only a claim is present.

Normal current status measures 45.39 px at 320 and 52.59 px at 390. Current nav is 56/64 px, plus the bottom inset in safe-area mode. Those measurements expose the current content's intrinsic height; Board v2's 36/44/52 status must use a fixed, adequate match-height budget selected before play, not clip the text or change the room layout as phases change.

At 200% text, real status rises to 83.80–112.59 px (320), 92.19–123.38 px (390). Private claim/conversation spans 177.97–193.11 px at 320 and 116.58–177.97 at 390. Code confirmation has 101.78 px controls, 93.56/105 px prompt and 110/89.67 px consequence. The present side-button layout can severely narrow partial-selection text; those intrinsic boxes are a reflow constraint, not a request to reserve its current inefficient width. The new layout needs readable reflow and reachable internal scrolling for enlarged text while normal target gameplay retains no page/board scrolling.

## Required production layout behavior

- Keep exactly five navigation controls and their real intents/availability; central solid gold PASS stays raised and clear of C1, both capsule actors, every board target and strip button.
- The Command : Capsule **interior** widths are exactly 2:1, gutter excluded; right default. Capsule is permanent. It adds no logical room/slot or occupant. C1 and two concurrent actual-seat controls each remain ≥44 px with clear inner-corner hits.
- Choosing requires every current server-offered actor/seat to remain reachable at its character. Code can target all eligible living seats, including capsule participants. A full-board layout cannot gain space by removing valid choices, reassigning their logical rooms or shrinking targets.
- Confirmation has no remaining character choice, so a reviewed overlay can consume otherwise noninteractive art if every current control, required warning, nav and private result remains usable. The canonical one-use/irreversibility warning is real content; do not budget only a short heading.
- The full private five-second result must remain visible throughout entry/door motion. Conversation claim and a live command/uncertain receipt can coexist, and the recovery control may not be dropped to make the scene fit. Public capsule art receives no private side/role/claim input.
- Choose the match's status/bar height once for the viewport/font size; phase/timer text and the lighting line cannot move the board. Resize/rotation/browser bars/font-size changes need a deliberate measured reflow with obsolete motion cancelled.
- Current unmodified all-slot fit has **zero spare at 320×568** and a 36 px deficit with 20/16 insets. Adding a 53–122 px command row or a 70–83 px claim row unchanged cannot fit there. At 390×844 its spare is 214 px, or 178 with those insets: claim plus Code confirmation/margins is already about 200 px. The revised drawing/layout handoff must specify the real command/private-overlay treatment; importing today's pure fit unchanged is insufficient.
- Keep an explicit `fits:false`/unsupported-viewport path where the approved layout cannot fit, with accessible message and reachable navigation. Do not silently show the historical renderer and call that Board v2 completion. Source correctness, supported-phone acceptance and the owner's visual comparison are distinct gates.

The latest Backend pair proposal needs no additional field to solve these UI constraints. Existing authoritative stage/deadline, original legal targets, current playerCount and the forthcoming stored-slot prerequisite supply the facts. Claude owns the revised fit and capsule drawings; Frontend adapts the real command/private controls; Integration accepts the combined screenshots and source pins before publication.
