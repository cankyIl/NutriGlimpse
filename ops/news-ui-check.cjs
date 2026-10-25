// Runs the real FoodNews component with native/storage/network boundaries replaced.
const fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript'),assert=require('node:assert/strict'),React=require('react');
const core=require('../packages/core/src/newsPersonalization.ts');
const selectionCore=require('../packages/core/src/newsSelection.ts');
const fixture=require('../packages/core/test/fixtures/news.ts');
let now=fixture.newsNow,profile={primary:'diabetes',conditions:['diabetes']},personalization,saveOk=true;
let slots=[],cursor=0,effects=[],listeners=[],intervals=[],calls=0,cache=null,network,pending,tree,links=[];
const realNow=Date.now;Date.now=()=>now;
const hooks={...React,
 useState(initial){const i=cursor++;if(!(i in slots))slots[i]={value:typeof initial==='function'?initial():initial};return[slots[i].value,v=>slots[i].value=typeof v==='function'?v(slots[i].value):v];},
 useRef(initial){const i=cursor++;return(slots[i]??={ref:{current:initial}}).ref;},
 useCallback(fn,deps){const i=cursor++,s=slots[i]??={};if(!s.deps||deps.some((v,i)=>v!==s.deps[i])){s.deps=deps;s.fn=fn;}return s.fn;},
 useEffect(fn,deps){const i=cursor++,s=slots[i]??={};if(!s.deps||deps.some((v,i)=>v!==s.deps[i])){s.deps=deps;effects.push(()=>{s.clean?.();s.clean=fn();});}},
};
const components={s:{},...Object.fromEntries(['Body','Button','Chip','Heading','Icon'].map(n=>[n,n]))};
const native={View:'View',Text:'Text',Pressable:'Pressable',StyleSheet:{create:x=>x},Linking:{openURL:async url=>{links.push(url);}},AppState:{currentState:'active',addEventListener:(name,fn)=>{listeners.push(fn);return{remove(){listeners=listeners.filter(x=>x!==fn);}};}}};
const timers={setTimeout:fn=>({fn}),clearTimeout(){},setInterval:fn=>{intervals.push(fn);return fn;},clearInterval:fn=>{intervals=intervals.filter(x=>x!==fn);}};
globalThis.__newsTestTimers=timers;
const filename=path.resolve('apps/mobile/src/ui/FoodNews.tsx'),mod=new Module(filename,module);
mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));
const original=mod.require.bind(mod);
mod.require=name=>{
 if(name==='react')return hooks;
 if(name==='react-native')return native;
 if(name==='expo-router')return{useFocusEffect:fn=>hooks.useEffect(fn,[fn])};
 if(name.endsWith('/newsCache'))return{newsCache:{get:async()=>cache,set:async value=>{cache=value;}}};
 if(name.endsWith('/state/AppState'))return{useAppState:()=>({profile,newsPersonalization:personalization,setNewsPersonalization:async value=>{if(saveOk)personalization=value;return saveOk;}})};
 if(name.endsWith('/newsPersonalization'))return core;
 if(name.endsWith('/newsSelection'))return{...selectionCore,fetchSelectedNews:async(input,signal)=>{calls++;const p=await network(signal,input);return selectionCore.buildNewsSelection(p,input,now);}};
 if(name==='./components')return components;
 if(name==='./theme')return{colors:{}};
 return original(name);
};
const js=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
mod._compile('const {setTimeout,clearTimeout,setInterval,clearInterval}=globalThis.__newsTestTimers;\n'+js,filename);
const FoodNews=mod.exports.FoodNews;
function nodes(t=tree){if(t==null||typeof t==='boolean')return[];if(Array.isArray(t))return t.flatMap(x=>nodes(x));if(typeof t!=='object')return[];return[t,...nodes(t.props?.children??null)];}
function text(t=tree){if(t==null||typeof t==='boolean')return'';if(Array.isArray(t))return t.map(text).join(' ');if(typeof t!=='object')return String(t);return text(t.props?.children??null);}
async function flush(){for(let i=0;i<5;i++){cursor=0;tree=FoodNews();const run=effects;effects=[];run.forEach(fn=>fn());await new Promise(resolve=>setImmediate(resolve));}}
function control(type,label){const found=nodes().find(n=>n.type===type&&n.props.label===label);assert.ok(found,'Missing '+type+' '+label);return found.props;}
function articles(){return nodes().filter(n=>n.type==='Pressable');}
function reset(){for(const s of slots)s?.clean?.();slots=[];effects=[];tree=null;listeners=[];intervals=[];pending=null;calls=0;links=[];now=fixture.newsNow;native.AppState.currentState='active';personalization=undefined;saveOk=true;profile={primary:'diabetes',conditions:['diabetes']};}
const pool=()=>fixture.pool([fixture.article(0,{tags:['diabetes']}),fixture.article(1,{tags:['hypertension']}),fixture.article(2),fixture.article(3),fixture.article(4)]);
(async()=>{
 network=async()=>pool();await flush();
 assert.equal(calls,1);assert.equal(articles().length,5);assert.ok(text().includes('Includes topics from My Needs'));
 assert.equal(articles()[0].props.accessibilityLabel.split('. ')[0],fixture.article(0).title);
 profile={primary:'hypertension',conditions:['hypertension']};await flush();assert.equal(calls,2);
 assert.equal(articles()[0].props.accessibilityLabel.split('. ')[0],fixture.article(1).title);
 control('Chip','General').onPress();await flush();assert.equal(personalization,false);assert.ok(!text().includes('Includes topics from My Needs'));assert.equal(calls,3);
 saveOk=false;control('Chip','For you').onPress();await flush();assert.equal(personalization,false);assert.ok(text().includes('Could not save'));
 articles()[0].props.onPress();await flush();assert.equal(links.length,1);

 reset();cache=JSON.stringify(pool());network=async()=>{throw Error('offline');};await flush();
 assert.equal(articles().length,5);assert.ok(text().includes('Saved edition'));assert.ok(text().includes('Could not refresh'));
 now+=8*86400000;intervals.forEach(fn=>fn());await flush();assert.equal(articles().length,0);assert.ok(text().includes('No stories from the last seven days'));

 reset();cache='{bad';network=async()=>{throw Error('offline');};await flush();assert.equal(articles().length,0);
 network=async()=>pool();control('Button','Refresh stories').onPress();await flush();assert.equal(articles().length,5);assert.equal(calls,2);

 reset();cache=null;network=async()=>pool();await flush();
 now+=86400000;native.AppState.currentState='background';intervals.forEach(fn=>fn());await flush();assert.equal(calls,1);
 native.AppState.currentState='active';listeners.forEach(fn=>fn('active'));await flush();assert.equal(calls,2,'new day refreshes on foreground');
 assert.ok(!cache.includes('preferences'));assert.ok(!cache.includes('personalized'));
 const saved=cache;reset();cache=saved;network=signal=>new Promise(resolve=>{pending={signal,resolve};});await flush();
 assert.equal(calls,1);assert.equal(articles().length,5);
 const late=pending;reset();assert.equal(late.signal.aborted,true);late.resolve(fixture.pool([]));await new Promise(resolve=>setImmediate(resolve));assert.equal(cache,saved,'late unmounted response cannot replace cache');
 console.log('FoodNews UI passed: live/cache, five rows, profile changes request a new backend selection, general toggle, failed-save recovery, links, offline expiry, corrupt cache/manual retry, next-day foreground refresh and unmount cancellation. Native boundaries mocked.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{reset();Date.now=realNow;delete globalThis.__newsTestTimers;});
