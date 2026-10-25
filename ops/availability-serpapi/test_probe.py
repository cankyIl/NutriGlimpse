import concurrent.futures
import importlib.util
from pathlib import Path
import threading
import unittest

spec = importlib.util.spec_from_file_location("availability_probe", Path(__file__).with_name("probe.py"))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)

class ProbeTests(unittest.TestCase):
    def test_exact_query_and_city(self):
        params = probe.build_params("Classico Tomato & Basil, 24 oz", "9102 Shops Way", "Northborough, Massachusetts, United States", "google")
        self.assertEqual(params["q"], "Find Classico Tomato & Basil, 24 oz near 9102 Shops Way")
        self.assertEqual(params["gl"], "us")
        self.assertNotIn("api_key", params)

    def test_key_and_provider_tokens_never_reach_output(self):
        clean = probe.sanitize({"api_key":"secret", "a":["https://serpapi.com/x?api_key=secret", {"page_token":"private", "title":"example"}]}, "secret")
        self.assertNotIn("secret", str(clean))
        self.assertNotIn("private", str(clean))
        self.assertEqual(clean["a"][1]["title"], "example")

    def test_preserves_sponsored_signals_without_inventing_stock(self):
        row = {"title":"Classico Tomato & Basil 24 oz", "source":"Shaw's", "price":"$3.99", "extensions":["Shrewsbury", "Pick up today"]}
        result = probe.probe_one("Classico", "store address", "city", "google", "key",
            lambda *a, **kw: {"search_metadata":{"status":"Success"}, "shopping_results":[row]})
        self.assertEqual(result["sections"]["shopping_results"][0], row)
        self.assertFalse(result["inventory_verified"])

    def test_overview_token_followed_once_and_error_isolated(self):
        calls = []
        def fake(params, key, **kwargs):
            calls.append(params)
            if len(calls) == 1:
                return {"ai_overview":{"page_token":"token"}, "shopping_results":[{"source":"Target"}]}
            return {"error":"http_error", "http_status":429}
        result = probe.probe_one("product", "address", "city", "google", "key", fake)
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[1]["engine"], "google_ai_overview")
        self.assertEqual(result["overview_followup"]["http_status"], 429)
        self.assertEqual(result["sections"]["shopping_results"][0]["source"], "Target")
        self.assertNotIn("token", str(result))

    def test_three_products_and_both_engines_start_concurrently(self):
        barrier = threading.Barrier(6)
        def fake(params, key, **kwargs):
            barrier.wait(timeout=3)
            if params["engine"] == "google_ai_mode":
                return {"error":"timeout"}
            return {"search_metadata":{"status":"Success"}, "shopping_results":[]}
        rows = list(probe.run_batch(["cereal", "sauce", "spread"], "address", "city",
                    ["google", "google_ai_mode"], "key", fake))
        self.assertEqual(len(rows), 6)
        self.assertEqual(sum(r["status"] == "Success" for r in rows), 3)
        self.assertEqual(sum(r["status"] == "error" for r in rows), 3)

if __name__ == "__main__":
    unittest.main()
