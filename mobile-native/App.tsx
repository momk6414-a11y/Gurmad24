import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { apiRequest } from './src/api/client';
import { colors } from './src/theme/tokens';

type Hospital = { id: string; name: string; area?: string; address?: string; phone?: string; description?: string; verificationNote?: string; source?: string; verified?: boolean; isLocalDraft?: boolean };
const directorySource = 'Isbitaal.com — buugga isbitaallada Gaalkacyo (17-11-2026)';
const provisionalNote = 'Liis dadweyne oo aan weli si toos ah uga xaqiijin isbitaalka. Wac oo xaqiiji ka hor intaadan ku tiirsanaan.';
const draftHospitals: Hospital[] = [
  { id: 'draft-daacad', name: 'Daacad Hospital', area: 'Gaalkacyo', phone: '+252 61 220 5599', verificationNote: provisionalNote, source: directorySource, isLocalDraft: true },
  { id: 'draft-daru-dabib', name: 'Daru-Dabib Hospital', area: 'Gaalkacyo', phone: '+252 61 404 0207', verificationNote: provisionalNote, source: directorySource, isLocalDraft: true },
  { id: 'draft-daryeel', name: 'Daryeel Speciality Hospital and Diagnostic Center', area: 'Gaalkacyo', phone: '+252 90 768 4039', verificationNote: provisionalNote, source: directorySource, isLocalDraft: true },
  { id: 'draft-digfeer', name: 'Digfeer Eye Specialist Hospital', area: 'Gaalkacyo', address: 'Hotel Classic agtiisa — goobta lama xaqiijin', description: 'Adeegyada caafimaadka indhaha', phone: '0907658461', verificationNote: 'Lambarka aad hore u bixisay (0907658461) wuu ka duwan yahay kan buugga dadweynaha (0907658641). Xaqiiji lambarka saxda ah ka hor wicitaan.', source: directorySource, isLocalDraft: true },
  { id: 'draft-galkayo-general', name: 'Galkayo General Hospital', area: 'Gaalkacyo', address: 'Hobyo Street (liis dadweyne)', phone: '+252 61 782 0040', verificationNote: 'Liis dadweyne; magaca Galkayo Hospital - Galmudug wuxuu la wadaagaa lambarkan, waxaana suuragal ah inay hal xarun yihiin. Xaqiiji.', source: directorySource, isLocalDraft: true },
  { id: 'draft-gmc', name: 'GMC Hospital — Galkacyo Medical Center', area: 'Gaalkacyo', phone: '+252 90 470 6666', verificationNote: provisionalNote, source: directorySource, isLocalDraft: true },
  { id: 'draft-hayaat', name: 'Hayaat Hospital Galkacyo', area: 'Gaalkacyo', phone: '+252 90 664 6499', verificationNote: provisionalNote, source: directorySource, isLocalDraft: true },
  { id: 'draft-horeeye', name: 'Horeeye Multispecialty Hospital', area: 'Gaalkacyo', phone: '+252 90 775 9796', verificationNote: provisionalNote, source: directorySource, isLocalDraft: true },
  { id: 'draft-modern', name: 'Modern Hospital', area: 'Gaalkacyo', address: 'Hotel Classic dhinaciisa midig — goobta lama xaqiijin', phone: '+252 90 679 5131', verificationNote: provisionalNote, source: directorySource, isLocalDraft: true },
  { id: 'draft-mudug-regional', name: 'Mudug Regional Hospital', area: 'Gaalkacyo', phone: '+252 90 779 5891', verificationNote: provisionalNote, source: directorySource, isLocalDraft: true },
  { id: 'draft-ramadan', name: 'Ramadan Hospital Galkacyo', area: 'Gaalkacyo', address: 'Wadajir District, Hobyo Street — liis dadweyne', phone: '+252 90 537 3131', verificationNote: provisionalNote, source: directorySource, isLocalDraft: true },
  { id: 'draft-royal-family', name: 'Royal Family Hospital', area: 'Gaalkacyo', phone: '+252 90 705 6667', verificationNote: provisionalNote, source: directorySource, isLocalDraft: true },
  { id: 'draft-shifo', name: 'Shifo Hospital Galkacyo', area: 'Gaalkacyo', phone: '+252 90 738 6583', verificationNote: provisionalNote, source: directorySource, isLocalDraft: true },
  { id: 'draft-shifo-specialist', name: 'Shifo Specialist Hospital', area: 'Gaalkacyo', phone: '+252 90 686 0404', verificationNote: provisionalNote, source: directorySource, isLocalDraft: true },
  { id: 'draft-wadani', name: 'Wadani Specialist Hospital', area: 'Gaalkacyo', phone: '+252 90 776 6666', verificationNote: provisionalNote, source: directorySource, isLocalDraft: true },
  { id: 'draft-wadatal', name: 'Wadatal General Hospital', area: 'Gaalkacyo', phone: '+252 61 976 6665', verificationNote: provisionalNote, source: directorySource, isLocalDraft: true },
];
const tabs = [
  { key: 'home', label: 'Hoyga', icon: '⌂' }, { key: 'hospitals', label: 'Isbitaallo', icon: '✚' },
  { key: 'activity', label: 'Hawlahayga', icon: '◷' }, { key: 'account', label: 'Akoon', icon: '○' },
  { key: 'web', label: 'Web App', icon: '↗' },
] as const;
type Tab = (typeof tabs)[number]['key'];

function useHospitals() {
  const [items, setItems] = useState<Hospital[]>(draftHospitals);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromServer, setFromServer] = useState(false);
  const load = async () => {
    try {
      const result = await apiRequest<{ hospitals?: Hospital[] }>('/api/hospitals');
      const live = Array.isArray(result.hospitals) ? result.hospitals : [];
      if (live.length) {
        const merged: Hospital[] = live.map(h => ({ ...h, isLocalDraft: false }));
        draftHospitals.forEach(d => {
          if (!merged.some(h => h.name.toLowerCase() === d.name.toLowerCase())) merged.push(d);
        });
        setItems(merged);
        setFromServer(true);
      } else { setItems(draftHospitals); setFromServer(false); }
    } catch { setItems(draftHospitals); setFromServer(false); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);
  return { items, loading, refreshing, fromServer, reload: () => { setRefreshing(true); load(); } };
}

function Mark({ small = false }: { small?: boolean }) {
  return <View style={[styles.mark, small && styles.markSmall]}><Text style={[styles.markCross, small && styles.markCrossSmall]}>✚</Text><View style={styles.markPulse} /></View>;
}
function Splash() {
  return <View style={styles.splash}><Mark /><Text style={styles.splashName}>GURMAD <Text style={styles.greenText}>24</Text></Text><Text style={styles.splashCaption}>Caafimaad iyo gargaar, hal meel.</Text><Text style={styles.splashFoot}>NOOCA TIJAABADA</Text></View>;
}
function Heading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={styles.headingRow}><Text style={styles.sectionTitle}>{title}</Text>{action && onPress ? <Pressable onPress={onPress}><Text style={styles.action}>{action} ›</Text></Pressable> : null}</View>;
}
function HospitalCard({ item }: { item: Hospital }) {
  return <View style={styles.hospitalCard}>
    <View style={styles.hospitalTop}><View style={styles.hospitalMark}><Text style={styles.hospitalMarkText}>✚</Text></View><View style={styles.hospitalTitle}><Text style={styles.hospitalName}>{item.name}</Text><Text style={styles.hospitalArea}>{item.area || 'Gaalkacyo'}</Text></View>
      <Text style={[styles.pill, item.isLocalDraft ? styles.pillDraft : styles.pillLive]}>{item.isLocalDraft ? 'Liis dadweyne' : 'La xaqiijiyey'}</Text>
    </View>
    <Text style={styles.hospitalDescription}>{item.description || 'Xarun caafimaad'}</Text>
    {item.verificationNote ? <Text style={styles.verificationNote}>{item.verificationNote}</Text> : null}
    {item.source ? <Text style={styles.sourceText}>Xigasho: Isbitaal.com</Text> : null}
    <Text style={styles.address}>⌖  {item.address || item.area || 'Goobta lama sheegin'}</Text>
    {item.phone ? <Pressable style={styles.callButton} onPress={() => Linking.openURL('tel:' + item.phone).catch(() => Alert.alert('Wicitaan', 'Telefoonka lagama furi karin.'))}><Text style={styles.callText}>☎  {item.phone}  ·  Wac</Text></Pressable> : null}
  </View>;
}
function Home({ data, openHospitals, openWeb }: { data: ReturnType<typeof useHospitals>; openHospitals: () => void; openWeb: () => void }) {
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.top}><View style={styles.brandRow}><Mark small /><View><Text style={styles.brand}>GURMAD <Text style={styles.greenText}>24</Text></Text><Text style={styles.brandSub}>Caafimaad iyo gargaar</Text></View></View><Pressable style={styles.webChip} onPress={openWeb}><Text style={styles.webChipText}>Web App ↗</Text></Pressable></View>
    <View style={styles.location}><Text style={styles.pin}>⌖</Text><View><Text style={styles.locationLabel}>GOOBTA MASHRUUCA</Text><Text style={styles.locationName}>Gaalkacyo, Soomaaliya</Text></View></View>
    <View style={styles.hero}><View style={styles.orb} /><Text style={styles.eyebrow}>KU SOO DHAWOOW GURMAD 24</Text><Text style={styles.heroTitle}>Caafimaadkaaga{'\n'}waa mudnaantayada.</Text><Text style={styles.heroCopy}>Hal meel ka hel macluumaadka xarumaha caafimaadka iyo adeegyada.</Text><Pressable style={styles.heroButton} onPress={openHospitals}><Text style={styles.heroButtonText}>Raadi isbitaallo  →</Text></Pressable><View style={styles.heroBadge}><Mark small /></View></View>
    <View style={styles.notice}><Text style={styles.noticeIcon}>!</Text><View style={{ flex: 1 }}><Text style={styles.noticeTitle}>Nooca tijaabada</Text><Text style={styles.noticeCopy}>Codsiga gurmadku wali waa SIMULATION; gargaar dhab ah lama dirayo. Ha u adeegsan xaalad degdeg ah.</Text></View></View>
    <View style={styles.statsRow}>
      <View style={styles.statCard}><Text style={styles.statValue}>{data.items.length}</Text><Text style={styles.statLabel}>Liiska guud</Text></View>
      <View style={styles.statCard}><Text style={styles.statValue}>{data.items.filter(h => !h.isLocalDraft).length}</Text><Text style={styles.statLabel}>La xaqiijiyey</Text></View>
      <View style={styles.statCard}><Text style={styles.statValue}>{data.items.filter(h => h.isLocalDraft).length}</Text><Text style={styles.statLabel}>Xog hordhac ah</Text></View>
    </View>
    <Heading title="Adeegyada" /><View style={styles.grid}>
      <Pressable style={styles.quickCard} onPress={openHospitals}><Text style={styles.quickIcon}>✚</Text><Text style={styles.quickTitle}>Isbitaallo</Text><Text style={styles.quickSub}>Xarumaha caafimaadka</Text></Pressable>
      <Pressable style={styles.quickCard} onPress={openWeb}><Text style={styles.quickIconGreen}>⌖</Text><Text style={styles.quickTitle}>Khariidad</Text><Text style={styles.quickSub}>Ka fur Web App-ka</Text></Pressable>
      <Pressable style={styles.quickCard} onPress={openWeb}><Text style={styles.quickIconPurple}>▣</Text><Text style={styles.quickTitle}>Tikidyo</Text><Text style={styles.quickSub}>Codsiyada iyo safarrada</Text></Pressable>
      <Pressable style={styles.quickCard} onPress={openWeb}><Text style={styles.quickIconOrange}>＋</Text><Text style={styles.quickTitle}>Adeeg caafimaad</Text><Text style={styles.quickSub}>Eeg adeegyada</Text></Pressable>
    </View>
    <Heading title="Isbitaallada Gaalkacyo" action="Dhammaan" onPress={openHospitals} />
    {data.loading && !data.items.length ? <ActivityIndicator color={colors.green} /> : data.items.slice(0, 2).map(h => <HospitalCard key={h.id} item={h} />)}
    <Pressable style={styles.webBanner} onPress={openWeb}><Text style={styles.webBannerIcon}>↗</Text><View style={{ flex: 1 }}><Text style={styles.webBannerTitle}>Fur GURMAD 24 Web App</Text><Text style={styles.webBannerSub}>Isla website-ka iyo backend-ka mashruuca.</Text></View><Text style={styles.bannerArrow}>›</Text></Pressable>
    <Text style={styles.footer}>GURMAD 24 · NOOCA TIJAABADA</Text>
  </ScrollView>;
}
function Hospitals({ data }: { data: ReturnType<typeof useHospitals> }) {
  return <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.reload} tintColor={colors.green} />}>
    <Text style={styles.pageEyebrow}>GURMAD 24 DIRECTORY</Text><Text style={styles.pageTitle}>Isbitaallada</Text><Text style={styles.pageSub}>Xarumaha caafimaadka iyo adeegyada ay bixiyaan.</Text>
    {(!data.fromServer || data.items.some(h => h.isLocalDraft)) ? <View style={styles.notice}><Text style={styles.noticeIcon}>i</Text><View style={{ flex: 1 }}><Text style={styles.noticeTitle}>Xog hordhac ah</Text><Text style={styles.noticeCopy}>Liiskani wuxuu ka yimid buug dadweyne; xogta iyo lambarrada wali isbitaallada lagama xaqiijin. Wac oo xaqiiji ka hor isticmaalka.</Text></View></View> : null}
    {data.loading ? <ActivityIndicator color={colors.green} /> : data.items.map(h => <HospitalCard key={h.id} item={h} />)}
  </ScrollView>;
}
function SimplePage({ title, subtitle, onOpenWeb }: { title: string; subtitle: string; onOpenWeb: () => void }) {
  return <ScrollView contentContainerStyle={styles.content}><Text style={styles.pageEyebrow}>GURMAD 24</Text><Text style={styles.pageTitle}>{title}</Text><Text style={styles.pageSub}>{subtitle}</Text><View style={styles.emptyCard}><Text style={styles.emptyIcon}>◷</Text><Text style={styles.emptyTitle}>Qaybtan wali waa la dhisayaa</Text><Text style={styles.emptyCopy}>Adeegyada hadda shaqaynaya ka isticmaal Web App-ka isku xiran.</Text><Pressable style={styles.secondaryButton} onPress={onOpenWeb}><Text style={styles.secondaryText}>Fur Web App-ka ↗</Text></Pressable></View></ScrollView>;
}
function WebPage() {
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  return <View style={styles.webPage}><View style={styles.webHeader}><View><Text style={styles.webTitle}>GURMAD 24 Web App</Text><Text style={styles.webSub}>Isla website-ka iyo isla backend-ka</Text></View><Pressable style={styles.refresh} onPress={() => { setFailed(false); setVersion(v => v + 1); }}><Text style={styles.refreshText}>Cusboonaysii</Text></Pressable></View>
    {failed ? <View style={styles.webFailed}><Text style={styles.emptyTitle}>Web App-ka lama xiriirin karo</Text><Text style={styles.emptyCopy}>Hubi internet-ka, kadib mar kale isku day.</Text><Pressable style={styles.secondaryButton} onPress={() => Linking.openURL('https://gurmad24.onrender.com')}><Text style={styles.secondaryText}>Ku fur browser-ka ↗</Text></Pressable></View> :
      <WebView key={version} style={styles.webView} source={{ uri: 'https://gurmad24.onrender.com' }} javaScriptEnabled domStorageEnabled sharedCookiesEnabled thirdPartyCookiesEnabled setSupportMultipleWindows={false} onError={() => setFailed(true)} startInLoadingState renderLoading={() => <View style={styles.webLoading}><ActivityIndicator size="large" color={colors.green} /><Text style={styles.muted}>Web App-ka ayaa furmaya…</Text></View>} />}
  </View>;
}
export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [splash, setSplash] = useState(true);
  const data = useHospitals();
  useEffect(() => { const t = setTimeout(() => setSplash(false), 900); return () => clearTimeout(t); }, []);
  if (splash) return <><StatusBar barStyle="light-content" /><Splash /></>;
  const openWeb = () => setTab('web');
  return <SafeAreaView style={styles.safe}><StatusBar barStyle="dark-content" /><View style={styles.shell}>
    {tab === 'home' ? <Home data={data} openHospitals={() => setTab('hospitals')} openWeb={openWeb} /> : null}
    {tab === 'hospitals' ? <Hospitals data={data} /> : null}
    {tab === 'activity' ? <SimplePage title="Hawlahayga" subtitle="La soco codsiyadaada iyo tikidyada." onOpenWeb={openWeb} /> : null}
    {tab === 'account' ? <SimplePage title="Akoonkayga" subtitle="Gelitaanka iyo macluumaadka isticmaalaha." onOpenWeb={openWeb} /> : null}
    {tab === 'web' ? <WebPage /> : null}
    <View style={styles.bottom}>{tabs.map(t => <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)} accessibilityRole="button" accessibilityState={{ selected: tab === t.key }}><Text style={[styles.tabIcon, tab === t.key && styles.tabActive]}>{t.icon}</Text><Text style={[styles.tabLabel, tab === t.key && styles.tabActive]}>{t.label}</Text>{tab === t.key ? <View style={styles.indicator} /> : null}</Pressable>)}</View>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},shell:{flex:1,backgroundColor:colors.background},content:{padding:18,paddingBottom:26},
  splash:{flex:1,backgroundColor:colors.navy,alignItems:'center',justifyContent:'center'},mark:{width:82,height:82,borderRadius:25,backgroundColor:'#174B7A',alignItems:'center',justifyContent:'center',overflow:'hidden',borderWidth:1,borderColor:'#47749D'},markSmall:{width:45,height:45,borderRadius:14},markCross:{fontSize:49,color:'#FFFFFF',fontWeight:'900'},markCrossSmall:{fontSize:26},markPulse:{position:'absolute',width:57,height:4,borderRadius:4,backgroundColor:'#39C878',transform:[{rotate:'-12deg'}]},
  splashName:{fontSize:29,fontWeight:'900',color:'#FFFFFF',letterSpacing:1.5,marginTop:22},greenText:{color:'#39C878'},splashCaption:{color:'#D6E5F5',fontSize:12,marginTop:8},splashFoot:{position:'absolute',bottom:38,color:'#A8BED8',fontSize:9,fontWeight:'800',letterSpacing:1.5},
  top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},brandRow:{flexDirection:'row',alignItems:'center'},brand:{fontSize:18,fontWeight:'900',color:colors.navy},brandSub:{fontSize:10,color:colors.muted,marginTop:2},webChip:{backgroundColor:'#FFFFFF',borderWidth:1,borderColor:colors.border,borderRadius:12,paddingHorizontal:12,paddingVertical:9},webChipText:{fontSize:10,fontWeight:'900',color:colors.navy},
  location:{flexDirection:'row',alignItems:'center',marginBottom:15},
  statsRow:{flexDirection:'row',gap:8,marginBottom:15},statCard:{flex:1,backgroundColor:'#FFFFFF',borderRadius:13,borderWidth:1,borderColor:'#E7EDF2',paddingVertical:12,paddingHorizontal:9},statValue:{fontSize:20,fontWeight:'900',color:colors.navy},statLabel:{fontSize:8,fontWeight:'700',color:colors.muted,marginTop:3},pin:{fontSize:23,color:colors.green,marginRight:9},locationLabel:{fontSize:9,color:colors.muted,fontWeight:'900',letterSpacing:1},locationName:{fontSize:12,color:colors.ink,fontWeight:'800',marginTop:3},
  hero:{backgroundColor:'#071B35',borderRadius:25,padding:20,minHeight:235,overflow:'hidden',marginBottom:15},orb:{position:'absolute',width:200,height:200,borderRadius:100,backgroundColor:'#174775',right:-75,top:-55},eyebrow:{fontSize:9,color:'#C5D9ED',fontWeight:'900',letterSpacing:1},heroTitle:{fontSize:27,lineHeight:34,color:'#FFFFFF',fontWeight:'900',marginTop:17},heroCopy:{fontSize:11,lineHeight:18,color:'#D6E4F2',marginTop:8,maxWidth:'84%'},heroButton:{alignSelf:'flex-start',backgroundColor:colors.green,borderRadius:11,paddingHorizontal:14,paddingVertical:11,marginTop:16},heroButtonText:{fontSize:11,color:'#FFFFFF',fontWeight:'900'},heroBadge:{position:'absolute',right:16,bottom:15,opacity:0.75},
  notice:{flexDirection:'row',alignItems:'flex-start',backgroundColor:'#FFF7E5',borderWidth:1,borderColor:'#F0DDAF',borderRadius:14,padding:12,marginBottom:21},noticeIcon:{width:25,height:25,textAlign:'center',textAlignVertical:'center',overflow:'hidden',borderRadius:8,backgroundColor:'#F3E5BF',color:'#805B13',fontWeight:'900',marginRight:10},noticeTitle:{fontSize:11,fontWeight:'900',color:'#805B13',marginBottom:3},noticeCopy:{fontSize:10,lineHeight:16,color:'#6B571F'},
  headingRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:11},sectionTitle:{fontSize:16,fontWeight:'900',color:colors.ink},action:{fontSize:10,fontWeight:'900',color:colors.navy},
  grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',marginBottom:19},quickCard:{width:'48.3%',minHeight:120,backgroundColor:'#FFFFFF',borderRadius:16,borderWidth:1,borderColor:colors.border,padding:12,marginBottom:10},quickIcon:{fontSize:25,color:colors.navy,marginBottom:8},quickIconGreen:{fontSize:25,color:'#238C48',marginBottom:8},quickIconPurple:{fontSize:23,color:'#7455B8',marginBottom:8},quickIconOrange:{fontSize:25,color:'#C46A22',marginBottom:8},quickTitle:{fontSize:12,fontWeight:'900',color:colors.ink},quickSub:{fontSize:9,lineHeight:14,color:colors.muted,marginTop:4},
  hospitalCard:{backgroundColor:'#FFFFFF',borderWidth:1,borderColor:colors.border,borderRadius:17,padding:13,marginBottom:10},hospitalTop:{flexDirection:'row',alignItems:'center'},hospitalMark:{width:38,height:38,borderRadius:12,backgroundColor:'#E8F1FB',alignItems:'center',justifyContent:'center'},hospitalMarkText:{fontSize:21,color:colors.navy},hospitalTitle:{flex:1,marginLeft:9},hospitalName:{fontSize:12,fontWeight:'900',color:colors.ink},hospitalArea:{fontSize:9,color:colors.muted,marginTop:3},pill:{fontSize:8,fontWeight:'900',overflow:'hidden',borderRadius:20,paddingHorizontal:8,paddingVertical:5},pillDraft:{backgroundColor:'#FFF4D9',color:'#805B13'},pillLive:{backgroundColor:'#E7F6EC',color:'#176B38'},hospitalDescription:{fontSize:10,lineHeight:16,color:colors.ink,marginTop:11},verificationNote:{fontSize:9,lineHeight:14,color:'#8A5B18',marginTop:6},sourceText:{fontSize:8,color:colors.muted,marginTop:4},address:{fontSize:9,lineHeight:15,color:colors.muted,marginTop:5},callButton:{alignSelf:'flex-start',backgroundColor:'#E7F6EC',borderRadius:9,paddingHorizontal:11,paddingVertical:8,marginTop:9},callText:{fontSize:10,fontWeight:'900',color:'#176B38'},
  webBanner:{flexDirection:'row',alignItems:'center',backgroundColor:'#EAF2FC',borderRadius:16,padding:13,marginTop:5},webBannerIcon:{fontSize:22,color:colors.navy,marginRight:12},webBannerTitle:{fontSize:11,fontWeight:'900',color:colors.navy},webBannerSub:{fontSize:9,color:colors.muted,marginTop:4},bannerArrow:{fontSize:23,color:colors.navy,marginLeft:8},
  pageEyebrow:{fontSize:9,color:colors.green,fontWeight:'900',letterSpacing:1.2,marginTop:12},pageTitle:{fontSize:27,fontWeight:'900',color:colors.navy,marginTop:6},pageSub:{fontSize:11,lineHeight:17,color:colors.muted,marginTop:5,marginBottom:18},emptyCard:{alignItems:'center',backgroundColor:'#FFFFFF',borderWidth:1,borderColor:colors.border,borderRadius:18,padding:24,marginTop:16},emptyIcon:{fontSize:35,color:colors.navy,marginBottom:12},emptyTitle:{fontSize:14,fontWeight:'900',color:colors.ink,textAlign:'center'},emptyCopy:{fontSize:10,lineHeight:16,color:colors.muted,textAlign:'center',marginTop:7},secondaryButton:{backgroundColor:colors.navy,borderRadius:10,paddingHorizontal:15,paddingVertical:11,marginTop:16},secondaryText:{fontSize:10,fontWeight:'900',color:'#FFFFFF'},
  webPage:{flex:1,backgroundColor:'#FFFFFF'},webHeader:{padding:13,borderBottomWidth:1,borderBottomColor:colors.border,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},webTitle:{fontSize:12,fontWeight:'900',color:colors.navy},webSub:{fontSize:9,color:colors.muted,marginTop:3},refresh:{backgroundColor:'#E8F1FB',padding:9,borderRadius:9},refreshText:{fontSize:9,color:colors.navy,fontWeight:'900'},webView:{flex:1,backgroundColor:'#FFFFFF'},webLoading:{flex:1,alignItems:'center',justifyContent:'center'},muted:{fontSize:10,color:colors.muted,marginTop:9},webFailed:{flex:1,alignItems:'center',justifyContent:'center',padding:24},
  bottom:{flexDirection:'row',backgroundColor:'#FFFFFF',borderTopWidth:1,borderTopColor:colors.border,paddingTop:6,paddingBottom:5},tab:{flex:1,minHeight:49,alignItems:'center',justifyContent:'center'},tabIcon:{fontSize:20,color:'#9AAABD',lineHeight:23},tabLabel:{fontSize:8,color:'#9AAABD',fontWeight:'700',marginTop:2},tabActive:{color:colors.navy,fontWeight:'900'},indicator:{position:'absolute',top:-7,width:17,height:3,borderRadius:2,backgroundColor:colors.green},footer:{fontSize:9,color:colors.muted,textAlign:'center',marginTop:16,marginBottom:5},
});
