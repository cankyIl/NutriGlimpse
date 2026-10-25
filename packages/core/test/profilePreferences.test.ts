import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {profileSchema,newSnapshot,parseSnapshot} from '../src/beta.ts';
import {sampleProfile,products} from '../src/fixtures.ts';
import {assessSample,validateProfile} from '../src/assessment.ts';
import {encryptArchive,decryptArchive} from '../src/archive.ts';
import {LocalSession} from '../src/session.ts';
import {ruleSchema} from '../src/ruleSchemas.ts';
import {reviewedStoreAddresses,storeDisplayAddress} from '../src/storePresentation.ts';

test('legacy profiles remain readable without assuming gender or changing clinical context',()=>{
 const old=newSnapshot();old.profile={...sampleProfile};
 const restored=parseSnapshot(old);
 assert.deepEqual(restored,old);assert.equal(restored.profile.gender,undefined);
 for(const gender of ['female','male','nonBinary','unspecified'] as const){
  const updated=profileSchema.parse({...sampleProfile,gender});
  assert.equal(updated.gender,gender);
  assert.deepEqual(assessSample(products[0],updated),assessSample(products[0],sampleProfile));
 }
 assert.equal(profileSchema.safeParse({...sampleProfile,gender:'unexpected'}).success,false);
});
test('wellness choices work without a condition and cannot hide conflicting health selections',()=>{
 for(const primary of ['generalFitness','noConcern'] as const){
  const profile={...sampleProfile,primary,conditions:[]};
  assert.equal(profileSchema.safeParse(profile).success,true);assert.equal(validateProfile(profile),null);
  assert.equal(assessSample(products[1],profile).label,'Insufficient information');
 }
 assert.equal(profileSchema.safeParse({...sampleProfile,primary:'noConcern'}).success,false);
 assert.equal(profileSchema.safeParse({...sampleProfile,conditions:[]}).success,false);
 assert.equal(profileSchema.safeParse({...sampleProfile,primary:'generalFitness'}).success,true);
 assert.equal(ruleSchema.shape.condition.safeParse('generalFitness').success,false);
 assert.equal(ruleSchema.shape.condition.safeParse('noConcern').success,false);
});
test('gender, wellness and automatic location preferences survive encrypted export and restart',async()=>{
 for(const autoStoreDetection of [true,false]){
  let disk={...newSnapshot(),onboardingComplete:true,autoStoreDetection,profile:{...sampleProfile,gender:'nonBinary' as const,primary:'generalFitness' as const,conditions:[],restrictions:['dairyFree' as const]}};
  const repository={read:async()=>disk,write:async(value:typeof disk)=>{disk=structuredClone(value);},clear:async()=>{}};
  const encrypted=await encryptArchive(disk,'fixture-password-only',randomBytes);
  const restored=await decryptArchive(encrypted,'fixture-password-only');
  assert.deepEqual(restored,disk);
  const session=new LocalSession({...repository,write:async value=>{disk=structuredClone(value) as typeof disk;}});
  await session.initialize();
  assert.equal(session.snapshot.autoStoreDetection,autoStoreDetection);
  assert.equal(session.snapshot.profile.gender,'nonBinary');
  assert.deepEqual(session.snapshot.profile.restrictions,['dairyFree']);
 }
});
test('only the verified Wegmans branch gets the main store address; other numbers are preserved',()=>{
 const entry=reviewedStoreAddresses[0];const store={id:entry.id,name:entry.name,address:entry.original};
 assert.equal(storeDisplayAddress(store),'9102 Shops Way, Northborough, MA 01532');
 assert.equal(store.address,entry.original);
 for(const other of [{...store,id:'way/999'},{...store,name:'Different store'},{...store,address:'12-14 Main Street, Suite 2, 01532'}]){
  assert.equal(storeDisplayAddress(other),other.address);
 }
 assert.equal(storeDisplayAddress({...store,address:entry.address}),entry.address);
});
