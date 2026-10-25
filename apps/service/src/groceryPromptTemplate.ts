import {projectRoot} from './projectPaths.ts';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {GroceryContext} from '../../../packages/core/src/groceryReview.ts';
import {shopperPrompt} from './groceryShopperPrompt.ts';
const root=projectRoot;
export function approvedGroceryPrompt(context:GroceryContext,projectRoot=root):string{
 const template=readFileSync(join(projectRoot,'apps/service/prompts/gemini-product-photo-native.txt'),'utf8');
 // Optional shopper fields require the separate, versioned in-app sharing choice.
 const store=context.store;
 const location=store?[store.name,store.town,store.state].filter(Boolean).join(', '):null;
 return template.replace(/{{SHOPPER_CONTEXT}}|{{STORE_SENTENCE}}/g,token=>token==='{{SHOPPER_CONTEXT}}'?shopperPrompt(context):location?'I am in '+location+'.':'No current store or location is selected; do not assume one.').replace(/\n{3,}/g,'\n\n');
}
