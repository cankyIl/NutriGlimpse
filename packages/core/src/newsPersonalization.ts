import {z} from 'zod';
import {betaCatalogUrl} from './catalogClient.ts';
import type {Profile} from './types.ts';

export const NEWS_MAX_AGE_MS=7*86400000;
export const NEWS_POOL_LIMIT=160000;
export const NEWS_POLICY='publisher-news-2026-10-18.1' as const;
export const newsPublishers={
 'Harvard — The Nutrition Source':{host:'nutritionsource.hsph.harvard.edu',feed:'https://nutritionsource.hsph.harvard.edu/feed/'},
 'Tufts Now':{host:'now.tufts.edu',feed:'https://now.tufts.edu/food-nutrition'},
 'NIH Research Matters':{host:'www.nih.gov',feed:'https://www.nih.gov/nih-research-matters/feed.xml'},
 EatingWell:{host:'www.eatingwell.com',feed:'https://feeds-api.dotdashmeredith.com/v1/rss/google/dcbd6d38-4ab3-42e8-a5f6-37a8a48ceb94'},
 'Clean Eating':{host:'www.cleaneatingmag.com',feed:'https://www.cleaneatingmag.com/feed/?scope=anon'},
 ScienceDaily:{host:'www.sciencedaily.com',feed:'https://www.sciencedaily.com/rss/health_medicine/nutrition.xml'},
} as const;
const tags=['diabetes','hypertension','cardiovascular','ckd','masld','sibo','celiac','weight','generalFitness','vegetarian','eggFree','dairyFree','halal','kosher','glutenFree','pregnancy','olderAdults'] as const;
const publisher=z.enum(Object.keys(newsPublishers) as [keyof typeof newsPublishers,...(keyof typeof newsPublishers)[]]);
const articleSchema=z.object({
 id:z.string().regex(/^[a-f0-9]{20}$/),title:z.string().min(5).max(240).refine(s=>! /[\u0000-\u001f\u007f]/.test(s)),
 publisher,publishedAt:z.string().datetime(),url:z.string().max(1500).url(),feedUrl:z.string().max(1500).url(),
 topic:z.enum(['Nutrition','Food safety','Food & groceries']),tags:z.array(z.enum(tags)).max(tags.length).refine(a=>new Set(a).size===a.length),
 kind:z.enum(['research','recipe','news']),evidence:z.enum(['early-research','publisher-report']),audience:z.enum(['children','general']),
}).strict().refine(a=>{
 const u=new URL(a.url),p=newsPublishers[a.publisher];
 return u.protocol==='https:'&&u.hostname===p.host&&!u.username&&!u.password&&(!u.port||u.port==='443')&&a.feedUrl===p.feed;
},'Untrusted publisher link');
export const newsPoolSchema=z.object({
 schemaVersion:z.literal(2),editionDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
 timeZone:z.literal('America/New_York'),generatedAt:z.string().datetime(),selectionPolicy:z.literal(NEWS_POLICY),
 maxAgeDays:z.literal(7),articles:z.array(articleSchema).max(50),
}).strict();
export type NewsPool=z.infer<typeof newsPoolSchema>;
export type NewsArticle=NewsPool['articles'][number];
export function newsDay(now:number){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function validateNewsPool(value:unknown,now=Date.now()):NewsPool{
 const pool=newsPoolSchema.parse(value),generated=Date.parse(pool.generatedAt);
 if(!Number.isFinite(now)||generated>now+60000||newsDay(generated)!==pool.editionDate)throw Error('Invalid news edition date');
 const urls=new Set<string>(),ids=new Set<string>();
 for(const a of pool.articles){
  const stamp=Date.parse(a.publishedAt);
  if(stamp>generated||generated-stamp>NEWS_MAX_AGE_MS||urls.has(a.url)||ids.has(a.id))throw Error('Invalid news article');
  urls.add(a.url);ids.add(a.id);
 }
 return pool;
}
/** Public endpoint only: no profile, selected interests, age or location are sent. */
export async function fetchNewsPool(signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<NewsPool>{
 if(signal.aborted)throw Error('Cancelled');
 const response=await fetcher(betaCatalogUrl+'/v2/news/daily',{signal,redirect:'error'});
 if(!response.ok)throw Error('News unavailable');
 const raw=await response.text();
 if(raw.length>NEWS_POOL_LIMIT)throw Error('News limit');
 if(signal.aborted)throw Error('Cancelled');
 return validateNewsPool(JSON.parse(raw));
}
type Interests=Partial<Pick<Profile,'primary'|'conditions'|'restrictions'|'age'|'pregnancy'>>;
function interests(profile:Interests|null|undefined){
 const weights=new Map<string,number>();
 if(!profile)return weights;
 for(const condition of profile.conditions??[])weights.set(condition,20);
 if(profile.primary&&profile.primary!=='noConcern')weights.set(profile.primary,30);
 for(const restriction of profile.restrictions??[])weights.set(restriction,20);
 if(profile.pregnancy==='pregnant')weights.set('pregnancy',20);
 if(Number.isFinite(profile.age)&&profile.age!>=65)weights.set('olderAdults',12);
 return weights;
}
function duplicate(a:NewsArticle,b:NewsArticle){
 if(a.url===b.url||a.id===b.id)return true;
 const words=(title:string)=>new Set(title.toLowerCase().match(/[a-z]{4,}/g)??[]);
 const x=words(a.title),y=words(b.title),union=new Set([...x,...y]);
 return [...x].filter(v=>y.has(v)).length/Math.max(1,union.size)>0.7;
}
/** Deterministic backend topic relevance, not health advice or dietary-safety verification. */
export function selectNewsArticles(pool:NewsPool,profile?:Interests|null,enabled=true,now=Date.now()){
 const weights=enabled?interests(profile):new Map<string,number>();
 const ranked=pool.articles.filter(a=>Date.parse(a.publishedAt)<=now&&now-Date.parse(a.publishedAt)<=NEWS_MAX_AGE_MS&&a.audience!=='children')
 .map(article=>{
  const age=(now-Date.parse(article.publishedAt))/86400000;
  const relevance=Math.min(40,article.tags.reduce((sum,tag)=>sum+(weights.get(tag)??0),0));
  const freshness=age<=1?40:Math.max(0,24-age*3);
  return {article,relevance,score:freshness+relevance+(article.topic==='Food safety'?10:0)};
 }).sort((a,b)=>b.score-a.score||b.article.publishedAt.localeCompare(a.article.publishedAt)||a.article.id.localeCompare(b.article.id));
 const selected:NewsArticle[]=[];const publishers=new Map<string,number>();
 function add(row:typeof ranked[number]){
  if(selected.length>=5||(publishers.get(row.article.publisher)??0)>=3||selected.some(a=>duplicate(a,row.article)))return false;
  selected.push(row.article);publishers.set(row.article.publisher,(publishers.get(row.article.publisher)??0)+1);return true;
 }
 // Keep broad food news in the mix: reserve up to two places for non-matching stories.
 const generalAvailable=ranked.filter(r=>r.relevance===0).length;
 const matchedLimit=weights.size?5-Math.min(2,generalAvailable):0;
 let matched=0;
 for(const row of ranked)if(row.relevance>0&&matched<matchedLimit&&add(row))matched++;
 for(const row of ranked)if(row.relevance===0)add(row);
 // Diversity can make reserved slots impossible. A valid extra interest match may fill one.
 for(const row of ranked)add(row);
 selected.sort((a,b)=>ranked.findIndex(r=>r.article.id===a.id)-ranked.findIndex(r=>r.article.id===b.id));
 return {articles:selected,personalized:weights.size>0&&selected.some(a=>a.tags.some(t=>weights.has(t)))};
}
