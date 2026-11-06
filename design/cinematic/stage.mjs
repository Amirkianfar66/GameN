// mothership:dev-only
//
// The cinematic library's stage: one pilot on one surface, at one moment, for review and for
// rendering. A review page, not a client: no server, clock, command or private state; every input
// is a pilot's synthetic review fixture. Parameters:
//   pilot=hospital-rescue | blackhole | private-talk
//   surface=display | phone | insert | ...   (what a pilot offers)
//   variant=full | short | reduced            (what a pilot offers)
//   w, h (phone)  t=<ms>  play=1 (loop in real time)  beds=4 (the four-berth board's geometry)
//   role, seat (the role reveal films: a current role and the player's own number, review parameters)
// window.__cine = { ready, end, seek(t) -> Promise<{ t, stage, done }>, size, selector, fixture }.

import { PILOTS } from './pilots/index.mjs';

const params = new URLSearchParams(location.search);
const root = document.getElementById('stage');

async function start() {
  const pilot = PILOTS[params.get('pilot') ?? 'hospital-rescue'];
  if (!pilot) throw new Error(`No pilot ${params.get('pilot')}`);
  const surface = params.get('surface') ?? 'display';
  const mount = pilot.surfaces[surface];
  if (!mount) throw new Error(`Pilot ${pilot.id} has no surface ${surface}`);
  const variant = params.get('variant') ?? 'full';
  if (!pilot.variants.includes(variant)) throw new Error(`Pilot ${pilot.id} has no variant ${variant}`);
  const options = { variant };
  for (const name of ['w', 'h', 'roster', 'seat']) if (params.has(name)) options[name] = Number(params.get(name));
  for (const name of ['case', 'audience', 'viewer', 'role']) if (params.has(name)) options[name] = params.get(name);
  const cine = await mount(root, options);
  document.documentElement.dataset.pilot = pilot.id;
  document.documentElement.dataset.surface = surface;
  document.documentElement.dataset.variant = variant;
  window.__cine = { ...cine, pilot: pilot.id, version: pilot.version, surface, variant, ready: true };
  if (params.get('play') === '1') {
    const started = performance.now();
    const length = cine.end + 900;
    let busy = false;
    const tick = async now => {
      if (!busy) { busy = true; await cine.seek((now - started) % length); busy = false; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } else {
    await cine.seek(Number(params.get('t') ?? 0));
  }
}

start().catch(error => {
  root.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'stage-error';
  p.textContent = `Stage failed: ${error.message}`;
  root.append(p);
  window.__cine = { ready: false, error: error.message };
  throw error;
});
