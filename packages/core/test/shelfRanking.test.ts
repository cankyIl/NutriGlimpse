import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rankShelfFoods, shelfRankingPolicy} from '../src/shelfRanking.ts';
import {panelConflictCandidates} from '../src/reports.ts';
import type {PublicFood} from '../src/publicFood.ts';
import type {ConfirmedPanel, Profile} from '../src/types.ts';

const now = Date.parse('2026-10-14T12:00:00Z');
const profile: Profile = {revision: 1, age: 40, pregnancy: 'not-pregnant', primary: 'cardiovascular', conditions: ['cardiovascular'], intent: 'both', restrictions: []};
const food = (id: string, nutrients: Partial<PublicFood['nutrients']> = {}, extra: Partial<PublicFood> = {}): PublicFood => ({
 provider: 'usda', id, barcode: id.padStart(14, '0'), name: `Fixture cereal ${id}`, brand: 'Test only',
 ingredients: 'Fictional test formula', dataType: 'Branded', basis: '100g', comparisonGroup: 'breakfast-cereal', categoryEvidence: 'category-rules-v4',
 servingGrams: 30, nutrients: {caloriesKcal: 350, saturatedFatG: 2, fiberG: 6, sodiumMg: 200, sugarsG: 10, ...nutrients},
 sourceUrl: `https://fdc.nal.usda.gov/food-details/${id}/nutrients`, retrievedAt: new Date(now).toISOString(), sourceDate: '2026-09-30',
 license: 'CC0-1.0', certifications: 'unverified', availability: 'unverified', ...extra,
});
const panel = (id: string, testDate: string | null, measurements: ConfirmedPanel['measurements'] = [{analyte: 'ldl', rawValue: '120', unit: 'mg/dL', comparator: '='}]): ConfirmedPanel => ({id, testDate, importedAt: '2026-10-13T12:00:00Z', confirmed: true, measurements});
const compare = (foods: PublicFood[], changes: Partial<Parameters<typeof rankShelfFoods>[0]> = {}) => rankShelfFoods({foods, profile, categoryId: 'breakfast-cereal', now, ...changes});

test('same-category frontiers use every selected condition without numeric clinical scores', () => {
 const a = food('1', {saturatedFatG: 1, sodiumMg: 500});
 const b = food('2', {saturatedFatG: 3, sodiumMg: 100});
 const c = food('3', {saturatedFatG: 4, sodiumMg: 600});
 const result = compare([c, b, a], {profile: {...profile, conditions: ['cardiovascular', 'hypertension']}});
 assert.deepEqual(result.ranked.map(item => [item.food.id, item.tier]), [['1', 1], ['2', 1], ['3', 2]]);
 assert.ok(result.ranked.every(item => item.absoluteRating === null));
 assert.equal(result.clinicalReviewStatus, 'pending');
 assert.equal(result.policyVersion, shelfRankingPolicy.version);
 assert.ok(result.ranked[0].tradeoffs.some(item => item.metric === 'sodiumMg' && item.otherFoodId === 'usda:2'));
 const switched = compare([c, b, a], {profile: {...profile, primary: 'hypertension', conditions: ['cardiovascular', 'hypertension']}});
 assert.deepEqual(switched.ranked.map(item => [item.food.id, item.tier]), result.ranked.map(item => [item.food.id, item.tier]));
});

test('profile changes produce new comparisons locally, with recorded revision', () => {
 const items = [food('1', {saturatedFatG: 1, sodiumMg: 500}), food('2', {saturatedFatG: 3, sodiumMg: 100})];
 assert.equal(compare(items).ranked[0].food.id, '1');
 const changed = compare(items, {profile: {...profile, revision: 2, primary: 'hypertension', conditions: ['hypertension']}});
 assert.equal(changed.ranked[0].food.id, '2');
 assert.equal(changed.profileRevision, 2);
 assert.equal(changed.primaryConcern, 'hypertension');
});

test('exact formulations stay distinct, groups cannot mix, and fewer than ten is valid', () => {
 const original = food('1', {}, {name: 'Original cereal'});
 const reduced = food('2', {sugarsG: 3}, {name: 'Reduced sugar cereal'});
 const other = food('3', {}, {comparisonGroup: 'cookies'});
 const result = compare([other, original, reduced, {...original}]);
 assert.deepEqual(result.ranked.map(item => item.food.id), ['1', '2']);
 assert.equal(result.eligibleCount, 2);
 assert.ok(result.excluded[0].reasons.some(reason => reason.includes('different comparison category')));
 assert.equal(result.ranked[0].tier, result.ranked[1].tier, 'total sugar difference alone is not a supported LDL priority');
});

test('all required restrictions, including implicit celiac gluten-free evidence, are fail-closed', () => {
 for (const restriction of ['vegetarian', 'halal', 'kosher', 'glutenFree', 'dairyFree', 'eggFree'] as const) {
  const result = compare([food('1', {}, {name: 'Certified halal kosher gluten-free vegetarian marketing text'})], {profile: {...profile, restrictions: [restriction]}});
  assert.equal(result.ranked.length, 0, restriction);
  assert.ok(result.excluded[0].reasons.some(reason => reason.includes('unverified')));
 }
 const celiac = compare([food('1')], {profile: {...profile, conditions: ['cardiovascular', 'celiac']}});
 assert.equal(celiac.status, 'needs-information');
 assert.ok(celiac.sourceIds.includes('celiac'));
});

test('secondary CKD and SIBO and pregnancy applicability cannot be hidden by primary concern', () => {
 for (const condition of ['ckd', 'sibo'] as const) {
  const result = compare([food('1')], {profile: {...profile, conditions: ['cardiovascular', condition]}});
  assert.equal(result.ranked.length, 0, condition);
  assert.ok(result.contextNotes.some(note => note.includes(condition === 'ckd' ? 'Kidney-specific' : 'SIBO')));
 }
 for (const pregnancy of ['pregnant', 'unspecified'] as const) {
  assert.equal(compare([food('1')], {profile: {...profile, pregnancy}}).ranked.length, 0);
 }
 assert.equal(compare([food('1')], {profile: {...profile, age: 20}}).ranked.length, 0);
});

test('null is not zero: incomplete or stale or implausible food evidence is excluded', () => {
 for (const metric of Object.keys(food('1').nutrients) as (keyof PublicFood['nutrients'])[]) {
  assert.equal(compare([food('1', {[metric]: null})]).ranked.length, 0, metric);
 }
 for (const extra of [{ingredients: null}, {barcode: null}, {sourceDate: '2020-01-01'}, {retrievedAt: '2020-01-01T00:00:00Z'}, {categoryEvidence: undefined}] as Partial<PublicFood>[]) {
  assert.equal(compare([food('1', {}, extra)]).ranked.length, 0);
 }
 assert.equal(compare([food('1', {sodiumMg: 100001})]).ranked.length, 0);
});

test('optional confirmed LDL context changes nutrient frontiers without an invented LDL threshold', () => {
 const weight: Profile = {...profile, primary: 'weight', conditions: ['weight']};
 const items = [food('1', {caloriesKcal: 300, saturatedFatG: 8}), food('2', {caloriesKcal: 400, saturatedFatG: 1})];
 assert.deepEqual(compare(items, {profile: weight}).ranked.map(item => item.tier), [1, 2]);
 const result = compare(items, {profile: weight, panels: [panel('current', '2026-10-01')]});
 assert.deepEqual(result.ranked.map(item => item.tier), [1, 1]);
 assert.ok(result.priorities.some(priority => priority.origins.includes('Confirmed LDL context')));
 assert.equal(result.panelId, 'current');
 assert.ok(result.contextNotes.some(note => note.includes('without diagnosing high LDL')));
});

test('latest confirmed test date controls context and same-date conflicts need the saved explicit choice', () => {
 const old = {...panel('old', '2026-09-01'), importedAt: '2026-10-14T10:00:00Z'};
 const current = panel('new', '2026-10-01', [{analyte: 'hdl', rawValue: '50', unit: 'mg/dL', comparator: '='}]);
 const pending = {...panel('pending', '2026-10-13'), confirmed: false};
 const weight: Profile = {...profile, primary: 'weight', conditions: ['weight']};
 const result = compare([food('1')], {profile: weight, panels: [old, current, pending]});
 assert.equal(result.panelId, 'new');
 assert.deepEqual(result.priorities.map(priority => priority.metric), ['caloriesKcal']);
 const duplicateDate = panel('same-date', '2026-10-01');
 const panels = [old, current, duplicateDate];
 assert.equal(compare([food('1')], {panels}).panelId, null);
 const selected = compare([food('1')], {panels, panelChoice: {selectedId: 'same-date', candidates: panelConflictCandidates(panels)}});
 assert.equal(selected.panelId, 'same-date');
 assert.equal(compare([food('1')], {panels, panelChoice: {selectedId: 'same-date', candidates: 'outdated'}}).panelId, null);
});

test('synthetic, undated and future reports do not create real lipid context or borrow an older result', () => {
 const sample = {...panel('sample', '2026-10-01'), synthetic: true};
 const result = compare([food('1')], {panels: [sample]});
 assert.equal(result.panelId, null);
 assert.ok(result.contextNotes.some(note => note.includes('Sample lipid reports')));
 assert.equal(compare([food('1')], {panels: [panel('date-missing', null)]}).panelId, null);
 assert.equal(compare([food('1')], {panels: [panel('old', '2026-09-01'), panel('future', '2027-01-01')]}).panelId, null);
});

test('LDL units and bounds stay explicit and missing nonselected analytes are not assumed normal', () => {
 const weight: Profile = {...profile, primary: 'weight', conditions: ['weight']};
 for (const measurement of [
  {analyte: 'ldl' as const, rawValue: '120', unit: 'unknown', comparator: '=' as const},
  {analyte: 'ldl' as const, rawValue: '120', unit: 'mg/dL', comparator: '<' as const},
  {analyte: 'ldl' as const, rawValue: 'NaN', unit: 'mg/dL', comparator: '=' as const},
 ]) {
  const result = compare([food('1')], {profile: weight, panels: [panel('limited', '2026-10-01', [measurement])]});
  assert.deepEqual(result.priorities.map(priority => priority.metric), ['caloriesKcal']);
  assert.equal(result.ranked.length, 1);
 }
 const mmol = compare([food('1')], {profile: weight, panels: [panel('mmol', '2026-10-01', [{analyte: 'ldl', rawValue: '3.1', unit: 'mmol/L', comparator: '='}])]});
 assert.ok(mmol.priorities.some(priority => priority.metric === 'saturatedFatG'));
});

test('triglycerides use supported saturated-fat context and never substitute total for added sugar', () => {
 const weight: Profile = {...profile, primary: 'weight', conditions: ['weight']};
 const result = compare([food('1')], {profile: weight, panels: [panel('tg', '2026-10-01', [{analyte: 'triglycerides', rawValue: '220', unit: 'mg/dL', comparator: '='}])]});
 assert.ok(result.priorities.some(priority => priority.origins.includes('Confirmed triglyceride context')));
 assert.ok(!result.priorities.some(priority => priority.metric === 'sugarsG'));
 assert.ok(result.contextNotes.some(note => note.includes('total sugars are not substituted')));
 for (const [rawValue, unit, comparator] of [['500', 'mg/dL', '='], ['600', 'mg/dL', '>'], ['5.6', 'mmol/L', '=']] as const) {
  const held = compare([food('1')], {panels: [panel('tg', '2026-10-01', [{analyte: 'triglycerides', rawValue, unit, comparator}])]});
  assert.equal(held.ranked.length, 0);
  assert.ok(held.contextNotes.some(note => note.includes('individualized nutrition plan')));
 }
});

test('diabetes and MASLD expose unsupported nutrients and never assign an absolute rating', () => {
 for (const condition of ['diabetes', 'masld'] as const) {
  const result = compare([food('1')], {profile: {...profile, primary: condition, conditions: [condition]}});
  assert.equal(result.ranked.length, 1);
  assert.equal(result.ranked[0].absoluteRating, null);
  assert.ok(result.contextNotes.some(note => note.includes(condition === 'diabetes' ? 'does not predict glucose response' : 'overall eating pattern')));
 }
});

test('stable ties cap at ten, explicitly disclose omitted boundary ties and never invent products', () => {
 const items = Array.from({length: 13}, (_, index) => food(String(index + 1)));
 const result = compare(items);
 const reversed = compare([...items].reverse());
 assert.equal(result.ranked.length, 10);
 assert.equal(result.eligibleCount, 13);
 assert.equal(result.remainingCount, 3);
 assert.equal(result.boundaryTiedCount, 3);
 assert.deepEqual(result.ranked.map(item => item.food.id), reversed.ranked.map(item => item.food.id));
 assert.ok(result.ranked.every(item => items.includes(item.food)));
});

test('conflicting facts for one GTIN withhold that package while benign duplicates do not fill ranks', () => {
 const a = food('1');
 const conflicting = {...food('2', {saturatedFatG: 9}), barcode: a.barcode};
 const result = compare([a, conflicting, food('3')]);
 assert.deepEqual(result.ranked.map(item => item.food.id), ['3']);
 assert.equal(result.excluded.length, 2);
 assert.ok(result.excluded.every(item => item.reasons[0].includes('Conflicting catalog facts')));
 assert.equal(compare([a, {...a}]).ranked.length, 1);
});

test('comparison is deterministic and pure, requires no LLM and rejects oversized input', () => {
 const input = {foods: [food('1'), food('2', {saturatedFatG: 1})], profile, categoryId: 'breakfast-cereal' as const, now, panels: [panel('current', '2026-10-01')]};
 const before = JSON.stringify(input);
 const result = rankShelfFoods(input);
 assert.deepEqual(rankShelfFoods(input), result);
 assert.equal(JSON.stringify(input), before);
 assert.equal(typeof (result as unknown as {then?: unknown}).then, 'undefined');
 assert.equal(compare(Array.from({length: 501}, (_, index) => food(String(index + 1)))).ranked.length, 0);
 assert.equal(compare([], {now: Number.NaN}).status, 'needs-information');
});

test('ordered 500-product maximum produces complete frontiers and bounded top-ten output', () => {
 const items = Array.from({length: 500}, (_, index) => food(String(index + 1), {saturatedFatG: index / 10}));
 const result = compare([...items].reverse());
 assert.equal(result.eligibleCount, 500);
 assert.equal(result.remainingCount, 490);
 assert.equal(result.boundaryTiedCount, 0);
 assert.deepEqual(result.ranked.map(item => item.tier), [1,2,3,4,5,6,7,8,9,10]);
 assert.deepEqual(result.ranked.map(item => item.food.id), ['1','2','3','4','5','6','7','8','9','10']);
});


test('wellness profiles show equal-weight facts without inheriting disease or weight-loss ranking',()=>{
 for(const primary of ['generalFitness','noConcern'] as const){
  const result=compare([food('2',{caloriesKcal:400,saturatedFatG:5}),food('1')],{profile:{...profile,primary,conditions:[]}});
  assert.equal(result.status,'comparison');assert.equal(result.eligibleCount,2);
  assert.deepEqual(result.priorities,[]);assert.deepEqual(result.ranked.map(item=>item.tier),[1,1]);
  assert.ok(result.ranked.every(item=>item.absoluteRating===null));
  assert.ok(result.contextNotes.some(note=>note.includes('without a preferred nutrient')));
  for(const change of [{restrictions:['glutenFree']},{conditions:['ckd']},{pregnancy:'pregnant'}] as Partial<Profile>[]){
   assert.equal(compare([food('1')],{profile:{...profile,primary,conditions:[],...change}}).ranked.length,0);
  }
  assert.equal(compare([food('1',{fiberG:null})],{profile:{...profile,primary,conditions:[]}}).ranked.length,0);
 }
 const baseline=compare([food('1')]);
 const fitness=compare([food('1')],{profile:{...profile,primary:'generalFitness',gender:'female'}});
 assert.deepEqual(fitness.priorities,baseline.priorities);
});
