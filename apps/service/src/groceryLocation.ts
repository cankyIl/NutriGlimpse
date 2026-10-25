import type {GroceryContext} from '../../../packages/core/src/groceryReview.ts';
import type {StoreDirectory} from '../../../packages/core/src/storeDetection.ts';
import {straightLineMiles} from '../../../packages/core/src/stores.ts';
import {mappedStoreTown} from '../../../packages/core/src/groceryContext.ts';
/** Only a fresh, approximate fix is used. No submitted street address is accepted. */
export function normalizeGroceryLocation(context:GroceryContext,now=Date.now()):GroceryContext{
 const {location,...rest}=context;
 if(context.store||!location||now-location.observedAt>90000||location.observedAt>now+10000)return rest;
 return {...rest,location:{latitude:Math.round(location.latitude*100)/100,longitude:Math.round(location.longitude*100)/100,observedAt:location.observedAt}};
}
export function nearbyGroceryStores(context:GroceryContext,directory?:StoreDirectory){
 if(context.store||!context.location||!directory)return [];
 return directory.stores.map(store=>({store,distance:straightLineMiles({latitude:context.location!.latitude,longitude:context.location!.longitude},store.coordinates)})).filter(row=>row.distance<=15).sort((a,b)=>a.distance-b.distance);
}
export function groceryLocationSentence(context:GroceryContext,directory?:StoreDirectory):string{
 if(context.store)return 'I am in '+[context.store.name,context.store.town,context.store.state].filter(Boolean).join(', ')+'.';
 const nearby=nearbyGroceryStores(context,directory),town=nearby.map(r=>mappedStoreTown(r.store)).find(Boolean);
 return town?'I am near '+town+', MA, with no store selected.':'No current store or location is selected; do not assume one.';
}
export function retailerSearchContext(context:GroceryContext,directory?:StoreDirectory):string|null{
 if(context.store)return 'I am shopping at '+[context.store.name,context.store.town,context.store.state].filter(Boolean).join(', ')+'.';
 const nearby=nearbyGroceryStores(context,directory);if(!nearby.length)return null;
 const names=[...new Set(nearby.map(r=>[r.store.name,mappedStoreTown(r.store),'MA'].filter(Boolean).join(', ')))].slice(0,8);
 return groceryLocationSentence(context,directory)+' Nearby mapped stores: '+names.join('; ')+'.';
}
