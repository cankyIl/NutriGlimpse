import {useEffect,useRef,useState} from 'react';
import {AppState,Text,TextInput,View} from 'react-native';
import {useLocalSearchParams,router} from 'expo-router';
import {readLocalProduct,readLocalReceipt,localFoodReviewSchema,localReceiptKinds,localReceiptSummary,labelCatalogDifferences,fetchComparableFoods,type LocalFoodReview,type ProductLabelDraft,type ReceiptDraft,type PublicFood} from '@grocery/core';
import type {OcrPage} from '../../../../packages/core/src/inputPrivacy';
import {photoReviewTransfer} from '../state/PhotoReviewState';
import {prepareFoodSource} from '../storage/foodInput';
import {recordId,useAppState} from '../state/AppState';
import {CatalogMatch} from '../ui/CatalogMatch';
import {CatalogAlternatives} from '../ui/CatalogAlternatives';
import {LabelChecks} from '../ui/LabelChecks';
import {Page,Back,Title,Heading,Body,Button,Card,Chip,Status,s} from '../ui/components';
import {openRepository} from '../storage/repository';
import {RetailerCheck} from '../ui/RetailerCheck';
type Draft=ProductLabelDraft|ReceiptDraft;
function fixture(kind:'product'|'receipt'):OcrPage[]{
 const texts=kind==='product'?['Product: Fictional oats','Variant: Plain','Serving size 1/2 cup (40 g)','Amount per serving','Calories 150','Total Sugars 1 g','Dietary Fiber 4 g','Saturated Fat 0.5 g','Sodium 0 mg','Potassium 150 mg','Ingredients: Whole grain oats','May contain wheat']:['Wegmans','10/14/2026','OAT CEREAL 3.99','APPLES 1.25 lb 2.49','PAPER TOWELS 5.99','COUPON -1.00','TOTAL 11.47','VISA 1234 5678 9012 3456','Customer: Fictional Person'];
 return [{page:1,width:1000,height:1500,lines:texts.map((text,i)=>({id:'fixture-'+i,text,x:20,y:20+i*40,width:900,height:30,confidence:1}))}];
}
function CatalogComparison({food,storeName}:{food:PublicFood;storeName?:string}){
 const [pool,setPool]=useState<PublicFood[]>([]),[now,setNow]=useState(Date.now),[message,setMessage]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  if(food.comparisonGroup)void fetchComparableFoods(food.comparisonGroup!,controller.signal).then(result=>{if(!controller.signal.aborted){setPool(result);setNow(Date.now());}}).catch(()=>{if(!controller.signal.aborted)setMessage('Alternatives unavailable offline. The confirmed catalog snapshot is still shown.');});
  const timer=setInterval(()=>setNow(Date.now()),30000),listener=AppState.addEventListener('change',value=>{if(value==='active')setNow(Date.now());});
  return()=>{controller.abort();clearInterval(timer);listener.remove();};
 },[food]);
 return <Card><Heading>{food.name}</Heading><Body>Confirmed catalog snapshot · {food.brand??'Brand unknown'}</Body>{storeName&&<Body>Receipt retailer: {storeName}. Availability is unverified.</Body>}
 <LabelChecks food={food} mode="standard" now={now}/>
 <RetailerCheck food={food} retailerName={storeName}/>
 <CatalogAlternatives now={now} food={food} pool={pool} metric="sodiumMg" offline={pool.length===0} retailerName={storeName} onSave={candidate=>void openRepository().then(repo=>repo.publicFoods!.save(candidate)).then(()=>setMessage('Alternative saved offline.')).catch(()=>setMessage('Could not save the alternative.'))}/>
 {!!message&&<Status>{message}</Status>}</Card>;
}
export default function FoodReview(){
 const state=useAppState(),params=useLocalSearchParams<{kind?:string;id?:string;cameraResult?:string}>(),existing=state.foodReviews?.find(r=>r.id===params.id);
 const kind=params.kind==='receipt'||existing?.draft.kind==='receipt'?'receipt':'product';
 const [draft,setDraft]=useState<Draft|null>(()=>{if(existing)return existing.draft;const pages=params.cameraResult?photoReviewTransfer.take(params.cameraResult):null;return pages?readLocalProduct(pages):null;}),[matches,setMatches]=useState<LocalFoodReview['matches']>(existing?.matches??[]);
 const [corrected,setCorrected]=useState<string[]>(existing?.correctedFields??[]),[synthetic,setSynthetic]=useState(existing?.synthetic??!params.cameraResult),[sourcePages,setSourcePages]=useState(existing?.sourcePages??1);
 const [numeric,setNumeric]=useState<Record<string,string>>({});
 const [removed,setRemoved]=useState<ReceiptDraft['lines'][number]|null>(null);
 const invalidNumeric=Object.entries(numeric).some(([key,value])=>value.trim()!==''&&(!/^\d+(?:\.\d*)?$/.test(value)||!Number.isFinite(Number(value))||Number(value)>(key==='servingGrams'?2000:key.startsWith('line:')?10000:100000)||((key==='servingGrams'||key.startsWith('line:'))&&Number(value)<=0)));
 const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const raw=useRef<OcrPage[]>([]),request=useRef<AbortController|null>(null),base=useRef(existing??null),saving=useRef(false),mounted=useRef(true);
 useEffect(()=>{
  mounted.current=true;
  const listener=AppState.addEventListener('change',value=>{if(value==='background'&&!request.current){raw.current=[];setDraft(base.current?.draft??null);setMatches(base.current?.matches??[]);setNumeric({});setRemoved(null);setCorrected(base.current?.correctedFields??[]);setSynthetic(base.current?.synthetic??true);setSourcePages(base.current?.sourcePages??1);setConfirmed(false);setMessage('Unsaved source review cleared while the app was in the background. Saved reviews remain available.');}});
  return()=>{mounted.current=false;request.current?.abort();raw.current=[];listener.remove();};
 },[]);
 function change(next:Draft,key:string){
  setDraft(next);setConfirmed(false);setCorrected(list=>list.includes(key)?list:[...list,key]);setMessage('');
  if(key.startsWith('line:'))setMatches(list=>list.filter(m=>m.lineId!==key.split(':')[1]));
  else if(key==='name'||key==='variant')setMatches([]);
 }
 function correctedField<T,>(value:T,old:{source:{page:number;lineIds:string[]}}|null|undefined){return {value,source:old?.source??{page:1,lineIds:['user-correction']},uncertain:true};}
 function showPages(pages:OcrPage[],isSynthetic:boolean){
  const next=kind==='product'?readLocalProduct(pages):readLocalReceipt(pages);
  setNumeric({});setRemoved(null);setDraft(next);setSynthetic(isSynthetic);setSourcePages(pages.length);setMatches([]);setCorrected([]);setConfirmed(false);
  setMessage('Check every retained field against your source. Missing and uncertain facts remain unresolved. No image or receipt text was uploaded.');
 }
 function demo(){raw.current=fixture(kind);base.current=null;showPages(raw.current,true);}
 async function read(method:'camera'|'document'){
  if(request.current||saving.current)return;
  const controller=new AbortController();request.current=controller;setBusy(true);
  try{
   const source=await prepareFoodSource(method,controller.signal);if(!source)return;
   try{
    const pages=await source.read();if(controller.signal.aborted||!mounted.current)return;
    if(synthetic)raw.current=[];
    if(raw.current.length+pages.length>10)throw Error('Use no more than ten pages per review.');
    const offset=raw.current.length;raw.current=[...raw.current,...pages.map((page,i)=>({...page,page:offset+i+1}))];
    base.current=null;showPages(raw.current,false);
   }finally{await source.dispose();}
  }catch{if(mounted.current)setMessage(controller.signal.aborted?'Reading cancelled.':'Product and receipt camera imports await native privacy acceptance. Try the fictional review or use barcode/catalog lookup. No file was uploaded.');}
  finally{request.current=null;if(mounted.current)setBusy(false);}
 }
 async function save(){
  if(!draft||!confirmed||saving.current||invalidNumeric)return;
  saving.current=true;setBusy(true);
  try{
   const now=new Date().toISOString(),record=localFoodReviewSchema.parse({id:base.current?.id??recordId(),kind:'local-food-review',createdAt:base.current?.createdAt??now,updatedAt:now,synthetic,sourcePages,draft,confirmed:true,correctedFields:corrected,matches});
   if(!await state.saveFoodReview(record,base.current))throw Error('Save failed');
   base.current=record;raw.current=[];setMessage('Compact review saved privately. Original images and OCR transcript are not saved. Unresolved items stay unresolved.');
  }catch{setMessage('Could not save this review. Check the fields or reopen a changed review from History. Your draft is still here.');}
  finally{saving.current=false;if(mounted.current)setBusy(false);}
 }
 function match(lineId:string,food:PublicFood){setMatches(list=>[...list.filter(m=>m.lineId!==lineId),{lineId,food,confirmedAt:new Date().toISOString()}]);setConfirmed(false);}
 if(params.id&&!existing)return <Page><Back/><Title>Review unavailable</Title><Body>This saved review was deleted.</Body></Page>;
 const summary=draft?.kind==='receipt'?localReceiptSummary(draft,matches):null;
 return <Page><Back/><Title eyebrow={params.cameraResult?'NUTRIENT TABLE':synthetic?'FICTIONAL LOCAL REVIEW':'LOCAL SOURCE REVIEW'}>{params.cameraResult?'Check your Nutrition Facts.':kind==='receipt'?'Review your basket.':'Read the package carefully.'}</Title>
 <Body>Source reading, corrections and saved reviews stay on this device. Catalog searches send only the food words you explicitly submit. Medical ratings and verified dietary claims are not created from a photo.</Body>
 {!params.id&&!params.cameraResult&&<><Button label={'Try a fictional '+kind+' review'} disabled={busy} onPress={demo}/><Button secondary label="Photograph a page · awaiting device checks" disabled={busy} onPress={()=>void read('camera')}/><Button secondary label="Add a photo or PDF · awaiting device checks" disabled={busy} onPress={()=>void read('document')}/></>}
 {params.cameraResult&&<><Body>Check each number and the serving size against the package. Missing or unclear values stay unknown.</Body><Button secondary label="Retake the nutrient table" onPress={()=>router.replace({pathname:'/capture',params:{mode:'nutrition'}})}/>{!draft&&<Status>This photo review expired or was cleared. Please take another photo.</Status>}</>}
 {busy&&<Button secondary label="Cancel reading" onPress={()=>request.current?.abort()}/>}
 <Button secondary label="Use barcode or catalog lookup" onPress={()=>router.push('/catalog')}/>
 {draft&&<><Body muted>{sourcePages} source page(s) · {draft.issues.join(', ')||'Review required'}. Clearer additional photos may resolve missing text. Conflicting nutrition values are left blank; do not mix two packages.</Body>
 {draft.kind==='product-label'?<>
 <Card><Heading>Package observations</Heading>
 {(params.cameraResult?(['servingText'] as const):(['name','variant','servingText','ingredients','allergens','frontLabelText','advisoryStatement'] as const)).map(key=><View key={key}><Text style={s.small}>{key}</Text><TextInput accessibilityLabel={'Package '+key} multiline={key==='ingredients'} style={s.body} editable={!busy} value={draft[key]?.value??''} maxLength={key==='ingredients'?10000:key==='name'||key==='variant'?300:key==='servingText'?200:2000} onChangeText={value=>change({...draft,[key]:value?correctedField(value,draft[key]):null},key)}/></View>)}
 <Body>Nutrition amount basis must match the photographed panel.</Body><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{(['unknown','per-serving','per-100g'] as const).map(basis=><Chip key={basis} label={basis} selected={draft.nutritionBasis===basis} disabled={busy} onPress={()=>change({...draft,nutritionBasis:basis},'nutritionBasis')}/>)}</View>
 <Text style={s.small}>Serving grams: {draft.servingGrams?.value??'Unknown'} · source values below are not an intake recommendation.</Text>
 <TextInput accessibilityLabel="Reviewed serving grams" keyboardType="decimal-pad" style={s.body} value={numeric.servingGrams??String(draft.servingGrams?.value??'')} placeholder="Serving grams, if printed" editable={!busy} onChangeText={value=>{setNumeric(v=>({...v,servingGrams:value}));setConfirmed(false);if(value===''||/^\d+(?:\.\d*)?$/.test(value)&&Number(value)>0&&Number(value)<=2000)change({...draft,servingGrams:value?correctedField(Number(value),draft.servingGrams):null},'servingGrams');}}/>
 {[...Object.entries(draft.nutrients),...Object.entries(draft.additionalNutrients??{})].map(([key,value])=><View key={key}><Text style={s.small}>{key} ({key==='calories'?'kcal':['sodium','potassium','magnesium','calcium'].includes(key)?'mg':'g'})</Text><TextInput accessibilityLabel={'Reviewed package '+key} keyboardType="decimal-pad" value={numeric[key]??String(value?.value.amount??'')} style={s.body} editable={!busy} placeholder="Unknown" onChangeText={text=>{setNumeric(v=>({...v,[key]:text}));setConfirmed(false);if(text===''||/^\d+(?:\.\d*)?$/.test(text)&&Number(text)<=100000){const unit=key==='calories'?'kcal':['sodium','potassium','magnesium','calcium'].includes(key)?'mg':'g';const next=text?correctedField({amount:Number(text),unit},value):null;change(key in draft.nutrients?{...draft,nutrients:{...draft.nutrients,[key]:next}}:{...draft,additionalNutrients:{...draft.additionalNutrients!,[key]:next}},key);}}}/></View>)}
 <Body muted>Edited fields are marked as user corrections, never verified catalog facts. A photographed gluten-free claim is still unverified.</Body>
 </Card>
 <CatalogMatch disabled={busy} onConfirm={food=>match('product',food)}/>
 {matches.map(item=>{const difference=labelCatalogDifferences(draft,item.food);return <View key={item.lineId}><Card><Heading>Package versus catalog</Heading><Body>{difference.comparable?(difference.differences.length?'Different amounts were found. Keep package observations and catalog nutrition separate; verify the exact formulation.':'No material difference among the nutrient values present in both sources. This does not verify identity or missing fields.'):'A clear package amount basis and weight are needed before checking nutrient differences.'}</Body>{difference.differences.map(d=><Body key={d.nutrient}>{d.nutrient}: package {Number(d.observed.toFixed(2))} versus catalog {d.catalog} {d.unit} per 100 g</Body>)}<Button secondary label="Remove catalog match" onPress={()=>{setMatches([]);setConfirmed(false);}}/></Card><CatalogComparison food={item.food}/></View>;})}
 </>:<>
 <Card><Heading>Purchase context</Heading><TextInput accessibilityLabel="Confirmed receipt retailer" value={draft.retailerText?.value??''} maxLength={200} style={s.body} editable={!busy} onChangeText={value=>change({...draft,retailerText:value?correctedField(value,draft.retailerText):null},'retailer')}/><TextInput accessibilityLabel="Printed purchase date" value={draft.printedDateText?.value??''} placeholder="Printed date, or leave unknown" maxLength={80} style={s.body} editable={!busy} onChangeText={value=>change({...draft,printedDateText:value?correctedField(value,draft.printedDateText):null},'date')}/><Body>{summary?.matched} confirmed catalog matches · {summary?.unresolved} unresolved · {summary?.excluded} excluded. Source coverage remains partial until you inspect all receipt pages.</Body><Body>Purchased quantities do not say who ate the food or how much. Refunds, tax, discounts and non-food lines are excluded from comparisons.</Body></Card>
 {draft.lines.map(line=><Card key={line.id}><Heading>{line.description?.value??'Unresolved line'}</Heading><Text style={s.small}>Page {line.description?.source.page??'?'} · {line.quantity?.value.amount??'Unknown'} {line.quantity?.value.unit??'quantity'} purchased</Text>
 <TextInput accessibilityLabel={'Reviewed description '+line.id} value={line.description?.value??''} maxLength={500} editable={!busy} style={s.body} onChangeText={value=>change({...draft,lines:draft.lines.map(l=>l.id===line.id?{...l,description:value?correctedField(value,l.description):null}:l)},'line:'+line.id+':description')}/>
 <TextInput accessibilityLabel={'Purchase quantity '+line.id} keyboardType="decimal-pad" style={s.body} editable={!busy} value={numeric['line:'+line.id]??String(line.quantity?.value.amount??'')} placeholder="Unknown quantity" onChangeText={value=>{setNumeric(v=>({...v,['line:'+line.id]:value}));setConfirmed(false);if(value===''||/^\d+(?:\.\d*)?$/.test(value)&&Number(value)>0&&Number(value)<=10000)change({...draft,lines:draft.lines.map(l=>l.id===line.id?{...l,quantity:value?correctedField({amount:Number(value),unit:l.quantity?.value.unit??'item'},l.quantity):null}:l)},'line:'+line.id+':quantity');}}/>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{(['item','lb','kg'] as const).map(unit=><Chip key={unit} label={unit} selected={line.quantity?.value.unit===unit} disabled={busy||!line.quantity} onPress={()=>change({...draft,lines:draft.lines.map(l=>l.id===line.id?{...l,quantity:correctedField({amount:l.quantity!.value.amount,unit},l.quantity)}:l)},'line:'+line.id+':unit')}/>)}</View>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{localReceiptKinds.map(item=><Chip key={item} label={item} selected={line.kind===item} disabled={busy} onPress={()=>change({...draft,lines:draft.lines.map(l=>l.id===line.id?{...l,kind:item}:l)},'line:'+line.id+':kind')}/>)}</View>
 {line.kind==='food'&&<CatalogMatch disabled={busy} onConfirm={food=>match(line.id,food)}/>}
 {matches.filter(m=>m.lineId===line.id).map(m=><CatalogComparison key={m.food.provider+m.food.id} food={m.food} storeName={draft.retailerText?.value??'Unconfirmed receipt store'}/>)}
 <Button secondary label="Remove this receipt line" disabled={busy} onPress={()=>{setRemoved(line);setNumeric(v=>{const next={...v};delete next['line:'+line.id];return next;});change({...draft,lines:draft.lines.filter(l=>l.id!==line.id)},'line:'+line.id+':remove');}}/>
 </Card>)}
 {removed&&<Button secondary label="Undo last removed line" disabled={busy} onPress={()=>{change({...draft,lines:[...draft.lines,removed]},'line:'+removed.id+':restore');setRemoved(null);}}/>}
 <Button secondary label="Add an unread receipt item" disabled={busy||draft.lines.length>=300} onPress={()=>{const id='review-'+recordId();change({...draft,lines:[...draft.lines,{id,description:null,kind:'unknown',quantity:null}]},'line:'+id+':add');}}/>
 {draft.lines.length===0&&<Body>No eligible item rows were read. This is not proof that the receipt contains no food. Try clearer photos or keep the source unresolved.</Body>}
 </>}
 <Chip label="I reviewed the retained fields and exact product matches" selected={confirmed} disabled={busy} onPress={()=>setConfirmed(!confirmed)}/>
 <Button label="Save compact review on this device" disabled={busy||!confirmed||invalidNumeric} onPress={()=>void save()}/>
 <Button secondary label="Discard unsaved review" disabled={busy} onPress={()=>{raw.current=[];setDraft(base.current?.draft??null);setMatches(base.current?.matches??[]);setNumeric({});setRemoved(null);setCorrected(base.current?.correctedFields??[]);setSynthetic(base.current?.synthetic??true);setSourcePages(base.current?.sourcePages??1);setConfirmed(false);setMessage('Unsaved source review discarded.');}}/>
 </>}
 {invalidNumeric&&<Status>Check numeric corrections before saving. Leave unreadable values blank.</Status>}
 {!!message&&<Status>{message}</Status>}
 </Page>;
}
