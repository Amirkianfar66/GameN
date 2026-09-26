import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { addedSeedNodeIds, directShotPatches, directShotSeedNodeIds, finalPatches, finalSeedNodeIds, movementPatches, officerPatches, officerSeedNodeIds, physicalBoardSeedNodeIds, showdownPatches, showdownSeedNodeIds, seedBoard, legacySeedBoard } from "@/data/seed";
import { translateSavedBoard } from "@/data/english";
import type { Board } from "@/data/seed";

export const dynamic = "force-dynamic";
const id = "mothership-v2.1";
function db() {
 if (!env.DB) throw new Error("Board database unavailable");
 return env.DB;
}
export async function GET() {
 try {
  const row = await db().prepare("SELECT payload, revision, updated_at FROM boards WHERE id = ?").bind(id).first<{payload:string;revision:number;updated_at:string}>();
  if (!row) return NextResponse.json({board:seedBoard,revision:0,updatedAt:null});
  const saved=JSON.parse(row.payload) as Board;
  const oldVersion=saved.seedVersion??1;
  if(oldVersion>=9)return NextResponse.json({board:saved,revision:row.revision,updatedAt:row.updated_at});
  if(oldVersion===8)return NextResponse.json({board:translateSavedBoard(saved,legacySeedBoard,seedBoard),revision:row.revision,updatedAt:row.updated_at});
  const existing=new Set(saved.nodes.map(n=>n.id));
  const toAdd=new Set<string>([...physicalBoardSeedNodeIds,...(oldVersion<7?directShotSeedNodeIds:[]),...(oldVersion<6?officerSeedNodeIds:[]),...(oldVersion<5?finalSeedNodeIds:[]),...(oldVersion<4?showdownSeedNodeIds:[]),...(oldVersion<2?addedSeedNodeIds:[]),...(oldVersion<3?["movement_decision"]:[])]);
  const nodes=[...saved.nodes,...seedBoard.nodes.filter(n=>toAdd.has(n.id)&&!existing.has(n.id))];
  const ids=new Set(nodes.map(n=>n.id));
  const edgeIds=new Set(saved.edges.map(e=>e.id));
  const edges=[...saved.edges,...seedBoard.edges.filter(e=>(toAdd.has(e.source)||toAdd.has(e.target))&&!edgeIds.has(e.id)&&ids.has(e.source)&&ids.has(e.target))];
  for(const n of nodes){
   if(!existing.has(n.id))continue;
   const patches=[...(oldVersion<3?[movementPatches[n.id]]:[]),...(oldVersion<4?[showdownPatches[n.id]]:[]),...(oldVersion<5?[finalPatches[n.id]]:[]),...(oldVersion<6?[officerPatches[n.id]]:[]),...(oldVersion<7?[directShotPatches[n.id]]:[])];
   for(const patch of patches){
    if(patch&&n.data.summary===patch.before.summary&&n.data.details===patch.before.details&&n.data.status===patch.before.status){
     n.data={...n.data,...(n.data.title===patch.before.title?{title:patch.after.title}:{}),summary:patch.after.summary,details:patch.after.details,status:patch.after.status};
    }
   }
  }
  for(const e of edges){
   if(/^q(?:[1-9]|10)$/.test(e.source)&&e.label==="نیازمند تصمیم")e.label=e.source==="q9"?"کنار گذاشته‌شده":"پاسخ داده شد";
   if(e.source==="timing_open"&&e.target==="turn_sequence"&&e.label==="نیازمند تصمیم")e.label="تعیین شد";
  }
  return NextResponse.json({board:translateSavedBoard({seedVersion:8,nodes,edges},legacySeedBoard,seedBoard),revision:row.revision,updatedAt:row.updated_at});
 } catch (error) { console.error("Board load failed",error); return NextResponse.json({error:"The board cannot be loaded right now."},{status:503}); }
}
export async function PUT(request:Request) {
 try {
  const raw=await request.text();
  if(raw.length>800000) return NextResponse.json({error:"The board is too large."},{status:413});
  const {board,revision}=JSON.parse(raw) as {board:Board;revision:number};
  if(!Number.isInteger(revision)||revision<0||!board||!Array.isArray(board.nodes)||!Array.isArray(board.edges)||board.nodes.length>350||board.edges.length>900) return NextResponse.json({error:"Invalid board data."},{status:400});
  const ids=new Set<string>();
  for(const n of board.nodes){
   if(typeof n.id!=="string"||n.id.length>80||ids.has(n.id)||!Number.isFinite(n.position?.x)||!Number.isFinite(n.position?.y)||typeof n.data?.title!=="string"||n.data.title.length>120||typeof n.data?.summary!=="string"||n.data.summary.length>3000||typeof n.data?.details!=="string"||n.data.details.length>30000||!["system","role","question","custom"].includes(n.data.category)||!["confirmed","optional","open","draft"].includes(n.data.status)) return NextResponse.json({error:"Invalid node data."},{status:400});
   ids.add(n.id);
  }
  if(board.edges.some(e=>!ids.has(e.source)||!ids.has(e.target)||typeof e.id!=="string"||e.id.length>80)) return NextResponse.json({error:"Invalid connection data."},{status:400});
  const payload=JSON.stringify({seedVersion:9,nodes:board.nodes.map(n=>({id:n.id,type:"design",position:n.position,data:n.data})),edges:board.edges.map(e=>({id:e.id,source:e.source,target:e.target,label:e.label,type:"smoothstep"}))});
  const now=new Date().toISOString(); let next=revision+1;
  if(revision===0){
   const result=await db().prepare("INSERT OR IGNORE INTO boards (id,revision,payload,updated_at) VALUES (?,1,?,?)").bind(id,payload,now).run();
   if(!result.meta.changes) return NextResponse.json({error:"The board changed elsewhere. Reload the page."},{status:409});
  }else{
   const result=await db().prepare("UPDATE boards SET revision = revision + 1, payload = ?, updated_at = ? WHERE id = ? AND revision = ?").bind(payload,now,id,revision).run();
   if(!result.meta.changes) return NextResponse.json({error:"The board changed elsewhere. Reload the page."},{status:409});
  }
  return NextResponse.json({revision:next,updatedAt:now});
 }catch(error){console.error("Board save failed",error);return NextResponse.json({error:"Save failed. Your edits remain on this page."},{status:503});}
}
