// Minimal observable DOM/animation ports for the actual comic motion director. Test-only.
// No public-fact comparison, cue selection or lifecycle behavior is replaced here.
export function motionDom(t, { scene = false } = {}) {
  const animations = [];
  const fx = { children: [], append(...nodes) { this.children.push(...nodes); for (const node of nodes) node.parent = this; }, animate() {} };
  const phase = { dataset: {} };
  let pieces = new Map();
  let deviceReduced = false;
  const mediaListeners = new Set();
  const frames = new Map();
  let nextFrame = 1;
  const deviceMotion = {
    get matches() { return deviceReduced; },
    addEventListener(type, listener) { if (type === 'change') mediaListeners.add(listener); },
    removeEventListener(type, listener) { if (type === 'change') mediaListeners.delete(listener); },
  };

  function element() {
    return {
      style: {}, dataset: {},
      querySelector: () => ({ style: {} }),
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
  function redraw(room, { health = 'Healthy' } = {}) {
    pieces = new Map(['seat-1', 'seat-2'].map((seat, index) => {
      const piece = element();
      piece.dataset = { seat, character: `c${index + 1}` };
      const token = { ...element(), getBoundingClientRect: () => ({ left: room === 'room-a' ? 20 + index * 80 : 160 + index * 90, top: 150, width: 40, height: 50 }) };
      if (scene) {
        const gesture = `${room === 'room-a' ? 'consoleBack' : 'tablet'}${health === 'Injured' ? '+injured' : ''}`;
        piece.dataset.gesture = gesture; piece.dataset.mirror = 'false';
        token.dataset.figure = `c${index + 1}|${gesture}`; token.innerHTML = `latest authoritative ${gesture}`;
      }
      piece.querySelector = () => token;
      piece.querySelectorAll = () => [token];
      return [seat, piece];
    }));
  }
  const globals = {
    document: { visibilityState: 'visible', createElement: element },
    CSS: { escape: value => value },
    matchMedia: () => deviceMotion,
    getComputedStyle: () => ({ backgroundImage: 'url(public-standee.svg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }),
    requestAnimationFrame: callback => { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  };
  for (const [name, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    t.after(() => { if (original) Object.defineProperty(globalThis, name, original); else delete globalThis[name]; });
  }
  t.mock.timers.enable({ apis: ['setTimeout'] });
  redraw('room-a');
  return { root, fx, phase, animations, redraw, piece: seat => pieces.get(seat), mediaListeners, frames,
    frame(at) { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(at); },
    deviceReduced(value) {
      deviceReduced = value;
      for (const listener of [...mediaListeners]) listener({ matches: value });
    },
  };
}
