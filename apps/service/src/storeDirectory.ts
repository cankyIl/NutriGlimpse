import {readFileSync} from 'node:fs';
import {storeDirectorySchema} from '../../../packages/core/src/storeDetection.ts';
export function loadStoreDirectory(path:string){
 const text=readFileSync(path,'utf8');if(text.length>2500000)throw Error('Store directory exceeds limit');
 return storeDirectorySchema.parse(JSON.parse(text));
}
