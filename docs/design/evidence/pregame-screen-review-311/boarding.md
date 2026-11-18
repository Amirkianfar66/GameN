# Boarding placement: Screen Designer handoff

**18 November 2026 · #311 · supplemental component review for Frontend.**

Frontend subsequently delivered #320. The [integrated placement review](integrated-320/README.md) records the two-size comparison, recovery checks and two requested adapter corrections.

The existing `boarding-stage-0.1.0` supplies the required film slot, phone-only Skip, shared display without Skip, holding, waiting and concealed states. **No canonical component change is needed.** Frontend is the sole implementer of the adapter change that places the admitted SVG player in this stage. The [placement handoff on #311](https://github.com/Amirkianfar66/GameN/issues/311#issuecomment-6980876366) and [existing component contract](../../components/boarding-stage.md) identify the boundary. The independent Claude Lead reviews the integrated candidate in its PR.

## Source and refreshed evidence

The reviewed app baseline is #314 at `a5a6cdffa913c8a08248f7e02f5f48fc1944ced6`, runtime `39961a807d811aa2efb177f888302da17f0c2431`. Its adapter currently mounts the stage for holding/waiting, while `pregame.mjs` creates a separate film overlay and its own Skip. This is the connection Frontend is changing; this packet does not claim it is already fixed.

The [new check record](boarding/check.json) was captured on clean `b0af09ac881b9e7ed3b50b8837a6678bc5a4d227`. Its component, frozen prototype, crew, film and shared tool trees match #314 exactly. The canonical stage remains 0.1.0; its current dependencies are kit 0.8.2 and shell 0.2.12. The original boarding record was on `73358795`, with older kit/shell sources, so it was not reused as current verification.

**Result:** 20/20 state captures, 9/9 lifecycle checks, 6/6 pack-agreement cases. The existing six boarding tests also passed. All 20 image hashes were independently verified, and every capture was visually inspected against sheet 19's applicable composition. The agreement checks compare the canonical stage and frozen pack side by side in the browser; no compared box differs by more than the check's half-pixel tolerance.

The record includes actual local URLs, browser version, source trees, tool hash, served production response headers and header hash `424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb`. There were no unexpected policy reports or page/request problems; the known caught Zod feature probe is recorded separately. The stage preview uses the existing synthetic nine-seat roster, a still from the approved SVG film, and 47 px/34 px safe areas. It is **not the integrated player or a release capture**. There is no physical-phone, Safari, screen-reader, movie performance or live-game result here.

| State | 390 × 844 | 430 × 932 | Verified composition |
| --- | --- | --- | --- |
| Phone film, 0:01.5 | [Capture](boarding/390x844-film15.jpg) | [Capture](boarding/430x932-film15.jpg) | Edge-to-edge picture; one Skip, no top bar/tabs |
| Phone film, 0:06 | [Capture](boarding/390x844-film6.jpg) | [Capture](boarding/430x932-film6.jpg) | Same frame and control placement |
| Shared display | [Capture](boarding/390x844-display.jpg) | [Capture](boarding/430x932-display.jpg) | Film with no Skip |
| Skipped locally | [Capture](boarding/390x844-holding.jpg) | [Capture](boarding/430x932-holding.jpg) | Flag tile, Boarding, supplied countdown |
| Waiting for server | [Capture](boarding/390x844-waiting.jpg) | [Capture](boarding/430x932-waiting.jpg) | Hourglass tile, Starting Round 1, waiting status/spinner |
| Concealed | [Capture](boarding/390x844-concealed.jpg) | [Capture](boarding/430x932-concealed.jpg) | Plain cover; film and holding content hidden/inert |
| Reduced motion | [Capture](boarding/390x844-reduced.jpg) | [Capture](boarding/430x932-reduced.jpg) | Existing still and canonical Skip |
| No trusted clock | [Capture](boarding/390x844-noclock.jpg) | [Capture](boarding/430x932-noclock.jpg) | Boarding, no invented countdown |
| Reconnecting | [Capture](boarding/390x844-stale.jpg) | [Capture](boarding/430x932-stale.jpg) | Existing shell Retry banner above holding screen |
| Largest text | [Capture](boarding/390x844-large.jpg) | [Capture](boarding/430x932-large.jpg) | Wrapping heading, complete waiting line |

## Component and adapter agreement

| Responsibility | Existing source/interface |
| --- | --- |
| Screen composition | Screen Designer: `design/phone-ui/components/boarding-stage/boarding-stage.mjs` and `.css`; import directly, no copy or replacement styles |
| Film placement | `mountBoardingStage(host, input, handlers)` returns a stable `stage.film` element. Mount the admitted scene inside it and use `stage.layout().film` / `onLayout` for its dimensions. The stage owns the controls and shell. |
| Phone-only Skip | Frontend supplies `view: 'film'` and `skip: { enabled: true }` only for the playing phone. Shared display gets `skip: null`, with no retained overlay shortcut. `onSkip()` dismisses only that phone's film through the existing controller. |
| Holding/waiting | Frontend chooses `holding` after local skip/unavailable film until the trusted interval ends, then `waiting` until the server starts Round 1. Supply the trusted relative interval as `clock: { elapsedMs, endsAtMs }`, or `null`; the stage never advances it itself. |
| Concealment/lifecycle | Frontend supplies `status: 'concealed'`, pauses its player, and paints the current authorized moment on return. Scene disposal and stage disposal follow exit/match change. The stage retains its film element during updates; its `onFocusReturn` supports focus handoff when Skip's view ends. |
| Margins | Film fills the stage. Skip: right 14 px, bottom safe inset + 14 px (48 px in this fixture), measured in the probe. Holding: 16 px side padding, safe top + 8 px and safe bottom + 16 px. No adapter restyling is needed. |
| Motion | The stage owns the 220 ms crossfade / 80 ms reduced crossfade. The probe verifies both the game preference and emulated device preference, with the waiting spinner still in reduced motion. The Animator owns the film, and Frontend its playback lifecycle. |

Frontend's files remain `apps/game/hosted/planet/pregame.mjs`, `pregame-screens.mjs`, `pregame-input.mjs` and the existing scene/controller boundary. This packet changes none of them. It does not adopt the #285 canvas pilot, change the Round 1 stamp, or extend #314's five-part Lead acceptance to boarding.

## Integrated comparison still required

Use part `boarding` / sheet 19 for the phone film at 0:01.5 and 0:06, and supplemental states for display without Skip, local holding, waiting, concealment and reduced motion at both agreed sizes. Include production response headers, actual URLs, exact candidate/artwork identities, the local Skip and cleanup journeys, and one scene/control owner. The preview's full-screen film and safe-area margins are the target; any intentional harness inset difference must be labeled. The independent Lead must explicitly accept the implemented candidate in its PR.

## Reproduce without replacing historical evidence

From the clean source commit, with workspace dependencies installed and packages built:

```sh
node --test packages/design-tokens/test/boarding-stage.test.mjs
node design/tools/boarding-stage-check.mjs --out /private/tmp/gamen-boarding-stage-review
```

The existing checker now accepts an external `--out` directory, checks served headers, and records original URLs and source identities. Its original default output remains available. The committed historical component review directory is unchanged.
