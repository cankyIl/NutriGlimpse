import {useCallback,useRef,useState} from 'react';
import {AppState,Linking,Pressable,StyleSheet,Text,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {newsCache} from '../storage/newsCache';
import {useAppState} from '../state/AppState';
import {newsDay,validateNewsPool,NEWS_POOL_LIMIT,NEWS_MAX_AGE_MS,type NewsPool} from '../../../../packages/core/src/newsPersonalization';
import {fetchSelectedNews,prepareNewsRequest,generalNewsCache,type NewsSelection} from '../../../../packages/core/src/newsSelection';
import {Body,Button,Chip,Heading,Icon,s} from './components';
import {colors as c} from './theme';
export function FoodNews(){
 const health=useAppState(),enabled=health.newsPersonalization!==false;
 // Memory-only key invalidates a result immediately when saved news interests change.
 const requestKey=JSON.stringify(prepareNewsRequest(health.profile,enabled));
 const [now,setNow]=useState(()=>Date.now()),[cached,setCached]=useState<NewsPool|null>(null);
 const [selection,setSelection]=useState<{key:string;value:NewsSelection}|null>(null);
 const current=selection?.key===requestKey?selection.value:null,edition=current??cached;
 const [offline,setOffline]=useState(false),[loading,setLoading]=useState(true),[linkError,setLinkError]=useState(false);
 const [saving,setSaving]=useState(false),[preferenceError,setPreferenceError]=useState(false);
 const live=useRef(false),sequence=useRef(0),request=useRef<AbortController|null>(null);
 const latest=useRef<NewsPool|null>(null),lastAttempt=useRef(0),failed=useRef(false);
 const refresh=useCallback(async()=>{
  if(!live.current||request.current)return;
  const id=++sequence.current,controller=new AbortController();request.current=controller;lastAttempt.current=Date.now();setLoading(true);
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const next=await fetchSelectedNews(JSON.parse(requestKey),controller.signal);
   if(!live.current||sequence.current!==id)return;
   const general=generalNewsCache(next);
   latest.current=next;failed.current=false;setSelection({key:requestKey,value:next});setCached(general);setOffline(false);setNow(Date.now());
   try{await newsCache.set(JSON.stringify(general));}catch{/* Only shared general news is cached; a cache failure must not hide a successful response. */}
  }catch{if(live.current&&sequence.current===id){failed.current=true;setOffline(true);}}
  finally{clearTimeout(timeout);if(sequence.current===id){request.current=null;if(live.current)setLoading(false);}}
 },[requestKey]);
 useFocusEffect(useCallback(()=>{
  live.current=true;latest.current=null;let active=true;
  void (async()=>{
   try{
    const raw=await newsCache.get();
    if(raw&&raw.length<=NEWS_POOL_LIMIT&&active&&!latest.current){const general=validateNewsPool(JSON.parse(raw));if(general.articles.length>5)throw Error('Obsolete news cache');latest.current=general;setCached(general);}
   }catch{/* Ignore corrupt, unsafe or obsolete public metadata. */}
   if(active)void refresh();
  })();
  const check=()=>{
   if(!active||AppState.currentState!=='active')return;
   const time=Date.now();setNow(time);const pool=latest.current,elapsed=time-lastAttempt.current;
   if(elapsed>=15*60000&&(!pool||newsDay(Date.parse(pool.generatedAt))!==newsDay(time)||failed.current||elapsed>=3600000))void refresh();
  };
  const timer=setInterval(check,60000);
  const subscription=AppState.addEventListener('change',state=>{if(state==='active')check();});
  return()=>{active=false;live.current=false;sequence.current++;request.current?.abort();request.current=null;clearInterval(timer);subscription.remove();};
 },[refresh]));
 async function setPersonalized(value:boolean){
  if(saving||value===enabled)return;setSaving(true);setPreferenceError(false);
  try{if(!await health.setNewsPersonalization(value))setPreferenceError(true);}catch{setPreferenceError(true);}finally{setSaving(false);}
 }
 const selected={articles:edition?.articles.filter(a=>Date.parse(a.publishedAt)<=now&&now-Date.parse(a.publishedAt)<=NEWS_MAX_AGE_MS&&a.audience!=='children').slice(0,5)??[],personalized:current?.personalized===true};
 const date=(value:string)=>new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
 return <View style={{gap:10}}><Heading>Food & nutrition news</Heading>
 <View style={styles.controls}><Chip label="For you" selected={enabled} disabled={saving} onPress={()=>void setPersonalized(true)}/><Chip label="General" selected={!enabled} disabled={saving} onPress={()=>void setPersonalized(false)}/></View>
 {selected.personalized&&<Text style={s.small}>Includes topics from My Needs</Text>}
 {preferenceError&&<Body muted>Could not save your news preference. Please try again.</Body>}
 {edition&&<Text style={s.small}>{offline?'Saved edition':newsDay(Date.parse(edition.generatedAt))!==newsDay(now)?'Last available edition':'Recent stories'} · updated {date(edition.generatedAt)}</Text>}
 {selected.articles.map(article=><Pressable key={article.id} accessibilityRole="link" accessibilityLabel={article.title+'. '+article.publisher+'. '+date(article.publishedAt)+(article.evidence==='early-research'?'. Early research.':'')} onPress={()=>void Linking.openURL(article.url).catch(()=>setLinkError(true))} style={styles.row}>
  <View style={styles.icon}><Icon name={article.topic==='Food safety'?'shield':'book-open'} size={19} color={c.green}/></View><View style={{flex:1,gap:5}}><Text style={styles.title}>{article.title}</Text><Text style={styles.meta}>{article.publisher} · {date(article.publishedAt)}{article.evidence==='early-research'?' · Early research':''}</Text></View><Icon name="arrow-up-right" size={16}/>
 </Pressable>)}
 {!selected.articles.length&&<Body muted>{loading?'Loading recent stories…':'No stories from the last seven days are available. Please check back later.'}</Body>}
 {offline&&selected.articles.length>0&&<Body muted>{current?'Could not refresh. Showing the last available stories.':'Could not refresh. Showing saved general stories.'}</Body>}
 <Button secondary label={loading?'Refreshing stories…':'Refresh stories'} disabled={loading} onPress={()=>void refresh()}/>
 {linkError&&<Body muted>Could not open the article. Check your connection.</Body>}
 </View>;
}
const styles=StyleSheet.create({controls:{flexDirection:'row',flexWrap:'wrap',gap:8},row:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderBottomWidth:1,borderColor:c.line},icon:{width:36,height:36,borderRadius:11,backgroundColor:c.sage,alignItems:'center',justifyContent:'center'},title:{color:c.ink,fontWeight:'600',fontSize:15,lineHeight:21},meta:{color:c.muted,fontSize:11,lineHeight:16}});
