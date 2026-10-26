import type {EstimatedFood} from '../../../packages/core/src/aiFoodReview.ts';
import {shelfProductKey} from '../../../packages/core/src/shelfGrid.ts';
import {shelfNineResultSchema,type ShelfNineResult,type ShelfNineProduct} from '../../../packages/core/src/shelfNine.ts';
type Identity=Pick<EstimatedFood['identity'],'brand'|'name'|'variant'|'size'>;
type Signature={brand:string;core:string;flavors:string|null};
const words=(value:string)=>value.normalize('NFKD').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
const key=(tokens:string[])=>[...new Set(tokens)].sort().join('|');
/** Display grouping only: never use this identity to fill or compare nutrient tables. */
function signature(food:EstimatedFood):Signature|null{
 const i=food.identity;if(i.status!=='identified'||!i.brand||!i.name)return null;
 const brand=words(i.brand),name=i.name,variant=i.variant??'';
 // Named contents of a variety pack are optional details, not another formulation.
 // When both observations name their contents, different contents stay separate.
 const listedFlavors=/\bvariety\b/i.test(name)&&! /\bvariety\b/i.test(variant)&&/[,/;]/.test(variant);
 const clean=(value:string)=>value.replace(/\b(?:mega|family|giant|party|value)\s+size\b/gi,' ').replace(/\bblasted with real\b/gi,' ');
 const ignore=new Set(['original','regular','classic','cereal','cereals','breakfast','pack','packets']);
 const core=key([...brand,...words(clean(name+' '+(listedFlavors?'':variant)))].filter(t=>!ignore.has(t)));
 return core?{brand:key(brand),core,flavors:listedFlavors?key(words(variant).filter(t=>t!=='and')):null}:null;
}
const compatibleBrand=(a:string,b:string)=>a.split('|').every(t=>b.split('|').includes(t))||b.split('|').every(t=>a.split('|').includes(t));
type Entry={signature:Signature;identity:Identity};
type Session={at:number;entries:Entry[]};
/** Bounded, transient aliases let already-shipped phones merge cross-batch sightings. */
export class ShelfDisplayIdentities{
 private sessions=new Map<string,Session>();
 private now:()=>number;private maxSessions:number;private maxProducts:number;
 constructor(now:()=>number=Date.now,maxSessions=128,maxProducts=256){this.now=now;this.maxSessions=maxSessions;this.maxProducts=maxProducts;}
 normalize(result:ShelfNineResult,scope=''):ShelfNineResult{
  const now=this.now();for(const [key,s] of this.sessions)if(now-s.at>15*60000)this.sessions.delete(key);
  const id=result.sessionId+'|'+scope;let session=this.sessions.get(id);
  const ready=result.complete||result.primaryComplete===true;
  if(!session&&ready){
   if(this.sessions.size>=this.maxSessions){const oldest=[...this.sessions].sort((a,b)=>a[1].at-b[1].at)[0];if(oldest)this.sessions.delete(oldest[0]);}
   session={at:now,entries:[]};this.sessions.set(id,session);
  }
  if(session)session.at=now;
  const products=result.products.map(row=>{
   const sig=signature(row.food);if(!sig||!session)return row;
   const matches=session.entries.filter(e=>compatibleBrand(e.signature.brand,sig.brand)&&e.signature.core===sig.core&&(!e.signature.flavors||!sig.flavors||e.signature.flavors===sig.flavors));
   let entry=matches.length===1?matches[0]:undefined;
   if(!entry&&ready&&session.entries.length<this.maxProducts){
    const {brand,name,variant,size}=row.food.identity;entry={signature:sig,identity:{brand,name,variant,size}};session.entries.push(entry);
   }
   if(!entry)return row;
   if(ready&&!entry.signature.flavors&&sig.flavors)entry.signature.flavors=sig.flavors;
   return {...row,food:{...row.food,identity:{...row.food.identity,...entry.identity}}};
  });
  const grouped=new Map<string,ShelfNineProduct>();
  for(const row of products){
   const k=row.food.identity.status==='identified'?shelfProductKey(row.food):'cell:'+row.cellNumbers.join(',');const previous=grouped.get(k);
   if(!previous){grouped.set(k,row);continue;}
   const priorModel=previous.sourceModel??result.model,currentModel=row.sourceModel??result.model;
   const preferGemini=currentModel==='gemini-3.5-flash-lite'&&priorModel!=='gemini-3.5-flash-lite';
   const chosen=preferGemini||currentModel===priorModel&&Math.min(...row.cellNumbers)<Math.min(...previous.cellNumbers)?row:previous;
   grouped.set(k,{...chosen,cellNumbers:[...new Set([...previous.cellNumbers,...row.cellNumbers])].sort((a,b)=>a-b)});
  }
  const order={very_healthy:0,healthy:0,neutral:1,not_healthy:2};
  const rows=[...grouped.values()].sort((a,b)=>(a.food.rating?order[a.food.rating]:3)-(b.food.rating?order[b.food.rating]:3));
  return shelfNineResultSchema.parse({...result,products:rows,duplicatesRemoved:rows.reduce((sum,p)=>sum+p.cellNumbers.length-1,0)});
 }
}
