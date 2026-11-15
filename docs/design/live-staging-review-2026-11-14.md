# Live staging review, 14 November 2026: stopped at sign-in

The owner asked Designer to play the deployed test release at 390 × 844 and 430 × 932: host a labelled test lobby with bots, then compare each screen with the approved sheets. The review is posted in [#222](https://github.com/Amirkianfar66/GameN/issues/222). This file keeps its record and evidence.

## Status on 15 November 2026

This is the record of 14 November. Since then:

- **Finding 6 is fixed.** The policy now allows the Food scene's pictures (`img-src 'self' data: blob:`, #260), and the published policy includes it (#266).
- **Findings 7–9 stand.** The owner played the deployed build again on 15 November and reports that the room windows still don't move. On `main` at `512a5e28`, no bundle carries `room-drawing-1.0.0`, and the room view is the pre-pack one.
  - Designer's room scene (#261) and phone shell (#265) are ready. They draw the approved rooms, the windows' motion, the framing, the bars and the tags.
  - Frontend's connection and Integration's admission come next: #222's ROOM-COMPONENT and PHONE-SHELL rows.
- **Findings 1–5 are unchanged on `main` at `512a5e28`.**
  - The sign-in words are in `apps/game/src/planet/session.ts:221`.
  - The checkbox rule is at `apps/game/hosted/planet/planet.css:44`.
  - The "Mothership · Planet" title, the "Connecting to Planet…" shell and the missing icons are in `apps/game/hosted/planet/index.html`.
  - Finding 3 comes with Designer's main menu (#278), whose build waits for Frontend.

## What ran

- **Page:** <https://gamen-mothership-staging.web.app/planet/>. Its bundle, `/assets/planet-DhC_VvK7.js`, contains the #259 change, so it is built from `main` at `0d4fde64` or close to it.
- **Browser:** Playwright 1.63 Chromium with touch and mobile emulation at 2× scale, at 390 × 844 and 430 × 932. These are browser viewport checks, not phones.
- **Unchanged:** the browser's automation signals, its user agent and App Check. One run used a windowed Chromium on a virtual display instead of a headless one. It was refused the same way.

## What happened

App Check refused every attempt. `exchangeRecaptchaEnterpriseToken` answered 403 nine times between 19:27 and 19:38 UTC, once for each fresh browser profile or reload. The game then shows "Authentication or saved session recovery could not be verified."

There was no sign-in, so there was no lobby, match or bots. There was no test match to end.

On 14 November, Integration recorded the same: empty automated browser profiles fail App Check, and normal Chrome passes.

## Inspected at both sizes

| State | Evidence |
| --- | --- |
| Page shell before the script runs (first 0.7–2.2 s) | Panel 1 of [390 × 844](evidence/live-staging-review-2026-11-14/entry-states-390x844.jpg) and [430 × 932](evidence/live-staging-review-2026-11-14/entry-states-430x932.jpg) |
| "Connecting…" | Panel 2 |
| Sign-in refused | Panel 3 |
| Reconnect pressed, then 10 s | Panel 4, and the [recording](evidence/live-staging-review-2026-11-14/reconnect-unchanged-390x844.mp4) |
| Settings → Display settings | Panel 5, and the [annotated crop](evidence/live-staging-review-2026-11-14/display-settings-reduce-motion.jpg) |
| Sheet 10 beside the live entry | [menu-sheet10-vs-live-390x844.jpg](evidence/live-staging-review-2026-11-14/menu-sheet10-vs-live-390x844.jpg) |

Timings and measurements are in [capture.json](evidence/live-staging-review-2026-11-14/capture.json). The page does not scroll at either size. The ⋮ button is 44 × 44 and Reconnect is 109 × 47.

## Not reached

Everything after sign-in:

- the intro, which starts only after sign-in;
- the main menu, Host, Join and the lobby;
- character selection;
- the role card and the role film;
- boarding;
- the room view and the whole board;
- the top bar, the tab bar, actions and targeting;
- the Food Supply Task, its controls, results and return;
- voting and results.

## Findings

| # | Finding | Kind | Priority | Owner |
| --- | --- | --- | --- | --- |
| 1 | Sign-in refused: the words don't fit, and Reconnect cannot work | Incorrect implementation | P2 | Frontend; Designer gives the words |
| 2 | Display settings: the Reduce motion box is stretched away from its label | Incorrect implementation | P2 | Frontend now; Designer's Settings component later |
| 3 | The entry says "Mothership", not "Game N" (#222 item 5) | Approved design awaiting integration | P1, as in #222 | Designer's menu component; Frontend integrates |
| 4 | Unstyled page shell before the script | Optional | P3 | Frontend |
| 5 | No app icon | Optional | P3 | Designer draws; Frontend links |

**1. Sign-in refused.**
- Expected: sheet 45's rule, "Every state keeps its words, its positions and an honest next step". Sheet 10's Offline state keeps the menu and says what returns.
- Actual:
  - The words mention "saved session recovery" on a first visit that has none. They give no next step.
  - Reconnect sends no new App Check request. The Firebase library holds a 403 for 24 hours inside the page ("Requests throttled due to previous 403 error"), and nothing on screen changes. Reloading the page does try again.
  - Reconnect is already offered while the first connection is still running.
- Smallest correction:
  - When refused: "This browser could not be verified. Reload to try again.", with a Reload button that reloads the page.
  - While connecting: no Reconnect until an attempt has failed.

**2. Reduce motion.**
- Expected: sheet 32. Each control sits beside its whole label, and Reduce motion is a switch with its explanation.
- Actual: the checkbox element is 239 px wide at 390 (277 px at 430). Its box is drawn mid-row, and "Reduce motion" gets 52 px, on two lines at the far edge.
- Cause: `apps/game/hosted/planet/planet.css:44`, where `.planet-setup input{width:100%}` also applies to the checkbox.
- Smallest correction: leave checkboxes out of that rule, so the box sits beside "Reduce motion" on one line.
- Later: the full Display page (sheet 32, #222 item 27) should come from one canonical Settings component in Designer's source, which Frontend integrates.

**3. The entry name.**
- Actual: the header says "Mothership", the browser tab "Mothership · Planet" and the page shell "Connecting to Planet…".
- Expected (sheet 10): "Game N / by Plan B", with Join first, Host second and "Recover my seat" as a link.
- The live menu itself was not reached.

**4. Page shell.**
- Actual: for the first 0.7–2.2 s, "Connecting to Planet…" shows in the browser's default serif (Times New Roman, 16 px), top left.
- Expected: sheet 10 starts on the intro's black.
- Correction, in `apps/game/hosted/planet/index.html`: either use the app's font and background, or show an empty dark screen until the app draws.

**5. App icon.**
- Actual: `favicon.ico`, `apple-touch-icon.png` and a web manifest all answer 404. The browser tab has no icon, and "Add to Home Screen" uses a snapshot of the page.
- No icon exists in the design sources. Designer can draw one from the Game N mark for the owner's approval.

## Update: the owner's iPhone

The owner then played a match on staging and sent two iPhone screenshots: the Food Supply Task (the Panel) and Room B during Private talk. They are the owner's captures of the live build on a real phone, posted in [#222](https://github.com/Amirkianfar66/GameN/issues/222#issuecomment-6883358473). They are not stored here.

| # | Finding | Kind | Priority | Owner |
| --- | --- | --- | --- | --- |
| 6 | Food: the Supply Room and both crew members are not drawn | Regression on the deployed page | P1 | Integration |
| 7 | The rooms are the old pictures, not `room-drawing-1.0.0` (DSN-REQ-18) | Approved design awaiting integration | P1 | Integration, with Frontend |
| 8 | The rooms don't move: no ambient motion (sheet 55, DSN-REQ-23) | Approved design awaiting integration | P1 | Designer's component; Frontend integrates |
| 9 | The room view's framing, Pass, top bar and tags are the pre-pack ones (#222 items 1–3) | Approved design awaiting integration | P1 | Frontend, with Designer's components |

**6. The Food art.**
- The page's policy is `img-src 'self' data:`, from `scripts/hosted-preview-policy.mjs:6`.
- The Food scene draws `supply-room.back.svg` and the operator drawings as `<image href="blob:…">` (`food-assets.mjs`, `food-scene.mjs`). The browser blocks them: "Loading the image 'blob:…' violates the following Content Security Policy directive: "img-src 'self' data:". The action has been blocked."
- The same file loads from its own address on the live origin. See [food-art-blocked-by-csp-390x844.jpg](evidence/live-staging-review-2026-11-14/food-art-blocked-by-csp-390x844.jpg): the top picture uses a `blob:` URL, as the game does, and the bottom one uses the same-origin URL.
- This affects every browser on staging. The harness captures accepted on #240 ran without the production headers.
- Smallest correction: `img-src 'self' data: blob:`. Then capture again from the deployed page, and run the review harness under the production headers.

**7. The room pictures.** The live bundles still carry the old pictures, for example `--bm-scene-room-b-back` in `scenes.art.0ff8b3c930.css`. No bundle contains the release's drawing.

## Limits

- My own captures are from desktop Chromium in a phone-sized viewport; no Safari, phone or screen reader. Findings 6–9 come from the owner's iPhone.
- Motion was not reviewed, since nothing animates before sign-in.
- Finding 1 shows only on a browser that App Check refuses.
