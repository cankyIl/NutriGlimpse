const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const manifest=require('../vendor/security-patches/provenance.json');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Security patch context changed');return s.replace(a,b);};
function patch(name,source){
 if(name==='deepmerge')return once(source,'return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target))',"return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target)).filter(function(key) {\n\t\treturn key !== '__proto__' && key !== 'constructor' && key !== 'prototype'\n\t})");
 if(name==='zod'){
  const cjs=source.includes('exports.ZodArray'),invalid=cjs?'parseUtil_js_1.INVALID':'INVALID';
  for(const [kind,anchor,condition] of [
   ['ZodArray','        if (ctx.common.async) {','(def.maxLength !== null && ctx.data.length > def.maxLength.value) || (def.exactLength !== null && ctx.data.length > def.exactLength.value)'],
   ['ZodSet','        const valueType = this._def.valueType;','def.maxSize !== null && ctx.data.size > def.maxSize.value']]){
   const begin=source.indexOf('class '+kind+' extends ZodType'),end=source.indexOf('\n}',begin)+2;
   if(begin<0||end<begin)throw Error('Zod class changed');
   const block=source.slice(begin,end),replacement=once(block,anchor,'        // Reject oversized constrained collections before visiting elements.\n        if ('+condition+') return '+invalid+';\n'+anchor);
   source=source.slice(0,begin)+replacement+source.slice(end);
  }
  return source;
 }
 throw Error('Unknown patched dependency');
}
const lock=require('../package-lock.json');let count=0;
for(const [relative,pkg] of Object.entries(lock.packages)){
 const name=relative.endsWith('/deepmerge')?'deepmerge':relative.endsWith('/zod')?'zod':null;if(!name)continue;
 const entry=manifest.packages.find(p=>p.name===name&&p.version===pkg.version);
 if(!entry)throw Error('Security dependency version changed; review patch: '+name+' '+pkg.version);
 for(const item of entry.files){
  const target=path.resolve(root,relative,item.path);if(!target.startsWith(root+path.sep))throw Error('Unsafe patch path');
  const original=fs.readFileSync(target,'utf8'),digest=sha(original);
  if(digest===item.patchedSha256){count++;continue;}
  if(digest!==item.originalSha256)throw Error('Security source differs: '+target);
  if(process.argv.includes('--check'))throw Error('Security patch missing: '+target);
  const output=patch(name,original);if(sha(output)!==item.patchedSha256)throw Error('Security patch digest mismatch');
  fs.writeFileSync(target,output);count++;
 }
}
if(count!==manifest.expectedFiles)throw Error('Security dependency layout changed; review patch coverage');
console.log('Verified dependency hardening for '+count+' entry files.');
