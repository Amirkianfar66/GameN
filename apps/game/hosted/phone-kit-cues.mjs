// The reviewed entry spans only: vote 0–320 ms and claim 0–300 ms; reduced motion 80 ms.
// Every elapsed value comes from the consumer's trusted phase deadline. No completion
// callback changes game state, creates content, reopens a panel or advances a phase.
export function phoneKitEntries(previous, current) {
  const out = [];
  if (!previous?.current || !current.current) return out;
  const duration = current.reduced ? 80 : 320;
  if (current.result && current.result.id !== previous.result?.id && current.result.elapsedMs < duration)
    out.push({ kind:'public',duration,elapsedMs:current.result.elapsedMs });
  const claimDuration = current.reduced ? 80 : 300;
  if (current.hack?.stage === 'HACK_RESULT' && previous.hack?.stage === 'HACK_DECLARE'
    && current.hack.id === previous.hack.id && current.hack.elapsedMs < claimDuration)
    out.push({ kind:'private',duration:claimDuration,elapsedMs:current.hack.elapsedMs });
  return out;
}

export function createPhoneKitCues(root) {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let previous = null;
  const running = new Set();
  const finish = kind => { for (const item of [...running]) if (!kind || item.kind === kind) { item.animation.cancel();running.delete(item); } };
  const changed = () => { if (media.matches) finish(); };
  media.addEventListener('change',changed);
  return {
    after(model) {
      const current = { current:model.screen === 'match' && model.connection === 'live'
        && root.ownerDocument.visibilityState === 'visible'
        && !model.banners.some(banner=>banner.kind === 'connection'),
        reduced:model.motion === 'reduced' || media.matches,
        result:model.match?.voteResult ?? null,hack:model.match?.privateArea?.content?.hackFeedback ?? null };
      if (!current.current || !current.result || previous?.result?.id !== current.result.id) finish('public');
      if (!current.current || !current.hack || previous?.hack?.phaseId !== current.hack.phaseId) finish('private');
      if (current.reduced) finish();
      for (const entry of phoneKitEntries(previous,current)) {
        const target = root.querySelector(entry.kind === 'public' ? '.feedback-window--vote:not(.feedback-window--compact)' : '[data-region="hack-feedback"][data-hack-id]');
        if (!target?.animate) continue;
        const animation = target.animate([{opacity:0},{opacity:1}],{
          duration:entry.duration,delay:-entry.elapsedMs,easing:'cubic-bezier(0.16,0.84,0.3,1)',
        });
        const item = {kind:entry.kind,animation};running.add(item);
        animation.finished.catch(()=>{}).finally(()=>running.delete(item));
      }
      previous = current;
    },
    dispose() { finish();media.removeEventListener('change',changed); },
  };
}
