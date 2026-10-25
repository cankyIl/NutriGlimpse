import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateNewsEdition} from '../../../packages/core/src/foodNews.ts';
import {validateNewsPool,NEWS_POOL_LIMIT,NEWS_MAX_AGE_MS} from '../../../packages/core/src/newsPersonalization.ts';
function read(path:string,limit:number){if(statSync(path).size>limit)throw Error('News limit');return JSON.parse(readFileSync(path,'utf8'));}
function result<T>(edition:T){return {edition,etag:'"'+createHash('sha256').update(JSON.stringify(edition)).digest('hex')+'"'};}
export function readFoodNews(path:string,now=Date.now()){
 const edition=validateNewsEdition(read(path,64000),now);
 // Older installed clients also stop presenting expired stories after a failed refresh.
 return result({...edition,articles:edition.articles.filter(a=>now-Date.parse(a.publishedAt)<=NEWS_MAX_AGE_MS)});
}
export function readNewsPool(path:string,now=Date.now()){
 const edition=validateNewsPool(read(path,NEWS_POOL_LIMIT),now);
 return result({...edition,articles:edition.articles.filter(a=>now-Date.parse(a.publishedAt)<=NEWS_MAX_AGE_MS)});
}
