// mothership:dev-only
//
// What the board capture scripts read from a page after every step: fit, press areas, hit
// testing, overlaps, small controls, the strip, marks and private hooks. Shared by the board
// simulation capture and the emulator capture. An observation of one run, not a test oracle.

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

export const ROLES = ['Officer', 'Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler', 'Alien'];

// Read from the page after every step. A fact is an observation of one run, not a test oracle.
export const MEASURE = `(() => {
  const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const visible = node => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
  const inside = (a, b, slack = 0.5) => a.x >= b.x - slack && a.y >= b.y - slack && a.x + a.w <= b.x + b.w + slack && a.y + a.h <= b.y + b.h + slack;
  const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const hits = node => { const b = box(node); const top = document.elementFromPoint(b.x + b.w / 2, b.y + b.h / 2); return top === node || node.contains(top); };
  const viewport = { x: 0, y: 0, w: innerWidth, h: innerHeight };
  const tags = [...document.querySelectorAll('.ms-board .phone-room-move')].filter(visible);
  const targets = [...document.querySelectorAll('.ms-board .phone-character-target')].filter(visible).map(node => {
    const b = box(node);
    const zone = node.closest('.ms-zone');
    return { id: node.id, seat: node.dataset.value, ...Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Math.round(v * 10) / 10])),
      big: b.w >= 44 - 0.01 && b.h >= 44 - 0.01, inRoom: zone ? inside(b, box(zone)) : false, onScreen: inside(b, viewport), hit: hits(node),
      onTag: tags.some(tag => overlap(b, box(tag)) > 0.5) };
  });
  const overlaps = [];
  for (let i = 0; i < targets.length; i += 1) for (let j = i + 1; j < targets.length; j += 1) {
    const area = overlap(targets[i], targets[j]);
    if (area > 0.5) overlaps.push([targets[i].seat, targets[j].seat, Math.round(area)]);
  }
  const controls = [...document.querySelectorAll('#app button, #app summary')].filter(visible).filter(node => !node.closest('.phone-menu[hidden], [hidden]'));
  const small = controls.map(node => ({ node, b: box(node) })).filter(({ b }) => b.w < 44 - 0.01 || b.h < 44 - 0.01)
    .map(({ node, b }) => ({ id: node.id || null, cls: node.className || null, text: (node.textContent || '').trim().slice(0, 30), w: Math.round(b.w), h: Math.round(b.h) }));
  const phase = document.querySelector('.ms-phase');
  const statusClipped = phase ? [...phase.querySelectorAll('.ms-timer, .ms-phase__labels')].some(node => !inside(box(node), box(phase), 1)) : null;
  const zones = document.querySelector('.ms-board[data-board="own"] > .ms-zones');
  const html = document.getElementById('app').innerHTML;
  return {
    viewport: [innerWidth, innerHeight],
    pageScrolls: document.scrollingElement.scrollHeight > innerHeight + 0.5,
    pageOverflowsSideways: document.scrollingElement.scrollWidth > innerWidth + 0.5,
    boardScrollsInside: zones ? zones.scrollHeight > zones.clientHeight + 1 : null,
    rowUnit: zones?.style.getPropertyValue('--row-unit') || null,
    phase: document.querySelector('.ms-phase__label')?.textContent ?? null,
    strip: document.querySelector('.phone-strip')?.innerText.replace(/\\s+/g, ' ').trim() ?? null,
    stripStep: document.querySelector('.phone-strip > .ms-card__state')?.dataset.step ?? null,
    stamp: (() => { const s = document.querySelector('.phone-strip > .ms-card__state > .ms-card__status'); return s && getComputedStyle(s).clipPath === 'none' ? s.textContent : null; })(),
    tray: !!document.querySelector('[data-phone-view="actions"][data-action-dock="false"] .ms-private[data-open="true"]'),
    targets, overlaps, smallControls: small, statusClipped,
    marks: Object.fromEntries(['eligible', 'selected', 'picked', 'pending', 'other'].map(state => [state, [...document.querySelectorAll('.ms-board .ms-seat[data-board-target="' + state + '"]')].map(seat => seat.dataset.seat)])),
    ghost: document.querySelector('.phone-move-ghost')?.dataset.state ?? null,
    pass: (() => { const p = document.querySelector('#ms-phone-pass'); return p ? (p.disabled ? 'unavailable' : 'available') : document.querySelector('.phone-nav__slot') ? 'absent' : null; })(),
    focus: document.activeElement?.id || document.activeElement?.className || null,
    fxNodes: document.querySelectorAll('.phone-fx > *').length,
    moving: [...document.querySelectorAll('.ms-board .ms-seat[data-moving]')].map(seat => seat.dataset.seat),
    privateHooks: ['data-board-target', 'phone-character-target', 'phone-pick-order', 'phone-move-ghost', 'phone-strip', 'data-device', 'data-team'].filter(hook => html.includes(hook)),
    roleWords: ${JSON.stringify(ROLES)}.filter(role => document.body.innerText.includes(role)),
    commands: window.__simulation?.log.map(entry => entry.command) ?? [],
  };
})()`;


/** The problems a measured step shows, as short sentences. Empty when it is clean. */
export function problemsOf(measured, { phone = true } = {}) {
  return [
    phone && measured.pageScrolls && 'page scrolls', measured.pageOverflowsSideways && 'sideways overflow',
    ...measured.targets.filter(t => !t.big).map(t => `small target ${t.seat} ${t.w}x${t.h}`),
    ...measured.targets.filter(t => !t.inRoom).map(t => `target ${t.seat} leaves its room`),
    ...measured.targets.filter(t => !t.hit).map(t => `target ${t.seat} not hit at its centre`),
    ...measured.targets.filter(t => !t.onScreen).map(t => `target ${t.seat} off screen`),
    ...measured.targets.filter(t => t.onTag).map(t => `target ${t.seat} over a room tag`),
    ...measured.overlaps.map(([a, b, area]) => `targets ${a}/${b} overlap ${area}px²`),
    ...(phone ? measured.smallControls.map(c => `control under 44 px: ${c.id ?? c.cls} "${c.text}" ${c.w}x${c.h}`) : []),
    measured.statusClipped && 'status bar clips its content',
  ].filter(Boolean);
}
