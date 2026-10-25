const { withAppDelegate, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

module.exports = function withPrivateStorage(config) {
  config = withAppDelegate(config, mod => {
    if (mod.modResults.language !== 'swift') throw new Error('Private storage plugin requires a Swift AppDelegate.');
    const marker = '// grocery-private-storage';
    if (!mod.modResults.contents.includes(marker)) {
      const target = 'return super.application(application, didFinishLaunchingWithOptions: launchOptions)';
      if (!mod.modResults.contents.includes(target)) throw new Error('AppDelegate startup changed; review backup exclusion insertion.');
      const setup = `${marker}
    do {
      // Exclude app-managed documents (SQLite lives here) from iCloud backup.
      var folder = try FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try folder.setResourceValues(values)
    } catch {
      // Fail closed before React starts; never silently run without the exclusion.
      fatalError("Private storage backup exclusion failed")
    }
    `;
      mod.modResults.contents = mod.modResults.contents.replace(target, setup + target);
    }
    return mod;
  });
  config = withAndroidManifest(config, mod => {
    const app = mod.modResults.manifest.application[0].$;
    app['android:networkSecurityConfig'] = '@xml/grocery_network_security';
    app['android:allowBackup'] = 'false';
    app['android:fullBackupContent'] = '@xml/grocery_backup_rules';
    app['android:dataExtractionRules'] = '@xml/grocery_data_extraction_rules';
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    const directory = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory,'grocery_network_security.xml'), '<network-security-config><base-config cleartextTrafficPermitted="false"/><domain-config cleartextTrafficPermitted="true"><domain includeSubdomains="false">127.0.0.1</domain><domain includeSubdomains="false">localhost</domain></domain-config></network-security-config>');
    const exclusions = ['root', 'file', 'database', 'sharedpref', 'external', 'device_root', 'device_file', 'device_database', 'device_sharedpref'].map(domain => `<exclude domain="${domain}" path="."/>`).join('\n');
    await fs.writeFile(path.join(directory, 'grocery_backup_rules.xml'), `<full-backup-content>\n${exclusions}\n</full-backup-content>`);
    await fs.writeFile(path.join(directory, 'grocery_data_extraction_rules.xml'), `<data-extraction-rules><cloud-backup>\n${exclusions}\n</cloud-backup><device-transfer>\n${exclusions}\n</device-transfer></data-extraction-rules>`);
    return mod;
  }]);
};
