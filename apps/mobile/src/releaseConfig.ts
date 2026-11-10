// Expo replaces this literal environment lookup while creating the app bundle.
// Unset and production builds never opt into beta response capture.
export const betaRelease = process.env.EXPO_PUBLIC_BUILD_STAGE === 'beta0';
export const supportEmail = 'help@serveforward.us';
export const scanDiagnosticNotice = betaRelease
 ? 'During beta testing, returned answers, source links and processing decisions are encrypted on our server for up to seven days (at most 200 scans and 40 MB). Answers may repeat health details you share. Continuing enables this diagnostic capture.'
 : 'Saved scan-answer diagnostics are disabled for this release. Service providers may still retain information under their own policies.';

export const supportUrl = 'https://grocery.serveforwad.com/support';
export const privacyPolicyUrl = 'https://grocery.serveforwad.com/privacy';
