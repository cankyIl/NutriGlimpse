import test from 'node:test';
import assert from 'node:assert/strict';
import {groceryShopper,groceryShopperSchema,GROCERY_SHOPPER_CONSENT} from '../src/groceryShopper.ts';
import {groceryContext} from '../src/groceryContext.ts';
import {profileSchema,snapshotSchema,newSnapshot,type PanelRecord} from '../src/beta.ts';
import {sampleProfile} from '../src/fixtures.ts';
import {panelConflictCandidates} from '../src/reports.ts';
const profile={...sampleProfile,age:52,gender:'male' as const,primary:'diabetes' as const,conditions:['diabetes' as const],eatingPreferences:'Mostly plant-based',foodPreferences:'Unsweetened cereal'};
const panel=(id:string,date='2026-10-01')=>({id,testDate:date,confirmed:true,synthetic:false,measurements:[{analyte:'ldl',rawValue:'145',comparator:'=',unit:'mg/dL',sourcePage:1}],analysis:null,importedAt:'2026-10-02T00:00:00Z',status:'ready'} as PanelRecord);
test('sharing is opt-in, backward compatible and excludes all unselected private fields',()=>{
 const old=groceryContext(profile,null);assert.equal(old.shopper,undefined);
 assert.equal(groceryContext(profile,null,{profile,shareHealth:false,panels:[panel('a')]}).shopper,undefined);
 const context=groceryContext({...profile,name:'Private Name'} as any,null,{profile,shareHealth:true,panels:[panel('a')]});
 assert.equal(context.shopper?.age,52);assert.equal(context.shopper?.foodPreferences,'Unsweetened cereal');
 assert.deepEqual(context.shopper?.lipidPanel,{testDate:'2026-10-01',measurements:[{analyte:'ldl',rawValue:'145',comparator:'=',unit:'mg/dL'}]});
 assert.doesNotMatch(JSON.stringify(context),/Private Name|sourcePage|importedAt|analysis|fingerprint/);
 assert.throws(()=>groceryShopperSchema.parse({...context.shopper,name:'Private'}));
 assert.throws(()=>groceryShopperSchema.parse({...context.shopper,consentVersion:undefined}));
});
test('sample, unconfirmed, future, undated or unresolved lipid reports never leak into a prompt',()=>{
 for(const p of [{...panel('a'),synthetic:true},{...panel('a'),confirmed:false},panel('a','2099-01-01'),{...panel('a'),testDate:null}])assert.equal(groceryShopper(profile,[p as PanelRecord]).lipidPanel,undefined);
 const panels=[panel('a'),panel('b')];assert.equal(groceryShopper(profile,panels).lipidPanel,undefined);
 const choice={selectedId:'b',candidates:panelConflictCandidates(panels)};
 assert.equal(groceryShopper(profile,panels,choice).lipidPanel?.testDate,'2026-10-01');
 assert.equal(groceryShopper(profile,[...panels,panel('c')],choice).lipidPanel,undefined);
});
test('preferences persist and old encrypted snapshot schemas remain readable',()=>{
 const old=newSnapshot();assert.doesNotThrow(()=>snapshotSchema.parse(old));
 const p=profileSchema.parse(profile);assert.equal(p.eatingPreferences,'Mostly plant-based');
 assert.equal(snapshotSchema.parse({...old,profile:p}).profile.foodPreferences,'Unsweetened cereal');
 assert.throws(()=>profileSchema.parse({...profile,foodPreferences:'x'.repeat(301)}));
});
test('units, comparators and dates remain explicit; no diagnosis or BMI is inferred',()=>{
 const p=panel('a');p.measurements=[{analyte:'lpa',rawValue:'125',comparator:'>',unit:'nmol/L'}];
 const result=groceryShopper({...profile,gender:'unspecified',bodyMeasurements:{height:{value:70,unit:'in'},weight:{value:180,unit:'lb'},recordedAt:'2026-10-01T00:00:00Z'}},[p]);
 assert.equal(result.gender,undefined);assert.equal(result.lipidPanel?.measurements[0].comparator,'>');assert.equal(result.lipidPanel?.measurements[0].unit,'nmol/L');
 assert.equal(result.bodyMeasurements?.weight.value,180);assert.doesNotMatch(JSON.stringify(result),/overweight|obese|diagnosis/);
 assert.equal(result.consentVersion,GROCERY_SHOPPER_CONSENT);
});
