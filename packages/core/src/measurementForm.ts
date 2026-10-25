import {bodyMeasurementsSchema,toHeightCm,toWeightKg,type BodyMeasurements} from './weightContext.ts';
export interface MeasurementDraft {heightUnit:'cm'|'in';weightUnit:'kg'|'lb';height:string;inches:string;weight:string}
const format=(value:number)=>String(Number(value.toFixed(6)));
export function measurementDraft(saved?:BodyMeasurements):MeasurementDraft{
 const height=saved?.height;
 return {heightUnit:height?.unit??'in',weightUnit:saved?.weight.unit??'lb',
  height:height?height.unit==='in'?String(Math.floor(height.value/12)):String(height.value):'',
  inches:height?.unit==='in'?format(height.value%12):'',weight:saved?String(saved.weight.value):''};
}
function number(value:string,label:string){
 if(!/^\d+(?:\.\d+)?$/.test(value.trim())||value.trim().length>16)throw Error('Enter '+label+' using numbers and check the units.');
 return Number(value.trim());
}
function heightValue(draft:MeasurementDraft){
 if(draft.heightUnit==='cm')return number(draft.height,'height');
 const feet=number(draft.height,'feet'),inches=draft.inches.trim()?number(draft.inches,'inches'):0;
 if(!Number.isInteger(feet)||inches>=12)throw Error('Use whole feet and inches from 0 to less than 12.');
 return feet*12+inches;
}
export function changeMeasurementUnit(draft:MeasurementDraft,kind:'height'|'weight',unit:'cm'|'in'|'kg'|'lb'):MeasurementDraft{
 if(kind==='height'&&(unit==='cm'||unit==='in')){
  if(unit===draft.heightUnit)return draft;
  const empty=!draft.height.trim()&&!draft.inches.trim();
  const cm=empty?0:toHeightCm(heightValue(draft),draft.heightUnit),inch=cm/2.54;
  return {...draft,heightUnit:unit,height:empty?'':unit==='cm'?format(cm):String(Math.floor(inch/12)),inches:empty||unit==='cm'?'':format(inch%12)};
 }
 if(kind==='weight'&&(unit==='kg'||unit==='lb')){
  if(unit===draft.weightUnit)return draft;
  const kg=draft.weight.trim()?toWeightKg(number(draft.weight,'weight'),draft.weightUnit):0;
  return {...draft,weightUnit:unit,weight:draft.weight.trim()?format(unit==='kg'?kg:kg/0.45359237):''};
 }
 throw Error('Unsupported measurement unit.');
}
export function parseMeasurementDraft(draft:MeasurementDraft,previous?:BodyMeasurements,now=Date.now()):BodyMeasurements|undefined{
 if(!draft.height.trim()&&!draft.inches.trim()&&!draft.weight.trim())return undefined;
 if(!draft.height.trim()||!draft.weight.trim())throw Error('Enter both height and weight, or clear both.');
 const candidate={height:{value:heightValue(draft),unit:draft.heightUnit},weight:{value:number(draft.weight,'weight'),unit:draft.weightUnit},recordedAt:new Date(now).toISOString()};
 const parsed=bodyMeasurementsSchema.safeParse(candidate);
 if(!parsed.success)throw Error(parsed.error.issues[0].message);
 const unchanged=previous&&Math.abs(toHeightCm(previous.height.value,previous.height.unit)-toHeightCm(candidate.height.value,candidate.height.unit))<0.00001&&
  Math.abs(toWeightKg(previous.weight.value,previous.weight.unit)-toWeightKg(candidate.weight.value,candidate.weight.unit))<0.00001;
 return {...parsed.data,recordedAt:unchanged?previous.recordedAt:candidate.recordedAt};
}
