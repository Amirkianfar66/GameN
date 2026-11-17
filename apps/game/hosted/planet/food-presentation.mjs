import { planetHasFood } from '@mothership/presentation';
import { mountFoodApp, mountFoodPublic } from './food-app.mjs';
import { foodGauge } from './food-gauge.mjs';
import { createFoodUi } from './food-ui.mjs';

const uis = new WeakMap();
const legacyFood = Object.freeze({
  mountPlayer: mountFoodApp,
  mountDisplay: (root, { game }) => mountFoodPublic(root, game),
  gauge(document, doses) {
    let ui = uis.get(document);
    if (!ui) {
      ui = createFoodUi(document);
      uis.set(document, ui);
    }
    return foodGauge(ui, doses);
  },
});

// The current Hosting artifact selects the frozen port. The admitted Designer
// artifact replaces this composition entry, so its graph has only one Food UI.
export function foodPresentationFor(versions) {
  return planetHasFood(versions) ? legacyFood : null;
}
