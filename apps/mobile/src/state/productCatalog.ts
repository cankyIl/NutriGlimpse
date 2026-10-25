import {parseRecognitionCatalog,type PublicFood} from '@grocery/core';
import snapshot from '../../assets/catalog/public-foods.json';
let catalog:PublicFood[]|undefined;
/** Public licensed food facts only. No profile, photograph or recognized text is cached here. */
export function productCatalog(){return catalog??(catalog=parseRecognitionCatalog(snapshot));}
export function identifiedFood(key:string){return productCatalog().find(food=>food.provider+':'+food.id===key);}
