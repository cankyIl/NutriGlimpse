import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AI_FOOD_CONSENT,estimatedRating,estimatedBenefitsDecision,alternativeRatingDecision,estimatedFoodSchema,type EstimatedFood,type AiFoodResult} from '../../../packages/core/src/aiFoodReview.ts';
import {validateAiReview,parseReviewProgress,createAiReviewProvider,aiReviewInstructions,buildAiReviewRequest} from '../src/aiFoodReviewProvider.ts';
import {compactFood} from '../src/compactPhotoReview.ts';
import type {BetaEvent} from '../src/betaDiagnostics.ts';
const identity=(name:string)=>({status:'identified' as const,brand:'Synthetic',name,variant:null,size:null,visibleText:[]});
const n={caloriesKcal:90,saturatedFatG:3,transFatG:0,sugarsG:0,addedSugarsG:0,carbohydrateG:0,sodiumMg:90,fiberG:0,proteinG:0,potassiumMg:null,calciumMg:null,ironMg:null,magnesiumMg:null};
const spread:EstimatedFood={identity:identity('Spread original'),category:'butter-spread',servingText:'14 g',servingGrams:14,ingredients:null,rating:'neutral',nutrition:n};
const spreadAlt=(name:string):EstimatedFood=>({...spread,identity:identity(name),nutrition:{...n,caloriesKcal:80,saturatedFatG:2}});
const sauce:EstimatedFood={...spread,identity:identity('Sauce original'),category:'pasta-sauce',servingText:'125 g',servingGrams:125,rating:'not_healthy',nutrition:{...n,caloriesKcal:70,saturatedFatG:0,sugarsG:7,addedSugarsG:3,carbohydrateG:12,sodiumMg:480,fiberG:2,proteinG:2}};
const sauceAlt=(name:string):EstimatedFood=>({...sauce,identity:identity(name),rating:'neutral',nutrition:{...sauce.nutrition,caloriesKcal:60,sugarsG:4,addedSugarsG:0,sodiumMg:380}});
const cereal:EstimatedFood={...spread,identity:identity('Cereal original'),category:'breakfast-cereal',servingText:'37 g',servingGrams:37,rating:'not_healthy',nutrition:{...n,caloriesKcal:140,saturatedFatG:0.5,sugarsG:12,addedSugarsG:12,carbohydrateG:30,sodiumMg:210,fiberG:3,proteinG:3}};
const cerealAlt=(name:string):EstimatedFood=>({...cereal,identity:identity(name),rating:'neutral',nutrition:{...cereal.nutrition,sugarsG:2,addedSugarsG:2,sodiumMg:190,fiberG:4,proteinG:5}});
const review=(original:EstimatedFood,alternatives:unknown[],audit?:(event:Extract<BetaEvent,{kind:'decision'}>)=>void)=>validateAiReview({status:'identified',original,alternatives},0,audit);
const verdict=(a:EstimatedFood,b:EstimatedFood)=>estimatedBenefitsDecision(a,b);

test('green calculation with neutral model rating is considered, recolored and audited',()=>{
 let event:Extract<BetaEvent,{kind:'decision'}>|undefined;const result=review(cereal,[cerealAlt('Candidate')],e=>event=e);
 assert.equal(result.alternatives.length,1);assert.equal(result.alternatives[0].rating,'healthy');assert.equal(event?.alternatives[0].food?.rating,'neutral');assert.equal(event?.alternatives[0].computedRating,'healthy');assert.equal(event?.alternatives[0].displayedRating,'healthy');assert.ok(event?.alternatives[0].reasons.includes('model_neutral_calculated_green'));
});
test('neutral spreads can improve saturated fat with equal zero fiber/protein and stay neutral',()=>{
 assert.equal(estimatedRating(spreadAlt('Better')),'neutral');const result=review(spread,[spreadAlt('Better')]);assert.equal(result.alternatives.length,1);assert.equal(result.alternatives[0].rating,'neutral');assert.deepEqual(verdict(spread,result.alternatives[0]).benefits,['Less saturated fat']);
});
test('neutral sauces address original sodium while preserving low equal protein/fiber',()=>{
 assert.equal(review(sauce,[sauceAlt('Lower sugar')]).alternatives.length,1);
 const lowerSalt={...sauceAlt('Lower sodium'),nutrition:{...sauce.nutrition,sodiumMg:300}};
 assert.equal(review(sauce,[lowerSalt]).alternatives.length,1);assert.ok(verdict(sauce,lowerSalt).benefits.includes('Less sodium'));
});
test('model green and calculated neutral retains yellow when relative checks pass',()=>{
 const proposal={...spreadAlt('Better'),rating:'healthy' as const};const result=review(spread,[proposal]);assert.equal(result.alternatives.length,1);assert.equal(result.alternatives[0].rating,'neutral');assert.equal(proposal.rating,'healthy','Input must not be mutated');
});
test('red, missing-rating, uncertain and incomplete alternatives remain excluded',()=>{
 const good=spreadAlt('Candidate');
 for(const bad of [{...good,rating:null},{...good,rating:'not_healthy' as const},{...good,identity:{...good.identity,status:'uncertain' as const}},{...good,identity:{...good.identity,brand:null}},{...good,servingGrams:0},{...good,nutrition:{...good.nutrition,saturatedFatG:4}},{...good,nutrition:{...good.nutrition,transFatG:0.01}}])assert.equal(review(spread,[bad]).alternatives.length,0);
 for(const key of ['caloriesKcal','saturatedFatG','transFatG','sugarsG','addedSugarsG','carbohydrateG','sodiumMg','fiberG','proteinG'] as const)assert.equal(review(spread,[{...good,nutrition:{...good.nutrition,[key]:null}}]).alternatives.length,0,key);
 assert.equal(alternativeRatingDecision({...cerealAlt('Red signal'),rating:'not_healthy'}).rating,null);
});
test('all adverse nutrient worsening checks and calorie guard remain enforced',()=>{
 const good=cerealAlt('Candidate');
 for(const [key,value] of [['sodiumMg',270],['saturatedFatG',2],['sugarsG',15],['addedSugarsG',15],['caloriesKcal',190]] as const){
  const bad={...good,nutrition:{...good.nutrition,[key]:value}};if(key==='sugarsG'||key==='addedSugarsG'){bad.nutrition.carbohydrateG=32;bad.nutrition.sugarsG=15;}
  assert.equal(review(cereal,[bad]).alternatives.length,0,key);
 }
 // The lower-salt sauce must not gain 1g saturated fat from a zero baseline.
 assert.equal(review(sauce,[{...sauceAlt('Tradeoff'),nutrition:{...sauceAlt('Tradeoff').nutrition,sodiumMg:140,saturatedFatG:1}}]).alternatives.length,0);
});
test('fiber and protein may be low or equal, but cannot decrease at equal weight',()=>{
 for(const key of ['fiberG','proteinG'] as const){const bad={...sauceAlt('Loses benefit'),nutrition:{...sauceAlt('Loses benefit').nutrition,[key]:1.9}};assert.equal(verdict(sauce,bad).reasons[0],'equal_weight_loses_'+key);assert.equal(review(sauce,[bad]).alternatives.length,0);}
});
test('tiny portions cannot fake improvement; proportional serving changes keep benefits',()=>{
 const tiny={...spreadAlt('Tiny serving'),servingGrams:7,nutrition:{...n,caloriesKcal:45,saturatedFatG:1.5,sodiumMg:45}};
 assert.equal(review(spread,[tiny]).alternatives.length,0);
 const scaled={...spreadAlt('Same improvement'),servingGrams:7,nutrition:{...n,caloriesKcal:40,saturatedFatG:1,sodiumMg:45}};
 assert.equal(review(spread,[scaled]).alternatives.length,1);
});
test('category aliases preserve use; cross-category and unknown neutral proposals fail closed',()=>{
 assert.equal(review(sauce,[{...sauceAlt('Alias'),category:'tomato-pasta-sauce'}]).alternatives.length,1);
 assert.equal(review(spread,[{...spreadAlt('Wrong use'),category:'peanut-butter'}]).alternatives.length,0);
 assert.equal(review({...spread,category:'unknown'},[{...spreadAlt('Unknown'),category:'unknown'}]).alternatives.length,0);
 assert.equal(review({...cereal,category:'unmapped-food'},[{...cerealAlt('Green'),category:'unmapped-food'}]).alternatives.length,1);
});
test('neutral spread requires a meaningful saturated-fat improvement; adding protein alone is insufficient',()=>{
 assert.equal(review(spread,[{...spreadAlt('Tiny improvement'),nutrition:{...n,saturatedFatG:2.5}}]).alternatives.length,0);
 assert.equal(review(spread,[{...spreadAlt('Protein only'),nutrition:{...n,proteinG:1}}]).alternatives.length,0);
});
test('five candidates select up to three distinct suitable products without padding',()=>{
 for(const [original,candidate] of [[spread,spreadAlt],[sauce,sauceAlt],[cereal,cerealAlt]] as const){
  const result=review(original,[original,candidate('A'),candidate('B'),candidate('C'),candidate('D')]);assert.equal(result.alternatives.length,3);assert.deepEqual(result.alternatives.map(x=>x.identity.name),['A','B','C']);
  const duplicate={...candidate('A'),identity:{...candidate('A').identity,size:'Large'}};assert.equal(review(original,[candidate('A'),duplicate,{},candidate('B')]).alternatives.length,2);
 }
});
test('absolute rating thresholds and original disagreement behavior are unchanged',()=>{
 assert.equal(estimatedRating(spread),'neutral');assert.equal(estimatedRating(sauce),'not_healthy');assert.equal(estimatedRating(cereal),'not_healthy');
 assert.equal(review({...cerealAlt('Original'),rating:'very_healthy'},[]).original?.rating,null);
});
test('streamed alternatives grow consistently and the final answer matches at every split',()=>{
 for(const [original,alt] of [[spread,spreadAlt],[sauce,sauceAlt],[cereal,cerealAlt]] as const){
  const raw=JSON.stringify({status:'identified',original,alternatives:[alt('A'),alt('B'),alt('C'),alt('D')]});const final=review(original,[alt('A'),alt('B'),alt('C'),alt('D')]);let max=0;
  for(let n=0;n<=raw.length;n++){const progress=parseReviewProgress(raw.slice(0,n));if(!progress)continue;assert.ok(progress.alternatives.length>=max);max=progress.alternatives.length;assert.deepEqual(progress.original,final.original);assert.deepEqual(progress.alternatives,final.alternatives.slice(0,max));}assert.equal(max,3);
 }
});
test('updated prompt keeps same model, image detail, schema, single-call budget and honesty requirements',()=>{
 const request=buildAiReviewRequest('fixture');assert.equal(request.model,'gpt-6-luna');assert.equal(request.max_output_tokens,4500);assert.equal(request.store,false);assert.deepEqual(request.tools,[]);assert.equal(request.input[0].content[1].detail,'high');assert.match(aiReviewInstructions,/neutral-rated product can be a better alternative/);assert.match(aiReviewInstructions,/never reduce either at equal weight/i);assert.match(aiReviewInstructions,/No personal information/);
});

test('sodium-led sauce explanations lead with factual sodium reductions below 25 percent',()=>{
 for(const sodiumMg of [380,420,390]){
  const candidate={...sauceAlt('Sodium improvement'),nutrition:{...sauceAlt('Sodium improvement').nutrition,sodiumMg}};
  const result=review(sauce,[candidate]);assert.equal(result.alternatives.length,1);
  const decision=verdict(sauce,result.alternatives[0]);assert.equal(decision.benefits[0],'Less sodium');assert.ok(decision.benefits.indexOf('Less added sugar')>0);assert.ok(decision.reasons.includes('original_priority_sodiumMg'));
 }
});
test('less sugar cannot distract from an unresolved sodium concern at equal weight',()=>{
 for(const sodiumMg of [460,480]){
  const candidate={...sauceAlt('Sugar only'),servingGrams:100,nutrition:Object.fromEntries(Object.entries({...sauceAlt('Sugar only').nutrition,sodiumMg}).map(([key,value])=>[key,value===null?null:value*0.8])) as EstimatedFood['nutrition']};
  assert.equal(review(sauce,[candidate]).alternatives.length,0);assert.ok(verdict(sauce,candidate).reasons.includes('original_priority_not_improved_sodiumMg'));
 }
 const boundary={...sauceAlt('Boundary'),nutrition:{...sauceAlt('Boundary').nutrition,sodiumMg:432}};assert.equal(review(sauce,[boundary]).alternatives.length,1);
});
test('without a high-sodium crossing, a smaller primary reduction alone still needs 25 percent qualification',()=>{
 const original={...sauce,rating:'neutral' as const,nutrition:{...sauce.nutrition,sodiumMg:430}};
 const candidate={...sauceAlt('Small sodium change only'),nutrition:{...original.nutrition,sodiumMg:380}};
 assert.equal(review(original,[candidate]).alternatives.length,0);assert.deepEqual(verdict(original,candidate).reasons,['no_meaningful_improvement']);
});
test('primary comparison requires absolute floor as well as relative reduction',()=>{
 const original={...sauce,rating:'neutral' as const,nutrition:{...sauce.nutrition,sodiumMg:240}};
 const candidate={...sauceAlt('Small absolute change'),nutrition:{...sauceAlt('Small absolute change').nutrition,sodiumMg:210}};
 assert.equal(review(original,[candidate]).alternatives.length,0);assert.ok(verdict(original,candidate).reasons.includes('original_priority_not_improved_sodiumMg'));
});
test('actual high-sugar concern overrides a spread category saturated-fat preference',()=>{
 const original={...spread,servingGrams:40,rating:'not_healthy' as const,nutrition:{...n,caloriesKcal:150,carbohydrateG:25,sugarsG:12,addedSugarsG:12}};
 const candidate={...original,identity:identity('Lower sugar spread'),rating:'neutral' as const,nutrition:{...original.nutrition,saturatedFatG:1,addedSugarsG:8,sugarsG:8}};
 assert.equal(verdict(original,candidate).benefits[0],'Less added sugar');assert.equal(review(original,[candidate]).alternatives.length,1);
 const distracted={...candidate,nutrition:{...candidate.nutrition,sugarsG:11,addedSugarsG:11},servingGrams:40};
 // Still red from its own added sugar, so it cannot qualify through lower fat.
 assert.equal(review(original,[distracted]).alternatives.length,0);
});
test('secondary original concerns remain explicit before unrelated improvements',()=>{
 const original={...cereal,servingGrams:100,nutrition:{...cereal.nutrition,caloriesKcal:150,carbohydrateG:40,sodiumMg:600,fiberG:4,proteinG:4,saturatedFatG:2}};
 const candidate={...original,identity:identity('Smaller portion'),servingGrams:50,rating:'neutral' as const,nutrition:{...original.nutrition,caloriesKcal:70,carbohydrateG:20,sugarsG:2,addedSugarsG:2,sodiumMg:300,fiberG:2,proteinG:2,saturatedFatG:0.5}};
 const result=review(original,[candidate]);assert.equal(result.alternatives.length,1);const decision=verdict(original,result.alternatives[0]);
 assert.deepEqual(decision.benefits.slice(0,2),['Less added sugar','Sodium not meaningfully lower']);assert.ok(decision.reasons.includes('secondary_concern_not_improved_sodiumMg'));
});
test('primary sodium uses equal weight even when the candidate has a smaller serving',()=>{
 const candidate={...sauceAlt('Small portion'),servingGrams:100,nutrition:{...sauceAlt('Small portion').nutrition,sodiumMg:400,fiberG:1.6,proteinG:1.6}};
 assert.equal(review(sauce,[candidate]).alternatives.length,0);assert.ok(verdict(sauce,candidate).reasons.includes('original_priority_not_improved_sodiumMg'));
});
test('trans fat remains the first concern and zero requirement is preserved',()=>{
 const original={...cereal,nutrition:{...cereal.nutrition,transFatG:0.1}};const result=review(original,[cerealAlt('No trans fat')]);
 assert.equal(result.alternatives.length,1);assert.equal(verdict(original,result.alternatives[0]).benefits[0],'No trans fat');
});


test('crossing below high sodium qualifies alone without a 10 percent or 40mg reduction',()=>{
 for(const sodiumMg of [450,440,459]){
  const candidate={...sauceAlt('Below cutoff'),nutrition:{...sauce.nutrition,sodiumMg}};
  const result=review(sauce,[candidate]);assert.equal(result.alternatives.length,1);
  const decision=verdict(sauce,result.alternatives[0]);assert.deepEqual(decision.benefits,['Less sodium']);assert.ok(decision.reasons.includes('sodium_high_cutoff_crossed'));assert.ok(!decision.reasons.includes('meaningful_improvement'));
  assert.equal(result.alternatives[0].rating,'neutral','A cutoff crossing must not manufacture green');
 }
});
test('high sodium crossing has a strict boundary and requires an originally high value',()=>{
 for(const [originalSodium,candidateSodium,accepted] of [[460,459,true],[480,459.99,true],[480,460,false],[459,450,false],[450,450,false],[450,455,false]] as const){
  const original={...sauce,rating:originalSodium>=460?'not_healthy' as const:'neutral' as const,nutrition:{...sauce.nutrition,sodiumMg:originalSodium}};
  const candidate={...sauceAlt('Boundary'),nutrition:{...original.nutrition,sodiumMg:candidateSodium}};
  assert.equal(review(original,[candidate]).alternatives.length,accepted?1:0,`${originalSodium} to ${candidateSodium}`);
 }
});
test('five sauce candidates select three below-cutoff options and still reject saturated-fat tradeoffs',()=>{
 const original={...sauce,nutrition:{...sauce.nutrition,addedSugarsG:4}};
 const candidate=(name:string,sodiumMg:number,addedSugarsG:number,saturatedFatG=0):EstimatedFood=>({...sauceAlt(name),nutrition:{...sauceAlt(name).nutrition,sugarsG:5,addedSugarsG,sodiumMg,saturatedFatG}});
 const proposals=[candidate('Higher-fat marinara',420,0,1.5),candidate('No added sugar sauce',450,0),candidate('No added salt sauce',20,0),candidate('Higher-fat sensitive sauce',330,0,1.5),candidate('Tomato basil sauce',440,3)];
 let audit:Extract<BetaEvent,{kind:'decision'}>|undefined;const result=review(original,proposals,event=>audit=event);
 assert.deepEqual(result.alternatives.map(f=>f.identity.name),['No added sugar sauce','No added salt sauce','Tomato basil sauce']);
 assert.ok(result.alternatives.every(f=>verdict(original,f).benefits[0]==='Less sodium'));
 assert.ok(audit?.alternatives[0].reasons.includes('equal_weight_worsens_saturatedFatG'));assert.ok(audit?.alternatives[3].reasons.includes('equal_weight_worsens_saturatedFatG'));
});
test('a smaller stated serving cannot fabricate a sodium threshold crossing',()=>{
 for(const [sodiumMg,accepted] of [[225,true],[229.5,true],[230,false],[240,false]] as const){
  const candidate={...sauceAlt('Half portion'),servingGrams:62.5,nutrition:Object.fromEntries(Object.entries({...sauce.nutrition,sodiumMg:sodiumMg*2}).map(([key,value])=>[key,value===null?null:value/2])) as EstimatedFood['nutrition']};
  assert.equal(review(sauce,[candidate]).alternatives.length,accepted?1:0,`Half portion ${sodiumMg}`);
 }
 // Normalized sodium can be below 460 while the candidate's own serving is red.
 const large={...sauceAlt('Large portion'),servingGrams:250,nutrition:{...sauce.nutrition,sodiumMg:800,fiberG:4,proteinG:4}};
 assert.equal(review(sauce,[large]).alternatives.length,0);
});
test('threshold crossings preserve missing-data, identity prerequisites and nutrition guards',()=>{
 const good={...sauceAlt('Candidate'),nutrition:{...sauce.nutrition,sodiumMg:450}};
 for(const [key,value] of [['transFatG',0.1],['saturatedFatG',1],['sugarsG',9],['fiberG',1.9],['proteinG',1.9],['caloriesKcal',110],['sodiumMg',null]] as const){
  const candidate={...good,nutrition:{...good.nutrition,[key]:value}};assert.equal(review(sauce,[candidate]).alternatives.length,0,key);
 }
 for(const candidate of [{...good,identity:{...good.identity,status:'uncertain' as const}},{...good,category:'butter-spread'},{...good,rating:'not_healthy' as const}])assert.equal(review(sauce,[candidate]).alternatives.length,0);
 const unknown={...sauce,category:'unclassified'};assert.equal(review(unknown,[{...good,category:'unclassified'}]).alternatives.length,0);
});
test('sodium crossing cannot override the original leading added-sugar concern',()=>{
 const original={...sauce,nutrition:{...sauce.nutrition,carbohydrateG:20,sugarsG:12,addedSugarsG:12}};
 const candidate={...sauceAlt('Sugar unchanged'),nutrition:{...original.nutrition,sodiumMg:450}};
 assert.equal(review(original,[candidate]).alternatives.length,0);
});
test('compact and full streams apply sodium crossing consistently at every complete prefix',()=>{
 const alternatives=[450,440,20].map((sodiumMg,index)=>({...sauceAlt('Crossing '+index),nutrition:{...sauce.nutrition,sodiumMg}}));
 const final=review(sauce,alternatives);
 for(const payload of [{status:'identified',original:sauce,alternatives},{s:'identified',o:compactFood(sauce),a:alternatives.map(compactFood)}]){
  const raw=JSON.stringify(payload);let seen=0;
  for(let index=0;index<=raw.length;index++){
   const progress=parseReviewProgress(raw.slice(0,index));if(!progress)continue;assert.ok(progress.alternatives.length>=seen);seen=progress.alternatives.length;assert.deepEqual(progress.alternatives,final.alternatives.slice(0,seen));
  }
  assert.equal(seen,3);
 }
 assert.match(aiReviewInstructions,/480mg to 450mg or 440mg qualifies/);assert.match(aiReviewInstructions,/SAME original serving weight/);
});
