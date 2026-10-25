import {groceryLocationSentence} from './groceryLocation.ts';
import type {StoreDirectory} from '../../../packages/core/src/storeDetection.ts';
import {projectRoot} from './projectPaths.ts';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {GroceryContext} from '../../../packages/core/src/groceryReview.ts';
import {shopperPrompt} from './groceryShopperPrompt.ts';
const root=projectRoot;
export function approvedGroceryPrompt(context:GroceryContext,projectRoot=root,directory?:StoreDirectory):string{
 const template=readFileSync(join(projectRoot,'apps/service/prompts/gemini-product-photo-native.txt'),'utf8');
 // Optional shopper fields require the separate, versioned in-app sharing choice.
 return template.replace(/{{SHOPPER_CONTEXT}}|{{STORE_SENTENCE}}/g,token=>token==='{{SHOPPER_CONTEXT}}'?shopperPrompt(context):groceryLocationSentence(context,directory)).replace(/\n{3,}/g,'\n\n');
}
