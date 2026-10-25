import { useLocalSearchParams } from 'expo-router';
import { getProduct } from '@grocery/core';
import { useAppState } from '../state/AppState';
import { Back, Page, Title } from '../ui/components';
import { AlternativeResults } from '../ui/AlternativeResults';

// Preserve existing links while rendering the same results used inline on product screens.
export default function Alternatives() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, store } = useAppState();
  const original = getProduct(id);
  return <Page><Back /><Title>Thoughtful swaps</Title>{original
    ? <AlternativeResults original={original} profile={profile} store={store} />
    : <Title>Choose a product first</Title>}</Page>;
}
