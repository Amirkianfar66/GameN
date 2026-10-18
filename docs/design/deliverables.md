# Designer deliverables

**Version 3, 18 October 2026.** One index of what the Visual and Motion Designer has delivered for the owner's motion specification of 13 October 2026 and for the setup art, and of what is still to be delivered. Integration asked for it in its [renewed review of #144](https://github.com/Amirkianfar66/GameN/pull/144#issuecomment-6170610912) and again, complete and versioned, in its [completion request](https://github.com/Amirkianfar66/GameN/pull/144#issuecomment-6171018083). The versions are listed at the end.

- **Delivered** means a reviewable proposal: a pushed branch and its draft PR, with its doc, review pictures, checks and exact hashes.
- **Adoption is not the Designer's.** Integration approves files by name and hash, pins them and pairs art with rules. Frontend builds the renderer that draws them. Nothing here claims either.
- **The playable release does not draw board v2 yet.** Staging is source `37f573a` with engine 1.5 and `abilities-0.7.0`; it has neither #116 nor board v2. Integration's review records that this gap "must not be attributed to missing Designer delivery".

The storyboard numbers S1 to S15 and the production plan come from the Designer's review of 13 October 2026, published unchanged as [motion-review-2026-10-13.md](motion-review-2026-10-13.md). The owner approved the plan's order that day ([owner-decisions.md](owner-decisions.md#13-october-2026-the-fixed-slots-the-ward-and-the-smallest-phone)), then asked for S2 ahead of it on 14 October. Where the review and the specification packet differ, the packet controls ([motion-spec-crosswalk.md](motion-spec-crosswalk.md)). The packet itself is in [evidence/owner-motion-spec-2026-10-13/](evidence/owner-motion-spec-2026-10-13/PROVENANCE.md).

## Delivered

| Deliverable | Plan | PR | Doc | Where it stands |
| --- | --- | --- | --- | --- |
| **The phone kit** for #121: the navy and gold shell, the five-second vote result, the Hospital gown and the Jail suit, the private declared Hack | Before the plan; S12 and S13 build on it | [#127](https://github.com/Amirkianfar66/GameN/pull/127) | [phone-kit-handoff.md](phone-kit-handoff.md) | In the staging release: Integration's [#137](https://github.com/Amirkianfar66/GameN/pull/137) integrated it at `5c9a151` |
| **Board v2**: every room's fixed slots with stable ids, the Hospital as a ward of 7, 8 or 9 berths, the compact shell | Step 1 (work package A1) | [#128](https://github.com/Amirkianfar66/GameN/pull/128) | [board-v2-slots.md](board-v2-slots.md) | Integration approved the 12 ward SVGs and three pure derivatives as sources (#139). The ward art is in its draft [#147](https://github.com/Amirkianfar66/GameN/pull/147). Stored slots are Backend's draft [#143](https://github.com/Amirkianfar66/GameN/pull/143) |
| **S1**, the Blackout's lighting window | Step 2 | [#129](https://github.com/Amirkianfar66/GameN/pull/129) | [blackout-window.md](blackout-window.md) | Proposal. Its lighting-window phase has no Backend work yet: it is in Integration's combined inventory (#139) |
| **S4**, ATTACK BLOCKED: one film for both defenses | Step 3, its shared half | [#130](https://github.com/Amirkianfar66/GameN/pull/130) | [attack-blocked.md](attack-blocked.md), [board-v2-frontend-handoff.md](board-v2-frontend-handoff.md) | Proposal. Its room-visible block fact is in the same inventory |
| **S2**, the private-talk capsule: the review's Private Chamber, made the permanent capsule the owner asked for, with the real controls taking turns with the board | Step 6, asked for on 14 October | [#144](https://github.com/Amirkianfar66/GameN/pull/144) | [private-capsule.md](private-capsule.md) | Integration accepted the eight capsule SVGs and three pure modules as visual source candidates; the art at `4f3d25b` is in #147. `turns.mjs` is proposed for import. The film reads Backend's draft [#140](https://github.com/Amirkianfar66/GameN/pull/140) |
| **S9, S5, S10**, the Hospital's medical films: the critical state on the berth, the medical drone's rescue, the flatline and life-support shutdown | Step 4, "Hospital loops, drone and flatline" | [#158](https://github.com/Amirkianfar66/GameN/pull/158) | [hospital-films.md](hospital-films.md) | Proposal, on #128's ward. It reads Backend's drafts 1.7 (#143) and 1.8 (#146). The owner's request of 18 October for a 4-bed ward waits on Balance and Backend ([#155](https://github.com/Amirkianfar66/GameN/issues/155)) |
| **The setup art**: the character-selection stamps, the role card's common back, its reveal and READY (ability art slice 8, `abilities-0.8.0`) | Before the plan; S13 preserves it | [#116](https://github.com/Amirkianfar66/GameN/pull/116) | Section 20 of `docs/design/abilities-handoff.md` on that branch | **A separate delivered proposal**, stacked on ability-art slices 1 to 7. It is not in #144's tree |

**Before the specification:** the visual contract (#45), the comic board and its adoption (#57, #59), the phone-first journey (#78), the board as the game (#88) and ability art slices 1 to 7 (#102, #105, #107 to #111). See [README.md](README.md).

### Exact heads and complete path lists

Each list in [deliverables/](deliverables/) names every path the PR changes against its base, with its SHA-256 at the PR's head. To check one, run `sha256sum -c` on it in a checkout of that head. No PR deletes or renames a file. The first six lists were checked this way on 14 October 2026, each in its own worktree, and #158's on 18 October 2026.

| PR | Branch | Head | Base | Paths | List |
| --- | --- | --- | --- | --- | --- |
| #127 | `claude/designer-phone-polish` | `5c9a1510d35d4b9762f9bc2a27dae3f5d53bd5d7` | `abb6839524b6dc3e5225e600f2f067c3fa3f9501` | 769 (201 added, 568 changed) | [pr127-phone-kit.sha256](deliverables/pr127-phone-kit.sha256) |
| #128 | `claude/designer-board-slots-ward` | `a864f1f2d0547361e3197639dc1adf2ed4e9bd19` | `5c9a1510d35d4b9762f9bc2a27dae3f5d53bd5d7` (#127) | 69 (66, 3) | [pr128-board-v2-slots-ward.sha256](deliverables/pr128-board-v2-slots-ward.sha256) |
| #129 | `claude/designer-blackout-window` | `e1d4e748036577e1a9fa76aa56c7e17401167e73` | `a864f1f2d0547361e3197639dc1adf2ed4e9bd19` (#128) | 100 (62, 38) | [pr129-blackout-s1.sha256](deliverables/pr129-blackout-s1.sha256) |
| #130 | `claude/designer-attack-blocked` | `15e61f0bbd043930a578900862be9d5156b3b602` | `e1d4e748036577e1a9fa76aa56c7e17401167e73` (#129) | 59 (41, 18) | [pr130-attack-blocked-s4.sha256](deliverables/pr130-attack-blocked-s4.sha256) |
| #144 | `claude/designer-private-capsule` | `7786b9166422f1ffb59921fc224339044f4b0353` | `15e61f0bbd043930a578900862be9d5156b3b602` (#130) | 96 (83, 13) | [pr144-private-capsule-s2.sha256](deliverables/pr144-private-capsule-s2.sha256) |
| #158 | `claude/designer-hospital-films` | `e589e7a7a32a491fb417de582acc82dc94c9cf31` | `95d70f0c885f6b7d619c4ebff935093dfe891ea6` (#144) | 103 (91, 12) | [pr158-hospital-films-s9-s5-s10.sha256](deliverables/pr158-hospital-films-s9-s5-s10.sha256) |
| #116 | `claude/designer-ability-art-8` | `27be8749b51775fee3a0d81b62a3cdabedafe1be` | `8f1f356f2208ff49bcaef3f501f9778da19ccab0` (#111) | 84 (45, 39) | [pr116-setup-art.sha256](deliverables/pr116-setup-art.sha256) |

#144's list is at `7786b91`, the head that delivered the capsule and the controls. The commit after it (`95d70f0`) adds only documentation: this index's version 2, the lists, the specification packet and its provenance, and a row in [README.md](README.md). #158's list is at `e589e7a`, the head that delivered the Hospital films. The commits after it add only documentation: this index's version 3, #158's list and, in the Hospital doc, the balance gates re-run on that head.

## Still to be delivered

Integration's completion request of 14 October asks the Designer to finish S3, S5, S9 and S10, S6 and S7 (with S8's button states). The Designer delivers them in the approved plan's order, one reviewable PR each. S9, S5 and S10 are delivered (above); these remain:

| Storyboard | Step | What it draws | Server inputs it needs | Status |
| --- | --- | --- | --- | --- |
| **S6, S7, S8**: the Captain's direct RELEASE, EJECT (Option A), the button states and the history | 5, "Captain console, RELEASE, EJECT and history" | The Command Room's console, the Jail's doors and airlock, the off-board record of the ejected, the Captain's controls | Public command facts and allowances, off-board placement: Backend's [#145](https://github.com/Amirkianfar66/GameN/issues/145) and draft [#146](https://github.com/Amirkianfar66/GameN/pull/146) | In production, next |
| **S3**: the Alien's Phantom Clone, its private activation and expiry | 3, its private half | Only on the Alien's own phone: scan lines, the duplicate silhouette, the real character's disappearance and return. Public pictures stay identical. A block uses S4 exactly | The Alien's own Clone state: Backend's [#149](https://github.com/Amirkianfar66/GameN/issues/149) and draft [#153](https://github.com/Amirkianfar66/GameN/pull/153) | Not started |
| **Idle loops and the token revision** | 7 | Constrained idle loops; a `tokens-0.5.0` proposal | Integration pins the token revision | Not in the completion request |
| **S14**: the showdown overlay and the remaining actions' polish | 8 | One overlay, everyone staying in their rooms | The showdown kept in actual rooms (#142) | Not in the completion request |

- **S11, S12 and S13 keep delivered work:** the Insider's file (#102), the vote and Hack results (#127), and the phone screens, board and clothes (#116, #127, #128). The review's optional polish for them has not been asked for.
- **S15** (motion, accessibility and privacy) is a rule set that every step follows.
- **What the remaining steps reuse.** The accepted rooms, the character rig, the clothes and the ward stay as they are. Each step adds new files beside them, as S1, S4 and S2 did. Nothing accepted will be redrawn to close the integration gap. Connecting board v2 to the playable build is Frontend's and Integration's work (#141, #147).
- **No older cue stands in for a new production.** The ability art's generic cues are not S3, S5, S6, S7, S9 or S10.
- **One dependency for S7.** Once an EJECT puts an identity off the board (#145), a character choice that offers it has no target on the board. A Code can name any seat in #140, Eliminated ones included. S7's off-board record must give that identity a target (private-capsule.md, section 12, rule 2).

## Files from the Designer's Claude session

Checked on 18 October 2026 in this session's container:

- The primary checkout and its fifteen Designer worktrees are clean. Every branch equals its pushed head (#158's once this version is pushed).
- No artwork, source or evidence exists only in the session.

**Made in the session, outside the repository:**

| File | SHA-256 | What it is | Where its content is now |
| --- | --- | --- | --- |
| `designer-motion-review-2026-10-13.md` | `684b6275b6e2c58208eae4c9df695e690422efac7a646120a991fed6c7e6597a` | The Designer's review and production plan of 13 October 2026, sent to the owner as an attachment | Now published unchanged as [motion-review-2026-10-13.md](motion-review-2026-10-13.md) |
| `GameN-designer-corrections-2026-10-14.txt` and `GameN-designer-stack-hashes-2026-10-14.json` | `26ca8f531f67c636553d85bcf0e723968330999d6ec2baa721f1bdc9ae80f3c0` and `5966ad5995e5b2195c4480abf6e50c5ddb025259fba9e52c81bac62e1339c7f2` | The corrections and file hashes for Integration's review of #128 and #129 of 13 October, passed on by the owner | The bodies of #128 and #129, [motion-spec-crosswalk.md](motion-spec-crosswalk.md) and [board-v2-frontend-handoff.md](board-v2-frontend-handoff.md) |
| `GameN-designer-P3-correction-2026-10-14.txt` and `GameN-designer-P3-hashes-2026-10-14.json` | `e638e178f6bc40360fec4ab19e1e51ec300b8bdd10f30940c55f2cd5a2860f9a` and `a5912771c80c9da8ee0567bc66276224dd5f3f9318e22552a9b4129442d1066f` | The P3 correction for #130 and its file hashes, on a private claude.ai page for the owner to pass on | The body of #130 and [board-v2-frontend-handoff.md](board-v2-frontend-handoff.md), whose `sha256sum -c` block covers the files |
| Review pages and picture copies sent to the owner | — | Copies of committed review pictures | The branches' `review/` folders |
| Working files | — | Capture logs, debugging captures, probe scripts, a clean scratch trial merge; for #158, a medical-only capture runner, the mutation run of its measurement, geometry probes and a patch script | Not deliverables. The committed tools reproduce every recorded result |

**Received in the session, as files the owner uploaded:**

| File | SHA-256 | What it is | Where it is now |
| --- | --- | --- | --- |
| `GameN-owner-specification-agent-handoff-2026-10-13-v2.txt` | `b5b4ba2dea6063e20f559894183d0c675a3f754b2789db2e38c5b33e1590b743` | The owner's specification packet: the cover and its six documents | Preserved exactly, with the six documents taken out and checked: [evidence/owner-motion-spec-2026-10-13/](evidence/owner-motion-spec-2026-10-13/PROVENANCE.md) |
| `GameN-designer-stack-review-2026-10-13.txt` and `GameN-designer-stack-hashes-2026-10-13.json` | `34beb7033d56588f7361ce618054a06335d53f7ac81c0fa430e4f37a95a22250` and `5a8fabb5bfdc632a4c0b5fb0bfd88b0f2adfafbb4716dfe3a23c2d36d470f08c` | Integration's review of #127 to #129 of 13 October and its file inventory | Integration's own; not republished |
| `GameN-Designer-follow-up-2026-10-14.txt` | `fbb8715eb50b3f74e8b9b532105e299d940284bfd73086afdff9a3cbcb360829` | Integration's follow-up of 14 October to the Designer | Integration's own; not republished |

Also received, as messages: the coordinator's creative brief and the owner's notes. They are not the Designer's to publish.

## Versions

| Version | Commit | What changed |
| --- | --- | --- |
| 1 | `7786b91` | The first index: delivered, still to be delivered, and the session's files |
| 2 | `95d70f0` on #144 | Exact heads and bases, complete path lists with SHA-256, the specification packet preserved, the uploaded inputs listed, and the completion request's scope |
| 3 | `7a2af10` and the commit after it on #158 | The Hospital films (S9, S5, S10) delivered in #158 with their complete path list; the Captain films in production next; S3's Backend dependency (#149, #153); the owner's 4-bed request (#155) |
