import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../api/client';
import { InfoMenu } from './InfoMenu';

type Props = { onBack: () => void; role?: string };
type AdminSummary = {
  users: number; hospitalsVerified: number; providersVerified: number;
  orgsPending: number; cardsPublished: number; orders: number;
  refundsPending: number; complaintsOpen: number; casesTotal: number;
  platformRevenueThisMonthCents: number; platformRevenueTotalCents: number;
  currency: string; sandbox: boolean; storagePersistent: boolean;
};
type Organisation = { id: string; name: string; type: string; status: string };
type Appointment = { id: string; status: string; createdAt: string };
type Service = { id: string; active: boolean };
type Sales = { report: { orders: number; refunds: number; grossCents: number; platformFeeCents: number; netCents: number }; currency: string; sandbox: boolean };

const palette = { navy:'#102A43', teal:'#087E75', bg:'#F3F6FA', ink:'#1C3045', muted:'#718096', line:'#E2E8F0', white:'#FFFFFF' };
const money = (cents: number, currency = 'USD') => {
  try { return new Intl.NumberFormat('en', { style:'currency', currency, maximumFractionDigits:2 }).format((cents || 0) / 100); }
  catch { return `${((cents || 0) / 100).toFixed(2)} ${currency}`; }
};
function Header({ title, subtitle, onBack }: { title:string; subtitle:string; onBack:()=>void }) {
  return <View style={s.header}><Pressable onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable><View style={{flex:1}}><Text style={s.kicker}>GURMAD 24 · DASHBOARD</Text><Text style={s.headerTitle}>{title}</Text><Text style={s.headerSub}>{subtitle}</Text></View><InfoMenu title={title} description="Dashboard-kan wuxuu xogtiisa ka akhriyaa backend-ka rasmiga ah. API-gu ayaa go'aamiya rukhsadda iyo xogta la soo bandhigayo." steps={['Soo gal akoonkaaga rasmiga ah.', 'Hoos u jiid si aad xogta u cusboonaysiiso.', 'Haddii session-ku dhaco, dib u soo gal.']} actions={['Eeg tirooyinka kooban ee akoonkaaga.', 'Xogta bukaanka laguma soo bandhigo guudmar-kan.', 'Hawlaha wax-ka-beddelka ah ka isticmaal Web App-ka.']} /></View>;
}
function Metric({ label, value, note }: {label:string;value:string|number;note?:string}) {
  return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text>{note ? <Text style={s.metricNote}>{note}</Text> : null}</View>;
}
function Notice({ text, warning=false }: {text:string;warning?:boolean}) {
  return <View style={[s.notice, warning && s.warning]}><Text style={s.noticeText}>{text}</Text></View>;
}
function LoadingOrError({ loading, error, onRetry }: {loading:boolean;error:string;onRetry:()=>void}) {
  if (loading) return <View style={s.state}><ActivityIndicator color={palette.teal}/><Text style={s.muted}>Xogta server-ka ayaa la soo dejinayaa…</Text></View>;
  if (error) return <View style={s.state}><Text style={s.error}>{error}</Text><Pressable onPress={onRetry} style={s.retry}><Text style={s.retryText}>Mar kale isku day</Text></Pressable></View>;
  return null;
}

export function AdminDashboard({ onBack }: Props) {
  const [summary,setSummary]=useState<AdminSummary|null>(null);
  const [pending,setPending]=useState<Organisation[]>([]);
  const [revenue,setRevenue]=useState<{totals?:{totalPlatformCents?:number};currency?:string}|null>(null);
  const [loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState('');
  const load=useCallback(async()=>{
    setError('');
    try {
      const [d,o,r]=await Promise.all([
        apiRequest<AdminSummary>('/api/admin/dashboard'),
        apiRequest<{orgs:Organisation[]}>('/api/admin/orgs?status=pending'),
        apiRequest<{totals?:{totalPlatformCents?:number};currency?:string}>('/api/admin/reports/revenue?period=month'),
      ]);
      setSummary(d); setPending(o.orgs||[]); setRevenue(r);
    } catch(e) {
      const status=e instanceof Error && 'status' in e ? Number((e as {status:number}).status) : 0;
      setError(status===401||status===403?'Akoonkan ma laha rukhsadda Admin ama session-ku wuu dhacay.':'Xogta maamulka lama soo dejin karin. Hubi internet-ka oo mar kale isku day.');
    } finally {setLoading(false);setRefreshing(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  return <View style={s.root}><Header title="Maamulka guud" subtitle="Guudmar xogta nidaamka" onBack={onBack}/><ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}}/>}>
    <LoadingOrError loading={loading} error={error} onRetry={()=>{setLoading(true);load();}}/>
    {summary ? <>
      <View style={s.hero}><Text style={s.heroKicker}>XARUNTA MAAMULKA</Text><Text style={s.heroTitle}>Dhammaan adeegyada, hal meel.</Text><Text style={s.heroBody}>Tirooyinka hoose waxay ka yimaadeen xogta server-ka ee akoonka Admin.</Text></View>
      <View style={s.grid}>
        <Metric label="Isticmaaleyaal" value={summary.users}/>
        <Metric label="Isbitaallo la xaqiijiyey" value={summary.hospitalsVerified}/>
        <Metric label="Hay’ado sugaya" value={summary.orgsPending}/>
        <Metric label="Adeeg-bixiyeyaal" value={summary.providersVerified}/>
        <Metric label="Kaarar la daabacay" value={summary.cardsPublished}/>
        <Metric label="Dalabyo" value={summary.orders}/>
        <Metric label="Lacag-celin sugaysa" value={summary.refundsPending}/>
        <Metric label="Cabashooyin furan" value={summary.complaintsOpen}/>
        <Metric label="Kiisas la diiwaangeliyey" value={summary.casesTotal}/>
        <Metric label="Dakhliga platform-ka bishan" value={money(summary.platformRevenueThisMonthCents,summary.currency)} note="Lacagta ku jirta sandbox"/>
      </View>
      <View style={s.panel}><Text style={s.panelTitle}>Hay’adaha sugaya ansixinta</Text>{pending.length ? pending.slice(0,8).map(org=><View key={org.id} style={s.listRow}><View style={{flex:1}}><Text style={s.rowTitle}>{org.name}</Text><Text style={s.rowSub}>{org.type} · {org.status}</Text></View></View>) : <Text style={s.muted}>Ma jiraan hay’ado sugaya ansixin.</Text>}</View>
      <View style={s.panel}><Text style={s.panelTitle}>Kaydinta iyo lacagaha</Text><Text style={s.body}>Kayd joogto ah: {summary.storagePersistent?'Waa la xaqiijiyey inuu shidan yahay':'Lama xaqiijin / ma shidna'}</Text><Text style={s.body}>Dakhliga guud ee platform-ka: {money(revenue?.totals?.totalPlatformCents||summary.platformRevenueTotalCents,revenue?.currency||summary.currency)}</Text><Notice warning={summary.sandbox} text={summary.sandbox?'Lacag-bixintu waa SANDBOX; lacag dhab ah lama dhaqaajinayo.':'Xaaladda lacag-bixinta waxaa go’aamiya backend-ka.'}/></View>
    </>:null}
  </ScrollView></View>;
}

export function HospitalDashboard({ onBack, role='hospital_admin' }: Props) {
  const [org,setOrg]=useState<{org:Organisation}|null>(null);
  const [appointments,setAppointments]=useState<Appointment[]>([]);
  const [services,setServices]=useState<Service[]>([]);
  const [sales,setSales]=useState<Sales|null>(null);
  const [loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState('');
  const load=useCallback(async()=>{
    setError('');
    try {
      const tasks=[
        apiRequest<{org:Organisation}>('/api/org'),
        apiRequest<{appointments:Appointment[]}>('/api/org/appointments'),
        apiRequest<{services:Service[]}>('/api/org/services'),
      ];
      const [o,a,sv]=await Promise.all(tasks);
      setOrg(o);setAppointments(a.appointments||[]);setServices(sv.services||[]);
      if(role==='hospital_admin'){
        const report=await apiRequest<Sales>('/api/org/reports/sales');
        setSales(report);
      } else setSales(null);
    } catch(e) {
      const status=e instanceof Error && 'status' in e ? Number((e as {status:number}).status) : 0;
      setError(status===401||status===403?'Akoonkan ma laha rukhsadda dashboard-kan ama session-ku wuu dhacay.':'Xogta isbitaalka lama soo dejin karin. Hubi internet-ka oo mar kale isku day.');
    } finally {setLoading(false);setRefreshing(false);}
  },[role]);
  useEffect(()=>{load();},[load]);
  const count=(status:string)=>appointments.filter(a=>a.status===status).length;
  return <View style={s.root}><Header title="Dashboard-ka hay’adda" subtitle="Xogta hay’addaada oo keliya" onBack={onBack}/><ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}}/>}>
    <LoadingOrError loading={loading} error={error} onRetry={()=>{setLoading(true);load();}}/>
    {org?.org ? <>
      <View style={[s.hero,{backgroundColor:'#103B39'}]}><Text style={[s.heroKicker,{color:'#A7E6DC'}]}>XARUNTAADA</Text><Text style={s.heroTitle}>{org.org.name}</Text><Text style={s.heroBody}>Xogta dashboard-kan waxaa xaddidaya orgId-ga akoonkaaga ee server-ka.</Text><Text style={s.status}>{org.org.status.toUpperCase()}</Text></View>
      <View style={s.grid}>
        <Metric label="Ballamo guud" value={appointments.length}/>
        <Metric label="Sugaya" value={count('requested')}/>
        <Metric label="La xaqiijiyey" value={count('confirmed')}/>
        <Metric label="Dhammaaday" value={count('completed')}/>
        <Metric label="Adeegyo firfircoon" value={services.filter(x=>x.active).length}/>
        {sales ? <Metric label="Iibka kaararka" value={sales.report.orders} note={money(sales.report.grossCents,sales.currency)}/> : null}
        {sales ? <Metric label="Dakhliga saafiga ah" value={money(sales.report.netCents,sales.currency)} note="Kadib khidmada platform-ka"/> : null}
      </View>
      <View style={s.panel}><Text style={s.panelTitle}>Asturnaanta bukaanka</Text><Text style={s.body}>Guudmarkani wuxuu muujinayaa tirooyin keliya; magacyada iyo faahfaahinta bukaanka laguma soo bandhigayo dashboard-kan.</Text></View>
      {sales?.sandbox ? <Notice warning text="Warbixinta iibku waxay ku jirtaa SANDBOX; lacag dhab ah lama dhaqaajinayo."/> : null}
    </>:null}
  </ScrollView></View>;
}

const s=StyleSheet.create({
 root:{flex:1,backgroundColor:palette.bg},header:{backgroundColor:palette.white,paddingHorizontal:16,paddingTop:12,paddingBottom:14,borderBottomWidth:1,borderBottomColor:palette.line,flexDirection:'row',alignItems:'center',gap:11},back:{width:36,height:36,borderRadius:12,backgroundColor:'#EDF2F7',alignItems:'center',justifyContent:'center'},backText:{fontSize:28,color:palette.navy,lineHeight:30},kicker:{fontSize:8,fontWeight:'900',letterSpacing:1,color:palette.teal},headerTitle:{fontSize:18,fontWeight:'900',color:palette.navy,marginTop:2},headerSub:{fontSize:10,color:palette.muted,marginTop:2},content:{padding:16,paddingBottom:30},hero:{backgroundColor:'#102A43',borderRadius:20,padding:19,marginBottom:15},heroKicker:{fontSize:9,fontWeight:'900',letterSpacing:1.2,color:'#9CC5E5'},heroTitle:{fontSize:23,lineHeight:29,fontWeight:'900',color:'#FFFFFF',marginTop:10},heroBody:{fontSize:11,lineHeight:17,color:'#D7E4F0',marginTop:7},status:{alignSelf:'flex-start',marginTop:10,color:'#FFFFFF',fontSize:9,fontWeight:'900',backgroundColor:'#087E75',paddingHorizontal:10,paddingVertical:6,borderRadius:12},grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:14},metric:{width:'48%',backgroundColor:'#FFFFFF',borderRadius:16,borderWidth:1,borderColor:palette.line,padding:13},metricLabel:{fontSize:10,fontWeight:'800',color:palette.muted},metricValue:{fontSize:22,fontWeight:'900',color:palette.navy,marginTop:10},metricNote:{fontSize:9,color:'#94A3B8',marginTop:3},panel:{backgroundColor:'#FFFFFF',borderWidth:1,borderColor:palette.line,borderRadius:17,padding:15,marginBottom:12},panelTitle:{fontSize:13,fontWeight:'900',color:palette.ink,marginBottom:9},listRow:{flexDirection:'row',paddingVertical:9,borderBottomWidth:1,borderBottomColor:palette.line},rowTitle:{fontSize:11,fontWeight:'800',color:palette.ink},rowSub:{fontSize:9,color:palette.muted,marginTop:3},body:{fontSize:11,lineHeight:18,color:palette.muted,marginTop:4},notice:{backgroundColor:'#EAF4EF',padding:12,borderRadius:12,marginTop:12},warning:{backgroundColor:'#FFF4DC'},noticeText:{fontSize:10,lineHeight:16,color:palette.ink},state:{alignItems:'center',padding:28},muted:{fontSize:10,color:palette.muted,marginTop:9},error:{fontSize:11,lineHeight:17,color:'#9B3D2E',textAlign:'center'},retry:{backgroundColor:palette.navy,borderRadius:10,paddingHorizontal:15,paddingVertical:11,marginTop:14},retryText:{fontSize:10,fontWeight:'900',color:'#FFFFFF'}
});
