// Every Food audience requests this same named set, including all out/alive
// drawings for all nine public characters. No request depends on a Task fact.
export const FOOD_ASSET_PATHS=Object.freeze(['supply-room.back.svg',
 ...Array.from({length:9},(_,i)=>`c${i+1}`).flatMap(id=>['panel','winch'].flatMap(station=>['alive','out'].map(state=>`operators/${id}-${station}-${state}.svg`)))]);

export function createFoodAssets(document,{base=new URL('/art/food-supply/',document.baseURI),fetch:fetchAsset=document.defaultView.fetch.bind(document.defaultView)}={}){
 const win=document.defaultView,urls=new Map(),listeners=new Set();let disposed=false,pending=null;
 const abort=new win.AbortController();
 const result={get back(){return urls.get('supply-room.back.svg')??null;},operator(station,character,out){
  if(!['panel','winch'].includes(station)||!/^c[1-9]$/.test(character??''))return null;
  return urls.get(`operators/${character}-${station}-${out?'out':'alive'}.svg`)??null;
 },subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
 load(){if(pending)return pending;if(disposed)return Promise.resolve();
  pending=Promise.allSettled(FOOD_ASSET_PATHS.map(async path=>{
   const response=await fetchAsset(new URL(path,base),{credentials:'same-origin',cache:'force-cache',signal:abort.signal});
   if(!response.ok)throw Error('Food drawing unavailable');
   const bytes=await response.arrayBuffer();if(disposed)return;
   const url=win.URL.createObjectURL(new win.Blob([bytes],{type:'image/svg+xml'}));urls.set(path,url);
  })).then(()=>{if(!disposed)for(const listener of listeners)listener();});return pending;
 },dispose(){if(disposed)return;disposed=true;abort.abort();for(const url of urls.values())win.URL.revokeObjectURL(url);urls.clear();listeners.clear();}};
 return result;
}
