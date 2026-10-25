import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {parseRecognitionCatalog,recognizeProductPhoto} from '../packages/core/src/photoRecognition.ts';
const foods=parseRecognitionCatalog(JSON.parse(readFileSync(new URL('../apps/mobile/assets/catalog/public-foods.json',import.meta.url),'utf8')));
const groups=new Map<string,typeof foods>();for(const food of foods){const group=food.comparisonGroup??'unclassified';groups.set(group,[...(groups.get(group)??[]),food]);}
const selected=[...groups.values()].flatMap(group=>group.filter(food=>food.brand&&food.name.length<170).filter((_,i)=>i%Math.max(1,Math.floor(group.length/4))===0).slice(0,4));
let found=0;const missed:unknown[]=[],times:number[]=[];
for(const food of selected){
 const input=[{page:1,width:1200,height:800,lines:[{id:'name',text:food.name,x:20,y:200,width:1100,height:100,confidence:.99},{id:'brand',text:food.brand!,x:20,y:50,width:1100,height:80,confidence:.99}]}];
 const start=performance.now(),result=recognizeProductPhoto(input,foods);times.push(performance.now()-start);
 const match=result.options.some(option=>(option.food.provider===food.provider&&option.food.id===food.id)||(food.barcode&&option.food.barcode===food.barcode)||option.food.name.toLowerCase()===food.name.toLowerCase());
 if(result.status==='confirmed')throw Error('Unexpected automatic photo confirmation');
 if(match)found++;else missed.push({name:food.name,brand:food.brand,group:food.comparisonGroup,suggestions:result.options.map(o=>o.food.name)});
}
times.sort((a,b)=>a-b);
const output={scope:'Text-only retrieval benchmark using catalog names/brands; NOT camera OCR accuracy or retailer coverage',records:foods.length,cases:selected.length,foundInTopFive:found,missed,p95Ms:times[Math.floor(times.length*.95)],worstMs:times.at(-1)};
writeFileSync(new URL('../artifacts/photo-camera-2026-10-15/catalog-retrieval.json',import.meta.url),JSON.stringify(output,null,2));console.log(JSON.stringify({...output,missed:missed.slice(0,5)},null,2));
