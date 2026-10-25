import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyOffGrocery} from '../src/catalogCuration.ts';
test('precise taxonomy corroborates flavor-only names without broad category guessing',()=>{
 const cases=[
  ['Barbecue',['potato-crisps'],'potato-chips'],['ORIGINAL',['Crackers'],'crackers'],
  ['Rold Gold Thins Original',['pretzel'],'pretzels'],['Double Chocolate Nantucket Dark Chocolate',['chocolate-chip-cookies'],'cookies'],
  ['Chickpea',['canned-chickpeas'],'canned-chickpeas'],['Brown Sugar Hickory Baked Beans',['baked-beans-in-tomato-sauce'],'baked-beans'],
  ['Organic Bread',['white-breads'],'white-sliced-bread'],['Oatmeal Squares Brown Sugar',['breakfast-cereals'],'breakfast-cereal'],
 ] as const;
 for(const [name,tags,expected] of cases)assert.equal(classifyOffGrocery(name,tags.map(t=>'en:'+t)),expected,name);
 for(const [name,tags] of [
  ['STAX Sour Cream',['potato-crisps','stacked-extruded-potato-crisps']],['Chocolate covered pretzels',['pretzels']],
  ['Rice cakes',['crackers','rice-cakes']],['Cookie dough',['chocolate-chip-cookies']],
  ['Milano Dark Chocolate',['chocolate-chip-cookies']],['Chickpea salad',['canned-chickpeas']],
  ['Hot oatmeal squares',['breakfast-cereals']],['Barbecue',['snacks']],['Organic cereal',['cereals-and-their-products']],
 ])assert.equal(classifyOffGrocery(name as string,(tags as string[]).map(t=>'en:'+t)),null,name as string);
});
