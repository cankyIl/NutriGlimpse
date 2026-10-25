import type {NewsArticle,NewsPool} from '../../src/newsPersonalization.ts';
import {newsPublishers,NEWS_POLICY} from '../../src/newsPersonalization.ts';
export const newsNow=Date.parse('2026-10-18T18:00:00Z');
export function article(index:number,options:Partial<NewsArticle>={}):NewsArticle{
 const publisher=options.publisher??(index%2?'EatingWell':'ScienceDaily');
 const source=newsPublishers[publisher];
 return {id:index.toString(16).padStart(20,'0'),title:['Blood sugar and whole grains','Sodium choices for everyday cooking','Practical pantry staples','New research into berry nutrients','Ways to prepare leafy vegetables','Plant based dinner ideas','Muscle recovery meal suggestions','Healthy aging foods'][index%8]+' '+index,publisher,
  publishedAt:new Date(newsNow-3600000-index*1000).toISOString(),url:'https://'+source.host+'/story-'+index,feedUrl:source.feed,topic:'Nutrition',tags:[],kind:'news',evidence:'publisher-report',audience:'general',...options};
}
export function pool(articles:NewsArticle[]):NewsPool{return{schemaVersion:2,editionDate:'2026-10-18',timeZone:'America/New_York',generatedAt:new Date(newsNow).toISOString(),selectionPolicy:NEWS_POLICY,maxAgeDays:7,articles};}
