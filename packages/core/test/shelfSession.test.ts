import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ShelfSession } from '../src/shelfSession.ts';
import { shelfFoodKey } from '../src/shelfIdentity.ts';
import { food, observation } from './shelfTestHelpers.ts';
const create = (limits = {}) => new ShelfSession({ processNonce: 'test-process', limits, now: () => new Date('2026-10-14T12:00:00Z') });
const getRun = (s: ShelfSession, id: string) => s.getSnapshot().runs.find(run => run.id === id)!;
const add = (s: ShelfSession, id: string, index = 1, catalog = [food(index)]) => {
 const token = s.beginWork(id); assert.ok(token); return s.completeWork(token, [observation('', index)], catalog);
};
test('starting another scan preserves prior results and pauses the old capture', () => {
 const s = create(), a = s.start('breakfast-cereal')!; add(s, a);
 const b = s.start('cookies')!;
 assert.equal(s.getSnapshot().runs.length, 2); assert.equal(getRun(s, a).candidates.length, 1); assert.equal(getRun(s, a).state, 'paused'); assert.equal(getRun(s, b).state, 'scanning');
 assert.equal(s.openRun(a), true); assert.equal(getRun(s, b).state, 'paused'); assert.equal(getRun(s, a).state, 'paused');
});
test('late paused or previous-epoch work cannot enter a current run', () => {
 const s = create(), a = s.start('breakfast-cereal')!, old = s.beginWork(a)!;
 s.pause(a); assert.equal(s.resume(a), true); const current = s.beginWork(a)!;
 assert.equal(s.completeWork(old, [observation('', 1)], [food()]), false);
 assert.equal(s.completeWork({ ...current, processNonce: 'other-process' }, [observation('', 1)], [food()]), false);
 assert.equal(s.completeWork(current, [observation('', 1)], [food()]), true); assert.equal(getRun(s, a).candidates.length, 1);
});
test('finish accepts only already-admitted work into its own run when a new run starts', () => {
 const s = create(), a = s.start('breakfast-cereal')!, pending = s.beginWork(a)!;
 s.finish(a); assert.equal(getRun(s, a).state, 'finishing'); assert.equal(s.beginWork(a), null);
 const b = s.start('cookies')!; assert.equal(s.beginWork(b), null);
 assert.equal(s.completeWork(pending, [observation('', 1)], [food()]), true);
 assert.equal(getRun(s, a).state, 'finished'); assert.equal(getRun(s, a).candidates.length, 1); assert.equal(getRun(s, b).candidates.length, 0);
 assert.equal(s.completeWork(pending, [observation('', 2)], [food(2)]), false);
});
test('background invalidates every pending work item without deleting runs', () => {
 const s = create(), a = s.start('breakfast-cereal')!, pending = s.beginWork(a)!; s.finish(a);
 const b = s.start('cookies')!; s.pauseAll();
 assert.equal(getRun(s, a).state, 'finished'); assert.equal(getRun(s, b).state, 'paused');
 assert.equal(s.completeWork(pending, [observation('', 1)], [food()]), false); assert.equal(s.getSnapshot().runs.length, 2);
});
test('repeated barcode sightings deduplicate exact identity and preserve variants', () => {
 const s = create(), a = s.start('breakfast-cereal')!; add(s, a); add(s, a);
 assert.equal(getRun(s, a).candidates.length, 1); assert.equal(getRun(s, a).candidates[0].sightings, 2);
 add(s, a, 2, [food(2, { name: 'Testbrand Sunrise Reduced Sugar Cereal' })]);
 assert.equal(getRun(s, a).candidates.length, 2);
});
test('repeated OCR remains one review item; confirmation must select an offered exact key', () => {
 const s = create(), a = s.start('breakfast-cereal')!;
 for (let i = 0; i < 3; i++) s.completeWork(s.beginWork(a)!, [observation('Testbrand Sunrise', undefined, `frame-${i}`)], [food()]);
 assert.equal(getRun(s, a).candidates.length, 1); const candidate = getRun(s, a).candidates[0];
 assert.equal(candidate.status, 'needs_confirmation'); assert.equal(s.confirm(a, candidate.id, 'made-up:product'), false);
 assert.equal(s.confirm(a, candidate.id, shelfFoodKey(food())), true);
 s.completeWork(s.beginWork(a)!, [observation()], [food()]);
 assert.equal(getRun(s, a).candidates.length, 1); assert.equal(getRun(s, a).candidates[0].identityMethod, 'user-confirmed'); assert.equal(getRun(s, a).candidates[0].sightings, 3);
});
test('an unmatched observation may gain real catalog options on a later sighting', () => {
 const s = create(), a = s.start('breakfast-cereal')!;
 s.completeWork(s.beginWork(a)!, [observation()], []); assert.equal(getRun(s, a).candidates[0].status, 'unmatched');
 s.completeWork(s.beginWork(a)!, [observation()], [food()]); assert.equal(getRun(s, a).candidates.length, 1); assert.equal(getRun(s, a).candidates[0].status, 'needs_confirmation');
});
test('an unmatched barcode may become exact after downloading its category catalog', () => {
 const s = create(), a = s.start('breakfast-cereal')!; add(s, a, 1, []); add(s, a, 1, [food()]);
 assert.equal(getRun(s, a).candidates.length, 1); assert.equal(getRun(s, a).candidates[0].status, 'confirmed');
});
test('per-run capacity pauses intake while preserving earlier runs and allowing another run', () => {
 const s = create({ maxCandidatesPerRun: 1 }), a = s.start('breakfast-cereal')!; add(s, a); add(s, a, 2);
 assert.equal(getRun(s, a).state, 'paused'); assert.equal(getRun(s, a).capacityReached, true); assert.equal(getRun(s, a).candidates.length, 1);
 const b = s.start('cookies')!; assert.ok(b); assert.equal(getRun(s, a).candidates.length, 1); assert.equal(s.resume(a), false);
});
test('global capacity and run cap never evict earlier scans', () => {
 const s = create({ maxCandidatesTotal: 1 }), a = s.start('breakfast-cereal')!; add(s, a);
 assert.equal(s.start('cookies'), null); assert.equal(getRun(s, a).candidates.length, 1);
 const limited = create({ maxRuns: 1 }), first = limited.start('breakfast-cereal')!;
 assert.equal(limited.start('cookies'), null); assert.equal(getRun(limited, first).state, 'scanning');
});
test('structured memory cap rejects oversized facts without disk fallback', () => {
 const s = create({ maxStructuredBytes: 1600 }), a = s.start('breakfast-cereal')!;
 add(s, a, 1, [food(1, { ingredients: 'x'.repeat(9000) })]);
 assert.equal(getRun(s, a).candidates.length, 0); assert.equal(getRun(s, a).capacityReached, true); assert.equal(getRun(s, a).state, 'paused');
});
test('category correction preserves candidates and invalidates outstanding capture work', () => {
 const s = create(), a = s.start('breakfast-cereal')!; add(s, a); const pending = s.beginWork(a)!;
 assert.equal(s.updateCategory(a, 'cookies'), true); assert.equal(getRun(s, a).categoryId, 'cookies'); assert.equal(getRun(s, a).candidates.length, 1); assert.equal(getRun(s, a).state, 'paused');
 assert.equal(s.completeWork(pending, [observation('', 2)], [food(2)]), false);
});
test('manual observed text is reviewed only while paused/finished and cannot invent a match', () => {
 const s = create(), a = s.start('breakfast-cereal')!;
 assert.equal(s.reviewObservation(a, observation(), [food()]), false); s.pause(a);
 assert.equal(s.reviewObservation(a, observation(), [food()]), true); assert.equal(getRun(s, a).state, 'paused'); assert.equal(getRun(s, a).candidates[0].status, 'needs_confirmation');
 s.finish(a); assert.equal(s.reviewObservation(a, observation('Unknown named product'), []), true); assert.equal(getRun(s, a).state, 'finished'); assert.equal(getRun(s, a).candidates[1].food, null); assert.equal(s.beginWork(a), null);
});
test('manual evidence respects capacity and dismissing an item permits retry without erasing another run', () => {
 const s = create({ maxCandidatesPerRun: 1 }), a = s.start('breakfast-cereal')!; s.pause(a);
 assert.equal(s.reviewObservation(a, observation('', 1), [food()]), true);
 assert.equal(s.reviewObservation(a, observation('', 2), [food(2)]), false); assert.equal(getRun(s, a).candidates.length, 1);
 assert.equal(s.dismissCandidate(a, getRun(s, a).candidates[0].id), true); assert.equal(s.reviewObservation(a, observation('', 2), [food(2)]), true);
});
test('conflicting facts for the same GTIN never overwrite an already confirmed product', () => {
 const s = create(), a = s.start('breakfast-cereal')!; add(s, a);
 s.completeWork(s.beginWork(a)!, [observation('Testbrand Different Variant', 1)], [food(2, { barcode: food().barcode, name: 'Testbrand Different Variant' })]);
 const candidates = getRun(s, a).candidates;
 assert.equal(candidates.filter(c => c.status === 'confirmed').length, 0); assert.equal(candidates[0].food?.name, food().name); assert.equal(candidates[0].status, 'needs_confirmation');
 assert.equal(s.confirm(a, candidates[0].id, shelfFoodKey(food(2))), false);
 add(s, a); assert.equal(getRun(s, a).candidates[0].status, 'needs_confirmation');
});
test('snapshot reference remains stable between mutations; explicit reset invalidates old callbacks', () => {
 const s = create(); let notifications = 0; const unsubscribe = s.subscribe(() => notifications++), empty = s.getSnapshot();
 assert.equal(empty, s.getSnapshot()); const a = s.start('breakfast-cereal')!, token = s.beginWork(a)!;
 s.reset(); assert.equal(s.getSnapshot().runs.length, 0); assert.equal(s.completeWork(token, [observation('', 1)], [food()]), false);
 const b = s.start('cookies')!; assert.notEqual(a, b); assert.ok(notifications >= 4); unsubscribe();
});
test('oversized observation batch cannot retain arbitrary bridge payloads', () => {
 const s = create(), a = s.start('breakfast-cereal')!, token = s.beginWork(a)!;
 assert.equal(s.completeWork(token, Array.from({ length: 13 }, () => observation()), [food()]), false);
 assert.equal(getRun(s, a).pendingWorkCount, 0); assert.equal(getRun(s, a).candidates.length, 0);
});

test('confirming an OCR option already found by barcode suppresses its repeated review item', () => {
 const s = create(), a = s.start('breakfast-cereal')!; add(s, a);
 s.completeWork(s.beginWork(a)!, [observation()], [food()]);
 const pending = getRun(s, a).candidates.find(c => c.status === 'needs_confirmation')!;
 assert.ok(pending); assert.equal(s.confirm(a, pending.id, shelfFoodKey(food())), true);
 s.completeWork(s.beginWork(a)!, [observation()], [food()]);
 assert.equal(getRun(s, a).candidates.length, 1); assert.equal(getRun(s, a).candidates[0].sightings, 1);
});
