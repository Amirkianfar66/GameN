// When each passer of the ship's one voyage is in the skylight, on the ship's one clock, for both phones (Room B test page v5).
// The skylight runs the game's Room B window layer (its 12 s delay) with its crop right-aligned ("xMaxYMid slice") to cover its
// box, SKY_LEAD 12 s ahead of Room B's window (the Lead's call of 18 November, for all five views). A passer crosses the glass
// right to left. There is no window or screen in this view, so nothing is shown twice. Writes timing.json.
import { readFileSync, writeFileSync } from 'fs';
import { SKY, WINDOW_DELAY, windowCrossings } from './vendor/design/phone-ui/components/room-scene/ambient.mjs';
const DIR = new URL('./', import.meta.url).pathname, S = JSON.parse(readFileSync(DIR + 'scene.json', 'utf8'));
const [gx, gy, gw, gh] = S.source.glass, box = { x: gx, y: gy, w: gw, h: gh }, delay = WINDOW_DELAY['room-b'], AHEAD = 12;
const mid = gx + gw / 2, crossings = windowCrossings(box, delay);
const out = { delay, period: SKY.period, ahead: AHEAD, phones: {} };
for (const [key, P] of Object.entries(S.phones)) {
  const sv = P.openings.skylightVisible, sc = Math.max(sv.w / gw, sv.h / gh), sky = [gx + gw - sv.w / sc, gx + gw];   // right-aligned cover
  const passers = SKY.flybys.map((fb, k) => { const c = crossings[k], half = fb.half * (fb.scale ?? 1), speed = (2 * c.reach) / (c.to - c.from);
    const when = ([lo, hi]) => [+(c.from + (mid + c.reach - half - hi) / speed - AHEAD).toFixed(2), +(c.from + (mid + c.reach + half - lo) / speed - AHEAD).toFixed(2)];
    return { kind: fb.kind, widthUnits: 2 * half, speed: fb.speed, skylight: when(sky) }; });
  const inAt = t => passers.filter(p => (p.skylight[0] <= t && p.skylight[1] >= t) || (p.skylight[0] <= t + SKY.period && p.skylight[1] >= t + SKY.period) || (p.skylight[0] <= t - SKY.period && p.skylight[1] >= t - SKY.period)).map(p => p.kind);
  out.phones[key] = { skylightUnits: sky.map(v => +v.toFixed(1)), skylightScale: +sc.toFixed(3), passers, heldAt0: inAt(0) };
  console.log(`${key}: the skylight shows ${out.phones[key].skylightUnits.join('–')} of the glass (x${out.phones[key].skylightScale}); in it at 0 s: ${out.phones[key].heldAt0.join(', ') || 'nothing'}`);
  for (const p of passers) console.log(`  ${p.kind.padEnd(7)} ${String(p.widthUnits).padStart(4)} wide: in the skylight ${p.skylight.join('–')} s`);
}
writeFileSync(DIR + 'timing.json', JSON.stringify(out, null, 1));
