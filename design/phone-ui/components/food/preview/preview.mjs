// mothership:dev-only
//
// The Food component's preview: the component, mounted from the same files the game imports (../food.mjs), in a
// phone, on one of the sample states of stage.mjs. Everything around it is the page's: the stand-ins for the ordinary
// app, the pictures (loaded as the game loads them), and what a real app would do with what the surface reports.
//
//   ?state=<id>   a sample state (stage.mjs STATES)          ?size=390x844 | 430x932
//   ?motion=reduced   the game's Reduce motion               ?text=1 | 1.5 | 2   the game's text size
//   ?single=1     the phone alone at the page's corner, for a capture
//   ?probe=1      runs the lifecycle probe (probe.mjs) instead of showing a state
//
// On a packet's or a variant's state the page only writes down what the surface reports. On a case it does what
// Frontend's adapter does: Frontend's own controller and contact adapter (createFoodTaskController and
// createFoodHoldInput, from @mothership/game) take the reports, and the controller's model comes back as inputs. The
// controller's transport is this page: a press is sent to nobody and is never answered, so it stays "sending".

import './preview.css';
import { createFoodHoldInput } from '@mothership/game';
import { FOOD_VERSION, foodGauge, mountFood, mountFoodNotice } from '../food.mjs';
import { QUERY, SIZES, STATES, TEXTS, VERSIONS, applyText, describe, drawn, freeze, inputsFromModel, openSheet, phone, pictures, situation } from './stage.mjs';

const $ = selector => document.querySelector(selector);
const el = (tag, props = {}, ...children) => { const node = Object.assign(document.createElement(tag), props); node.append(...children); return node; };
if (QUERY.single) document.body.dataset.single = '';
applyText(document);

if (QUERY.probe) {
  const { runProbe } = await import('./probe.mjs');
  window.__food = { version: FOOD_VERSION, page: 'component', probe: runProbe(document) };
} else {
  const sit = situation(), device = phone(document, QUERY.size, { display: sit.surface === 'display' });
  $('#stage').prepend(device.el);
  const reported = [], log = $('#log');
  let handle = null, assets = null, forced = null, suspended = false, owned = { active: false, exclusive: false }, measured = { top: null, bottom: null };
  let navigation = sit.input ? { ...sit.input.navigation } : null;
  /** The inputs now: a case's from Frontend's controller, any other state's as given, with the page's own navigation and, once chosen, status. */
  function inputs() {
    const base = sit.live ? { ...inputsFromModel(sit.live.controller.getModel(), sit.live.context), reducedMotion: QUERY.motion === 'reduced' } : sit.input;
    return { ...base, navigation, status: forced ?? base.status };
  }

  function report(name, ...args) {
    reported.push({ name, args: structuredClone(args) });
    log.textContent += `${name}(${args.map(a => JSON.stringify(a)).join(', ')})\n`;
    log.scrollTop = log.scrollHeight;
  }
  function readout() {
    const rows = [['Component', FOOD_VERSION], ['State', sit.state.id], ['Status', sit.surface === 'display' ? 'the shared display' : `${handle ? inputs().status : 'not mounted'}${suspended ? ', suspended' : ''}`],
      ['Food owns', `${owned.active ? 'its bars' : 'no bars'}${owned.exclusive ? ', and the whole screen (a Task)' : ''}`],
      ['Its bars measure', measured.top === null ? 'none' : `${measured.top} px above, ${measured.bottom} px below`],
      ...(navigation ? [['The app shows', `${navigation.openPanel}, ${navigation.boardMode}`]] : [])];
    $('#readout').replaceChildren(...rows.flatMap(([term, value]) => [el('dt', {}, term), el('dd', {}, value)]));
  }
  $('#note').replaceChildren(el('b', {}, 'Synthetic. '), `${sit.state.title}. ${sit.state.synthetic}.`);

  /** What Frontend's adapter does with the reports, on a case: its own controller and its own contact adapter. */
  function adapter() {
    if (!sit.live) return {};
    const { controller } = sit.live;
    const hold = createFoodHoldInput({ down: () => controller.holdDown(), up: () => controller.holdUp(), held: () => controller.getModel().physicalHolding || controller.getModel().needsContactOff });
    controller.subscribe(() => { handle?.update(inputs()); readout(); });
    return {
      onHold(contact) { if ('pointerId' in contact) hold.pointerDown(contact.pointerId); else if ('key' in contact) hold.keyDown(contact.key, contact.repeat); else hold.assistiveClick(); },
      onLetGo(contact) { if ('pointerId' in contact) hold.pointerUp(contact.pointerId); else hold.keyUp(contact.key); },
      onReleaseAll() { hold.releaseAll(); },
      onPress(name) { void controller.press(name); }, onAsk(seatId) { void controller.ask(seatId); }, onAnswer(answer) { void controller.answer(answer); }, onWithdraw() { void controller.withdraw(); },
    };
  }
  const app = adapter();
  const handlers = Object.fromEntries(['onHold', 'onLetGo', 'onReleaseAll', 'onPress', 'onAsk', 'onAnswer', 'onWithdraw'].map(name => [name, (...args) => { report(name, ...args); app[name]?.(...args); }]));
  /** The app's navigation, stood in for: the board's two views switch; any other panel covers Food until the board is back. */
  handlers.onNavigate = target => {
    report('onNavigate', target);
    navigation = target === 'switch' ? { ...navigation, boardMode: navigation.boardMode === 'room' ? 'board' : 'room' } : { ...navigation, openPanel: target };
    handle?.update({ navigation });
    readout();
  };
  handlers.onSurface = next => { report('onSurface', next); owned = next; device.owns(next); readout(); };
  handlers.onBars = next => { report('onBars', next); measured = next; readout(); };

  function mount() {
    if (sit.surface === 'display') {
      const [first, ...rest] = sit.steps;
      handle = mountFoodNotice(device.host, { ...first, bars: { top: device.bars().top } });
      for (const step of rest) handle.update(step);
      return;
    }
    handle = mountFood(device.host, { ...inputs(), assets, bars: device.bars() }, handlers);
    if (sit.gauge !== null) device.gaugeSlot.replaceChildren(foodGauge(document, sit.gauge) ?? '');
    openSheet(device.host, sit.open, () => handle.openTasks());
    // A state with a second packet is given it now: the controller tells the adapter, which gives the surface its inputs again.
    sit.advance?.();
  }

  // The page's own controls: what an app does to the surface between a player's presses.
  const select = (label, name, options, value) => el('label', {}, label, el('select', { name, onchange: e => { const next = new URL(location.href); next.searchParams.set(name, e.target.value); location.href = next.href; } },
    ...options.map(([id, text]) => el('option', { value: id, selected: String(id) === String(value) }, text))));
  const button = (text, onclick) => el('button', { type: 'button', onclick }, text);
  // A change of status, as an app's connection makes it. Concealed, the surface keeps nothing of the viewer, so back
  // from concealed the app gives it its inputs afresh, as Frontend's adapter does. "Live, status only" gives none.
  let cleared = false;   // concealed since the surface was last given its inputs
  const setStatus = (next, statusOnly = false) => {
    forced = next;
    if (next === 'concealed') cleared = true;
    const afresh = cleared && next !== 'concealed' && !statusOnly;
    if (afresh) cleared = false;
    handle?.update(afresh ? inputs() : { status: next });
    readout();
  };
  $('#bar').append(
    select('State', 'state', STATES.map(s => [s.id, `${s.kind} · ${s.id} · ${s.title}`]), sit.state.id),
    select('Phone', 'size', Object.keys(SIZES).map(key => [key, key.replace('x', ' × ')]), QUERY.size),
    select('Motion', 'motion', [['normal', 'Full motion'], ['reduced', 'Reduce motion']], QUERY.motion),
    select('Text', 'text', Object.entries(TEXTS), QUERY.text),
    ...(sit.surface === 'phone' ? [
      button('Live', () => setStatus('live')), button('Stale', () => setStatus('stale')), button('Concealed', () => setStatus('concealed')), button('Live, status only', () => setStatus('live', true)),
      button('Suspend', () => { handle?.suspend(); suspended = true; readout(); }), button('Resume', () => { handle?.resume(); suspended = false; readout(); }),
      button('Start a Task', () => handle?.openTasks()), button('Close', () => handle?.close()),
      button('Back to the board', () => { navigation = { ...navigation, openPanel: 'board' }; handle?.update({ navigation }); readout(); }),
      button('Dispose', () => { handle?.dispose(); handle = null; readout(); }), button('Mount', () => { if (!handle) mount(); readout(); }),
    ] : []),
  );
  readout();

  const ready = (async () => {
    assets = await pictures(document, device.el, VERSIONS);
    mount();
    await drawn(window);
    return true;
  })();
  window.__food = {
    version: FOOD_VERSION, page: 'component', states: STATES, state: sit.state, surface: sit.surface, expected: sit.expected ?? null, reported, ready,
    describe: () => ({ ...describe(device.host, assets), owned, measured, gauge: device.gaugeSlot.innerHTML }),
    freeze: ms => freeze(document, ms), handle: () => handle, sent: sit.live?.sent ?? null,
  };
}
