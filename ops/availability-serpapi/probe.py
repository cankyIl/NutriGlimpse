#!/usr/bin/env python3
"""Bounded SerpApi capability probe, independent of the running grocery service.
No calls until explicitly run with a saved SerpApi key. No response files are written.
This preserves evidence for review; it does not assert branch inventory.
"""
import argparse
import concurrent.futures
import json
import os
from pathlib import Path
import socket
import stat
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path("/path/to/NutriGlimpse")
KEY_PATH = ROOT / ".secrets" / "serpapi-availability-test.key"
SECTIONS = (
    "shopping_results", "inline_shopping_results", "ads", "local_ads",
    "local_results", "local_map", "organic_results", "ai_overview",
    "text_blocks", "references", "inline_products", "reconstructed_markdown",
)
PRIVATE_FIELDS = {"api_key", "page_token", "subsequent_request_token"}

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def sanitize(value, key):
    if isinstance(value, dict):
        return {k: sanitize(v, key) for k, v in value.items() if k not in PRIVATE_FIELDS}
    if isinstance(value, list):
        return [sanitize(v, key) for v in value]
    if isinstance(value, str):
        return value.replace(key, "[REDACTED]") if key else value
    return value

def build_params(product, address, city, engine):
    return {
        "engine": engine,
        "q": "Find " + product + " near " + address,
        "location": city,
        "gl": "us",
        "hl": "en",
        "output": "json",
    }

def request(params, key, timeout=45):
    # Secret is sent only to SerpApi's documented HTTPS endpoint, never logged.
    url = "https://serpapi.com/search.json?" + urllib.parse.urlencode(
        {**params, "api_key": key})
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.build_opener(NoRedirect()).open(req, timeout=timeout) as response:
            body = response.read(8_000_001)
        if len(body) > 8_000_000:
            return {"error": "response_too_large"}
        data = json.loads(body)
        return data if isinstance(data, dict) else {"error": "invalid_response_shape"}
    except urllib.error.HTTPError as error:
        return {"error": "http_error", "http_status": error.code}
    except (TimeoutError, socket.timeout):
        return {"error": "timeout"}
    except Exception as error:
        # Exception messages can contain credential-bearing URLs.
        return {"error": "request_failed", "error_type": type(error).__name__}

def probe_one(product, address, city, engine, key, requester=request):
    started = time.monotonic()
    data = requester(build_params(product, address, city, engine), key)
    overview_followup = None
    overview = data.get("ai_overview")
    if engine == "google" and isinstance(overview, dict):
        token = overview.get("page_token")
        if isinstance(token, str) and token and not overview.get("text_blocks"):
            follow = requester({"engine": "google_ai_overview", "page_token": token,
                                "output": "json"}, key, timeout=30)
            overview_followup = {
                "status": "error" if follow.get("error") else
                    follow.get("search_metadata", {}).get("status", "unknown"),
                "sections": {k: v for k, v in follow.items() if k in SECTIONS},
                "http_status": follow.get("http_status"),
            }
    result = {
        "product": product,
        "engine": engine,
        "elapsed_ms": round((time.monotonic()-started)*1000),
        "status": "error" if data.get("error") else
            data.get("search_metadata", {}).get("status", "unknown"),
        "response_keys": list(data),
        "sections": {k: v for k, v in data.items() if k in SECTIONS},
        "overview_followup": overview_followup,
        "http_status": data.get("http_status"),
        "error_type": data.get("error_type"),
        "inventory_verified": False,
    }
    return sanitize(result, key)

def run_batch(products, address, city, engines, key, requester=request):
    jobs = [(p, e) for p in products for e in engines]
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(6, len(jobs))) as pool:
        pending = [pool.submit(probe_one, p, address, city, e, key, requester)
                   for p, e in jobs]
        for future in concurrent.futures.as_completed(pending):
            yield future.result()

def read_key():
    if KEY_PATH.is_symlink():
        raise SystemExit("Refusing a symlinked key file.")
    if not KEY_PATH.exists():
        raise SystemExit("SerpApi key missing. Run setup-key.py interactively first.")
    info = KEY_PATH.stat()
    if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600:
        raise SystemExit("The key must be owned by the current user with mode 600.")
    key = KEY_PATH.read_text().strip()
    if not key or any(c.isspace() for c in key):
        raise SystemExit("The SerpApi key file is empty or malformed.")
    return key

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--product", action="append", required=True,
                        help="Exact brand, variant and size; repeat for up to 3 products.")
    parser.add_argument("--address", required=True,
                        help="User-approved search address; selected store takes priority.")
    parser.add_argument("--city", required=True,
                        help="Provider location, e.g. Shrewsbury, Massachusetts, United States")
    parser.add_argument("--include-shopping", action="store_true",
                        help="Also test dedicated Shopping sponsored results (one extra call/product).")
    args = parser.parse_args()
    if not 1 <= len(args.product) <= 3:
        parser.error("Provide 1 to 3 products.")
    if any(not p.strip() or len(p) > 250 for p in args.product):
        parser.error("Each product must be nonempty and at most 250 characters.")
    if not args.address.strip() or not args.city.strip():
        parser.error("Address and city must be nonempty.")
    if socket.gethostname().split(".")[0] != "project-server":
        raise SystemExit("Run on project-server.")
    key = read_key()
    engines = ["google", "google_ai_mode"]
    if args.include_shopping:
        engines.append("google_shopping")
    for result in run_batch(args.product, args.address, args.city, engines, key):
        print(json.dumps(result), flush=True)

if __name__ == "__main__":
    main()
