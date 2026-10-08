// mothership:dev-only
//
// The phone-first V1 journey prototype (issue #76): a router over the synthetic fixtures,
// a navigator for reviewers, countdowns that only change words at zero, and small local
// flows (pick, confirm, sending, result) so the screens can be clicked through.
//
// Parameters: ?state=<id from contract/journey.json>; chrome=0 hides the navigator (used
// for captures); motion=reduced; names=long; freeze=1 stops the countdowns; sheet=open.
//
// Nothing here talks to a server. A countdown reaching zero changes its words and nothing
// else, exactly as in the release: only the server ends a window or advances the match.

import { loadBundles } from '../../prototypes/js/bundles.js';
import { render, surfaceOf } from './screens.js';
import { FIXTURES, say, SYNTHETIC_IDS } from './fixtures.js';
import { h } from './h.js';

const params = new URLSearchParams(location.search);
const stateId = params.get('state');
const chrome = params.get('chrome') !== '0';
const frozen = params.get('freeze') === '1' || !chrome;
const motion = params.get('motion') === 'reduced' ? 'reduced' : 'full';
document.documentElement.dataset.motion = motion;
// ?t=<ms> holds every animation at that moment: how the storyboard frames are made from the real CSS.
// &only=<selector> keeps every other animation at its end, so a frame shows one cue alone.
const hold = params.has('t') ? Math.max(0, Number(params.get('t')) || 0) : null;
if (hold !== null) {
  const only = (params.get('only') ?? '').replace(/[^\w\s.,\-\[\]="]/g, '');
  const cue = only ? only.split(',').map(sel => sel.trim()).filter(Boolean) : ['*'];
  const not = only ? `:not(${cue.join(', ')})` : '';
  const style = document.createElement('style');
  style.textContent = (only ? `*${not}, *${not}::before, *${not}::after { animation: none !important; transition: none !important; }\n` : '')
    + `${cue.map(sel => `${sel}, ${sel}::before, ${sel}::after`).join(', ')} { animation-play-state: paused !important; animation-delay: -${hold}ms !important; transition: none !important; }`;
  document.head.append(style);
}
window.__designReady = false;

const journey = await (await fetch(new URL('../contract/journey.json', import.meta.url))).json();
const ORDER = journey.screens.flatMap(screen => screen.states.map(state => ({ ...state, screen })));
const meta = id => ORDER.find(state => state.id === id);
const app = document.getElementById('app');

/** The address of another state, keeping the reviewer's own settings. */
function hrefFor(id) {
  const next = new URLSearchParams();
  next.set('state', id);
  for (const keep of ['chrome', 'motion', 'names', 'freeze', 't', 'only']) if (params.has(keep)) next.set(keep, params.get(keep));
  return `?${next}`;
}

/* ---------- the index: the whole journey on one page ---------- */

if (!stateId || !FIXTURES[stateId]) {
  await loadBundles(['public-board']);
  const runtimeWord = { existing: 'in the release', partial: 'partial: Frontend work', proposed: 'PROPOSAL' };
  app.replaceChildren(h('main', { class: 'j-index' },
    h('p', { class: 'j-synthetic' }, 'Development only · synthetic fixtures · not the game · not owner-approved'),
    h('h1', null, 'Mothership · the phone-first V1 journey'),
    h('p', { class: 'j-lede' }, `Design prototype for issue #76, on the release candidate ${journey.designBase.commit.slice(0, 8)} (${journey.designBase.branch}). ${ORDER.length} states across ${journey.screens.length} screens. Every state is a labeled synthetic fixture drawn with the real tokens (${journey.pins.tokenVersion}) and the approved art (${journey.pins.assetManifestVersion}).`),
    h('p', { class: 'j-quiet' }, 'Open a state, then use ◀ ▶ to walk the journey and Notes for its data source, what the release already does, and the gap. Add ?motion=reduced or ?names=long to any state.'),
    h('div', { class: 'j-index__screens' }, journey.screens.map(screen => h('section', { class: 'j-index__screen', id: screen.id },
      h('h2', { class: 'j-h2' }, screen.priority ? `${screen.priority}. ${screen.title}` : screen.title, ' ', h('small', null, screen.route)),
      h('div', { class: 'j-index__states' }, screen.states.map(state => h('a', { class: 'j-index__state', href: hrefFor(state.id), 'data-runtime': state.runtime },
        h('img', { class: 'j-index__thumb', src: `./review/states/${state.id}.png`, alt: '', loading: 'lazy', onerror: 'this.remove()' }),
        h('b', null, state.title), h('small', null, `${state.id} · ${runtimeWord[state.runtime]}`)))))))));
  window.__designReady = true;
} else {
  const surface = surfaceOf(stateId);
  // As in the release: every phone loads the same three bundles whatever its seat or role;
  // the host and the display load the public bundle only (apps/game/hosted/art.mjs).
  await loadBundles(surface === 'player' ? ['public-board', 'player-ui', 'roles'] : ['public-board']);
  const ctx = { names: params.get('names'), sheet: params.get('sheet') === 'open' ? true : undefined, override: {}, card: null, pickedRoom: null };
  let started = performance.now();

  function draw({ focus = null } = {}) {
    app.replaceChildren(render(stateId, ctx));
    if (chrome) app.append(navBar());
    countdown();
    const target = focus ? app.querySelector(focus) : app.querySelector('[data-autofocus]');
    target?.focus();
  }

  function go(id) { location.search = hrefFor(id).slice(1); }

  /* The reviewer's navigator. Not part of the design; hidden in captures. */
  function navBar() {
    const index = ORDER.findIndex(state => state.id === stateId);
    const prev = ORDER[index - 1], next = ORDER[index + 1];
    const info = meta(stateId);
    const notes = h('aside', { class: 'j-notes', hidden: true, id: 'j-notes', 'aria-label': 'Design notes for this state' },
      h('dl', null,
        h('dt', null, 'State'), h('dd', null, `${info.id} · ${info.title}`),
        h('dt', null, 'Surface and audience'), h('dd', null, `${info.surface} · ${info.audience}`),
        h('dt', null, 'Drawn from'), h('dd', null, info.data.map(source => `${source}: ${journey.dataSources[source]}`).join(' ')),
        h('dt', null, 'In the release'), h('dd', null, `${info.runtime}. ${info.runtimeRef}`),
        h('dt', null, 'Gap'), h('dd', null, info.gap ?? 'None for this design.'),
        h('dt', null, 'Components'), h('dd', null, info.components.join(', '))));
    const toggle = h('button', { type: 'button', 'aria-controls': 'j-notes', 'aria-expanded': 'false' }, 'Notes');
    toggle.addEventListener('click', () => { notes.hidden = !notes.hidden; toggle.setAttribute('aria-expanded', String(!notes.hidden)); });
    return h('div', null, h('nav', { class: 'j-nav', 'aria-label': 'Prototype navigator (not part of the design)' },
      prev ? h('a', { href: hrefFor(prev.id), title: prev.title }, '◀') : null,
      h('a', { href: '?' }, 'Journey'),
      toggle,
      next ? h('a', { href: hrefFor(next.id), title: next.title }, '▶') : null), notes);
  }

  /* Countdowns: an estimate that only changes its words at zero. */
  let ticker = null;
  function countdown() {
    clearInterval(ticker);
    const timers = [...app.querySelectorAll('.j-timer[data-countdown]')];
    if (frozen || timers.length === 0) return;
    ticker = setInterval(() => {
      const elapsed = Math.floor((performance.now() - started) / 1000);
      for (const timer of timers) {
        const left = Math.max(0, Number(timer.dataset.countdown) - elapsed);
        const total = Number(timer.dataset.total);
        timer.querySelector('.j-timer__value').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
        timer.dataset.state = left === 0 ? 'expired' : left <= 10 ? 'final' : 'running';
        for (const bar of app.querySelectorAll('[data-bar-total]')) bar.style.setProperty('--left', `${Math.round(100 * left / total)}%`);
        if (left === 0) {
          timer.setAttribute('aria-label', 'Time is up');
          const status = app.querySelector('.j-lede[role="status"], .j-dock__note');
          if (status && !status.dataset.expiredShown) { status.dataset.expiredShown = '1'; status.textContent = 'Time is up. Waiting for the server.'; }
        }
      }
    }, 1000);
  }

  /* Local flows: what a press does on this device before any server answer. */
  const seatName = value => {
    const seat = FIXTURES[stateId].data.seats?.find(s => `seat-${s.n}` === value);
    return seat ? `Player ${seat.n} · ${ctx.names === 'long' ? value : seat.name}` : value;
  };
  function confirmFor(card, value) {
    const title = card.title;
    if (title === 'Move') return { kind: 'confirming', title, prompt: `Move to ${value}?`, consequence: say('acceptedConsequence'), confirm: 'Move', value };
    if (title === 'Shot') return { kind: 'confirming', title, prompt: `Register a shot at ${seatName(value)}?`, consequence: say('registeredConsequence'), confirm: say('registerShot'), value };
    if (title === 'Showdown shot') return { kind: 'confirming', title, prompt: `Register a showdown shot at ${seatName(value)}?`, consequence: say('registeredConsequence'), confirm: say('registerShot'), value };
    if (title === 'Vote') return value === say('abstain')
      ? { kind: 'confirming', title, prompt: 'Abstain from this vote?', consequence: say('oneBallot'), confirm: 'Cast ballot', value }
      : { kind: 'confirming', title, prompt: `Vote to send ${seatName(value)} to Jail?`, consequence: say('oneBallot'), confirm: 'Cast ballot', value };
    if (title === 'Release request') return value === say('noRelease')
      ? { kind: 'confirming', title, prompt: 'Make no release request now?', consequence: 'The release request stays unused. You cannot change this choice once the server accepts it.', confirm: 'Confirm choice', value }
      : { kind: 'confirming', title, prompt: `Ask for a vote on releasing ${seatName(value)} from Jail?`, consequence: say('releaseUses'), confirm: 'Confirm choice', value };
    if (title === 'Release vote') return { kind: 'confirming', title, prompt: value === say('abstain') ? 'Abstain from this vote?' : value === say('releaseYes') ? 'Vote yes to releasing Player 9 · Ivo?' : 'Vote no to releasing Player 9 · Ivo?', consequence: say('oneBallot'), confirm: 'Cast ballot', value };
    return { kind: 'confirming', title, prompt: `${title}: ${value}?`, consequence: say('registeredConsequence'), confirm: 'Confirm', value };
  }
  function resultFor(card) {
    if (card.title === 'Move') return { go: 'game.move-accepted' };
    if (card.title === 'Shot') return { go: 'game.registered' };
    if (card.title === 'Vote') return { go: 'phase.ballot-recorded' };
    if (card.title === 'Showdown shot') return { card: { kind: 'result', title: card.title, outcome: 'registered', text: `Showdown shot at ${seatName(card.value)} registered.`, detail: say('notResult') } };
    if (card.title === 'Release request') return { card: { kind: 'result', title: card.title, outcome: 'registered', stampWord: 'Accepted', text: card.value === say('noRelease') ? 'Your choice is recorded: no release request.' : `Release vote for ${seatName(card.value)} requested.`, detail: 'The phase shown at the top of this screen says what happens next.' } };
    return { card: { kind: 'result', title: card.title, outcome: 'registered', stampWord: 'Recorded', text: card.value === say('releaseYes') ? 'Your vote is recorded: yes.' : card.value === say('releaseNo') ? 'Your vote is recorded: no.' : 'Your abstention is recorded.', detail: 'This is not a result. The count is shown to everyone when the vote closes.' } };
  }
  const currentCard = () => ctx.card ?? FIXTURES[stateId].data.sheet?.card ?? null;

  app.addEventListener('click', event => {
    const target = event.target.closest('[data-to], [data-act]');
    if (!target || !app.contains(target)) return;
    if (target.getAttribute('aria-disabled') === 'true') { event.preventDefault(); return; }
    const act = target.dataset.act;
    if (act === 'open-private') { ctx.sheet = true; return draw({ focus: '#j-private-h' }); }
    if (act === 'hide-private') { ctx.sheet = null; return draw({ focus: '.j-privbtn' }); }
    if (act === 'copy') {
      navigator.clipboard?.writeText(SYNTHETIC_IDS.code).catch(() => {});
      target.textContent = 'Copied';
      return;
    }
    if (act === 'pick-crew') {
      if (target.getAttribute('aria-disabled') === 'true') return;
      ctx.override = { ...ctx.override, selected: target.dataset.character, phase: 'picked' };
      return draw({ focus: `[data-character="${target.dataset.character}"]` });
    }
    if (act === 'confirm-crew') {
      if (frozen) return;
      ctx.override = { ...ctx.override, phase: 'submitting' };
      draw();
      return setTimeout(() => go('select.confirmed'), 1200);
    }
    if (act === 'pick-room') {
      ctx.pickedRoom = target.dataset.room;
      ctx.card = confirmFor({ title: 'Move' }, target.dataset.room);
      return draw({ focus: '#j-card-title' });
    }
    if (act === 'choose') {
      const card = currentCard();
      if (card?.title === 'Move') ctx.pickedRoom = target.dataset.value;
      ctx.card = confirmFor(card ?? { title: 'Your action' }, target.dataset.value);
      return draw({ focus: '#j-card-title' });
    }
    if (act === 'back') { ctx.card = null; ctx.pickedRoom = null; return draw({ focus: '#j-card-title' }); }
    if (act === 'cancel') { ctx.card = null; ctx.pickedRoom = null; return go('game.private-open'); }
    if (act === 'confirm') {
      const card = currentCard();
      ctx.card = { kind: 'busy', title: card.title, text: card.title === 'Move' ? 'Sending your move to the server…' : card.title.includes('ote') ? 'Sending your ballot to the server…' : 'Sending to the server…' };
      draw({ focus: '#j-card-title' });
      if (frozen) return;
      return setTimeout(() => {
        const next = resultFor(card);
        if (next.go) return go(next.go);
        ctx.card = next.card;
        draw({ focus: '#j-card-title' });
      }, 1000);
    }
    if (target.dataset.to) { event.preventDefault(); go(target.dataset.to); }
  });

  // Go on the on-screen keyboard submits the form: the field's own button need not be in view.
  app.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target;
    if (form.dataset.submitTo) return go(form.dataset.submitTo);
    if (form.dataset.submitAct === 'confirm-crew') app.querySelector('[data-act="confirm-crew"]:not([aria-disabled="true"])')?.click();
  });

  app.addEventListener('input', event => {
    if (event.target.id !== 'j-name') return;
    const value = event.target.value;
    const count = [...value].length;
    ctx.override = { ...ctx.override, name: value };
    const counter = event.target.closest('.j-field')?.querySelector('.j-field__count');
    if (counter) counter.textContent = `${count}/12`;
    const confirm = app.querySelector('[data-act="confirm-crew"]');
    const selected = ctx.override.selected ?? FIXTURES[stateId].data.selected;
    if (confirm) confirm.setAttribute('aria-disabled', String(!(selected && count > 0 && count <= 12 && value.trim().length > 0)));
  });

  // As in the release: leaving the page turns a private card face down.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    if (stateId === 'reveal.revealed') return go('reveal.backgrounded');
    if (ctx.sheet !== null && app.querySelector('.j-private')) { ctx.sheet = null; draw(); }
  });

  draw();
  window.__designReady = true;
}
