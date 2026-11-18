# Boarding placement review for #320

**18 November 2026 · Pre-game Screen Designer · Sheet 19, part `boarding` · Changes requested**

The seated player's film, single local Skip, shared display without Skip, and settled holding and waiting screens follow sheet 19 at **390 × 844** and **430 × 932**. Two Frontend corrections remain before integrated visual acceptance. [Canonical #317 handoff](../boarding.md) · [Frontend's fourteen boarding captures](https://github.com/Amirkianfar66/GameN/tree/78e98dd45fbc43c380fda9fa7642f75627b5cf65/docs/frontend/evidence/pregame-boarding-stage-311)

| Comparison | 390 × 844 | 430 × 932 |
| --- | --- | --- |
| Phone at 1.5 and 6 seconds, display at 4 seconds, reduced motion at 6 seconds | [Design beside app](film-390x844.jpg) | [Design beside app](film-430x932.jpg) |
| Skip in full and reduced motion, then a failed read with an unsynchronized clock | [Design beside app](issues-390x844.jpg) | [Design beside app](issues-430x932.jpg) |

### Corrections for Frontend

1. **Keep the outgoing picture through a local Skip.** The first sample after the tap has film opacity 1 and an empty picture slot. About 33 ms later the slot is still empty at approximately 0.94 opacity in full motion and 0.69 in reduced motion. The same canonical stage retains the picture as it fades over the flag and countdown for 220 ms or 80 ms. Stop playback and retire Skip immediately. Keep the last public boarding frame through this local transition, then release it. Concealment, failed recovery and exit still require immediate clearing. The trace uses the browser's unpaused animation clock. Each screenshot records the interval in which the browser captured it. [Native and canonical frame samples](placement.json) · [Frontend's scene disposal](https://github.com/Amirkianfar66/GameN/blob/533be55945de82536596f2043a1093c1c73f08c1/apps/game/hosted/planet/pregame.mjs#L12-L17) · [Stage motion](../../../components/boarding-stage.md#drawn)
2. **Hide the countdown when the boarding clock loses synchronization.** On both audiences, hide the page at 6 seconds, let the next read fail, then bring it back. The Retry banner appears, the session clock is `unsynced`, and “Round 1 in 0:04” is still visible. The adapter retains the previous clock in its update. Pass `clock: null` for the withheld boarding state when there is no trusted interval. The existing stage then shows the flag, “Boarding” and Retry. A successful read can restore the current picture or waiting state from the original deadline. [Phone](390x844-player-stale.jpg) · [Display](430x932-display-stale.jpg) · [Canonical stage with Retry and no clock](430x932-reference-stale-unsynced.jpg) · [Frontend's withheld-state update](https://github.com/Amirkianfar66/GameN/blob/533be55945de82536596f2043a1093c1c73f08c1/apps/game/hosted/planet/pregame-screens.mjs#L150-L157) · [Clock input](../../../components/boarding-stage.md#inputs)

### Placement and recovery

- The film fills the viewport with one drawing at each cue. Skip sits 14 CSS px from the right and 14 px above the bottom safe area. The native harness reports zero insets. The canonical preview supplies 47 px at the top and 34 px at the bottom, putting Skip 48 px above the physical bottom edge. The same geometry accounts for the holding block's vertical shift.
- The flag and countdown appear after a local Skip or an unavailable film. Both audiences show the hourglass, “Starting Round 1” and “Waiting for the ship” when the server interval expires. Skip returns focus to the stage and sends zero gameplay commands. A full page reload into the same setup preserves the local dismissal.
- Concealment immediately covers both audiences, removes the picture and hides the controls. After the failed read, Retry returns both audiences to 6.6 seconds in the same server window with the original deadline. Only the seated player regains Skip. [Concealed player](390x844-player-concealed.jpg) · [Concealed display](430x932-display-concealed.jpg) · [Recovered player](390x844-player-resumed.jpg) · [Recovered display](430x932-display-resumed.jpg)

### Sources and reproduction

#320 head `78e98dd45fbc43c380fda9fa7642f75627b5cf65` adds evidence to runtime `533be55945de82536596f2043a1093c1c73f08c1` on #314 at `a5a6cdffa913c8a08248f7e02f5f48fc1944ced6`. The admitted artwork is `64e55516d2f0026842c5c2a675f2eccda20e0a9e`. The stage, kit, shell, frozen pack and boarding film trees match #317 at `149cf77e3675430f49d86cc8215fdb532012cb11`. The [native comparison record](native/compare.json) identifies the official part and frozen pack image. Its registry has no integrated boarding route.

All six boarding component tests passed. The toolchain and workspace checks passed. The repository source check still reports the inherited Food registration mismatch in `apps/game/hosted/planet/app.mjs`. Integration tracks that release dependency in [its #320 source review](https://github.com/Amirkianfar66/GameN/pull/320#issuecomment-6981477561).

The supplemental replay used Frontend's retained clean runtime bundle with the repository's production HTTP headers, including its Content Security Policy. Chrome 157 rendered the two CSS sizes at 2×. The Planet app used synthetic admissions and server reads. Only fixture time was held at film cues. Browser paint, input and CSS transitions ran normally. The raw record includes the actual local URLs, entry-bundle hash, picture hashes, clock states and HTTP headers. Header SHA-256 is `424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb`. Physical phones, Safari and VoiceOver remain unverified. [Full record](placement.json) · [Review driver](review.mjs)

To repeat, build the pinned runtime with the pinned art and retain the bundle using Frontend's documented `--keep` command. From the design review checkout, pass the resulting directory to the supplemental driver. Use an output directory outside the checkout. [Frontend build instructions](https://github.com/Amirkianfar66/GameN/blob/78e98dd45fbc43c380fda9fa7642f75627b5cf65/docs/frontend/evidence/pregame-boarding-stage-311/README.md)

```sh
node docs/design/evidence/pregame-screen-review-311/integrated-320/review.mjs "$PHONE_BUILD" "$REVIEW_OUTPUT"
```

Frontend owns both adapter corrections and refreshed candidate captures. The Lead Designer makes the independent visual decision in #320.
