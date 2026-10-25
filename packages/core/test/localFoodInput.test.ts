import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readLocalProduct,readLocalReceipt,labelCatalogDifferences,localFoodReviewSchema,localReceiptSummary,type LocalFoodReview} from '../src/localFoodInput.ts';
import {saveLocalFoodReview} from '../src/localFoodReviewState.ts';
import {newSnapshot,parseSnapshot} from '../src/beta.ts';
import {encryptArchive,decryptArchive} from '../src/archive.ts';
import {randomBytes} from 'node:crypto';
import {requirePersonalCapture} from '../src/captureGate.ts';
const pages=(texts:string[])=>[{page:1,width:1000,height:2000,lines:texts.map((text,i)=>({id:'line-'+i,text,x:10,y:i*50,width:900,height:30,confidence:.99}))}];
const label=()=>readLocalProduct(pages(['Product: Fictional oats','Serving size 1/2 cup (40 g)','Calories 150','Sodium 10 mg','Total Sugars 1 g','Dietary Fiber 4 g','Saturated Fat 0.5 g','Trans Fat 0 g','Potassium 100 mg','Ingredients: Whole grain oats','Contains: Wheat','Gluten-Free']));
test('local label facts retain source, amount basis and uncertain dietary claims without network behavior',()=>{
 const result=label();assert.equal(result.servingGrams?.value,40);assert.equal(result.nutritionBasis,'per-serving');assert.equal(result.nutrients.sugars?.value.amount,1);
 assert.equal(result.additionalNutrients?.transFat?.value.amount,0);assert.equal(result.additionalNutrients?.calcium,null);
 assert.equal(result.frontLabelText?.value,'Gluten-Free');assert.equal(result.allergens?.source.lineIds[0],'line-10');
 assert.equal('certificationVerified' in result,false);
 assert.throws(()=>requirePersonalCapture(),/native privacy acceptance/);
});
test('conflicting labels, missing units and low confidence remain unknown instead of merging variants',()=>{
 const conflicting=readLocalProduct(pages(['Serving size 40 g','Sodium 20 mg','Sodium 600 mg','Fiber 5','Total Sugars 1 g','Total Sugars 1 g','Per 100 g']));
 assert.equal(conflicting.nutrients.sodium,null);assert.equal(conflicting.nutrients.fiber,null);assert.equal(conflicting.nutritionBasis,'unknown');assert.equal(conflicting.nutrients.sugars?.value.amount,1);
 const low=pages(['Calories 150']);low[0].lines[0].confidence=.1;assert.equal(readLocalProduct(low).nutrients.calories,null);
 const privateLine=readLocalProduct(pages(['Product: Customer: John Smith','Ingredients: example@example.test']));
 assert.equal(privateLine.name,null);assert.equal(privateLine.ingredients,null);
});
test('receipt reading omits payment/identity text, preserves quantities and never auto-confirms food variants',()=>{
 const result=readLocalReceipt(pages(['Wegmans','10/14/2026','2 x OAT CEREAL 6.99','APPLES 1.25 lb 2.49','PAPER TOWELS 5.99','COUPON -1.00','RETURN FOOD -3.00','TAX 0.50','TOTAL 11.47','VISA 1234 5678 9012 3456','CUSTOMER JOHN SMITH 4.50','MEMBER 555-123-4567 3.99']));
 assert.equal(result.retailerText?.value,'Wegmans');assert.equal(result.printedDateText?.value,'2026-10-14');
 assert.equal(result.lines.length,6);assert.deepEqual(result.lines.map(l=>l.kind),['unknown','unknown','non-food','discount','refund','tax']);
 assert.deepEqual(result.lines[0].quantity?.value,{amount:2,unit:'item'});assert.deepEqual(result.lines[1].quantity?.value,{amount:1.25,unit:'lb'});
 assert.equal(JSON.stringify(result).includes('JOHN'),false);assert.equal(JSON.stringify(result).includes('555-'),false);
 const summary=localReceiptSummary(result,[]);assert.equal(summary.unresolved,2);assert.equal(summary.partial,true);
 assert.equal(readLocalReceipt(pages(['TOTAL 4.00'])).lines.length,0);
});
test('multiple retailers/dates do not silently choose an arbitrary receipt context',()=>{
 const result=readLocalReceipt(pages(['Wegmans','Walmart','10/14/2026','10/13/2026','OATS 2.99']));
 assert.equal(result.retailerText,null);assert.equal(result.printedDateText,null);assert.ok(result.issues.includes('ambiguous-date'));
});
function record():LocalFoodReview{return {id:'11111111-1111-4111-8111-111111111111',kind:'local-food-review',createdAt:'2026-10-14T12:00:00Z',updatedAt:'2026-10-14T12:00:00Z',synthetic:true,sourcePages:1,draft:label(),confirmed:true,correctedFields:[],matches:[]};}
test('review save detects deletion/stale overwrite and rejects raw media or unconfirmed structures',()=>{
 const original=record(),snapshot=saveLocalFoodReview(newSnapshot(),original,null);assert.equal(parseSnapshot(snapshot).foodReviews?.length,1);
 assert.throws(()=>saveLocalFoodReview(snapshot,original,null));assert.throws(()=>saveLocalFoodReview(newSnapshot(),original,original));
 assert.equal(localFoodReviewSchema.safeParse({...original,uri:'file:///secret.jpg'}).success,false);
 assert.equal(localFoodReviewSchema.safeParse({...original,confirmed:false}).success,false);
 const changed={...original,correctedFields:['name']};const next=saveLocalFoodReview(snapshot,changed,original);
 assert.throws(()=>saveLocalFoodReview(next,original,original));
 assert.equal(localFoodReviewSchema.safeParse({...original,draft:readLocalReceipt(pages(['OATS 3.00'])),matches:[{lineId:'wrong'}]}).success,false);
});
test('encrypted archive round-trips compact food reviews and preserves missing facts',async()=>{
 const snapshot=saveLocalFoodReview(newSnapshot(),record(),null),password='fictional-fixture-password';
 const encrypted=await encryptArchive(snapshot,password,n=>new Uint8Array(randomBytes(n)));
 assert.ok(!encrypted.includes('Fictional oats'));
 assert.deepEqual(await decryptArchive(encrypted,password),snapshot);
});
test('package/catalog conflicts compare equal weight and never alter either source',()=>{
 const draft=label(),food={nutrients:{caloriesKcal:375,sodiumMg:100,fiberG:10,sugarsG:2.5,saturatedFatG:1.25}} as Parameters<typeof labelCatalogDifferences>[1];
 const before=JSON.stringify(draft),result=labelCatalogDifferences(draft,food);
 assert.deepEqual(result.differences,[{nutrient:'sodium',observed:25,catalog:100,unit:'mg'}]);
 assert.equal(JSON.stringify(draft),before);
 assert.equal(labelCatalogDifferences({...draft,nutritionBasis:'unknown'},food).comparable,false);
});
