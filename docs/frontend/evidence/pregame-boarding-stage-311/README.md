# In-game boarding stage

Comparison part **`boarding`**, sheet 19. The game mounts the admitted SVG in the film slot of Designer’s boarding stage `0.1.0`. Screenshots show the Planet app under production response headers in desktop Chromium, using synthetic server responses through the app’s player and display session paths. The comparison tool has no app route for this part. The state captures below supplement the component’s preview. [Designer’s handoff](../../../design/components/boarding-stage.md#frontends-connection) · [Component captures](../../../../design/phone-ui/components/boarding-stage/review)

| State | 390 × 844 | 430 × 932 |
| --- | --- | --- |
| Seated player sees one Skip on the film | [Player film](390x844-boarding.jpg) | [Player film](430x932-boarding.jpg) |
| Skip returns the phone to the server countdown | [Skipped](390x844-boarding-skipped.jpg) | [Skipped](430x932-boarding-skipped.jpg) |
| Boarding interval ends while the player awaits Round 1 | [Player waiting](390x844-boarding-waiting.jpg) | [Player waiting](430x932-boarding-waiting.jpg) |
| Admitted shared display plays the film without Skip | [Display film](390x844-boarding-display.jpg) | [Display film](430x932-boarding-display.jpg) |
| Boarding interval ends while the display awaits Round 1 | [Display waiting](390x844-boarding-display-waiting.jpg) | [Display waiting](430x932-boarding-display-waiting.jpg) |
| Reduced motion is active on a recovered player session | [Reduced motion](390x844-boarding-reduced.jpg) | [Reduced motion](430x932-boarding-reduced.jpg) |
| Earlier release holds when the film is unavailable | [Holding](390x844-boarding-film-unavailable.jpg) | [Holding](430x932-boarding-film-unavailable.jpg) |

The player tapped Skip using Chromium’s touch input. The stage restored focus, reached the holding state with the same deadline, and kept the dismissal after reload. The display joined through the normal admission form, concealed the film when focus was lost, cleared it after a failed read and resumed in the same server window after Retry. Both actors waited for the server to start Round 1. The record includes 14 boarding checks and eight menu, role and concealment checks. [Checks, response headers and image hashes](checks.json)

- Runtime `533be55945de82536596f2043a1093c1c73f08c1` on [#314](https://github.com/Amirkianfar66/GameN/pull/314) at `a5a6cdffa913c8a08248f7e02f5f48fc1944ced6`. The art baseline is `64e55516d2f0026842c5c2a675f2eccda20e0a9e`.
- Build, typecheck and 152 focused tests passed. Desktop Chromium passed all 22 checks. Physical devices, Safari, VoiceOver and the local Firebase emulator remain unverified.
- Full source verification still stops at the inherited Food consumer registration for `apps/game/hosted/planet/app.mjs`. This candidate needs Integration’s source admission and the Lead Designer’s visual acceptance. [Base verification](https://github.com/Amirkianfar66/GameN/actions/runs/44075332041/job/134031222902)

To repeat the captures, build the workspace in a clean checkout of the runtime commit and set `GAMEN_PHONE_ART_BASE` to a clean checkout of the artwork commit.

```sh
node design/tools/pregame-connection-check.mjs --only boarding-waiting,boarding-display-waiting,boarding-reduced,boarding-film-unavailable,menu,role-ready,concealed --keep
```
