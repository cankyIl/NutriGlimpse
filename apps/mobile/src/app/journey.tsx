import { Redirect, useLocalSearchParams } from 'expo-router';
export default function Journey() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  return <Redirect href={mode === 'report' ? '/report' : '/receipt'} />;
}
