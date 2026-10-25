/** Permission and scan lifecycle only; this class never captures or transmits media. */
export class CameraSession {
 private focused=false;
 private foreground=false;
 private generation=0;
 private armed=false;
 private requesting=false;
 get canRequest(){return this.focused&&this.foreground&&!this.requesting;}
 get isRequesting(){return this.requesting;}
 get ticket(){return this.generation;}
 setFocused(value:boolean){this.focused=value;if(!value)this.stop();}
 setForeground(value:boolean){this.foreground=value;if(!value)this.stop();}
 stop(){this.generation++;this.armed=false;this.requesting=false;}
 async open(permission:()=>Promise<boolean>):Promise<'opened'|'denied'|'stale'|'unavailable'|'busy'>{
  if(!this.focused||!this.foreground)return 'stale';
  if(this.requesting)return 'busy';
  const generation=++this.generation;this.requesting=true;this.armed=false;
  try{
   const granted=await permission();
   if(generation!==this.generation||!this.focused||!this.foreground)return 'stale';
   this.requesting=false;
   if(!granted)return 'denied';
   this.armed=true;return 'opened';
  }catch{
   if(generation!==this.generation)return 'stale';
   this.requesting=false;return 'unavailable';
  }
 }
 /** One accepted result per camera activation; late callbacks from older views are ignored. */
 consume(ticket:number):boolean{
  if(ticket!==this.generation||!this.armed||!this.focused||!this.foreground)return false;
  this.stop();return true;
 }
}
