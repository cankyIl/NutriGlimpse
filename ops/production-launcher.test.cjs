const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const script=fs.readFileSync(path.join(__dirname,'run-production-backend.sh'),'utf8');
function run(overrides={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nutriglimpse-production-launcher-'));
 try{
  fs.mkdirSync(path.join(root,'ops'));fs.mkdirSync(path.join(root,'bin'));
  fs.writeFileSync(path.join(root,'ops/run-production-backend.sh'),script);
  fs.writeFileSync(path.join(root,'ops/remote-env.sh'),'export PATH="'+root+'/bin:/usr/bin:/bin"\n');
  const stub='#!/usr/bin/python3\nimport json,os,sys\nprint(json.dumps({"argv":sys.argv[1:],"cwd":os.getcwd(),"stage":os.environ.get("GROCERY_BUILD_STAGE"),"diagnostics":os.environ.get("GROCERY_BETA_DIAGNOSTICS"),"photo":os.environ.get("GROCERY_PHOTO_ASSESSMENT_ENABLED"),"photoConsent":os.environ.get("GROCERY_PHOTO_ASSESSMENT_CONSENT"),"dualConsent":os.environ.get("GROCERY_DUAL_PHOTO_CONSENT"),"gemini":os.environ.get("GROCERY_GEMINI_ENABLED"),"reports":os.environ.get("GROCERY_REAL_REPORTS_ENABLED")}))\n';
  fs.writeFileSync(path.join(root,'bin/node'),stub,{mode:0o700});
  const result=spawnSync('/bin/bash',[path.join(root,'ops/run-production-backend.sh')],{cwd:os.tmpdir(),env:{PATH:'/usr/bin:/bin',...overrides},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);const captured=JSON.parse(result.stdout);assert.equal(captured.cwd,root);assert.deepEqual(captured.argv,['--experimental-strip-types','apps/service/src/startBeta.ts']);return captured;
 }finally{fs.rmSync(root,{recursive:true,force:true});}
}
test('production launcher disables journals and retains photo consent without enabling report processing',()=>{
 const result=run();assert.equal(result.stage,'production');assert.equal(result.diagnostics,'false');assert.equal(result.photo,'true');assert.equal(result.gemini,'true');assert.equal(result.photoConsent,'product-photo-assessment-2026-10-16.1');assert.equal(result.dualConsent,'product-photo-dual-2026-10-17.1');assert.equal(result.reports,null);
});
test('production launcher defeats inherited beta flags and preserves explicit report disablement',()=>{
 const result=run({GROCERY_BUILD_STAGE:'beta0',GROCERY_BETA_DIAGNOSTICS:'true',GROCERY_REAL_REPORTS_ENABLED:'false'});assert.equal(result.stage,'production');assert.equal(result.diagnostics,'false');assert.equal(result.reports,'false');
});
