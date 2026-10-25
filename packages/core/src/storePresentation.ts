import type {MappedStore} from './storeDetection.ts';

// The OSM building includes several neighboring street numbers. Use the exact
// retailer-confirmed branch address; preserve the raw directory for provenance.
export const reviewedStoreAddresses = [{
  id: 'way/137270170', name: 'Wegmans',
  original: '9102;9106;9108;9110;9112;9113;9114 Shops Way Northborough 01532',
  address: '9102 Shops Way, Northborough, MA 01532',
  sourceUrl: 'https://www.wegmans.com/stores/northborough-ma', checkedOn: '2026-10-15',
}] as const;
export function storeDisplayAddress(store: Pick<MappedStore, 'id' | 'name' | 'address'>): string {
  const reviewed = reviewedStoreAddresses.find(item => item.id === store.id && item.name === store.name &&
    (item.original === store.address || item.address === store.address || store.address === '9102 Shops Way Northborough 01532'));
  return reviewed?.address ?? store.address;
}
