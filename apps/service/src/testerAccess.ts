import {createHash,timingSafeEqual} from 'node:crypto';
import {lstatSync,readFileSync} from 'node:fs';
/** Only SHA-256 digests of high-entropy tester keys are accepted. No request logging. */
export function createTesterAuthorization(hashes:unknown){
 if(!Array.isArray(hashes)||hashes.length<1||hashes.length>10||hashes.some(h=>typeof h!=='string'||!/^[a-f0-9]{64}$/.test(h)))throw new Error('Invalid tester key configuration');
 const expected=hashes.map(h=>Buffer.from(h,'hex'));
 return (header:string|undefined)=>{
  if(!header||!/^Bearer [A-Za-z0-9_-]{43}$/.test(header))return false;
  const actual=createHash('sha256').update(header.slice(7)).digest();
  let valid=false;for(const digest of expected)valid=timingSafeEqual(actual,digest)||valid;
  return valid;
 };
}
export function loadTesterAuthorization(path:string){
 const stat=lstatSync(path);
 if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0||stat.uid!==process.getuid?.()||stat.size>4096)throw new Error('Tester key file must be private and owned by service user');
 const config=JSON.parse(readFileSync(path,'utf8'));
 if(config.version!==1)throw new Error('Unsupported tester key configuration');
 return createTesterAuthorization(config.hashes);
}
