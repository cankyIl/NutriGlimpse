import {normalizeBarcode} from './barcode.ts';
import {ocrPagesSchema} from './inputPrivacy.ts';
export function classifyPhoto(page:unknown,barcodes:unknown):{kind:'nutrition';pages:ReturnType<typeof ocrPagesSchema.parse>}|{kind:'barcode';barcode:string}|{kind:'product'}|{kind:'ambiguous'}{
 const parsed=ocrPagesSchema.safeParse([page]);
 const text=parsed.success?parsed.data[0].lines.map(l=>l.text).join(' ').toLowerCase():'';
 // The heading plus multiple table fields prevents front-label marketing from being treated as a table.
 if(parsed.success&&/nutrition\s*facts/.test(text)&&[/calories/,/total\s+carbohydrate/,/sodium/,/serving\s+size/,/saturated\s+fat/].filter(re=>re.test(text)).length>=3)return {kind:'nutrition',pages:parsed.data};
 if(Array.isArray(barcodes)&&barcodes.length){
  const valid=[...new Set(barcodes.map(b=>typeof b==='string'?normalizeBarcode(b):b&&typeof b.value==='string'&&['gtin','upc_e'].includes(b.format)?normalizeBarcode(b.value,b.format):null).filter((b):b is string=>!!b))];
  if(valid.length===1)return {kind:'barcode',barcode:valid[0]};
  return {kind:'ambiguous'};
 }
 return {kind:'product'};
}
