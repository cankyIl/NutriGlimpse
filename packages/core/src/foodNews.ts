import {z} from 'zod';
import {betaCatalogUrl} from './catalogClient.ts';
const hosts=['nutritionsource.hsph.harvard.edu','now.tufts.edu','www.nih.gov'];
const link=z.string().max(1500).url().refine(value=>{const u=new URL(value);return u.protocol==='https:'&&hosts.includes(u.hostname)&&!u.username&&!u.password&&(!u.port||u.port==='443');});
export const newsEditionSchema=z.object({schemaVersion:z.literal(1),editionDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),timeZone:z.literal('America/New_York'),generatedAt:z.string().datetime(),selectionPolicy:z.literal('publisher-rss-2026-10-16.1'),articles:z.array(z.object({id:z.string().regex(/^[a-f0-9]{20}$/),title:z.string().min(5).max(240),publisher:z.enum(['Harvard — The Nutrition Source','Tufts Now','NIH Research Matters']),publishedAt:z.string().datetime(),url:link,topic:z.enum(['Nutrition','Food safety','Food & groceries']),feedUrl:link}).strict()).max(5)}).strict();
export type NewsEdition=z.infer<typeof newsEditionSchema>;
export function validateNewsEdition(value:unknown,now=Date.now()){
 const edition=newsEditionSchema.parse(value);if(Date.parse(edition.generatedAt)>now+60000)throw Error('Future edition');
 const seen=new Set<string>();for(const article of edition.articles){if(Date.parse(article.publishedAt)>Date.parse(edition.generatedAt)||seen.has(article.url))throw Error('Invalid news');seen.add(article.url);}
 return edition;
}
export async function fetchFoodNews(signal:AbortSignal,fetcher:typeof fetch=fetch){const response=await fetcher(betaCatalogUrl+'/v1/news/daily',{signal,redirect:'error'});if(!response.ok)throw Error('News unavailable');const raw=await response.text();if(raw.length>64000)throw Error('News limit');return validateNewsEdition(JSON.parse(raw));}
