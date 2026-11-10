import {test} from 'node:test';
import assert from 'node:assert/strict';
import {betaDiagnosticsEnabled} from '../src/releasePolicy.ts';
test('production and unknown stages cannot enable beta journals even with a stale true flag',()=>{
 for(const stage of [undefined,'production','beta1','PRODUCTION',''])assert.equal(betaDiagnosticsEnabled({GROCERY_BUILD_STAGE:stage,GROCERY_BETA_DIAGNOSTICS:'true'}),false);
});
test('beta journals require both explicit beta stage and diagnostics opt-in',()=>{
 for(const flag of [undefined,'false','TRUE',''])assert.equal(betaDiagnosticsEnabled({GROCERY_BUILD_STAGE:'beta0',GROCERY_BETA_DIAGNOSTICS:flag}),false);
 assert.equal(betaDiagnosticsEnabled({GROCERY_BUILD_STAGE:'beta0',GROCERY_BETA_DIAGNOSTICS:'true'}),true);
});
