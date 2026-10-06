# Slice 2 fixture evidence: the shot flow

**Every image here shows synthetic fixture data, and the server behind it is a scripted double.** Each phone screen carries the "Fixture data" banner. None of this is backend-connected evidence, and none of it is a device measurement.

Captured on 6 October 2026 by `apps/game/dev/capture-shot-flow.mjs` with headless Chrome 154.0.8037.98 on macOS, against a private instance of the loopback fixture server. The script presses real keys and makes real touch taps through the browser's own input pipeline; it does not call the page's code. Phone captures use a 390×844 CSS-pixel viewport at device scale 2 with touch emulation; the narrow captures use 320×640 with text doubled. The role shown is the fixture's own synthetic assignment.

The visual treatment is a placeholder built from the Designer's token proposal. It is not finished or approved art.

| File | What it shows |
| --- | --- |
| `01-player-2-shot-not-available.png` | The other phone's private panel: the same Shot card, the server's "Not available", no reason and nothing to press |
| `02-player-1-shot-available.png` | The Officer's panel, opened with the keyboard, on its own turn: "Available" and "Choose a target" |
| `03-choosing-a-target.png` | After Enter on "Choose a target": the players in the same room as full-width controls, each with its public status in words. Focus is on the question, not on a control |
| `04-confirming.png` | After Enter on Player 2, and Enter pressed again at once: still the confirm step, nothing sent. "Register shot" is drawn as not yet active |
| `06-submitting.png` | After a tap on "Register shot" with the request arranged to be slow to arrive: "Sending your shot to the server…". Nothing has been registered yet |
| `07-registered.png`, `07b-registered-whole-phone.png` | The server's answer: "Registered", with "This is not a result." The whole-phone image shows every public part of the screen unchanged |
| `09-registered-reminder.png`, `10-registered-reminder-forced-colors.png` | After "Done": the card follows the view and adds the target from this page's memory. The second is the same in forced-colors mode |
| `11-checking.png`, `12-result-unknown.png` | Every command and receipt request made to fail: "Checking…", then after three checks "Result unknown", with "Check again" not yet active in the instant it appears |
| `13-not-registered.png` | A rejection arranged by the operator, shown with the server's code and no invented reason |
| `14-turn-ended-while-confirming.png` | The next turn opened while the confirm step was on screen: the choice is gone and nothing was sent |
| `15-connection-lost-while-confirming.png` | The feed dropped while the confirm step was on screen: the choice is gone, actions are paused, nothing was sent |
| `17-rejection-still-shown-after-a-double-tap.png` | A double tap on "Register shot" with a server that rejects at once: the rejection is still on screen afterwards |
| `18-reloaded-checking.png`, `19-reloaded-registered.png` | The page reloaded while its request was still on its way: it asks about the command and offers no new target; when the request lands it reports the registration and says it no longer knows the target |
| `20-`, `21-`, `22-narrow-200-percent-*.png` | Choosing, confirming and the registered report at 320 px with text doubled: whole words, no sideways scroll |

`facts.json` holds what the script measured in the pages at each step: the card's step and wording, which control was active, where focus was, what had been spoken and on which channel, whether the panel, role card and card title were the same nodes across steps, control sizes, what was left in a closed or backgrounded page, what was kept in storage and when, whether the table and the target phone changed during the registration, the command and receipt requests the server received, the browser's log, and every request the pages made.

Regenerate from the repository root:

```sh
npm run dev:capture:shot --workspace @mothership/game -- ../../docs/frontend/evidence/slice-2
```

The slice 1 images in `../slice-1/` were captured before this slice and show the private panel without the flow.
