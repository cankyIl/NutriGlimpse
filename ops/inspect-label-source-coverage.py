import pathlib,json,sqlite3,urllib.request
root=pathlib.Path(__file__).resolve().parents[1]
db=sqlite3.connect(root/'.tools/catalog/public.sqlite')
row=db.execute("SELECT id FROM foods WHERE provider='usda' AND json_extract(payload,'$.additionalNutrients.transFatG') IS NOT NULL LIMIT 1").fetchone()
key=(root/'.tools/usda/api-key').read_text().strip()
req=urllib.request.Request('https://api.nal.usda.gov/fdc/v1/food/'+row[0],headers={'X-Api-Key':key})
with urllib.request.urlopen(req,timeout=15) as response:data=json.loads(response.read(1000000))
ids=[1257,1092,1090,1087]
result={'usdaNutrientDefinitions':[n['nutrient'] for n in data['foodNutrients'] if n['nutrient']['id'] in ids]}
config=json.loads((root/'.tools/off/config.json').read_text())
url='https://world.openfoodfacts.org/api/v3.4/product/00016000121836.json?fields=code,countries_tags,nutrition_data_per,serving_quantity_unit,data_quality_errors_tags'
req=urllib.request.Request(url,headers={'User-Agent':'CongressGroceryBeta/0.1 ('+config['contactEmail']+')'})
with urllib.request.urlopen(req,timeout=15) as response:data=json.loads(response.read(100000))
result['unqualifiedOffRecord']=data.get('product')
(root/'artifacts/remote/label-enrichment/source-diagnostics.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
