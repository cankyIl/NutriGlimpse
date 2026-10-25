import { requireNativeModule } from 'expo';
import type { PrivateInputApi } from './PrivateInput.types';
export default requireNativeModule<PrivateInputApi>('PrivateInput');
