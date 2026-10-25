import { router } from 'expo-router';
import { Text } from 'react-native';
import { useAppState } from '../../state/AppState';
import { storageDescription } from '../../storage/repository';
import { Page, Title, Body, Card, Badge, Heading, Button, s } from '../../ui/components';
export default function History() {
  const state = useAppState();
  return <Page><Title eyebrow="YOUR HISTORY">A little perspective,{'\n'}saved for later.</Title><Body muted>{storageDescription}</Body>
    {state.scans.length + state.receipts.length + state.panels.length + (state.foodReviews?.length??0) === 0 && <Card><Heading>Your first insight belongs here.</Heading><Body>Save a sample product, reviewed receipt or confirmed report.</Body><Button label="Scan Your Product" onPress={() => router.push('/capture')} /></Card>}
    {state.foodReviews?.map(review=><Card key={review.id}><Heading>{review.draft.kind==='receipt'?'Receipt review':'Product label review'}</Heading><Body>{review.synthetic?'Fictional example':'Locally read source'} · {review.matches.length} confirmed catalog matches</Body><Button label="Open food review" onPress={()=>router.push({pathname:'/food-review',params:{id:review.id}})}/><Button secondary label="Delete food review" onPress={()=>void state.deleteFoodReview(review.id)}/></Card>)}
    {state.scans.map(scan => <Card key={scan.id}><Badge label={scan.assessment.label} /><Heading>{scan.product.name}</Heading><Text style={s.small}>{new Date(scan.createdAt).toLocaleString('en-US')} · {scan.assessment.portion}× portion</Text><Button label="Open saved result" onPress={() => router.push({ pathname: '/result', params: { id: scan.product.id, saved: scan.id } })} /><Button secondary label="Delete this result" onPress={() => void state.deleteScan(scan.id)} /></Card>)}
    {state.receipts.map(r => <Card key={r.id}><Heading>Receipt · {r.retailer}</Heading><Body>{r.receiptDate} · {r.lines.length} lines</Body><Button label="Open reviewed receipt" onPress={() => router.push({ pathname: '/receipt', params: { id: r.id } })} /><Button secondary label="Delete receipt" onPress={() => void state.deleteReceipt(r.id)} /></Card>)}
    {state.panels.map(p => <Card key={p.id}><Heading>Lipid report · {p.testDate ?? 'Date unresolved'}</Heading><Body>{p.synthetic ? p.status + ' · sample data' : 'Confirmed values · saved on this device'}</Body><Button label="Open saved report" onPress={() => router.push({ pathname: '/report', params: { id: p.id } })} /><Button secondary label="Delete report" onPress={() => void state.deletePanel(p.id)} /></Card>)}
  </Page>;
}
