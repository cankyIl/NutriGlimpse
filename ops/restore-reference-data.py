#!/usr/bin/env python3
"""Explicitly restore local reference downloads; never silently overwrite evidence."""
from pathlib import Path
import argparse, datetime, hashlib, json, math, os, urllib.request

ROOT = Path(__file__).resolve().parents[1]

def download(url, maximum):
    if not url.startswith('https://'):
        raise ValueError('Only HTTPS reference URLs are allowed.')
    request = urllib.request.Request(url, headers={'User-Agent': 'NutriGlimpseReferenceSetup/1.0'})
    with urllib.request.urlopen(request, timeout=45) as response:
        if not response.url.startswith('https://'):
            raise ValueError('Reference redirected outside HTTPS.')
        data = response.read(maximum + 1)
    if len(data) > maximum:
        raise ValueError('Reference exceeds download limit.')
    return data

def store_checked(root, relative, data, expected=None):
    root = root.resolve()
    target = (root / relative).resolve()
    if not target.is_relative_to(root) or target == root:
        raise ValueError('Reference must stay inside the project.')
    if expected and hashlib.sha256(data).hexdigest() != expected:
        raise ValueError('Upstream bytes changed; preserve the old evidence and review a new version.')
    if target.exists():
        if target.read_bytes() == data:
            return False
        raise ValueError('Existing reference differs; refusing to overwrite.')
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('xb') as output:
        output.write(data)
    return True

def select_cities(rows):
    if not isinstance(rows, list):
        raise ValueError('Expected a location list.')
    cities = []
    for row in rows:
        if not isinstance(row, dict) or row.get('country_code') != 'US' or row.get('target_type') != 'City':
            continue
        name, gps = row.get('canonical_name'), row.get('gps')
        if not isinstance(name, str) or not name.strip() or not isinstance(gps, list) or len(gps) != 2:
            continue
        lon, lat = gps
        if any(isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) for x in gps):
            continue
        if not -180 <= lon <= 180 or not -90 <= lat <= 90:
            continue
        cities.append({'name': name, 'latitude': lat, 'longitude': lon})
    if not cities:
        raise ValueError('No valid US city locations; source format may have changed.')
    return cities

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--guidance', action='store_true')
    parser.add_argument('--cities', action='store_true')
    args = parser.parse_args()
    if not (args.guidance or args.cities):
        parser.error('Choose --guidance and/or --cities. No default downloads.')
    if args.guidance:
        manifest = json.loads((ROOT/'data/guidance/sources/2026-10-14/manifest.json').read_text())
        for item in manifest:
            target = ROOT/item['file']
            data = target.read_bytes() if target.exists() else download(item['url'], 8_000_000)
            store_checked(ROOT, item['file'], data, item['sha256'])
            print('Verified', item['file'])
    if args.cities:
        relative = 'data/serpapi-us-cities.json'
        if (ROOT/relative).exists():
            print('Existing city reference preserved; no download performed.')
            return
        url = 'https://serpapi.com/locations.json'
        cities = select_cities(json.loads(download(url, 120_000_000)))
        data = {'sourceUrl': url, 'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'cities': cities}
        store_checked(ROOT, relative, (json.dumps(data, separators=(',', ':'))+'\n').encode())
        print('Saved', len(cities), 'US city locations locally.')

if __name__ == '__main__':
    main()
