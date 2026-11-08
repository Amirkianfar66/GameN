# Inherited layout notes, separate from the crew release

Recorded 8 November 2026 from [Designer's visual acceptance](https://github.com/Amirkianfar66/GameN/pull/196#issuecomment-6716999949) of release `469b709b6689a1063ec36a10c70b8b6e2420c18c`. Designer identifies all three as pre-existing layout and nonblocking for artwork publication. These are local tracking labels, not newly opened issues. No fix is included in the character release or its capture follow-up.

| Local label | Inherited behavior | Evidence | Disposition |
| --- | --- | --- | --- |
| Layout 1: Clone ACTIVE | The stamp overlaps the status line at 390×844. The historical view has the same overlap. | [Current](evidence/crew-runtime-adoption/390-844-full-private-clone.png), [historical](evidence/crew-runtime-adoption/390-844-historical-private-clone.png) | Deferred to a separate layout change; nonblocking for artwork. |
| Layout 2: capsule names | At 320×568 the capsule name tags truncate to `Cr…`; the seat numbers remain readable. | [Full](evidence/crew-runtime-adoption/320-568-full-capsule.png), [reduced](evidence/crew-runtime-adoption/320-568-reduced-capsule.png) | Deferred to a separate layout change; preserve seat identity and target geometry in any later fix. |
| Layout 3: A5 | Room A's left edge clips the figure at A5 at 320×568 and 390×844, as in the historical board. | [320 current](evidence/crew-runtime-adoption/320-568-full-board.png), [320 historical](evidence/crew-runtime-adoption/320-568-full-historical-board.png), [390 current](evidence/crew-runtime-adoption/390-844-full-board.png), [390 historical](evidence/crew-runtime-adoption/390-844-full-historical-board.png) | Deferred to a separate layout change; no slot, hit-area or drawing change in this follow-up. |
