# Claude entry point for Mothership

@AGENTS.md

Read [the agreed roster](docs/agent-roster.md) and
[CODEX_START_HERE.md](CODEX_START_HERE.md) before editing. They are the shared
instructions for both Claude and Codex; do not maintain a conflicting copy here.

The three Claude roles are independent Claude Code sessions:

- Frontend: issue #3 and `agents/frontend.md`.
- Visual and Motion Designer: issue #4 and `agents/designer.md`.
- Game Design and Balance: issue #5 and `agents/game-balance.md`.

Use the role specified in the launch prompt. Read that brief and its referenced
specification. Start implementation from the reviewed bootstrap commit, in your
own checkout/worktree and branch. Record the actual model and base commit.

Codex Astra owns Backend, bootstrap #1, shared contracts and integration. Propose
shared changes through your issue/PR. Designer owns art and motion specifications
and source assets; Frontend owns their runtime implementation. Balance proposes
mechanics changes for the game owner's approval. Follow AGENTS.md for rule-source
precedence, secret information, validation and publishing boundaries.

GitHub is the durable handoff: record decisions, dependencies, actual checks and
unresolved questions there. These files do not launch sessions or share chat memory.
