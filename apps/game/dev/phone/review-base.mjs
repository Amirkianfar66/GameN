// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {dirname,relative,resolve} from 'node:path';
import ts from 'typescript';

const ROOTS=['apps/game/hosted/comic-assets.mjs','apps/game/hosted/build/planet-library-art.mjs','scripts/crew-drawing-art.mjs','scripts/pregame-art-release.mjs'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function toolingPaths(root){
 const paths=new Set(),pending=[...ROOTS];
 while(pending.length){const path=pending.pop();if(paths.has(path))continue;paths.add(path);
  const source=ts.createSourceFile(path,readFileSync(resolve(root,path),'utf8'),ts.ScriptTarget.Latest,true);
  const add=value=>{if(!value.startsWith('.'))return;const target=relative(root,resolve(root,dirname(path),value));if(target.startsWith('../')||!/[.](?:mjs|js|cjs)$/.test(target))throw Error('Unsupported asset-tooling import: '+path+' → '+value);pending.push(target);};
  const visit=node=>{if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))add(node.moduleSpecifier.text);if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&ts.isStringLiteral(node.arguments[0]))add(node.arguments[0].text);ts.forEachChild(node,visit);};visit(source);
 }
 return [...paths].sort();
}

/** A clean approved-main snapshot supplies art; the candidate supplies native UI under review.
 * Production readers and asset plugins retain their full checks against that snapshot. */
export function phoneReviewBase(candidateDirectory,artDirectory){
 if(!artDirectory)throw Error('Set GAMEN_PHONE_ART_BASE to a separate clean worktree from fetched origin/main.');
 const candidateRoot=realpathSync(candidateDirectory),artRoot=realpathSync(artDirectory);
 if(realpathSync(git(artRoot,'rev-parse','--show-toplevel'))!==artRoot)throw Error('Phone artwork baseline must be a worktree root');
 if(git(artRoot,'status','--porcelain'))throw Error('Phone artwork baseline must be clean');
 const head=git(artRoot,'rev-parse','HEAD');let mainHead;
 try{mainHead=git(candidateRoot,'rev-parse','--verify','refs/remotes/origin/main^{commit}');git(candidateRoot,'merge-base','--is-ancestor',head,mainHead);}
 catch{throw Error('Phone artwork baseline must belong to fetched origin/main history; fetch main and create a clean worktree from it.');}
 const tooling=toolingPaths(candidateRoot).map(path=>{
  const bytes=readFileSync(resolve(candidateRoot,path)),baseline=readFileSync(resolve(artRoot,path));
  const committed=execFileSync('git',['-C',artRoot,'show',`${head}:${path}`],{stdio:['ignore','pipe','pipe']});
  if(sha(bytes)!==sha(baseline)||sha(baseline)!==sha(committed))throw Error('Asset review tooling differs from baseline: '+path+'. Use a clean worktree from current origin/main.');
  return {path,sha256:sha(bytes),bytes:bytes.length};
 });
 return {root:artRoot,head,mainHead,sourceTreeClean:true,tooling};
}
