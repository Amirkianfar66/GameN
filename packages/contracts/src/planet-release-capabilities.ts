import {
  PLANET_ORIGINAL_PINS, PLANET_SYNC_PINS, PLANET_GAME_PINS, PLANET_PHONE_OFFER_PINS,
  PLANET_BLACKOUT_PINS, PLANET_FOOD_TASK_PINS, PlanetVersionsSchema,
} from './planet-game.js';
import capabilityData from './planet-art-capabilities.json' with {type: 'json'};

/** Presentation admission only. This never authorizes a command, a session or a deadline. */
export interface PlanetReleaseCapabilities {
  readonly libraryArt: boolean;
  readonly crewDrawing: boolean;
  readonly roleFilms: boolean;
  readonly boardingFilm: boolean;
  readonly food: boolean;
  readonly roleFilmSetupFlows: readonly (2 | 3 | null)[];
  readonly boardingSetupFlows: readonly (2 | 3)[];
}

type Pins = Readonly<{protocolVersion: number; engineVersion: string; rulesetVersion: string; rulesetHash: string}>;
interface ArtRelease {
  readonly parent: string | null;
  readonly pins: readonly Pins[];
  readonly capabilities: PlanetReleaseCapabilities;
}
const privateFeedback = Object.freeze([PLANET_GAME_PINS, PLANET_PHONE_OFFER_PINS, PLANET_BLACKOUT_PINS]);
const historical = Object.freeze([PLANET_ORIGINAL_PINS, PLANET_SYNC_PINS, ...privateFeedback]);
const pins: Record<keyof typeof capabilityData, readonly Pins[]> = {
  'design-0.5.0': historical,
  'design-0.6.0': privateFeedback,
  'design-0.7.0': privateFeedback,
  'design-0.8.0': privateFeedback,
  'design-0.9.0': Object.freeze([PLANET_FOOD_TASK_PINS]),
};

function flow(value: number | null): 2 | 3 | null {
  if (value !== null && value !== 2 && value !== 3) throw Error('Unregistered presentation setup flow');
  return value;
}

/**
 * Shared extension of the existing art-release registry. Build admission and browser dispatch
 * consume these same capabilities; immutable artwork manifests retain their original identities.
 * Every successor is explicit. A larger version number grants no compatibility.
 */
export const PLANET_ART_RELEASES: Readonly<Record<string, ArtRelease>> = Object.freeze(Object.fromEntries(
  Object.entries(capabilityData).map(([version, entry]) => [version, Object.freeze({
    parent: entry.parent,
    pins: pins[version as keyof typeof capabilityData],
    capabilities: Object.freeze({...entry.capabilities,
      roleFilmSetupFlows: Object.freeze(entry.capabilities.roleFilmSetupFlows.map(flow)),
      boardingSetupFlows: Object.freeze(entry.capabilities.boardingSetupFlows.map(value => {
        const result = flow(value);
        if (result === null) throw Error('Boarding requires a server-owned setup stage');
        return result;
      })),
    }),
  })]),
));

/** Saved sessions remain readable independently of whether their setup flow offers a film. */
export function resolvePlanetReleaseCapabilities(versions: unknown): PlanetReleaseCapabilities | null {
  const parsed = PlanetVersionsSchema.safeParse(versions);
  if (!parsed.success) return null;
  const v = parsed.data;
  if (!Object.hasOwn(PLANET_ART_RELEASES, v.assetManifestVersion)) return null;
  const release = PLANET_ART_RELEASES[v.assetManifestVersion]!;
  return release.pins.some(p => p.protocolVersion === v.protocolVersion && p.engineVersion === v.engineVersion
    && p.rulesetVersion === v.rulesetVersion && p.rulesetHash === v.rulesetHash) ? release.capabilities : null;
}

export function planetCanPlayFilm(versions: unknown, setupFlow: unknown, kind: 'role' | 'boarding'): boolean {
  const capabilities = resolvePlanetReleaseCapabilities(versions);
  if (!capabilities) return false;
  const flow = setupFlow === undefined ? null : setupFlow;
  if (kind === 'role') return capabilities.roleFilms && capabilities.roleFilmSetupFlows.some(v => v === flow);
  return capabilities.boardingFilm && capabilities.boardingSetupFlows.some(v => v === flow);
}
