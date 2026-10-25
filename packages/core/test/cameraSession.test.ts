import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CameraSession } from '../src/index.ts';
function ready(){const s=new CameraSession();s.setFocused(true);s.setForeground(true);return s;}
function deferred(){let resolve!:(v:boolean)=>void;const promise=new Promise<boolean>(r=>{resolve=r;});return {promise,resolve};}
test('late permission grant after route exit cannot reactivate camera',async()=>{
 const s=ready(),d=deferred();const opening=s.open(()=>d.promise);s.setFocused(false);d.resolve(true);
 assert.equal(await opening,'stale');assert.equal(s.consume(s.ticket),false);assert.equal(s.canRequest,false);
});
test('backgrounding and returning require a new explicit open',async()=>{
 const s=ready(),d=deferred();const opening=s.open(()=>d.promise);s.setForeground(false);s.setForeground(true);d.resolve(true);
 assert.equal(await opening,'stale');assert.equal(s.consume(s.ticket),false);
 assert.equal(await s.open(async()=>true),'opened');assert.equal(s.consume(s.ticket),true);
});
test('cancelled permission request cannot disarm or overwrite a newer camera activation',async()=>{
 const s=ready(),d=deferred();const old=s.open(()=>d.promise);s.stop();
 assert.equal(await s.open(async()=>true),'opened');const ticket=s.ticket;
 d.resolve(true);assert.equal(await old,'stale');assert.equal(s.consume(ticket),true);
});
test('scan callbacks are single-use and older view callbacks are ignored',async()=>{
 const s=ready();await s.open(async()=>true);const old=s.ticket;
 assert.equal(s.consume(old),true);assert.equal(s.consume(old),false);
 await s.open(async()=>true);const current=s.ticket;
 assert.equal(s.consume(old),false);assert.equal(s.consume(current),true);
});
test('denied and failed requests recover, and repeated opens do not duplicate permission requests',async()=>{
 const s=ready(),d=deferred();let calls=0;
 const open=s.open(()=>{calls++;return d.promise;});
 assert.equal(await s.open(async()=>{calls++;return true;}),'busy');assert.equal(calls,1);
 d.resolve(false);assert.equal(await open,'denied');assert.equal(s.consume(s.ticket),false);
 assert.equal(await s.open(async()=>{throw Error('Unavailable');}),'unavailable');
 assert.equal(await s.open(async()=>true),'opened');
});
test('unfocused or backgrounded sessions never ask for permission',async()=>{
 const s=new CameraSession();let calls=0;const ask=async()=>{calls++;return true;};
 assert.equal(await s.open(ask),'stale');s.setFocused(true);assert.equal(await s.open(ask),'stale');
 assert.equal(calls,0);s.setForeground(true);assert.equal(s.canRequest,true);
});
