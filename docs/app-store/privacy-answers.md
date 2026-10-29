# Proposed App Privacy answers - owner review required

These answers describe the production candidate plus partner processing, not merely records written by our own server. They are prepared in source; the App Store Connect questionnaire has not been published. Optional health sharing is still collection when the chosen feature sends it to a provider that retains it. We cannot claim that retained model prompts/images have been anonymized.

App Store Connect: NutriGlimpse -> App Privacy -> Get Started/Edit. Answer **Yes, data is collected from this app**, including collection by partners. Use https://grocery.serveforwad.com/privacy as the policy and https://grocery.serveforwad.com/support for privacy choices. Review and publish the label only after the final implementation and owner settings match this worksheet.

For each row below: **linked to the user = Yes (conservative)**, **used for tracking = No**. No advertising, marketing, third-party advertising, analytics or data-broker purpose is proposed. Confirm those choices cover the actual provider/infrastructure account configuration.

| Apple data type | Why included | Purposes |
|---|---|---|
| Health | Optional concerns, measurements and confirmed lipid values shared for scans/report analysis | App functionality; product personalization |
| Sensitive Info | Optional pregnancy context | App functionality; product personalization |
| Photos or Videos | Product photos and shelf grids sent to providers | App functionality |
| Coarse Location | Rounded coordinates, town and nearby-store context | App functionality; product personalization |
| Precise Location | Conservative declaration: choosing a particular public store can reveal the exact shopping location even though GPS coordinates stay out of model prompts | App functionality; product personalization |
| Other User Content | Dietary/food preferences and optional user-entered context | App functionality; product personalization |
| Other Data Types | Shared age/gender and context not better covered above | App functionality; product personalization |
| Search History | Food/product/retailer queries and corresponding provider-retained requests | App functionality |
| Customer Support | Information voluntarily sent to the support inbox | App functionality |
| Email Address | Sender address on support/deletion correspondence | App functionality |

All ten types are also declared in the candidate's native manifest. Support correspondence is conservatively included rather than relying on Apple's optional-disclosure exception. First-party source contains no advertising/tracking SDK. No consumer account or advertising identifier is introduced. Do not turn partner data into a No Data Collected claim because the phone does not require login.

## Confirm before publishing

- Already confirmed: Google and OpenAI logging on; optional training/product-improvement sharing off. Do not ask the owner to re-confirm the same yes/no question.
- Confirmed October 28: Google AI Studio project logs expire after 7 days. A separate dataset exists and contains only fictional/public test data; the owner chose to delete it before public launch. Verify deletion before launch. This is separate from service/grounding/security retention; no dashboard contents or credentials were inspected.
- Needed only if configured: any nondefault OpenAI retention/storage arrangement, or infrastructure request-body/IP-log export. Standard service security retention remains disclosed; store:false is not Zero Data Retention.
- A deployment check must establish production journal disablement and the retirement of old beta records; source alone is not deployment evidence.
- Owner reviews the completed answers and contact/policy text. Exact backend-only secrets and private review phone remain outside source and the public listing.

This worksheet does not certify medical or legal compliance. The app gives general food guidance with optional health context; Apple may ask about the Individual-account scope under its review rules.

Sources: https://developer.apple.com/app-store/app-privacy-details/ and https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/.
