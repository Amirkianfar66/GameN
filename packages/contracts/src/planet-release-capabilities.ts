import {
  PLANET_ORIGINAL_PINS, PLANET_SYNC_PINS, PLANET_GAME_PINS, PLANET_PHONE_OFFER_PINS,
  PLANET_BLACKOUT_PINS, PLANET_FOOD_TASK_PINS, PlanetVersionsSchema,
} from './planet-game.js';

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
const none: PlanetReleaseCapabilities = Object.freeze({
  libraryArt: false, crewDrawing: false, roleFilms: false, boardingFilm: false, food: false,
  roleFilmSetupFlows: Object.freeze([]), boardingSetupFlows: Object.freeze([]),
});
const library = Object.freeze({...none, libraryArt: true});
const crew = Object.freeze({...library, crewDrawing: true});
const pregame = Object.freeze({...crew, roleFilms: true, boardingFilm: true,
  roleFilmSetupFlows: Object.freeze([null, 2, 3] as const), boardingSetupFlows: Object.freeze([2, 3] as const)});
const food = Object.freeze({...pregame, food: true,
  roleFilmSetupFlows: Object.freeze([3] as const), boardingSetupFlows: Object.freeze([3] as const)});

/**
 * Shared extension of the existing art-release registry. Build admission and browser dispatch
 * consume these same capabilities; immutable artwork manifests retain their original identities.
 * Every successor is explicit. A larger version number grants no compatibility.
 */
export const PLANET_ART_RELEASES: Readonly<Record<string, ArtRelease>> = Object.freeze({
  'design-0.5.0': Object.freeze({parent: null, pins: historical, capabilities: none}),
  'design-0.6.0': Object.freeze({parent: 'design-0.5.0', pins: privateFeedback, capabilities: library}),
  'design-0.7.0': Object.freeze({parent: 'design-0.6.0', pins: privateFeedback, capabilities: crew}),
  'design-0.8.0': Object.freeze({parent: 'design-0.7.0', pins: privateFeedback, capabilities: pregame}),
  'design-0.9.0': Object.freeze({parent: 'design-0.8.0', pins: Object.freeze([PLANET_FOOD_TASK_PINS]), capabilities: food}),
});

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
