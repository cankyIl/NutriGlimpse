const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {check:timing}=require('./check-scan-timing-release.cjs');
function inspect(root,privateConfig={}){
 const app=JSON.parse(fs.readFileSync(path.join(root,'apps/mobile/app.json'),'utf8')).expo;
 const m=JSON.parse(fs.readFileSync(path.join(root,'docs/app-store/metadata.en-US.json'),'utf8'));
 const checks=[];
 const add=(id,ok,detail)=>checks.push({id,status:ok?'pass':'blocked',detail});
 for(const [key,limit] of [['appName',30],['subtitle',30],['keywords',100],['promotionalText',170],['description',4000]]){
  const s=m[key];add('metadata-'+key,typeof s==='string'&&s.length>0&&Array.from(s).length<=limit,key+' must be present and within '+limit+' characters');
 }
 add('native-version',app.version===m.version,'Native marketing version must match the Apple draft');
 add('bundle-id',app.ios.bundleIdentifier===m.bundleIdentifier,'Keep the existing bundle identifier');
 const hooks=timing(root,'production');
 add('temporary-timing-removed',hooks.length===0,hooks.length?hooks.join(', '):'Existing production guard passed');
 add('support-mail',m.supportEmailVerified===true,'Actual receiving and reply test required');
 for(const key of ['supportUrl','privacyPolicyUrl']){
  let valid=false;try{const u=new URL(m[key]);valid=u.protocol==='https:'&&!/localhost|example\.|127\./i.test(u.hostname);}catch{}
  add(key,valid,'Public HTTPS page required; URL format alone does not prove delivery/content');
 }
 add('free-price',m.price.amount==='0.00'&&m.price.appleConfigurationVerified===true,'Apple price must be read back as free');
 add('us-only',JSON.stringify(m.territories)===JSON.stringify(['USA'])&&m.territoriesVerified===true,'Read back territory settings, including new-territory defaults');
 add('manual-release',m.releaseType==='MANUAL'&&m.releaseTypeVerified===true,'Apple draft manual release read-back recorded');
 add('review-contact',['firstName','lastName','email','phone'].every(k=>typeof (privateConfig.reviewContact??m.reviewContact)[k]==='string'&&(privateConfig.reviewContact??m.reviewContact)[k].trim()),'Owner-provided private review contact required');
 add('copyright',typeof m.copyright==='string'&&m.copyright.trim().length>0,'Confirm legal rights-holder name');
 const patches=spawnSync(process.execPath,['ops/apply-security-patches.cjs','--check'],{cwd:root,encoding:'utf8'});
 add('security-patches',patches.status===0,'Installed dependency entry-point hashes must match the reviewed security patches');
 const manifest=app.ios.privacyManifests;
 const expected=['Health','SensitiveInfo','PhotosorVideos','CoarseLocation','PreciseLocation','OtherUserContent','OtherDataTypes','SearchHistory','CustomerSupport','EmailAddress'];
 add('privacy-data-manifest',manifest?.NSPrivacyTracking===false&&expected.every(type=>manifest?.NSPrivacyCollectedDataTypes?.some(x=>x.NSPrivacyCollectedDataType==='NSPrivacyCollectedDataType'+type&&x.NSPrivacyCollectedDataTypeTracking===false&&x.NSPrivacyCollectedDataTypeLinked===true&&x.NSPrivacyCollectedDataTypePurposes?.includes('NSPrivacyCollectedDataTypePurposeAppFunctionality'))),'Source privacy declarations must cover optional retained partner data; final binary and Apple privacy label still need verification');
 return {ready:false,checks,manualEvidenceRequired:['Shelf model rights','Provider/privacy/age declarations','Rebuilt archive after security/manifest changes; compiled manifest and encryption audit','Physical iPhone and declared iPad acceptance','Owner review before submission']};
}
module.exports={inspect};
if(require.main===module){const privateConfig=process.env.APP_STORE_PRIVATE_CONFIG?JSON.parse(fs.readFileSync(process.env.APP_STORE_PRIVATE_CONFIG,'utf8')):{};const result=inspect(path.resolve(__dirname,'..'),privateConfig);console.log(JSON.stringify(result,null,2));process.exitCode=result.checks.some(x=>x.status==='blocked')||result.manualEvidenceRequired.length?1:0;}
