import { useRef, useState } from 'react';
type Point = [number, number];
type Drawing = { strokes: Point[][]; text: string; author: string; time: string };
const windows = [
  { id: 'ab', ends: ['Room A', 'Room B'], label: 'A ↔ B' },
  { id: 'ah', ends: ['Room A', 'Hospital'], label: 'A ↔ Hospital' },
  { id: 'bj', ends: ['Room B', 'Jail'], label: 'B ↔ Jail' },
];
function Sketch({ strokes, text }: Pick<Drawing, 'strokes' | 'text'>) {
  return <>{strokes.map((points, i) => <polyline key={i} points={points.map(p => p.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}<text x="12" y="155" fontSize="14" fill="currentColor">{text}</text></>;
}
export default function WindowStudy() {
  const [room, setRoom] = useState('Room A');
  const [selected, setSelected] = useState<string | null>(null);
  const [seat, setSeat] = useState(false);
  const [round, setRound] = useState(1);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [text, setText] = useState('');
  const [shown, setShown] = useState<Record<string, Drawing[]>>({});
  const active = useRef(false);
  const window = windows.find(w => w.id === selected && w.ends.includes(room));
  const canDraw = !!window && seat && ['Room A', 'Room B'].includes(room);
  const draftReset = () => { active.current = false; setStrokes([]); setText(''); setSeat(false); };
  const point = (e: React.PointerEvent<SVGSVGElement>): Point => { const box = e.currentTarget.getBoundingClientRect(); return [Math.max(0, Math.min(300, (e.clientX - box.left) * 300 / box.width)), Math.max(0, Math.min(170, (e.clientY - box.top) * 170 / box.height))]; };
  return <div className="di-window-study">
    <div className="di-demo-toolbar"><div><span className="di-kicker">INTERACTIVE DESIGN SKETCH · ROUND {round}</span><p>Fictional occupants and drawings. This is a design preview, separate from matches.</p></div><label>Preview location<select value={room} onChange={e => { setRoom(e.target.value); setSelected(null); draftReset(); }}>{['Room A', 'Room B', 'Hospital', 'Jail', 'Command'].map(r => <option key={r}>{r}</option>)}</select></label><button onClick={() => { setRound(r => r + 1); setShown({}); draftReset(); }}>End preview round</button></div>
    <div className="di-demo-grid"><div className="di-board-panel"><h3>Choose a window</h3><p>Viewing is free and unlimited while you are at either endpoint.</p><div className="window-choices">{windows.map(w => <button key={w.id} disabled={!w.ends.includes(room)} aria-pressed={selected === w.id} onClick={() => { setSelected(w.id); draftReset(); }}>▦ {w.label}</button>)}</div><p>Drawing positions: A by the door → B; B by the door → A; a separate A position → Hospital; a separate B position → Jail.</p></div>
      <div className="di-view-panel">{window ? <><div className="di-view-heading"><div><span className="di-kicker">2D WINDOW VIEW</span><h4>{room} → {window.ends.find(r => r !== room)}</h4></div><button onClick={() => { setSelected(null); draftReset(); }}>Close ×</button></div><div className="di-window-frame"><div className="di-far-label">{window.ends.find(r => r !== room)} · illustrative view</div><div className="di-far-people">{['P2', 'P4'].map(p => <div className="di-person" key={p}><span className="di-person-head" /><span className="di-person-body" /><b>{p}</b></div>)}</div><div className="di-window-sill" /></div>
        <label className="window-seat"><input type="checkbox" checked={seat} disabled={!['Room A', 'Room B'].includes(room)} onChange={e => setSeat(e.target.checked)} /> Occupy this window’s drawing position</label>
        {canDraw && <div className="window-draft"><svg aria-label="Draw your image" role="img" viewBox="0 0 300 170" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); active.current = true; const p = point(e); setStrokes(s => [...s, [p]]); }} onPointerMove={e => { if (active.current) { const p = point(e); setStrokes(s => [...s.slice(0, -1), [...s[s.length - 1], p]]); } }} onPointerUp={() => { active.current = false; }} onPointerCancel={() => { active.current = false; }}><Sketch strokes={strokes} text={text} /></svg><label>Text in your image<input maxLength={80} value={text} onChange={e => setText(e.target.value)} placeholder="A clue, a question or a bluff…" /></label><button className="primary" disabled={!strokes.length && !text.trim()} onClick={() => { setShown(s => ({ ...s, [window.id]: [...(s[window.id] || []), { strokes, text, author: room + ' drawing position', time: new Date().toLocaleTimeString() }] })); setStrokes([]); setText(''); }}>Show image</button></div>}
        <p className="di-demo-caption">Shown images stay until this round ends, even if the author leaves. No eraser or withdrawal. Hospital and Jail can view, but have no drawing position.</p>
        <div className="window-gallery">{(shown[window.id] || []).map((d, i) => <figure key={i}><svg role="img" aria-label={'Image by ' + d.author} viewBox="0 0 300 170"><Sketch {...d} /></svg><figcaption>{d.author} · {d.time}</figcaption></figure>)}</div>
      </> : <div className="di-view-empty"><h4>Look into the next room.</h4><p>Choose an available window to open its 2D view.</p><span className="di-free-badge">0 actions · free every round</span></div>}</div>
    </div>
  </div>;
}
