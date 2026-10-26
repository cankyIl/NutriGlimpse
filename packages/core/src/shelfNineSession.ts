import type {NativeShelfGrid} from './shelfGridSession.ts';
import type {GroceryContext} from './groceryReview.ts';
import {SHELF_NINE_CONSENT,shelfNineRequestSchema,assertNineAssociation,mergeNineProducts,isShelfHealthy,type ShelfNineRequest,type ShelfNineResult,type ShelfNineObservation,type ShelfNineAlternative} from './shelfNine.ts';
type Send=(input:ShelfNineRequest,signal:AbortSignal,progress:(r:ShelfNineResult)=>void)=>Promise<ShelfNineResult>;
export class ShelfNineSession{
 readonly id:string;phase:'capturing'|'finishing'|'complete'|'cancelled'='capturing';
 error='';processed=0;unresolved=0;products:ShelfNineObservation[]=[];batchResults:ShelfNineResult[]=[];
 private observations=new Map<string,ShelfNineObservation[]>();private controller=new AbortController();
 private waiting:{grid:NativeShelfGrid;index:number}[]=[];private seen=new Set<string>();private active=0;private next=0;private counted=new Set<string>();
 private context:GroceryContext;private shareHealth:boolean;private send:Send;private changed:()=>void;private acknowledge:(batch:string)=>void;
 constructor(id:string,context:GroceryContext,shareHealth:boolean,send:Send,changed:()=>void,acknowledge:(batch:string)=>void){this.id=id;this.context=context;this.shareHealth=shareHealth;this.send=send;this.changed=changed;this.acknowledge=acknowledge;}
 get queued(){return this.waiting.length+this.active;}
 get duplicateCount(){return this.products.reduce((n,p)=>n+p.packageIds.length-1,0);}
 get alternatives():ShelfNineAlternative[]{
  if(this.products.some(p=>p.complete&&isShelfHealthy(p.food)))return [];
  const seen=new Set<string>(),rows:ShelfNineAlternative[]=[];
  // Prefer Gemini proposals without comparing or merging their nutrient values.
  const batches=[...this.batchResults].sort((a,b)=>Number(b.model.startsWith('gemini'))-Number(a.model.startsWith('gemini')));
  for(const b of batches)for(const a of b.alternatives){
   const key=[a.food.identity.brand,a.food.identity.name,a.food.identity.variant,a.food.identity.size].join('|').toLowerCase();
   if(!seen.has(key)){seen.add(key);rows.push(a);}
  }
  return rows.slice(0,3);
 }
 accept(grid:NativeShelfGrid){
  if(this.phase!=='capturing'||grid.runId!==this.id||this.seen.has(grid.batchId))return false;
  if(this.queued>=4){this.error='Pause panning while the current products are checked.';this.changed();return false;}
  shelfNineRequestSchema.parse(this.input(grid,this.next));this.seen.add(grid.batchId);
  this.waiting.push({grid,index:this.next++});this.changed();void this.drain();return true;
 }
 private input(grid:NativeShelfGrid,index:number):ShelfNineRequest{
  return shelfNineRequestSchema.parse({schemaVersion:2,consentVersion:SHELF_NINE_CONSENT,sessionId:this.id,batchId:grid.batchId,batchIndex:index,
   capacity:grid.capacity,columns:grid.columns,rows:grid.rows,width:grid.width,height:grid.height,imageBase64:grid.imageBase64,
   cells:grid.cells.map(({cell,packageId,revision})=>({cell,packageId,revision})),shareHealth:this.shareHealth,context:this.context});
 }
 finish(){if(this.phase==='capturing'){this.phase=this.queued?'finishing':'complete';this.changed();}}
 cancel(){this.phase='cancelled';this.controller.abort();this.waiting=[];this.observations.clear();this.products=[];this.batchResults=[];this.context={healthConditions:[],dietaryRestrictions:[],store:null};this.changed();}
 private acceptResult(grid:NativeShelfGrid,result:ShelfNineResult){
  const ready=result.complete||result.primaryComplete===true;
  this.observations.set(grid.batchId,result.products.map(p=>({...p,model:p.sourceModel??result.model,batchId:grid.batchId,
   complete:ready,food:ready?p.food:{...p.food,rating:null},
   packageIds:p.cellNumbers.map(n=>grid.cells.find(c=>c.cell===n)!.packageId),
   photo:grid.cells.find(c=>c.cell===p.cellNumbers[0])?.photo})));
  this.products=mergeNineProducts([...this.observations.values()].flat());
  if(ready){this.batchResults=[...this.batchResults.filter(b=>b.batchId!==result.batchId),result];if(!this.counted.has(grid.batchId)){this.counted.add(grid.batchId);this.processed+=grid.cells.length;}}
  this.changed();
 }
 private async drain(){
  if(this.active>=2||this.controller.signal.aborted)return;const next=this.waiting.shift();
  if(!next){if(this.phase==='finishing'&&this.active===0){this.phase='complete';this.changed();}return;}
  this.active++;this.changed();const {grid,index}=next,input=this.input(grid,index);
  try{
   const result=await this.send(input,this.controller.signal,progress=>{
    if(this.controller.signal.aborted)return;assertNineAssociation(input,progress);this.acceptResult(grid,{...progress,complete:false});
   });
   if(this.controller.signal.aborted)return;assertNineAssociation(input,result);
   this.acceptResult(grid,result);
   this.unresolved+=result.unresolvedCells.length;
  }catch(error){if(!this.controller.signal.aborted){if(!this.counted.has(grid.batchId))this.unresolved+=grid.cells.length;this.error=error instanceof Error?error.message:'This shelf batch could not finish.';}}
  finally{input.imageBase64='';grid.imageBase64='';grid.cells=[];this.active--;
   if(!this.controller.signal.aborted){this.acknowledge(grid.batchId);this.changed();void this.drain();}
  }
 }
}
