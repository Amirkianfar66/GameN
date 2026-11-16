// mothership:dev-only
//
// "At rest, the window is unchanged": for each of the pack's result states (sheets 37 and 38) at each development
// phone size, the vote's result window mounted in the reveal's host (the reveal at rest) beside the same window
// mounted straight in the shell's cover, as #267 mounts it. Every part of the window is measured in both: the same
// parts in the same order, each box the same to the hundredth of a pixel, and the same computed look where a host
// could change it (the stacking, the taps, the container's size the compact form answers to).
// The check (design/tools/results-reveal-check.mjs) also compares the two phones' pixels.

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const TOLERANCE_PX = 0.01;

export async function runRevealAgreement({ sizes, states, phone }) {
  const checks = [];
  for (const sizeKey of Object.keys(sizes)) for (const stateKey of states) {
    const id = `${sizeKey}/${stateKey}`;
    try {
      const pair = [phone(sizeKey, stateKey), phone(sizeKey, stateKey, { direct: true })];
      for (const p of pair) document.body.append(p.frame);
      const [hosted, direct] = pair.map(p => p.mount());
      await frames();
      const measure = m => {
        const cover = m.cover.getBoundingClientRect(), root = m.cover.querySelector('.ms-vote-result');
        const parts = [root, ...root.querySelectorAll('*')].map(node => {
          // A part that is not drawn (a note with nothing to say) has no box in either phone.
          const r = node.getClientRects().length ? node.getBoundingClientRect() : null;
          return { name: `${node.localName}${typeof node.className === 'string' && node.className ? `.${node.className.trim().split(/\s+/).join('.')}` : ''}`, box: r && [r.left - cover.left, r.top - cover.top, r.width, r.height] };
        });
        const style = getComputedStyle(root);
        return { parts, look: { position: style.position, zIndex: style.zIndex, pointerEvents: style.pointerEvents, display: style.display, transform: style.transform, opacity: style.opacity, containerType: style.containerType, containerName: style.containerName },
          scroll: (() => { const s = root.querySelector('.ms-result-scroll'); return s ? [s.scrollHeight, s.clientHeight] : null; })(),
          text: root.innerText.replace(/\s+/g, ' ').trim() };
      };
      const a = measure(hosted), b = measure(direct);
      const host = hosted.reveal.host;
      const rest = { animations: host.getAnimations().length, transform: getComputedStyle(host).transform, opacity: getComputedStyle(host).opacity, style: host.getAttribute('style'), frame: hosted.reveal.frame() };
      let apart = 0, worst = null;
      const sameParts = a.parts.length === b.parts.length && a.parts.every((part, i) => part.name === b.parts[i].name);
      let drawn = 0;
      if (sameParts) for (let i = 0; i < a.parts.length; i += 1) {
        const x = a.parts[i].box, y = b.parts[i].box;
        if (x === null || y === null) { if (x !== y) { apart = Infinity; worst = a.parts[i].name; } continue; }
        drawn += 1;
        for (let k = 0; k < 4; k += 1) { const d = Math.abs(x[k] - y[k]); if (d > apart) { apart = d; worst = a.parts[i].name; } }
      }
      const sameLook = JSON.stringify(a.look) === JSON.stringify(b.look), sameScroll = JSON.stringify(a.scroll) === JSON.stringify(b.scroll), sameText = a.text === b.text;
      const atRest = rest.animations === 0 && rest.transform === 'none' && rest.opacity === '1' && rest.style === null && rest.frame.beat === 'rest';
      const ok = sameParts && apart <= TOLERANCE_PX && sameLook && sameScroll && sameText && atRest;
      checks.push({ id, ok, detail: { parts: a.parts.length, drawn, sameParts, apartPx: apart, worst, sameLook, look: a.look, sameScroll, sameText, rest } });
      for (const m of [hosted, direct]) m.dispose();
    } catch (error) {
      checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } });
    }
  }
  return { mode: 'agree', ok: checks.every(c => c.ok), checks };
}
