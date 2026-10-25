import {FoodNews} from '../../ui/FoodNews';
import {healthFocuses,storeDisplayAddress} from '@grocery/core';
import {useShoppingStore} from '../../state/StoreContext';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppState } from '../../state/AppState';
import { Page, Heading, Icon, Row, Button, s } from '../../ui/components';
import { colors as c } from '../../ui/theme';

export default function ScanHome() {
  const { profile } = useAppState();
  const shopping=useShoppingStore();

  return <Page>
    <View style={styles.welcome}>
    <View style={styles.top}><Text style={styles.companion}>NutriGlimpse</Text><Pressable accessibilityRole="button" accessibilityLabel="Privacy and storage" style={{ padding: 12 }} onPress={() => router.push('/privacy')}><Icon name="shield" /></Pressable></View>
    <View style={styles.intro}><Text accessibilityRole="header" style={styles.headline}>Know your food. Understand your choices.</Text><Text style={styles.promise}>Scan a product. Explore its nutrients and better choices.</Text></View>
    <Image source={require('../../../assets/grocery-health-hero.png')} resizeMode="contain" accessible accessibilityRole="image" accessibilityLabel="Fresh and packaged groceries, a decorative nutrition label highlighting sugar and sodium, and heart, running, swimming, exercise and walking symbols." style={styles.groceryArt} />
    <Pressable accessibilityRole="button" accessibilityLabel="Your grocery store" onPress={() => router.push('/stores')} style={styles.store}><Icon name="map-pin" size={18} /><View style={{ flex: 1 }}><Text style={styles.storeLabel}>{shopping.selected?(shopping.method==='automatic'?'LIKELY STORE · AUTO-DETECTED':'YOUR SELECTED STORE'):'YOUR GROCERY STORE'}</Text><Text style={s.rowTitle}>{shopping.selected?.name??'Choose your grocery store'}</Text><Text style={styles.storeAddress}>{shopping.selected?storeDisplayAddress(shopping.selected):'Choose a store or use automatic location'}</Text></View><Icon name="chevron-down" size={17} /></Pressable>
    <View style={styles.cameras}>
      <Pressable accessibilityRole="button" accessibilityLabel="Scan Your Product" style={styles.cameraPrimary} onPress={()=>router.push('/capture')}><Icon name="camera" size={27} color="#FFFFFF"/><Text style={styles.cameraTitle}>Scan Your Product</Text><Text style={styles.cameraHint}>Package, barcode or label</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Shelf Camera" style={styles.cameraShelf} onPress={()=>router.push({pathname:'/shelf',params:{auto:'1'}})}><Icon name="grid" size={27}/><Text style={[styles.cameraTitle,{color:c.ink}]}>Shelf Camera</Text><Text style={[styles.cameraHint,{color:c.ink}]}>Explore several products</Text></Pressable>
    </View>
    </View>
    <FoodNews/>
    <Button label="Search real food facts" icon="search" onPress={() => router.push('/catalog')} />
    <Button secondary label="Food & nutrition guidance" icon="book-open" onPress={() => router.push('/nutrition-guidance')} />
    <View style={{ gap: 4 }}><Heading>A little more insight</Heading><Row title="Review a receipt" detail="See your basket, one item at a time" icon="file-text" onPress={() => router.push({ pathname: '/journey', params: { mode: 'receipt' } })} /><View style={styles.divider} /><Row title="Add a lipid report" detail="An optional, more personal perspective" icon="activity" onPress={() => router.push({ pathname: '/journey', params: { mode: 'report' } })} /></View>
    <Pressable accessibilityRole="button" onPress={() => router.push('/needs')} style={styles.needs}><Icon name="sliders" size={18} /><View style={{ flex: 1, gap: 4 }}><Text style={s.rowTitle}>Made around your needs</Text><Text style={s.small}>{healthFocuses[profile.primary]} · {profile.restrictions.length ? `${profile.restrictions.length} dietary preferences` : 'No dietary preferences selected'}</Text></View><Icon name="arrow-up-right" size={18} /></Pressable>
    <View style={styles.footer}><Icon name="lock" size={13} color={c.muted} /><Text style={s.small}>No account. You stay in control.</Text></View>
  </Page>;
}
const styles = StyleSheet.create({
  welcome: { gap: 12 },
  intro: { gap: 8 },
  headline: { color: c.ink, fontWeight: '700', fontSize: 26, lineHeight: 31, letterSpacing: -0.7 },
  promise: { color: c.ink, fontWeight: '700', fontSize: 14, lineHeight: 21 },
  // Bundled images inject their pixel height on native; clear it so the container width controls sizing.
  groceryArt: { width: '100%', height: undefined, aspectRatio: 1672 / 941, borderRadius: 24, backgroundColor: c.sage },
  storeAddress: { color: c.muted, fontSize: 11, lineHeight: 16 },
  cameras:{flexDirection:'row',gap:12,flexWrap:'wrap'},
  cameraPrimary:{flex:1,minWidth:130,backgroundColor:c.green,borderRadius:20,padding:15,gap:8,minHeight:128},
  cameraShelf:{flex:1,minWidth:130,backgroundColor:c.mint,borderRadius:20,padding:15,gap:8,minHeight:128},
  cameraTitle:{color:'#FFFFFF',fontWeight:'700',fontSize:16,lineHeight:22},
  cameraHint:{color:'#F0E7FF',fontSize:11,lineHeight:16},
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 38 },
  companion: { color: c.green, fontSize: 14, lineHeight: 21, fontWeight: '800', flex: 1 },
  store: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 13, backgroundColor: c.surface, borderRadius: 20 },
  storeLabel: { fontSize: 9, letterSpacing: 1.2, fontWeight: '600', color: c.muted, marginBottom: 5 },
  divider: { height: 1, backgroundColor: c.line, marginLeft: 58 },
  needs: { backgroundColor: c.peach, padding: 18, borderRadius: 18, flexDirection: 'row', gap: 14, alignItems: 'center' },
  footer: { flexDirection: 'row', gap: 7, justifyContent: 'center', alignItems: 'center' },
});
