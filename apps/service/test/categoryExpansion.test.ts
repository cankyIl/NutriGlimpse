import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyOffGrocery as classify} from '../src/catalogCuration.ts';
test('source-backed expanded groups and aliases recognize real catalog forms',()=>{
 const cases=[
 ['Fresh Mozzarella',['en:cheeses'],'fresh-mozzarella'],
 ['SHARP CHEDDAR',['en:cheeses'],'cheddar-cheese'],
 ['Ultra Thin Swiss Cheese',['en:cheeses'],'swiss-cheese'],
 ['Colby-Jack Cheese',['en:cheeses'],'colby-jack-cheese'],
 ['LIGHT STRING CHEESE REDUCED FAT LOW MOISTURE MOZZARELLA CHEESE',['en:cheeses'],'mozzarella-cheese'],
 ['Cream Cheese',['en:cheeses'],'cream-cheese'],
 ['Everything Bagels',['en:bagel-breads'],'bagels'],
 ['English Muffins Blueberry',['en:breads'],'english-muffins'],
 ['Goldfish Baked Snack Crackers Cheddar',['en:Crackers'],'crackers'],
 ['Quaker Maple & Brown Sugar Instant Oatmeal',['en:porridge'],'instant-oatmeal'],
 ['Black Beans',['en:canned-common-beans'],'canned-black-beans'],
 ['Dark Red Kidney Beans',['en:canned-common-beans'],'canned-kidney-beans'],
 ['Organic Chick Peas',['en:canned-legumes'],'canned-chickpeas'],
 ['Homestyle Baked Beans',['en:canned-common-beans'],'baked-beans'],
 ['Multi Grain Cheerios',['en:breakfast-cereals'],'breakfast-cereal'],
 ['Peanut Butter Crunch',['en:breakfast-cereals'],'breakfast-cereal'],
 ['Chunky Salsa Mild',['en:sauces'],'salsa'],
 ] as const;
 for(const [name,tags,group] of cases)assert.equal(classify(name,tags),group,name);
});
test('ambiguous, conflicting and prepared food forms stay excluded',()=>{
 const cases=[
 ['Horseradish Pasteurized Process Cheddar Cheese',['en:cheddar-cheese']],
 ['Cheddar Cheese Mozzarella Blend',['en:cheddar-cheese']],
 ['Mozzarella',['en:cheeses']],
 ['Mascarpone Italian-Style Cream Cheese',['en:cheeses']],
 ['Sliced provolone-mozzarella cheese',['en:cheeses']],
 ['Cheddar Cheese Sauce',['en:cheeses']],
 
 ['Black Beans and Rice',['en:canned-legumes']],
 ['Chili Kidney Beans',['en:canned-common-beans']],
 ['Black Beans',['en:undefined']],
 ['Everything Bagels Chips',['en:bagel-breads']],
 ['Crackers Peanut Butter Filled',['en:crackers']],
 ['Cheddar Cheese Sandwich',['en:cheeses']],
 ['100% Whole Wheat Bread',['en:white-breads','en:wholemeal-breads']],
 ['Quaker Oats Steel Cut Quick Oats',['en:rolled-oats']],
 ['Cheerios Cereal Bars',['en:breakfast-cereals','en:cereal-bars']],
 ['Granola',['en:undefined']],
 ['Original',['en:breakfast-cereals']],
 ] as const;
 for(const [name,tags] of cases)assert.equal(classify(name,tags),null,name);
});
