import {fileURLToPath} from 'node:url';
import {isAbsolute,resolve,join} from 'node:path';
import {lstatSync,realpathSync} from 'node:fs';
/** Source root stays tied to this release, independently of the shared runtime. */
export const projectRoot=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
/** Operator-only override: preserve existing private configuration, catalogs and usage at deployment. */
export function resolveRuntimeRoot(value=process.env.GROCERY_RUNTIME_ROOT){
 if(value===undefined)return projectRoot;
 if(!isAbsolute(value))throw new Error('GROCERY_RUNTIME_ROOT must be an absolute existing directory');
 const root=resolve(value);
 if(realpathSync(root)!==root)throw new Error('Runtime root cannot contain symbolic links');
 for(const path of [root,join(root,'.tools')]){
  const info=lstatSync(path);
  if(!info.isDirectory()||info.isSymbolicLink()||(process.getuid&&info.uid!==process.getuid()))throw new Error('Unsafe runtime directory');
 }
 return root;
}
export function servicePort(value=process.env.GROCERY_LISTEN_PORT){
 if(value===undefined)return 3002;
 if(!/^[0-9]+$/.test(value))throw new Error('Invalid service port');
 const port=Number(value);
 if(!Number.isSafeInteger(port)||port<1024||port>65535)throw new Error('Invalid service port');
 return port;
}
