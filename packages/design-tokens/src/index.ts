// Unmodified proposal from docs/design/design-tokens.json; visual approval pending.
export { default as proposedDesignTokens } from './tokens.json' with { type: 'json' };

// The Designer's next revision, 0.4.0. Additive over the pinned file: every 0.2.0 key keeps
// its name, shape and value, so a consumer of proposedDesignTokens can switch to this export
// without a change. It is a proposal for evaluation too, and it does not replace the pinned
// 0.2.0 file: that needs a reviewed source-lock update (docs/design/integration-requests.md,
// DSN-REQ-2).
//
// 0.4.0 follows 0.3.0, the revision of PR #45, and carries the direction the game owner
// approved on 7 October 2026: a color family for each room, the nine crew characters, the
// caption yellow. tokens-0.3.0.json stays beside it, unexported, so that a test and a check
// can hold 0.4.0 to changing in it only what it lists (revisedFrom030).
export { default as nextDesignTokens } from './tokens-0.4.0.json' with { type: 'json' };
