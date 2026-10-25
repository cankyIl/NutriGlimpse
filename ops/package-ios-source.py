"""Create a private, complete source bundle with no machine-local keys or generated projects."""
from pathlib import Path
import hashlib,json,os,re,zipfile
from datetime import datetime,timezone
from build_provenance import snapshot_inputs, DEVELOPMENT_DIRS, DEVELOPMENT_FILES
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/independent-development/delivery'
SKIP={'node_modules','build','.cxx','.gradle','.expo','.git','.tools','dist','__pycache__','Pods'}
FILES=['package.json','package-lock.json','.gitignore','README.md']
FOLDERS=['apps/mobile/src','apps/mobile/modules','apps/mobile/plugins','apps/mobile/assets','apps/service/src','apps/service/test','packages','vendor','data/guidance','docs','ops']
def paths():
 found={ROOT/x for x in FILES if (ROOT/x).is_file()}
 for folder in ['apps/mobile','apps/service']:
  for p in (ROOT/folder).iterdir():
   if p.is_file() and p.suffix in {'.json','.js','.cjs','.mjs'}:found.add(p)
 for folder in FOLDERS:
  for base,dirs,files in os.walk(ROOT/folder):
   dirs[:]=sorted(x for x in dirs if x not in SKIP and x.casefold() not in DEVELOPMENT_DIRS)
   for name in files:
    if name.casefold() in DEVELOPMENT_FILES:continue
    p=Path(base)/name
    if p.relative_to(ROOT).as_posix()=='docs/AppleCredentials':continue
    if p.is_symlink():raise ValueError('Review symlink before packaging')
    if p.suffix in {'.p8','.p12','.pem','.key','.mobileprovision'} or name=='credentials.json' or name.startswith('.env'):raise ValueError('Credential-like file in source')
    found.add(p)
 return sorted(found)
def main():
 inputs=snapshot_inputs(ROOT);files=paths();relative={p.relative_to(ROOT).as_posix() for p in files}
 if not {x['path'] for x in inputs['files']}.issubset(relative):raise ValueError('Missing build inputs')
 OUT.mkdir(parents=True,exist_ok=True)
 name='HealthGrocery-Beta0-Source-'+datetime.now(timezone.utc).strftime('%Y-%m-%dT%H%M%SZ')+'-'+inputs['sha256'][:12]+'.zip';target=OUT/name;temp=OUT/(name+'.part')
 manifest=[]
 with zipfile.ZipFile(temp,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
  for p in files:
   content=p.read_bytes()
   if re.search(rb'\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{60,}\b',content):raise ValueError('Possible API key in source')
   path=p.relative_to(ROOT).as_posix()
   manifest.append({'path':path,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
   archive.writestr('HealthGroceryBeta0/'+path,content)
  archive.writestr('HealthGroceryBeta0/SOURCE-MANIFEST.json',json.dumps({'sourceSha256':inputs['sha256'],'files':manifest},indent=2))
 with zipfile.ZipFile(temp) as archive:
  if archive.testzip() is not None:raise ValueError('Archive CRC failed')
  if any('/.tools/' in n or '/node_modules/' in n for n in archive.namelist()):raise ValueError('Private/generated content')
 if snapshot_inputs(ROOT)!=inputs:raise ValueError('Build sources changed while packaging')
 temp.replace(target)
 native_evidence={}
 for build_target in ('simulator','device'):
  record=ROOT/'artifacts/mac-build'/(build_target+'-build.json')
  if record.is_file():
   build=json.loads(record.read_text())
   if build.get('sourceSha256')==inputs['sha256']:
    native_evidence[build_target]={'sourceSha256':build['sourceSha256'],'artifactTreeSha256':build['artifactTreeSha256'],'builtAtUTC':build['builtAtUTC'],'signing':build['signing']}
 report={'archive':str(target),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceSha256':inputs['sha256'],'files':len(manifest),'createdAt':datetime.now(timezone.utc).isoformat(),'iosSwiftCompiled':bool(native_evidence),'iosNativeEvidence':native_evidence,'physicalDeviceVerified':False,'releaseApproved':False,'modelRights':'diagnostic research only; distribution unresolved','credentialsIncluded':False}
 (OUT/'delivery-verification.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report,indent=2))
if __name__=='__main__':main()
