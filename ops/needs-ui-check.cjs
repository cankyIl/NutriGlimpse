// Component interaction harness with native/network boundaries replaced; production screen code is executed.
const fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript'),assert=require('node:assert/strict');
const root=process.cwd(),realReact=require('react'),core=require(path.join(root,'packages/core/src/index.ts'));
let current='',cursor=0,slots=new Map(),effects=[],routes=[],params={},networkCalls=0,background=[];
const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
function slot(){const id=current+':'+cursor++;if(!slots.has(id))slots.set(id,{});return slots.get(id);}
const hooks={...realReact,
 useState(initial){const s=slot();if(!('value'in s))s.value=typeof initial==='function'?initial():initial;return[s.value,v=>s.value=typeof v==='function'?v(s.value):v];},
 useRef(initial){const s=slot();return s.ref??(s.ref={current:initial});},
 useCallback(fn,deps){const s=slot();if(!equal(s.deps,deps)){s.deps=deps;s.fn=fn;}return s.fn;},
 useEffect(fn,deps){const s=slot();if(!equal(s.deps,deps)){s.deps=deps;effects.push(()=>{s.clean?.();s.clean=fn();});}},
};
const host=name=>props=>realReact.createElement(name,props,props.children);
const components={s:{},...Object.fromEntries(['Back','Body','Button','Card','Chip','Heading','Page','Status','Title','Icon'].map(name=>[name,host(name)]))};
let profile={...core.sampleProfile};
let saveMode='success',saveCalls=0,finishSave,onboardingComplete=true;
const updateProfile=async next=>{
 saveCalls++;
 if(saveMode==='pending')return new Promise(resolve=>{finishSave=()=>{profile={...next,revision:profile.revision+1};onboardingComplete=true;resolve(true);};});
 if(saveMode==='failure')return false;
 profile={...next,revision:profile.revision+1};onboardingComplete=true;return true;
};

const snapshot=JSON.parse(fs.readFileSync('apps/mobile/assets/catalog/public-foods.json','utf8'));
const seed=snapshot.foods.find(f=>f.provider==='usda'&&f.id==='2723877');assert.ok(seed);
const food={...seed,id:'999999999',comparisonGroup:'plain-oats',categoryEvidence:'category-rules-v4',sourceUrl:'https://fdc.nal.usda.gov/food-details/999999999/nutrients'};assert.ok(!snapshot.foods.some(f=>f.id===food.id),'Fixture must exercise facts absent from the bundled catalog');
const ratingCore=require(path.join(root,'packages/core/src/photoAssessment.ts'));
Object.assign(food,{sourceDate:new Date().toISOString().slice(0,10),retrievedAt:new Date().toISOString(),servingGrams:40,nutrients:{caloriesKcal:350,saturatedFatG:1,sodiumMg:100,sugarsG:5,fiberG:2},additionalNutrients:{transFatG:0,potassiumMg:null,magnesiumMg:null,calciumMg:null},nutritionExtras:{proteinG:12,carbohydrateG:70,addedSugarsG:0,ironMg:null,vitaminCMg:null,vitaminDMcg:null}});
const alternative={...food,id:'999999998',barcode:'00012345678912',name:'Fictional higher fiber oats',nutrients:{...food.nutrients,fiberG:15}};
const outcome={schemaVersion:2,model:'gpt-6-luna',identity:{status:'identified',brand:'Quaker',name:'Old Fashioned Oats',variant:null,size:'42 oz',visibleText:[]},foods:[food],assessment:ratingCore.labelRating(food),alternatives:[{food:alternative,assessment:ratingCore.labelRating(alternative),benefits:['fiberG']}],checkedAt:new Date().toISOString(),candidatesChecked:1};
let recognition=async()=>outcome;
const router={replace:v=>routes.push(v),push:v=>routes.push(v)};
const modules=new Map();
function load(filename){
 filename=path.resolve(filename);if(modules.has(filename))return modules.get(filename).exports;
 const mod=new Module(filename,module);modules.set(filename,mod);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));
 const original=mod.require.bind(mod);
 mod.require=name=>{
  if(name==='react')return hooks;
  if(name==='react-native')return{Image:'Image',View:'View',Text:'Text',TextInput:'TextInput',ScrollView:'ScrollView',StyleSheet:{create:x=>x,absoluteFill:{}},Linking:{openSettings:async()=>{},openURL:async()=>{}},AppState:{currentState:'active',addEventListener:(name,fn)=>{background.push(fn);return{remove(){}};}}};
  if(name==='expo-router')return{router,Redirect:({href})=>{hooks.useEffect(()=>{routes.push(href);},[href]);return null;},useLocalSearchParams:()=>params,useFocusEffect:fn=>hooks.useEffect(fn,[fn])};
  if(name==='@grocery/core')return core;
  if(/\/ui\/components$|^\.\/components$/.test(name))return components;
  if(name.endsWith('/state/AppState'))return{useAppState:()=>({profile,updateProfile,onboardingComplete}),recordId:()=> '11111111-1111-4111-8111-111111111111'};
  if(name.endsWith('/state/StoreContext'))return{useShoppingStore:()=>({selected:null})};
  if(name.endsWith('/storage/photoConsent'))return{readPhotoConsent:async()=>true,savePhotoConsent:async()=>{}};
  if(name.endsWith('/storage/testerKey'))return{readTesterKey:async()=>'a'.repeat(43)};
  if(name.endsWith('/storage/repository'))return{openRepository:async()=>({})};
  if(name.endsWith('/ui/PhotoCaptureView'))return{photoCameraAvailable:true,PhotoCaptureView:host('NativePhoto')};
  if(name.endsWith('/photoAssessmentClient'))return{assessProductPhoto:async(...args)=>{networkCalls++;return recognition(...args);}};
  if(name.endsWith('/RetailerCheck'))return{RetailerCheck:host('RetailerCheck')};
  if(name.endsWith('/CatalogCredits'))return{CatalogCredits:host('CatalogCredits')};
  if(name.endsWith('/LabelChecks'))return{LabelChecks:host('LabelChecks')};
  if(name.endsWith('/NutritionEducation'))return{ComparisonEducation:()=>realReact.createElement('Body',{},'According to Mayo Clinic and ADA')};
  if(name.endsWith('/PlanReference'))return{PlanReference:host('PlanReference')};
  if(name.startsWith('.')){
   const full=path.resolve(path.dirname(filename),name);
   for(const suffix of ['', '.tsx','.ts','.json'])if(fs.existsSync(full+suffix)&&fs.statSync(full+suffix).isFile()){
    if((full+suffix).endsWith('.json'))return JSON.parse(fs.readFileSync(full+suffix,'utf8'));
    if((full+suffix).includes('/packages/core/'))return require(full+suffix);
    return load(full+suffix);
   }
  }
  return original(name);
 };
 mod._compile(ts.transpileModule(fs.readFileSync(filename.endsWith('/app/onboarding.tsx')&&process.env.ONBOARDING_UNDER_TEST?process.env.ONBOARDING_UNDER_TEST:filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);return mod.exports;
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
async function flush(Component,props={}){for(let i=0;i<4;i++){tree=render(realReact.createElement(Component,props));const pending=effects;effects=[];pending.forEach(fn=>fn());await new Promise(resolve=>setImmediate(resolve));}return tree;}
async function ready(Component){await flush(Component);const camera=nodes().find(n=>n.type==='NativePhoto');assert.ok(camera,'Camera should open after consent/access');camera.props.onStatus({nativeEvent:{state:'ready',message:''}});await flush(Component);}
function reset(){for(const s of slots.values())s.clean?.();slots=new Map();effects=[];background=[];routes=[];params={};}

function input(label){const node=nodes().find(n=>n.type==='TextInput'&&n.props.accessibilityLabel===label);assert.ok(node,'Missing input '+label);return node.props;}
function chip(label){const node=nodes().find(n=>n.type==='Chip'&&n.props.label===label);assert.ok(node,'Missing chip '+label);return node.props;}
function fill(){input('Height in feet').onChangeText('5');input('Height in inches').onChangeText('8');input('Weight in pounds').onChangeText('150');}
(async()=>{
 const Needs=load('apps/mobile/src/app/(tabs)/needs.tsx').default;
 await flush(Needs);assert.ok(!text().includes('All eight conditions'));assert.ok(!text().includes('Sample ratings are illustrative'));
 assert.ok(!nodes().some(n=>n.type==='Chip'&&n.props.label==='Use weight context in AI comparisons'),'Review gate hides AI opt-in');
 fill();input('Eating preferences').onChangeText('Mostly plant-based');input('Food preferences').onChangeText('Unsweetened cereal');await flush(Needs);button('Save my needs').onPress();await flush(Needs);
 assert.equal(profile.eatingPreferences,'Mostly plant-based');assert.equal(profile.foodPreferences,'Unsweetened cereal');
 assert.deepEqual(routes,['/']);assert.equal(profile.bodyMeasurements.height.value,68);assert.equal(profile.bodyMeasurements.weight.value,150);
 assert.equal(profile.bodyMeasurements.height.unit,'in');assert.equal(profile.bodyMeasurements.weight.unit,'lb');
 assert.ok(!text().includes('underweight'));assert.ok(!text().includes('overweight'));assert.ok(!text().includes('obese'));

 reset();await flush(Needs);assert.equal(input('Eating preferences').value,'Mostly plant-based');assert.equal(input('Food preferences').value,'Unsweetened cereal');assert.equal(input('Height in feet').value,'5');assert.equal(input('Height in inches').value,'8');assert.equal(input('Weight in pounds').value,'150');
 chip('Centimeters').onPress();await flush(Needs);assert.equal(input('Height in centimeters').value,'172.72');
 chip('Kilograms').onPress();await flush(Needs);assert.ok(Math.abs(Number(input('Weight in kilograms').value)-68.0388555)<0.000001);
 saveMode='failure';input('Weight in kilograms').onChangeText('72');await flush(Needs);button('Save my needs').onPress();await flush(Needs);
 assert.equal(routes.length,0);assert.equal(input('Weight in kilograms').value,'72');assert.ok(text().includes('Could not save'));
 saveMode='success';button('Save my needs').onPress();await flush(Needs);assert.equal(routes[0],'/');assert.equal(profile.bodyMeasurements.weight.value,72);

 reset();await flush(Needs);input('Height in centimeters').onChangeText('');await flush(Needs);const before=saveCalls;
 button('Save my needs').onPress();await flush(Needs);assert.equal(saveCalls,before);assert.equal(routes.length,0);assert.ok(text().includes('Enter both height and weight'));
 button('Clear height and weight').onPress();await flush(Needs);button('Save my needs').onPress();await flush(Needs);
 assert.equal(profile.bodyMeasurements,undefined);assert.equal(profile.weightContextConsent,undefined);assert.equal(routes[0],'/');

 reset();await flush(Needs);fill();await flush(Needs);saveMode='pending';const count=saveCalls;const press=button('Save my needs').onPress;
 press();press();await flush(Needs);assert.equal(saveCalls,count+1);assert.equal(routes.length,0);assert.equal(button('Saving…').disabled,true);
 finishSave();await flush(Needs);assert.equal(routes[0],'/');saveMode='success';

 reset();profile={...profile,pregnancy:'pregnant'};await flush(Needs);
 assert.equal(core.internalWeightCategory(profile),null);assert.ok(!text().includes('obese'));assert.ok(!text().includes('good weight'));
 // Exercise the production onboarding route, including a fresh mount after the
 // root provider's setup/shopping key changes. Failed/pending writes must not leave.
 const Onboarding=load('apps/mobile/src/app/onboarding.tsx').default;
 reset();profile={...core.sampleProfile,bodyMeasurements:undefined};onboardingComplete=false;
 await flush(Onboarding);input('Age in years').onChangeText('42');fill();await flush(Onboarding);
 saveMode='failure';button('Save and start exploring').onPress();await flush(Onboarding);
 assert.equal(routes.length,0);assert.equal(onboardingComplete,false);assert.equal(input('Age in years').value,'42');assert.ok(text().includes('Could not save'));
 saveMode='pending';const initialSaves=saveCalls;const save=button('Save and start exploring').onPress;save();save();await flush(Onboarding);
 assert.equal(saveCalls,initialSaves+1);assert.equal(routes.length,0);assert.equal(button('Saving…').disabled,true);
 finishSave();await flush(Onboarding);assert.deepEqual(routes,['/']);assert.equal(profile.age,42);assert.equal(profile.bodyMeasurements.height.value,68);assert.equal(profile.bodyMeasurements.weight.value,150);
 reset();await flush(Onboarding);assert.deepEqual(routes,['/'],'Committed setup must redirect after navigator remount');assert.equal(nodes().some(n=>n.type==='TextInput'),false);
 reset();onboardingComplete=false;saveMode='success';profile={...core.sampleProfile,bodyMeasurements:undefined};await flush(Onboarding);
 input('Age in years').onChangeText('42');await flush(Onboarding);button('Save and start exploring').onPress();await flush(Onboarding);assert.deepEqual(routes,['/']);assert.equal(profile.bodyMeasurements,undefined);
 reset();profile={...core.sampleProfile,primary:'noConcern',conditions:[]};await flush(Needs);
 for(const label of ['Hypertension','Type 2 diabetes / prediabetes','High Cholesterol / Heart Health']){chip(label).onPress();await flush(Needs);}
 assert.deepEqual(profile.conditions,[],'Edits should not mutate the saved profile before Save');
 for(const label of ['Hypertension','Type 2 diabetes / prediabetes','High Cholesterol / Heart Health'])assert.equal(chip(label).selected,true);
 button('Save my needs').onPress();await flush(Needs);
 assert.deepEqual(profile.conditions,['hypertension','diabetes','cardiovascular']);
 reset();await flush(Needs);
 for(const label of ['Hypertension','Type 2 diabetes / prediabetes','High Cholesterol / Heart Health'])assert.equal(chip(label).selected,true);
 chip('Hypertension').onPress();await flush(Needs);button('Save my needs').onPress();await flush(Needs);
 assert.deepEqual(profile.conditions,['diabetes','cardiovascular']);assert.equal(profile.primary,'diabetes');
 console.log('Multiple health concerns: hypertension + diabetes + high cholesterol save/reload and independent deselection passed.');
 console.log('Onboarding: failed-save retention, pending/double-save protection, completed-save home redirect, navigator remount and optional measurements passed.');
 console.log('Needs UI: save-success home navigation, failed-save retention/retry, no double-save, units/reload, validation, clear and hidden context passed (native boundaries mocked).');
 reset();
})().catch(error=>{reset();console.error(error);process.exitCode=1;});
