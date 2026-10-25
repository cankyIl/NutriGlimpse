import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { assessSample, type PanelRecord, type Product, type ReceiptRecord } from '@grocery/core';
import { runFictionalIntake, type IntakeKind } from '../../../../packages/core/src/intake';
import { inputAdapter, requestPersonalInput } from '../storage/inputSource';
import { recordId, useAppState } from '../state/AppState';
import { Page, Back, Title, Body, Status, Card, Heading, Button, Chip, s } from '../ui/components';
import {betaCatalogUrl} from '@grocery/core';
import { requestFictionalBackend } from '../../../../packages/core/src/fictionalBackend';
type Review = {kind:'report'; record:Extract<PanelRecord,{synthetic:true}>}|{kind:'receipt'; record:ReceiptRecord}|{kind:'product'; record:Product};
export default function Intake() {
 const state=useAppState();
 const params=useLocalSearchParams<{kind?:string}>();
 const backendUrl=betaCatalogUrl;
 const kind:IntakeKind=params.kind==='report'||params.kind==='receipt'?params.kind:'product';
 const [review,setReview]=useState<Review|null>(null);
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [numericDraft,setNumericDraft]=useState<Record<string,string>>({});
 const [confirmed,setConfirmed]=useState(false);
 const controller=useRef<AbortController|null>(null);
 const mounted=useRef(true);
 const saving=useRef(false);
 useEffect(()=>{
  mounted.current=true;
  const sub=AppState.addEventListener('change',status=>{if(status!=='active'){controller.current?.abort();setReview(null);setConfirmed(false);}});
  return()=>{mounted.current=false;controller.current?.abort();sub.remove();};
 },[]);
 async function read(pdf=false,server=false){
  if(controller.current||saving.current)return;
  const operation=new AbortController();controller.current=operation;setBusy(true);setReview(null);setConfirmed(false);setNumericDraft({});
  setMessage(server?'Requesting a built-in AI example from the test server…':'Reading fictional input locally…');
  try{
   const result=server?await requestFictionalBackend(kind,backendUrl,operation.signal):await runFictionalIntake(kind,inputAdapter,operation.signal,pdf);
   if(!mounted.current||operation.signal.aborted)return;
   const id=recordId();const now=new Date().toISOString();
   if(result.kind==='report')setReview({kind:'report',record:{id,kind:'report',testDate:result.data.testDate,importedAt:now,confirmed:false,measurements:result.data.measurements.map(v=>({...v.measurement,sourcePage:v.sourcePage,printedRange:v.printedRange,printedFlag:v.printedFlag})),fingerprint:result.fingerprint,synthetic:true,status:'needs-confirmation',analysis:null}});
   else if(result.kind==='receipt')setReview({kind:'receipt',record:{id,kind:'receipt',createdAt:now,receiptDate:result.data.printedDateText?.value??null,retailer:result.data.retailerText?.value??'Unknown retailer',synthetic:true,profile:state.profile,lines:result.data.lines.map(l=>({id:l.id,text:l.description?.value??'Unreadable item',kind:l.kind,productId:null,quantity:l.quantity?.value.amount??1,unit:l.quantity?.value.unit??'item'}))}});
   else {
    const d=result.data;
    setReview({kind:'product',record:{id,name:d.name?.value??'Unknown product',variant:d.variant?.value??'Unconfirmed variant',category:'Unconfirmed',form:'packaged',serving:d.servingText?.value??'Unknown serving',servingGrams:d.servingGrams?.value??null,ingredients:d.ingredients?.value??null,nutrients:{calories:d.nutrients.calories?.value.amount??null,fiber:d.nutrients.fiber?.value.amount??null,saturatedFat:d.nutrients.saturatedFat?.value.amount??null,sodium:d.nutrients.sodium?.value.amount??null,sugars:d.nutrients.sugars?.value.amount??null},compliance:{vegetarian:'unverified',eggFree:'unverified',dairyFree:'unverified',halal:'unverified',kosher:'unverified',glutenFree:'unverified'},retailers:[],source:{id:result.mode==='server'?'fictional-server-intake':'fictional-local-intake',title:result.mode==='server'?'Fictional label, server AI example':'Fictional label, locally extracted',version:'1',synthetic:true},illustration:'oats',fixtureRating:null}});
   }
   setMessage(result.mode==='server'?'Server-prepared fictional example from GPT-6 Luna. No device image or text was uploaded. Review every value.':(result.mode==='simulated'?'Browser simulation; no files opened. ':'Native reading completed; temporary files cleaned. ')+result.sanitized.removedLines+' lines excluded by the fictional filter. Nothing uploaded. Review every retained value.'+(result.data.issues.includes('partial-source')?' Some source facts were not recovered; check for missing items or values.':''));
  }catch{if(mounted.current)setMessage(operation.signal.aborted?'Reading cancelled. No draft saved.':server?'Test server unavailable or result rejected. No draft saved. Check your connection and retry.':'Could not read the supported fictional source or finish cleanup. Nothing saved. Retry with a current phone build.');}
  finally{controller.current=null;if(mounted.current)setBusy(false);}
 }
 async function save(){
  if(!review||!confirmed||saving.current)return;
  saving.current=true;setBusy(true);
  try{
   if(review.kind==='report'){
    const result=await state.savePanel({...review.record,confirmed:true,status:'ready'});
    if(!result)throw Error('Save failed');
    router.replace({pathname:'/report',params:{id:result.id}});
   }else if(review.kind==='receipt'){
    if(!await state.saveReceipt(review.record,null))throw Error('Save failed');
    router.replace({pathname:'/receipt',params:{id:review.record.id}});
   }else{
    const product={...review.record,nutrients:{...review.record.nutrients}};
    for(const [key,value] of Object.entries(numericDraft)){
      if(value.trim()!=='' && !/^\d+(\.\d+)?$/.test(value.trim()))throw Error('Invalid numeric value');
      const parsed=value.trim()===''?null:Number(value);
      if(parsed!==null && (!Number.isFinite(parsed)||parsed>100000))throw Error('Invalid numeric value');
      if(key==='servingGrams'){if(parsed!==null&&parsed<=0)throw Error('Invalid serving');product.servingGrams=parsed;}
      else product.nutrients[key as keyof Product['nutrients']]=parsed;
    }
    const id=await state.saveScan(product,assessSample(product,state.profile));
    if(!id)throw Error('Save failed');
    router.replace({pathname:'/result',params:{saved:id}});
   }
  }catch{setMessage('Could not save. Check the printed date and values. Your review is still here; retry when storage is available.');}
  finally{saving.current=false;if(mounted.current)setBusy(false);}
 }
 return <Page><Back/><Title eyebrow="FICTIONAL INPUT REVIEW">Read a {kind}.</Title>
  <Body>Try the complete local reading and review flow with generated examples. This screen uses fictional examples. Use Add a lipid report for optional personal report import.</Body>
  <Button label={busy?'Working…':'Read fictional '+kind+' image'} disabled={busy} onPress={()=>void read()}/>
  {kind==='report'&&Platform.OS!=='web'&&<Button secondary label="Read fictional two-page PDF" disabled={busy} onPress={()=>void read(true)}/>}
  <Button secondary label="Review a server AI example" disabled={busy||!backendUrl} onPress={()=>void read(false,true)}/>
  <Button secondary label="Food facts" disabled={busy} onPress={()=>router.push('/catalog')}/><Body muted>{backendUrl?'Only the example type is sent. Examples reuse saved fictional AI results without a new paid request.':'Server AI examples will be available after the secure beta server address is configured.'}</Body>
  {busy&&<Button secondary label="Cancel reading" onPress={()=>controller.current?.abort()}/>}
  <Button secondary label="Personal camera / document access: locked" disabled={busy} onPress={()=>void requestPersonalInput('document').catch(()=>setMessage('Personal capture is disabled before any permission request or file picker. Device privacy verification and provider setup are still required.'))}/>
  {review&&<Card><Heading>Review before saving</Heading>
   {review.kind==='report'?<>
    <TextInput accessibilityLabel="Extracted report date" style={s.body} editable={!busy} value={review.record.testDate??''} placeholder="YYYY-MM-DD" onChangeText={testDate=>{setConfirmed(false);setReview({...review,record:{...review.record,testDate}});}}/>
    {review.record.measurements.map((m,i)=><Card key={m.analyte}><Body>{m.analyte} · {m.comparator} · {m.unit} · page {m.sourcePage}</Body><TextInput accessibilityLabel={'Extracted '+m.analyte} style={s.body} editable={!busy} keyboardType="decimal-pad" value={m.rawValue} onChangeText={rawValue=>{setConfirmed(false);setReview({...review,record:{...review.record,measurements:review.record.measurements.map((v,j)=>i===j?{...v,rawValue}:v)}});}}/></Card>)}
   </>:review.kind==='receipt'?<><Body>{review.record.retailer} · {review.record.receiptDate??'Date missing'}</Body>{review.record.lines.map(l=><Body key={l.id}>{l.text} · {l.quantity} {l.unit} · {l.kind}</Body>)}<Body>Items start unmatched. Continue to receipt review to correct lines and choose exact sample matches.</Body></>:<>
    <TextInput accessibilityLabel="Extracted product name" style={s.body} editable={!busy} value={review.record.name} onChangeText={name=>{setConfirmed(false);setReview({...review,record:{...review.record,name}});}}/>
    <TextInput accessibilityLabel="Extracted variant" style={s.body} editable={!busy} value={review.record.variant} onChangeText={variant=>{setConfirmed(false);setReview({...review,record:{...review.record,variant}});}}/>
    <TextInput accessibilityLabel="Extracted serving" style={s.body} editable={!busy} value={review.record.serving} onChangeText={serving=>{setConfirmed(false);setReview({...review,record:{...review.record,serving}});}}/>
    <TextInput accessibilityLabel="Extracted ingredients" style={s.body} multiline editable={!busy} value={review.record.ingredients??''} onChangeText={ingredients=>{setConfirmed(false);setReview({...review,record:{...review.record,ingredients:ingredients||null}});}}/>
    <Body>Amounts per 1× printed portion. Leave missing facts blank.</Body>
    {Object.entries({...review.record.nutrients,servingGrams:review.record.servingGrams}).map(([name,value])=><Card key={name}><Body>{name} ({name==='calories'?'kcal':name==='sodium'?'mg':'g'})</Body><TextInput accessibilityLabel={'Extracted '+name} style={s.body} editable={!busy} keyboardType="decimal-pad" value={numericDraft[name]??(value===null?'':String(value))} onChangeText={text=>{setConfirmed(false);setNumericDraft(p=>({...p,[name]:text}));}}/></Card>)}
    <Body>Identity and dietary certifications are unverified. No health rating or compatible alternatives are inferred from this extraction.</Body>
   </>}
   <Chip label="I checked the fictional extracted values" selected={confirmed} disabled={busy} onPress={()=>setConfirmed(!confirmed)}/>
   <Button label={review.kind==='receipt'?'Save draft and review receipt':'Save confirmed fictional result'} disabled={busy||!confirmed} onPress={()=>void save()}/>
   <Button secondary label="Discard this draft" disabled={busy} onPress={()=>{setReview(null);setConfirmed(false);setMessage('Draft discarded.');}}/>
  </Card>}
  {!!message&&<Status>{message}</Status>}
 </Page>;
}
