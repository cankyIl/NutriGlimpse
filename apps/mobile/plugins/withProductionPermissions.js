const { withInfoPlist } = require('expo/config-plugins');

// Local discovery belongs to the development launcher, not the public release.
module.exports = function withProductionPermissions(config) {
  if (process.env.EXPO_PUBLIC_BUILD_STAGE !== 'production') return config;
  return withInfoPlist(config, mod => {
    delete mod.modResults.NSLocalNetworkUsageDescription;
    delete mod.modResults.NSBonjourServices;
    return mod;
  });
};
