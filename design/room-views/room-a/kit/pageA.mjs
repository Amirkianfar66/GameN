// Room A's plan page for the Lead and the owner: the stand-in layout test (five views, both phones, both text sizes, the press
// areas on or off), the choices with recommendations, the room's plan, the heads, the steps and the spend. Reads views.json,
// staging.json, the camera reports and stageA.mjs; writes pub/room-a-plan.html. Generates nothing.
import { readFileSync, writeFileSync } from 'fs';
import { STAGING, LAYOUT, CAPSULE_SPOTS, CAPSULE, BY_HAND, IDS, FULL, CAST, VISIT } from './stageA.mjs';
import { PLACES, toRoom, TOK, DESIGN_SHA, DEG } from './vis/visA.mjs';
const DIR = new URL('./', import.meta.url).pathname, J = f => JSON.parse(readFileSync(DIR + f, 'utf8'));
const VIEWS = J('views.json'), REP = Object.fromEntries(IDS.map(v => [v, J(`camera-report-${v}.json`)]));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const N = pl => CAST[pl].name, deg = d => `${Math.abs(Math.round(d))}°`;
const total = Object.keys(VIEWS).length, passed = Object.values(VIEWS).filter(v => !v.issues.length).length, known = Object.entries(VIEWS).filter(([, v]) => v.issues.length), minEdge = Math.min(...Object.values(VIEWS).map(v => v.minEdgePx));
const PH = { 390: '390 × 844', 430: '430 × 932', 402: '402 × 742' };
// the tightest margins, named in the checks so that a later change that pushes someone past an edge is caught
const edgeRows = Object.values(VIEWS).flatMap(v => v.seen.map(s => ({ view: v.view, W: v.phone.split('x')[0], pct: v.pct, name: s.name, L: s.margins[0], R: s.margins[1], T: s.margins[2], F: s.margins[3] })));
const tightSide = edgeRows.reduce((a, b) => (Math.min(b.L, b.R) < Math.min(a.L, a.R) ? b : a)), tightEnd = edgeRows.reduce((a, b) => (Math.min(b.T, b.F) < Math.min(a.T, a.F) ? b : a));
const sideOn = W => { const r = edgeRows.find(e => e.view === tightSide.view && e.name === tightSide.name && e.W === W && e.pct === 100); return Math.min(r.L, r.R); };
const tagCount = (pct, at) => Object.values(VIEWS).filter(v => v.pct === pct).flatMap(v => v.seen).filter(s => s.tagAt.startsWith(at)).length;
const sightings = IDS.flatMap(v => Object.values(REP[v].people).map(p => ({ v, ...p })));
const maxFace = Math.round(Math.max(...sightings.filter(s => s.head === 'approved face').map(s => Math.abs(s.seenDeg)))), minBack = Math.round(Math.min(...sightings.filter(s => s.head === 'back view').map(s => Math.abs(s.seenDeg))));

// ---- the room's plan from above, north up, in metres (1 m = 70 units)
const S = 70, X = x => (x * S).toFixed(1), Y = z => (-z * S).toFixed(1);
const rect = (x0, z0, x1, z1, cls) => `<rect x="${X(Math.min(x0, x1))}" y="${Y(Math.max(z0, z1))}" width="${(Math.abs(x1 - x0) * S).toFixed(1)}" height="${(Math.abs(z1 - z0) * S).toFixed(1)}" class="${cls}"/>`;
const planSvg = (() => {
  const out = [];
  out.push(rect(-2, -2, 2, 2, 'p-floor'));
  for (const z of LAYOUT.lamps.z) out.push(`<line x1="${X(-LAYOUT.lamps.half)}" y1="${Y(z)}" x2="${X(LAYOUT.lamps.half)}" y2="${Y(z)}" class="p-lamp"/>`);
  // the 90° cones (the rule), faint
  for (const pl of IDS) { const [x, z] = toRoom(PLACES[pl]), a = (PLACES[pl].camera_facing_degrees + 90) * DEG, L = 1.15, p1 = [x + Math.sin(a - Math.PI / 4) * L, z + Math.cos(a - Math.PI / 4) * L], p2 = [x + Math.sin(a + Math.PI / 4) * L, z + Math.cos(a + Math.PI / 4) * L];
    out.push(`<path d="M${X(x)} ${Y(z)} L${X(p1[0])} ${Y(p1[1])} M${X(x)} ${Y(z)} L${X(p2[0])} ${Y(p2[1])}" class="p-cone"/>`); }
  // stations
  out.push(rect(-1.66, 1.45, -0.36, 2, 'p-furn'), rect(-1.49, 1.875, -1.03, 1.925, 'p-dark'), rect(-0.99, 1.875, -0.53, 1.925, 'p-dark'));             // A: desk, monitors
  out.push(rect(1.7, -0.7, 2, 0.4, 'p-furn'), rect(1.96, -1.2, 2, -0.7, 'p-furn'));                                                               // C: panel, door
  out.push(rect(-2, -0.95, -1.4, 0.05, 'p-furn'), rect(-2, -0.8, -1.5, -0.2, 'p-furn2'));                                                           // D: crates
  out.push(rect(0.13, 0.65, 1.13, 1.15, 'p-hole'), `<line x1="${X(1.13)}" y1="${Y(0.65)}" x2="${X(1.13)}" y2="${Y(1.15)}" class="p-lid"/>`, rect(-0.12, 0.8, 0.08, 1.16, 'p-furn')); // E: hatch, lid, toolbox
  // the round window and the capsule
  out.push(`<line x1="${X(-0.5)}" y1="${Y(2)}" x2="${X(0.5)}" y2="${Y(2)}" class="p-window"/>`);
  { const c = CAPSULE_SPOTS[CAPSULE]; out.push(rect(1.78, -c.u - 0.16, 2, -c.u + 0.16, 'p-capsule')); }
  out.push(rect(-2, -2, 2, 2, 'p-wall'));
  // where a visitor stands at the capsule (south of the unit in view A, its north end in the others) and the way in along the wall
  { const W = VISIT.wayIn, pts = [W.intoTheStrip, VISIT.at('A'), VISIT.at('B')], L = W.lyraRoundTheHatchNorth;
    out.push(`<path d="M${pts.map(q => `${X(q[0])} ${Y(q[1])}`).join(' L')} M${X(L[0])} ${Y(L[1])} L${X(VISIT.at('B')[0])} ${Y(VISIT.at('B')[1])}" class="p-way"/>`);
    for (const q of [VISIT.at('A'), VISIT.at('B')]) { const a = VISIT.faceDeg * DEG, f = [q[0] + Math.sin(a) * 0.24, q[1] + Math.cos(a) * 0.24];
      out.push(`<line x1="${X(q[0])}" y1="${Y(q[1])}" x2="${X(f[0])}" y2="${Y(f[1])}" class="p-visitface"/><circle cx="${X(q[0])}" cy="${Y(q[1])}" r="5.5" class="p-visit"/>`); } }
  // each person: their slides (the spots of the views that see them), their station spot, the way they face
  for (const pl of IDS) { const st = STAGING[pl], spots = Object.values(st.views).map(o => o.at);
    for (const s of spots) out.push(`<line x1="${X(st.at[0])}" y1="${Y(st.at[1])}" x2="${X(s[0])}" y2="${Y(s[1])}" class="p-slide"/><circle cx="${X(s[0])}" cy="${Y(s[1])}" r="2.6" class="p-slidept"/>`);
    const a = st.faceDeg * DEG, f = [st.at[0] + Math.sin(a) * 0.32, st.at[1] + Math.cos(a) * 0.32];
    out.push(`<line x1="${X(st.at[0])}" y1="${Y(st.at[1])}" x2="${X(f[0])}" y2="${Y(f[1])}" class="p-face"/><circle cx="${X(st.at[0])}" cy="${Y(st.at[1])}" r="7" class="p-person"/>`);
    const [px, pz] = toRoom(PLACES[pl]); out.push(`<circle cx="${X(px)}" cy="${Y(pz)}" r="9" class="p-place"/><text x="${X(px)}" y="${(+Y(pz) + 3.6).toFixed(1)}" class="p-placet">${pl}</text>`);
    const lab = { A: [-0.95, 0.72], B: [0.15, -0.72], C: [0.98, -0.3], D: [-0.92, -0.95], E: [0.62, 1.68] }[pl];
    out.push(`<text x="${X(lab[0])}" y="${Y(lab[1])}" class="p-name">${N(pl)}</text>`); }
  out.push(`<text x="${X(0)}" y="${(+Y(2) - 8).toFixed(1)}" class="p-note" text-anchor="middle">round window</text>`, `<text x="${X(2.07)}" y="${(+Y(1.05) + 3.5).toFixed(1)}" class="p-note">capsule</text>`,
    `<text x="${X(-0.62)}" y="${Y(1.6)}" class="p-note" text-anchor="middle">desk</text>`, `<text x="${X(2.07)}" y="${(+Y(-0.55) + 3.5).toFixed(1)}" class="p-note">panel</text>`, `<text x="${X(-1.36)}" y="${Y(0.18)}" class="p-note">crates</text>`, `<text x="${X(0.63)}" y="${Y(0.52)}" class="p-note" text-anchor="middle">hatch</text>`,
    `<text x="${X(1.3)}" y="${(+Y(-0.7) + 14).toFixed(1)}" class="p-note" text-anchor="end">light bar</text>`);
  out.push(`<text x="${X(0)}" y="${(+Y(2) - 26).toFixed(1)}" class="p-compass" text-anchor="middle">N</text><text x="${X(0)}" y="${(+Y(-2) + 34).toFixed(1)}" class="p-compass" text-anchor="middle">S</text><text x="${(+X(2) + 22).toFixed(1)}" y="${Y(0)}" class="p-compass" text-anchor="middle">E</text><text x="${(+X(-2) - 22).toFixed(1)}" y="${Y(0)}" class="p-compass" text-anchor="middle">W</text>`);
  return `<svg viewBox="${-2.75 * S} ${-2.8 * S} ${5.5 * S} ${5.6 * S}" role="img" aria-label="Room A from above, north up: the five places at the walls, each person at a station, the round window in the north wall, the capsule on the east wall and the two light bars">${out.join('')}</svg>`;
})();

// ---- tables
const stationRows = IDS.map(pl => { const st = STAGING[pl], what = { A: 'A desk against the north wall with two monitors; the chair rolls with Vega', B: 'Nothing: the open deck by the south wall', C: 'A cabinet on the east wall, its door folded back', D: 'Two crates against the west wall', E: 'A 1 m hatch in the floor in front of Lyra, its lid raised on its east side, a toolbox beside it' }[pl];
  const pose = { A: 'sits at the desk, back to the room', B: 'stands, facing into the room', C: 'stands at the cabinet, facing it', D: 'leans back on the crates, facing into the room', E: 'crouches at the hatch, facing into the room' }[pl];
  return `<tr><td class="n">${pl}</td><td>${N(pl)}</td><td>${esc(CAST[pl].work)}</td><td>${what}</td><td>${pose}</td></tr>`; }).join('');
const doesRows = IDS.map(pl => `<tr><td class="n">${pl}</td><td>${esc(CAST[pl].work)}</td><td>${N(pl)}</td><td>${esc(CAST[pl].does)}</td></tr>`).join('');
const whoRows = IDS.map(v => { const r = REP[v]; return `<tr><td class="n">${v}</td><td>${N(v)}’s</td><td>${Object.values(r.people).map(p => `${p.name} <span class="dim">(${deg(p.seenDeg)}, ${p.head})</span>`).join(', ')}</td><td>${r.outOfView.name}</td><td>${[VIEWS[`${v}-390-100`].window ? 'window' : '', VIEWS[`${v}-390-100`].capsule ? 'capsule' : ''].filter(Boolean).join(', ') || '<span class="dim">neither</span>'}</td></tr>`; }).join('');
const headRows = sightings.sort((a, b) => Math.abs(a.seenDeg) - Math.abs(b.seenDeg)).map(s => `<tr><td>${s.name}</td><td class="n">${s.v}</td><td class="n">${deg(s.seenDeg)}</td><td>from ${s.name}’s ${s.seenDeg >= 0 ? 'right' : 'left'}</td><td>${s.head}</td><td class="n">${s.depthM} m</td></tr>`).join('');
const cheatRows = IDS.map(v => { const r = REP[v]; return `<tr><td class="n">${v}</td><td>${Object.values(r.people).map(p => `${p.name}: ${p.cheat === 'none' ? 'at the station spot' : esc(p.cheat.replace("the station", p.name === 'Vega' ? 'the desk' : p.name === 'Atlas' ? 'the crates' : p.name === 'Echo' ? 'the cabinet' : p.name === 'Mira' ? 'the wall' : 'the hatch').replace(' x 742', ' × 742'))}, ${p.fromPlanM} m from the plan spot`).join('<br>')}</td></tr>`; }).join('');
const checkRows = ['390-100', '390-200', '430-100', '430-200', '402-100', '402-200'].map(k => { const [W, pct] = k.split('-'), vs = IDS.map(v => VIEWS[`${v}-${k}`]);
  return `<tr><td class="n">${PH[W]}</td><td class="n">${pct}%</td><td>${vs.every(v => !v.issues.length) ? '<span class="pill ok">5 of 5 pass</span>' : `<span class="pill warn">${vs.filter(v => !v.issues.length).length} of 5 pass</span><br><span class="dim" style="display: inline-block; max-width: 14em; margin-top: 4px;">${vs.filter(v => v.issues.length).map(v => `View ${v.view}: ${esc(v.issues.join('; ').replace(/'/g, '’'))}; known`).join('<br>')}</span>`}</td><td class="n">${Math.min(...vs.map(v => v.minEdgePx))} px</td><td class="n">${vs.flatMap(v => v.seen).filter(s => s.tagAt.startsWith('the feet')).length} of 15</td></tr>`; }).join('');
const VIEWDATA = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, { seen: v.seen.map(s => [s.name, Math.round(s.seenDeg), s.head, s.depthM, s.tagAt]), out: v.out, window: v.window, capsule: v.capsule, issues: v.issues.map(t => t.replace(/'/g, '’')) }]));

const html = `<title>Room A plan</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600&display=swap">
<style>
/* Layout: one reading column, the live stage first (phone beside its controls, stacked on a phone), then the plan's sections. */
:root { --bg: #F2F5F9; --panel: #FFFFFF; --sunk: #E6ECF3; --fg: #14202E; --muted: #536173; --line: #D5DEE8; --accent: #2D609E; --accent-soft: #E1EAF5; --ok: #1D6B45; --ok-soft: #E2F3EA; --warn: #8A4B0F; --warn-soft: #FBEEDD;
  --plan-floor: #DCE6F1; --plan-wall: #14243F; --plan-furn: #5C92CC; --plan-furn2: #A9CAEB; --plan-dark: #14243F; --plan-mark: #2D609E; --plan-person: #F1B84B; --plan-text: #14202E; --plan-cone: rgba(45, 96, 158, 0.35); --plan-window: #F4EBDD; --plan-capsule: #E08A3C;
  --f-body: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; --f-head: "Space Grotesk", Inter, system-ui, sans-serif; --f-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0E1520; --panel: #16202E; --sunk: #1C2939; --fg: #E6EDF6; --muted: #9AA9BC; --line: #2A3A50; --accent: #8DB6E4; --accent-soft: #1E3250; --ok: #6FD39E; --ok-soft: #173126; --warn: #F0B072; --warn-soft: #3A2817;
  --plan-floor: #1C2939; --plan-wall: #A9CAEB; --plan-furn: #2D609E; --plan-furn2: #5C92CC; --plan-dark: #0E1520; --plan-mark: #8DB6E4; --plan-person: #F1B84B; --plan-text: #E6EDF6; --plan-cone: rgba(141, 182, 228, 0.35); --plan-window: #F4EBDD; --plan-capsule: #E08A3C; color-scheme: dark } }
:root[data-theme="dark"] { --bg: #0E1520; --panel: #16202E; --sunk: #1C2939; --fg: #E6EDF6; --muted: #9AA9BC; --line: #2A3A50; --accent: #8DB6E4; --accent-soft: #1E3250; --ok: #6FD39E; --ok-soft: #173126; --warn: #F0B072; --warn-soft: #3A2817;
  --plan-floor: #1C2939; --plan-wall: #A9CAEB; --plan-furn: #2D609E; --plan-furn2: #5C92CC; --plan-dark: #0E1520; --plan-mark: #8DB6E4; --plan-person: #F1B84B; --plan-text: #E6EDF6; --plan-cone: rgba(141, 182, 228, 0.35); --plan-window: #F4EBDD; --plan-capsule: #E08A3C; color-scheme: dark }
body { background: var(--bg); color: var(--fg); font: 400 15px/1.55 var(--f-body); }
.wrap { max-width: 1040px; margin: 0 auto; padding-block: 28px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
h1, h2, h3 { font-family: var(--f-head); font-weight: 600; text-wrap: balance; margin: 0; }
h1 { font-size: clamp(28px, 5vw, 40px); line-height: 1.1; letter-spacing: -0.01em; }
h2 { font-size: 21px; line-height: 1.2; margin-top: 46px; }
h3 { font-size: 15.5px; margin-top: 24px; }
p { margin: 10px 0 0; max-width: 70ch; }
ul, ol { margin: 10px 0 0; padding-left: 20px; max-width: 74ch; } li + li { margin-top: 7px; }
button:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.eyebrow { font-size: 12px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--accent); margin: 0 0 8px; }
.lede { font-size: 17px; color: var(--muted); max-width: 64ch; }
.status { display: inline-flex; align-items: center; gap: 8px; margin-top: 14px; padding: 6px 12px; border-radius: 999px; background: var(--warn-soft); color: var(--warn); font-size: 13px; font-weight: 600; }
.status::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.dim { color: var(--muted); }
code { font-family: var(--f-mono); font-size: 13px; overflow-wrap: anywhere; }
.scroll { overflow-x: auto; margin-top: 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); }
table { border-collapse: collapse; width: 100%; font-size: 13.5px; font-variant-numeric: tabular-nums; }
th, td { text-align: left; padding: 8px 11px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); font-weight: 600; background: var(--sunk); }
tr:last-child td { border-bottom: 0; }
td.n { white-space: nowrap; font-family: var(--f-mono); font-size: 12.5px; }
.mid table { min-width: 620px; }
.pill { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; background: var(--sunk); color: var(--muted); white-space: nowrap; }
.pill.ok { background: var(--ok-soft); color: var(--ok); } .pill.rec { background: var(--accent-soft); color: var(--accent); } .pill.warn { background: var(--warn-soft); color: var(--warn); white-space: normal; }
.facts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.facts .pill { font-size: 12.5px; padding: 4px 11px; }
/* the stage */
.live { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: start; margin-top: 22px; }
.controls { display: grid; gap: 14px; align-content: start; min-width: 0; }
.group { display: grid; gap: 6px; min-width: 0; } .group > .name { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
.seg { display: flex; flex-wrap: wrap; gap: 6px; }
.seg button { font: 500 14px/1 var(--f-body); padding: 10px 14px; min-height: 40px; border-radius: 999px; border: 1px solid var(--line); background: var(--panel); color: var(--fg); cursor: pointer; }
.seg button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.check { display: flex; gap: 8px; align-items: center; font-size: 14px; min-height: 40px; } .check input { width: 18px; height: 18px; accent-color: var(--accent); }
.readout { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; font-size: 14px; display: grid; gap: 6px; font-variant-numeric: tabular-nums; min-width: 0; }
.readout .who { font-weight: 600; } .readout ul { margin: 0; padding-left: 18px; } .readout li + li { margin-top: 3px; }
.hint { font-size: 13.5px; color: var(--muted); margin: 0; max-width: 60ch; }
.phone-col { display: flex; justify-content: center; min-width: 0; }
.phone { flex: 0 1 auto; width: 390px; max-width: 100%; border-radius: 26px; overflow: hidden; background: #0F1117; box-shadow: 0 10px 30px rgba(10, 20, 40, 0.22); }
.phone.w430 { width: 430px; } .phone.w402 { width: 402px; }
.phone img { display: block; width: 100%; height: auto; }
@media (max-width: 860px) { .live { grid-template-columns: minmax(0, 1fr); } .phone-col { order: -1; } .phone { border-radius: 16px; } }
/* recommendations */
.recs { display: grid; gap: 14px; margin-top: 16px; }
.rec { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; min-width: 0; }
.rec h3 { margin: 0; display: flex; flex-wrap: wrap; gap: 8px 10px; align-items: baseline; }
.swatches { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.sw { display: grid; gap: 4px; font-size: 12px; color: var(--muted); font-family: var(--f-mono); } .sw i { display: block; width: 64px; height: 34px; border-radius: 6px; border: 1px solid var(--line); }
.choice { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; margin-top: 10px; }
.choice > div { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; background: var(--bg); min-width: 0; }
.choice > div.pick { border-color: var(--accent); background: var(--accent-soft); }
.choice b { display: block; margin-bottom: 4px; }
/* the plan */
.plan { display: grid; grid-template-columns: minmax(0, 420px) minmax(0, 1fr); gap: 22px; align-items: start; margin-top: 16px; }
@media (max-width: 760px) { .plan { grid-template-columns: minmax(0, 1fr); } }
.plan svg { width: 100%; height: auto; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; }
.p-floor { fill: var(--plan-floor); } .p-wall { fill: none; stroke: var(--plan-wall); stroke-width: 5; } .p-furn { fill: var(--plan-furn); } .p-furn2 { fill: var(--plan-furn2); } .p-dark { fill: var(--plan-dark); }
.p-hole { fill: var(--plan-dark); } .p-lid { stroke: var(--plan-furn2); stroke-width: 5; } .p-lamp { stroke: var(--plan-mark); stroke-width: 3; stroke-dasharray: 6 4; opacity: 0.8; }
.p-window { stroke: var(--plan-window); stroke-width: 9; } .p-capsule { fill: var(--plan-capsule); } .p-cone { stroke: var(--plan-cone); stroke-width: 1.5; fill: none; }
.p-place { fill: var(--panel); stroke: var(--plan-mark); stroke-width: 2; } .p-placet { fill: var(--plan-mark); font: 700 11px var(--f-body); text-anchor: middle; }
.p-person { fill: var(--plan-person); stroke: var(--plan-wall); stroke-width: 1.5; } .p-face { stroke: var(--plan-wall); stroke-width: 2.5; }
.p-slide { stroke: var(--plan-person); stroke-width: 2; } .p-slidept { fill: var(--plan-person); }
.p-visit { fill: var(--plan-floor); stroke: var(--plan-capsule); stroke-width: 2.5; } .p-visitface { stroke: var(--plan-capsule); stroke-width: 2.5; } .p-way { fill: none; stroke: var(--plan-capsule); stroke-width: 2; stroke-dasharray: 2 4; stroke-linecap: round; }
.p-name { fill: var(--plan-text); font: 600 12px var(--f-body); text-anchor: middle; } .p-note { fill: var(--plan-text); font: 500 10px var(--f-body); opacity: 0.85; } .p-compass { fill: var(--plan-text); font: 700 12px var(--f-head); }
.key { display: grid; gap: 6px; font-size: 13.5px; } .key span { display: inline-block; width: 14px; height: 10px; border-radius: 3px; margin-right: 8px; vertical-align: middle; }
.note { margin-top: 16px; background: var(--panel); border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 10px; padding: 12px 16px; max-width: 78ch; }
.foot { margin-top: 46px; padding-top: 16px; border-top: 1px solid var(--line); color: var(--muted); font-size: 13px; } .foot p { max-width: 86ch; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
<div class="wrap">
<header>
<p class="eyebrow">Mothership · Room A · 19 November 2026</p>
<h1>Room A plan</h1>
<p class="lede">Room A, planned the way Room B was made: the same five places and views, the same camera and look, with Room A’s own colours, round window and work. Nothing is painted yet. The people are stand-ins, and no picture is made and nothing is spent before your go.</p>
<span class="status">Checked by the Lead · your go on the plan and the cap</span>
<div class="facts"><span class="pill ok">${passed} of ${total} pass: 5 views × 3 phones × 2 text sizes</span>${known.length ? `<span class="pill warn">Known: ${known.map(([k]) => { const [v, W, pct] = k.split('-'); return `view ${v} on ${PH[W]} at ${pct}%`; }).join('; ')}, fixed in the room scene’s overlay rule</span>` : ''}<span class="pill ok">Nobody half visible</span><span class="pill ok">No head needs a sketch</span><span class="pill rec">Estimate: 12 pictures, at most 18 · cap $1.25</span></div>
</header>

<section class="live" aria-label="The five views with stand-ins">
<div class="controls">
  <div class="group"><span class="name" id="g-view">View</span>
    <div class="seg" data-set="view" role="group" aria-labelledby="g-view">${IDS.map((v, i) => `<button type="button" id="b-view-${v}" data-value="${v}" aria-pressed="${i === 0}">${v} · ${N(v)}’s</button>`).join('')}</div>
    <p class="hint">Each view is the room as that person sees it. That person is the camera and is not drawn.</p></div>
  <div class="group"><span class="name" id="g-phone">Phone</span>
    <div class="seg" data-set="phone" role="group" aria-labelledby="g-phone"><button type="button" id="b-phone-390" data-value="390" aria-pressed="true">390 × 844</button><button type="button" id="b-phone-430" data-value="430" aria-pressed="false">430 × 932</button><button type="button" id="b-phone-402" data-value="402" aria-pressed="false">402 × 742, in the app</button></div>
    <p class="hint">402 × 742 is your iPhone inside the Claude app: 402 wide, with about 742 px of height for the page.</p></div>
  <div class="group"><span class="name" id="g-pct">Text size</span>
    <div class="seg" data-set="pct" role="group" aria-labelledby="g-pct"><button type="button" id="b-pct-100" data-value="100" aria-pressed="true">100%</button><button type="button" id="b-pct-200" data-value="200" aria-pressed="false">200%</button></div></div>
  <label class="check"><input type="checkbox" id="squares"> Show the press areas</label>
  <div class="readout" id="readout" aria-live="polite"></div>
  <p class="hint">The stand-ins are the approved crew drawing in the pose the Board gives each person’s work, drawn flat and turned to the camera. The angle beside each name is the one the real picture shows that person at, and the head the crew has for it.</p>
</div>
<div class="phone-col"><div class="phone" id="phone"><img id="shot" src="shots/A-390-100.webp" width="390" height="844" alt=""></div></div>
</section>

<section id="recommend">
<h2>What I recommend</h2>
<div class="recs">
<div class="rec"><h3>Colours <span class="pill rec">Room A’s blue steel, as approved</span></h3>
<p>Room A’s colour family as you approved it in the room pilot on 8 November (design tokens 0.5.0, Room A), with the crew’s shared ink and paper. My recommendation: use it as it is.</p>
<div class="swatches">${Object.entries(TOK).map(([k, c]) => `<div class="sw"><i style="background:${c}"></i>${k} ${c}</div>`).join('')}</div></div>
<div class="rec"><h3>The round window <span class="pill rec">North wall, views B and D</span></h3>
<p>One round window, 1 m across, in the middle of the north wall, its centre 1.95 m up. Mira’s view (B) and Atlas’s view (D) show it whole, and nobody stands in front of it: the two people nearest it, Vega at the desk and Lyra at the hatch, are seated or crouched, below the glass. The other three views face away from it.</p>
<p>Its sky is the ship’s one voyage, on the same clock as every window. Room A’s window is the second along the ship, so it sees each passer 6 s after the Command Room’s window and 6 s before Room B’s. Its home world is Room A’s own, as the room’s window shows it in the game today: a cream world lit from the upper left, shaded with the comic’s dots on its far side, two ink bands drifting across it so it seems to turn. It sinks out of the glass and comes back as the voyage comes round every 4 minutes. Between, the same stars, dust and passers as every window.</p>
<p>The painting leaves the glass black, and code draws the sky in it, cut to the painted black by a mask, as in Room B. None of your reference pictures is used.</p></div>
<div class="rec"><h3>The ceiling <span class="pill rec">Solid</span></h3>
<div class="choice"><div class="pick"><b>Solid (recommended)</b>Room A’s sky comes only through its round window, in views B and D. The two rooms stay distinct, and there is less to paint and mask.</div><div><b>A skylight, as in Room B</b>Sky in all five views, but Room A would look like Room B, and every view gains an opening to paint and mask.</div></div></div>
<div class="rec"><h3>The stations and the capsule <span class="pill rec">Room A’s five kinds of work</span></h3>
<p>Room A’s work as the Board and ship life already have it: a PC workstation, the open deck, an electrical panel, crates and a floor hatch. Each person stands at a station on the wall by the place, and the centre stays open.</p>
<div class="scroll mid"><table><thead><tr><th>Place</th><th>Who</th><th>Work</th><th>What stands there</th><th>How each is placed</th></tr></thead><tbody>${stationRows}</tbody></table></div>
<p><b>The food capsule:</b> a wall unit on a bracket, ship life’s kind for Room A, on the east wall 1 m north of its middle, 1.0 to 1.55 m up. Views A and D show it whole, with nobody in front of it. In B, C and E it is out of the picture, and a visitor walks out by an edge and back, as in Room B. Of the seven free stretches of wall I tried, this is the only one that two views show whole with nobody in front.</p>
<p><b>Visits</b> (the Lead, 19 November): a visitor stands side-on to the wall, facing 15° east of north, with the unit at the right hand. In view A the visitor stands just south of the unit, ${(1.78 - REP.A.capsuleVisit.standAt[0]).toFixed(2)} m off its front; the camera sees the visitor at ${deg(REP.A.capsuleVisit.seenDeg)}, with the approved face, and the whole unit shows alongside. In every other view the visitor stands at its north end, ${(1.78 - REP.D.capsuleVisit.standAt[0]).toFixed(2)} m off its front: seen from behind in view D (${deg(REP.D.capsuleVisit.seenDeg)}), with the unit alongside, and wholly out of view E for the meal. The 1 m hatch’s raised lid keeps the way in to a strip of deck along the wall. The nearest anyone works to either standing place is ${Math.min(...IDS.map(v => REP[v].capsuleVisit.nearestPerson.m)).toFixed(2)} m.</p></div>
<div class="rec"><h3>Who stands where <span class="pill rec">Three in every view</span></h3>
<p>Room A’s cast in the room pilot: Vega, Mira, Echo, Atlas and Lyra. I tried all 120 ways of placing them and chose the one where every view shows its three whole with the least cheating, and where nobody is seen at an angle the crew has no head for.</p>
<div class="scroll mid"><table><thead><tr><th>View</th><th>Whose</th><th>In view (angle seen, head)</th><th>Out of view (chip)</th><th>Shows</th></tr></thead><tbody>${whoRows}</tbody></table></div></div>
</div>
</section>

<section id="does">
<h2>Who does what at each place</h2>
<p>From the place’s work, as ship life has it, never from a role. Every pose is new code for the Motion &amp; Cinematics builder.</p>
<div class="scroll mid"><table><thead><tr><th>Place</th><th>Work</th><th>Who</th><th>What each does, again and again</th></tr></thead><tbody>${doesRows}</tbody></table></div>
<p class="dim">Lyra’s crouch: the Board draws it side-on, 1.2 m across. At the edge of a 70° view that does not fit, so the stand-in is the crew’s compact sitting-on-the-deck pose. The new pose has to stay within about 0.75 m across in views A and B.</p>
</section>

<section id="heads">
<h2>Heads</h2>
<p>Only Juno, Atlas and Lyra have turned heads. Everyone else has the approved face and the back view. In this staging nobody needs a turned head at all: every face is seen at ${maxFace}° or less, and every back at ${minBack}° or more. Nobody is seen between 97° and 121°, which is the Lead’s 100 to 118° with 3° to spare. No new head angle is needed, and nothing needs a sketch.</p>
<p><b>Walks</b> (the Lead, 19 November): on the way to and from the capsule, someone without a turned head may be seen between 100° and 118° for a stretch. That person uses the back view there, as Vega does in Room B. You may still ask for turned heads.</p>
<div class="scroll mid"><table><thead><tr><th>Who</th><th>View</th><th>Seen at</th><th>Side</th><th>Head</th><th>Distance</th></tr></thead><tbody>${headRows}</tbody></table></div>
</section>

<section id="plan">
<h2>The room from above</h2>
<div class="plan">${planSvg}
<div class="key">
<p style="margin:0">A 4 m room, north up. The letters are the places of your file, with the edges of each one’s 90° view. Each person (a yellow dot, with a stroke for the way the person faces) stands at a station, up to 0.6 m in from the place, as in Room B. The short yellow lines are the slides in the views that show each person.</p>
<div><span style="background:var(--plan-window)"></span>The round window</div><div><span style="background:var(--plan-capsule)"></span>The food capsule</div><div><span style="background:var(--plan-furn)"></span>Stations: desk, cabinet, crates, toolbox</div><div><span style="background:var(--plan-dark)"></span>The open hatch and the monitors</div><div><span style="background:var(--plan-mark);height:3px"></span>The two light bars on the ceiling</div><div><span style="background:none;border:2.5px solid var(--plan-capsule);border-radius:50%;width:10px;height:10px"></span>Where a visitor stands at the capsule: south of the unit in view A, at its north end in the other views; dotted, the way in</div>
</div></div>
<h3>Every cheat, view by view</h3>
<p>The furniture is the same in every view. A cheat moves a person only, along that person’s own station, so the pose still meets it. Vega’s chair rolls along the desk with Vega and is drawn with the person, not the room. In view A, Lyra slides 0.2 m east along the hatch: a slide along the station, within the same ±0.2 m rule as every other cheat. It is set by hand because the placement search did not include your phone in the app (402 × 742); there it keeps Lyra whole and the press area clear of the Board chip at 100% text. At the station spot itself, Lyra’s feet would run 18 px below the picture on that phone.</p>
<div class="scroll mid"><table><thead><tr><th>View</th><th>The three in view</th></tr></thead><tbody>${cheatRows}</tbody></table></div>
</section>

<section id="carried">
<h2>Carried over from Room B, unchanged</h2>
<ul>
<li>The five places and views of your file (perimeter-five-v1). Each player sees three of the other four, and the fourth has a chip.</li>
<li>A 4 m room, the camera at eye height (1.6 m), 5° down. The rule stays 90°.</li>
<li>The PV6 look, the stronger shadows, the turned heads walking away, and the tags at the feet.</li>
<li>The furniture placed by code on the walls, and the room’s food capsule with its visits.</li>
<li>One clock for every sky.</li>
</ul>
<div class="note"><b>The camera, for the Lead.</b> The brief lists a 95° slice with the two far people 10% larger. That was the camera of sheet PV5. Room B’s PV6 pictures replaced it with straight lines, 70° across on the phone, and people cheated up to 0.6 m along their station to fit, with nobody enlarged. Room B’s five views use that camera, so this test uses it too.</div>
</section>

<section id="steps">
<h2>Steps, data and spend</h2>
<ol>
<li><b>Now:</b> this plan and the stand-in test. The Lead checks them at 390 × 844, 430 × 932 and 402 × 742, then sends them to you with the cap. The camera reports go to the Motion &amp; Cinematics builder, who lists every angle seen in the five views.</li>
<li><b>View A first, as the level check</b> (Vega’s view): its camera report, its sheet, then its pictures: the empty room, the furniture, the capsule. The Lead and you look at it before anything else is painted.</li>
<li><b>Views B to E:</b> the same method, two or three pictures each.</li>
<li><b>Each view’s data</b> for the Motion builder, below.</li>
<li><b>One page with all five views</b>, the people at their stations and the visits to the capsule (the Motion builder).</li>
</ol>
<h3>Each view’s data</h3>
<ul>
<li>As Room B’s: the plate (the empty room); the layers with <code>occlusion.json</code>; <code>scene.json</code>; the geometry; <code>guide-openings.json</code>; the window’s mask; the camera report.</li>
<li><b>New:</b> the four corners of every screen’s black face, with a mask of that black. In Room A that means Vega’s two monitors, in the views that see them (B, C and D).</li>
<li><b>New:</b> a line in <code>occlusion.json</code> wherever the room paints something on top of a piece, saying which piece it belongs to: the monitors on the desk, the small crate on the big one, the toolbox, the hatch’s lid.</li>
<li><b>For the people’s work</b> (the Motion builder’s list): the hatch’s near rim as its own layer or outline, so Lyra’s hands and wrench go into it, and its lid as its own piece; the point on Echo’s cabinet the wire comes from, with no loose wire painted there; the top crate’s top face, with no parcel painted on it (code lifts the parcel); where the keyboard is on Vega’s desk, with no chair painted (code draws the chair with Vega). The room scene already draws the two monitors’ screens, so for them the corners and the mask are all that is needed.</li>
<li><b>A visits sheet</b> for Room A, as Room B had: the visitor side-on, facing 15° east of north, the unit at the right hand; where the visitor stands, per view (just south of the unit in view A, at its north end in every other view); and the ways in, round the hatch and up the strip of deck along the east wall. The paths start from the Motion builder’s points: everyone but Lyra enters the strip from the south, Vega and Atlas going round the hatch’s south side and Mira passing west of Echo; Lyra goes round the hatch’s north side. Each camera report already gives the standing place for its view.</li>
<li><b>The lights:</b> each light bar’s share for each person, in every camera report: from the chest, 1.2 m up, each bar taken as 27 equal points 0.1 m apart, weighed by 1/d², in Room B’s frame. This is the Motion builder’s method, agreed with the Lead; our numbers match within 0.1°. The window gives no light, and the monitors’ glow is Vega’s own.</li>
</ul>
<h3>Pictures and spend</h3>
<div class="scroll mid"><table><thead><tr><th>View</th><th>Pictures</th><th>What they paint</th></tr></thead><tbody>
<tr><td class="n">A</td><td class="n">3</td><td>the empty room; the furniture; the capsule, which is in this view</td></tr>
<tr><td class="n">B</td><td class="n">2</td><td>the empty room; the furniture (the capsule is out of the picture)</td></tr>
<tr><td class="n">C</td><td class="n">2</td><td>the empty room; the furniture</td></tr>
<tr><td class="n">D</td><td class="n">3</td><td>the empty room; the furniture; the capsule</td></tr>
<tr><td class="n">E</td><td class="n">2</td><td>the empty room; the furniture</td></tr>
<tr><td>Planned</td><td class="n">12</td><td>about $0.74 at Room B’s average ($2.04 for 33 pictures, $0.062 a picture)</td></tr>
<tr><td>Reserve</td><td class="n">6</td><td>re-runs and fixes (Room B needed a fix step in view C)</td></tr>
<tr><td>At most</td><td class="n">18</td><td>about $1.11</td></tr></tbody></table></div>
<p><b>Proposed cap: $1.25.</b> That covers 20 pictures at Room B’s average. If a fix needs more, the work stops and asks first. It is fewer than Room B’s 33 because the look, the camera and the method are settled: Room B’s count includes its earlier rounds.</p>
</section>

<section id="open">
<h2>Open for you</h2>
<ul>
<li><b>The ceiling:</b> solid (my recommendation), or a skylight as in Room B.</li>
<li><b>The cap:</b> $1.25, for 12 planned pictures and up to 6 more.</li>
<li><b>The walks:</b> anyone seen between 100° and 118° on the way to the capsule uses the back view, as Vega does in Room B (my recommendation), or you ask for turned heads, which are new drawings.</li>
<li><b>Anything about the stations, the window or who stands where.</b> Each one can change before any picture is made.</li>
</ul>
</section>

<section id="checks">
<h2>Checks on this page</h2>
<p>Each view on each phone and text size: everyone in view whole on the screen; the person out of view wholly outside it, with a chip; every press area 44 px or more and clear of the room’s controls; every tag inside, apart from the others and off every face; no face behind furniture or another person; and the heads rule. The third phone is your iPhone in the Claude app, 402 × 742: the room has 551 px of height there, not 653 or 741.</p>
<div class="scroll mid"><table><thead><tr><th>Phone</th><th>Text</th><th>Result</th><th>Nearest edge</th><th>Tags at the feet</th></tr></thead><tbody>${checkRows}</tbody></table></div>
${known.length ? `<p><b>Known, fixed in the room scene’s overlay rule:</b> view A on the 402 × 742 phone at 200% text. There the “Other rooms on the Board” chip spans 340 of the 402 px and crosses Lyra’s press area; the face stays clear. It is not a staging problem: the room scene keeps the places you can tap clear of the app’s overlays, and that rule, in the room scene’s next version (0.6.0), takes this case, as it does Room B’s view E tag at 200%. Lyra stays at the hatch. On the same phone at 100% text, and in every other view at 200%, everything passes.</p>` : ''}
<p><b>The tightest margins</b>, to watch whenever anything changes: ${tightSide.name} in view ${tightSide.view}, ${sideOn('390')} px from the ${tightSide.L <= tightSide.R ? 'left' : 'right'} edge on 390 × 844, ${sideOn('402')} px on 402 × 742 and ${sideOn('430')} px on 430 × 932; and ${tightEnd.name} in view ${tightEnd.view} on ${PH[tightEnd.W]}, ${Math.min(tightEnd.T, tightEnd.F)} px from the ${tightEnd.F <= tightEnd.T ? 'bottom' : 'top'} of the picture. Both are inside the frame. A change that pushes either one past the edge fails the first check.</p>
<p class="dim">Tags go at the feet, with a nudge of at most 6 px where something is in the way. Where no nudge clears it, the tag keeps the accepted layout’s place, as on Room B’s page. At 100% text ${tagCount(100, 'the feet')} of 45 tags sit at the feet. At 200%, ${tagCount(200, 'the feet')} of 45 do, because the larger tags meet the room’s controls and each other.</p>
</section>

<footer class="foot">
<p>No picture on this page was made by the image tool. The room is a flat drawing in Room A’s colours, and the people are the approved crew drawing, drawn by code. The camera reports are published with this page, one per view: <code>camera-report-A.json</code> to <code>camera-report-E.json</code>. Each lists the three in view, with each one’s spot and cheat, facing, angle and head, depth, screen box on the three phones, and share of each light bar; then the person out of view, and where a visitor stands at the capsule in that view.</p>
<p>The places, views and who sees whom are your file’s, read unchanged (sha256 <code>${DESIGN_SHA.slice(0, 16)}…</code>).</p>
</footer>
</div>
<script>
(() => {
  const DATA = ${JSON.stringify(VIEWDATA)}, NAMES = ${JSON.stringify(Object.fromEntries(IDS.map(v => [v, N(v)])))};
  const st = { view: 'A', phone: '390', pct: '100', sq: false };
  const shot = document.getElementById('shot'), phone = document.getElementById('phone'), readout = document.getElementById('readout'), sq = document.getElementById('squares');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function render() {
    const key = st.view + '-' + st.phone + '-' + st.pct, d = DATA[key], W = +st.phone, H = { 390: 844, 430: 932, 402: 742 }[W];
    shot.src = 'shots/' + key + (st.sq ? '-sq' : '') + '.webp'; shot.width = W; shot.height = H;
    shot.alt = NAMES[st.view] + '’s view on the ' + W + ' × ' + H + ' phone at ' + st.pct + '% text: ' + d.seen.map(s => s[0]).join(', ') + ' in view; ' + d.out + ' out of view.';
    phone.classList.toggle('w430', W === 430); phone.classList.toggle('w402', W === 402);
    readout.innerHTML = '<span class="who">' + esc(NAMES[st.view]) + '’s view</span>'
      + '<ul>' + d.seen.map(s => '<li>' + esc(s[0]) + ': seen at ' + Math.abs(s[1]) + '°, ' + esc(s[2]) + ', ' + s[3] + ' m away; tag at ' + esc(s[4]) + '</li>').join('') + '</ul>'
      + '<span>' + esc(d.out) + ' is out of view and has a chip.</span>'
      + '<span class="dim">' + (d.window ? 'The round window is in the picture. ' : '') + (d.capsule ? 'The capsule is in the picture. ' : '') + (!d.window && !d.capsule ? 'Neither the window nor the capsule is in the picture. ' : '') + (d.issues.length ? 'Known: ' + esc(d.issues.join('; ')) + '. The room scene’s overlay rule fixes it.' : 'Every check passes.') + '</span>';
  }
  document.querySelectorAll('.seg[data-set]').forEach(seg => seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
    st[seg.dataset.set] = b.dataset.value; seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); render(); }));
  sq.addEventListener('change', () => { st.sq = sq.checked; render(); });
  render();
})();
</script>
`;
writeFileSync(DIR + 'pub/room-a-plan.html', html); console.log('room-a-plan.html', html.length, 'chars');
