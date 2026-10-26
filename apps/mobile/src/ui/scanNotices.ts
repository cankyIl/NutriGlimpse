// General limitations are accepted at entry, not repeated on each food card.
export const SCAN_LIMITATIONS_NOTICE = 'Product identification, nutrition values and ratings may be AI estimates and may be incomplete or wrong. Unknown nutrients are not zero; amounts may use different portions. Confirm nutrition, ingredients, allergens and dietary claims on the package before purchasing.';
export const STORE_LIMITATIONS_NOTICE = 'Store names, aisle numbers and sections are suggestions returned by the model and may be inaccurate or out of date. They do not guarantee stock. Check store signage when needed.';
const generalNotices = new Set([
 'Nutrition and rating are AI estimates, not verified against a cited product label. Check the package.',
 'A matching nutrition source was not confirmed; check the package.',
 'Some nutrients are unknown; missing values are not zero.',
 'Nutrition quantity is not supplied. Check the source or label before comparing amounts.',
]);
export function isProductSpecificNotice(text:string):boolean {
 return !generalNotices.has(text) && !/^Store availability|^Aisle not found/.test(text);
}
