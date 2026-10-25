import { useState } from 'react';
import { Linking, Text, View, StyleSheet } from 'react-native';
import { nutrientUnits, shelfRankingSources, type rankShelfFoods } from '@grocery/core';
import { Body, Button, Card, Heading, s } from './components';
import { colors } from './theme';

type Ranking = ReturnType<typeof rankShelfFoods>;
const number = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);
function FoodRow({ item, priorities }: { item: Ranking['ranked'][number]; priorities: Ranking['priorities'] }) {
  const [details, setDetails] = useState(false);
  return <Card>
    <View style={styles.top}><Text style={styles.group}>GROUP {item.tier}</Text><Text style={s.small}>Confirmed product</Text></View>
    <Heading>{item.food.name}</Heading><Body muted>{item.food.brand || 'Brand not reported'}</Body>
    <View style={styles.facts}>{priorities.map(priority => <View key={priority.metric} style={styles.fact}>
      <Text style={s.small}>{priority.label}</Text><Text style={styles.amount}>{item.food.nutrients[priority.metric] === null ? 'Unknown' : number(item.food.nutrients[priority.metric]!)} {nutrientUnits[priority.metric]}</Text>
    </View>)}</View>
    <Text style={s.small}>Compared per 100 g, not per serving. No absolute health rating.</Text>
    <Button secondary label={details ? 'Hide explanation' : 'Why it appears here'} onPress={() => setDetails(!details)} />
    {details && <><Body>{item.reasons.join(' ')}</Body>
      {item.tradeoffs.map((tradeoff, index) => <Body muted key={index}>{number(tradeoff.difference)} {tradeoff.unit} {tradeoff.metric === 'fiberG' ? 'less' : 'more'} {tradeoff.label.toLowerCase()} than {tradeoff.otherFoodName}.</Body>)}
      <Text selectable style={s.small}>Ingredients: {item.food.ingredients || 'Not reported'}{'\n'}Source: {item.food.provider === 'off' ? 'Open Food Facts' : 'USDA FoodData Central'} · {item.food.license}{'\n'}{item.food.sourceUrl}{'\n'}Source date: {item.food.sourceDate || 'Unknown'} · Retrieved {item.food.retrievedAt.slice(0, 10)}{'\n'}Barcode: {item.food.barcode || 'Unknown'}</Text>
    </>}
  </Card>;
}
export function ShelfRankings({ ranking, confirmedCount }: { ranking: Ranking; confirmedCount: number }) {
  const [showExcluded, setShowExcluded] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [linkError, setLinkError] = useState('');
  return <View style={styles.stack}>
    <Heading>Personalized nutrient comparison</Heading>
    <Body muted>Up to ten confirmed products from this scan. Groups compare the selected nutrients. An improvement requires being no worse on every selected nutrient and better on at least one. Within a group, products have trade-offs or matching values; display order is not a health advantage.</Body>
    <Card><Text style={styles.group}>COMPARISON POLICY UNDER REVIEW</Text>
      <Body>{ranking.priorities.length ? ranking.priorities.map(p => (p.direction === 'lower' ? 'Less ' : 'More ') + p.label.toLowerCase()).join(' · ') : 'More information is needed for a comparison.'}</Body>
      {ranking.contextNotes.map((note, i) => <Body muted key={i}>{note}</Body>)}
      {ranking.sourceIds.length > 0 && <Button secondary label={showSources ? 'Hide guidance sources' : 'Read guidance sources'} onPress={() => setShowSources(!showSources)} />}
      {showSources && ranking.sourceIds.map(id => <Button key={id} secondary label={shelfRankingSources[id].title} onPress={() => { setLinkError(''); void Linking.openURL(shelfRankingSources[id].url).catch(() => setLinkError('This source could not be opened. Try again when you have a connection.')); }} />)}
      {!!linkError && <Body muted>{linkError}</Body>}
      <Text style={s.small}>Policy {ranking.policyVersion} · Profile revision {ranking.profileRevision}. This comparison is not a complete disease-specific suitability assessment.</Text>
    </Card>
    {ranking.ranked.map(item => <FoodRow key={item.food.provider + ':' + item.food.id} item={item} priorities={ranking.priorities} />)}
    {!ranking.ranked.length && <Card><Heading>{confirmedCount ? 'No supported ranking yet' : 'Your comparison will appear here'}</Heading><Body>{confirmedCount ? 'Your products are kept below. The available facts do not support a ranking for all of your selected needs.' : 'Scan a few packages, then pause to confirm possible matches. Unidentified items are never placed in the top ten.'}</Body></Card>}
    {ranking.boundaryTiedCount > 0 && <Body muted>Other products share the last displayed group. The ten-item limit does not make them less suitable.</Body>}
    {ranking.excluded.length > 0 && <><Button secondary label={(showExcluded ? 'Hide' : 'Review') + ' products needing more information (' + ranking.excluded.length + ')'} onPress={() => setShowExcluded(!showExcluded)} />
      {showExcluded && ranking.excluded.map(item => <Card key={item.food.provider + ':' + item.food.id}><Heading>{item.food.name}</Heading><Body>{item.reasons.join(' ')}</Body></Card>)}
    </>}
  </View>;
}
const styles = StyleSheet.create({
  stack: { gap: 20 }, top: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  group: { color: colors.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 }, fact: { minWidth: 110, gap: 4 },
  amount: { color: colors.ink, fontSize: 22, fontWeight: '700' },
});
