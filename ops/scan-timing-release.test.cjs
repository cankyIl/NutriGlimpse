const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {check}=require('./check-scan-timing-release.cjs');
test('Beta 1/production/unset release stage blocks temporary code even if collection is disabled',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'timing-gate-'));try{
  fs.mkdirSync(path.join(root,'apps/mobile'),{recursive:true});fs.writeFileSync(path.join(root,'apps/mobile/app.json'),JSON.stringify({expo:{version:'0.1.0'}}));
  fs.mkdirSync(path.join(root,'packages/core/src'),{recursive:true});fs.writeFileSync(path.join(root,'packages/core/src/scanTiming.ts'),'const enabled=false;');
  assert.equal(check(root,'beta0').length,0);for(const stage of ['beta1','production',undefined])assert.equal(check(root,stage).length,1);
  fs.writeFileSync(path.join(root,'apps/mobile/app.json'),JSON.stringify({expo:{version:'0.2.0'}}));assert.equal(check(root,'beta0').length,1);
  fs.unlinkSync(path.join(root,'packages/core/src/scanTiming.ts'));assert.equal(check(root,'beta1').length,0);
  fs.mkdirSync(path.join(root,'apps/mobile/src/app'),{recursive:true});fs.writeFileSync(path.join(root,'apps/mobile/src/app/capture.tsx'),'scanTiming?.finish();');assert.equal(check(root,'beta1').length,1);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('EAS archive includes the release guard without including private operator data',()=>{
 const root=path.resolve(__dirname,'..'),ignore=require('ignore')().add(fs.readFileSync(path.join(root,'.easignore'),'utf8'));
 assert.equal(ignore.ignores('ops/check-scan-timing-release.cjs'),false);
 for(const file of ['.secrets/apple/private.p8','.tools/beta-diagnostics/events.sqlite','ops/read-scan-timings.py','artifacts/scan-timing-2026-10-17/full-check.log'])assert.equal(ignore.ignores(file),true,file);
 const mobile=JSON.parse(fs.readFileSync(path.join(root,'apps/mobile/package.json'),'utf8'));assert.equal(mobile.scripts['eas-build-post-install'],'node ../../ops/check-scan-timing-release.cjs');
});
