import {projectRoot} from '../apps/service/src/projectPaths.ts';
import {readFileSync,writeFileSync} from 'node:fs';
import {PublicDatabase} from '../apps/service/src/publicDatabase.ts';
import {comparisonReady,comparableAlternatives} from '../packages/core/src/catalogAlternatives.ts';
import {retailerBrandHints} from '../apps/service/src/offBulk.ts';
import {foodSchema} from '../packages/core/src/publicFood.ts';
import {searchCatalog} from '../packages/core/src/catalogClient.ts';
import assert from 'node:assert/strict';
const root=projectRoot,db=new PublicDatabase(root+'/.tools/catalog/public.sqlite');
const foods=db.exportFoods(),off=foods.filter(f=>f.provider==='off');
const report={checkedAt:new Date().toISOString(),totalRecords:foods.length,uniqueBarcodes:new Set(foods.flatMap(f=>f.barcode?[f.barcode]:[])).size,offRecords:off.length,offNewBarcodes:new Set(off.filter(f=>!foods.some(u=>u.provider==='usda'&&u.barcode===f.barcode)).map(f=>f.barcode)).size,offComparable:off.filter(f=>comparisonReady(f)).length,groups:{} as Record<string,number>,chains:{} as Record<string,{offBrandMatches:number;allSourceBrandMatches:number;offComparable:number;samples:string[]}>,liveSearch:{} as Record<string,number>,sampleComparisons:[] as {name:string;options:number}[],exportBytes:0};
for(const f of off.filter(f=>comparisonReady(f)))report.groups[f.comparisonGroup!]=(report.groups[f.comparisonGroup!]??0)+1;
for(const chain of ['wegmans','walmart','price-chopper','whole-foods']){
 const matches=off.filter(f=>retailerBrandHints(f.brand).includes(chain));
 report.chains[chain]={offBrandMatches:matches.length,allSourceBrandMatches:foods.filter(f=>retailerBrandHints(f.brand).includes(chain)).length,offComparable:matches.filter(f=>comparisonReady(f)).length,samples:matches.slice(0,3).map(f=>f.name)};
}
for(const query of ['Wegmans','Great Value','Price Chopper','365']){const result=await searchCatalog(query,'name',new AbortController().signal);assert.ok(result.length>0);report.liveSearch[query]=result.length;}
for(const group of Object.keys(report.groups)){
 const original=off.find(f=>f.comparisonGroup===group&&comparisonReady(f))!;
 const options=comparableAlternatives(original,db.comparable(group),'sodiumMg');
 assert.ok(options.length<=3);assert.equal(comparableAlternatives(original,db.comparable(group),'sodiumMg',['glutenFree']).length,0);
 report.sampleComparisons.push({name:original.name,options:options.length});
}
const response=await fetch('https://grocery.serveforwad.com/v1/catalog/export');assert.equal(response.status,200);const raw=await response.text();report.exportBytes=Buffer.byteLength(raw);const download=JSON.parse(raw);assert.equal(download.foods.length,foods.length);download.foods.forEach((f:unknown)=>foodSchema.parse(f));assert.ok(!raw.includes(key));
assert.equal((await fetch('https://grocery.serveforwad.com/v1/catalog/search/cereal')).status,401);
assert.equal((await fetch('https://portfolio.serveforwad.com')).status,200);
db.close();writeFileSync(root+'/artifacts/remote/off-bulk/coverage.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
