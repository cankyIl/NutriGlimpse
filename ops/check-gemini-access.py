#!/usr/bin/env python3
"""Read-only model metadata check. No prompt, image, profile, or generation request."""
from pathlib import Path
import datetime,json,os,stat,sys,urllib.error,urllib.request
root=Path("/path/to/NutriGlimpse")
key_path=root/".tools/gemini/api-key"
model="gemini-3.5-flash-lite"
if key_path.is_symlink() or not key_path.is_file():
    sys.exit("Gemini key has not been saved.")
info=key_path.stat()
if info.st_uid!=os.getuid() or stat.S_IMODE(info.st_mode)!=0o600:
    sys.exit("Gemini key permissions need correction; no request sent.")
key=key_path.read_text().strip()
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):
        return None
request=urllib.request.Request(
    "https://generativelanguage.googleapis.com/v1beta/models/"+model,
    headers={"x-goog-api-key":key,"Accept":"application/json","User-Agent":"HealthGrocerySetup/0.1.0"})
report={"checkedAtUTC":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "requestedModel":model,"metadataAccessible":False,"generationTested":False,
        "personalDataSent":False,"liveRoutingChanged":False}
try:
    with urllib.request.build_opener(NoRedirect).open(request,timeout=20) as response:
        data=json.loads(response.read(256*1024))
    report.update({"metadataAccessible":data.get("name")=="models/"+model,
                   "model":data.get("name"),"displayName":data.get("displayName"),
                   "supportedGenerationMethods":data.get("supportedGenerationMethods",[]),
                   "inputTokenLimit":data.get("inputTokenLimit"),
                   "outputTokenLimit":data.get("outputTokenLimit")})
except urllib.error.HTTPError as error:
    report["httpStatus"]=error.code
    try:
        body=json.loads(error.read(64*1024))
        status=body.get("error",{}).get("status")
        if isinstance(status,str) and status.isupper() and len(status)<80:
            report["providerStatus"]=status
        reasons=[]
        for item in body.get("error",{}).get("details",[]):
            reason=item.get("reason")
            if isinstance(reason,str) and reason.isupper() and len(reason)<80:
                reasons.append(reason)
        report["providerReasons"]=reasons
    except (ValueError,AttributeError):
        pass
except (urllib.error.URLError,TimeoutError):
    report["error"]="Connection failed; key was not printed."
finally:
    key=""
folder=root/"artifacts/gemini-setup-2026-10-18"
folder.mkdir(mode=0o700,exist_ok=True)
(folder/"model-access.json").write_text(json.dumps(report,indent=2)+"\n")
print(json.dumps(report,indent=2))
sys.exit(0 if report["metadataAccessible"] else 1)
