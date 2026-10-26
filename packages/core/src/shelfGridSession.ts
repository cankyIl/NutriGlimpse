import {SHELF_GRID_CONSENT,shelfGridRequestSchema,mergeShelfProducts,assertShelfAssociation,type ShelfGridRequest,type ShelfGridResult,type ShelfProduct} from './shelfGrid.ts';
export type NativeShelfGrid={runId:string;batchId:string;capacity:number;columns:number;rows:number;width:number;height:number;imageBase64:string;cells:{cell:number;packageId:string;revision:number;photo:string}[]};
type Send=(input:ShelfGridRequest,signal:AbortSignal,onProgress:(r:ShelfGridResult)=>void)=>Promise<ShelfGridResult>;
export class ShelfGridSession {
 readonly id:string;
 phase:'capturing'|'finishing'|'complete'|'cancelled'='capturing';
 products:ShelfProduct[]=[];
 error='';processed=0;unresolved=0;preview:string[]=[];
 private waiting:NativeShelfGrid[]=[];private busy=false;
 private controller=new AbortController();private seen=new Set<string>();
 private send:Send;private changed:()=>void;private acknowledge:(batchId:string)=>void;
 constructor(id:string,send:Send,changed:()=>void,acknowledge:(batchId:string)=>void){this.id=id;this.send=send;this.changed=changed;this.acknowledge=acknowledge;}
 get queued(){return this.waiting.length+(this.busy?1:0);}
 accept(grid:NativeShelfGrid){
  if(this.phase!=='capturing'||grid.runId!==this.id||this.seen.has(grid.batchId))return false;
  if(this.queued>=3){this.error='Pause panning while the current products are checked.';this.changed();return false;}
  shelfGridRequestSchema.parse(this.input(grid));
  this.seen.add(grid.batchId);this.waiting.push(grid);this.changed();void this.drain();return true;
 }
 private input(grid:NativeShelfGrid):ShelfGridRequest{
  // Native React events add view metadata such as target. Only the documented
  // grid payload crosses the API boundary; the request schema stays strict.
  return {schemaVersion:1,sessionId:grid.runId,consentVersion:SHELF_GRID_CONSENT,
   batchId:grid.batchId,capacity:grid.capacity,columns:grid.columns,rows:grid.rows,
   width:grid.width,height:grid.height,imageBase64:grid.imageBase64,
   cells:grid.cells.map(({cell,packageId,revision})=>({cell,packageId,revision}))};
 }
 finish(){if(this.phase==='capturing'){this.phase='finishing';if(!this.queued)this.phase='complete';this.changed();}}
 cancel(){this.phase='cancelled';this.controller.abort();this.waiting=[];this.products=[];this.preview=[];this.changed();}
 private async drain(){
  if(this.busy||this.controller.signal.aborted)return;
  const grid=this.waiting.shift();if(!grid){if(this.phase==='finishing'){this.phase='complete';this.changed();}return;}
  this.busy=true;this.changed();
  const input=this.input(grid);let progressResult:ShelfGridResult|undefined;
  try{
   const result=await this.send(input,this.controller.signal,progress=>{
    if(this.controller.signal.aborted)return;assertShelfAssociation(input,progress);progressResult=progress;
    this.preview=progress.cells.flatMap(c=>c.review?.original?[c.review.original.identity.name??'Product']:[]);this.changed();
   });
   if(this.controller.signal.aborted)return;assertShelfAssociation(input,result);
   this.processed+=result.cells.length;this.unresolved+=result.cells.filter(c=>!c.review?.original||c.issue!=='none').length;
   const incoming=result.cells.flatMap(c=>c.review?.original?[{packageId:c.packageId,review:c.review,needsAlternatives:c.needsAlternatives,photo:grid.cells.find(x=>x.packageId===c.packageId)?.photo}]:[]);
   this.products=mergeShelfProducts(this.products,incoming);
  }catch(e){if(!this.controller.signal.aborted){
    // Keep validated facts after an interrupted final stream, without claiming a finished ranking.
    const retained=progressResult?.cells.flatMap(c=>c.review?.original&&c.issue==='none'?[{packageId:c.packageId,review:{...c.review,reviewState:'partial' as const,original:{...c.review.original,rating:null}},needsAlternatives:false,rankingReady:false,photo:grid.cells.find(x=>x.packageId===c.packageId)?.photo}]:[])??[];
    this.products=mergeShelfProducts(this.products,retained);this.processed+=retained.length;
    this.unresolved+=grid.cells.length;this.error=e instanceof Error?e.message:'This shelf section could not be checked.';
   }}
  finally{
   input.imageBase64='';grid.imageBase64='';grid.cells=[];this.preview=[];this.busy=false;
   if(!this.controller.signal.aborted){this.acknowledge(grid.batchId);this.changed();void this.drain();}
  }
 }
}
