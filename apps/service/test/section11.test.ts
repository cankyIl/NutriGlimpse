import {supportedStoreTags} from '../src/storeCategory.ts';
import {normalizeOffFood} from '../src/offNormalization.ts';
import {PublicDatabase} from '../src/publicDatabase.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseEvidenceRegistry,resolveProductEvidence,productEvidenceSchema,retailers} from '../src/sourceEvidence.ts';
import {evaluateCoverage,basketCategories} from '../src/coverageAudit.ts';
import {fetchUsdaBatch} from '../src/catalogRefresh.ts';
const now=Date.parse('2026-10-14T12:00:00Z');
const base={id:'example-listing',barcode:'00036000291452',market:'US',kind:'retailer-listing',origin:'public-retailer',sourceUrl:'https://www.walmart.com/ip/example',observedAt:'2026-10-14T10:00:00Z',expiresAt:'2026-10-15T10:00:00Z',sourceVersion:'review-v1',rights:{status:'permitted',recordId:'rights-review-1'},review:{status:'approved',reviewer:'fixture-reviewer',reviewedAt:'2026-10-14T11:00:00Z'},retailer:'walmart',branchId:null,claim:'listed',authorityId:null,finding:'supports',portionGrams:null};
const query={barcode:base.barcode,market:'US' as const,kind:'retailer-listing' as const,retailer:'walmart' as const,branchId:'branch-a',claim:'listed' as const};
test('evidence cannot promote retailer listing to stock or cross product, market, branch or chain scope',()=>{
 const rows=parseEvidenceRegistry([base]);assert.equal(resolveProductEvidence(rows,query,[],now).status,'unverified');assert.equal(resolveProductEvidence(rows,query,[],now,['rights-review-1']).status,'supported');
 for(const q of [{...query,barcode:'00000000000000'},{...query,retailer:'wegmans' as const},{...query,kind:'branch-stock' as const,claim:'in-stock' as const}])assert.equal(resolveProductEvidence(rows,q,[],now,['rights-review-1']).status,'unknown');
 const branch=parseEvidenceRegistry([{...base,branchId:'branch-b'}]);assert.equal(resolveProductEvidence(branch,query,[],now,['rights-review-1']).status,'unknown');
 assert.equal(resolveProductEvidence(rows,{...query,retailer:undefined},[],now,['rights-review-1']).status,'unknown');
});
test('pending rights, absent approval, expired and future evidence never count as supported',()=>{
 for(const patch of [{rights:{status:'pending',recordId:null}},{review:{status:'draft',reviewer:null,reviewedAt:null}},{expiresAt:'2026-10-14T11:30:00Z'},{observedAt:'2026-10-14T13:00:00Z'},{review:{status:'withdrawn',reviewer:'reviewer',reviewedAt:'2026-10-14T11:00:00Z'}}])assert.notEqual(resolveProductEvidence(parseEvidenceRegistry([{...base,...patch}]),query,[],now,['rights-review-1']).status,'supported');
 assert.throws(()=>parseEvidenceRegistry([{...base,rights:{status:'permitted',recordId:null}}]));
 assert.throws(()=>parseEvidenceRegistry([base,base]));
 assert.throws(()=>parseEvidenceRegistry([{...base,origin:'personal-upload'}]));
});
test('contradictions and opposing branch stock evidence produce conflicts, never false in-stock',()=>{
 const stock={...base,kind:'branch-stock',branchId:'branch-a',claim:'in-stock',expiresAt:'2026-10-14T23:00:00Z'};
 const rows=parseEvidenceRegistry([stock,{...stock,id:'out',claim:'out-of-stock'}]);
 assert.equal(resolveProductEvidence(rows,{...query,kind:'branch-stock',claim:'in-stock'},[],now,['rights-review-1']).status,'conflict');
 assert.equal(resolveProductEvidence(parseEvidenceRegistry([stock]),{...query,kind:'branch-stock',claim:'in-stock',branchId:undefined},[],now,['rights-review-1']).status,'unknown');
});
test('certification needs accepted authority and FODMAP measurements need exact tested portion',()=>{
 const cert={...base,kind:'certification',origin:'certification-authority',retailer:null,claim:'kosher',authorityId:'authority-x'};
 const rows=parseEvidenceRegistry([cert]);const q={barcode:base.barcode,market:'US' as const,kind:'certification' as const,claim:'kosher' as const};
 assert.equal(resolveProductEvidence(rows,q,[],now,['rights-review-1']).status,'unverified');assert.equal(resolveProductEvidence(rows,q,['authority-x'],now,['rights-review-1']).status,'supported');
 assert.throws(()=>productEvidenceSchema.parse({...cert,origin:'public-manufacturer'}));
 const measured={...cert,kind:'fodmap-measurement',origin:'licensed-dataset',claim:'measured-low-fodmap',portionGrams:30};
 const m=parseEvidenceRegistry([measured]);const mq={...q,kind:'fodmap-measurement' as const,claim:'measured-low-fodmap' as const};
 assert.equal(resolveProductEvidence(m,{...mq,portionGrams:60},['authority-x'],now,['rights-review-1']).status,'unknown');
 assert.equal(resolveProductEvidence(m,{...mq,portionGrams:30},['authority-x'],now,['rights-review-1']).status,'supported');
});
test('empty or duplicated baskets cannot masquerade as 50 products across ten categories',()=>{
 const template=retailers.flatMap(retailer=>basketCategories.flatMap(category=>Array.from({length:5},(_,i)=>({retailer,category,slot:i+1,barcode:null,productName:null,branchId:null,observedAt:null,sourceUrl:null}))));
 const result=evaluateCoverage(template,[],[],null,now);assert.equal(template.length,350);assert.equal(result.length,7);assert(result.every(r=>!r.accepted&&!r.sampleComplete&&r.rates.identification===null));
 const repeated=template.filter(r=>r.retailer==='walmart').map(r=>({...r,barcode:base.barcode,productName:'Example',branchId:'branch-a',observedAt:base.observedAt,sourceUrl:base.sourceUrl}));
 const row=evaluateCoverage(repeated,[],parseEvidenceRegistry([base]),null,now,['rights-review-1']).find(r=>r.retailer==='walmart')!;
 assert.equal(row.observedUniqueProducts,1);assert.equal(row.counts.retailerEvidence,1);assert.equal(row.counts.identified,0);assert.equal(row.accepted,false);
 assert.throws(()=>evaluateCoverage([repeated[0],repeated[0]],[],[],null,now));
});
const raw={fdcId:1,description:'Plain oats',dataType:'Branded',foodNutrients:[]};
test('batch refresh enforces identity, preserves missing IDs and rejects malformed batches',async()=>{
 let calls=0;
 const fetcher:typeof fetch=async (url,init)=>{calls++;assert(!String(url).includes('secret'));assert.equal((init?.headers as Record<string,string>)['X-Api-Key'],'secret');return new Response(JSON.stringify([raw]));};
 const result=await fetchUsdaBatch(['1','2'],'secret',fetcher);assert.equal(result.foods[0].id,'1');assert.deepEqual(result.missing,['2']);assert.equal(calls,1);
 await assert.rejects(fetchUsdaBatch(['1','1'],'secret',fetcher));assert.equal(calls,1);
 await assert.rejects(fetchUsdaBatch(['2'],'secret',fetcher));
 await assert.rejects(fetchUsdaBatch(['1'],'secret',async()=>new Response(JSON.stringify([raw,raw]))));
});
test('batch source failures do not retry or return fabricated refreshed records',async()=>{
 let calls=0;await assert.rejects(fetchUsdaBatch(['1'],'secret',async()=>{calls++;return new Response('',{status:429});}));assert.equal(calls,1);
 await assert.rejects(fetchUsdaBatch(['1'],'secret',async()=>new Response('x'.repeat(16000001))));
});

test('OFF staged normalization preserves provenance and unknowns, imports no images or certification claims',()=>{
 const payload={product:{code:'036000291452',product_name:'Fictional test food',countries_tags:['en:united-states'],nutrition_data_per:'100g',serving_quantity_unit:'g',last_modified_t:now/1000-60,data_quality_errors_tags:[],nutriments:{'energy-kcal_100g':400,sodium_100g:.1,fiber_100g:0},labels_tags:['en:gluten-free'],image_url:'https://example.com/image.jpg'}};
 const food=normalizeOffFood(payload,'036000291452',new Date(now).toISOString())!;
 assert.equal(food.nutrients.sugarsG,null);assert.equal(food.nutrients.fiberG,0);assert.equal(food.nutrients.sodiumMg,100);assert.equal(food.certifications,'unverified');assert.equal(food.comparisonGroup,undefined);assert(!('image_url' in food));
 const db=new PublicDatabase(':memory:');try{assert.throws(()=>db.importFoods([food]),/disabled/);}finally{db.close();}
 for(const patch of [{data_quality_errors_tags:['en:bad-nutrition']},{serving_quantity_unit:'ml'},{countries_tags:['en:canada']},{nutrition_data_prepared:'on'}])assert.equal(normalizeOffFood({product:{...payload.product,...patch}},'036000291452',new Date(now).toISOString()),null);
});
test('fifty distinct observed products across ten categories still require explicit acceptance thresholds',()=>{
 const barcode=(i:number)=>{const body=String(i).padStart(13,'0');const sum=[...body].reduce((n,d,j)=>n+Number(d)*(j%2===0?3:1),0);return body+String((10-sum%10)%10);};
 const rows=basketCategories.flatMap((category,j)=>Array.from({length:5},(_,i)=>({retailer:'walmart',category,slot:i+1,barcode:barcode(j*5+i+1),productName:'Observed fixture '+(j*5+i+1),branchId:'branch-a',observedAt:base.observedAt,sourceUrl:base.sourceUrl})));
 const without=evaluateCoverage(rows,[],[],null,now).find(r=>r.retailer==='walmart')!;
 assert(without.sampleComplete);assert(!without.accepted);assert.equal(without.observedUniqueProducts,50);
 const policy={approvedBy:'fixture-only',approvedAt:base.observedAt,identification:1,retailerEvidence:1,alternatives:1};
 assert(!evaluateCoverage(rows,[],[],policy,now).find(r=>r.retailer==='walmart')!.accepted);
 const permissive={...policy,identification:0,retailerEvidence:0,alternatives:0};
 assert(evaluateCoverage(rows,[],[],permissive,now).find(r=>r.retailer==='walmart')!.accepted);
});

test('directory includes grocery department chains but rejects unrelated, closed and specialty facilities',()=>{
 assert(supportedStoreTags({name:'Target',shop:'department_store'}));assert(supportedStoreTags({name:'Walmart Supercenter',shop:'department_store'}));
 for(const name of ['Macys','Target Optical','Walmart Auto Center','Walmart Distribution Center'])assert(!supportedStoreTags({name,shop:'department_store'}));
 assert(!supportedStoreTags({name:'Target',shop:'department_store',disused:'yes'}));assert(supportedStoreTags({name:"Shaw's",shop:'supermarket'}));
});
