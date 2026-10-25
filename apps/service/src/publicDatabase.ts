import {comparisonGroups,catalogCandidateLimit} from '../../../packages/core/src/comparisonGroups.ts';
import {comparisonReady} from '../../../packages/core/src/catalogAlternatives.ts';
import {foodSourceTime} from '../../../packages/core/src/publicFood.ts';
import { DatabaseSync } from 'node:sqlite';
import { normalizeBarcode } from '../../../packages/core/src/barcode.ts';
import {foodSchema} from '../../../packages/core/src/publicFood.ts';
export {foodSchema,type PublicFood} from '../../../packages/core/src/publicFood.ts';
export class PublicDatabase {
 private db:DatabaseSync;
 constructor(path:string,adoptOff=false){
  this.db=new DatabaseSync(path);
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  const version=Number(this.db.prepare('PRAGMA user_version').get()?.user_version);
  if(version>1){this.db.close();throw new Error('Unsupported catalog database version');}
  this.db.exec(`BEGIN;
   CREATE TABLE IF NOT EXISTS sources(provider TEXT PRIMARY KEY, title TEXT NOT NULL, license TEXT NOT NULL, enabled INTEGER NOT NULL);
   INSERT OR IGNORE INTO sources VALUES('usda','USDA FoodData Central','CC0-1.0',1),('off','Open Food Facts','ODbL-1.0',0);
   CREATE TABLE IF NOT EXISTS foods(provider TEXT NOT NULL REFERENCES sources(provider), id TEXT NOT NULL, barcode TEXT, retrieved_at TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(provider,id));
   CREATE INDEX IF NOT EXISTS foods_barcode ON foods(barcode);
   CREATE TABLE IF NOT EXISTS product_media(code TEXT PRIMARY KEY, expires_at REAL NOT NULL, payload TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS imports(id INTEGER PRIMARY KEY, provider TEXT NOT NULL REFERENCES sources(provider), completed_at TEXT NOT NULL, count INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS provider_limits(provider TEXT PRIMARY KEY, next_at REAL NOT NULL);
   PRAGMA user_version=1; COMMIT;`);
  if(adoptOff)this.adoptOff();
 }
 reserveOffRequest(now=Date.now()){
  this.db.exec('BEGIN IMMEDIATE');try{
   const row=this.db.prepare("SELECT next_at FROM provider_limits WHERE provider='off'").get();
   if(row&&Number(row.next_at)>now){this.db.exec('COMMIT');return false;}
   this.db.prepare("INSERT INTO provider_limits VALUES('off',?) ON CONFLICT(provider) DO UPDATE SET next_at=excluded.next_at").run(now+5100);
   this.db.exec('COMMIT');return true;
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 reserveOffSearch(now=Date.now()){
  this.db.exec('BEGIN IMMEDIATE');try{
   const row=this.db.prepare("SELECT next_at FROM provider_limits WHERE provider='off-search'").get();
   if(row&&Number(row.next_at)>now){this.db.exec('COMMIT');return false;}
   this.db.prepare("INSERT INTO provider_limits VALUES('off-search',?) ON CONFLICT(provider) DO UPDATE SET next_at=excluded.next_at").run(now+6500);
   this.db.exec('COMMIT');return true;
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 coolOffSearch(now=Date.now()){this.db.prepare("INSERT INTO provider_limits VALUES('off-search',?) ON CONFLICT(provider) DO UPDATE SET next_at=max(next_at,excluded.next_at)").run(now+60000);}
 coolOffRequests(now=Date.now()){this.db.prepare("INSERT INTO provider_limits VALUES('off',?) ON CONFLICT(provider) DO UPDATE SET next_at=max(next_at,excluded.next_at)").run(now+60000);}
 reserveAssessmentLookup(now=Date.now()){
  this.db.exec('BEGIN IMMEDIATE');
  try{
   const row=this.db.prepare("SELECT next_at FROM provider_limits WHERE provider='photo-assessment'").get();
   if(row&&Number(row.next_at)>now){this.db.exec('COMMIT');return false;}
   this.db.prepare("INSERT INTO provider_limits VALUES('photo-assessment',?) ON CONFLICT(provider) DO UPDATE SET next_at=excluded.next_at").run(now+15000);
   this.db.exec('COMMIT');return true;
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 mediaProducts(now=Date.now()):unknown[]{return this.db.prepare('SELECT payload FROM product_media WHERE expires_at>? ORDER BY code LIMIT 2000').all(now).map(row=>JSON.parse(String(row.payload)));}
 cacheMediaProducts(records:{code:string}[],now=Date.now()){
  if(records.length>20)throw Error('Media batch limit');
  const insert=this.db.prepare('INSERT INTO product_media VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET expires_at=excluded.expires_at,payload=excluded.payload');
  this.db.exec('BEGIN IMMEDIATE');try{this.db.prepare('DELETE FROM product_media WHERE expires_at<=?').run(now);for(const record of records)insert.run(record.code,now+30*86400000,JSON.stringify(record));
   this.db.exec('DELETE FROM product_media WHERE code NOT IN (SELECT code FROM product_media ORDER BY expires_at DESC,code LIMIT 2000); COMMIT;');
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 adoptOff(){this.db.prepare("UPDATE sources SET enabled=1 WHERE provider='off'").run();}
 catalogRevision(){return JSON.stringify([this.db.prepare('SELECT max(id) AS revision FROM imports').get(),this.sources()]);}
 exportFoods(){return this.db.prepare('SELECT f.payload FROM foods f JOIN sources s USING(provider) WHERE s.enabled=1 ORDER BY f.provider,f.id').all().map(row=>foodSchema.parse(JSON.parse(String(row.payload))));}
 sources(){return this.db.prepare('SELECT provider,title,license,enabled FROM sources ORDER BY provider').all();}
 importFoods(values:unknown[]){
  if(values.length<1||values.length>100)throw new Error('Import batch must contain 1–100 records');
  const foods=values.map(v=>{const {glutenEvidence,...facts}=foodSchema.parse(v);return facts;});
  for(const food of foods){
   const expected=food.provider==='usda'?'fdc.nal.usda.gov':'world.openfoodfacts.org';
   const url=new URL(food.sourceUrl);
   if(url.protocol!=='https:'||url.hostname!==expected||url.username||url.password||url.search||url.hash)throw new Error('Invalid source URL');
   if(food.license!==(food.provider==='usda'?'CC0-1.0':'ODbL-1.0'))throw new Error('License mismatch');
   if(food.barcode&&normalizeBarcode(food.barcode)!==food.barcode)throw new Error('Invalid barcode');
   if(!this.db.prepare('SELECT enabled FROM sources WHERE provider=?').get(food.provider)?.enabled)throw new Error('Source adoption is disabled');
  }
  this.db.exec('BEGIN IMMEDIATE');
  try{
   for(const food of foods)this.db.prepare(`INSERT INTO foods VALUES(?,?,?,?,?) ON CONFLICT(provider,id) DO UPDATE SET barcode=excluded.barcode,retrieved_at=excluded.retrieved_at,payload=excluded.payload WHERE excluded.retrieved_at>=foods.retrieved_at`).run(food.provider,food.id,food.barcode,food.retrievedAt,JSON.stringify(food));
   for(const provider of new Set(foods.map(f=>f.provider)))this.db.prepare('INSERT INTO imports(provider,completed_at,count) VALUES(?,?,?)').run(provider,new Date().toISOString(),foods.filter(f=>f.provider===provider).length);
   this.db.exec('COMMIT');
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 private decode(rows:Record<string,unknown>[]){
  return rows.map(row=>{const food=foodSchema.parse(JSON.parse(String(row.payload)));return { ...food,stale:Date.now()-Date.parse(food.retrievedAt)>7*86400000 };});
 }
 byId(provider:string,id:string){return this.decode(this.db.prepare('SELECT f.payload FROM foods f JOIN sources s USING(provider) WHERE s.enabled=1 AND f.provider=? AND f.id=?').all(provider,id))[0]??null;}
 byBarcode(code:string){const normalized=normalizeBarcode(code);if(!normalized)throw new Error('Invalid barcode');return this.decode(this.db.prepare('SELECT f.payload FROM foods f JOIN sources s USING(provider) WHERE s.enabled=1 AND f.barcode=? ORDER BY f.provider,f.id LIMIT 20').all(normalized));}
 search(term:string){
  const query=term.trim();
  if(query.length<2||query.length>80||/[\u0000-\u001f\u007f]/.test(query))throw new Error('Search must contain 2–80 printable characters');
  return this.decode(this.db.prepare("SELECT f.payload FROM foods f JOIN sources s USING(provider) WHERE s.enabled=1 AND (instr(lower(json_extract(f.payload,'$.name')),lower(?))>0 OR instr(lower(coalesce(json_extract(f.payload,'$.brand'),'')),lower(?))>0) ORDER BY (json_extract(f.payload,'$.comparisonGroup') IS NOT NULL) DESC,f.retrieved_at DESC,CAST(f.id AS INTEGER) DESC LIMIT 20").all(query,query));
 }
 coverage(){
  return this.db.prepare("SELECT s.provider,s.enabled,count(f.id) AS records,sum(CASE WHEN f.barcode IS NOT NULL THEN 1 ELSE 0 END) AS barcodes FROM sources s LEFT JOIN foods f USING(provider) GROUP BY s.provider ORDER BY s.provider").all();
 }
 staleUsdaIds(before:string,limit=10){
  if(!Number.isInteger(limit)||limit<1||limit>10)throw new Error('Invalid refresh limit');
  return this.db.prepare("SELECT id FROM foods WHERE provider='usda' AND retrieved_at<? ORDER BY retrieved_at,id LIMIT ?").all(before,limit).map(row=>String(row.id));
 }
 comparable(group:string){
  if(!(comparisonGroups as readonly string[]).includes(group))throw new Error('Invalid comparison group');
  const seen=new Set<string>();
  return this.decode(this.db.prepare("SELECT f.payload FROM foods f JOIN sources s USING(provider) WHERE s.enabled=1 AND json_extract(f.payload,'$.comparisonGroup')=?").all(group))
   .filter(food=>comparisonReady(food))
   .sort((a,b)=>foodSourceTime(b.sourceDate)-foodSourceTime(a.sourceDate)||Date.parse(b.retrievedAt)-Date.parse(a.retrievedAt)||Number(b.id)-Number(a.id))
   .filter(food=>{if(seen.has(food.barcode!))return false;seen.add(food.barcode!);return true;}).slice(0,catalogCandidateLimit);
 }

 close(){this.db.close();}
}
