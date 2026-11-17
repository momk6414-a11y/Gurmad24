import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from './src/theme/tokens';

const services = [
  { icon: '✚', title: 'Isbitaallo', detail: 'Raadi xarumaha caafimaadka', tone: 'blue' },
  { icon: '⌖', title: 'Khariidad', detail: 'Goobaha adeegyada kuu dhow', tone: 'green' },
  { icon: '＋', title: 'Adeeg caafimaad', detail: 'Eeg adeegyada la heli karo', tone: 'purple' },
  { icon: '▣', title: 'Tikidyo', detail: 'Codsiyada iyo safarrada', tone: 'orange' },
] as const;

const tabs = [
  { key: 'home', label: 'Hoyga', icon: '⌂' },
  { key: 'services', label: 'Adeegyada', icon: '▦' },
  { key: 'activity', label: 'Hawlahayga', icon: '◷' },
  { key: 'profile', label: 'Akoon', icon: '○' },
] as const;

type TabKey = (typeof tabs)[number]['key'];
type ServiceTone = (typeof services)[number]['tone'];

const iconStyles: Record<ServiceTone, StyleProp<ViewStyle>> = {
  blue: styles.icon_blue,
  green: styles.icon_green,
  purple: styles.icon_purple,
  orange: styles.icon_orange,
};
const iconTextStyles: Record<ServiceTone, object> = {
  blue: styles.iconText_blue,
  green: styles.iconText_green,
  purple: styles.iconText_purple,
  orange: styles.iconText_orange,
};

function PrototypeNotice({ feature }: { feature: string }) {
  Alert.alert(
    feature,
    'Qaybtan wali waa la dhisayaa. Xog ama adeeg dhab ah laguma xaqiijin noocan tijaabada ah.',
    [{ text: 'Hagaag' }],
  );
}

function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.pageHeading}>
      <Text style={styles.pageTitle}>{title}</Text>
      <Text style={styles.pageSubtitle}>{subtitle}</Text>
    </View>
  );
}

function HomeScreen({ onOpenServices }: { onOpenServices: () => void }) {
  return (
    <>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}><Text style={styles.logoPlus}>✚</Text></View>
          <View>
            <Text style={styles.brand}>GURMAD <Text style={styles.brandNumber}>24</Text></Text>
            <Text style={styles.brandCaption}>Caafimaad iyo gargaar</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Ogeysiisyada" style={styles.notification} onPress={() => PrototypeNotice({ feature: 'Ogeysiisyada' })}>
          <Text style={styles.notificationIcon}>♧</Text>
        </Pressable>
      </View>

      <View style={styles.locationRow}>
        <Text style={styles.locationPin}>⌖</Text>
        <Text style={styles.locationLabel}>GOOBTAADA</Text>
        <Text style={styles.locationValue}>Gaalkacyo</Text>
        <Text style={styles.locationChevron}>⌄</Text>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <Text style={styles.heroEyebrow}>KU SOO DHAWOOW GURMAD 24</Text>
        <Text style={styles.heroTitle}>Caafimaadkaaga,{'\n'}mudnaantayada.</Text>
        <Text style={styles.heroText}>Hal meel ka hel macluumaadka adeegyada caafimaadka.</Text>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]} onPress={() => PrototypeNotice({ feature: 'Codso gargaar' })}>
          <Text style={styles.heroButtonText}>Codso gargaar</Text>
          <Text style={styles.heroButtonArrow}>→</Text>
        </Pressable>
        <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>G24</Text></View>
      </View>

      <View style={styles.notice}>
        <View style={styles.noticeIconWrap}><Text style={styles.noticeIcon}>i</Text></View>
        <View style={styles.noticeCopy}>
          <Text style={styles.noticeTitle}>Nooca tijaabada</Text>
          <Text style={styles.noticeText}>Adeegyada gurmadka wali waa tijaabo. Ha u adeegsan xaalad degdeg ah oo dhab ah.</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Adeegyadeenna</Text>
          <Text style={styles.sectionSubtitle}>Wax kasta oo aad u baahan tahay</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onOpenServices}><Text style={styles.seeAll}>Dhammaan  ›</Text></Pressable>
      </View>
      <View style={styles.serviceGrid}>
        {services.map((service) => (
          <Pressable key={service.title} accessibilityRole="button" style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]} onPress={() => PrototypeNotice({ feature: service.title })}>
            <View style={[styles.serviceIcon, iconStyles[service.tone]]}>
              <Text style={[styles.serviceIconText, iconTextStyles[service.tone]]}>{service.icon}</Text>
            </View>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <Text style={styles.serviceDetail}>{service.detail}</Text>
            <Text style={styles.serviceArrow}>↗</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.supportCard}>
        <View style={styles.supportIcon}><Text style={styles.supportIconText}>♥</Text></View>
        <View style={styles.supportCopy}>
          <Text style={styles.supportTitle}>Ma u baahan tahay caawimaad?</Text>
          <Text style={styles.supportText}>Wax badan ka ogow GURMAD 24.</Text>
        </View>
        <Text style={styles.supportArrow}>›</Text>
      </View>
    </>
  );
}

function ServicesScreen() {
  return (
    <>
      <PageHeading title="Adeegyada" subtitle="Qaybaha laga heli doono GURMAD 24." />
      <View style={styles.notice}>
        <View style={styles.noticeIconWrap}><Text style={styles.noticeIcon}>i</Text></View>
        <View style={styles.noticeCopy}>
          <Text style={styles.noticeTitle}>Adeegyada wali waa tijaabo</Text>
          <Text style={styles.noticeText}>Xogta xarumaha, qiimaha, helitaanka iyo adeeg-bixiyeyaasha lama xaqiijin. Halkan laguma soo bandhigayo xog aan la hubin.</Text>
        </View>
      </View>
      {services.map((service) => (
        <View key={service.title} style={styles.listCard}>
          <View style={[styles.serviceIcon, iconStyles[service.tone]]}>
            <Text style={[styles.serviceIconText, iconTextStyles[service.tone]]}>{service.icon}</Text>
          </View>
          <View style={styles.listCopy}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <Text style={styles.serviceDetail}>{service.detail}</Text>
            <Text style={styles.comingSoon}>Diyaar-garow ayaa socda</Text>
          </View>
        </View>
      ))}
    </>
  );
}

function ActivityScreen() {
  return (
    <>
      <PageHeading title="Hawlahayga" subtitle="La soco codsiyadaada iyo tikidyada." />
      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>◷</Text></View>
        <Text style={styles.emptyTitle}>Weli wax codsi ah ma jiro</Text>
        <Text style={styles.emptyText}>Marka nidaamka codsiyada la hawlgeliyo, xaaladda codsiyadaada halkan ayay ka muuqan doontaa.</Text>
        <Text style={styles.comingSoon}>Qaybtan wali waa tijaabo</Text>
      </View>
    </>
  );
}

function ProfileScreen() {
  return (
    <>
      <PageHeading title="Akoonkayga" subtitle="Macluumaadka isticmaalaha." />
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>G24</Text></View>
        <Text style={styles.emptyTitle}>Marti</Text>
        <Text style={styles.emptyText}>Ma jiro akoon lagu soo galay.</Text>
      </View>
      <View style={styles.listCard}>
        <View style={styles.profileRowIcon}><Text style={styles.profileRowIconText}>⚙</Text></View>
        <View style={styles.listCopy}>
          <Text style={styles.serviceTitle}>Dejinta akoonka</Text>
          <Text style={styles.serviceDetail}>Gelitaanka iyo xogta shakhsiga</Text>
        </View>
        <Text style={styles.comingSoon}>Dhawaan</Text>
      </View>
      <View style={styles.listCard}>
        <View style={styles.profileRowIcon}><Text style={styles.profileRowIconText}>?</Text></View>
        <View style={styles.listCopy}>
          <Text style={styles.serviceTitle}>Ku saabsan GURMAD 24</Text>
          <Text style={styles.serviceDetail}>Macluumaad iyo taageero</Text>
        </View>
        <Text style={styles.comingSoon}>Dhawaan</Text>
      </View>
    </>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.screen}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {activeTab === 'home' ? <HomeScreen onOpenServices={() => setActiveTab('services')} /> : null}
          {activeTab === 'services' ? <ServicesScreen /> : null}
          {activeTab === 'activity' ? <ActivityScreen /> : null}
          {activeTab === 'profile' ? <ProfileScreen /> : null}
          <Text style={styles.footer}>GURMAD 24  ·  Nooca tijaabada</Text>
        </ScrollView>
        <View style={styles.bottomBar}>
          {tabs.map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <Pressable key={tab.key} accessibilityRole="button" accessibilityState={{ selected }} style={styles.tab} onPress={() => setActiveTab(tab.key)}>
                <Text style={[styles.tabIcon, selected && styles.tabIconActive]}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{tab.label}</Text>
                {selected ? <View style={styles.activeIndicator} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoMark: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  logoPlus: { color: colors.white, fontSize: 25, fontWeight: '900' },
  brand: { color: colors.navy, fontSize: 19, fontWeight: '900', letterSpacing: 0.5 },
  brandNumber: { color: colors.green },
  brandCaption: { color: colors.muted, fontSize: 11, marginTop: 2 },
  notification: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  notificationIcon: { color: colors.navy, fontSize: 23 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  locationPin: { color: colors.green, fontSize: 18, marginRight: 6 },
  locationLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginRight: 8 },
  locationValue: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  locationChevron: { color: colors.muted, fontSize: 16, marginLeft: 5 },
  hero: { overflow: 'hidden', position: 'relative', backgroundColor: colors.navy, borderRadius: 24, padding: spacing.lg, minHeight: 222, marginBottom: spacing.md },
  heroGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#2456A0', right: -70, top: 20, opacity: 0.8 },
  heroEyebrow: { color: '#C8D9F3', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  heroTitle: { color: colors.white, fontSize: 27, lineHeight: 34, fontWeight: '900', marginTop: 10 },
  heroText: { color: '#D7E4F7', fontSize: 12, lineHeight: 19, marginTop: 7, maxWidth: '82%' },
  heroButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.green, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 15, marginTop: 16 },
  heroButtonText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  heroButtonArrow: { color: colors.white, fontSize: 18, marginLeft: 12, marginTop: -2 },
  heroBadge: { position: 'absolute', right: 18, bottom: 24, width: 55, height: 55, borderRadius: 18, borderWidth: 1, borderColor: '#7193C5', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-10deg' }] },
  heroBadgeText: { color: '#D7E4F7', fontWeight: '900', fontSize: 15 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, backgroundColor: '#FFF8E8', borderColor: '#F0DDAF', borderWidth: 1, borderRadius: radius.card, marginBottom: spacing.xl },
  noticeIconWrap: { width: 25, height: 25, borderRadius: 9, backgroundColor: '#F6E8C5', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  noticeIcon: { color: '#805B13', fontWeight: '900', fontSize: 14 },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: '#805B13', fontWeight: '900', fontSize: 12, marginBottom: 3 },
  noticeText: { color: '#6B571F', fontSize: 11, lineHeight: 17 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '900' },
  sectionSubtitle: { color: colors.muted, fontSize: 11, marginTop: 4 },
  seeAll: { color: colors.navy, fontSize: 11, fontWeight: '800' },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  serviceCard: { width: '48.2%', minHeight: 144, backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 13, marginBottom: 11 },
  serviceIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  serviceIconText: { fontSize: 21, fontWeight: '800' },
  icon_blue: { backgroundColor: '#E8F1FB' },
  icon_green: { backgroundColor: '#E7F6EC' },
  icon_purple: { backgroundColor: '#F0ECFC' },
  icon_orange: { backgroundColor: '#FFF1E5' },
  iconText_blue: { color: '#0B3D91' },
  iconText_green: { color: '#238C48' },
  iconText_purple: { color: '#7455B8' },
  iconText_orange: { color: '#C46A22' },
  serviceTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  serviceDetail: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 4, paddingRight: 5 },
  serviceArrow: { position: 'absolute', top: 13, right: 13, color: '#9AAABD', fontSize: 15 },
  supportCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAF2FC', borderRadius: 18, padding: spacing.md, marginTop: 3 },
  supportIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  supportIconText: { color: colors.green, fontSize: 19 },
  supportCopy: { flex: 1, marginLeft: 11 },
  supportTitle: { color: colors.navy, fontSize: 12, fontWeight: '900' },
  supportText: { color: colors.muted, fontSize: 10, marginTop: 4 },
  supportArrow: { color: colors.navy, fontSize: 24 },
  footer: { color: colors.muted, textAlign: 'center', fontSize: 10, marginTop: spacing.xl },
  bottomBar: { flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 9, paddingBottom: 7 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  tabIcon: { color: '#9AAABD', fontSize: 21, lineHeight: 24 },
  tabIconActive: { color: colors.navy },
  tabLabel: { color: '#9AAABD', fontSize: 9, marginTop: 2, fontWeight: '600' },
  tabLabelActive: { color: colors.navy, fontWeight: '900' },
  activeIndicator: { position: 'absolute', top: -9, width: 18, height: 3, borderRadius: 2, backgroundColor: colors.green },
  pageHeading: { marginTop: spacing.md, marginBottom: spacing.lg },
  pageTitle: { color: colors.navy, fontSize: 25, fontWeight: '900' },
  pageSubtitle: { color: colors.muted, fontSize: 12, marginTop: 5 },
  listCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: 11 },
  listCopy: { flex: 1, marginLeft: 12 },
  comingSoon: { color: '#8A6A25', fontSize: 10, fontWeight: '800', marginTop: 5 },
  emptyCard: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: 'center', marginTop: spacing.md },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.paleBlue, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyIconText: { color: colors.navy, fontSize: 30 },
  emptyTitle: { color: colors.navy, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  profileCard: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  profileAvatar: { width: 62, height: 62, borderRadius: 22, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profileAvatarText: { color: colors.white, fontWeight: '900', fontSize: 17 },
  profileRowIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: colors.paleBlue, alignItems: 'center', justifyContent: 'center' },
  profileRowIconText: { color: colors.navy, fontSize: 20, fontWeight: '900' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
