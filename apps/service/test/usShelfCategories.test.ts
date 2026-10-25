import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyOffGrocery as classify} from '../src/catalogCuration.ts';
test('US shelf forms use taxonomy evidence without a USDA match',()=>{
 const cases=[
 ['Farfalle',['en:dry-pastas'],'dry-pasta'],
 ['Greek blueberry yogurt',['en:yogurts'],'flavored-yogurt'],
 ['Organic Greek Plain Nonfat',['en:yogurts'],'plain-yogurt'],
 ['Crunchy Granola Bars Oats n Honey',['en:cereal-bars'],'granola-bars'],
 ['Frosted Cherry Pomegranate Toaster Pastries',['en:biscuits'],'toaster-pastries'],
 ['Chessmen Butter Cookies',['en:biscuits'],'cookies'],
 ['Bunny Grahams Friends',['en:biscuits'],'graham-crackers'],
 ['Classic Alfredo Sauce',['en:sauces'],'alfredo-sauce'],
 ['Guacamole Spicy',['en:guacamoles'],'guacamole'],
 ['Light Mayo',['en:mayonnaises'],'mayonnaise'],
 ['Tomato Ketchup',['en:ketchup'],'ketchup'],
 ['Pepper Jack Monterey Jack Cheese with Jalapeno Peppers',['en:cheeses'],'pepper-jack-cheese'],
 ['Sliced Provolone',['en:cheeses'],'provolone-cheese'],
 ['Grated Parmesan Cheese',['en:cheeses'],'grated-parmesan'],
 ['Mixed Berry Cream Cheese Spread',['en:cheeses'],'cream-cheese-spread'],
 ['Feta Cheese Crumbles',['en:cheeses'],'feta-cheese'],
 ['Ricotta Cheese',['en:cheeses'],'ricotta-cheese'],
 ['Sliced Gouda',['en:cheeses'],'gouda-cheese'],
 ['Muenster Cheese Deli Slices',['en:cheeses'],'muenster-cheese'],
 ['Monterey Jack Cheese',['en:cheeses'],'monterey-jack-cheese'],
 ['Organic Multigrain Bread',['en:sliced-breads','en:multigrain-sliced-breads'],'multigrain-sliced-bread'],
 ['White Bread',['en:sliced-breads','en:white-breads'],'white-sliced-bread'],
 ['Whole Kernel Corn',['en:canned-vegetables'],'canned-corn'],
 ['Cream Style Sweet Corn',['en:canned-vegetables'],'canned-cream-corn'],
 ['Sweet Peas',['en:canned-vegetables'],'canned-peas'],
 ['Cut Green Beans',['en:canned-vegetables'],'canned-green-beans'],
 ['Sliced Carrots',['en:canned-vegetables'],'canned-carrots'],
 ['Sliced Beets',['en:canned-vegetables'],'canned-beets'],
 ['Sliced Mushrooms',['en:canned-vegetables'],'canned-mushrooms'],
 ['Diced Tomatoes',['en:canned-vegetables'],'canned-diced-tomatoes'],
 ['Crushed Tomatoes',['en:canned-vegetables'],'canned-crushed-tomatoes'],
 ] as const;
 for(const [name,tags,group] of cases)assert.equal(classify(name,tags),group,name);
});
test('US shelf expansion separates preparation, mixed foods and misleading names',()=>{
 const cases=[
 ['Farfalle',['en:pastas']],['Fresh Farfalle',['en:dry-pastas']],
 ['Yogurt covered pretzels',['en:yogurts']],['YoCrunch vanilla',['en:yogurts']],
 ['Granola Bars',['en:undefined']],['Double Chocolate Protein Granola Bar',['en:cereal-bars']],
 ['Sandwich Cookies',['en:biscuits']],['Cookies Dough',['en:biscuits']],
 ['Chocolate Filled Wafer Cookies',['en:biscuits']],
 ['Guacamole & Tortilla Chips',['en:guacamoles']],
 ['Provolone Mozzarella Cheese',['en:cheeses']],
 ['Parmesan Cheese',['en:cheeses']],
 ['Red Pepper & Feta Spread',['en:cheeses']],
 ['Peas & Carrots',['en:canned-vegetables']],
 ['Corn Chowder Soup',['en:canned-vegetables']],
 ['Diced Tomatoes With Green Chiles',['en:canned-vegetables']],
 ['Whole Wheat White Bread',['en:sliced-breads','en:white-breads']],
 ] as const;
 for(const [name,tags] of cases)assert.equal(classify(name,tags),null,name);
});
