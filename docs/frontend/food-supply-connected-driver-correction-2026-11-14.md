# Food connected driver: ordinary observation and PANEL timing

The [frozen first d5 packet](food-supply-native-first-d5-2026-11-14.md) remains a failed full journey. Its seven-player loss and eight/nine-player delivery-only partial results are unchanged. This correction is development tooling only; native 952, Designer source, artwork, rules and server timing are untouched. No new journey has run on this correction.

## The 100-second ordinary wait is insufficient

`packages/contracts/src/planet-game.ts` defines PRE_TURN 15 s, an ordinary turn 60 s, and Hack declaration/result/talk 15 + 5 + 60 s. `packages/engine/src/planet-game/commands.ts` permits at most two standard Hack sequences per round. `lifecycle.ts` saves/shuffles the round order, starts PRE_TURN after Food return, then advances through the saved order. A living human may follow every other original seat.

| Players | PRE_TURN + preceding turns + two Hack sequences | Maximum before own turn | Added observation tolerance | Total driver bound |
| --- | --- | --- | --- | --- |
| 7 | 15 + 6 × 60 + 2 × 80 s | 8 m 55 s | 20 s | 9 m 15 s |
| 8 | 15 + 7 × 60 + 2 × 80 s | 9 m 55 s | 20 s | 10 m 15 s |
| 9 | 15 + 8 × 60 + 2 × 80 s | 10 m 55 s | 20 s | 11 m 15 s |

The driver now derives the finite bound from the shared phase durations. The 20-second tolerance is for observation/transport only; no phase is waited for, extended, shortened or advanced by the game client. It permits two eight-second client wait boundaries plus ordinary polling slack.

The new observer records public round/phase number, kind, start/end, active seat, own seat, live/trusted/expired flags, rendered Pass availability and completed read count. It emits checkpoints on changes and every ten seconds. It fails a public phase that remains beyond its deadline plus tolerance, sustained lost observation, an unexpected new round, terminal match, changed same-phase interval or an observed own turn that leaves without a usable Pass. The original physical Pass/confirmation and own meal assertions remain.

This distinguishes a turn never observed from one seen and missed **on a future run**. The preserved first8/9 packet did not record that timeline. Its final screenshots show another player's turn, so existing evidence cannot establish whether the human's turn was missed or not yet reached. The correction does not read the hidden saved future order to supply that missing history.

## PANEL uses a different observation clock from the server bot

The Node bot policy in `services/game-api/src/food-bot-policy.ts` takes one unmodified authorized projection and chooses from its `serverNowMs`. The native renderer calls `foodDisplay(model, now)` with the synchronized current display clock and continuously paints the motion anchors. Its source `food-display.mjs` derives the visible PANEL stop, leaving warning, target highlight and hazard; `food-render.mjs` paints those as the instrument's `data-now`/`data-at` and the real button's `data-next`/`data-hazard`. The two times can differ while a projection is still fresh.

The unchanged first7 driver asked that server policy to choose a physical touch from a polled projection. The packet did not record the original projection time or painted PANEL stop for each touch. Its long replies and loss do not establish the exact cause of any miss. Re-dating the projection would change the meaning of its offers and is not a remedy.

The development diagnostics retain estimated original projection age, clock uncertainty, actually painted stop/goal, and actual control next/hazard/inert/disabled/sending flags at decisions and physical inputs. No private role, hidden engine state, raw view or future prediction is logged by those additions.

Integration approved the PANEL pilot correction: it follows the **actual rendered control**, requiring a live synchronized own model, its existing server-enabled capability, a visible non-inert/non-busy control, its drawn next highlight, no drawn hazard, and a real hit target immediately before physical touch. The guard rechecks all conditions and expected button action immediately before dispatch. This uses the native display's existing guidance and does not manufacture an offer or outcome. It preserves misses caused by real admission delay and cannot compensate by backdating/retiming. Winch causal contact handling remains unchanged.

## Separate timing domains and failure capture

The excluded emulator adapter records actual window-capture pointer-event observations before the native handler, fetch invocation, headers observed and JSON completion on that page's `performance.now` clock. Own model-subscriber observations and control MutationObserver callbacks use the same domain, with bounded logs and explicit dropped-event counts. A DOM observation is not a paint measurement. Each page records its own timing context; the driver/host, other page and server clocks remain separate. Estimated server time at a model sample is explicitly labeled and cannot establish durable admission latency.

The original cross-display privacy assertions now run at Task/return checkpoints and periodic two-second observations **before** the next fresh own-phone sample. Cross-page inspection therefore does not sit between a fresh PANEL observation and physical touch. All original privacy predicates remain. Browser exceptions are captured in the outer finally path even when a case fails; a failed delivery still stays failed.

The first 11 focused observer/selection/diagnostic checks passed, including a valid physical-event sequence through a stubbed browser port and blocked-control refusals. A four-profile actual native synthetic PANEL-touch check and clean review builds remain to be executed in the currently authorized focused slot. They do not use the API or qualify connected acceptance. No corrected-driver gameplay journey has run.
