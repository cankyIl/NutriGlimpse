import {endScanTiming,discardScanTiming} from './ScanTiming';
import {aiPhotoPreviewSchema,type AiPhotoPreview} from '../../../../packages/core/src/aiFoodReview';
import {photoReviewResultSchema as aiFoodResultSchema,type PhotoReviewResult as AiFoodResult} from '../../../../packages/core/src/dualAiFoodReview';
// Transient screen transfer only. No photo, profile or result is written to storage.
type Scan={token:string;result:AiFoodResult|null;identity:AiPhotoPreview|null;photo:string;expires:number;pending:boolean;error:string};
let value:Scan|null=null,controller:AbortController|null=null;const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(fn=>fn());
export const aiScanState={
 start(token:string,photo:string,request:AbortController){
  this.clear();controller=request;
  value={token,result:null,identity:null,photo:photo.length<=1400000?photo:'',expires:Date.now()+10*60000,pending:true,error:''};emit();
 },
 identify(token:string,identity:AiPhotoPreview){if(value?.token!==token||!value.pending||controller?.signal.aborted||value.result)return;value={...value,identity:aiPhotoPreviewSchema.parse(identity)};emit();},
 put(token:string,result:AiFoodResult,photo:string,pending=false,request?:AbortController){
  if(value?.token!==token){if(value){endScanTiming(value.token,'cancelled');discardScanTiming(value.token);}controller?.abort();}controller=request??null;
  value={token,result:aiFoodResultSchema.parse(result),identity:null,photo:photo.length<=1400000?photo:'',expires:Date.now()+10*60000,pending,error:''};emit();
 },
 update(token:string,result:AiFoodResult,pending:boolean){if(value?.token!==token||controller?.signal.aborted)return;value={...value,result:aiFoodResultSchema.parse(result),identity:null,pending};if(!pending)controller=null;emit();},
 fail(token:string,message:string){if(value?.token!==token)return;endScanTiming(token,'failed');controller?.abort();controller=null;value={...value,result:null,identity:null,photo:'',pending:false,error:message};emit();},
 get(token:string){if(value&&value.expires<Date.now()){endScanTiming(value.token,'cancelled');discardScanTiming(value.token);controller?.abort();controller=null;value=null;}return value?.token===token?{...value}:null;},
 subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};},
 cancel(token:string){if(value?.token===token&&value.pending){endScanTiming(token,'cancelled');this.fail(token,'Scan interrupted. Please take another photo.');}},
 clearPhoto(){if(value)value={...value,photo:''};emit();},
 clear(){if(value){endScanTiming(value.token,'cancelled');discardScanTiming(value.token);}controller?.abort();controller=null;value=null;emit();},
};
