import {projectRoot} from '../apps/service/src/projectPaths.ts';
import {PrivateResponseJournal} from '../apps/service/src/responseJournal.ts';
const root=projectRoot;
const journal=new PrivateResponseJournal(root+'/.tools/beta-response-journal');
try{
 const [trace,...flags]=process.argv.slice(2);
 if(!trace||trace==='--list')console.log(JSON.stringify(journal.list(),null,2));
 else {
  if(!/^[a-f0-9-]{36}$/.test(trace))throw Error('Supply a recorded trace ID');
  const row=journal.read(trace);if(!row)throw Error('No retained response for this trace (old, expired or capture not accepted)');
  console.log(JSON.stringify(flags.includes('--full')?row:{model:row.model,outcome:row.outcome,errorCode:row.errorCode,primaryAnswerCharacters:row.primary.answerText.length,retailerFollowup:!!row.retailerFollowup,supplement:row.supplement?{model:row.supplement.model,status:row.supplement.status,disposition:row.supplement.disposition,added:row.supplement.added,elapsedMs:row.supplement.elapsedMs,waitMs:row.supplement.waitMs,answerCharacters:row.supplement.returned?.answerText.length??0}:null,decisions:row.decisions},null,2));
 }
}finally{journal.close();}
