# Crew release evidence, 8 November 2026

Release `469b709b6689a1063ec36a10c70b8b6e2420c18c` merges reviewed head `060eae93f38c97ffc1fc3735e2f659894be6af80` with an identical tree. [Designer visually accepted all nine characters and motion](https://github.com/Amirkianfar66/GameN/pull/196#issuecomment-6716999949), with no artwork or hash correction. The existing nine passing CI checks and earlier passing consumer checks are reused. The remaining material acceptance gate is physical-phone performance; no deployment or default activation is performed by this evidence follow-up.

## Requested capsule record

Built with the ordinary guarded config:

```sh
./node_modules/.bin/vite build --config apps/game/dev/planet/vite.config.mjs --outDir /private/tmp/gamen-crew-capsule-guarded-469b709b
node apps/game/dev/planet/capture-crew-capsule.mjs
```

| Variant | Artifact | Actual record |
| --- | --- | --- |
| Full motion | [Walk-in and walk-out, 2×](evidence/crew-release-469b709b/capsule-walk-full-2x.mp4) | 780×1688, 7.44 s, 50 recorded frames, no audio. Both Echo and Mira enter and leave. |
| Reduced motion | [Settled entry and return, 2×](evidence/crew-release-469b709b/capsule-walk-reduced-2x.mp4) | 780×1688, 7.64 s, 55 recorded frames, no audio. No travel; poses remain. |

The viewport is 390×844 CSS px at device pixel ratio 2. Playback uses the recorded timestamps; 2× means pixel density. Recording cadence is about seven sampled frames per second and is not a measurement of application or phone FPS. The clips show the full board so the capsule and each participant's home placement are visible. Individual segments and eight 2× key frames are retained beside the combined videos. [Machine record](evidence/crew-release-469b709b/capsule-record.json) includes file hashes, build hashes, phase snapshots, observed states, SVG checks and browser results.

These are presentation fixtures, not an end-to-end match. The existing review harness's scene switch can rewind a revision. Initial controller-backed exit attempts also reached the unusable/expired-view guard and settled. The added excluded helper instead takes the real current consumer model, validates each subsequent player snapshot with `PlanetPlayerViewSchema`, requires increasing revisions, and drives the same production renderer with explicit in-phase receipt times. Entrance and exit are independently initialized; the cut is not evidence of a continuous match. It does not change the actual game controller, its clock, a phase timer or any command/Ready authority.

The recorded phases retain 15,000 ms declaration, 5,000 ms result and 60,000 ms conversation/ordinary-turn bounds. The exit fixture supplies the next fresh snapshot at the conversation boundary. Full motion shows each participant's `entering` and `leaving` states, then both seated / both returned; reduced motion shows only settled states. Endpoint checks find no duplicate IDs, unresolved SVG references or browser errors. Disposal releases shared heads and crew selectors. The published art, 17 ports and manifests remain unchanged.

## Physical-phone gate

[Current access and unmeasured results](evidence/crew-release-469b709b/physical-phone-performance.json) are separate from the desktop clip. No accessible physical iPhone or low-end Android was identified. `adb`, `idevice_id`, `ideviceinfo` and `ios-deploy` were absent from PATH; the usual Homebrew/platform-tools locations checked contain no executable `adb`. `/usr/bin/xcrun` exists, but cannot find `devicectl` or `xctrace`. The accessible USB inventory returned no entries. This describes session access, not ownership of any phone.

One operator must provide and connect the actual required iPhone and low-end Android, unlock them and approve the debugging/trust prompts. Record exact model/variant, RAM, OS/browser, viewport/DPR and effects mode. On Android, enable USB debugging and authorize the development machine; [Chrome's physical-device setup](https://developer.chrome.com/docs/devtools/remote-debugging/) explains how the model appears in the inspection target list. On iPhone, enable Web Inspector and trust the connected Mac; [Apple's inspection setup](https://developer.apple.com/documentation/safari-developer-tools/inspecting-ios) also describes initial cable pairing for network inspection. Expose those actual inspection targets to the measurement session. The available profiling tools/counters must cover both live JS heap and attributable renderer/WebContent resident memory; the currently missing CLI utilities alone do not rule out a properly connected Safari inspection workflow.

Then run the accepted [budget and paired-baseline protocol at 6bac4554](https://github.com/Amirkianfar66/GameN/blob/6bac45545b428de60f060c6dcbeccb9a3dcc8ef5/docs/frontend/character-restyle-performance-budget.md): baseline before candidate, 20 cold plus 20 warm startup samples per build/device/scenario, and one 30-minute baseline plus 30-minute candidate pair on each required device. The mandatory pair requires 120 foreground minutes plus startup samples, setup, cooling and focused preference/lifecycle checks. At two builds, two devices and setup/resume scenarios, the startup protocol totals 320 attempts. Use the agreed controlled network and approved profile; reduced motion remains separate from the lower-effects target. Missing counters or baseline absolute-limit failures require an explicit Integration disposition.

No physical critical-transfer, first-usable-paint, frame/input-time, heap, resident-memory or sustained-growth result is claimed. All observed values remain null/unmeasured, not zero. Desktop recordings do not fill these result cells. Additional full CI was not run for capture-only changes; syntax, guarded build, artifact assertions and production exclusion were checked.

## Separate follow-ups

The three inherited, nonblocking layout notes have their own [deferred record](crew-inherited-layout-notes.md): Clone ACTIVE overlap, capsule name truncation at 320×568 and A5 clipping at Room A's left edge. They were not fixed here.

Read-only coordination reviewed [#198 at f3d5981a](https://github.com/Amirkianfar66/GameN/blob/f3d5981a870e4a2819e6f6911d87c08b908cfe3f/docs/design/pregame-films.md#for-frontend-the-handoff). It is a standalone draft with nine green CI checks. It contains the two-second typed intro, ten-second Doctor role-film pilot on the new crew, and ten-second boarding proposal; the other role films follow the owner's pilot review. None is adopted or approved by this follow-up, and #197 remains outside the character release. A role film stays private, after card reveal within existing reading, with no Ready authority. Boarding still needs separate server-owned R17 after reading/all Ready and before Round 1; artwork activation cannot enable it.
