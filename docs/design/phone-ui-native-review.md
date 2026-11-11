# The native phone interface: Designer's visual review

**11 November 2026. Status: not accepted yet.** For Frontend, with Integration. Integration's review of [#217](https://github.com/Amirkianfar66/GameN/pull/217) notes that Designer's visual acceptance of the native interface had not been received; this is it.

The native interface follows the phone pack on the glass, the large-text lists, the counts, the Blackout-before-vote sequence and the role stage's timing. It differs from the pack on four things every player sees each round: the room's framing, the tab bar, the top bar at large text and the results. Designer accepts it once those four are changed. The other eight can follow.

![The pack beside the native interface](evidence/phone-ui-native-review-2026-11-11/comparison.jpg)

## What was reviewed

- **The native interface** on `main` at `d574d371` (after #217 and #220), through Frontend's committed captures in desktop Chromium and their `facts.json`:
  - `docs/frontend/evidence/pre-vote-consumer-2026-11-11/presentation/`, source `b63403e6`: ballots, results, the glass and keyboard focus at 320 × 568 with 200 % text and at 390 × 844, with 7–9 players, both motion settings and the solid fallback;
  - `…/synthetic/`, source `c5a70b7e`: the five rooms at 100 % and 200 % text, and the Blackout-before-vote sequence;
  - `…/round-order/`, source `d1a03c87`: the Round order panel;
  - `docs/frontend/evidence/phone-ui-2026-11-10/controls-follow-up/`, source `838558bd`: Actions, Panels, Scan, the Hospital's targets and the dark board;
  - `…/synthetic/`, source `0af438bc` (earlier): the lobby, the character grid, private talk, Clone and the role stage.
- **Against** the phone pack on `main` (#207): its sheets, the [handoff](phone-ui-handoff.md) and the owner's decisions in [owner-decisions.md](owner-decisions.md).
- **Not checked:** any phone, Safari or VoiceOver; motion and frame rate; anything the captures do not show. The captures come from five source commits. The earliest ones (lobby, private talk, Clone, role stage) may have changed since.

## Accepted

1. **The glass**, exactly as decided: blur 2 px, saturate 1.3, brightness 0.56, the 20–34 % tint and the three-shadow halo under light words (`facts.json`). The room shows through.
2. **Lists at the Largest text on the smallest phone.** Ballots and results become rows of whole names. Each portrait is the size of the seat number beside it and on its line. The count shows once, at the end of the row. Long names wrap instead of being clipped.
3. **Each count once.** There is no "N votes" line, and "You" sits in the cell's top-right corner.
4. **The keyboard.** Every choice is reachable, the check takes focus, and Enter registers the ballot once.
5. **Blackout before the vote.** It is lit for 5 s and dark for 10 s, and every position shows as a neutral ring. The Disabler chooses a position (A1–A5), not a character. The board comes back, then the full 60-second Jail vote and the 5-second result follow.
6. **Targets and Scan.** The Hospital's targets are reachable at 200 % text, with the target list as the text alternative. Scan asks for a guess, checks it in a full sentence, then registers it.
7. **The top bar at ordinary text:** portrait, name, "Your turn", Promises with its word, the clock and ⋮.
8. **The role stage's timing.** The card shows before 20 s and the film after it. Skip does not confirm Ready, and Ready stays a manual tap after the minimum. The lobby and the character grid are as drawn.

## To change before acceptance

1. **Fill the room's space.** The room is fitted to the screen's width, with dark bands above and below it (Room A, Room B, the Hospital and the Jail at 390 × 844). The pack fills the space between the bars at the smallest scale that still fills it, with everyone in view: sheets 20–24 and the owner's "too zoom" decision. The room's own control, such as "Window · Hospital", is missing too.
2. **The tab bar.**
   - At 320 px with 200 % text the labels break mid-word: "Boar/d", "Actio/ns", "Panel/s". Keep every label whole on one line, at its ordinary size, as on sheet 56.
   - The open tab is teal (Actions, Panels and sometimes Vote). The pack's selected tab is amber with a filled icon (sheet 08).
   - Pass and Vote are a flat tab. The pack's centre button is raised and round, and amber when it is the player's to press.
3. **The top bar at large text.** At 320 × 568 with 200 % text, the subtitle ("Current board · shared: After Blackout · Round 6") takes three lines. With the clock's row, the bar takes about a third of the screen. At that size the pack moves the round out of the bar and gives the title two lines instead of its subtitle: sheet 56 and the top bar's rules in [phone-ui.md](phone-ui.md). The phase is also said twice ("Blackout · Round 1", then "Before Blackout · Round 1").
4. **Results name the outcome.** The native result says "Jail full · no transfer" or "Player detained", on dark glass. The pack's result is the paper card whose headline names the player and the outcome: "GUS GOES TO JAIL · 7 votes · 4 needed of 8", "GUS CHOSEN · JAIL FULL", "NO ONE GOES TO JAIL", "BEN IS CAPTAIN" (sheets 37 and 38). At the Largest text its stamp and art step aside, but the headline stays (sheet 56).

## To change after

5. **Count and seat number.** In the 3 × 3 result both are the same cream square, side by side above the portrait. The pack puts the count on the portrait's corner, amber for the leader, and the seat number beside the name (sheets 37 and 38).
6. **The words after Register.** Scan says "Registered. Waiting for the authoritative view.", which is developer wording on a player's screen. Each action's state after Register is in the handoff's [After Register](phone-ui-handoff.md#after-register) table. Scan's should say that it is registered and that its private result appears when it arrives.
7. **The Round order panel** is one run-on line. The pack lists each phase on its own row, with an icon and its timing (Panels, then Round order), in the 1.3 order with the Blackout before the Jail vote.
8. **The role card and Ready.** The role is shown as a text panel, and Ready is amber while the card is up, before it can be used. The pack shows the card large (sheets 17 and 31), with Ready dimmed until the film ends.
9. **Cancel while choosing a target.** The centre button becomes "×". The pack keeps Cancel in the targeting bar (sheet 29) and leaves the centre button alone.
10. **Density.** The Actions and Panels rows are tall and mostly empty. The pack's action tiles carry each action's state, and a Panels row that cannot be used says why (sheets 28 and 32).
11. **Board name tags** are clipped to "Cr…" at large text.
12. **Clone.** The "CLONE ACTIVE" stamp is drawn over "Clone active through Round 7." (earlier source `0af438bc`).

## Not built yet

- The rooms' ambient motion: requested as [DSN-REQ-23](integration-requests.md#dsn-req-23).

## Designer's follow-ups

- Sheets 02 and 03 and the pack's Round order panel still call the Blackout before the vote a proposal. Engine 1.3 makes it the order for new matches (#217), so they will show it as the current order, keeping the earlier order for older matches.
- Designer reviews Frontend's next captures against this list, then gives the visual acceptance.
