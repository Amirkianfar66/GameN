import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { FoodTaskPlayerViewSchema } from '@mothership/contracts';
import { renderFoodView } from '../hosted/planet/food-component-view.mjs';

const { cases } = JSON.parse(readFileSync(new URL('../dev/phone/food/native-fixtures.json', import.meta.url), 'utf8'));
const fixture = cases.find(entry => entry.id === 'food-winch-03').native.initial.value.foodPlayerView;
const viewKeys = ['seatId', 'round', 'versions', 'viewRevision', 'step', 'stock', 'ownAvailability',
  'partnerChoices', 'offers', 'invitation', 'requestClosures', 'participantTask'];

test('the Food component view preserves omitted participant return placement', () => {
  const view = structuredClone(fixture);
  delete view.participantTask.ownReturnPlacement;
  const validated = FoodTaskPlayerViewSchema.parse(view);
  const result = renderFoodView(validated, viewKeys);

  assert.equal(result.participantTask.taskId, validated.participantTask.taskId);
  assert.equal(Object.hasOwn(result.participantTask, 'ownReturnPlacement'), false);
});

test('the Food component view projects the location of a supplied return placement', () => {
  const validated = FoodTaskPlayerViewSchema.parse(fixture);
  const result = renderFoodView(validated, viewKeys);

  assert.deepEqual(result.participantTask.ownReturnPlacement, {
    location: validated.participantTask.ownReturnPlacement.location,
  });
});
