// Test-only cleanup: retain the original abort identity when its reply is ambiguous.
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

/** At most three existing API calls (each has its client timeout), with waits bounded to 2s. */
export async function abortMatchForCleanup(api,request,{wait=pause}={}){
 const original=Object.freeze({...request});
 for(let attempt=0;attempt<3;attempt++){
  const result=await api.abortMatch(original);
  if(result.kind==='done'){assert.equal(result.result,true,'Cleanup requires a verified abort success');return result;}
  const transient=result.kind==='no-response'||result.kind==='api-failure'&&['UNAVAILABLE','RATE_LIMITED'].includes(result.code);
  assert.ok(transient,`Cleanup abort was refused: ${result.kind}${result.code?` ${result.code}`:''}`);
  assert.ok(attempt<2,'Cleanup abort remained unresolved after three identical attempts');
  const waitMs=Math.max(500*(attempt+1),result.retryAfterMs??0);
  assert.ok(waitMs<=2000,'Cleanup retry wait exceeds its bounded budget');
  await wait(waitMs);
 }
}
