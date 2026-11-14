// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
const actions={key:{kind:'KEY',id:'food-control-key',capability:'canKey'},release:{kind:'PANEL_RELEASE',id:'food-panel-main',capability:'canPanelRelease'},lock:{kind:'PANEL_LOCK',id:'food-panel-main',capability:'canPanelLock'}};

/** Follow the native picture's guidance; capabilities still come from its controller. */
export function chooseRenderedPanelInput(model){
 if(!model?.visible||!model.fresh||!model.live||model.clock?.status!=='synced'||model.pendingCount>0||model.feedback==='unknown')return null;
 for(const action of ['key','release','lock']){const a=actions[action],n=model.controls?.find(n=>n.id===a.id&&n.action===action);
  if(model[a.capability]&&n?.visible&&!n.disabled&&!n.busy&&!n.sending&&!n.inert&&n.next&&!n.hazard)return {action,id:a.id,kind:a.kind};
 }
 return null;
}
export function renderedPanelTouchAllowed(model,expected,facts){
 const current=chooseRenderedPanelInput(model);
 return !!current&&current.id===expected.id&&current.action===expected.action&&current.kind===expected.kind
  &&facts.documentVisible===true&&facts.hitMatches===true&&facts.inViewport===true;
}

export async function touchRenderedPanel(page,expected,{appGlobal='planetEmulator'}={}){
 if(!['planetEmulator','foodAppHarness'].includes(appGlobal))throw TypeError('Unknown development surface');
 const observed=await page.evaluate(`(()=>{const h=${appGlobal},f=h.app.food?.getModel(),n=document.querySelector(${JSON.stringify('#'+expected.id)}),r=n?.getBoundingClientRect();
  const visible=!!n&&!!r&&r.width>0&&r.height>0&&(()=>{for(let p=n;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||['hidden','collapse'].includes(s.visibility)||Number(s.opacity)===0)return false;}return true;})();
  const point=r?{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),id:1}:null,hit=point?document.elementFromPoint(point.x,point.y):null;
  const control=n?{id:n.id,action:n.dataset.act,visible,disabled:n.disabled||n.getAttribute('aria-disabled')==='true',busy:n.getAttribute('aria-busy')==='true',sending:n.hasAttribute('data-sending'),inert:!!n.closest('[inert]'),next:n.hasAttribute('data-next'),hazard:n.hasAttribute('data-hazard')}:null;
  return {model:f?{visible:f.visible,fresh:f.fresh,live:h.app.session.getModel().connection==='live',clock:{status:f.clock.status},pendingCount:f.pendingCount,feedback:f.feedback?.status??null,canKey:f.canKey,canPanelRelease:f.canPanelRelease,canPanelLock:f.canPanelLock,controls:control?[control]:[]}:null,
   facts:{documentVisible:document.visibilityState==='visible',hitMatches:!!n&&(hit===n||n.contains(hit)),inViewport:!!point&&point.x>=0&&point.y>=0&&point.x<innerWidth&&point.y<innerHeight},point,
   observedServerNowMs:f?.clock.status==='synced'?f.clock.serverNowMs:null};})()`);
 if(!renderedPanelTouchAllowed(observed.model,expected,observed.facts))return {acted:false,observed};
 try{await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[observed.point]});}
 finally{await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 return {acted:true,observed};
}
