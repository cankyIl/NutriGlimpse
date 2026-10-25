/** Include requested grocery-selling department chains without admitting every department store. */
export function supportedStoreTags(tags:Record<string,string>):boolean{
 if(!tags.name||tags.disused==='yes'||tags.abandoned==='yes')return false;
 if(['supermarket','grocery','convenience'].includes(tags.shop))return true;
 return tags.shop==='department_store'&&/^(target|walmart|wal-mart)(\b|\s)/i.test(tags.name)&&!/pharmacy|optical|tire|auto|distribution|warehouse|fulfillment|gas station/i.test(tags.name);
}
