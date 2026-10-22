# Phone feedback browser measurements

Input baseline: `abb6839524b6dc3e5225e600f2f067c3fa3f9501`. The `before` folder shows the unchanged production layout/drawing port over the added development-only fixtures. It is Chromium phone emulation, not physical iPhone/Safari or backend-connected evidence. All nine identities use long names; occupied rooms stay within the exact 1.3 capacity tuple. The released-Injured Jail case has `jailed=false` independently of its room.

Reproduce with Node 22.21.1/npm 10.9.4, after `npm ci` and `npm run build`:

```sh
node_modules/.bin/vite --config apps/game/dev/board/vite.config.mjs --port 5192
node apps/game/dev/capture-phone-feedback.mjs docs/frontend/evidence/phone-feedback-2026-10-12/before
```

The capture plays targeting and confirmation through browser touch input, measures 44px controls, room/tag overlap, hit testing, reachability, phase/navigation clipping and document/board overflow, and checks that the released occupant has no Jailed marker. Cases cover 320×568 and 390×844; normal text, 20px top/16px bottom safe areas, and 28px standard text separately. Facts preserve every measured case; representative screenshots are retained.

Baseline: 72 measurements, seven normal-text internal-board overflow failures at 320×568. No page/sideways overflow, overlapping/small/unreachable targets, clipped status bar or false Jailed marker was reported. The tightest active-targeting case has a 348px board viewport against 412px of required bands. Enlarged-text access is measured separately and may use internal scrolling. These failures remain open until the reviewed Designer layout is integrated; targets and original anchors are not silently reduced.

## Public result lifecycle checkpoint

`vote-lifecycle` contains 18 Chromium lifecycle records at 320×568, 390×844 and 1280×720. They exercise real hosted controllers/renderers over synthetic strict-schema result views: remaining time, stale suppression, OS reduced motion after explicit full mode, reconnect, reload with the same fixed result timestamps, and expiry without starting a phase locally. Both phone sizes have zero document/sideways overflow and every record has zero private hooks. Desktop document scrolling outside the result window is measured separately. Reproduce with `node apps/game/dev/capture-feedback-lifecycle.mjs <output-directory>` on the same fixture server.

The preserved Codex-produced frame/wardrobe/anchor draft is provisional following the owner's Claude design ownership correction. These captures establish frontend lifecycle behavior; they do not claim visual acceptance, physical-device coverage or multiplayer correctness.

## Menu/result review correction

`menu-result-review` contains 22 lifecycle records with the prior cases plus Menu already open when the server result arrives and Menu reopened during that same window. At both phone sizes the arriving result takes priority, then a compact current outcome remains above independently scrolling Menu controls. Scrolling those controls cannot conceal the result. Close, display settings and session controls stay accessible; no timer starts or restarts locally. Reproduce with the same `capture-feedback-lifecycle.mjs` script. The capture uses provisional framing and is frontend behavior evidence only.
