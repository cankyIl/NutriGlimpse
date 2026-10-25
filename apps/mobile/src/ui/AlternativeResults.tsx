import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { products, sampleAlternatives, compareAtEqualWeight, type Product, type Profile } from '@grocery/core';
import { Badge, Body, Button, Card, FoodArt, Heading, Icon, s } from './components';
import { colors as c } from './theme';

export function AlternativeResults({ original, profile, store }: { original: Product; profile: Profile; store: string }) {
  const alternatives = sampleAlternatives(original, products, profile, store).slice(0, 3);
  const [width, setWidth] = useState(300);
  const multiple = alternatives.length > 1;
  const cardWidth = multiple ? Math.min(310, width * 0.86) : width;
  return <View style={{ gap: 14 }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Icon name="repeat" color={c.green} /><Heading>Alternatives for you</Heading></View>
    <Text style={s.small}>{store} first · illustrative sample suggestions{multiple ? ` · ${alternatives.length} options, swipe to compare` : ''}</Text>
    {alternatives.length ? <ScrollView horizontal showsHorizontalScrollIndicator={multiple} accessibilityLabel="Product alternatives, up to three options" contentContainerStyle={{ gap: 12, paddingBottom: multiple ? 12 : 0 }} snapToInterval={cardWidth + 12} decelerationRate="fast">{alternatives.map((product, index) => <Card key={product.id} style={{ width: cardWidth, backgroundColor: '#E4FAEE', borderColor: '#86CFAB', padding: 16 }}>
      {multiple && <Text style={[s.small, { fontSize: 12 }]}>{index + 1} of {alternatives.length}</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.name}`} onPress={() => router.push({ pathname: '/result', params: { id: product.id } })} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <FoodArt kind={product.illustration} small />
        <View style={{ flex: 1, gap: 8 }}><Badge label="Good fit" /><Text style={[s.rowTitle, { fontSize: 18 }]}>{product.name}</Text><Text style={s.small}>Sample listing at {product.retailers.includes(store) ? store : product.retailers[0]}</Text></View>
        <Icon name="chevron-right" size={18} color={c.green} />
      </Pressable>
      <EqualWeightFacts original={original} candidate={product} />
      <Text style={s.small}>{product.id === 'sample-oats' ? 'Plain oats need preparation and have a different texture. ' : ''}Sample retailer evidence is invented; local availability is not verified.</Text>
    </Card>)}</ScrollView> : <Card style={{ backgroundColor: c.amberBg }}><Heading>No eligible sample alternative</Heading><Body>No sample meets your complete needs with enough evidence to recommend a swap. Your restrictions stay in place.</Body><Button secondary label="Adjust store or search area" onPress={() => router.push('/stores')} /></Card>}
  </View>;
}

const nutrientLabels = { calories: 'Energy (kcal)', fiber: 'Fiber (g)', saturatedFat: 'Saturated fat (g)', sodium: 'Sodium (mg)', sugars: 'Total sugars (g)' };
function EqualWeightFacts({ original, candidate }: { original: Product; candidate: Product }) {
  const comparison = compareAtEqualWeight(original, candidate);
  if (!comparison) return <Text style={s.small}>Comparable weight is unavailable.</Text>;
  const format = (value: number | null) => value === null ? 'Unknown' : value > 0 && value < 0.01 ? '<0.01' : String(Number(value.toFixed(2)));
  return <View style={{ gap: 6 }}><Text style={[s.small, { fontWeight: '700' }]}>At the same {comparison.grams} g · original → alternative</Text>
    {comparison.nutrients.map(n => <Text key={n.key} style={s.small}>{nutrientLabels[n.key]}: {format(n.original)} → {format(n.candidate)}</Text>)}
    <Text style={s.small}>Equal-weight label comparison, not a suggested portion. The sample fit label uses the package’s own 1× serving. Review all differences, not just saturated fat.</Text>
  </View>;
}
