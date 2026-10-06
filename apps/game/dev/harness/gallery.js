// mothership:dev-only
//
// The motion gallery page. It mounts one specimen at a time, so there is a single shell in
// the document and its ids stay unique, and plays that specimen's scene against the real
// client core. Choosing reduced motion goes through the screen's own setting, exactly as a
// player's choice would.

import { createPlayerScreen, createTableScreen } from '@mothership/game';
import { renderPlayerShell, renderTableShell } from '@mothership/presentation';
import { runSpecimen, SPECIMENS } from './gallery-specimens.js';
import { browserPorts, mountScreen } from './host.js';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

const STATUS_LABELS = {
  connected: 'Connected to the event director',
  interaction: 'Local interaction feedback; no event involved',
  'not-connected': 'Not connected: no approved fact, no director cue',
};
const stage = document.getElementById('gallery-stage');
const container = document.getElementById('app');
const about = document.getElementById('gallery-about');
const issued = document.getElementById('gallery-issued');
const specimenList = document.getElementById('gallery-specimens');
const controls = document.getElementById('gallery-controls');

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
const tokenMs = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// Where each specimen's duration comes from. The impact token reaches this page only.
const DURATION_VARIABLES = {
  selection: '--ms-motion-selection', cardTransition: '--ms-motion-card', registrationStamp: '--ms-motion-stamp',
  publicMove: '--ms-motion-move', roundTransition: '--ms-motion-round', publicImpact: '--gallery-motion-impact',
};

function element(tag, text, attributes = {}) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

SPECIMENS.forEach((specimen, index) => {
  const input = element('input', undefined, { type: 'radio', name: 'specimen', value: specimen.id });
  if (index === 0) input.checked = true;
  const label = element('label');
  label.append(input, ` ${specimen.title}`);
  specimenList.append(label);
});

let current = null;

// A treatment with no fact behind it is drawn here, over the scene and outside the shell,
// so the shell's own document is never touched and no game stylesheet needs a rule for it.
function drawOverlay(specimen) {
  const target = container.querySelector(`[data-cue-at="${CSS.escape(specimen.overlay.at)}"] .ms-token`);
  if (target === null) return;
  for (const earlier of stage.querySelectorAll('.gallery-overlay')) earlier.remove();
  const box = target.getBoundingClientRect();
  const origin = stage.getBoundingClientRect();
  const overlay = element('div', undefined, { class: 'gallery-overlay', 'aria-hidden': 'true', 'data-kind': specimen.overlay.kind });
  overlay.style.left = `${box.left - origin.left + box.width / 2}px`;
  overlay.style.top = `${box.top - origin.top + box.height / 2}px`;
  overlay.append(element('span', undefined, { class: 'gallery-overlay__burst' }), element('span', specimen.overlay.lettering, { class: 'gallery-overlay__lettering' }));
  stage.append(overlay);
  window.setTimeout(() => overlay.remove(), 1_500);
}

function describe(specimen) {
  const status = element('dd');
  status.append(element('span', STATUS_LABELS[specimen.status], { class: 'gallery-status', 'data-status': specimen.status }));
  const facts = [
    ['Moment', `${specimen.title} (${specimen.level.toLowerCase()})`],
    ['Treatment', specimen.treatment],
    ['Target', `${tokenMs(DURATION_VARIABLES[specimen.token])} (token ${specimen.token}; a starting target, not measured)`],
    ['Limit', specimen.limit],
    ['In words', specimen.words],
  ];
  about.replaceChildren(element('dt', 'Status'), status, ...facts.flatMap(([term, value]) => [element('dt', term), element('dd', value)]));
}

/** What the director has issued for the scene now playing, collected as frames go by. */
let issuedSoFar = { shown: { public: 0, private: 0 }, kinds: [] };

function reportIssued(specimen, screen) {
  if (specimen.status === 'not-connected') {
    issued.textContent = 'Cues issued by the director for this scene: none, and there cannot be one. This treatment is drawn by the gallery alone.';
    return;
  }
  // A cue leaves a frame again when its time is up, so what was issued is collected as it
  // is seen, per list: the two lists are numbered apart.
  const frame = screen.getFrame();
  for (const [list, name] of [[frame.cues, 'public'], [frame.privateCues, 'private']]) {
    for (const item of list) {
      if (item.seq <= issuedSoFar.shown[name]) continue;
      issuedSoFar.shown[name] = item.seq;
      issuedSoFar.kinds.push(`${item.cue.kind} (${name} #${item.seq})`);
    }
  }
  const text = `Cues issued by the director for this scene: ${issuedSoFar.kinds.length > 0 ? issuedSoFar.kinds.join(', ') : 'none'}.`;
  if (issued.textContent !== text) issued.textContent = text;
}

function choice(name) {
  return new FormData(controls).get(name);
}

function play() {
  if (current !== null) {
    current.run.stop();
    current.stopWatching();
    current.unmount();
  }
  for (const overlay of stage.querySelectorAll('.gallery-overlay')) overlay.remove();
  issuedSoFar = { shown: { public: 0, private: 0 }, kinds: [] };
  const specimen = SPECIMENS.find(candidate => candidate.id === choice('specimen')) ?? SPECIMENS[0];
  stage.dataset.surface = specimen.surface;
  describe(specimen);

  // What a harness page keeps across a reload has no place in a gallery scene: kept in
  // memory, gone with the scene.
  let kept = null;
  const ports = { ...browserPorts(), unresolved: { load: () => kept, save: value => { kept = value; }, clear: () => { kept = null; } } };
  const run = runSpecimen({
    specimen,
    wait,
    now: () => performance.now(),
    overlay: () => drawOverlay(specimen),
    createScreen: ({ transport, matchId }) => (specimen.surface === 'player'
      ? createPlayerScreen({ transport, matchId, ports, host: { reload: play } })
      : createTableScreen({ transport, matchId, ports, host: { reload: play } })),
  });
  const { screen } = run;
  const stopWatching = screen.subscribe(() => reportIssued(specimen, screen));
  const unmount = mountScreen({ container, screen, render: specimen.surface === 'player' ? renderPlayerShell : renderTableShell });
  current = { run, unmount, stopWatching, screen };
  applySettings();
  reportIssued(specimen, screen);
  // Bring the place the cue will land into view before it does.
  window.setTimeout(() => container.querySelector(specimen.lookAt)?.scrollIntoView({ block: 'center' }), 200);
}

function applySettings() {
  stage.dataset.effects = choice('effects');
  stage.dataset.motion = choice('motion');
  // The player's own setting, through the screen: the shell marks itself, the cue stylesheet follows.
  current?.screen.dispatch({ type: 'settings/reduce-motion', checked: choice('motion') === 'reduced' });
}

controls.addEventListener('change', event => {
  if (!(event.target instanceof HTMLInputElement)) return;
  if (event.target.name === 'specimen') play();
  else applySettings();
});
document.getElementById('gallery-replay').addEventListener('click', play);
// The form only groups the controls. It is never sent anywhere.
controls.addEventListener('submit', event => event.preventDefault());

play();
