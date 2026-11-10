const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
test('linked location SDK retains required motion purpose without enabling activity or background collection', () => {
  const app = require('../apps/mobile/app.json').expo;
  const options = app.plugins.find(p => Array.isArray(p) && p[0] === 'expo-location')[1];
  assert.equal(typeof options.motionUsagePermission, 'string');
  assert.match(options.motionUsagePermission, /does not request or use motion or fitness data/);
  assert.equal(options.isAndroidMotionActivityEnabled, false);
  assert.equal(options.isIosBackgroundLocationEnabled, false);
  assert.equal(options.locationAlwaysPermission, false);
  assert.equal(options.locationAlwaysAndWhenInUsePermission, false);
  const inspect = dir => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) inspect(file);
      else if (/\.(?:ts|tsx|swift)$/.test(file)) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /requestMotionPermissionsAsync|watchMotionActivityAsync|CMMotionActivityManager|CMPedometer/, file);
    }
  };
  inspect(path.join(root, 'apps/mobile/src'));
  inspect(path.join(root, 'apps/mobile/modules'));
});
