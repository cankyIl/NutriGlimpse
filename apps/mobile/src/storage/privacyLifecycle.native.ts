import PrivateInput from '../../modules/private-input';
import { Directory, Paths } from 'expo-file-system';
import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';
export async function preparePrivateSession(): Promise<void> {
  await PrivateInput.cleanupInterruptedAsync();
  const scratch = new Directory(Paths.cache, 'grocery-encrypted-exports');
  if (scratch.exists) scratch.delete();
  // Allow user screenshots; iOS app-switcher privacy remains enabled below.
  await ScreenCapture.allowScreenCaptureAsync('private-session');
  if (Platform.OS === 'ios') await ScreenCapture.enableAppSwitcherProtectionAsync(1);
}
