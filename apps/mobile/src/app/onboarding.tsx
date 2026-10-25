import { Redirect, router } from 'expo-router';
import { useAppState } from '../state/AppState';
import { Page, Title, Body, Button } from '../ui/components';
import { ProfileEditor } from '../ui/ProfileEditor';
export default function Onboarding() {
  const state = useAppState();
  // Saving remounts the shopping navigator. Redirect only from committed state,
  // including when this screen remounts after that successful save.
  if (state.onboardingComplete) return <Redirect href="/" />;
  return <Page><Title eyebrow="WELCOME · BETA 0">NutriGlimpse</Title><Body>Know your food. Understand your choices.</Body><Body>No account needed. Set up your local profile to personalize the available food comparisons. A lipid report is optional and can be added at any time. Food news uses selected health concerns and dietary interests through our backend; choose General in the news section to turn this off. Sample product and receipt demonstrations remain labeled. After setup, we will ask to use location while the app is open to find your likely grocery store. You can decline and choose a store manually.</Body><Button secondary label="Test the shelf camera" icon="camera" onPress={() => router.push('/shelf-benchmark')} /><ProfileEditor initial={{ ...state.profile, primary: 'noConcern', conditions: [], pregnancy: 'unspecified' }} onboarding onSave={state.updateProfile} /></Page>;
}
