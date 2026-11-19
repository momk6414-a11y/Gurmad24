import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Linking, Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { apiRequest } from './src/api/client';
import { colors } from './src/theme/tokens';
import { InfoMenu } from './src/components/InfoMenu';
import { AdminDashboard, HospitalDashboard } from './src/components/NativeDashboards';

type Hospital = { id: string; name: string; area?: string; address?: string; phone?: string; description?: string; verificationNote?: string; source?: string; verified?: boolean; hours?: string; publicEmail?: string; isLocalDraft?: boolean };
const draftHospitals: Hospital[] = [];
const tabs = [
  { key: 'home', label: 'Hoyga', icon: '⌂' }, { key: 'hospitals', label: 'Isbitaallo', icon: '✚' },
  { key: 'activity', label: 'Hawlahayga', icon: '◷' }, { key: 'account', label: 'Akoon', icon: '○' },
  { key: 'web', label: 'Web App', icon: '↗' },
] as const;
type Tab = (typeof tabs)[number]['key'] | 'adminPreview' | 'hospitalPreview';

function useHospitals() {
  const [items, setItems] = useState<Hospital[]>(draftHospitals);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromServer, setFromServer] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    try {
      const result = await apiRequest<{ hospitals?: Hospital[]; directory?: Hospital[] }>('/api/hospitals');
      const live = Array.isArray(result.hospitals) ? result.hospitals : [];
      const publicListings = Array.isArray(result.directory) ? result.directory.map(h => ({ ...h, isLocalDraft: true })) : draftHospitals;
      const merged: Hospital[] = live.map(h => ({ ...h, isLocalDraft: false }));
      publicListings.forEach(d => {
        if (!merged.some(h => h.name.toLowerCase() === d.name.toLowerCase())) merged.push(d);
      });
      setItems(merged);
      setFromServer(true);
      setError('');
    } catch {
      setItems(draftHospitals);
      setFromServer(false);
      setError('Liiska isbitaallada hadda lama soo dejin karo. Hubi internet-ka oo isku day mar kale.');
    }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);
  return { items, loading, refreshing, fromServer, error, reload: () => { setRefreshing(true); load(); } };
}

function Mark({ small = false }: { small?: boolean }) {
  return <View style={[styles.mark, small && styles.markSmall]}><Text style={[styles.markCross, small && styles.markCrossSmall]}>✚</Text><View style={styles.markPulse} /></View>;
}
function Splash() {
  return <View style={styles.splash}>
    <View style={styles.splashGlow} />
    <View style={styles.splashTop}><Text style={styles.splashTopText}>GAALKACYO · SOMALIA</Text><View style={styles.splashLive}><View style={styles.splashDot} /><Text style={styles.splashLiveText}>HEALTH PLATFORM</Text></View></View>
    <View style={styles.splashCenter}>
      <View style={styles.splashMarkFrame}><Mark /></View>
      <Text style={styles.splashName}>GURMAD <Text style={styles.greenText}>24</Text></Text>
      <Text style={styles.splashCaption}>Caafimaad iyo gargaar, hal meel.</Text>
      <View style={styles.splashRule}><View style={styles.splashRuleFill} /></View>
      <Text style={styles.splashPromise}>XARUMAHA CAAFIMAADKA · ADEEGYO · ISKU XIR</Text>
    </View>
    <View style={styles.splashBottom}><Text style={styles.splashFoot}>GURMAD 24 · PILOT</Text><Text style={styles.splashVersion}>MOBILE APP</Text></View>
  </View>;
}
function Heading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={styles.headingRow}><Text style={styles.sectionTitle}>{title}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>{action && onPress ? <Pressable onPress={onPress}><Text style={styles.action}>{action} ›</Text></Pressable> : null}<InfoMenu title={title} description={`Qaybta ${title} waxay kuu soo bandhigaysaa adeegyada iyo macluumaadka la xiriira. Faahfaahinta iyo ficillada la heli karo waxay ku xirnaanayaan nooca akoonkaaga iyo rukhsadahaaga.`} steps={['Taabo qaybta si aad u furto.', 'Akhri xogta iyo tilmaamaha ka muuqda.', 'Isticmaal ficillada kuu bannaan; xogta aan la xaqiijin ha u qaadan mid rasmi ah.']} actions={['Eeg macluumaadka qaybta.', 'Raac tilmaamaha isticmaalka.', 'La xiriir taageerada haddii xog khaldan jirto.']} /></View></View>;
}
function HospitalCard({ item }: { item: Hospital }) {
  return <View style={styles.hospitalCard}>
    <View style={styles.hospitalTop}><View style={styles.hospitalMark}><Text style={styles.hospitalMarkText}>✚</Text></View><View style={styles.hospitalTitle}><Text style={styles.hospitalName}>{item.name}</Text><Text style={styles.hospitalArea}>{item.area || 'Gaalkacyo'}</Text></View>
      <Text style={[styles.pill, item.isLocalDraft || !item.verified ? styles.pillDraft : styles.pillLive]}>{item.isLocalDraft ? 'Liis dadweyne' : item.verified ? 'La xaqiijiyey' : 'Xog server'}</Text>
      <View style={{ marginLeft: 7 }}><InfoMenu title={item.name} description={item.description || 'Faahfaahinta adeegyada gaarka ah weli lagama helin isbitaalkan.'} steps={['Hubi magaca iyo goobta isbitaalka.', 'Akhri xaaladda xaqiijinta iyo xogta xiriirka.', 'Wac isbitaalka si aad u xaqiijiso adeegga iyo saacadaha ka hor booqashada.']} actions={['Eeg goobta iyo xogta xiriirka.', 'Wac haddii lambar la heli karo.', 'Ka warbixi xog khaldan adigoo adeegsanaya taageerada.']} /></View>
    </View>
    <Text style={styles.hospitalDescription}>{item.description || 'Isbitaal ku jira buugga dadweynaha; takhasuska iyo adeegyada gaarka ah lama sheegin.'}</Text>
    {item.verificationNote ? <Text style={styles.verificationNote}>{item.verificationNote}</Text> : null}
    {item.source ? <Pressable onPress={() => Linking.openURL('https://isbitaal.com/isbitaal/gaalkacyo/')} accessibilityRole="link"><Text style={styles.sourceText}>Xigasho: Isbitaal.com  ·  Eeg diiwaanka ↗</Text></Pressable> : null}
    <Text style={styles.address}>⌖  {item.address || item.area || 'Goobta lama sheegin'}</Text>
    {item.hours ? <Text style={styles.hospitalArea}>Saacadaha: {item.hours}</Text> : null}
    {item.publicEmail ? <Pressable onPress={() => Linking.openURL('mailto:' + item.publicEmail)}><Text style={styles.sourceText}>{item.publicEmail}</Text></Pressable> : null}
    {item.phone ? <Pressable style={styles.callButton} onPress={() => Linking.openURL('tel:' + item.phone).catch(() => Alert.alert('Wicitaan', 'Telefoonka lagama furi karin.'))}><Text style={styles.callText}>☎  {item.phone}  ·  Wac</Text></Pressable> : null}
  </View>;
}
function V40Hero({ onOpenHospitals }: { onOpenHospitals: () => void }) {
  const motion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 2200, useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 2200, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [motion]);
  const pulseScale = motion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const pulseOpacity = motion.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0.9] });
  const floatY = motion.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });
  return <View style={styles.heroV40}>
    <View style={styles.heroV40Glow} />
    <View style={styles.heroV40Top}>
      <View style={styles.heroV40Tag}><View style={styles.heroV40Dot} /><Text style={styles.heroV40TagText}>GURMAD 24 · HEALTH NETWORK</Text></View>
      <Text style={styles.heroV40Edition}>V40</Text>
    </View>
    <Animated.View style={[styles.heroV40Orbit, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
    <Animated.View style={[styles.heroV40Emblem, { transform: [{ translateY: floatY }] }]}>
      <View style={styles.heroV40EmblemInner}><Text style={styles.heroV40Cross}>✚</Text></View>
      <View style={styles.heroV40EmblemHalo} />
    </Animated.View>
    <Text style={styles.heroV40Kicker}>CAAFIMAAD · ADEEGYO · ISKU XIR</Text>
    <Text style={styles.heroV40Title}>Daryeel casri ah.{"\n"}Hal meel ku wada xiran.</Text>
    <Text style={styles.heroV40Copy}>Raadi xarumaha caafimaadka, maamul hawlahaaga, kuna hel adeegyada GURMAD 24.</Text>
    <View style={styles.heroV40Actions}>
      <Pressable style={styles.heroV40Primary} onPress={onOpenHospitals}><Text style={styles.heroV40PrimaryText}>Raadi isbitaal  →</Text></Pressable>
      <View style={styles.heroV40Trust}><Text style={styles.heroV40TrustMark}>✓</Text><Text style={styles.heroV40TrustText}>Xog la kala hubiyey</Text></View>
    </View>
    <View style={styles.heroV40BottomLine}><Text style={styles.heroV40BottomText}>GAALKACYO PILOT</Text><Text style={styles.heroV40BottomText}>CARE · CONNECT · RESPOND</Text></View>
  </View>;
}
function Home({ data, openHospitals, openWeb, openMap }: { data: ReturnType<typeof useHospitals>; openHospitals: () => void; openWeb: () => void; openMap: () => void }) {
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.top}><View style={styles.brandRow}><Mark small /><View><Text style={styles.brand}>GURMAD <Text style={styles.greenText}>24</Text></Text><Text style={styles.brandSub}>Caafimaad iyo gargaar</Text></View></View><Pressable style={styles.webChip} onPress={openWeb}><Text style={styles.webChipText}>Web App ↗</Text></Pressable></View>
    <View style={styles.location}><Text style={styles.pin}>⌖</Text><View><Text style={styles.locationLabel}>GOOBTA MASHRUUCA</Text><Text style={styles.locationName}>Gaalkacyo, Soomaaliya</Text></View></View>
    <V40Hero onOpenHospitals={openHospitals} />
    <View style={styles.notice}><Text style={styles.noticeIcon}>!</Text><View style={{ flex: 1 }}><Text style={styles.noticeTitle}>Xaaladda adeegga gurmadka</Text><Text style={styles.noticeCopy}>Codsiga gurmadku wali waa SIMULATION; gargaar dhab ah lama dirayo. Ha u adeegsan xaalad degdeg ah.</Text></View></View>
    <View style={styles.statsRow}>
      <View style={styles.statCard}><Text style={styles.statValue}>{data.items.length}</Text><Text style={styles.statLabel}>Liiska guud</Text></View>
      <View style={styles.statCard}><Text style={styles.statValue}>{data.items.filter(h => h.verified === true).length}</Text><Text style={styles.statLabel}>La xaqiijiyey</Text></View>
      <View style={styles.statCard}><Text style={styles.statValue}>{data.items.filter(h => h.isLocalDraft).length}</Text><Text style={styles.statLabel}>Xog hordhac ah</Text></View>
    </View>
    <Heading title="Adeegyada" /><View style={styles.grid}>
      <Pressable style={styles.quickCard} onPress={openHospitals}><Text style={styles.quickIcon}>✚</Text><Text style={styles.quickTitle}>Isbitaallo</Text><Text style={styles.quickSub}>Xarumaha caafimaadka</Text></Pressable>
      <Pressable style={styles.quickCard} onPress={openMap} accessibilityRole="button" accessibilityLabel="Fur khariidadda GURMAD 24"><Text style={styles.quickIconGreen}>⌖</Text><Text style={styles.quickTitle}>Khariidad</Text><Text style={styles.quickSub}>Ka fur Web App-ka</Text></Pressable>
      <Pressable style={styles.quickCard} onPress={openWeb}><Text style={styles.quickIconPurple}>▣</Text><Text style={styles.quickTitle}>Tikidyo</Text><Text style={styles.quickSub}>Codsiyada iyo safarrada</Text></Pressable>
      <Pressable style={styles.quickCard} onPress={openWeb}><Text style={styles.quickIconOrange}>＋</Text><Text style={styles.quickTitle}>Adeeg caafimaad</Text><Text style={styles.quickSub}>Eeg adeegyada</Text></Pressable>
    </View>
    <Heading title="Isbitaallada Gaalkacyo" action="Dhammaan" onPress={openHospitals} />
    {data.loading && !data.items.length ? <ActivityIndicator color={colors.green} /> : data.items.slice(0, 2).map(h => <HospitalCard key={h.id} item={h} />)}
    <Pressable style={styles.webBanner} onPress={openWeb}><Text style={styles.webBannerIcon}>↗</Text><View style={{ flex: 1 }}><Text style={styles.webBannerTitle}>Fur GURMAD 24 Web App</Text><Text style={styles.webBannerSub}>Isla website-ka iyo backend-ka mashruuca.</Text></View><Text style={styles.bannerArrow}>›</Text></Pressable>
    <Text style={styles.footer}>GURMAD 24 · GAALKACYO PILOT</Text>
  </ScrollView>;
}
function Hospitals({ data }: { data: ReturnType<typeof useHospitals> }) {
  const [query, setQuery] = useState('');
  const filtered = data.items.filter(h => `${h.name} ${h.area || ''} ${h.address || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.reload} tintColor={colors.green} />}>
    <Text style={styles.pageEyebrow}>GURMAD 24 DIRECTORY</Text><Text style={styles.pageTitle}>Isbitaallada</Text><Text style={styles.pageSub}>Ka raadi xarumaha caafimaadka ee ku jira diiwaanka.</Text>
    <TextInput value={query} onChangeText={setQuery} placeholder="Raadi isbitaal ama xaafad…" placeholderTextColor={colors.muted} style={styles.searchInput} returnKeyType="search" accessibilityLabel="Raadi isbitaal" />
    {(!data.fromServer || data.items.some(h => h.isLocalDraft)) ? <View style={styles.notice}><Text style={styles.noticeIcon}>i</Text><View style={{ flex: 1 }}><Text style={styles.noticeTitle}>Xog hordhac ah</Text><Text style={styles.noticeCopy}>Liiskani wuxuu ka yimid buug dadweyne; xogta iyo lambarrada wali isbitaallada lagama xaqiijin. Wac oo xaqiiji ka hor isticmaalka.</Text></View></View> : null}
    {data.loading ? <ActivityIndicator color={colors.green} /> : data.error ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Xogta lama helin</Text><Text style={styles.emptyCopy}>{data.error}</Text><Pressable style={styles.secondaryButton} onPress={data.reload}><Text style={styles.secondaryText}>Mar kale isku day</Text></Pressable></View> : filtered.length ? filtered.map(h => <HospitalCard key={h.id} item={h} />) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Natiijo lama helin</Text><Text style={styles.emptyCopy}>Bedel erayga aad raadisay ama tirtir raadinta.</Text></View>}
  </ScrollView>;
}
type SessionUser = { id: string; name: string; email: string; role: string; lang?: 'so' | 'en' };
function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => { try { const r = await apiRequest<{ user: SessionUser | null }>('/api/auth/me'); setUser(r.user); } catch { setUser(null); } finally { setLoading(false); } };
  useEffect(() => { refresh(); }, []);
  const login = async (email: string, password: string, code: string) => { const r = await apiRequest<{ user: SessionUser }>('/api/auth/login', { method: 'POST', body: { email: email.trim().toLowerCase(), password, code } }); setUser(r.user); };
  const register = async (name: string, email: string, password: string) => { const r = await apiRequest<{ user: SessionUser }>('/api/auth/register', { method: 'POST', body: { name: name.trim(), email: email.trim().toLowerCase(), password, consent: true, lang: 'so' } }); setUser(r.user); };
  const logout = async () => { await apiRequest<{ ok: boolean }>('/api/auth/logout', { method: 'POST', body: {} }); setUser(null); };
  return { user, loading, login, register, logout, refresh };
}

function AccountPage({ auth, openWeb, onOpenAdmin, onOpenHospital }: { auth: ReturnType<typeof useAuth>; openWeb: () => void; onOpenAdmin: () => void; onOpenHospital: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [consent, setConsent] = useState(false);
  const submit = async () => {
    if (!email.trim() || !password) { setMessage('Geli email-ka iyo password-ka.'); return; }
    if (mode === 'register' && name.trim().length < 2) { setMessage('Magaca geli (ugu yaraan 2 xaraf).'); return; }
    if (mode === 'register' && !consent) { setMessage('Fadlan oggolow shuruudaha si aad isu diiwaangeliso.'); return; }
    setBusy(true); setMessage('');
    try { if (mode === 'login') await auth.login(email, password, code); else await auth.register(name, email, password); }
    catch (e) { const status = e instanceof Error && 'status' in e ? Number((e as { status: number }).status) : 0; setMessage(status === 401 && e instanceof Error && e.message === 'two_factor_required' ? 'Akoonkan wuxuu u baahan yahay 2FA. Geli lambarka 6-da ah ee Authenticator-ka.' : status === 401 ? 'Email ama password waa khalad.' : status === 409 ? 'Email-kan horay ayaa loo isticmaalay.' : e instanceof Error ? e.message : 'Codsiga lama dhammaystirin.'); }
    finally { setBusy(false); }
  };
  const signOut = async () => { setBusy(true); try { await auth.logout(); } catch { setMessage('Ka bixitaanka lama dhammaystirin. Isku day mar kale.'); } finally { setBusy(false); } };
  if (auth.loading) return <View style={styles.loadingPage}><ActivityIndicator color={colors.green} /><Text style={styles.muted}>Akoonka ayaa la hubinayaa…</Text></View>;
  if (auth.user) return <ScrollView contentContainerStyle={styles.content}><Text style={styles.pageEyebrow}>GURMAD 24 · AKOON</Text><Text style={styles.pageTitle}>Akoonkayga</Text><View style={styles.profileCard}><View style={styles.profileMark}><Text style={styles.profileMarkText}>{auth.user.name.slice(0,1).toUpperCase()}</Text></View><Text style={styles.profileName}>{auth.user.name}</Text><Text style={styles.profileEmail}>{auth.user.email}</Text><Text style={styles.rolePill}>{auth.user.role === 'patient' ? 'BUKAAN' : auth.user.role.toUpperCase()}</Text></View><Pressable style={styles.primaryButton} onPress={openWeb}><Text style={styles.primaryButtonText}>Maamul xogtaada Web App-ka ↗</Text></Pressable>{auth.user.role === 'admin' ? <Pressable style={[styles.secondaryButton,{backgroundColor:'#176B62'}]} onPress={onOpenAdmin}><Text style={styles.secondaryText}>Eeg dashboard-ka maamulka (hordhac)</Text></Pressable> : null}{['hospital_admin','provider_admin'].includes(auth.user.role) ? <Pressable style={[styles.secondaryButton,{backgroundColor:'#176B62'}]} onPress={onOpenHospital}><Text style={styles.secondaryText}>Eeg dashboard-ka isbitaalka (hordhac)</Text></Pressable> : null}<Pressable style={styles.secondaryButton} onPress={signOut} disabled={busy}><Text style={styles.secondaryText}>{busy ? 'Sug…' : 'Ka bax'}</Text></Pressable></ScrollView>;
  return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled'><Text style={styles.pageEyebrow}>GURMAD 24 · AKOON</Text><Text style={styles.pageTitle}>{mode === 'login' ? 'Soo gal' : 'Akoon sameyso'}</Text><Text style={styles.pageSub}>Isticmaal akoonkaaga si aad u aragto codsiyada iyo kaararkaaga.</Text><View style={styles.authCard}>
    {mode === 'register' ? <TextInput value={name} onChangeText={setName} placeholder='Magaca oo buuxa' placeholderTextColor={colors.muted} style={styles.authInput} /> : null}
    <TextInput value={email} onChangeText={setEmail} placeholder='Email' placeholderTextColor={colors.muted} style={styles.authInput} keyboardType='email-address' autoCapitalize='none' autoComplete='email' />
    <TextInput value={password} onChangeText={setPassword} placeholder='Password' placeholderTextColor={colors.muted} style={styles.authInput} secureTextEntry autoCapitalize='none' />
    {mode === 'login' ? <TextInput value={code} onChangeText={setCode} placeholder='2FA code (haddii lagaa rabo)' placeholderTextColor={colors.muted} style={styles.authInput} keyboardType='number-pad' maxLength={12} /> : <Pressable style={styles.consentRow} onPress={() => setConsent(v => !v)}><Text style={styles.consentCheck}>{consent ? '☑' : '□'}</Text><Text style={styles.consentText}>Waan akhriyey oo waan oggolahay shuruudaha iyo ilaalinta xogta ee GURMAD 24.</Text></Pressable>}
    {message ? <Text style={styles.authMessage}>{message}</Text> : null}
    <Pressable style={[styles.primaryButton, busy && styles.disabledButton]} onPress={submit} disabled={busy}><Text style={styles.primaryButtonText}>{busy ? 'Sug…' : mode === 'login' ? 'Soo gal' : 'Isdiiwaangeli'}</Text></Pressable>
    <Pressable style={styles.modeButton} onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(''); }}><Text style={styles.modeText}>{mode === 'login' ? 'Akoon ma lihid? Isdiiwaangeli' : 'Akoon ma leedahay? Soo gal'}</Text></Pressable>
  </View><Text style={styles.authHint}>Akoonnada isbitaallada iyo shaqaalaha waxaa laga diiwaangeliyaa Web App-ka, kadibna maamulka ayaa xaqiijiya.</Text></ScrollView>;
}
type ActivityOrder = { id: string; code?: string; status: string; createdAt: string; cardSnapshot?: { name?: string; hospitalName?: string }; cardState?: string; validUntil?: string };
type ActivityAppointment = { id: string; orgName?: string; category: string; preferredDate: string; status: string; createdAt: string; orgNote?: string };
type ActivityVisit = { id: string; hospitalName?: string; doctorName?: string; specialty?: string; visitDate: string; service?: string; summary?: string; followUpDate?: string };
function ActivityPage({ auth, onLogin, onRefreshAuth }: { auth: ReturnType<typeof useAuth>; onLogin: () => void; onRefreshAuth: () => void }) {
  const [orders, setOrders] = useState<ActivityOrder[]>([]); const [appointments, setAppointments] = useState<ActivityAppointment[]>([]); const [visits, setVisits] = useState<ActivityVisit[]>([]);
  const [loading, setLoading] = useState(false); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState('');
  const load = async () => { if (!auth.user) return; setLoading(true); setError('');
    try { const [o, a, v] = await Promise.all([apiRequest<{ orders: ActivityOrder[] }>('/api/orders'), apiRequest<{ appointments: ActivityAppointment[] }>('/api/appointments'), apiRequest<{ visits: ActivityVisit[] }>('/api/visits')]); setOrders(o.orders || []); setAppointments(a.appointments || []); setVisits(v.visits || []); }
    catch (e) { setError(e instanceof Error && 'status' in e && Number((e as {status:number}).status) === 401 ? 'Fadlan mar kale soo gal si aad u aragto xogtaada.' : 'Hawlahaaga hadda lama soo dejin karo. Hubi internet-ka oo isku day mar kale.'); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, [auth.user?.id]);
  const date = (value?: string) => { if (!value) return 'Taariikh lama hayo'; const d = new Date(value.length === 10 ? value + 'T12:00:00' : value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('so-SO', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const label = (s: string) => ({ requested: 'La diray', confirmed: 'La xaqiijiyey', cancelled: 'La joojiyey', completed: 'La dhammeeyey', paid_sandbox: 'Lacag tijaabo ah', active: 'Firfircoon', expired: 'Dhacay', used: 'La isticmaalay' } as Record<string,string>)[s] || s.replace(/_/g, ' ');
  if (!auth.user) return <ScrollView contentContainerStyle={styles.content}><Text style={styles.pageEyebrow}>GURMAD 24 · BUKAANKA</Text><Text style={styles.pageTitle}>Hawlahayga</Text><View style={styles.emptyCard}><Text style={styles.emptyIcon}>◷</Text><Text style={styles.emptyTitle}>Soo gal si aad u aragto xogtaada</Text><Text style={styles.emptyCopy}>Ballamaha, kaararka la iibsaday iyo kaararka booqashada waxaa arki kara akoonka leh oo keliya.</Text><Pressable style={styles.primaryButton} onPress={onLogin}><Text style={styles.primaryButtonText}>Soo gal / Isdiiwaangeli</Text></Pressable></View></ScrollView>;
  return <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.green} />}><Text style={styles.pageEyebrow}>GURMAD 24 · BUKAANKA</Text><Text style={styles.pageTitle}>Hawlahayga</Text><Text style={styles.pageSub}>Xogtaada gaarka ah; qof kale ma arki karo.</Text>
    <View style={styles.activityStats}><View style={styles.activityStat}><Text style={styles.activityNumber}>{appointments.length}</Text><Text style={styles.activityCaption}>Ballamo</Text></View><View style={styles.activityStat}><Text style={styles.activityNumber}>{orders.length}</Text><Text style={styles.activityCaption}>Kaarar</Text></View><View style={styles.activityStat}><Text style={styles.activityNumber}>{visits.length}</Text><Text style={styles.activityCaption}>Booqashooyin</Text></View></View>
    {error ? <View style={styles.notice}><Text style={styles.noticeIcon}>!</Text><View style={{flex:1}}><Text style={styles.noticeCopy}>{error}</Text><Pressable onPress={error.includes('soo gal') ? onRefreshAuth : load}><Text style={styles.action}>Mar kale isku day</Text></Pressable></View></View> : null}
    {loading ? <ActivityIndicator color={colors.green} /> : null}
    <Heading title='Ballamahayga' />{appointments.length ? appointments.map(a => <View key={a.id} style={styles.activityCard}><View style={styles.activityRow}><Text style={styles.activityTitle}>{a.orgName || 'Xarun caafimaad'}</Text><Text style={styles.activityStatus}>{label(a.status)}</Text></View><Text style={styles.activityMeta}>{a.category.replace(/_/g, ' ')} · Taariikh la codsaday: {date(a.preferredDate)}</Text>{a.orgNote ? <Text style={styles.activityNote}>Jawaabta xarunta: {a.orgNote}</Text> : null}</View>) : !loading ? <Text style={styles.activityEmpty}>Weli ma lihid ballamo.</Text> : null}
    <Heading title='Kaararkayga' />{orders.length ? orders.map(o => <View key={o.id} style={styles.activityCard}><View style={styles.activityRow}><Text style={styles.activityTitle}>{o.cardSnapshot?.name || 'Kaarka caafimaadka'}</Text><Text style={styles.activityStatus}>{label(o.cardState || o.status)}</Text></View><Text style={styles.activityMeta}>{o.cardSnapshot?.hospitalName || 'Isbitaal'} · {date(o.createdAt)}</Text><Text style={styles.activityCode}>Lambarka dalabka: {o.code || o.id}</Text>{o.validUntil ? <Text style={styles.activityMeta}>Wuxuu dhacayaa: {date(o.validUntil)}</Text> : null}</View>) : !loading ? <Text style={styles.activityEmpty}>Weli ma iibsan kaar.</Text> : null}
    <Heading title='Kaararka booqashada' />{visits.length ? visits.map(v => <View key={v.id} style={styles.activityCard}><Text style={styles.activityTitle}>{v.hospitalName || 'Isbitaal'}</Text><Text style={styles.activityMeta}>{v.doctorName || 'Dhakhtar'}{v.specialty ? ' · ' + v.specialty : ''} · {date(v.visitDate)}</Text>{v.service ? <Text style={styles.activityNote}>Adeeg: {v.service}</Text> : null}{v.summary ? <Text style={styles.activityNote}>{v.summary}</Text> : null}{v.followUpDate ? <Text style={styles.activityMeta}>Ballanta xigta: {date(v.followUpDate)}</Text> : null}</View>) : !loading ? <Text style={styles.activityEmpty}>Weli laguma darin kaar booqasho.</Text> : null}
    <Text style={styles.activityFoot}>Xogta waxaa si toos ah looga akhriyaa akoonkaaga GURMAD 24. Lacag-bixinta hadda waa tijaabo (sandbox).</Text></ScrollView>;
}
function SimplePage({ title, subtitle, onOpenWeb }: { title: string; subtitle: string; onOpenWeb: () => void }) {
  return <ScrollView contentContainerStyle={styles.content}><Text style={styles.pageEyebrow}>GURMAD 24</Text><Text style={styles.pageTitle}>{title}</Text><Text style={styles.pageSub}>{subtitle}</Text><View style={styles.emptyCard}><Text style={styles.emptyIcon}>◷</Text><Text style={styles.emptyTitle}>Qaybtan wali waa la dhisayaa</Text><Text style={styles.emptyCopy}>Adeegyada hadda shaqaynaya ka isticmaal Web App-ka isku xiran.</Text><Pressable style={styles.secondaryButton} onPress={onOpenWeb}><Text style={styles.secondaryText}>Fur Web App-ka ↗</Text></Pressable></View></ScrollView>;
}
function WebPage({ path }: { path: string }) {
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  return <View style={styles.webPage}><View style={styles.webHeader}><View><Text style={styles.webTitle}>GURMAD 24 Web App</Text><Text style={styles.webSub}>Isla website-ka iyo isla backend-ka</Text></View><Pressable style={styles.refresh} onPress={() => { setFailed(false); setVersion(v => v + 1); }}><Text style={styles.refreshText}>Cusboonaysii</Text></Pressable></View>
    {failed ? <View style={styles.webFailed}><Text style={styles.emptyTitle}>Web App-ka lama xiriirin karo</Text><Text style={styles.emptyCopy}>Hubi internet-ka, kadib mar kale isku day.</Text><Pressable style={styles.secondaryButton} onPress={() => Linking.openURL('https://gurmad24.onrender.com')}><Text style={styles.secondaryText}>Ku fur browser-ka ↗</Text></Pressable></View> :
      <WebView key={version} style={styles.webView} source={{ uri: 'https://gurmad24.onrender.com' + path }} javaScriptEnabled domStorageEnabled sharedCookiesEnabled thirdPartyCookiesEnabled setSupportMultipleWindows={false} onError={() => setFailed(true)} startInLoadingState renderLoading={() => <View style={styles.webLoading}><ActivityIndicator size="large" color={colors.green} /><Text style={styles.muted}>Web App-ka ayaa furmaya…</Text></View>} />}
  </View>;
}
export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [webPath, setWebPath] = useState('/');
  const [splash, setSplash] = useState(true);
  const data = useHospitals();
  const auth = useAuth();
  useEffect(() => { const t = setTimeout(() => setSplash(false), 900); return () => clearTimeout(t); }, []);
  if (splash) return <><StatusBar barStyle="light-content" /><Splash /></>;
  const openWeb = () => { setWebPath('/'); setTab('web'); };
  const openMap = () => { setWebPath('/#/map'); setTab('web'); };
  return <SafeAreaView style={styles.safe}><StatusBar barStyle="dark-content" /><View style={styles.shell}>
    {tab === 'home' ? <Home data={data} openHospitals={() => setTab('hospitals')} openWeb={openWeb} openMap={openMap} /> : null}
    {tab === 'hospitals' ? <Hospitals data={data} /> : null}
    {tab === 'activity' ? <ActivityPage auth={auth} onLogin={() => setTab('account')} onRefreshAuth={() => auth.refresh()} /> : null}
    {tab === 'account' ? <AccountPage auth={auth} openWeb={openWeb} onOpenAdmin={() => setTab('adminPreview')} onOpenHospital={() => setTab('hospitalPreview')} /> : null}
    {tab === 'adminPreview' && auth.user?.role === 'admin' ? <AdminDashboard onBack={() => setTab('account')} /> : null}
    {tab === 'hospitalPreview' && auth.user && ['hospital_admin','provider_admin'].includes(auth.user.role) ? <HospitalDashboard onBack={() => setTab('account')} role={auth.user.role} /> : null}
    {tab === 'web' ? <WebPage path={webPath} /> : null}
    <View style={styles.bottom}>{tabs.map(t => <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)} accessibilityRole="button" accessibilityState={{ selected: tab === t.key }}><Text style={[styles.tabIcon, tab === t.key && styles.tabActive]}>{t.icon}</Text><Text style={[styles.tabLabel, tab === t.key && styles.tabActive]}>{t.label}</Text>{tab === t.key ? <View style={styles.indicator} /> : null}</Pressable>)}</View>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},shell:{flex:1,backgroundColor:colors.background},content:{padding:18,paddingBottom:26},
  splash:{flex:1,backgroundColor:'#06172D',alignItems:'center',justifyContent:'space-between',paddingHorizontal:25,paddingTop:62,paddingBottom:35,overflow:'hidden'},splashGlow:{position:'absolute',width:310,height:310,borderRadius:155,backgroundColor:'#103B5A',opacity:0.65,top:'28%',right:-145,borderWidth:1,borderColor:'#1B5A69'},splashTop:{width:'100%',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},splashTopText:{fontSize:9,color:'#91AFC8',fontWeight:'900',letterSpacing:1.2},splashLive:{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'#28566B',borderRadius:20,paddingHorizontal:9,paddingVertical:6},splashDot:{width:6,height:6,borderRadius:3,backgroundColor:'#39C878',marginRight:6},splashLiveText:{fontSize:8,color:'#C4D8E6',fontWeight:'900',letterSpacing:0.7},splashCenter:{alignItems:'center',justifyContent:'center',width:'100%'},splashMarkFrame:{padding:10,borderRadius:32,backgroundColor:'#0C2947',borderWidth:1,borderColor:'#28536D'},mark:{width:82,height:82,borderRadius:25,backgroundColor:'#174B7A',alignItems:'center',justifyContent:'center',overflow:'hidden',borderWidth:1,borderColor:'#47749D'},markSmall:{width:45,height:45,borderRadius:14},markCross:{fontSize:49,color:'#FFFFFF',fontWeight:'900'},markCrossSmall:{fontSize:26},markPulse:{position:'absolute',width:57,height:4,borderRadius:4,backgroundColor:'#39C878',transform:[{rotate:'-12deg'}]},
  splashName:{fontSize:31,fontWeight:'900',color:'#FFFFFF',letterSpacing:2,marginTop:25},greenText:{color:'#39C878'},splashCaption:{color:'#D6E5F5',fontSize:12,marginTop:9,letterSpacing:0.2},splashRule:{width:82,height:3,backgroundColor:'#1B4961',borderRadius:3,marginTop:27,overflow:'hidden'},splashRuleFill:{width:48,height:3,backgroundColor:'#39C878',borderRadius:3},splashPromise:{color:'#8EAFC6',fontSize:8,fontWeight:'800',letterSpacing:1.2,marginTop:14,textAlign:'center'},splashBottom:{width:'100%',alignItems:'center',gap:7},splashFoot:{color:'#A8BED8',fontSize:9,fontWeight:'900',letterSpacing:1.5},splashVersion:{color:'#57748C',fontSize:8,fontWeight:'700',letterSpacing:1.4},
  top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},brandRow:{flexDirection:'row',alignItems:'center'},brand:{fontSize:18,fontWeight:'900',color:colors.navy},brandSub:{fontSize:10,color:colors.muted,marginTop:2},webChip:{backgroundColor:'#FFFFFF',borderWidth:1,borderColor:colors.border,borderRadius:12,paddingHorizontal:12,paddingVertical:9},webChipText:{fontSize:10,fontWeight:'900',color:colors.navy},
  location:{flexDirection:'row',alignItems:'center',marginBottom:15},
  statsRow:{flexDirection:'row',gap:8,marginBottom:15},statCard:{flex:1,backgroundColor:'#FFFFFF',borderRadius:13,borderWidth:1,borderColor:'#E7EDF2',paddingVertical:12,paddingHorizontal:9},statValue:{fontSize:20,fontWeight:'900',color:colors.navy},statLabel:{fontSize:8,fontWeight:'700',color:colors.muted,marginTop:3},pin:{fontSize:23,color:colors.green,marginRight:9},locationLabel:{fontSize:9,color:colors.muted,fontWeight:'900',letterSpacing:1},locationName:{fontSize:12,color:colors.ink,fontWeight:'800',marginTop:3},
  heroV40:{backgroundColor:'#06172D',borderRadius:28,padding:20,minHeight:405,overflow:'hidden',marginBottom:18,borderWidth:1,borderColor:'#174B67'},
  heroV40Glow:{position:'absolute',width:290,height:290,borderRadius:145,backgroundColor:'#0C5260',opacity:0.48,right:-120,top:-80},
  heroV40Top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  heroV40Tag:{flexDirection:'row',alignItems:'center',backgroundColor:'#102E46',borderWidth:1,borderColor:'#24536A',borderRadius:20,paddingHorizontal:10,paddingVertical:7},
  heroV40Dot:{width:7,height:7,borderRadius:4,backgroundColor:'#2BE0A2',marginRight:7},
  heroV40TagText:{fontSize:8,fontWeight:'900',letterSpacing:0.7,color:'#D1E6F1'},
  heroV40Edition:{fontSize:9,fontWeight:'900',letterSpacing:1.4,color:'#53D7C3'},
  heroV40Orbit:{position:'absolute',width:122,height:122,borderRadius:61,borderWidth:1.5,borderColor:'#38D8C0',right:24,top:67},
  heroV40Emblem:{position:'absolute',right:49,top:91,width:72,height:72,borderRadius:24,backgroundColor:'#123C59',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#4AB8B1'},
  heroV40EmblemInner:{width:53,height:53,borderRadius:18,backgroundColor:'#1B6C73',alignItems:'center',justifyContent:'center'},
  heroV40Cross:{fontSize:35,fontWeight:'900',color:'#FFFFFF'},
  heroV40EmblemHalo:{position:'absolute',width:9,height:9,borderRadius:5,backgroundColor:'#FF6B6B',right:-3,top:4,borderWidth:2,borderColor:'#06172D'},
  heroV40Kicker:{fontSize:9,fontWeight:'900',letterSpacing:1.3,color:'#51D9C1',marginTop:47},
  heroV40Title:{fontSize:28,lineHeight:35,fontWeight:'900',color:'#FFFFFF',marginTop:12,maxWidth:'88%'},
  heroV40Copy:{fontSize:11,lineHeight:18,color:'#C7DCE8',marginTop:10,maxWidth:'91%'},
  heroV40Actions:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:12,marginTop:19},
  heroV40Primary:{backgroundColor:'#20C997',borderRadius:13,paddingHorizontal:16,paddingVertical:13},
  heroV40PrimaryText:{fontSize:11,fontWeight:'900',color:'#052C31'},
  heroV40Trust:{flexDirection:'row',alignItems:'center'},
  heroV40TrustMark:{fontSize:12,fontWeight:'900',color:'#54E2B1',marginRight:5},
  heroV40TrustText:{fontSize:9,fontWeight:'800',color:'#C7DCE8'},
  heroV40BottomLine:{position:'absolute',left:20,right:20,bottom:15,borderTopWidth:1,borderTopColor:'#1D4057',paddingTop:10,flexDirection:'row',justifyContent:'space-between'},
  heroV40BottomText:{fontSize:7,fontWeight:'900',letterSpacing:0.8,color:'#82A8BC'},
  hero:{backgroundColor:'#071B35',borderRadius:25,padding:20,minHeight:235,overflow:'hidden',marginBottom:15},orb:{position:'absolute',width:200,height:200,borderRadius:100,backgroundColor:'#174775',right:-75,top:-55},eyebrow:{fontSize:9,color:'#C5D9ED',fontWeight:'900',letterSpacing:1},heroTitle:{fontSize:27,lineHeight:34,color:'#FFFFFF',fontWeight:'900',marginTop:17},heroCopy:{fontSize:11,lineHeight:18,color:'#D6E4F2',marginTop:8,maxWidth:'84%'},heroButton:{alignSelf:'flex-start',backgroundColor:colors.green,borderRadius:11,paddingHorizontal:14,paddingVertical:11,marginTop:16},heroButtonText:{fontSize:11,color:'#FFFFFF',fontWeight:'900'},heroBadge:{position:'absolute',right:16,bottom:15,opacity:0.75},
  notice:{flexDirection:'row',alignItems:'flex-start',backgroundColor:'#FFF7E5',borderWidth:1,borderColor:'#F0DDAF',borderRadius:14,padding:12,marginBottom:21},noticeIcon:{width:25,height:25,textAlign:'center',textAlignVertical:'center',overflow:'hidden',borderRadius:8,backgroundColor:'#F3E5BF',color:'#805B13',fontWeight:'900',marginRight:10},noticeTitle:{fontSize:11,fontWeight:'900',color:'#805B13',marginBottom:3},noticeCopy:{fontSize:10,lineHeight:16,color:'#6B571F'},
  headingRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:11},sectionTitle:{fontSize:16,fontWeight:'900',color:colors.ink},action:{fontSize:10,fontWeight:'900',color:colors.navy},
  grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',marginBottom:19},quickCard:{width:'48.3%',minHeight:120,backgroundColor:'#FFFFFF',borderRadius:16,borderWidth:1,borderColor:colors.border,padding:12,marginBottom:10},quickIcon:{fontSize:25,color:colors.navy,marginBottom:8},quickIconGreen:{fontSize:25,color:'#238C48',marginBottom:8},quickIconPurple:{fontSize:23,color:'#7455B8',marginBottom:8},quickIconOrange:{fontSize:25,color:'#C46A22',marginBottom:8},quickTitle:{fontSize:12,fontWeight:'900',color:colors.ink},quickSub:{fontSize:9,lineHeight:14,color:colors.muted,marginTop:4},
  hospitalCard:{backgroundColor:'#FFFFFF',borderWidth:1,borderColor:colors.border,borderRadius:17,padding:13,marginBottom:10},hospitalTop:{flexDirection:'row',alignItems:'center'},hospitalMark:{width:38,height:38,borderRadius:12,backgroundColor:'#E8F1FB',alignItems:'center',justifyContent:'center'},hospitalMarkText:{fontSize:21,color:colors.navy},hospitalTitle:{flex:1,marginLeft:9},hospitalName:{fontSize:12,fontWeight:'900',color:colors.ink},hospitalArea:{fontSize:9,color:colors.muted,marginTop:3},pill:{fontSize:8,fontWeight:'900',overflow:'hidden',borderRadius:20,paddingHorizontal:8,paddingVertical:5},pillDraft:{backgroundColor:'#FFF4D9',color:'#805B13'},pillLive:{backgroundColor:'#E7F6EC',color:'#176B38'},hospitalDescription:{fontSize:10,lineHeight:16,color:colors.ink,marginTop:11},verificationNote:{fontSize:9,lineHeight:14,color:'#8A5B18',marginTop:6},sourceText:{fontSize:8,color:colors.muted,marginTop:4},address:{fontSize:9,lineHeight:15,color:colors.muted,marginTop:7,backgroundColor:'#F7F9FC',padding:8,borderRadius:8},callButton:{alignSelf:'stretch',backgroundColor:'#E7F6EC',borderRadius:11,paddingHorizontal:11,paddingVertical:12,marginTop:10,alignItems:'center'},callText:{fontSize:11,fontWeight:'900',color:'#176B38'},
  webBanner:{flexDirection:'row',alignItems:'center',backgroundColor:'#EAF2FC',borderRadius:16,padding:13,marginTop:5},webBannerIcon:{fontSize:22,color:colors.navy,marginRight:12},webBannerTitle:{fontSize:11,fontWeight:'900',color:colors.navy},webBannerSub:{fontSize:9,color:colors.muted,marginTop:4},bannerArrow:{fontSize:23,color:colors.navy,marginLeft:8},
  consentRow:{flexDirection:'row',alignItems:'center',marginVertical:8},consentCheck:{fontSize:20,color:colors.green,marginRight:9},authCard:{backgroundColor:'#FFFFFF',borderWidth:1,borderColor:colors.border,borderRadius:18,padding:16,marginTop:8},authInput:{backgroundColor:'#F8FAFC',borderWidth:1,borderColor:colors.border,borderRadius:11,paddingHorizontal:13,paddingVertical:12,fontSize:12,color:colors.ink,marginBottom:11},consentText:{fontSize:9,lineHeight:15,color:colors.muted,marginVertical:7},authMessage:{fontSize:10,lineHeight:15,color:'#9B3D2E',marginBottom:10},primaryButton:{backgroundColor:colors.navy,borderRadius:11,paddingHorizontal:15,paddingVertical:13,marginTop:8,alignItems:'center'},primaryButtonText:{fontSize:11,fontWeight:'900',color:'#FFFFFF'},modeButton:{padding:12,alignItems:'center'},modeText:{fontSize:10,color:colors.navy,fontWeight:'800'},authHint:{fontSize:9,lineHeight:15,color:colors.muted,marginTop:14},disabledButton:{opacity:0.55},loadingPage:{flex:1,alignItems:'center',justifyContent:'center'},profileCard:{alignItems:'center',backgroundColor:'#FFFFFF',borderWidth:1,borderColor:colors.border,borderRadius:18,padding:22,marginVertical:16},profileMark:{width:58,height:58,borderRadius:29,backgroundColor:'#E8F1FB',alignItems:'center',justifyContent:'center'},profileMarkText:{fontSize:24,fontWeight:'900',color:colors.navy},profileName:{fontSize:16,fontWeight:'900',color:colors.ink,marginTop:12},profileEmail:{fontSize:10,color:colors.muted,marginTop:4},rolePill:{fontSize:8,fontWeight:'900',color:'#176B38',backgroundColor:'#E7F6EC',borderRadius:20,paddingHorizontal:10,paddingVertical:6,marginTop:12},searchInput:{backgroundColor:'#FFFFFF',borderWidth:1,borderColor:colors.border,borderRadius:13,paddingHorizontal:14,paddingVertical:12,fontSize:12,color:colors.ink,marginBottom:14},pageEyebrow:{fontSize:9,color:colors.green,fontWeight:'900',letterSpacing:1.2,marginTop:12},pageTitle:{fontSize:27,fontWeight:'900',color:colors.navy,marginTop:6},pageSub:{fontSize:11,lineHeight:17,color:colors.muted,marginTop:5,marginBottom:18},emptyCard:{alignItems:'center',backgroundColor:'#FFFFFF',borderWidth:1,borderColor:colors.border,borderRadius:18,padding:24,marginTop:16},emptyIcon:{fontSize:35,color:colors.navy,marginBottom:12},emptyTitle:{fontSize:14,fontWeight:'900',color:colors.ink,textAlign:'center'},emptyCopy:{fontSize:10,lineHeight:16,color:colors.muted,textAlign:'center',marginTop:7},secondaryButton:{backgroundColor:colors.navy,borderRadius:10,paddingHorizontal:15,paddingVertical:11,marginTop:16},secondaryText:{fontSize:10,fontWeight:'900',color:'#FFFFFF'},
  activityStats:{flexDirection:'row',gap:8,marginBottom:18},
  activityStat:{flex:1,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:colors.border,borderRadius:13,padding:12,alignItems:'center'},
  activityNumber:{fontSize:20,fontWeight:'900',color:colors.navy},
  activityCaption:{fontSize:9,fontWeight:'800',color:colors.muted,marginTop:4},
  activityCard:{backgroundColor:'#FFFFFF',borderWidth:1,borderColor:colors.border,borderRadius:15,padding:13,marginBottom:10},
  activityRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  activityTitle:{flex:1,fontSize:11,fontWeight:'900',color:colors.ink},
  activityStatus:{fontSize:8,fontWeight:'900',color:'#176B38',backgroundColor:'#E7F6EC',borderRadius:20,paddingHorizontal:8,paddingVertical:5,overflow:'hidden'},
  activityMeta:{fontSize:9,color:colors.muted,marginTop:6},
  activityNote:{fontSize:9,lineHeight:14,color:colors.ink,marginTop:7},
  activityEmpty:{fontSize:10,color:colors.muted,textAlign:'center',paddingVertical:12},
  activityCode:{fontSize:9,fontWeight:'900',color:colors.navy,marginTop:5},
  activityFoot:{fontSize:9,lineHeight:15,color:colors.muted,textAlign:'center',marginTop:12},
  webPage:{flex:1,backgroundColor:'#FFFFFF'},webHeader:{padding:13,borderBottomWidth:1,borderBottomColor:colors.border,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},webTitle:{fontSize:12,fontWeight:'900',color:colors.navy},webSub:{fontSize:9,color:colors.muted,marginTop:3},refresh:{backgroundColor:'#E8F1FB',padding:9,borderRadius:9},refreshText:{fontSize:9,color:colors.navy,fontWeight:'900'},webView:{flex:1,backgroundColor:'#FFFFFF'},webLoading:{flex:1,alignItems:'center',justifyContent:'center'},muted:{fontSize:10,color:colors.muted,marginTop:9},webFailed:{flex:1,alignItems:'center',justifyContent:'center',padding:24},
  bottom:{flexDirection:'row',backgroundColor:'#FFFFFF',borderTopWidth:1,borderTopColor:colors.border,paddingTop:6,paddingBottom:5},tab:{flex:1,minHeight:49,alignItems:'center',justifyContent:'center'},tabIcon:{fontSize:20,color:'#9AAABD',lineHeight:23},tabLabel:{fontSize:8,color:'#9AAABD',fontWeight:'700',marginTop:2},tabActive:{color:colors.navy,fontWeight:'900'},indicator:{position:'absolute',top:-7,width:17,height:3,borderRadius:2,backgroundColor:colors.green},footer:{fontSize:9,color:colors.muted,textAlign:'center',marginTop:16,marginBottom:5},
});
