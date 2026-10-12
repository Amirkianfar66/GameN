# V1 full-body board and ability-art staging trial

Integration record, 12 October 2026. The owner requested review of all four
workstreams followed by deployment. This document records the integration
constraints; it is not a claim that the candidate has been deployed.

## Source and scope

The owner requested the current unpainted full-body scenes in the playable game
before judging further painting, recorded in [issue #97](https://github.com/Amirkianfar66/GameN/issues/97).
Designer supplied the cumulative ability stack through
[`49f0db4d`](https://github.com/Amirkianfar66/GameN/pull/111), based on board-motion
[`08409392`](https://github.com/Amirkianfar66/GameN/pull/88). Keep that artwork and
its editable sources. Frontend owns its production rendering and lifecycle.

Designer lifecycle corrections from PR #113 at `d87163358ea85878fd3e9e4ffb347c4e71d6de5d`
settle the latest public pose, stop active motion on comfort-setting changes and
fit short-phone confirmation strips. They preserve the frozen figure geometry,
scene sources and generated art. The combined Designer suite, including the
existing PR #93 phone-copy correction, is required by `npm run test:design` and
the root `npm run verify` command.

For this staging trial, Integration accepts packaging the complete
`abilities-0.7.0` kit: 49 assets and 22 delivered ability treatments. The two
setup treatments marked planned in the inventory remain proposals; existing
board/setup behavior is not evidence that those additional designs are delivered.
The owner has approved the Insider's content as character portraits and role
labels, and has requested this trial. Final acceptance of the complete look and
motion still requires the owner's playtest.

## Runtime boundaries

- Load the entire ability kit on every player phone before reading private match
  views. Role, target, chosen character and action must not select an asset URL or
  trigger a later role-specific fetch. Host/display surfaces use public art only.
- Port the reviewed drawing primitives with source provenance. Production must
  not import the Designer prototype's app, fixtures, controls, scenario tools or
  motion director. Existing fixture/Canvas exclusion checks remain strict.
- The Insider sees three candidate characters and three possible role labels as
  an unordered set. Do not assign a particular role label to a particular portrait.
  Sort candidate, Code and successful-Supply sets by player number; neither role
  order nor selection order is a presentation order.
- Public movement and health/status changes may use already-public facts.
  A registered private action is not its result. Do not add shooter, weapon,
  Protection, giver, hit-cause or hidden-target effects to the public board.
- Conceal private cards, choices and effects when the page is hidden or the
  current authorization/view is unavailable or stale. Keep reconciliation state
  internally; concealing is not permission to forget an unresolved command or
  manufacture a replacement receipt. Reopening follows a fresh authorized view.
- Reduced motion must stop active JavaScript travel and animation immediately.
  Cancellation must restore the latest public pose. Duplicate snapshots and
  recovery must not replay completed motion or redraw unchanged focused content.
- Keep room-tag movement, board-character targeting and the central Pass control.
  Verify the short phone viewport with confirmation strips, not only the idle board.

DSN-D36 is accepted for this trial under these packaging constraints. DSN-REQ-16's
proposal to keep private cards visible on stale views is not adopted. DSN-REQ-15's
lasting Disabler/Officer spent-state fields remain unimplemented: unavailable
legal targets are not proof that a resource was spent. Use the existing authorized
resources and receipts, without inferring extra private facts.

`fullRoomCapacityForVersions` in shared contracts supplies finite display limits
only for the exact reviewed 1.2 and 1.3 gameplay tuples. Unknown/mixed tuples,
historical uncapped matches and Final Zone have no finite label. This metadata
does not grant movement: enable room tags from the server's legal offers.

The new 1.3 capacity-resolution tuple follows BAL-OD-1 through BAL-OD-6. Initial
rooms remain unassigned until the first complete-roster draw; the first canonical
seat map then persists across roster edits and recovery. Existing saved tuples
retain their original behavior. The root verification runs the frozen historical
catalogue explicitly under its Pass ruleset, followed by a separate strict
107-case capacity gate and 600 capped playouts under the new tuple.

## Release evidence

Before deployment, record the exact clean integrated commit, production artifact
hashes and runtime asset pin. Run the repository verification, independent capacity
suite on the new ruleset, capped playouts, applicable emulator acceptance and phone
browser checks. Preserve historical match/deal/receipt/version pins.

On the intermediate integration commit `2336e8f7893e63a5c017b41868a1c8d067d63d62`,
the newly adopted historical Balance catalogue passed 516 automated cases out of
555, with 33 reviewed blocked and six manual cases retained; all 4,490 negative
controls were detected and 30 seeded games completed. The independent capacity
suite remains a separate release gate: a historical pass does not validate it.

Actual staging readback, synthetic game results and remaining human/device checks
belong in the final release record. Prototype screenshots alone do not demonstrate
multiplayer correctness or social-deduction balance.
