#!/usr/bin/env python3
import json,hashlib
from pathlib import Path
ROOT=Path('/path/to/NutriGlimpse')
def validate(root=ROOT):
 library=json.loads((root/'data/guidance/library.json').read_text())
 tables=json.loads((root/'data/guidance/serving-tables.json').read_text())
 manifest=json.loads((root/'data/guidance/sources/2026-10-14/manifest.json').read_text())
 assert library['schemaVersion']==1
 assert library['consumerEducationEnabled'] is False and library['personalizedRecommendationsEnabled'] is False
 assert tables['automaticPersonalization'] is False
 for source in manifest:
  path=(root/source['file']).resolve()
  assert path.is_relative_to(root.resolve())
  assert hashlib.sha256(path.read_bytes()).hexdigest()==source['sha256'],source['id']
  assert len(path.read_bytes())==source['bytes']
 sourceIds={s['id'] for s in library['sources']}
 assert {'dash','diabetes','ckd','dga','dga-servings'}==sourceIds
 for source in library['sources']:
  assert source['sha256']==next(s['sha256'] for s in manifest if s['id']==source['id'])
  assert source['url'].startswith('https://') and source['sourceVersion']
 ids=set()
 for entry in library['entries']:
  assert entry['id'] not in ids;ids.add(entry['id'])
  assert entry['sourceId'] in sourceIds
  assert entry['sourceLocator'] and entry['population'] and entry['summary']
  assert entry['automaticPersonalization'] is False and entry['productRecommendationEnabled'] is False
  assert entry['reviewedBy'] is None
  assert entry['reviewStatus']=='source-checked-clinical-review-pending'
  if entry['kind']=='individualized':assert entry['requiredInputs']
 for conflict in library['conflicts']:assert set(conflict['sourceIds'])<=sourceIds and conflict['resolution']
 for table in tables['tables']:
  assert table['sourceId'] in sourceIds
  n=len(table['calorieLevels'])
  assert n==len(set(table['calorieLevels']))
  for row in table['rows']:
   key=next(k for k in ['ranges','amounts','maximum','sourceAmounts'] if k in row)
   assert len(row[key])==n
   assert row.get('period',table.get('period')) in ['day','week'] or len(row.get('periods',[]))==n
   if key=='ranges':assert all(0<=a<=b for a,b in row[key])
 entries={x['id']:x for x in library['entries']}
 assert entries['dash-sodium']['publishedValue']['options']==[2300,1500]
 assert entries['dga-sodium']['publishedValue']['relationship']=='less-than'
 assert entries['dga-added-sugars']['publishedValue']['period']=='meal'
 assert entries['dga-saturated-fat']['publishedValue']['unit']=='percentEnergy'
 assert entries['diabetes-plate']['publishedValue']['fractions']=={'nonstarchyVegetables':.5,'carbohydrateFoods':.25,'proteinFoods':.25}
 assert all(entries[id]['publishedValue'] is None for id in ['ckd-potassium','ckd-protein','ckd-fluid'])
 dash,dga=tables['tables']
 nuts=next(row for row in dash['rows'] if row['foodGroup']=='nuts-seeds-legumes')
 assert nuts['periods']==['week']*5+['day']*2
 assert dash['servingExamples']['dairy']!=dga['servingExamples']['dairy']
 return {'sourceSnapshotsVerified':len(manifest),'guidanceDocuments':len(sourceIds),'entries':len(ids),'servingTables':len(tables['tables']),'tableCells':sum(len(t['calorieLevels'])*len(t['rows']) for t in tables['tables']),'personalizedRecommendationsEnabled':False,'consumerEducationEnabled':False}
if __name__=='__main__':print(json.dumps(validate(),indent=2))
