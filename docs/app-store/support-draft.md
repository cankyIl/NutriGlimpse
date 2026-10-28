# Support page - published October 28, 2026

https://grocery.serveforwad.com/support is live, linked from the privacy page, and saved/read back as the Apple listing Support URL and Privacy Choices URL. Publisher Viraank Gaur; contact help@serveforward.us. The owner confirms the inbox receives messages and sends replies under that address.

The canonical copy is apps/service/src/publicSupport.ts. It covers device/build information for support, product/shelf/store help, local reset, exported backups and server/provider deletion requests. It asks users not to send secrets or full medical reports. Candidate Privacy & storage links open this page and the privacy policy; the terms screen also exposes the privacy link before acceptance.

Unauthenticated GET and HEAD work. Unsupported methods return 405; unexpected request bodies return 400. Pages have a restrictive Content Security Policy, no scripts/cookies/analytics, no reflected input, and a working contact link. Headless Edge verification at 390x844 and 1280x900 found no overflow or browser errors. Screenshots and verification are kept in the private release evidence folder.

No support email was sent as part of this work. See privacy-deletion-runbook.md for the operator process behind deletion requests.
