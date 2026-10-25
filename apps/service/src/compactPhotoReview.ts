import {z} from 'zod';
import {estimatedFoodSchema,estimatedNutrientsSchema,type EstimatedFood} from '../../../packages/core/src/aiFoodReview.ts';
import {photoIdentitySchema,type PhotoIdentity} from '../../../packages/core/src/productPhoto.ts';
// Provider-only wire format. Public v3 records and all validation rules stay unchanged.
export const identityKeys={s:'status',b:'brand',n:'name',v:'variant',z:'size'} as const;
export const nutrientKeys={kcal:'caloriesKcal',sf:'saturatedFatG',tf:'transFatG',su:'sugarsG',ad:'addedSugarsG',cb:'carbohydrateG',na:'sodiumMg',fi:'fiberG',pr:'proteinG',k:'potassiumMg',ca:'calciumMg',fe:'ironMg',mg:'magnesiumMg'} as const;
const identity=z.object(Object.fromEntries(Object.entries(identityKeys).map(([key,name])=>[key,photoIdentitySchema.innerType().shape[name]]))).strict();
const nutrients=z.object(Object.fromEntries(Object.entries(nutrientKeys).map(([key,name])=>[key,estimatedNutrientsSchema.shape[name]]))).strict();
const f=estimatedFoodSchema.shape;
const compactFoodSchema=z.object({i:identity,c:f.category,st:f.servingText,g:f.servingGrams,n:nutrients,r:f.rating,ig:f.ingredients,t:photoIdentitySchema.innerType().shape.visibleText}).strict();
export const compactReviewSchema=z.object({s:photoIdentitySchema.innerType().shape.status,o:compactFoodSchema.nullable(),a:z.array(compactFoodSchema).max(5)}).strict();
const expand=(value:Record<string,unknown>,keys:Record<string,string>)=>Object.fromEntries(Object.entries(keys).map(([key,name])=>[name,value[key]]));
export function expandCompactIdentity(value:unknown):PhotoIdentity{
 return photoIdentitySchema.parse({...expand(identity.parse(value),identityKeys),visibleText:[]});
}
export function expandCompactFood(value:unknown):EstimatedFood{
 // Extra OCR snippets are auxiliary evidence, not nutrition. Bound them locally
 // because provider structured-output grammars do not all enforce array lengths.
 // Identity, nutrient amounts, units, servings and ingredients stay strictly checked.
 const input=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
 const snippets=input?.t;
 const bounded=Array.isArray(snippets)&&snippets.every(item=>typeof item==='string')
  ?{...input,t:snippets.filter(item=>item.trim().length>0&&item.trim().length<=160&&!/[\u0000-\u001f\u007f]/.test(item)).slice(0,6)}:value;
 const row=compactFoodSchema.parse(bounded);
 return estimatedFoodSchema.parse({identity:{...expand(row.i,identityKeys),visibleText:row.t},category:row.c,servingText:row.st,servingGrams:row.g,nutrition:expand(row.n,nutrientKeys),rating:row.r,ingredients:row.ig});
}
export function compactFood(value:EstimatedFood){
 return {i:Object.fromEntries(Object.entries(identityKeys).map(([key,name])=>[key,value.identity[name]])),c:value.category,st:value.servingText,g:value.servingGrams,n:Object.fromEntries(Object.entries(nutrientKeys).map(([key,name])=>[key,value.nutrition[name]])),r:value.rating,ig:value.ingredients,t:value.identity.visibleText};
}
// Bad candidates still get rejected individually by the existing review validator.
export function expandCompactReview(value:unknown):unknown{
 if(!value||typeof value!=='object'||!('s' in value))return value;
 const row=z.object({s:photoIdentitySchema.innerType().shape.status,o:z.unknown(),a:z.array(z.unknown()).max(5)}).strict().parse(value);
 const food=(raw:unknown)=>{try{return expandCompactFood(raw);}catch{return {};}};
 return {status:row.s,original:row.o===null?null:food(row.o),alternatives:row.a.map(food)};
}
export const compactReviewInstructions=`Use this compact JSON format; the preceding nutrition and comparison rules are unchanged. Root: s=status, o=original, a=alternatives. Each food: i=identity, c=category, st=servingText, g=servingGrams, n=nutrition, r=rating, ig=ingredients, t=visibleText. Identity: s=status, b=brand, n=name, v=variant, z=package size. Nutrition: kcal=caloriesKcal, sf=saturatedFatG, tf=transFatG, su=sugarsG, ad=addedSugarsG, cb=carbohydrateG, na=sodiumMg, fi=fiberG, pr=proteinG, k=potassiumMg, ca=calciumMg, fe=ironMg, mg=magnesiumMg. Write the original identity first, then the rest of the original, then alternatives, in schema order. Keep all required nutrients and ingredient evidence; null remains unknown. t contains at most six relevant snippets actually visible on the original package, each at most 160 characters, without duplicates; alternatives have t=[]. Ingredient text is at most 1500 characters; use null if it cannot be given faithfully within that limit. Do not repeat the full title in the variant or add descriptive prose to ingredient lists. No fields are citations or verified evidence.`;

const object=(properties:Record<string,unknown>)=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const nullable=(schema:Record<string,unknown>)=>({anyOf:[schema,{type:'null'}]});
const short=nullable({type:'string',minLength:1,maxLength:160});
const status={type:'string',enum:['identified','uncertain','multiple-products','no-product']};
export const wireFood=object({i:object({s:status,b:short,n:short,v:short,z:short}),c:{type:'string',minLength:1,maxLength:160},st:short,g:nullable({type:'number'}),n:object(Object.fromEntries(Object.keys(nutrientKeys).map(key=>[key,nullable({type:'number'})]))),r:nullable({type:'string',enum:['very_healthy','healthy','neutral','not_healthy']}),ig:nullable({type:'string',maxLength:1500}),t:{type:'array',maxItems:6,items:{type:'string',minLength:1,maxLength:160}}});
export const compactReviewJsonSchema=object({s:status,o:nullable(wireFood),a:{type:'array',items:wireFood,maxItems:5}});
