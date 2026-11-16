// mothership:dev-only
//
// The frozen native port and the component in one page, each in its own phone on the same state: the port's on the
// left, the component's on the right. It is here for one question: with the port's stylesheets and the component's
// both loaded, as an app that keeps the port for its pinned matches would load them, does each surface still draw
// what it draws alone? The component's corrected style rules are written under its own mark (data-food-component, on
// the root it draws), so the port's surface can take none of them, and they outweigh the port's rules whichever
// sheets come last.
//
// Nothing is imported until the page says in which order: each renderer brings its own stylesheets, so the first one
// loaded has its sheets first in the page, and the second one's come after them and win a tie.
//
//   ?first=port | component   whose files, and so whose stylesheets, load first
//   ?stack=1                  for a capture: the two phones one on the other at the page's corner, where a phone alone
//                             stands; front(name) brings one of them forward
//   ?unmark=1                 for the check's control only: the component's root loses its mark after it is drawn
//   ?state, ?size, ?text, ?motion as on the other pages. A phone state only: the shared display's notice is not drawn here.

import './preview.css';
import { setCrewPictureSurface } from '../../../../../apps/game/hosted/crew-runtime.mjs';
import { QUERY, STATES, VERSIONS, applyText, describe, drawn, freeze, openSheet, phone, pictures, situation } from './stage.mjs';

const params = new URL(location.href).searchParams;
const first = params.get('first') === 'component' ? 'component' : 'port', order = first === 'port' ? ['port', 'component'] : ['component', 'port'];
document.body.dataset.single = '';
document.body.dataset.both = '';
if (params.get('stack') === '1') document.body.dataset.stack = '';
applyText(document);

/** Each renderer's files, imported when asked for and not before: its stylesheets come with it. */
const LOAD = {
  async port() {
    const render = await import('../../../../../apps/game/hosted/planet/food-render.mjs');
    const [ui, gauge] = await Promise.all([import('../../../../../apps/game/hosted/planet/food-ui.mjs'), import('../../../../../apps/game/hosted/planet/food-gauge.mjs')]);
    return { mountFoodRenderer: render.mountFoodRenderer, createFoodUi: ui.createFoodUi, foodGauge: gauge.foodGauge };
  },
  component: () => import('../food.mjs'),
};

// The same state twice, each with its own controller: the two surfaces share nothing but the page.
const sits = { port: situation(), component: situation() };
if (sits.port.surface !== 'phone') throw new Error('both.html draws a phone state only');
const devices = { port: phone(document, QUERY.size), component: phone(document, QUERY.size) };
for (const [name, device] of Object.entries(devices)) device.el.dataset.drawnBy = name;
document.querySelector('#stage').append(devices.port.el, devices.component.el);
const owned = { port: { active: false, exclusive: false }, component: { active: false, exclusive: false } }, measured = { port: { top: null, bottom: null }, component: { top: null, bottom: null } };
const deviceReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let assets = null;

const MOUNT = {
  port(files) {
    const sit = sits.port, device = devices.port;
    const renderer = files.mountFoodRenderer(device.host, sit.controller, {
      identities: sit.identities, ordinary: sit.ordinary, assets,
      preferences: () => ({ reduced: QUERY.motion === 'reduced' || deviceReduced.matches }),
      surface(next) { owned.port = { active: !!next.active, exclusive: !!next.exclusive }; measured.port = { top: next.top ?? null, bottom: next.bottom ?? null }; device.owns(owned.port); },
      boardMode: () => sit.input.navigation.boardMode, bars: () => device.bars(),
    });
    if (sit.gauge !== null) device.gaugeSlot.replaceChildren(files.foodGauge(files.createFoodUi(document), sit.gauge) ?? '');
    openSheet(device.host, sit.open, () => renderer.openTasks());
    sit.advance?.();
  },
  component(files) {
    const sit = sits.component, device = devices.component;
    let navigation = { ...sit.input.navigation }, handle = null;
    handle = files.mountFood(device.host, { ...sit.input, assets, bars: device.bars() }, {
      onSurface(next) { owned.component = next; device.owns(next); },
      onBars(next) { measured.component = next; },
      // The app's navigation, stood in for as on the component's own page.
      onNavigate(target) { navigation = target === 'switch' ? { ...navigation, boardMode: navigation.boardMode === 'room' ? 'board' : 'room' } : { ...navigation, openPanel: target }; handle?.update({ navigation }); },
    });
    if (sit.gauge !== null) device.gaugeSlot.replaceChildren(files.foodGauge(document, sit.gauge) ?? '');
    // What Frontend's adapter does on a case: the controller's model comes back as inputs.
    sit.live?.controller.subscribe(() => handle?.update({ ...sit.inputNow(), navigation }));
    openSheet(device.host, sit.open, () => handle.openTasks());
    sit.advance?.();
  },
};

/** The page's Food stylesheets, in their order: the component's holds its mark, the port's the rule for the app's own bars that the component leaves to the app. */
function sheets() {
  return [...document.styleSheets].map(sheet => {
    let text = '';
    try { text = [...sheet.cssRules].map(rule => rule.cssText).join('\n'); } catch { return 'unread'; }
    // The page's own sheet (preview.css) names the surface only to give it the review frames' safe areas.
    if (!text.includes('.planet-food') || text.includes('.preview-phone')) return null;
    const mine = text.includes('[data-food-component]'), theirs = text.includes('.planet-app[data-food-chrome');
    return mine && theirs ? 'both' : mine ? 'component' : theirs ? 'port' : 'other';
  }).filter(Boolean);
}

const ready = (async () => {
  const files = {};
  for (const name of order) files[name] = await LOAD[name]();
  assets = await pictures(document, devices.port.el, VERSIONS);
  setCrewPictureSurface(devices.component.el, VERSIONS);
  for (const name of order) MOUNT[name](files[name]);
  await drawn(window);
  if (params.get('unmark') === '1') { devices.component.host.querySelector('.planet-food.ph')?.removeAttribute('data-food-component'); await drawn(window); }
  return true;
})();
window.__food = {
  page: 'both', first, order, states: STATES, state: sits.port.state, ready, sheets,
  /** Brings one of the two phones forward, where they stand one on the other. */
  front(name) { for (const [who, device] of Object.entries(devices)) { if (who === name) device.el.dataset.front = ''; else delete device.el.dataset.front; } },
  describe: () => Object.fromEntries(Object.keys(devices).map(name => [name, { ...describe(devices[name].host, assets), owned: owned[name], measured: measured[name], gauge: devices[name].gaugeSlot.innerHTML }])),
  freeze: ms => freeze(document, ms),
};
