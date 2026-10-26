let gridRequests=[];
// Component interaction harness with native/network boundaries replaced; production screen code is executed.
const fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript'),assert=require('node:assert/strict');
const root=process.cwd(),realReact=require('react'),core=require(path.join(root,'packages/core/src/index.ts'));
let current='',cursor=0,slots=new Map(),effects=[],routes=[],params={},networkCalls=0,background=[],photoConsent=true,nextToken=0;
const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
function slot(){const id=current+':'+cursor++;if(!slots.has(id))slots.set(id,{});return slots.get(id);}
const hooks={...realReact,
 useState(initial){const s=slot();if(!('value'in s))s.value=typeof initial==='function'?initial():initial;if(!s.setValue)s.setValue=v=>s.value=typeof v==='function'?v(s.value):v;return[s.value,s.setValue];},
 useMemo(fn,deps){const s=slot();if(!equal(s.deps,deps)){s.deps=deps;s.value=fn();}return s.value;},
 useRef(initial){const s=slot();return s.ref??(s.ref={current:initial});},
 useCallback(fn,deps){const s=slot();if(!equal(s.deps,deps)){s.deps=deps;s.fn=fn;}return s.fn;},
 useEffect(fn,deps){const s=slot();if(!equal(s.deps,deps)){s.deps=deps;effects.push(()=>{s.clean?.();s.clean=fn();});}},
};
const host=name=>props=>realReact.createElement(name,props,props.children);
const components={s:{},...Object.fromEntries(['Back','Body','Button','Card','Chip','Heading','Page','Status','Title','Icon','Row'].map(name=>[name,host(name)]))};
const profile={...core.sampleProfile,primary:'diabetes',conditions:['diabetes','hypertension','cardiovascular'],restrictions:[],pregnancy:'not-pregnant'};
const snapshot=JSON.parse(fs.readFileSync('apps/mobile/assets/catalog/public-foods.json','utf8'));
const seed=snapshot.foods.find(f=>f.provider==='usda'&&f.id==='2723877');assert.ok(seed);
const food={...seed,id:'999999999',comparisonGroup:'plain-oats',categoryEvidence:'category-rules-v4',sourceUrl:'https://fdc.nal.usda.gov/food-details/999999999/nutrients'};assert.ok(!snapshot.foods.some(f=>f.id===food.id),'Fixture must exercise facts absent from the bundled catalog');
const ratingCore=require(path.join(root,'packages/core/src/photoAssessment.ts'));
Object.assign(food,{sourceDate:new Date().toISOString().slice(0,10),retrievedAt:new Date().toISOString(),servingGrams:40,nutrients:{caloriesKcal:350,saturatedFatG:1,sodiumMg:100,sugarsG:5,fiberG:2},additionalNutrients:{transFatG:0,potassiumMg:null,magnesiumMg:null,calciumMg:null},nutritionExtras:{proteinG:12,carbohydrateG:70,addedSugarsG:0,ironMg:null,vitaminCMg:null,vitaminDMcg:null}});
const alternative={...food,id:'999999998',barcode:'00012345678912',name:'Fictional higher fiber oats',nutrients:{...food.nutrients,fiberG:15}};
const outcome={schemaVersion:2,model:'gpt-6-luna',identity:{status:'identified',brand:'Quaker',name:'Old Fashioned Oats',variant:null,size:'42 oz',visibleText:[]},foods:[food],assessment:ratingCore.labelRating(food),alternatives:[{food:alternative,assessment:ratingCore.labelRating(alternative),benefits:['fiberG']}],checkedAt:new Date().toISOString(),candidatesChecked:1};
const aiCore=require(path.join(root,'packages/core/src/aiFoodReview.ts'));
const estimatedOriginal={identity:{status:'identified',brand:'Fixture',name:'Honey Oat Cereal',variant:null,size:'12 oz',visibleText:[]},category:'breakfast-cereal',servingText:'1 cup (40 g)',servingGrams:40,ingredients:'Estimated whole grain oats',rating:'not_healthy',nutrition:{caloriesKcal:150,saturatedFatG:0.5,transFatG:0,sugarsG:12,addedSugarsG:12,carbohydrateG:32,sodiumMg:180,fiberG:3,proteinG:3,potassiumMg:null,calciumMg:null,ironMg:null,magnesiumMg:null}};
const estimatedAlternative=name=>({...estimatedOriginal,identity:{...estimatedOriginal.identity,name,size:null},rating:'healthy',ingredients:'Estimated oats only',nutrition:{...estimatedOriginal.nutrition,sugarsG:1,addedSugarsG:1,fiberG:5}});
const aiOutcome={schemaVersion:3,model:'gpt-6-luna',status:'identified',original:estimatedOriginal,alternatives:['Plain A','Plain B','Plain C'].map(estimatedAlternative),checkedAt:new Date().toISOString(),basis:'ai-estimate'};
let recognition=async()=>aiOutcome,sourceCalls=[];
let shopping={selected:null,origin:null},availabilityCalls=[],availabilityResponder=async()=>({schemaVersion:2,status:'no-matches',listings:[],checkedAt:new Date().toISOString(),source:'Google via SerpApi',cached:false});
const timingMode=process.env.EXPO_PUBLIC_BUILD_STAGE==='beta0',timingReports=[],savedFetch=global.fetch;
global.fetch=async(url,init)=>{assert.ok(String(url).endsWith('/v3/photos/timing'),'Unexpected test network request');timingReports.push(JSON.parse(init.body));return new Response(null,{status:204});};
const router={replace:v=>routes.push(v),push:v=>routes.push(v)};
const modules=new Map();
function load(filename){
 filename=path.resolve(filename);if(modules.has(filename))return modules.get(filename).exports;
 const mod=new Module(filename,module);modules.set(filename,mod);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));
 const original=mod.require.bind(mod);
 mod.require=name=>{
  if(name==='react')return hooks;
  if(name.endsWith('/AiProductCard'))return {AiProductCard:host('FoodCard')};
  if(name.endsWith('/SearchAttribution'))return {SearchAttribution:host('SearchAttribution')};
  if(name.endsWith('/shelfNineClient'))return {reviewShelfNine:async(input,signal,fetcher,progress)=>{gridRequests.push(input);return shelfResponse(input,signal,progress);}};
  if(name.endsWith('/modules/shelf-benchmark'))return {getShelfBenchmarkAvailabilityAsync:async()=>({available:true,modelId:'shelfset',reason:'ready'}),ShelfBenchmarkView:host('NativeShelf')};
  if(name.endsWith('/storage/shelfGridConsent'))return {readShelfConsent:async()=>photoConsent,saveShelfConsent:async()=>{photoConsent=true;}};
  if(name.endsWith('/shelfGridClient'))return {reviewShelfGrid:async(input,signal)=>{gridRequests.push(input);return shelfResponse(input);}};

  if(name==='expo/fetch')return {fetch:global.fetch};
  if(name==='react-native')return{Pressable:'Pressable',Image:'Image',View:'View',Text:'Text',TextInput:'TextInput',ScrollView:'ScrollView',StyleSheet:{create:x=>x,absoluteFill:{}},Linking:{openSettings:async()=>{},openURL:async()=>{}},AppState:{currentState:'active',addEventListener:(name,fn)=>{background.push(fn);return{remove(){}};}}};
  if(name==='expo-router')return{router,useLocalSearchParams:()=>params,useFocusEffect:fn=>hooks.useEffect(fn,[fn])};
  if(name==='@grocery/core')return core;
  if(/\/ui\/components$|^\.\/components$/.test(name))return components;
  if(name.endsWith('/state/AppState'))return{useAppState:()=>({profile}),recordId:()=> '11111111-1111-4111-8111-'+String(++nextToken).padStart(12,'0')};
  if(name.endsWith('/state/StoreContext'))return{useShoppingStore:()=>shopping};
  if(name.endsWith('/nearbyAvailability'))return {...require(path.join(root,'packages/core/src/nearbyAvailability.ts')),findNearbyAvailability:async(input,signal)=>{availabilityCalls.push({input,signal});return availabilityResponder(input,signal);}};
  if(name.endsWith('/storage/photoConsent'))return{readPhotoConsent:async()=>photoConsent,savePhotoConsent:async()=>{photoConsent=true;}};
  if(name.endsWith('/storage/testerKey'))throw Error('Screens must never read tester credentials');
  if(name.endsWith('/storage/repository'))return{openRepository:async()=>({})};
  if(name.endsWith('/ui/PhotoCaptureView'))return{photoCameraAvailable:true,PhotoCaptureView:host('NativePhoto')};
  if(name.endsWith('/dualAiFoodClient'))return {reviewDualProductPhoto:async(...args)=>{networkCalls++;args[4]?.({stage:'uploadStartMs'});args[4]?.({stage:'responseHeadersMs',traceId:'12345678-1234-4234-8234-123456789012'});return recognition(...args);}};
  if(name.endsWith('/aiFoodClient'))return {reviewProductPhoto:async(...args)=>{networkCalls++;args[4]?.({stage:'uploadStartMs'});args[4]?.({stage:'responseHeadersMs',traceId:'12345678-1234-4234-8234-123456789012'});return recognition(...args);},checkProductSources:async(identity)=>{sourceCalls.push(identity);return {foods:[food],match:'possible',checkedAt:new Date().toISOString()};},findProductMedia:async()=>({image:null,reference:true})};
  if(name.endsWith('/ui/FoodNews'))return {FoodNews:host('FoodNews')};
  if(name.endsWith('/photoAssessmentClient'))return{assessProductPhoto:async(...args)=>{networkCalls++;return recognition(...args);}};
  if(name.endsWith('/RetailerCheck'))return{RetailerCheck:host('RetailerCheck')};
  if(name.endsWith('/CatalogCredits'))return{CatalogCredits:host('CatalogCredits')};
  if(name.endsWith('/LabelChecks'))return{LabelChecks:host('LabelChecks')};
  if(name.endsWith('/NutritionEducation'))return{ComparisonEducation:()=>realReact.createElement('Body',{},'According to Mayo Clinic and ADA')};
  if(name.endsWith('/PlanReference'))return{PlanReference:host('PlanReference')};
  if(name.startsWith('.')){
   const full=path.resolve(path.dirname(filename),name);
   for(const suffix of ['', '.tsx','.ts','.json'])if(fs.existsSync(full+suffix)&&fs.statSync(full+suffix).isFile()){
    if((full+suffix).endsWith('.png')){const bytes=fs.readFileSync(full+suffix);return {uri:full+suffix,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};}
    if((full+suffix).endsWith('.json'))return JSON.parse(fs.readFileSync(full+suffix,'utf8'));
    if((full+suffix).includes('/packages/core/'))return require(full+suffix);
    return load(full+suffix);
   }
  }
  return original(name);
 };
 mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);return mod.exports;
}
let shelfResponse=input=>require(path.join(root,'packages/core/test/shelfGridFixtures.ts')).result(input);
let tree;
function render(element,key='root'){
 if(element===null||element===undefined||typeof element==='boolean')return null;
 if(Array.isArray(element))return element.map((v,i)=>render(v,key+'.'+i));
 if(typeof element!=='object')return element;
 if(typeof element.type==='function'){const before=current,beforeCursor=cursor;current=key+':'+(element.type.name||'component');cursor=0;const child=element.type(element.props);current=before;cursor=beforeCursor;return render(child,key+'.child');}
 return{type:element.type,props:element.props,children:render(element.props.children,key+'.children')};
}
function nodes(t=tree){return t==null?[]:Array.isArray(t)?t.flatMap(x=>nodes(x)):typeof t==='object'?[t,...nodes(t.children)]:[];}
function text(t=tree){return t==null?'':Array.isArray(t)?t.map(text).join(' '):typeof t==='object'?text(t.children):String(t);}
function button(label){const found=nodes().find(n=>n.type==='Button'&&n.props.label===label);assert.ok(found,'Missing button '+label);return found.props;}
function shutter(){const found=nodes().find(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Take photo');assert.ok(found,'Missing camera shutter');assert.equal(found.props.accessibilityRole,'button');assert.ok(nodes(found).some(n=>n.type==='Icon'&&n.props.name==='camera'));return found.props;}
async function flush(Component,props={}){for(let i=0;i<4;i++){tree=render(realReact.createElement(Component,props));const pending=effects;effects=[];pending.forEach(fn=>fn());await new Promise(resolve=>setImmediate(resolve));}return tree;}
async function ready(Component){await flush(Component);const camera=nodes().find(n=>n.type==='NativePhoto');assert.ok(camera,'Camera should open after photo consent without credentials');camera.props.onStatus({nativeEvent:{state:'ready',message:''}});await flush(Component);}
function reset(){for(const s of slots.values())s.clean?.();slots=new Map();effects=[];background=[];routes=[];params={};}


(async()=>{
 const Screen=load('apps/mobile/src/ui/ShelfNineScreen.tsx').default;
 const nine=require(path.join(root,'packages/core/src/shelfNine.ts'));
 const fixtures=require(path.join(root,'packages/core/test/shelfGridFixtures.ts'));
 const result=input=>({schemaVersion:2,sessionId:input.sessionId,batchId:input.batchId,batchIndex:input.batchIndex,model:nine.shelfNineModel(input.batchIndex),complete:true,
  products:input.cells.map(c=>({cellNumbers:[c.cell],food:fixtures.food(c.packageId),reasons:['More fiber'],sourceUrls:[],nutritionStatus:'estimated'})),alternatives:[],unresolvedCells:[],duplicatesRemoved:0,searchSuggestionsHtml:null});
 let finishResponse;
 shelfResponse=async(input,signal,progress)=>{const r=result(input);progress({...r,complete:false});return new Promise(resolve=>{finishResponse=()=>resolve(r);});};
 params={auto:'1'};await flush(Screen);
 assert.equal(nodes().some(n=>n.type==='NativeShelf'),false);
 button('Continue without health details').onPress();await flush(Screen);
 let camera=nodes().find(n=>n.type==='NativeShelf');assert.ok(camera);assert.equal(camera.props.gridCapacity,9);
 const make=(count,batch,offset=0)=>{const g=fixtures.grid(count,batch);return {...g,runId:camera.props.runId,capacity:9,cells:g.cells.map((c,i)=>({...c,packageId:'package-'+(offset+i),photo:'AAAA'}))};};
 camera.props.onGrid({nativeEvent:{...make(9,'b0'),target:1}});await flush(Screen);
 assert.equal(gridRequests.length,1);assert.equal(gridRequests[0].batchIndex,0);assert.equal(gridRequests[0].shareHealth,false);
 assert.deepEqual(gridRequests[0].context.healthConditions,[]);assert.equal(gridRequests[0].columns,3);assert.equal(gridRequests[0].rows,3);
 assert.equal(nodes().filter(n=>n.type==='FoodCard').length,9);assert.ok(nodes().filter(n=>n.type==='FoodCard').every(n=>n.props.reviewPending));
 camera.props.onGrid({nativeEvent:make(9,'b0')});await flush(Screen);assert.equal(gridRequests.length,1);
 finishResponse();await flush(Screen);assert.ok(nodes().filter(n=>n.type==='FoodCard').every(n=>!n.props.reviewPending));
 shelfResponse=async input=>result(input);
 button('Finish scan').onPress();await flush(Screen);camera=nodes().find(n=>n.type==='NativeShelf');assert.equal(camera.props.finishRequested,true);
 camera.props.onGrid({nativeEvent:make(2,'b1',9)});camera.props.onScanState({nativeEvent:{runId:camera.props.runId,state:'stopped',reason:'stopped'}});await flush(Screen);
 assert.equal(gridRequests[1].batchIndex,1);assert.equal(gridRequests[1].cells.length,2);assert.ok(text().includes('Shelf results'));assert.ok(/11\s+checked/.test(text()));
 button('Show more products').onPress();await flush(Screen);assert.equal(nodes().filter(n=>n.type==='FoodCard').length,11);
 button('Scan another shelf').onPress();await flush(Screen);camera=nodes().find(n=>n.type==='NativeShelf');assert.ok(camera);
 background.forEach(fn=>fn('background'));await flush(Screen);assert.equal(nodes().some(n=>n.type==='NativeShelf'),false);assert.ok(text().includes('background'));
 reset();params={auto:'1'};gridRequests=[];await flush(Screen);
 button('Use my health details').onPress();await flush(Screen);camera=nodes().find(n=>n.type==='NativeShelf');
 camera.props.onGrid({nativeEvent:make(1,'shared')});await flush(Screen);
 assert.equal(gridRequests[0].shareHealth,true);assert.ok(gridRequests[0].context.shopper);
 assert.deepEqual(gridRequests[0].context.healthConditions,['diabetes','hypertension','cardiovascular']);
 reset();params={auto:'1'};await flush(Screen);button('Continue without health details').onPress();await flush(Screen);camera=nodes().find(n=>n.type==='NativeShelf');
 shelfResponse=async input=>{const r=result(input);if(input.batchIndex===0){r.products[0].food.rating='not_healthy';r.alternatives=[{food:fixtures.food('Alternative'),comparedCell:1,reasons:['Less sodium'],sourceUrls:[],nutritionStatus:'estimated',storeName:'Wegmans',aisle:'4',retailerUrl:null}];}return r;};
 camera.props.onGrid({nativeEvent:make(1,'red',0)});await flush(Screen);assert.ok(text().includes('Healthier alternatives'));assert.ok(text().includes('Wegmans'));
 camera.props.onGrid({nativeEvent:make(1,'green',1)});await flush(Screen);assert.ok(!text().includes('Healthier alternatives'));
 reset();global.fetch=savedFetch;
 console.log('Shelf nine UI: consent/no-sharing, 3x3 native capacity, partial streamed cards, duplicate batch callback, Gemini-first batch numbering, Finish flush, Show more, restart, background cancellation, multi-condition context, batch alternatives and later-green suppression passed (native/network mocked).');
})().catch(error=>{reset();global.fetch=savedFetch;console.error(error);process.exitCode=1;});
