# GitHub work items

The source and context import is on `main` in [Amirkianfar66/GameN](https://github.com/Amirkianfar66/GameN). The following issues are published; their implementation has not started.

| Order | Workstream | Issue | Intended branch |
| --- | --- | --- | --- |
| First | Shared bootstrap | [#1 — [Bootstrap] Establish the shared Mothership workspace and contracts](https://github.com/Amirkianfar66/GameN/issues/1) | `chore/mothership-bootstrap` |
| After bootstrap | Backend | [#2 — Server-authoritative match slice and command contract](https://github.com/Amirkianfar66/GameN/issues/2) | `agent/backend-foundation` |
| After bootstrap | Frontend | [#3 — Player UI and Three.js board evaluation slice](https://github.com/Amirkianfar66/GameN/issues/3) | `agent/frontend-tabletop` |
| After bootstrap | Designer | [#4 — Comic visual system and interaction handoff](https://github.com/Amirkianfar66/GameN/issues/4) | `agent/designer-art-direction` |
| After bootstrap | Game Balance | [#5 — Canon audit and comparative 7/8/9 test baseline](https://github.com/Amirkianfar66/GameN/issues/5) | `agent/game-balance-baseline` |

## Start in Codex

Select this repository and `main`, then submit:

```text
Read AGENTS.md and CODEX_START_HERE.md.
Implement GitHub issue #1 in this repository.
Preserve the confirmed rules, comic motion direction and reference Canvas.
Complete the shared bootstrap and prepare a reviewable PR.
Do not start the four dependent implementation tasks yet.
```

Once the bootstrap is reviewed and committed, start issues #2–#5 as four independent tasks from the same reviewed commit. Use their role briefs and the prompts in CODEX_START_HERE.md. Record the actual base SHA; branch names are intentions until a task creates them.

Verified source import: `7e28c2cd100642667fb0021be0b85fa8cade1869`. The later work-item index commit adds navigation and publication records. It does not implement game features.

No production deployment or Firebase game implementation was performed by this import. Creating an issue does not automatically launch Codex or create a permanent agent.
