import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyPhoto} from '../src/photoRoute.ts';
const page=(lines:string[])=>({page:1,width:1000,height:1000,lines:lines.map((text,i)=>({id:'line-'+i,text,x:10,y:i*40,width:900,height:30,confidence:0.99}))});
test('unified camera separates front claims, full nutrient panels and GTINs',()=>{
 assert.equal(classifyPhoto(page(['Sweet Oats','Good source of fiber','150 calories']),[]).kind,'product');
 assert.equal(classifyPhoto(page(['Nutrition Facts','Calories 150','Sodium 100mg','Total Carbohydrate 32g']),[]).kind,'nutrition');
 assert.deepEqual(classifyPhoto(undefined,[{value:'016000401068',format:'gtin'}]),{kind:'barcode',barcode:'00016000401068'});
 assert.equal(classifyPhoto(undefined,['016000401069']).kind,'ambiguous');
 assert.equal(classifyPhoto(undefined,['016000401068','016000275263']).kind,'ambiguous');
 assert.equal(classifyPhoto(undefined,[{value:'01234565',format:'unknown'}]).kind,'ambiguous');
});
