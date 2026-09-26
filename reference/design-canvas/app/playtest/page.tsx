"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./playtest.css";

type Count = 7 | 8 | 9;
type Health = "Healthy" | "Injured" | "Eliminated";
type Zone = "Room A" | "Room B" | "Command Room" | "Hospital" | "Jail" | "Final Zone";
type Player = { number: number; health: Health; jailed: boolean; zone: Zone; captain: boolean; moved: boolean };
type Session = { count: Count; round: number; order: number[]; players: Player[]; phase: number; note: string };

const roles = [
  { name: "Insider", team: "Blue", modes: [7, 8, 9], rule: "At the start, learn the unordered set of player numbers for Undercover, Alien and Cracker. You do not know which number belongs to which role." },
  { name: "Cracker", team: "Blue", modes: [7, 8, 9], rule: "Two rescues per match. Target an Injured player in your location; they become Healthy at the end of the round. You can access Hospital and may rescue yourself while Injured. You cannot revive an Eliminated player." },
  { name: "Blue Disabler", team: "Blue", modes: [7, 8, 9], rule: "One hidden Main Action per match against a player in your location: make a Healthy target Injured, or eliminate an Injured target." },
  { name: "Supplier", team: "Blue", modes: [7, 8, 9], rule: "In Round 3, choose two distinct recipients in your location. Each receives one ordinary weapon usable from Round 4." },
  { name: "Officer", team: "Blue", modes: [9], rule: "Start with one shot. You may shoot a player in your location on your own turn from Round 1. You can fire only once in the match, even if you later receive another weapon." },
  { name: "Undercover", team: "Red", modes: [7, 8, 9], rule: "You may lie in Standard Hack and start with one ordinary weapon. Use your Main Action to grant Protection to yourself or another player in your location; it activates next round. Each player may receive Protection only once per match." },
  { name: "Hacker", team: "Red", modes: [7, 8, 9], rule: "You know Undercover's number. Once per round, Scan a target and guess their faction. A correct guess reveals only whether their number is in the Code. You get one Code submission attempt at any time in Round 5." },
  { name: "Red Disabler", team: "Red", modes: [8, 9], rule: "One hidden Main Action per match against a player in your location: make a Healthy target Injured, or eliminate an Injured target. You do not have an ordinary weapon." },
  { name: "Alien", team: "Independent", modes: [7, 8, 9], rule: "You know the complete four-number Code from the start and may lie in Hack. If Blue wins and you have not been Eliminated, you also win. If Blue and Red are eliminated together and you survive, you win alone." },
] as const;
const phases = ["Turns & movement", "Jail vote", "Actions & attacks", "Rescue", "Supplier weapons", "Elimination, reveal & victory"];
const zones: Zone[] = ["Room A", "Room B", "Command Room", "Hospital", "Jail", "Final Zone"];
const healths: Health[] = ["Healthy", "Injured", "Eliminated"];
const healthLabels: Record<Health, string> = { Healthy: "Healthy", Injured: "Injured", Eliminated: "Eliminated" };

function shuffled(count: number) {
  const a = Array.from({ length: count }, (_, i) => i + 1);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function createSession(count: Count): Session {
  return { count, round: 1, order: shuffled(count), phase: 0, note: "", players: Array.from({ length: count }, (_, i) => ({ number: i + 1, health: "Healthy", jailed: false, zone: i % 2 ? "Room B" : "Room A", captain: false, moved: false })) };
}

export default function PlaytestPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<"control" | "cards" | "rules">("control");
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const [timerKind, setTimerKind] = useState<"turn" | "hack">("turn");
  const [activeTurn, setActiveTurn] = useState(0);

  useEffect(() => {
    try { const raw = localStorage.getItem("mothership-playtest-v1"); if (raw) setSession(JSON.parse(raw) as Session); else setSession(createSession(8)); }
    catch { setSession(createSession(8)); }
  }, []);
  useEffect(() => { if (session) localStorage.setItem("mothership-playtest-v1", JSON.stringify(session)); }, [session]);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds(s => { if (s <= 1) { setRunning(false); return 0; } return s - 1; }), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  const chosenRoles = useMemo(() => roles.filter(r => session && (r.modes as readonly number[]).includes(session.count)), [session]);
  if (!session) return <main className="pt-shell" dir="ltr">Preparing game…</main>;
  const patch = (change: Partial<Session>) => setSession(s => s && ({ ...s, ...change }));
  const patchPlayer = (number: number, change: Partial<Player>) => setSession(s => s && ({ ...s, players: s.players.map(p => p.number === number ? { ...p, ...change } : p) }));
  const resetTimer = (kind: "turn" | "hack") => { setTimerKind(kind); setSeconds(60); setRunning(false); };
  const changeCount = (count: Count) => { if (window.confirm("A new setup will clear the current notes and player state on this device. Continue?")) { setSession(createSession(count)); setActiveTurn(0); resetTimer("turn"); } };
  const nextRound = () => { if (session.round >= 5) return; patch({ round: session.round + 1, phase: 0, order: shuffled(session.count), players: session.players.map(p => ({ ...p, moved: false })) }); setActiveTurn(0); resetTimer("turn"); };

  return <main className="pt-shell" dir="ltr">
    <header className="pt-head"><div><div className="pt-eyebrow">MOTHERSHIP / PLAYTEST ALPHA</div><h1>Game Table</h1><p>A facilitator runs secret actions and adjudicates the rules.</p></div><nav><Link href="/">Design Canvas</Link><a href="/mothership-location-board-v1.svg" target="_blank" rel="noreferrer">A3 Board ↗</a></nav></header>
    <div className="pt-controls"><div className="pt-count"><span>Players</span>{([7, 8, 9] as const).map(n => <button key={n} className={session.count === n ? "active" : ""} onClick={() => n !== session.count && changeCount(n)}>{n}</button>)}</div><div className="pt-tabs" role="tablist" aria-label="Game sections">{([ ["control", "Round Control"], ["cards", "Role Cards"], ["rules", "Quick Rules"] ] as const).map(([id, label]) => <button role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} key={id} onClick={() => setTab(id)}>{label}</button>)}</div></div>
    {tab === "control" && <div className="pt-layout">
      <section className="pt-panel pt-clock"><div className="pt-line"><div><small>Round {session.round} of 5</small><h2>{phases[session.phase]}</h2></div><button className="pt-outline" onClick={() => patch({ phase: (session.phase + 1) % phases.length })}>Next phase →</button></div><div className="pt-order"><small>Randomized turn order this round</small><div>{session.order.map((n, i) => <button key={n} className={i === activeTurn ? "current" : ""} onClick={() => { setActiveTurn(i); resetTimer("turn"); }}>{n}</button>)}</div></div><div className="pt-time"><div className="pt-timer-label">{timerKind === "turn" ? `Player ${session.order[activeTurn]}'s turn` : "Standard Hack conversation"}</div><strong aria-live="off">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</strong><div className="pt-actions"><button onClick={() => setRunning(!running)}>{running ? "Pause" : "Start"}</button><button onClick={() => resetTimer("turn")}>Turn · 1 min</button><button onClick={() => resetTimer("hack")}>Hack · 1 min</button></div><p>Request a Hack within the ordinary turn. Its private minute begins after that turn.</p></div><div className="pt-bottom"><button className="pt-outline" onClick={() => { patch({ order: shuffled(session.count) }); setActiveTurn(0); resetTimer("turn"); }}>Shuffle order</button><button className="pt-outline" disabled={session.round === 5} onClick={nextRound}>Next round →</button></div></section>
      <section className="pt-panel pt-roster"><div className="pt-line"><div><small>Public table information</small><h2>Players</h2></div><span className="pt-muted">Secret roles and factions stay off this screen</span></div><div className="pt-table-wrap"><table><thead><tr><th>Player</th><th>Health</th><th>Location</th><th>Jailed</th><th>Captain</th><th>Moved</th></tr></thead><tbody>{session.players.map(p => <tr key={p.number}><th>#{p.number}</th><td><select aria-label={`Health for player ${p.number}`} value={p.health} onChange={e => patchPlayer(p.number, { health: e.target.value as Health })}>{healths.map(h => <option key={h} value={h}>{healthLabels[h]}</option>)}</select></td><td><select aria-label={`Location for player ${p.number}`} value={p.zone} onChange={e => patchPlayer(p.number, { zone: e.target.value as Zone })}>{zones.map(z => <option key={z}>{z}</option>)}</select></td><td><input type="checkbox" aria-label={`Player ${p.number} is jailed`} checked={p.jailed} onChange={e => patchPlayer(p.number, { jailed: e.target.checked })}/></td><td><input type="checkbox" aria-label={`Player ${p.number} is Captain`} checked={p.captain} onChange={e => setSession(s => s && ({ ...s, players: s.players.map(x => ({ ...x, captain: x.number === p.number ? e.target.checked : false })) }))}/></td><td><input type="checkbox" aria-label={`Player ${p.number} has moved this round`} checked={p.moved} onChange={e => patchPlayer(p.number, { moved: e.target.checked })}/></td></tr>)}</tbody></table></div><label className="pt-note">Facilitator notes<textarea value={session.note} onChange={e => patch({ note: e.target.value })} placeholder="Record votes, spent resources, playtest questions and the outcome…"/></label></section>
    </div>}
    {tab === "cards" && <section className="pt-panel"><div className="pt-line"><div><small>{session.count}-player setup</small><h2>Role Cards</h2></div><button className="pt-outline" onClick={() => window.print()}>Print cards</button></div><p className="pt-help">Cut out, shuffle and deal the cards secretly. The facilitator gives the Code and the Insider/Hacker starting information privately. Original Powers are off in this base-game test.</p><div className="pt-cards">{chosenRoles.map(r => <article className="pt-card" data-team={r.team} key={r.name}><div className="pt-card-top"><span>MOTHERSHIP</span><span>{r.team}</span></div><h3>{r.name}</h3><p>{r.rule}</p><footer>Abilities still follow health, Jail, location and timing restrictions.</footer></article>)}</div></section>}
    {tab === "rules" && <section className="pt-panel pt-rules"><div className="pt-line"><div><small>First playtest reference</small><h2>Quick Rules</h2></div><button className="pt-outline" onClick={() => window.print()}>Print sheet</button></div>
      <div className="pt-rule-grid">
        <article><h3>Setup</h3><p>Prepare the role cards for {session.count} players, numbered tokens and neutral board pieces. Secret Code: an unordered set of four distinct player numbers. Alien is always in it; Undercover is always excluded. Pick the other three from the remaining players. Tell Alien the full Code, Hacker Undercover's number, and Insider the unordered numbers of Undercover, Alien and Cracker.</p></article>
        <article><h3>Turns & movement</h3><p>Randomize turn order each round. An ordinary turn lasts 60 seconds for public talk and eligible action or shot. Request Standard Hack during that minute; the private yes/no conversation then gets its own 60 seconds. Each player can initiate one Hack per match; at most two conversations take place per round. All but Alien and Undercover must answer truthfully. Hack content stays private until the next round, and Round 5 content until the game ends.</p><p>Each eligible player gets one voluntary move per round before voting, from Room A/B/Command. Hospital and Jail have no voluntary exit. Only Captain can enter Command and keeps the title after leaving.</p></article>
        <article><h3>Voting & end of round</h3><p>Elect the first Captain at the end of Round 1 by simple plurality; break ties with immediate runoff. Candidates must be Healthy and free. Captain loses the title on injury or jailing, with replacement elected at the start of the next round. Captain may request the match-wide release vote once, at the start of voting; hold that vote before the ordinary Jail vote. The unique top Jail vote target needs at least half of all eligible voters, not merely half of votes cast. A top tie jails nobody. Resolve Jail vote → registered actions/attacks and Protection → Rescue → Supplier weapons in Round 3 → elimination/faction reveal in the next public phase → victory → next-round Captain election flag. A validly registered action still resolves after its actor changes status.</p></article>
        <article><h3>Damage & shots</h3><p>One damage changes Healthy → Injured → Eliminated. Injured players move to Hospital at the end of the round. They may speak and vote, but cannot perform ordinary Main Actions or shoot. Jail is a separate status and also prevents actions and shots. Direct targets must share a location; Command protects its occupant from actions and shots while inside. Ordinary direct shots deal one damage and require no faction guess. They are available with a weapon in Rounds 4–5, except Officer's one starting shot from Round 1. Protection activates next round and blocks the first valid applicable attack.</p></article>
        <article><h3>Victory</h3><p>Blue wins when all Red are Eliminated and a Blue member is Healthy, or at the end of Round 5 when Hacker has not entered the correct Code, a Blue member is Healthy, and Blue Power exceeds Red Power. Red wins when all Blue are Eliminated and a Red member is Healthy, or when Hacker enters the correct Code in Round 5 and a Red member is Healthy. Blue Power = Healthy Blue players + 1 if Alien is Healthy; Red Power = Healthy Red players. Injured and Jailed contribute zero. Alien shares Blue victory if not Eliminated, or wins alone if both teams are eliminated simultaneously while Alien survives.</p></article>
        <article><h3>Final showdown</h3><p>If normal Round 5 resolution produces no winner, move every non-Eliminated player, including Injured and Jailed, to the Final Zone. Everyone secretly registers a target for one special one-damage shot. Resolve in Round 5 turn order. A validly registered shot still resolves if its shooter is eliminated earlier. Protection applies. Check victory again; if none applies, the match is a draw.</p></article>
      </div>
      <aside className="pt-provisional"><h3>Provisional defaults for this playtest</h3><p>Start players alternately in Room A and Room B. Captain may enter Command from either room. After healing in Hospital or release from Jail, choose Room A or Room B; this forced transfer does not use the voluntary move. If no eligible Captain candidate exists when an election is required, record the situation and let the facilitator decide before continuing.</p></aside>
    </section>}
    <footer className="pt-footer">Public status and notes are saved only on this device. Playtest 7, 8 and 9 players separately to assess balance.</footer>
  </main>;
}
