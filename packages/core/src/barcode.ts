/** Validate a full GTIN and normalize its textual representation; identity is still unverified. */
function normalizeGtin(input: string): string | null {
 const code=input.trim();
 if(!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code))return null;
 const sum=[...code.slice(0,-1)].reverse().reduce((total,digit,index)=>total+Number(digit)*(index%2===0?3:1),0);
 return (10-sum%10)%10===Number(code.at(-1))?code.padStart(14,'0'):null;
}
/** UPC-E is a compressed UPC-A, not GTIN-8. Require number system and check digit. */
export function normalizeBarcode(input:string, format:'gtin'|'upc_e'='gtin'):string|null {
 if(format==='gtin')return normalizeGtin(input);
 const code=input.trim();
 if(!/^[01]\d{7}$/.test(code))return null;
 const digits=code.slice(1,7);const last=digits[5];
 const body=last<='2'?digits.slice(0,2)+last+'0000'+digits.slice(2,5)
  :last==='3'?digits.slice(0,3)+'00000'+digits.slice(3,5)
  :last==='4'?digits.slice(0,4)+'00000'+digits[4]
  :digits.slice(0,5)+'0000'+last;
 return normalizeGtin(code[0]+body+code[7]);
}
/** Preserve scanner symbology; unknown formats cannot be guessed from their payload. */
export function normalizeScannedBarcode(input:string, symbology:string):string|null {
 if(symbology==='upc_e')return normalizeBarcode(input,'upc_e');
 const length=symbology==='ean8'?8:symbology==='ean13'?13:symbology==='upc_a'?12:0;
 return length&&input.trim().length===length?normalizeGtin(input):null;
}
