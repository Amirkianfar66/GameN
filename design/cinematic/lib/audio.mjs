// mothership:dev-only
//
// The cinematic library's procedural sound cues: every cue is synthesized here from sines, noise
// and envelopes (no sample, recording, licence or download), deterministically (seeded noise), so
// a cue renders to the same samples on every machine. A film's cue sheet (film.mjs AUDIO) places
// cues in time; mix() renders the sheet. Public cues only: a cue sheet exists for an event whose
// audience is public, and a private event's presentation plays none by default (motion bible).
// The runtime may play these cues itself, from the sheet, under the device's sound setting: a
// video export never carries the only copy of a cue.

export const RATE = 48000;

const TAU = Math.PI * 2;
/** A deterministic noise source in [-1, 1]. */
function noiseSource(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s / 4294967296) * 2 - 1; };
}
/** Attack/decay envelope at time x (s) for a cue of length len: a quick attack, an exponential tail. */
const env = (x, attack, decay) => (x < attack ? x / attack : Math.exp(-(x - attack) / decay));
/** A one-pole low-pass over a buffer, in place. */
function lowpass(buf, cutoff) {
  const a = Math.exp(-TAU * cutoff / RATE);
  let y = 0;
  for (let i = 0; i < buf.length; i += 1) { y = (1 - a) * buf[i] + a * y; buf[i] = y; }
  return buf;
}
/** A one-pole high-pass over a buffer, in place. */
function highpass(buf, cutoff) {
  const a = Math.exp(-TAU * cutoff / RATE);
  let y = 0, px = 0;
  for (let i = 0; i < buf.length; i += 1) { const x = buf[i]; y = a * (y + x - px); px = x; buf[i] = y; }
  return buf;
}
const buffer = seconds => new Float32Array(Math.round(seconds * RATE));
/** A tone whose frequency follows freq(x) (x in seconds), with harmonics [[n, gain]]. */
function tone(seconds, freq, { harmonics = [[1, 1]], amp = x => 1 } = {}) {
  const out = buffer(seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i += 1) {
    const x = i / RATE;
    phase += TAU * freq(x) / RATE;
    let v = 0;
    for (const [n, g] of harmonics) v += g * Math.sin(phase * n);
    out[i] = v * amp(x);
  }
  return out;
}
function noiseBuf(seconds, seed, amp = () => 1) {
  const out = buffer(seconds);
  const n = noiseSource(seed);
  for (let i = 0; i < out.length; i += 1) out[i] = n() * amp(i / RATE);
  return out;
}
const add = (a, b, gain = 1, at = 0) => { const o = Math.round(at * RATE); for (let i = 0; i < b.length && i + o < a.length; i += 1) a[i + o] += b[i] * gain; return a; };

/**
 * Each cue: (duration in seconds for a looping cue, else its own) -> samples. Levels are relative;
 * mix() normalizes the whole sheet.
 */
export const CUES = Object.freeze({
  // Hospital (Pilot 1)
  'alert-blip': () => tone(0.16, x => (x < 0.07 ? 880 : 660), { harmonics: [[1, 1], [3, 0.18]], amp: x => env(x, 0.004, 0.05) * 0.5 }),
  'hatch-open': () => {
    const hiss = highpass(noiseBuf(0.34, 11, x => env(x, 0.01, 0.09) * 0.5), 2200);
    const clunk = tone(0.12, x => 95 - 40 * x, { amp: x => env(x, 0.002, 0.03) * 0.9 });
    return add(add(buffer(0.36), clunk), hiss, 0.6, 0.02);
  },
  'drone-hum': (len = 4.8) => {
    const out = tone(len, x => 118 + 3 * Math.sin(TAU * 0.7 * x), { harmonics: [[1, 0.6], [2, 0.35], [3, 0.2], [5, 0.08]], amp: x => Math.min(1, x / 0.35, (len - x) / 0.5) * (0.82 + 0.18 * Math.sin(TAU * 31 * x)) * 0.16 });
    return add(out, lowpass(noiseBuf(len, 13, x => Math.min(1, x / 0.35, (len - x) / 0.5) * 0.08), 900));
  },
  'servo-unfold': () => add(tone(0.26, x => 420 + 2000 * x, { harmonics: [[1, 1], [2, 0.3]], amp: x => Math.min(1, x / 0.02) * Math.exp(-x / 0.15) * 0.18 }), tone(0.03, () => 2400, { amp: x => env(x, 0.001, 0.006) * 0.3 }), 1, 0.22),
  'scan-sweep': () => tone(0.9, x => 1150 + 260 * Math.sin(TAU * x / 0.9), { harmonics: [[1, 1], [2, 0.12]], amp: x => Math.sin(Math.PI * Math.min(1, x / 0.9)) * 0.07 }),
  'charge-whine': () => add(tone(0.42, x => 300 * Math.pow(8, x / 0.42), { harmonics: [[1, 1], [2, 0.25]], amp: x => (x / 0.42) ** 1.5 * 0.2 }), highpass(noiseBuf(0.42, 17, x => (x / 0.42) ** 2 * 0.12), 3000)),
  'revival-thump': () => {
    const boom = tone(0.7, x => 62 * Math.exp(-x * 2.2) + 34, { harmonics: [[1, 1], [2, 0.2]], amp: x => env(x, 0.003, 0.16) * 1 });
    const snap = highpass(noiseBuf(0.08, 19, x => env(x, 0.001, 0.012) * 0.8), 1500);
    const zap = tone(0.25, x => 1800 - 1200 * x, { amp: x => env(x, 0.002, 0.05) * 0.18 });
    return add(add(add(buffer(0.72), boom), snap), zap);
  },
  'monitor-beep': () => tone(0.12, () => 1000, { harmonics: [[1, 1], [2, 0.08]], amp: x => env(x, 0.003, 0.05) * 0.32 }),
  'hatch-close': () => add(tone(0.1, x => 120 - 50 * x, { amp: x => env(x, 0.002, 0.025) * 0.9 }), highpass(noiseBuf(0.2, 23, x => env(x, 0.005, 0.05) * 0.4), 2500)),
  'drone-whoosh': () => {
    const out = noiseBuf(0.34, 29, x => Math.sin(Math.PI * x / 0.34) * 0.45);
    return lowpass(out, 1600);
  },
  // Blackhole (Pilot 2)
  'void-rumble': (len = 4.4) => {
    const out = lowpass(noiseBuf(len, 31, x => Math.min(1, x / 0.8, (len - x) / 0.9) * 0.9), 120);
    return add(out, tone(len, x => 32 + 4 * x, { amp: x => Math.min(1, x / 1.0, (len - x) / 0.9) * 0.4 }));
  },
  'reveal-sting': () => add(tone(1.4, () => 220, { harmonics: [[1, 0.5], [1.5, 0.35], [2, 0.25], [3, 0.12]], amp: x => env(x, 0.01, 0.55) * 0.35 }), tone(1.4, () => 55, { amp: x => env(x, 0.02, 0.5) * 0.5 })),
  'pass-whoosh': () => {
    const out = noiseBuf(1.2, 37, x => Math.sin(Math.PI * Math.min(1, x / 1.2)) ** 2 * 0.7);
    return add(lowpass(out, 2400), tone(1.2, x => 160 + 340 * Math.sin(Math.PI * x / 1.2), { amp: x => Math.sin(Math.PI * Math.min(1, x / 1.2)) ** 2 * 0.12 }));
  },
  'ink-cut': () => highpass(noiseBuf(0.12, 41, x => env(x, 0.002, 0.03) * 0.5), 900),
  // Private Talk capsule (Pilot 3): public movement sounds only
  footstep: () => add(lowpass(noiseBuf(0.09, 43, x => env(x, 0.002, 0.02) * 0.6), 700), tone(0.06, () => 80, { amp: x => env(x, 0.002, 0.015) * 0.5 })),
  'door-slide': () => add(lowpass(noiseBuf(0.32, 47, x => Math.sin(Math.PI * Math.min(1, x / 0.32)) * 0.5), 1400), tone(0.32, x => 180 + 60 * x, { amp: x => Math.sin(Math.PI * Math.min(1, x / 0.32)) * 0.1 })),
  'door-seal': () => add(tone(0.1, () => 70, { amp: x => env(x, 0.002, 0.03) * 0.9 }), highpass(noiseBuf(0.28, 53, x => env(x, 0.04, 0.08) * 0.3), 3000)),
  'seat-settle': () => lowpass(noiseBuf(0.18, 59, x => env(x, 0.01, 0.05) * 0.35), 500),
  'busy-chime': () => add(tone(0.22, () => 740, { amp: x => env(x, 0.004, 0.08) * 0.2 }), tone(0.22, () => 988, { amp: x => env(x, 0.004, 0.08) * 0.2 }), 1, 0.11),
  // The Captain's EJECT cut: public sounds only (the console's hard click, the air leaving)
  'switch-click': () => add(tone(0.09, x => 150 - 70 * x / 0.09, { amp: x => env(x, 0.002, 0.02) * 0.8 }), highpass(tone(0.03, () => 2600, { amp: x => env(x, 0.001, 0.006) * 0.6 }), 1200)),
  'air-rush': (len = 1.6) => {
    const out = noiseBuf(len, 61, x => Math.min(1, x / 0.25, (len - x) / 0.5) * 0.8);
    return add(highpass(lowpass(out, 3200), 300), tone(len, x => 90 + 30 * Math.sin(Math.PI * x / len), { amp: x => Math.min(1, x / 0.3, (len - x) / 0.5) * 0.15 }));
  },
});

/**
 * A cue sheet ([{ at (ms), cue, until? (ms) }]) rendered to one mono buffer of `lengthMs`, peak
 * normalized to `peak` (dBFS). Returns Float32Array samples at RATE.
 */
export function mix(sheet, lengthMs, { peak = -3 } = {}) {
  const out = buffer(lengthMs / 1000);
  for (const entry of sheet) {
    const make = CUES[entry.cue];
    if (!make) throw new Error(`No cue ${entry.cue}`);
    const samples = entry.until ? make((entry.until - entry.at) / 1000) : make();
    add(out, samples, entry.gain ?? 1, entry.at / 1000);
  }
  let max = 0;
  for (const v of out) max = Math.max(max, Math.abs(v));
  const target = 10 ** (peak / 20);
  if (max > 0) for (let i = 0; i < out.length; i += 1) out[i] *= target / max;
  return out;
}

/** Samples as a 16-bit PCM mono WAV file. */
export function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), i * 2);
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8);
  head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22);
  head.writeUInt32LE(RATE, 24); head.writeUInt32LE(RATE * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}
