// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
// Deterministic component/style adaptation. Never imports the prototype's art,
// fixtures, controller or Task simulator; only the three named pinned texts.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import postcss from 'postcss';

const root=fileURLToPath(new URL('../../../../',import.meta.url));
const manifest=JSON.parse(readFileSync(resolve(root,'docs/frontend/food-supply-art-adoption.json'),'utf8'));
const read=path=>{const bytes=readFileSync(resolve(root,path)),pin=manifest.sourcePins[path];
 if(!pin||createHash('sha256').update(bytes).digest('hex')!==pin.sha256||bytes.length!==pin.bytes)throw Error(`Pinned Food source differs: ${path}`);
 return bytes.toString();};
const ui=read('design/phone-ui/prototype/ui.mjs');
const body=ui.slice(ui.indexOf('/** Hyperscript:'),ui.indexOf('/** Device chrome')).replace(/^export /gm,'');
if(body.includes('mothership:dev-only')||/^import /m.test(body))throw Error('Prototype imports must not enter component output');
const names=['h','ic','button','iconButton','timer','topBar','tabs','sheet','row','list','groupLabel','groupNote','pill','toast','banner','caption'];
const component=`// Components adapted from #231's pinned ui.mjs. Scope and public-portrait\n// adapters belong to the host; there is no prototype navigation or fixture art.\nimport {iconSvg} from './food-icons.mjs';\n\nexport function createFoodUi(document,{portrait:providedPortrait=null}={}) {\nconst Node=document.defaultView.Node;\nconst portrait=(id,options)=>providedPortrait?.(id,options)??h('span.pt',{'aria-hidden':'true'});\n${body}\nreturn {${names.join(',')}};\n}\n`;
const scopeCss=(text,source)=>{
 const ast=postcss.parse(text),animationNames=new Map();
 ast.walkComments(c=>{if(c.text.includes('mothership:dev-only'))c.remove();});
 ast.walkAtRules('keyframes',rule=>{const name=rule.params,newName=`food-${name}`;animationNames.set(name,newName);rule.params=newName;});
 ast.walkRules(rule=>{
  if(rule.parent.type==='atrule'&&rule.parent.name.endsWith('keyframes'))return;
  const selectors=[];
  for(const original of rule.selectors){
   if(original==='#app'||original.includes('.ph-status')||original.includes('.ph-home')||original.includes('.fs-label-fixture'))continue;
   const s=[':root','html','body'].includes(original)?'.planet-food':original;
   selectors.push(`.planet-food:is(${s})`,`.planet-food :is(${s})`);
  }
  if(selectors.length)rule.selectors=selectors;else rule.remove();
 });
 ast.walkDecls(/^animation(?:-name)?$/,decl=>{for(const [from,to]of animationNames)decl.value=decl.value.replace(new RegExp(`\\b${from}\\b`,'g'),to);});
 return `/* Scoped native Food styles from ${source}; exact source pins in the adoption record. */\n${ast.toString()}\n`;
};
const outputs={
 'apps/game/hosted/planet/food-ui.mjs':component,
 'apps/game/hosted/planet/food-kit.css':scopeCss(read('design/phone-ui/prototype/kit.css'),'#231 phone kit'),
 'apps/game/hosted/planet/food.css':scopeCss(read('design/food-supply/phone.css'),'#231 Food phone'),
};
const check=process.argv.includes('--check');
if(process.argv.slice(2).some(a=>!['--check','--write'].includes(a)))throw Error('Use --check or --write');
for(const [path,text]of Object.entries(outputs)){
 if(check){if(readFileSync(resolve(root,path),'utf8')!==text)throw Error(`Food component/style copy differs: ${path}`);}
 else writeFileSync(resolve(root,path),text);
}
console.log(`Food component/style copies: ${Object.keys(outputs).length} ${check?'checked':'prepared'}; no production admission.`);
