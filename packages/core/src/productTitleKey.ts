/** Cosmetic title differences only. Brand, flavor, formulation and shape words remain. */
export function productTitleKey(name:string):string{
 return name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'')
  .replace(/\b\d+(?:\.\d+)?\s*(?:fl\s*oz|oz|ounce(?:s)?|lb|g|kg|ml|liter(?:s)?|litre(?:s)?)\b/g,'')
  .replace(/[^a-z0-9]+/g,' ').replace(/\bpasta sauce\b/g,'sauce').replace(/\bheart healthy\b/g,' ')
  .replace(/\b(?:family|mega|giant|large) size\b/g,' ').replace(/\b(?:original|breakfast|cereal)\b/g,' ')
  .trim().split(/\s+/).filter(Boolean).sort().join(' ');
}
