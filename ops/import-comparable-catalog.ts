import {readFileSync,writeFileSync} from 'node:fs';
import {mapUsda} from '../apps/service/src/usda.ts';
import {PublicDatabase} from '../apps/service/src/publicDatabase.ts';
import {comparisonReady,type PublicFood} from '../packages/core/src/index.ts';
const root='/path/to/NutriGlimpse';
const input=process.argv[2];const apply=process.argv[3]==='--apply';
if(!input||process.argv.length>4)throw Error('Usage: import-comparable-catalog.ts reviewed-raw.json [--apply]');
const text=readFileSync(input,'utf8');if(text.length>15000000)throw Error('Input too large');
const raw:unknown=JSON.parse(text);if(!Array.isArray(raw)||raw.length>1000)throw Error('Invalid batch');
const reasons:Record<string,number>={};const reject=(reason:string)=>{reasons[reason]=(reasons[reason]??0)+1;};
const newest=new Map<string,PublicFood>();
for(const item of raw){
 try{
  const food=mapUsda(item,String(item.fdcId));
  if(!food.comparisonGroup||!food.barcode){reject('unclassified-form-or-invalid-barcode');continue;}
  const previous=newest.get(food.barcode);
  if(!previous||Date.parse(food.sourceDate??'')>Date.parse(previous.sourceDate??'')||food.sourceDate===previous.sourceDate&&Number(food.id)>Number(previous.id))newest.set(food.barcode,food);
  if(previous)reject('duplicate-barcode-version');
 }catch{reject('invalid-source-record');}
}
const foods=[...newest.values()].filter(f=>{if(!comparisonReady(f)){reject('missing-implausible-or-old-nutrition');return false;}return true;});
const groups:Record<string,number>={};for(const f of foods)groups[f.comparisonGroup!]=(groups[f.comparisonGroup!]??0)+1;
writeFileSync(root+'/artifacts/remote/catalog-expansion/review.json',JSON.stringify({sourceRecords:raw.length,accepted:foods.length,groups,reasons,products:foods.map(f=>({id:f.id,name:f.name,brand:f.brand,barcode:f.barcode,group:f.comparisonGroup,date:f.sourceDate}))},null,2));
if(apply){
 const db=new PublicDatabase(root+'/.tools/catalog/public.sqlite');
 try{for(let i=0;i<foods.length;i+=100)db.importFoods(foods.slice(i,i+100));}finally{db.close();}
}
console.log(JSON.stringify({applied:apply,sourceRecords:raw.length,accepted:foods.length,groups,reasons}));
