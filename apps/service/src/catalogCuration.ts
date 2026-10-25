import {classifyOffShelf} from './offShelfCategories.ts';
import type {ComparisonGroup} from '../../../packages/core/src/catalogAlternatives.ts';
/** Conservative name/form rules, not allergy or clinical verification. Unknown forms remain unclassified. */
export function classifyGrocery(name:string):ComparisonGroup|null{
 const n=name.toLowerCase();
 if(/\b(bar|bars|cookie|cookies|candy|candies|cupcake|pouch|infant|baby|toddler|kit|parfait|mix|powder|drink|beverage|frozen|crumbs|treats|sandwich|uncrustables|biscuits|filling|bark|puree|closeout|meatballs|burrito|burritos|tamale|tamales|taquitos|enchilada|enchiladas|lunchables|lettuce|dressing|bulk)\b/.test(n))return null;
 if(/\bgranola\b/.test(n)&&! /wrapped|yogurt|dairy|clearly crafted|stage|\bs[1-4]\b/.test(n))return 'granola';
 if(/\b(rolled oats|old fashioned oats|old-fashioned oats|quick oats)\b/.test(n)&&! /chocolate|honey|maple|apple|cinnamon|flavor|raisins/.test(n))return 'plain-oats';
 if(/\bpeanut butter\b/.test(n)&&! /alternative|flaxseed|chocolate|jelly|cracker|pretzel|cereal|yogurt|clusters/.test(n))return 'peanut-butter';
 if(/\bbread\b/.test(n)&&/whole wheat|whole-wheat|100% wheat/.test(n)&&! /bun|roll|pita|bagel|naan|stuffing|crumb/.test(n))return 'sliced-bread';
 if(/\byogurt\b/.test(n)&&/\bplain\b/.test(n)&&! /almond|coconut|soy|oat|covered/.test(n))return 'plain-yogurt';
 if(/\bcereal\b/.test(n)&&! /hot|oatmeal|baby|infant|bran muffin|biscuit|yogurt|farina|porridge/.test(n))return 'breakfast-cereal';
 // Distinct food forms; these groups do not mix drinks, powders, meals or raw kernels with ready-to-eat foods.
 if(/\b(almond butter)\b/.test(n)&&! /chocolate|peanut|honey|cocoa|cookie|flavored/.test(n))return 'almond-butter';
 if(/\balmonds\b/.test(n)&&! /chocolate|cocoa|yogurt|covered|glazed|honey|candy|flour|sliced|slivered|meal|trail|mixed|walnut|pecan|hazelnut|cashew|buffalo|wing|mint|toffee|coated|cereal|granola|rice|milk|butter/.test(n))return 'plain-almonds';
 if(/\b(spaghetti|penne|rotini|rigatoni|fusilli|elbows|macaroni|dry pasta)\b/.test(n)&&! /sauce|cheese|dinner|meal|prepared|ready|cooked|fresh|salad|squash|ravioli|stuffed|soup|lasagna|meat|beef|chicken|stouffer|lean cuisine/.test(n))return 'dry-pasta';
 if(/\b(pasta sauce|marinara sauce|spaghetti sauce)\b/.test(n)&&! /alfredo|cream|pesto|meat|beef|sausage|vodka|cheese/.test(n))return 'tomato-pasta-sauce';
 if(/\bsalsa\b/.test(n)&&! /chips|con queso|cheese|ranch|rice|beans|chicken|tuna|seasoning|hummus|popcorn|twists|pork|beef|ssge|bfst|burr|creamy/.test(n))return 'salsa';
 if(/\bhummus\b/.test(n)&&! /chocolate|dessert|chips|pretzel|snack pack/.test(n))return 'hummus';
 if(/\bcottage cheese\b/.test(n)&&! /fruit|pineapple|peach|strawberry|blueberry|strawberr|raspberr|blackberr|doubles|topping/.test(n))return 'cottage-cheese';
 if(/\bcheddar cheese\b/.test(n)&&! /sauce|spread|dip|cracker|puffs|popcorn|pasta|broccoli|soup|potato|flavored|nacho/.test(n))return 'cheddar-cheese';
 if(/\bflour tortillas?\b/.test(n)&&! /chips|corn|stuffed|shells/.test(n))return 'flour-tortillas';
 if(/\bcorn tortillas?\b/.test(n)&&! /chips|flour|stuffed|shells/.test(n))return 'corn-tortillas';
 if(/\bpotato chips\b/.test(n)&&! /chocolate|dipped|dip|salad/.test(n))return 'potato-chips';
 if(/\btortilla chips\b/.test(n)&&! /chocolate|dipped|dip|salad/.test(n))return 'tortilla-chips';
 if(/\bpretzels?\b/.test(n)&&! /soft|filled|stuffed|chocolate|yogurt|covered|dipped|peanut|pieces|crushed|hummus|snack pack|creme|cream|smores|s.mores|cracker/.test(n))return 'pretzels';
 if(/\bpopcorn\b/.test(n)&&! /unpopped|kernel|microwave|stovetop|popping|seasoning|chicken|shrimp|caramel|toffee|peanuts|chocolate|candy|ball/.test(n))return 'ready-popcorn';
 return null;
}

/** Require corroborating USDA food category; a product-name keyword alone is insufficient. */
export function classifyUsdaGrocery(name:string,category?:string):ComparisonGroup|null{
 const group=classifyGrocery(name);
 if(!group||!category)return null;
 const accepted:Partial<Record<ComparisonGroup,readonly string[]>>={
  'plain-oats':['Cereal','Processed Cereal Products','Other Grains & Seeds','Grains/Flour'],
  'granola':['Cereal','Processed Cereal Products','Breakfast Cereals'],
  'breakfast-cereal':['Cereal','Processed Cereal Products','Breakfast Cereals'],
  'peanut-butter':['Nut & Seed Butters','Nuts/Seeds - Prepared/Processed'],
  'almond-butter':['Nut & Seed Butters','Nuts/Seeds - Prepared/Processed'],
  'sliced-bread':['Bread','Breads & Buns','Savoury Bakery Products'],
  'plain-yogurt':['Yogurt','Yogurt/Yogurt Substitutes'],
  'dry-pasta':['Pasta/Noodles','Pasta by Shape & Type','Pasta by Shape & Type (Unprepared)'],
  'tomato-pasta-sauce':['Prepared Pasta & Pizza Sauces','Sauces/Spreads/Dips/Condiments'],
  'salsa':['Dips & Salsa','Sauces/Spreads/Dips/Condiments'],
  'hummus':['Dips & Salsa','Sauces/Spreads/Dips/Condiments'],
  'cottage-cheese':['Cheese','Cheese/Cheese Substitutes','Milk/Milk Substitutes'],
  'cheddar-cheese':['Cheese','Cheese/Cheese Substitutes'],
  'flour-tortillas':['Breads & Buns','Bread','Mexican Dinner Mixes','Savoury Bakery Products','Biscuits/Cookies'],
  'corn-tortillas':['Breads & Buns','Bread','Mexican Dinner Mixes','Savoury Bakery Products','Biscuits/Cookies'],
  'potato-chips':['Snacks','Chips, Pretzels & Snacks'],
  'tortilla-chips':['Snacks','Chips, Pretzels & Snacks'],
  'pretzels':['Snacks','Chips, Pretzels & Snacks'],
  'ready-popcorn':['Snacks','Popcorn, Peanuts, Seeds & Related Snacks','Chips, Pretzels & Snacks'],
  'plain-almonds':['Nuts/Seeds - Prepared/Processed','Popcorn, Peanuts, Seeds & Related Snacks','Nuts & Seeds'],
 };
 return accepted[group]?.includes(category)?group:null;
}

/** OFF tags must independently corroborate the conservative product-name form. */
export function classifyOffGrocery(name:string,tags:readonly string[]):ComparisonGroup|null{
 const n=name.toLowerCase().replace(/[–—]/g,'-');
 tags=tags.map(tag=>tag.toLowerCase().trim());
 const has=(...values:string[])=>values.some(value=>tags.includes('en:'+value));
 // Reject conflicting forms even when a broad parent taxonomy is also present.
 if(has('baby-foods','infant-formulas','meal-replacements','sandwiches','bread-crumbs','frozen-meals')||
 /\b(kit|pouch|infant|baby|toddler|parfait|sandwich|crumbs|powder|drink|beverage|burrito|pizza|soup|dinner|meal|snack pack)\b/.test(n))return null;
 const shelf=classifyOffShelf(n,tags);if(shelf)return shelf;
 const cheese=has('cheeses','cow-cheeses','cheddar-cheese','cheddar');
 if(cheese&&/mascarpone|provolone|parmesan|blend|cheese product|processed|pasteurized process/.test(n))return null;
 if(cheese&&!/sauce|spread|dip|cracker|puff|popcorn|pasta|broccoli|soup|potato|flavored|nacho|mascarpone|vegan|plant.based/.test(n)){
  const types=[/\bcheddar\b/,/\bswiss\b/,/\bcolby.?jack\b/,/\bmozzarella\b/,/\bcream cheese\b/];
  const matches=types.map((r,i)=>r.test(n)?i:-1).filter(i=>i>=0);
  if(matches.length>1)return null;
  if(matches[0]===3){
   if(/fresh/.test(n))return 'fresh-mozzarella';
   if(!/low.moisture|string|shredded/.test(n))return null;
  }
  if(matches.length===1)
   return (['cheddar-cheese','swiss-cheese','colby-jack-cheese','mozzarella-cheese','cream-cheese'] as const)[matches[0]];
 }
 if(has('bagel-breads')&&/\bbagels?\b/.test(n)&&!/chips|bites|stuffed/.test(n))return 'bagels';
 if(has('breads','english-muffins')&&/\benglish muffins?\b/.test(n))return 'english-muffins';
 if(has('crackers','crackers-appetizers','small-crackers')&&/\bcrackers?\b/.test(n)&&!/filled|sandwich|peanut butter|hummus|chocolate/.test(n))return 'crackers';
 if(has('porridge','breakfast-cereals','rolled-oats')&&/\binstant oatmeal\b/.test(n)&&!/bar|cookie|cupcake|protein|drink/.test(n))return 'instant-oatmeal';
 if(has('canned-legumes','canned-common-beans','canned-chickpeas')){
  if(/\bbaked beans\b/.test(n))return 'baked-beans';
  if(!/chili|sauce|salad|refried|baked|seasoned|rice/.test(n)){
   if(/\bblack beans\b/.test(n))return 'canned-black-beans';
   if(/\bkidney beans\b/.test(n))return 'canned-kidney-beans';
   if(/\b(chick ?peas|garbanzo beans)\b/.test(n))return 'canned-chickpeas';
  }
 }
 if(has('breakfast-cereals')&&!has('porridge','cereal-bars','granolas','oat-flakes','rolled-oats')&&
 !/\b(oats|oatmeal|hot|porridge|farina|granola|bars?|cookies?|yogurt|biscuits?|baby)\b/.test(n)&&
 /\b(cereal|cheerios|froot loops|lucky charms|peanut butter crunch)\b/.test(n))return 'breakfast-cereal';
 const group=classifyGrocery(name);if(!group)return null;
 if(group==='plain-oats'&&/steel.cut/.test(n))return null;
 if(group==='sliced-bread'&&has('white-breads'))return null;
 if(group==='peanut-butter'&&has('breakfast-cereals','cereal-bars'))return null;
 const allowed:Partial<Record<ComparisonGroup,string[]>>={
 'plain-oats':['en:oat-flakes','en:rolled-oats'],granola:['en:granolas'],
 'breakfast-cereal':['en:breakfast-cereals'], 'peanut-butter':['en:peanut-butters'],
 'almond-butter':['en:almond-butters'],'plain-yogurt':['en:plain-yogurts','en:yogurts'],
 'sliced-bread':['en:wholemeal-breads','en:whole-wheat-breads'],
 'dry-pasta':['en:dry-pasta','en:dry-pastas'],'tomato-pasta-sauce':['en:tomato-sauces'],
 salsa:['en:salsa-sauces','en:sauces','en:dips'],hummus:['en:hummus'],
 'cottage-cheese':['en:cottage-cheeses','en:cheeses'],'cheddar-cheese':['en:cheddar','en:cheddar-cheese'],
 'flour-tortillas':['en:wheat-tortillas'],'corn-tortillas':['en:corn-tortillas'],
 'potato-chips':['en:potato-crisps'],'tortilla-chips':['en:tortilla-chips'],
 pretzels:['en:pretzels'],'ready-popcorn':['en:popcorn'], 'plain-almonds':['en:almonds']};
 return allowed[group]?.some(tag=>tags.includes(tag))?group:null;
}
