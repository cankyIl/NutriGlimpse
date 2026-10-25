import { parseSnapshot, type BetaSnapshot } from './beta.ts';
/** Owns only a reviewed compact snapshot; never stores archive bytes or passphrases. */
export class RestorePreview {
 private value:BetaSnapshot|null=null;
 private generation=0;
 private writing=false;
 get preview():BetaSnapshot|null{return this.value?parseSnapshot(JSON.parse(JSON.stringify(this.value))):null;}
 dismiss(){this.generation++;this.value=null;}
 async prepare(read:()=>Promise<BetaSnapshot|null>):Promise<void>{
  if(this.writing)throw Error('Restore is already saving.');
  const generation=++this.generation;this.value=null;
  const result=await read();
  if(generation!==this.generation)return;
  this.value=result?parseSnapshot(result):null;
 }
 async restore(write:(snapshot:BetaSnapshot)=>Promise<boolean>):Promise<boolean>{
  if(this.writing||!this.value)return false;
  const snapshot=this.preview!;const generation=this.generation;this.writing=true;
  try{
   const saved=await write(snapshot);
   if(saved&&generation===this.generation)this.dismiss();
   return saved;
  }finally{this.writing=false;}
 }
}
