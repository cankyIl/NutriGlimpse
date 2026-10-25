import {projectRoot} from '../apps/service/src/projectPaths.ts';
import {PublicDatabase} from '../apps/service/src/publicDatabase.ts';
import {productLabelFingerprint} from '../packages/core/src/productLabelEvidence.ts';
import {productEvidenceSchema} from '../apps/service/src/sourceEvidence.ts';
const [provider,id,url,kind='manufacturer-label']=process.argv.slice(2);
if(!['usda','off'].includes(provider)||!id||!url||!['manufacturer-label','certification'].includes(kind)||process.argv.length>6)throw Error('Usage: draft-gluten-evidence.ts usda|off ID public-source-url manufacturer-label|certification');
const db=new PublicDatabase(projectRoot+'/.tools/catalog/public.sqlite');
try{
 const food=db.byId(provider,id);if(!food?.barcode)throw Error('Exact cached barcode required');
 const now=Date.now();
 const draft=productEvidenceSchema.parse({id:'review-'+provider+'-'+id,barcode:food.barcode,market:'US',kind,origin:kind==='certification'?'certification-authority':'public-manufacturer',sourceUrl:url,observedAt:new Date(now).toISOString(),expiresAt:new Date(now+30*86400000).toISOString(),sourceVersion:'draft-replace-after-source-review',rights:{status:'pending',recordId:null},review:{status:'draft',reviewer:null,reviewedAt:null},retailer:null,branchId:null,claim:'gluten-free',authorityId:kind==='certification'?'unreviewed-authority':null,finding:'supports',portionGrams:null,productFingerprint:productLabelFingerprint(food)});
 console.log(JSON.stringify(draft,null,2));
}finally{db.close();}
