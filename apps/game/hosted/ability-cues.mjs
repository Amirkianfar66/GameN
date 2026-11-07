// Cues decorate already-rendered authorized fields. PR #111 at 49f0db4d supplies the
// primitive timings/frames; no prototype app or controller is adopted. Every cue owns
// native animations only, can be cancelled without a redraw, and leaves the latest rest.
const SENT = ['submitting', 'checking', 'unknown'];
const seatsOf = state => state ? [...state.querySelectorAll('.ab-chip[data-seat]')].map(node => node.dataset.seat) : [];
export function abilityFacts(root) {
  const state = root.querySelector('.phone-strip > .ms-card__state');
  const file = root.querySelector('.ab-file');
  const kit = root.querySelector('.ab-kit[data-kit="rescue"] .ab-vials');
  return {
    strip: state ? { kind: state.dataset.kind ?? null, status: state.dataset.status, seats: seatsOf(state), resource: state.dataset.resourceCount === undefined ? null : Number(state.dataset.resourceCount) } : null,
    file: file?.dataset.file ?? null,
    scans: [...root.querySelectorAll('.ab-printout[data-scan]')].map(node => node.dataset.scan),
    slips: [...root.querySelectorAll('.ab-slip[data-slip]')].map(node => node.dataset.slip),
    hack: root.querySelector('.ab-kit[data-kit="hack"]')?.dataset.partner ?? null,
    rescues: kit ? Number(kit.dataset.remaining) : null,
    end: root.querySelector('.trial-result')?.dataset.winner ?? null,
  };
}
export function abilityChanges(previous, next) {
  if (previous === null) return { receipt: null, picked: [], scans: [], slips: [], hack: false, vial: null, end: false };
  const sameStrip = Boolean(previous.strip && next.strip && previous.strip.kind !== null && previous.strip.kind === next.strip.kind);
  return {
    receipt: sameStrip && SENT.includes(previous.strip?.status) && next.strip?.status === 'accepted' ? next.strip.kind : null,
    picked: sameStrip ? (next.strip?.seats ?? []).filter(seat => !previous.strip.seats.includes(seat)) : [],
    scans: previous.file === 'hacker' && next.file === 'hacker' ? next.scans.filter(key => !previous.scans.includes(key)) : [],
    slips: next.slips.filter(key => !previous.slips.includes(key)),
    hack: next.hack !== null && next.hack !== previous.hack,
    vial: sameStrip && next.strip.kind === 'rescue' && previous.strip.resource !== null && next.strip.resource !== null && next.strip.resource < previous.strip.resource ? next.strip.resource
      : previous.rescues !== null && next.rescues !== null && next.rescues < previous.rescues ? next.rescues : null,
    end: previous.end === null && next.end !== null,
  };
}

export function createAbilityCues(root) {
  let previous = null, disposed = false;
  const running = new Set(), seenSlips = new Set(), seenHacks = new Set();
  const deviceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finish = () => { for (const animation of running) animation.cancel(); running.clear(); };
  const onMotion = () => { if (!disposed && deviceMotion.matches) finish(); };
  deviceMotion.addEventListener('change', onMotion);
  const play = (node, frames, duration, extra = {}) => {
    if (!node || typeof node.animate !== 'function') return;
    const animation = node.animate(frames, { duration, easing: 'ease-out', id: 'ability-cue', ...extra });
    running.add(animation);
    animation.finished.then(() => running.delete(animation)).catch(() => running.delete(animation));
  };
  const clip = node => play(node, [{ opacity: 0, transform: 'scale(1.5) rotate(-10deg)' }, { opacity: 1, transform: 'none' }], 120, { fill: 'backwards' });
  return {
    after(model) {
      if (disposed) return;
      if (model.screen !== 'match' || model.connection !== 'live' || document.visibilityState !== 'visible') { previous = null; finish(); return; }
      const next = abilityFacts(root);
      const changes = abilityChanges(previous, next);
      previous = next;
      const reduced = model.motion === 'reduced' || deviceMotion.matches;
      const actionAllowed = model.match?.phase?.timer?.state === 'running';
      if (reduced || !actionAllowed || next.strip === null) finish();
      if (!reduced) {
        const state = root.querySelector('.phone-strip > .ms-card__state');
        if (actionAllowed) {
        for (const seat of changes.picked) clip(state?.querySelector(`.ab-chip[data-seat="${CSS.escape(seat)}"]`));
        if (changes.vial !== null) play(root.querySelector(`.ab-vials .ab-vial:nth-child(${changes.vial + 1})`), [{ clipPath: 'inset(0 0 0 0)', opacity: 1 }, { clipPath: 'inset(100% 0 0 0)', opacity: 1 }], 240, { pseudoElement: '::after' });
        if (changes.receipt === 'code') play(state?.querySelector('.ab-code-card'), [{ transform: 'none' }, { transform: 'scale(.94) translateY(2px)', offset: .4 }, { transform: 'none' }], 180);
        if (changes.receipt === 'supply') play(state?.querySelector('.ab-tags__string'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 200, { fill: 'backwards' });
        if (changes.receipt === 'disable') play(state?.querySelector('.ab-cell'), [{ opacity: 1 }, { opacity: .2, offset: .3 }, { opacity: .85, offset: .5 }, { opacity: 0 }], 200, { pseudoElement: '::after' });
        if (changes.receipt === 'shot' || changes.receipt === 'showdown-shot') play(state?.querySelector('.ab-round'), [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-14px)' }], 220, { pseudoElement: '::after' });
        if (changes.receipt === 'vote' || changes.receipt === 'release-vote') play(state?.querySelector('.ab-box'), [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], 240, { pseudoElement: '::after' });
        if (changes.receipt === 'pass') play(state?.querySelector('.ab-mic'), [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(14px) rotate(12deg)' }], 240, { pseudoElement: '::after' });
        }
        for (const key of changes.scans) play(root.querySelector(`.ab-printout[data-scan="${CSS.escape(key)}"]`), [{ clipPath: 'inset(0 0 100% 0)', transform: 'translateY(-6px)' }, { clipPath: 'inset(0 0 0 0)', transform: 'none' }], 260, { easing: 'steps(8,end)' });
        if (changes.end) {
          play(root.querySelector('.trial-result .ms-result__outcome'), [{ opacity: 0, transform: 'scale(1.15)' }, { opacity: 1, transform: 'none' }], 220, { fill: 'backwards' });
          root.querySelectorAll('.trial-cast__member').forEach((node, index) => play(node, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], 180, { delay: index * 45, fill: 'backwards' }));
        }
      }
      for (const key of next.slips) {
        if (!reduced && !seenSlips.has(key)) play(root.querySelector(`.ab-slip[data-slip="${CSS.escape(key)}"]`), [{ opacity: 0, transform: 'translateY(-14px) rotate(-3deg)' }, { opacity: 1, transform: 'none' }], 260, { fill: 'backwards' });
        seenSlips.add(key);
      }
      if (next.hack !== null) {
        if (!reduced && !seenHacks.has(next.hack)) play(root.querySelector('.ab-link__cord'), [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], 320);
        seenHacks.add(next.hack);
      }
    },
    finish,
    dispose() { if (disposed) return; disposed = true; deviceMotion.removeEventListener('change', onMotion); finish(); previous = null; seenSlips.clear(); seenHacks.clear(); },
  };
}
