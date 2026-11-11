import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {phoneReviewBase} from '../dev/phone/review-base.mjs';

const git=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function fixture(t){
 const directory=mkdtempSync(join(tmpdir(),'gamen-phone-review-base-')),candidate=join(directory,'candidate'),art=join(directory,'art');mkdirSync(candidate);
 t.after(()=>rmSync(directory,{recursive:true,force:true}));git(candidate,'init','-q','-b','main');git(candidate,'config','user.name','Review fixture');git(candidate,'config','user.email','review-fixture@example.invalid');
 for(const path of ['apps/game/hosted/comic-assets.mjs','apps/game/hosted/build/planet-library-art.mjs','scripts/crew-drawing-art.mjs','scripts/pregame-art-release.mjs','scripts/shared-verifier.mjs']){const file=join(candidate,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,path==='scripts/pregame-art-release.mjs'?"import './shared-verifier.mjs';\n":"export const reviewed = true;\n");}
 git(candidate,'add','.');git(candidate,'commit','-qm','Reviewed baseline');const head=git(candidate,'rev-parse','HEAD');git(candidate,'update-ref','refs/remotes/origin/main',head);git(candidate,'worktree','add','--detach',art,head);
 return{candidate,art,head};
}
test('phone review accepts a clean main snapshot while recording its exact transitive verifier inputs',t=>{
 const f=fixture(t);writeFileSync(join(f.candidate,'native-under-review.mjs'),'candidate UI change');const base=phoneReviewBase(f.candidate,f.art);
 assert.equal(base.head,f.head);assert.equal(base.mainHead,f.head);assert.equal(base.sourceTreeClean,true);assert.ok(base.tooling.some(x=>x.path==='scripts/shared-verifier.mjs'));assert.ok(base.tooling.every(x=>x.sha256.length===64&&x.bytes>0));
});
test('a dirty artwork snapshot cannot become review authority',t=>{
 const f=fixture(t);writeFileSync(join(f.art,'scripts/shared-verifier.mjs'),'uncommitted');assert.throws(()=>phoneReviewBase(f.candidate,f.art),/baseline must be clean/);
});
test('candidate verifier drift is rejected even when the old artwork baseline is on main',t=>{
 const f=fixture(t);writeFileSync(join(f.candidate,'scripts/shared-verifier.mjs'),'changed verifier');assert.throws(()=>phoneReviewBase(f.candidate,f.art),/tooling differs from baseline: scripts\/shared-verifier.mjs/);
});
test('a clean unmerged branch cannot supply the artwork baseline',t=>{
 const f=fixture(t);git(f.candidate,'switch','-qc','unreviewed');writeFileSync(join(f.candidate,'unreviewed-source.mjs'),'unreviewed');git(f.candidate,'add','.');git(f.candidate,'commit','-qm','Unmerged source');git(f.art,'checkout','--detach',git(f.candidate,'rev-parse','HEAD'));
 assert.throws(()=>phoneReviewBase(f.candidate,f.art),/must belong to fetched origin\/main history/);
});
test('hidden baseline verifier changes cannot pass a clean git status',t=>{
 const f=fixture(t),path='scripts/shared-verifier.mjs';git(f.art,'update-index','--assume-unchanged',path);writeFileSync(join(f.art,path),'hidden changed verifier');writeFileSync(join(f.candidate,path),readFileSync(join(f.art,path)));
 assert.equal(git(f.art,'status','--porcelain'),'');assert.throws(()=>phoneReviewBase(f.candidate,f.art),/tooling differs from baseline/);
});
