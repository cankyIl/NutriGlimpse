import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fictionalOcrPages, sanitizeIntake, type IntakeKind } from '../../../packages/core/src/intake.ts';
import { parseProviderResponse } from './extractionProvider.ts';
const execute=promisify(execFile);
export function createFictionalProvider(root:string,allowPaidGeneration=true){
 const pending=new Map<IntakeKind,Promise<unknown>>();
 async function load(kind:IntakeKind){
  const source=sanitizeIntake(kind,fictionalOcrPages(kind)).pages;
  const path=root+'/artifacts/remote/openai/'+kind+'-response.json';
  let raw:string;
  try{raw=await readFile(path,'utf8');}
  catch(error){if(!allowPaidGeneration||(error as NodeJS.ErrnoException).code!=='ENOENT')throw Error('Fixture unavailable');
   await execute('python3',[root+'/ops/openai-budget.py',kind],{cwd:root,timeout:50000,maxBuffer:4096});
   raw=await readFile(path,'utf8');
  }
  const result=parseProviderResponse(kind,raw,source);
  return {schemaVersion:1,synthetic:true,model:'gpt-6-luna',kind,data:'data' in result?result.data:{schemaVersion:result.schemaVersion,testDate:result.testDate,measurements:result.measurements,issues:result.issues}};
 }
 return (kind:IntakeKind)=>{
  let request=pending.get(kind);
  if(!request){request=load(kind).catch(()=>{pending.delete(kind);throw Error('Fictional extraction unavailable');});pending.set(kind,request);}
  return request;
 };
}
