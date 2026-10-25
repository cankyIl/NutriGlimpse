# Cheerios photos, nearby stores and duplicate alternatives

October 25, 2026. Backend deployed; iPhone build 25 preparing locally. Build 23 remains the released version until Apple verification completes.

## Changes

- A usable reference photo no longer disappears solely because the nutrition citation is absent. Image evidence remains separate from nutrient verification. Title-only photo lookup can recognize an explicitly named brand, while preserving market, variant, host and provenance checks. The phone falls back to the existing product-photo lookup if a returned image fails.
- Cosmetic title differences, word order and package weights no longer produce repeated alternative cards. Brand, flavor and relevant variant differences remain distinct. A qualified duplicate can contribute missing retailer information without replacing Gemini's nutrients, reasons or rating.
- With no selected store, a fresh, sufficiently accurate location fix can supply approximate coordinates to the backend. The backend uses the existing Massachusetts store directory to describe nearby public towns/chains; exact coordinates and the home address are not sent to either model. A selected store takes priority. Missing, stale or unsupported location remains unknown.
- The updated phone sharing notice describes this location use. Existing consent gates still control sharing with providers. The approved main prompt text is unchanged; only its location context and the separate bounded retailer follow-up support this case.

## Verification

The exact retained Gemini/GPT answers from the reported Honey Nut Cheerios scan were replayed through the production HTTP adapter and serialized phone response. No new model request was made. The original camera photo and actual home coordinates were not retained, so this is a response-pipeline regression, not a new recognition or GPS benchmark.

| Case | Result |
| --- | --- |
| Old client without location | One distinct Original Cheerios alternative with a usable reference photo; retailer remains unknown |
| Updated client with a synthetic public-town location | One distinct alternative with photo and a nearby Walmart chain listing; no invented aisle or stock claim |
| GPT duplicate | Adds missing retailer information; does not replace Gemini nutrition or take another slot |
| Oats suggestion with missing nutrients | Still rejected by the existing comparison checks |
| Reference image fails on phone | One independent photo fallback; a failed fallback ends at No photo without a retry loop |

Gemini's original and alternative nutrient values remain unchanged in the replay. Photos may depict another package size and do not verify those estimates. Two independent photo URLs returned valid image content and were visually inspected for the Original Cheerios variant.

Full checks pass: **752 core/service tests**, nine tooling checks, ten report adapters, 11 news collector tests, needs/news UI, typechecks and lint. **74 photo UI scenarios** pass with timing off and on; **ten shelf-grid UI scenarios** and iOS JavaScript export pass. These mocked/native-boundary tests do not establish physical-camera acceptance.

The beta backend restarted at 19:52 UTC. Public health and title-only photo lookup passed. Other backend, preview and portfolio processes remained unchanged. Clinical/personal-upload gates remain unchanged.

## Release and limits

All 344 frozen build-24 source files matched before transfer and again on the Mac. Build 24 compiled and passed signing checks, but is not uploaded because the owner requested the additional automatic-store fix. Build 25 is the combined release. Existing news, report/lipid, artwork, shelf models and streaming changes are retained. The Expo cloud build allowance is exhausted until November 1, 2026; the Mac build proceeds independently of that cloud allowance. No plan was purchased.

Native compilation, signed-IPA inspection, TestFlight submission/processing and physical acceptance are pending at this checkpoint. Remaining acceptance: test current-location permission/notice, no selected store, a selected store override, failed photos, repeated scans, and shelf/news/report regressions on the trial phones. This recorded scan supports only one distinct qualifying alternative; it does not justify displaying three by duplicating products or accepting missing nutrition.

Private replay/deployment evidence: `artifacts/cheerios-home-fixes-2026-10-25/`. Private release evidence: `artifacts/nutriglimpse-build24-2026-10-25/`. Raw answers and operator/access details remain outside public source.

## Automatic nearest-store selection requested during release

The owner reported Wegmans displayed at 0.0 miles with the status No clear in-store match, while automatic location was enabled. That status means a fresh location passed the original accuracy gate but failed the strict building/point match. The former interior margin could reject shoppers near a store wall. The owner explicitly requested choosing the store automatically with a distance threshold.

Build 25 therefore selects the **nearest mapped grocery store within 100 metres** of the location. Distance is to the mapped footprint when available (zero inside), or the mapped point otherwise; nearest point breaks equal footprint distances. The screen retains Likely store and manual correction. No prior 150-metre competing-store veto or interior-edge margin remains. A location older than 60 seconds, more than 10 seconds in the future, missing/invalid accuracy, accuracy worse than 100 metres, or a directory older than 30 days is still unsuitable for automatic selection. Outside the 100-metre radius, no store is assumed. Selection is a location estimate, not an inventory claim.

Regression checks cover the 99/101-metre boundary, a closer neighboring shop, inside and outside building edges, a large store, stale fixes, unusable accuracy and distant stores. Simulated fixes using the existing public Wegmans map validate the policy, but no exact owner GPS fix was captured. Phone acceptance remains pending. Nutrition checks and the approved main prompt are unchanged.
