import { z } from 'zod';
export const coordinatesSchema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict();
export type Coordinates = z.infer<typeof coordinatesSchema>;
export interface Branch { id: string; retailer: string; name: string; address: string; coordinates: Coordinates; sourceUrl: string; verifiedAt: string }
export function straightLineMiles(first: Coordinates, second: Coordinates): number {
  const a = coordinatesSchema.parse(first); const b = coordinatesSchema.parse(second); const rad = Math.PI / 180;
  const h = Math.sin((b.latitude-a.latitude)*rad/2)**2 + Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin((b.longitude-a.longitude)*rad/2)**2;
  return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function nearbyBranches(origin: Coordinates, branches: Branch[], retailers: string[], radius: number) {
  if (!Number.isFinite(radius) || radius < 1 || radius > 100) throw new Error('Radius must be 1–100 miles.');
  return branches.filter(branch => retailers.includes(branch.retailer) && branch.address && /^https:\/\//.test(branch.sourceUrl) && Number.isFinite(Date.parse(branch.verifiedAt)))
    .map(branch => ({ ...branch, distanceMiles: straightLineMiles(origin, branch.coordinates) })).filter(branch => branch.distanceMiles <= radius)
    .sort((a,b) => a.distanceMiles-b.distanceMiles || a.id.localeCompare(b.id));
}
export function directionsUrl(destination: Coordinates) { const point = coordinatesSchema.parse(destination); return `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`; }
