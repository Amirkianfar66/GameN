# The owner's motion specification packet of 13 October 2026

**Preserved by the Visual and Motion Designer on 14 October 2026**, as Integration's [completion request on #144](https://github.com/Amirkianfar66/GameN/pull/144#issuecomment-6171018083) asks. These are exact bytes. Nothing here is rewritten, summarized or changed.

- **How the Designer has it.** The owner uploaded the packet to the Designer's Claude Code session on 13 October 2026.
- **Why it is kept here.** Its six documents were uncommitted in a local worktree, on `codex/owner-motion-spec-2026-10-13` from `abb6839`, as the packet's cover says. That branch is not on the remote. The upload was the only copy the Designer held.
- **What it is to the Designer.** A record, not a rule source the Designer adopts. Rule-source precedence and canonical adoption are Integration's ([AGENTS.md](../../../../AGENTS.md)). The documents' own place is `docs/specifications/owner-motion-2026-10-13/`.

| File | SHA-256 | What it is |
| --- | --- | --- |
| `GameN-owner-specification-agent-handoff-2026-10-13-v2.txt` | `b5b4ba2dea6063e20f559894183d0c675a3f754b2789db2e38c5b33e1590b743` | The packet as uploaded: the coordinator's cover, then the six documents verbatim, each under a header giving its path and SHA-256 |
| `documents/README.md` | `d434066f630f8c023b88d556f37b2ac80cbc0fda19acb9ba3471ba147ed0dd13` | Status and reading order |
| `documents/game-design.md` | `002c5d9bcf5d1bcf2896533c34c5da277b3c0cdbc1dd555cad87816b08b026a2` | The mechanics and the phone experience (G-01 to G-09) |
| `documents/rules-contracts.md` | `6090fc0081b26b9426113db72c86d2651026a015a63e72e211aa270d13340f6b` | Command authority, ordering, audiences, deadlines and acceptance cases |
| `documents/motion-requirements.md` | `976eeee03c51a704e42fdfd8cb2d8384aaa82567b2e5190eb3a0af87cd381bba` | Each scene's stable targets, timing, privacy and reduced motion |
| `documents/decision-register.md` | `ecbe6dd4fef8cb0a8534811a605615aaf01a1f312af7e9c2fa498c9815121fa4` | The owner's individual approvals, the approved recommendations and the integration defaults (Q-…) |
| `documents/motion-storyboards.md` | `1642ed84153e83443367bfd29bfdda3328786030199f7dd6804a14025f590d56` | The detailed creative brief: beats, props, gestures, colors and camera for each scene |

**How the six were taken out of the packet.** For each document, the bytes between its header and the next header, kept only if they hash to the SHA-256 the packet records for that document. All six do.

**To check,** run `sha256sum -c` on this block from this folder:

```
b5b4ba2dea6063e20f559894183d0c675a3f754b2789db2e38c5b33e1590b743  GameN-owner-specification-agent-handoff-2026-10-13-v2.txt
d434066f630f8c023b88d556f37b2ac80cbc0fda19acb9ba3471ba147ed0dd13  documents/README.md
002c5d9bcf5d1bcf2896533c34c5da277b3c0cdbc1dd555cad87816b08b026a2  documents/game-design.md
6090fc0081b26b9426113db72c86d2651026a015a63e72e211aa270d13340f6b  documents/rules-contracts.md
976eeee03c51a704e42fdfd8cb2d8384aaa82567b2e5190eb3a0af87cd381bba  documents/motion-requirements.md
ecbe6dd4fef8cb0a8534811a605615aaf01a1f312af7e9c2fa498c9815121fa4  documents/decision-register.md
1642ed84153e83443367bfd29bfdda3328786030199f7dd6804a14025f590d56  documents/motion-storyboards.md
```

**Read with care:**
- **Relative links** in the documents resolve from `docs/specifications/owner-motion-2026-10-13/` at `abb6839`, as the cover says. From this copy, some do not.
- **The cover's authorization paragraph** describes the handoff of 13 October, which was review only. Production since then follows two things: the owner's approval of the Designer's plan order ([owner-decisions.md](../../owner-decisions.md#13-october-2026-the-fixed-slots-the-ward-and-the-smallest-phone)) and Integration's completion request of 14 October.
- **How the Designer's earlier notes map to it:** [motion-spec-crosswalk.md](../../motion-spec-crosswalk.md).
