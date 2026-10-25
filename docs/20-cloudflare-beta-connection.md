# Cloudflare beta connection — October 13, 2026

Approved hostname: https://grocery.serveforwad.com

## User dashboard action
Use the EXISTING portfolio-dashboard tunnel. Do not create another tunnel or replace the portfolio route.
1. Cloudflare dashboard → Networking → Tunnels → portfolio-dashboard.
2. Routes → Add route → Published application (older UI: Published application routes → Add).
3. Subdomain grocery; domain serveforwad.com; path blank.
4. Service type HTTP; URL 127.0.0.1:3002.
5. Save. Dashboard creates the tunnel DNS record automatically; no new A record or router port forwarding is needed.
6. Open https://grocery.serveforwad.com/health. Before supplying an app tester key, HTTP401 with TESTER_ACCESS_REQUIRED is expected. A 502 means the tunnel cannot reach this service; a DNS error means the route is not yet published.
The address is a backend, not an app download or browser landing page.

Official instructions: https://developers.cloudflare.com/tunnel/get-started/
https://developers.cloudflare.com/tunnel/concepts/routing/

## Server implementation
Dedicated congress-beta-backend user service, listening only on 127.0.0.1:3002. Existing local backend3001 and portfolio are preserved. All routes require a high-entropy bearer tester key, including health. Four individual invitation keys were generated privately for the planned three iPhone testers and possible Android tester. Keys were not displayed, committed or embedded in builds. Service reads only SHA256 digests. Cleartext invitations are in .tools/beta/tester-invitations.json, mode0600, for the owner to distribute privately when onboarding is ready. Never paste keys into chat or URL parameters.
Remove a tester hash and restart congress-beta-backend to revoke that tester; no automatic expiry is implemented yet. New keys require explicit operator rotation. Do not share one key among testers.
Public beta service currently serves cached public food data only. Previously validated cached fictional examples are now wired to this entry point with paid generation disabled; no paid AI calls are triggered. Personal-data upload routes remain disabled. No request access log in app service; Cloudflare may process request metadata under the account settings.

## Verification and limits
157 application tests plus 3 tooling checks passed for the access checkpoint. Local endpoint rejected unauthenticated access401 and accepted authenticated coverage200, nine USDA records. Existing portfolio returned200 with curl; a Python urllib probe returned403 (retained in evidence, not represented as a service outage). All existing project/portfolio services remained active.
Evidence: artifacts/remote/beta-access-check.log, beta-access-verification.json.
Dashboard route/DNS creation confirmed by user. Public HTTPS verified with authenticated HTTP 200 and unauthenticated HTTP 401; physical cellular verification remains pending.
Mobile real-food catalog and secure tester key entry are now implemented, with encrypted bounded public-food saves, source dates, missing values and separate real facts. Native build/acceptance validation is in progress; do not treat source implementation as physical-phone verification.


Completed native and network evidence supersedes the in-progress notes above: see21-beta-catalog-network-checkpoint.md.
