import {legacyFood,v2Food} from '../../../packages/core/src/publicFood.ts';
import type {PublicDatabase} from './publicDatabase.ts';
export const catalogAttribution={
 title:'Congress Grocery Beta — reusable product catalog',
 license:'ODbL-1.0',licenseUrl:'https://opendatacommons.org/licenses/odbl/1-0/',
 attribution:'Contains information from Open Food Facts, made available under the Open Database License (ODbL), and USDA FoodData Central (CC0).',
 sources:[{name:'Open Food Facts',url:'https://world.openfoodfacts.org',databaseLicense:'ODbL-1.0',contentsLicense:'DbCL-1.0',contentsLicenseUrl:'https://opendatacommons.org/licenses/dbcl/1-0/'},{name:'USDA FoodData Central',url:'https://fdc.nal.usda.gov',databaseLicense:'CC0-1.0'}],
 download:'https://grocery.serveforwad.com/v3/catalog/export',
 changes:'Selected US product records normalized to a common per-100-g schema; sodium and minerals converted from grams where required; optional trans fat and community-reported label, allergen and trace metadata retained; conservative category classification; v3 includes additional reported nutrients and attributed Open Food Facts thumbnail references.',
 scope:'Product facts only. No user accounts, health profiles, shopping history, access keys or location records. Community-contributed information may be incomplete or outdated; check the package. No stock, certification or clinical verification.'
};
export function exportCatalog(db:PublicDatabase,version=2){return {schemaVersion:version,generatedAt:new Date().toISOString(),...catalogAttribution,foods:db.exportFoods().map(f=>version===1?legacyFood(f):version===2?v2Food(f):f)};}
export const catalogCreditsHtml=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Product catalog sources and reuse</title><body><main><h1>NutriGlimpse</h1><p>Know your food. Understand your choices.</p><h2>Product catalog sources and reuse</h2><p>Contains information from <a href="https://world.openfoodfacts.org">Open Food Facts</a>, made available under the <a href="https://opendatacommons.org/licenses/odbl/1-0/">Open Database License (ODbL)</a>, and <a href="https://fdc.nal.usda.gov">USDA FoodData Central</a> (CC0).</p><p>Our combined product catalog is available under ODbL 1.0. Individual Open Food Facts contents use the <a href="https://opendatacommons.org/licenses/dbcl/1-0/">Database Contents License</a>. Original source notices are retained on each record. Product images from Open Food Facts use <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>; each image links to its source product page.</p><p><a href="/v3/catalog/export">Download the complete reusable product catalog (JSON)</a></p><p>${catalogAttribution.changes}</p><p>${catalogAttribution.scope}</p><p>Share and adapt this catalog, retaining attribution and the applicable share-alike terms. The catalog license does not grant rights to app code or branding.</p></main></body></html>`;

const downloads=new WeakMap<PublicDatabase,Map<number,{revision:string,json:string}>>();
export function catalogDownload(db:PublicDatabase,version=2){
 const revision=db.catalogRevision(),versions=downloads.get(db)??new Map<number,{revision:string,json:string}>(),cached=versions.get(version);if(cached?.revision===revision)return cached.json;
 const json=JSON.stringify(exportCatalog(db,version));versions.set(version,{revision,json});downloads.set(db,versions);return json;
}
