const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage();p.on('pageerror',e=>console.log('err',e.message));p.on('console',m=>{if(m.type()==='error')console.log('console',m.text())});
await p.goto('file://'+__dirname+'/story.html');const urls=await p.evaluate('window.__render()');
urls.forEach((u,i)=>fs.writeFileSync(`panel-${i+1}.jpg`,Buffer.from(u.split(',')[1],'base64')));await b.close();console.log('ok',urls.length)})();
