import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PublicDatabase} from '../src/publicDatabase.ts';
import {createProductCardSources,mediaFor} from '../src/productCardSources.ts';
const identity={status:'identified' as const,brand:'Fixture',name:'Plain cereal',variant:null,size:null,visibleText:[]};
const product={code:'012345678905',product_name:'Plain cereal',brands:'Fixture',countries_tags:['en:united-states'],image_front_small_url:'https://images.openfoodfacts.org/images/products/001/234/567/8905/front_en.1.200.jpg'};
test('reference photo search is independent of missing nutrition and never creates a nutrient record',async()=>{
 const db=new PublicDatabase(':memory:',true);let calls=0;
 const sources=createProductCardSources(db,async()=>[],'contact@example.com',async(url,init)=>{calls++;assert.ok(String(url).startsWith('https://search.openfoodfacts.org/search'));assert.equal(init?.redirect,'error');return new Response(JSON.stringify({hits:[product]}));});
 try{const value=await sources.media(identity,new AbortController().signal);assert.equal(value.image?.url,product.image_front_small_url);assert.equal(value.reference,true);assert.equal(db.exportFoods().length,0);await sources.media(identity,new AbortController().signal);assert.equal(calls,1);}finally{db.close();}
});
test('wrong flavor, unsafe photo URL, non-US metadata and upstream outage cannot decorate a food',async()=>{
 for(const candidate of [{...product,product_name:'Chocolate cereal'},{...product,image_front_small_url:'https://evil.test/photo.jpg'},{...product,countries_tags:['en:france']}]){
  const db=new PublicDatabase(':memory:',true);try{const sources=createProductCardSources(db,async()=>[],'contact@example.com',async()=>new Response(JSON.stringify({hits:[candidate]})));assert.equal((await sources.media(identity,new AbortController().signal)).image,null);}finally{db.close();}
 }
 const db=new PublicDatabase(':memory:',true);let calls=0;
 try{const sources=createProductCardSources(db,async()=>[],'contact@example.com',async()=>{calls++;return new Response('unavailable',{status:503});});assert.equal((await sources.media(identity,new AbortController().signal)).image,null);assert.equal(db.reserveOffSearch(),false);assert.equal(calls,1);}finally{db.close();}
});
test('source lookup keeps an honest empty result, with no estimate converted into a public record',async()=>{const db=new PublicDatabase(':memory:',true);try{const sources=createProductCardSources(db,async()=>[],'contact@example.com');assert.deepEqual((await sources.sources(identity,new AbortController().signal)).foods,[]);}finally{db.close();}});

test('parallel card requests queue, reuse persistent metadata and never suppress another card',async()=>{
 const db=new PublicDatabase(':memory:',true);let calls=0;let release!:()=>void;const gate=new Promise<void>(r=>release=r);
 const oldReserve=db.reserveOffSearch.bind(db);db.reserveOffSearch=()=>true;
 const second={...product,code:'016000401068',product_name:'Plain flakes'};
 const cards=createProductCardSources(db,async()=>[],'contact@example.com',async()=>{calls++;await gate;return Response.json({hits:[{...product,brands:['Fixture']},second]});});
 try{const a=cards.media(identity,new AbortController().signal),b=cards.media({...identity,name:'Plain flakes'},new AbortController().signal);release();const both=await Promise.all([a,b]);assert.ok(both.every(x=>x.image));assert.equal(calls,1);
  const restarted=createProductCardSources(db,async()=>[],'contact@example.com',async()=>{throw Error('No network needed');});assert.ok((await restarted.media(identity,new AbortController().signal)).image);assert.equal(db.exportFoods().length,0);
  assert.equal(mediaFor({...identity,name:'Shredded wheat'},{...product,product_name:'Frosted shredded wheat'}),null);
 }finally{db.reserveOffSearch=oldReserve;db.close();}
});

test('reference-only wording normalization retains brand, flavor and cereal shape distinctions',()=>{
 const plain={...product,brands:'General Mills',product_name:'Cheerios'};
 assert.ok(mediaFor({...identity,brand:'Cheerios',name:'Original Cheerios',variant:'Original'},plain));
 assert.equal(mediaFor({...identity,brand:'Cheerios',name:'Honey Nut Cheerios',variant:'Honey Nut'},plain),null);
 const spoon={...product,brands:'Post',product_name:'Shredded Wheat Spoon Sized Original'};
 assert.ok(mediaFor({...identity,brand:'Post',name:'Shredded Wheat Original Spoon Size',variant:'Original'},spoon));
 assert.equal(mediaFor({...identity,brand:'Post',name:'Shredded Wheat Original Big Biscuit',variant:'Original'},spoon),null);
 assert.equal(mediaFor({...identity,brand:'Different',name:'Shredded Wheat Original Spoon Size',variant:'Original'},spoon),null);
});
