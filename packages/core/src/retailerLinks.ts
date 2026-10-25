import type {PublicFood} from './publicFood.ts';
export const retailerSites=[
 {id:'wegmans',name:'Wegmans',url:'https://www.wegmans.com/shop/search',parameter:'query'},
 {id:'walmart',name:'Walmart',url:'https://www.walmart.com/search',parameter:'q'},
 {id:'price-chopper',name:'Price Chopper / Market 32',url:'https://shop.pricechopper.com/store/price-chopper-ny/storefront',parameter:null},
 {id:'whole-foods',name:'Whole Foods Market',url:'https://www.wholefoodsmarket.com/products',parameter:null},
 {id:'target',name:'Target',url:'https://www.target.com/',parameter:null},
 {id:'shaws',name:'Shaw’s',url:'https://www.shaws.com/',parameter:null},
 {id:'trader-joes',name:'Trader Joe’s',url:'https://www.traderjoes.com/',parameter:null},
] as const;
export type RetailerSiteId=typeof retailerSites[number]['id'];
export function retailerFromName(name:string|null|undefined):RetailerSiteId|null{
 const text=(name??'').normalize('NFKC').toLowerCase().replace(/[’']/g,'');
 for(const [id,pattern] of [
  ['wegmans',/\bwegmans\b/],['walmart',/\bwal[ -]?mart\b/],['price-chopper',/\b(?:price chopper|market 32|market bistro)\b/],
  ['whole-foods',/\bwhole foods(?: market)?\b/],['target',/\btarget\b/],['shaws',/\bshaws\b/],['trader-joes',/\btrader joes\b/],
 ] as const)if(pattern.test(text))return id;
 return null;
}
/** Explicit browser action only: no profile, report, coordinates, tester key, price or inferred availability. */
export function retailerProductLink(id:RetailerSiteId,food:Pick<PublicFood,'name'|'brand'>){
 const site=retailerSites.find(s=>s.id===id);
 if(!site)throw Error('Unknown retailer.');
 const term=[food.brand,food.name].filter(Boolean).join(' ').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,160);
 if(!term)throw Error('A product name is needed.');
 return {url:site.url+(site.parameter?'?'+site.parameter+'='+encodeURIComponent(term):''),name:site.name,searchTerm:term,directSearch:site.parameter!==null,availability:'unknown' as const};
}
