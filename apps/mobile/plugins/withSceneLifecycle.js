const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const MARKER = '// grocery-scene-lifecycle';
const LEGACY_START = /#if os\(iOS\) \|\| os\(tvOS\)\s+window = UIWindow\(frame: UIScreen\.main\.bounds\)\s+factory\.startReactNative\(\s+withModuleName: "main",\s+in: window,\s+launchOptions: launchOptions\)\s+#endif/;

function configureAppDelegate(source) {
  if (source.includes(MARKER)) {
    if (!source.includes('class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {') ||
        !source.includes('configuration.delegateClass = ExpoAppSceneDelegate.self') ||
        LEGACY_START.test(source)) {
      throw new Error('Incomplete iOS scene lifecycle migration');
    }
    return source;
  }
  const declaration = 'class AppDelegate: ExpoAppDelegate {';
  const anchor = '  // Linking API';
  if (!source.includes(declaration) || !source.includes(anchor) || !LEGACY_START.test(source)) {
    throw new Error('Unsupported Expo AppDelegate template: review scene lifecycle migration');
  }
  const sceneMethod = [
    '  ' + MARKER,
    '  // Expo preserves initial/deep links and forwards scene events to its subscribers.',
    '  public func application(',
    '    _ application: UIApplication,',
    '    configurationForConnecting connectingSceneSession: UISceneSession,',
    '    options: UIScene.ConnectionOptions',
    '  ) -> UISceneConfiguration {',
    '    let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)',
    '    configuration.delegateClass = ExpoAppSceneDelegate.self',
    '    return configuration',
    '  }',
    '',
    anchor,
  ].join('\n');
  return source
    .replace(declaration, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {')
    .replace(LEGACY_START, '    // ExpoAppSceneDelegate creates the window after private storage setup.')
    .replace(anchor, sceneMethod);
}

function configureManifest(plist) {
  const previous = plist.UIApplicationSceneManifest || {};
  return {
    ...plist,
    UIApplicationSceneManifest: {
      ...previous,
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        ...previous.UISceneConfigurations,
        UIWindowSceneSessionRoleApplication: [{
          UISceneConfigurationName: 'Default Configuration',
          UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
        }],
      },
    },
  };
}

function withSceneLifecycle(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults = configureManifest(mod.modResults);
    return mod;
  });
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') {
      throw new Error('iOS scene lifecycle configuration requires the Expo Swift AppDelegate');
    }
    mod.modResults.contents = configureAppDelegate(mod.modResults.contents);
    return mod;
  });
}
module.exports = withSceneLifecycle;
module.exports.configureAppDelegate = configureAppDelegate;
module.exports.configureManifest = configureManifest;
