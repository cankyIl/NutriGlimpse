import { storeDirectorySchema, type StoreDirectory, mergeFoodCache, type PublicFood, parseSnapshot, type BetaRepository, type BetaSnapshot } from '@grocery/core';
// Browser review remains memory-only. Native resolves repository.native.ts.
let directory:StoreDirectory|null=null;
let foods:PublicFood[]=[];
let memory: BetaSnapshot | null = null;
export async function openRepository(): Promise<BetaRepository> {

  return { storeDirectory:{read:async()=>directory?structuredClone(directory):null,write:async value=>{directory=storeDirectorySchema.parse(value);},clear:async()=>{directory=null;}}, publicFoods: {read:async()=>structuredClone(foods),save:async food=>{foods=mergeFoodCache(foods,food);},clear:async()=>{foods=[];}}, read: async () => memory ? parseSnapshot(JSON.parse(JSON.stringify(memory))) : null,
    write: async value => { memory = parseSnapshot(JSON.parse(JSON.stringify(value))); }, clear: async () => { memory = null; foods=[]; directory=null; } };
}
export const storageDescription = 'Browser preview: session memory only';

