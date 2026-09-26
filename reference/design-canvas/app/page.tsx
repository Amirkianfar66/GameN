"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, addEdge, useNodesState, useEdgesState, useReactFlow, ReactFlowProvider, type Node, type Edge, type Connection, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowDownToLine, CircleHelp, CirclePlus, Focus, Link2, Network, Save, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Board, DesignData, DesignNode, DesignEdge, Status, Section } from "@/data/seed";

const statusText:Record<Status,string>={confirmed:"Confirmed",optional:"Optional",open:"Open",draft:"Draft"};
const categoryText={system:"System",role:"Role",question:"Question",custom:"Custom"};
type FlowNode=Node<DesignData,"design">;
type View=Section|"all";
const views:[View,string][]=[
 ["core","Core System"],["roles","Roles"],["locations","Location Board"],
 ["powers","Original Powers"],["actions","Main Actions & Abilities"],
 ["rounds","Rounds & Timing"],["rules","Rules"],["questions","Open Questions"],["all","Overview"]
];
const coreIds=new Set(["vision","setup","player_modes","round","status","locations","captain","code","victory"]);
function inView(n:FlowNode,view:View){
 if(view==="all")return true;
 if(n.data.category==="custom")return (n.data.section??"core")===view;
 if(view==="core")return coreIds.has(n.id);
 if(view==="roles")return n.data.category==="role";
 if(view==="questions")return n.data.category==="question"&&(n.data.status==="open"||n.data.status==="draft");
 if(view==="rules")return n.data.category==="system"&&!n.data.section;
 return n.data.section===view;
}
const colors:Record<Status,string>={confirmed:"#66c7b8",optional:"#b8a0ef",open:"#edb96c",draft:"#8c99af"};

function DesignCard({data,selected}:NodeProps<FlowNode>){
 return <div className={`design-card ${selected?"selected":""} ${data.category}`} dir="ltr" style={{"--node-accent":colors[data.status]} as React.CSSProperties}>
  <Handle type="target" position={Position.Left} className="design-handle" />
  <div className="card-top"><span className="card-type">{categoryText[data.category]}</span><span className="card-status"><i />{statusText[data.status]}</span></div>
  <strong>{data.title}</strong><p>{data.summary}</p>
  <Handle type="source" position={Position.Right} className="design-handle" />
 </div>;
}
const nodeTypes={design:DesignCard};
const boardZones=[
 {id:"command_room",label:"Command Room",x:36.7,y:15.2,w:26.6,h:16.5},
 {id:"room_a",label:"Room A",x:4.3,y:38,w:31.4,h:32.3},
 {id:"room_b",label:"Room B",x:64.3,y:38,w:31.4,h:32.3},
 {id:"hospital",label:"Hospital",x:4.3,y:74.4,w:31.4,h:17.5},
 {id:"final_location",label:"Final Zone",x:36.7,y:74.4,w:26.6,h:17.5},
 {id:"jail_zone",label:"Jail",x:64.3,y:74.4,w:31.4,h:17.5}
];
function PhysicalBoard({onSelect}:{onSelect:(id:string)=>void}){
 return <div className="physical-preview" dir="ltr">
  <div className="physical-actions"><span>A3 landscape prototype</span><a href="/mothership-location-board-v1.svg" download="Mothership_Location_Board_v1.svg">Download vector board</a><a href="/mothership-location-board-v1.svg" target="_blank" rel="noopener noreferrer">Full view / print</a></div>
  <div className="board-viewport"><div className="board-image-wrap"><img src="/mothership-location-board-v1.svg" alt="Mothership board prototype with Room A, Room B, Command Room, Hospital, Jail, Final Zone and movement routes" draggable={false}/>
   {boardZones.map(z=><button key={z.id} type="button" className="board-hotspot" style={{left:`${z.x}%`,top:`${z.y}%`,width:`${z.w}%`,height:`${z.h}%`}} aria-label={`Details for ${z.label}`} title={`Details for ${z.label}`} onClick={()=>onSelect(z.id)}/>)}
  </div></div>
  <div className="physical-notes"><span>Select a location to see its rule.</span><span>The dotted Command routes are proposals; return after healing or release remains an open design question.</span></div>
 </div>
}

function Workspace(){
 const [nodes,setNodes,onNodesChange]=useNodesState<FlowNode>([]);
 const [edges,setEdges,onEdgesChange]=useEdgesState<Edge>([]);
 const [view,setView]=useState<View>("core");
 const [locationMode,setLocationMode]=useState<"board"|"nodes">("board");
 const [query,setQuery]=useState("");
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [selectedEdge,setSelectedEdge]=useState<string|null>(null);
 const [ready,setReady]=useState(false);
 const [notice,setNotice]=useState("Loading…");
 const [saveState,setSaveState]=useState<"saved"|"dirty"|"saving"|"error">("saved");
 const [revision,setRevision]=useState(0);
 const [showInspector,setShowInspector]=useState(false);
 const initialSignature=useRef("");
 const revisionRef=useRef(0);
 const savingRef=useRef(false);
 const pendingRef=useRef(false);
 const nodesRef=useRef(nodes),edgesRef=useRef(edges);
 nodesRef.current=nodes;edgesRef.current=edges;
 const flow=useReactFlow();
 const snapshot=useCallback((ns:FlowNode[],es:Edge[]):Board=>({
  seedVersion:9,
  nodes:ns.map(n=>({id:n.id,type:"design",position:n.position,data:n.data} as DesignNode)),
  edges:es.map(e=>({id:e.id,source:e.source,target:e.target,label:typeof e.label==="string"?e.label:undefined,type:"smoothstep"} as DesignEdge))
 }),[]);
 const signature=useCallback((ns:FlowNode[],es:Edge[])=>JSON.stringify(snapshot(ns,es)),[snapshot]);

 useEffect(()=>{let alive=true;fetch("/api/board",{cache:"no-store"}).then(async r=>{let v=await r.json() as {board:Board;revision:number;error?:string};if(!r.ok)throw new Error(v.error||"Loading failed");return v;}).then(v=>{
  if(!alive)return;
  const board=v.board as Board;setNodes(board.nodes as FlowNode[]);setEdges(board.edges as Edge[]);
  revisionRef.current=v.revision;setRevision(v.revision);initialSignature.current=JSON.stringify(board);setReady(true);setNotice("");
  requestAnimationFrame(()=>flow.setViewport({x:65,y:100,zoom:.78},{duration:350}));
 }).catch(e=>{if(alive)setNotice(e.message)});return()=>{alive=false};},[flow,setNodes,setEdges]);

 const doSave=useCallback(async()=>{
  if(!ready||savingRef.current){pendingRef.current=true;return;}
  const board=snapshot(nodesRef.current,edgesRef.current);const sig=JSON.stringify(board);
  if(sig===initialSignature.current){setSaveState("saved");return;}
  savingRef.current=true;setSaveState("saving");
  try{
   const r=await fetch("/api/board",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({board,revision:revisionRef.current})});
   const v=await r.json() as {revision:number;error?:string};if(!r.ok)throw new Error(v.error||"Save failed");
   revisionRef.current=v.revision;setRevision(v.revision);initialSignature.current=sig;
   setSaveState(signature(nodesRef.current,edgesRef.current)===sig?"saved":"dirty");setNotice("");
  }catch(e){setSaveState("error");setNotice(e instanceof Error?e.message:"Save failed");}
  finally{savingRef.current=false;if(pendingRef.current){pendingRef.current=false;if(signature(nodesRef.current,edgesRef.current)!==initialSignature.current)setTimeout(doSave,300)}}
 },[ready,snapshot,signature]);
 useEffect(()=>{if(!ready)return;let sig=signature(nodes,edges);if(sig===initialSignature.current)return;setSaveState("dirty");const t=setTimeout(doSave,1500);return()=>clearTimeout(t)},[nodes,edges,ready,signature,doSave]);

 const visibleNodes=useMemo(()=>nodes.filter(n=>{
  const q=query.trim().toLowerCase();return inView(n,view)&&(!q||`${n.data.title} ${n.data.summary} ${n.data.sourceKey||""}`.toLowerCase().includes(q));
 }),[nodes,view,query]);
 const visibleIds=useMemo(()=>new Set(visibleNodes.map(n=>n.id)),[visibleNodes]);
 const visibleEdges=useMemo(()=>edges.filter(e=>visibleIds.has(e.source)&&visibleIds.has(e.target)).map(e=>{
  const relevant=selectedId&&(e.source===selectedId||e.target===selectedId);
  return {...e,animated:!!relevant,style:{stroke:relevant?"#edb96c":"#7586a0",strokeWidth:relevant?2.6:1.6,opacity:selectedId&&!relevant?0.28:1}};
 }),[edges,visibleIds,selectedId]);
 const chosen=nodes.find(n=>n.id===selectedId);
 const chosenEdge=edges.find(e=>e.id===selectedEdge);
 const incoming=chosen?edges.filter(e=>e.target===chosen.id||e.source===chosen.id):[];
 const update=(changes:Partial<DesignData>)=>{if(!selectedId)return;setNodes(ns=>ns.map(n=>n.id===selectedId?{...n,data:{...n.data,...changes}}:n))};
 const changeView=(v:View)=>{setView(v);setSelectedId(null);setSelectedEdge(null);setShowInspector(false);if(v!=="locations"||locationMode==="nodes")setTimeout(()=>flow.fitView({padding:.17,duration:450}),80)};
 const chooseBoardZone=(id:string)=>{setSelectedId(id);setSelectedEdge(null);setShowInspector(true)};
 const chooseLocationMode=(mode:"board"|"nodes")=>{setLocationMode(mode);if(mode==="nodes")setTimeout(()=>flow.fitView({padding:.17,duration:450}),90)};
 const addNode=()=>{
  const id=`idea-${crypto.randomUUID().slice(0,8)}`;const point=flow.screenToFlowPosition({x:window.innerWidth/2,y:window.innerHeight/2});
  setNodes(ns=>[...ns,{id,type:"design",position:point,data:{title:"New idea",summary:"Describe this part of the game.",details:"",category:"custom",status:"draft",section:view==="all"?"core":view}}]);
  setSelectedId(id);setSelectedEdge(null);setShowInspector(true);
 };
 const onConnect=useCallback((c:Connection)=>{if(c.source===c.target)return;setEdges(es=>addEdge({...c,id:`link-${crypto.randomUUID().slice(0,8)}`,type:"smoothstep"},es))},[setEdges]);
 const deleteSelected=()=>{
  if(selectedEdge){setEdges(es=>es.filter(e=>e.id!==selectedEdge));setSelectedEdge(null);return;}
  if(selectedId){setNodes(ns=>ns.filter(n=>n.id!==selectedId));setEdges(es=>es.filter(e=>e.source!==selectedId&&e.target!==selectedId));setSelectedId(null);setShowInspector(false)}
 };
 const exportBoard=()=>{const blob=new Blob([JSON.stringify({project:"Mothership",baseVersion:"2.1",revision,exportedAt:new Date().toISOString(),...snapshot(nodes,edges)},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="Mothership_Design_Canvas.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
 const importBoard=async(file:File)=>{try{const raw=JSON.parse(await file.text());if(!Array.isArray(raw.nodes)||!Array.isArray(raw.edges))throw new Error("Invalid board file.");setNodes(raw.nodes);setEdges(raw.edges);setView("all");setSelectedId(null);setNotice("File imported; changes are being saved.")}catch(e){setNotice(e instanceof Error?e.message:"Could not read the file")}};
 const counts=Object.fromEntries(views.map(([v])=>[v,nodes.filter(n=>inView(n,v)).length])) as Record<View,number>;
 return <main className="app-shell" dir="ltr">
  <header className="topbar">
   <div className="brand"><div className="brand-mark"><Network size={20}/></div><div><h1>Mothership <span>/ Design Canvas</span></h1><p>Game design board · based on v2.1</p></div></div>
   <div className="top-actions"><span className={`save-indicator ${saveState}`}><i />{saveState==="saved"?"Saved":saveState==="saving"?"Saving":saveState==="dirty"?"Unsaved changes":"Save error"}</span>
    <a className="playtest-link" href="/playtest">Playtest Alpha</a>
    <Button variant="outline" className="quiet-button" onClick={exportBoard} disabled={!ready}><ArrowDownToLine size={16}/><span className="button-label">Export JSON</span></Button>
    <Button className="save-button" onClick={doSave} disabled={!ready||saveState==="saving"}><Save size={16}/><span className="button-label">Save</span></Button>
   </div>
  </header>
  <div className="body-grid">
   <aside className="left-rail"><div className="rail-intro"><span className="eyebrow">Game map</span><h2>Connect ideas and control design decisions.</h2></div>
    <nav aria-label="Board views" className="view-list">
     {views.map(([v,label])=><button key={v} className={`view-item ${view===v?"active":""}`} aria-current={view===v?"page":undefined} onClick={()=>changeView(v)}><span>{v==="questions"?<CircleHelp size={17}/>:<Network size={17}/>} {label}</span><b>{counts[v]}</b></button>)}
    </nav>
    <div className="rail-divider"/><div className="rail-section"><span className="eyebrow">Manage</span><Button variant="outline" className="rail-add" onClick={addNode} disabled={!ready}><CirclePlus size={17}/>Add node</Button><label className="import-button">Import JSON<input type="file" accept="application/json,.json" onChange={e=>{const f=e.target.files?.[0];if(f)importBoard(f);e.currentTarget.value=""}} /></label></div>
    <div className="rail-bottom"><p><span className="legend-dot confirmed"/>Confirmed <span className="legend-dot optional"/>Optional <span className="legend-dot open"/>Open</p><small>Drag from the right handle of one node to the left handle of another to connect them.</small></div>
   </aside>
   <section className={`canvas-area ${view==="locations"?"with-location-switch":""}`} aria-label="Interactive game design board">
    {view==="locations"&&<div className="location-mode-switch" role="group" aria-label="Location Board view"><button type="button" className={locationMode==="board"?"active":""} onClick={()=>chooseLocationMode("board")}>Physical layout</button><button type="button" className={locationMode==="nodes"?"active":""} onClick={()=>chooseLocationMode("nodes")}>Location nodes</button></div>}
    {view==="locations"&&locationMode==="board"?<PhysicalBoard onSelect={chooseBoardZone}/>:<>
     <div className="canvas-toolbar"><div className="search-box"><Search size={17}/><Input aria-label="Search nodes" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search decisions…"/></div><button className="fit-button" onClick={()=>flow.fitView({padding:.17,duration:450})} title="Fit all nodes"><Focus size={17}/>Fit view</button><span className="node-count">{visibleNodes.length} nodes · {visibleEdges.length} links</span></div>
     {!ready?<div className="loading-panel">{notice||"Preparing board…"}</div>:<ReactFlow nodes={visibleNodes} edges={visibleEdges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_,n)=>{setSelectedId(n.id);setSelectedEdge(null);setShowInspector(true)}} onEdgeClick={(_,e)=>{setSelectedEdge(e.id);setSelectedId(null);setShowInspector(true)}} onPaneClick={()=>{setSelectedId(null);setSelectedEdge(null);setShowInspector(false)}} defaultEdgeOptions={{type:"smoothstep",style:{stroke:"#667895",strokeWidth:1.6}}} connectionLineStyle={{stroke:"#edb96c",strokeWidth:2}} minZoom={.2} maxZoom={2} fitView proOptions={{hideAttribution:true}}>
       <Background color="#34445d" gap={24} size={1} /><Controls position="bottom-left" showInteractive={false}/><MiniMap position="bottom-right" pannable zoomable nodeColor={n=>colors[(n.data as DesignData).status]||"#8c99af"} maskColor="rgba(10,18,31,.68)"/>
      </ReactFlow>}
     <div className="canvas-hint">Drag nodes · Select to edit · Scroll to zoom</div>
    </>}
   </section>
   <aside className={`inspector ${showInspector?"mobile-open":""}`} aria-label="Selection details">
    <div className="inspector-head"><div><span className="eyebrow">Design control</span><h2>{chosen?"Node details":chosenEdge?"Connection":"Select a node"}</h2></div><button className="close-inspector" onClick={()=>setShowInspector(false)} aria-label="Close details"><X size={19}/></button></div>
    {chosen?<div className="inspector-scroll"><div className="inspector-meta"><span className={`pill ${chosen.data.status}`}>{statusText[chosen.data.status]}</span><span>{categoryText[chosen.data.category]}</span></div>
      <label className="field-label">Title<Input value={chosen.data.title} onChange={e=>update({title:e.target.value})} maxLength={120}/></label>
      <label className="field-label">Summary<Textarea value={chosen.data.summary} onChange={e=>update({summary:e.target.value})} rows={4}/></label>
      <div className="field-label">Status<Select value={chosen.data.status} onValueChange={v=>update({status:v as Status})}><SelectTrigger className="status-trigger"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(statusText).map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
      {chosen.data.category==="custom"&&<div className="field-label">Board section<Select value={chosen.data.section??"core"} onValueChange={v=>update({section:v as Section})}><SelectTrigger className="status-trigger"><SelectValue/></SelectTrigger><SelectContent>{views.filter(([v])=>v!=="all").map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>}
      <label className="field-label">Details & notes<Textarea className="detail-textarea" value={chosen.data.details} onChange={e=>update({details:e.target.value})} rows={9} dir="auto"/></label>
      {chosen.data.sourceKey&&<div className="source-note">Original decision source: <code dir="ltr">{chosen.data.sourceKey}</code></div>}
      <div className="related"><h3><Link2 size={16}/> Connections <span>{incoming.length}</span></h3>{incoming.length?incoming.map(e=>{const other=nodes.find(n=>n.id===(e.source===chosen.id?e.target:e.source));return <button key={e.id} onClick={()=>{if(other){setSelectedId(other.id);setView("all")}}}>{other?.data.title||"Deleted node"}<span>{e.source===chosen.id?"← Depends on":"Related →"}</span></button>}):<p>No connections yet.</p>}</div>
      <Button variant="destructive" className="delete-button" onClick={deleteSelected}><Trash2 size={16}/>Delete node</Button>
     </div>:chosenEdge?<div className="inspector-scroll edge-panel"><p>{nodes.find(n=>n.id===chosenEdge.source)?.data.title} <span>→</span> {nodes.find(n=>n.id===chosenEdge.target)?.data.title}</p><label className="field-label">Connection label<Input value={typeof chosenEdge.label==="string"?chosenEdge.label:""} onChange={e=>setEdges(es=>es.map(x=>x.id===chosenEdge.id?{...x,label:e.target.value}:x))} placeholder="e.g. affects this rule"/></label><Button variant="destructive" onClick={deleteSelected}><Trash2 size={16}/>Delete connection</Button></div>:<div className="empty-inspector"><div><Network size={28}/></div><p>Select a node or connection to inspect and edit its text, status and dependencies.</p><span>{counts.questions} open questions; resolved decisions remain in Overview.</span></div>}
    {notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss message"><X size={14}/></button></div>}
   </aside>
  </div>
 </main>;
}
export default function Home(){return <ReactFlowProvider><Workspace/></ReactFlowProvider>}
