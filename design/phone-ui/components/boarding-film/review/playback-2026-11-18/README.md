# Boarding playback checkpoint

Pre-game Animator, 18 November 2026. [Issue #316](https://github.com/Amirkianfar66/GameN/issues/316), under [the handover #311](https://github.com/Amirkianfar66/GameN/issues/311). [Frontend mounting and recovery contract](../../../../../../docs/design/components/boarding-film.md#pre-game-animator-connection-checkpoint--18-november-2026).

The source fix prevents a cheap prepared film from becoming blurry just because callbacks arrive at 30 Hz. It also prevents a cancelled preparation from being adopted and prevents disposal of an old preparation handle from erasing a scene that has adopted it. The pictures, shots, clocks and public-roster selection remain the pilot's.

## Identity and limits

- Base: #285, `104a285d8250322e4f6f32552828586b44702401`.
- Captured candidate: `602ac9693976e2b03a3b64121aa9b3d276aae729`, clean source. The following commit adds this evidence only.
- Artwork dependencies unchanged from the base: hosted crew tree `a9d72b531d078f779ef8de257adbb17c48fa8403`; scene/rig tree `e770cc60d133b812db2c19bb416bdf48e7082a65`; released films/kit/roster tree `562f6b20e160abea5a869136bb50a066711c7b1c`.
- Browser: desktop headless Google Chrome `157.0.8103.80`, 390 × 844 and 430 × 932 CSS pixels, device scale 2.
- The canonical component is bundled directly by Vite, using the existing component harness and production response headers. Actual served headers match SHA-256 `424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb`. The same header digest was checked against `origin/main` at `7574bfe5`.
- The harness uses synthetic public rosters and no server session. The actual app still uses SVG; no native canvas adoption, physical phone, Safari, VoiceOver or device GPU/memory test is claimed. Scheduler/cost simulation is not a performance measurement. #285's old performance figures have not been remeasured for this fix.
- No phone pack departure or changed artwork is proposed. This source-only PR cannot change the playable interface. Frontend's eventual native adoption still needs the phone comparison gate and the Lead Designer's explicit approval.

## Browser results

[`check.json`](check.json) records the exact URLs, headers, source, individual assertions, capture hashes and errors. All **90 assertions and 12 captures passed**, with no policy violations or page/request errors except the harness's absent favicon, which is excluded from request failures.

| Size | Full-motion assertions | Device reduced-motion assertions |
| --- | --- | --- |
| 390 × 844 | 24/24 | 21/21 |
| 430 × 932 | 24/24 | 21/21 |

The assertions cover cancelled/transferred preparation, cleanup, public-only 7/8/9 rosters, late mounting at 7,400 ms, seeking back and recovering, cheap 60/30/120 Hz scheduling, sustained expensive drawing, unprepared lateness, reduced-motion cancellation, suspend/resume, coast expiry and the exact film end. Pixel comparisons use the historical probe's 96 × 208 sample size and allow an average difference of 0.05 on a 0–255 channel for repeated browser raster draws.

The source fault was reproduced on the original `104a285d` runtime before the fix: at simulated 30 Hz with zero drawing cost, quality reached `0.5`; a cancelled preparation was adopted with zero held pictures; disposing a transferred preparation left zero held pictures. These were controlled browser regressions, not observations of iPhone Low Power Mode.

All captures below show the corridor at elapsed 8,600 ms. The reduced form holds its approved still; full motion draws that moment.

| Crew | 390 × 844 full | 390 × 844 reduced | 430 × 932 full | 430 × 932 reduced |
| --- | --- | --- | --- | --- |
| 7 | [View](390x844-7-full.jpg) | [View](390x844-7-reduced.jpg) | [View](430x932-7-full.jpg) | [View](430x932-7-reduced.jpg) |
| 8 | [View](390x844-8-full.jpg) | [View](390x844-8-reduced.jpg) | [View](430x932-8-full.jpg) | [View](430x932-8-reduced.jpg) |
| 9 | [View](390x844-9-full.jpg) | [View](390x844-9-reduced.jpg) | [View](430x932-9-full.jpg) | [View](430x932-9-reduced.jpg) |

Reproduce from the source commit with Node 22.21.1 and npm 10.9.4:

```sh
npm ci
npm run build
node design/tools/boarding-playback-check.mjs
```

The new record and images live beside the historical review; the earlier `check.json`, videos and render records remain unchanged.
