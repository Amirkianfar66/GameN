import {planetHasLibraryArt} from '@mothership/presentation';
import {PLANET_LIBRARY_GROUPS} from './library-assets.mjs';

/** Request one common catalogue for every role; activate it only for its verified match pins. */
export function createPlanetLibraryAssets(document){
 const win=document.defaultView,loaded=new Set(),links=[],timers=new Set(),tokens=new Set(PLANET_LIBRARY_GROUPS.map(g=>g.token));let enabled=false,disposed=false;
 const select=()=>{const current=new Set((document.documentElement.dataset.art??'').split(' ').filter(Boolean));for(const token of tokens)current.delete(token);if(enabled)for(const token of loaded)current.add(token);document.documentElement.dataset.art=[...current].join(' ');};
 const ready=Promise.all(PLANET_LIBRARY_GROUPS.map(group=>new Promise(done=>{
  const link=document.createElement('link');links.push(link);link.rel='stylesheet';link.href=group.url;
  const timer=win.setTimeout(()=>{timers.delete(timer);done();},8000);timers.add(timer);
  link.addEventListener('load',()=>{win.clearTimeout(timer);timers.delete(timer);if(!disposed){loaded.add(group.token);select();document.dispatchEvent(new win.Event('mothership:art-ready'));}done();},{once:true});
  link.addEventListener('error',()=>{win.clearTimeout(timer);timers.delete(timer);done();},{once:true});document.head.append(link);
 })));
 return {ready,setVersions(versions){enabled=planetHasLibraryArt(versions);select();},dispose(){disposed=true;enabled=false;select();for(const timer of timers)win.clearTimeout(timer);timers.clear();for(const link of links)link.remove();}};
}
