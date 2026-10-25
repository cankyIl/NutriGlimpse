import { z } from 'zod';
import { coordinatesSchema, nearbyBranches, type Coordinates } from './stores.ts';
const branchSchema=z.object({id:z.string().min(1).max(100),retailer:z.string().min(1).max(100),name:z.string().min(1).max(200),address:z.string().min(1).max(500),coordinates:coordinatesSchema,sourceUrl:z.string().url().startsWith('https://'),verifiedAt:z.string().datetime()}).strict();
const resultSchema=z.object({origin:coordinatesSchema,originLabel:z.string().min(1).max(200),branches:z.array(branchSchema).max(500)}).strict();
export type BranchSource=(query:{area:string;origin:Coordinates|null},signal:AbortSignal)=>Promise<unknown>;
export async function searchBranches(area:string,origin:Coordinates|null,retailers:string[],radius:number,source:BranchSource|undefined,signal:AbortSignal){
 if(signal.aborted)throw Error('Search cancelled.');
 if(!source)throw Error('A verified branch provider is not configured. Retailer selection still works.');
 const query=area.trim();
 if(query.length>200||(!query&&!origin))throw Error('Enter a search area or choose a location.');
 if(origin)coordinatesSchema.parse(origin);
 const result=resultSchema.parse(await source({area:query,origin},signal));
 if(signal.aborted)throw Error('Search cancelled.');
 if(new Set(result.branches.map(b=>b.id)).size!==result.branches.length)throw Error('Duplicate branch identifiers.');
 return {...result,branches:nearbyBranches(result.origin,result.branches,retailers,radius)};
}
export function confirmBranch(result:Awaited<ReturnType<typeof searchBranches>>,id:string){
 const branch=result.branches.find(b=>b.id===id);
 if(!branch)throw Error('Choose a branch from the current search.');
 return {...branch,coordinates:{...branch.coordinates}};
}
