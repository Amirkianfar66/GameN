// mothership:dev-only
//
// The frozen native port on the same state as the component's page (index.html), in the same phone, for the
// agreement check. It imports the port's own files as the game has them (apps/game/hosted/planet/food-render.mjs and
// food-app.mjs, pinned by docs/integration/food-consumer-source-2026-11-13.json) and nothing of the component's
// drawing. It takes the same query as the component's page: ?state, ?size, ?motion, ?text, ?single.

import './preview.css';
import { mountFoodRenderer } from '../../../../../apps/game/hosted/planet/food-render.mjs';
import { mountFoodPublic } from '../../../../../apps/game/hosted/planet/food-app.mjs';
import { createFoodUi } from '../../../../../apps/game/hosted/planet/food-ui.mjs';
import { foodGauge } from '../../../../../apps/game/hosted/planet/food-gauge.mjs';
import { QUERY, STATES, VERSIONS, applyText, describe, drawn, freeze, openSheet, phone, pictures, situation } from './stage.mjs';

const $ = selector => document.querySelector(selector);
if (QUERY.single) document.body.dataset.single = '';
applyText(document);

const sit = situation(), device = phone(document, QUERY.size, { display: sit.surface === 'display' });
$('#stage').prepend(device.el);
$('#note').textContent = `Synthetic. ${sit.state.title}. ${sit.state.synthetic}.`;
let assets = null, owned = { active: false, exclusive: false }, measured = { top: null, bottom: null };
const deviceReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

function mount() {
  if (sit.surface === 'display') {
    // The display's own game model, as the port's notice reads it: the same public facts, step by step.
    const model = step => ({ food: step.stock === null ? null : { step: step.step, stock: step.stock }, concealed: false, connection: step.status === 'stale' ? 'stale' : 'live' });
    mountFoodPublic(device.host, { subscribe(listener) { for (const step of sit.steps) listener(model(step)); return () => {}; } });
    return;
  }
  const renderer = mountFoodRenderer(device.host, sit.controller, {
    identities: sit.identities, ordinary: sit.ordinary, assets,
    preferences: () => ({ reduced: QUERY.motion === 'reduced' || deviceReduced.matches }),
    surface(next) { owned = { active: !!next.active, exclusive: !!next.exclusive }; measured = { top: next.top ?? null, bottom: next.bottom ?? null }; device.owns(owned); },
    boardMode: () => sit.input.navigation.boardMode, bars: () => device.bars(),
  });
  if (sit.gauge !== null) device.gaugeSlot.replaceChildren(foodGauge(createFoodUi(document), sit.gauge) ?? '');
  openSheet(device.host, sit.open, () => renderer.openTasks());
}

const ready = (async () => {
  assets = await pictures(document, device.el, VERSIONS);
  mount();
  await drawn(window);
  return true;
})();
window.__food = {
  page: 'port', states: STATES, state: sit.state, surface: sit.surface, expected: sit.expected ?? null, ready,
  describe: () => ({ ...describe(device.host, assets), owned, measured, gauge: device.gaugeSlot.innerHTML }),
  freeze: ms => freeze(document, ms),
};
