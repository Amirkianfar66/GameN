# Phone polish — before and after, 11 October 2026

This is the evidence for [phone-polish.md](../../phone-polish.md). Both runs are the existing board journey (`apps/game/dev/capture-board-play.mjs`) in the board simulation, with synthetic views. They are Chromium device emulation, not physical devices.

| Run | Source | Result |
| --- | --- | --- |
| Before | The base `1a92f37` stylesheets, with only the new capture checks added | [capture-log-before.txt](capture-log-before.txt): **3 steps with problems**. `320x568-stale-pauses` and `390x844-stale-pauses` report "the connection banner's icon lies over its words"; `320x568-enlarged-text` reports navigation label "Actions" running past its button |
| After | Commit `025d407` | [capture-log-after.txt](capture-log-after.txt): **124 measured steps, all clean**. [facts-after.json](facts-after.json) has every measurement, including `bannerIconOverText` and `navLabelsOut` |

The probe behind the fix measured these geometries:

**At 320×568:**

- the icon ended at 36 px while the words began at 8 px;
- with the fix the words begin at 48 px.

**At doubled text:**

- the icon ended at 44 px while the words began at 16 px;
- with the fix the words begin at 60 px.

**"Actions" at doubled text on 320 px:**

- it was 74 px wide in a 64 px button, with a −2 px gap to "Board";
- with the fix it is 56 px wide, and the gaps between labels are at least 12 px.

| Before | After |
| --- | --- |
| [before-320x568-stale-pauses.png](before-320x568-stale-pauses.png) | [after-320x568-stale-pauses.png](after-320x568-stale-pauses.png) |
| [before-390x844-stale-pauses.png](before-390x844-stale-pauses.png) | [after-390x844-stale-pauses.png](after-390x844-stale-pauses.png) |
| [before-320x568-enlarged-text.png](before-320x568-enlarged-text.png) | [after-320x568-enlarged-text.png](after-320x568-enlarged-text.png) |

The full `npm run verify` result for this branch is recorded under [verification.txt](verification.txt).
