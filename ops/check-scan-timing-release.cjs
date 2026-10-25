// Beta 1 release gate: the temporary recorder must be REMOVED, not merely disabled.
const fs=require('node:fs'),path=require('node:path');
function check(root,stage){
 let version;try{version=JSON.parse(fs.readFileSync(path.join(root,'apps/mobile/app.json'),'utf8')).expo.version;}catch{}
 if(stage==='beta0'&&version==='0.1.0')return [];
 const files=['packages/core/src/scanTiming.ts','apps/mobile/src/state/ScanTiming.ts','apps/service/src/scanTiming.ts'];
 const hooks=['packages/core/src/aiFoodClient.ts','apps/mobile/src/app/capture.tsx','apps/mobile/src/app/photo-results.tsx','apps/mobile/src/state/AiScanState.ts','apps/mobile/src/ui/PhotoCaptureView.types.ts','apps/mobile/modules/private-input/ios/MemoryPhotoReader.swift','apps/mobile/modules/private-input/ios/MemoryPhotoView.swift','apps/mobile/modules/private-input/ios/PrivateInputModule.swift','ops/run-beta-backend.sh'];
 return [...files.filter(f=>fs.existsSync(path.join(root,f))),...hooks.filter(f=>fs.existsSync(path.join(root,f))&&/ScanTiming|scanTiming|timingEnabled|GROCERY_BETA_SCAN_TIMING/.test(fs.readFileSync(path.join(root,f),'utf8')))];
}
module.exports={check};
if(require.main===module){const found=check(path.resolve(__dirname,'..'),process.env.EXPO_PUBLIC_BUILD_STAGE);if(found.length){console.error('Beta 1/production release blocked: remove temporary scan timing first. See docs/53-beta0-scan-timing.md.\n'+found.join('\n'));process.exitCode=1;}else console.log('Scan timing release gate passed.');}
