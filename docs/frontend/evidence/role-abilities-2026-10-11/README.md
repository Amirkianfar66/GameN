# Role-ability states — browser-simulation evidence, 11 October 2026

This is the evidence for [role-abilities.md](../../role-abilities.md) (issue [#99](https://github.com/Amirkianfar66/GameN/issues/99)).

The capture runs in the board simulation, which uses the release's own screen, controller, host, styles and art. It feeds them:

- synthetic views, checked against the protocol 2 schemas;
- a scripted command desk;
- for the Supplier, a schema-checked own-acknowledgments document.

All names are synthetic. This is Chromium device emulation at scale 1. No physical phone, backend, emulator or multiplayer run is involved.

**No Designer treatment is shown, because none has been delivered.** What is shown is the phone's current words and approved art in each state.

## Command

With `npx vite --config apps/game/dev/board/vite.config.mjs` serving `127.0.0.1:5178`:

```sh
CHROME_PATH=/path/to/chrome node apps/game/dev/capture-role-abilities.mjs docs/frontend/evidence/role-abilities-2026-10-11
```

[facts.json](facts.json) has **20 measured steps, 0 with problems**, at 320×568 and 390×844. [capture-log.txt](capture-log.txt) is the run's log.

## What each journey checks

**Every step checks** that the page does not scroll and nothing overflows sideways.

**Card journeys** show what a role's own view states, where the phone shows it:

- "What you know" is opened in the card;
- the Supply results appear with the actions.

Each expected line must be **drawn**: present in the page and not hidden by style. No private word may appear outside the card.

| Step | Lines that must be drawn |
| --- | --- |
| `protection-states` (Undercover, round 3) | "Protection for Player 2: used up.", "Protection for Player 4: active." |
| `cracker-no-rescues` | "You have no Rescues left." |
| `scan-results` (Hacker, round 3) | "The Undercover is Player 5." and both Scan result lines |
| `alien-code` | "The Code is these four players: Player 1, Player 2, Player 3 (you), Player 4." |
| `supplier-results` (Actions view) | "Your Round 3 Supply granted one weapon each to Player 1 and Player 5." |

**Strip journeys** play an ability on the board by touch: open it from the tray, tap a character, wait out the controller's double-tap guard, confirm, and wait for the desk's answer. Each also gets the board measurements: press areas, hit tests, overlaps and 44 px controls. The strip must carry the ability's `data-kind`, the expected `data-status`, and the receipt's words.

| Step | Strip |
| --- | --- |
| `disable-registered` | `disable` / `accepted`: "Disable at Player 8 registered." |
| `disable-not-accepted` (`answer=reject`) | `disable` / `not-accepted` |
| `rescue-registered` | `rescue` / `accepted`: "Rescue of Player 6 registered." |
| `protect-registered` | `protect` / `accepted`: "Protection for yourself registered." |
| `officer-shot-registered` (round 1) | `shot` / `accepted`: "Shot at Player 5 registered." |

## A capture defect found and fixed

The first run checked only that the expected text was in the page. That check passed for `supplier-results` while the results were hidden by style in the Card view, where `compact-phone.css` keeps them out by design.

The check now counts only drawn lines, and the Supplier's journey opens the Actions view, where the results are shown. The handoff was corrected to say where they are.

## Also re-run on this branch

These runs used temporary output directories and are not committed:

- The existing board journey, `capture-board-play.mjs`: 124 steps, all clean. This confirms the simulation's role-based weapons and Rescues changed no board outcome.
- The Insider capture: 18 steps, 0 problems.

## Images

| Image | What it shows |
| --- | --- |
| [320x568-protection-states.png](320x568-protection-states.png) | Protection used up and active |
| [320x568-cracker-no-rescues.png](320x568-cracker-no-rescues.png) | A Cracker with none left |
| [320x568-scan-results.png](320x568-scan-results.png) | The Undercover known, and two Scan results |
| [390x844-alien-code.png](390x844-alien-code.png) | The Alien's Code |
| [320x568-supplier-results.png](320x568-supplier-results.png) | Supply results with the actions |
| [320x568-disable-registered.png](320x568-disable-registered.png), [320x568-disable-not-accepted.png](320x568-disable-not-accepted.png) | A Disable registered, and not accepted |
| [390x844-rescue-registered.png](390x844-rescue-registered.png), [390x844-protect-registered.png](390x844-protect-registered.png) | Rescue and Protection receipts |
| [320x568-officer-shot-registered.png](320x568-officer-shot-registered.png) | The Officer's shot in round 1 |

Every step also has its image at the other size.
