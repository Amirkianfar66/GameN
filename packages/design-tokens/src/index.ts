// Unmodified proposal from docs/design/design-tokens.json; visual approval pending.
export { default as proposedDesignTokens } from './tokens.json' with { type: 'json' };

// The Designer's next revision, 0.3.0. Additive: every 0.2.0 key keeps its name, shape and
// value, so a consumer of proposedDesignTokens can switch to this export without a change.
// It is a proposal for evaluation too, and it does not replace the pinned 0.2.0 file: that
// needs a reviewed source-lock update (docs/design/integration-requests.md, DSN-REQ-2).
export { default as nextDesignTokens } from './tokens-0.3.0.json' with { type: 'json' };
