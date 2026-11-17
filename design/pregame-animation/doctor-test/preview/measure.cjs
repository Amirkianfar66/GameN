const {chromium}=require('playwright');
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
const runs=[[390,844,2,1,true],[390,844,2,4,true],[430,932,2,1,true],[430,932,2,4,false],[390,844,3,1,false],[430,932,3,1,false]];
(async()=>{const out=[];const b=await chromium.launch();
for (const [W,H,dpr,rate,fps] of runs) {
  const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:dpr});const p=await ctx.newPage();
  p.on('pageerror',e=>console.log('err',e.message));
  const cdp=await ctx.newCDPSession(p);
  await p.goto('file://'+__dirname+'/doctor-film-test.html');
  await p.waitForFunction(()=>/Ready/.test(document.getElementById('status').textContent),null,{timeout:300000});
  if (W===430) { await p.click('[data-size="430x932"]'); await p.waitForFunction(()=>/Ready/.test(document.getElementById('status').textContent),null,{timeout:300000}); }
  // The measured build: under the throttle, from scratch.
  await cdp.send('Emulation.setCPUThrottlingRate',{rate});
  await p.evaluate(()=>{document.getElementById('status').textContent='';window.__doc.build();});
  await p.waitForFunction(()=>/Ready/.test(document.getElementById('status').textContent),null,{timeout:400000});
  const status=await p.textContent('#status'); const mb=await p.evaluate(()=>window.__doc.mine.bakery.bytes/1048576);
  const r={size:`${W}x${H}`,dpr,cpu:rate,status,mb:+mb.toFixed(1)};
  if (fps) {
    const run=async(show)=>{await p.evaluate(s=>{document.querySelector(`[data-show="${s}"]`).click();},show);
      return p.evaluate(()=>new Promise(done=>{const gaps=[];let last=null;const st=performance.now();window.__doc.play(0);const f=n=>{if(last!=null)gaps.push(n-last);last=n;if(n-st<4000)requestAnimationFrame(f);else done({gaps,paint:window.__doc.mine.stats.drawMs/window.__doc.mine.stats.frames})};requestAnimationFrame(f)}));};
    const g1=await run('mine'); const g2=await run('today');
    r.novel={fps:+(1000/med(g1.gaps)).toFixed(1),over34:g1.gaps.filter(x=>x>34).length,frames:g1.gaps.length,paintMs:+g1.paint.toFixed(2)};
    r.today={fps:+(1000/med(g2.gaps)).toFixed(1),over34:g2.gaps.filter(x=>x>34).length,frames:g2.gaps.length};
  }
  console.log(JSON.stringify(r));out.push(r);await ctx.close();}
require('fs').writeFileSync('measure.json',JSON.stringify(out,null,1));await b.close();})();
