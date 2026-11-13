# Food test 1: final early-Hold reference port

This adopts Designer's exact reconciliation
`cd2b70dd860368cd6d0cb1bd7b01cfface4ae75b`, reviewed by Integration in
[#241](https://github.com/Amirkianfar66/GameN/pull/241#issuecomment-6863901747).
It follows the already-approved early contact; no gameplay or protocol changes.

The offered Hold remains enabled. At the intake, away from a locked stop 1,
its line is `Lifts when the hook stops at 1`; at stop 1 while the crate is still
rising it is `Lifts when the crate is in`. The glow waits for immediate pickup
eligibility. An accepted own `pendingIntent` at the intake shows **Hold**, the
approved waiting line/hint, a private amber hourglass, dashed amber ring and
pressed state. It never says **Holding**, moves the figure or lifts the crate
before authority does. Danger, STOPPED and offline hint precedence is retained.
Reduced motion removes the pressed travel.

The two new frames are `food-states-15` and `food-large-15`, at the same
`mistakes` frame as `winch-10`, with an actual engine-admitted DOWN 300ms before
the frame. The native fixture first observes the pre-input state, sends that
exact original request through the production controller, consumes its actual
engine receipt and then observes the authorized pending projection. Its
original causal UP also has an engine-produced receipt and post-UP packet.
There is no browser-side pending outcome or rejection substitution.

The Node audit integrates the actual Hold input helper and controller with
those immutable engine requests/receipts. It passes: enabled offered Hold,
waiting words, no glow/lift, the same gesture's DOWN/UP, closed pending contact,
unchanged intake crate/no fall, and byte-equal normalized Partner views both
with and without the pending contact and after UP. The previous unresolved
reference audit is retained; the new facts are
[input-audit-cd2b70dd.json](evidence/food-supply-corrections-2026-11-13/input-audit-cd2b70dd.json).

The browser smoke now additionally checks the real rendered waiting button's
words, pressed state, dashed ring and reduced-motion transform, and releases
it through its single assistive-click path before checking the authoritative
off packet. Those browser checks are prepared, not yet run at this checkpoint.
The Node pointer lifecycle check above has run. No physical-device claim is made.

The comparison map now contains **84 states / 336 planned pairs**. Only the
two new packets were generated while Backend held the timing slot; canonical
full regeneration and final Food/ordinary browser captures follow the explicit
slot handoff. The complete 17-render / 13-host closure is updated, with the five
changed Designer source pins. The 37 SVGs and other nine source pins are
unchanged. Integration owns production registration; no fence is relaxed.

The prior clean `a06fb845` / native `4a16b031` diagnostic completed **328 pairs**,
with zero runtime exceptions or measured control/tag/answer/briefing problems.
It predates this reconciliation and is not final visual evidence. Its four
`panel-16` pairs explicitly record the engine's 12 public/own doses versus the
reference's 2-dose Task constant. The native authoritative six-package gauge
stays. The earlier failed 33-pair equal-count assertion is also preserved as a
historical harness diagnostic, not concealed as a passing run.

Final captures, ordinary regressions, full client checks, Designer's exact #240
visual acceptance, Integration CI and the native connected journey remain
separate gates. Backend has released the next static slot after its 7/8/9 Food
matrix passed; its separate historical Ready-concurrency diagnosis remains
with Backend. This port changes no phase duration, deadline or authority and
includes no #227/#228/#230 work, activation or deployment.
