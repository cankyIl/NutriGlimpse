import {PhotoLifecycle} from '../state/PhotoLifecycle';
import { REAL_REPORT_CONSENT_VERSION } from '@grocery/core';
import { BetaAgreement } from '../ui/BetaAgreement';
import {ShelfScanLifecycle} from '../state/ShelfScanState';
import {StoreProvider} from '../state/StoreContext';
import { Stack, Redirect, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppStateProvider, useAppState } from '../state/AppState';
import { SampleNotice } from '../ui/components';
import { colors } from '../ui/theme';

function SetupGate() {
  const state = useAppState();
  const path = usePathname();
  return !state.onboardingComplete && path !== '/onboarding' && path !== '/shelf-benchmark' && path !== '/beta-terms' && path !== '/privacy' ? <Redirect href="/onboarding" /> : null;
}
function ShoppingLayout(){
 const {onboardingComplete,betaConsent}=useAppState();
 if (betaConsent?.version !== REAL_REPORT_CONSENT_VERSION) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}><StatusBar style="dark" /><BetaAgreement /></SafeAreaView>;
 return <StoreProvider key={onboardingComplete?'shopping':'setup'}><SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}><StatusBar style="dark" /><SampleNotice /><ShelfScanLifecycle /><PhotoLifecycle /><SetupGate /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'none' }} /></SafeAreaView></StoreProvider>;
}
export default function RootLayout(){return <SafeAreaProvider><AppStateProvider><ShoppingLayout/></AppStateProvider></SafeAreaProvider>;}


