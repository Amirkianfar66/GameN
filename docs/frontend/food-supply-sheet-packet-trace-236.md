# Food sheet to packet trace

13 November 2026; consumer #235. Exact design head
`9bb497948861521030c37a8d2c60a6318f1745c9`; contract head
`df52395c881bbe556797ec03fc0ed0e7fbe920ee`. This traces all 76 planned
comparison states, the complete phone module, hint module and room pose
specification. It is a data review, not native visual approval.

## Consolidated amendment requirements

1. **Authoritative private end detail.** `phone.mjs` `endCard()` needs a loss
   reason distinguishing time from not-in-position, and the participant whose
   absence caused cancellation. `outcome {kind,at}` alone does not provide
   these. Do not infer the reason from equality with deadlineAt, crate physics
   or current online flags. Keep all detail participant-only; no public Task
   result, cause or killer field.
2. **Reconnect-complete death card.** `phone.mjs:172-177` uses the lethal
   mechanism and occurrence time for the cab/crate sentence and the impact
   interval before the card. Current `people[].alive` is durable but its
   `ELIMINATED` cue may be absent from the bounded cosmetic suffix. An
   independent exact-head probe cleared that suffix from the committed
   survivor packet; the schema correctly accepted it. Persistent participant
   death detail, or another explicit committed recovery representation, is
   needed to retain the correct sentence without inferring the mechanism
   from the assigned control. Seeking a recovered present never restarts an
   old impact.
3. **Unambiguous vertical trajectory convention.** The contract defines
   height 0 as the resting surface and 1 as fully raised. The approved
   geometry has different resting centres: intake 658, deck 648, console
   540, platform 568; raised 408. A partial-lift fall must start at its actual
   intake-based height and finish at the destination surface. `FALLING` and
   generic motion `fromHeight/toHeight` do not name those surfaces; broken
   entries name only the destination. Please define/encode a bounded
   reconnect-complete vertical origin and destination (and easing) so the
   renderer does not choose an old surface from local history or infer a
   landing from x. Include partial lift to intake, platform landing and
   broken old crate alongside replacement examples. This may be a precise
   convention plus validation rather than a particular requested field name.

These three items complete the sheet data review. Existing API-session
registration/admission remains Backend's subsequent runtime seam, not an
additional change to the accepted input/recovery interface. No new game rule
or timing decision is requested.

## Covered surfaces

| Sheet/state | Authoritative source or accepted seam |
| --- | --- |
| Food step / available / busy / closed / rested | step ID, ASKING boundary, ownAvailability, offers; all labels use server reasons |
| Partner rows / selected Partner | every canonical partnerChoice, offers, ordinary authorized identity and room; no roster filtering or eligibility inference |
| Asking / Cancel / Join / Decline / races | invitation ID/revision/deadline, original request and pair-private closures/receipts |
| Instructions | approved static words; separate from the Task clock |
| Briefing / assigned control | participant selfControl, runningAt, partner identity; no local assignment |
| Panel strip / RELEASE / LOCK | server anchor, direction, 50/200 ms parameters and explicit offers; one stable button captures its act |
| Winch Hold / key / custody | original Task/control session, causal DOWN/UP, ownGesture and offers; off-recovery closes actual holder and pending contacts atomically |
| Swing / raised crate / brake / buffer | approved display formula from anchored panel/swing/current custody and blade state; no RNG or defense cause |
| Old fall / replacement / intact return / landing | crate ID/generation, motion and broken evidence; vertical convention in item 3 remains to clarify |
| Warning / offline / STOPPED | explicit warning interval, participant online/alive, neutral mechanism cue; top-bar partner state remains visible while the hint shows danger |
| Own pending / refused / unknown / recovered press | original request plus presser-only correlated durable receipt; no outcome inferred from receipt timeout |
| Victim card / terminal cards | durable alive/outcome, authoritative death and terminal detail requested in items 1-2 |
| Common return / participant return room | fixed returnsAt plus original ordinary board placement frozen through AWAY; no phase transition or delay from animation |
| Other phones away / after return | canonical roster retained, away IDs only suppress drawn figures; ordinary publications frozen until return; stock only, no private terminal message |
| Public stock / half / zero | integer authorized doses, correct audience basis and revision; no food deducted by a visual |
| Meal/hunger evidence | occurred ownMeals and neutral turnEnds; no active-seat inference, speculative branch information or #230 visit scheduler |

The ordinary snapshot is an intentional additional input: public identities,
return rooms, office/board state and phase must bind the same verified API
response. They are not missing Food fields. The native renderer will keep its
last authorized Task state only for the live return transition; it will not
invent or replay a private Task result after a reload that carries none.

## Designer clarification separate from contract

`handoff.json` rule `food-warning` says the warning continues at one package
or less and names “Food low: ½ package left”. The actual `phone.mjs:459`
reference renders `n=0.5` as “Food: 0.5 packages” and zero as “Food: 0 packages”.
The 76-state plan deliberately includes both supplemental states. Designer
must resolve the source inconsistency before the native labels are finalized;
no contract field or owner rule change is needed to supply the dose count.

The refusal reference says “The crane had moved on.” Native use of that
specific explanation must remain limited to a correlated refusal consistent
with it; authentication, invalid-view or transport failure instead conceals
or enters the existing reconnect/unknown path. No invented detailed server
reason or queued input replay is introduced.

No additional missing data was found for the normal/reduced-motion states,
key/survivor path, request races or fixed common return beyond the three items
above. Runtime privacy, ordering and connected behavior still need their
separate tests; synthetic data sufficiency does not establish them.
