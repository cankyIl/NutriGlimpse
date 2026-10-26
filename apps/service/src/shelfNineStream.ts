// Find only a top-level array property. Text inside ingredients or other nested
// strings must not be mistaken for a streamed alternatives array.
export function partialShelfRows(text:string,key:'products'|'alternatives',limit:number):unknown[]{
 let depth=0,start=-1;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){
   const begin=i;let escape=false,closed=false;
   for(i++;i<text.length;i++){if(escape)escape=false;else if(text[i]==='\\')escape=true;else if(text[i]==='"'){closed=true;break;}}
   if(!closed)return [];
   if(depth===1){let next=i+1;while(/\s/.test(text[next]??'')&&next<text.length)next++;
    if(text[next]===':'){next++;while(/\s/.test(text[next]??'')&&next<text.length)next++;
     if(text[next]==='['&&JSON.parse(text.slice(begin,i+1))===key){start=next+1;break;}
    }
   }
  }else if(c==='{'||c==='[')depth++;else if(c==='}'||c===']')depth--;
 }
 if(start<0)return [];
 const values:unknown[]=[];let i=start;
 while(i<text.length&&values.length<limit){
  while(/[\s,]/.test(text[i]??'')&&i<text.length)i++;
  if(text[i]!=='{')break;
  const begin=i;let level=0,quoted=false,escape=false,done=false;
  for(;i<text.length;i++){const c=text[i];
   if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;}
   else if(c==='"')quoted=true;else if(c==='{'||c==='[')level++;else if(c==='}'||c===']'){level--;if(level===0){i++;done=true;break;}}
  }
  if(!done)break;
  try{values.push(JSON.parse(text.slice(begin,i)));}catch{break;}
 }
 return values;
}
