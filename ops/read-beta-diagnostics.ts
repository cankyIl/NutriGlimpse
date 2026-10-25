// Private SSH-only operator view. There is intentionally no HTTP diagnostics route.
import {DatabaseSync} from 'node:sqlite';
const args=process.argv.slice(2);
const option=(key:string)=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];};
const limit=Math.max(1,Math.min(2000,Number(option('--limit')??100)||100));
const trace=option('--trace'),product=option('--product')?.toLowerCase();
const db=new DatabaseSync('/path/to/NutriGlimpse/.tools/beta-diagnostics/events.sqlite',{readOnly:true});
try{
 const rows=db.prepare('SELECT at,trace,payload FROM events WHERE at >= ? ORDER BY id DESC LIMIT 2000').all(Date.now()-7*86400000).map(r=>({at:new Date(Number(r.at)).toISOString(),trace:String(r.trace),event:JSON.parse(String(r.payload))}));
 const selected=new Set(rows.filter(r=>(!trace||r.trace===trace)&&(!product||JSON.stringify(r.event).toLowerCase().includes(product))).map(r=>r.trace));
 const matches=rows.filter(r=>selected.has(r.trace)).slice(0,limit).reverse();
 if(args.includes('--json'))process.stdout.write(JSON.stringify(matches,null,2)+'\n');
 else for(const r of matches){
  const e=r.event;console.log(r.at+' ['+r.trace+'] '+e.kind);
  if(e.kind==='decision'){
   console.log('  Product: '+[e.original?.identity.brand,e.original?.identity.name].filter(Boolean).join(' '));
   console.log('  Model rating: '+e.originalModelRating+'; calculated: '+e.originalComputedRating+'; shown: '+e.original?.rating);
   console.log('  Result: '+e.reason+' ('+e.accepted+'/'+e.proposed+' alternatives). Checks: '+e.originalReasons.join(', '));
   for(const a of e.alternatives)console.log('  '+a.disposition+': '+[a.food?.identity.brand,a.food?.identity.name].filter(Boolean).join(' ')+' — '+a.reasons.join(', '));
  }else if(e.kind==='lookup')console.log('  '+e.operation+': '+[e.product.brand,e.product.name].filter(Boolean).join(' ')+' — '+e.outcome+(e.rejected?' '+JSON.stringify(e.rejected):''));
  else console.log('  '+JSON.stringify(e));
 }
 if(!matches.length)console.log('No retained matching records. Only requests after logging was enabled can be investigated.');
}finally{db.close();}
