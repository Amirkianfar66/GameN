import assert from 'node:assert/strict';
import test from 'node:test';
import {PLANET_ART_RELEASES, PLANET_ORIGINAL_PINS, PLANET_SYNC_PINS, PLANET_GAME_PINS,
  PLANET_PHONE_OFFER_PINS, PLANET_BLACKOUT_PINS, PLANET_FOOD_TASK_PINS,
  resolvePlanetReleaseCapabilities as resolve, planetCanPlayFilm} from '../../packages/contracts/dist/index.js';

const profiles = [PLANET_ORIGINAL_PINS, PLANET_SYNC_PINS, PLANET_GAME_PINS,
  PLANET_PHONE_OFFER_PINS, PLANET_BLACKOUT_PINS, PLANET_FOOD_TASK_PINS];
test('exact historical Planet combinations remain admitted; every cross-pair is rejected', () => {
  let accepted = 0;
  for (const [i, pins] of profiles.entries()) for (let art = 5; art <= 10; art++) {
    const v = {...pins, assetManifestVersion: `design-0.${art}.0`};
    const expected = i === 5 ? art === 9 : art === 5 || i >= 2 && art >= 6 && art <= 8;
    assert.equal(resolve(v) !== null, expected, `${pins.engineVersion} / ${v.assetManifestVersion}`);
    if (expected) accepted++;
  }
  assert.equal(accepted, 15);
});
test('changed or incomplete pins cannot activate a presentation capability', () => {
  const valid = {...PLANET_FOOD_TASK_PINS, assetManifestVersion: 'design-0.9.0'};
  for (const key of Object.keys(valid)) {
    const missing = {...valid}; delete missing[key]; assert.equal(resolve(missing), null, `missing ${key}`);
    assert.equal(resolve({...valid, [key]: key === 'protocolVersion' ? 2 : 'unknown'}), null, `changed ${key}`);
  }
  for (const value of [null, undefined, {}, [], {...valid, extra: true}, {...valid, assetManifestVersion: '__proto__'}])
    assert.equal(resolve(value), null);
});
test('Food inherits the existing library, crew and both films without granting other setup flows', () => {
  const pins = {...PLANET_FOOD_TASK_PINS, assetManifestVersion: 'design-0.9.0'};
  const capabilities = resolve(pins);
  for (const key of ['libraryArt', 'crewDrawing', 'roleFilms', 'boardingFilm', 'food']) assert.equal(capabilities[key], true);
  for (const kind of ['role', 'boarding']) {
    assert.equal(planetCanPlayFilm(pins, 3, kind), true);
    for (const flow of [null, undefined, 1, 2, 4, '3']) assert.equal(planetCanPlayFilm(pins, flow, kind), false);
  }
  // A non-film saved flow does not prevent reading the valid match tuple.
  assert.notEqual(resolve(pins), null);
});
test('historical pregame flow semantics stay separate from capability admission', () => {
  const pins = {...PLANET_GAME_PINS, assetManifestVersion: 'design-0.8.0'};
  for (const flow of [undefined, null, 2, 3]) assert.equal(planetCanPlayFilm(pins, flow, 'role'), true);
  for (const flow of [2, 3]) assert.equal(planetCanPlayFilm(pins, flow, 'boarding'), true);
  for (const flow of [undefined, null, 1, 4]) assert.equal(planetCanPlayFilm(pins, flow, 'boarding'), false);
  assert.equal(planetCanPlayFilm({...pins, assetManifestVersion: 'design-0.7.0'}, 3, 'role'), false);
});
test('registered successors retain predecessor capabilities and callers cannot mutate the registry', () => {
  for (const release of Object.values(PLANET_ART_RELEASES)) {
    assert.ok(Object.isFrozen(release) && Object.isFrozen(release.capabilities) && Object.isFrozen(release.pins));
    if (!release.parent) continue;
    const previous = PLANET_ART_RELEASES[release.parent].capabilities;
    for (const key of ['libraryArt', 'crewDrawing', 'roleFilms', 'boardingFilm', 'food'])
      if (previous[key]) assert.equal(release.capabilities[key], true, `successor dropped ${key}`);
  }
});
