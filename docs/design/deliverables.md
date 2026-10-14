# Designer deliverables

**One index of what the Visual and Motion Designer has delivered for the owner's motion specification of 13 October 2026 and for the setup art, and of what is still to be delivered, as of 14 October 2026.** Integration asked for it in its [renewed review of #144](https://github.com/Amirkianfar66/GameN/pull/144#issuecomment-6170610912).

- **Delivered** means a reviewable proposal: a pushed branch and its draft PR, with its doc, review pictures, checks and exact hashes.
- **Adoption is not the Designer's.** Integration approves files by name and hash, pins them and pairs art with rules. Frontend builds the renderer that draws them. Nothing here claims either.
- **The playable release does not draw board v2 yet.** Staging is source `37f573a` with engine 1.5. Integration's review records that this gap "must not be attributed to missing Designer delivery".

The storyboard numbers S1 to S15 and the production plan come from the Designer's review of 13 October 2026, published unchanged as [motion-review-2026-10-13.md](motion-review-2026-10-13.md). The owner approved the plan's order that day ([owner-decisions.md](owner-decisions.md#13-october-2026-the-fixed-slots-the-ward-and-the-smallest-phone)), then asked for S2 ahead of it on 14 October. Where the review and the specification packet differ, the packet controls ([motion-spec-crosswalk.md](motion-spec-crosswalk.md)).

## Delivered

| Deliverable | Plan | PR | Branch at its head | Doc | Where it stands |
| --- | --- | --- | --- | --- | --- |
| **The phone kit** for #121: the navy and gold shell, the five-second vote result, the Hospital gown and the Jail suit, the private declared Hack | Before the plan; S12 and S13 build on it | [#127](https://github.com/Amirkianfar66/GameN/pull/127) | `claude/designer-phone-polish` `5c9a151` | [phone-kit-handoff.md](phone-kit-handoff.md) | In the staging release: Integration's [#137](https://github.com/Amirkianfar66/GameN/pull/137) integrated it at `5c9a151` |
| **Board v2**: every room's fixed slots with stable ids, the Hospital as a ward of 7, 8 or 9 berths, the compact shell | Step 1 (work package A1) | [#128](https://github.com/Amirkianfar66/GameN/pull/128) | `claude/designer-board-slots-ward` `a864f1f` | [board-v2-slots.md](board-v2-slots.md) | Integration approved the 12 ward SVGs and three pure derivatives as sources (#139). The ward art is in its draft [#147](https://github.com/Amirkianfar66/GameN/pull/147). Stored slots are Backend's draft [#143](https://github.com/Amirkianfar66/GameN/pull/143) |
| **S1**, the Blackout's lighting window | Step 2 | [#129](https://github.com/Amirkianfar66/GameN/pull/129) | `claude/designer-blackout-window` `e1d4e74` | [blackout-window.md](blackout-window.md) | Proposal. Its lighting-window phase has no Backend work yet: it is in Integration's combined inventory (#139) |
| **S4**, ATTACK BLOCKED: one film for both defenses | Step 3, its shared half | [#130](https://github.com/Amirkianfar66/GameN/pull/130) | `claude/designer-attack-blocked` `15e61f0` | [attack-blocked.md](attack-blocked.md), [board-v2-frontend-handoff.md](board-v2-frontend-handoff.md) | Proposal. Its room-visible block fact is in the same inventory |
| **S2**, the private-talk capsule: the review's Private Chamber, made the permanent capsule the owner asked for, with the real controls taking turns with the board | Step 6, asked for on 14 October | [#144](https://github.com/Amirkianfar66/GameN/pull/144) | `claude/designer-private-capsule`, its head | [private-capsule.md](private-capsule.md) | Integration accepted the eight capsule SVGs and three pure modules as visual source candidates; the art at `4f3d25b` is in #147. `turns.mjs` is proposed for import. The film reads Backend's draft [#140](https://github.com/Amirkianfar66/GameN/pull/140) |
| **The setup art**: the character-selection stamps, the role card's common back, its reveal and READY (ability art slice 8, `abilities-0.8.0`) | Before the plan; S13 preserves it | [#116](https://github.com/Amirkianfar66/GameN/pull/116) | `claude/designer-ability-art-8` `27be874` | Section 20 of `docs/design/abilities-handoff.md` on that branch | **A separate delivered proposal**, stacked on ability-art slices 1 to 7. It is not in #144's tree, and the live release has `abilities-0.7.0` |

**Before the specification:** the visual contract (#45), the comic board and its adoption (#57, #59), the phone-first journey (#78), the board as the game (#88) and ability art slices 1 to 7 (#102, #105, #107 to #111). See [README.md](README.md).

## Still to be delivered

The production plan's remaining steps, in its order:

| Storyboard | Step | What it draws | Server inputs it needs | Status |
| --- | --- | --- | --- | --- |
| **S9, S5, S10**: the Hospital's Injured and critical state, the Cracker's medical drone and emergency revival, the flatline and life-support shutdown | 4, "Hospital loops, drone and flatline" | In board v2's ward: heartbeat monitors, the rescue-deadline badge, the detention tag, the drone's flight and the revival, the flatline | Stored slots and the Hospital's injury episodes, with a rescue opportunity that survives a reconnect: Backend's [#142](https://github.com/Amirkianfar66/GameN/issues/142) and draft #143 | Not started. Next in the plan's order |
| **S6, S7, S8**: the Captain's direct RELEASE, EJECT (Option A), the button states and the history | 5, "Captain console, RELEASE, EJECT and history" | The Command Room's console, the Jail's doors and airlock, the off-board record of the ejected, the Captain's controls | Public command facts and allowances, off-board placement: Backend's [#145](https://github.com/Amirkianfar66/GameN/issues/145) and draft [#146](https://github.com/Amirkianfar66/GameN/pull/146) | Not started |
| **S3**: the Alien's Phantom Clone, its private activation and expiry | 3, its private half | Only on the Alien's own phone, in the private sheet; never on the board. A block uses S4 | The Alien's own Clone state; no Backend work yet | Not started |
| **Idle loops and the token revision** | 7 | Constrained idle loops; a `tokens-0.5.0` proposal | Integration pins the token revision | Not started |
| **S14**: the showdown overlay and the remaining actions' polish | 8 | One overlay, everyone staying in their rooms | The showdown kept in actual rooms (#142) | Not started |

- **S11, S12 and S13 keep delivered work:** the Insider's file (#102), the vote and Hack results (#127), and the phone screens, board and clothes (#116, #127, #128). The review's optional polish for them has not been asked for.
- **S15** (motion, accessibility and privacy) is a rule set that every step follows.
- **What the remaining steps reuse.** The accepted rooms, the character rig, the clothes and the ward stay as they are. Each step adds new files beside them, as S1, S4 and S2 did. Nothing accepted will be redrawn to close the integration gap. Connecting board v2 to the playable build is Frontend's and Integration's work (#141, #147).
- **One dependency for S7.** Once an EJECT puts an identity off the board (#145), a character choice that offers it has no target on the board. A Code can name any seat in #140, Eliminated ones included. S7's off-board record must give that identity a target (private-capsule.md, section 12, rule 2).

## Files from the Designer's Claude session

Checked on 14 October 2026 in this session's container:

- The primary checkout and its fourteen Designer worktrees are clean. Every branch equals its pushed head.
- No artwork, source or evidence exists only in the session.

These files were made in the session outside the repository:

| File | SHA-256 | What it is | Where its content is now |
| --- | --- | --- | --- |
| `designer-motion-review-2026-10-13.md` | `684b6275b6e2c58208eae4c9df695e690422efac7a646120a991fed6c7e6597a` | The Designer's review and production plan of 13 October 2026, sent to the owner as an attachment | Now published unchanged as [motion-review-2026-10-13.md](motion-review-2026-10-13.md) |
| `GameN-designer-corrections-2026-10-14.txt` and `GameN-designer-stack-hashes-2026-10-14.json` | `26ca8f531f67c636553d85bcf0e723968330999d6ec2baa721f1bdc9ae80f3c0` and `5966ad5995e5b2195c4480abf6e50c5ddb025259fba9e52c81bac62e1339c7f2` | The corrections and file hashes for Integration's review of #128 and #129 of 13 October, passed on by the owner | The bodies of #128 and #129, [motion-spec-crosswalk.md](motion-spec-crosswalk.md) and [board-v2-frontend-handoff.md](board-v2-frontend-handoff.md) |
| `GameN-designer-P3-correction-2026-10-14.txt` and `GameN-designer-P3-hashes-2026-10-14.json` | `e638e178f6bc40360fec4ab19e1e51ec300b8bdd10f30940c55f2cd5a2860f9a` and `a5912771c80c9da8ee0567bc66276224dd5f3f9318e22552a9b4129442d1066f` | The P3 correction for #130 and its file hashes, on a private claude.ai page for the owner to pass on | The body of #130 and [board-v2-frontend-handoff.md](board-v2-frontend-handoff.md), whose `sha256sum -c` block covers the files |
| Review pages and picture copies sent to the owner | — | Copies of committed review pictures | The branches' `review/` folders |
| Working files | — | Capture logs, debugging captures, probe scripts, a clean scratch trial merge | Not deliverables. The committed tools reproduce every recorded result |

Not the Designer's own: the coordinator's creative brief and the owner's notes as received, and the specification packet, whose hash is in the crosswalk.
