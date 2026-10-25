import {useState} from 'react';
import {Linking,Text,View} from 'react-native';
import {guidanceLibrary,sourceServings,type GuidanceSourceId} from '@grocery/core';
import {Back,Body,Button,Card,Chip,Heading,Page,Status,Title,s} from '../ui/components';
const titles:Record<GuidanceSourceId,string>={dash:'DASH',diabetes:'Diabetes',ckd:'Kidney health',dga:'Federal guidance','dga-servings':'Federal serving tables'};
export default function GuidanceLibrary(){
 const [selected,setSelected]=useState<GuidanceSourceId>('dash'),[calories,setCalories]=useState<number|null>(null),[message,setMessage]=useState('');
 const source=guidanceLibrary.sources.find(item=>item.id===selected)!;
 const entries=guidanceLibrary.entries.filter(item=>item.sourceId===selected);
 const table=guidanceLibrary.tables.find(item=>item.sourceId===selected);
 const rows=table&&calories!==null?sourceServings(selected as 'dash'|'dga-servings',calories):[];
 return <Page><Back/><Title eyebrow="SOURCE LIBRARY">Explore eating patterns.</Title>
 <Body>Read published guidance offline. Choosing a topic or table does not change your health profile, set a personal target or change product rankings.</Body>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{(Object.keys(titles) as GuidanceSourceId[]).map(id=><Chip key={id} label={titles[id]} selected={id===selected} onPress={()=>{setSelected(id);setCalories(null);setMessage('');}}/>)}</View>
 <Card><Heading>{source.title}</Heading><Text style={s.small}>{source.sourceVersion} · Source checked {guidanceLibrary.checkedOn}</Text>
 <Body muted>{source.attribution}</Body>
 <Button secondary label="Read the original source" onPress={()=>void Linking.openURL(source.url).catch(()=>setMessage('Could not open the source. Check your connection.'))}/>
 </Card>
 {(selected==='dash'||selected.startsWith('dga'))&&<Body>DASH specifies lower-fat dairy; the main 2025–2030 federal guidance favors full-fat dairy and its supplement also lists lower-fat options. These sources remain separate. Your care team can help choose an applicable plan.</Body>}
 {selected==='ckd'&&<Body>Kidney disease has no single diet. Potassium, phosphorus, protein and fluid needs depend on treatment and laboratory context. This page does not assign restrictions.</Body>}
 {entries.map(entry=><Card key={entry.id}><Body>{entry.summary}</Body>{entry.exceptions.map(exception=><Text key={exception} style={s.small}>{exception}</Text>)}<Text style={s.small}>Source section: {entry.sourceLocator}</Text></Card>)}
 {table&&<Card><Heading>Browse a printed serving table</Heading><Body>Choose a published calorie column to view. This is a reference table, not a recommendation for your energy needs. A food-group serving differs from a package serving.</Body>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{table.calorieLevels.map(value=><Chip key={value} label={value+' kcal'} selected={calories===value} onPress={()=>setCalories(value)}/>)}</View>
 {rows.map(row=><View key={row.foodGroup} style={{gap:6}}><Heading>{row.foodGroup.replaceAll('-',' ')}</Heading><Body>{row.quantity} source servings per {row.period}</Body><Text style={s.small}>Serving examples: {row.examples.join('; ')||'See source definition'}</Text></View>)}
 {table.notes.map(note=><Text key={note} style={s.small}>{note}</Text>)}
 </Card>}
 <Text style={s.small}>Educational reference library {guidanceLibrary.version}. Clinical applicability review pending. No personalized medical recommendations are enabled. Original sources may change.</Text>
 {!!message&&<Status>{message}</Status>}
 </Page>;
}
