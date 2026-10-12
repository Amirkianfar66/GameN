# Phone feedback browser measurements

Input baseline: `abb6839524b6dc3e5225e600f2f067c3fa3f9501`. The `before` folder shows the unchanged production layout/drawing port over the added development-only fixtures. It is Chromium phone emulation, not physical iPhone/Safari or backend-connected evidence. All nine identities use long names; occupied rooms stay within the exact 1.3 capacity tuple. The released-Injured Jail case has `jailed=false` independently of its room.

Reproduce with Node 22.21.1/npm 10.9.4, after `npm ci` and `npm run build`:

```sh
node_modules/.bin/vite --config apps/game/dev/board/vite.config.mjs --port 5192
node apps/game/dev/capture-phone-feedback.mjs docs/frontend/evidence/phone-feedback-2026-10-12/before
```

The capture plays targeting and confirmation through browser touch input, measures 44px controls, room/tag overlap, hit testing, reachability, phase/navigation clipping and document/board overflow, and checks that the released occupant has no Jailed marker. Cases cover 320×568 and 390×844; normal text, 20px top/16px bottom safe areas, and 28px standard text separately. Facts preserve every measured case; representative screenshots are retained.

Baseline: 72 measurements, seven normal-text internal-board overflow failures at 320×568. No page/sideways overflow, overlapping/small/unreachable targets, clipped status bar or false Jailed marker was reported. The tightest active-targeting case has a 348px board viewport against 412px of required bands. Enlarged-text access is measured separately and may use internal scrolling. These failures remain open until the reviewed Designer layout is integrated; targets and original anchors are not silently reduced.
