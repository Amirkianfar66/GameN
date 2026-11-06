import {createHostedPlanetConnection} from '../../dist/browser/planet-transport.js';
import {mountPlanetApp} from './app.mjs';
const root=document.getElementById('planet-root');
try{
 const response=await fetch('/preview-config.json',{cache:'no-store',redirect:'error',credentials:'omit'});
 if(!response.ok)throw new Error('configuration unavailable');
 const connection=createHostedPlanetConnection(await response.json());
 const app=await mountPlanetApp(root,{connection});
 addEventListener('pagehide',()=>app.dispose(),{once:true});
}catch{
 const message=document.createElement('p');message.textContent='Planet could not connect. Reload to reconnect this session.';
 const reload=document.createElement('button');reload.type='button';reload.textContent='Reload';reload.addEventListener('click',()=>location.reload());root.replaceChildren(message,reload);
}
