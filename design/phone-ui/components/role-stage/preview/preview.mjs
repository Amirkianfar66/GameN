// mothership:dev-only
//
// The role stage's preview: the runtime components themselves (../role-card.mjs and ../role-stage.mjs,
// unchanged) on the phone pack's synthetic fixtures (design/phone-ui/prototype/fixtures.mjs: invented
// names, seats and roles, as the review sheets use), in each state Frontend checks.
//   index.html                                 every state
//   index.html?single=1&size=390x844&state=t01 one phone, for the check's captures (a card-* state: the card alone)
//   index.html?single=1&probe=1                the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                the stage beside the frozen pack (agree.mjs), for the check

import { mountRoleCard } from '../role-card.mjs';
import { mountRoleStage } from '../role-stage.mjs';
import { FIXTURE_LABEL, ROLE_FIXTURES, SELF, seatOf } from '../../../prototype/fixtures.mjs';
// The film's stand-in: the approved role film's own frame function (Motion & Cinematics', dev-only here),
// drawn as a still at the state's moment, as the game's player draws it. Not the runtime player.
import { roleCaptions, roleSvg } from '../../../../pregame-films/roles/film.mjs';

// The art bundles' properties, as the game's bundles define them: the person (card-cN) and the devices.
const DESIGN = new URL('../../../../', import.meta.url);
for (let n = 1; n <= 9; n += 1) {
  document.documentElement.style.setProperty(`--ms-asset-piece-crew-card-c${n}`, `url("${new URL(`crew-drawing/assets/cards/card-c${n}.svg`, DESIGN).href}")`);
}
for (const device of ['cracker', 'insider', 'blue-disabler', 'red-disabler', 'supplier', 'undercover', 'hacker', 'alien']) {
  document.documentElement.style.setProperty(`--ms-asset-device-${device}-held`, `url("${new URL(`crew-drawing/assets/roles/device-${device}.held.svg`, DESIGN).href}")`);
}

/** Frontend's role → device picture map (packages/presentation planetRoleLook; the test checks they agree). */
export const PREVIEW_DEVICES = Object.freeze({ Doctor: 'cracker', Insider: 'insider', 'Blue Disabler': 'blue-disabler', Supplier: 'supplier', Undercover: 'undercover', Hacker: 'hacker', Alien: 'alien', 'Red Disabler': 'red-disabler', Engineer: 'engineer' });

/** The viewer's own card, from the pack's fixtures: Player 4's character, the role's team and lines. */
export const cardOf = (role, extra = {}) => ({
  face: 'up', role, team: ROLE_FIXTURES[role].team, facts: ROLE_FIXTURES[role].facts,
  character: seatOf(SELF).character, device: PREVIEW_DEVICES[role] ?? null, ...extra,
});

/** The card alone, at the size the stage gives it at 390 × 844 (the pack's .card-area) and sheet 31's. */
export const CARD_STATES = Object.freeze({
  'card-doctor': { caption: 'Doctor · sheet 17', card: cardOf('Doctor'), box: [358, 563] },
  'card-hacker': { caption: 'Hacker · Red', card: cardOf('Hacker'), box: [358, 563] },
  'card-alien': { caption: 'Alien', card: cardOf('Alien'), box: [358, 563] },
  'card-engineer': { caption: 'Engineer · the successor device', card: cardOf('Engineer'), box: [358, 563] },
  'card-missing': { caption: 'Missing art · sheet 18', card: cardOf('Doctor', { art: 'missing' }), box: [358, 563] },
  'card-ready': { caption: 'Ready stamp · sheet 18', card: cardOf('Doctor', { stamp: 'ready' }), box: [358, 563] },
  'card-down': { caption: 'Card back · sheet 18', card: { face: 'down' }, box: [358, 563] },
  'card-sheet': { caption: 'In the Card sheet · sheet 31', card: cardOf('Doctor'), box: [358, 440] },
  'card-sheet-down': { caption: 'Hidden · sheet 31', card: { face: 'down', back: 'sheet' }, box: [358, 440] },
  'card-small': { caption: 'Small · one line', card: cardOf('Doctor'), box: [200, 300] },
});

/** The development phone sizes, with the pack's review frames' safe areas. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
});
const FILM_AT = 20000, ENDS_AT = 30000;
const clock = t => ({ elapsedMs: t, filmAtMs: FILM_AT, endsAtMs: ENDS_AT });
const doctor = cardOf('Doctor');
const base = t => ({ viewer: SELF, clock: clock(t), view: 'card', film: 'pending', card: doctor, ready: { mode: 'ready', enabled: false } });
const filming = t => ({ ...base(t), view: 'film', film: 'playing' });
const after = t => ({ ...base(t), view: 'after', ready: { mode: 'ready', enabled: true } });

/** Each state of sheets 17 and 18 Frontend checks: the stage's input, and the film's moment where it plays. */
export const STAGE_STATES = Object.freeze({
  't01': { caption: '0:01 · card · sheet 17', stage: base(1000) },
  't12': { caption: '0:12 · card · sheet 17', stage: base(12000) },
  't20': { caption: '0:20 · film begins · sheet 17', stage: filming(20200), film: 200 },
  't26': { caption: '0:26 · film · sheet 17', stage: filming(26000), film: 6000 },
  't30': { caption: '0:30 · Ready · sheet 17', stage: after(30000) },
  concealed: { caption: 'Concealed · sheet 18', stage: { ...base(9000), status: 'concealed' } },
  reduced: { caption: 'Reduce motion · sheet 18', stage: { ...filming(23000), reducedMotion: true }, film: 3000, variant: 'reduced' },
  missing: { caption: 'Missing art and film · sheet 18', stage: { ...base(24000), film: 'missing', card: cardOf('Doctor', { art: 'missing' }) } },
  late: { caption: 'Rejoined at 0:25 · sheet 18', stage: { ...filming(25000), toast: { id: 'rejoined', text: 'Rejoined · the stage carried on', icon: 'info' } }, film: 5000 },
  waiting: { caption: 'Ready · waiting · sheet 18', stage: { ...after(31000), ready: { mode: 'done' }, roster: { ready: 6, total: 9 } } },
  skipped: { caption: 'Film skipped on this phone', stage: { ...base(22000), film: 'skipped' } },
  stale: { caption: 'Reconnecting', stage: { ...base(14000), status: 'stale' } },
});

/** The film's still, with its captions, in the stage's film element (the player's place). */
function drawFilm(holder, t, variant) {
  const { width, height } = holder.getBoundingClientRect();
  const options = { width, height, role: 'doctor', character: seatOf(SELF).character, seat: SELF, variant };
  holder.innerHTML = roleSvg(t, options);
  for (const box of roleCaptions(t, options)) {
    const p = document.createElement('p');
    p.className = 'pv-caption';
    p.textContent = box.lines.join('\n');
    Object.assign(p.style, { left: `${box.x}px`, top: `${box.y - (1 - box.drop) * 10}px`, opacity: String(box.opacity), transform: `rotate(${box.tilt}deg)` });
    holder.append(p);
  }
}

const intents = [];
const params = new URLSearchParams(location.search);
const mounted = [];
function cardBox(key) {
  const s = CARD_STATES[key], box = document.createElement('div');
  box.className = 'pv-card-box';
  Object.assign(box.style, { width: `${s.box[0]}px`, height: `${s.box[1]}px` });
  return { box, mount: () => mountRoleCard(box, s.card, { onShow: () => intents.push(['onShow', key]) }) };
}
const record = name => (...args) => intents.push([name, ...args]);
const handlers = Object.fromEntries(['onReady', 'onSkipFilm', 'onShowRole', 'onRetry', 'onFocusReturn'].map(n => [n, record(n)]));
/** A phone at a development size, the stage in it, and the film's still where the film plays. */
function phone(sizeKey, key) {
  const size = PREVIEW_SIZES[sizeKey], s = STAGE_STATES[key];
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  return { frame, mount: () => {
    const stage = mountRoleStage(frame, { ...s.stage, insets: size.insets }, handlers);
    if (s.film !== undefined) drawFilm(stage.film, s.film, s.variant ?? 'full');
    return stage;
  } };
}

let probe = null, agree = null;
if (params.get('agree')) {
  document.body.classList.add('pv-single');
  agree = document.fonts.ready.then(() => import('./agree.mjs')).then(m => m.runRoleStageAgreement({ sizes: PREVIEW_SIZES, cardOf }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runRoleStageProbe({ sizes: PREVIEW_SIZES, cardOf }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const key = params.get('state') ?? 't01';
  if (CARD_STATES[key]) {
    const c = cardBox(key);
    document.body.append(c.box);
    mounted.push(c.mount());
  } else {
    const sizeKey = params.get('size') ?? '390x844';
    if (!STAGE_STATES[key] || !PREVIEW_SIZES[sizeKey]) throw new Error(`Unknown size or state: ${sizeKey} ${key}`);
    const p = phone(sizeKey, key);
    document.body.append(p.frame);
    mounted.push(p.mount());
  }
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Role stage · preview</h1><p>The runtime components on Player 4’s phone. ${FIXTURE_LABEL}. Desktop browser at each phone’s CSS size: not a phone.</p>`;
  const grid = document.createElement('div');
  grid.className = 'pv-grid';
  document.body.append(head, grid);
  for (const [key, s] of Object.entries(STAGE_STATES)) {
    for (const sizeKey of Object.keys(PREVIEW_SIZES)) {
      const cell = document.createElement('figure');
      cell.className = 'pv-cell';
      const caption = document.createElement('figcaption');
      caption.innerHTML = `${s.caption}<small>${sizeKey.replace('x', ' × ')} · state=${key}</small>`;
      const p = phone(sizeKey, key);
      cell.append(caption, p.frame);
      grid.append(cell);
      mounted.push(p.mount());
    }
  }
  for (const [key, s] of Object.entries(CARD_STATES)) {
    const cell = document.createElement('figure');
    cell.className = 'pv-cell';
    const caption = document.createElement('figcaption');
    caption.innerHTML = `${s.caption}<small>${s.box.join(' × ')} · state=${key}</small>`;
    const c = cardBox(key);
    cell.append(caption, c.box);
    grid.append(cell);
    mounted.push(c.mount());
  }
}

window.__roleStage = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};
