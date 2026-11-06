import {readPlanetRequest} from '../planet/request.js';
import type {PlanetServiceRequest} from '../planet/request.js';
import {hostedFunctionsOrigin,readHostedConfiguration} from './hosted-config.js';
import type {HostedConfiguration} from './hosted-config.js';
import type {HostedRequestPorts} from './hosted-request.js';

/** The Integration-owned protocol-3 endpoint. Historical V1 operation allowlists are untouched. */
export async function postHostedPlanetRequest(config:HostedConfiguration,ports:HostedRequestPorts,request:PlanetServiceRequest):Promise<unknown>{
 const pinned=readHostedConfiguration(config),body=readPlanetRequest(request);
 const [idToken,appCheckToken]=await Promise.all([ports.getIdToken(),ports.getAppCheckToken()]);
 if(!idToken||!appCheckToken)throw new Error('Identity verification unavailable');
 const response=await ports.fetch(`${hostedFunctionsOrigin(pinned)}/planetApi`,{
  method:'POST',cache:'no-store',redirect:'error',credentials:'omit',
  headers:{'content-type':'application/json',authorization:`Bearer ${idToken}`,'X-Firebase-AppCheck':appCheckToken},body:JSON.stringify(body),
 });
 return JSON.parse(await response.text()) as unknown;
}
