import {z} from 'zod';
import type {Profile} from './types.ts';
import {conditions,restrictions,healthFocuses} from './types.ts';
import {betaCatalogUrl} from './catalogClient.ts';
import {newsPoolSchema,validateNewsPool,selectNewsArticles,NEWS_POOL_LIMIT,type NewsPool} from './newsPersonalization.ts';
const condition=z.enum(Object.keys(conditions) as [keyof typeof conditions,...(keyof typeof conditions)[]]);
const restriction=z.enum(Object.keys(restrictions) as [keyof typeof restrictions,...(keyof typeof restrictions)[]]);
const primary=z.enum(Object.keys(healthFocuses).filter(k=>k!=='noConcern') as [Exclude<Profile['primary'],'noConcern'>,...Exclude<Profile['primary'],'noConcern'>[]]);
const preferences=z.object({
 primary:primary.optional(),conditions:z.array(condition).max(8).refine(a=>new Set(a).size===a.length).optional(),
 restrictions:z.array(restriction).max(6).refine(a=>new Set(a).size===a.length).optional(),
 ageGroup:z.literal('65-plus').optional(),pregnancy:z.literal('pregnant').optional(),
}).strict().refine(p=>!!(p.primary||p.conditions?.length||p.restrictions?.length||p.ageGroup||p.pregnancy),'Use general mode when no interests are supplied');
export const newsRequestSchema=z.discriminatedUnion('mode',[
 z.object({mode:z.literal('general')}).strict(),
 z.object({mode:z.literal('personalized'),preferences}).strict(),
]);
export type NewsRequest=z.infer<typeof newsRequestSchema>;
/** Whitelist only fields used for news topics. Raw ages, identifiers, measurements and labs never enter the request. */
export function prepareNewsRequest(profile?:Partial<Profile>|null,enabled=true):NewsRequest{
 if(!enabled||!profile)return{mode:'general'};
 const p:z.infer<typeof preferences>={};
 if(profile.primary&&profile.primary!=='noConcern')p.primary=profile.primary;
 if(profile.conditions?.length)p.conditions=[...new Set(profile.conditions)];
 if(profile.restrictions?.length)p.restrictions=[...new Set(profile.restrictions)];
 if(Number.isFinite(profile.age)&&profile.age!>=65)p.ageGroup='65-plus';
 if(profile.pregnancy==='pregnant')p.pregnancy='pregnant';
 return Object.keys(p).length?newsRequestSchema.parse({mode:'personalized',preferences:p}):{mode:'general'};
}
export const newsSelectionSchema=newsPoolSchema.extend({
 articles:newsPoolSchema.shape.articles.max(5),
 personalized:z.boolean(),generalArticles:newsPoolSchema.shape.articles.max(5),
}).strict();
export type NewsSelection=z.infer<typeof newsSelectionSchema>;
export function validateNewsSelection(value:unknown,now=Date.now()):NewsSelection{
 const selection=newsSelectionSchema.parse(value),{personalized,generalArticles,...base}=selection;
 validateNewsPool(base,now);validateNewsPool({...base,articles:generalArticles},now);
 return selection;
}
/** Called on the backend against the shared daily edition; never fetches a publisher or an LLM. */
export function buildNewsSelection(pool:NewsPool,input:NewsRequest,now=Date.now()):NewsSelection{
 const request=newsRequestSchema.parse(input);
 const p=request.mode==='personalized'?request.preferences:undefined;
 const profile=p?{primary:p.primary,conditions:p.conditions,restrictions:p.restrictions,age:p.ageGroup==='65-plus'?65:undefined,pregnancy:p.pregnancy}:undefined;
 const selected=selectNewsArticles(pool,profile,!!p,now),general=selectNewsArticles(pool,undefined,false,now);
 return validateNewsSelection({...pool,articles:selected.articles,personalized:selected.personalized,generalArticles:general.articles},now);
}
/** Only the shared general fallback may be written to the unencrypted public news cache. */
export function generalNewsCache(selection:NewsSelection):NewsPool{
 const {personalized,generalArticles,...base}=selection;
 return {...base,articles:generalArticles};
}
export async function fetchSelectedNews(input:NewsRequest,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<NewsSelection>{
 if(signal.aborted)throw Error('Cancelled');
 const body=JSON.stringify(newsRequestSchema.parse(input));
 const response=await fetcher(betaCatalogUrl+'/v2/news/selection',{method:'POST',headers:{'Content-Type':'application/json'},body,signal,redirect:'error',cache:'no-store'});
 if(!response.ok)throw Error('News unavailable');
 const raw=await response.text();
 if(raw.length>NEWS_POOL_LIMIT)throw Error('News limit');
 if(signal.aborted)throw Error('Cancelled');
 return validateNewsSelection(JSON.parse(raw));
}
