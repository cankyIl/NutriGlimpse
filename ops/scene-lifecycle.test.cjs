const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { configureAppDelegate, configureManifest } = require('../apps/mobile/plugins/withSceneLifecycle');
const original = fs.readFileSync(path.join(__dirname, 'fixtures/ios-app-delegate-sdk57.swift'), 'utf8');

test('scene starts React after fail-closed storage setup, preserving links', () => {
  const result = configureAppDelegate(original);
  assert.match(result, /AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider/);
  assert.match(result, /configuration\.delegateClass = ExpoAppSceneDelegate\.self/);
  assert.doesNotMatch(result, /UIWindow\(frame: UIScreen\.main\.bounds\)/);
  assert.doesNotMatch(result, /factory\.startReactNative\(/);
  const privacyStart = original.indexOf('    // grocery-private-storage');
  const privacyEnd = original.indexOf('  // Linking API');
  assert.ok(result.includes(original.slice(privacyStart, privacyEnd)));
  assert.ok(result.endsWith(original.slice(privacyEnd)));
});
test('reapplying plugin is idempotent', () => {
  const once = configureAppDelegate(original);
  assert.equal(configureAppDelegate(once), once);
});
test('unknown templates and partial migrations stop generation', () => {
  assert.throws(() => configureAppDelegate(original.replace('  // Linking API', '// changed')), /Unsupported/);
  assert.throws(() => configureAppDelegate(original + '\n// grocery-scene-lifecycle'), /Incomplete/);
});
test('manifest preserves other roles without enabling extra app windows', () => {
  const originalPlist = { CFBundleName: 'Health', UIApplicationSceneManifest: {
    CustomKey: true, UIApplicationSupportsMultipleScenes: true,
    UISceneConfigurations: { UIWindowSceneSessionRoleExternalDisplay: [{ UISceneConfigurationName: 'External' }] },
  }};
  const before = JSON.stringify(originalPlist);
  const result = configureManifest(originalPlist);
  assert.equal(result.CFBundleName, 'Health');
  assert.equal(result.UIApplicationSceneManifest.CustomKey, true);
  assert.equal(result.UIApplicationSceneManifest.UIApplicationSupportsMultipleScenes, false);
  assert.deepEqual(result.UIApplicationSceneManifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication, [
    { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' },
  ]);
  assert.deepEqual(result.UIApplicationSceneManifest.UISceneConfigurations.UIWindowSceneSessionRoleExternalDisplay,
    originalPlist.UIApplicationSceneManifest.UISceneConfigurations.UIWindowSceneSessionRoleExternalDisplay);
  assert.equal(JSON.stringify(originalPlist), before);
  assert.deepEqual(configureManifest(result), result);
});
