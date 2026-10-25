import {projectRoot} from '../apps/service/src/projectPaths.ts';
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {mapUsda} from '../apps/service/src/usda.ts';
import {PublicDatabase} from '../apps/service/src/publicDatabase.ts';
import {comparisonReady,type PublicFood} from '../packages/core/src/index.ts';
import {foodSourceTime} from '../packages/core/src/publicFood.ts';
const root=projectRoot;
const input=process.argv[2],apply=process.argv[3]==='--apply';
if(!input||process.argv.length>4||process.argv[3]&&!apply)throw Error('Usage: import-broad-catalog.ts staged-raw.json [--apply]');
const rawText=readFileSync(input,'utf8');if(rawText.length>100_000_000)throw Error('Input too large');
const raw:unknown=JSON.parse(rawText);if(!Array.isArray(raw)||raw.length>10000)throw Error('Invalid staging batch');
const fallbackTime=statSync(input).mtime.toISOString();
const rejected:Record<string,number>={},newest=new Map<string,PublicFood>();
const reject=(reason:string)=>{rejected[reason]=(rejected[reason]??0)+1;};
for(const item of raw){try{
 if(item.dataType!=='Branded'||!['US','United States'].includes(item.marketCountry)||item.discontinuedDate){reject('not-active-US-branded');continue;}
 const food=mapUsda(item,String(item.fdcId),item._catalogFetchedAt??fallbackTime);
 if(!food.barcode||!food.ingredients?.trim()||Object.values(food.nutrients).every(v=>v===null)){reject('missing-barcode-ingredients-or-nutrition');continue;}
 const date=foodSourceTime(food.sourceDate);
 if(!Number.isFinite(date)||date>Date.now()+86400000||Date.now()-date>3*366*86400000){reject('old-or-invalid-publication');continue;}
 if(Object.entries(food.nutrients).some(([k,v])=>v!==null&&v>(k==='caloriesKcal'?1000:k==='sodiumMg'?100000:100))){reject('implausible-nutrition');continue;}
 const prior=newest.get(food.barcode);
 if(prior){reject('duplicate-barcode-version');if(foodSourceTime(prior.sourceDate)>date||foodSourceTime(prior.sourceDate)===date&&Number(prior.id)>Number(food.id))continue;}
 newest.set(food.barcode,food);
 }catch{reject('invalid-source-record');}
}
const foods=[...newest.values()],groups:Record<string,number>={},retailerBrands:Record<string,{records:number;comparable:number}>={};
const matchers:Record<string,RegExp>={Wegmans:/\bwegmans\b/i,Walmart:/\b(great value|marketside|bettergoods|wal[ -]?mart)\b/i,'Price Chopper / Market 32':/\b(pics|price chopper|market 32|golub)\b/i,'Whole Foods':/\b(365|whole foods)\b/i};
for(const food of foods){const ready=comparisonReady(food);if(ready)groups[food.comparisonGroup!]=(groups[food.comparisonGroup!]??0)+1;
 for(const [retailer,pattern] of Object.entries(matchers)){if(pattern.test(food.brand??'')){retailerBrands[retailer]??={records:0,comparable:0};retailerBrands[retailer].records++;if(ready)retailerBrands[retailer].comparable++;}}
}
const report={applied:apply,sourceRecords:raw.length,accepted:foods.length,comparisonEligible:Object.values(groups).reduce((a,b)=>a+b,0),groups,retailerBrands,rejected,products:foods.map(f=>({id:f.id,name:f.name,brand:f.brand,barcode:f.barcode,group:f.comparisonGroup??null,eligible:comparisonReady(f),date:f.sourceDate}))};
writeFileSync(root+'/artifacts/remote/catalog-broadening/review.json',JSON.stringify(report,null,2));
if(apply){const db=new PublicDatabase(root+'/.tools/catalog/public.sqlite');try{for(let i=0;i<foods.length;i+=100)db.importFoods(foods.slice(i,i+100));}finally{db.close();}}
const {products,...summary}=report;console.log(JSON.stringify(summary));