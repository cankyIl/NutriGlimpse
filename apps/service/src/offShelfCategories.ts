import type {ComparisonGroup} from '../../../packages/core/src/catalogAlternatives.ts';

/** U.S. shelf forms backed by OFF taxonomy, independent of USDA coverage.
 * This classifies use/form only; dietary compatibility still requires separate evidence. */
export function classifyOffShelf(n:string,tags:readonly string[]):ComparisonGroup|null{
 const has=(...names:string[])=>names.some(name=>tags.includes('en:'+name));
 // Exact taxonomy can establish a food form when the package name is only a flavor.
 // Broad parents such as "snacks" or "cereals" remain insufficient.
 if(has('potato-crisps')&&!has('stacked-extruded-potato-crisps')&&!/stacked|stax|pringles|covered|chocolate|dipped|salad|dip\b/.test(n))return 'potato-chips';
 if(has('pretzels','pretzel')&&!/soft|filled|stuffed|chocolate|yogurt|covered|dipped|peanut|pieces|crushed|hummus|snack pack|creme|cream|smores|s.mores|cracker/.test(n))return 'pretzels';
 if(has('crackers')&&!has('rice-cakes','puffed-salty-snacks')&&!/filled|sandwich|peanut butter|hummus|chocolate|puff|rice cake|snack mix/.test(n))return 'crackers';
 if(has('chocolate-chip-cookies','drop-cookies')&&!has('cakes','sandwich-biscuits')&&!/sandwich|filled|wafer|covered|dough|mix|ice cream|milano/.test(n))return 'cookies';
 if(has('canned-chickpeas')&&/\b(chickpeas?|chick peas?|garbanzo beans?)\b/.test(n)&&!/sauce|salad|hummus|seasoned|rice|chili/.test(n))return 'canned-chickpeas';
 if(has('baked-beans-in-tomato-sauce')&&!/rice|chili starter|soup|dinner|meal/.test(n))return 'baked-beans';
 if(has('white-breads')&&/\bbread\b/.test(n)&&!/whole wheat|whole-wheat|crumb|crouton|bagel|bun|roll|pita|tortilla|stuff/.test(n))return 'white-sliced-bread';
 if(has('breakfast-cereals')&&!has('porridge','cereal-bars','granolas')&&/\boatmeal squares\b/.test(n)&&!/hot|bar|soft baked/.test(n))return 'breakfast-cereal';
 if(has('tomato-sauces')&&/\bchunky tomato\b/.test(n)&&!/pizza|meat|beef|chicken|alfredo|cream|pesto|cheese/.test(n))return 'tomato-pasta-sauce';

 if(has('yogurts')&&!has('yogurts with candies')&&!/yocrunch|candy|candies|m&m|granola|topping|covered|drink|frozen|almond.milk|coconut.milk|soy|oat.milk/.test(n)){
  if(/\bplain\b/.test(n))return 'plain-yogurt';
  if(/\b(yogurt|greek)\b/.test(n)&&/vanilla|strawberry|blueberry|raspberry|peach|cherry|banana|coconut|lemon/.test(n))return 'flavored-yogurt';
 }
 if(has('dry-pastas','dry-pasta')&&!has('stuffed-pastas','pasta-dishes','fresh-pastas')&&
 /\b(spaghetti|penne|rotini|rigatoni|fusilli|elbows|macaroni|linguine|farfalle|shells|angel hair|ditalini|orecchiette)\b/.test(n)&&
 !/sauce|cheese|dinner|meal|cooked|fresh|salad|squash|stuffed|soup|meat|beef|chicken/.test(n))return 'dry-pasta';
 if(has('cereal-bars')&&/\bgranola bars?\b/.test(n)&&!/protein|meal|variety/.test(n))return 'granola-bars';
 if(has('biscuits','pastries','toaster-pastries')&&/\btoaster pastries\b/.test(n))return 'toaster-pastries';
 if(has('biscuits','cookies','chocolate-biscuits')&&/\bcookies?\b/.test(n)&&
 !/sandwich|filled|wafer|covered|dough|mix|ice cream/.test(n))return 'cookies';
 if(has('biscuits','graham-crackers')&&/\bgrahams?\b/.test(n)&&!/crust|crumb|mix/.test(n))return 'graham-crackers';
 if(has('sauces','alfredo-sauces')&&/\balfredo sauce\b/.test(n)&&!/pasta with|chicken|dinner|meal/.test(n))return 'alfredo-sauce';
 if(has('guacamoles')&&/\bguacamole\b/.test(n)&&!/chips|snackers|kit/.test(n))return 'guacamole';
 if(has('mayonnaises','light-mayonnaises')&&/\b(mayo|mayonnaise)\b/.test(n))return 'mayonnaise';
 if(has('ketchup','tomato-ketchup')&&/\bketchup\b/.test(n))return 'ketchup';
 if(has('cheeses','cow-cheeses')&&!/sauce|dip|cracker|pasta|pizza|blend|processed|pasteurized process|cheese product|vegan|plant.based/.test(n)){
  if(/\bcream cheese spread\b/.test(n)&&!/feta|mascarpone/.test(n))return 'cream-cheese-spread';
  const types=[
   ['pepper-jack-cheese',/\bpepper jack\b/],
   ['monterey-jack-cheese',/\bmonterey jack\b/],
   ['provolone-cheese',/\bprovolone\b/],
   ['feta-cheese',/\bfeta\b/],
   ['ricotta-cheese',/\bricotta\b/],
   ['gouda-cheese',/\bgouda\b/],
   ['muenster-cheese',/\bmuenster\b/],
   ['grated-parmesan',/\bparmesan\b/],
  ] as const;
  const matches=types.filter(([,pattern])=>pattern.test(n));
  // Pepper Jack is seasoned Monterey Jack; accept that explicit pair only.
  if(matches.length===2&&matches[0][0]==='pepper-jack-cheese'&&matches[1][0]==='monterey-jack-cheese'&&!/cheddar|colby|mozzarella/.test(n))return 'pepper-jack-cheese';
  if(matches.length===1&&!/cheddar|colby|mozzarella|swiss|spread/.test(n)){
   const group=matches[0][0];
   if(group==='monterey-jack-cheese'&&/jalape|habanero|pepper/.test(n))return 'pepper-jack-cheese';
   if(group==='grated-parmesan'&&!/\bgrated\b/.test(n))return null;
   return group;
  }
 }
 if(has('sliced-breads')&&!/crumb|crouton|bagel|bun|roll|pita|tortilla|stuff/.test(n)){
  if(has('multigrain-sliced-breads')&&/\bbread\b/.test(n))return 'multigrain-sliced-bread';
  if(has('white-breads')&&/\bwhite\b/.test(n)&&!/whole wheat|whole-wheat/.test(n))return 'white-sliced-bread';
 }
 if(has('canned-vegetables','canned-tomatoes')&&!/sauce|soup|salad|pickled|mix|blend|chile|chili|rice|pasta/.test(n)){
  const vegetables=[
   ['canned-corn',/\bcorn\b/],['canned-peas',/\bpeas\b/],['canned-green-beans',/\bgreen beans\b/],
   ['canned-carrots',/\bcarrots\b/],['canned-beets',/\bbeets\b/],['canned-mushrooms',/\bmushrooms\b/],
   ['canned-diced-tomatoes',/\bdiced tomatoes\b/],['canned-crushed-tomatoes',/\bcrushed tomatoes\b/],
  ] as const;
  const matches=vegetables.filter(([,pattern])=>pattern.test(n));
  if(matches.length===1){
   if(matches[0][0]==='canned-corn'&&/cream.style/.test(n))return 'canned-cream-corn';
   return matches[0][0];
  }
 }
 return null;
}
