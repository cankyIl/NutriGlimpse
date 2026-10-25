import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveShelfIdentity, shelfFoodKey, validateShelfObservation } from '../src/shelfIdentity.ts';
import { code, food, observation } from './shelfTestHelpers.ts';

test('exact valid barcode confirms only one unique catalog record', () => {
 const result = resolveShelfIdentity(observation('', 1), [food()]);
 assert.equal(result.status, 'confirmed'); assert.equal(result.identityMethod, 'barcode'); assert.equal(result.food?.id, 'unit-1');
});
test('OCR matches always require user confirmation, even a unique complete name', () => {
 const result = resolveShelfIdentity(observation(food().name), [food()]);
 assert.equal(result.status, 'needs_confirmation'); assert.equal(result.food, null); assert.equal(result.identityMethod, null);
 assert.equal(result.options[0].key, shelfFoodKey(food()));
});
test('original and reduced sugar remain distinct review options in one category', () => {
 const result = resolveShelfIdentity(observation('Testbrand Sunrise Cereal'), [food(), food(2, { name: 'Testbrand Sunrise Reduced Sugar Cereal' })]);
 assert.equal(result.options.length, 2); assert.notEqual(result.options[0].key, result.options[1].key); assert.equal(result.status, 'needs_confirmation');
});
test('multiple records for one GTIN and multiple visible GTINs cannot auto-confirm', () => {
 const duplicate = food(2, { barcode: food().barcode, name: 'Testbrand Sunrise Reduced Sugar Cereal' });
 assert.equal(resolveShelfIdentity(observation('', 1), [food(), duplicate]).status, 'needs_confirmation');
 const many = { ...observation('', 1), barcodes: [{ value: code(1), symbology: 'ean13' }, { value: code(2), symbology: 'ean13' }] };
 assert.equal(resolveShelfIdentity(many, [food()]).status, 'needs_confirmation');
});
test('catalog conflicts cannot be hidden by coalescing duplicate source IDs', () => {
 const conflict = food(1, { name: 'Different package' }), other = food(2, { barcode: food().barcode });
 assert.notEqual(resolveShelfIdentity(observation('', 1), [food(), conflict, other]).status, 'confirmed');
 assert.equal(resolveShelfIdentity(observation('', 1), [food(), conflict]).status, 'unmatched');
});
test('identical duplicate catalog facts coalesce, but wrong symbology or checksum never confirms', () => {
 assert.equal(resolveShelfIdentity(observation('', 1), [food(), food()]).status, 'confirmed');
 const bad = { ...observation('', 1), barcodes: [{ value: code(1).slice(0, -1) + ((Number(code(1).at(-1)) + 1) % 10), symbology: 'ean13' }] };
 assert.equal(resolveShelfIdentity(bad, [food()]).status, 'unmatched');
 assert.equal(resolveShelfIdentity({ ...observation('', 1), barcodes: [{ value: code(1), symbology: 'qr' }] }, [food()]).status, 'unmatched');
});
test('generic nutrition text and low confidence OCR do not suggest catalog identities', () => {
 assert.equal(resolveShelfIdentity(observation('original cereal low sugar whole grain'), [food()]).options.length, 0);
 assert.equal(resolveShelfIdentity({ ...observation(), text: [{ value: 'Testbrand Sunrise', confidence: 0.1 }] }, [food()]).options.length, 0);
});
test('malformed and oversized text is rejected, extra image fields are discarded', () => {
 assert.equal(validateShelfObservation({ ...observation(), text: [{ value: 'x'.repeat(241), confidence: 1 }] }), null);
 assert.equal(validateShelfObservation({ ...observation(), text: [{ value: 'Testbrand', confidence: NaN }] }), null);
 const clean = validateShelfObservation({ ...observation(), image: 'secret camera bytes', uri: 'private path', trackIdHint: 'not identity' });
 assert.ok(clean); assert.equal('image' in clean, false); assert.equal('trackIdHint' in clean, false);
});
test('candidate suggestions are bounded and never supplemented from built-in fixtures', () => {
 const many = Array.from({ length: 20 }, (_, i) => food(i + 1));
 assert.equal(resolveShelfIdentity(observation(), many).options.length, 5);
 assert.equal(resolveShelfIdentity(observation(), []).options.length, 0);
 assert.equal(resolveShelfIdentity(observation('', 1), Array.from({ length: 501 }, () => food())).status, 'unmatched');
});
test('observation fingerprint ignores per-frame IDs and OCR line ordering', () => {
 const a = { ...observation(), text: [{ value: 'Testbrand', confidence: 0.9 }, { value: 'Sunrise', confidence: 0.8 }] };
 const b = { ...a, observationId: 'another-frame', text: [...a.text].reverse() };
 assert.equal(resolveShelfIdentity(a, [food()]).observationFingerprint, resolveShelfIdentity(b, [food()]).observationFingerprint);
});

test('explicit observed brand excludes weaker word-only hits from other brands', () => {
 const exact = food(1, { name: 'Chocolate Chunk Cookies', brand: 'Testbrand' });
 const unrelated = food(2, { name: 'Chocolate Orange Cookies', brand: 'Otherbrand' });
 const result = resolveShelfIdentity(observation('Testbrand Chocolate Chunk'), [exact, unrelated]);
 assert.deepEqual(result.options.map(option => option.food.brand), ['Testbrand']); assert.equal(result.status, 'needs_confirmation');
});
test('a bare brand/product name puts the less-specific variant before unobserved flavor claims', () => {
 const plain = food(2, { name: 'Testbrand Breakfast Cereal' });
 const flavored = food(1, { name: 'Testbrand Strawberry Vanilla Breakfast Cereal' });
 const result = resolveShelfIdentity(observation('Testbrand'), [flavored, plain]);
 assert.equal(result.options[0].food.id, plain.id); assert.equal(result.status, 'needs_confirmation');
});

test('explicit low-fat words rank matching variants above shorter full-fat names', () => {
 const low = food(2, { name: 'Testbrand Low Fat 2% Milkfat Small Curd Cottage Cheese', comparisonGroup: 'cottage-cheese' });
 const regular = food(1, { name: 'Testbrand Pure Cottage Cheese 4%', comparisonGroup: 'cottage-cheese' });
 const result = resolveShelfIdentity(observation('Testbrand Low Fat Cottage Cheese'), [regular, low]);
 assert.equal(result.options[0].food.id, low.id); assert.equal(result.status, 'needs_confirmation');
});
