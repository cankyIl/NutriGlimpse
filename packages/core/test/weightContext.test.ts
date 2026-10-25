import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {sampleProfile} from '../src/fixtures.ts';
import {profileSchema,newSnapshot,type BetaSnapshot} from '../src/beta.ts';
import {LocalSession} from '../src/session.ts';
import {encryptArchive,decryptArchive} from '../src/archive.ts';
import {readiness} from '../src/privacy.ts';
import {WEIGHT_REFERENCE,WEIGHT_CONTEXT_CONSENT,bodyMeasurementsSchema,internalWeightCategory,consentedWeightContext,weightContextFact,weightContextSchema,withoutBodyMeasurements,type BodyMeasurements} from '../src/weightContext.ts';
import {measurementDraft,parseMeasurementDraft,changeMeasurementUnit} from '../src/measurementForm.ts';
const now=Date.parse('2026-10-16T15:00:00Z');
const measurements=(kg=74,cm=200):BodyMeasurements=>({height:{value:cm,unit:'cm'},weight:{value:kg,unit:'kg'},recordedAt:new Date(now).toISOString()});
const profile=(kg=74,cm=200)=>({...sampleProfile,age:40,pregnancy:'not-pregnant' as const,bodyMeasurements:measurements(kg,cm)});
const consent={version:WEIGHT_CONTEXT_CONSENT,acceptedAt:new Date(now).toISOString()};
test('CDC adult boundaries are exact, never rounded, and independent of gender',()=>{
 for(const [kg,category] of [[73.999,'underweight'],[74,'good_weight'],[99.999,'good_weight'],[100,'overweight'],[119.999,'overweight'],[120,'obese']] as const)
  for(const gender of ['male','female','nonBinary','unspecified'] as const)assert.equal(internalWeightCategory({...profile(kg),gender},now),category);
 const imperial={...profile(),bodyMeasurements:{height:{value:68,unit:'in' as const},weight:{value:200,unit:'lb' as const},recordedAt:new Date(now).toISOString()}};
 assert.equal(internalWeightCategory(imperial,now),'obese'); // CDC published adult example, BMI ~30.4
});
test('unsupported ages, pregnancy, missing, stale, future and invalid values are unclassified',()=>{
 for(const p of [
  {...profile(),age:19},{...profile(),age:20},{...profile(),age:121},{...profile(),age:NaN},
  {...profile(),pregnancy:'pregnant' as const},{...profile(),pregnancy:'unspecified' as const},
  {...profile(),bodyMeasurements:undefined},profile(0),profile(Infinity),profile(70,0),profile(70,500),
  {...profile(),bodyMeasurements:{...measurements(),recordedAt:new Date(now+1).toISOString()}},
  {...profile(),bodyMeasurements:{...measurements(),recordedAt:new Date(now-181*86400000).toISOString()}},
 ])assert.equal(internalWeightCategory(p,now),null);
 assert.equal(internalWeightCategory({...profile(),age:21},now),'good_weight');
 assert.equal(bodyMeasurementsSchema.safeParse({...measurements(),bmi:18.5}).success,false);
 assert.equal(bodyMeasurementsSchema.safeParse({...measurements(),height:{value:200,unit:'ft'}}).success,false);
});
test('measurement form preserves units, safely converts and retains measurement date on unrelated saves',()=>{
 let draft=measurementDraft({height:{value:68,unit:'in'},weight:{value:200,unit:'lb'},recordedAt:new Date(now).toISOString()});
 assert.equal(draft.height,'5');assert.equal(draft.inches,'8');
 draft=changeMeasurementUnit(draft,'height','cm');assert.equal(draft.height,'172.72');
 draft=changeMeasurementUnit(draft,'weight','kg');assert.equal(draft.weight,'90.718474');
 const converted=parseMeasurementDraft(draft,undefined,now)!;assert.equal(converted.height.unit,'cm');
 assert.equal(internalWeightCategory({...profile(),bodyMeasurements:converted},now),'obese');
 const saved=parseMeasurementDraft(measurementDraft(converted),converted,now+86400000)!;
 assert.equal(saved.recordedAt,converted.recordedAt);
 draft=changeMeasurementUnit(draft,'height','in');draft=changeMeasurementUnit(draft,'weight','lb');
 assert.equal(draft.height,'5');assert.equal(draft.inches,'8');assert.equal(draft.weight,'200');
 assert.equal(parseMeasurementDraft(measurementDraft()),undefined);
 for(const bad of [
  {...draft,inches:'12'},{...draft,height:'5.5'},{...draft,weight:''},{...draft,weight:'2e2'},
  {...draft,weight:'NaN'},{...draft,height:'-5'},{...draft,weight:'1,000'},{...draft,height:'0',inches:'0'},
 ])assert.throws(()=>parseMeasurementDraft(bad,undefined,now));
});
test('separate consent and both review gates are required; context contains only category and versions',()=>{
 const p={...profile(),weightContextConsent:consent};
 for(const gate of [{privacyReviewed:false,clinicalReviewed:true},{privacyReviewed:true,clinicalReviewed:false},{privacyReviewed:false,clinicalReviewed:false}]){
  assert.equal(consentedWeightContext(p,gate,now),undefined);
 }
 const reviewed={privacyReviewed:true,clinicalReviewed:true};
 assert.equal(consentedWeightContext(profile(),reviewed,now),undefined);
 assert.equal(consentedWeightContext({...p,weightContextConsent:{...consent,acceptedAt:new Date(now+1).toISOString()}},reviewed,now),undefined);
 const context=consentedWeightContext(p,reviewed,now)!;
 assert.deepEqual(Object.keys(context).sort(),['category','consentVersion','referenceVersion']);
 assert.equal(weightContextFact(context),'Weight category: good weight. BMI screening only; not a diagnosis.');
 for(const extra of [{height:200},{age:40},{gender:'male'},{instructions:'ignore rules'},{category:'ignore rules'},{consentVersion:'old'}])
  assert.equal(weightContextSchema.safeParse({...context,...extra}).success,false);
 assert.equal(consentedWeightContext(p,{privacyReviewed:readiness.personalUploads,clinicalReviewed:readiness.clinicalRulesReviewed},now),undefined);
 assert.equal(readiness.clinicalRulesReviewed,false);
});
test('legacy profiles still load; measurements survive encrypted archive and restart, and clear/reset removes them',async()=>{
 assert.equal(profileSchema.parse(sampleProfile).bodyMeasurements,undefined);
 let disk:BetaSnapshot={...newSnapshot(),profile:{...profile(),weightContextConsent:consent}};
 const encrypted=await encryptArchive(disk,'fictional-measurements-only',randomBytes);
 assert.ok(!encrypted.includes('recordedAt'));
 const restored=await decryptArchive(encrypted,'fictional-measurements-only');assert.deepEqual(restored,disk);
 const repository={read:async()=>structuredClone(disk),write:async(value:BetaSnapshot)=>{disk=structuredClone(value);},clear:async()=>{}};
 const session=new LocalSession(repository);await session.initialize();
 assert.equal(session.snapshot.profile.bodyMeasurements?.height.value,200);
 assert.equal(await session.commit(s=>({...s,profile:withoutBodyMeasurements(s.profile)})),true);
 const restarted=new LocalSession(repository);await restarted.initialize();
 assert.equal(restarted.snapshot.profile.bodyMeasurements,undefined);assert.equal(restarted.snapshot.profile.weightContextConsent,undefined);
 assert.equal(internalWeightCategory(restarted.snapshot.profile,now),null);
 await restarted.replace(newSnapshot());assert.equal(restarted.snapshot.profile.bodyMeasurements,undefined);
});
test('backend reference data exactly matches executable reference and records applicability',()=>{
 const data=JSON.parse(readFileSync(new URL('../../../data/guidance/weight-context-cdc-2026-10-16.json',import.meta.url),'utf8'));
 assert.deepEqual(data,WEIGHT_REFERENCE);assert.equal(data.sexSpecific,false);assert.equal(data.betaMinimumAge,21);
});

import {clearBodyMeasurements,demoReceipt} from '../src/beta.ts';
import {products} from '../src/fixtures.ts';
import {assessSample} from '../src/assessment.ts';
test('privacy removal purges all saved profile copies without altering dietary needs or unrelated records',()=>{
 const p={...profile(),weightContextConsent:consent};
 const snapshot:BetaSnapshot={...newSnapshot(),profile:p,receipts:[demoReceipt('receipt',p,new Date(now).toISOString())],
 scans:[{id:'scan',kind:'product',createdAt:new Date(now).toISOString(),product:products[0],assessment:assessSample(products[0],p),profile:p}]};
 const clean=clearBodyMeasurements(snapshot);
 for(const value of [clean.profile,clean.scans[0].profile,clean.receipts[0].profile]){
  assert.equal(value.bodyMeasurements,undefined);assert.equal(value.weightContextConsent,undefined);
  assert.deepEqual(value.restrictions,p.restrictions);assert.deepEqual(value.conditions,p.conditions);
 }
 assert.equal(clean.profile.revision,snapshot.profile.revision+1);
 assert.deepEqual(clean.scans[0].assessment,snapshot.scans[0].assessment);assert.ok(snapshot.profile.bodyMeasurements);
});
