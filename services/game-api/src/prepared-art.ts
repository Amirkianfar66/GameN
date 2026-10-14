import { CLONE_VERSION_PINS, DECLARED_HACK_VERSION_PINS, VOTE_RESULT_VERSION_PINS, sameFullGameplayPins, supportsVoteResults, isKnownFullGameplayPins } from '@mothership/contracts';
import type { FullGameplayPins } from '@mothership/contracts';

/** Select art only for a previously unprepared lobby. Never rewrite a saved deal.
 * Historical deployments retain their original routing. The new release keeps
 * old unprepared lobbies on their matching art instead of upgrading their rules.
 */
export function selectPreparedArt(versions: FullGameplayPins, configuredArt: string, historicalArt?: string): string {
  if (historicalArt === undefined) return configuredArt;
  if (configuredArt === 'design-0.4.0' && !isKnownFullGameplayPins(versions)) throw new Error('No reviewed art pairing for stored gameplay pins');
  if (!supportsVoteResults(versions)) return historicalArt;
  if (sameFullGameplayPins(versions, VOTE_RESULT_VERSION_PINS)) return 'design-0.2.0';
  if (configuredArt !== 'design-0.4.0') return configuredArt;
  if (sameFullGameplayPins(versions, DECLARED_HACK_VERSION_PINS)) return 'design-0.3.0';
  if (sameFullGameplayPins(versions, CLONE_VERSION_PINS)) return 'design-0.4.0';
  // Intermediate development tuples have never been paired with release art.
  // Do not turn them into a supported client agreement through a version range.
  throw new Error('No reviewed art pairing for stored gameplay pins');
}
