const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/photo-fix-2026-10-16');
const ids=new Map(),modules=[];
function bundle(file){
 file=path.resolve(file);if(ids.has(file))return ids.get(file);const id=modules.length;ids.set(file,id);modules.push('');
 let source=fs.readFileSync(file,'utf8');
 if(file.endsWith('.json'))source='module.exports='+source;
 else if(file.endsWith('.ts'))source=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 const resolve=createRequire(file);
 source=source.replace(/require\((['"])([^'"]+)\1\)/g,(original,quote,name)=>'require('+bundle(resolve.resolve(name))+')');
 modules[id]='function(module,exports,require){\n'+source+'\n}';return id;
}
const entry=bundle(path.join(out,'entry.cjs'));
fs.writeFileSync(path.join(out,'runtime-check.js'),'(function(){var modules=['+modules.join(',\n')+'],cache={};function require(id){if(cache[id])return cache[id].exports;var module=cache[id]={exports:{}};modules[id](module,module.exports,require);return module.exports;}require('+entry+');return JSON.stringify(globalThis.CHECK_RESULT);})()');
console.log('Bundled',modules.length,'production modules');
