// Component interaction harness with native/network boundaries replaced; production screen code is executed.
const fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript'),assert=require('node:assert/strict');
const root=process.cwd(),realReact=require('react'),core=require(path.join(root,'packages/core/src/index.ts'));
let current='',cursor=0,slots=new Map(),effects=[],routes=[],params={},networkCalls=0,background=[],photoConsent=true,shopperConsent=false,lastGroceryContext=null,nextToken=0;
const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
function slot(){const id=current+':'+cursor++;if(!slots.has(id))slots.set(id,{});return slots.get(id);}
const hooks={...realReact,
 useState(initial){const s=slot();if(!('value'in s))s.value=typeof initial==='function'?initial():initial;if(!s.setValue)s.setValue=v=>s.value=typeof v==='function'?v(s.value):v;return[s.value,s.setValue];},
 useRef(initial){const s=slot();return s.ref??(s.ref={current:initial});},
 useCallback(fn,deps){const s=slot();if(!equal(s.deps,deps)){s.deps=deps;s.fn=fn;}return s.fn;},
 useEffect(fn,deps){const s=slot();if(!equal(s.deps,deps)){s.deps=deps;effects.push(()=>{s.clean?.();s.clean=fn();});}},
};
const host=name=>props=>realReact.createElement(name,props,props.children);
const components={s:{},...Object.fromEntries(['Back','Body','Button','Card','Chip','Heading','Page','Status','Title','Icon','Row'].map(name=>[name,host(name)]))};
const profile={age:52,gender:'male',pregnancy:'not-pregnant',intent:'management',revision:1,primary:'generalFitness',restrictions:[],conditions:[]};
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
let mediaCalls=[],mediaResponder=async()=>({image:null,reference:true});
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
  if(name==='expo/fetch')return {fetch:global.fetch};
  if(name==='react-native')return{Pressable:'Pressable',Image:'Image',View:'View',Text:'Text',TextInput:'TextInput',ScrollView:'ScrollView',StyleSheet:{create:x=>x,absoluteFill:{}},Linking:{openSettings:async()=>{},openURL:async()=>{}},AppState:{currentState:'active',addEventListener:(name,fn)=>{background.push(fn);return{remove(){}};}}};
  if(name==='expo-router')return{router,useLocalSearchParams:()=>params,useFocusEffect:fn=>hooks.useEffect(fn,[fn])};
  if(name==='@grocery/core')return core;
  if(/\/ui\/components$|^\.\/components$/.test(name))return components;
  if(name.endsWith('/state/AppState'))return{useAppState:()=>({profile}),recordId:()=> '11111111-1111-4111-8111-'+String(++nextToken).padStart(12,'0')};
  if(name.endsWith('/state/StoreContext'))return{useShoppingStore:()=>shopping};
  if(name.endsWith('/nearbyAvailability'))return {...require(path.join(root,'packages/core/src/nearbyAvailability.ts')),findNearbyAvailability:async(input,signal)=>{availabilityCalls.push({input,signal});return availabilityResponder(input,signal);}};
  if(name.endsWith('/storage/photoConsent'))return{readPhotoConsent:async()=>photoConsent,readScanSharingConsent:async()=>photoConsent&&shopperConsent!==null?{parallelContextConsentVersion:require(path.join(root,'packages/core/src/groceryReview.ts')).GROCERY_PARALLEL_CONSENT,shareHealth:shopperConsent}:null,savePhotoConsent:async()=>{photoConsent=true;},readShopperConsent:async()=>shopperConsent,saveShopperConsent:async enabled=>{shopperConsent=enabled;}};
  if(name.endsWith('/storage/testerKey'))throw Error('Screens must never read tester credentials');
  if(name.endsWith('/storage/repository'))return{openRepository:async()=>({})};
  if(name.endsWith('/ui/PhotoCaptureView'))return{photoCameraAvailable:true,PhotoCaptureView:host('NativePhoto')};
  if(name.endsWith('/groceryClient'))return {reviewGroceryPhoto:async(image,context,signal,fetcher,onProgress,onTiming,onIdentity,retainResponse,parallelContextConsentVersion)=>{assert.equal(parallelContextConsentVersion,require(path.join(root,'packages/core/src/groceryReview.ts')).GROCERY_PARALLEL_CONSENT);assert.equal(retainResponse,true,'New consent must accompany response capture');networkCalls++;lastGroceryContext=context;onTiming?.({stage:'uploadStartMs'});onTiming?.({stage:'responseHeadersMs',traceId:'12345678-1234-4234-8234-123456789012'});return recognition(image,signal,fetcher,onProgress,onTiming,onIdentity);}};
  if(name.endsWith('/dualAiFoodClient'))return {reviewDualProductPhoto:async(...args)=>{networkCalls++;args[4]?.({stage:'uploadStartMs'});args[4]?.({stage:'responseHeadersMs',traceId:'12345678-1234-4234-8234-123456789012'});return recognition(...args);}};
  if(name.endsWith('/webAiFoodClient'))return {reviewWebProductPhoto:async(...args)=>{networkCalls++;args[4]?.({stage:'uploadStartMs'});args[4]?.({stage:'responseHeadersMs',traceId:'12345678-1234-4234-8234-123456789012'});return recognition(...args);}};
  if(name.endsWith('/aiFoodClient'))return {reviewProductPhoto:async(...args)=>{networkCalls++;args[4]?.({stage:'uploadStartMs'});args[4]?.({stage:'responseHeadersMs',traceId:'12345678-1234-4234-8234-123456789012'});return recognition(...args);},checkProductSources:async(identity)=>{sourceCalls.push(identity);return {foods:[food],match:'possible',checkedAt:new Date().toISOString()};},findProductMedia:async(identity)=>{mediaCalls.push(identity);return mediaResponder(identity);}};
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
 const Capture=load('apps/mobile/src/app/capture.tsx').default;
 photoConsent=false;await flush(Capture);assert.ok(text().includes('OpenAI')&&!text().includes('Anthropic'));
 assert.ok(!text().includes('Read package text on this phone instead'));assert.ok(text().includes('seven days')&&text().includes('Answers may repeat health details'));
 assert.ok(!nodes().some(n=>n.type==='NativePhoto'),'Camera waits for photo privacy choice');
 await button('Continue without health details').onPress();await flush(Capture);
 assert.equal(shutter().disabled,true);shutter().onPress();await flush(Capture);
 assert.equal(nodes().find(n=>n.type==='NativePhoto').props.captureId,0,'Opening shutter cannot capture');
 assert.ok(!text().includes('Take Photo'),'Shutter has no visible text label');
 reset();await ready(Capture);const first=shutter();assert.equal(first.disabled,false);first.onPress();first.onPress();await flush(Capture);
 assert.equal(shutter().disabled,true);assert.equal(shutter().accessibilityState.busy,true);
 assert.equal(nodes().find(n=>n.type==='NativePhoto').props.captureId,1,'Repeated shutter taps request one capture');
 button('Cancel scan').onPress();await flush(Capture);reset();
 params={mode:'nutrition'};photoConsent=false;await ready(Capture);
 assert.equal(nodes().find(n=>n.type==='NativePhoto').props.imageForAI,false,'Nutrition table remains on-device');
 reset();photoConsent=true;
 await ready(Capture);assert.ok(!text().includes('Connect your tester access'));assert.ok(!nodes().some(n=>n.props.accessibilityLabel==='Tester access key'));shutter().onPress();await flush(Capture);
 let camera=nodes().find(n=>n.type==='NativePhoto').props;assert.equal(camera.imageForAI,true);
 camera.onPhoto({nativeEvent:{captureId:camera.captureId,imageBase64:'aGVsbG8='}});camera.onPhoto({nativeEvent:{captureId:camera.captureId,imageBase64:'aGVsbG8='}});
 await flush(Capture);assert.equal(networkCalls,1);assert.equal(routes.length,1);assert.equal(routes[0].pathname,'/photo-results');assert.ok(routes[0].params.scan);assert.ok(!text().includes('Confirm your package'));
 const target=routes[0];reset();params=target.params;
 const Results=load('apps/mobile/src/app/photo-results.tsx').default;await flush(Results);
 assert.ok(text().includes('Honey Oat Cereal'));assert.ok(text().includes('AI estimate'));assert.equal(nodes().filter(n=>n.type==='Card').length,4);
 assert.ok(!text().includes('Estimated whole grain oats'));assert.ok(!text().includes('Estimated oats only'));
 const factButtons=()=>nodes().filter(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Food Facts');
 assert.equal(factButtons().length,4);factButtons()[0].props.onPress();await flush(Results);
 assert.ok(text().includes('Estimated whole grain oats'));assert.ok(!text().includes('Estimated oats only'),'Original facts must not expand alternative facts');
 const checks=nodes().filter(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Check USDA / OFF');checks[1].props.onPress();await flush(Results);
 assert.equal(sourceCalls.length,1);assert.equal(sourceCalls[0].name,'Plain A');assert.ok(text().includes('Honey Oat Cereal'));assert.ok(text().includes('Possible database matches'));
 const hide=nodes().find(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Hide USDA / OFF');assert.ok(hide);assert.equal(hide.props.accessibilityState.expanded,true);hide.props.onPress();await flush(Results);
 assert.ok(!text().includes('Possible database matches'));const reopen=nodes().filter(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Check USDA / OFF')[1];reopen.props.onPress();await flush(Results);
 assert.ok(text().includes('Possible database matches'));assert.equal(sourceCalls.length,1,'Reopening source facts uses the existing result');

 assert.equal(nodes().filter(n=>n.type==='Card').filter(n=>text(n).includes('Possible database matches')).length,1,'Source check stays in exactly one card');
 assert.ok(nodes().some(n=>n.type==='Image'&&n.props.accessibilityLabel==='Your product photo'));
 background.forEach(fn=>fn('background'));await flush(Results);assert.ok(!nodes().some(n=>n.type==='Image'&&n.props.accessibilityLabel==='Your product photo'),'Background clears captured thumbnail from mounted screen');
 profile.conditions=['celiac'];await flush(Results);assert.ok(text().includes('Dietary check needed'));assert.ok(!text().includes('Healthier alternatives'));profile.conditions=[];
 reset();await ready(Capture);shutter().onPress();await flush(Capture);
 let release;recognition=()=>new Promise(resolve=>release=resolve);camera=nodes().find(n=>n.type==='NativePhoto').props;camera.onPhoto({nativeEvent:{captureId:camera.captureId,imageBase64:'aGVsbG8='}});await flush(Capture);
 assert.equal(routes.length,1,'Photo preview opens before any network result');const previewTarget=routes[0];reset();params=previewTarget.params;await flush(Results);
 assert.ok(text().includes('Identifying your product'));assert.ok(nodes().some(n=>n.type==='Image'&&n.props.accessibilityLabel==='Your product photo'));assert.equal(factButtons().length,0);assert.ok(!text().includes('Healthy'));
 button('Cancel scan').onPress();release(aiOutcome);await flush(Results);assert.ok(text().includes('Scan interrupted'));assert.equal(nodes().filter(n=>n.type==='Card').length,0,'Cancelled preview must not become a result');
 reset();recognition=async()=>({...aiOutcome,status:'uncertain',original:{...estimatedOriginal,identity:{...estimatedOriginal.identity,status:'uncertain'},rating:null},alternatives:[]});await ready(Capture);shutter().onPress();await flush(Capture);camera=nodes().find(n=>n.type==='NativePhoto').props;camera.onPhoto({nativeEvent:{captureId:camera.captureId,imageBase64:'aGVsbG8='}});await flush(Capture);assert.equal(routes[0].pathname,'/photo-results');
 reset();recognition=async()=>({...aiOutcome,status:'no-product',original:null,alternatives:[]});await ready(Capture);shutter().onPress();await flush(Capture);camera=nodes().find(n=>n.type==='NativePhoto').props;camera.onPhoto({nativeEvent:{captureId:camera.captureId,imageBase64:'aGVsbG8='}});await flush(Capture);const noProductTarget=routes[0];reset();params=noProductTarget.params;await flush(Results);assert.ok(text().includes('No package could be identified'));
 reset();recognition=async()=>{throw Error('This review could not finish. Please try again.');};await ready(Capture);shutter().onPress();await flush(Capture);camera=nodes().find(n=>n.type==='NativePhoto').props;const beforeFailure=networkCalls;camera.onPhoto({nativeEvent:{captureId:camera.captureId,imageBase64:'aGVsbG8='}});await flush(Capture);assert.equal(networkCalls,beforeFailure+1);const failedTarget=routes[0];reset();params=failedTarget.params;await flush(Results);assert.ok(text().includes('could not finish'));button('Scan another product').onPress();assert.equal(routes.at(-1),'/capture');reset();await ready(Capture);assert.equal(shutter().disabled,false);
 reset();await ready(Capture);shutter().onPress();await flush(Capture);camera=nodes().find(n=>n.type==='NativePhoto').props;const beforeBarcode=networkCalls;camera.onPhoto({nativeEvent:{captureId:camera.captureId,imageBase64:'aGVsbG8=',barcodes:[{value:'016000401068',format:'gtin'}]}});await flush(Capture);assert.equal(networkCalls,beforeBarcode);assert.equal(routes[0].params.barcode,'00016000401068');
 reset();await ready(Capture);shutter().onPress();await flush(Capture);camera=nodes().find(n=>n.type==='NativePhoto').props;const page={page:1,width:1000,height:1000,lines:['Nutrition Facts','Calories 150','Sodium 100mg','Total Carbohydrate 32g'].map((text,i)=>({id:'line-'+i,text,x:10,y:i*40,width:900,height:30,confidence:0.99}))};camera.onPhoto({nativeEvent:{captureId:camera.captureId,imageBase64:'aGVsbG8=',page}});await flush(Capture);assert.equal(networkCalls,beforeBarcode);assert.equal(routes[0].pathname,'/food-review');
 reset();let progressCallback,finishStream,streamSignal;
 recognition=(_image,signal,_fetch,onProgress)=>{streamSignal=signal;progressCallback=onProgress;onProgress({...aiOutcome,alternatives:[]});return new Promise(resolve=>finishStream=resolve);};
 await ready(Capture);shutter().onPress();await flush(Capture);camera=nodes().find(n=>n.type==='NativePhoto').props;camera.onPhoto({nativeEvent:{captureId:camera.captureId,imageBase64:'aGVsbG8='}});await flush(Capture);
 assert.equal(routes.length,1,'First validated card navigates before final completion');const streamingTarget=routes[0];reset();assert.equal(streamSignal.aborted,false,'Capture blur must not cancel handed-off alternatives');params=streamingTarget.params;await flush(Results);
 assert.equal(nodes().filter(n=>n.type==='Card').length,1);assert.ok(text().includes('Checking nutrition and alternatives'));assert.ok(!text().includes('No suitable alternatives'));
 progressCallback({...aiOutcome,alternatives:aiOutcome.alternatives.slice(0,1)});await flush(Results);assert.equal(nodes().filter(n=>n.type==='Card').length,2);
 finishStream(aiOutcome);await flush(Results);assert.equal(nodes().filter(n=>n.type==='Card').length,4);assert.ok(!text().includes('Checking nutrition and alternatives'));assert.equal(streamSignal.aborted,false);
 reset();await ready(Capture);shutter().onPress();await flush(Capture);camera=nodes().find(n=>n.type==='NativePhoto').props;camera.onPhoto({nativeEvent:{captureId:camera.captureId,imageBase64:'aGVsbG8='}});await flush(Capture);const interruptTarget=routes[0];reset();params=interruptTarget.params;await flush(Results);background.forEach(fn=>fn('background'));await flush(Results);
 assert.equal(streamSignal.aborted,true);assert.ok(text().includes('Scan interrupted'));assert.equal(nodes().filter(n=>n.type==='Card').length,0,'Incomplete stream must not leave a favorable result visible');finishStream(aiOutcome);await flush(Results);assert.equal(nodes().filter(n=>n.type==='Card').length,0);
 reset();const AiCard=load('apps/mobile/src/ui/AiProductCard.tsx').AiProductCard;await flush(AiCard,{food:estimatedAlternative('Restricted'),restricted:true});assert.ok(text().includes('Dietary check needed'));assert.ok(!text().includes('Healthy'));reset();
 const Home=load('apps/mobile/src/app/(tabs)/index.tsx').default;await flush(Home);assert.ok(nodes().some(n=>n.type==='FoodNews'));assert.ok(nodes().some(n=>n.props.accessibilityLabel==='Scan Your Product'));assert.ok(nodes().some(n=>n.props.accessibilityLabel==='Shelf Camera'));assert.ok(!text().includes('Barcode Camera'));assert.ok(!text().includes('Scan Nutrient Table'));
 const hero=nodes().find(n=>n.type==='Image'&&n.props.accessibilityLabel?.startsWith('Fresh and packaged groceries'));assert.ok(hero);
 const imageStyle=Object.assign({width:hero.props.source.width,height:hero.props.source.height},...([hero.props.style].flat(Infinity).filter(Boolean)));
 assert.equal(hero.props.source.width,1672);assert.equal(hero.props.source.height,941);
 assert.equal(imageStyle.width,'100%');assert.equal(imageStyle.height,undefined,'Native asset height must not override the landing artwork aspect ratio');
 assert.equal(imageStyle.aspectRatio,1672/941);assert.equal(hero.props.resizeMode,'contain');reset();
 reset();
 const PhotoRating=load('apps/mobile/src/ui/PhotoRating.tsx').PhotoRating;
 for(const rating of ['very_healthy','healthy','neutral','not_healthy']){
  const item=rating==='very_healthy'?alternative:rating==='healthy'?{...alternative,nutrients:{...alternative.nutrients,fiberG:8}}:rating==='not_healthy'?{...food,nutrients:{...food.nutrients,sodiumMg:1200}}:food;
  const result={...outcome,foods:[item],assessment:ratingCore.labelRating(item),alternatives:[]};
  await flush(PhotoRating,{result,restrictions:[],now:Date.now()});
  assert.ok(text().includes(ratingCore.ratingPresentation[rating].label));
  assert.ok(nodes().some(n=>n.props.style?.backgroundColor===ratingCore.ratingPresentation[rating].color));
  if(['healthy','very_healthy'].includes(rating))assert.ok(!text().includes('Healthier alternatives'));
  reset();
 }
 const pictured={...outcome,alternatives:[{...outcome.alternatives[0],tradeoffs:['saturatedFatG'],food:{...alternative,image:{url:'https://images.openfoodfacts.org/images/products/000/123/456/78912/front_en.1.200.jpg',license:'CC-BY-SA-3.0',sourceUrl:'https://world.openfoodfacts.org/product/00012345678912'}}}]};
 await flush(PhotoRating,{result:pictured,restrictions:[],now:Date.now()});assert.ok(text().includes('Open Food Facts'));assert.ok(text().includes('somewhat more saturated fat'));
 const thumbnail=nodes().find(n=>n.type==='Image');assert.ok(thumbnail);thumbnail.props.onError();await flush(PhotoRating,{result:pictured,restrictions:[],now:Date.now()});assert.ok(!nodes().some(n=>n.type==='Image'));assert.ok(nodes().some(n=>n.type==='Icon'&&n.props.name==='package'));reset();
 await flush(PhotoRating,{result:outcome,restrictions:['glutenFree'],now:Date.now()});assert.ok(text().includes('dietary requirements are not verified'));assert.ok(!text().includes('Healthier alternatives'));reset();
 await flush(PhotoRating,{result:outcome,restrictions:[],now:Date.now()+11*60*1000});assert.ok(text().includes('refresh'));reset();

 reset();recognition=async()=>aiOutcome;const timingBefore=timingReports.length;
 await ready(Capture);assert.equal(nodes().find(n=>n.type==='NativePhoto').props.timingEnabled,timingMode);
 shutter().onPress();await flush(Capture);camera=nodes().find(n=>n.type==='NativePhoto').props;
 camera.onPhoto({nativeEvent:{captureId:camera.captureId,imageBase64:'aGVsbG8=',timings:{captureMs:120,preparationMs:900,ocrMs:850,barcodeJpegMs:400}}});await flush(Capture);
 const timingTarget=routes[0];reset();params=timingTarget.params;await flush(Results);
 const layout=nodes().find(n=>n.type==='View'&&typeof n.props.onLayout==='function');assert.ok(layout);layout.props.onLayout();layout.props.onLayout();await flush(Results);
 assert.equal(timingReports.length,timingBefore+(timingMode?1:0));
 if(timingMode){const report=timingReports.at(-1);assert.equal(report.outcome,'completed');assert.equal(report.marks.captureMs,120);assert.equal(report.marks.ocrMs,850);assert.ok(report.marks.firstCardLayoutMs>=report.marks.firstResultMs);assert.ok(report.marks.thirdAlternativeMs>=report.marks.firstResultMs);assert.ok(!JSON.stringify(report).includes('aGVsbG8='));}
 reset();
 const neutralOriginal={...estimatedOriginal,identity:{...estimatedOriginal.identity,name:'Synthetic Spread'},category:'butter-spread',servingGrams:14,servingText:'14 g',rating:'neutral',nutrition:{...estimatedOriginal.nutrition,caloriesKcal:90,carbohydrateG:0,sugarsG:0,addedSugarsG:0,saturatedFatG:3,sodiumMg:90,fiberG:0,proteinG:0}};
 const neutralAlternative={...neutralOriginal,identity:{...neutralOriginal.identity,name:'Synthetic Improved Spread'},nutrition:{...neutralOriginal.nutrition,saturatedFatG:2}};
 const relativeBenefits=aiCore.estimatedBenefits(neutralOriginal,neutralAlternative);assert.deepEqual(relativeBenefits,['Less saturated fat']);
 await flush(AiCard,{food:neutralAlternative,benefits:relativeBenefits});assert.ok(text().includes('Neutral'));assert.ok(text().includes('Less saturated fat'));assert.ok(!text().includes('Healthy'));reset();
 await flush(AiCard,{food:neutralAlternative,benefits:[],restricted:false});assert.ok(text().includes('Synthetic Improved Spread'));assert.ok(text().includes('Neutral'));assert.equal(nodes().filter(n=>n.type==='Card').length,1);reset();
 await flush(AiCard,{food:neutralAlternative,benefits:relativeBenefits,restricted:true});assert.ok(text().includes('Dietary check needed'));assert.ok(!nodes().some(n=>n.props.style?.backgroundColor===ratingCore.ratingPresentation.neutral.color));reset();
 const saltyOriginal={...estimatedOriginal,identity:{...estimatedOriginal.identity,name:'Synthetic Sauce'},category:'tomato-pasta-sauce',servingGrams:125,servingText:'125 g',nutrition:{...estimatedOriginal.nutrition,caloriesKcal:70,carbohydrateG:12,sugarsG:8,addedSugarsG:3,saturatedFatG:0,sodiumMg:480,fiberG:2,proteinG:2}};
 const lowerSaltSauce={...saltyOriginal,rating:'neutral',identity:{...saltyOriginal.identity,name:'Lower Sodium Sauce'},nutrition:{...saltyOriginal.nutrition,sodiumMg:380,sugarsG:5,addedSugarsG:0}};
 const sodiumBenefits=aiCore.estimatedBenefits(saltyOriginal,lowerSaltSauce);assert.equal(sodiumBenefits[0],'Less sodium');
 await flush(AiCard,{food:lowerSaltSauce,benefits:sodiumBenefits});assert.ok(text().indexOf('Less sodium')<text().indexOf('Less added sugar'));assert.ok(text().includes('Neutral'));reset();
 for(const sodiumMg of [450,440]){
  const belowCutoff={...lowerSaltSauce,identity:{...lowerSaltSauce.identity,name:'Below cutoff '+sodiumMg},nutrition:{...saltyOriginal.nutrition,sodiumMg,sugarsG:5,addedSugarsG:0}};
  const benefits=aiCore.estimatedBenefits(saltyOriginal,belowCutoff);assert.equal(benefits[0],'Less sodium');
  await flush(AiCard,{food:belowCutoff,benefits});assert.ok(text().indexOf('Less sodium')<text().indexOf('Less added sugar'));assert.ok(text().includes('Neutral'));assert.ok(!text().includes('Low sodium'));reset();
 }
 const severalConcerns={...estimatedOriginal,servingGrams:100,nutrition:{...estimatedOriginal.nutrition,sodiumMg:600,fiberG:4,proteinG:4,saturatedFatG:2}};
 const unchangedSalt={...severalConcerns,rating:'neutral',identity:{...severalConcerns.identity,name:'Secondary Concern'},servingGrams:50,nutrition:{...severalConcerns.nutrition,caloriesKcal:70,carbohydrateG:20,sugarsG:2,addedSugarsG:2,sodiumMg:300,fiberG:2,proteinG:2,saturatedFatG:0.5}};
 await flush(AiCard,{food:unchangedSalt,benefits:aiCore.estimatedBenefits(severalConcerns,unchangedSalt)});assert.ok(text().indexOf('Less added sugar')<text().indexOf('Sodium not meaningfully lower'));assert.ok(text().includes('Sodium not meaningfully lower'));reset();
 reset();const previewReportStart=timingReports.length;let identityCallback,previewProgress,finishPreview,previewSignal;
 recognition=(_image,signal,_fetch,onProgress,_timing,onIdentity)=>{previewSignal=signal;identityCallback=onIdentity;previewProgress=onProgress;return new Promise(resolve=>finishPreview=resolve);};
 await ready(Capture);shutter().onPress();await flush(Capture);camera=nodes().find(n=>n.type==='NativePhoto').props;camera.onPhoto({nativeEvent:{captureId:camera.captureId,imageBase64:'aGVsbG8='}});await flush(Capture);const earlyTarget=routes[0];reset();params=earlyTarget.params;await flush(Results);
 assert.equal(previewSignal.aborted,false);assert.ok(text().includes('Identifying your product'));assert.equal(factButtons().length,0);nodes().find(n=>n.type==='View'&&n.props.onLayout).props.onLayout();
 identityCallback(aiCore.photoPreviewOf(estimatedOriginal.identity));await flush(Results);assert.ok(text().includes('Honey Oat Cereal'));assert.ok(text().includes('Finding nutrition sources'));assert.equal(factButtons().length,0);assert.ok(!text().includes('Not healthy'));nodes().find(n=>n.type==='View'&&n.props.onLayout).props.onLayout();
 previewProgress({...aiOutcome,alternatives:[]});await flush(Results);assert.equal(factButtons().length,1,'Nutrition card appears only after checked product');nodes().find(n=>n.type==='View'&&n.props.onLayout).props.onLayout();finishPreview(aiOutcome);await flush(Results);assert.equal(factButtons().length,4);
 assert.equal(timingReports.length,previewReportStart+(timingMode?1:0));if(timingMode){const marks=timingReports.at(-1).marks;assert.ok(marks.photoPreviewLayoutMs<=marks.identityPreviewMs);assert.ok(marks.identityPreviewMs<=marks.identityPreviewLayoutMs);assert.ok(marks.identityPreviewLayoutMs<=marks.firstResultMs);assert.ok(marks.firstResultMs<=marks.firstCardLayoutMs);}
 reset();await ready(Capture);shutter().onPress();await flush(Capture);camera=nodes().find(n=>n.type==='NativePhoto').props;camera.onPhoto({nativeEvent:{captureId:camera.captureId,imageBase64:'aGVsbG8='}});await flush(Capture);const uncertainTarget=routes[0];reset();params=uncertainTarget.params;await flush(Results);
 identityCallback({...aiCore.photoPreviewOf(estimatedOriginal.identity),status:'uncertain'});await flush(Results);assert.ok(text().includes('Possible match'));assert.equal(factButtons().length,0);
 background.forEach(fn=>fn('background'));await flush(Results);assert.equal(previewSignal.aborted,true);assert.ok(!nodes().some(n=>n.type==='Image'));identityCallback(aiCore.photoPreviewOf(estimatedOriginal.identity));finishPreview(aiOutcome);await flush(Results);assert.ok(!text().includes('Honey Oat Cereal'));reset();
 // Nearby availability is independent for each alternative; never hold nutrition or images.
 reset();params={scan:'availability-ui'};shopping={selected:{id:'way/137270170',name:'Wegmans'},origin:{latitude:42.295123,longitude:-71.712345}};
 const scanState=load('apps/mobile/src/state/AiScanState.ts').aiScanState;
 scanState.put(params.scan,aiOutcome,'aGVsbG8=');
 const availabilityPending=[];availabilityCalls=[];
 availabilityResponder=(input,signal)=>new Promise((resolve,reject)=>availabilityPending.push({input,signal,resolve,reject}));
 await flush(Results);
 assert.equal(factButtons().length,4,'All facts available while stores are still pending');
 assert.equal(availabilityCalls.length,3,'Exactly three parallel requests for three alternatives');
 assert.equal((text().match(/Finding store listings…/g)||[]).length,3);
 assert.ok(availabilityCalls.every(c=>c.input.location.kind==='store'&&!('latitude'in c.input.location)));
 await flush(Results);assert.equal(availabilityCalls.length,3,'Rerenders never repeat searches');
 const listing={retailer:'Fixture Store',title:'Fixture Plain B',url:'https://example.com/product',price:'$3.99',address:'123 Example St',locationLabel:null,status:'pickup-today',sponsored:true,packNote:null};
 const availabilityResult={schemaVersion:2,status:'ok',listings:[listing],checkedAt:new Date().toISOString(),source:'Google via SerpApi',cached:false};
 availabilityPending[1].resolve({...availabilityResult,source:'Google via Serper'});await flush(Results);
 assert.ok(text().includes('Google via Serper'),'Fallback attribution must reflect the actual provider');
 assert.ok(text().includes('Pickup today'));assert.ok(text().includes('Other retailer'));assert.equal((text().match(/Finding store listings…/g)||[]).length,2);
 const storeCards=nodes().filter(n=>n.type==='Card'&&text(n).includes('Fixture Store'));assert.equal(storeCards.length,1);assert.ok(text(storeCards[0]).includes('Plain B'));
 availabilityPending[2].reject(Error('failure'));await flush(Results);assert.ok(text().includes('Store lookup unavailable'));assert.equal(factButtons().length,4);
 shopping={selected:{id:'node/123'},origin:null};await flush(Results);
 assert.equal(availabilityCalls.length,6);assert.equal(availabilityPending[0].signal.aborted,true);assert.ok(!text().includes('Fixture Store'),'Old store results disappear immediately');
 availabilityPending[0].resolve(availabilityResult);await flush(Results);assert.ok(!text().includes('Fixture Store'),'Late old response cannot replace current store');
 background.forEach(fn=>fn('background'));await flush(Results);assert.ok(availabilityPending.slice(3).every(p=>p.signal.aborted),'Background cancels every card lookup');
 reset();shopping={selected:null,origin:null};params={scan:'no-location'};scanState.put(params.scan,aiOutcome,'');availabilityCalls=[];await flush(Results);
 assert.equal(availabilityCalls.length,0);assert.ok(text().includes('Choose a store'));assert.equal(factButtons().length,4);
 for(const count of [0,1,2]){
  reset();shopping={selected:{id:'node/123'},origin:null};params={scan:'count-'+count};availabilityCalls=[];
  availabilityResponder=async()=>({...availabilityResult,status:'no-matches',listings:[]});
  scanState.put(params.scan,{...aiOutcome,alternatives:aiOutcome.alternatives.slice(0,count)},'');await flush(Results);
  assert.equal(availabilityCalls.length,count,'One search per actual alternative, none for original');assert.equal(factButtons().length,count+1);
 }
 reset();shopping={selected:null,origin:null};

 const {model:legacyModel,...commonOutcome}=aiOutcome;void legacyModel;
 const dualOutcome={...commonOutcome,schemaVersion:4,models:['gpt-6-luna','claude-haiku-5-5'],reviewState:'complete',estimatesDiffer:false};
 for(const version of [4,5]){
  reset();params={scan:'gpt-only-'+version};
  const result={...dualOutcome,schemaVersion:version,models:['gpt-6-luna'],...(version===5?{basis:'model-web-search',original:{...estimatedOriginal,nutritionSource:{url:'https://example.com/label',title:'Fixture',checkedAt:new Date().toISOString(),model:'gpt-6-luna',confirmation:'model-web-search'}},alternatives:[]}: {})};
  scanState.put(params.scan,result,'');await flush(Results);
  assert.ok(!text().includes('second review')&&!text().includes('Some information could not be confirmed')&&!text().includes('reviews disagree'));
 }

 for(const [id,changes,notice] of [
  ['partial',{models:['claude-haiku-5-5'],reviewState:'partial'},'Some information could not be confirmed'],
  ['conflict',{reviewState:'identity-conflict',status:'uncertain',original:{...estimatedOriginal,rating:null,identity:{...estimatedOriginal.identity,status:'uncertain'}},alternatives:[]},'product identity is uncertain'],
  ['different',{estimatesDiffer:true},'Nutrition estimates differ'],
 ]){
  reset();params={scan:'dual-'+id};scanState.put(params.scan,{...dualOutcome,...changes},'');await flush(Results);
  assert.ok(text().includes(notice));assert.equal(factButtons().length,id==='conflict'?1:4);
  if(id==='conflict')assert.ok(!text().includes('Not healthy')&&!text().includes('Healthier alternatives'));
 }
 reset();params={scan:'dual-label-check'};
 scanState.put(params.scan,{...dualOutcome,estimatesDiffer:true,original:{...estimatedOriginal,rating:null},alternatives:[]},'');
 await flush(Results);
 assert.ok(text().includes('Label check needed'));
 assert.ok(text().includes('nutrition information needs a label check'));
 assert.ok(!text().includes('Some information could not be confirmed'));
 assert.ok(!text().includes('No suitable alternatives were identified'));
 button('Scan Nutrition Facts').onPress();assert.deepEqual(routes.at(-1),{pathname:'/capture',params:{mode:'nutrition'}});
 reset();params={scan:'dual-progress'};shopping={selected:{id:'node/123'},origin:null};availabilityCalls=[];
 const dualPending=[];availabilityResponder=(input,signal)=>new Promise(resolve=>dualPending.push({input,signal,resolve}));
 scanState.put(params.scan,{...dualOutcome,reviewState:'checking',models:['gpt-6-luna'],alternatives:[]},'',true,new AbortController());
 await flush(Results);assert.equal(factButtons().length,1);assert.equal(availabilityCalls.length,0);assert.ok(text().includes('Checking nutrition and alternatives'));
 scanState.update(params.scan,dualOutcome,false);await flush(Results);assert.equal(factButtons().length,4);assert.equal(availabilityCalls.length,3);assert.equal(dualPending.length,3);
 assert.equal(text().split('Finding store listings…').length-1,3);
 reset();shopping={selected:null,origin:null};

 reset();params={scan:'web-confirmed'};
 const source={url:'https://example.com/label',title:'Fixture label',checkedAt:new Date().toISOString(),model:'gpt-6-luna',confirmation:'model-web-search'};
 const webOutcome={...dualOutcome,schemaVersion:5,basis:'model-web-search',original:{...estimatedOriginal,nutritionSource:source},alternatives:aiOutcome.alternatives.map(f=>({...f,nutritionSource:source}))};
 scanState.put(params.scan,webOutcome,'');await flush(Results);
 assert.ok(text().includes('Nutrition found by web search'));assert.ok(text().includes('Nutrition source:'));
 assert.ok(!text().includes('AI estimate'));assert.equal(factButtons().length,4);
 factButtons()[0].props.onPress();await flush(Results);assert.ok(text().includes('FOOD FACTS FROM WEB SEARCH'));assert.ok(text().includes('Read by the model from the linked source'));
 reset();params={scan:'web-unconfirmed'};
 const unknown={...estimatedOriginal,nutritionSource:null,rating:null,servingGrams:null,servingText:null,ingredients:null,nutrition:Object.fromEntries(Object.keys(estimatedOriginal.nutrition).map(k=>[k,null]))};
 scanState.put(params.scan,{...webOutcome,original:unknown,alternatives:[]},'');await flush(Results);
 assert.ok(text().includes('Nutrition not confirmed'));assert.ok(!text().includes('Not healthy'));assert.ok(!text().includes('AI estimate'));

 // Version 6 rendering keeps aisle information inside the original card, and does not invent facts.
 const grocery=require(path.join(root,'packages/core/src/groceryReview.ts'));
 const groceryFixture=JSON.parse(fs.readFileSync('docs/contracts/gemini-grocery-review-v1-aisle.example.json','utf8'));
 const groceryResult={schemaVersion:6,model:'gemini-3.5-flash-lite',status:'identified',original:grocery.estimatedGroceryFood(groceryFixture.original),alternatives:[],checkedAt:new Date().toISOString(),review:groceryFixture,grounding:{searchSuggestionsHtml:null,queries:[]},timing:{providerMs:100,validationMs:1}};
 reset();params={scan:'gemini-aisle'};scanState.put(params.scan,groceryResult,'aGVsbG8=');await flush(Results);
 assert.ok(text().replace(/\s+/g,' ').includes('Store: Example Grocery'));assert.ok(!/Stock reported|chain-wide|Check branch availability/.test(text()));assert.ok(text().includes('Aisle A12 · Pasta sauces'));assert.equal(factButtons().length,1);
 assert.ok(nodes().filter(n=>n.type==='Card').some(n=>text(n).includes('Example pasta sauce')&&text(n).includes('Aisle A12')),'Aisle belongs to the matching product card');
 factButtons()[0].props.onPress();await flush(Results);
 assert.ok(text().includes('Unknown'));assert.ok(!text().includes('AI estimate'));
 const withoutAisle=structuredClone(groceryResult);withoutAisle.review.original.availability.aisleEvidence='unknown';withoutAisle.review.original.availability.aisleSourceId=null;
 reset();params={scan:'gemini-no-aisle'};scanState.put(params.scan,withoutAisle,'');await flush(Results);
 assert.ok(!text().includes('Aisle A12'));assert.ok(!text().includes('Aisle null'));
 reset();
 const unknownStore=structuredClone(withoutAisle);unknownStore.review.original.availability.status='unknown';unknownStore.review.original.availability.storeName=null;unknownStore.review.original.assessment.limitations=['Store availability and aisle not confirmed for Wegmans.'];
 reset();params={scan:'gemini-unknown-store'};scanState.put(params.scan,unknownStore,'');await flush(Results);assert.ok(text().replace(/\s+/g,' ').includes('Store: Not identified'));assert.ok(!text().includes('Store availability'));
 const suggestedStore=structuredClone(unknownStore);suggestedStore.review.original.availability.storeName='Wegmans';
 reset();params={scan:'gemini-suggested-store'};scanState.put(params.scan,suggestedStore,'');await flush(Results);assert.ok(text().replace(/\s+/g,' ').includes('Store: Wegmans'));assert.ok(!text().includes('Store availability'));
 const namedAisle=structuredClone(groceryResult);namedAisle.review.original.availability.aisleNumber=null;
 reset();params={scan:'gemini-named-aisle'};scanState.put(params.scan,namedAisle,'');await flush(Results);assert.ok(text().includes('Pasta sauces'));assert.ok(!text().includes('Aisle null'));
 const nearbyStore=structuredClone(withoutAisle);nearbyStore.review.original.availability.storeName='Target';
 reset();params={scan:'gemini-nearby-store'};scanState.put(params.scan,nearbyStore,'');await flush(Results);assert.ok(text().replace(/\s+/g,' ').includes('Store: Target'));assert.ok(!text().includes('Aisle A12'));
 reset();
 shopperConsent=null;photoConsent=true;reset();await flush(Capture);assert.ok(!nodes().some(n=>n.type==='NativePhoto'),'Existing photo consent does not silently share a profile');
 await button('Use my health details').onPress();await ready(Capture);assert.equal(shopperConsent,true);
 shutter().onPress();await flush(Capture);nodes().find(n=>n.type==='NativePhoto').props.onPhoto({nativeEvent:{captureId:1,imageBase64:'aGVsbG8=',page:{width:100,height:100,lines:[]},barcodes:[]}});await flush(Capture);assert.equal(lastGroceryContext.shopper.age,52);
 reset();shopperConsent=false;params={scan:'gemini-stream'};const pendingController=new AbortController();scanState.put(params.scan,groceryResult,'',true,pendingController);await flush(Results);assert.ok(text().includes('Checking nutrition sources and remaining alternatives'));button('Cancel scan').onPress();await flush(Results);assert.equal(pendingController.signal.aborted,true);assert.equal(factButtons().length,0);
 reset();params={scan:'gemini-finish'};scanState.put(params.scan,groceryResult,'',true,new AbortController());await flush(Results);scanState.update(params.scan,groceryResult,false);await flush(Results);assert.ok(!text().includes('Checking nutrition sources and remaining alternatives'));reset();
 reset();photoConsent=true;shopperConsent=false;await ready(Capture);shutter().onPress();await flush(Capture);const beforeRevoked=networkCalls;let revokedCamera=nodes().find(n=>n.type==='NativePhoto').props;photoConsent=false;revokedCamera.onPhoto({nativeEvent:{captureId:revokedCamera.captureId,imageBase64:'aGVsbG8='}});await flush(Capture);assert.equal(networkCalls,beforeRevoked,'Revoked photo consent blocks dispatch');
 reset();photoConsent=true;shopperConsent=false;await ready(Capture);shutter().onPress();await flush(Capture);const beforeDeclined=networkCalls;let declinedCamera=nodes().find(n=>n.type==='NativePhoto').props;declinedCamera.onPhoto({nativeEvent:{captureId:declinedCamera.captureId,imageBase64:'aGVsbG8='}});await flush(Capture);assert.equal(networkCalls,beforeDeclined+1);assert.equal(lastGroceryContext.shopper,undefined);assert.deepEqual(lastGroceryContext.healthConditions,[]);
 reset();shopping={selected:null,originFix:{latitude:42.301234,longitude:-71.712345,timestamp:Date.now()}};photoConsent=true;shopperConsent=false;await ready(Capture);shutter().onPress();await flush(Capture);let homeCamera=nodes().find(n=>n.type==='NativePhoto').props;homeCamera.onPhoto({nativeEvent:{captureId:homeCamera.captureId,imageBase64:'aGVsbG8='}});await flush(Capture);assert.equal(lastGroceryContext.location.latitude,42.3);assert.equal(lastGroceryContext.location.longitude,-71.71);assert.equal(lastGroceryContext.store,null);
 reset();shopping={selected:null,originFix:{latitude:42.3,longitude:-71.71,timestamp:Date.now()-70000}};await ready(Capture);shutter().onPress();await flush(Capture);homeCamera=nodes().find(n=>n.type==='NativePhoto').props;homeCamera.onPhoto({nativeEvent:{captureId:homeCamera.captureId,imageBase64:'aGVsbG8='}});await flush(Capture);assert.equal(lastGroceryContext.location,undefined);
 reset();shopping={selected:null,origin:null};mediaCalls=[];mediaResponder=async()=>({image:{url:'https://images.openfoodfacts.org/fallback.jpg',sourceUrl:'https://world.openfoodfacts.org/product/fixture',license:'CC-BY-SA-3.0'},reference:true});
 const cardProps={food:estimatedOriginal,referenceImage:{url:'https://images.example.org/broken.jpg',sourceUrl:'https://example.org/product',title:'Reference package'}};
 await flush(AiCard,cardProps);nodes().find(n=>n.type==='Image').props.onError();await new Promise(r=>setTimeout(r,5));await flush(AiCard,cardProps);await new Promise(r=>setTimeout(r,5));await flush(AiCard,cardProps);assert.equal(mediaCalls.length,1);assert.equal(nodes().find(n=>n.type==='Image').props.source.uri,'https://images.openfoodfacts.org/fallback.jpg');
 nodes().find(n=>n.type==='Image').props.onError();await flush(AiCard,cardProps);assert.ok(text().includes('No photo'));assert.equal(mediaCalls.length,1);reset();
 console.log(JSON.stringify({passed:74,timingMode,scope:'Production capture, product cards, source checks, home and legacy ratings with mocked native/network boundaries; not a physical camera test'}));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{reset();global.fetch=savedFetch;});
