import {deleteApp,initializeApp} from 'firebase/app';
import {getToken,initializeAppCheck,ReCaptchaEnterpriseProvider} from 'firebase/app-check';
import {browserSessionPersistence,initializeAuth,signInAnonymously} from 'firebase/auth';
import {readHostedConfiguration} from './hosted-config.js';
import {postHostedPlanetFoodDelivery,postHostedPlanetRequest} from './planet-request.js';
import type {HostedRequestPorts} from './hosted-request.js';
import type {PlanetServiceConnection} from '../planet/session.js';
let instances=0;

/** Uses Integration's configured Firebase project and planetApi; never creates cloud resources. */
export function createHostedPlanetConnection(input:unknown):PlanetServiceConnection{
 const config=readHostedConfiguration(input);
 if(!globalThis.isSecureContext||globalThis.location?.origin!==config.pageOrigin)throw new TypeError('Planet must run at its configured HTTPS origin');
 if('FIREBASE_APPCHECK_DEBUG_TOKEN' in globalThis)throw new TypeError('Debug attestation is not a hosted configuration');
 const app=initializeApp({projectId:config.projectId,apiKey:config.apiKey,appId:config.appId,authDomain:config.authDomain,messagingSenderId:config.messagingSenderId},`mothership-planet-${++instances}`);
 const appCheck=initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider(config.recaptchaEnterpriseSiteKey),isTokenAutoRefreshEnabled:true});
 const auth=initializeAuth(app,{persistence:browserSessionPersistence});
 const ports:HostedRequestPorts={
  async getIdToken(){if(!auth.currentUser)throw new Error('Not signed in');return auth.currentUser.getIdToken();},
  getAppCheckToken:async()=>(await getToken(appCheck)).token,fetch:globalThis.fetch.bind(globalThis),
 };
 return {mode:'authenticated',currentUid:()=>auth.currentUser?.uid??null,
  async signIn(){await auth.authStateReady();await getToken(appCheck);return auth.currentUser?.uid??(await signInAnonymously(auth)).user.uid;},
  request:(request,signal)=>postHostedPlanetRequest(config,ports,request,undefined,signal),
  foodDelivery:{
   watch:(request,signal,receive)=>postHostedPlanetFoodDelivery(config,ports,request,signal,receive),
   clock:(request,signal)=>postHostedPlanetFoodDelivery(config,ports,request,signal),
  },
  dispose:()=>deleteApp(app),
 };
}
