import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createFoodAssets,FOOD_ASSET_PATHS} from '../hosted/planet/food-assets.mjs';

test('all Food audiences use one root catalogue even on /planet/ with recovery query parameters',async()=>{
 const requests=[],document={baseURI:'https://game.example/planet/?match=original&recovery=secret#resume',defaultView:{URL,Blob,AbortController}};
 const assets=createFoodAssets(document,{fetch:async(url)=>{requests.push(String(url));return {ok:true,arrayBuffer:async()=>new TextEncoder().encode('<svg/>').buffer};}});
 await assets.load();assert.equal(requests.length,37);assert.equal(new Set(requests).size,37);
 assert.ok(requests.every(url=>url.startsWith('https://game.example/art/food-supply/')&&!url.includes('recovery')&&!url.includes('secret')));
 for(const path of FOOD_ASSET_PATHS)assert.ok(requests.includes('https://game.example/art/food-supply/'+path));
 assert.ok(assets.operator('winch','c9',true).startsWith('blob:'));assert.equal(assets.operator('winch','<bad>',false),null);assets.dispose();assert.equal(assets.back,null);
});
test('a stalled drawing does not block loading the other uniform assets or require an audience-specific retry',async()=>{
 const document={baseURI:'https://game.example/planet/?recover=1',defaultView:{URL,Blob,AbortController}},requests=[];
 const assets=createFoodAssets(document,{fetch:url=>{requests.push(String(url));return new Promise(()=>{});}});
 const ready=assets.load();assert.equal(requests.length,37);assert.equal(assets.load(),ready);assert.equal(assets.back,null);assets.dispose();
});
