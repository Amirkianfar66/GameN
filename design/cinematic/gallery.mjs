// mothership:dev-only
//
// The review gallery's controller: one stage (./stage.html) in a frame, driven through its seek
// API, with a simulated server clock for the lifecycle rules of the motion bible (deliver,
// duplicate, late join, cancel, reconnect, hidden tab), the reduced-motion switch mid-film, phone
// sizes, the audience and status of each scene, and the exported videos. Synthetic fixtures only.

import { CATALOGUE } from './catalogue/catalogue.mjs';

const $ = id => document.getElementById(id);
// display and phone: the board treatments, which cover nothing and may play in any phase. cut and the
// Blackhole's stage variant cover the board, so they may play only where nobody decides
// (./lib/visibility.mjs); the gallery shows them for review.
const PILOTS = {
  'hospital-rescue': { label: 'Pilot 1 · Hospital drone and recovery', scene: 'doctor-rescue', surfaces: ['display', 'cut', 'phone', 'insert'], variants: ['full', 'short', 'reduced'], cases: ['free', 'detained'], status: [['pilot', 'Board treatment on every surface: pilot (proposal)'], ['approved', 'S5 under it: approved (#158, #160)'], ['proposal', 'Display cut: only where nobody decides'], ['not', 'Live-action insert: NOT PRODUCED (study only)']] },
  blackhole: { label: 'Pilot 2 · Blackhole reveal and passage', scene: 'blackhole-sync', surfaces: ['display', 'phone', 'insert'], variants: ['full', 'stage', 'reduced'], cases: [], status: [['pilot', 'Board treatment in the rooms\' art, every surface: pilot (proposal)'], ['proposal', 'Stage variant (display): only if the owner approves a presentation stage, request R1'], ['not', 'Live-action insert: NOT PRODUCED (study only)']] },
  'private-talk': { label: 'Pilot 3 · Private Talk capsule', scene: 'private-talk', surfaces: ['display', 'phone'], variants: ['full', 'reduced'], cases: ['entrance', 'talk', 'exit'], status: [['pilot', 'Display comic page, entrance in the result stage: pilot (proposal)'], ['approved', 'Phones, and the exit on every surface: S2 on the board, unchanged (approved, #144)']] },
};
const state = { pilot: 'hospital-rescue', surface: 'display', variant: 'full', case: 'free', size: '390x844', t: 0, end: 1000, playing: false, reducedSwitch: false, delivered: new Set(), publishedAt: null };
let cine = null, frame = null, raf = 0;

function log(text) {
  const line = `${new Date().toISOString().slice(11, 23)}  ${text}\n`;
  $('log').textContent = line + $('log').textContent;
}

function options(select, values, current) {
  select.replaceChildren(...values.map(value => Object.assign(document.createElement('option'), { value, textContent: value, selected: value === current })));
}

function stageUrl() {
  const [w, h] = state.size.split('x').map(Number);
  const q = new URLSearchParams({ pilot: state.pilot, surface: state.surface, variant: state.variant, beds: '4', t: String(Math.round(state.t)) });
  if (state.surface === 'phone') { q.set('w', String(w)); q.set('h', String(h)); }
  if (PILOTS[state.pilot].cases.includes(state.case)) q.set('case', state.case);
  return `./stage.html?${q}`;
}

async function mount() {
  cancelAnimationFrame(raf);
  state.playing = false;
  $('play').setAttribute('aria-pressed', 'false');
  $('play').textContent = 'Play';
  $('viewer').replaceChildren();
  frame = document.createElement('iframe');
  frame.title = 'Cinematic stage';
  frame.src = stageUrl();
  $('viewer').append(frame);
  await new Promise(done => frame.addEventListener('load', done, { once: true }));
  for (let i = 0; i < 400 && !frame.contentWindow.__cine?.ready && !frame.contentWindow.__cine?.error; i += 1) await new Promise(done => setTimeout(done, 25));
  cine = frame.contentWindow.__cine;
  if (!cine?.ready) { log(`stage failed: ${cine?.error ?? 'timeout'}`); return; }
  const [w, h] = cine.size;
  Object.assign(frame.style, { width: `${w}px`, height: `${h}px` });
  fit();
  state.end = cine.end;
  $('scrub').max = String(Math.ceil(cine.end + 400));
  await seek(Math.min(state.t, cine.end + 400));
  renderAudience();
}

function fit() {
  if (!cine) return;
  const [w, h] = cine.size;
  const box = $('viewer').getBoundingClientRect();
  const height = Math.min(window.innerHeight * 0.7, box.width * (h / w));
  $('viewer').style.height = `${height}px`;
  const k = Math.min(box.width / w, height / h);
  frame.style.transform = `translate(${(box.width - w * k) / 2}px, ${(height - h * k) / 2}px) scale(${k})`;
}

async function seek(t) {
  state.t = Math.max(-1, t);
  $('scrub').value = String(Math.max(0, Math.round(state.t)));
  $('time').textContent = `${Math.round(state.t)} / ${Math.round(state.end)} ms`;
  if (cine) await cine.seek(state.t);
}

function playFrom(startT) {
  cancelAnimationFrame(raf);
  const started = performance.now() - startT;
  state.playing = true;
  $('play').setAttribute('aria-pressed', 'true');
  $('play').textContent = 'Pause';
  let busy = false;
  const tick = async now => {
    if (!state.playing) return;
    const t = now - started;
    if (t > state.end + 400) { state.playing = false; $('play').setAttribute('aria-pressed', 'false'); $('play').textContent = 'Play'; await seek(state.end); return; }
    if (!busy) { busy = true; await seek(t); busy = false; }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

function renderAudience() {
  const pilot = PILOTS[state.pilot];
  const entry = CATALOGUE.find(scene => scene.id === pilot.scene);
  const status = pilot.status.map(([kind, text]) => `<span class="badge badge--${kind}">${text}</span>`).join(' ');
  $('audience').innerHTML = `<p>${status}</p><table><tr><th>Audience</th><td>${entry.audience}</td></tr><tr><th>Trigger</th><td>${entry.trigger}</td></tr>`
    + `<tr><th>Phone vs display</th><td>${state.pilot === 'private-talk' ? 'The same public pair and transitions everywhere; the declared side and claim stay in the two participants\' own panel and never enter this film.' : 'Public: every phone and the display show the same facts; only the framing differs. The board treatment covers nothing a player selects or reads; a covering cut plays only where nobody decides.'}</td></tr>`
    + `<tr><th>Durations</th><td>${Object.entries(entry.durations).map(([k, v]) => `${k}: ${v}`).join('<br>')}</td></tr></table>`;
}

// ---------- the lifecycle simulation ----------
const EVENT_ID = 'evt-review-1';
$('deliver').addEventListener('click', async () => {
  state.delivered = new Set([EVENT_ID]);
  state.publishedAt = performance.now();
  log(`deliver ${EVENT_ID}: t = now - publishedAt = 0; play`);
  playFrom(0);
});
$('duplicate').addEventListener('click', () => {
  if (!state.delivered.has(EVENT_ID)) { log('duplicate before any delivery: deliver first'); return; }
  log(`duplicate ${EVENT_ID}: already presented on this page, ignored (no restart)`);
});
$('late').addEventListener('click', async () => {
  state.delivered = new Set([EVENT_ID]);
  state.publishedAt = performance.now() - 2500;
  log('late join: publishedAt was 2.5 s ago: seek to t = 2500 and continue (server endsAt unchanged)');
  playFrom(2500);
});
$('cancel').addEventListener('click', async () => {
  state.playing = false;
  cancelAnimationFrame(raf);
  log('cancel: a newer snapshot changed what the film shows: remove its nodes, draw the latest state (the film\'s end state)');
  await seek(state.end);
});
$('reconnect').addEventListener('click', async () => {
  state.playing = false;
  cancelAnimationFrame(raf);
  log('reconnect after the film\'s end: draw the final state at once; no replay');
  await seek(state.end + 1);
});
$('hidden').addEventListener('click', async () => {
  if (state.publishedAt === null) { log('hidden tab: deliver first'); return; }
  state.playing = false;
  cancelAnimationFrame(raf);
  log('tab hidden: nothing pauses on the server; no audio');
  await new Promise(done => setTimeout(done, 1500));
  const t = performance.now() - state.publishedAt;
  log(`tab visible: t = now - publishedAt = ${Math.round(t)}: ${t >= state.end ? 'snap to the final state' : 'seek and continue'}`);
  if (t >= state.end) await seek(state.end + 1); else playFrom(t);
});

// ---------- controls ----------
$('play').addEventListener('click', () => {
  if (state.playing) { state.playing = false; cancelAnimationFrame(raf); $('play').setAttribute('aria-pressed', 'false'); $('play').textContent = 'Play'; return; }
  playFrom(state.t >= state.end ? 0 : Math.max(0, state.t));
});
$('scrub').addEventListener('input', event => { state.playing = false; cancelAnimationFrame(raf); seek(Number(event.target.value)); });
$('back').addEventListener('click', () => seek(state.t - 1000 / 30));
$('fwd').addEventListener('click', () => seek(state.t + 1000 / 30));
$('reduced').addEventListener('click', async () => {
  const to = state.variant === 'reduced' ? 'full' : 'reduced';
  log(`reduced motion ${to === 'reduced' ? 'on' : 'off'} at t = ${Math.round(state.t)}: switch variant at the same t`);
  state.variant = to;
  $('variant').value = to;
  $('reduced').setAttribute('aria-pressed', String(to === 'reduced'));
  const playing = state.playing;
  await mount();
  if (playing) playFrom(state.t);
});
for (const id of ['pilot', 'surface', 'variant', 'case', 'size']) {
  $(id).addEventListener('change', async event => {
    state[id] = event.target.value;
    if (id === 'pilot') {
      const pilot = PILOTS[state.pilot];
      if (!pilot.surfaces.includes(state.surface)) state.surface = pilot.surfaces[0];
      if (!pilot.variants.includes(state.variant)) state.variant = pilot.variants[0];
      if (!pilot.cases.includes(state.case)) state.case = pilot.cases[0] ?? '';
      options($('surface'), pilot.surfaces, state.surface);
      options($('variant'), pilot.variants, state.variant);
      options($('case'), pilot.cases, state.case);
    }
    if (state.pilot === 'blackhole' && state.variant === 'stage' && state.surface !== 'display') { state.variant = 'full'; $('variant').value = 'full'; }
    $('case').disabled = PILOTS[state.pilot].cases.length === 0;
    $('size').disabled = state.surface !== 'phone';
    state.t = 0;
    await mount();
  });
}
window.addEventListener('resize', fit);

async function exportsPanel() {
  try {
    const manifest = await (await fetch('./exports/manifest.json')).json();
    const videos = manifest.exports.filter(entry => entry.path.endsWith('.mp4'));
    $('exports').replaceChildren(...videos.map(entry => {
      const card = document.createElement('div');
      card.className = 'export';
      const base = entry.path.replace('design/cinematic/', './').replace(/\.mp4$/, '');
      const poster = manifest.exports.find(e => e.path === entry.path.replace(/\.mp4$/, '.poster.webp'));
      card.innerHTML = `<video controls preload="none" muted playsinline ${poster ? `poster="${base}.poster.webp"` : ''} src="${base}.mp4"></video>`
        + `<p><span class="badge ${entry.class === 'runtime' ? 'badge--approved' : 'badge--pilot'}">${entry.class === 'runtime' ? 'runtime-eligible (identity-free)' : 'review only'}</span><br>${entry.path.replace('design/cinematic/exports/', '')}<br>${entry.width}×${entry.height} · ${entry.fps ?? '?'} fps · ${(entry.durationMs / 1000).toFixed(2)} s · ${(entry.bytes / 1e6).toFixed(2)} MB${entry.audio ? ` · ${entry.audio.codec}` : ' · no audio'}<br>sha256 ${entry.sha256.slice(0, 16)}…</p>`;
      return card;
    }));
  } catch {
    $('exports').textContent = 'No manifest yet: run node design/tools/cinematic-manifest.mjs.';
  }
}

options($('pilot'), Object.keys(PILOTS), state.pilot);
for (const option of $('pilot').options) option.textContent = PILOTS[option.value].label;
options($('surface'), PILOTS[state.pilot].surfaces, state.surface);
options($('variant'), PILOTS[state.pilot].variants, state.variant);
options($('case'), PILOTS[state.pilot].cases, state.case);
$('case').disabled = PILOTS[state.pilot].cases.length === 0;
$('size').disabled = true;
mount();
exportsPanel();
