# In-game boarding stage

Comparison part **`boarding`**, sheet 19. Runtime `26489ecaef86509e0a01bc815b454655457541fd` addresses both findings on #320 using Designer’s boarding stage `0.1.0` and art baseline `64e55516d2f0026842c5c2a675f2eccda20e0a9e`. The desktop Chromium harness uses synthetic responses through the actual player and display session paths, with the production response headers. These captures supplement the component preview because the comparison tool has no candidate route for this part. [Screen Designer’s findings](https://github.com/Amirkianfar66/GameN/pull/320#issuecomment-6981943144) · [Stage handoff](../../../design/components/boarding-stage.md#frontends-connection) · [Component captures](../../../../design/phone-ui/components/boarding-stage/review)

| State | 390 × 844 | 430 × 932 |
| --- | --- | --- |
| Seated player sees one Skip | [Screenshot](390x844-boarding.jpg) | [Screenshot](430x932-boarding.jpg) |
| Holding after Skip | [Screenshot](390x844-boarding-skipped.jpg) | [Screenshot](430x932-boarding-skipped.jpg) |
| Player waiting for Round 1 | [Screenshot](390x844-boarding-waiting.jpg) | [Screenshot](430x932-boarding-waiting.jpg) |
| Admitted shared display plays without Skip | [Screenshot](390x844-boarding-display.jpg) | [Screenshot](430x932-boarding-display.jpg) |
| Admitted display waiting for Round 1 | [Screenshot](390x844-boarding-display-waiting.jpg) | [Screenshot](430x932-boarding-display-waiting.jpg) |
| Reduced-motion film on a recovered seat | [Screenshot](390x844-boarding-reduced.jpg) | [Screenshot](430x932-boarding-reduced.jpg) |
| Holding after Skip with Reduce motion | [Screenshot](390x844-boarding-reduced-skipped.jpg) | [Screenshot](430x932-boarding-reduced-skipped.jpg) |
| Phone concealed during the fade | [Screenshot](390x844-boarding-fade-concealed.jpg) | [Screenshot](430x932-boarding-fade-concealed.jpg) |
| Player reconnecting with Retry | [Screenshot](390x844-boarding-player-reconnecting.jpg) | [Screenshot](430x932-boarding-player-reconnecting.jpg) |
| Admitted display reconnecting with Retry | [Screenshot](390x844-boarding-display-reconnecting.jpg) | [Screenshot](430x932-boarding-display-reconnecting.jpg) |
| Earlier release holding with the film unavailable | [Screenshot](390x844-boarding-film-unavailable.jpg) | [Screenshot](430x932-boarding-film-unavailable.jpg) |

## Skip frames and recovery

A touch on Skip immediately switched the view to holding, removed Skip and returned focus to the stage. The same SVG stayed in the slot at every observed frame with nonzero opacity. The drawing sample count held steady until the scene was released. This table shows the first, a partial, and the final opacity sample alongside the component’s CSS transition duration. [Frame record and image hashes](checks.json)

| Viewport | Standard, 220 ms | Reduce motion, 80 ms |
| --- | --- | --- |
| 390 × 844 | 1.00 → 0.48 → 0.00 | 1.00 → 0.68 → 0.00 |
| 430 × 932 | 1.00 → 0.48 → 0.00 | 1.00 → 0.69 → 0.00 |

Concealment cleared the outgoing scene in the same event. After an identity change, it was gone before the next paint. The private role overlay and its contents cleared synchronously when the phone hid. With an unsynchronized clock after a failed read, both boarding audiences showed Retry with the countdown absent. The same server deadline returned after Retry. The phone stayed dismissed and the admitted display resumed at current elapsed time.

The new checks reproduced both findings on the earlier runtime `533be559` at 390 × 844 and 430 × 932. The corrected runtime passed all 32 browser checks, and build, typecheck and 152 focused tests passed. Physical phones, Safari, VoiceOver and the local Firebase emulator remain unverified. Full source verification still stops at the Food consumer registration. [Earlier captures](https://github.com/Amirkianfar66/GameN/tree/78e98dd45fbc43c380fda9fa7642f75627b5cf65/docs/frontend/evidence/pregame-boarding-stage-311) · [Integration source review](https://github.com/Amirkianfar66/GameN/pull/320#issuecomment-6981477561)

To repeat the checks, build a clean checkout of the runtime commit and set `GAMEN_PHONE_ART_BASE` to a clean checkout of the artwork commit.

```sh
node design/tools/pregame-connection-check.mjs --only boarding-waiting,boarding-player-reconnecting,boarding-fade-identity,boarding-display-waiting,boarding-reduced-skipped,boarding-film-unavailable,menu,role-ready,concealed --keep
```
