# Native OS preference change with explicit full motion

Current hosted runtime over the schema-checked synthetic board desk, on baseline `8e213d7dae2b44b58d227ae4e0f014e8a85b50da`. This is the bounded [explicit-full correction](../../motion-os-preference.md), separate from the earlier 77-record capture. The old capture did not establish this wiring case.

```sh
node apps/game/dev/capture-board-recovery.mjs <output-directory> --explicit-full
```

[facts.json](facts.json) contains 6 successful records at 320×568, 390×844 and 1280×720. Each pair includes a measured settled view and a lifecycle summary. [capture-log.txt](capture-log.txt) records completion; [source-fingerprint.json](source-fingerprint.json) pins the modified source bytes. [320x568-system-explicit-full-settled.png](320x568-system-explicit-full-settled.png) shows the visible authoritative piece after cancellation.

The script uses the real setting control to choose reduced and then explicitly full, starts just after a normal clock frame, and changes Chromium's OS preference during a native 900 ms flight. It observes native preference delivery and **equal screen-frame counts before and after cancellation**; no public snapshot or forced redraw is sent. `noRedrawOnReduction` is true for all three cases. Native animations are cancelled (5 on each phone, 6 on the display), all flight effects disappear and the authoritative Room B piece is visible. Turning reduction off replays nothing, a later move works, and the two mounted media-query listeners are removed on disposal. A subsequent native preference event revives no UI.

Media-query listener/animation instrumentation forwards native operations without replacing their behavior. The frame count comes from actual screen subscriptions, not inferred DOM changes. All names and views are synthetic. No credentials, real-player payloads or emulator exports are included.

Run locally on macOS, headless Chrome 155.0.8059.39, Node 22.21.1/npm 10.9.4. This proves the observed native browser wiring, not physical-device suspension, cloud delivery or multiplayer correctness.

The complete updated recovery journey also passed **83 records / 72 measured steps**, covering the prior stale/deadline marks and receipt cases as well as the new explicit-full transition. [full-recovery-log.txt](full-recovery-log.txt) preserves that successful completion; the full temporary fact/screenshot set was not added to this bounded patch.
