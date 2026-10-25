/** No runtime parameter, archive flag, server response or UI toggle may bypass this release gate. */
export function requirePersonalCapture(): void {
 throw Error('Product and receipt capture requires completed native privacy acceptance. No external image upload is enabled.');
}
