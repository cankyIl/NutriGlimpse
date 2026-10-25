import {mapUsda} from './usda.ts';
import type {PublicFood} from '../../../packages/core/src/publicFood.ts';
/** One bounded upstream request, no retry; omitted records never acquire a new retrieval date. */
export async function fetchUsdaBatch(ids:string[],key:string,fetcher:typeof fetch=fetch):Promise<{foods:PublicFood[];missing:string[]}>{
 if(!ids.length||ids.length>20||new Set(ids).size!==ids.length||ids.some(id=>!/^[1-9]\d{0,9}$/.test(id))||!key.trim())throw Error('Invalid USDA batch');
 const response=await fetcher('https://api.nal.usda.gov/fdc/v1/foods',{method:'POST',headers:{'X-Api-Key':key,'Content-Type':'application/json'},body:JSON.stringify({fdcIds:ids.map(Number),format:'full'}),redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!response.ok||!response.body)throw Error('USDA batch unavailable');
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>16000000)throw Error('USDA batch too large');chunks.push(part.value);}}finally{await reader.cancel();}
 const raw:unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(!Array.isArray(raw)||raw.length>20)throw Error('Invalid USDA response');
 const seen=new Set<string>(),foods:PublicFood[]=[];
 for(const item of raw){const id=String(item?.fdcId);if(!ids.includes(id)||seen.has(id))throw Error('Unexpected or duplicate USDA identity');seen.add(id);foods.push(mapUsda(item,id));}
 return {foods,missing:ids.filter(id=>!seen.has(id))};
}
