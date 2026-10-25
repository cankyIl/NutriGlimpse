# SerpApi nearby-availability connection test

Prepared on October 17, 2026 at the user's request in the availability side conversation.
This is an isolated provider test, not a live app integration or a stock feed.
No app/service source, deployments, credentials, or shared project-plan sections were changed.

## Setup

Create or sign into a SerpApi account (https://serpapi.com/).
Serper.dev credentials are not interchangeable. The published free plan currently includes
250 searches/month and 50/hour; verify current limits on the account before a larger test.

From Windows PowerShell:
```powershell
ssh -t project-server "python3 /path/to/NutriGlimpse/ops/availability-serpapi/setup-key.py"
```
Paste the SerpApi key only at the hidden terminal prompt. It is saved in
/path/to/NutriGlimpse/.secrets/serpapi-availability-test.key with mode 600.
The helper does not call the provider or buy a plan.

## Live capability test (after setup)

```bash
cd /path/to/NutriGlimpse
python3 ops/availability-serpapi/probe.py \
  --product "Classico Tomato & Basil Pasta Sauce, 24 oz" \
  --address "Wegmans, 9102 Shops Way, Northborough, MA 01532" \
  --city "Northborough, Massachusetts, United States"
```

Google Search (including returned shopping ads/AI Overview) and AI Mode start concurrently.
Repeat --product for up to three alternatives. Each result prints as soon as it completes.
The optional --include-shopping also requests the dedicated Shopping response.
An AI Overview page token triggers at most one immediate follow-up, only when text is absent.
Thus the base test makes at most 3 calls/product; including Shopping makes at most 4.
No automatic retries, purchases, model calls, or disk response logs are made.
Failed paths do not suppress successful ones. Provider messages/URLs containing keys are never logged.
Queries transmit product text and the supplied address/city to SerpApi/Google; no health profiles are sent.

## Evidence and release criteria

- AI Mode and AI Overview are distinct Google features. Capture both, plus sponsored cards.
- Retain product title, branch/location, price, source URL, pickup/availability wording and timestamp.
- Preserve a sponsored marker when the provider identifies the card as sponsored. Do not boost health
  alternatives because a seller advertises.
- Do not join a chain-level product listing to an unrelated nearby branch and call it in stock.
- Reject wrong brand/variant; distinguish other package sizes and multipacks.
- An AI narrative or a store address alone is not stock confirmation.
- "Pick up today" tied to the exact product and branch can be displayed as Google-reported pickup,
  with a source and check time. Retailer-confirmed inventory remains a separate evidence level.
- Compare API results against visible Google cards before enabling the feature. Validate repeated
  runs, multiple categories, missing sections, empty results, rate limits, and timeout behavior.
- Keep the existing scan/result UI fast: any later app integration must stream per-card progress
  and not wait for the slowest availability lookup.

## Verification

```bash
python3 -B -m unittest discover -s ops/availability-serpapi -p 'test_*.py' -v
```
These are offline tests with synthetic provider fixtures, not proof of live coverage or speed.
Live verification is blocked until a SerpApi key is supplied.

## Primary provider documentation

- https://serpapi.com/google-ai-mode-api
- https://serpapi.com/inline-shopping
- https://serpapi.com/ai-overview
- https://serpapi.com/google-ai-overview-api
- https://serpapi.com/inline-shopping-results
- https://serpapi.com/pricing
