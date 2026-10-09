// Minimal observable DOM/animation ports for the actual comic motion director. Test-only.
// No public-fact comparison, cue selection or lifecycle behavior is replaced here.
export function motionDom(t) {
  const animations = [];
  const fx = { children: [], append(...nodes) { this.children.push(...nodes); for (const node of nodes) node.parent = this; }, animate() {} };
  const phase = { dataset: {} };
  let pieces = new Map();
  let deviceReduced = false;

  function element() {
    return {
      style: {}, dataset: {},
      remove() { if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this); this.parent = null; },
      animate(frames, options) {
        let resolve, reject;
        const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
        const animation = { frames, options, finished, cancellations: 0,
          cancel() { this.cancellations += 1; reject(new Error('cancelled')); }, finish() { resolve(); },
        };
        // A reflow's completion is not observed by the director; native animation cancellation
        // is a rejected promise too, so give the port a sink for that otherwise unused promise.
        finished.catch(() => {});
        animations.push(animation);
        return animation;
      },
    };
  }
  const root = {
    querySelectorAll: () => [...pieces.values()],
    querySelector: selector => selector === '.ms-phase' ? phase : pieces.get(/data-seat="([^"]+)"/.exec(selector)?.[1]) ?? null,
  };
  function redraw(room) {
    pieces = new Map(['seat-1', 'seat-2'].map((seat, index) => {
      const piece = element();
      piece.dataset = { seat, character: `c${index + 1}` };
      const token = { getBoundingClientRect: () => ({ left: room === 'room-a' ? 20 + index * 80 : 160 + index * 90, top: 150, width: 40, height: 50 }) };
      piece.querySelector = () => token;
      return [seat, piece];
    }));
  }
  const globals = {
    document: { visibilityState: 'visible', createElement: element },
    CSS: { escape: value => value },
    matchMedia: () => ({ matches: deviceReduced }),
    getComputedStyle: () => ({ backgroundImage: 'url(public-standee.svg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }),
  };
  for (const [name, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    t.after(() => { if (original) Object.defineProperty(globalThis, name, original); else delete globalThis[name]; });
  }
  t.mock.timers.enable({ apis: ['setTimeout'] });
  redraw('room-a');
  return { root, fx, phase, animations, redraw, piece: seat => pieces.get(seat), deviceReduced: value => { deviceReduced = value; } };
}
