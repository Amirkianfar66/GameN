// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchBrowser,connect,openPage} from '../../../../design/tools/lib/chrome.mjs';
const repository=resolve(fileURLToPath(new URL('../../../../',import.meta.url)));
const all=process.argv.includes('--all'),output=resolve(process.argv.find(a=>a.startsWith('--output='))?.slice(9)??'/private/tmp/gamen-pregame-comparisons');
await mkdir(output,{recursive:true});
const server=http.createServer(async(req,res)=>{
 try{
  const path=resolve(repository,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(repository+'/'))throw new Error();
  if(path.endsWith('/favicon.ico')){res.writeHead(204).end();return;}
  if(path.endsWith('/compare.html')){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#07090F"><div id="holder"></div></body></html>');return;}
  res.setHeader('Content-Type',extname(path)==='.mjs'?'text/javascript':'application/octet-stream');res.end(await readFile(path));
 }catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const roles=['doctor','insider','blue-disabler','red-disabler','supplier','engineer','undercover','hacker','alien'];
const sizes=[[320,568],[390,844],[430,932]],jobs=[];
const add=(kind,width,height,options,times)=>jobs.push({kind,width,height,options,times});
if(all){
 for(const role of roles)for(const [width,height]of sizes){
  for(const character of width===390?['c3','c8','c9']:['c8'])add('role',width,height,{role,character,seat:4,variant:'full'},[900,1400,2400,3500,5000,6500,7400,8500]);
  add('role',width,height,{role,character:'c8',seat:4,variant:'reduced'},[0,40,80,3000,3040,3080,7800,7840,7880,9900]);
 }
 for(const character of ['c1','c2','c4','c5','c6','c7'])add('role',390,844,{role:'doctor',character,seat:4,variant:'full'},[900,1400,2400,3500,5000,6500,7400,8500]);
 for(const [width,height]of [...sizes,[1280,720]])for(const count of [7,8,9]){
  const roster=Array.from({length:count},(_,i)=>({seat:i+1,character:['c8','c9','c1','c2','c3','c4','c5','c6','c7'][i]}));
  add('boarding',width,height,{roster,variant:'full'},[0,1400,2200,3300,4900,6150,6800,7000,8500,9400,9960]);
  add('boarding',width,height,{roster,variant:'reduced'},[0,80,160,2400,2480,2560,5200,5280,5360,6900,6980,7060,8900,8980,9060,9800,9960]);
 }
 for(const [width,height]of sizes)for(const variant of ['full','reduced'])add('brand',width,height,{variant},[0,120,470,1100,1700,1960,2000]);
}else{
 add('role',390,844,{role:'doctor',character:'c3',seat:4,variant:'full'},[0,500,920,1400,2400,3500,5000,6500,7400,8500]);
 add('role',390,844,{role:'engineer',character:'c8',seat:4,variant:'reduced'},[0,40,80,3000,3040,3080,7800,7840,7880,9900]);
 const roster=Array.from({length:9},(_,i)=>({seat:i+1,character:`c${i+1}`}));
 add('boarding',390,844,{roster,variant:'full'},[0,2200,3300,6150,6800,7000,8500,9400,9960]);
 add('boarding',390,844,{roster,variant:'reduced'},[0,80,160,2400,2480,2560,6900,6980,7060,8900,8980,9060,9800,9960]);
 add('brand',390,844,{variant:'reduced'},[0,120,470,1100,1700,1960,2000]);
}
let launched,browser;const records=[];
try{
 launched=await launchBrowser();browser=await connect(launched.endpoint);const page=await openPage(browser,{width:390,height:844,scale:1,mobile:true});
 await page.goto(`http://127.0.0.1:${server.address().port}/compare.html`);
 await page.evaluate(`(async()=>{window.comparison={scene:await import('/apps/game/hosted/planet/pregame-scene.mjs'),role:await import('/apps/game/hosted/pregame-films/roles/film.mjs'),brand:await import('/apps/game/hosted/pregame-films/brand/brand.mjs'),boarding:await import('/apps/game/hosted/pregame-films/boarding/boarding.mjs')}})()`);
 for(const [index,job]of jobs.entries()){
  await page.send('Emulation.setDeviceMetricsOverride',{width:job.width,height:job.height,deviceScaleFactor:1,mobile:true});
  const result=await page.evaluate(`(async()=>{
   const job=${JSON.stringify(job)},api=window.comparison,holder=document.querySelector('#holder');holder.style.width=job.width+'px';holder.style.height=job.height+'px';
   const scene=api.scene.createPregameScene(holder,{kind:job.kind,options:job.options}),records=[];
   const source=t=>job.kind==='role'?api.role.roleSvg(t,{...job.options,width:job.width,height:job.height}):job.kind==='boarding'?api.boarding.boardingSvg(t,{...job.options,width:job.width,height:job.height}):api.brand.brandSvg(t,{...job.options,width:job.width,height:job.height});
   const serialize=()=>{const serializer=new XMLSerializer();if(holder.firstElementChild?.localName==='svg')return serializer.serializeToString(holder.firstElementChild);return '<svg xmlns="http://www.w3.org/2000/svg" width="'+job.width+'" height="'+job.height+'"><rect width="100%" height="100%" fill="#07090F"/>'+[...holder.children].map(layer=>'<g opacity="'+layer.style.opacity+'">'+serializer.serializeToString(layer.querySelector('svg'))+'</g>').join('')+'</svg>';};
   const raster=async markup=>{const url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml'})),image=new Image();try{await new Promise((done,fail)=>{image.onload=done;image.onerror=()=>fail(new Error('SVG decode failed'));image.src=url});const canvas=document.createElement('canvas');canvas.width=job.width;canvas.height=job.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return {pixels:ctx.getImageData(0,0,job.width,job.height).data,canvas};}finally{URL.revokeObjectURL(url);}};
   let worst=null;
   for(const t of job.times){
    const before=performance.now();scene.paint(t,{width:job.width,height:job.height,variant:job.options.variant});const paintMs=performance.now()-before;
    const runtime=serialize(),a=await raster(runtime),b=await raster(source(t));let changed=0,sum=0,max=0;
    for(let i=0;i<a.pixels.length;i+=4){let differs=false;for(let c=0;c<3;c++){const delta=Math.abs(a.pixels[i+c]-b.pixels[i+c]);sum+=delta;max=Math.max(max,delta);if(delta>8)differs=true;}if(differs)changed++;}
    const ids=[...holder.querySelectorAll('[id]')].map(n=>n.id),defined=new Set(ids),references=[...runtime.matchAll(/(?:url\\(#|href="#)([^"')]+)/g)].map(m=>m[1]);
    const record={t,paintMs,changedFraction:changed/(job.width*job.height),meanAbsoluteError:sum/(job.width*job.height*3),max,repeatedIds:ids.length-defined.size,dangling:references.filter(id=>!defined.has(id)),stats:{...scene.stats}};records.push(record);
    if(!worst||record.changedFraction>worst.changedFraction)worst={t,changedFraction:record.changedFraction,runtime:a.canvas.toDataURL('image/png'),reference:b.canvas.toDataURL('image/png')};
   }
   scene.dispose();return {records,worst};
  })()`);
  const {worst,...rest}=result;records.push({...job,...rest});
  if(worst.changedFraction>.002){for(const type of ['runtime','reference'])await writeFile(resolve(output,`difference-${index}-${worst.t}-${type}.png`),Buffer.from(worst[type].split(',')[1],'base64'));}
  if(index%10===0)console.log(JSON.stringify({completed:index+1,jobs:jobs.length,maxChangedFraction:Math.max(...records.flatMap(r=>r.records.map(f=>f.changedFraction)))}));
 }
 const frames=records.flatMap(r=>r.records),times=frames.map(f=>f.paintMs).sort((a,b)=>a-b),report={browser:launched.version,all,jobs:records.length,samples:frames.length,maxChangedFraction:Math.max(...frames.map(f=>f.changedFraction)),maxMeanAbsoluteError:Math.max(...frames.map(f=>f.meanAbsoluteError)),paintP95Ms:times[Math.floor(times.length*.95)],paintMaxMs:times.at(-1),idFaults:frames.filter(f=>f.repeatedIds||f.dangling.length).length,problems:page.problems(),records};
 await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');const {records:details,...summary}=report;console.log(JSON.stringify(summary));
}finally{browser?.close();await launched?.close();await new Promise(done=>server.close(done));}
