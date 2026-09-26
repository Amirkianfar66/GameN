import type { EvaluationContext } from '@mothership/engine';

// Populated only by the future authenticated adapter after membership/seat checks.
// No endpoint, token validation or authorization is implemented by these types.
export interface AuthorizedCommandContext extends EvaluationContext {
  readonly verifiedUid: string;
}
