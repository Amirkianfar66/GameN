# Frontend acceptance of the Food render-data amendment

13 November 2026. Exact reviewed head:
`5a5bb9068cd4fb085cb2482cd969058221d2c870`, over accepted input/recovery
head `df52395c881bbe556797ec03fc0ed0e7fbe920ee`.

Frontend accepts this focused amendment for native consumer #235. All three
items in `food-supply-sheet-packet-trace-236.md` are addressed:

- The strict participant-only outcome supplies the exact loss reason,
  disconnected participant or delivered dose count. A later reconnection
  cannot change whose absence caused the cancellation.
- Each participant has durable original death mechanism, actor and time,
  validated against the assigned pair. The victim card can now use an empty
  cosmetic suffix without inferring the cause or replaying an old impact.
- All vertical values use the single global axis `Y = 658 - 250 * height`.
  Trajectories retain actual origin/destination, original interval and easing.
  Distinct surface coordinates, partial-lift falls, independent old wreck and
  replacement segments, and persisted SENT descent support current-pose
  reconstruction. These are rendering coordinates; no collision or timing
  decision moves to the phone.

I read the entire source/spec/test diff and the nine added synthetic packets,
then independently rebuilt the contracts workspace and ran the four focused
Food suites in the clean exact-head review checkout on Node 22.21.1:
**159 passed, zero failed/skipped**. The log is
`evidence/food-supply-preparation-2026-11-13/contract-236-amendment-tests.txt`.
The command/receipt, Hold ledger and clock-guard implementations are unchanged
by this amendment. Historical runtime paths remain outside it.

This closes Frontend's sheet-data review. Integration acceptance and required
CI remain separate gates. No Backend runtime, executable tuple, new-match
default, source/art release, native visual, physical device, network or
deployment approval is claimed. The half/zero-package source wording question
remains with Designer in #222; the contract supplies the required dose count.
