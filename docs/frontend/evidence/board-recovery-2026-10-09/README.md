# Fresh Frontend board evidence — 9 October 2026

This directory belongs to the [PR #92 consumer follow-up](../../board-recovery.md), starting from `aa007890c5bf8f4801bfb545c0f6da0426f7d6cd` on Designer base `ef4c2ee449f6b0a5991814e18acf7ab42e73ef02`. The captures use the current hosted screens, controller, renderer, host, styles and native motion. [source-fingerprint.json](source-fingerprint.json) pins the modified source bytes against that baseline. Earlier [board-play evidence](../board-play/README.md) remains historical and untouched.

All simulation names/views and all local-emulator participants are synthetic. These are DOM observations and screenshots of local test play, not Firebase document exports, credentials or real-player payloads. No physical device or deployed service was tested.

The code and captures are committed at `629889e69ded1d4615a7600bf9a0a9598adc2f54`. Full `npm run verify` passed there on a clean checkout with exit 0; [verification.txt](verification.txt) preserves the actual count/gate output. Subsequent handoff edits change documentation/evidence metadata only.

## Added recovery and native-motion capture

Command, with the existing board Vite configuration on `127.0.0.1:5178`:

```sh
node apps/game/dev/capture-board-recovery.mjs docs/frontend/evidence/board-recovery-2026-10-09
```

[facts.json](facts.json) has **77 records: 69 measured steps and 8 lifecycle/reload summaries**. [capture-log.txt](capture-log.txt) records a successful completion. All measured steps pass existing page/board/control bounds and hit-area checks; the added status-text check also requires words to fit their own boxes.

- At **320×568, 390×844 and 1280×720**, both the in-app and system reduced-motion preferences cancel native animations during a 900 ms public flight. The flyer, trail and puff are removed, the authoritative piece is visible in Room B, unchanged facts do not replay on return to full motion, a later move works, and disposal clears owned effects. The lifecycle records count actual `Animation.cancel()` calls; animation behavior is not substituted.
- At both phone sizes, the capture starts with real pending marks for **Rescue submitting/checking and Move submitting/checking/accepted awaiting its view**, then pauses the board under **stale and expired** conditions: 20 combinations. All private marks/ghosts disappear while the status strip remains. Receipt checks settle the original command without another send. The accepted stale Move can restore its ghost only after a current running view, and removes it on authoritative arrival.
- Unknown-result and identifier-only reload recovery at both phone sizes preserve exactly the four nonsecret reconciliation identifiers, use matching receipt IDs, and send **zero commands after reload**. The synthetic desk's receipt is held outside browser storage by the driver.
- Synthetic visibility events exercise the actual host/controller: hiding a sent command conceals the strip and marks; foregrounding after time elapses resynchronizes the clock and retains the recovery state with no additional command send.
- Expired turn, Captain election, Jail vote and release-vote status words fit at 320×568. The expired bar also fits at a doubled **reader default** text size (`Page.setFontSizes` standard 32 before load), with readable labels and internal board reflow.

Selected views:

| Image | What it shows |
| --- | --- |
| [320x568-system-settled.png](320x568-system-settled.png) | Native flight cancelled by system preference; current public piece visible |
| [390x844-in-app-settled.png](390x844-in-app-settled.png) | The in-app preference gives the same settled board |
| [1280x720-system-settled.png](1280x720-system-settled.png) | Shared display after cancellation, without private hooks |
| [320x568-expired-move-accepted-paused.png](320x568-expired-move-accepted-paused.png) | Neutral Move receipt retained; no ghost against the expired board |
| [320x568-reloaded-accepted.png](320x568-reloaded-accepted.png) | Receipt recovery after identifier-only reload |
| [390x844-foreground-expired.png](390x844-foreground-expired.png) | Retained command after foreground clock synchronization |
| [320x568-expired-enlarged-text.png](320x568-expired-enlarged-text.png) | Waiting words and phase label readable at doubled default text |

## Existing board journey, freshly repeated

```sh
node apps/game/dev/capture-board-play.mjs <temporary-output-directory>
```

The default run uses **320×568 and 390×844 phones plus a 1280×720 shared display**. [board/facts.json](board/facts.json) has **130 records, 124 measured steps, 287 character hit areas**, all clean; [board/capture-log.txt](board/capture-log.txt) completed without journey failures. Selected screenshots are copied here; the script's full screenshot set was generated in a temporary directory.

This repeats board action targeting, Supply's two distinct picks, Code's four, inline Scan and ballots/release choices, movement, Pass/legacy behavior, crowd layouts, the actual keyboard path (3 Tabs, Enter pick, Escape back), initial reduced motion, stale choice concealment, synthetic safe areas and doubled default text. At 320×568 with doubled text three characters start outside the internal board viewport; all are reachable and hit at their centres after internal scrolling. The page does not scroll. The display has no private hook or role word and shows a public move in flight.

Selected views: [four Code picks](board/320x568-code-confirm.png), [two Supply picks](board/390x844-supply-second.png), [inline Scan](board/390x844-scan-faction.png), [Hospital crowd](board/320x568-crowd-hospital.png), [keyboard focus](board/keyboard-focus-target.png), [enlarged text](board/320x568-enlarged-text.png), [safe areas](board/320x568-safe-areas.png), [legacy Pass slot](board/390x844-legacy.png), [public display](board/display-public.png).

## Current client/service local-emulator flow

[emulator/facts.json](emulator/facts.json) has **22 records, 15 measured steps, 8 character hit areas**, all clean, plus five display-privacy checkpoints with no hook or role word. [emulator/capture-log.txt](emulator/capture-log.txt) runs from lobby to successful host abort, with no pointer-fallback or failure note.

A host, one human player and six bots, and an admitted shared display used the current hosted client/service/rules through local Auth and Firestore. The staged start completed. The dealt role offered Disable and Hack; the script opened Hack, tapped an offered character and put that choice down. It then made a **keyboard Move** (2 Tabs to the room tag, Enter, confirmation), observed simultaneous native flights on phone/display and the neutral receipt, used **Pass**, cast a **Jail vote by tapping a character**, read the neutral recorded-ballot receipt, waited for the vote to close, and ended the synthetic match through host confirmation. The turn naturally arrived after 300 seconds; no deadline was shortened.

Selected views: [Hack choosing](emulator/emulator-06-hack-choose.png), [Move confirmation](emulator/emulator-09-move-confirm.png), [phone flight](emulator/emulator-10-move-flight-phone.png), [display flight](emulator/emulator-11-move-flight-display.png), [Pass receipt](emulator/emulator-13-pass-receipt.png), [Jail targets](emulator/emulator-15-jail-vote-choose.png), [neutral ballot receipt](emulator/emulator-17-jail-vote-recorded.png), [display during vote](emulator/emulator-18-display-during-vote.png).

The existing `capture-board-emulator.mjs` was run from a temporary local copy with only its base URL and helper import paths changed. Temporary copies of the existing practice server/provider/Vite/Firebase configuration likewise change only loopback ports/origins and local import paths. Ports: Auth 9731, Firestore 8731, websocket 9171, hub 4531, logging 4631, HTTP 5231, Vite 5181; project `demo-mothership`. Existing sibling-workstream processes and data were not used or changed. Temporary emulator configuration, debug logs and state are not committed.

## Limits

This evidence was produced locally on macOS with headless Google Chrome 155.0.8059.39 and Node 22.21.1/npm 10.9.4. Native browser inputs/animation show behavior in these observed cases. Synthetic faults/visibility events do not establish real device suspension or network behavior. The emulator runner uses the existing local deadline/bot tick, not deployed App Check, IAM or Cloud Tasks. This is one human-plus-bots flow, not nine independent humans, full outcome convergence, Code victory, draw or social-deduction balance acceptance. No deployment or physical phone/tablet acceptance occurred.
