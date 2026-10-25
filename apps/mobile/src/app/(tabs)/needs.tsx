import { router } from 'expo-router';
import { useAppState } from '../../state/AppState';
import { Page, Title, Body, Button } from '../../ui/components';
import { ProfileEditor } from '../../ui/ProfileEditor';
export default function Needs() {
  const state = useAppState();
  return <Page><Title eyebrow="MY NEEDS">Good choices start with you.</Title><Body muted>Changes update local comparisons and future product-photo guidance if you choose to share your health details. Saved sample assessments retain their original context.</Body><ProfileEditor key={state.profile.revision} initial={state.profile} onSave={async profile => { const saved = await state.updateProfile(profile); if (saved) router.replace('/'); return saved; }} /><Button secondary label="Add a lipid report" onPress={() => router.push('/report-import')} /><Button secondary label="Privacy & storage" onPress={() => router.push('/privacy')} /></Page>;
}
